import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

// Searchable single-recipient picker for a given role ("tutor" | "student").
// Loads all users of that role once, then filters client-side by name/email.
export default function RecipientPicker({ role, value, onChange }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.entities.User.filter({ role }).then(setUsers).catch(() => setUsers([]));
  }, [role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users.filter(
      (u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [users, query]);

  if (value) {
    return (
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{value.full_name || "—"}</p>
          <p className="text-gray-500 text-xs truncate">{value.email}</p>
        </div>
        <button onClick={() => onChange(null)} className="text-gray-500 hover:text-white shrink-0 ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={role === "tutor" ? "Buscar tutor por nome ou e-mail..." : "Buscar aluno por nome ou e-mail..."}
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pl-9"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-gray-950 border border-white/10 rounded-xl shadow-xl">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-2.5">Nenhum resultado</p>
          )}
          {filtered.map((u) => (
            <button
              key={u.id}
              onMouseDown={() => { onChange(u); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
            >
              <p className="text-white text-sm truncate">{u.full_name || "—"}</p>
              <p className="text-gray-500 text-xs truncate">{u.email}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}