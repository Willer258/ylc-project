"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Phrase, Word, Hint, HintType, GameTemplate } from "@/lib/game-types";
import { splitPhrase, shuffleWord, HINT_LABELS, HINT_ICONS } from "@/lib/game-types";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<GameTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [activePhrase, setActivePhrase] = useState<number | null>(null);
  const [activeWord, setActiveWord] = useState<number | null>(null);

  // Load template
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "gameTemplates", templateId), (snap) => {
      if (snap.exists()) {
        setTemplate({
          id: snap.id,
          name: snap.data().name || "",
          description: snap.data().description || "",
          createdAt: snap.data().createdAt?.toDate?.() || new Date(),
          isPublished: snap.data().isPublished || false,
          phrases: snap.data().phrases || [],
        });
      }
    });
    return unsub;
  }, [templateId]);

  // Auto-save
  const save = useCallback(
    async (updates: Partial<GameTemplate>) => {
      if (!template) return;
      setSaving(true);
      try {
        await updateDoc(doc(db, "gameTemplates", templateId), updates);
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [template, templateId]
  );

  function updatePhrases(phrases: Phrase[]) {
    setTemplate((prev) => (prev ? { ...prev, phrases } : null));
    save({ phrases });
  }

  // === Phrase operations ===
  function addPhrase() {
    if (!template) return;
    const newPhrase: Phrase = {
      text: "",
      reference: "",
      orderIndex: template.phrases.length,
      words: [],
    };
    updatePhrases([...template.phrases, newPhrase]);
    setActivePhrase(template.phrases.length);
  }

  function updatePhrase(index: number, updates: Partial<Phrase>) {
    if (!template) return;
    const phrases = [...template.phrases];
    phrases[index] = { ...phrases[index], ...updates };
    updatePhrases(phrases);
  }

  function deletePhrase(index: number) {
    if (!template || !confirm("Supprimer cette phrase ?")) return;
    const phrases = template.phrases.filter((_, i) => i !== index);
    updatePhrases(phrases);
    setActivePhrase(null);
  }

  function splitPhraseIntoWords(index: number) {
    if (!template) return;
    const phrase = template.phrases[index];
    if (!phrase.text.trim()) return;
    const words = splitPhrase(phrase.text);
    updatePhrase(index, { words });
  }

  // === Word hint operations ===
  function addHint(phraseIndex: number, wordIndex: number, type: HintType) {
    if (!template) return;
    const phrases = [...template.phrases];
    const word = { ...phrases[phraseIndex].words[wordIndex] };
    const hint: Hint = { type, content: {} };

    // Auto-generate content for anagram
    if (type === "anagram") {
      hint.content.scrambled = shuffleWord(word.value);
    }

    word.hints = [...word.hints, hint];
    phrases[phraseIndex].words[wordIndex] = word;
    updatePhrases(phrases);
  }

  function updateHint(
    phraseIndex: number,
    wordIndex: number,
    hintIndex: number,
    hint: Hint
  ) {
    if (!template) return;
    const phrases = [...template.phrases];
    const word = { ...phrases[phraseIndex].words[wordIndex] };
    word.hints = [...word.hints];
    word.hints[hintIndex] = hint;
    phrases[phraseIndex].words[wordIndex] = word;
    updatePhrases(phrases);
  }

  function removeHint(phraseIndex: number, wordIndex: number, hintIndex: number) {
    if (!template) return;
    const phrases = [...template.phrases];
    const word = { ...phrases[phraseIndex].words[wordIndex] };
    word.hints = word.hints.filter((_, i) => i !== hintIndex);
    phrases[phraseIndex].words[wordIndex] = word;
    updatePhrases(phrases);
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/game/templates")}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <input
              type="text"
              value={template.name}
              onChange={(e) => {
                setTemplate({ ...template, name: e.target.value });
                save({ name: e.target.value });
              }}
              className="text-2xl font-bold bg-transparent text-white focus:outline-none border-b border-transparent focus:border-amber-500/30 pb-1"
              placeholder="Nom du template"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-white/30">Sauvegarde...</span>}
          <button
            onClick={() => save({ isPublished: !template.isPublished })}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              template.isPublished
                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {template.isPublished ? "Publie ✓" : "Publier"}
          </button>
        </div>
      </div>

      {/* Description */}
      <input
        type="text"
        value={template.description}
        onChange={(e) => {
          setTemplate({ ...template, description: e.target.value });
          save({ description: e.target.value });
        }}
        className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-white/60 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30 mb-8"
        placeholder="Description du template (optionnel)"
      />

      {/* Phrases */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white/70">
          Phrases ({template.phrases.length})
        </h2>
        <button
          onClick={addPhrase}
          className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-colors"
        >
          + Ajouter une phrase
        </button>
      </div>

      <div className="space-y-4">
        {template.phrases.map((phrase, pi) => (
          <PhraseCard
            key={pi}
            phrase={phrase}
            index={pi}
            isActive={activePhrase === pi}
            activeWord={activePhrase === pi ? activeWord : null}
            onToggle={() => setActivePhrase(activePhrase === pi ? null : pi)}
            onSetActiveWord={(wi) => setActiveWord(wi)}
            onUpdate={(updates) => updatePhrase(pi, updates)}
            onDelete={() => deletePhrase(pi)}
            onSplit={() => splitPhraseIntoWords(pi)}
            onAddHint={(wi, type) => addHint(pi, wi, type)}
            onUpdateHint={(wi, hi, hint) => updateHint(pi, wi, hi, hint)}
            onRemoveHint={(wi, hi) => removeHint(pi, wi, hi)}
          />
        ))}
      </div>

      {template.phrases.length === 0 && (
        <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
          <span className="material-symbols-outlined text-4xl text-white/20 block mb-3">
            menu_book
          </span>
          <p className="text-white/30 mb-4">Aucune phrase. Ajoutez un verset biblique.</p>
          <button
            onClick={addPhrase}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm"
          >
            + Ajouter une phrase
          </button>
        </div>
      )}
    </div>
  );
}

// === Phrase Card Component ===
function PhraseCard({
  phrase,
  index,
  isActive,
  activeWord,
  onToggle,
  onSetActiveWord,
  onUpdate,
  onDelete,
  onSplit,
  onAddHint,
  onUpdateHint,
  onRemoveHint,
}: {
  phrase: Phrase;
  index: number;
  isActive: boolean;
  activeWord: number | null;
  onToggle: () => void;
  onSetActiveWord: (wi: number | null) => void;
  onUpdate: (updates: Partial<Phrase>) => void;
  onDelete: () => void;
  onSplit: () => void;
  onAddHint: (wordIndex: number, type: HintType) => void;
  onUpdateHint: (wordIndex: number, hintIndex: number, hint: Hint) => void;
  onRemoveHint: (wordIndex: number, hintIndex: number) => void;
}) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
      {/* Header (collapsible) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 text-left min-w-0">
          <span className="text-xs font-bold text-white/30 shrink-0">#{index + 1}</span>
          <span className="text-white font-medium truncate">
            {phrase.text || "Phrase vide..."}
          </span>
          {phrase.reference && (
            <span className="text-xs text-amber-400/60 shrink-0">({phrase.reference})</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/30">{phrase.words.length} mots</span>
          <span className="material-symbols-outlined text-white/30 text-lg">
            {isActive ? "expand_less" : "expand_more"}
          </span>
        </div>
      </button>

      {/* Body */}
      {isActive && (
        <div className="border-t border-white/5 p-5 space-y-5">
          {/* Text + Reference */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-1 block">
                Phrase / Verset
              </label>
              <input
                type="text"
                value={phrase.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Ex: Car Dieu a tant aime le monde"
                className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-1 block">
                Reference
              </label>
              <input
                type="text"
                value={phrase.reference}
                onChange={(e) => onUpdate({ reference: e.target.value })}
                placeholder="Jean 3:16"
                className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </div>

          {/* Split button */}
          <button
            onClick={onSplit}
            disabled={!phrase.text.trim()}
            className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-bold hover:bg-blue-500/20 disabled:opacity-30 transition-colors"
          >
            Decouper en mots ({phrase.text.trim().split(/\s+/).length} mots)
          </button>

          {/* Words */}
          {phrase.words.length > 0 && (
            <div>
              <p className="text-xs text-white/30 font-bold uppercase tracking-widest mb-3">
                Mots a deviner
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {phrase.words.map((word, wi) => (
                  <button
                    key={wi}
                    onClick={() => onSetActiveWord(activeWord === wi ? null : wi)}
                    className={`px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                      activeWord === wi
                        ? "bg-amber-500 text-black font-bold"
                        : word.hints.length > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {word.value}
                    <span className="text-[10px] ml-1 opacity-60">
                      ({word.letterCount})
                    </span>
                    {word.hints.length > 0 && (
                      <span className="ml-1 text-[10px]">
                        {word.hints.length} indice{word.hints.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Active word — hints editor */}
              {activeWord !== null && phrase.words[activeWord] && (
                <WordHintsEditor
                  word={phrase.words[activeWord]}
                  wordIndex={activeWord}
                  onAddHint={(type) => onAddHint(activeWord, type)}
                  onUpdateHint={(hi, hint) => onUpdateHint(activeWord, hi, hint)}
                  onRemoveHint={(hi) => onRemoveHint(activeWord, hi)}
                />
              )}
            </div>
          )}

          {/* Delete */}
          <div className="pt-3 border-t border-white/5">
            <button
              onClick={onDelete}
              className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
            >
              Supprimer cette phrase
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === Word Hints Editor ===
function WordHintsEditor({
  word,
  wordIndex,
  onAddHint,
  onUpdateHint,
  onRemoveHint,
}: {
  word: Word;
  wordIndex: number;
  onAddHint: (type: HintType) => void;
  onUpdateHint: (hintIndex: number, hint: Hint) => void;
  onRemoveHint: (hintIndex: number) => void;
}) {
  const availableTypes: HintType[] = ["4images", "anagram", "phrase", "emoji"];
  const usedTypes = word.hints.map((h) => h.type);

  return (
    <div className="bg-white/[0.03] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">
          Indices pour &ldquo;{word.value}&rdquo;
        </p>
        <span className="text-xs text-white/30">{word.letterCount} lettres</span>
      </div>

      {/* Existing hints */}
      {word.hints.map((hint, hi) => (
        <div key={hi} className="bg-white/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">
                {HINT_ICONS[hint.type]}
              </span>
              <span className="text-sm font-bold text-white/70">
                {HINT_LABELS[hint.type]}
              </span>
            </div>
            <button
              onClick={() => onRemoveHint(hi)}
              className="text-white/20 hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Type-specific editor */}
          {hint.type === "4images" && (
            <div>
              <p className="text-xs text-white/30 mb-2">URLs des 4 images (Cloudinary)</p>
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  value={hint.content.images?.[i] || ""}
                  onChange={(e) => {
                    const images = [...(hint.content.images || ["", "", "", ""])];
                    images[i] = e.target.value;
                    onUpdateHint(hi, { ...hint, content: { ...hint.content, images } });
                  }}
                  placeholder={`Image ${i + 1} URL`}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:outline-none mb-1"
                />
              ))}
            </div>
          )}

          {hint.type === "anagram" && (
            <div>
              <p className="text-xs text-white/30 mb-1">Lettres melangees</p>
              <input
                type="text"
                value={hint.content.scrambled || ""}
                onChange={(e) =>
                  onUpdateHint(hi, { ...hint, content: { ...hint.content, scrambled: e.target.value } })
                }
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none"
              />
            </div>
          )}

          {hint.type === "phrase" && (
            <div>
              <p className="text-xs text-white/30 mb-1">Phrase allusive</p>
              <textarea
                value={hint.content.text || ""}
                onChange={(e) =>
                  onUpdateHint(hi, { ...hint, content: { ...hint.content, text: e.target.value } })
                }
                placeholder="Ex: Ce que Dieu donne qu'on ne merite pas"
                rows={2}
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none resize-none"
              />
            </div>
          )}

          {hint.type === "emoji" && (
            <div>
              <p className="text-xs text-white/30 mb-1">Sequence d&apos;emojis</p>
              <input
                type="text"
                value={hint.content.emojis?.join(" ") || ""}
                onChange={(e) => {
                  const emojis = e.target.value.split(/\s+/).filter(Boolean);
                  onUpdateHint(hi, { ...hint, content: { ...hint.content, emojis } });
                }}
                placeholder="🙏 ✨ 🎁 (separes par des espaces)"
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-lg focus:outline-none"
              />
            </div>
          )}
        </div>
      ))}

      {/* Add hint buttons */}
      <div className="flex flex-wrap gap-2">
        {availableTypes
          .filter((t) => !usedTypes.includes(t))
          .map((type) => (
            <button
              key={type}
              onClick={() => onAddHint(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs font-bold hover:bg-white/10 hover:text-white/60 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{HINT_ICONS[type]}</span>
              + {HINT_LABELS[type]}
            </button>
          ))}
      </div>
    </div>
  );
}
