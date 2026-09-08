import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, Lock, Share2 } from "lucide-react";

// Single note card with inline edit and delete. Only the tutor who owns the
// note ever sees this component (RLS guarantees it server-side).
export default function TutorNoteCard({ note, onUpdated, onDeleted }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [type, setType] = useState(note.type);
  const [saving, setSaving] = useState(false);

  const isShared = note.type === "shared";
  const edited = note.updated_date && note.updated_date !== note.created_date;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await base44.entities.TutorNote.update(note.id, { content: content.trim(), type });
      setEditing(false);
      onUpdated();
      toast({ title: "Note updated" });
    } catch {
      toast({ title: "Error updating note", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await base44.entities.TutorNote.delete(note.id);
      onDeleted();
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Error deleting note", variant: "destructive" });
    }
  };

  if (editing) {
    return (
      <div className="p-4 rounded-2xl bg-white/5 border border-orange-500/30">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="theme-input bg-white/5 border-white/10 text-white resize-none mb-3"
          autoFocus
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setType("private")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                type === "private"
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                  : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
              }`}
            >
              <Lock className="w-3 h-3" /> Private
            </button>
            <button
              onClick={() => setType("shared")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                type === "shared"
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                  : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
              }`}
            >
              <Share2 className="w-3 h-3" /> Shared with student
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setContent(note.content); setType(note.type); }} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !content.trim()} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border transition-all ${isShared ? "bg-blue-500/5 border-blue-500/20" : "bg-white/5 border-white/10"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isShared ? (
            <span className="flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-full">
              <Share2 className="w-3 h-3" /> Shared
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-orange-300 bg-orange-500/15 border border-orange-500/20 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Private
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-orange-400 hover:bg-white/5 transition-all" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="theme-heading text-white text-sm whitespace-pre-wrap break-words leading-relaxed">{note.content}</p>
      <p className="theme-subtext text-xs text-gray-500 mt-2">
        {edited ? `Edited ${formatDate(note.updated_date)}` : formatDate(note.created_date)}
      </p>
    </div>
  );
}