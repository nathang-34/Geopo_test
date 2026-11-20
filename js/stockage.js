/* =========================================================
   stockage.js : toutes les données du site
   Elles sont rangées dans le navigateur (localStorage) sous
   une seule clé, et peuvent être exportées / importées en
   fichier JSON (page Sauvegarde).
   ========================================================= */

const VERSION_DONNEES = 1;
const CLE_STOCKAGE = 'geopo-revision-donnees';

const Stockage = {
  donnees: null,
  disponible: true,

  /** Structure vide (avec ton programme et la démo) */
  creerInitial() {
    return {
      version: VERSION_DONNEES,
      themes: Demo.themesInitiaux(),
      arguments: Demo.argumentsDemo(),
      flashcards: [],      // étape 3
      plans: [],           // étape 4
      stats: {},           // étape 3
      paysPerso: [],
      reglages: {
        theme: 'sombre',
        taille: 'normal',
        nouvellesParJour: 20,
        heureChangementJour: 4,
      },
      meta: {
        creeLe: new Date().toISOString(),
        derniereSauvegarde: null,
        modifsDepuisSauvegarde: 0,
      },
    };
  },

  /** Lit les données au démarrage */
  charger() {
    let brut = null;
    try {
      brut = localStorage.getItem(CLE_STOCKAGE);
    } catch (e) {
      this.disponible = false;
    }
    if (brut) {
      try {
        this.donnees = this.completer(JSON.parse(brut));
        return;
      } catch (e) {
        // Données illisibles : on les garde de côté pour ne rien perdre
        try { localStorage.setItem(CLE_STOCKAGE + '-corrompu-' + Date.now(), brut); } catch (e2) { /* rien */ }
        alert("Les données enregistrées n'ont pas pu être lues. Une copie a été mise de côté. Tu peux réimporter ta dernière sauvegarde depuis la page Sauvegarde.");
      }
    }
    this.donnees = this.creerInitial();
    this.ecrire();
  },

  /** Ajoute les champs manquants (utile si le format évolue entre deux versions du site) */
  completer(d) {
    const base = this.creerInitial();
    const res = {
      ...base,
      ...d,
      reglages: { ...base.reglages, ...(d.reglages || {}) },
      meta: { ...base.meta, ...(d.meta || {}) },
    };
    for (const cle of ['themes', 'arguments', 'flashcards', 'plans', 'paysPerso']) {
      if (!Array.isArray(res[cle])) res[cle] = [];
    }
    for (const t of res.themes) if (!Array.isArray(t.chapitres)) t.chapitres = [];
    for (const a of res.arguments) {
      for (const champ of ['exemples', 'citations', 'rattachements', 'motsCles', 'pays', 'dates']) {
        if (!Array.isArray(a[champ])) a[champ] = [];
      }
    }
    res.version = VERSION_DONNEES;
    return res;
  },

  /** Écrit les données dans le navigateur */
  ecrire() {
    if (!this.disponible) return false;
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(this.donnees));
      return true;
    } catch (e) {
      toast("Impossible d'enregistrer : l'espace du navigateur est peut-être plein. Exporte une sauvegarde !", 'erreur', 8000);
      return false;
    }
  },

  /**
   * Toutes les modifications passent par ici :
   * Stockage.modifier(d => { d.arguments.push(...) })
   */
  modifier(fonction) {
    fonction(this.donnees);
    this.donnees.meta.modifsDepuisSauvegarde = (this.donnees.meta.modifsDepuisSauvegarde || 0) + 1;
    this.ecrire();
    if (window.App) App.majEtatSauvegarde();
  },

  /** Modifie un réglage sans compter comme une modification de contenu */
  reglage(cle, valeur) {
    this.donnees.reglages[cle] = valeur;
    this.ecrire();
  },

  /** Taille occupée (approximative) */
  tailleOctets() {
    return new Blob([JSON.stringify(this.donnees)]).size;
  },

  /* ---------------- Thèmes et chapitres ---------------- */

  /** Infos sur un identifiant de thème ou de chapitre */
  rattachement(id) {
    for (const t of this.donnees.themes) {
      if (t.id === id) return { type: 'theme', theme: t, nom: t.nom };
      const c = t.chapitres.find((ch) => ch.id === id);
      if (c) return { type: 'chapitre', theme: t, chapitre: c, nom: c.nom };
    }
    return null;
  },

  /** Tous les identifiants « couverts » par un thème : le thème lui-même et ses chapitres */
  idsDuTheme(theme) {
    return [theme.id, ...theme.chapitres.map((c) => c.id)];
  },

  /** Arguments rattachés à un thème (directement ou via un chapitre) ou à un chapitre */
  argumentsDe(id) {
    const r = this.rattachement(id);
    if (!r) return [];
    const ids = r.type === 'theme' ? this.idsDuTheme(r.theme) : [id];
    return this.donnees.arguments.filter((a) => a.rattachements.some((x) => ids.includes(x)));
  },

  aDeLaDemo() {
    return this.donnees.arguments.some((a) => a.demo) || this.donnees.flashcards.some((f) => f.demo);
  },

  supprimerDemo() {
    this.modifier((d) => {
      d.arguments = d.arguments.filter((a) => !a.demo);
      d.flashcards = d.flashcards.filter((f) => !f.demo);
      d.plans = d.plans.filter((p) => !p.demo);
    });
  },

  /* ---------------- Sauvegarde en fichier ---------------- */

  /** Contenu du fichier de sauvegarde */
  exporter() {
    const maintenant = new Date().toISOString();
    this.donnees.meta.derniereSauvegarde = maintenant;
    this.donnees.meta.modifsDepuisSauvegarde = 0;
    this.ecrire();
    const fichier = {
      format: 'geopo-sauvegarde',
      version: VERSION_DONNEES,
      exporteLe: maintenant,
      donnees: this.donnees,
    };
    return JSON.stringify(fichier, null, 2);
  },

  /** Nom du fichier : geopo-sauvegarde-2026-11-20_16h05.json */
  nomFichierSauvegarde() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `geopo-sauvegarde-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}.json`;
  },

  /** Vérifie qu'un fichier est bien une sauvegarde. Renvoie { ok, erreur, donnees, exporteLe } */
  lireSauvegarde(texte) {
    let obj;
    try {
      obj = JSON.parse(texte);
    } catch (e) {
      return { ok: false, erreur: "Ce fichier n'est pas un fichier JSON valide." };
    }
    if (!obj || obj.format !== 'geopo-sauvegarde' || !obj.donnees) {
      return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde de Géopo Révision. (Pour importer du contenu généré par Claude, utilise la page Importer.)" };
    }
    if (obj.version > VERSION_DONNEES) {
      return { ok: false, erreur: 'Cette sauvegarde vient d\'une version plus récente du site. Mets ton site à jour avant de l\'importer.' };
    }
    if (!Array.isArray(obj.donnees.themes) || !Array.isArray(obj.donnees.arguments)) {
      return { ok: false, erreur: 'La sauvegarde est incomplète (thèmes ou arguments manquants).' };
    }
    return { ok: true, donnees: this.completer(obj.donnees), exporteLe: obj.exporteLe };
  },

  /** Remplace toutes les données par celles de la sauvegarde */
  remplacerPar(donnees) {
    this.donnees = this.completer(U.copie(donnees));
    this.donnees.meta.derniereSauvegarde = new Date().toISOString();
    this.donnees.meta.modifsDepuisSauvegarde = 0;
    this.ecrire();
  },

  /**
   * Fusionne une sauvegarde avec les données actuelles :
   * - éléments inconnus : ajoutés ;
   * - éléments présents des deux côtés : on garde la version modifiée le plus récemment.
   * Renvoie un petit bilan.
   */
  fusionnerAvec(donnees) {
    const bilan = { themes: 0, chapitres: 0, arguments: 0, flashcards: 0, plans: 0, misAJour: 0 };
    this.modifier((d) => {
      for (const t of donnees.themes) {
        const local = d.themes.find((x) => x.id === t.id);
        if (!local) { d.themes.push(U.copie(t)); bilan.themes++; continue; }
        for (const c of t.chapitres) {
          if (!local.chapitres.some((x) => x.id === c.id)) { local.chapitres.push(U.copie(c)); bilan.chapitres++; }
        }
      }
      for (const cle of ['arguments', 'flashcards', 'plans']) {
        for (const el of donnees[cle] || []) {
          const i = d[cle].findIndex((x) => x.id === el.id);
          if (i === -1) { d[cle].push(U.copie(el)); bilan[cle]++; }
          else if ((el.modifieLe || '') > (d[cle][i].modifieLe || '')) { d[cle][i] = U.copie(el); bilan.misAJour++; }
        }
      }
      for (const p of donnees.paysPerso || []) {
        if (!d.paysPerso.some((x) => x.nom === p.nom)) d.paysPerso.push(U.copie(p));
      }
    });
    return bilan;
  },

  /** Efface tout et repart de zéro (sans démo) */
  toutEffacer() {
    const neuf = this.creerInitial();
    neuf.arguments = [];
    neuf.themes = [];
    neuf.reglages = this.donnees.reglages;
    this.donnees = neuf;
    this.ecrire();
  },
};
