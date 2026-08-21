import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";

// Mesmos tutores fakes já usados na seção "TUTORS" da Landing Page — reaproveita
// nome, foto e país, só adicionando a coordenada geográfica de cada país, pra
// dar a impressão de tutores espalhados pelo mundo todo.
const TUTOR_MARKERS = [
  { id: "marcus", name: "Marcus", flag: "🇿🇦", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", location: [-26.2, 28.05] },   // África do Sul
  { id: "aileen", name: "Aileen", flag: "🇵🇭", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", location: [14.6, 120.98] },   // Filipinas
  { id: "david", name: "David", flag: "🇬🇧", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", location: [51.51, -0.13] },     // Reino Unido
  { id: "sarah", name: "Sarah", flag: "🇺🇸", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", location: [40.71, -74.01] },    // EUA
  { id: "chidi", name: "Chidi", flag: "🇳🇬", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", location: [6.52, 3.38] },       // Nigéria
  { id: "priya", name: "Priya", flag: "🇮🇳", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", location: [19.08, 72.88] },     // Índia
];

// Projeta um ponto (latitude/longitude) da esfera pra coordenada 2D na tela,
// considerando a rotação atual do globo (phi) e a inclinação (theta).
// z > 0 = ponto de frente pra câmera (visível); z <= 0 = do lado escondido.
function projectMarker(lat, lng, phi, theta) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180 + phi;
  const x = Math.cos(latRad) * Math.sin(lngRad);
  const y =
    Math.sin(latRad) * Math.cos(theta) -
    Math.cos(latRad) * Math.cos(lngRad) * Math.sin(theta);
  const z =
    Math.cos(latRad) * Math.cos(lngRad) * Math.cos(theta) +
    Math.sin(latRad) * Math.sin(theta);
  return { x, y, z };
}

const THETA = 0.32;

export function TutorGlobe({ className = "" }) {
  const canvasRef = useRef(null);
  const markerElRefs = useRef({});
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);

  const updateMarkerPositions = useCallback((phi, theta, width) => {
    TUTOR_MARKERS.forEach((m) => {
      const el = markerElRefs.current[m.id];
      if (!el) return;
      const p = projectMarker(m.location[0], m.location[1], phi, theta);
      if (p.z < 0.15) {
        el.style.opacity = "0";
        return;
      }
      const screenX = width / 2 + p.x * (width / 2) * 0.9;
      const screenY = width / 2 - p.y * (width / 2) * 0.9;
      el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -130%)`;
      el.style.opacity = String(Math.min(1, (p.z - 0.15) * 3));
    });
  }, []);

  const handlePointerDown = useCallback((e) => {
    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const handlePointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (pointerInteracting.current !== null) {
      pointerInteractionMovement.current = e.clientX - pointerInteracting.current;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [handlePointerUp, handlePointerMove]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe = null;
    let autoPhi = 0;
    let ro;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: THETA,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0.949, 0.416, 0.106],
        glowColor: [0.96, 0.94, 0.9],
        markerElevation: 0,
        opacity: 0.9,
        // Sem marcadores nativos da Cobe — os "balões" com foto/nome são
        // desenhados 100% em HTML por cima, via updateMarkerPositions.
        markers: [],
        onRender: (state) => {
          if (pointerInteracting.current === null) {
            autoPhi += 0.0035;
          }
          const phi = autoPhi + pointerInteractionMovement.current / 200;
          state.phi = phi;
          state.theta = THETA;
          updateMarkerPositions(phi, THETA, width);
        },
      });

      setTimeout(() => { canvas.style.opacity = "1"; });
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0 && !globe) {
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (ro) ro.disconnect();
      if (globe) globe.destroy();
    };
  }, [updateMarkerPositions]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", maxWidth: 480, aspectRatio: "1 / 1", margin: "0 auto" }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{ width: "100%", height: "100%", cursor: "grab", opacity: 0, transition: "opacity 1s ease", touchAction: "none" }}
      />
      {TUTOR_MARKERS.map((m) => (
        <div
          key={m.id}
          ref={(el) => { markerElRefs.current[m.id] = el; }}
          style={{ position: "absolute", top: 0, left: 0, opacity: 0, transition: "opacity .15s ease", willChange: "transform, opacity" }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#17181C", borderRadius: 999,
              padding: "4px 12px 4px 4px",
              boxShadow: "0 10px 24px -10px rgba(0,0,0,.55)",
              whiteSpace: "nowrap",
            }}
          >
            <img
              src={m.photo}
              alt={m.name}
              style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: "2px solid #F26A1B", flexShrink: 0 }}
            />
            <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
              {m.flag} {m.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
