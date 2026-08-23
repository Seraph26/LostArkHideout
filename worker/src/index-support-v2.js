const WORKER_VERSION = "2026-08-23-git-test";
const BIBLE_HOST = "lostark.bible";
const BIBLE_REMOTE = "https://lostark.bible/_app/remote/1ranzqj/raidStatsSearch";
/* Counting changed from "every page load" to "once per browser session", and the
   old total was almost entirely our own testing, so it restarts under a new key
   rather than being zeroed by hand in the dashboard. The old page-load figure is
   still under "page_visits" if it is ever wanted. */
const VISIT_KEY = "unique_visits_v1";
/* Share links used to carry the whole compressed roster snapshot in the URL
   fragment, so nothing ever touched a server -- deliberate, and true of every
   other endpoint here except this one. A full roster's snapshot runs past 2,000
   characters once encoded, which is Discord's message limit, so the link could
   not be pasted there. This endpoint is the one exception: the snapshot is
   stored in KV for 30 days under a short id, and the link becomes
   #id=<10 chars>. It is still never logged, never tied to an account, and never
   readable by anyone without the id, but it does now exist on Cloudflare's
   servers for that window rather than nowhere at all. */
const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;
const SHARE_MAX_BYTES = 60000;
const SHARE_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"; /* no 0/O/1/l/i */
function shareId() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += SHARE_ID_ALPHABET[b % SHARE_ID_ALPHABET.length];
  return id;
}

/* The connector used to answer any caller with Access-Control-Allow-Origin: *,
   which made it a free public proxy for Bible: anyone could point their own site
   or a script at it, spending this account's request quota and risking Bible
   rate-limiting or blocking the worker for everyone using the dashboard.
   Requests are now answered only for the origins that are actually the app.
   Add a line here when the dashboard moves or gains a domain -- for example a
   *.pages.dev or a custom domain. Note the limits: Origin is set by the browser
   and cannot be spoofed by a page, so this does stop another website from using
   the connector, but a direct client can send whatever Origin it likes. Rate
   limiting is the answer to that, and it needs a custom domain (see README). */
const ALLOWED_ORIGINS = new Set([
  "https://seraph26.github.io",
  "http://localhost:8777",
]);

function allowedOrigin(request) {
  const origin = request.headers.get("Origin");
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    /* Never "*" again: echo the one origin that asked, and Vary so a cached
       response for one origin is not handed to another. */
    "Access-Control-Allow-Origin": origin || "https://seraph26.github.io",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Cache-Control": "no-store",
  };
}

