/* ---------- Cards da verdade: esteiras que andam sozinhas e filtro por tema ----------
   Abrir, mandar, baixar e copiar o link ficam na janela unica (home/midia.js). */
(function () {
  var VELOCIDADE = 40;                                   // px por segundo (igual ao Muda Nordeste)
  var rows = document.querySelectorAll(".vg-esteira");
  if (!rows.length) return;

  // cards originais (ordem do DOM), guardados antes de as esteiras criarem as copias do loop
  var todos = [];
  rows.forEach(function (r) { Array.prototype.forEach.call(r.querySelectorAll(".vg-card"), function (c) { todos.push(c.cloneNode(true)); }); });

  var reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var arrastou = false;

  function esteira(box) {
    var tr = box.querySelector(".vg-trilho");
    var dir = Number(box.getAttribute("data-dir")) || 1;       // 1 = para a esquerda, -1 = para a direita
    var originais = Array.prototype.slice.call(tr.children);
    box.addEventListener("click", function (e) {
      var c = e.target.closest(".vg-card");
      if (c && arrastou) e.preventDefault();      // arrastar a esteira nao abre o card
    });
    if (reduzido || !tr.animate) {                                          // sem animacao: faixa normal de rolar
      box.classList.add("parada");
      box.__pular = function (sentido) { box.scrollBy({ left: sentido * Math.min(window.innerWidth * 0.7, 720), behavior: "smooth" }); };
      return;
    }

    var anim = null, visivel = true, segurando = false, emCima = false, retomar = 0;
    function copiar(vezes) {
      tr.innerHTML = "";
      for (var k = 0; k < vezes; k++) originais.forEach(function (o) {
        var n = o.cloneNode(true);
        if (k > 0) { n.setAttribute("aria-hidden", "true"); n.setAttribute("tabindex", "-1"); n.querySelector("img").alt = ""; }
        tr.appendChild(n);
      });
    }
    function montar() {
      var tempo = anim ? Number(anim.currentTime || 0) / Number(anim.effect.getTiming().duration || 1) : 0;
      if (anim) anim.cancel();
      copiar(1);
      var um = tr.scrollWidth;                                   // largura de uma serie de cards
      if (!um) return;                                           // esteira escondida pelo filtro: monta quando voltar
      var reps = Math.max(1, Math.ceil(window.innerWidth / um) + 1);
      copiar(reps * 2);                                          // duas metades iguais: andar -50% = uma volta completa
      var duracao = Math.max(10000, (tr.scrollWidth / 2 / VELOCIDADE) * 1000);
      var quadros = dir === 1
        ? [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(-50%,0,0)" }]
        : [{ transform: "translate3d(-50%,0,0)" }, { transform: "translate3d(0,0,0)" }];
      anim = tr.animate(quadros, { duration: duracao, iterations: Infinity, easing: "linear" });
      anim.currentTime = tempo * duracao;
      if (!visivel || segurando || emCima) anim.pause();
    }
    montar();
    box.__montar = montar;
    function tocar() { if (anim && visivel && !emCima && !segurando) anim.play(); }
    // setas: adianta (+1) ou volta (-1) quase uma tela, com um deslize curto; depois a esteira segue sozinha
    box.__pular = function (sentido) {
      if (!anim) return;
      var dur = Number(anim.effect.getTiming().duration), metade = tr.scrollWidth / 2;
      var passo = Math.min(window.innerWidth * 0.7, 720);
      var delta = (-sentido * passo / metade) * dur * (dir === 1 ? -1 : 1);
      var de = Number(anim.currentTime || 0), ini = null;
      clearTimeout(retomar); segurando = true; anim.pause();
      function quadro(t) {
        if (ini === null) ini = t;
        var p = Math.min(1, (t - ini) / 420), e = 1 - Math.pow(1 - p, 3);
        var v = (de + delta * e) % dur; if (v < 0) v += dur;
        anim.currentTime = v;
        if (p < 1) requestAnimationFrame(quadro);
        else { segurando = false; retomar = setTimeout(tocar, 1800); }
      }
      requestAnimationFrame(quadro);
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visivel = !!en[0].isIntersecting; if (visivel) tocar(); else if (anim) anim.pause(); }).observe(box);
    }
    box.addEventListener("mouseenter", function () { emCima = true; if (anim) anim.pause(); });
    box.addEventListener("mouseleave", function () { emCima = false; tocar(); });
    var larg = window.innerWidth;
    window.addEventListener("resize", function () { if (Math.abs(window.innerWidth - larg) > 40) { larg = window.innerWidth; montar(); } });

    // arrastar com o dedo ou o mouse (a esteira acompanha e depois volta a andar)
    var x0 = 0, t0 = 0, id = -1, mexeu = false;
    box.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!anim) return;
      segurando = true; mexeu = false; arrastou = false; clearTimeout(retomar);
      anim.pause();
      x0 = e.clientX; t0 = Number(anim.currentTime || 0); id = e.pointerId;
    });
    box.addEventListener("pointermove", function (e) {
      if (!segurando || e.pointerId !== id) return;
      var dx = e.clientX - x0;
      if (Math.abs(dx) > 6) { mexeu = true; arrastou = true; try { box.setPointerCapture(id); } catch (x) {} }
      if (!mexeu) return;
      var dur = Number(anim.effect.getTiming().duration);
      var metade = tr.scrollWidth / 2;
      var delta = (dx / metade) * dur * (dir === 1 ? -1 : 1);
      var t = (t0 + delta) % dur; if (t < 0) t += dur;
      anim.currentTime = t;
    });
    function soltou() {
      if (!segurando) return;
      segurando = false;
      retomar = setTimeout(function () { arrastou = false; tocar(); }, mexeu ? 1200 : 0);
      if (!mexeu) { arrastou = false; tocar(); }
    }
    box.addEventListener("pointerup", soltou);
    box.addEventListener("pointercancel", soltou);
  }
  rows.forEach(esteira);

  // ---------- setas nas laterais (anterior / proximo): movem as duas esteiras juntas ----------
  var faixaSetas = document.querySelector(".vd-gal__rows"), setas = [];
  if (faixaSetas) [[-1, "‹", "Cards anteriores", "ant"], [1, "›", "Próximos cards", "prox"]].forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "vd-seta vd-seta--" + s[3]; b.setAttribute("aria-label", s[2]); b.textContent = s[1];
    b.addEventListener("click", function () { rows.forEach(function (r) { if (r.__pular && !r.hidden) r.__pular(s[0]); }); });
    faixaSetas.appendChild(b); setas.push(b);
  });

  // ---------- filtro por tema (Saude, Seguranca, Educacao...): mostra so as pecas do tema, paradas e lado a lado ----------
  var nav = document.querySelector(".vg-grupos"), grade = document.getElementById("vg-grade"), faixa = document.querySelector(".vd-gal__rows");
  if (!nav || !grade || !faixa) return;
  nav.hidden = false;
  function filtra(g) {
    Array.prototype.forEach.call(nav.querySelectorAll("button"), function (b) {
      var on = (b.getAttribute("data-g") || "") === g;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    setas.forEach(function (b) { b.hidden = !!g; });         // com um tema escolhido as pecas ficam paradas: sem setas
    if (!g) {
      grade.hidden = true; grade.innerHTML = "";
      rows.forEach(function (r) { r.hidden = false; if (r.__montar) r.__montar(); });
      return;
    }
    rows.forEach(function (r) { r.hidden = true; });
    grade.innerHTML = "";
    todos.forEach(function (c) { if (c.getAttribute("data-g") === g) grade.appendChild(c.cloneNode(true)); });
    grade.hidden = false;
  }
  nav.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-g]"); if (!b) return;
    filtra(b.getAttribute("data-g") || "");
    try { if (window.vdTrack) window.vdTrack("click", "cards: " + (b.getAttribute("data-g") || "todos")); } catch (x) {}
  });
})();

