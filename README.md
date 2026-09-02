# Aman Portfolio — Gemini AI version

This version keeps the portfolio UI/design and resume experience, but replaces the OpenAI backend with Google's Gemini Developer API.

## Setup

1. Install Node.js 20+.
2. Open this folder in VS Code.
3. Run:

```bash
npm install
```

4. Create a `.env` file from `.env.example` and add your Gemini API key:

```env
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3000
```

5. Start:

```bash
npm start
```

6. Open http://localhost:3000

The AI key stays server-side and is never placed in the frontend.

## Notes

The Gemini Developer API currently offers a free tier for selected models. Availability and limits can change, so check Google's pricing/rate-limit pages before deployment.
