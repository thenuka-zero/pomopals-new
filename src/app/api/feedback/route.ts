import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type, title, description, userEmail, userName } = body;

  // Validate type
  if (type !== "feature" && type !== "bug") {
    return NextResponse.json({ error: "type must be 'feature' or 'bug'" }, { status: 400 });
  }

  // Validate title
  if (typeof title !== "string" || title.length < 1 || title.length > 100) {
    return NextResponse.json({ error: "title must be 1–100 characters" }, { status: 400 });
  }

  // Validate description
  if (typeof description !== "string" || description.length < 1 || description.length > 1000) {
    return NextResponse.json({ error: "description must be 1–1000 characters" }, { status: 400 });
  }

  const issueTitle = `[${type === "feature" ? "Feature" : "Bug"}] ${title}`;
  const issueBody = `## ${type === "feature" ? "Feature Request" : "Bug Report"}\n\n${description}\n\n---\n*Submitted via PomoPals in-app feedback${userEmail ? ` by ${userName ?? userEmail} (${userEmail})` : " (anonymous)"}*`;
  const labels = [type === "feature" ? "enhancement" : "bug", "user-feedback"];

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.log("[feedback] GITHUB_TOKEN not set — skipping GitHub issue creation.", { type, title });
    return NextResponse.json({ success: true, issueUrl: null });
  }

  try {
    const res = await fetch("https://api.github.com/repos/thenuka-zero/pomopals-new/issues", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody, labels }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[feedback] GitHub API error:", res.status, text);
      return NextResponse.json({ error: "Failed to create GitHub issue" }, { status: 502 });
    }

    const issue = await res.json();
    return NextResponse.json({ success: true, issueUrl: issue.html_url });
  } catch (err) {
    console.error("[feedback] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
