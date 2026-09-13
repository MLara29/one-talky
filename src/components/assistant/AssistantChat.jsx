import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "./MessageBubble";
import { Send, Plus, MessageSquare, Loader2 } from "lucide-react";

const AGENT_NAME = "whatsapp_assistant";

export default function AssistantChat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch (e) {
      console.error("listConversations error", e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Subscribe to the active conversation for streaming updates
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setMessages([]);
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      setSending(true);
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Conversa ${new Date().toLocaleString("pt-BR")}` },
      });
      await loadConversations();
      setActiveId(conv.id || conv._id);
    } catch (e) {
      console.error("createConversation error", e);
      alert("Não foi possível criar a conversa. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const conv = conversations.find(c => (c.id || c._id) === activeId);
      await base44.agents.addMessage(conv || activeId, { role: "user", content: text });
      // The subscription will update messages; refresh list to update preview
      setTimeout(loadConversations, 1500);
    } catch (e) {
      console.error("addMessage error", e);
      alert("Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => (c.id || c._id) === activeId);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] min-h-[400px]">
      {/* Conversation list */}
      <div className="lg:w-72 flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Conversas</span>
          <button
            onClick={handleNewConversation}
            disabled={sending}
            className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Nova
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs px-4 text-center">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              Nenhuma conversa ainda. Clique em "Nova" para testar o assistente.
            </div>
          ) : (
            conversations.map(c => {
              const id = c.id || c._id;
              const preview = c.messages?.[c.messages.length - 1];
              return (
                <button
                  key={id}
                  onClick={() => setActiveId(id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 transition-colors ${activeId === id ? "bg-orange-50 dark:bg-orange-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                >
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.metadata?.name || "Sem título"}</div>
                  {preview && <div className="text-xs text-gray-400 truncate mt-0.5">{preview.content?.slice(0, 60)}</div>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Selecione ou crie uma conversa para testar o assistente</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{activeConv?.metadata?.name || "Conversa"}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...</div>
              ) : (
                messages.map((m, idx) => <MessageBubble key={idx} message={m} />)
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Digite uma mensagem..."
                disabled={sending}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}