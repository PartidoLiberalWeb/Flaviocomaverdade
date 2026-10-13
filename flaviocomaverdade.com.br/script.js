/* ---------- Cards da verdade: esteiras que andam sozinhas e filtro por tema ----------
   Abrir, mandar, baixar e copiar ficam na janela unica (home/midia.js). */
(function () {
  var VELOCIDADE = 40;
  var rows = document.querySelectorAll(".vg-esteira");
  if (!rows.length) return;

  var todos = [];
  rows.forEach(function (r) {
    Array.prototype.forEach.call(
      r.querySelectorAll(".vg-card"),
      function (c) {
        todos.push(c.cloneNode(true));
      }
    );
  });

  var reduzido = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var arrastou = false;

  function esteira(box) {
    var tr = box.querySelector(".vg-trilho");
    var dir = Number(box.getAttribute("data-dir")) || 1;
    var originais = Array.prototype.slice.call(tr.children);

    box.addEventListener("click", function (e) {
      var c = e.target.closest(".vg-card");
      if (c && arrastou) e.preventDefault();
    });

    if (reduzido || !tr.animate) {
      box.classList.add("parada");
      box.__pular = function (sentido) {
        box.scrollBy({
          left: sentido * Math.min(window.innerWidth * 0.7, 720),
          behavior: "smooth"
        });
      };
      return;
    }

    var anim = null;
    var visivel = true;
    var segurando = false;
    var emCima = false;
    var retomar = 0;

    function copiar(vezes) {
      tr.innerHTML = "";
      for (var k = 0; k < vezes; k++) {
        originais.forEach(function (o) {
          var n = o.cloneNode(true);
          if (k > 0) {
            n.setAttribute("aria-hidden", "true");
            n.setAttribute("tabindex", "-1");
            var img = n.querySelector("img");
            if (img) img.alt = "";
          }
          tr.appendChild(n);
        });
      }
    }

    function montar() {
      var tempo = anim
        ? Number(anim.currentTime || 0) /
          Number(anim.effect.getTiming().duration || 1)
        : 0;

      if (anim) anim.cancel();
      copiar(1);

      var um = tr.scrollWidth;
      if (!um) return;

      var reps = Math.max(1, Math.ceil(window.innerWidth / um) + 1);
      copiar(reps * 2);

      var duracao = Math.max(
        10000,
        (tr.scrollWidth / 2 / VELOCIDADE) * 1000
      );

      var quadros = dir === 1
        ? [
            { transform: "translate3d(0,0,0)" },
            { transform: "translate3d(-50%,0,0)" }
          ]
        : [
            { transform: "translate3d(-50%,0,0)" },
            { transform: "translate3d(0,0,0)" }
          ];

      anim = tr.animate(quadros, {
        duration: duracao,
        iterations: Infinity,
        easing: "linear"
      });

      anim.currentTime = tempo * duracao;

      if (!visivel || segurando || emCima) anim.pause();
    }

    montar();
    box.__montar = montar;

    function tocar() {
      if (anim && visivel && !emCima && !segurando) anim.play();
    }

    box.__pular = function (sentido) {
      if (!anim) return;

      var dur = Number(anim.effect.getTiming().duration);
      var metade = tr.scrollWidth / 2;
      var passo = Math.min(window.innerWidth * 0.7, 720);
      var delta = (-sentido * passo / metade) * dur * (dir === 1 ? -1 : 1);
      var de = Number(anim.currentTime || 0);
      var ini = null;

      clearTimeout(retomar);
      segurando = true;
      anim.pause();

      function quadro(t) {
        if (ini === null) ini = t;

        var p = Math.min(1, (t - ini) / 420);
        var e = 1 - Math.pow(1 - p, 3);
        var v = (de + delta * e) % dur;

        if (v < 0) v += dur;
        anim.currentTime = v;

        if (p < 1) {
          requestAnimationFrame(quadro);
        } else {
          segurando = false;
          retomar = setTimeout(tocar, 1800);
        }
      }

      requestAnimationFrame(quadro);
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visivel = !!en[0].isIntersecting;
        if (visivel) tocar();
        else if (anim) anim.pause();
      }).observe(box);
    }

    box.addEventListener("mouseenter", function () {
      emCima = true;
      if (anim) anim.pause();
    });

    box.addEventListener("mouseleave", function () {
      emCima = false;
      tocar();
    });

    var larg = window.innerWidth;

    window.addEventListener("resize", function () {
      if (Math.abs(window.innerWidth - larg) > 40) {
        larg = window.innerWidth;
        montar();
      }
    });

    var x0 = 0;
    var t0 = 0;
    var id = -1;
    var mexeu = false;

    box.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!anim) return;

      segurando = true;
      mexeu = false;
      arrastou = false;
      clearTimeout(retomar);
      anim.pause();

      x0 = e.clientX;
      t0 = Number(anim.currentTime || 0);
      id = e.pointerId;
    });

    box.addEventListener("pointermove", function (e) {
      if (!segurando || e.pointerId !== id) return;

      var dx = e.clientX - x0;

      if (Math.abs(dx) > 6) {
        mexeu = true;
        arrastou = true;
        try {
          box.setPointerCapture(id);
        } catch (x) {}
      }

      if (!mexeu) return;

      var dur = Number(anim.effect.getTiming().duration);
      var metade = tr.scrollWidth / 2;
      var delta = (dx / metade) * dur * (dir === 1 ? -1 : 1);
      var t = (t0 + delta) % dur;

      if (t < 0) t += dur;
      anim.currentTime = t;
    });

    function soltou() {
      if (!segurando) return;

      segurando = false;

      retomar = setTimeout(function () {
        arrastou = false;
        tocar();
      }, mexeu ? 1200 : 0);

      if (!mexeu) {
        arrastou = false;
        tocar();
      }
    }

    box.addEventListener("pointerup", soltou);
    box.addEventListener("pointercancel", soltou);
  }

  rows.forEach(esteira);

  var faixaSetas = document.querySelector(".vd-gal__rows");
  var setas = [];

  if (faixaSetas) {
    [
      [-1, "‹", "Cards anteriores", "ant"],
      [1, "›", "Próximos cards", "prox"]
    ].forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "vd-seta vd-seta--" + s[3];
      b.setAttribute("aria-label", s[2]);
      b.textContent = s[1];

      b.addEventListener("click", function () {
        rows.forEach(function (r) {
          if (r.__pular && !r.hidden) r.__pular(s[0]);
        });
      });

      faixaSetas.appendChild(b);
      setas.push(b);
    });
  }

  var nav = document.querySelector(".vg-grupos");
  var grade = document.getElementById("vg-grade");
  var faixa = document.querySelector(".vd-gal__rows");

  if (!nav || !grade || !faixa) return;

  nav.hidden = false;

  function filtra(g) {
    Array.prototype.forEach.call(
      nav.querySelectorAll("button"),
      function (b) {
        var on = (b.getAttribute("data-g") || "") === g;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      }
    );

    setas.forEach(function (b) {
      b.hidden = !!g;
    });

    if (!g) {
      grade.hidden = true;
      grade.innerHTML = "";
      rows.forEach(function (r) {
        r.hidden = false;
        if (r.__montar) r.__montar();
      });
      return;
    }

    rows.forEach(function (r) {
      r.hidden = true;
    });

    grade.innerHTML = "";

    todos.forEach(function (c) {
      if (c.getAttribute("data-g") === g) {
        grade.appendChild(c.cloneNode(true));
      }
    });

    grade.hidden = false;
  }

  nav.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-g]");
    if (!b) return;

    filtra(b.getAttribute("data-g") || "");

    try {
      if (window.vdTrack) {
        window.vdTrack(
          "click",
          "cards: " + (b.getAttribute("data-g") || "todos")
        );
      }
    } catch (x) {}
  });
})();

