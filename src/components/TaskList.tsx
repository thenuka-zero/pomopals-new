"use client";

import { useRef, useState } from "react";
import { useTimerStore } from "@/store/timer-store";
import type { TaskItem } from "@/lib/types";

interface TaskListProps {
  mode: "solo" | "room";
  onSyncTasks?: (tasks: TaskItem[]) => void;
  readOnly?: boolean;
}

export default function TaskList({ mode, onSyncTasks, readOnly = false }: TaskListProps) {
  const taskList = useTimerStore((s) => (mode === "solo" ? s.taskList : s.roomTaskList));
  const addTask = useTimerStore((s) => (mode === "solo" ? s.addTask : s.addRoomTask));
  const removeTask = useTimerStore((s) => (mode === "solo" ? s.removeTask : s.removeRoomTask));
  const updateTaskStatus = useTimerStore((s) =>
    mode === "solo" ? s.updateTaskStatus : s.updateRoomTaskStatus
  );
  const updateTaskText = useTimerStore((s) =>
    mode === "solo" ? s.updateTaskText : s.updateRoomTaskText
  );
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);

  const [inputText, setInputText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isWorkRunning = status === "running" && phase === "work";
  // Add/remove only allowed when not actively running a work session
  const canModifyList = !isWorkRunning && !readOnly;
  // Text editing allowed any time (no pausing required)
  const canEditText = !readOnly;

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text || text.length > 280) return;
    addTask(text);
    setInputText("");
    const updatedList = [...taskList, { id: crypto.randomUUID(), text, status: "pending" as const }];
    onSyncTasks?.(updatedList);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleToggle = (task: TaskItem) => {
    if (readOnly) return;
    let newStatus: TaskItem["status"];
    if (task.status === "done") {
      newStatus = isWorkRunning ? "in_progress" : "pending";
    } else {
      newStatus = "done";
    }
    updateTaskStatus(task.id, newStatus);
    const updatedList = taskList.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t));
    onSyncTasks?.(updatedList);
  };

  const handleRemove = (id: string) => {
    if (!canModifyList) return;
    removeTask(id);
    const updatedList = taskList.filter((t) => t.id !== id);
    onSyncTasks?.(updatedList);
  };

  const handleEditStart = (task: TaskItem) => {
    if (!canEditText) return;
    setEditingId(task.id);
    setEditingText(task.text);
    // Focus the edit input on next render
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const handleEditSave = (id: string) => {
    const text = editingText.trim();
    if (text && text.length <= 280 && text !== taskList.find((t) => t.id === id)?.text) {
      updateTaskText(id, text);
      const updatedList = taskList.map((t) => (t.id === id ? { ...t, text } : t));
      onSyncTasks?.(updatedList);
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Input row — only when not running work phase */}
      {canModifyList && (
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 280))}
            onKeyDown={handleKeyDown}
            placeholder="What will you focus on?"
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#F0E6D3]/40 border border-[#E8D5C4] text-[#3D2C2C] placeholder-[#A08060] focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/20 focus:border-[#E54B4B]/40 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!inputText.trim()}
            title="Add task"
            aria-label="Add task"
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#E54B4B]/10 text-[#E54B4B] hover:bg-[#E54B4B]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {/* Task rows */}
      {taskList.length > 0 && (
        <div className="space-y-1">
          {taskList.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F0E6D3]/30 group transition-colors"
            >
              {/* Checkbox */}
              {!readOnly && (
                <button
                  onClick={() => handleToggle(task)}
                  title={task.status === "done" ? "Mark as pending" : "Mark as done"}
                  aria-label={task.status === "done" ? "Mark as pending" : "Mark as done"}
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: task.status === "done" ? "#E54B4B" : "transparent",
                    borderColor: task.status === "done" ? "#E54B4B" : "#C4A882",
                  }}
                >
                  {task.status === "done" && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )}

              {/* Text or inline edit input */}
              {editingId === task.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value.slice(0, 280))}
                  onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                  onBlur={() => handleEditSave(task.id)}
                  className="flex-1 text-sm bg-[#F0E6D3]/60 border border-[#E54B4B]/40 rounded px-1.5 py-0.5 text-[#3D2C2C] focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/20"
                  autoFocus
                />
              ) : (
                <span
                  onDoubleClick={() => handleEditStart(task)}
                  className={`flex-1 text-sm leading-snug ${
                    task.status === "done"
                      ? "line-through text-[#A08060]"
                      : "text-[#3D2C2C]"
                  }`}
                >
                  {task.text}
                </span>
              )}

              {/* Action buttons (edit + remove) */}
              {canEditText && editingId !== task.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Edit button */}
                  <button
                    onClick={() => handleEditStart(task)}
                    title="Edit task"
                    aria-label="Edit task"
                    className="w-5 h-5 rounded flex items-center justify-center text-[#A08060] hover:text-[#3D2C2C]"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  {/* Remove button — only when not in running work phase */}
                  {canModifyList && (
                    <button
                      onClick={() => handleRemove(task.id)}
                      title="Remove task"
                      aria-label="Remove task"
                      className="w-5 h-5 rounded flex items-center justify-center text-[#A08060] hover:text-[#E54B4B]"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