/* ---------- Como mudar um voto: carrossel, bolinhas, copiar e risco animado ---------- */
(function () {
  var tr = document.getElementById("vv-track");
  if (!tr) return;
  var cards = Array.prototype.slice.call(tr.children);
  var dots = Array.prototype.slice.call(document.querySelectorAll("#vv-dots button"));
  var prev = document.getElementById("vv-prev"), next = document.getElementById("vv-next"), cont = document.getElementById("vv-count");
  var recuo = function () { return parseFloat(getComputedStyle(tr).paddingLeft) || 0; };
  function max() { return tr.scrollWidth - tr.clientWidth; }
  function pos(i) { return Math.min(max(), Math.max(0, cards[i].offsetLeft - recuo())); }
  function atual() {
    if (tr.scrollLeft >= max() - 4) return cards.length - 1;
    var ini = tr.scrollLeft + recuo(), best = 0, menor = Infinity;
    cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - ini); if (d < menor) { menor = d; best = i; } });
    return best;
  }
  function atualizar() {
    var a = atual();
    dots.forEach(function (d, i) { d.setAttribute("aria-selected", i === a ? "true" : "false"); });
    if (cont) cont.textContent = (a + 1) + " de " + cards.length + " · arraste para o lado →";
    if (prev) prev.disabled = tr.scrollLeft <= 4;
    if (next) next.disabled = tr.scrollLeft >= max() - 4;
  }
  tr.addEventListener("scroll", atualizar, { passive: true });
  window.addEventListener("resize", atualizar);
  dots.forEach(function (d, i) { d.addEventListener("click", function () { tr.scrollTo({ left: pos(i), behavior: "smooth" }); }); });
  function passo(dir) {
    var posicoes = cards.map(function (c, i) { return pos(i); }), at = tr.scrollLeft, alvo;
    if (dir > 0) alvo = posicoes.filter(function (p) { return p > at + 8; })[0];
    else alvo = posicoes.slice().reverse().filter(function (p) { return p < at - 8; })[0];
    tr.scrollTo({ left: alvo != null ? alvo : (dir > 0 ? max() : 0), behavior: "smooth" });
  }
  if (prev) prev.addEventListener("click", function () { passo(-1); });
  if (next) next.addEventListener("click", function () { passo(1); });
  atualizar();

  // a frase errada e riscada quando o card aparece
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
  } else cards.forEach(function (c) { c.classList.add("on"); });

  // copiar a pergunta
  tr.addEventListener("click", function (e) {
    var b = e.target.closest(".vv-copy"); if (!b) return;
    var t = b.getAttribute("data-t"), span = b.querySelector("span");
    function ok() { span.textContent = "Copiado"; setTimeout(function () { span.textContent = "Copiar"; }, 1800); try { (window.dataLayer = window.dataLayer || []).push({ event: "frase_copiada" }); } catch (x) {} }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () {});
    else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (x) {} ta.remove(); }
  });
})();

