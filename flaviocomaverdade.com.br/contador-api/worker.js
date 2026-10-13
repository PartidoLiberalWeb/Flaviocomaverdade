/*
 * Cloudflare Worker para os contadores do site.
 * Crie um banco D1 e vincule-o como binding COUNTERS_DB.
 * Configure CORS_ORIGIN com a origem publicada do seu site.
 */
const corsHeaders = (origin, allowed) => ({
  "Access-Control-Allow-Origin": origin === allowed ? allowed : allowed,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = env.CORS_ORIGIN || "*";
    const headers = corsHeaders(origin, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (allowed !== "*" && origin && origin !== allowed) {
      return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
    }
    if (!env.COUNTERS_DB) {
      return new Response(JSON.stringify({ error: "D1 binding COUNTERS_DB não configurado" }), { status: 500, headers });
    }

    if (url.pathname === "/track" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch (_) {
        return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
      }
      const allowedEvents = ["page_view", "share_whatsapp", "copy_link"];
      if (!allowedEvents.includes(body.event)) {
        return new Response(JSON.stringify({ error: "invalid_event" }), { status: 400, headers });
      }
      const path = typeof body.path === "string" ? body.path.slice(0, 500) : "/";
      const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 1000) : "";
      await env.COUNTERS_DB.prepare(
        "INSERT INTO events (event, path, referrer, created_at) VALUES (?, ?, ?, datetime('now'))"
      ).bind(body.event, path, referrer).run();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const rows = await env.COUNTERS_DB.prepare(
        "SELECT event, COUNT(*) AS total FROM events GROUP BY event"
      ).all();
      const counts = { visitas: 0, compartilhamentos_whatsapp: 0, copias_link: 0 };
      for (const row of (rows.results || [])) {
        if (row.event === "page_view") counts.visitas = row.total;
        if (row.event === "share_whatsapp") counts.compartilhamentos_whatsapp = row.total;
        if (row.event === "copy_link") counts.copias_link = row.total;
      }
      return new Response(JSON.stringify(counts), { status: 200, headers });
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
  }
};
