const ALLOWED_ORIGINS = [
  "https://seraph0226.github.io",
  "https://seraph26.github.io",
];

const BIBLE_HOST = "lostark.bible";
const VISIT_KEY = "page_visits";
const BIBLE_SEARCH = "https://lostark.bible/_app/remote/ngsbie/search";

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function isValidBibleCharacterUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== BIBLE_HOST) return false;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 3 || parts[0].toLowerCase() !== "character") return false;
    if (/roster|siblings|account/i.test(url.pathname)) return false;
    return true;
  } catch { return false; }
}

function extractCharacterName(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts.length >= 3 ? decodeURIComponent(parts.slice(2).join("/")) : null;
}

function extractRegion(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts.length >= 2 ? decodeURIComponent(parts[1]) : null;
}

function makeSearchPayload(name, region) {
  const value = JSON.stringify([["__skrao", 1], { name: 2, region: 3 }, String(name), String(region)]);
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") return json({ ok: false, error: "Only GET requests are supported." }, 405, origin);

    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/visits") {
      try {
        const current = await env.VISITS.get(VISIT_KEY);
        const visits = Number.parseInt(current || "0", 10) + 1;
        await env.VISITS.put(VISIT_KEY, String(visits));
        return json({ ok: true, visits }, 200, origin);
      } catch {
        return json({ ok: false, error: "Unable to update visit counter." }, 500, origin);
      }
    }

    if (requestUrl.pathname === "/search") {
      const name = (requestUrl.searchParams.get("name") || "").trim();
      const region = (requestUrl.searchParams.get("region") || "NA").trim().toUpperCase();
      if (name.length < 2) return json({ ok: true, results: [] }, 200, origin);

      try {
        const payload = makeSearchPayload(name, region);
        const response = await fetch(`${BIBLE_SEARCH}?payload=${encodeURIComponent(payload)}`, {
          headers: { Accept: "application/json" },
          cf: { cacheTtl: 0, cacheEverything: false },
        });
        const text = await response.text();
        if (!response.ok) return json({ ok: false, error: `Bible search returned HTTP ${response.status}.` }, 502, origin);
        return new Response(JSON.stringify({ ok: true, data: text }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
        });
      } catch {
        return json({ ok: false, error: "Unable to reach the Bible search service." }, 502, origin);
      }
    }

    if (requestUrl.pathname !== "/character") {
      return json({ ok: false, error: "Use /character?url=https://lostark.bible/character/REGION/NAME" }, 404, origin);
    }

    const bibleUrl = requestUrl.searchParams.get("url");
    if (!bibleUrl) return json({ ok: false, error: "Missing character URL." }, 400, origin);
    if (!isValidBibleCharacterUrl(bibleUrl)) {
      return json({ ok: false, error: "Invalid Bible character URL. Only specific /character/... URLs are accepted." }, 400, origin);
    }

    const characterName = extractCharacterName(bibleUrl);
    const region = extractRegion(bibleUrl);

    try {
      const response = await fetch(bibleUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; LostArkHideout/1.0; +https://github.com/Seraph26/LostArkHideout)",
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      if (!response.ok) {
        return json({ ok: false, error: `Bible returned HTTP ${response.status}.`, character: characterName, region }, 502, origin);
      }

      const html = await response.text();
      return new Response(JSON.stringify({ ok: true, character: characterName, region, source: bibleUrl, html }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
      });
    } catch {
      return json({ ok: false, error: "Unable to retrieve the Bible character page.", character: characterName, region }, 502, origin);
    }
  },
};