/* ---------- vida na pagina: numeros que sobem e blocos que entram ao rolar ---------- */
(function () {
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // contador dos numeros do hero
  Array.prototype.forEach.call(document.querySelectorAll(".vd-proof b[data-n]"), function (el) {
    var alvo = Number(el.getAttribute("data-n"));
    if (!alvo || reduz) { el.textContent = alvo || el.textContent; return; }
    var t0 = null, dur = 1100;
    el.textContent = "0";
    function passo(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(alvo * e));
      if (p < 1) requestAnimationFrame(passo);
    }
    setTimeout(function () { requestAnimationFrame(passo); }, 700);
  });

  // blocos entram com um leve subir quando aparecem na tela
  if (reduz || !("IntersectionObserver" in window)) return;
  var alvos = document.querySelectorAll(".vd-pledge__head,.vd-pl,.vd-step,.vd-gal__lead,.vd-gal__title,.vd-voto__title,.vd-voto__lead,.vd-index__title,.vd-topic,.vd-band__text,.vd-band__title");
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  var cont = new Map();
  Array.prototype.forEach.call(alvos, function (el) {
    el.classList.add("vd-rv");
    var pai = el.parentElement, n = cont.get(pai) || 0;       // escalona irmaos (cartoes lado a lado)
    el.style.transitionDelay = Math.min(n, 5) * 70 + "ms";
    cont.set(pai, n + 1);
    io.observe(el);
  });
  // se algo ja estiver visivel quando o JS roda, nao fica escondido
  setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll(".vd-rv:not(.in)"), function (el) {
    var r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
  }); }, 400);
})();

