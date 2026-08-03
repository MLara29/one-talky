import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bug, ChevronDown, ChevronRight } from "lucide-react";

const ROLE_LABEL = {
  student: "Aluno",
  tutor: "Tutor",
  admin: "Admin",
  affiliate: "Afiliado",
  anonymous: "Não identificado",
};

export default function AdminErrorLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    base44.entities.ClientErrorLog.list("-created_date", 100)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Erros de Tela</h1>
      <p className="text-gray-500 text-sm mb-6">Últimos 100 erros de renderização registrados no aplicativo</p>

      {logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Bug className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum erro registrado até agora.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const open = expanded === log.id;
            return (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : log.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50"
                >
                  {open ? <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] text-gray-500">
                        {new Date(log.created_date).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                        {ROLE_LABEL[log.user_role] || log.user_role || "—"}
                      </span>
                      {log.page_path && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {log.page_path}
                        </span>
                      )}
                      {log.browser_info && (
                        <span className="text-[10px] text-gray-400">{log.browser_info}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-red-600 break-words">{log.message}</p>
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 mb-1">Stack trace</p>
                    <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                      {log.stack || "—"}
                    </pre>
                    {log.user_id && (
                      <p className="text-[11px] text-gray-400 mt-2">ID do usuário: {log.user_id}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}