import React from "react";
import { base44 } from "@/api/base44Client";
import AssistantChat from "@/components/assistant/AssistantChat";
import { MessageCircle, ExternalLink, Info } from "lucide-react";

const AGENT_NAME = "whatsapp_assistant";

export default function AdminAssistant() {
  const whatsappURL = base44.agents?.getWhatsAppConnectURL?.(AGENT_NAME) || "#";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-orange-500" />
          Assistente de WhatsApp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          IA de suporte, FAQ e captação de leads. Teste aqui e conecte no WhatsApp para atender seus clientes automaticamente.
        </p>
      </div>

      {/* WhatsApp connect card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Conectar no WhatsApp</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Clique no link abaixo para conectar este assistente ao seu WhatsApp. Depois de conectado, qualquer mensagem recebida será respondida automaticamente pela IA.
            </p>
          </div>
          {whatsappURL !== "#" && (
            <a
              href={whatsappURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white font-medium text-sm hover:bg-green-600 transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              Conectar WhatsApp
            </a>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            O assistente responde dúvidas sobre a plataforma, planos e funcionamento, e direciona potenciais alunos para o cadastro. Ele não acessa dados sensíveis de contas — para problemas específicos (pagamento, reembolso), ele escala para o suporte humano.
          </p>
        </div>
      </div>

      {/* Chat test panel */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">Testar assistente</h2>
        <AssistantChat />
      </div>
    </div>
  );
}