/* =========================================================
   autosauvegarde.js : sauvegarde automatique dans un dossier
   de ton PC (par exemple dans OneDrive).

   Fonctionnement :
   - tu choisis un dossier une seule fois ;
   - quelques secondes après chaque modification, le site
     réécrit le fichier « geopo-sauvegarde-auto.json » ;
   - une fois par jour, il range aussi une copie de secours
     datée dans le sous-dossier « secours » (7 dernières gardées).

   Limite de sécurité de Chrome / Edge : à chaque nouvelle
   ouverture du site, il faut redonner l'autorisation d'écrire
   (un clic sur « Reprendre la sauvegarde auto »).
   ========================================================= */

/* Petit rangement dans IndexedDB pour se souvenir du dossier choisi */
const BaseDossier = {
  ouvrir() {
    return new Promise((ok, ko) => {
      const req = indexedDB.open('geopo-revision', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('reglages');
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ko(req.error);
    });
  },
  async operation(mode, action) {
    const db = await this.ouvrir();
    return new Promise((ok, ko) => {
      const tx = db.transaction('reglages', mode);
      const req = action(tx.objectStore('reglages'));
      tx.oncomplete = () => { db.close(); ok(req.result); };
      tx.onerror = () => { db.close(); ko(tx.error); };
    });
  },
  lire() { return this.operation('readonly', (s) => s.get('dossier-sauvegarde')); },
  ecrire(dossier) { return this.operation('readwrite', (s) => s.put(dossier, 'dossier-sauvegarde')); },
  effacer() { return this.operation('readwrite', (s) => s.delete('dossier-sauvegarde')); },
};

const AutoSauvegarde = {
  NOM_FICHIER: 'geopo-sauvegarde-auto.json',
  DOSSIER_SECOURS: 'secours',
  NB_SECOURS: 7,
  DELAI_MS: 3000,

  dossier: null,
  /* États possibles :
     'non-supportee' : navigateur incompatible (Firefox...)
     'inactive'      : aucun dossier choisi
     'pause'         : dossier connu, autorisation à redonner
     'active'        : tout fonctionne
     'erreur'        : la dernière écriture a échoué */
  etat: 'inactive',
  enCours: false,
  enAttente: false,
  aRefaire: false,
  derniereEcriture: null,
  minuteur: null,

  supportee() {
    return typeof window.showDirectoryPicker === 'function' && window.isSecureContext !== false && 'indexedDB' in window;
  },

  /** Au démarrage du site */
  async init() {
    if (!this.supportee()) { this.etat = 'non-supportee'; this.maj(); return; }
    try { this.dossier = (await BaseDossier.lire()) || null; } catch (e) { this.dossier = null; }
    if (!this.dossier) { this.etat = 'inactive'; this.maj(); return; }
    let permission = 'prompt';
    try { permission = await this.dossier.queryPermission({ mode: 'readwrite' }); } catch (e) { /* rien */ }
    if (permission === 'granted') {
      this.etat = 'active';
      await this.ecrire();
    } else {
      this.etat = 'pause';
    }
    this.maj();
    // Met à jour « il y a X minutes » régulièrement
    setInterval(() => this.maj(), 30000);
  },

  /** Choix du dossier (bouton « Activer » ou « Changer de dossier ») */
  async choisirDossier() {
    if (!this.supportee()) {
      toast('Ton navigateur ne permet pas la sauvegarde automatique. Utilise Chrome ou Edge.', 'erreur', 6000);
      return;
    }
    let dossier;
    try {
      dossier = await window.showDirectoryPicker({ id: 'geopo-sauvegarde', mode: 'readwrite', startIn: 'documents' });
    } catch (e) {
      if (e.name !== 'AbortError') toast("Impossible d'utiliser ce dossier : " + e.message, 'erreur', 6000);
      return;
    }
    this.dossier = dossier;
    try { await BaseDossier.ecrire(dossier); } catch (e) { /* le dossier marchera quand même pour cette séance */ }
    this.etat = 'active';
    const ok = await this.ecrire();
    if (ok) toast(`Sauvegarde automatique activée : ton travail est copié dans le dossier « ${dossier.name} ».`, 'info', 6000);
    this.maj();
  },

  /** Redonne l'autorisation après une réouverture du site (doit venir d'un clic) */
  async reprendre() {
    if (!this.dossier) return this.choisirDossier();
    let permission = 'denied';
    try { permission = await this.dossier.requestPermission({ mode: 'readwrite' }); } catch (e) { /* rien */ }
    if (permission === 'granted') {
      this.etat = 'active';
      const ok = await this.ecrire();
      if (ok) toast(`Sauvegarde automatique reprise : le fichier dans « ${this.dossier.name} » est à jour.`);
    } else {
      toast("Autorisation refusée : la sauvegarde automatique reste en pause.", 'attention');
    }
    this.maj();
  },

  async desactiver() {
    clearTimeout(this.minuteur);
    try { await BaseDossier.effacer(); } catch (e) { /* rien */ }
    this.dossier = null;
    this.etat = 'inactive';
    this.enAttente = false;
    toast('Sauvegarde automatique désactivée. Les fichiers déjà enregistrés sont conservés.');
    this.maj();
  },

  /** Appelé après chaque modification : écrit quelques secondes plus tard */
  planifier() {
    if (this.etat !== 'active' && this.etat !== 'erreur') return;
    this.enAttente = true;
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.ecrire(), this.DELAI_MS);
    this.maj();
  },

  /** Écrit tout de suite (si une écriture est prévue) */
  maintenant() {
    if (this.enAttente) { clearTimeout(this.minuteur); this.ecrire(); }
  },

  /** Écrit le fichier principal et, une fois par jour, la copie de secours. Renvoie true si réussi. */
  async ecrire() {
    if (!this.dossier || (this.etat !== 'active' && this.etat !== 'erreur')) return false;
    if (this.enCours) { this.aRefaire = true; return true; }
    this.enCours = true;
    this.enAttente = false;
    this.maj();
    const contenu = Stockage.exporter();
    let reussi = false;
    try {
      await this.copieDeSecours(contenu); // d'abord la copie du jour (état avant les modifications du jour)
      await this.ecrireFichier(this.dossier, this.NOM_FICHIER, contenu);
      this.derniereEcriture = new Date();
      if (this.etat === 'erreur') toast('Sauvegarde automatique rétablie.');
      this.etat = 'active';
      reussi = true;
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
        this.etat = 'pause';
      } else {
        if (this.etat !== 'erreur') {
          toast("La sauvegarde automatique a échoué (fichier ouvert ailleurs ou dossier déplacé ?). Nouvel essai à la prochaine modification.", 'erreur', 8000);
        }
        this.etat = 'erreur';
      }
    }
    this.enCours = false;
    if (this.aRefaire) { this.aRefaire = false; this.planifier(); }
    this.maj();
    return reussi;
  },

  async ecrireFichier(dossier, nom, contenu) {
    const fichier = await dossier.getFileHandle(nom, { create: true });
    const flux = await fichier.createWritable();
    await flux.write(contenu);
    await flux.close();
  },

  /** Une copie datée par jour dans « secours », en gardant les 7 plus récentes */
  async copieDeSecours(contenu) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const nom = `geopo-secours-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
    const secours = await this.dossier.getDirectoryHandle(this.DOSSIER_SECOURS, { create: true });
    try {
      await secours.getFileHandle(nom); // existe déjà aujourd'hui : rien à faire
      return;
    } catch (e) {
      if (e.name !== 'NotFoundError') throw e;
    }
    await this.ecrireFichier(secours, nom, contenu);
    const noms = [];
    for await (const [n] of secours.entries()) if (/^geopo-secours-\d{4}-\d{2}-\d{2}\.json$/.test(n)) noms.push(n);
    noms.sort().reverse();
    for (const ancien of noms.slice(this.NB_SECOURS)) {
      try { await secours.removeEntry(ancien); } catch (e) { /* tant pis */ }
    }
  },

  /** Petit message d'état dans le menu */
  texteEtat() {
    switch (this.etat) {
      case 'non-supportee': return { texte: 'Sauvegarde auto indisponible dans ce navigateur', classe: 'alerte' };
      case 'inactive': return { texte: 'Sauvegarde auto désactivée', classe: '' };
      case 'pause': return { texte: '⏸️ Sauvegarde auto en pause', classe: 'alerte' };
      case 'erreur': return { texte: '⚠️ Échec de la sauvegarde auto', classe: 'alerte' };
      default:
        if (this.enCours) return { texte: `💾 Enregistrement dans « ${this.dossier.name} »…`, classe: 'ok' };
        if (this.enAttente) return { texte: '⏳ Modification en attente d\'enregistrement…', classe: 'ok' };
        return { texte: `✅ Fichier à jour (${U.depuis(this.derniereEcriture && this.derniereEcriture.toISOString())})`, classe: 'ok' };
    }
  },

  /** Met à jour l'affichage (menu, bandeau, page Sauvegarde) */
  maj() {
    if (typeof App === 'undefined' || !document.getElementById('etat-sauvegarde')) return;
    App.majEtatSauvegarde();
    // La page Sauvegarde n'est redessinée que si l'état change (active, en pause...)
    if (this.etat !== this.dernierEtatAffiche && App.lireAdresse().nom === 'sauvegarde' && !Modal.pile.length) App.rafraichir();
    this.dernierEtatAffiche = this.etat;
  },
};

// Si on quitte la page ou change d'onglet, on écrit sans attendre
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') AutoSauvegarde.maintenant();
});
