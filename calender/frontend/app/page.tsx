"use client";

import { useEffect, useState } from "react";
import Calendar from "./components/Calendar";
import Chat from "./components/Chat";

export interface EventItem {
  id?: number | string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  // スマホ表示時のアクティブタブ ('calendar' | 'chat')
  const [activeTab, setActiveTab] = useState<"calendar" | "chat">("calendar");

  const fetchEvents = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("予定の取得に失敗しました:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAddEvent = (newEvent: EventItem) => {
    setEvents((prev) => [...prev, newEvent]);
  };

  const handleDeleteEvent = async (id: number | string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/events/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((event) => String(event.id) !== String(id)));
      }
    } catch (err) {
      console.error("削除に失敗しました:", err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-50 text-slate-800">
      
      {/* 📅 カレンダーエリア */}
      <section
        className={`flex-1 p-2 md:p-6 overflow-hidden flex flex-col ${
          activeTab === "calendar" ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex-1 flex flex-col overflow-hidden">
          <Calendar events={events} onDeleteEvent={handleDeleteEvent} />
        </div>
      </section>

      {/* 💬 AI チャットエリア */}
      <section
        className={`w-full md:w-[400px] lg:w-[440px] md:border-l md:border-slate-200 bg-white flex flex-col shadow-lg md:shadow-none ${
          activeTab === "chat" ? "flex flex-1" : "hidden md:flex"
        }`}
      >
        <Chat onAddEvent={handleAddEvent} />
      </section>

      {/* 📱 スマホ専用 ボトムタブバー */}
      <nav className="md:hidden flex border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "calendar"
              ? "text-blue-600 font-bold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="text-xl">📅</span>
          <span className="text-xs">カレンダー</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "chat"
              ? "text-blue-600 font-bold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="text-xl">✨</span>
          <span className="text-xs">AIチャット</span>
        </button>
      </nav>
      
    </div>
  );
}