(function () {
  var SITE = "https://flaviocomaverdade.com.br";
  var toast = document.createElement("div");
  toast.className = "vg-toast"; toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  var tt;
  function aviso(t) { toast.textContent = t; toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("on"); }, 3600); }
  function marca(id, acao) { try { (window.dataLayer = window.dataLayer || []).push({ event: "video_verdade", acao: acao, video: id }); } catch (e) {} }

  function zap(msg, id) {
    window.open("https://wa.me/?text=" + encodeURIComponent(msg + "\n" + SITE + "/videos/" + id), "_blank", "noopener");
    aviso("Abrindo o WhatsApp… escolha o contato ou grupo.");
  }
  function compartilhar(id, titulo, fv) {
    var msg = titulo + "\n\nA verdade sobre Flávio Bolsonaro: " + SITE + "/videos/" + id;
    marca(id, "compartilhar");
    if (navigator.canShare && window.fetch && window.File) {
      aviso("Preparando o vídeo…");
      fetch("/assets/verdade/videos/" + id + "-share.mp4" + (fv ? "?v=" + encodeURIComponent(fv) : "")).then(function (r) { return r.blob(); }).then(function (b) {
        var f = new File([b], "flavio-com-a-verdade-" + id + ".mp4", { type: "video/mp4" });
        if (navigator.canShare({ files: [f] })) return navigator.share({ files: [f], text: msg }).then(function () { return true; });
        return false;
      }).catch(function (e) { return !!(e && e.name === "AbortError"); }).then(function (feito) { if (!feito) zap(msg, id); });
      return;
    }
    if (navigator.share) { navigator.share({ title: titulo, text: msg }).catch(function () {}); return; }
    zap(msg, id);
  }
  document.addEventListener("click", function (e) {
    var s = e.target.closest(".vdv-share");
    if (s) { e.preventDefault(); compartilhar(s.getAttribute("data-id"), s.getAttribute("data-t"), s.getAttribute("data-fv")); return; }
    var d = e.target.closest(".vdv-dl");
    if (d) marca(d.getAttribute("data-id"), "baixar");
  });

  // esteira da home: os videos passam sozinhos (como a dos cards), arrastam com o dedo e param com o mouse em cima
  var box = document.querySelector(".vdv-esteira");
  if (box) {
    var tr = box.querySelector(".vdv-trilho"), dir = Number(box.getAttribute("data-dir")) || 1, VEL = 40;
    var originais = Array.prototype.slice.call(tr.children);
    var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var arrastou = false;
    box.addEventListener("click", function (e) { if (arrastou) { e.preventDefault(); e.stopPropagation(); } }, true);
    var pular = function (sentido) { box.scrollBy({ left: sentido * Math.min(window.innerWidth * 0.7, 720), behavior: "smooth" }); };
    // setas nas laterais (anterior / proximo)
    var faixaV = document.querySelector(".vdv-rows") || box.parentNode;
    [[-1, "‹", "Vídeos anteriores", "ant"], [1, "›", "Próximos vídeos", "prox"]].forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "vd-seta vd-seta--" + s[3]; b.setAttribute("aria-label", s[2]); b.textContent = s[1];
      b.addEventListener("click", function () { pular(s[0]); });
      faixaV.appendChild(b);
    });
    if (reduz || !tr.animate) { box.classList.add("parada"); }
    else {
      var anim = null, visivel = true, segurando = false, emCima = false, retomar = 0;
      var copiar = function (vezes) {
        tr.innerHTML = "";
        for (var k2 = 0; k2 < vezes; k2++) originais.forEach(function (o) {
          var n = o.cloneNode(true);
          if (k2 > 0) {
            n.setAttribute("aria-hidden", "true");
            Array.prototype.forEach.call(n.querySelectorAll("a,button"), function (x) { x.setAttribute("tabindex", "-1"); });
            Array.prototype.forEach.call(n.querySelectorAll("img"), function (im) { im.alt = ""; });
          }
          tr.appendChild(n);
        });
      };
      var montar = function () {
        var tempo = anim ? Number(anim.currentTime || 0) / Number(anim.effect.getTiming().duration || 1) : 0;
        if (anim) anim.cancel();
        copiar(1);
        var um = tr.scrollWidth;
        var reps = Math.max(1, Math.ceil(window.innerWidth / um) + 1);
        copiar(reps * 2);
        var dur = Math.max(10000, (tr.scrollWidth / 2 / VEL) * 1000);
        var q = dir === 1 ? [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(-50%,0,0)" }] : [{ transform: "translate3d(-50%,0,0)" }, { transform: "translate3d(0,0,0)" }];
        anim = tr.animate(q, { duration: dur, iterations: Infinity, easing: "linear" });
        anim.currentTime = tempo * dur;
        if (!visivel || segurando || emCima) anim.pause();
      };
      var tocar = function () { if (anim && visivel && !emCima && !segurando) anim.play(); };
      montar();
      pular = function (sentido) {                       // adianta ou volta quase uma tela, com deslize curto
        if (!anim) return;
        var dur = Number(anim.effect.getTiming().duration), metade = tr.scrollWidth / 2;
        var delta = (-sentido * Math.min(window.innerWidth * 0.7, 720) / metade) * dur * (dir === 1 ? -1 : 1);
        var de = Number(anim.currentTime || 0), ini = null;
        clearTimeout(retomar); segurando = true; anim.pause();
        var quadro = function (t) {
          if (ini === null) ini = t;
          var p = Math.min(1, (t - ini) / 420), e = 1 - Math.pow(1 - p, 3);
          var v = (de + delta * e) % dur; if (v < 0) v += dur;
          anim.currentTime = v;
          if (p < 1) requestAnimationFrame(quadro);
          else { segurando = false; retomar = setTimeout(tocar, 1800); }
        };
        requestAnimationFrame(quadro);
      };
      if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visivel = !!en[0].isIntersecting; if (visivel) tocar(); else if (anim) anim.pause(); }).observe(box);
      box.addEventListener("mouseenter", function () { emCima = true; if (anim) anim.pause(); });
      box.addEventListener("mouseleave", function () { emCima = false; tocar(); });
      box.addEventListener("focusin", function () { emCima = true; if (anim) anim.pause(); });
      box.addEventListener("focusout", function () { emCima = false; tocar(); });
      var larg = window.innerWidth;
      window.addEventListener("resize", function () { if (Math.abs(window.innerWidth - larg) > 40) { larg = window.innerWidth; montar(); } });
      var x0 = 0, t0 = 0, pid = -1, mexeu = false;
      box.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        segurando = true; mexeu = false; arrastou = false; clearTimeout(retomar);
        if (anim) anim.pause();
        x0 = e.clientX; t0 = Number(anim.currentTime || 0); pid = e.pointerId;
      });
      box.addEventListener("pointermove", function (e) {
        if (!segurando || e.pointerId !== pid) return;
        var dx = e.clientX - x0;
        if (Math.abs(dx) > 6) { mexeu = true; arrastou = true; }
        if (!mexeu) return;
        var dur = Number(anim.effect.getTiming().duration), metade = tr.scrollWidth / 2;
        var t = (t0 + (dx / metade) * dur * (dir === 1 ? -1 : 1)) % dur; if (t < 0) t += dur;
        anim.currentTime = t;
      });
      var soltou = function () {
        if (!segurando) return;
        segurando = false;
        if (mexeu) retomar = setTimeout(function () { arrastou = false; tocar(); }, 1200); else { arrastou = false; tocar(); }
      };
      box.addEventListener("pointerup", soltou);
      box.addEventListener("pointercancel", soltou);
    }
  }
})();

