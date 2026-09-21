/* Rivand Asesores · "Cuenta atrás"
   Todo el movimiento es el mismo gesto: algo gira y ENCAJA. La aguja del
   dial no llega, se pasa un poco y se asienta (overshoot + settle); las
   tarjetas se apilan como el paso de un trinquete; las cifras suben hasta
   su valor y se paran en seco. Sin canvas, sin blur por frame.

   El trimestre en curso y la cuenta atrás se calculan con la fecha real
   del navegador: las fechas límite son las genéricas del calendario fiscal
   español y están marcadas en la página como pendientes de confirmar. */

(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     0. datos del calendario  (genéricos del sector, a confirmar)
     --------------------------------------------------------------- */

  /* límite de cada trimestre: [mes (1-12), día] del vencimiento */
  var LIMITES = [
    { t: 1, mes: 4, dia: 20, eti: "20 abr" },
    { t: 2, mes: 7, dia: 20, eti: "20 jul" },
    { t: 3, mes: 10, dia: 20, eti: "20 oct" },
    { t: 4, mes: 1, dia: 20, eti: "20 ene" }   // del año siguiente
  ];

  function estadoFiscal(ahora) {
    var y = ahora.getFullYear();
    var q = Math.floor(ahora.getMonth() / 3) + 1;          // trimestre natural en curso
    var lim = LIMITES[q - 1];
    var anioLim = lim.t === 4 ? y + 1 : y;
    var venc = new Date(anioLim, lim.mes - 1, lim.dia, 23, 59, 59);
    /* si ya pasó el vencimiento del trimestre en curso (sólo puede darse en
       T4 → 20 ene, o en el tramo del mes de presentación) pasamos al siguiente */
    if (ahora > venc) {
      q = q % 4 + 1;
      lim = LIMITES[q - 1];
      anioLim = lim.t === 4 ? y + 1 : y;
      venc = new Date(anioLim, lim.mes - 1, lim.dia, 23, 59, 59);
    }
    var dias = Math.max(0, Math.ceil((venc - ahora) / 86400000));
    return { q: q, dias: dias, eti: lim.eti };
  }

  var FISCAL = estadoFiscal(new Date());

  /* ---------------------------------------------------------------
     1. utilidades sin dependencias (funcionan aunque GSAP no llegue)
     --------------------------------------------------------------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* --- año del pie --- */
  $$("[data-anio]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* --- estado de los dials y del calendario según el trimestre real --- */
  function pintarEstadoFiscal() {
    $$("[data-dial][data-q]").forEach(function (svg) {
      var q = svg.getAttribute("data-q") === "auto" ? FISCAL.q : parseInt(svg.getAttribute("data-q"), 10);
      svg.setAttribute("data-q", String(q));
      $$(".d-marca", svg).forEach(function (m) {
        var n = parseInt(m.getAttribute("data-marca"), 10);
        m.classList.toggle("on", n === q);
        m.classList.toggle("cerrado", n < q);
      });
      $$(".d-eti", svg).forEach(function (g) {
        var n = parseInt(g.getAttribute("data-letra"), 10);
        g.classList.toggle("on", n === q);
        g.classList.toggle("cerrado", n < q);
      });
    });

    $$(".cal-item[data-cal]").forEach(function (li) {
      var n = parseInt(li.getAttribute("data-cal"), 10);
      var estado = $("[data-estado]", li);
      li.classList.toggle("on", n === FISCAL.q);
      li.classList.toggle("cerrado", n < FISCAL.q);
      if (estado) estado.textContent = n === FISCAL.q ? "En curso" : (n < FISCAL.q ? "Cerrado" : "Por venir");
    });

    var eti = $("[data-cuenta-eti]");
    if (eti) eti.textContent = "el cierre de T" + FISCAL.q + " · " + FISCAL.eti;
    var num = $("[data-cuenta]");
    if (num) num.textContent = String(FISCAL.dias);
  }

  /* --- los dials de trimestre arrancan con la aguja ya puesta --- */
  function colocarAgujas(animar) {
    $$("[data-dial][data-q]").forEach(function (svg) {
      var q = parseInt(svg.getAttribute("data-q"), 10) || 1;
      var aguja = $(".d-aguja", svg);
      if (!aguja) return;
      var destino = (q - 1) * 90;
      if (animar && window.gsap) {
        gsap.fromTo(aguja, { rotation: destino - 300 },
          { rotation: destino, duration: 1.9, ease: "elastic.out(0.85, 0.42)", svgOrigin: "100 100" });
      } else {
        aguja.style.transform = "rotate(" + destino + "deg)";
      }
    });
  }

  /* --- arcos de horario: un anillo de 24 h con las bandas de apertura --- */
  (function arcosHorario() {
    $$(".hr-arco[data-arco]").forEach(function (c) {
      var r = parseFloat(c.getAttribute("r"));
      var C = 2 * Math.PI * r;
      var p = c.getAttribute("data-arco").split(",");
      var desde = parseFloat(p[0]), hasta = parseFloat(p[1]);
      var largo = (hasta - desde) / 24 * C;
      c.setAttribute("stroke-dasharray", largo + " " + (C - largo));
      c.setAttribute("stroke-dashoffset", String(-desde / 24 * C));
    });
  })();

  /* --- abierto o cerrado ahora mismo (horario confirmado por el cliente) --- */
  (function abiertoAhora() {
    var el = $("[data-ahora]");
    if (!el) return;
    var BANDAS = {
      1: [[9, 13], [15.5, 19.5]], 2: [[9, 13], [15.5, 19.5]],
      3: [[9, 13], [15.5, 19.5]], 4: [[9, 13], [15.5, 19.5]],
      5: [[9, 14]], 6: [], 0: []
    };
    var ahora = new Date();
    var h = ahora.getHours() + ahora.getMinutes() / 60;
    var hoy = BANDAS[ahora.getDay()] || [];
    var abierto = hoy.some(function (b) { return h >= b[0] && h < b[1]; });
    el.textContent = abierto ? "Abierto ahora" : "Cerrado ahora";
    el.classList.toggle("cerrado", !abierto);
  })();

  /* --- aviso de cookies: [hidden] manda, el botón cierra de verdad --- */
  (function cookies() {
    var banner = $(".cookie-banner");
    if (!banner) return;
    var CLAVE = "rivand-cookies-vistas";
    var visto = false;
    try { visto = localStorage.getItem(CLAVE) === "1"; } catch (e) { visto = false; }

    function alto() {
      doc.style.setProperty("--cookie-h", banner.hidden ? "0px" : banner.offsetHeight + "px");
    }
    if (!visto) {
      banner.hidden = false;
      alto();
      window.addEventListener("resize", alto);
    }
    $(".cookie-ack", banner).addEventListener("click", function () {
      banner.hidden = true;
      alto();
      try { localStorage.setItem(CLAVE, "1"); } catch (e) { /* modo privado: da igual */ }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  })();

  /* ---------------- El control de paleta ----------------
     NO ES PARTE DEL SITIO. Es un mando para enseñar la misma web en cuatro
     paletas de color delante del cliente mientras decide. Al entregar la
     web ya como oficial se borra esta función, el bloque .paleta del CSS,
     el <div id="paleta"> y la bandera del <head>.
     "Burdeos" (rojo de Dourado & Fernández) es el default real: el bare
     :root de css/style.css YA es ese rojo, así que "burdeos" es el único
     nombre que NO añade clase — es el estado "ninguna clase puesta". Los
     otros tres ("original" = cobre nativo, "granate", "botella") sí
     añaden su clase html.paleta-*. */
  (function initPaleta() {
    var caja = $("#paleta");
    var botones = {
      burdeos: $("#paleta-burdeos"),
      original: $("#paleta-original"),
      granate: $("#paleta-granate"),
      botella: $("#paleta-botella")
    };
    if (!caja || !botones.burdeos || !botones.original || !botones.granate || !botones.botella) return;
    var CLAVE_PALETA = "rivand-paleta";

    caja.hidden = false; // sin JS no se enseña: no haría nada

    function pintar(nombre, guardar) {
      doc.classList.remove("paleta-original", "paleta-granate", "paleta-botella");
      if (nombre !== "burdeos") doc.classList.add("paleta-" + nombre);
      Object.keys(botones).forEach(function (k) {
        botones[k].setAttribute("aria-pressed", String(k === nombre));
      });
      if (guardar) { try { localStorage.setItem(CLAVE_PALETA, nombre); } catch (e) {} }
    }

    var actual = doc.classList.contains("paleta-original") ? "original"
      : doc.classList.contains("paleta-granate") ? "granate"
      : doc.classList.contains("paleta-botella") ? "botella" : "burdeos";
    pintar(actual, false);
    botones.burdeos.addEventListener("click", function () { pintar("burdeos", true); });
    botones.original.addEventListener("click", function () { pintar("original", true); });
    botones.granate.addEventListener("click", function () { pintar("granate", true); });
    botones.botella.addEventListener("click", function () { pintar("botella", true); });
  })();

  /* --- diálogos legales --- */
  $$("[data-dialog]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = document.getElementById(b.getAttribute("data-dialog"));
      if (d && d.showModal) d.showModal();
    });
  });
  $$("[data-cerrar]").forEach(function (b) {
    b.addEventListener("click", function () { b.closest("dialog").close(); });
  });
  $$("dialog.dlg").forEach(function (d) {
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
  });

  /* --- WhatsApp: el enlace está pendiente, así que no se finge que funciona --- */
  $$("[data-wa]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (a.getAttribute("href").indexOf("NUMERO-PENDIENTE") === -1) return;
      e.preventDefault();
      var d = document.getElementById("dlg-wa");
      if (d && d.showModal) d.showModal();
    });
  });

  /* --- mapa: el iframe sólo se construye al pulsar --- */
  (function mapa() {
    var caja = $("[data-map-consent]");
    if (!caja) return;
    $("[data-map-btn]", caja).addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = caja.getAttribute("data-src");
      f.title = "Mapa de Google con la ubicación de Rivand Asesores";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.setAttribute("allowfullscreen", "");
      caja.innerHTML = "";
      caja.appendChild(f);
    });
  })();

  /* --- menú móvil --- */
  (function menu() {
    var btn = $(".menu-btn"), caja = $(".menu");
    if (!btn || !caja) return;
    function cerrar() {
      btn.setAttribute("aria-expanded", "false");
      caja.hidden = true;
      document.body.style.overflow = "";
    }
    btn.addEventListener("click", function () {
      var abierto = btn.getAttribute("aria-expanded") === "true";
      if (abierto) { cerrar(); return; }
      btn.setAttribute("aria-expanded", "true");
      caja.hidden = false;
      document.body.style.overflow = "hidden";
    });
    $$("a", caja).forEach(function (a) { a.addEventListener("click", cerrar); });
  })();

  /* --- cabecera: fondo crema en cuanto se sale del hero --- */
  (function cabecera() {
    var top = $("[data-top]"), hero = $(".hero");
    if (!top || !hero || !window.IntersectionObserver) return;
    var centinela = document.createElement("div");
    centinela.style.cssText = "position:absolute;top:80vh;height:1px;width:1px;";
    hero.appendChild(centinela);
    new IntersectionObserver(function (ent) {
      top.classList.toggle("pegado", !ent[0].isIntersecting);
    }, { rootMargin: "-70px 0px 0px 0px" }).observe(centinela);
  })();

  pintarEstadoFiscal();

  /* ---------------------------------------------------------------
     2. de aquí abajo, todo es movimiento: si no hay GSAP, se acaba
     --------------------------------------------------------------- */

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    colocarAgujas(false);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  doc.classList.add("gsap");

  /* --- smooth scroll --- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    var destino = a.getAttribute("href");
    if (destino === "#" || destino.length < 2) return;
    a.addEventListener("click", function (e) {
      var el = document.querySelector(destino);
      if (!el) return;
      e.preventDefault();
      var y = el.getBoundingClientRect().top + window.scrollY - 12;
      if (lenis) lenis.scrollTo(y, { duration: 1.15 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  /* --- char reveal: parte en letras conservando palabras y <b>/<i> --- */
  function partir(el) {
    var texto = el.textContent.replace(/\s+/g, " ").trim();
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", texto);
    var chars = [];
    var nodos = Array.prototype.slice.call(el.childNodes);
    el.textContent = "";

    function meterTexto(txt, contenedor) {
      txt.split(/(\s+)/).forEach(function (palabra) {
        if (!palabra) return;
        if (/^\s+$/.test(palabra)) { contenedor.appendChild(document.createTextNode(" ")); return; }
        var wrap = document.createElement("span");
        wrap.className = "pal";
        wrap.setAttribute("aria-hidden", "true");
        palabra.split("").forEach(function (c) {
          var s = document.createElement("span");
          s.className = "car";
          s.textContent = c;
          wrap.appendChild(s);
          chars.push(s);
        });
        contenedor.appendChild(wrap);
      });
    }

    nodos.forEach(function (n) {
      if (n.nodeType === 3) { meterTexto(n.nodeValue, el); return; }
      var clon = n.cloneNode(false);
      clon.setAttribute("aria-hidden", "true");
      meterTexto(n.textContent, clon);
      el.appendChild(clon);
    });
    return chars;
  }

  function montarChars(el) {
    if (el.dataset.partido) return;
    el.dataset.partido = "1";
    var chars = partir(el);
    gsap.fromTo(chars, { yPercent: 108, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.82, stagger: 0.016, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  }
  function montarReveal(el) {
    gsap.fromTo(el, { y: 18, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true }
    });
  }

  /* el titular de portada se parte ya: si esperase, se vería un parpadeo */
  $$(".hero .chars").forEach(montarChars);
  $$(".hero .reveal").forEach(montarReveal);

  /* ---------------------------------------------------------------
     3. la aguja: gira despacio y ENCAJA con un golpe de física
     --------------------------------------------------------------- */

  function encajar(svg, destino, opciones) {
    opciones = opciones || {};
    var aguja = $(".d-aguja", svg);
    var halo = $(".d-halo", svg);
    if (!aguja) return;
    var tl = gsap.timeline({ delay: opciones.delay || 0 });
    /* primero el giro largo, casi mecánico; luego el encaje elástico corto */
    tl.fromTo(aguja,
      { rotation: destino - 340, svgOrigin: "100 100" },
      { rotation: destino - 26, duration: 1.25, ease: "power2.inOut" })
      .to(aguja, { rotation: destino, duration: 1.05, ease: "elastic.out(1, 0.38)" });
    if (halo) {
      tl.fromTo(halo, { opacity: 0.85, scale: 1, svgOrigin: "100 100" },
        { opacity: 0, scale: 1.16, duration: 0.7, ease: "power2.out", svgOrigin: "100 100" },
        "-=0.95");
    }
    return tl;
  }

  /* hero: encaja nada más entrar */
  (function agujaHero() {
    var svg = $(".hero [data-dial][data-q]");
    if (!svg) { colocarAgujas(false); return; }
    encajar(svg, (FISCAL.q - 1) * 90, { delay: 0.45 });
  })();

  /* etiquetas de trimestre: se van revelando alrededor del dial */
  gsap.fromTo(".hero .d-eti", { opacity: 0 },
    { opacity: 1, duration: 0.55, stagger: 0.14, delay: 1.45, ease: "power2.out" });

  gsap.fromTo(".hero-cuenta", { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.1 });
  gsap.fromTo(".hero .cuenta-eti", { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.35 });
  gsap.fromTo(".hero-cta .btn", { y: 14, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, stagger: 0.09, delay: 0.9, ease: "power2.out" });
  gsap.fromTo(".hero-nota", { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.7 });

  /* calendario: la aguja encaja cuando la sección entra en pantalla */
  (function agujaCalendario() {
    var svg = $(".calendario [data-dial][data-q]");
    if (!svg) return;
    ScrollTrigger.create({
      trigger: ".cal-stage", start: "top 72%", once: true,
      onEnter: function () { encajar(svg, (FISCAL.q - 1) * 90); }
    });
    gsap.fromTo(".calendario .d-eti", { opacity: 0 }, {
      opacity: 1, duration: 0.55, stagger: 0.13, ease: "power2.out",
      scrollTrigger: { trigger: ".cal-stage", start: "top 72%", once: true }
    });
    gsap.fromTo(".cal-item", { y: 22, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: ".cal-lista", start: "top 82%", once: true }
    });
    gsap.fromTo(".cal-anual li", { y: 18, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: ".cal-anual", start: "top 88%", once: true }
    });
  })();

  /* el resto de dials pequeños: se colocan al entrar, con el mismo encaje corto */
  $$("[data-dial][data-q]").forEach(function (svg) {
    if (svg.closest(".hero") || svg.closest(".calendario")) return;
    var q = parseInt(svg.getAttribute("data-q"), 10) || 1;
    var aguja = $(".d-aguja", svg);
    gsap.set(aguja, { rotation: (q - 1) * 90 - 90, svgOrigin: "100 100" });
    ScrollTrigger.create({
      trigger: svg, start: "top 92%", once: true,
      onEnter: function () {
        gsap.to(aguja, { rotation: (q - 1) * 90, duration: 1.1, ease: "elastic.out(1, 0.45)" });
      }
    });
  });

  /* ---------------------------------------------------------------
     4. el resto del montaje espera a un hueco del hilo principal:
        así no se encadena con el parseo de GSAP, ScrollTrigger y Lenis
        en una sola tarea larga al cargar
     --------------------------------------------------------------- */

  var luego = window.requestIdleCallback
    ? function (f) { requestIdleCallback(f, { timeout: 600 }); }
    : function (f) { setTimeout(f, 1); };

  luego(function montarResto() {

  $$(".chars").forEach(montarChars);
  $$(".reveal").forEach(montarReveal);

  (function stack() {
    var items = $$(".stack-li");
    var svg = $("[data-dial-pasos]");
    var cont = $("[data-serv-n]");
    if (!items.length) return;

    var aguja = svg ? $(".d-aguja", svg) : null;
    var pasos = svg ? $$(".d-paso", svg) : [];
    /* los 6 pasos van de 0° a 180°, uno cada 36°, como el trinquete de un contador */
    function anguloPaso(i) { return i * 36; }

    if (aguja) gsap.set(aguja, { rotation: anguloPaso(0), svgOrigin: "100 100" });

    function marcar(i) {
      pasos.forEach(function (p, n) { p.classList.toggle("on", n === i); });
      if (cont) cont.textContent = ("0" + (i + 1)).slice(-2);
      if (aguja) gsap.to(aguja, { rotation: anguloPaso(i), duration: 0.85, ease: "elastic.out(1, 0.5)" });
    }
    marcar(0);

    items.forEach(function (li, i) {
      ScrollTrigger.create({
        trigger: li,
        start: "top 42%",
        end: "bottom 42%",
        onEnter: function () { marcar(i); },
        onEnterBack: function () { marcar(i); }
      });
      /* la tarjeta llega girada un pelo y se endereza al encajar en su sitio */
      gsap.fromTo($(".tarjeta", li), { y: 42, rotate: i % 2 ? 0.7 : -0.7, opacity: 0 }, {
        y: 0, rotate: 0, opacity: 1, duration: 0.75, ease: "power3.out",
        scrollTrigger: { trigger: li, start: "top 88%", once: true }
      });
    });
  })();

  /* ---------------------------------------------------------------
     5. marquee lento en mono
     --------------------------------------------------------------- */

  (function marquee() {
    var pista = $("[data-marquee]");
    if (!pista) return;
    var uno = pista.firstElementChild;
    gsap.to(pista, {
      x: function () { return -uno.getBoundingClientRect().width; },
      duration: 26, ease: "none", repeat: -1
    });
  })();

  /* ---------------------------------------------------------------
     6. contadores: la cifra sube y se para en seco
     --------------------------------------------------------------- */

  $$("[data-contador]").forEach(function (el) {
    var tel = el.getAttribute("data-tel");
    var final = el.textContent;
    var objetivo = tel ? parseInt(tel, 10) : parseFloat(el.getAttribute("data-a"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var estado = { v: 0 };

    function formatoTel(n) {
      var s = ("000000000" + Math.round(n)).slice(-9);
      return s.slice(0, 3) + " " + s.slice(3, 5) + " " + s.slice(5, 7) + " " + s.slice(7, 9);
    }

    gsap.to(estado, {
      v: objetivo, duration: tel ? 1.5 : 1.15, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: function () {
        el.textContent = tel ? formatoTel(estado.v)
          : estado.v.toFixed(dec).replace(".", ",");
      },
      onComplete: function () { el.textContent = final; }
    });
  });

  /* la cuenta atrás del hero también sube hasta su número */
  (function cuentaAtras() {
    var el = $("[data-cuenta]");
    if (!el) return;
    var estado = { v: 0 };
    gsap.to(estado, {
      v: FISCAL.dias, duration: 1.4, delay: 0.9, ease: "power3.out",
      onUpdate: function () { el.textContent = String(Math.round(estado.v)); },
      onComplete: function () { el.textContent = String(FISCAL.dias); }
    });
  })();

  /* ---------------------------------------------------------------
     7. botones magnéticos
     --------------------------------------------------------------- */

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".btn-mag").forEach(function (b) {
      var inner = $(".btn-inner", b);
      var qx = gsap.quickTo(b, "x", { duration: 0.4, ease: "power3" });
      var qy = gsap.quickTo(b, "y", { duration: 0.4, ease: "power3" });
      var ix = gsap.quickTo(inner, "x", { duration: 0.5, ease: "power3" });
      var iy = gsap.quickTo(inner, "y", { duration: 0.5, ease: "power3" });
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        qx(dx * 0.26); qy(dy * 0.34);
        ix(dx * 0.10); iy(dy * 0.14);
      });
      b.addEventListener("pointerleave", function () { qx(0); qy(0); ix(0); iy(0); });
    });
  }

  /* ---------------------------------------------------------------
     8. fotografía: entra con un desplazamiento corto
     --------------------------------------------------------------- */

  $$(".ases-tira figure, .cal-foto, .ases-foto, .map-consent").forEach(function (el, i) {
    gsap.fromTo(el, { y: 28, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.8, delay: (i % 4) * 0.07, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
  });

  $$(".hor-item, .cont-dato, .op-cita, .esfera-xl").forEach(function (el) {
    gsap.fromTo(el, { y: 20, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.65, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true }
    });
  });

  ScrollTrigger.refresh();
  });   /* fin de montarResto */

  window.addEventListener("load", function () {
    luego(function () { ScrollTrigger.refresh(); });
  });
})();
