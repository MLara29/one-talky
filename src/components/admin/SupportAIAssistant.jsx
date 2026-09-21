import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Languages, Sparkles, ArrowUpRight, Loader2, X } from "lucide-react";

// AI assistant for the admin support chat. Helps bridge the language gap
// between Brazilian admin (Portuguese) and native English-speaking tutors:
//  1. Translate the last incoming message (EN → PT)
//  2. Suggest a reply in English based on the conversation
//  3. Translate the admin's Portuguese draft (PT → EN) before sending
export default function SupportAIAssistant({ lastIncomingMessage, draft, setDraft, userRole }) {
  const [result, setResult] = useState(null);
  const [resultLabel, setResultLabel] = useState("");
  const [loading, setLoading] = useState(null); // 'translate' | 'suggest' | 'translateDraft' | null
  const [error, setError] = useState(null);

  const callLLM = async (prompt) => {
    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    return typeof res === "string" ? res : res?.response || res?.text || JSON.stringify(res);
  };

  const handleTranslate = async () => {
    if (!lastIncomingMessage) return;
    setLoading("translate");
    setResult(null);
    setError(null);
    try {
      const prompt = `Translate the following message to Portuguese (Brazil). Return ONLY the translation, no explanations, no quotes:\n\n"${lastIncomingMessage}"`;
      const text = await callLLM(prompt);
      setResult(text.trim());
      setResultLabel("Tradução (EN → PT)");
    } catch (e) {
      setError("Não consegui traduzir agora. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  const handleSuggest = async () => {
    if (!lastIncomingMessage) return;
    setLoading("suggest");
    setResult(null);
    setError(null);
    try {
      const prompt = `You are a support agent for One Talky, a language exchange platform where students practice English via video calls with native tutors.\n\nA ${userRole || "user"} sent this message to support:\n"""\n${lastIncomingMessage}\n"""\n\nWrite a friendly, professional, concise reply in English. Return ONLY the reply text, no preamble, no quotes.`;
      const text = await callLLM(prompt);
      setResult(text.trim());
      setResultLabel("Resposta sugerida (EN)");
    } catch (e) {
      setError("Não consegui gerar uma sugestão agora.");
    } finally {
      setLoading(null);
    }
  };

  const handleTranslateDraft = async () => {
    if (!draft?.trim()) return;
    setLoading("translateDraft");
    setResult(null);
    setError(null);
    try {
      const prompt = `Translate the following message from Portuguese to English. Return ONLY the translation, no explanations, no quotes:\n\n"${draft}"`;
      const text = await callLLM(prompt);
      const translated = text.trim();
      setDraft(translated);
      setResultLabel("Traduzido (PT → EN) — substituído no campo");
      setResult(translated);
    } catch (e) {
      setError("Não consegui traduzir seu texto.");
    } finally {
      setLoading(null);
    }
  };

  const insertSuggestion = () => {
    if (result) {
      setDraft(result);
      setResult(null);
    }
  };

  const isBusy = loading !== null;

  return (
    <div className="border-t border-white/5 bg-white/[0.02]">
      {/* Button row */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <button
          onClick={handleTranslate}
          disabled={isBusy || !lastIncomingMessage}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
        >
          {loading === "translate" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
          Traduzir mensagem
        </button>
        <button
          onClick={handleSuggest}
          disabled={isBusy || !lastIncomingMessage}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/20 transition-colors disabled:opacity-40"
        >
          {loading === "suggest" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Sugerir resposta
        </button>
        <button
          onClick={handleTranslateDraft}
          disabled={isBusy || !draft?.trim()}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
        >
          {loading === "translateDraft" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
          Traduzir meu texto (PT → EN)
        </button>
      </div>

      {/* Result panel */}
      {(result || error) && (
        <div className="px-4 pb-2.5">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{resultLabel}</span>
              <div className="flex items-center gap-1">
                {result && !error && (
                  <button
                    onClick={insertSuggestion}
                    className="flex items-center gap-1 text-[11px] font-medium text-orange-400 hover:text-orange-300 px-1.5 py-0.5 rounded hover:bg-orange-500/10"
                  >
                    <ArrowUpRight className="w-3 h-3" /> Inserir no campo
                  </button>
                )}
                <button onClick={() => { setResult(null); setError(null); }} className="p-0.5 rounded hover:bg-white/10 text-gray-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            {error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : (
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{result}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}