// Server-side guard mirroring the AppLayout's is_blocked check — the client
// check is UX-only and can be bypassed by calling functions directly, so any
// action a blocked student shouldn't be able to perform must call this too.
//
// Usage: const gate = await requireNotBlocked(base44, studentUserId); if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
export async function requireNotBlocked(base44, studentUserId) {
  const profiles = await base44.asServiceRole.entities.StudentProfile.filter({ user_id: studentUserId });
  const profile = profiles[0];
  if (profile?.is_blocked) {
    return { ok: false, status: 403, error: 'Sua conta está bloqueada. Entre em contato com o suporte.' };
  }
  return { ok: true };
}