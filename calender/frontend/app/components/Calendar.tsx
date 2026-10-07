"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventItem } from "../page";

interface CalendarProps {
  events: EventItem[];
  onDeleteEvent?: (id: number | string) => void;
}

export default function Calendar({ events, onDeleteEvent }: CalendarProps) {
  const handleEventClick = (info: any) => {
    const title = info.event.title;
    const eventId = info.event.id;

    if (window.confirm(`「${title}」の予定を削除しますか？`)) {
      if (onDeleteEvent && eventId) {
        onDeleteEvent(eventId);
      }
    }
  };

  return (
    <div className="h-full w-full">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ja"
        // 日付を「数字だけ」にする（「1日」→「1」）
        dayCellContent={(e) => e.date.getDate().toString()}
        // スマホで文字が詰まらないよう、マスあたりの表示上限を設定
        dayMaxEvents={2}
        moreLinkText={(num) => `+他${num}件`}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        events={events.map((e) => ({
          id: String(e.id),
          title: e.title,
          start: e.start,
          end: e.end,
        }))}
        eventClick={handleEventClick}
        height="100%"
        buttonText={{
          today: "今日",
          month: "月",
          week: "週",
        }}
      />
    </div>
  );
}