/* =========================================================
   stats.js : statistiques de révision
   Pour rester léger, on garde un résumé par jour plutôt que
   chaque réponse :
   stats.jours["2026-11-21"] = {
     revues, reussies, nouvelles, secondes,
     themes: { idTheme: [revues, reussies] }
   }
   stats.sessions = [{ debut, fin, revues, reussies, filtre }]  (100 dernières)
   ========================================================= */

const Stats = {
  donnees() {
    const d = Stockage.donnees;
    if (!d.stats || typeof d.stats !== 'object') d.stats = {};
    if (!d.stats.jours) d.stats.jours = {};
    if (!Array.isArray(d.stats.sessions)) d.stats.sessions = [];
    return d.stats;
  },

  jourVide() { return { revues: 0, reussies: 0, nouvelles: 0, secondes: 0, themes: {} }; },

  /** Résumé d'un jour (sans le créer) */
  du(jour) { return this.donnees().jours[jour] || this.jourVide(); },

  /** Thème d'une carte (ou "__aucun") */
  themeDe(carte) {
    const r = carte.rattachement ? Stockage.rattachement(carte.rattachement) : null;
    return r ? r.theme.id : '__aucun';
  },

  /**
   * Enregistre la PREMIÈRE réponse donnée à une carte pendant une séance.
   * (Les répétitions d'une carte « À revoir » dans la même séance ne
   * comptent pas une deuxième fois dans le taux de réussite.)
   * À appeler à l'intérieur de Stockage.modifier.
   */
  noter(d, carte, note, etaitNouvelle, secondes) {
    const jour = Revision.jour();
    const s = this.donnees();
    const j = s.jours[jour] || (s.jours[jour] = this.jourVide());
    j.revues++;
    if (note > 0) j.reussies++;
    if (etaitNouvelle) j.nouvelles++;
    j.secondes += Math.min(60, Math.max(0, Math.round(secondes)));
    const t = this.themeDe(carte);
    const parTheme = j.themes[t] || (j.themes[t] = [0, 0]);
    parTheme[0]++;
    if (note > 0) parTheme[1]++;
  },

  /** Enregistre une séance terminée */
  enregistrerSession(session) {
    if (!session.revues) return;
    Stockage.modifier(() => {
      const s = this.donnees();
      s.sessions.push(session);
      if (s.sessions.length > 100) s.sessions.splice(0, s.sessions.length - 100);
    });
  },

  /** Série de jours consécutifs avec au moins une révision */
  serie() {
    const jours = this.donnees().jours;
    const aujourdhui = Revision.jour();
    const fait = (j) => jours[j] && jours[j].revues > 0;
    let jour = fait(aujourdhui) ? aujourdhui : Revision.ajouterJours(aujourdhui, -1);
    let n = 0;
    while (fait(jour)) { n++; jour = Revision.ajouterJours(jour, -1); }
    return { serie: n, aujourdhuiFait: fait(aujourdhui) };
  },

  /** Les n derniers jours, du plus ancien au plus récent */
  derniersJours(n) {
    const aujourdhui = Revision.jour();
    const res = [];
    for (let i = n - 1; i >= 0; i--) {
      const jour = Revision.ajouterJours(aujourdhui, -i);
      res.push({ jour, ...this.du(jour) });
    }
    return res;
  },

  /** Réussite sur une période : { revues, reussies, taux } */
  reussite(nbJours = 30) {
    let revues = 0;
    let reussies = 0;
    for (const j of this.derniersJours(nbJours)) { revues += j.revues; reussies += j.reussies; }
    return { revues, reussies, taux: revues ? reussies / revues : null };
  },

  /** Réussite par thème sur une période : { idTheme: { revues, reussies } } */
  reussiteParTheme(nbJours = 30) {
    const res = {};
    for (const j of this.derniersJours(nbJours)) {
      for (const [t, [r, ok]] of Object.entries(j.themes || {})) {
        const x = res[t] || (res[t] = { revues: 0, reussies: 0 });
        x.revues += r;
        x.reussies += ok;
      }
    }
    return res;
  },

  /** Efface toutes les statistiques (pas les cartes) */
  effacer() {
    Stockage.modifier((d) => { d.stats = { jours: {}, sessions: [] }; });
  },
};
