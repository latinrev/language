import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BookOpen, Languages, Loader2, Play, Pause, Settings, Plus, Trash2, Search, Volume2, Sparkles, Eye, EyeOff, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Provider = "openai" | "anthropic";
type VocabState = "new" | "learning" | "known";
type ReadingMode = "normal" | "keep_formatting";
type UiLanguage = "en" | "es";
type OpenAIModelId =
  | "gpt-5.4"
  | "gpt-5.4-pro"
  | "gpt-5.4-mini"
  | "gpt-5.4-nano"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "gpt-5"
  | "gpt-4.1"
  | "o3-pro"
  | "o3"
  | "o4-mini"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4o"
  | "gpt-4o-mini";

type LanguageOption = {
  code: string;
  name: string;
  speechTag: string;
};

type Token = {
  surface: string;
  lemma: string;
  gloss: string;
  pos: string;
  difficulty?: number;
  is_idiom?: boolean;
  meaning_in_sentence?: string;
  pronunciation_hint?: string;
};

type Segment = {
  id: string;
  original: string;
  translation: string;
  literal: string;
  grammar_note: string;
  sentence_explanation?: string;
  pronunciation_note?: string;
  simplified?: string;
  sub_segments?: string[];
  tokens: Token[];
};

type TextRecord = {
  id: string;
  title: string;
  sourceLang: string;
  targetLang: string;
  originalText: string;
  segments: Segment[];
  createdAt: number;
  updatedAt: number;
};

type SettingsState = {
  uiLanguage: UiLanguage;
  provider: Provider;
  openaiKey: string;
  openaiModel: OpenAIModelId;
  anthropicKey: string;
  dimKnown: boolean;
  underlineLearning: boolean;
  hideTranslations: boolean;
  hideKnownWords: boolean;
  playbackSpeed: number;
  selectedVoiceURI: string;
};

type DeepDiveCache = Record<string, string>;
type VocabMap = Record<string, VocabState>;

type SelectedWord = {
  token: Token;
  segment: Segment;
};

type AnalysisResponse = {
  segments: Segment[];
};

const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", speechTag: "en-US" },
  { code: "es", name: "Spanish", speechTag: "es-ES" },
  { code: "fr", name: "French", speechTag: "fr-FR" },
  { code: "de", name: "German", speechTag: "de-DE" },
  { code: "it", name: "Italian", speechTag: "it-IT" },
  { code: "pt", name: "Portuguese", speechTag: "pt-PT" },
  { code: "nl", name: "Dutch", speechTag: "nl-NL" },
  { code: "ja", name: "Japanese", speechTag: "ja-JP" },
  { code: "ko", name: "Korean", speechTag: "ko-KR" },
  { code: "zh", name: "Mandarin", speechTag: "zh-CN" },
  { code: "ru", name: "Russian", speechTag: "ru-RU" },
  { code: "ar", name: "Arabic", speechTag: "ar-SA" },
];

