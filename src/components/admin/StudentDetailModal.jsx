import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Clock, BookOpen, Ban, CheckCircle, Trash2, Plus } from "lucide-react";

const PLAN_COLORS = {
  free:     "bg-gray-500/10 border-gray-500/20 text-gray-400",
  basic:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
  standard: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  premium:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
  blocked:  "bg-red-500/10 border-red-500/20 text-red-400",
};

export default function StudentDetailModal({ student, userEmail, open, onClose, onUpdated, onDeleted }) {
  const { toast } = useToast();
  const [minutesToAdd, setMinutesToAdd] = useState("");
  const [addingMinutes, setAddingMinutes] = useState(false);
  const [blocking, setBlocking] = useState(false);

  if (!student) return null;

  const planLabel = student.plan || "free";
  const planColor = PLAN_COLORS[planLabel] || PLAN_COLORS.free;

  const handleAddMinutes = async () => {
    const mins = parseInt(minutesToAdd);
    if (!mins || mins <= 0) {
      toast({ title: "Informe uma quantidade válida de minutos.", variant: "destructive" });
      return;
    }
    setAddingMinutes(true);
    try {
      const newTotal = (student.credits_minutes ?? 0) + mins;
      await base44.entities.StudentProfile.update(student.id, { credits_minutes: newTotal });
      toast({ title: `✅ ${mins} minutos adicionados para ${student.full_name}!` });
      setMinutesToAdd("");
      onUpdated({ ...student, credits_minutes: newTotal });
    } catch (e) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally { setAddingMinutes(false); }
  };

  const handleBlock = async () => {
    setBlocking(true);
    try {
      const newPlan = student.plan === "blocked" ? "free" : "blocked";
      await base44.entities.StudentProfile.update(student.id, { plan: newPlan });
      toast({ title: newPlan === "blocked" ? "Aluno bloqueado" : "Aluno desbloqueado" });
      onUpdated({ ...student, plan: newPlan });
      onClose();
    } catch (e) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally { setBlocking(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Deletar ${student.full_name}? Esta ação não pode ser desfeita.`)) return;
    await base44.entities.StudentProfile.delete(student.id);
    toast({ title: "Aluno deletado" });
    onDeleted(student.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img
              src={student.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=7c3aed&color=fff&size=40`}
              className="w-10 h-10 rounded-xl object-cover"
              alt=""
            />
            <div>
              <p className="font-bold text-base">{student.full_name}</p>
              <p className="text-xs text-gray-400 font-normal">{userEmail || "—"}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <div className="text-lg font-bold text-white">{student.credits_minutes ?? 0}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Minutos
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <div className="text-lg font-bold text-white">{student.total_lessons ?? 0}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
              <BookOpen className="w-3 h-3" /> Aulas
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${planColor}`}>
              {planLabel}
            </span>
            <div className="text-xs text-gray-400 mt-1.5">Plano</div>
          </div>
        </div>

        {/* Extra info */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/8 space-y-1.5 text-sm">
          {student.target_language && (
            <div className="flex justify-between">
              <span className="text-gray-400">Idioma</span>
              <span className="text-white capitalize">{student.target_language.replace("_", " ")}</span>
            </div>
          )}
          {student.level && (
            <div className="flex justify-between">
              <span className="text-gray-400">Nível</span>
              <span className="text-white capitalize">{student.level}</span>
            </div>
          )}
          {student.objective && (
            <div className="flex justify-between">
              <span className="text-gray-400">Objetivo</span>
              <span className="text-white capitalize">{student.objective}</span>
            </div>
          )}
          {student.streak_days > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Sequência</span>
              <span className="text-white">{student.streak_days} dias 🔥</span>
            </div>
          )}
        </div>

        {/* Add minutes */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">Adicionar minutos</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={minutesToAdd}
              onChange={e => setMinutesToAdd(e.target.value)}
              placeholder="Ex: 60"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <Button
              onClick={handleAddMinutes}
              disabled={addingMinutes || !minutesToAdd}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              {addingMinutes ? "..." : "Adicionar"}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleBlock}
            disabled={blocking}
            variant="ghost"
            className={`flex-1 ${student.plan === "blocked" ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"}`}
          >
            {student.plan === "blocked" ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <Ban className="w-4 h-4 mr-1.5" />}
            {student.plan === "blocked" ? "Desbloquear" : "Bloquear"}
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Deletar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}