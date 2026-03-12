import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getGoogleAuth } from "@/lib/google-auth";
import { unstable_cache } from "next/cache";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscPage {
  page: string;
  clicks: number;
  impressions: number;
}

interface GscData {
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: GscQuery[];
  topPages: GscPage[];
}

interface Ga4Channel {
  channel: string;
  sessions: number;
  users: number;
}

interface Ga4Page {
  page: string;
  sessions: number;
}

interface Ga4DailySession {
  date: string;
  sessions: number;
}

interface Ga4Data {
  totals: {
    sessions: number;
    users: number;
    newUsers: number;
    engagementRate: number;
  };
  byChannel: Ga4Channel[];
  topLandingPages: Ga4Page[];
  byDate: Ga4DailySession[];
}

// ─── GSC fetch ───────────────────────────────────────────────────────────────

async function fetchGscData(): Promise<GscData | null> {
  const auth = getGoogleAuth();
  if (!auth) return null;

  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) return null;

  const searchconsole = google.searchconsole({ version: "v1", auth });

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [totalsResult, queriesResult, pagesResult] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        rowLimit: 1,
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 10,
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 10,
      },
    }),
  ]);

  const totalsRows = totalsResult.data.rows ?? [];
  const totalClicks = totalsRows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = totalsRows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  // For the top-level totals query (no dimensions), there should be exactly one row
  const avgCtr = totalsRows[0]?.ctr ?? 0;
  const avgPosition = totalsRows[0]?.position ?? 0;

  const topQueries: GscQuery[] = (queriesResult.data.rows ?? []).map((r) => ({
    query: (r.keys?.[0]) ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));

  const topPages: GscPage[] = (pagesResult.data.rows ?? []).map((r) => ({
    page: (r.keys?.[0]) ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
  }));

  return {
    totals: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCtr,
      position: avgPosition,
    },
    topQueries,
    topPages,
  };
}

// ─── GA4 fetch ────────────────────────────────────────────────────────────────

async function fetchGa4Data(): Promise<Ga4Data | null> {
  const auth = getGoogleAuth();
  if (!auth) return null;

  const rawPropertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!rawPropertyId) return null;
  const propertyId = rawPropertyId.startsWith("properties/") ? rawPropertyId : `properties/${rawPropertyId}`;

  const analyticsdata = google.analyticsdata({ version: "v1beta", auth });

  const [totalsResult, channelsResult, pagesResult, dateResult] = await Promise.all([
    analyticsdata.properties.runReport({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "engagementRate" },
        ],
      },
    }),
    analyticsdata.properties.runReport({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "10",
      },
    }),
    analyticsdata.properties.runReport({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "5",
      },
    }),
    analyticsdata.properties.runReport({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        limit: "29",
      },
    }),
  ]);

  const totalsRow = totalsResult.data.rows?.[0];
  const metricValues = totalsRow?.metricValues ?? [];

  const byChannel: Ga4Channel[] = (channelsResult.data.rows ?? []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    users: parseInt(r.metricValues?.[1]?.value ?? "0", 10),
  }));

  const topLandingPages: Ga4Page[] = (pagesResult.data.rows ?? []).map((r) => ({
    page: r.dimensionValues?.[0]?.value ?? "/",
    sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
  }));

  const byDate: Ga4DailySession[] = (dateResult.data.rows ?? []).map((r) => {
    const raw = r.dimensionValues?.[0]?.value ?? "";
    // GA4 returns dates as "YYYYMMDD" — convert to "YYYY-MM-DD"
    const date = raw.length === 8
      ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
      : raw;
    return { date, sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10) };
  });

  return {
    totals: {
      sessions: parseInt(metricValues[0]?.value ?? "0", 10),
      users: parseInt(metricValues[1]?.value ?? "0", 10),
      newUsers: parseInt(metricValues[2]?.value ?? "0", 10),
      engagementRate: parseFloat(metricValues[3]?.value ?? "0"),
    },
    byChannel,
    topLandingPages,
    byDate,
  };
}

// ─── Cached fetcher ───────────────────────────────────────────────────────────

const getCachedTrafficData = unstable_cache(
  async () => {
    const [gsc, ga4] = await Promise.allSettled([fetchGscData(), fetchGa4Data()]);

    return {
      gsc: gsc.status === "fulfilled" ? gsc.value : null,
      ga4: ga4.status === "fulfilled" ? ga4.value : null,
      gscError: gsc.status === "rejected" ? String(gsc.reason) : null,
      ga4Error: ga4.status === "rejected" ? String(ga4.reason) : null,
      cachedAt: new Date().toISOString(),
    };
  },
  ["admin-traffic"],
  { revalidate: 3600, tags: ["admin-traffic"] }
);

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  // When ?bust=1 is passed, skip the cache entirely and fetch fresh data
  const bust = request.nextUrl.searchParams.get("bust") === "1";

  // Check if Google credentials are configured at all
  const hasGscConfig =
    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    !!process.env.GSC_SITE_URL;

  const hasGa4Config =
    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    !!process.env.GA4_PROPERTY_ID;

  if (!hasGscConfig && !hasGa4Config) {
    return NextResponse.json({
      gsc: null,
      ga4: null,
      gscError: "Google Search Console credentials not configured",
      ga4Error: "Google Analytics 4 credentials not configured",
      cachedAt: new Date().toISOString(),
      configured: false,
    });
  }

  try {
    // On cache bust, fetch fresh data directly; otherwise use the 1-hour cache
    const data = bust
      ? await (async () => {
          const [gsc, ga4] = await Promise.allSettled([fetchGscData(), fetchGa4Data()]);
          return {
            gsc: gsc.status === "fulfilled" ? gsc.value : null,
            ga4: ga4.status === "fulfilled" ? ga4.value : null,
            gscError: gsc.status === "rejected" ? String(gsc.reason) : null,
            ga4Error: ga4.status === "rejected" ? String(ga4.reason) : null,
            cachedAt: new Date().toISOString(),
          };
        })()
      : await getCachedTrafficData();
    return NextResponse.json({ ...data, configured: true });
  } catch (err) {
    console.error("[admin/traffic] Error:", err);
    return NextResponse.json({
      gsc: null,
      ga4: null,
      gscError: String(err),
      ga4Error: String(err),
      cachedAt: new Date().toISOString(),
      configured: true,
    });
  }
}
