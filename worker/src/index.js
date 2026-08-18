const ALLOWED_ORIGINS = ["https://seraph0226.github.io", "https://seraph26.github.io"];
const BIBLE_HOST = "lostark.bible";
const VISIT_KEY = "page_visits";

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[^.]+\.github\.io$/.test(origin);
  return { "Access-Control-Allow-Origin": allowed ? origin : "null", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store", "Vary": "Origin" };
}
function json(data, status, origin) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" } }); }
function bibleCharacterUrl(region, name) { return `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`; }
function validBibleUrl(value) { try { const u = new URL(value); const p = u.pathname.split("/").filter(Boolean); return u.protocol === "https:" && u.hostname === BIBLE_HOST && p.length >= 3 && p[0].toLowerCase() === "character" && !/roster|siblings|account/i.test(u.pathname); } catch { return false; } }
function parseSearchHtml(html, region, requestedName) {
  const out = [], seen = new Set();
  const re = /href=["'](?:https:\/\/lostark\.bible)?\/character\/([^/"']+)\/([^"'#?]+)["']/gi;
  let m;
  while ((m = re.exec(html || ""))) {
    const r = decodeURIComponent(m[1]).toUpperCase(), n = decodeURIComponent(m[2]);
    if (r !== region) continue;
    const key = `${r}|${n.toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); out.push({ name: n, region: r, url: bibleCharacterUrl(r, n) }); }
  }
  if (!out.length && requestedName) out.push({ name: requestedName, region, url: bibleCharacterUrl(region, requestedName), exact: true });
  return out.slice(0, 20);
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "GET") return json({ ok: false, error: "Only GET requests are supported." }, 405, origin);
    const u = new URL(request.url);
    if (u.pathname === "/visits") {
      try { const visits = Number.parseInt(await env.VISITS.get(VISIT_KEY) || "0", 10) + 1; await env.VISITS.put(VISIT_KEY, String(visits)); return json({ ok: true, visits }, 200, origin); }
      catch { return json({ ok: false, error: "Unable to update visit counter." }, 500, origin); }
    }
    if (u.pathname === "/search") {
      const name = (u.searchParams.get("name") || "").trim();
      const region = (u.searchParams.get("region") || "NA").trim().toUpperCase();
      if (name.length < 2) return json({ ok: true, results: [] }, 200, origin);
      try {
        // lostark.bible does not expose a dependable public search page. Query the site search URL and parse character links when present.
        const response = await fetch(`https://${BIBLE_HOST}/search?query=${encodeURIComponent(name)}`, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0 (compatible; LostArkHideout/1.0)" }, cf: { cacheTtl: 0, cacheEverything: false } });
        const html = await response.text();
        if (!response.ok) return json({ ok: false, error: `Bible search returned HTTP ${response.status}.` }, 502, origin);
        return json({ ok: true, results: parseSearchHtml(html, region, name) }, 200, origin);
      } catch (e) { return json({ ok: false, error: "Unable to reach the Bible search service." }, 502, origin); }
    }
    if (u.pathname !== "/character") return json({ ok: false, error: "Use /character?url=https://lostark.bible/character/REGION/NAME" }, 404, origin);
    const bibleUrl = u.searchParams.get("url");
    if (!bibleUrl) return json({ ok: false, error: "Missing character URL." }, 400, origin);
    if (!validBibleUrl(bibleUrl)) return json({ ok: false, error: "Invalid Bible character URL." }, 400, origin);
    const parts = new URL(bibleUrl).pathname.split("/").filter(Boolean), character = decodeURIComponent(parts.slice(2).join("/")), region = decodeURIComponent(parts[1]);
    try {
      const response = await fetch(bibleUrl, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0 (compatible; LostArkHideout/1.0)" }, cf: { cacheTtl: 0, cacheEverything: false } });
      if (!response.ok) return json({ ok: false, error: `Bible returned HTTP ${response.status}.`, character, region }, 502, origin);
      const html = await response.text();
      return new Response(JSON.stringify({ ok: true, character, region, source: bibleUrl, html }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    } catch { return json({ ok: false, error: "Unable to retrieve the Bible character page.", character, region }, 502, origin); }
  }
};
