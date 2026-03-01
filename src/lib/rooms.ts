import { Room, RoomResponse, RoomTimerState, TimerPhase, TimerSettings, TimerStatus } from "./types";

/** Solo timer state sent from the client when creating a room */
export interface InitialTimerState {
  phase: TimerPhase;
  status: TimerStatus;
  timeRemaining: number; // seconds
  pomodoroCount: number;
  settings: TimerSettings;
}

// In-memory room store
const rooms: Map<string, Room> = new Map();

const MAX_PARTICIPANTS = 20;
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

// ── Helpers ──────────────────────────────────────────────────────────────

function getDurationForPhase(phase: Room["timerState"]["phase"], settings: TimerSettings): number {
  switch (phase) {
    case "work":
      return settings.workDuration * 60;
    case "shortBreak":
      return settings.shortBreakDuration * 60;
    case "longBreak":
      return settings.longBreakDuration * 60;
  }
}

function computeTimeRemaining(ts: RoomTimerState): number {
  if (ts.status !== "running" || !ts.startedAt) {
    return Math.max(0, ts.duration - ts.elapsed);
  }
  const now = Date.now();
  const started = new Date(ts.startedAt).getTime();
  const totalElapsed = ts.elapsed + Math.floor((now - started) / 1000);
  return Math.max(0, ts.duration - totalElapsed);
}

/** Transition to the next phase if timer has expired. Mutates the room in place. */
function resolvePhaseTransitions(room: Room): void {
  if (room.timerState.status !== "running") return;

  let remaining = computeTimeRemaining(room.timerState);
  if (remaining > 0) return;

  // Phase completed -- transition
  if (room.timerState.phase === "work") {
    room.timerState.pomodoroCount += 1;
    if (room.timerState.pomodoroCount % room.settings.longBreakInterval === 0) {
      room.timerState.phase = "longBreak";
    } else {
      room.timerState.phase = "shortBreak";
    }
  } else {
    room.timerState.phase = "work";
  }

  room.timerState.duration = getDurationForPhase(room.timerState.phase, room.settings);
  room.timerState.status = "idle";
  room.timerState.startedAt = null;
  room.timerState.elapsed = 0;
}

/** Remove rooms that have been inactive for >2 hours */
function cleanupStaleRooms(): void {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - new Date(room.lastActivityAt).getTime() > INACTIVITY_TIMEOUT_MS) {
      rooms.delete(id);
    }
  }
}

function touch(room: Room): void {
  room.lastActivityAt = new Date().toISOString();
}

/** Convert internal Room to the client-facing RoomResponse with computed timeRemaining */
export function toRoomResponse(room: Room): RoomResponse {
  // Resolve any pending phase transitions first
  resolvePhaseTransitions(room);
  touch(room);

  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    hostName: room.hostName,
    createdAt: room.createdAt,
    lastActivityAt: room.lastActivityAt,
    settings: room.settings,
    timerState: {
      phase: room.timerState.phase,
      status: room.timerState.status,
      timeRemaining: computeTimeRemaining(room.timerState),
      pomodoroCount: room.timerState.pomodoroCount,
    },
    participants: room.participants,
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export function createRoom(hostId: string, hostName: string, name: string, settings?: Partial<TimerSettings>, initialTimerState?: InitialTimerState): Room {
  cleanupStaleRooms();

  const id = generateRoomCode();
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  const now = new Date().toISOString();

  let timerState: RoomTimerState;

  if (initialTimerState && initialTimerState.status !== "idle") {
    // Inherit from the solo timer
    const duration = getDurationForPhase(initialTimerState.phase, mergedSettings);
    const elapsed = duration - initialTimerState.timeRemaining;

    timerState = {
      phase: initialTimerState.phase,
      status: initialTimerState.status,
      duration,
      startedAt: initialTimerState.status === "running" ? now : null,
      elapsed: Math.max(0, elapsed),
      pomodoroCount: initialTimerState.pomodoroCount,
    };
  } else {
    // Fresh idle timer (default behavior)
    timerState = {
      phase: "work",
      status: "idle",
      duration: mergedSettings.workDuration * 60,
      startedAt: null,
      elapsed: 0,
      pomodoroCount: 0,
    };
  }

  const room: Room = {
    id,
    name,
    hostId,
    hostName,
    createdAt: now,
    lastActivityAt: now,
    settings: mergedSettings,
    timerState,
    participants: [{ id: hostId, name: hostName, joinedAt: now }],
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  // Lazily resolve phase transitions
  resolvePhaseTransitions(room);
  return room;
}

export function joinRoom(roomId: string, userId: string, userName: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  if (room.participants.length >= MAX_PARTICIPANTS && !room.participants.find((p) => p.id === userId)) {
    return undefined; // caller should check and return 403
  }

  if (!room.participants.find((p) => p.id === userId)) {
    room.participants.push({ id: userId, name: userName, joinedAt: new Date().toISOString() });
  }
  touch(room);
  return room;
}

/** Returns "full" if room is at max capacity, undefined if room not found */
export function joinRoomChecked(roomId: string, userId: string, userName: string): Room | "full" | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  if (room.participants.length >= MAX_PARTICIPANTS && !room.participants.find((p) => p.id === userId)) {
    return "full";
  }

  if (!room.participants.find((p) => p.id === userId)) {
    room.participants.push({ id: userId, name: userName, joinedAt: new Date().toISOString() });
  }
  touch(room);
  return room;
}

export function leaveRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const wasHost = room.hostId === userId;
  room.participants = room.participants.filter((p) => p.id !== userId);

  if (room.participants.length === 0) {
    rooms.delete(roomId);
    return;
  }

  // Admin transfer: if the host left, assign to earliest-joined remaining participant
  if (wasHost && room.participants.length > 0) {
    const newHost = room.participants[0];
    room.hostId = newHost.id;
    room.hostName = newHost.name;
  }

  touch(room);
}

export function endRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function startRoomTimer(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  // Resolve any pending transitions first
  resolvePhaseTransitions(room);

  if (room.timerState.status === "running") return room;

  room.timerState.status = "running";
  room.timerState.startedAt = new Date().toISOString();
  // elapsed stays as-is (could be >0 if resuming from pause)
  touch(room);
  return room;
}

export function pauseRoomTimer(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room || room.timerState.status !== "running") return room;

  // Capture elapsed time so far
  if (room.timerState.startedAt) {
    const now = Date.now();
    const started = new Date(room.timerState.startedAt).getTime();
    room.timerState.elapsed += Math.floor((now - started) / 1000);
  }

  room.timerState.status = "paused";
  room.timerState.startedAt = null;
  touch(room);
  return room;
}

export function resetRoomTimer(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  room.timerState = {
    phase: "work",
    status: "idle",
    duration: room.settings.workDuration * 60,
    startedAt: null,
    elapsed: 0,
    pomodoroCount: 0,
  };
  touch(room);
  return room;
}

export function skipPhase(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  if (room.timerState.phase === "work") {
    room.timerState.pomodoroCount += 1;
    if (room.timerState.pomodoroCount % room.settings.longBreakInterval === 0) {
      room.timerState.phase = "longBreak";
    } else {
      room.timerState.phase = "shortBreak";
    }
  } else {
    room.timerState.phase = "work";
  }

  room.timerState.duration = getDurationForPhase(room.timerState.phase, room.settings);
  room.timerState.status = "idle";
  room.timerState.startedAt = null;
  room.timerState.elapsed = 0;
  touch(room);
  return room;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}
