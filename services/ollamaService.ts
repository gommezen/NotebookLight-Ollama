// services/ollamaService.ts
// Drop-in local replacement using Ollama's HTTP API on localhost:11434

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "qwen2.5:7b-instruct-q4_0"; // or "qwen2.5:7b-instruct-q4_0, llama3.1:8b-instruct-q8_0" for better quality

async function queryOllama(prompt: string): Promise<string> {
    const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama error ${res.status}: ${errText}`);
    }

    // Ollama streams, so we have to read lines
    const reader = res.body?.getReader();
    if (!reader) return "(no response body)";
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Each line of Ollama stream is a JSON object
        for (const line of chunk.split("\n").filter(Boolean)) {
            try {
                const json = JSON.parse(line);
                if (json.response) result += json.response;
            } catch { /* ignore parse errors from partial lines */ }
        }
    }
    return result.trim();
}

export const geminiService = {
    async askQuestion(question: string, sourceContent: string, useThinkingMode: boolean) {
        const systemHint = useThinkingMode
            ? "Think step by step, state assumptions clearly, then answer concisely."
            : "Answer clearly and concisely.";

        const prompt = [
            systemHint,
            "",
            "--- SOURCE ---",
            sourceContent,
            "--- END SOURCE ---",
            "",
            `QUESTION: ${question}`,
        ].join("\n");

        try {
            return await queryOllama(prompt);
        } catch (err) {
            console.error("askQuestion (Ollama) error:", err);
            return "Sorry, I encountered an error while processing your question.";
        }
    },

    async generateReport(sourceContent: string): Promise<string> {
        const prompt = [
            "Write a short, well-structured report with sections:",
            "- Key ideas",
            "- Evidence",
            "- Open questions",
            "End with 3 actionable next steps.",
            "",
            "--- SOURCE ---",
            sourceContent,
            "--- END SOURCE ---",
        ].join("\n");
        return await queryOllama(prompt);
    },

    async generateFlashcards(sourceContent: string) {
        const prompt = [
            "Create 8–12 concise Q/A flashcards as JSON:",
            `[
  {"question":"...","answer":"..."}
]`,
            "Keep answers short and factual.",
            "",
            "--- SOURCE ---",
            sourceContent,
            "--- END SOURCE ---",
        ].join("\n");

        const text = await queryOllama(prompt);
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
        } catch { }
        return [{ question: "Summary", answer: text }];
    },
};
