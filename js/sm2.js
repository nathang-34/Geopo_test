/* =========================================================
   sm2.js : répétition espacée (algorithme de type SM-2,
   proche de celui d'Anki)

   Chaque carte garde :
     - intervalle   : nombre de jours avant la prochaine révision
     - facilite     : multiplicateur (2,5 au départ) qui baisse si
                      la carte est difficile, monte si elle est facile
     - repetitions  : nombre de réussites d'affilée
     - echeance     : jour de la prochaine révision ("AAAA-MM-JJ")
     - echecs       : nombre de fois où la carte a été oubliée

   Les 4 boutons :
     À revoir (0) : la carte revient plus tard dans la même séance,
                    et repart de zéro
     Difficile (1), Bien (2), Facile (3) : la carte est reprogrammée
   ========================================================= */

const NOTES = [
  { valeur: 0, libelle: 'À revoir', touche: '1', classe: 'note-0' },
  { valeur: 1, libelle: 'Difficile', touche: '2', classe: 'note-1' },
  { valeur: 2, libelle: 'Bien', touche: '3', classe: 'note-2' },
  { valeur: 3, libelle: 'Facile', touche: '4', classe: 'note-3' },
];

const SEUIL_MAITRISE = 21; // jours : au-delà, une carte est « maîtrisée »
const FACILITE_DEPART = 2.5;
const FACILITE_MIN = 1.3;
const INTERVALLE_MAX = 3650;

const Revision = {
  /**
   * « Jour logique » : comme dans Anki, la journée change à 4 h du matin
   * (réglable). Une révision à 1 h du matin compte donc pour la veille.
   */
  jour(date = new Date()) {
    const heure = Stockage.donnees.reglages.heureChangementJour ?? 4;
    const d = new Date(date.getTime() - heure * 3600000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  /** "2026-11-21" + 3 -> "2026-11-24" */
  ajouterJours(jour, n) {
    const [a, m, j] = jour.split('-').map(Number);
    const d = new Date(a, m - 1, j + n, 12); // midi : évite les soucis d'heure d'été
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  /** Nombre de jours entre deux jours logiques */
  ecart(jourA, jourB) {
    const t = (j) => { const [a, m, d] = j.split('-').map(Number); return Date.UTC(a, m - 1, d); };
    return Math.round((t(jourB) - t(jourA)) / 86400000);
  },

  /** État d'une carte jamais révisée */
  nouvelEtat() {
    return { intervalle: 0, facilite: FACILITE_DEPART, repetitions: 0, echeance: null, echecs: 0, revisions: 0, derniereRevision: null };
  },

  estNouvelle(carte) { return !carte.sr || carte.sr.revisions === 0; },
  estDue(carte, jour = this.jour()) { return !this.estNouvelle(carte) && carte.sr.echeance && carte.sr.echeance <= jour; },
  estMaitrisee(carte) { return !this.estNouvelle(carte) && carte.sr.intervalle >= SEUIL_MAITRISE; },

  /** Catégorie lisible d'une carte */
  categorie(carte, jour = this.jour()) {
    if (this.estNouvelle(carte)) return 'nouvelle';
    if (this.estDue(carte, jour)) return 'due';
    if (this.estMaitrisee(carte)) return 'maitrisee';
    return 'apprentissage';
  },

  /**
   * Calcule le nouvel intervalle (en jours) selon la note, sans rien modifier.
   * Renvoie 0 pour « À revoir » (la carte revient dans la séance).
   */
  calculer(sr, note) {
    const s = sr || this.nouvelEtat();
    let facilite = s.facilite || FACILITE_DEPART;
    let intervalle;
    if (note === 0) {
      return { intervalle: 0, facilite: Math.max(FACILITE_MIN, facilite - 0.2), repetitions: 0 };
    }
    if (note === 1) facilite = Math.max(FACILITE_MIN, facilite - 0.15);
    if (note === 3) facilite += 0.15;

    if (s.repetitions === 0) {
      intervalle = note === 3 ? 4 : 1;
    } else if (s.repetitions === 1) {
      intervalle = [0, 3, 6, 10][note];
    } else {
      const precedent = Math.max(1, s.intervalle);
      if (note === 1) intervalle = precedent * 1.2;
      else if (note === 2) intervalle = precedent * facilite;
      else intervalle = precedent * facilite * 1.3;
      intervalle = Math.max(precedent + (note === 1 ? 0 : 1), Math.round(intervalle));
    }
    intervalle = Math.min(INTERVALLE_MAX, Math.max(1, Math.round(intervalle)));
    return { intervalle, facilite: Math.round(facilite * 100) / 100, repetitions: s.repetitions + 1 };
  },

  /**
   * Applique une note à une carte (modifie carte.sr).
   * Un petit hasard (± 5 %) sur les longs intervalles évite que toutes
   * les cartes apprises le même jour reviennent le même jour.
   */
  appliquer(carte, note, jour = this.jour()) {
    const s = carte.sr || this.nouvelEtat();
    const r = this.calculer(s, note);
    let intervalle = r.intervalle;
    if (intervalle >= 7) intervalle = Math.round(intervalle * (0.95 + Math.random() * 0.1));
    carte.sr = {
      ...s,
      intervalle,
      facilite: r.facilite,
      repetitions: r.repetitions,
      echeance: this.ajouterJours(jour, intervalle), // « À revoir » : intervalle 0 = aujourd'hui
      echecs: (s.echecs || 0) + (note === 0 ? 1 : 0),
      revisions: (s.revisions || 0) + 1,
      derniereRevision: new Date().toISOString(),
    };
  },

  /** "1 j", "6 j", "3 mois", "1,2 an" */
  libelleIntervalle(jours) {
    if (jours <= 0) return '< 10 min';
    if (jours < 30) return jours + ' j';
    if (jours < 365) return Math.round(jours / 30) + ' mois';
    return (jours / 365).toFixed(1).replace('.', ',') + ' an' + (jours >= 730 ? 's' : '');
  },

  /** "aujourd'hui", "demain", "dans 5 jours", "en retard de 2 jours" */
  libelleEcheance(carte, jour = this.jour()) {
    if (this.estNouvelle(carte)) return 'jamais révisée';
    const e = this.ecart(jour, carte.sr.echeance);
    if (e < 0) return `en retard de ${U.pluriel(-e, 'jour')}`;
    if (e === 0) return "à revoir aujourd'hui";
    if (e === 1) return 'demain';
    return `dans ${U.pluriel(e, 'jour')}`;
  },
};
