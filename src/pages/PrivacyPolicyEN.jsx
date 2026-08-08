import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Who We Are and Our Commitment to the LGPD",
    content: (
      <p>
        One Talky adopts the principle of <strong>data minimization</strong> set
        forth in the Brazilian General Data Protection Law (Lei nº 13.709/2018 —
        LGPD). We collect only the data strictly necessary to operate the
        platform securely, and we process your data based on clear legal
        grounds: execution of a contract (to provide the service you hired),
        compliance with a legal obligation (e.g., issuing invoices), and
        consent (e.g., marketing cookies, which you may refuse at any time).
      </p>
    ),
  },
  {
    title: "2. Data Protection Officer (DPO)",
    content: (
      <p>
        Under Article 41 of the LGPD, One Talky designates a Data Protection
        Officer responsible for handling data subject requests and
        communicating with the National Data Protection Authority (ANPD). To
        exercise your rights or ask questions about the processing of your
        data, contact us at support@onetalky.com or through the support
        channel available on the platform.
      </p>
    ),
  },
  {
    title: "3. Data Collected by User Profile",
    content: (
      <ul style={{ marginTop: 0, paddingLeft: 20 }}>
        <li><strong>Students:</strong> Full name, email, country, language of
          interest, declared level, and lesson minute consumption history.</li>
        <li><strong>Tutors:</strong> Full name, email, country/time zone, profile
          photo, introduction video, public biography, and payment details
          (PIX key or bank details) necessary for earnings payouts.</li>
        <li><strong>Affiliates:</strong> Full name, email, and payment details
          (PIX key or bank details) necessary for commission payouts.</li>
      </ul>
    ),
  },
  {
    title: "4. Payment Gateway — Financial Security",
    content: (
      <>
        <p>
          One Talky <strong>does not store, process, or have access to credit card data</strong> on its servers.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>All financial transactions are processed in a <strong>100% encrypted and external</strong> manner by our payment partner <strong>Mercado Pago</strong>.</li>
          <li>The user's card details are entered directly into a secure Mercado Pago environment (PCI DSS Compliant) and never transit through One Talky's servers.</li>
          <li>One Talky receives only the payment status confirmation (approved/declined) and the transaction identifier, without any sensitive financial data.</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Logs and Video — Agora.io Infrastructure",
    content: (
      <>
        <p>
          Real-time lessons are enabled by the <strong>Agora.io</strong> WebRTC infrastructure, a cloud communication platform with international security standards.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>The <strong>audio and video transmission is direct (peer-to-peer)</strong> between student and tutor, with no video recordings stored by One Talky.</li>
          <li>The <strong>call duration logs</strong> (start time, end time, and total minutes) are kept on One Talky's servers <strong>strictly for internal audit purposes</strong>, reconciliation of the student's minute consumption, and calculation of payments owed to tutors.</li>
          <li>These duration logs are essential operational data for the provision of the service and are not shared with third parties beyond the tutor participating in the lesson.</li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Cookies and Tracking",
    content: (
      <>
        <p>We use <strong>essential cookies</strong> to maintain the authenticated user session securely in your dashboard.</p>
        <p style={{ marginTop: 8 }}>We also use third-party analytics tools (such as Meta Pixel and Google tags) exclusively to monitor marketing campaign performance and browsing behavior on the public Landing Page, not in the authenticated user dashboard. You can manage your cookie preferences through the consent banner displayed on your first visit to the platform.</p>
      </>
    ),
  },
  {
    title: "7. Service Providers and Data Sharing",
    content: (
      <>
        <p>
          One Talky does not sell, rent, or share personal data with third
          parties for commercial purposes. We share data only with service
          providers essential to the platform's operation, to the strictly
          necessary extent:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li><strong>Agora.io</strong> — video call infrastructure;</li>
          <li><strong>Mercado Pago</strong> — processing of student payments;</li>
          <li><strong>Hostinger</strong> — sending transactional emails (verification,
            notifications);</li>
          <li><strong>Brevo</strong> — sending system emails;</li>
          <li><strong>Cloudflare</strong> — web infrastructure protection and performance.</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          All these providers are contractually obligated to process your
          data only for the purposes described herein.
        </p>
      </>
    ),
  },
  {
    title: "8. International Data Transfer",
    content: (
      <p>
        Since One Talky connects students and tutors from different countries,
        and some of our service providers (such as Agora.io) operate
        international infrastructure, your data may be processed outside
        Brazil. In such cases, we require providers to adopt data protection
        standards compatible with the LGPD.
      </p>
    ),
  },
  {
    title: "9. Data Retention and Deletion",
    content: (
      <p>
        We retain your data for as long as necessary to provide the service
        and comply with legal obligations (e.g., tax). Upon requesting the
        deletion of your account, your personal data will be removed or
        anonymized within a reasonable period, except where retention is
        required by law (e.g., financial records).
      </p>
    ),
  },
  {
    title: "10. Children's Privacy",
    content: (
      <p>
        One Talky is intended for individuals aged 18 and over. We do not
        intentionally collect data from minors. If we identify that data from
        a minor has been collected without appropriate parental or guardian
        consent, we will take steps to delete it.
      </p>
    ),
  },
  {
    title: "11. Marketing Communications",
    content: (
      <p>
        You may opt out of receiving promotional email communications at any
        time, through the unsubscribe link present in each message, without
        affecting the receipt of essential communications about your account
        and your lessons.
      </p>
    ),
  },
  {
    title: "12. Security Incident Notification",
    content: (
      <p>
        In the event of a security incident that may pose a relevant risk to
        data subjects, One Talky will notify the ANPD and the affected
        subjects, as required by Article 48 of the LGPD, informing them of
        the nature of the affected data and the measures taken.
      </p>
    ),
  },
  {
    title: "13. Your Rights as a Data Subject",
    content: (
      <>
        <p>Under the LGPD, you have the right to:</p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Confirm the existence of processing of your data;</li>
          <li>Access your stored personal data;</li>
          <li>Correct incomplete or outdated data;</li>
          <li>Request the anonymization, blocking, or deletion of
            unnecessary data or data processed in violation of the law;</li>
          <li>Request the portability of your data to another provider;</li>
          <li>Revoke previously given consent, where applicable;</li>
          <li>File a complaint with the National Data Protection
            Authority (ANPD).</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          To exercise your rights, contact us through the official support
          channel available on the platform or via the email of the Data
          Protection Officer indicated in Section 2.
        </p>
      </>
    ),
  },
  {
    title: "14. Changes to This Policy",
    content: (
      <p>
        We may update this Policy periodically. Material changes will be
        communicated by email or notice on the platform before they take
        effect. Continued use of the platform after the effective date
        constitutes acceptance of the changes.
      </p>
    ),
  },
  {
    title: "15. Transfer in the Event of a Business Transaction",
    content: (
      <p>
        If One Talky undergoes a merger, acquisition, asset sale, or other
        corporate reorganization, your personal data may be transferred as
        part of that transaction, always respecting the protections set
        forth in this Policy and the LGPD.
      </p>
    ),
  },
  {
    title: "16. Information Security",
    content: (
      <p>
        We adopt technical and organizational measures to protect your data
        against unauthorized access, loss, or improper alteration. No data
        transmission over the internet, however, can be guaranteed to be
        100% secure — we recommend that you protect your access credentials
        and notify us immediately in case of suspected unauthorized use of
        your account.
      </p>
    ),
  },
  {
    title: "17. Third-Party Sites and Services",
    content: (
      <p>
        Our platform may contain links to third-party sites or services. We
        are not responsible for the privacy practices of those sites — we
        recommend reading each one's own privacy policy before providing any
        information to them.
      </p>
    ),
  },
  {
    title: "18. Identity Verification for Requests",
    content: (
      <p>
        To protect your account against fraudulent requests, we may ask for
        additional information to confirm your identity before fulfilling
        requests for access, correction, or deletion of data.
      </p>
    ),
  },
];

export default function PrivacyPolicyEN() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#374151" }}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Back</span>
          </Link>
          <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 40, width: "auto" }} />
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            LGPD — Lei nº 13.709/2018
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#111827", lineHeight: 1.15, margin: 0 }}>
            Privacy Policy
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            One Talky is committed to protecting your personal data. This Privacy Policy describes how we collect, use, and protect your information, in full compliance with the <strong>Brazilian General Data Protection Law (LGPD)</strong>.
          </p>
        </div>

        {/* Sections */}
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

        {/* Footer note */}
        <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          © {new Date().getFullYear()} One Talky · This policy may be updated at any time. We recommend periodic review.
        </p>
      </main>
    </div>
  );
}