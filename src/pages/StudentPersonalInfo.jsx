import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, OBJECTIVES, LEVELS, INTERESTS } from "@/lib/constants";
import { User, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const LEVELS_PT = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export default function StudentPersonalInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    target_language: "",
    level: "",
    objective: "",
    conversation_topics: [],
  });

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        setProfile(p);
        setForm({
          full_name: p.full_name || "",
          target_language: p.target_language || "",
          level: p.level || "",
          objective: p.objective || "",
          conversation_topics: p.conversation_topics || [],
        });
      }
    } finally { setLoading(false); }
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleTopic = (topic) => {
    set("conversation_topics", form.conversation_topics.includes(topic)
      ? form.conversation_topics.filter(t => t !== topic)
      : [...form.conversation_topics, topic]
    );
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const response = await base44.functions.invoke("updateMyProfile", {
        updates: {
          full_name: form.full_name,
          target_language: form.target_language,
          level: form.level,
          objective: form.objective,
          conversation_topics: form.conversation_topics,
        },
      });
      if (response.data?.error) throw new Error(response.data.error);
      await base44.auth.updateMe({ full_name: form.full_name });
      toast({ title: "Perfil atualizado! ✅" });
      loadProfile();
    } catch (e) {
      toast({ title: "Erro", description: e?.message || "Não foi possível salvar.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const inputCls = "theme-input";
  const selectTriggerCls = "theme-input";
  const labelCls = "theme-subtext text-sm mb-1 block";

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="theme-heading font-display text-xl font-bold">Informações Pessoais</h1>
          <p className="theme-subtext text-sm text-gray-500">Atualize seu perfil e preferências de aprendizado</p>
        </div>
      </div>

      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <div>
          <Label className={labelCls}>Nome completo</Label>
          <Input
            value={form.full_name}
            onChange={e => set("full_name", e.target.value)}
            placeholder="Seu nome"
            className={inputCls}
          />
        </div>

        <div>
          <Label className={labelCls}>Nível atual</Label>
          <Select value={form.level} onValueChange={v => set("level", v)}>
            <SelectTrigger className={selectTriggerCls}>
              <SelectValue placeholder="Selecione seu nível" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map(l => (
                <SelectItem key={l.value} value={l.value}>{LEVELS_PT[l.value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={labelCls}>Objetivo principal</Label>
          <Select value={form.objective} onValueChange={v => set("objective", v)}>
            <SelectTrigger className={selectTriggerCls}>
              <SelectValue placeholder="Selecione seu objetivo" />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={labelCls}>Tópicos favoritos de conversa</Label>
          <p className="text-xs text-gray-500 mb-3">Selecione os temas que você mais gosta</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(topic => (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  form.conversation_topics.includes(topic)
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-orange-400 hover:text-orange-400"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}