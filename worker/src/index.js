const BIBLE_HOST = "lostark.bible";
const BIBLE_REMOTE = "https://lostark.bible/_app/remote/1ranzqj/raidStatsSearch";
const VISIT_KEY = "page_visits";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Cache-Control": "no-store",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
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
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
    if (request.method !== "GET") return json({ ok: false, error: "Only GET requests are supported." }, 405);

    const u = new URL(request.url);

    if (u.pathname === "/health") {
      return json({ ok: true, service: "lostark-bible-connector" });
    }

    if (u.pathname === "/visits") {
      try {
        const visits = Number.parseInt(await env.VISITS.get(VISIT_KEY) || "0", 10) + 1;
        await env.VISITS.put(VISIT_KEY, String(visits));
        return json({ ok: true, visits });
      } catch {
        return json({ ok: false, error: "Unable to update visit counter." }, 500);
      }
    }

    if (u.pathname === "/raid-stats") {
      const payload = u.searchParams.get("payload");
      if (!payload) return json({ ok: false, error: "Missing raidStatsSearch payload." }, 400);
      if (payload.length > 20000) return json({ ok: false, error: "Raid stats payload is too large." }, 400);
      try {
        const response = await fetch(`${BIBLE_REMOTE}?payload=${encodeURIComponent(payload)}`, {
          headers: {
            Accept: "application/json,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 (compatible; LostArkParty/1.0; +https://github.com/Seraph26/LostArkParty)",
          },
          cf: { cacheTtl: 300, cacheEverything: false },
        });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: { ...corsHeaders(), "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8" },
        });
      } catch {
        return json({ ok: false, error: "Unable to retrieve Bible raid statistics." }, 502);
      }
    }

    if (u.pathname !== "/character") {
      return json({ ok: false, error: "Use /character?url=https://lostark.bible/character/REGION/NAME or /raid-stats?payload=..." }, 404);
    }

    const bibleUrl = u.searchParams.get("url");
    if (!bibleUrl) return json({ ok: false, error: "Missing character URL." }, 400);
    if (!validBibleUrl(bibleUrl)) return json({ ok: false, error: "Invalid Bible character URL." }, 400);

    const parts = new URL(bibleUrl).pathname.split("/").filter(Boolean);
    const character = decodeURIComponent(parts.slice(2).join("/"));
    const region = decodeURIComponent(parts[1]);

    try {
      const response = await fetch(bibleUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; LostArkParty/1.0; +https://github.com/Seraph26/LostArkParty)",
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      if (!response.ok) {
        return json({ ok: false, error: `Bible returned HTTP ${response.status}.`, character, region }, 502);
      }

      const html = await response.text();
      return new Response(JSON.stringify({ ok: true, character, region, source: bibleUrl, html }), {
        status: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
      });
    } catch {
      return json({ ok: false, error: "Unable to retrieve the Bible character page.", character, region }, 502);
    }
  },
};
