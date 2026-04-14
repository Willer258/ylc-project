// === Game Data Types ===

export type HintType = "4images" | "anagram" | "phrase" | "emoji";

export interface HintContent {
  images?: string[];     // 4 URLs for 4-images-1-word
  scrambled?: string;    // shuffled letters for anagram
  text?: string;         // allusive phrase
  emojis?: string[];     // emoji sequence
}

export interface Hint {
  type: HintType;
  content: HintContent;
}

export interface Word {
  index: number;
  value: string;
  letterCount: number;
  hints: Hint[];
}

export interface Phrase {
  text: string;
  reference: string;     // e.g. "Jean 3:16"
  orderIndex: number;
  words: Word[];
}

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  isPublished: boolean;
  phrases: Phrase[];
}

export const HINT_LABELS: Record<HintType, string> = {
  "4images": "4 Images 1 Mot",
  anagram: "Anagramme",
  phrase: "Phrase Allusive",
  emoji: "Emoji Story",
};

export const HINT_ICONS: Record<HintType, string> = {
  "4images": "image",
  anagram: "abc",
  phrase: "format_quote",
  emoji: "emoji_emotions",
};

export function shuffleWord(word: string): string {
  const letters = word.toUpperCase().split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Ensure it's different from original
  const result = letters.join("");
  if (result === word.toUpperCase() && word.length > 1) {
    return shuffleWord(word);
  }
  return result;
}

export function splitPhrase(text: string): Word[] {
  return text.split(/\s+/).map((w, i) => ({
    index: i,
    value: w,
    letterCount: w.length,
    hints: [],
  }));
}