(function () {
  var sel = ".vd-voto__title em,.vd-gal__title em,.vdv__title em,.vd-intro__title em,.vd-fim__title em";
  var els = document.querySelectorAll(sel);
  if (!els.length) return;
    Array.prototype.forEach.call(els, function (e) { e.classList.add("vd-em-box"); });
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function entra(e) { e.classList.add("is-in"); }
  if (reduz || !("IntersectionObserver" in window)) { Array.prototype.forEach.call(els, entra); return; }
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) { if (x.isIntersecting) { entra(x.target); io.unobserve(x.target); } });
  }, { threshold: 0, rootMargin: "0px 0px 15% 0px" });
  Array.prototype.forEach.call(els, function (e) {
    var r = e.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9 && r.bottom > 0) entra(e); else io.observe(e);
  });
})();

(function () {
  var hero = document.querySelector(".vd-hero");
  if (!hero) return;
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduz) return;

  // letras de FLAVIO e VERDADE caem uma a uma e depois ondulam
  function letras(el) {
    if (!el || el.getAttribute("data-split")) return;
    var t = el.textContent;
    el.setAttribute("data-split", "1");
    el.setAttribute("aria-label", t.trim());
    el.textContent = "";
    for (var i = 0; i < t.length; i++) {
      var s = document.createElement("span");
      s.className = "vd-ch"; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = t.charAt(i) === " " ? " " : t.charAt(i);
      el.appendChild(s);
    }
  }
  letras(hero.querySelector(".vd-title__l1"));
  letras(hero.querySelector(".vd-title__l3"));

  // frase de apoio entra palavra por palavra
  var sl = hero.querySelector(".vd-slogan");
  if (sl && !sl.getAttribute("data-split")) {
    sl.setAttribute("data-split", "1");
    var linhas = sl.innerHTML.split(/<br\s*\/?>/i);          // a frase vem em duas linhas: a quebra continua depois da animacao
    sl.setAttribute("aria-label", linhas.join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
    sl.textContent = "";
    var n = 0;
    linhas.forEach(function (linha, li) {
      var tmp = document.createElement("span"); tmp.innerHTML = linha;
      var palavras = tmp.textContent.trim().split(/\s+/);
      if (li > 0) sl.appendChild(document.createElement("br"));
      palavras.forEach(function (p, i) {
        if (!p) return;
        var w = document.createElement("span");
        w.className = "vd-w"; w.setAttribute("aria-hidden", "true");
        w.style.setProperty("--w", n++);
        w.textContent = p;
        sl.appendChild(w);
        if (i < palavras.length - 1) sl.appendChild(document.createTextNode(" "));
      });
    });
  }

})();

