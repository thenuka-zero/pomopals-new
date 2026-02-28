import { Room, TimerSettings } from "./types";

// In-memory room store
const rooms: Map<string, Room> = new Map();

// Timer intervals for each room
const roomIntervals: Map<string, NodeJS.Timeout> = new Map();

// Listeners for room updates
type RoomListener = (room: Room) => void;
const roomListeners: Map<string, Set<RoomListener>> = new Map();

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

export function createRoom(hostId: string, hostName: string, name: string, settings?: Partial<TimerSettings>): Room {
  const id = generateRoomCode();
  const room: Room = {
    id,
    name,
    hostId,
    hostName,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    timerState: {
      phase: "work",
      status: "idle",
      timeRemaining: (settings?.workDuration || DEFAULT_SETTINGS.workDuration) * 60,
      pomodoroCount: 0,
    },
    participants: [{ id: hostId, name: hostName, joinedAt: new Date().toISOString() }],
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function joinRoom(roomId: string, userId: string, userName: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  if (!room.participants.find((p) => p.id === userId)) {
    room.participants.push({ id: userId, name: userName, joinedAt: new Date().toISOString() });
  }
  notifyListeners(roomId);
  return room;
}

export function leaveRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.participants = room.participants.filter((p) => p.id !== userId);
  if (room.participants.length === 0) {
    // Clean up timer interval
    const interval = roomIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      roomIntervals.delete(roomId);
    }
    rooms.delete(roomId);
    roomListeners.delete(roomId);
  } else {
    notifyListeners(roomId);
  }
}

export function startRoomTimer(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room || room.timerState.status === "running") return room;

  room.timerState.status = "running";
  notifyListeners(roomId);

  const interval = setInterval(() => {
    const r = rooms.get(roomId);
    if (!r || r.timerState.status !== "running") {
      clearInterval(interval);
      roomIntervals.delete(roomId);
      return;
    }

    r.timerState.timeRemaining -= 1;

    if (r.timerState.timeRemaining <= 0) {
      // Phase transition
      if (r.timerState.phase === "work") {
        r.timerState.pomodoroCount += 1;
        if (r.timerState.pomodoroCount % r.settings.longBreakInterval === 0) {
          r.timerState.phase = "longBreak";
          r.timerState.timeRemaining = r.settings.longBreakDuration * 60;
        } else {
          r.timerState.phase = "shortBreak";
          r.timerState.timeRemaining = r.settings.shortBreakDuration * 60;
        }
      } else {
        r.timerState.phase = "work";
        r.timerState.timeRemaining = r.settings.workDuration * 60;
      }
      r.timerState.status = "idle";
      clearInterval(interval);
      roomIntervals.delete(roomId);
    }

    notifyListeners(roomId);
  }, 1000);

  roomIntervals.set(roomId, interval);
  return room;
}

export function pauseRoomTimer(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  room.timerState.status = "paused";
  const interval = roomIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    roomIntervals.delete(roomId);
  }
  notifyListeners(roomId);
  return room;
}

export function resetRoomTimer(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  const interval = roomIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    roomIntervals.delete(roomId);
  }

  room.timerState = {
    phase: "work",
    status: "idle",
    timeRemaining: room.settings.workDuration * 60,
    pomodoroCount: 0,
  };
  notifyListeners(roomId);
  return room;
}

export function skipPhase(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  const interval = roomIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    roomIntervals.delete(roomId);
  }

  if (room.timerState.phase === "work") {
    room.timerState.pomodoroCount += 1;
    if (room.timerState.pomodoroCount % room.settings.longBreakInterval === 0) {
      room.timerState.phase = "longBreak";
      room.timerState.timeRemaining = room.settings.longBreakDuration * 60;
    } else {
      room.timerState.phase = "shortBreak";
      room.timerState.timeRemaining = room.settings.shortBreakDuration * 60;
    }
  } else {
    room.timerState.phase = "work";
    room.timerState.timeRemaining = room.settings.workDuration * 60;
  }
  room.timerState.status = "idle";
  notifyListeners(roomId);
  return room;
}

export function subscribeToRoom(roomId: string, listener: RoomListener): () => void {
  if (!roomListeners.has(roomId)) {
    roomListeners.set(roomId, new Set());
  }
  roomListeners.get(roomId)!.add(listener);
  return () => {
    roomListeners.get(roomId)?.delete(listener);
  };
}

function notifyListeners(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  roomListeners.get(roomId)?.forEach((listener) => listener({ ...room }));
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

export function listRooms(): Room[] {
  return Array.from(rooms.values());
}
