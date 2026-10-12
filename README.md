# NYVEX — Autonomous AI Agent

A futuristic, private-by-default AI workspace built with Node.js and plain browser JavaScript. NYVEX can chat, create a mission plan, and use a bounded set of tools: public web search, safe arithmetic, and a local notes workspace. It does **not** run arbitrary shell commands or control your computer.

## Run it locally (Windows)

1. Install Node.js 20+ from https://nodejs.org/.
2. Clone or download this repository.
3. Copy `.env.example` to `.env`.
4. Open `.env` in Notepad and set `OPENAI_API_KEY=your_key_here`.
5. In this folder, run `npm start` (or double-click `START-NYVEX.bat`).
6. Open http://localhost:3000.

**Never commit your real `.env` or paste your API key into chat.** `.gitignore` excludes `.env`. API usage can cost money; check your provider account's usage limits first.

## Deploy to Render

Create a Node Web Service from this repository. Use build command `npm install` and start command `npm start`. In the Render service's **Environment** settings, add `OPENAI_API_KEY`; optionally set `OPENAI_MODEL`. Deploy after saving. Never put the secret in this repo or in `render.yaml`. GitHub repository secrets do not automatically become environment variables for a running web service.

## What is included

- DREAM, FORGE, SCOUT, and TACTIC modes.
- Chat and structured mission planner.
- Bounded tool loop (up to four rounds) with visible tool activity.
- Web search, safe arithmetic, and workspace note creation/listing.
- Browser-side chat history and checkable mission tasks.
- Basic request-size limits, per-IP throttling, security headers, and same-origin API checks.
- No local AI model required, so the laptop does not need to run a large model. Cloud API limits and charges still apply.

## Roadmap

This is a starter agent, not a fully autonomous computer operator. It doesn't run forever in the background, edit arbitrary projects, make purchases, or control the OS. Image generation, uploads/document understanding, durable cloud memory, approval-gated project editing, background task queues, and multiple specialist agents can be added later.
