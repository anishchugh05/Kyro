# Kyro — Autonomous AI Code Repair Engine

> © 2026 Anish Chugh. All rights reserved. Version 1.0.0

Kyro is an autonomous AI system that analyzes GitHub repositories, locates bugs using a multi-agent debate architecture, generates verified patches, and opens pull requests — automatically.

---

## Architecture

Three AI providers debate every bug diagnosis before a fix is written:

| Stage | Agent | Provider | Purpose | Max Tokens |
|---|---|---|---|---|
| 1 | Detective | Gemini 1.5 Flash | Suspects 2–3 root-cause files | 400 |
| 2 | Skeptic | Claude Haiku | Challenges the diagnosis | 300 |
| 3 | Arbitrator | Pure Python | Resolves disagreements — zero API cost | 0 |
| 4 | Fixer | GPT-4o | Writes the exact search/replace patch | 600 |
| 5 | Validator | Gemini 1.5 Flash | Analyses test failures, guides one retry | 200 |

**Cost per analysis: ~$0.013 | Token budget: ~3,100 tokens**

If any provider fails, the system automatically falls back to OpenAI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI, WebSockets, SQLite |
| Frontend (Workspace) | React 19, TypeScript, Three.js, TanStack Router |
| Frontend (Homepage) | React 19, TypeScript, Three.js, TanStack Start |
| AI | OpenAI GPT-4o, Anthropic Claude Haiku, Google Gemini 1.5 Flash |
| Deployment | Railway (backend), Vercel / Cloudflare (frontends) |

---

## Security

- Multi-layer input validation with URL allowlisting (GitHub, GitLab, Bitbucket only)
- `shell=False` everywhere — no command injection surface
- GitHub credentials passed via `GIT_ASKPASS`, never embedded in clone URLs
- Path traversal prevention on all file read operations
- Rate limiting: 10 requests/minute per IP
- Security headers on every API response (X-Frame-Options, CSP, etc.)
- All cloned repositories deleted from disk after analysis completes
- SQLite in WAL mode with foreign key enforcement
- Swagger/ReDoc disabled in production

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ (or Bun)
- Git

### Backend

```bash
cd reproranger-backend
cp .env.example .env
# Fill in your API keys in .env
pip install -r requirements.txt
./start.sh
```

### Workspace Frontend

```bash
cd reproranger-backend/frontend
npm install
npm run dev
# Runs on http://localhost:5174
```

### Homepage

```bash
cd Kyro-HomePage
npm install
npm run dev
# Runs on http://localhost:5173
```

### Required API Keys (.env)

| Variable | Provider | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI | Fixer stage (GPT-4o) + fallback |
| `ANTHROPIC_API_KEY` | Anthropic | Skeptic stage (Claude Haiku) |
| `GOOGLE_API_KEY` | Google AI Studio | Detective + Validator (Gemini) |
| `GITHUB_TOKEN` | GitHub | PR creation (optional) |

Get your Google key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — it starts with `AIza`.

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to Railway
2. Set all environment variables from `.env.example`
3. Set `ENVIRONMENT=production`
4. Railway will use `railway.toml` automatically

### Frontends → Vercel / Cloudflare

Both frontends have `vercel.json` with security headers pre-configured.
Set `VITE_BACKEND_URL` and `VITE_WORKSPACE_URL` as environment variables in your deployment dashboard.

---

## Author

**Anish Chugh**  
UMass Amherst — Computer Engineering & Statistics, Class of 2027  
[GitHub](https://github.com/anishchugh05)

---

*© 2026 Anish Chugh. All rights reserved.*
