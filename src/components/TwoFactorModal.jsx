import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, RefreshCw } from "lucide-react";

export default function TwoFactorModal({ email, onVerified }) {
  const handleNotYou = () => {
    base44.auth.logout("/landing");
  };

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError("");
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== 6) { setError("Digite os 6 dígitos do código."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("verifyOtp", { code });
      if (res.data?.success) {
        onVerified();
      } else {
        setError(res.data?.message || "Código inválido ou expirado.");
        setDigits(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch {
      setError("Erro ao verificar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError("");
    try {
      await base44.functions.invoke("sendOtp", {});
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch {
      setError("Erro ao reenviar. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Verificação em duas etapas</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enviamos um código de 6 dígitos para<br />
          <span className="font-medium text-gray-700">{email}</span>
        </p>

        <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-900"
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <Button
          onClick={handleVerify}
          disabled={loading || digits.join("").length !== 6}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 rounded-xl mb-4"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</> : "Confirmar acesso"}
        </Button>

        <button
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
          {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
        </button>

        <button
          onClick={handleNotYou}
          className="block w-full text-xs text-gray-400 hover:text-red-500 transition-colors mt-4"
        >
          Não é você? Sair
        </button>
      </div>
    </div>
  );
}