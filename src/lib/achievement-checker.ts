import { db } from './db';
import {
  pomodoroSessions, userAchievements, achievementProgress,
  userStats, friendships, roomCoSessions, users, userSettings
} from './db/schema';
import { eq, and, desc, count, sql, lt, lte, gte, ne, inArray } from 'drizzle-orm';
import { PomodoroSession } from './types';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from './achievements';
import { v4 as uuidv4 } from 'uuid';

export interface CheckContext {
  event: 'session_recorded' | 'friendship_confirmed' | 'room_created' | 'room_joined' | 'login';
  userId: string;
  session?: PomodoroSession & { sessionRunId?: string; timezone?: string; roomId?: string; roomParticipantCount?: number };
  friendCount?: number;
  roomId?: string;
  participantCount?: number;
  isUserHost?: boolean;
  hostId?: string;
}

export async function checkAchievements(ctx: CheckContext): Promise<string[]> {
  try {
    const { userId, event } = ctx;

    // Get already-unlocked achievement IDs
    const existingRows = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    const unlocked = new Set(existingRows.map((r) => r.achievementId));

    const newlyUnlocked: string[] = [];
    const progressUpdates: { achievementId: string; value: number }[] = [];
    const now = new Date().toISOString();

    // Helper to unlock an achievement
    async function unlock(achievementId: string) {
      if (unlocked.has(achievementId)) return;
      unlocked.add(achievementId);
      newlyUnlocked.push(achievementId);
      await db.insert(userAchievements).values({
        id: uuidv4(),
        userId,
        achievementId,
        unlockedAt: now,
        notifiedAt: null,
        retroactive: false,
      }).onConflictDoNothing();
    }

    // Helper to update progress
    function trackProgress(achievementId: string, value: number) {
      progressUpdates.push({ achievementId, value });
    }

    if (event === 'session_recorded' && ctx.session) {
      const session = ctx.session;

      if (session.phase === 'work' && session.completed) {
        // ── Count all completed work sessions ──────────────────────────
        const [countRow] = await db
          .select({ cnt: count() })
          .from(pomodoroSessions)
          .where(and(
            eq(pomodoroSessions.userId, userId),
            eq(pomodoroSessions.phase, 'work'),
            eq(pomodoroSessions.completed, true)
          ));
        const totalCompleted = Number(countRow?.cnt ?? 0);

        // Solo milestones
        trackProgress('finding-your-rhythm', totalCompleted);
        trackProgress('centurion', totalCompleted);
        trackProgress('pomodoro-pro', totalCompleted);
        trackProgress('the-legend', totalCompleted);

        if (totalCompleted >= 1) await unlock('first-step');
        if (totalCompleted >= 10) await unlock('finding-your-rhythm');
        if (totalCompleted >= 100) await unlock('centurion');
        if (totalCompleted >= 500) await unlock('pomodoro-pro');
        if (totalCompleted >= 1000) await unlock('the-legend');

        // The Answer (exactly 42 — check if we just crossed it)
        if (totalCompleted >= 42 && !unlocked.has('the-answer')) {
          await unlock('the-answer');
        }

        // Hat Trick — 3+ sessions on account creation day
        if (!unlocked.has('hat-trick')) {
          const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
          if (userRow) {
            const accountDate = userRow.createdAt.split('T')[0];
            if (session.date === accountDate) {
              const [dayCount] = await db.select({ cnt: count() }).from(pomodoroSessions).where(and(
                eq(pomodoroSessions.userId, userId),
                eq(pomodoroSessions.phase, 'work'),
                eq(pomodoroSessions.completed, true),
                eq(pomodoroSessions.date, accountDate)
              ));
              if (Number(dayCount?.cnt ?? 0) >= 3) await unlock('hat-trick');
            }
          }
        }

        // Custom Craftsman — non-default planned_duration (not 1500s)
        if (!unlocked.has('custom-craftsman') && session.plannedDuration !== 1500) {
          await unlock('custom-craftsman');
        }

        // ── Sessions in same sitting (sessionRunId) ──────────────────────
        if (session.sessionRunId) {
          const [runCount] = await db.select({ cnt: count() }).from(pomodoroSessions).where(and(
            eq(pomodoroSessions.userId, userId),
            eq(pomodoroSessions.phase, 'work'),
            eq(pomodoroSessions.completed, true),
            eq(pomodoroSessions.sessionRunId, session.sessionRunId)
          ));
          const runTotal = Number(runCount?.cnt ?? 0);
          trackProgress('long-haul', runTotal);
          trackProgress('marathon-runner', runTotal);
          trackProgress('ultramarathon', runTotal);
          if (runTotal >= 4) await unlock('long-haul');
          if (runTotal >= 8) await unlock('marathon-runner');
          if (runTotal >= 12) await unlock('ultramarathon');
        }

        // ── Daily count achievements ─────────────────────────────────────
        const [dayCount] = await db.select({ cnt: count() }).from(pomodoroSessions).where(and(
          eq(pomodoroSessions.userId, userId),
          eq(pomodoroSessions.phase, 'work'),
          eq(pomodoroSessions.completed, true),
          eq(pomodoroSessions.date, session.date)
        ));
        const dailyTotal = Number(dayCount?.cnt ?? 0);
        trackProgress('flow-state', dailyTotal);
        trackProgress('the-grind', dailyTotal);
        if (dailyTotal >= 8) await unlock('flow-state');
        if (dailyTotal >= 12) await unlock('the-grind');

        // Weekend Warrior
        if (!unlocked.has('weekend-warrior')) {
          const dateObj = new Date(session.date + 'T12:00:00Z');
          const dow = dateObj.getUTCDay(); // 0=Sun, 6=Sat
          if (dow === 0 || dow === 6) {
            trackProgress('weekend-warrior', dailyTotal);
            if (dailyTotal >= 5) await unlock('weekend-warrior');
          }
        }

        // ── Streak computation ────────────────────────────────────────────
        const streak = await computeStreak(userId);
        trackProgress('habit-forming', streak);
        trackProgress('week-in-the-zone', streak);
        trackProgress('unbreakable', streak);
        trackProgress('centurion-streak', streak);
        if (streak >= 3) await unlock('habit-forming');
        if (streak >= 7) await unlock('week-in-the-zone');
        if (streak >= 30) await unlock('unbreakable');
        if (streak >= 100) await unlock('centurion-streak');

        // ── Perfect Week ──────────────────────────────────────────────────
        if (!unlocked.has('perfect-week')) {
          const hasPerfectWeek = await checkPerfectWeek(userId);
          if (hasPerfectWeek) await unlock('perfect-week');
        }

        // ── Creature of Habit ─────────────────────────────────────────────
        if (!unlocked.has('creature-of-habit')) {
          const habitDays = await computeCreatureOfHabit(userId);
          trackProgress('creature-of-habit', habitDays);
          if (habitDays >= 10) await unlock('creature-of-habit');
        }

        // ── Room-based achievements ───────────────────────────────────────
        if (session.roomParticipantCount != null) {
          if (session.roomParticipantCount >= 3) await unlock('better-together');
          if (session.roomParticipantCount >= 5) await unlock('squad-goals');
        }

        // Study Buddy (room co-sessions)
        if (!unlocked.has('study-buddy') && session.roomId) {
          const bestFriendDays = await computeStudyBuddy(userId);
          trackProgress('study-buddy', bestFriendDays);
          if (bestFriendDays >= 5) await unlock('study-buddy');
        }

        // ── Easter eggs ───────────────────────────────────────────────────

        // Early Bird — started_at before 07:00 in user's timezone
        if (!unlocked.has('early-bird') && session.timezone && session.startedAt) {
          const hour = getHourInTimezone(session.startedAt, session.timezone);
          if (hour < 7) await unlock('early-bird');
        }

        // Night Owl — ended_at at or after 23:00 in user's timezone
        if (!unlocked.has('night-owl') && session.timezone && session.endedAt) {
          const hour = getHourInTimezone(session.endedAt, session.timezone);
          if (hour >= 23) await unlock('night-owl');
        }

        // Fresh Start — January 1st (UTC date)
        if (!unlocked.has('fresh-start')) {
          const parts = session.date.split('-'); // YYYY-MM-DD
          if (parts[1] === '01' && parts[2] === '01') {
            await unlock('fresh-start');
          }
        }

        // Back From the Dead — 30+ day gap since last session
        if (!unlocked.has('back-from-the-dead')) {
          // Find the most recent completed session BEFORE this one
          const [prevSession] = await db
            .select({ endedAt: pomodoroSessions.endedAt })
            .from(pomodoroSessions)
            .where(and(
              eq(pomodoroSessions.userId, userId),
              eq(pomodoroSessions.phase, 'work'),
              eq(pomodoroSessions.completed, true),
              ne(pomodoroSessions.id, session.id)
            ))
            .orderBy(desc(pomodoroSessions.endedAt))
            .limit(1);

          if (prevSession?.endedAt) {
            const prevDate = new Date(prevSession.endedAt);
            const nowDate = new Date();
            const daysDiff = Math.floor((nowDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 30) await unlock('back-from-the-dead');
          }
        }

        // Pomversary — session within 7 days of 1-year anniversary
        if (!unlocked.has('pomversary')) {
          const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
          if (userRow) {
            const accountCreated = new Date(userRow.createdAt);
            const oneYearMs = 365 * 24 * 60 * 60 * 1000;
            const anniversary = new Date(accountCreated.getTime() + oneYearMs);
            const sessionDate = new Date(session.startedAt);
            const diffMs = Math.abs(sessionDate.getTime() - anniversary.getTime());
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays <= 7) await unlock('pomversary');
          }
        }

        // Stealth Mode — session recorded when broadcast is off
        const [settingsRow] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
        const broadcastEnabled = settingsRow?.broadcastEnabled ?? true;
        if (!broadcastEnabled) {
          await db
            .update(userStats)
            .set({
              stealthSessionsCount: sql`${userStats.stealthSessionsCount} + 1`,
              updatedAt: now,
            })
            .where(eq(userStats.userId, userId));

          // Re-read count to check threshold
          const [statsRow] = await db.select({ cnt: userStats.stealthSessionsCount }).from(userStats).where(eq(userStats.userId, userId)).limit(1);
          if ((statsRow?.cnt ?? 0) >= 10) await unlock('stealth-mode');
        }
      }
    }

    if (event === 'friendship_confirmed') {
      const friendCount = ctx.friendCount ?? 0;
      trackProgress('building-your-circle', friendCount);
      trackProgress('the-connector', friendCount);
      if (friendCount >= 1) await unlock('social-spark');
      if (friendCount >= 5) await unlock('building-your-circle');
      if (friendCount >= 25) await unlock('the-connector');
    }

    if (event === 'room_created') {
      // Ensure user_stats row exists
      await ensureUserStats(userId, now);

      await db
        .update(userStats)
        .set({
          roomsHostedTotal: sql`${userStats.roomsHostedTotal} + 1`,
          updatedAt: now,
        })
        .where(eq(userStats.userId, userId));

      const [statsRow] = await db.select({ cnt: userStats.roomsHostedTotal }).from(userStats).where(eq(userStats.userId, userId)).limit(1);
      const hosted = statsRow?.cnt ?? 0;
      trackProgress('open-door', hosted);
      trackProgress('gracious-host', hosted);
      trackProgress('grand-host', hosted);
      if (hosted >= 1) await unlock('open-door');
      if (hosted >= 10) await unlock('gracious-host');
      if (hosted >= 50) await unlock('grand-host');
    }

    if (event === 'room_joined') {
      await ensureUserStats(userId, now);

      await db
        .update(userStats)
        .set({
          roomsJoinedTotal: sql`${userStats.roomsJoinedTotal} + 1`,
          updatedAt: now,
        })
        .where(eq(userStats.userId, userId));

      // Check if host is a friend
      if (ctx.hostId && !unlocked.has('joining-in')) {
        const [friendship] = await db
          .select()
          .from(friendships)
          .where(and(
            sql`(${friendships.userIdA} = ${userId} AND ${friendships.userIdB} = ${ctx.hostId})
             OR (${friendships.userIdA} = ${ctx.hostId} AND ${friendships.userIdB} = ${userId})`
          ))
          .limit(1);

        if (friendship) {
          await db.update(userStats).set({ hasJoinedFriendsRoom: true, updatedAt: now }).where(eq(userStats.userId, userId));
          await unlock('joining-in');
        }
      }

      // If user is the host, update max room size
      if (ctx.isUserHost && ctx.participantCount != null) {
        await db
          .update(userStats)
          .set({
            maxRoomSizeHosted: sql`MAX(${userStats.maxRoomSizeHosted}, ${ctx.participantCount})`,
            updatedAt: now,
          })
          .where(eq(userStats.userId, userId));

        const [statsRow] = await db.select({ maxSize: userStats.maxRoomSizeHosted }).from(userStats).where(eq(userStats.userId, userId)).limit(1);
        const maxSize = statsRow?.maxSize ?? 0;
        trackProgress('pack-leader', maxSize);
        trackProgress('full-house', maxSize);
        if (maxSize >= 10) await unlock('pack-leader');
        if (maxSize >= 20) await unlock('full-house');
      }
    }

    if (event === 'login') {
      // Pomversary check on login
      if (!unlocked.has('pomversary')) {
        const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
        if (userRow) {
          const accountCreated = new Date(userRow.createdAt);
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          const anniversary = new Date(accountCreated.getTime() + oneYearMs);
          const nowDate = new Date();
          const diffMs = Math.abs(nowDate.getTime() - anniversary.getTime());
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          // Only unlock if they're in the window AND have a completed session in the window
          if (diffDays <= 7) {
            const windowStart = new Date(anniversary.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const windowEnd = new Date(anniversary.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const [sessionInWindow] = await db
              .select()
              .from(pomodoroSessions)
              .where(and(
                eq(pomodoroSessions.userId, userId),
                eq(pomodoroSessions.phase, 'work'),
                eq(pomodoroSessions.completed, true),
                gte(pomodoroSessions.date, windowStart),
                lte(pomodoroSessions.date, windowEnd)
              ))
              .limit(1);
            if (sessionInWindow) await unlock('pomversary');
          }
        }
      }
    }

    // ── Flush all progress updates ──────────────────────────────────────────
    for (const { achievementId, value } of progressUpdates) {
      await db
        .insert(achievementProgress)
        .values({ userId, achievementId, currentValue: value, updatedAt: now })
        .onConflictDoUpdate({
          target: [achievementProgress.userId, achievementProgress.achievementId],
          set: { currentValue: value, updatedAt: now },
        });
    }

    return newlyUnlocked;
  } catch (err) {
    console.error('[achievement-checker] Error:', err);
    return [];
  }
}

// ── Retroactive backfill ──────────────────────────────────────────────────────
export async function runRetroactiveBackfill(userId: string): Promise<number> {
  try {
    const now = new Date().toISOString();
    let count = 0;

    // Ensure user_stats row
    await ensureUserStats(userId, now);

    // Get existing unlocks
    const existingRows = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    const unlocked = new Set(existingRows.map((r) => r.achievementId));

    async function retroUnlock(achievementId: string) {
      if (unlocked.has(achievementId)) return;
      unlocked.add(achievementId);
      count++;
      await db.insert(userAchievements).values({
        id: uuidv4(),
        userId,
        achievementId,
        unlockedAt: now,
        notifiedAt: now, // pre-acknowledge retroactive awards — no toast flood
        retroactive: true,
      }).onConflictDoNothing();
    }

    // Total completed sessions
    const [countRow] = await db.select({ cnt: sql<number>`count(*)` }).from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.phase, 'work'), eq(pomodoroSessions.completed, true)));
    const total = countRow?.cnt ?? 0;

    if (total >= 1) await retroUnlock('first-step');
    if (total >= 10) await retroUnlock('finding-your-rhythm');
    if (total >= 42) await retroUnlock('the-answer');
    if (total >= 100) await retroUnlock('centurion');
    if (total >= 500) await retroUnlock('pomodoro-pro');
    if (total >= 1000) await retroUnlock('the-legend');

    // Custom craftsman
    const [customRow] = await db.select({ cnt: sql<number>`count(*)` }).from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.phase, 'work'), eq(pomodoroSessions.completed, true), ne(pomodoroSessions.plannedDuration, 1500)));
    if ((customRow?.cnt ?? 0) > 0) await retroUnlock('custom-craftsman');

    // Flow State / The Grind (max daily count)
    const dailyCounts = await db
      .select({ date: pomodoroSessions.date, cnt: sql<number>`count(*)` })
      .from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.phase, 'work'), eq(pomodoroSessions.completed, true)))
      .groupBy(pomodoroSessions.date);

    const maxDaily = Math.max(0, ...dailyCounts.map((d) => Number(d.cnt)));
    if (maxDaily >= 8) await retroUnlock('flow-state');
    if (maxDaily >= 12) await retroUnlock('the-grind');

    // Weekend Warrior
    const weekendMax = dailyCounts
      .filter((d) => { const dow = new Date(d.date + 'T12:00:00Z').getUTCDay(); return dow === 0 || dow === 6; })
      .reduce((max, d) => Math.max(max, Number(d.cnt)), 0);
    if (weekendMax >= 5) await retroUnlock('weekend-warrior');

    // Streak-based
    const streak = await computeStreak(userId);
    if (streak >= 3) await retroUnlock('habit-forming');
    if (streak >= 7) await retroUnlock('week-in-the-zone');
    if (streak >= 30) await retroUnlock('unbreakable');
    if (streak >= 100) await retroUnlock('centurion-streak');

    // Perfect Week
    const hasPerfectWeek = await checkPerfectWeek(userId);
    if (hasPerfectWeek) await retroUnlock('perfect-week');

    // Creature of Habit
    const habitDays = await computeCreatureOfHabit(userId);
    if (habitDays >= 10) await retroUnlock('creature-of-habit');

    // Social Spark / Building Your Circle / The Connector
    const [friendRow] = await db.select({ cnt: sql<number>`count(*)` }).from(friendships)
      .where(sql`${friendships.userIdA} = ${userId} OR ${friendships.userIdB} = ${userId}`);
    const friendCount = friendRow?.cnt ?? 0;
    if (friendCount >= 1) await retroUnlock('social-spark');
    if (friendCount >= 5) await retroUnlock('building-your-circle');
    if (friendCount >= 25) await retroUnlock('the-connector');

    // Early Bird / Night Owl (UTC-based approximation for retroactive)
    const [earlyRow] = await db.select({ cnt: sql<number>`count(*)` }).from(pomodoroSessions)
      .where(and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.phase, 'work'),
        eq(pomodoroSessions.completed, true),
        sql`CAST(strftime('%H', ${pomodoroSessions.startedAt}) AS INTEGER) < 7`
      ));
    if ((earlyRow?.cnt ?? 0) > 0) await retroUnlock('early-bird');

    const [nightRow] = await db.select({ cnt: sql<number>`count(*)` }).from(pomodoroSessions)
      .where(and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.phase, 'work'),
        eq(pomodoroSessions.completed, true),
        sql`CAST(strftime('%H', ${pomodoroSessions.endedAt}) AS INTEGER) >= 23`
      ));
    if ((nightRow?.cnt ?? 0) > 0) await retroUnlock('night-owl');

    // Fresh Start (Jan 1st)
    const [freshRow] = await db.select({ cnt: sql<number>`count(*)` }).from(pomodoroSessions)
      .where(and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.phase, 'work'),
        eq(pomodoroSessions.completed, true),
        sql`strftime('%m-%d', ${pomodoroSessions.date}) = '01-01'`
      ));
    if ((freshRow?.cnt ?? 0) > 0) await retroUnlock('fresh-start');

    // Back From the Dead
    const allSessionDates = await db
      .select({ date: pomodoroSessions.date, endedAt: pomodoroSessions.endedAt })
      .from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.phase, 'work'), eq(pomodoroSessions.completed, true)))
      .orderBy(pomodoroSessions.endedAt);

    for (let i = 1; i < allSessionDates.length; i++) {
      const prev = allSessionDates[i - 1].endedAt;
      const curr = allSessionDates[i].endedAt;
      if (prev && curr) {
        const gap = (new Date(curr).getTime() - new Date(prev).getTime()) / (1000 * 60 * 60 * 24);
        if (gap >= 30) {
          await retroUnlock('back-from-the-dead');
          break;
        }
      }
    }

    // Pomversary
    const [userRow] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
    if (userRow) {
      const accountCreated = new Date(userRow.createdAt);
      for (let yearOffset = 1; yearOffset <= 5; yearOffset++) {
        const anniversary = new Date(accountCreated.getTime() + yearOffset * 365 * 24 * 60 * 60 * 1000);
        const windowStart = new Date(anniversary.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const windowEnd = new Date(anniversary.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const [annRow] = await db.select({ cnt: sql<number>`count(*)` }).from(pomodoroSessions)
          .where(and(
            eq(pomodoroSessions.userId, userId),
            eq(pomodoroSessions.phase, 'work'),
            eq(pomodoroSessions.completed, true),
            gte(pomodoroSessions.date, windowStart),
            lte(pomodoroSessions.date, windowEnd)
          ));
        if ((annRow?.cnt ?? 0) > 0) {
          await retroUnlock('pomversary');
          break;
        }
      }
    }

    // Insert initial progress values
    await upsertProgressAll(userId, total, streak, friendCount, now);

    return count;
  } catch (err) {
    console.error('[achievement-checker] Backfill error:', err);
    return 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function computeStreak(userId: string): Promise<number> {
  const dates = await db
    .selectDistinct({ date: pomodoroSessions.date })
    .from(pomodoroSessions)
    .where(and(
      eq(pomodoroSessions.userId, userId),
      eq(pomodoroSessions.phase, 'work'),
      eq(pomodoroSessions.completed, true)
    ))
    .orderBy(desc(pomodoroSessions.date));

  if (dates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must start from today or yesterday
  if (dates[0].date !== today && dates[0].date !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1].date + 'T12:00:00Z');
    const curr = new Date(dates[i].date + 'T12:00:00Z');
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function checkPerfectWeek(userId: string): Promise<boolean> {
  // Check if there's any 7-consecutive-day window where each day has >= 4 completed sessions
  const rows = await db
    .select({ date: pomodoroSessions.date, cnt: sql<number>`count(*)` })
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.phase, 'work'), eq(pomodoroSessions.completed, true)))
    .groupBy(pomodoroSessions.date)
    .orderBy(pomodoroSessions.date);

  if (rows.length < 7) return false;

  // Build a map date -> count
  const countMap = new Map(rows.map((r) => [r.date, Number(r.cnt)]));
  const dates = [...countMap.keys()].sort();

  for (let i = 0; i <= dates.length - 7; i++) {
    let perfect = true;
    const start = new Date(dates[i] + 'T12:00:00Z');
    for (let j = 0; j < 7; j++) {
      const d = new Date(start.getTime() + j * 86400000).toISOString().split('T')[0];
      if ((countMap.get(d) ?? 0) < 4) { perfect = false; break; }
    }
    if (perfect) return true;
  }
  return false;
}

