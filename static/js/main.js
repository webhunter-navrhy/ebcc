// EBCC – menu, ukázkový košík (localStorage), výběr povrchu, postup leštění, filtr obchodu, detail produktu.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var kc = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Kč'; };

  // katalog z buildu
  var katalog = {};
  try { JSON.parse($('#katalog').textContent).forEach(function (p) { katalog[p.slug] = p; }); } catch (e) {}

  // menu
  var burger = $('.burger'), menu = $('#menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var o = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', o); menu.classList.toggle('otevreno', o);
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('otevreno'); }); });
  }

  // košík
  var KLIC = 'ebcc-kosik';
  function nacti() { try { return JSON.parse(localStorage.getItem(KLIC)) || []; } catch (e) { return []; } }
  function uloz(k) { try { localStorage.setItem(KLIC, JSON.stringify(k)); } catch (e) {} pocet(); }
  function cenaPolozky(i) {
    var p = katalog[i.slug]; if (!p) return 0;
    var v = p.varianty.filter(function (x) { return x[0] === i.ks; })[0] || [1, p.cena];
    return v[1] * i.qty;
  }
  function pocet() {
    var n = nacti().reduce(function (s, i) { return s + i.qty * i.ks; }, 0);
    $$('[data-kosik-pocet]').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
  }
  var toast = $('.toast'), tt;
  function pridej(slug, ks) {
    if (!katalog[slug]) return;
    ks = ks || 1;
    var k = nacti(), i = k.filter(function (x) { return x.slug === slug && x.ks === ks; })[0];
    if (i) i.qty += 1; else k.push({ slug: slug, ks: ks, qty: 1 });
    uloz(k);
    if (toast) {
      $('[data-toast-text]', toast).textContent = katalog[slug].nazev + (ks > 1 ? ' (' + ks + ' ks)' : '') + ' je v košíku';
      toast.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, 4000);
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pridat]');
    if (!b) return;
    pridej(b.getAttribute('data-pridat'), 1);
    b.classList.add('pridano'); setTimeout(function () { b.classList.remove('pridano'); }, 900);
  });
  pocet();

  // co chcete vyleštit: filtr karet podle povrchu
  var cipy = $$('.povrchy-volba .cip'), pText = $('[data-povrch-text]'), vychoziText = pText ? pText.textContent : '';
  var autoKarty = $$('[data-povrch-mrizka] .karta');
  autoKarty.forEach(function (k) { var p = $('[data-proc]', k); p.setAttribute('data-kratce', p.textContent); });
  function ukazPovrch(id) {
    if (id && !$('[data-text-pro="' + id + '"]')) return;
    cipy.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-povrch') === id); });
    if (pText) pText.textContent = id ? $('[data-text-pro="' + id + '"]').innerHTML.replace(/&nbsp;/g, '\u00a0') : vychoziText;
    autoKarty.forEach(function (k) {
      var duvody = {}; try { duvody = JSON.parse(k.getAttribute('data-duvody')); } catch (e) {}
      var ok = !id || (' ' + k.getAttribute('data-povrchy') + ' ').indexOf(' ' + id + ' ') > -1;
      k.hidden = !ok;
      var p = $('[data-proc]', k), d = id && duvody[id];
      p.textContent = d ? d.charAt(0).toUpperCase() + d.slice(1) + '.' : p.getAttribute('data-kratce');
      p.classList.toggle('duvod', !!d);
    });
  }
  cipy.forEach(function (c) { c.addEventListener('click', function () { ukazPovrch(c.getAttribute('data-povrch')); }); });
  $$('[data-jdi-povrch]').forEach(function (a) { a.addEventListener('click', function () { if (cipy.length) { ukazPovrch(a.getAttribute('data-jdi-povrch')); return; } try { sessionStorage.setItem('ebcc-povrch', a.getAttribute('data-jdi-povrch')); } catch (e) {} }); });
  try { var sp = sessionStorage.getItem('ebcc-povrch'); if (sp && cipy.length) { ukazPovrch(sp); sessionStorage.removeItem('ebcc-povrch'); } } catch (e) {}

  // obchod: filtr
  var mrizka = $('[data-f-mrizka]');
  if (mrizka) {
    var karty = $$('.karta', mrizka), kat = '', fP = $('[data-f-povrch]'), fR = $('[data-f-razeni]'), fH = $('[data-f-hledat]');
    var katCipy = $$('.filtr-kat .cip');
    var filtruj = function () {
      var p = fP.value, h = fH.value.trim().toLowerCase(), n = 0;
      karty.forEach(function (k) {
        var ok = (!kat || k.dataset.kat === kat) && (!p || (' ' + k.dataset.povrchy + ' ').indexOf(' ' + p + ' ') > -1) && (!h || k.dataset.text.indexOf(h) > -1);
        k.hidden = !ok; if (ok) n++;
      });
      var r = fR.value;
      karty.slice().sort(function (a, b) {
        if (r === 'levne') return a.dataset.cena - b.dataset.cena;
        if (r === 'drahe') return b.dataset.cena - a.dataset.cena;
        return a.dataset.poradi - b.dataset.poradi;
      }).forEach(function (k) { mrizka.appendChild(k); });
      $('[data-f-pocet]').textContent = 'Zobrazeno ' + n + (n === 1 ? ' produkt' : (n > 1 && n < 5 ? ' produkty' : ' produktů'));
      $('[data-f-nic]').hidden = n > 0;
    };
    var nastavKat = function (k) { kat = k; katCipy.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.k === k); }); filtruj(); };
    katCipy.forEach(function (c) { c.addEventListener('click', function () { nastavKat(c.dataset.k); }); });
    [fP, fR].forEach(function (el) { el.addEventListener('change', filtruj); });
    fH.addEventListener('input', filtruj);
    $('[data-f-reset]').addEventListener('click', function () { fP.value = ''; fR.value = ''; fH.value = ''; nastavKat(''); });
    var q = new URLSearchParams(location.search);
    if (q.get('p')) fP.value = q.get('p');
    nastavKat(q.get('k') || '');
  }

  // detail: galerie, varianty, koupit
  $$('.nahled').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.getAttribute('data-na');
      $$('.nahled').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $$('.detail-snimek').forEach(function (s) { s.hidden = s.getAttribute('data-snimek') !== i; });
    });
  });
  var koupit = $('[data-koupit]');
  if (koupit) {
    var cenaEl = $('[data-detail-cena]');
    $$('input[name="v"]', koupit).forEach(function (r) { r.addEventListener('change', function () { cenaEl.textContent = kc(+r.dataset.cena); }); });
    koupit.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('input[name="v"]:checked', koupit);
      pridej(koupit.getAttribute('data-koupit'), v ? +v.value : 1);
    });
  }

  // stránka košíku
  var seznam = $('[data-kosik-seznam]');
  if (seznam) {
    var obj = $('[data-objednavka]'), prazdny = $('[data-kosik-prazdny]');
    var vykresli = function () {
      var k = nacti().filter(function (i) { return katalog[i.slug]; });
      seznam.innerHTML = '';
      var suma = 0;
      k.forEach(function (i, idx) {
        var p = katalog[i.slug], c = cenaPolozky(i); suma += c;
        var li = document.createElement('li');
        li.innerHTML = '<a class="k-foto" href="' + p.url + '" tabindex="-1" aria-hidden="true"><img src="' + p.foto + '" alt="" loading="lazy"></a>' +
          '<div class="k-nazev"><a href="' + p.url + '"></a><small></small></div>' +
          '<div class="k-mnozstvi"><button type="button" data-m="-1" aria-label="Ubrat">−</button><span></span><button type="button" data-m="1" aria-label="Přidat">+</button></div>' +
          '<span class="k-cena"></span><button type="button" class="k-odebrat" aria-label="Odebrat z košíku">×</button>';
        $('.k-nazev a', li).textContent = p.nazev;
        $('.k-nazev small', li).textContent = (i.ks > 1 ? 'balení ' + i.ks + ' ks' : (p.podtitul || ''));
        $('.k-mnozstvi span', li).textContent = i.qty;
        $('.k-cena', li).textContent = kc(c);
        $$('[data-m]', li).forEach(function (b) {
          b.addEventListener('click', function () {
            var kk = nacti(); var t = kk.filter(function (x) { return x.slug === i.slug && x.ks === i.ks; })[0];
            if (!t) return; t.qty += +b.dataset.m; if (t.qty < 1) kk.splice(kk.indexOf(t), 1); uloz(kk); vykresli();
          });
        });
        $('.k-odebrat', li).addEventListener('click', function () {
          var kk = nacti().filter(function (x) { return !(x.slug === i.slug && x.ks === i.ks); }); uloz(kk); vykresli();
        });
        seznam.appendChild(li);
      });
      prazdny.hidden = k.length > 0; obj.hidden = k.length === 0; seznam.hidden = k.length === 0;
      $('[data-souhrn-zbozi]').textContent = kc(suma);
      $('[data-souhrn-celkem]').textContent = kc(suma);
    };
    vykresli();
    obj.addEventListener('submit', function (e) {
      e.preventDefault();
      $('[data-objednavka-stav]').textContent = 'Ukázka: v návrhu se objednávka neodesílá. Po spuštění přijde Vám i nám e-mail s potvrzením.';
    });
  }

  // formulář: demo režim nic neodesílá
  $$('form.formular').forEach(function (f) {
    var stav = $('.formular-stav', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('.past input', f).value) return;
      var endpoint = f.getAttribute('data-endpoint');
      if (f.getAttribute('data-demo') === '1' || !endpoint) {
        stav.textContent = 'Ukázka formuláře: nic se neodesílá. Po spuštění webu přijde zpráva na ' + 'shop@ebcc.cz.';
        return;
      }
      stav.textContent = 'Odesílám…';
      fetch(endpoint, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); f.reset(); stav.textContent = 'Děkujeme, zpráva byla odeslána.'; })
        .catch(function () { stav.textContent = 'Odeslání se nepodařilo. Napište nám prosím e-mailem.'; });
    });
  });
})();
