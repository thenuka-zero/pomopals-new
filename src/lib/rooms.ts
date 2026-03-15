import { Room, RoomResponse, RoomTimerState, TimerPhase, TimerSettings, TimerStatus } from "./types";
import { db } from "./db/index";
import { rooms as roomsTable } from "./db/schema";
import { eq, lt } from "drizzle-orm";

/** Solo timer state sent from the client when creating a room */
export interface InitialTimerState {
  phase: TimerPhase;
  status: TimerStatus;
  timeRemaining: number; // seconds
  pomodoroCount: number;
  settings: TimerSettings;
}

export const MAX_PARTICIPANTS = 20;
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  notificationSound: "bell",
  autoStartBreaks: true,
};

// ── Helpers ──────────────────────────────────────────────────────────────

function getDurationForPhase(phase: TimerPhase, settings: TimerSettings): number {
  switch (phase) {
    case "work":       return settings.workDuration * 60;
    case "shortBreak": return settings.shortBreakDuration * 60;
    case "longBreak":  return settings.longBreakDuration * 60;
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

  const remaining = computeTimeRemaining(room.timerState);
  if (remaining > 0) return;

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

function touch(room: Room): void {
  room.lastActivityAt = new Date().toISOString();
}

function rowToRoom(row: typeof roomsTable.$inferSelect): Room {
  return {
    id:             row.id,
    name:           row.name,
    hostId:         row.hostId,
    hostName:       row.hostName,
    createdAt:      row.createdAt,
    lastActivityAt: row.lastActivityAt,
    settings:       JSON.parse(row.settings) as TimerSettings,
    timerState:     JSON.parse(row.timerState) as RoomTimerState,
    participants:   JSON.parse(row.participants),
    coHostIds:      JSON.parse(row.coHostIds ?? "[]") as string[],
  };
}

async function persistRoom(room: Room): Promise<void> {
  const expiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT_MS).toISOString();
  await db.update(roomsTable)
    .set({
      name:           room.name,
      hostId:         room.hostId,
      hostName:       room.hostName,
      lastActivityAt: room.lastActivityAt,
      settings:       JSON.stringify(room.settings),
      timerState:     JSON.stringify(room.timerState),
      participants:   JSON.stringify(room.participants),
      coHostIds:      JSON.stringify(room.coHostIds),
      expiresAt,
    })
    .where(eq(roomsTable.id, room.id));
}

/** Convert internal Room to the client-facing RoomResponse with computed timeRemaining */
export function toRoomResponse(room: Room): RoomResponse {
  resolvePhaseTransitions(room);

  return {
    id:             room.id,
    name:           room.name,
    hostId:         room.hostId,
    hostName:       room.hostName,
    createdAt:      room.createdAt,
    lastActivityAt: room.lastActivityAt,
    settings:       room.settings,
    timerState: {
      phase:         room.timerState.phase,
      status:        room.timerState.status,
      timeRemaining: computeTimeRemaining(room.timerState),
      pomodoroCount: room.timerState.pomodoroCount,
    },
    participants: room.participants,
    coHostIds:    room.coHostIds,
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export async function createRoom(
  hostId: string,
  hostName: string,
  name: string,
  settings?: Partial<TimerSettings>,
  initialTimerState?: InitialTimerState
): Promise<Room> {
  cleanupStaleRooms().catch(() => {});

  const id = generateRoomCode();
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  const now = new Date().toISOString();

  let timerState: RoomTimerState;

  if (initialTimerState && initialTimerState.status !== "idle") {
    const duration = getDurationForPhase(initialTimerState.phase, mergedSettings);
    const elapsed = duration - initialTimerState.timeRemaining;
    timerState = {
      phase:         initialTimerState.phase,
      status:        initialTimerState.status,
      duration,
      startedAt:     initialTimerState.status === "running" ? now : null,
      elapsed:       Math.max(0, elapsed),
      pomodoroCount: initialTimerState.pomodoroCount,
    };
  } else {
    timerState = {
      phase:         "work",
      status:        "idle",
      duration:      mergedSettings.workDuration * 60,
      startedAt:     null,
      elapsed:       0,
      pomodoroCount: 0,
    };
  }

  const room: Room = {
    id,
    name,
    hostId,
    hostName,
    createdAt:      now,
    lastActivityAt: now,
    settings:       mergedSettings,
    timerState,
    participants:   [{ id: hostId, name: hostName, joinedAt: now }],
    coHostIds:      [],
  };

  const expiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT_MS).toISOString();
  await db.insert(roomsTable).values({
    id:             room.id,
    name:           room.name,
    hostId:         room.hostId,
    hostName:       room.hostName,
    createdAt:      room.createdAt,
    lastActivityAt: room.lastActivityAt,
    settings:       JSON.stringify(room.settings),
    timerState:     JSON.stringify(room.timerState),
    participants:   JSON.stringify(room.participants),
    coHostIds:      JSON.stringify([]),
    expiresAt,
  });

  return room;
}

export async function getRoom(roomId: string): Promise<Room | undefined> {
  const [row] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
  if (!row) return undefined;
  const room = rowToRoom(row);
  const wasRunning = room.timerState.status === "running";
  resolvePhaseTransitions(room);
  // Persist phase transitions so the DB doesn't stay permanently stale
  if (wasRunning && room.timerState.status !== "running") {
    await persistRoom(room);
  }
  return room;
}

export async function joinRoom(roomId: string, userId: string, userName: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;

  if (room.participants.length >= MAX_PARTICIPANTS && !room.participants.find((p) => p.id === userId)) {
    return undefined;
  }

  if (!room.participants.find((p) => p.id === userId)) {
    room.participants.push({ id: userId, name: userName, joinedAt: new Date().toISOString() });
  }
  touch(room);
  await persistRoom(room);
  return room;
}

export async function joinRoomChecked(roomId: string, userId: string, userName: string): Promise<Room | "full" | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;

  if (room.participants.length >= MAX_PARTICIPANTS && !room.participants.find((p) => p.id === userId)) {
    return "full";
  }

  if (!room.participants.find((p) => p.id === userId)) {
    room.participants.push({ id: userId, name: userName, joinedAt: new Date().toISOString() });
  }
  touch(room);
  await persistRoom(room);
  return room;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) return;

  const participant = room.participants.find((p) => p.id === userId);
  // Stale beacon guard: if the participant rejoined in the last 10 s, this leave
  // beacon was sent before a page refresh and arrived late — ignore it.
  if (participant) {
    const joinedMs = new Date(participant.joinedAt).getTime();
    if (Date.now() - joinedMs < 10_000) return;
  }

  const wasHost = room.hostId === userId;
  room.participants = room.participants.filter((p) => p.id !== userId);
  room.coHostIds = room.coHostIds.filter((id) => id !== userId);

  if (room.participants.length === 0) {
    await db.delete(roomsTable).where(eq(roomsTable.id, roomId));
    return;
  }

  if (wasHost && room.participants.length > 0) {
    const newHost = room.participants[0];
    room.hostId = newHost.id;
    room.hostName = newHost.name;
  }

  touch(room);
  await persistRoom(room);
}

