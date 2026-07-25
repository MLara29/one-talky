/**
 * recordLoginAttempt — DESATIVADO por segurança.
 *
 * Este endpoint foi substituído: o registro de falhas agora ocorre
 * exclusivamente dentro de checkLoginRateLimit (lado servidor).
 * Manter esse endpoint público permitiria que atacantes inserissem
 * tentativas falsas e bloqueassem contas legítimas (Account Lockout DoS).
 *
 * Retornamos 410 Gone para sinalizar que foi removido intencionalmente.
 */
Deno.serve(async (_req) => {
  return Response.json(
    { error: "Endpoint removido. O registro de tentativas é feito internamente pelo servidor." },
    { status: 410 }
  );
});