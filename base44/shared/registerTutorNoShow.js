// Registers a no-show on a tutor's TutorProfile and applies the escalation
// policy: 3 no-shows → 7-day scheduling suspension (automatic); any further
// no-show after that → ban_suggested flag (admin decides, never auto-ban).
//
// Called from processNoShow.js after the lesson is flipped to no_show and the
// student is debited / tutor is credited.
//
// Side effect: creates in-app Notification records for all admins describing
// the event (first/second no-show, 3rd no-show suspension, or ban suggestion).
export async function registerTutorNoShow(base44, tutorUserId, lessonId, studentName) {
  const profiles = await base44.asServiceRole.entities.TutorProfile.filter({ user_id: tutorUserId });
  const tp = profiles[0];
  if (!tp) return;

  const newCount = (tp.no_show_count || 0) + 1;
  const updates = { no_show_count: newCount };
  let notifTitle, notifMessage;

  if (tp.no_show_suspension_applied) {
    // Já tinha suspensão aplicada antes — NÃO bane sozinho, só sinaliza
    updates.ban_suggested = true;
    notifTitle = `🚫 Sugestão de banimento: ${tp.full_name}`;
    notifMessage = `${tp.full_name} teve outra falta após já ter recebido a suspensão de 7 dias. Recomendamos avaliar o banimento — decisão final é sua.`;
  } else if (newCount === 3) {
    const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    updates.scheduling_suspended_until = suspendedUntil;
    updates.no_show_suspension_applied = true;
    notifTitle = `⚠️ Tutor suspenso por 7 dias: ${tp.full_name}`;
    notifMessage = `${tp.full_name} atingiu 3 faltas sem cancelamento. Agendamentos suspensos até ${new Date(suspendedUntil).toLocaleDateString('pt-BR')} (aulas instantâneas continuam liberadas).`;
  } else {
    notifTitle = `⚠️ Falta de tutor registrada: ${tp.full_name}`;
    notifMessage = `${tp.full_name} não compareceu a uma aula agendada com ${studentName || 'um aluno'} (${newCount}/3 faltas).`;
  }

  await base44.asServiceRole.entities.TutorProfile.update(tp.id, updates);

  // Notificação in-app para todos os admins
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
    if (admins.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(
        admins.map(a => ({
          user_id: a.id,
          title: notifTitle,
          message: notifMessage,
          type: "general",
          is_read: false,
          link: "/admin/users",
        }))
      );
    }
  } catch {}
}