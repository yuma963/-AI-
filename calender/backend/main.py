import os
import sqlite3
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

load_dotenv()

app = FastAPI(title="AI Calendar API with SQLite")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite データベースの初期化
DB_PATH = "events.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start TEXT NOT NULL,
            end TEXT NOT NULL,
            location TEXT DEFAULT '未設定',
            description TEXT DEFAULT ''
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Gemini クライアント
gemini_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=gemini_key) if gemini_key else None

# データモデル
class EventBase(BaseModel):
    title: str = Field(description="予定のタイトル")
    start: str = Field(description="開始日時 (ISO 8601形式: YYYY-MM-DDTHH:MM:SS)")
    end: str = Field(description="終了日時 (ISO 8601形式: YYYY-MM-DDTHH:MM:SS)")
    location: str = Field(default="未設定", description="場所")
    description: str = Field(default="", description="詳細メモ")

class EventResponse(EventBase):
    id: int

class ParseRequest(BaseModel):
    message: str


# 📌 1. 予定一覧取得 API
@app.get("/api/events", response_model=List[EventResponse])
def get_events():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY start ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# 📌 2. 予定直接追加 API
@app.post("/api/events", response_model=EventResponse)
def create_event(event: EventBase):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO events (title, start, end, location, description) VALUES (?, ?, ?, ?, ?)",
        (event.title, event.start, event.end, event.location, event.description)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {**event.model_dump(), "id": new_id}


# 📌 3. 予定削除 API
@app.delete("/api/events/{event_id}")
def delete_event(event_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    return {"message": "deleted", "id": event_id}


# 📌 4. 自然言語解析 + DB自動保存 API
@app.post("/api/parse-event", response_model=EventResponse)
async def parse_event(req: ParseRequest):
    now = datetime.now()
    current_time_str = now.strftime("%Y-%m-%d %H:%M:%S (%A)")

    if not client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set")

    prompt = f"""
あなたはカレンダー予定抽出アシスタントです。
現在の日時: {current_time_str}

ユーザーの自然言語メッセージから予定の情報を抽出し、指定のスキーマに合わせて正確なJSONを返してください。

抽出ルール:
- 終了時間が明記されていない場合は、開始時刻の1時間後を end に設定してください。
- 相対的な日時（「明日」「来週火曜」など）は、現在日時（{current_time_str}）を基準に正確に計算してください。

ユーザーのメッセージ:
「{req.message}」
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": EventBase,
            },
        )
        parsed: EventBase = response.parsed

        # DBに即時保存
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO events (title, start, end, location, description) VALUES (?, ?, ?, ?, ?)",
            (parsed.title, parsed.start, parsed.end, parsed.location, parsed.description)
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return {**parsed.model_dump(), "id": new_id}

    except Exception as e:
        print("Error in parse_event:", e)
        raise HTTPException(status_code=500, detail=str(e))