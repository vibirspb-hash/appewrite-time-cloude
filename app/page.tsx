"use client";

import { useEffect, useMemo, useState } from "react";
import { ID, Query, type Models } from "appwrite";
import { databases } from "@/lib/appwrite";

type Team = "first" | "second";

type EventType = {
  $id: string;
  title: string;
  time: string;
  place?: string;
  road?: string;
  team: Team;
  day_id: string;
};

type DayType = {
  $id: string;
  date: string;
  firstTeamName: string;
  secondTeamName: string;
  boards: Record<Team, EventType[]>;
};

type EventDocument = Models.Document & Omit<EventType, "$id">;

type DayDocument = Models.Document & {
  date: string;
  first_team_name?: string;
  second_team_name?: string;
};

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "dance_ops";
const DAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_DAYS_COLLECTION_ID ?? "days";
const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "events";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "1733";

const emptyEventForm = { title: "", time: "", place: "", road: "" };

function sortByTime(a: EventType, b: EventType) {
  return a.time.localeCompare(b.time, "ru", { numeric: true });
}

export default function Page() {
  const [days, setDays] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const [dragged, setDragged] = useState<{ event: EventType; dayId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [editForm, setEditForm] = useState(emptyEventForm);

  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"date" | "firstTeamName" | "secondTeamName" | null>(null);
  const [editValue, setEditValue] = useState("");

  const selectedDay = useMemo(() => days.find((day) => day.$id === selectedDayId), [days, selectedDayId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsAuthed(window.localStorage.getItem("dance_ops_auth") === "true");
      setAuthReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthed) {
      void loadData();
    }
  }, [isAuthed]);

  function handleLogin() {
    if (password !== ADMIN_PASSWORD) {
      window.alert("Неверный пароль");
      return;
    }

    window.localStorage.setItem("dance_ops_auth", "true");
    setIsAuthed(true);
  }

  async function loadData() {
    setLoading(true);
    try {
      const [daysRes, eventsRes] = await Promise.all([
        databases.listDocuments<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, [Query.orderAsc("date")]),
        databases.listDocuments<EventDocument>(DATABASE_ID, EVENTS_COLLECTION_ID, [Query.limit(5000)]),
      ]);

      const events: EventType[] = eventsRes.documents.map((event) => ({
        $id: event.$id,
        title: event.title,
        time: event.time,
        place: event.place,
        road: event.road,
        team: event.team,
        day_id: event.day_id,
      }));

      const formatted = daysRes.documents.map((day) => ({
        $id: day.$id,
        date: day.date,
        firstTeamName: day.first_team_name || "Я Воробушки",
        secondTeamName: day.second_team_name || "Лев и новенькие",
        boards: {
          first: events.filter((event) => event.day_id === day.$id && event.team === "first").sort(sortByTime),
          second: events.filter((event) => event.day_id === day.$id && event.team === "second").sort(sortByTime),
        },
      }));

      setDays(formatted);
      setLoadError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setLoadError(`Не получилось загрузить данные из Appwrite: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function addDay() {
    const value = window.prompt("Введите дату:");
    if (!value) return;

    const day = await databases.createDocument<DayDocument>(DATABASE_ID, DAYS_COLLECTION_ID, ID.unique(), {
      date: value,
      first_team_name: "Я Воробушки",
      second_team_name: "Лев и новенькие",
    });

    await loadData();
    setSelectedDayId(day.$id);
  }

  function startDayEdit(dayId: string, field: "date" | "firstTeamName" | "secondTeamName", currentValue: string) {
    setEditingDayId(dayId);
    setEditingField(field);
    setEditValue(currentValue);
  }

  async function saveDayEdit() {
    if (!editingDayId || !editingField) return;

    const updateData: Partial<Pick<DayDocument, "date" | "first_team_name" | "second_team_name">> = {};
    if (editingField === "date") updateData.date = editValue;
    if (editingField === "firstTeamName") updateData.first_team_name = editValue;
    if (editingField === "secondTeamName") updateData.second_team_name = editValue;

    await databases.updateDocument(DATABASE_ID, DAYS_COLLECTION_ID, editingDayId, updateData);
    setEditingDayId(null);
    setEditingField(null);
    await loadData();
  }

  async function addEvent(dayId: string, team: Team) {
    await databases.createDocument(DATABASE_ID, EVENTS_COLLECTION_ID, ID.unique(), {
      title: "Новое выступление",
      time: "18:00",
      place: "",
      road: "",
      team,
      day_id: dayId,
    });
    await loadData();
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Удалить выступление?")) return;

    await databases.deleteDocument(DATABASE_ID, EVENTS_COLLECTION_ID, id);
    await loadData();
  }

  function startEdit(event: EventType) {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      time: event.time,
      place: event.place || "",
      road: event.road || "",
    });
  }

  async function saveEdit() {
    if (!editingEvent) return;

    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, editingEvent.$id, editForm);
    setEditingEvent(null);
    await loadData();
  }

  async function quickRoad(event: EventType) {
    const value = window.prompt("Время в пути:", event.road || "");
    if (value === null) return;

    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, event.$id, { road: value });
    await loadData();
  }

  async function onDrop(dayId: string, team: Team) {
    if (!dragged) return;

    await databases.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, dragged.event.$id, { day_id: dayId, team });
    setDragged(null);
    await loadData();
  }

  function renderEditableTitle(
    day: DayType,
    field: "date" | "firstTeamName" | "secondTeamName",
    value: string,
    className: string,
  ) {
    return (
      <button className={className} onClick={() => startDayEdit(day.$id, field, value)}>
        {editingDayId === day.$id && editingField === field ? (
          <input
            autoFocus
            className="editable-input"
            value={editValue}
            onBlur={saveDayEdit}
            onChange={(event) => setEditValue(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveDayEdit();
              if (event.key === "Escape") {
                setEditingDayId(null);
                setEditingField(null);
              }
            }}
          />
        ) : (
          value
        )}
      </button>
    );
  }

  function renderEvent(event: EventType, dayId: string) {
    return (
      <article key={event.$id} className="event-shell">
        <button
          draggable
          className="event-card"
          onClick={() => startEdit(event)}
          onDragStart={() => setDragged({ event, dayId })}
        >
          <span className="event-time">{event.time}</span>
          <span className="event-title">{event.title}</span>
          {event.place && <span className="event-place">{event.place}</span>}
        </button>

        <div className="event-actions">
          <button aria-label="Время в пути" onClick={() => quickRoad(event)}>
            🚗
          </button>
          <button aria-label="Удалить выступление" onClick={() => deleteEvent(event.$id)}>
            🗑
          </button>
        </div>

        {event.road && <div className="event-road">→ {event.road}</div>}
      </article>
    );
  }

  function renderColumn(day: DayType, team: Team) {
    const items = day.boards[team];
    const teamName = team === "first" ? day.firstTeamName : day.secondTeamName;
    const teamField = team === "first" ? "firstTeamName" : "secondTeamName";

    return (
      <section className="team-column" onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(day.$id, team)}>
        <div className="column-head">
          {renderEditableTitle(day, teamField, teamName, "team-name")}
          <button className="icon-button" aria-label="Добавить выступление" onClick={() => addEvent(day.$id, team)}>
            +
          </button>
        </div>

        <div className="events-list">
          {items.length ? items.map((item) => renderEvent(item, day.$id)) : <div className="empty-column">Пока пусто</div>}
        </div>
      </section>
    );
  }

  if (!authReady) {
    return <main className="status-page">Загрузка...</main>;
  }

  if (!isAuthed) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <h1>Dance Ops</h1>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleLogin()}
            placeholder="Введите пароль"
          />
          <button onClick={handleLogin}>Войти</button>
        </section>
      </main>
    );
  }

  if (loading && !days.length) {
    return <main className="status-page">Загрузка...</main>;
  }

  if (!selectedDay) {
    return (
      <main className="page">
        <header className="start-header">
          <h1>Dance Ops</h1>
          <button onClick={() => loadData()}>Обновить</button>
        </header>

        {loadError && <div className="error-box">{loadError}</div>}

        <section className="days-grid">
          {days.map((day) => (
            <button key={day.$id} className="day-card" onClick={() => setSelectedDayId(day.$id)}>
              {day.date}
            </button>
          ))}
          <button className="day-card add-day" aria-label="Добавить дату" onClick={addDay}>
            +
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page page-wide">
      <header className="board-header">
        <button className="secondary-button" onClick={() => setSelectedDayId(null)}>
          ← Даты
        </button>
        <h1>Dance Ops</h1>
        <button className="secondary-button" onClick={() => loadData()}>
          Обновить
        </button>
      </header>

      {loadError && <div className="error-box">{loadError}</div>}

      <section className="board-title">{renderEditableTitle(selectedDay, "date", selectedDay.date, "date-title")}</section>

      <section className="board-grid">
        {renderColumn(selectedDay, "first")}
        {renderColumn(selectedDay, "second")}
      </section>

      {editingEvent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal">
            <h2>Редактировать выступление</h2>
            <input
              value={editForm.title}
              placeholder="Название"
              onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
            />
            <input
              value={editForm.time}
              placeholder="Время"
              onChange={(event) => setEditForm({ ...editForm, time: event.target.value })}
            />
            <input
              value={editForm.place}
              placeholder="Место"
              onChange={(event) => setEditForm({ ...editForm, place: event.target.value })}
            />
            <input
              value={editForm.road}
              placeholder="Время в пути"
              onChange={(event) => setEditForm({ ...editForm, road: event.target.value })}
            />
            <div className="modal-actions">
              <button className="primary-button" onClick={saveEdit}>
                Сохранить
              </button>
              <button className="secondary-button" onClick={() => setEditingEvent(null)}>
                Отмена
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
