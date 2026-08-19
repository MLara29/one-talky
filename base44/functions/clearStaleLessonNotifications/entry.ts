import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Marca como lidas as notificações de "aula começou / aluno esperando"
// (type: "lesson_booked", vindas de startLesson.js e startInstantLesson.js)
// depois que a aula em questão já terminou há mais de STALE_MINUTES_AFTER_LESSON_END
// minutos. Sem isso, essas notificações ficam paradas no sino do tutor pra
// sempre (ou até ele clicar manualmente), mesmo depois da aula já ter
// acabado há muito tempo — o sino só exibe não-lidas, então marcar como lida
// já faz elas somem da lista.
const STALE_MINUTES_AFTER_LESSON_END = 15;

Deno.serve(async (req) => {
  try {
    // Sem usuário autenticado neste contexto — invocado direto pelo workflow
    // agendado (cron). Seguro sem auth porque esta função não recebe nenhum
    // input do chamador, e só marca como lidas notificações objetivamente
    // ligadas a aulas já encerradas há mais de 15 minutos.
    const base44 = createClientFromRequest(req);

    const notifications = await base44.asServiceRole.entities.Notification.filter({
      type: "lesson_booked",
      is_read: false,
    });

    const now = Date.now();
    let cleared = 0;

    for (const notif of notifications) {
      if (!notif.link || !notif.link.startsWith("/classroom/")) continue;
      const lessonId = notif.link.replace("/classroom/", "").trim();
      if (!lessonId) continue;

      try {
        const lesson = await base44.asServiceRole.entities.Lesson.get(lessonId);

        if (!lesson) {
          // Aula não existe mais (ex: registro removido) — obsoleta também.
          await base44.asServiceRole.entities.Notification.update(notif.id, { is_read: true });
          cleared++;
          continue;
        }

        const isOver = ["completed", "cancelled", "no_show", "tutor_no_show"].includes(lesson.status);
        if (!isOver) continue; // ainda em andamento ou agendada — não mexe

        if (!lesson.ended_at) continue; // sem horário de término registrado, não dá pra saber há quanto tempo

        const endedAtMs = new Date(lesson.ended_at).getTime();
        if (now - endedAtMs > STALE_MINUTES_AFTER_LESSON_END * 60 * 1000) {
          await base44.asServiceRole.entities.Notification.update(notif.id, { is_read: true });
          cleared++;
        }
      } catch (e) {
        console.error("[clearStaleLessonNotifications] failed for notification", notif.id, e.message);
      }
    }

    return Response.json({ success: true, checked: notifications.length, cleared });
  } catch (error) {
    console.error("[clearStaleLessonNotifications]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});
