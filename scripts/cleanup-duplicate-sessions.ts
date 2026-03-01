/**
 * One-time cleanup script to remove duplicate pomodoro sessions.
 *
 * Duplicates are identified as sessions by the same user with the same
 * started_at timestamp. For each group of duplicates, we keep the "best"
 * one (completed > partial, longer duration wins) and delete the rest.
 *
 * Run with: npx tsx scripts/cleanup-duplicate-sessions.ts
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  completed: number;
  actual_duration: number;
}

async function main() {
  console.log("Finding duplicate sessions...");

  // Use raw SQL to avoid schema/column mismatch issues
  const allSessions = await db.all<SessionRow>(
    sql`SELECT id, user_id, started_at, completed, actual_duration FROM pomodoro_sessions`
  );

  // Group by (userId, startedAt)
  const groups = new Map<string, SessionRow[]>();
  for (const s of allSessions) {
    const key = `${s.user_id}|${s.started_at}`;
    const group = groups.get(key);
    if (group) {
      group.push(s);
    } else {
      groups.set(key, [s]);
    }
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("No duplicate sessions found. Nothing to clean up.");
    return;
  }

  console.log(`Found ${duplicateGroups.length} groups of duplicate sessions.`);

  let totalDeleted = 0;

  for (const group of duplicateGroups) {
    // Sort: completed first, then by actualDuration descending, then by id (stable)
    group.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      if (a.actual_duration !== b.actual_duration) return b.actual_duration - a.actual_duration;
      return a.id.localeCompare(b.id);
    });

    const keep = group[0];
    const toDelete = group.slice(1);

    console.log(
      `  Keeping ${keep.id} (completed=${keep.completed}, duration=${keep.actual_duration}s), ` +
      `deleting ${toDelete.length} duplicate(s) for user=${keep.user_id} startedAt=${keep.started_at}`
    );

    for (const dup of toDelete) {
      await db.run(sql`DELETE FROM pomodoro_sessions WHERE id = ${dup.id}`);
      totalDeleted++;
    }
  }

  console.log(`\nDone. Deleted ${totalDeleted} duplicate session(s).`);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