/* ---------- Como mudar um voto: carrossel, bolinhas, copiar e risco animado ---------- */
(function () {
  var tr = document.getElementById("vv-track");
  if (!tr) return;

  var cards = Array.prototype.slice.call(tr.children);
  var dots = Array.prototype.slice.call(document.querySelectorAll("#vv-dots button"));
  var prev = document.getElementById("vv-prev");
  var next = document.getElementById("vv-next");
  var cont = document.getElementById("vv-count");

  var recuo = function () {
    return parseFloat(getComputedStyle(tr).paddingLeft) || 0;
  };

  function max() {
    return tr.scrollWidth - tr.clientWidth;
  }

  function pos(i) {
    return Math.min(max(), Math.max(0, cards[i].offsetLeft - recuo()));
  }

  function atual() {
    if (tr.scrollLeft >= max() - 4) return cards.length - 1;

    var ini = tr.scrollLeft + recuo();
    var best = 0;
    var menor = Infinity;

    cards.forEach(function (c, i) {
      var d = Math.abs(c.offsetLeft - ini);
      if (d < menor) {
        menor = d;
        best = i;
      }
    });

    return best;
  }

  function atualizar() {
    var a = atual();

    dots.forEach(function (d, i) {
      d.setAttribute("aria-selected", i === a ? "true" : "false");
    });

    if (cont) {
      cont.textContent = (a + 1) + " de " + cards.length + " · arraste para o lado →";
    }

    if (prev) prev.disabled = tr.scrollLeft <= 4;
    if (next) next.disabled = tr.scrollLeft >= max() - 4;
  }

  tr.addEventListener("scroll", atualizar, { passive: true });
  window.addEventListener("resize", atualizar);

  dots.forEach(function (d, i) {
    d.addEventListener("click", function () {
      tr.scrollTo({ left: pos(i), behavior: "smooth" });
    });
  });

  function passo(dir) {
    var posicoes = cards.map(function (c, i) {
      return pos(i);
    });

    var at = tr.scrollLeft;
    var alvo;

    if (dir > 0) {
      alvo = posicoes.filter(function (p) {
        return p > at + 8;
      })[0];
    } else {
      alvo = posicoes.slice().reverse().filter(function (p) {
        return p < at - 8;
      })[0];
    }

    tr.scrollTo({
      left: alvo != null ? alvo : (dir > 0 ? max() : 0),
      behavior: "smooth"
    });
  }

  if (prev) prev.addEventListener("click", function () { passo(-1); });
  if (next) next.addEventListener("click", function () { passo(1); });

  atualizar();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("on");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });

    cards.forEach(function (c) {
      io.observe(c);
    });
  } else {
    cards.forEach(function (c) {
      c.classList.add("on");
    });
  }

  tr.addEventListener("click", function (e) {
    var b = e.target.closest(".vv-copy");
    if (!b) return;

    var t = b.getAttribute("data-t");
    var span = b.querySelector("span");

    function ok() {
      span.textContent = "Copiado";
      setTimeout(function () {
        span.textContent = "Copiar";
      }, 1800);

      try {
        (window.dataLayer = window.dataLayer || []).push({
          event: "frase_copiada"
        });
      } catch (x) {}
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok, function () {});
    } else {
      var ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();

      try {
        document.execCommand("copy");
        ok();
      } catch (x) {}

      ta.remove();
    }
  });
})();

