import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, X, Zap } from "lucide-react";

// Urgency offer popup shown after a lesson ends for eligible students
// (plan === "free" && signup_coupon_has_discount === false).
//
// The countdown is always recalculated from `expiresAt` (a server-side
// timestamp stored in StudentProfile.urgency_offer_expires_at), NOT from a
// local 15-minute timer — so it stays correct even if the student refreshes
// the page or reopens the popup.
export default function UrgencyOfferModal({ expiresAt, onSubscribe, onClose }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalSecs = Math.floor(remaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const expired = remaining <= 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl w-full max-w-md p-8 shadow-2xl bg-white">
        {expired ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Oferta expirada</h2>
            <p className="text-sm text-gray-500 mb-6">O prazo de 15 minutos para o desconto acabou.</p>
            <Button variant="outline" onClick={onClose} className="w-full rounded-xl">Fechar</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="font-display text-xl font-bold text-gray-900">Oferta especial!</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Gostou da experiência? Nos próximos <span className="font-bold text-orange-500">15 minutos</span>, ganhe <span className="font-bold text-orange-500">30% de desconto</span> no primeiro mês!
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-3xl font-extrabold tabular-nums text-gray-900">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
            </div>

            <Button
              onClick={onSubscribe}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 rounded-xl py-3 text-base font-bold"
            >
              Assinar agora
            </Button>
            <button onClick={onClose} className="w-full text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
              Talvez depois
            </button>
          </>
        )}
      </div>
    </div>
  );
}