# Voice-Enabled AI Agent — Sun Marke School Assistant

## Introduction

A voice-powered AI assistant that answers questions about Sun Marke Community School in Dubai. The user speaks a question directly into the browser, the app transcribes it, searches a knowledge base built from the school website, and returns answers from three different AI models simultaneously — each with audio playback.

---

## Features

- Real-time voice recording directly in the browser (no file upload)
- Speech-to-text transcription using Groq Whisper
- RAG (Retrieval-Augmented Generation) with Hybrid Search (Semantic + BM25)
- Three AI models answer simultaneously and stream responses token by token
- Text-to-speech audio playback for each model response
- Fallback model selector on Gemini card when quota is exceeded
- Graceful error handling per model independently
- 3-column layout showing all responses side by side

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Orchestration | LangChain |
| LLM 1 | Gemini 2.5 Flash Lite (Google) |
| LLM 2 | Kimi K2 (Moonshot AI via Groq) |
| LLM 3 | GPT-OSS 120B (OpenAI via Groq) |
| Fallback LLM | Llama 3.1 8B (Meta via Groq) |
| Speech to Text | Whisper Large V3 (Groq) |
| Text to Speech | Groq PlayAI TTS |
| Embeddings | HuggingFace all-MiniLM-L6-v2 |
| Vector Database | PGVector (Neon PostgreSQL) |
| Web Scraping | Firecrawl |
| Retrieval | Hybrid Search (Semantic + BM25) |

---

## Project Structure

```
Voice-Enabled-AI-Agent/
├── main.py                        # FastAPI app entry point, loads all models at startup
├── requirements.txt               # Python dependencies
├── pyproject.toml                 # Python project config
├── .python-version                # Forces Python 3.11
├── .env                           # API keys (not pushed to GitHub)
├── .env.example                   # Example env file
├── .gitignore                     # Files excluded from GitHub
├── routers/
│   ├── __init__.py
│   ├── transcribe.py              # POST /transcribe — audio to text
│   ├── query.py                   # POST /query — RAG + 3 LLMs streaming
│   └── tts.py                     # POST /tts — text to audio
├── scripts/
│   └── ingest.py                  # One-time script to scrape and store embeddings
└── frontend/
    ├── package.json               # Node dependencies
    ├── .env.local                 # Frontend env (not pushed)
    ├── .env.example               # Example frontend env
    ├── tailwind.config.js         # Tailwind config
    ├── postcss.config.mjs         # PostCSS config
    └── src/
        ├── app/
        │   ├── page.tsx           # Main page
        │   ├── layout.tsx         # Root layout
        │   └── globals.css        # Global styles
        ├── components/
        │   ├── RecordButton.tsx   # Mic button with animations
        │   ├── ModelCard.tsx      # Individual model response card
        │   └── TranscriptBox.tsx  # Shows transcribed question
        ├── hooks/
        │   └── useVoiceRecorder.ts # MediaRecorder hook
        └── types/
            └── index.ts           # TypeScript interfaces
```

---

## Pipeline of Entire Project

```
User speaks into browser mic
        |
        v
MediaRecorder API captures audio blob
        |
        v
POST /transcribe → Groq Whisper Large V3
        |
        v
Transcript text returned and displayed
        |
        v
POST /query → RAG Pipeline
        |
        ├── Embed query with HuggingFace all-MiniLM-L6-v2
        |
        ├── Hybrid Search (Semantic 60% + BM25 40%) on PGVector
        |
        └── Top 6 relevant chunks retrieved
                |
                v
        3 LLMs queried simultaneously (asyncio.gather)
        ├── Gemini 2.5 Flash Lite
        ├── Kimi K2 via Groq
        └── GPT-OSS via Groq
                |
                v
        Responses stream token by token via SSE
                |
                v
        3 cards fill independently as tokens arrive
                |
                v
        Play audio button → Web Speech API reads answer aloud
```

---

## Installation Guide

### Prerequisites

Make sure these are installed on your machine:

- Python 3.11 — python.org
- Node.js 18+ — nodejs.org
- Git — git-scm.com
- uv (Python package manager) — installed in step 3

---

### Clone the Repository

```bash
git clone https://github.com/JamshedAli18/Voice-Enabled-AI-Agent.git
cd Voice-Enabled-AI-Agent
```

---

### Backend Setup

```bash
# Step 1 — Install uv
pip install uv

# Step 2 — Create virtual environment
python -m venv .venv

# Step 3 — Activate virtual environment
# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

# Step 4 — Install all dependencies with uv
uv pip install -r requirements.txt
```

---

### Frontend Setup

```bash
# Step 1 — Go to frontend folder
cd frontend

# Step 2 — Install dependencies
npm install

# Step 3 — Go back to root
cd ..
```

---

### Environment Variables

Create a `.env` file in the project root by copying the example:

```bash
cp .env.example .env
```

Fill in your API keys in `.env`:

```
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
DATABASE_URL=your_neon_postgresql_connection_string
```

Create `.env.local` in the frontend folder:

```bash
cp frontend/.env.example frontend/.env.local
```

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Where to get each key:

| Key | Website |
|-----|---------|
| GROQ_API_KEY | console.groq.com |
| GOOGLE_API_KEY | aistudio.google.com |
| FIRECRAWL_API_KEY | firecrawl.dev |
| DATABASE_URL | neon.tech |

---

### Database Setup

Go to neon.tech, create a project, open SQL Editor and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### Run Ingestion Script (One Time Only)

This scrapes the school website and stores embeddings in PGVector:

```bash
python scripts/ingest.py
```

Wait for:
```
Stored X chunks in PGVector!
Ingestion complete!
```

---

### Run the Project

Open 3 terminals:

```bash
# Terminal 1 — Backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open browser at:
```
http://localhost:3000
```

---

## Usage

1. Open the app at `http://localhost:3000`
2. Click the microphone button
3. Speak your question about Sun Marke School
4. Click the stop button
5. Wait for transcription and AI responses
6. Read responses from all 3 models side by side
7. Click Play Audio on any card to hear the answer
8. If Gemini hits quota limit use the dropdown on the Gemini card to switch to Llama 3.1

---

## API Endpoints

| Method | Endpoint | Input | Output |
|--------|---------|-------|--------|
| GET | /health | None | Server status |
| POST | /transcribe | Audio file (multipart) | `{ "text": "..." }` |
| POST | /query | `{ "query": "...", "gemini_model": "gemini/llama" }` | SSE stream of 3 model responses |
| POST | /tts | `{ "text": "...", "model": "gemini/kimi/openai" }` | Audio MP3 bytes |

---

## License

MIT License

---

## Author

Jamshed Ali
GitHub: github.com/JamshedAli18
