import { secrets } from "base44:runtime";

// Returns TikTok pixel config for client-side initialization.
// Public (no auth) — the test event code is not sensitive; it only routes
// events to TikTok's Test Events tab for validation.
//
// The test_event_code is present only while the TIKTOK_TEST_EVENT_CODE secret
// is set. Removing that secret makes the client pixel run in production mode.
export default async function () {
  try {
    const testEventCode = secrets.get("TIKTOK_TEST_EVENT_CODE") || null;
    return Response.json({ test_event_code: testEventCode });
  } catch (e) {
    return Response.json({ test_event_code: null }, { status: 500 });
  }
}