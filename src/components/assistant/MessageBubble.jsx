import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Loader2, X, AlertCircle } from "lucide-react";

const STATUS_META = {
  pending: { icon: Loader2, spin: true, label: "Aguardando...", color: "#94a3b8" },
  running: { icon: Loader2, spin: true, label: "Executando...", color: "#3b82f6" },
  in_progress: { icon: Loader2, spin: true, label: "Em andamento...", color: "#3b82f6" },
  completed: { icon: Check, spin: false, label: "Concluído", color: "#22c55e" },
  success: { icon: Check, spin: false, label: "Sucesso", color: "#22c55e" },
  failed: { icon: X, spin: false, label: "Falhou", color: "#ef4444" },
  error: { icon: AlertCircle, spin: false, label: "Erro", color: "#ef4444" },
};

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || "pending";
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  const isFailed = status === "failed" || status === "error";

  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }
  const failedResult = isFailed ||
    (typeof parsedResults === "string" && /error|failed/i.test(parsedResults)) ||
    (parsedResults && typeof parsedResults === "object" && parsedResults.success === false);

  let parsedArgs = toolCall.arguments_string;
  if (typeof parsedArgs === "string") {
    try { parsedArgs = JSON.parse(parsedArgs); } catch { /* keep raw */ }
  }

  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;
  const label = failedResult ? (proj.error_label || meta.label) : (status === "success" || status === "completed" ? (proj.label || meta.label) : (proj.active_label || meta.label));

  return (
    <div className="mt-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Icon className={`w-3.5 h-3.5 ${meta.spin ? "animate-spin" : ""}`} style={{ color: failedResult ? "#ef4444" : meta.color }} />
        <span className="font-medium text-gray-700 dark:text-gray-300">{toolCall.name || "função"}</span>
        <span className="text-gray-400">·</span>
        <span style={{ color: failedResult ? "#ef4444" : meta.color }}>{label}</span>
      </button>
      {!hideDetails && expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {parsedArgs && (
            <div>
              <span className="font-semibold text-gray-500">Parâmetros:</span>
              <pre className="mt-0.5 p-1.5 bg-white dark:bg-gray-800 rounded text-[10px] overflow-x-auto">{typeof parsedArgs === "string" ? parsedArgs : JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <span className="font-semibold text-gray-500">Resultado:</span>
              <pre className="mt-0.5 p-1.5 bg-white dark:bg-gray-800 rounded text-[10px] overflow-x-auto">{typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"}`}>
        {message.content && (
          isUser
            ? <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            : <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"><ReactMarkdown>{message.content}</ReactMarkdown></div>
        )}
        {message.tool_calls?.map((tc, idx) => <FunctionDisplay key={idx} toolCall={tc} />)}
      </div>
    </div>
  );
}