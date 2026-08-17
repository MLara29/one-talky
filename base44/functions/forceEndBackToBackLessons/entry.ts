import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { completeLesson } from "../../shared/completeLesson.js";

// Se uma aula "em andamento" já passou do horário que deveria ter terminado
// (scheduled_at + duration_minutes) e existe uma próxima aula agendada,
// colada em seguida, pro mesmo tutor, essa aula é encerrada automaticamente
// exatamente no horário original previsto — pra não atrasar quem vem depois.
// Só o tempo até esse instante conta pra cobrança do aluno e ganho do tutor.
//
// Se NÃO existir próxima aula colada, esta rotina não mexe em nada — a aula
// segue seu curso normal (encerrada manualmente ou, em último caso, pelo
// timeoutStaleLessons depois de 3h esquecida).

// Tolerância pra considerar a próxima aula "colada": se ela começa até esse
// tanto de tempo depois do fim previsto da aula atual, conta como back-to-back.
const NEXT_LESSON_BUFFER_MS = 5 * 60 * 1000; // 5 minutos

Deno.serve(async (req) => {
  try {
    // Sem usuário autenticado neste contexto — invocado direto pelo workflow
    // agendado (cron), que não carrega sessão de usuário. Seguro sem auth
    // porque esta função não recebe nenhum input do chamador, e só age sobre
    // aulas objetivamente "em andamento" e já passadas do horário previsto
    // de término, com uma próxima aula real já confirmada no banco.
    const base44 = createClientFromRequest(req);

    const inProgress = await base44.asServiceRole.entities.Lesson.filter({ status: "in_progress" });
    const now = Date.now();

    let ended = 0;
    const results = [];

    for (const lesson of inProgress) {
      if (!lesson.scheduled_at) continue;
      const scheduledEndMs = new Date(lesson.scheduled_at).getTime() + (lesson.duration_minutes || 30) * 60 * 1000;
      if (now < scheduledEndMs) continue; // ainda não chegou no horário previsto de término

      // Existe próxima aula agendada, colada, pro mesmo tutor?
      const nextLessons = await base44.asServiceRole.entities.Lesson.filter({
        tutor_id: lesson.tutor_id,
        status: "scheduled",
      });
      const hasNext = nextLessons.some((nl) => {
        if (!nl.scheduled_at) return false;
        const nextStartMs = new Date(nl.scheduled_at).getTime();
        return nextStartMs >= scheduledEndMs && (nextStartMs - scheduledEndMs) <= NEXT_LESSON_BUFFER_MS;
      });

      if (!hasNext) continue;

      const result = await completeLesson(base44, lesson, {
        endedAtOverride: new Date(scheduledEndMs).toISOString(),
      });
      if (!result.alreadyCompleted) {
        ended++;
        results.push({
          lesson_id: lesson.id,
          tutor_id: lesson.tutor_id,
          scheduled_end: new Date(scheduledEndMs).toISOString(),
        });
      }
    }

    return Response.json({ success: true, checked: inProgress.length, ended, results });
  } catch (error) {
    console.error("[forceEndBackToBackLessons]", error.message);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
});
