// services/geminiService.ts
// Compatible with @google/genai/web packages that export either GoogleGenAI or GoogleGenerativeAI.

/// <reference types="vite/client" />
import * as GenAI from "@google/genai/web";

// --- ENV ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY environment variable is not set");
}

// --- Client bootstrap (handle both export names) ---
const GoogleClient: any =
  // newer / some builds
  (GenAI as any).GoogleGenerativeAI ||
  // older / other builds
  (GenAI as any).GoogleGenAI;

if (!GoogleClient) {
  throw new Error(
    "Could not find GoogleGenerativeAI or GoogleGenAI in '@google/genai/web'. " +
    "Open node_modules/@google/genai/web/index.d.ts to see the correct export name."
  );
}

const client = new GoogleClient({ apiKey });

// --- Helpers ---
function getModel(name = "gemini-2.5-flash") {
  // Newer SDKs: has getGenerativeModel()
  if (typeof (client as any).getGenerativeModel === "function") {
    return (client as any).getGenerativeModel({ model: name });
  }

  // Older SDKs: expose models.generateContent()
  if ((client as any).models?.generateContent) {
    return {
      async generateContent(prompt: string) {
        // old SDK wants { model, contents: prompt }
        return await (client as any).models.generateContent({
          model: name,
          contents: prompt,
        });
      },
    };
  }

  throw new Error("Your @google/genai version has an unexpected API shape.");
}


async function toText(res: any): Promise<string> {
  // Some builds return response.text(), others response.text
  const t = res?.response?.text;
  if (typeof t === "function") return t.call(res.response);
  if (typeof t === "string") return t;

  // Fallback to candidates schema
  const c = res?.response?.candidates?.[0];
  const parts = c?.content?.parts;
  if (Array.isArray(parts)) {
    const txt = parts.map((p: any) => p?.text).filter(Boolean).join("\n");
    if (txt) return txt;
  }
  return "";
}

// --- Optional quick sanity ping (use from App if you want) ---
export async function pingGemini() {
  const res = await getModel().generateContent("Say 'ready' if you can hear me.");
  const text = await toText(res);
  return text || "(no text)";
}

// --- Service used by App.tsx ---
export const geminiService = {
  async askQuestion(
    question: string,
    sourceContent: string,
    useThinkingMode: boolean
  ): Promise<string> {
    try {

      // 🔍 quick debug line – remove later
      console.log("Using API key prefix:", apiKey?.slice(0, 6) || "none");

      const modelName = useThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";

      const systemHint = useThinkingMode
        ? "Think step by step, state key assumptions, then answer concisely."
        : "Answer concisely and clearly.";

      const prompt = [
        systemHint,
        "Use the SOURCE when relevant. If the SOURCE lacks the answer, say so briefly.",
        "",
        "--- SOURCE ---",
        sourceContent,
        "--- END SOURCE ---",
        "",
        `QUESTION: ${question}`,
      ].join("\n");

      const res = await getModel(modelName).generateContent(prompt);
      const text = await toText(res);
      return text || "I couldn’t produce an answer.";
    } catch (err) {
      console.error("askQuestion error:", err);
      return "Sorry, I encountered an error while processing your question.";
    }
  },

  async generateReport(sourceContent: string): Promise<string> {
    try {
      const prompt = [
        "Create a crisp, well-structured report with short sections:",
        "- Key ideas",
        "- Evidence",
        "- Uncertainties / open questions",
        "End with 3 actionable next steps.",
        "",
        "--- SOURCE ---",
        sourceContent,
        "--- END SOURCE ---",
      ].join("\n");

      const res = await getModel("gemini-2.5-pro").generateContent(prompt);
      const text = await toText(res);
      return text || "No report text returned.";
    } catch (err) {
      console.error("generateReport error:", err);
      return "Sorry, I encountered an error while generating the report.";
    }
  },

  async generateFlashcards(sourceContent: string) {
    try {
      // Keep it simple: ask for strict JSON and parse it
      const prompt = [
        "From the SOURCE, produce 8–12 flashcards as pure JSON (no prose):",
        `[
  {"question":"...", "answer":"..."},
  {"question":"...", "answer":"..."}
]`,
        "Short Q/A, one idea per card. No markdown, only JSON.",
        "",
        "--- SOURCE ---",
        sourceContent,
        "--- END SOURCE ---",
      ].join("\n");

      const res = await getModel("gemini-2.5-flash").generateContent(prompt);
      const text = (await toText(res)).trim();

      // Parse best-effort: exact JSON or extract first JSON array
      let arr: any[] | null = null;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        const m = text.match(/\[[\s\S]*\]/);
        if (m) {
          try {
            const parsed = JSON.parse(m[0]);
            if (Array.isArray(parsed)) arr = parsed;
          } catch { }
        }
      }

      const cards = (arr || []).map((card, i) => ({
        id: `flashcard-${Date.now()}-${i}`,
        question: String(card?.question ?? "").trim(),
        answer: String(card?.answer ?? "").trim(),
      }));

      return cards.length ? cards : [{ id: `flashcard-${Date.now()}-0`, question: "Summary", answer: text.slice(0, 1000) }];
    } catch (err) {
      console.error("generateFlashcards error:", err);
      return [];
    }
  },
};
