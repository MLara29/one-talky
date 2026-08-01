import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Nature of the Relationship — Independent Service Provider",
    content: (
      <p>
        Tutors working with One Talky do so as an <strong>independent, self-employed service provider</strong>, not as an employee, partner, or representative of One Talky. This Agreement applies to tutors of any country and does not create an employment, social security, or corporate relationship of any kind between the tutor and One Talky, regardless of the local laws of the tutor's country of residence.
      </p>
    ),
  },
  {
    title: "2. Taxes and Fiscal Obligations",
    content: (
      <p>
        The tutor is <strong>solely responsible</strong> for declaring and paying any taxes, social security contributions, or fiscal obligations applicable to the amounts received through the platform, in accordance with the laws of their country of residence. One Talky <strong>does not withhold, collect, or file taxes on the tutor's behalf</strong> in any jurisdiction.
      </p>
    ),
  },
  {
    title: "3. Contract Type and Time Tracking (Upwork Contract Model)",
    content: (
      <p>
        Tutors contracted through Upwork are engaged under an <strong>Hourly Contract</strong>. Time tracking and payment calculation are handled entirely by One Talky's internal systems, based on actual lesson time recorded on the platform, and the resulting amount is passed on to the tutor through Upwork's payment mechanism linked to the contract.
      </p>
    ),
  },
  {
    title: "4. Payment Cycle and Payout Workflow",
    content: (
      <ul style={{ marginTop: 0, paddingLeft: 20 }}>
        <li>The default payment cycle is <strong>weekly</strong>. The tutor may choose to be paid <strong>biweekly</strong> or <strong>monthly</strong> instead, at any time, through their dashboard — the change takes effect starting from the next cycle.</li>
        <li><strong>Approval:</strong> One Talky's finance team reviews the balance before payout.</li>
        <li><strong>Payout:</strong> the audited amount is transferred to the tutor according to the tutor's chosen cycle, through Upwork's payment mechanism linked to the active contract.</li>
        <li>Tutors contracted directly (not via Upwork) are paid via Payoneer, following the same review cycle.</li>
      </ul>
    ),
    extra: (
      <>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#111827", margin: "18px 0 8px" }}>4.1 Payout Frequency Options</h3>
        <p>
          By default, all tutors are paid weekly, following the cycle described above. Tutors may choose to switch to a biweekly or monthly payout cycle at any time through their dashboard. The change takes effect from the next payout cycle onward and does not affect earnings already accrued.
        </p>
      </>
    ),
  },
  {
    title: "5. Cancellations and No-Shows — Tutor Side",
    content: (
      <ul style={{ marginTop: 0, paddingLeft: 20 }}>
        <li>The tutor may cancel a scheduled lesson up to <strong>4 hours</strong> before the scheduled time without penalty.</li>
        <li>Repeated or last-minute cancellations by the tutor may result in a warning or <strong>account suspension</strong>, at One Talky's discretion.</li>
        <li>If the tutor does not show up for a scheduled lesson (tutor no-show) and the student is present in the room, the student is not penalized and the lesson does not generate payment for the tutor.</li>
        <li>Late cancellations or repeated absences are monitored by One Talky's quality team.</li>
      </ul>
    ),
  },
  {
    title: "6. Intellectual Property of Teaching Materials",
    content: (
      <p>
        Teaching materials, lesson scripts, exercises, or any content produced by the tutor specifically for use in One Talky lessons may be freely used by the tutor. One Talky does not claim ownership of the tutor's authored pedagogical content, but reserves the right to remove materials that violate third-party copyrights or the platform's conduct guidelines.
      </p>
    ),
  },
  {
    title: "7. Tutor Code of Conduct",
    content: (
      <>
        <p>As a service provider in direct contact with students, the tutor agrees to:</p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Maintain professional, respectful conduct free from any form of harassment, discrimination, or offensive language during lessons;</li>
          <li>Show up punctually for the time slots in their availability;</li>
          <li>Not request off-platform payments, personal contact details, or any form of negotiation aimed at bypassing One Talky's payment structure;</li>
          <li>Maintain the pedagogical quality expected by the platform.</li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Suspension and Termination",
    content: (
      <p>
        One Talky may suspend or terminate the tutor's access to the platform in case of a violation of this Agreement, general conduct policies, fraud, unjustified repeated absences, or consistently negative student reviews. In the event of a ban due to a serious violation (harassment, discrimination, improper conduct), the tutor forfeits the right to any pending payout related to the period of the violation, without prejudice to amounts already confirmed and paid previously.
      </p>
    ),
  },
  {
    title: "9. General Provisions",
    content: (
      <p>
        This Agreement supplements One Talky's general{" "}
        <Link to="/termos" style={{ color: ACCENT, fontWeight: 700 }}>Terms of Use</Link>, applicable to all users. In case of conflict between this Agreement and the general Terms, this Agreement prevails for matters specific to the relationship between One Talky and the tutor as a service provider.
      </p>
    ),
  },
];

export default function TutorAgreement() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#374151" }}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Back</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${ACCENT}, #e05a10)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>One Talky</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            Last updated: August 2026
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#111827", lineHeight: 1.15, margin: 0 }}>
            Tutor Service Agreement
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            This Agreement specifically governs the relationship between <strong>One Talky</strong> and the <strong>tutors</strong> who teach lessons on the platform, as independent service providers. It supplements — and does not replace — the general Terms of Use applicable to all users.
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
                {s.extra}
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          © {new Date().getFullYear()} One Talky · This Agreement may be updated. We will notify tutors by email at least 15 days in advance.
        </p>
      </main>
    </div>
  );
}