/* ---------- vida na pagina: numeros que sobem e blocos que entram ao rolar ---------- */
(function () {
  var reduz = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Array.prototype.forEach.call(
    document.querySelectorAll(".vd-proof b[data-n]"),
    function (el) {
      var alvo = Number(el.getAttribute("data-n"));

      if (!alvo || reduz) {
        el.textContent = alvo || el.textContent;
        return;
      }

      var t0 = null;
      var dur = 1100;
      el.textContent = "0";

      function passo(t) {
        if (t0 === null) t0 = t;

        var p = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);

        el.textContent = String(Math.round(alvo * e));

        if (p < 1) requestAnimationFrame(passo);
      }

      setTimeout(function () {
        requestAnimationFrame(passo);
      }, 700);
    }
  );

  if (reduz || !("IntersectionObserver" in window)) return;

  var alvos = document.querySelectorAll(
    ".vd-pledge__head,.vd-pl,.vd-step,.vd-gal__lead," +
    ".vd-gal__title,.vd-voto__title,.vd-voto__lead," +
    ".vd-index__title,.vd-topic,.vd-band__text,.vd-band__title"
  );

  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px"
  });

  var cont = new Map();

  Array.prototype.forEach.call(alvos, function (el) {
    el.classList.add("vd-rv");

    var pai = el.parentElement;
    var n = cont.get(pai) || 0;

    el.style.transitionDelay = Math.min(n, 5) * 70 + "ms";
    cont.set(pai, n + 1);
    io.observe(el);
  });

  setTimeout(function () {
    Array.prototype.forEach.call(
      document.querySelectorAll(".vd-rv:not(.in)"),
      function (el) {
        var r = el.getBoundingClientRect();

        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add("in");
        }
      }
    );
  }, 400);
})();

