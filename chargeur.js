/*
  CHARGEUR ANONYME DE LA BOUTIQUE — https://boutique.fsggb.fr (depot GitHub
  JavaBatchCSS/boutique-gdb, fichier chargeur.js). Toutes les pages du depot
  (index.html, vendeur/, admin/, test/) sont la meme coquille
  (chargeur-boutique.html) qui charge ce fichier.

  Pourquoi : ouverte par son adresse script.google.com, la boutique passe par
  le compte Google connecte dans le navigateur, et Google refuse certains
  comptes (page « Impossible d'ouvrir le fichier pour le moment »). Ici la
  page est demandee SANS AUCUN cookie : tout visiteur est anonyme, quel que
  soit son navigateur ou ses comptes Google. Voir BACK_AppelsAnonymes.js.

  Adresses : https://boutique.fsggb.fr/vendeur (ou /admin, /test) = page
  ?mode=vendeur ; tous les parametres de l'adresse sont transmis, et un
  ?mode= explicite l'emporte sur le chemin.

  Rapidite (boutique client seulement) : Apps Script met ~4 s a produire la
  page. La derniere page recue est gardee dans le navigateur et affichee
  AUSSITOT a la visite suivante, pendant que la page a jour est demandee ;
  celle-ci remplace la copie si le visiteur n'a encore rien touche, sinon
  elle servira a la visite suivante. Le stock reel est de toute facon
  verifie par le serveur au moment de la commande.
  La page est affichee dans un cadre (iframe srcdoc) : la remplacer repart
  d'une page neuve, sans minuteries ni variables de la precedente.
*/
(function () {
  var EXEC = "https://script.google.com/macros/s/AKfycbwW5GeOkiFxzGFXulOqIjNqGaZEMEk8QnHiHujMLhS59MN09ECAXTZITMmCuFcn3aLD/exec";
  var CACHE_DUREE_MAX = 7 * 86400000;

  // /vendeur, /admin, /test (aussi sous l'ancienne adresse /boutique-gdb/...).
  var chemin = location.pathname.match(/\/(vendeur|admin|test)\/?(?:index\.html)?$/);
  var MODE = chemin ? chemin[1] : "";

  var params = new URLSearchParams(location.search);
  // Copie locale seulement pour la boutique client sans parametre : une
  // page vendeur/admin ou un lien personnel (?verify=, ?ref=...) n'est
  // jamais garde.
  var cacheActif = !MODE && !Array.from(params.keys()).length;
  var CLE_CACHE = "boutique-gdb-page-client";
  if (MODE && !params.has("mode")) params.set("mode", MODE);
  params.set("format", "brut");

  var cadre = null;
  var touche = false;
  function noterInteraction() { touche = true; }

  function afficher(html) {
    var nouveau = document.createElement("iframe");
    nouveau.className = "page";
    nouveau.title = document.title;
    nouveau.addEventListener("load", function () {
      try {
        ["pointerdown", "keydown", "input", "touchstart"].forEach(function (type) {
          nouveau.contentWindow.addEventListener(type, noterInteraction, true);
        });
        if (nouveau.contentDocument.title) document.title = nouveau.contentDocument.title;
      } catch (e) { touche = true; }   // sans suivi possible : jamais de remplacement
    });
    nouveau.srcdoc = html;
    document.body.appendChild(nouveau);
    if (cadre) cadre.remove();
    cadre = nouveau;
    var attente = document.getElementById("chargeur");
    if (attente) attente.remove();
  }

  function lireCache() {
    if (!cacheActif) return null;
    try {
      var copie = JSON.parse(localStorage.getItem(CLE_CACHE) || "null");
      if (copie && typeof copie.html === "string" && Date.now() - copie.date < CACHE_DUREE_MAX) return copie;
    } catch (e) { /* stockage indisponible : chargement normal */ }
    return null;
  }

  function ecrireCache(html) {
    if (!cacheActif) return;
    try { localStorage.setItem(CLE_CACHE, JSON.stringify({ date: Date.now(), html: html })); } catch (e) { /* plein ou bloque */ }
  }

  function echec(raison) {
    var attente = document.getElementById("chargeur");
    if (!attente) return;   // une copie est deja affichee : on la garde
    var lien = EXEC + (MODE ? "?mode=" + encodeURIComponent(MODE) : "");
    attente.innerHTML =
      "<p>La boutique n'a pas pu être chargée (" + String(raison).replace(/</g, "&lt;") + ").</p>" +
      '<p><a href="' + location.href.replace(/"/g, "%22") + '">Réessayer</a> · ' +
      '<a href="' + lien + '" target="_blank" rel="noopener">Ouvrir la boutique par Google</a></p>';
  }

  var copie = lireCache();
  if (copie) afficher(copie.html);

  fetch(EXEC + "?" + params.toString(), { credentials: "omit" })
    .then(function (r) {
      if (!r.ok) throw new Error("erreur " + r.status);
      return r.json();
    })
    .then(function (page) {
      if (!page || typeof page.html !== "string") throw new Error("réponse inattendue");
      ecrireCache(page.html);
      if (!copie || (!touche && page.html !== copie.html)) afficher(page.html);
    })
    .catch(function (err) { echec(err && err.message || err); });
})();
