import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireOtp } from '../../shared/requireOtp.js';
import { grantRole } from '../../shared/grantRole.js';

// Admin approves/rejects a pending tutor application.
// Role grant on approval reuses the SAME grantRole() helper as setUserRole —
// there is only one code path in the whole system that can set role: 'tutor'.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const otpGate = await requireOtp(base44, req, user);
    if (!otpGate.ok) return Response.json({ error: otpGate.error }, { status: otpGate.status });

    const { tutor_id, decision } = await req.json();
    if (!tutor_id || !['approved', 'rejected'].includes(decision)) {
      return Response.json({ error: 'tutor_id and valid decision are required' }, { status: 400 });
    }

    const tutor = await base44.asServiceRole.entities.TutorProfile.get(tutor_id);
    if (!tutor) return Response.json({ error: 'Tutor not found' }, { status: 404 });

    await base44.asServiceRole.entities.TutorProfile.update(tutor_id, { status: decision });

    if (decision === 'approved' && tutor.user_id) {
      await grantRole(base44, tutor.user_id, 'tutor');

      await base44.asServiceRole.entities.Notification.create({
        user_id: tutor.user_id,
        title: '🎉 Welcome to the One Talky team!',
        message: `Congrats, your profile has been approved! Before you start receiving students, keep two things in mind: 1) Profiles without a photo do not appear in student search results — if you haven't added one yet, it's required to be visible on the platform. 2) We also recommend recording a short intro video (2 minutes max) talking about your experience and what you enjoy teaching — it helps build trust and increases your chances of getting booked. You can add both in your Profile (the person icon in the top-right corner).`,
        type: 'tutor_approved',
        is_read: false,
        link: '/profile',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[adminReviewTutorApplication]', error.message);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
});