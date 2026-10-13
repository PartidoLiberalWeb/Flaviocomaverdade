javascript
/*
 * Contadores próprios do site.
 * Configure API_URL com a URL publicada do Cloudflare Worker.
 * A API/DB não é hospedada pelo GitHub Pages.
 */
(function () {
  "use strict";

  var API_URL = "https://contador-api-site.portalverdade13.workers.dev";

  if (!API_URL) {
    console.warn("Contadores: API_URL não configurada.");
    return;
  }

  function enviar(evento) {
    try {
      fetch(API_URL.replace(/\/$/, "") + "/track", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: evento,
          path: location.pathname,
          referrer: document.referrer || ""
        }),
        keepalive: true
      }).then(function (resposta) {
        if (!resposta.ok) {
          console.error(
            "Erro ao registar contador:",
            evento,
            resposta.status
          );
        }
      }).catch(function (erro) {
        console.error("Falha ao enviar contador:", erro);
      });
    } catch (erro) {
      console.error("Erro no contador:", erro);
    }
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

    if (
      /wa\.me|api\.whatsapp\.com|whatsapp\.com\/send/.test(href) ||
      /whatsapp|bolsozap|click_bolsozap|share_whatsapp/.test(label)
    ) {
      enviar("share_whatsapp");
      return;
    }

    if (
      /copiar\s*(link|url)|copy\s*(link|url)|copy-link|copiar-link/.test(label) ||
      el.matches(
        "[data-copy-link], [data-action='copy-link], [data-track*='copy' i], [data-testid*='copy' i]"
      )
    ) {
      enviar("copy_link");
    }
  }, true);
})();

