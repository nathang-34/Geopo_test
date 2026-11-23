/* =========================================================
   reviser.js : page « Réviser » (séance du jour)
   Raccourcis : Espace ou Entrée = afficher la réponse,
   1 / 2 / 3 / 4 = À revoir / Difficile / Bien / Facile.
   ========================================================= */

const NB_EN_AVANCE = 20;
const NB_NOUVELLES_EN_PLUS = 10;
const ECART_A_REVOIR = 3; // une carte « À revoir » revient 3 cartes plus loin

Vues.reviser = {
  filtre: '',
  session: null, // séance en cours (gardée si on change de page)

  rendre(el) {
    this.el = el;
    if (this.session && !this.session.terminee) this.dessinerCarte();
    else if (this.session && this.session.terminee) this.dessinerFin();
    else this.dessinerAccueil();
  },

  /* ---------------- Accueil ---------------- */

  dessinerAccueil() {
    const el = this.el;
    const file = Flashcards.fileDuJour(this.filtre, this.typesFiltre());
    const total = file.dues.length + file.nouvelles.length;
    const { serie, aujourdhuiFait } = Stats.serie();
    const auj = Stats.du(Revision.jour());
    const nbCartes = Stockage.donnees.flashcards.filter((c) => Flashcards.correspond(c, this.filtre, this.typesFiltre())).length;
    // Nombre de cartes à réviser aujourd'hui pour chaque type (dans le thème choisi)
    const parType = {};
    for (const k of Object.keys(TYPES_CARTE)) {
      const fk = Flashcards.fileDuJour(this.filtre, [k]);
      const n = fk.dues.length + fk.nouvelles.length;
      parType[k] = n ? `(${n} aujourd'hui)` : '';
    }

    el.innerHTML = `
      <div class="entete-vue"><h1>🔁 Réviser</h1></div>
      <div class="carte" style="max-width:720px">
        <div class="champ" style="max-width:480px">
          <label>Thème à réviser</label>
          <select data-filtre>${optionsFiltreThemes(this.filtre)}</select>
        </div>
        <div class="champ">
          <label>Ordre des cartes</label>
          <div class="choix-segmente" role="radiogroup">
            <label><input type="radio" name="ordre" value="melange" ${this.ordre() === 'melange' ? 'checked' : ''}> 🔀 Mélangées</label>
            <label><input type="radio" name="ordre" value="ordre" ${this.ordre() === 'ordre' ? 'checked' : ''}> 📋 Dans l'ordre du cours</label>
          </div>
          <div class="aide" style="margin-top:4px">${this.ordre() === 'ordre' ? "Chapitre par chapitre (dans l'ordre de la page Thèmes), puis dans l'ordre où les cartes ont été créées ou importées." : 'Toutes les cartes de la séance sont tirées au hasard.'}</div>
        </div>
        <div class="champ">
          <label>Types de cartes <span class="aide">(coche ce que tu veux réviser)</span></label>
          <div class="choix-types">
            ${Object.entries(TYPES_CARTE).map(([k, v]) => `
              <label class="choix-type"><input type="checkbox" data-type="${k}" ${this.typesChoisis().includes(k) ? 'checked' : ''}>
                ${v.icone} ${v.texte} <span class="muet petit">${parType[k]}</span></label>`).join('')}
          </div>
        </div>
        <div class="grille-stats">
          <div class="stat"><div class="stat-valeur">${file.dues.length}</div><div class="stat-libelle">cartes à revoir</div></div>
          <div class="stat"><div class="stat-valeur">${file.nouvelles.length}</div><div class="stat-libelle">nouvelles cartes${file.totalNouvelles > file.nouvelles.length ? ` (sur ${file.totalNouvelles})` : ''}</div></div>
          <div class="stat"><div class="stat-valeur">${serie} 🔥</div><div class="stat-libelle">jour${serie > 1 ? 's' : ''} de suite${aujourdhuiFait ? '' : ' (révise pour continuer)'}</div></div>
        </div>
        ${total ? `
          <button class="btn btn-principal" data-commencer style="font-size:1.05rem; padding:10px 22px">▶️ Commencer (${U.pluriel(total, 'carte')})</button>
          <p class="muet petit" style="margin-top:10px">Raccourcis clavier : <strong>Espace</strong> pour afficher la réponse, puis <strong>1</strong> À revoir · <strong>2</strong> Difficile · <strong>3</strong> Bien · <strong>4</strong> Facile.</p>`
        : `
          <p>${nbCartes ? '🎉 <strong>Rien à réviser pour aujourd\'hui</strong> dans cette sélection. Reviens demain !' : 'Aucune flashcard dans cette sélection pour l\'instant.'}</p>
          ${nbCartes ? `<div class="barre-actions">
            <button class="btn" data-avance>Réviser en avance (${NB_EN_AVANCE} prochaines cartes)</button>
            ${file.totalNouvelles ? `<button class="btn" data-plus-nouvelles>Apprendre ${Math.min(NB_NOUVELLES_EN_PLUS, file.totalNouvelles)} nouvelles cartes de plus</button>` : ''}
          </div>` : '<a class="btn btn-principal" href="#/flashcards">Créer des flashcards</a>'}`}
        ${auj.revues ? `<p class="muet petit" style="margin-top:14px">Aujourd'hui : ${U.pluriel(auj.revues, 'carte révisée', 'cartes révisées')}, ${Math.round((auj.reussies / auj.revues) * 100)} % de réussite.</p>` : ''}
        ${file.limite && !file.restantes && file.totalNouvelles ? `<p class="muet petit">Limite de ${file.limite} nouvelles cartes par jour atteinte (modifiable dans Réglages).</p>` : ''}
      </div>`;

    el.querySelector('[data-filtre]').addEventListener('change', (e) => { this.filtre = e.target.value; this.dessinerAccueil(); });
    el.querySelectorAll('input[name="ordre"]').forEach((r) => r.addEventListener('change', () => {
      Stockage.reglage('ordreRevision', r.value);
      this.dessinerAccueil();
    }));
    el.querySelectorAll('[data-type]').forEach((c) => c.addEventListener('change', () => {
      const choisis = [...el.querySelectorAll('[data-type]:checked')].map((x) => x.dataset.type);
      if (!choisis.length) { c.checked = true; toast('Garde au moins un type de cartes.', 'attention'); return; }
      Stockage.reglage('typesRevision', choisis.length === Object.keys(TYPES_CARTE).length ? null : choisis);
      this.dessinerAccueil();
    }));
    const b = (sel, fn) => { const x = el.querySelector(sel); if (x) x.addEventListener('click', fn); };
    b('[data-commencer]', () => this.commencer(this.construireFile(file.dues, file.nouvelles), 'jour'));
    b('[data-avance]', () => {
      const jour = Revision.jour();
      const prochaines = Stockage.donnees.flashcards
        .filter((c) => Flashcards.correspond(c, this.filtre, this.typesFiltre()) && !Revision.estNouvelle(c) && c.sr.echeance > jour)
        .sort((a, c) => a.sr.echeance.localeCompare(c.sr.echeance))
        .slice(0, NB_EN_AVANCE);
      if (!prochaines.length) { toast('Aucune carte déjà apprise à réviser en avance.', 'attention'); return; }
      this.commencer(this.ordonner(prochaines), 'avance');
    });
    b('[data-plus-nouvelles]', () => {
      const nouvelles = Stockage.donnees.flashcards
        .filter((c) => Flashcards.correspond(c, this.filtre, this.typesFiltre()) && Revision.estNouvelle(c))
        .sort((a, c) => (a.creeLe || '').localeCompare(c.creeLe || ''))
        .slice(0, NB_NOUVELLES_EN_PLUS);
      this.commencer(this.ordonner(nouvelles), 'nouvelles');
    });
  },

  /** Types de cartes cochés (tous par défaut) */
  typesChoisis() {
    const t = Stockage.donnees.reglages.typesRevision;
    const valides = Array.isArray(t) ? t.filter((k) => TYPES_CARTE[k]) : [];
    return valides.length ? valides : Object.keys(TYPES_CARTE);
  },

  /** Filtre de types à passer à Flashcards (null = pas de filtre) */
  typesFiltre() {
    const t = this.typesChoisis();
    return t.length === Object.keys(TYPES_CARTE).length ? null : t;
  },

  /** Ordre choisi : 'melange' (par défaut) ou 'ordre' */
  ordre() {
    return Stockage.donnees.reglages.ordreRevision === 'ordre' ? 'ordre' : 'melange';
  },

  /**
   * Range une liste de cartes selon l'ordre choisi et renvoie leurs identifiants.
   * - mélangé : tirage au hasard ;
   * - dans l'ordre : chapitre par chapitre (ordre de la page Thèmes),
   *   puis ordre de création / d'import des cartes.
   */
  ordonner(cartes) {
    const liste = cartes.slice();
    if (this.ordre() === 'melange') {
      for (let i = liste.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [liste[i], liste[j]] = [liste[j], liste[i]]; }
    } else {
      const rang = {};
      let n = 0;
      for (const t of Stockage.donnees.themes) { rang[t.id] = n++; for (const c of t.chapitres) rang[c.id] = n++; }
      const r = (c) => (c.rattachement && rang[c.rattachement] !== undefined ? rang[c.rattachement] : 99999);
      liste.sort((a, b) => r(a) - r(b) || (a.creeLe || '').localeCompare(b.creeLe || ''));
    }
    return liste.map((c) => c.id);
  },

  /** File de la séance du jour : cartes à revoir et nouvelles cartes, rangées selon l'ordre choisi */
  construireFile(dues, nouvelles) {
    return this.ordonner([...dues, ...nouvelles]);
  },

  commencer(file, type) {
    this.session = {
      type, filtre: this.filtre, file, index: 0, montree: false,
      dejaVues: new Set(), revues: 0, reussies: 0,
      debut: new Date().toISOString(), debutCarte: Date.now(), terminee: false,
    };
    this.dessinerCarte();
  },

  /* ---------------- Une carte ---------------- */

  carteCourante() {
    const s = this.session;
    // Saute les cartes supprimées entre-temps
    while (s.index < s.file.length && !Stockage.donnees.flashcards.some((c) => c.id === s.file[s.index])) s.index++;
    return s.index < s.file.length ? Stockage.donnees.flashcards.find((c) => c.id === s.file[s.index]) : null;
  },

  dessinerCarte() {
    const s = this.session;
    const carte = this.carteCourante();
    if (!carte) { this.terminer(); return; }
    const r = carte.rattachement ? Stockage.rattachement(carte.rattachement) : null;
    const arg = Flashcards.argumentDe(carte);
    const restantes = s.file.length - s.index;
    const progression = Math.round((s.index / s.file.length) * 100);

    this.el.innerHTML = `
      <div class="entete-vue">
        <h1>🔁 Révision</h1>
        <div class="barre-actions">
          <span class="muet petit">${U.pluriel(restantes, 'carte restante', 'cartes restantes')}</span>
          <button class="btn btn-petit" data-terminer>Terminer la séance</button>
        </div>
      </div>
      <div class="jauge" style="max-width:820px"><div style="width:${progression}%"></div></div>
      <div class="carte carte-revision">
        <div class="petit">
          ${r ? `<span class="chip chip-theme">${U.esc(r.nom)}</span>` : ''}
          ${Revision.estNouvelle(carte) ? '<span class="chip" style="background:rgba(79,193,181,.16); color:var(--accent-2)">Nouvelle</span>' : ''}
          ${s.dejaVues.has(carte.id) ? '<span class="chip chip-demo">À revoir</span>' : ''}
        </div>
        <div class="recto texte-riche">${U.md(carte.recto)}</div>
        ${s.montree ? `
          <hr>
          <div class="verso texte-riche">${U.md(carte.verso)}</div>
          <div class="barre-actions" style="justify-content:center; margin-top:8px">
            ${arg ? '<button class="btn btn-petit" data-voir-arg>📚 Voir l\'argument</button>' : ''}
            <button class="btn btn-petit btn-discret" data-modifier>✏️ Modifier la carte</button>
          </div>` : ''}
      </div>
      <div class="zone-reponse">
        ${s.montree
          ? `<div class="boutons-notes">${NOTES.map((n) => {
              const apercu = Revision.calculer(carte.sr, n.valeur).intervalle;
              return `<button class="btn ${n.classe}" data-note="${n.valeur}"><strong>${n.libelle}</strong><span>${Revision.libelleIntervalle(apercu)}</span><kbd>${n.touche}</kbd></button>`;
            }).join('')}</div>`
          : '<button class="btn btn-principal btn-montrer" data-montrer>Afficher la réponse <kbd>Espace</kbd></button>'}
      </div>`;

    const el = this.el;
    el.querySelector('[data-terminer]').addEventListener('click', () => this.terminer());
    const montrer = el.querySelector('[data-montrer]');
    if (montrer) { montrer.addEventListener('click', () => this.montrer()); montrer.focus(); }
    el.querySelectorAll('[data-note]').forEach((b) => b.addEventListener('click', () => this.noter(Number(b.dataset.note))));
    const voir = el.querySelector('[data-voir-arg]');
    if (voir) voir.addEventListener('click', () => Vues.arguments.ouvrirFiche(arg.id));
    const modif = el.querySelector('[data-modifier]');
    if (modif) modif.addEventListener('click', () => Flashcards.ouvrirFormulaire(carte));
  },

  montrer() {
    if (!this.session || this.session.montree) return;
    this.session.montree = true;
    this.dessinerCarte();
  },

  noter(note) {
    const s = this.session;
    if (!s || !s.montree) return;
    const carte = this.carteCourante();
    if (!carte) return;
    const premiere = !s.dejaVues.has(carte.id);
    const etaitNouvelle = Revision.estNouvelle(carte);
    const secondes = (Date.now() - s.debutCarte) / 1000;
    Stockage.modifier((d) => {
      const c = d.flashcards.find((x) => x.id === carte.id);
      Revision.appliquer(c, note);
      if (premiere) Stats.noter(d, c, note, etaitNouvelle, secondes);
    });
    if (premiere) { s.revues++; if (note > 0) s.reussies++; }
    s.dejaVues.add(carte.id);
    if (note === 0) {
      // La carte reviendra un peu plus loin dans la séance
      s.file.splice(Math.min(s.file.length, s.index + 1 + ECART_A_REVOIR), 0, carte.id);
    }
    s.index++;
    s.montree = false;
    s.debutCarte = Date.now();
    if (s.index >= s.file.length) this.terminer();
    else this.dessinerCarte();
  },

  /* ---------------- Fin de séance ---------------- */

  terminer() {
    const s = this.session;
    if (!s || s.terminee) return;
    s.terminee = true;
    s.fin = new Date().toISOString();
    Stats.enregistrerSession({ debut: s.debut, fin: s.fin, revues: s.revues, reussies: s.reussies, filtre: s.filtre, type: s.type });
    this.dessinerFin();
  },

  dessinerFin() {
    const s = this.session;
    const duree = Math.max(1, Math.round((new Date(s.fin) - new Date(s.debut)) / 60000));
    const taux = s.revues ? Math.round((s.reussies / s.revues) * 100) : 0;
    const { serie } = Stats.serie();
    const reste = Flashcards.fileDuJour(this.filtre, this.typesFiltre());
    const resteTotal = reste.dues.length + reste.nouvelles.length;
    this.el.innerHTML = `
      <div class="entete-vue"><h1>🔁 Séance terminée</h1></div>
      <div class="carte" style="max-width:720px; text-align:center">
        <p style="font-size:2.4rem; margin:0">${taux >= 80 ? '🏆' : taux >= 50 ? '👍' : '💪'}</p>
        <div class="grille-stats" style="text-align:left">
          <div class="stat"><div class="stat-valeur">${s.revues}</div><div class="stat-libelle">cartes révisées</div></div>
          <div class="stat"><div class="stat-valeur">${taux} %</div><div class="stat-libelle">de réussite du premier coup</div></div>
          <div class="stat"><div class="stat-valeur">${duree} min</div><div class="stat-libelle">de révision</div></div>
          <div class="stat"><div class="stat-valeur">${serie} 🔥</div><div class="stat-libelle">jour${serie > 1 ? 's' : ''} de suite</div></div>
        </div>
        <div class="barre-actions" style="justify-content:center">
          ${resteTotal ? `<button class="btn btn-principal" data-encore>Continuer (${U.pluriel(resteTotal, 'carte restante', 'cartes restantes')})</button>` : ''}
          <button class="btn" data-accueil>Retour</button>
          <a class="btn" href="#/tableau">Tableau de bord</a>
        </div>
      </div>`;
    const encore = this.el.querySelector('[data-encore]');
    if (encore) encore.addEventListener('click', () => { this.session = null; this.filtre = s.filtre; this.commencer(this.construireFile(reste.dues, reste.nouvelles), 'jour'); });
    this.el.querySelector('[data-accueil]').addEventListener('click', () => { this.session = null; this.dessinerAccueil(); });
  },
};

/* Raccourcis clavier pendant la révision */
document.addEventListener('keydown', (e) => {
  if (App.lireAdresse().nom !== 'reviser') return;
  const v = Vues.reviser;
  if (!v.session || v.session.terminee || Modal.pile.length) return;
  if (e.target.matches('input, textarea, select')) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (!v.session.montree && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); v.montrer(); return; }
  if (v.session.montree && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); v.noter(Number(e.key) - 1); }
});
