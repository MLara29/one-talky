import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const ACCENT = "#F26A1B";

// Full-screen, unclosable gate shown to tutors who haven't accepted the
// current Tutor Service Agreement version. Always in English (tutor-facing
// legal docs are English per platform convention).
export default function TutorAgreementGate({ onAccepted }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("acceptTutorAgreement", {});
      if (res.data?.error) throw new Error(res.data.error);
      onAccepted?.();
    } catch (err) {
      setError(err.message || "Failed to accept agreement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: "0 auto 20px", borderRadius: 16,
            background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          }}>📄</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>
            Tutor Service Agreement Update
          </h1>
          <p style={{ marginTop: 12, fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
            We've updated our Tutor Service Agreement — please read and accept it before continuing.
          </p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28 }}>
          <a
            href="/tutor-agreement"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: ACCENT, fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 20,
            }}
          >
            Read the full agreement →
          </a>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              I have read and agree to the Tutor Service Agreement.
            </span>
          </label>

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 999,
              fontWeight: 700, fontSize: 15,
              background: accepted && !loading ? ACCENT : "#d1d5db",
              color: "#fff", border: "none",
              cursor: accepted && !loading ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "background .2s",
            }}
          >
            {loading ? "Accepting..." : "Accept and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}