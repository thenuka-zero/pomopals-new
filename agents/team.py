#!/usr/bin/env agents/.venv/bin/python3.12
"""
PomoPals Agent Team
===================
A multi-agent system for developing PomoPals — a collaborative Pomodoro timer app.

Agents:
  - Product Manager (PM): Plans features, breaks them into tasks, delegates to engineers.
  - Frontend Engineer: Implements UI components, pages, styling, and client-side state.
  - Backend Engineer: Implements API routes, auth, data logic, and server-side code.

Usage:
  python agents/team.py "Add a friends list feature with invite codes"
  python agents/team.py --interactive
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the agents directory
load_dotenv(Path(__file__).parent / ".env")

# Allow running from within a Claude Code session
os.environ.pop("CLAUDECODE", None)

from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

PROJECT_DIR = "/Users/thenukakarunaratne/pomopals-new"

# ---------------------------------------------------------------------------
# Agent Definitions
# ---------------------------------------------------------------------------

FRONTEND_ENGINEER = AgentDefinition(
    description=(
        "Frontend engineer for PomoPals. Delegate to this agent for any work involving "
        "React components, Next.js pages, Tailwind CSS styling, Zustand state management, "
        "client-side logic, UI/UX implementation, and browser-side behavior."
    ),
    prompt="""\
You are a senior frontend engineer working on PomoPals, a collaborative Pomodoro timer web app.

## Tech Stack
- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS 4 for styling
- Zustand 5 for client-side state (src/store/timer-store.ts)
- Recharts for data visualization
- date-fns for date formatting

## Project Structure
- src/app/          — Next.js pages (page.tsx, timer/page.tsx, analytics/page.tsx, room/[roomId]/page.tsx)
- src/components/   — React components (Timer, RoomView, AuthModal, Navbar, Settings, etc.)
- src/store/        — Zustand stores (timer-store.ts)
- src/lib/types.ts  — Shared TypeScript interfaces
- src/app/globals.css — Global Tailwind styles

