// Single source of truth for granting a privileged role to a user.
// Every code path that needs to set role: 'tutor' | 'affiliate' | 'admin' must
// go through this helper — never write user.role directly in more than one place.
export async function grantRole(base44, targetUserId, role) {
  await base44.asServiceRole.entities.User.update(targetUserId, { role });
}