const OPENAI_MODELS: Array<{ id: OpenAIModelId; label: string }> = [
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "gpt-5-mini", label: "GPT-5 Mini" },
  { id: "gpt-5-nano", label: "GPT-5 Nano" },
  { id: "o3-pro", label: "o3-pro" },
  { id: "o3", label: "o3" },
  { id: "o4-mini", label: "o4-mini" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { id: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

const SAMPLE_TEXTS: Record<string, { title: string; text: string }> = {
  fr: {
    title: "French Sample",
    text: "T'es la meilleure chose qui m'est arrivée. Mais aussi la pire. Ce jour où je t'ai rencontrée, j'ai compris que l'amour pouvait tout changer.",
  },
  es: {
    title: "Spanish Sample",
    text: "A veces pienso que aprender un idioma es como aprender a mirar el mundo de otra manera. Cada palabra trae una historia distinta.",
  },
  en: {
    title: "English Sample",
    text: "Learning a language is not only about memorizing words. It is about noticing patterns, hearing rhythms, and understanding how people think.",
  },
};

const DEFAULT_SETTINGS: SettingsState = {
  uiLanguage: "en",
  provider: "openai",
  openaiKey: "",
  openaiModel: "gpt-5.4-mini",
  anthropicKey: "",
  dimKnown: true,
  underlineLearning: true,
  hideTranslations: false,
  hideKnownWords: false,
  playbackSpeed: 1,
  selectedVoiceURI: "auto",
};

const storage = {
  keys: {
    settings: "lingua:settings",
    libraryIndex: "lingua:text-library-index",
    text: (id: string) => `lingua:text:${id}`,
    vocab: (sourceLang: string) => `lingua:vocab:${sourceLang}`,
    dive: (sourceLang: string, targetLang: string) => `lingua:deep-dive:${sourceLang}:${targetLang}`,
  },
  loadSettings(): SettingsState {
    try {
      const raw = localStorage.getItem(this.keys.settings);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings(settings: SettingsState) {
    localStorage.setItem(this.keys.settings, JSON.stringify(settings));
  },
  loadLibrary(): string[] {
    try {
      const raw = localStorage.getItem(this.keys.libraryIndex);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  saveLibrary(ids: string[]) {
    localStorage.setItem(this.keys.libraryIndex, JSON.stringify(ids));
  },
  loadText(id: string): TextRecord | null {
    try {
      const raw = localStorage.getItem(this.keys.text(id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  saveText(text: TextRecord) {
    localStorage.setItem(this.keys.text(text.id), JSON.stringify(text));
    const ids = this.loadLibrary();
    if (!ids.includes(text.id)) this.saveLibrary([text.id, ...ids]);
  },
  deleteText(id: string) {
    localStorage.removeItem(this.keys.text(id));
    this.saveLibrary(this.loadLibrary().filter((x) => x !== id));
  },
  loadAllTexts(): TextRecord[] {
    return this.loadLibrary()
      .map((id) => this.loadText(id))
      .filter((x): x is TextRecord => Boolean(x))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  loadVocab(sourceLang: string): VocabMap {
    try {
      const raw = localStorage.getItem(this.keys.vocab(sourceLang));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
  saveVocab(sourceLang: string, vocab: VocabMap) {
    localStorage.setItem(this.keys.vocab(sourceLang), JSON.stringify(vocab));
  },
  loadDeepDive(sourceLang: string, targetLang: string): DeepDiveCache {
    try {
      const raw = localStorage.getItem(this.keys.dive(sourceLang, targetLang));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
  saveDeepDive(sourceLang: string, targetLang: string, cache: DeepDiveCache) {
    localStorage.setItem(this.keys.dive(sourceLang, targetLang), JSON.stringify(cache));
  },
};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function isWordBoundary(ch: string | undefined) {
  if (!ch) return true;
  return !/[\p{L}\p{N}'’-]/u.test(ch);
}

function getLanguageName(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

function getSpeechTag(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.speechTag ?? "en-US";
}

function getBaseLanguageTag(code: string) {
  return getSpeechTag(code).split("-")[0]?.toLowerCase() ?? "en";
}

function getAvailableVoicesForLanguage(code: string) {
  const targetTag = getSpeechTag(code).toLowerCase();
  const baseTag = getBaseLanguageTag(code);
  const languageName = getLanguageName(code).toLowerCase();
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => {
      const lang = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return lang === targetTag || lang.startsWith(`${baseTag}-`) || name.includes(languageName);
    })
    .sort((a, b) => Number(b.localService) - Number(a.localService));
}

function getBestSpeechVoice(code: string) {
  const targetTag = getSpeechTag(code).toLowerCase();
  const baseTag = getBaseLanguageTag(code);
  const languageName = getLanguageName(code).toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === targetTag && v.localService) ||
    voices.find((v) => v.lang.toLowerCase() === targetTag) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(`${baseTag}-`) && v.localService) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(`${baseTag}-`)) ||
    voices.find((v) => v.name.toLowerCase().includes(languageName)) ||
    null
  );
}

function getConfiguredSpeechVoice(code: string, selectedVoiceURI?: string) {
  if (selectedVoiceURI && selectedVoiceURI !== "auto") {
    const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === selectedVoiceURI);
    if (match) return match;
  }
  return getBestSpeechVoice(code);
}

function waitForVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    const timeout = window.setTimeout(() => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeout);
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function groupTokensForMatch(tokens: Token[]) {
  return [...tokens].sort((a, b) => b.surface.length - a.surface.length);
}

function normalizeJsonText(raw: string) {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function buildAnalysisPrompt(sourceLang: string, targetLang: string, text: string) {
  const source = getLanguageName(sourceLang);
  const target = getLanguageName(targetLang);
  return `You are a language-learning analysis engine. Analyze the provided text written in ${source} for a learner who wants all explanations in ${target}.\n\nReturn JSON only. No markdown fences. No prose outside JSON.\n\nSchema:\n{\n  "segments": [\n    {\n      "id": "string",\n      "original": "string",\n      "translation": "string",\n      "literal": "string",\n      "grammar_note": "string",\n      "sentence_explanation": "string",\n      "pronunciation_note": "string",\n      "simplified": "string or omitted",\n      "sub_segments": ["string"] or omitted,\n      "tokens": [\n        {\n          "surface": "string",\n          "lemma": "string",\n          "gloss": "string",\n          "pos": "string",\n          "difficulty": 1,\n          "is_idiom": false,\n          "meaning_in_sentence": "string",\n          "pronunciation_hint": "string"\n        }\n      ]\n    }\n  ]\n}\n\nRules:\n- Segment contiguously. Never break mid-thought.\n- For songs or poems, prefer line breaks as segment boundaries.\n- For prose, prefer sentence boundaries.\n- Only include sub_segments when the sentence is long or complex.\n- Only include simplified when it meaningfully reduces complexity.\n- translation must be natural and fluent in ${target}.\n- literal must preserve source-language structure as much as possible while still being understandable in ${target}.\n- grammar_note must be exactly one concise sentence in ${target}.\n- sentence_explanation must be 3 to 5 concise sentences in ${target} explaining structure, tense, word order, and notable grammar.\n- pronunciation_note must be 1 to 2 concise sentences in ${target} explaining the main pronunciation rule or sound pattern in the sentence.\n- tokens must cover meaningful clickable words from the original text.\n- surface must match the exact appearance in the segment, including apostrophes.\n- Do not split apostrophe contractions into separate clickable tokens when they appear as one visible unit.\n- For French, keep forms like \"t'es\", \"m'est\", \"j'ai\", \"l'amour\", and \"qu'il\" as single surface tokens.\n- lemma must be dictionary form.\n- gloss must be 1 to 3 words in ${target}.\n- meaning_in_sentence must be a short contextual meaning in ${target}.\n- pronunciation_hint must be a very short learner-friendly pronunciation guide in ${target}.\n- difficulty must be an integer from 1 to 5.\n- is_idiom must be true only if the token is part of an idiomatic expression worth flagging.\n\nText:\n${text}`;
}

function buildDeepDivePrompt(sourceLang: string, targetLang: string, segment: string, token: Token) {
  return `You are a language tutor. Explain the word in context.\n\nWrite the entire response in ${getLanguageName(targetLang)}.\nReturn plain text only, not JSON.\nUse this exact structure with these markers:\n🔹 Breakdown\n🔹 Pronunciation\n🔹 Meaning\n🔹 In this sentence\n🔹 Grammar\n🔹 Rule\n🔹 Examples\n\nInstructions:\n- Start with the surface word: \"${token.surface}\".\n- If the lemma is different, show it in parentheses.\n- In Breakdown, explain contractions or compounds if relevant.\n- In Pronunciation, explain how the word is pronounced in a learner-friendly way in the target language.\n- In Meaning, explain the core senses of the lemma.\n- In In this sentence, explain what it means here and why this form is used.\n- In Grammar, explain conjugation, agreement, gender, number, tense, mood, or function when relevant.\n- In Rule, explain one important rule or pattern.\n- In Examples, give 3 or 4 short example sentences in ${getLanguageName(sourceLang)} with translations in ${getLanguageName(targetLang)}.\n\nSource language: ${getLanguageName(sourceLang)}\nTarget explanation language: ${getLanguageName(targetLang)}\nSentence: ${segment}\nSurface: ${token.surface}\nLemma: ${token.lemma}\nPart of speech: ${token.pos}`;
}

async function callProvider(settings: SettingsState, mode: "analysis" | "deep-dive", prompt: string): Promise<string> {
  if (settings.provider === "openai") {
    if (!settings.openaiKey) throw new Error("OpenAI API key missing");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openaiKey}`,
      },
      body: JSON.stringify({
        model: settings.openaiModel,
        input: prompt,
        ...(mode === "analysis" ? { text: { format: { type: "json_object" } } } : {}),
      }),
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const json = await response.json();
    const text = json.output?.[0]?.content?.[0]?.text;
    if (!text) throw new Error("Empty response from OpenAI");
    return text;
  }

  if (!settings.anthropicKey) throw new Error("Anthropic API key missing");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: mode === "analysis" ? 4000 : 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}`);
  const json = await response.json();
  return json.content?.map((c: any) => c.text).join("\n") ?? "";
}

async function analyzeText(settings: SettingsState, sourceLang: string, targetLang: string, text: string): Promise<Segment[]> {
  const raw = await callProvider(settings, "analysis", buildAnalysisPrompt(sourceLang, targetLang, text));
  const parsed = JSON.parse(normalizeJsonText(raw)) as AnalysisResponse;
  if (!parsed.segments || !Array.isArray(parsed.segments)) throw new Error("Provider returned invalid analysis JSON");
  return parsed.segments.map((segment, index) => ({ ...segment, id: segment.id || `seg-${index + 1}`, tokens: Array.isArray(segment.tokens) ? segment.tokens : [] }));
}

async function getDeepDive(settings: SettingsState, sourceLang: string, targetLang: string, segment: Segment, token: Token, cache: DeepDiveCache) {
  const cacheKey = token.lemma.toLowerCase();
  if (cache[cacheKey]) return { text: cache[cacheKey], updatedCache: cache };
  const text = await callProvider(settings, "deep-dive", buildDeepDivePrompt(sourceLang, targetLang, segment.original, token));
  const updatedCache = { ...cache, [cacheKey]: text.trim() };
  return { text: text.trim(), updatedCache };
}

async function speak(text: string, lang: string, rate: number, selectedVoiceURI?: string, onEnd?: () => void) {
  await waitForVoices();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechTag(lang);
  const voice = getConfiguredSpeechVoice(lang, selectedVoiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = rate;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

async function queueSpeak(segments: Segment[], lang: string, rate: number, selectedVoiceURI: string | undefined, onSegmentChange: (id: string | null) => void) {
  await waitForVoices();
  window.speechSynthesis.cancel();
  let current = 0;
  const playNext = () => {
    if (current >= segments.length) {
      onSegmentChange(null);
      return;
    }
    const seg = segments[current];
    onSegmentChange(seg.id);
    const utterance = new SpeechSynthesisUtterance(seg.original);
    utterance.lang = getSpeechTag(lang);
    const voice = getConfiguredSpeechVoice(lang, selectedVoiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = rate;
    utterance.onend = () => {
      current += 1;
      playNext();
    };
    window.speechSynthesis.speak(utterance);
  };
  playNext();
}

function StatusButton({ value, active, onClick, uiLanguage }: { value: VocabState; active: boolean; onClick: () => void; uiLanguage: UiLanguage }) {
  const labelMap: Record<UiLanguage, Record<VocabState, string>> = {
    en: { new: "New", learning: "Learning", known: "Known" },
    es: { new: "Nuevo", learning: "Aprendiendo", known: "Conocido" },
  };
  return <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick}>{labelMap[uiLanguage][value]}</Button>;
}

function TokenRenderer({ segment, vocab, settings, onWordSingleClick, onWordDoubleClick, inline = false }: {
  segment: Segment;
  vocab: VocabMap;
  settings: SettingsState;
  onWordSingleClick: (token: Token, segment: Segment) => void;
  onWordDoubleClick: (token: Token, segment: Segment) => void;
  inline?: boolean;
}) {
  const orderedTokens = useMemo(() => groupTokensForMatch(segment.tokens), [segment.tokens]);
  const original = segment.original;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < original.length) {
    let bestMatch: Token | null = null;
    for (const token of orderedTokens) {
      if (!token.surface) continue;
      if (original.slice(cursor, cursor + token.surface.length) !== token.surface) continue;
      const prev = original[cursor - 1];
      const next = original[cursor + token.surface.length];
      if (!isWordBoundary(prev) || !isWordBoundary(next)) continue;
      bestMatch = token;
      break;
    }
    if (!bestMatch) {
      parts.push(<span key={`plain-${key++}`}>{original[cursor]}</span>);
      cursor += 1;
      continue;
    }

    const state = vocab[bestMatch.lemma.toLowerCase()] ?? "new";
    const hidden = settings.hideKnownWords && state === "known";
    const difficult = typeof bestMatch.difficulty === "number" && bestMatch.difficulty >= 4;

    parts.push(
      <TooltipProvider key={`token-${key++}`} delayDuration={80} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWordSingleClick(bestMatch as Token, segment);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onWordDoubleClick(bestMatch as Token, segment);
              }}
              className={cn(
                "rounded px-0.5 transition hover:bg-muted/70",
                state === "learning" && "font-medium",
                settings.underlineLearning && state === "learning" && "underline decoration-2 underline-offset-4 decoration-muted-foreground",
                settings.dimKnown && state === "known" && "opacity-45",
                difficult && "bg-muted/40",
                bestMatch.is_idiom && "ring-1 ring-inset ring-muted-foreground/30",
                hidden && "text-transparent bg-muted"
              )}
            >
              {hidden ? "█".repeat(Math.max(bestMatch.surface.length, 1)) : bestMatch.surface}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-sm">
              <div className="font-medium">{bestMatch.gloss || bestMatch.meaning_in_sentence || bestMatch.lemma}</div>
              <div className="text-xs text-muted-foreground">{bestMatch.lemma} · {bestMatch.pos}{bestMatch.difficulty ? ` · ${bestMatch.difficulty}/5` : ""}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    cursor += bestMatch.surface.length;
  }

  return inline ? <span className="whitespace-pre-wrap leading-8 text-lg md:text-xl">{parts}</span> : <div className="whitespace-pre-wrap leading-8 text-lg md:text-xl">{parts}</div>;
}

function FormattedTextRenderer({ originalText, segments, selectedSegmentId, activePlaybackSegment, vocab, settings, onSelectSegment, onOpenWord }: {
  originalText: string;
  segments: Segment[];
  selectedSegmentId: string | null;
  activePlaybackSegment: string | null;
  vocab: VocabMap;
  settings: SettingsState;
  onSelectSegment: (segmentId: string) => void;
  onOpenWord: (token: Token, segment: Segment) => void;
}) {
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  segments.forEach((segment, index) => {
    const foundAt = originalText.indexOf(segment.original, cursor);
    if (foundAt === -1) {
      pieces.push(<span key={`fallback-${segment.id}-${index}`}>{segment.original}</span>);
      return;
    }
    if (foundAt > cursor) pieces.push(<span key={`plain-${index}`}>{originalText.slice(cursor, foundAt)}</span>);
    const isFocused = selectedSegmentId === segment.id;
    pieces.push(
      <span
        key={`segment-${segment.id}`}
        role="button"
        tabIndex={0}
        onClick={() => onSelectSegment(segment.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectSegment(segment.id);
          }
        }}
        className={cn("inline rounded px-1 py-0.5 transition", isFocused ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50", activePlaybackSegment === segment.id && "bg-primary/10")}
      >
        <TokenRenderer
          segment={segment}
          vocab={vocab}
          settings={settings}
          inline
          onWordSingleClick={(token, seg) => {
            if (selectedSegmentId === seg.id) onOpenWord(token, seg);
            else onSelectSegment(seg.id);
          }}
          onWordDoubleClick={(token, seg) => {
            onSelectSegment(seg.id);
            onOpenWord(token, seg);
          }}
        />
      </span>
    );
    cursor = foundAt + segment.original.length;
  });
  if (cursor < originalText.length) pieces.push(<span key="tail">{originalText.slice(cursor)}</span>);
  return <div className="whitespace-pre-wrap text-lg leading-9 md:text-xl">{pieces}</div>;
}

export default function LinguaApp() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [library, setLibrary] = useState<TextRecord[]>([]);
  const [sourceLang, setSourceLang] = useState("fr");
  const [targetLang, setTargetLang] = useState("es");
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [currentDive, setCurrentDive] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>("normal");
  const [showTranslation, setShowTranslation] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlaybackSegment, setActivePlaybackSegment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [availableLanguageVoices, setAvailableLanguageVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [vocabVersion, setVocabVersion] = useState(0);
  const diveRequestedRef = useRef(false);

  const selectedText = useMemo(() => library.find((t) => t.id === selectedTextId) ?? null, [library, selectedTextId]);
  const selectedSegment = useMemo(() => selectedText?.segments.find((s) => s.id === selectedSegmentId) ?? null, [selectedText, selectedSegmentId]);
  const vocab = useMemo(() => storage.loadVocab(sourceLang), [sourceLang, selectedTextId, vocabVersion]);
  const filteredLibrary = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return library;
    return library.filter((item) => `${item.title} ${item.originalText}`.toLowerCase().includes(q));
  }, [library, searchTerm]);
  const tx = (en: string, es: string) => (settings.uiLanguage === "es" ? es : en);

  useEffect(() => {
    setSettings(storage.loadSettings());
    setLibrary(storage.loadAllTexts());
  }, []);

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
      setAvailableLanguageVoices(getAvailableVoicesForLanguage(sourceLang));
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [sourceLang]);

  function refreshLibrary() {
    setLibrary(storage.loadAllTexts());
  }

  function resetComposer() {
    setSelectedTextId(null);
    setSelectedSegmentId(null);
    setSelectedWord(null);
    setCurrentDive("");
    setTitle("");
    setInputText("");
    setError(null);
  }

  function loadSample() {
    const sample = SAMPLE_TEXTS[sourceLang] ?? SAMPLE_TEXTS.en;
    setTitle(sample.title);
    setInputText(sample.text);
  }

  async function handleAnalyze() {
    if (!inputText.trim()) {
      setError(tx("Paste some text first.", "Pega un texto primero."));
      return;
    }
    try {
      setAnalysisLoading(true);
      setError(null);
      const segments = await analyzeText(settings, sourceLang, targetLang, inputText.trim());
      const id = createId();
      storage.saveText({ id, title: title.trim() || tx("Untitled text", "Texto sin titulo"), sourceLang, targetLang, originalText: inputText, segments, createdAt: Date.now(), updatedAt: Date.now() });
      refreshLibrary();
      setSelectedTextId(id);
      setSelectedSegmentId(segments[0]?.id ?? null);
      setShowTranslation(!settings.hideTranslations);
      setShowExplanation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Unknown analysis error", "Error de analisis desconocido"));
    } finally {
      setAnalysisLoading(false);
    }
  }

  function handleOpenText(text: TextRecord) {
    setSelectedTextId(text.id);
    setSelectedSegmentId(text.segments[0]?.id ?? null);
    setSourceLang(text.sourceLang);
    setTargetLang(text.targetLang);
    setSelectedWord(null);
    setCurrentDive("");
    setError(null);
  }

  function handleDeleteText(id: string) {
    storage.deleteText(id);
    if (selectedTextId === id) resetComposer();
    refreshLibrary();
  }

  function updateLemmaState(lemma: string, value: VocabState) {
    storage.saveVocab(sourceLang, { ...storage.loadVocab(sourceLang), [lemma.toLowerCase()]: value });
    setVocabVersion((v) => v + 1);
  }

  async function handleExpandDeepDive() {
    if (!selectedWord) return;
    try {
      diveRequestedRef.current = true;
      setDeepDiveLoading(true);
      setError(null);
      const result = await getDeepDive(settings, sourceLang, targetLang, selectedWord.segment, selectedWord.token, storage.loadDeepDive(sourceLang, targetLang));
      storage.saveDeepDive(sourceLang, targetLang, result.updatedCache);
      setCurrentDive(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Unknown deep-dive error", "Error desconocido en analisis profundo"));
    } finally {
      setDeepDiveLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={cn("mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4", sidebarCollapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[320px_1fr]")}>
        <Card className="h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border-0 shadow-xl">
          <CardHeader className={cn("border-b bg-muted/30", sidebarCollapsed ? "space-y-3 p-2" : "space-y-4")}>
            <div className={cn("flex items-center gap-2", sidebarCollapsed ? "flex-col" : "justify-between")}>
              <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
                <div className="rounded-2xl bg-primary/10 p-2"><Languages className="h-5 w-5" /></div>
                {!sidebarCollapsed && <div>
                  <CardTitle className="text-xl">Lingua</CardTitle>
                  <p className="text-sm text-muted-foreground">{tx("Study any text, word by word.", "Estudia cualquier texto, palabra por palabra.")}</p>
                </div>}
              </div>
              <div className={cn("flex items-center gap-2", sidebarCollapsed && "flex-col")}>
                <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => setSidebarCollapsed((prev) => !prev)}>
                  {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
                <Sheet>
                  <SheetTrigger asChild><Button variant="outline" size="icon" className="rounded-2xl"><Settings className="h-4 w-4" /></Button></SheetTrigger>
                <SheetContent className="w-[420px] sm:w-[420px]">
                  <SheetHeader><SheetTitle>{tx("Settings", "Configuracion")}</SheetTitle></SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="space-y-3">
                      <Label>{tx("Interface language", "Idioma de la interfaz")}</Label>
                      <Select value={settings.uiLanguage} onValueChange={(value: UiLanguage) => setSettings((s) => ({ ...s, uiLanguage: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Espanol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label>{tx("AI provider", "Proveedor de IA")}</Label>
                      <Select value={settings.provider} onValueChange={(value: Provider) => setSettings((s) => ({ ...s, provider: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {settings.provider === "openai" ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{tx("OpenAI model", "Modelo de OpenAI")}</Label>
                          <Select value={settings.openaiModel} onValueChange={(value: OpenAIModelId) => setSettings((s) => ({ ...s, openaiModel: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{OPENAI_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{tx("OpenAI API key", "Clave API de OpenAI")}</Label>
                          <Input type="password" value={settings.openaiKey} onChange={(e) => setSettings((s) => ({ ...s, openaiKey: e.target.value }))} placeholder="sk-..." />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>{tx("Anthropic API key", "Clave API de Anthropic")}</Label>
                        <Input type="password" value={settings.anthropicKey} onChange={(e) => setSettings((s) => ({ ...s, anthropicKey: e.target.value }))} placeholder="sk-ant-..." />
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><Label>{tx("Dim known words", "Atenuar palabras conocidas")}</Label><Switch checked={settings.dimKnown} onCheckedChange={(checked) => setSettings((s) => ({ ...s, dimKnown: checked }))} /></div>
                      <div className="flex items-center justify-between"><Label>{tx("Underline learning words", "Subrayar palabras en aprendizaje")}</Label><Switch checked={settings.underlineLearning} onCheckedChange={(checked) => setSettings((s) => ({ ...s, underlineLearning: checked }))} /></div>
                      <div className="flex items-center justify-between"><Label>{tx("Hide translations by default", "Ocultar traducciones por defecto")}</Label><Switch checked={settings.hideTranslations} onCheckedChange={(checked) => setSettings((s) => ({ ...s, hideTranslations: checked }))} /></div>
                      <div className="flex items-center justify-between"><Label>{tx("Hide known words", "Ocultar palabras conocidas")}</Label><Switch checked={settings.hideKnownWords} onCheckedChange={(checked) => setSettings((s) => ({ ...s, hideKnownWords: checked }))} /></div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between"><Label>{tx("Playback speed", "Velocidad de reproduccion")}</Label><span className="text-sm text-muted-foreground">{settings.playbackSpeed.toFixed(2)}x</span></div>
                        <Slider value={[settings.playbackSpeed]} min={0.5} max={1.25} step={0.25} onValueChange={(value) => setSettings((s) => ({ ...s, playbackSpeed: value[0] ?? 1 }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{tx("Voice for source language", "Voz para el idioma origen")}</Label>
                        <Select value={settings.selectedVoiceURI} onValueChange={(value) => setSettings((s) => ({ ...s, selectedVoiceURI: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">{tx("Auto-select best voice", "Seleccionar automaticamente la mejor voz")}</SelectItem>
                            {availableLanguageVoices.map((voice) => <SelectItem key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.localService ? " · local" : ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </SheetContent>
                </Sheet>
              </div>
            </div>
            {!sidebarCollapsed && <div className="space-y-2">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={tx("Search library", "Buscar en la biblioteca")} className="pl-9" /></div>
              <Button onClick={resetComposer} className="w-full rounded-2xl"><Plus className="mr-2 h-4 w-4" />{tx("New text", "Nuevo texto")}</Button>
            </div>}
            {sidebarCollapsed && <Button onClick={resetComposer} variant="outline" size="icon" className="w-full rounded-2xl"><Plus className="h-4 w-4" /></Button>}
          </CardHeader>
          {!sidebarCollapsed && <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3 p-4">
              {filteredLibrary.length === 0 ? (
                <Card className="rounded-3xl border-dashed shadow-none"><CardContent className="flex flex-col items-center gap-3 p-8 text-center"><BookOpen className="h-8 w-8 text-muted-foreground" /><div><p className="font-medium">{tx("No saved texts yet", "Todavia no hay textos guardados")}</p><p className="text-sm text-muted-foreground">{tx("Analyze your first text and it will appear here.", "Analiza tu primer texto y aparecera aqui.")}</p></div></CardContent></Card>
              ) : filteredLibrary.map((item) => (
                <motion.button key={item.id} whileHover={{ y: -1 }} onClick={() => handleOpenText(item)} className={cn("w-full rounded-3xl border p-4 text-left transition", selectedTextId === item.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/30")}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="truncate font-medium">{item.title}</div><div className="mt-1 text-xs text-muted-foreground">{getLanguageName(item.sourceLang)} → {getLanguageName(item.targetLang)}</div><div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.originalText}</div></div><Button variant="ghost" size="icon" className="rounded-2xl" onClick={(e) => { e.stopPropagation(); handleDeleteText(item.id); }}><Trash2 className="h-4 w-4" /></Button></div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>}
        </Card>

        <div className="min-h-[calc(100vh-2rem)]">
          {!selectedText ? (
            <Card className="min-h-[calc(100vh-2rem)] rounded-3xl border-0 shadow-xl">
              <CardContent className="flex h-full flex-col gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">{tx("Paste a text and study it deeply", "Pega un texto y estudialo a fondo")}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{tx("Lingua turns any article, poem, paragraph, or lyric into a layered reading experience with sentence explanations, clickable words, and cached grammar deep dives.", "Lingua convierte cualquier articulo, poema o parrafo en una experiencia de lectura por capas con explicaciones, palabras clicables y analisis gramatical profundo en cache.")}</p></div><Button variant="outline" className="rounded-2xl" onClick={loadSample}><Sparkles className="mr-2 h-4 w-4" />{tx("Try a sample", "Probar ejemplo")}</Button></div>
                {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label>{tx("Source language", "Idioma origen")}</Label><Select value={sourceLang} onValueChange={setSourceLang}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((lang) => <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>{tx("Explanation language", "Idioma de explicacion")}</Label><Select value={targetLang} onValueChange={setTargetLang}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((lang) => <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>{tx("Title", "Titulo")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tx("Optional title", "Titulo opcional")} /></div>
                </div>
                <Card className="rounded-3xl shadow-none"><CardHeader><CardTitle className="text-lg">{tx("Text to study", "Texto para estudiar")}</CardTitle></CardHeader><CardContent><Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={tx("Paste a song, a paragraph, a poem, a news excerpt, or anything else you want to study.", "Pega una cancion, un parrafo, un poema, una noticia o cualquier texto que quieras estudiar.")} className="min-h-[380px] resize-none rounded-2xl" /></CardContent></Card>
                <div className="flex flex-wrap items-center gap-3"><Button onClick={handleAnalyze} disabled={analysisLoading} className="rounded-2xl px-6">{analysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}{tx("Study this text", "Estudiar este texto")}</Button><Button variant="outline" className="rounded-2xl" onClick={loadSample}>{tx("Load sample text", "Cargar texto de ejemplo")}</Button></div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[calc(100vh-2rem)]">
              <Card className="h-full overflow-hidden rounded-3xl border-0 shadow-xl">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="text-2xl">{selectedText.title}</CardTitle><div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Badge variant="secondary">{getLanguageName(selectedText.sourceLang)}</Badge><span>→</span><Badge variant="secondary">{getLanguageName(selectedText.targetLang)}</Badge></div></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center rounded-2xl border bg-background p-1"><Button variant={readingMode === "normal" ? "default" : "ghost"} className="rounded-xl" size="sm" onClick={() => setReadingMode("normal")}>{tx("Normal", "Normal")}</Button><Button variant={readingMode === "keep_formatting" ? "default" : "ghost"} className="rounded-xl" size="sm" onClick={() => setReadingMode("keep_formatting")}>{tx("Keep formatting", "Mantener formato")}</Button></div><Button variant="outline" className="rounded-2xl" onClick={() => { if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); setActivePlaybackSegment(null); } else { void queueSpeak(selectedText.segments, selectedText.sourceLang, settings.playbackSpeed, settings.selectedVoiceURI, setActivePlaybackSegment); } }}>{window.speechSynthesis.speaking ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{window.speechSynthesis.speaking ? tx("Stop full playback", "Detener reproduccion completa") : tx("Play full text", "Reproducir texto completo")}</Button></div></div>
                </CardHeader>
                <ScrollArea className="h-[calc(100vh-140px)]">
                  <div className={cn("grid gap-6 p-6", sidebarCollapsed ? "md:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-[minmax(0,1fr)_360px]")}>
                    <div className="space-y-6 min-w-0">
                      {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
                      <div className="rounded-[28px] border bg-card px-6 py-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3"><div><div className="text-sm font-medium">{tx("Reading view", "Vista de lectura")}</div><div className="text-sm text-muted-foreground">{readingMode === "keep_formatting" ? tx("Keep formatting preserves the pasted spacing and line breaks exactly. Click any sentence once to focus it, and hover words for translation.", "Mantener formato conserva exactamente espacios y saltos de linea. Haz clic en una oracion para enfocarla y pasa el cursor por palabras para ver traduccion.") : tx("Click any sentence once to focus it. Hover a word to see its translation. Click a word in the focused sentence to open it.", "Haz clic en una oracion para enfocarla. Pasa el cursor por una palabra para ver su traduccion. Haz clic en una palabra de la oracion enfocada para abrirla.")}</div></div></div>
                        {readingMode === "keep_formatting" ? (
                          <FormattedTextRenderer originalText={selectedText.originalText} segments={selectedText.segments} selectedSegmentId={selectedSegmentId} activePlaybackSegment={activePlaybackSegment} vocab={vocab} settings={settings} onSelectSegment={setSelectedSegmentId} onOpenWord={(token, seg) => { setSelectedSegmentId(seg.id); setSelectedWord({ token, segment: seg }); setCurrentDive(""); diveRequestedRef.current = false; }} />
                        ) : (
                          <div className="whitespace-pre-wrap text-lg leading-9 md:text-xl">{selectedText.segments.map((segment, index) => { const isFocused = selectedSegmentId === segment.id; return <span key={segment.id}><span role="button" tabIndex={0} onClick={() => setSelectedSegmentId(segment.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSegmentId(segment.id); } }} className={cn("inline rounded px-1 py-0.5 transition", isFocused ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50", activePlaybackSegment === segment.id && "bg-primary/10")}><TokenRenderer segment={segment} vocab={vocab} settings={settings} inline onWordSingleClick={(token, seg) => { if (selectedSegmentId === seg.id) { setSelectedWord({ token, segment: seg }); setCurrentDive(""); diveRequestedRef.current = false; } else { setSelectedSegmentId(seg.id); } }} onWordDoubleClick={(token, seg) => { setSelectedSegmentId(seg.id); setSelectedWord({ token, segment: seg }); setCurrentDive(""); diveRequestedRef.current = false; }} /></span>{index < selectedText.segments.length - 1 ? " " : ""}</span>; })}</div>
                        )}
                      </div>
                    </div>
                    <div className={cn("min-w-0", sidebarCollapsed ? "md:sticky md:top-0 md:self-start" : "xl:sticky xl:top-0 xl:self-start")}>
                      {selectedSegment ? (
                        <div className="rounded-[28px] border bg-card p-5 shadow-sm">
                          <div className="flex flex-col gap-4"><div><div className="text-sm font-medium">{tx("Focused sentence", "Oracion enfocada")}</div><div className="mt-1 text-sm text-muted-foreground">{tx("Use the controls below for this sentence only.", "Usa estos controles solo para esta oracion.")}</div></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" className="rounded-2xl" onClick={() => void speak(selectedSegment.original, selectedText.sourceLang, settings.playbackSpeed, settings.selectedVoiceURI)}><Volume2 className="h-4 w-4" /></Button><Button variant="outline" className="rounded-2xl" onClick={() => setShowTranslation((prev) => !prev)}>{showTranslation ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{showTranslation ? tx("Hide translation", "Ocultar traduccion") : tx("Show translation", "Mostrar traduccion")}</Button><Button variant="outline" className="rounded-2xl" onClick={() => setShowExplanation((prev) => !prev)}>{showExplanation ? tx("Hide explanation", "Ocultar explicacion") : tx("Explain sentence", "Explicar oracion")}</Button></div></div>
                          <div className="mt-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                            {showTranslation && <div className="space-y-3 text-sm md:text-base"><div className="rounded-2xl bg-muted/30 p-3"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Natural translation", "Traduccion natural")}</div><div>{selectedSegment.translation}</div></div><div className="rounded-2xl bg-muted/20 p-3"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Literal translation", "Traduccion literal")}</div><div>{selectedSegment.literal}</div></div><div className="rounded-2xl bg-muted/20 p-3"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Grammar note", "Nota gramatical")}</div><div>{selectedSegment.grammar_note}</div></div>{selectedSegment.pronunciation_note && <div className="rounded-2xl bg-muted/20 p-3"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Pronunciation note", "Nota de pronunciacion")}</div><div>{selectedSegment.pronunciation_note}</div></div>}</div>}
                            <AnimatePresence initial={false}>{showExplanation && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-4 space-y-3 rounded-2xl border bg-muted/20 p-4 text-sm"><div><div className="mb-1 font-medium">{tx("Sentence explanation", "Explicacion de la oracion")}</div><div className="text-muted-foreground">{selectedSegment.sentence_explanation || tx("No sentence explanation was returned.", "No se devolvio explicacion de la oracion.")}</div></div>{selectedSegment.simplified && <div><div className="mb-1 font-medium">{tx("Simplified version", "Version simplificada")}</div><div className="text-muted-foreground">{selectedSegment.simplified}</div></div>}{Array.isArray(selectedSegment.sub_segments) && selectedSegment.sub_segments.length > 0 && <div><div className="mb-1 font-medium">{tx("Clause breakdown", "Desglose de clausulas")}</div><div className="flex flex-wrap gap-2">{selectedSegment.sub_segments.map((sub, idx) => <Badge key={`${selectedSegment.id}-sub-${idx}`} variant="secondary" className="rounded-xl px-3 py-1 whitespace-normal text-left">{sub}</Badge>)}</div></div>}</div></motion.div>}</AnimatePresence>
                          </div>
                        </div>
                      ) : <div className="rounded-[28px] border bg-card p-5 text-sm text-muted-foreground shadow-sm">{tx("Select a sentence to see its translation and explanation here.", "Selecciona una oracion para ver su traduccion y explicacion aqui.")}</div>}
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedWord)} onOpenChange={(open) => !open && setSelectedWord(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden rounded-3xl p-0">
          {selectedWord && <div className="flex h-full flex-col"><DialogHeader className="border-b p-6"><DialogTitle className="text-2xl">{selectedWord.token.surface}{selectedWord.token.lemma !== selectedWord.token.surface ? <span className="ml-2 text-base font-normal text-muted-foreground">({selectedWord.token.lemma})</span> : null}</DialogTitle><DialogDescription>{tx("Layer 1 is instant. Layer 2 generates and caches a full deep dive by lemma.", "La capa 1 es instantanea. La capa 2 genera y guarda en cache un analisis profundo por lema.")}</DialogDescription></DialogHeader><ScrollArea className="max-h-[75vh]"><div className="space-y-6 p-6"><Card className="rounded-3xl shadow-none"><CardHeader><CardTitle className="text-lg">{tx("Quick understanding", "Comprension rapida")}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap items-center gap-2"><Badge>{selectedWord.token.pos}</Badge>{typeof selectedWord.token.difficulty === "number" && <Badge variant="secondary">{tx("Difficulty", "Dificultad")} {selectedWord.token.difficulty}/5</Badge>}{selectedWord.token.is_idiom && <Badge variant="secondary">{tx("Idiomatic", "Idiomatico")}</Badge>}</div><div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-muted/20 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Gloss", "Glosa")}</div><div className="font-medium">{selectedWord.token.gloss || "—"}</div></div><div className="rounded-2xl bg-muted/20 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Meaning in this sentence", "Significado en esta oracion")}</div><div className="font-medium">{selectedWord.token.meaning_in_sentence || selectedWord.token.gloss || "—"}</div></div><div className="rounded-2xl bg-muted/20 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Pronunciation hint", "Pista de pronunciacion")}</div><div className="font-medium">{selectedWord.token.pronunciation_hint || tx("Generate or reanalyze for a quick hint.", "Genera o reanaliza para una pista rapida.")}</div></div></div><div className="rounded-2xl bg-muted/20 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{tx("Sentence", "Oracion")}</div><div>{selectedWord.segment.original}</div></div><div className="flex flex-wrap gap-2">{(["new", "learning", "known"] as VocabState[]).map((state) => <StatusButton key={state} value={state} uiLanguage={settings.uiLanguage} active={(vocab[selectedWord.token.lemma.toLowerCase()] ?? "new") === state} onClick={() => updateLemmaState(selectedWord.token.lemma, state)} />)}<Button variant="outline" size="sm" onClick={() => void speak(selectedWord.token.surface, sourceLang, settings.playbackSpeed, settings.selectedVoiceURI)}><Volume2 className="mr-2 h-4 w-4" />{tx("Play word", "Reproducir palabra")}</Button></div></CardContent></Card><Card className="rounded-3xl shadow-none"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-lg">{tx("Full deep dive", "Analisis profundo completo")}</CardTitle><Button onClick={handleExpandDeepDive} disabled={deepDiveLoading} className="rounded-2xl">{deepDiveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{currentDive ? tx("Refresh deep dive", "Actualizar analisis profundo") : tx("Generate deep dive", "Generar analisis profundo")}</Button></div></CardHeader><CardContent>{currentDive ? <div className="whitespace-pre-wrap rounded-2xl bg-muted/20 p-4 text-sm leading-7">{currentDive}</div> : <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">{tx("Generate the rich explanation only when you need it. Results are cached by lemma for this source and target language pair.", "Genera la explicacion completa solo cuando la necesites. Los resultados se guardan en cache por lema para este par de idiomas.")}</div>}</CardContent></Card></div></ScrollArea></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
