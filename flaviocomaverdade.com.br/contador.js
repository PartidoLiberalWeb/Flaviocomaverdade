/*
 * Contadores próprios do site.
 * Configure API_URL com a URL publicada do Cloudflare Worker.
 * A API/DB não é hospedada pelo GitHub Pages.
 */
(function () {
  "use strict";
  var API_URL = "https://contador-api-site.portalverdade13.workers.dev/";
  if (!API_URL || API_URL.indexOf("https://contador-api-site.portalverdade13.workers.dev/") === 0) {
    console.warn("Contadores: configure API_URL em contador.js após publicar o Worker.");
    return;
  }

  function enviar(evento) {
    try {
      fetch(API_URL.replace(/\/$/, "") + "/track", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: evento,
          path: location.pathname,
          referrer: document.referrer || ""
        }),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  // Conta uma visualização por carregamento de página.
  enviar("page_view");

  // Detecta cliques em links do WhatsApp e botões de copiar link.
  document.addEventListener("click", function (event) {
    var el = event.target && event.target.closest
      ? event.target.closest("a,button,[role='button']")
      : null;
    if (!el) return;

    var href = (el.getAttribute("href") || "").toLowerCase();
    var label = [
      el.innerText || "",
      el.getAttribute("aria-label") || "",
      el.getAttribute("title") || "",
      el.getAttribute("data-action") || "",
      el.getAttribute("data-track") || "",
      el.getAttribute("data-testid") || ""
    ].join(" ").toLowerCase();

    if (/wa\.me|api\.whatsapp\.com|whatsapp\.com\/send/.test(href) ||
        /whatsapp|bolsozap|click_bolsozap|share_whatsapp/.test(label)) {
      enviar("share_whatsapp");
      return;
    }

    if (/copiar\s*(link|url)|copy\s*(link|url)|copy-link|copiar-link/.test(label) ||
        el.matches("[data-copy-link], [data-action='copy-link'], [data-track*='copy' i], [data-testid*='copy' i]")) {
      enviar("copy_link");
    }
  }, true);
})();
