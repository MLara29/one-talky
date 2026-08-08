import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const ACCENT = "#F26A1B";

// Full-screen, unclosable gate shown to any user who hasn't accepted the
// current Terms of Use / Privacy Policy version. Language is conditional:
// tutors see English (with links to /terms-of-use and /privacy-policy),
// all other roles see Portuguese (with links to /termos and /privacidade).
export default function LegalReacceptGate({ role, onAccepted }) {
  const isEnglish = role === "tutor";
  const termsUrl = isEnglish ? "/terms-of-use" : "/termos";
  const privacyUrl = isEnglish ? "/privacy-policy" : "/privacidade";

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = {
    title: isEnglish ? "Terms & Privacy Update" : "Atualização de Termos e Privacidade",
    body: isEnglish
      ? "We've updated our Terms of Use and/or Privacy Policy — please confirm you've read the changes."
      : "Atualizamos nossos Termos de Uso e/ou Política de Privacidade — precisamos que você confirme que leu as mudanças.",
    termsLabel: isEnglish ? "Terms of Use" : "Termos de Uso",
    privacyLabel: isEnglish ? "Privacy Policy" : "Política de Privacidade",
    checkbox: isEnglish
      ? "I confirm that I have read the updated Terms of Use and Privacy Policy."
      : "Confirmo que li os Termos de Uso e a Política de Privacidade atualizados.",
    button: isEnglish ? "Accept and continue" : "Aceitar e continuar",
    loading: isEnglish ? "Accepting..." : "Aceitando...",
  };

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("acceptLegalTerms", {});
      if (res.data?.error) throw new Error(res.data.error);
      onAccepted?.();
    } catch (err) {
      setError(err.message || "Failed to accept");
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
          }}>📋</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>{t.title}</h1>
          <p style={{ marginTop: 12, fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>{t.body}</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              {t.termsLabel} →
            </a>
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              {t.privacyLabel} →
            </a>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{t.checkbox}</span>
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
            {loading ? t.loading : t.button}
          </button>
        </div>
      </div>
    </div>
  );
}