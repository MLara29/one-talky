import React from "react";
import { Link } from "react-router-dom";

// Compact legal footer shown at the bottom of every authenticated screen.
// NOTE: company legal name / CNPJ below are placeholders — replace with the
// real registered data before publishing.
export default function Footer() {
  return (
    <footer className="pb-16 lg:pb-6 pt-6 mt-4">
      <div
        className="max-w-screen-2xl mx-auto px-8 sm:px-14 lg:px-20 py-4 border-t text-center sm:text-left"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs" style={{ color: "#9ca3af" }}>
            <Link to="/termos" className="hover:underline">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
            <Link to="/reembolso" className="hover:underline">Política de Reembolso</Link>
            <Link to="/faq" className="hover:underline">FAQ</Link>
            <Link to="/my-messages" className="hover:underline">Suporte</Link>
          </div>
          <p className="text-[11px]" style={{ color: "#b7b3ab" }}>
            © {new Date().getFullYear()} One Talky
          </p>
        </div>
        <p className="mt-2 text-[11px] text-center sm:text-left" style={{ color: "#b7b3ab" }}>
          One Talky Tecnologia Ltda. · CNPJ 00.000.000/0001-00 · contato@onetalky.com
        </p>
      </div>
    </footer>
  );
}