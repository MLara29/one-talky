import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: (
      <p>
        By creating an account on One Talky, the user declares to have read, understood, and fully agreed with these Terms of Use. Continued use of the platform implies automatic acceptance of any future updates, which will be communicated by email with a minimum of 15 days' notice.
      </p>
    ),
  },
  {
    title: "2. Credit Model (Minutes)",
    content: (
      <>
        <p>
          Lessons on One Talky are counted in minutes in real time, measured automatically by the <strong>Agora.io</strong> video infrastructure. Consumption begins at the moment the video connection is established between student and tutor and ends at the moment of disconnection.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>The minutes included in each monthly plan are <strong>valid for 30 days</strong> from the plan activation date.</li>
          <li>Unused minutes within that period <strong>expire and do not carry over</strong> to the next cycle.</li>
          <li>The available minute balance can be checked at any time in the student dashboard.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Prepaid / Standalone Minutes",
    content: (
      <>
        <p>
          One Talky offers a differentiated prepaid standalone credit model for users with an active monthly subscription.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>A user with an active monthly plan <strong>gains the right to purchase additional standalone minute packs</strong> at any time, without needing to upgrade their plan.</li>
          <li>Standalone prepaid minutes <strong>do not expire</strong> as long as the account remains active.</li>
          <li>It is not possible to purchase standalone credits without an active monthly subscription.</li>
          <li>Standalone prepaid credits are used only after the monthly plan minutes are exhausted.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Cancellation, No-Show, and Late Entry",
    content: (
      <>
        <p>
          To ensure fair compensation for tutors and platform quality, the following rules apply:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>
            <strong>Bookings made more than 24 hours in advance:</strong> The student must cancel at least <strong>24 hours in advance</strong> of the lesson time. Cancellations outside this window will be considered late.
          </li>
          <li>
            <strong>Bookings made less than 24 hours in advance:</strong> When a student books a lesson on short notice (less than 24 hours before the time), they will have up to <strong>1 hour after the booking moment</strong> to cancel without penalty.
          </li>
          <li>
            <strong>Late entry tolerance (no-show):</strong> The student has up to <strong>10 minutes</strong> after the scheduled lesson start time to enter the video room. If the tutor is online and ready for the lesson and the student does not show up within this window, the minutes corresponding to the lesson duration will be <strong>automatically deducted</strong>. If the tutor is not on the platform at the scheduled time, the student <strong>will not be penalized</strong>.
          </li>
          <li>
            Late cancellations and unnotified absences (no-show) will result in the <strong>full deduction of the minutes</strong> corresponding to the scheduled lesson duration.
          </li>
          <li>Minutes deducted due to late cancellation or no-show compensate the tutor who reserved that slot in their schedule.</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Specific cancellation and no-show rules on the tutor's side, as well as payment and other service provision conditions, are described in the{" "}
          <Link to="/tutor-agreement" style={{ color: ACCENT, fontWeight: 700 }}>Tutor Service Agreement</Link>.
        </p>
      </>
    ),
  },
  {
    title: "4.1 Warranty Period (First 7 Days)",
    content: (
      <>
        <p>
          Under Article 49 of the Brazilian Consumer Protection Code (Código de Defesa do Consumidor), you have the right to withdraw from the subscription within <strong>7 calendar days</strong> of purchase, without needing to provide a reason, with a right to a full refund of the amount paid.
        </p>
        <p style={{ marginTop: 10 }}>
          To enable this right in a balanced way, during the first 7 days of the subscription:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>You may schedule <strong>only 1 lesson, of 30 minutes</strong>, regardless of the plan purchased. Additional lessons only become available starting on the <strong>8th day</strong> of the subscription.</li>
          <li>During this 7-day period, the <strong>instant lesson</strong> feature is unavailable — the only lesson format allowed is the single scheduled lesson mentioned above. Instant lessons become available again starting on the <strong>8th day</strong> of the subscription.</li>
          <li>If you cancel the subscription within this 7-day period, the amount paid will be fully refunded, and the plan's credit minutes (used or not) will be <strong>extinguished immediately</strong> upon cancellation — unlike cancellation after this period, which keeps remaining minutes available for up to 30 additional days (see Section 4 above).</li>
          <li>Credits purchased separately (prepaid minute packages) are not affected by this rule, and follow their own 30-day validity period from the date of purchase.</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Zero Tolerance — Conduct in Video Rooms",
    content: (
      <>
        <p>
          One Talky is a safe, respectful, and inclusive learning environment. Any form of inappropriate conduct is strictly prohibited.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Prohibited conduct includes: sexual or moral harassment, discrimination based on race, gender, sexual orientation, religion, or nationality, offensive language, display of inappropriate content, and any form of prejudice.</li>
          <li>Violation of this clause will result in <strong>immediate and permanent account ban</strong>, with no right to refund of plans or standalone credits.</li>
          <li>One Talky reserves the right to report illegal conduct to the competent authorities.</li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Platform Responsibilities",
    content: (
      <p>
        One Talky acts as a technological intermediary between students and independent tutors. We are not responsible for service interruptions caused by user internet failures, unavailability of third-party providers (Agora.io, Stripe), or force majeure events. In the event of a proven technical failure of the platform, minutes unduly consumed will be refunded to the student.
      </p>
    ),
  },
  {
    title: "7. General Provisions",
    content: (
      <p>
        These Terms are governed by Brazilian law. Any disputes shall be resolved in the courts of the jurisdiction of São Paulo — SP. For questions or formal notices, contact us through the official support channel available on the platform.
      </p>
    ),
  },
  {
    title: "8. Eligibility and Minimum Age",
    content: (
      <p>
        One Talky is intended exclusively for individuals aged 18 and over. By creating an account, you declare and warrant that you are 18 years of age or older. One Talky reserves the right to suspend or terminate accounts that violate this condition, at any time, without prior notice.
      </p>
    ),
  },
  {
    title: "9. Your Account and Responsibility",
    content: (
      <>
        <p>
          You are responsible for maintaining the confidentiality of your password and for all activities carried out on your account. Notify Support immediately if you suspect unauthorized use.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Each account is personal and non-transferable — sharing access credentials with third parties is not permitted.</li>
          <li>Creating more than one account per person, or impersonating another person or entity, is not permitted.</li>
        </ul>
      </>
    ),
  },
  {
    title: "10. License to Use and Restrictions",
    content: (
      <>
        <p>
          One Talky grants you a limited, non-exclusive, and revocable license to access and use the platform for its intended purpose. You agree not to:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Copy, modify, or create derivative works of the platform;</li>
          <li>Use robots, scrapers, or other automated means to access the platform without express authorization;</li>
          <li>Attempt to gain unauthorized access to accounts, systems, or networks connected to the platform;</li>
          <li>Interfere with the normal operation of the platform or other users' use, including through viruses or malicious code;</li>
          <li>Use One Talky trademarks, logos, or materials without prior written authorization.</li>
        </ul>
      </>
    ),
  },
  {
    title: "11. Session Records and Trust & Safety",
    content: (
      <p>
        As detailed in our <Link to="/privacy-policy" style={{ color: ACCENT, fontWeight: 700 }}>Privacy Policy</Link>, we do not record video or audio from lessons. Text messages exchanged during lessons and duration records are retained for audit purposes, dispute resolution, and compliance with these rules. One Talky seeks to promote a safe learning environment but does not guarantee or take full responsibility for the behavior of students or tutors beyond what is described in these Terms — use the Support channel to report any concerns about another user.
      </p>
    ),
  },
  {
    title: "12. Intellectual Property",
    content: (
      <p>
        All content, design, code, branding, and other materials on the platform are the property of One Talky or its licensors, protected by applicable intellectual property laws. No license or right is granted to you beyond the personal use provided in these Terms.
      </p>
    ),
  },
  {
    title: "13. User-Submitted Content",
    content: (
      <p>
        By submitting photos, introduction videos, biographies, or other content to the platform (e.g., tutor profile), you warrant that you hold the necessary rights to that content and grant One Talky a license to display it within the platform, to the extent necessary for the service to function (e.g., displaying your profile to interested students).
      </p>
    ),
  },
  {
    title: "14. Account Termination",
    content: (
      <p>
        You may close your account at any time through the Support channel. One Talky may also suspend or terminate accounts that violate these Terms, at its discretion, especially in cases of violation of Section 5 (Zero Tolerance). Tutors whose contracts are terminated are entitled to payment for lessons already delivered prior to the effective termination date, in accordance with the current payment cycle.
      </p>
    ),
  },
  {
    title: "15. Disclaimers and Limitation of Liability",
    content: (
      <p>
        The platform is provided "as is," without warranty of uninterrupted or error-free operation. To the maximum extent permitted by applicable Brazilian law — including the Consumer Defense Code, whose rights cannot be waived by this instrument — One Talky's liability for indirect or consequential damages is limited to the amount actually paid by the user in the six months preceding the event giving rise to the claim.
      </p>
    ),
  },
  {
    title: "16. Assignment and Entire Agreement",
    content: (
      <p>
        These Terms, together with the Privacy Policy, the Refund Policy, and (where applicable) the Tutor Service Agreement, constitute the entire agreement between you and One Talky. You may not assign or transfer your rights under these Terms to third parties; One Talky may do so freely, for example in the event of a corporate reorganization.
      </p>
    ),
  },
];

export default function TermsOfUseEN() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#374151" }}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Back</span>
          </Link>
          <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 40, width: "auto" }} />
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            Last updated: July 2025
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#111827", lineHeight: 1.15, margin: 0 }}>
            Terms of Use
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            These Terms of Use govern the relationship between <strong>One Talky</strong> and its users (students and tutors). By using our platform, you agree to all the conditions described below.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px 32px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 14px", borderLeft: `4px solid ${ACCENT}`, paddingLeft: 12 }}>
                {s.title}
              </h2>
              <div style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.75 }}>
                {s.content}
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          © {new Date().getFullYear()} One Talky · These Terms may be updated. We will notify by email with a minimum of 15 days' notice.
        </p>
      </main>
    </div>
  );
}