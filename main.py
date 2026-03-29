from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import PGVector
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
import os

app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )
    print("Embedding model loaded!")

    print("Connecting to PGVector...")
    vectorstore = PGVector(
        embedding_function=embeddings,
        connection_string=os.getenv("DATABASE_URL"),
        collection_name="sunmarke_docs",
    )
    print("PGVector connected!")

    print("Loading LLMs...")

    google_llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.2,
    )

    kimi_llm = ChatGroq(
        model="moonshotai/kimi-k2-instruct-0905",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2,
    )

    # Replaced Ollama with GPT-OSS via Groq
    openai_llm = ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2,
    )

    llama_llm = ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2,
    )

    print("LLMs loaded!")

    app_state["embeddings"]  = embeddings
    app_state["vectorstore"] = vectorstore
    app_state["google_llm"]  = google_llm
    app_state["kimi_llm"]    = kimi_llm
    app_state["openai_llm"]  = openai_llm
    app_state["llama_llm"]   = llama_llm

    print("Server ready!")
    yield
    app_state.clear()

app = FastAPI(title="Sun Marke Voice Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import transcribe, query, tts
app.include_router(transcribe.router)
app.include_router(query.router)
app.include_router(tts.router)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": len(app_state) > 0
    }