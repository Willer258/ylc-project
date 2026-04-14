"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

const TEMPLATES_COL = "gameTemplates";

interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  phraseCount: number;
  isPublished: boolean;
  createdAt: Date;
}

export default function AdminGameTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const q = query(collection(db, TEMPLATES_COL), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Sans nom",
          description: d.data().description || "",
          phraseCount: d.data().phrases?.length || 0,
          isPublished: d.data().isPublished || false,
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
        }))
      );
    });
    return unsub;
  }, []);

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await addDoc(collection(db, TEMPLATES_COL), {
        name: newName.trim(),
        description: "",
        phrases: [],
        isPublished: false,
        createdAt: serverTimestamp(),
      });
      setNewName("");
    } catch (err) {
      console.error("Create template error:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await deleteDoc(doc(db, TEMPLATES_COL, id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Templates de Jeu</h1>
        {templates.length > 0 && (
          <button
            onClick={async () => {
              if (!confirm(`Supprimer les ${templates.length} templates ?`)) return;
              for (const t of templates) await deleteDoc(doc(db, TEMPLATES_COL, t.id));
            }}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20"
          >
            Tout supprimer
          </button>
        )}
      </div>

      {/* Create */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du nouveau template..."
          className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-30 transition-colors"
        >
          + Creer
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white/5 border border-white/5 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white truncate">{t.name}</h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    t.isPublished
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {t.isPublished ? "Publie" : "Brouillon"}
                </span>
              </div>
              <p className="text-sm text-white/40 mt-1">
                {t.phraseCount} phrase{t.phraseCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/game/templates/${t.id}`}
                className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-colors"
              >
                Editer
              </Link>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-2 rounded-lg bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <span className="material-symbols-outlined text-4xl block mb-3">sports_esports</span>
            Aucun template. Creez-en un pour configurer le jeu.
          </div>
        )}
      </div>
    </div>
  );
}
