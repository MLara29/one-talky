import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';
import { getTransporter, SMTP_FROM, sendMailAndLog } from '../../shared/mailer.js';

async function handleTutorDeactivation(base44, tutor) {
  const scheduledLessons = await base44.asServiceRole.entities.Lesson.filter({
    tutor_id: tutor.user_id,
    status: "scheduled",
  });
  if (scheduledLessons.length === 0) return;

  const transporter = getTransporter();
  const affectedList = [];

  for (const lesson of scheduledLessons) {
    await base44.asServiceRole.entities.Lesson.update(lesson.id, { status: "cancelled" });

    try {
      const studentUser = await base44.asServiceRole.entities.User.get(lesson.student_id);
      if (studentUser?.email) {
        await sendMailAndLog(base44, transporter, {
          from: SMTP_FROM(),
          to: studentUser.email,
          subject: "Seu tutor não está mais disponível na One Talky",
          html: `<p>Olá ${lesson.student_name || ""},</p><p>Seu tutor ${lesson.tutor_name || "seu tutor"} não faz mais parte da plataforma One Talky, então sua aula agendada para ${lesson.scheduled_at ? new Date(lesson.scheduled_at).toLocaleString("pt-BR") : "uma data futura"} foi cancelada.</p><p>Dê uma olhada nos nossos outros tutores e agende uma nova aula — estamos aqui para te ajudar a encontrar um ótimo par. Seus créditos continuam disponíveis na sua conta.</p><p>Equipe One Talky</p>`,
          _sentBy: "system",
        }, "tutor_deactivation");
      }

      await base44.asServiceRole.entities.Notification.create({
        user_id: lesson.student_id,
        title: "Your tutor is no longer available",
        message: `${lesson.tutor_name || "Your tutor"} is no longer part of One Talky. Your lesson has been cancelled — please book a new tutor when you're ready.`,
        type: "general",
        is_read: false,
      });

      affectedList.push(`${lesson.student_name || "Student"} (${studentUser?.email || "no email"}) — lesson was ${lesson.scheduled_at ? new Date(lesson.scheduled_at).toLocaleString("en-US") : "unscheduled"}`);
    } catch (e) {
      console.error("[adminManageTutor] failed to notify student for lesson", lesson.id, e.message);
    }
  }

  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
    for (const admin of admins) {
      if (!admin.email) continue;
      await sendMailAndLog(base44, transporter, {
        from: SMTP_FROM(),
        to: admin.email,
        subject: `Tutor deactivated: ${scheduledLessons.length} lesson(s) need manual reassignment`,
        html: `<p>Tutor ${tutor.display_name || tutor.full_name} was deactivated with ${scheduledLessons.length} upcoming lesson(s) cancelled.</p><ul>${affectedList.map(a => `<li>${a}</li>`).join("")}</ul><p>These students have been notified and need to be matched with a new tutor manually.</p>`,
        _sentBy: "system",
      }, "tutor_deactivation_admin_alert");
    }
  } catch (e) {
    console.error("[adminManageTutor] failed to notify admins", e.message);
  }
}

// Admin-only tutor profile moderation actions — all writes go through this
// gated function instead of direct entity.update()/delete() calls from the client.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { tutor_id, action } = await req.json();
    if (!tutor_id || !['toggle_block', 'delete', 'toggle_contract_type', 'dismiss_ban_suggestion', 'toggle_hidden'].includes(action)) {
      return Response.json({ error: 'tutor_id and valid action are required' }, { status: 400 });
    }

    const tutor = await base44.asServiceRole.entities.TutorProfile.get(tutor_id);
    if (!tutor) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    if (action === 'delete') {
      await handleTutorDeactivation(base44, tutor);
      await base44.asServiceRole.entities.TutorProfile.delete(tutor_id);
      return Response.json({ success: true, deleted: true });
    }

    if (action === 'toggle_block') {
      const newStatus = tutor.status === 'rejected' ? 'approved' : 'rejected';
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { status: newStatus });
      if (newStatus === 'rejected') {
        await handleTutorDeactivation(base44, tutor);
      }
      return Response.json({ success: true, status: newStatus });
    }

    if (action === 'toggle_hidden') {
      // Diferente de toggle_block: só esconde o tutor das buscas/listagens de
      // alunos. Não cancela aulas já agendadas, não manda e-mail pra ninguém,
      // não mexe no status de aprovação. Serve tanto pra tutores de teste
      // quanto pra qualquer tutor que o admin não quer mais exibir sem
      // aplicar o bloqueio completo (mais pesado).
      const newHidden = !tutor.is_hidden;
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { is_hidden: newHidden });
      return Response.json({ success: true, is_hidden: newHidden });
    }

    if (action === 'toggle_contract_type') {
      const newType = tutor.contract_type === 'upwork' ? 'direct' : 'upwork';
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { contract_type: newType });
      return Response.json({ success: true, contract_type: newType });
    }

    if (action === 'dismiss_ban_suggestion') {
      await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { ban_suggested: false });
      return Response.json({ success: true, ban_suggested: false });
    }
  } catch (error) {
    console.error('[adminManageTutor]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});