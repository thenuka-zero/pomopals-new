import type { Intention } from "./types";

export interface SessionBlock {
  sessionGroupId: string | null;
  date: string;
  startedAt: string; // earliest startedAt in the group
  intentions: Intention[];
}

/**
 * Groups a flat list of intentions into session blocks.
 * Intentions sharing a sessionGroupId are grouped together.
 * Intentions without a sessionGroupId remain as singleton blocks.
 * Returns blocks sorted by startedAt descending (newest first).
 */
export function groupIntoSessionBlocks(intentions: Intention[]): SessionBlock[] {
  const grouped = new Map<string, SessionBlock>();
  const singles: SessionBlock[] = [];

  for (const intention of intentions) {
    if (intention.sessionGroupId) {
      const existing = grouped.get(intention.sessionGroupId);
      if (existing) {
        existing.intentions.push(intention);
        if (intention.startedAt < existing.startedAt) {
          existing.startedAt = intention.startedAt;
        }
      } else {
        grouped.set(intention.sessionGroupId, {
          sessionGroupId: intention.sessionGroupId,
          date: intention.date,
          startedAt: intention.startedAt,
          intentions: [intention],
        });
      }
    } else {
      singles.push({
        sessionGroupId: null,
        date: intention.date,
        startedAt: intention.startedAt,
        intentions: [intention],
      });
    }
  }

  return [...grouped.values(), ...singles].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt)
  );
}