/* ---------- Videos: compartilhamento e esteira ---------- */
(function () {
  var SITE = "https://partidoliberalweb.github.io/Flaviocomaverdade/flaviocomaverdade.com.br";

  /* Todos os cards usam a mesma página de compartilhamento com imagens do Drive. */
  var PAGINA_COMPARTILHAMENTO = SITE + "/cards/topico/card.html";
  var TEXTO_COMPARTILHAMENTO = "olha essa informação do flávio " + PAGINA_COMPARTILHAMENTO;

  function aviso(mensagem) {
    var toast = document.querySelector(".vg-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "vg-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = mensagem;
    toast.classList.add("on");

    clearTimeout(toast._temporizador);

    toast._temporizador = setTimeout(function () {
      toast.classList.remove("on");
    }, 3200);
  }

  var IC = {
    zap:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/>' +
      "</svg>",

    share:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M14 4h6v6M20 4l-8 8M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/>' +
      "</svg>",

    down:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>' +
      "</svg>",

    copy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>' +
      "</svg>"
  };

  var box = document.createElement("div");
  box.className = "vm";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Opções de compartilhamento");
  box.hidden = true;
  box.tabIndex = -1;

  box.innerHTML =
    '<div class="vm__box">' +
      '<button class="vm__x" type="button">' +
        "<span>Fechar</span><b aria-hidden=\"true\">×</b>" +
      "</button>" +
      '<div class="vm__midia"></div>' +
      '<div class="vm__acoes" role="group" aria-label="Opções">' +
        '<button class="vm__b vm__b--zap" type="button" data-a="zap">' +
          "<i>" + IC.zap + "</i><span>WhatsApp</span>" +
        "</button>" +
        '<button class="vm__b" type="button" data-a="share">' +
          "<i>" + IC.share + "</i><span>Compartilhar</span>" +
        "</button>" +
        '<a class="vm__b" data-a="down" download>' +
          "<i>" + IC.down + "</i><span>Download</span>" +
        "</a>" +
        '<button class="vm__b" type="button" data-a="copy">' +
          "<i>" + IC.copy + "</i><span>Copiar link</span>" +
        "</button>" +
      "</div>" +
    "</div>";

  var midia = box.querySelector(".vm__midia");
  var baixar = box.querySelector('[data-a="down"]');
  var atual = null;
  var voltarFoco = null;

  function marca(acao) {
    if (!atual) return;

    try {
      (window.dataLayer = window.dataLayer || []).push({
        event: atual.tipo === "video" ? "video_verdade" : "card_verdade",
        acao: acao,
        item: atual.id
      });
    } catch (e) {}

    try {
      if (window.vdTrack) {
        window.vdTrack(
          atual.tipo === "video" ? "video_share" : "compartilhar",
          "/" + atual.tipo + "s/" + atual.id + " (" + acao + ")"
        );
      }
    } catch (e) {}
  }

  function dados(tipo, id, titulo, fv) {
    if (tipo === "video") {
      var versao = fv ? "?v=" + encodeURIComponent(fv) : "";

      return {
        tipo: "video",
        id: id,
        titulo: titulo,
        link: SITE + "/videos/" + id,
        arquivo: "/assets/verdade/videos/" + id + ".mp4" + versao,
        leve: "/assets/verdade/videos/" + id + "-share.mp4" + versao,
        nome: "flavio-com-a-verdade-" + id + ".mp4",
        mime: "video/mp4",
        capa: "/assets/verdade/videos/" + id + ".jpg"
      };
    }

    var imagemCard = "/assets/verdade/cards/" + id + ".jpg";

    return {
      tipo: "card",
      id: id,
      titulo: titulo,
      link: SITE + "/cards/" + id,
      arquivo: imagemCard,
      leve: imagemCard,
      nome: "imagem-compartilhamento.jpg",
      mime: "image/jpeg"
    };
  }

  function abrir(tipo, id, titulo, capa, proporcao, fv) {
    if (!box.parentNode) {
      document.body.appendChild(box);
    }

    atual = dados(tipo, id, titulo || "", fv);

    if (capa) atual.capa = capa;

    midia.innerHTML = "";

    if (tipo === "video") {
      var video = document.createElement("video");
      video.className = "vm__video";
      video.controls = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "metadata";
      video.poster = atual.capa;
      video.src = atual.leve;
      video.setAttribute("aria-label", atual.titulo);

      if (proporcao && /^\d+\/\d+$/.test(proporcao)) {
        video.classList.add("vm__video--deitado");
        video.style.aspectRatio = proporcao.replace("/", " / ");
      }

      midia.appendChild(video);

      var promessa = video.play();
      if (promessa && promessa.catch) promessa.catch(function () {});
    } else {
      var imagem = document.createElement("img");
      imagem.className = "vm__img";
      imagem.src = atual.arquivo;
      imagem.alt = atual.titulo;
      imagem.decoding = "async";
      midia.appendChild(imagem);
    }

    voltarFoco = document.activeElement;
    box.hidden = false;
    document.documentElement.classList.add("vm-aberta");
    box.focus();
    marca("abrir");
  }

  function fechar() {
    if (box.hidden) return;

    var video = midia.querySelector("video");

    if (video) {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch (e) {}
    }

    midia.innerHTML = "";
    box.hidden = true;
    document.documentElement.classList.remove("vm-aberta");

    if (voltarFoco && voltarFoco.focus) {
      try {
        voltarFoco.focus();
      } catch (e) {}
    }

    atual = null;
  }

  function texto() {
    return TEXTO_COMPARTILHAMENTO;
  }

  function abrirPaginaCompartilhamento() {
    /* A chamada ocorre diretamente no clique do usuário, evitando bloqueio de pop-up. */
    var janela = window.open(PAGINA_COMPARTILHAMENTO, "_blank");

    if (!janela) {
      aviso("Permita pop-ups para abrir a página de compartilhamento.");
      return;
    }

    try {
      janela.opener = null;
    } catch (e) {}
  }

  function zap() {
    if (!atual) return;

    marca("whatsapp");

    window.open(
      "https://wa.me/?text=" + encodeURIComponent(texto()),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function copiar() {
    if (!atual) return;

    var url = TEXTO_COMPARTILHAMENTO;

    function sucesso() {
      aviso("Link copiado.");
    }

    function alternativa() {
      var campo = document.createElement("textarea");
      campo.value = url;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();

      try {
        document.execCommand("copy");
        sucesso();
      } catch (e) {
        aviso("Copie este link: " + url);
      }

      campo.remove();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(sucesso, alternativa);
    } else {
      alternativa();
    }
  }

  function compartilhar() {
    if (!atual) return;

    marca("compartilhar");

    if (atual.tipo === "card") {
      abrirPaginaCompartilhamento();
      return;
    }

    if (
      navigator.canShare &&
      window.fetch &&
      window.File &&
      navigator.share
    ) {
      fetch(atual.leve)
        .then(function (resposta) {
          if (!resposta.ok) throw new Error("Vídeo não encontrado.");
          return resposta.blob();
        })
        .then(function (blob) {
          var arquivo = new File(
            [blob],
            atual.nome,
            { type: blob.type || atual.mime }
          );

          if (!navigator.canShare({ files: [arquivo] })) {
            throw new Error("Compartilhamento indisponível.");
          }

          return navigator.share({
            files: [arquivo],
            text: texto()
          });
        })
        .catch(function (erro) {
          if (erro && erro.name === "AbortError") return;
          aviso("Não foi possível compartilhar o vídeo neste navegador.");
        });

      return;
    }

    aviso("Este navegador não permite compartilhar arquivos diretamente.");
  }

  box.addEventListener("click", function (evento) {
    if (evento.target === box) return fechar();
    if (evento.target.closest(".vm__x")) return fechar();

    var botao = evento.target.closest("[data-a]");
    if (!botao || !atual) return;

    var acao = botao.getAttribute("data-a");

    if (acao === "zap") {
      zap();
    } else if (acao === "share") {
      compartilhar();
    } else if (acao === "copy") {
      marca("copiar");
      copiar();
    } else if (acao === "down") {
      marca("baixar");
    }
  });

  document.addEventListener("keydown", function (evento) {
    if (box.hidden) return;

    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
    }

    if (evento.key === "Tab") {
      var focaveis = box.querySelectorAll(
        "button, a[href], video"
      );

      if (!focaveis.length) return;

      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];

      if (
        evento.shiftKey &&
        document.activeElement === primeiro
      ) {
        evento.preventDefault();
        ultimo.focus();
      } else if (
        !evento.shiftKey &&
        document.activeElement === ultimo
      ) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  document.addEventListener("click", function (evento) {
    if (
      evento.defaultPrevented ||
      evento.button ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey
    ) {
      return;
    }

    var link = evento.target.closest &&
      evento.target.closest("a[href]");

    if (!link || link.closest(".vm")) return;

    var href = link.getAttribute("href") || "";
    var resultado;

    if (
      (resultado = /^\/cards\/([a-z0-9-]+)$/.exec(href)) &&
      (link.querySelector("img") || link.hasAttribute("data-card"))
    ) {
      var imagem = link.querySelector("img");

      evento.preventDefault();

      abrir(
        "card",
        resultado[1],
        link.getAttribute("data-alt") ||
          (imagem && imagem.alt) ||
          link.textContent.trim()
      );
    } else if (
      (resultado = /^\/videos\/([a-z0-9-]+)$/.exec(href)) &&
      link.closest(".vdv-card,[data-video]")
    ) {
      var cartao = link.closest(".vdv-card,[data-video]");
      var titulo = cartao.getAttribute("data-t") ||
        (cartao.querySelector(".vdv-t") || link).textContent.trim();

      var capaImagem = cartao.querySelector("img");
      var capa = capaImagem
        ? (capaImagem.getAttribute("src") || "").replace("-mini.webp", ".jpg")
        : "";

      evento.preventDefault();

      abrir(
        "video",
        resultado[1],
        titulo,
        capa,
        cartao.getAttribute("data-ar"),
        cartao.getAttribute("data-fv")
      );
    }
  });

  window.vdMidia = {
    abrir: abrir,
    fechar: fechar,
    aviso: aviso
  };
})();

/* ---------- Página /cards/topico/: conteúdo aleatório e estilo padrão ---------- */
(function () {
  var caminho = window.location.pathname.replace(/\/+$/, "");
  if (!/\/cards\/topico$/.test(caminho)) return;

  var IMAGENS_DRIVE = [
    "https://drive.google.com/uc?export=view&id=1iHPOuMjpP8ZNK0QKaxgQr34whkGMu4yO"
  ];
  var TEXTOS = [
    "Flávio acredita que o Brasil pode avançar com mais liberdade, responsabilidade e oportunidades para quem trabalha.",
    "Uma conversa sobre o Brasil precisa de informação, coragem para debater e compromisso com o futuro.",
    "A participação de cada cidadão fortalece o debate público e ajuda a construir um país com mais oportunidades.",
    "Ideias, transparência e participação são importantes para que os brasileiros acompanhem os assuntos que impactam suas vidas.",
    "Conhecer diferentes informações e refletir sobre elas é parte essencial de uma sociedade livre."
  ];
  function sorteio(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  function montar() {
    if (!document.body) return;
    var antigo = document.getElementById("topico-flavio");
    if (antigo) antigo.remove();
    var texto = sorteio(TEXTOS);
    var imagemUrl = sorteio(IMAGENS_DRIVE);
    var estilo = document.getElementById("topico-flavio-css");
    if (!estilo) {
      estilo = document.createElement("style");
      estilo.id = "topico-flavio-css";
      estilo.textContent = `
        #topico-flavio{box-sizing:border-box;max-width:1100px;margin:clamp(24px,6vw,76px) auto;padding:clamp(18px,4vw,42px);font-family:inherit;color:#172033}
        #topico-flavio .tf__cabecalho{font-size:clamp(12px,1.5vw,14px);font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#c5222a;margin:0 0 12px}
        #topico-flavio .tf__grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.9fr);gap:clamp(22px,4vw,48px);align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:clamp(20px,4vw,42px);box-shadow:0 16px 45px rgba(15,23,42,.10)}
        #topico-flavio h1{font-size:clamp(28px,4vw,44px);line-height:1.12;margin:0 0 18px;color:#111827}
        #topico-flavio .tf__texto{font-size:clamp(17px,2vw,20px);line-height:1.75;margin:0;color:#374151}
        #topico-flavio .tf__imagem{display:block;width:100%;max-height:520px;object-fit:contain;border-radius:14px;background:#f3f4f6;min-height:220px}
        #topico-flavio .tf__rodape{margin:18px 0 0;color:#6b7280;font-size:13px}
        @media(max-width:700px){#topico-flavio .tf__grade{grid-template-columns:1fr}#topico-flavio .tf__imagem{max-height:420px}}
      `;
      document.head.appendChild(estilo);
    }
    var secao = document.createElement("main");
    secao.id = "topico-flavio";
    secao.innerHTML = '<p class="tf__cabecalho">Flávio com a Verdade</p><div class="tf__grade"><section><h1>Uma informação para refletir</h1><p class="tf__texto"></p><p class="tf__rodape">Leia, reflita e compartilhe informação.</p></section><img class="tf__imagem" alt="Imagem compartilhada do Flávio" loading="eager"></div>';
    secao.querySelector(".tf__texto").textContent = texto;
    secao.querySelector(".tf__imagem").src = imagemUrl;
    document.body.appendChild(secao);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar, { once: true });
  else montar();
})();