(function () {
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduz) return;
  var sel = ".vd-gal__title,.vdv__title,.vd-voto__title,.vd-intro__title,.vd-fim__title,.vd-pledge__title,.seo-h2,.vd-index__title";
  var titulos = document.querySelectorAll(sel);
  if (!titulos.length) return;

  // cada palavra vira um bloco que nao quebra; cada letra recebe seu indice para a cascata
  function divide(t) {
    if (t.getAttribute("data-vt")) return;
    t.setAttribute("data-vt", "1");
    t.setAttribute("aria-label", t.textContent.replace(/\s+/g, " ").trim());
    var i = 0;
    Array.prototype.slice.call(t.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;                          // <em> (a caixa) tem a propria animacao
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span");
        w.className = "vt-w"; w.setAttribute("aria-hidden", "true");
        for (var k = 0; k < p.length; k++) {
          var c = document.createElement("span");
          c.className = "vt-ch"; c.style.setProperty("--i", i++);
          c.textContent = p.charAt(k);
          w.appendChild(c);
        }
        frag.appendChild(w);
      });
      t.replaceChild(frag, n);
    });
  }
  Array.prototype.forEach.call(titulos, divide);

  function dispara(t) {
    t.classList.add("vt-go");
    var s = t.closest("section");
    if (s) s.classList.add("vt-sec");
  }
  if (!("IntersectionObserver" in window)) { Array.prototype.forEach.call(titulos, dispara); return; }
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) { if (x.isIntersecting) { dispara(x.target); io.unobserve(x.target); } });
  }, { threshold: 0, rootMargin: "0px 0px 12% 0px" });
  Array.prototype.forEach.call(titulos, function (t) {
    var r = t.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.95 && r.bottom > 0) dispara(t); else io.observe(t);
  });
})();

/* ===== Código extraído do index.html ===== */

/* Janela unica de card e de video: ao tocar na peca abre aqui (sem trocar de pagina), com as quatro opcoes:
   WhatsApp, Compartilhar, Download e Copiar link. Vale na home e nas paginas internas. */