async function computeCreatureOfHabit(userId: string): Promise<number> {
  const rows = await db
    .select({ startedAt: pomodoroSessions.startedAt, date: pomodoroSessions.date })
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.phase, 'work'), eq(pomodoroSessions.completed, true)));

  if (rows.length === 0) return 0;

  // Count sessions per 2-hour bucket (0-1, 2-3, ..., 22-23)
  const bucketCounts = new Array(12).fill(0);
  for (const row of rows) {
    const hour = new Date(row.startedAt).getUTCHours();
    const bucket = Math.floor(hour / 2);
    bucketCounts[bucket]++;
  }

  // Find peak bucket
  const peakBucket = bucketCounts.indexOf(Math.max(...bucketCounts));
  const peakStart = peakBucket * 2;
  const peakEnd = peakStart + 2;

  // Count distinct days with a session in the peak window
  const daysInWindow = new Set<string>();
  for (const row of rows) {
    const hour = new Date(row.startedAt).getUTCHours();
    if (hour >= peakStart && hour < peakEnd) {
      daysInWindow.add(row.date);
    }
  }

  return daysInWindow.size;
}

async function computeStudyBuddy(userId: string): Promise<number> {
  // Find the max distinct days with any single co_user_id
  const rows = await db
    .selectDistinct({ coUserId: roomCoSessions.coUserId, date: roomCoSessions.date })
    .from(roomCoSessions)
    .where(eq(roomCoSessions.sessionUserId, userId));

  if (rows.length === 0) return 0;

  const friendDays = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!friendDays.has(row.coUserId)) friendDays.set(row.coUserId, new Set());
    friendDays.get(row.coUserId)!.add(row.date);
  }

  let maxDays = 0;
  for (const days of friendDays.values()) {
    if (days.size > maxDays) maxDays = days.size;
  }
  return maxDays;
}

