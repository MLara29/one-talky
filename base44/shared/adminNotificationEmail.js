// Resolves the address that should receive admin notification emails.
// Prefers the value configured through the admin UI (PayoutSettings.notification_email),
// falling back to the ADMIN_EMAIL / SMTP_USER secrets so existing behavior never breaks.
export async function getAdminNotificationEmail(base44) {
  try {
    const settings = await base44.asServiceRole.entities.PayoutSettings.list("-created_date", 1);
    if (settings[0]?.notification_email) return settings[0].notification_email;
  } catch {}
  return Deno.env.get("ADMIN_EMAIL") || Deno.env.get("SMTP_USER");
}