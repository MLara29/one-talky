import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lock, Share2, Plus, StickyNote } from "lucide-react";
import TutorNoteCard from "@/components/tutor/TutorNoteCard";

// Notes section shown on the tutor's view of a student profile.
// RLS guarantees the tutor only ever receives their own notes (private + shared)
// for this student — notes from other tutors are invisible server-side.
export default function TutorNotesSection({ studentId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("private");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadNotes(); }, [studentId]);

  const loadNotes = async () => {
    try {
      const result = await base44.entities.TutorNote.filter({ student_id: studentId });
      setNotes(result.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)));
    } catch (e) {
      console.error("[TutorNotesSection] load error:", e);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      await base44.entities.TutorNote.create({
        tutor_id: user.id,
        student_id: studentId,
        type: newType,
        content: newContent.trim(),
      });
      setNewContent("");
      setShowForm(false);
      await loadNotes();
      toast({ title: "Note saved" });
    } catch {
      toast({ title: "Error saving note", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const privateNotes = notes.filter(n => n.type === "private");
  const sharedNotes = notes.filter(n => n.type === "shared");

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="theme-heading font-display font-bold text-white flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-orange-400" /> Annotations
        </h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
            <Plus className="w-4 h-4" /> Add note
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-orange-500/30">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            placeholder="Write your note about this student..."
            className="theme-input bg-white/5 border-white/10 text-white resize-none mb-3"
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setNewType("private")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  newType === "private"
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                }`}
              >
                <Lock className="w-3 h-3" /> Private
              </button>
              <button
                onClick={() => setNewType("shared")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  newType === "shared"
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                }`}
              >
                <Share2 className="w-3 h-3" /> Shared with student
              </button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewContent(""); }} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving || !newContent.trim()} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                {saving ? "Saving..." : "Save note"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 && !showForm ? (
        <div className="text-center py-10">
          <StickyNote className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="theme-subtext text-sm text-gray-500">No notes yet for this student.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {privateNotes.length > 0 && (
            <div>
              <h3 className="theme-heading text-xs font-bold uppercase tracking-wide text-orange-300 mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Private notes ({privateNotes.length})
              </h3>
              <div className="space-y-3">
                {privateNotes.map(n => <TutorNoteCard key={n.id} note={n} onUpdated={loadNotes} onDeleted={loadNotes} />)}
              </div>
            </div>
          )}
          {sharedNotes.length > 0 && (
            <div>
              <h3 className="theme-heading text-xs font-bold uppercase tracking-wide text-blue-300 mb-3 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Shared with student ({sharedNotes.length})
              </h3>
              <div className="space-y-3">
                {sharedNotes.map(n => <TutorNoteCard key={n.id} note={n} onUpdated={loadNotes} onDeleted={loadNotes} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}