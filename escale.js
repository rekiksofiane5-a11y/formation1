/* ============================================================
   Escale — bac à sable GTM · script partagé
   ============================================================ */
(function () {
  'use strict';

  var VERSION = 'v4';
  var PAGE = document.body.dataset.page;
  var DEVISE = 'EUR';
  var CLE_JOURNAL = 'escale_journal';
  var CLE_HITS = 'escale_hits';
  var CLE_CONSENT = 'escale_consent';
  var MAX_MEMOIRE = 250;

  var VILLES = [
    { code: 'LIS', ville: 'Lisbonne',  pays: 'Portugal', prix_jour: 95,  produit_id: 'ESC-LIS' },
    { code: 'KIX', ville: 'Kyoto',     pays: 'Japon',    prix_jour: 219, produit_id: 'ESC-KIX' },
    { code: 'RAK', ville: 'Marrakech', pays: 'Maroc',    prix_jour: 107, produit_id: 'ESC-RAK' }
  ];
  var DUREES = [4, 7, 10];

  /* Correspondance : événement du dataLayer → événement GA4 conseillé
     et déclencheur GTM à créer. C'est ce tableau qui s'affiche en badges. */
  var CORRESPONDANCE = {
    'gtm.js':            { ga4: '—',          trig: 'Initialisation' },
    'gtm.init':          { ga4: '—',          trig: 'Initialisation du consentement' },
    'gtm.dom':           { ga4: '—',          trig: 'DOM prêt' },
    'gtm.load':          { ga4: '—',          trig: 'Fenêtre chargée' },
    'gtm.click':         { ga4: 'click',      trig: 'Clic — tous les éléments' },
    'gtm.linkClick':     { ga4: 'click',      trig: 'Clic — liens uniquement' },
    'gtm.formSubmit':    { ga4: 'form_submit',trig: 'Envoi de formulaire' },
    'gtm.scrollDepth':   { ga4: 'scroll',     trig: 'Profondeur de défilement' },
    'gtm.elementVisibility': { ga4: 'view_promotion', trig: 'Visibilité d\'un élément' },
    'gtm.historyChange': { ga4: 'page_view',  trig: 'Modification de l\'historique' },
    'gtm.timer':         { ga4: 'timer',      trig: 'Minuteur' },
    'gtm.video':         { ga4: 'video_start',trig: 'Vidéo YouTube' },
    'gtm.triggerGroup':  { ga4: '—',          trig: 'Groupe de déclencheurs' },
    'consent_update':    { ga4: '—',          trig: 'Événement personnalisé' },
    'clic_bouton':          { ga4: 'select_content',       trig: 'Événement personnalisé' },
    'choix_ville':          { ga4: 'select_item',          trig: 'Événement personnalisé' },
    'choix_duree':          { ga4: 'select_item',          trig: 'Événement personnalisé' },
    'reservation_demandee': { ga4: 'begin_checkout',       trig: 'Événement personnalisé' },
    'reservation_confirmee':{ ga4: 'purchase',             trig: 'Événement personnalisé' }
  };

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
  function heure() {
    var d = new Date();
    var p = function (n, l) { return String(n).padStart(l || 2, '0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3);
  }

  /* ========== Mémoire de session (survit aux changements de page) ========== */
  function lire(cle) {
    try { return JSON.parse(sessionStorage.getItem(cle)) || []; }
    catch (e) { return []; }
  }
  function ecrire(cle, tableau) {
    try { sessionStorage.setItem(cle, JSON.stringify(tableau.slice(-MAX_MEMOIRE))); }
    catch (e) {}
  }

  var memoireJournal = lire(CLE_JOURNAL);
  var memoireHits = lire(CLE_HITS);

  /* ========== Rendu d'une entrée ========== */
  var flux = parId('flux');
  var panneauHits = parId('hits');
  var elCompteur = parId('compteur');
  var elCompteurMobile = parId('compteur-mobile');
  var elCompteurHits = parId('compteur-hits');
  var elFiltre = parId('filtre');
  var elMasquer = parId('masquer-gtm');

  function afficher(conteneur, e, ancienne) {
    var vide = conteneur.querySelector('.panneau-vide');
    if (vide) vide.remove();

    var div = document.createElement('div');
    div.className = 'entree' + (e.classe ? ' ' + e.classe : '') + (ancienne ? ' ancienne' : '');
    div.dataset.nom = String(e.nom).toLowerCase();
    div.dataset.gtm = e.classe === 'gtm' ? '1' : '0';

    var tete = document.createElement('div');
    tete.className = 'entree-tete';
    tete.setAttribute('role', 'button');
    tete.setAttribute('tabindex', '0');
    var h = document.createElement('span');
    h.className = 'horo';
    h.textContent = e.horo;
    var n = document.createElement('span');
    n.className = 'nom';
    n.textContent = e.nom;
    tete.appendChild(h);
    tete.appendChild(n);
    div.appendChild(tete);

    var meta = document.createElement('div');
    meta.className = 'meta';
    function badge(classe, texte) {
      var s = document.createElement('span');
      s.className = 'tag ' + classe;
      s.textContent = texte;
      meta.appendChild(s);
    }
    badge('page', e.page);
    var c = CORRESPONDANCE[e.nom];
    if (c) {
      if (c.ga4 && c.ga4 !== '—') badge('ga4', 'GA4 · ' + c.ga4);
      badge('trig', c.trig);
    } else if (e.classe === 'ga4') {
      badge('ga4', 'hit sortant');
    }
    if (e.info) badge('conso', e.info);
    if (meta.children.length) div.appendChild(meta);

    var pre = document.createElement('pre');
    try { pre.textContent = JSON.stringify(e.brut, null, 2); }
    catch (err) { pre.textContent = String(e.brut); }
    div.appendChild(pre);

    var basculer = function () { div.classList.toggle('ouvert'); };
    tete.addEventListener('click', basculer);
    tete.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); basculer(); }
    });

    conteneur.insertBefore(div, conteneur.firstChild);
  }

  function filtrer() {
    var terme = elFiltre.value.trim().toLowerCase();
    var masquer = elMasquer.checked;
    [flux, panneauHits].forEach(function (c) {
      Array.prototype.forEach.call(c.children, function (el) {
        if (!el.dataset || !el.dataset.nom) return;
        var ok = (!terme || el.dataset.nom.indexOf(terme) !== -1) && !(masquer && el.dataset.gtm === '1');
        el.style.display = ok ? '' : 'none';
      });
    });
  }
  elFiltre.addEventListener('input', filtrer);
  elMasquer.addEventListener('change', filtrer);

  /* ========== Journal du dataLayer ========== */
  function nommer(v) {
    if (v && typeof v === 'object' && typeof v.length === 'number' && !Array.isArray(v)) {
      return v[0] === 'consent' ? 'gtag(consent, ' + v[1] + ')' : 'gtag(…)';
    }
    if (v && typeof v === 'object' && v.event) return String(v.event);
    if (v && typeof v === 'object') return '(push sans event)';
    return String(v);
  }
  function classerDL(nom) {
    if (nom.indexOf('gtm.') === 0) return 'gtm';
    if (nom.indexOf('gtag(') === 0 || nom === 'consent_update') return 'conso';
    return '';
  }

  window.__journaliser = function (msg) {
    var nom = nommer(msg);
    var brut = msg;
    if (msg && typeof msg === 'object' && typeof msg.length === 'number' && !Array.isArray(msg)) {
      brut = Array.prototype.slice.call(msg);
    }
    var e = { horo: heure(), nom: nom, brut: brut, page: PAGE, classe: classerDL(nom) };
    memoireJournal.push(e);
    ecrire(CLE_JOURNAL, memoireJournal);
    elCompteur.textContent = memoireJournal.length;
    elCompteurMobile.textContent = memoireJournal.length;
    afficher(flux, e, false);
    filtrer();
  };

  // Historique des pages précédentes, puis les pushes tamponnés de celle-ci.
  var debutPage = memoireJournal.length;
  memoireJournal.forEach(function (e) { afficher(flux, e, true); });
  elCompteur.textContent = memoireJournal.length;
  elCompteurMobile.textContent = memoireJournal.length;
  (window.__tampon || []).forEach(function (m) { window.__journaliser(m); });
  window.__tampon = [];

  /* ========== Hits sortants : GA4, Ads, Meta… ========== */
  var DESTINATIONS = [
    { motif: /google-analytics\.com|analytics\.google\.com|\/g\/collect/, nom: 'GA4' },
    { motif: /googleads\.g\.doubleclick\.net|googleadservices\.com/,      nom: 'Google Ads' },
    { motif: /facebook\.com\/tr/,                                        nom: 'Meta' },
    { motif: /analytics\.tiktok\.com/,                                   nom: 'TikTok' },
    { motif: /adform\.net/,                                              nom: 'Adform' }
  ];
  var vus = {};

  function enregistrerHit(url, corps) {
    if (!url || vus[url + (corps || '')]) return;
    var dest = null;
    for (var i = 0; i < DESTINATIONS.length; i++) {
      if (DESTINATIONS[i].motif.test(url)) { dest = DESTINATIONS[i].nom; break; }
    }
    if (!dest) return;
    vus[url + (corps || '')] = 1;

    var params = {};
    try {
      var q = new URLSearchParams(url.split('?')[1] || '');
      q.forEach(function (v, k) { params[k] = v; });
    } catch (e) {}
    if (corps) {
      try {
        String(corps).split('\n').forEach(function (ligne) {
          new URLSearchParams(ligne).forEach(function (v, k) { params[k] = v; });
        });
      } catch (e) {}
    }

    var nomEvt = params.en || params.ev || params.t || 'hit';

    // Lecture du signal de consentement transporté par le hit.
    var gcs = params.gcs || '';
    var lecture = '';
    if (/^G1[01][01]$/.test(gcs)) {
      lecture = 'ad_storage ' + (gcs.charAt(2) === '1' ? 'granted' : 'denied') +
                ' · analytics_storage ' + (gcs.charAt(3) === '1' ? 'granted' : 'denied');
    } else if (gcs) {
      lecture = 'gcs ' + gcs;
    }
    var cookieGa = document.cookie.indexOf('_ga=') !== -1 ? 'présent' : 'absent';

    var e = {
      horo: heure(),
      nom: dest + ' · ' + nomEvt,
      brut: {
        destination: dest,
        mesure_id: params.tid || params.id || '',
        evenement: nomEvt,
        consentement_gcs: gcs || '(absent)',
        consentement_lu: lecture || '(non transmis)',
        cookie_ga: cookieGa,
        parametres: params,
        url: url.split('?')[0]
      },
      info: lecture ? gcs + ' · ' + lecture : '',
      page: PAGE,
      classe: 'ga4'
    };
    memoireHits.push(e);
    ecrire(CLE_HITS, memoireHits);
    elCompteurHits.textContent = memoireHits.length;
    afficher(panneauHits, e, false);
    filtrer();
  }

  memoireHits.forEach(function (e) { afficher(panneauHits, e, true); });
  elCompteurHits.textContent = memoireHits.length;

  // 1) Observateur de ressources : capte les requêtes en GET (image, beacon, script).
  try {
    var po = new PerformanceObserver(function (liste) {
      liste.getEntries().forEach(function (r) { enregistrerHit(r.name, ''); });
    });
    po.observe({ type: 'resource', buffered: true });
  } catch (e) {}

  // 2) sendBeacon et fetch : captent aussi le corps des requêtes POST.
  if (navigator.sendBeacon) {
    var beaconOrigine = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      try { enregistrerHit(String(url), typeof data === 'string' ? data : ''); } catch (e) {}
      return beaconOrigine(url, data);
    };
  }
  var fetchOrigine = window.fetch;
  if (fetchOrigine) {
    window.fetch = function (entree, options) {
      try {
        var url = typeof entree === 'string' ? entree : (entree && entree.url) || '';
        enregistrerHit(url, options && typeof options.body === 'string' ? options.body : '');
      } catch (e) {}
      return fetchOrigine.apply(this, arguments);
    };
  }

  /* ========== escaleTag() — balises HTML personnalisé ========== */
  window.escaleTag = function (nom, donnees) {
    var e = {
      horo: heure(),
      nom: 'Balise · ' + (nom || 'sans nom'),
      brut: donnees === undefined ? { declenchee: true } : donnees,
      page: PAGE,
      classe: 'balise'
    };
    memoireHits.push(e);
    ecrire(CLE_HITS, memoireHits);
    elCompteurHits.textContent = memoireHits.length;
    afficher(panneauHits, e, false);
    return true;
  };
  (window.__tagsEnAttente || []).forEach(function (a) { window.escaleTag(a[0], a[1]); });
  window.__tagsEnAttente = [];

  /* ========== Dock ========== */
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

  parId('btn-effacer').addEventListener('click', function () {
    memoireJournal = []; memoireHits = []; vus = {};
    ecrire(CLE_JOURNAL, []); ecrire(CLE_HITS, []);
    flux.innerHTML = '<p class="panneau-vide">Journal vidé, y compris l\'historique des pages précédentes.</p>';
    panneauHits.innerHTML = '<p class="panneau-vide">Aucun hit.</p>';
    elCompteur.textContent = '0'; elCompteurMobile.textContent = '0'; elCompteurHits.textContent = '0';
  });

  parId('btn-copier').addEventListener('click', function () {
    var texte = JSON.stringify({ dataLayer: memoireJournal, hits: memoireHits }, null, 2);
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

  /* ========== Consent Mode v2 ========== */
  var pastilles = document.querySelectorAll('.pastille');
  var etatConsent = window.__consentInitial || {};

  function peindre() {
    pastilles.forEach(function (p) {
      var v = etatConsent[p.dataset.consent] || 'denied';
      p.dataset.etat = v;
      p.textContent = p.dataset.consent + ' : ' + v;
    });
  }
  function appliquer(maj, origine) {
    Object.keys(maj).forEach(function (k) { etatConsent[k] = maj[k]; });
    try { sessionStorage.setItem(CLE_CONSENT, JSON.stringify(etatConsent)); } catch (e) {}
    peindre();
    gtag('consent', 'update', maj);
    dataLayer.push({ event: 'consent_update', consentement: maj, origine: origine });
  }
  pastilles.forEach(function (p) {
    p.addEventListener('click', function () {
      var maj = {};
      maj[p.dataset.consent] = p.dataset.etat === 'granted' ? 'denied' : 'granted';
      appliquer(maj, 'pastille');
    });
  });
  function tout(etat, origine) {
    var maj = {};
    pastilles.forEach(function (p) { maj[p.dataset.consent] = etat; });
    appliquer(maj, origine);
  }
  parId('btn-tout-accepter').addEventListener('click', function () { tout('granted', 'bandeau-accepter'); });
  parId('btn-tout-refuser').addEventListener('click', function () { tout('denied', 'bandeau-refuser'); });
  peindre();

  /* ========== Chargement du conteneur GTM ========== */
  var etatGtm = parId('etat-gtm');
  var champId = parId('id-conteneur');
  var elDiag = parId('diagnostic');
  var dejaCharge = false;
  var lignes = [];
  function diag(t) { lignes.push(t); elDiag.innerHTML = lignes.join('<br>'); }

  diag('<em>escale.js ' + VERSION + '</em> · page_path : ' + location.pathname + ' · page_type : ' + PAGE +
       ' · <em>' + debutPage + ' événements repris des pages précédentes</em>');
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
    try { sessionStorage.setItem('escale_gtm', id); } catch (e) {}

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

  var idMemorise = '';
  try { idMemorise = sessionStorage.getItem('escale_gtm') || ''; } catch (e) {}
  charger(param('gtm') || idMemorise || champId.value);

  /* ========== Clics de boutons ========== */
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

  /* ========== PAGE ACCUEIL ========== */
  if (PAGE === 'accueil') {
    var listeVilles = parId('liste-villes');
    VILLES.forEach(function (v) {
      var b = document.createElement('button');
      b.className = 'btn-mini creux';
      b.id = 'ville-' + v.code;
      b.textContent = v.ville;
      b.addEventListener('click', function () {
        dataLayer.push({
          event: 'choix_ville', ville: v.ville, pays: v.pays,
          ville_code: v.code, prix_jour: v.prix_jour
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

  /* ========== PAGE DESTINATIONS ========== */
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
            event: 'choix_duree', ville: v.ville, ville_code: v.code,
            nombre_jours: jours, prix_jour: v.prix_jour,
            montant: v.prix_jour * jours, devise: DEVISE
          });
        });
        zoneJours.appendChild(b);
      });
      rafraichir();

      el.querySelector('#reserver-' + v.code).addEventListener('click', function () {
        var montant = v.prix_jour * jours;
        dataLayer.push({
          event: 'clic_bouton', bouton_id: 'reserver-' + v.code,
          bouton_libelle: 'Réserver', bouton_zone: 'carte_destination'
        });
        dataLayer.push({
          event: 'reservation_demandee', produit_id: v.produit_id + '-' + jours,
          ville: v.ville, ville_code: v.code, pays: v.pays,
          nombre_jours: jours, prix_jour: v.prix_jour, montant: montant, devise: DEVISE
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

  /* ========== PAGE MERCI ========== */
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

    function conversion() {
      dataLayer.push({
        event: 'reservation_confirmee', transaction_id: commande,
        ville: v.ville, ville_code: v.code, pays: v.pays,
        nombre_jours: jours, prix_jour: v.prix_jour, montant: montant, devise: DEVISE
      });
    }
    conversion();

    parId('btn-repush').addEventListener('click', function () {
      conversion();
      annoncer(parId('msg-repush'), 'Conversion repoussée avec le même transaction_id. Votre balise s\'est-elle déclenchée deux fois ?', true);
    });
  }
})();
