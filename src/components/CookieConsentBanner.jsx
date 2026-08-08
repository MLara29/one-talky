import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const ACCENT = "#F26A1B";
const STORAGE_KEY = "ot_cookie_consent"; // "accepted" | "rejected"

// LGPD-oriented consent banner for the public landing page — lets the
// visitor accept or reject non-essential marketing cookies (Meta Pixel,
// Google tags). Essential/session cookies are always required and are not
// covered by this choice.
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const choose = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
    if (value === "accepted") {
      window.dispatchEvent(new Event("cookie-consent-accepted"));
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "#17181C", color: "#EDE9E2",
        padding: "18px 20px", boxShadow: "0 -8px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, flex: "1 1 320px", color: "#C9C5BD" }}>
          Usamos cookies essenciais para o funcionamento do site e, com o seu consentimento, cookies não-essenciais de marketing (Pixel do Meta, tags do Google). Veja nossa{" "}
          <Link to="/privacidade" style={{ color: "#F7A76A" }}>Política de Privacidade</Link>.
        </p>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => choose("rejected")}
            style={{ padding: "9px 16px", borderRadius: 999, background: "transparent", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            Recusar não-essenciais
          </button>
          <button
            onClick={() => choose("accepted")}
            style={{ padding: "9px 18px", borderRadius: 999, background: ACCENT, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}