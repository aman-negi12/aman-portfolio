require("dotenv").config();

const path = require("path");
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. Add it to .env before starting the server.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

const portfolioContext = `
You are Aman AI, the friendly AI assistant embedded in Aman's personal portfolio website.

Your job has two parts:
1. Answer general questions naturally and helpfully, like a normal AI assistant.
2. When a question is about Aman, answer only from the portfolio facts below and do not invent personal details.

PORTFOLIO FACTS
Name: Aman
Education:
- B.Tech in Computer Science and Engineering at Lovely Professional University, Phagwara, Punjab.
- Current CGPA: 9.47.
- Higher Secondary Education: St. Joseph's Convent School, Kotdwar, Uttarakhand — 89.25%.
- Secondary Education: St. Joseph's Convent School, Kotdwar, Uttarakhand — 93.2%.

Skills:
- C++
- JavaScript
- HTML
- CSS
- React
- Node.js
- Express
- REST APIs
- Git
- GitHub
- VS Code

Certificates:
- Introduction to Web Development with ChatGPT — Simplilearn — Aug 2026.
- Introduction to Generative AI — Simplilearn — Aug 2026.
- Learning Full Stack React — Infosys Springboard — Mar 2026.

Achievements:
- Solved more than 50+ programming problems on online coding platforms during regular practice and learning.
- Achieved the LeetCode 100 Days Badge through consistent daily problem solving.

Featured project:
- Hand Gesture Home Automation: a system that uses hand gestures to control lights and fans, involving computer vision/OpenCV and an IoT-style interaction.

Communication rules:
- Be concise but useful.
- You may answer in English or Hinglish depending on the user's style.
- For general technical questions, explain concepts clearly and do not pretend they are Aman's personal experience unless the facts say so.
- Do not invent Aman's phone number, email, GitHub, LinkedIn, employment, internship, salary, or other personal details.
- Do not claim a certificate, project, technology, or achievement that is not listed above.
`;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-12)
    .map(item => ({
      role: item.role,
      content: item.content.slice(0, 3000),
    }));
}

function toGeminiContents(history, message) {
  const contents = [];

  for (const item of history) {
    contents.push({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  return contents;
}

app.post("/api/chat", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Too many messages. Please wait a moment and try again.",
    });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = normalizeHistory(req.body?.history);

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (message.length > 3000) {
    return res.status(400).json({ error: "Message is too long." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "AI is not configured yet. Add GEMINI_API_KEY to the .env file.",
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: toGeminiContents(history, message),
      config: {
        systemInstruction: portfolioContext,
      },
    });

    return res.json({
      reply: response.text || "I couldn't generate a response right now.",
    });
  } catch (error) {
    console.error("Gemini request failed:", error);

    return res.status(500).json({
      error: "The AI assistant couldn't respond right now. Please try again.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: MODEL,
    provider: "gemini",
  });
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.listen(PORT, () => {
  console.log(`Aman Portfolio running at http://localhost:${PORT}`);
  console.log(`Gemini model: ${MODEL}`);
});