function getHourInTimezone(isoString: string, timezone: string): number {
  try {
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    return parseInt(hourPart?.value ?? '0', 10);
  } catch {
    return new Date(isoString).getUTCHours();
  }
}

async function ensureUserStats(userId: string, now: string): Promise<void> {
  await db.insert(userStats).values({
    userId,
    roomsHostedTotal: 0,
    roomsJoinedTotal: 0,
    maxRoomSizeHosted: 0,
    stealthSessionsCount: 0,
    hasJoinedFriendsRoom: false,
    pinnedAchievements: '[]',
    updatedAt: now,
  }).onConflictDoNothing();
}

async function upsertProgressAll(userId: string, totalPomodoros: number, streak: number, friendCount: number, now: string) {
  const updates = [
    { achievementId: 'finding-your-rhythm', value: Math.min(totalPomodoros, 10) },
    { achievementId: 'centurion', value: Math.min(totalPomodoros, 100) },
    { achievementId: 'pomodoro-pro', value: Math.min(totalPomodoros, 500) },
    { achievementId: 'the-legend', value: Math.min(totalPomodoros, 1000) },
    { achievementId: 'habit-forming', value: Math.min(streak, 3) },
    { achievementId: 'week-in-the-zone', value: Math.min(streak, 7) },
    { achievementId: 'unbreakable', value: Math.min(streak, 30) },
    { achievementId: 'centurion-streak', value: Math.min(streak, 100) },
    { achievementId: 'building-your-circle', value: Math.min(friendCount, 5) },
    { achievementId: 'the-connector', value: Math.min(friendCount, 25) },
  ];
  for (const { achievementId, value } of updates) {
    await db.insert(achievementProgress).values({ userId, achievementId, currentValue: value, updatedAt: now })
      .onConflictDoUpdate({
        target: [achievementProgress.userId, achievementProgress.achievementId],
        set: { currentValue: value, updatedAt: now },
      });
  }
}

export { computeStreak };