function json(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function validBibleUrl(value) {
  try {
    const u = new URL(value);
    const p = u.pathname.split("/").filter(Boolean);
    return u.protocol === "https:" && u.hostname === BIBLE_HOST && p.length >= 3 && p[0].toLowerCase() === "character" && !/roster|siblings|account/i.test(u.pathname);
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) });
    const u = new URL(request.url);
    /* Only POST /share creates anything; every other route stays GET-only. */
    if (request.method !== "GET" && !(request.method === "POST" && u.pathname === "/share"))
      return json({ ok: false, error: "Only GET requests are supported (POST /share is the one exception)." }, 405, origin);

    /* Left open: it touches nothing, and it lets an uptime check or a blocked
       caller tell the difference between "refused" and "down". The version is
       here so which build is actually live can be checked over HTTP -- this
       worker is deployed by hand, so the repo and the deployed code can silently
       drift apart. Bump it whenever this file changes. */
    if (u.pathname === "/health") return json({ ok: true, service: "lostark-bible-connector", version: WORKER_VERSION });

    /* Everything past here either spends a Bible request or writes to KV. */
    if (!origin) return json({ ok: false, error: "This connector only serves the Lost Ark Hideout dashboard." }, 403);

    if (u.pathname === "/share" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: "Expected JSON body." }, 400, origin); }
      const s = typeof body?.s === "string" ? body.s : "";
      if (!s) return json({ ok: false, error: "Missing snapshot." }, 400, origin);
      if (s.length > SHARE_MAX_BYTES) return json({ ok: false, error: "Snapshot is too large to share." }, 400, origin);
      const id = shareId();
      try {
        await env.SHARES.put(id, s, { expirationTtl: SHARE_TTL_SECONDS });
        return json({ ok: true, id }, 200, origin);
      } catch {
        return json({ ok: false, error: "Unable to store the share link." }, 500, origin);
      }
    }

    if (u.pathname.startsWith("/share/") && request.method === "GET") {
      const id = u.pathname.slice("/share/".length);
      if (!/^[0-9a-zA-Z]{4,32}$/.test(id)) return json({ ok: false, error: "Invalid share id." }, 400, origin);
      try {
        const s = await env.SHARES.get(id);
        if (s === null) return json({ ok: false, error: "This share link has expired or does not exist." }, 404, origin);
        return json({ ok: true, s }, 200, origin);
      } catch {
        return json({ ok: false, error: "Unable to retrieve the share link." }, 500, origin);
      }
    }

    if (u.pathname === "/visits") {
      /* ?peek=1 reads the figure without counting. The dashboard counts once per
         browser session and only peeks on later loads in that session, so a
         refresh no longer inflates the number -- and it saves a KV write, which
         matters against the free tier's daily write allowance. */
      const peek = u.searchParams.get("peek") === "1";
      try {
        const current = Number.parseInt(await env.VISITS.get(VISIT_KEY) || "0", 10);
        if (peek) return json({ ok: true, visits: current }, 200, origin);
        const visits = current + 1;
        await env.VISITS.put(VISIT_KEY, String(visits));
        return json({ ok: true, visits }, 200, origin);
      } catch {
        return json({ ok: false, error: "Unable to update visit counter." }, 500, origin);
      }
    }

    if (u.pathname === "/raid-stats") {
      const payload = u.searchParams.get("payload");
      if (!payload) return json({ ok: false, error: "Missing raidStatsSearch payload." }, 400, origin);
      if (payload.length > 20000) return json({ ok: false, error: "Raid stats payload is too large." }, 400, origin);
      try {
        const response = await fetch(`${BIBLE_REMOTE}?payload=${encodeURIComponent(payload)}`, {
          headers: {
            Accept: "application/json,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 (compatible; LostArkHideout/1.0; +https://github.com/Seraph26/LostArkHideout)",
          },
          cf: { cacheTtl: 300, cacheEverything: false },
        });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: { ...corsHeaders(origin), "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8" },
        });
      } catch {
        return json({ ok: false, error: "Unable to retrieve Bible raid statistics." }, 502, origin);
      }
    }

    if (u.pathname !== "/character") return json({ ok: false, error: "Use /character?url=https://lostark.bible/character/REGION/NAME or /raid-stats?payload=..." }, 404, origin);
    const bibleUrl = u.searchParams.get("url");
    if (!bibleUrl) return json({ ok: false, error: "Missing character URL." }, 400, origin);
    if (!validBibleUrl(bibleUrl)) return json({ ok: false, error: "Invalid Bible character URL." }, 400, origin);
    const parts = new URL(bibleUrl).pathname.split("/").filter(Boolean);
    const character = decodeURIComponent(parts.slice(2).join("/"));
    const region = decodeURIComponent(parts[1]);
    try {
      const response = await fetch(bibleUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; LostArkHideout/1.0; +https://github.com/Seraph26/LostArkHideout)",
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      });
      if (!response.ok) return json({ ok: false, error: `Bible returned HTTP ${response.status}.`, character, region }, 502, origin);
      const html = await response.text();
      return new Response(JSON.stringify({ ok: true, character, region, source: bibleUrl, html }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
      });
    } catch {
      return json({ ok: false, error: "Unable to retrieve the Bible character page.", character, region }, 502, origin);
    }
  },
};
