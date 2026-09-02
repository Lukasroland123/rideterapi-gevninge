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
      if (window.innerWidth > 1380) setNavOpen(false);
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
