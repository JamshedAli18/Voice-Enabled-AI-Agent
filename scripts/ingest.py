from dotenv import load_dotenv
load_dotenv()

from firecrawl import FirecrawlApp
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import PGVector
import os
import re

app = FirecrawlApp(api_key=os.getenv("FIRECRAWL_API_KEY"))

URLS = [
    "https://www.sunmarke.com/about/principals-message/",
    "https://www.sunmarke.com/about/mission-vision-values/",
    "https://www.sunmarke.com/about/a-positive-education-school/",
    "https://www.sunmarke.com/about/our-achievements/",
    "https://www.sunmarke.com/about/our-campus/",
    "https://www.sunmarke.com/learning/nursery/our-approach/",
    "https://www.sunmarke.com/learning/nursery/enriched-learning/",
    "https://www.sunmarke.com/learning/eyfs/our-approach-eyfs/",
    "https://www.sunmarke.com/learning/eyfs/early-years-curriculum/",
    "https://www.sunmarke.com/learning/primary/our-approach-primary/",
    "https://www.sunmarke.com/learning/primary/our-curriculum-primary/",
    "https://www.sunmarke.com/learning/secondary/sports-pe-secondary/",
    "https://www.sunmarke.com/learning/secondary/secondary-creative-performing-arts/",
    "https://www.sunmarke.com/learning/secondary/our-approach-secondary/",
    "https://www.sunmarke.com/learning/secondary/our-curriculum-secondary/",
    "https://www.sunmarke.com/learning/sixth-form/our-approach-sixth-form/",
    "https://www.sunmarke.com/learning/sixth-form/a-levels/",
    "https://www.sunmarke.com/learning/sixth-form/btecs/",
    "https://www.sunmarke.com/learning/sixth-form/ib-diploma-programme-ibdp/",
    "https://www.sunmarke.com/learning/sixth-form/student-enrichment/",
    "https://www.sunmarke.com/learning/sixth-form/student-leadership/",
    "https://www.sunmarke.com/learning/sixth-form/civitas/",
    "https://www.sunmarke.com/signature-programmes/university-career-readiness-programme/",
    "https://www.sunmarke.com/signature-programmes/fortes-pro-sports-academy/",
    "https://www.sunmarke.com/signature-programmes/global-language-academy/",
    "https://www.sunmarke.com/signature-programmes/financial-literacy-programme/",
    "https://www.sunmarke.com/signature-programmes/enterprise-mini-mba-programme/",
    "https://applynow.sunmarke.com/",
    "https://www.sunmarke.com/admissions/tuition-fees/",
    "https://www.sunmarke.com/admissions/re-enrol-online/",
    "https://www.sunmarke.com/admissions/school-forms/",
    "https://www.sunmarke.com/admissions/faqs/",
    "https://www.sunmarke.com/for-parents/school-uniform/",
    "https://www.sunmarke.com/for-parents/school-timings/",
    "https://www.sunmarke.com/for-parents/academic-calendar/",
    "https://www.sunmarke.com/for-parents/policies/",
    "https://sports.sunmarke.com/",
    "https://www.sunmarke.com/for-parents/parent-engagement/",
    "https://www.sunmarke.com/activities/sunmarke-free-ecas/",
    "https://www.sunmarke.com/activities/sunmarke-paid-ecas/",
    "https://www.sunmarke.com/news-events/weekly-buzz/",
    "https://www.sunmarke.com/news-events/blog/",
    "https://www.sunmarke.com/contact-us/work-with-us/",
]

def clean_text(text):
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'---+', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'BESbswy', '', text)
    text = re.sub(r'VLE Login', '', text)
    text = re.sub(r'Apply\s*Visit\s*Enquire', '', text)
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if len(line) > 20)

all_texts = []
all_metadatas = []

print(f"Scraping {len(URLS)} pages...\n")

for i, url in enumerate(URLS):
    try:
        result = app.scrape(
            url,
            formats=["markdown"]
        )
        raw = result.markdown or ""
        clean = clean_text(raw)

        if len(clean) > 100:
            all_texts.append(clean)
            all_metadatas.append({"source": url})
            print(f"[{i+1}/{len(URLS)}] OK: {url} — {len(clean)} chars")
        else:
            print(f"[{i+1}/{len(URLS)}] SKIP: {url} — too short ({len(clean)} chars)")

    except Exception as e:
        print(f"[{i+1}/{len(URLS)}] FAILED: {url} — {e}")

print(f"\nTotal pages collected: {len(all_texts)}")

# --- Chunk ---
print("\nChunking...")
splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=100,
    separators=["\n\n", "\n", ".", " "]
)

chunks = []
metadatas = []

for text, meta in zip(all_texts, all_metadatas):
    splits = splitter.split_text(text)
    chunks.extend(splits)
    metadatas.extend([meta] * len(splits))

print(f"Total chunks: {len(chunks)}")

# --- Embed and store ---
print("\nLoading embedding model...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)
print("Model loaded!")

print("\nStoring in PGVector...")
vectorstore = PGVector.from_texts(
    texts=chunks,
    embedding=embeddings,
    metadatas=metadatas,
    connection_string=os.getenv("DATABASE_URL"),
    collection_name="sunmarke_docs",
    pre_delete_collection=True,
)

print(f"\nStored {len(chunks)} chunks in PGVector!")
print("Ingestion complete!")