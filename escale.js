/* ============================================================
   Escale — bac à sable GTM · script partagé
   ============================================================ */
(function () {
  'use strict';

  var PAGE = document.body.dataset.page;   // accueil | destinations | merci
  var DEVISE = 'EUR';

  var VILLES = [
    { code: 'LIS', ville: 'Lisbonne',  pays: 'Portugal', prix_jour: 95,  produit_id: 'ESC-LIS' },
    { code: 'KIX', ville: 'Kyoto',     pays: 'Japon',    prix_jour: 219, produit_id: 'ESC-KIX' },
    { code: 'RAK', ville: 'Marrakech', pays: 'Maroc',    prix_jour: 107, produit_id: 'ESC-RAK' }
  ];
  var DUREES = [4, 7, 10];

  function parId(id) { return document.getElementById(id); }
  function euro(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  function param(nom) {
    var m = location.search.match(new RegExp('[?&]' + nom + '=([^&]*)'));
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }
  function annoncer(el, texte, erreur) {
    if (!el) return;
    el.hidden = false;
    el.className = erreur ? 'msg err' : 'msg';
    el.textContent = texte;
  }

  /* ========== 1. Journal du dataLayer ========== */
  var flux = parId('flux');
  var elCompteur = parId('compteur');
  var elCompteurMobile = parId('compteur-mobile');
  var elFiltre = parId('filtre');
  var elMasquer = parId('masquer-gtm');
  var total = 0;

  function heure() {
    var d = new Date();
    var p = function (n, l) { return String(n).padStart(l || 2, '0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3);
  }

  function nommer(v) {
    if (v && typeof v === 'object' && typeof v.length === 'number' && !Array.isArray(v)) return 'gtag(…)';
    if (v && typeof v === 'object' && v.event) return String(v.event);
    if (v && typeof v === 'object') return '(push sans event)';
    return String(v);
  }

  function ajouterEntree(conteneur, nom, brut, classe) {
    var vide = conteneur.querySelector('.panneau-vide');
    if (vide) vide.remove();

    var div = document.createElement('div');
    div.className = 'entree' + (classe ? ' ' + classe : '');
    div.dataset.nom = String(nom).toLowerCase();
    div.dataset.gtm = classe === 'gtm' ? '1' : '0';

    var tete = document.createElement('div');
    tete.className = 'entree-tete';
    tete.setAttribute('role', 'button');
    tete.setAttribute('tabindex', '0');

    var h = document.createElement('span');
    h.className = 'horo';
    h.textContent = heure();
    var n = document.createElement('span');
    n.className = 'nom';
    n.textContent = nom;
    tete.appendChild(h);
    tete.appendChild(n);

    var pre = document.createElement('pre');
    try { pre.textContent = JSON.stringify(brut, null, 2); }
    catch (e) { pre.textContent = String(brut); }

    var basculer = function () { div.classList.toggle('ouvert'); };
    tete.addEventListener('click', basculer);
    tete.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); basculer(); }
    });

    div.appendChild(tete);
    div.appendChild(pre);
    conteneur.insertBefore(div, conteneur.firstChild);
  }

  window.__journaliser = function (msg) {
    var nom = nommer(msg);
    window.__journal.push({ horo: heure(), nom: nom, brut: msg });
    total++;
    if (elCompteur) elCompteur.textContent = total;
    if (elCompteurMobile) elCompteurMobile.textContent = total;
    ajouterEntree(flux, nom, msg, nom.indexOf('gtm.') === 0 ? 'gtm' : '');
    filtrer();
  };
  (window.__tampon || []).forEach(function (m) { window.__journaliser(m); });
  window.__tampon = [];

  function filtrer() {
    var terme = elFiltre.value.trim().toLowerCase();
    var masquer = elMasquer.checked;
    Array.prototype.forEach.call(flux.children, function (el) {
      if (!el.dataset || !el.dataset.nom) return;
      var ok = (!terme || el.dataset.nom.indexOf(terme) !== -1) && !(masquer && el.dataset.gtm === '1');
      el.style.display = ok ? '' : 'none';
    });
  }
  elFiltre.addEventListener('input', filtrer);
  elMasquer.addEventListener('change', filtrer);

  parId('btn-effacer').addEventListener('click', function () {
    flux.innerHTML = '<p class="panneau-vide">Journal effacé.</p>';
  });

  parId('btn-copier').addEventListener('click', function () {
    var texte = JSON.stringify(window.__journal, null, 2);
    var b = this;
    var fini = function () { b.textContent = 'copié'; setTimeout(function () { b.textContent = 'copier'; }, 1500); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texte).then(fini, function () { secours(texte, fini); });
    } else { secours(texte, fini); }
  });
  function secours(texte, fini) {
    var ta = document.createElement('textarea');
    ta.value = texte; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); fini(); } catch (e) {}
    ta.remove();
  }

  /* ========== 2. Panneau des balises (appelé depuis GTM) ========== */
  var panneauBalises = parId('balises');
  var compteurBalises = parId('compteur-balises');
  var nbBalises = 0;

  window.escaleTag = function (nom, donnees) {
    nbBalises++;
    compteurBalises.textContent = nbBalises;
    ajouterEntree(panneauBalises, nom || 'balise sans nom',
      donnees === undefined ? { declenchee: true } : donnees, 'balise');
    return true;
  };
  (window.__tagsEnAttente || []).forEach(function (a) { window.escaleTag(a[0], a[1]); });
  window.__tagsEnAttente = [];

  document.querySelectorAll('.dock-tete button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.dock-tete button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.panneau').forEach(function (p) { p.dataset.actif = '0'; });
      b.setAttribute('aria-selected', 'true');
      parId(b.dataset.panneau).dataset.actif = '1';
    });
  });

  var dock = parId('dock');
  var bascule = parId('dock-bascule');
  bascule.addEventListener('click', function () {
    var ouvert = dock.classList.toggle('ouvert');
    bascule.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  });

  /* ========== 3. Chargement du conteneur GTM ========== */
  var etatGtm = parId('etat-gtm');
  var champId = parId('id-conteneur');
  var elDiag = parId('diagnostic');
  var dejaCharge = false;
  var lignes = [];
  function diag(t) { lignes.push(t); elDiag.innerHTML = lignes.join('<br>'); }

  diag('<em>page_path : ' + location.pathname + '</em> · page_type : ' + PAGE);
  if (location.protocol === 'file:') {
    diag('<b>Page ouverte en file:// —</b> l\'aperçu Tag Assistant ne peut pas s\'y connecter.');
  }

  function propagerLiens(id) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href) || href.indexOf('gtm=') !== -1) return;
      a.setAttribute('href', href + (href.indexOf('?') === -1 ? '?' : '&') + 'gtm=' + id);
    });
  }
  window.__gtmActuel = function () { return champId.value.trim(); };

  function charger(id) {
    if (dejaCharge) return;
    var trouve = String(id).toUpperCase().match(/GTM-[A-Z0-9]+/);
    if (!trouve) {
      etatGtm.className = 'etat ko';
      etatGtm.textContent = 'Format attendu : GTM-XXXXXXX';
      return;
    }
    id = trouve[0];
    champId.value = id;
    dejaCharge = true;
    propagerLiens(id);

    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    s.onload = function () {
      window.__installerHook();
      etatGtm.className = 'etat ok';
      etatGtm.textContent = id + ' — chargé';
      setTimeout(function () {
        if (window.google_tag_manager && window.google_tag_manager[id]) {
          etatGtm.textContent = id + ' actif';
        } else {
          etatGtm.className = 'etat ko';
          etatGtm.textContent = id + ' — non initialisé';
          diag('<s>Conteneur non initialisé</s> — identifiant inexistant ou jamais publié.');
        }
      }, 2500);
    };
    s.onerror = function () {
      dejaCharge = false;
      etatGtm.className = 'etat ko';
      etatGtm.textContent = 'gtm.js bloqué';
      diag('<s>gtm.js bloqué</s> — bloqueur de publicités ou proxy d\'entreprise.');
    };
    document.head.appendChild(s);
    etatGtm.className = 'etat';
    etatGtm.textContent = 'Chargement…';
  }

  parId('btn-charger').addEventListener('click', function () { charger(champId.value); });
  champId.addEventListener('keydown', function (e) { if (e.key === 'Enter') charger(champId.value); });
  charger(param('gtm') || champId.value);

  /* ========== 4. Clics de boutons — bouton_id, bouton_libelle, bouton_zone ========== */
  document.querySelectorAll('[data-bouton-id]').forEach(function (b) {
    b.addEventListener('click', function () {
      dataLayer.push({
        event: 'clic_bouton',
        bouton_id: b.dataset.boutonId,
        bouton_libelle: b.textContent.trim(),
        bouton_zone: b.dataset.boutonZone || 'non renseignee'
      });
    });
  });

  /* ========== 5. PAGE ACCUEIL ========== */
  if (PAGE === 'accueil') {
    var listeVilles = parId('liste-villes');
    VILLES.forEach(function (v) {
      var b = document.createElement('button');
      b.className = 'btn-mini creux';
      b.id = 'ville-' + v.code;
      b.textContent = v.ville;
      b.addEventListener('click', function () {
        dataLayer.push({
          event: 'choix_ville',
          ville: v.ville,
          pays: v.pays,
          ville_code: v.code,
          prix_jour: v.prix_jour
        });
        annoncer(parId('msg-ville'), v.ville + ' retenue. Direction la page Destinations…');
        var gtm = window.__gtmActuel();
        setTimeout(function () {
          location.href = 'destinations.html?ville=' + v.code + (gtm ? '&gtm=' + gtm : '');
        }, 800);
      });
      listeVilles.appendChild(b);
    });
  }

  /* ========== 6. PAGE DESTINATIONS ========== */
  if (PAGE === 'destinations') {
    var preselection = param('ville');
    var conteneur = parId('liste-offres');

    VILLES.forEach(function (v) {
      var jours = 7;

      var el = document.createElement('article');
      el.className = 'ville';
      el.innerHTML =
        '<div class="code-vol">' + v.code + ' · ' + euro(v.prix_jour) + ' / jour</div>' +
        '<h3>' + v.ville + '</h3>' +
        '<div class="pays">' + v.pays + '</div>' +
        '<div class="jours" id="jours-' + v.code + '"></div>' +
        '<div class="montant" id="montant-' + v.code + '"></div>' +
        '<button class="btn-mini" id="reserver-' + v.code + '">Réserver</button>';
      conteneur.appendChild(el);

      var zoneJours = el.querySelector('#jours-' + v.code);
      var zoneMontant = el.querySelector('#montant-' + v.code);

      function rafraichir() {
        zoneMontant.innerHTML = euro(v.prix_jour * jours) +
          '<small>' + jours + ' jours × ' + euro(v.prix_jour) + '</small>';
        zoneJours.querySelectorAll('button').forEach(function (b) {
          b.setAttribute('aria-pressed', String(Number(b.dataset.jours) === jours));
        });
      }

      DUREES.forEach(function (d) {
        var b = document.createElement('button');
        b.id = 'duree-' + v.code + '-' + d;
        b.dataset.jours = d;
        b.textContent = d + ' j';
        b.addEventListener('click', function () {
          jours = d;
          rafraichir();
          dataLayer.push({
            event: 'choix_duree',
            ville: v.ville,
            ville_code: v.code,
            nombre_jours: jours,
            prix_jour: v.prix_jour,
            montant: v.prix_jour * jours,
            devise: DEVISE
          });
        });
        zoneJours.appendChild(b);
      });
      rafraichir();

      el.querySelector('#reserver-' + v.code).addEventListener('click', function () {
        var montant = v.prix_jour * jours;
        dataLayer.push({
          event: 'clic_bouton',
          bouton_id: 'reserver-' + v.code,
          bouton_libelle: 'Réserver',
          bouton_zone: 'carte_destination'
        });
        dataLayer.push({
          event: 'reservation_demandee',
          produit_id: v.produit_id + '-' + jours,
          ville: v.ville,
          ville_code: v.code,
          pays: v.pays,
          nombre_jours: jours,
          prix_jour: v.prix_jour,
          montant: montant,
          devise: DEVISE
        });
        annoncer(parId('msg-reservation'), v.ville + ', ' + jours + ' jours, ' + euro(montant) + ' — confirmation en cours…');
        var gtm = window.__gtmActuel();
        setTimeout(function () {
          location.href = 'merci.html?ville=' + v.code + '&jours=' + jours + '&montant=' + montant + (gtm ? '&gtm=' + gtm : '');
        }, 900);
      });

      if (preselection === v.code) {
        el.style.outline = '2px solid var(--signal)';
        el.style.outlineOffset = '2px';
      }
    });
  }

  /* ========== 7. PAGE MERCI ========== */
  if (PAGE === 'merci') {
    var code = param('ville') || 'RAK';
    var v = VILLES.filter(function (x) { return x.code === code; })[0] || VILLES[2];
    var jours = parseInt(param('jours'), 10) || 7;
    var montant = parseFloat(param('montant')) || v.prix_jour * jours;
    var commande = 'ESC-' + code + '-' + Date.now().toString().slice(-6);

    parId('recu-numero').textContent = commande;
    parId('recu-ville').textContent = v.ville + ' (' + v.pays + ')';
    parId('recu-jours').textContent = jours + ' jours';
    parId('recu-montant').textContent = euro(montant);

    function pousserConversion() {
      dataLayer.push({
        event: 'reservation_confirmee',
        transaction_id: commande,
        ville: v.ville,
        ville_code: v.code,
        pays: v.pays,
        nombre_jours: jours,
        prix_jour: v.prix_jour,
        montant: montant,
        devise: DEVISE
      });
    }
    pousserConversion();

    parId('btn-repush').addEventListener('click', function () {
      pousserConversion();
      annoncer(parId('msg-repush'), 'Conversion repoussée avec le même transaction_id. Votre balise s\'est-elle déclenchée deux fois ?', true);
    });
  }
})();