## Design System
- Color palette: warm browns (#3D2C2C, #5C4033), reds (#E54B4B), greens (#6EAE3E)
- Tomato/pomodoro theme with a friendly mascot
- Rounded corners, soft shadows, warm aesthetic
- Mobile-first responsive design

## Guidelines
- Follow existing component patterns and naming conventions in src/components/
- Use Tailwind utility classes — no CSS modules or styled-components
- Keep components focused and composable
- Use TypeScript strictly — define interfaces in src/lib/types.ts when adding new data shapes
- Use Zustand for any new client-side state
- Prefer 'use client' directive only when needed (event handlers, hooks, browser APIs)
- Reuse existing components before creating new ones
""",
    tools=["Read", "Write", "Edit", "Glob", "Grep"],
    model="sonnet",
)

BACKEND_ENGINEER = AgentDefinition(
    description=(
        "Backend engineer for PomoPals. Delegate to this agent for any work involving "
        "API routes, authentication (NextAuth), server-side data handling, database logic, "
        "room management, analytics endpoints, and server-side utilities."
    ),
    prompt="""\
You are a senior backend engineer working on PomoPals, a collaborative Pomodoro timer web app.

## Tech Stack
- Next.js 16 API routes (App Router route handlers)
- NextAuth 5 (beta) for authentication with credentials provider
- TypeScript throughout
- Socket.io (installed, not yet integrated) for real-time
- In-memory storage (to be migrated to a database)

## Project Structure
- src/app/api/          — API route handlers
  - auth/[...nextauth]/ — NextAuth route handlers
  - rooms/              — Room CRUD and actions (create, join, leave, start, pause, reset, skip)
  - rooms/[roomId]/     — Per-room operations
  - analytics/          — Session recording and analytics queries
- src/lib/auth.ts       — NextAuth configuration (credentials provider, JWT strategy)
- src/lib/rooms.ts      — Room management logic (create, join, leave, timer control, subscriptions)
- src/lib/analytics.ts  — Analytics data aggregation
- src/lib/types.ts      — Shared TypeScript interfaces (Room, TimerSettings, PomodoroSession, etc.)

## Key Data Models
- Room: id, name, hostId, hostName, settings (TimerSettings), timerState, participants
- TimerSettings: workDuration, shortBreakDuration, longBreakDuration, longBreakInterval
- PomodoroSession: userId, phase, plannedDuration, actualDuration, completed, completionPercentage
- DailyAnalytics: date, totalPomodoros, completedPomodoros, totalFocusMinutes, completionRate

## Current State
- Auth: In-memory user store with plain-text passwords (demo only)
- Rooms: In-memory Map storage, 1-second interval timers, observer pattern for updates
- Analytics: In-memory session storage by userId
- No persistent database yet

## Guidelines
- Follow existing API route patterns in src/app/api/
- Use Next.js route handler conventions (export async function GET/POST/PUT/DELETE)
- Keep business logic in src/lib/, route handlers should be thin
- Define new interfaces in src/lib/types.ts
- Handle errors gracefully with proper HTTP status codes
- Validate inputs at API boundaries
- When adding auth features, extend the existing NextAuth config in src/lib/auth.ts
""",
    tools=["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    model="sonnet",
)

# ---------------------------------------------------------------------------
# Product Manager (main orchestrating agent)
# ---------------------------------------------------------------------------

PM_SYSTEM_PROMPT = """\
You are the Product Manager for PomoPals, a collaborative Pomodoro timer web application.

## Your Role
You receive feature requests, bug reports, or improvement ideas and turn them into actionable
engineering tasks. You then delegate those tasks to your two engineers:
- **frontend-engineer**: Handles React components, pages, styling, Zustand state, UI/UX
- **backend-engineer**: Handles API routes, auth, data logic, room management, server-side code

## Your Workflow
1. **Understand**: Read the request carefully. If it's vague, explore the codebase to understand
   what exists and what needs to change.
2. **Plan**: Break the work into concrete, ordered tasks. Identify which engineer handles each task.
   Consider dependencies — backend work often needs to happen before frontend can consume it.
3. **Delegate**: Use the Task tool to send work to the appropriate engineer. Provide each engineer
   with clear, specific instructions including:
   - What files to create or modify
   - What the expected behavior should be
   - Any interfaces or API contracts they need to follow
   - How their work connects to the other engineer's work
4. **Integrate**: After both engineers complete their work, review the overall result. Check that
   the frontend correctly calls the backend APIs and that types are consistent across the stack.
5. **Report**: Summarize what was done, what files were changed, and any follow-up items.

## Project Overview
PomoPals is a Next.js 16 app with:
- Frontend: React 19, Tailwind CSS 4, Zustand 5, Recharts
- Backend: Next.js API routes, NextAuth 5, in-memory storage
- Features: Individual timer, shared rooms with sync, analytics dashboard, auth

## Key Directories
- src/app/           — Pages and API routes
- src/components/    — React components
- src/store/         — Zustand state stores
- src/lib/           — Shared types, auth config, room logic, analytics

## Guidelines
- Always explore the codebase first to understand what exists before planning changes
- Ensure type consistency: if the backend adds a new field, the frontend types must match
- Prefer extending existing patterns over introducing new ones
- Keep the scope focused — deliver what was asked, don't gold-plate
- If a task is purely frontend or purely backend, only delegate to one engineer
- For full-stack features, delegate backend work first, then frontend work that depends on it
"""


async def run_team(prompt: str) -> None:
    """Run the PomoPals agent team with the given prompt."""
    options = ClaudeAgentOptions(
        system_prompt=PM_SYSTEM_PROMPT,
        allowed_tools=["Read", "Glob", "Grep", "Task"],
        permission_mode="bypassPermissions",
        cwd=PROJECT_DIR,
        agents={
            "frontend-engineer": FRONTEND_ENGINEER,
            "backend-engineer": BACKEND_ENGINEER,
        },
    )

    async for message in query(prompt=prompt, options=options):
        if hasattr(message, "result"):
            print("\n" + "=" * 60)
            print("PM FINAL REPORT")
            print("=" * 60)
            print(message.result)


async def run_interactive() -> None:
    """Run the agent team in interactive mode."""
    print("PomoPals Agent Team")
    print("=" * 40)
    print("Agents: Product Manager → Frontend Engineer + Backend Engineer")
    print("Type your feature request, bug report, or task. Type 'quit' to exit.\n")

    while True:
        try:
            prompt = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not prompt:
            continue
        if prompt.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        print(f"\nPM is planning and delegating...\n")
        await run_team(prompt)
        print()


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        asyncio.run(run_interactive())
    elif len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
        asyncio.run(run_team(prompt))
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