(function () {
  if (window.vdMidia) return;
  var SITE = "https://flaviocomaverdade.com.br";
  /* Coloque as imagens em /bancoImagens/ e liste os nomes reais aqui.
     O navegador não consegue enumerar automaticamente os arquivos de uma pasta estática. */
  var BANCO_IMAGENS = [
    // Troque pelos nomes reais dos arquivos existentes em /bancoImagens/.
    "imagem1.jpg", "imagem2.jpg", "imagem3.jpg", "imagem4.png", "imagem5.webp",
    "documento1.pdf", "documento2.pdf"
  ].map(function (nome) { return "/bancoImagens/" + nome; });
  function sortearImagemBanco() {
    return BANCO_IMAGENS[Math.floor(Math.random() * BANCO_IMAGENS.length)];
  }
  function carregarImagemParaCompartilhar(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Arquivo não encontrado: " + url);
      return r.blob();
    }).then(function (blob) {
      if (blob.type === "application/pdf" || /\\.pdf(?:$|[?#])/i.test(url)) {
        return new Promise(function (resolve, reject) {
          function renderizarPDF() {
            if (!window.pdfjsLib) { reject(new Error("PDF.js não carregou")); return; }
            window.pdfjsLib.getDocument({ data: blob }).promise.then(function (pdf) { return pdf.getPage(1); }).then(function (page) {
              var viewport = page.getViewport({ scale: 2 });
              var canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
              return page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise.then(function () {
                return new Promise(function (res, rej) { canvas.toBlob(function (png) { canvas.width = 0; canvas.height = 0; if (png) res(png); else rej(new Error("Falha ao converter PDF para PNG")); }, "image/png"); });
              });
            }).then(resolve, reject);
          }
          if (window.pdfjsLib) { renderizarPDF(); return; }
          var script = document.createElement("script"); script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; renderizarPDF(); };
          script.onerror = function () { reject(new Error("Não foi possível carregar PDF.js")); }; document.head.appendChild(script);
        });
      }
      return blob;
    });
  }
  function compartilharArquivoBanco(a, mensagem) {
    if (!navigator.share || !navigator.canShare || !window.File) { aviso("Este navegador não permite anexar imagens pelo compartilhamento. Abra o site em um celular ou navegador compatível."); return; }
    carregarImagemParaCompartilhar(a.imagemCompartilhamento).then(function (blob) {
      var mime = blob.type && blob.type.indexOf("image/") === 0 ? blob.type : "image/jpeg";
      var ext = mime.indexOf("png") >= 0 ? "png" : mime.indexOf("webp") >= 0 ? "webp" : "jpg";
      var arquivo = new File([blob], "imagem-compartilhamento." + ext, { type: mime });
      if (!navigator.canShare({ files: [arquivo] })) throw new Error("Este navegador não permite compartilhar arquivos de imagem.");
      return navigator.share({ files: [arquivo], text: mensagem });
    }).catch(function (err) { if (err && err.name === "AbortError") return; aviso("Não foi possível enviar a imagem: confira os nomes dos arquivos em bancoImagens e tente novamente."); console.error(err); });
  }
  var IC = {
    zap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-8 8M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
  };

  var toast = document.createElement("div");
  toast.className = "vg-toast"; toast.setAttribute("role", "status");
  var tt;
  function aviso(t) { if (!toast.parentNode) document.body.appendChild(toast); toast.textContent = t; toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("on"); }, 3200); }
  function marca(acao) {
    if (!atual) return;
    try { (window.dataLayer = window.dataLayer || []).push({ event: atual.tipo === "video" ? "video_verdade" : "card_verdade", acao: acao, item: atual.id }); } catch (e) { }
    try { if (window.vdTrack) window.vdTrack(atual.tipo === "video" ? (acao === "baixar" ? "video_download" : acao === "abrir" ? "card" : "video_share") : (acao === "abrir" ? "card" : acao === "baixar" ? "click" : "compartilhar"), "/" + atual.tipo + "s/" + atual.id + " (" + acao + ")"); } catch (e) { }
  }

  var box = document.createElement("div");
  box.className = "vm"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.hidden = true; box.tabIndex = -1;
  box.innerHTML = '<div class="vm__box">' +
    '<button class="vm__x" type="button"><span>Fechar</span><b aria-hidden="true">×</b></button>' +
    '<div class="vm__midia"></div>' +
    '<div class="vm__acoes" role="group" aria-label="Opções">' +
    '<button class="vm__b vm__b--zap" type="button" data-a="zap"><i>' + IC.zap + '</i><span>WhatsApp</span></button>' +
    '<button class="vm__b" type="button" data-a="share"><i>' + IC.share + '</i><span>Compartilhar</span></button>' +
    '<a class="vm__b" data-a="down" download><i>' + IC.down + '</i><span>Download</span></a>' +
    '<button class="vm__b" type="button" data-a="copy"><i>' + IC.copy + '</i><span>Copiar link</span></button>' +
    '</div></div>';
  var midia = box.querySelector(".vm__midia"), baixar = box.querySelector('[data-a="down"]');
  var atual = null, voltarFoco = null;

  function dados(tipo, id, titulo, fv) {
    if (tipo === "video") {
      var qv = fv ? "?v=" + encodeURIComponent(fv) : "";      // versao do arquivo: endereco novo a cada conversao
      return { tipo: "video", id: id, titulo: titulo, link: SITE + "/videos/" + id, arquivo: "/assets/verdade/videos/" + id + ".mp4" + qv, leve: "/assets/verdade/videos/" + id + "-share.mp4" + qv,
        nome: "flavio-com-a-verdade-" + id + ".mp4", mime: "video/mp4", capa: "/assets/verdade/videos/" + id + ".jpg" };
    }
    var imagemCard = "/assets/verdade/cards/" + id + ".jpg";
    return { tipo: "card", id: id, titulo: titulo, link: SITE + "/cards/" + id, arquivo: imagemCard, leve: imagemCard,
      imagemCompartilhamento: sortearImagemBanco(), nome: "imagem-compartilhamento.jpg", mime: "image/jpeg" };
  }
  function abrir(tipo, id, titulo, capa, ar, fv) {
    if (!box.parentNode) document.body.appendChild(box);
    atual = dados(tipo, id, titulo || "", fv);
    if (capa) atual.capa = capa;
    midia.innerHTML = "";
    if (tipo === "video") {
      var v = document.createElement("video");
      v.className = "vm__video"; v.controls = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "metadata";
      v.poster = atual.capa; v.src = atual.leve; v.setAttribute("aria-label", atual.titulo);
      if (ar && /^\d+\/\d+$/.test(ar)) { v.classList.add("vm__video--deitado"); v.style.aspectRatio = ar.replace("/", " / "); }   // video horizontal: janela larga
      midia.appendChild(v);
      var p = v.play(); if (p && p.catch) p.catch(function () { });
    } else {
      var im = document.createElement("img");
      im.className = "vm__img"; im.src = atual.arquivo; im.alt = atual.titulo; im.decoding = "async";
      midia.appendChild(im);
    }
    box.setAttribute("aria-label", (tipo === "video" ? "Vídeo: " : "Card: ") + atual.titulo);
    baixar.href = atual.arquivo; baixar.setAttribute("download", atual.nome);
    voltarFoco = document.activeElement;
    box.hidden = false; document.documentElement.classList.add("vm-aberta");
    box.focus();                                             // foco na janela (Tab segue para Fechar e para as opcoes)
    marca("abrir");
  }
  function fechar() {
    if (box.hidden) return;
    var v = midia.querySelector("video"); if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) { } }
    midia.innerHTML = ""; box.hidden = true; document.documentElement.classList.remove("vm-aberta");
    if (voltarFoco && voltarFoco.focus) { try { voltarFoco.focus(); } catch (e) { } }
    atual = null;
  }
  function texto() { return atual.titulo + "\n\nA verdade sobre Flávio Bolsonaro: " + atual.link; }
  function zap() {
    marca("whatsapp"); var a = atual; if (!a) return;
    if (a.tipo === "card") { compartilharArquivoBanco(a, texto()); return; }
    window.open("https://wa.me/?text=" + encodeURIComponent(texto()), "_blank", "noopener");
  }
  function copiar(silencioso) {
    var url = atual.link;
    function ok() { if (!silencioso) aviso("Link copiado."); }
    function antigo() { var t = document.createElement("textarea"); t.value = url; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); ok(); } catch (e) { aviso(url); } t.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, antigo); else antigo();
  }
  function compartilhar() {
    marca("compartilhar"); var a = atual, msg = texto();
    if (a.tipo === "card") { compartilharArquivoBanco(a, msg); return; }
    if (navigator.canShare && window.fetch && window.File && navigator.share) {
      fetch(a.leve).then(function (r) { if (!r.ok) throw new Error("Vídeo não encontrado"); return r.blob(); }).then(function (b) {
        var f = new File([b], a.nome, { type: b.type || a.mime });
        if (!navigator.canShare({ files: [f] })) throw new Error("Compartilhamento de arquivo indisponível");
        return navigator.share({ files: [f], text: msg });
      }).catch(function (e) { if (e && e.name !== "AbortError") aviso("Não foi possível compartilhar o arquivo neste navegador."); }); return;
    }
    aviso("Este navegador não permite compartilhar arquivos diretamente.");
  }

  box.addEventListener("click", function (e) {
    if (e.target === box) return fechar();
    if (e.target.closest(".vm__x")) return fechar();
    var b = e.target.closest("[data-a]"); if (!b || !atual) return;
    var a = b.getAttribute("data-a");
    if (a === "zap") zap(); else if (a === "share") compartilhar(); else if (a === "copy") { marca("copiar"); copiar(); } else if (a === "down") { marca("baixar"); aviso("Baixando…"); }
  });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); fechar(); }
    if (e.key === "Tab") {                                   // mantem o foco dentro da janela
      var f = box.querySelectorAll("button,a[href],video"), pri = f[0], ult = f[f.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    }
  });

  // toque em qualquer card ou video do site abre a janela (o link continua no HTML para buscadores e para quem esta sem JavaScript)
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.closest(".vm")) return;
    var href = a.getAttribute("href") || "", m;
    if ((m = /^\/cards\/([a-z0-9-]+)$/.exec(href)) && (a.querySelector("img") || a.hasAttribute("data-card"))) {
      var im = a.querySelector("img");
      e.preventDefault(); abrir("card", m[1], a.getAttribute("data-alt") || (im && im.alt) || a.textContent.trim());
    } else if ((m = /^\/videos\/([a-z0-9-]+)$/.exec(href)) && a.closest(".vdv-card,[data-video]")) {
      var c = a.closest(".vdv-card,[data-video]"), t = c.getAttribute("data-t") || (c.querySelector(".vdv-t") || a).textContent.trim();
      var img = c.querySelector("img"), capa = img ? (img.getAttribute("src") || "").replace("-mini.webp", ".jpg") : "";
      e.preventDefault(); abrir("video", m[1], t, capa, c.getAttribute("data-ar"), c.getAttribute("data-fv"));
    }
  });

  window.vdMidia = { abrir: abrir, fechar: fechar, aviso: aviso };
})();
