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
        var ok = (!kat || (' ' + k.dataset.kat + ' ').indexOf(' ' + kat + ' ') > -1) && (!p || (' ' + k.dataset.povrchy + ' ').indexOf(' ' + p + ' ') > -1) && (!h || k.dataset.text.indexOf(h) > -1);
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
    var prepniMenu = function (k) {
      var c = katCipy.filter(function (x) { return x.dataset.k === k; })[0], s = c && c.dataset.sada || '';
      $$('.menu-sada').forEach(function (m) { m.hidden = m.dataset.sada !== s; });
    };
    var nastavKat = function (k) { kat = k; prepniMenu(k); katCipy.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.k === k); }); filtruj(); };
    katCipy.forEach(function (c) { c.addEventListener('click', function () { nastavKat(c.dataset.k); }); });
    [fP, fR].forEach(function (el) { el.addEventListener('change', filtruj); });
    fH.addEventListener('input', filtruj);
    $('[data-f-reset]').addEventListener('click', function () { fP.value = ''; fR.value = ''; fH.value = ''; nastavKat(''); });
    var q = new URLSearchParams(location.search);
    if (q.get('p')) fP.value = q.get('p');
    if (q.get('h')) fH.value = q.get('h').toLowerCase();
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
    var vykresli;
    vykresli = function () {
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
    var SHOP = {}; try { SHOP = JSON.parse($('#shop').textContent); } catch (e) {}
    var API = 'https://webhunter-admin.webhunter.workers.dev/api/ebcc/order';
    var dopr = (SHOP.shipping || []).filter(function (x) { return x.active !== false; });
    var dBox = $('[data-doprava]'), pBox = $('[data-platba]'), stav = $('[data-objednavka-stav]'), t0 = Date.now();
    var volba = function (name, val, nazev, male, chk) {
      var l = document.createElement('label'); l.className = 'volba';
      l.innerHTML = '<input type="radio" name="' + name + '" value="' + val + '"' + (chk ? ' checked' : '') + '><span></span>';
      $('span', l).textContent = nazev; if (male) { var m = document.createElement('small'); m.textContent = male; $('span', l).appendChild(m); }
      return l;
    };
    var zbozi = function () { return nacti().filter(function (i) { return katalog[i.slug]; }).reduce(function (s, i) { return s + cenaPolozky(i); }, 0); };
    var vyber = function (n) { var r = $('input[name="' + n + '"]:checked', obj); return r ? r.value : ''; };
    var cenaDopravy = function (d, pay, sum) {
      if (!d) return null;
      var cod = pay === 'dobirka';
      if (SHOP.free_from && sum >= SHOP.free_from) return cod ? Math.max(0, d.cod_price - d.price) : 0;
      return cod ? d.cod_price : d.price;
    };
    var prekresliPlatby = function () {
      var d = dopr.filter(function (x) { return x.id === vyber('doprava'); })[0], cur = vyber('platba') || 'prevod';
      pBox.innerHTML = '';
      var mozne = [['prevod', 'Převodem na účet', 'údaje a QR kód dostanete po odeslání']];
      if (d && d.cod_price != null) mozne.push(['dobirka', 'Dobírkou', 'doplatek za dobírku ' + kc(d.cod_price - d.price)]);
      if (d && d.cash) mozne.push(['hotove', 'Hotově při převzetí', '']);
      if (!mozne.some(function (m) { return m[0] === cur; })) cur = 'prevod';
      mozne.forEach(function (m) { pBox.appendChild(volba('platba', m[0], m[1], m[2], m[0] === cur)); });
      $$('input[name="platba"]', obj).forEach(function (r) { r.addEventListener('change', soucty); });
      var adr = d && d.address;
      ['ulice', 'mesto', 'psc'].forEach(function (n) { var el = $('[name="' + n + '"]', obj); el.required = !!adr; });
    };
    var soucty = function () {
      var d = dopr.filter(function (x) { return x.id === vyber('doprava'); })[0], sum = zbozi(), dp = cenaDopravy(d, vyber('platba'), sum);
      $('[data-souhrn-doprava]').textContent = dp === null ? 'vyberte' : (dp === 0 ? 'zdarma' : kc(dp));
      $('[data-souhrn-celkem]').textContent = kc(sum + (dp || 0));
    };
    dopr.forEach(function (d, i) {
      var male = d.note || '';
      dBox.appendChild(volba('doprava', d.id, d.name + ' – ' + (d.price ? kc(d.price) : 'zdarma'), male, i === 0));
    });
    $$('input[name="doprava"]', obj).forEach(function (r) { r.addEventListener('change', function () { prekresliPlatby(); soucty(); }); });
    prekresliPlatby(); soucty();
    var puvodniVykresli = vykresli;
    vykresli = function () { puvodniVykresli(); soucty(); };
    vykresli();
    obj.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = obj.elements, k = nacti().filter(function (i) { return katalog[i.slug]; });
      if (!k.length) return;
      var d = dopr.filter(function (x) { return x.id === vyber('doprava'); })[0];
      var dp = cenaDopravy(d, vyber('platba'), zbozi());
      var btn = $('button[type="submit"]', obj); btn.disabled = true; stav.textContent = 'Odesílám objednávku…';
      var body = {
        items: k.map(function (i) {
          var p = katalog[i.slug], idx = 0;
          p.varianty.forEach(function (v, n) { if (v[0] === i.ks) idx = n; });
          return { id: i.slug, v: idx, q: i.qty };
        }),
        customer: { name: f.jmeno.value, email: f.email.value, phone: f.telefon.value, street: f.ulice.value, city: f.mesto.value, zip: f.psc.value, note: f.poznamka.value },
        ship: vyber('doprava'), pay: vyber('platba'), agree: f.agree.checked, total: zbozi() + (dp || 0), hp: f.web.value, ms: Date.now() - t0
      };
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (r) {
          btn.disabled = false;
          if (!r.ok) { stav.textContent = r.error || 'Objednávku se nepodařilo odeslat. Zkuste to prosím znovu nebo nám napište na shop@ebcc.cz.'; return; }
          uloz([]);
          var o = $('[data-objednano]'), h = '<h2>Děkujeme, objednávka č. ' + r.num + ' je odeslána</h2>';
          if (r.test) h += '<p class="doplnime">Zkušební objednávka: zboží se nebude odesílat.</p>';
          h += '<p>Celkem k úhradě: <strong>' + kc(r.total) + '</strong>. ' + (r.mailed ? 'Potvrzení jsme poslali na váš e-mail.' : 'Potvrzení e-mailem se nepodařilo odeslat, ozveme se Vám.') + '</p>';
          if (r.pay) {
            if (r.pay.account || r.pay.iban_f) h += '<p>Číslo účtu: <strong>' + (r.pay.account || r.pay.iban_f) + '</strong><br>Variabilní symbol: <strong>' + r.num + '</strong></p>' + (r.pay.qr ? '<div class="qr" style="max-width:200px">' + r.pay.qr + '</div>' : '');
            else h += '<p>Číslo účtu k úhradě Vám pošleme e-mailem.</p>';
          }
          if (SHOP.thanks) h += '<p></p>';
          o.innerHTML = h; if (SHOP.thanks) $('p:last-child', o).textContent = SHOP.thanks;
          o.hidden = false; obj.hidden = true; seznam.hidden = true; prazdny.hidden = true;
          var dn = $('.doplnime'); if (dn) dn.hidden = true;
          window.scrollTo(0, 0);
        })
        .catch(function () { btn.disabled = false; stav.textContent = 'Odeslání se nepodařilo. Zkuste to prosím znovu nebo nám napište na shop@ebcc.cz.'; });
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
