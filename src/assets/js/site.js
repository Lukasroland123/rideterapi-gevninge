/* Redigeringsknappen i bunden.
   Besøg siden med ?rediger for at slå den til på denne computer,
   og ?rediger=nej for at slå den fra igen. Valget huskes i browseren.

   BEMÆRK: dette skjuler kun knappen. Det er IKKE sikkerheden.
   Sikkerheden er, at kun GitHub-konti med skriveadgang til
   repositoriet kan gemme noget på /admin. */
(function () {
  try {
    var p = new URLSearchParams(location.search);
    if (p.has('rediger')) {
      if (p.get('rediger') === 'nej') {
        localStorage.removeItem('rediger');
      } else {
        localStorage.setItem('rediger', '1');
      }
      // Fjern ?rediger fra adressen igen, så den ikke deles ved et uheld
      history.replaceState(null, '', location.pathname + location.hash);
    }
    if (localStorage.getItem('rediger') === '1') {
      document.documentElement.classList.add('kan-redigere');
    }
  } catch (e) {
    /* localStorage kan være slået fra — så vises knappen bare ikke */
  }
})();

/* Menu-adfærd. Alt indhold er tilgængeligt uden JavaScript —
   dette gør blot navigationen rarere at bruge. */
(function () {

  /* ---------- Mobilmenu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('hovedmenu');

  function setNavOpen(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNavOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNavOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1420) setNavOpen(false);
    });
  }

  /* ---------- Undermenu ("Forløb") ----------
     Åbner på hover og tastaturfokus via CSS. Her tilføjes klik,
     så den også virker på touchskærme i bredt format. */
  var groups = Array.prototype.slice.call(document.querySelectorAll('.nav__group'));

  function closeGroups(except) {
    groups.forEach(function (g) {
      if (g === except) return;
      g.classList.remove('is-open');
      var p = g.querySelector('.nav__parent');
      if (p) p.setAttribute('aria-expanded', 'false');
    });
  }

  groups.forEach(function (group) {
    var parent = group.querySelector('.nav__parent');
    if (!parent) return;

    parent.addEventListener('click', function (e) {
      e.preventDefault();
      var open = !group.classList.contains('is-open');
      closeGroups(group);
      group.classList.toggle('is-open', open);
      parent.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Luk igen når fokus forlader gruppen
    group.addEventListener('focusout', function (e) {
      if (!group.contains(e.relatedTarget)) {
        group.classList.remove('is-open');
        parent.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* Klik udenfor lukker undermenuer */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav__group')) closeGroups(null);
  });

  /* Escape lukker alt */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeGroups(null);
    if (toggle && toggle.getAttribute('aria-expanded') === 'true') {
      setNavOpen(false);
      toggle.focus();
    }
  });

})();

/* Cookie-boks og besøgsstatistik.
   Valget gemmes i localStorage under "cookie-samtykke" sammen med datoen.
   Efter 12 måneder spørges der igen. Statistikken (Cloudflare Web Analytics)
   indlæses kun, hvis der er sagt ja, og kun hvis der er sat et token i
   src/_data/statistik.json. Ja og Nej er bevidst lige store knapper:
   det kræver reglerne for samtykke. */
(function () {
  var boks = document.getElementById('cookie-boks');
  if (!boks) return;
  var NOEGLE = 'cookie-samtykke';
  var GYLDIG_MS = 365 * 24 * 60 * 60 * 1000;

  function hentValg() {
    try {
      var v = JSON.parse(localStorage.getItem(NOEGLE) || 'null');
      if (v && (v.valg === 'ja' || v.valg === 'nej') && Date.now() - v.dato < GYLDIG_MS) return v.valg;
    } catch (e) {}
    return null;
  }

  function gemValg(valg) {
    try { localStorage.setItem(NOEGLE, JSON.stringify({ valg: valg, dato: Date.now() })); } catch (e) {}
  }

  var indlaest = false;
  function startStatistik() {
    var token = boks.getAttribute('data-token');
    if (!token || indlaest) return;
    indlaest = true;
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: token }));
    document.body.appendChild(s);
  }

  function visBoks() { boks.hidden = false; }
  function skjulBoks() { boks.hidden = true; }

  boks.addEventListener('click', function (e) {
    var knap = e.target.closest('[data-samtykke]');
    if (!knap) return;
    var valg = knap.getAttribute('data-samtykke');
    var foer = hentValg();
    gemValg(valg);
    skjulBoks();
    if (valg === 'ja') startStatistik();
    // Trækkes et ja tilbage, genindlæses siden, så statistikken stopper med det samme
    else if (foer === 'ja') location.reload();
  });

  Array.prototype.forEach.call(document.querySelectorAll('.cookie-aabn'), function (b) {
    b.addEventListener('click', visBoks);
  });

  var valg = hentValg();
  if (valg === 'ja') startStatistik();
  else if (valg === null) visBoks();
})();
