import React from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function BlockedScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #fffaf7 0%, #fff5ee 50%, #ffe8d6 100%)" }}
    >
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 shadow-xl border border-red-100">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="font-display font-bold text-xl text-gray-900 mb-2">Conta bloqueada</h1>
        <p className="text-gray-500 text-sm mb-6">
          Sua conta foi bloqueada pela administração da plataforma. Entre em contato com o suporte para mais informações.
        </p>
        <Button
          onClick={() => base44.auth.logout("/")}
          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0"
        >
          Sair
        </Button>
      </div>
    </div>
  );
}