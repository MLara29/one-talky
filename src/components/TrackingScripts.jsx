import React, { useEffect } from "react";

// ── TRACKING IDs ──────────────────────────────────────────────────────────
// Substitua pelos IDs reais quando for ativar o rastreamento.
// Enquanto os placeholders estiverem em "SEU_*", o componente é no-op
// mesmo que o consentimento esteja dado — nenhum script é injetado.
const META_PIXEL_ID = "1558500632424709";
const GA_MEASUREMENT_ID = "SEU_ID";

const STORAGE_KEY = "ot_cookie_consent";

// Guard module-level — garante que os scripts só sejam injetados uma vez,
// mesmo se o evento de consentimento disparar várias vezes.
let scriptsLoaded = false;

function loadTrackingScripts() {
  if (scriptsLoaded) return;
  scriptsLoaded = true;

  // ── Meta Pixel ──
  if (META_PIXEL_ID && META_PIXEL_ID !== "SEU_PIXEL_ID") {
    const fbScript = document.createElement("script");
    fbScript.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;
    document.head.appendChild(fbScript);
  }

  // ── Google Tag (gtag) ──
  if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== "SEU_ID") {
    const gtagScript = document.createElement("script");
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    gtagScript.async = true;
    document.head.appendChild(gtagScript);

    const gtagConfig = document.createElement("script");
    gtagConfig.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`;
    document.head.appendChild(gtagConfig);
  }
}

// Carrega scripts de rastreamento (Meta Pixel, Google Tag) APENAS quando
// o visitante consentiu (localStorage "ot_cookie_consent" === "accepted").
// Escuta tanto o estado salvo quanto o evento ao vivo disparado pelo
// CookieConsentBanner no momento do clique — cobre aceitar depois do
// carregamento inicial sem precisar recarregar a página.
export default function TrackingScripts() {
  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (consent === "accepted") {
      loadTrackingScripts();
    }

    const onAccept = () => loadTrackingScripts();
    window.addEventListener("cookie-consent-accepted", onAccept);
    return () => window.removeEventListener("cookie-consent-accepted", onAccept);
  }, []);

  return null;
}