from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
import asyncio
import json
import re

router = APIRouter()

SYSTEM_PROMPT = """You are a helpful assistant for Sun Marke Community School in Dubai.

Your job is to answer questions using the context provided below.
The context is extracted from the school's official website.

Rules:
1. Answer using the context provided — even if it is partial information
2. If the context has ANY relevant information use it to answer
3. Be helpful — don't refuse if there is relevant content in the context
4. Only say "I don't have that information based on the school's content" if the context has ZERO relevant info
5. Keep answers concise and clear
6. Do not make up information not in the context"""

class QueryRequest(BaseModel):
    query: str
    gemini_model: str = "gemini"

def tokenize(text: str):
    return re.findall(r'\w+', text.lower())

def hybrid_search(query: str, vectorstore, k: int = 6):
    semantic_results = vectorstore.similarity_search_with_score(query, k=20)
    if not semantic_results:
        return []

    docs = [doc for doc, _ in semantic_results]
    semantic_scores = [score for _, score in semantic_results]

    max_sem = max(semantic_scores) if semantic_scores else 1
    min_sem = min(semantic_scores) if semantic_scores else 0
    range_sem = max_sem - min_sem if max_sem != min_sem else 1
    normalized_semantic = [
        1 - (score - min_sem) / range_sem
        for score in semantic_scores
    ]

    tokenized_corpus = [tokenize(doc.page_content) for doc in docs]
    bm25 = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(tokenize(query))
    max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
    normalized_bm25 = [score / max_bm25 for score in bm25_scores]

    combined = [
        (docs[i], 0.6 * normalized_semantic[i] + 0.4 * normalized_bm25[i])
        for i in range(len(docs))
    ]
    combined.sort(key=lambda x: x[1], reverse=True)

    seen = set()
    results = []
    for doc, score in combined:
        if doc.page_content not in seen:
            seen.add(doc.page_content)
            results.append((doc, score))

    return results[:k]

async def stream_llm(llm, model_name: str, context: str, question: str):
    try:
        messages = [
            {
                "role": "system",
                "content": f"{SYSTEM_PROMPT}\n\nContext:\n{context}"
            },
            {
                "role": "user",
                "content": question
            }
        ]

        full_answer = ""
        async for chunk in llm.astream(messages):
            token = chunk.content
            if token:
                full_answer += token
                data = json.dumps({
                    "model": model_name,
                    "token": token,
                    "done": False
                })
                yield f"data: {data}\n\n"

        if "<think>" in full_answer and "</think>" in full_answer:
            full_answer = full_answer.split("</think>")[-1].strip()

        data = json.dumps({
            "model": model_name,
            "token": "",
            "full_answer": full_answer,
            "done": True
        })
        yield f"data: {data}\n\n"

    except Exception as e:
        data = json.dumps({
            "model": model_name,
            "token": "",
            "error": str(e),
            "done": True
        })
        yield f"data: {data}\n\n"

async def stream_all_models(query: str, context: str, google_llm, kimi_llm, openai_llm):
    queue = asyncio.Queue()

    gemini_gen  = stream_llm(google_llm,  "gemini",  context, query)
    kimi_gen    = stream_llm(kimi_llm,    "kimi",    context, query)
    openai_gen  = stream_llm(openai_llm,  "openai",  context, query)

    async def producer(gen):
        async for chunk in gen:
            await queue.put(chunk)
        await queue.put(None)

    tasks = [
        asyncio.create_task(producer(gemini_gen)),
        asyncio.create_task(producer(kimi_gen)),
        asyncio.create_task(producer(openai_gen)),
    ]

    finished = 0
    while finished < 3:
        item = await queue.get()
        if item is None:
            finished += 1
        else:
            yield item

    await asyncio.gather(*tasks)

@router.post("/query")
async def query(body: QueryRequest):
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        from main import app_state
        vectorstore = app_state["vectorstore"]
        google_llm  = app_state["google_llm"]
        kimi_llm    = app_state["kimi_llm"]
        openai_llm  = app_state["openai_llm"]
        llama_llm   = app_state["llama_llm"]

        active_google = llama_llm if body.gemini_model == "llama" else google_llm

        results = hybrid_search(body.query, vectorstore, k=6)
        context = "\n\n".join([doc.page_content for doc, _ in results]) if results else "No relevant information found."

        print(f"\nQuery: {body.query}")
        print(f"Gemini model: {body.gemini_model}")
        print(f"Chunks: {len(results)}")

        return StreamingResponse(
            stream_all_models(body.query, context, active_google, kimi_llm, openai_llm),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))