export async function setParticipantIntention(roomId: string, userId: string, intention: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;
  const participant = room.participants.find((p) => p.id === userId);
  if (!participant) return undefined;
  participant.intention = intention || undefined;
  touch(room);
  await persistRoom(room);
  return room;
}

export async function endRoom(roomId: string): Promise<void> {
  await db.delete(roomsTable).where(eq(roomsTable.id, roomId));
}

export async function reclaimHost(roomId: string, userId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;

  const participant = room.participants.find((p) => p.id === userId);
  if (!participant) return undefined;

  room.hostId = userId;
  room.hostName = participant.name;
  touch(room);
  await persistRoom(room);
  return room;
}

export async function transferHost(roomId: string, fromUserId: string, toUserId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;
  if (room.hostId !== fromUserId) return undefined;

  const newHost = room.participants.find((p) => p.id === toUserId);
  if (!newHost) return undefined;

  room.hostId = toUserId;
  room.hostName = newHost.name;
  // Remove new host from co-hosts if they were one
  room.coHostIds = room.coHostIds.filter((id) => id !== toUserId);
  touch(room);
  await persistRoom(room);
  return room;
}

export async function addCoHost(roomId: string, hostUserId: string, targetUserId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;
  if (room.hostId !== hostUserId) return undefined;
  if (targetUserId === hostUserId) return undefined;
  if (!room.participants.find((p) => p.id === targetUserId)) return undefined;
  if (!room.coHostIds.includes(targetUserId)) {
    room.coHostIds.push(targetUserId);
  }
  touch(room);
  await persistRoom(room);
  return room;
}

export async function removeCoHost(roomId: string, hostUserId: string, targetUserId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;
  if (room.hostId !== hostUserId) return undefined;
  room.coHostIds = room.coHostIds.filter((id) => id !== targetUserId);
  touch(room);
  await persistRoom(room);
  return room;
}

export function isPrivileged(room: Room | RoomResponse, userId: string): boolean {
  return room.hostId === userId || room.coHostIds.includes(userId);
}

export async function startRoomTimer(roomId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;

  if (room.timerState.status === "running") return room;

  room.timerState.status = "running";
  room.timerState.startedAt = new Date().toISOString();
  touch(room);
  await persistRoom(room);
  return room;
}

export async function pauseRoomTimer(roomId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room || room.timerState.status !== "running") return room;

  if (room.timerState.startedAt) {
    const now = Date.now();
    const started = new Date(room.timerState.startedAt).getTime();
    room.timerState.elapsed += Math.floor((now - started) / 1000);
  }

  room.timerState.status = "paused";
  room.timerState.startedAt = null;
  touch(room);
  await persistRoom(room);
  return room;
}

export async function resetRoomTimer(roomId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
  if (!room) return undefined;

  room.timerState = {
    phase:         "work",
    status:        "idle",
    duration:      room.settings.workDuration * 60,
    startedAt:     null,
    elapsed:       0,
    pomodoroCount: 0,
  };
  touch(room);
  await persistRoom(room);
  return room;
}

export async function skipPhase(roomId: string): Promise<Room | undefined> {
  const room = await getRoom(roomId);
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
  await persistRoom(room);
  return room;
}

async function cleanupStaleRooms(): Promise<void> {
  const cutoff = new Date(Date.now() - INACTIVITY_TIMEOUT_MS).toISOString();
  await db.delete(roomsTable).where(lt(roomsTable.lastActivityAt, cutoff));
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
