/* =========================================================
   flashcards.js : page « Flashcards »
   - liste filtrable, création, modification, suppression
   - génération automatique à partir d'un argument
   - outils communs (file de révision du jour...)
   Une flashcard :
   { id, recto, verso, rattachement (id thème/chapitre ou null),
     argumentId (ou null), cle (pour les cartes générées),
     source: 'manuel' | 'argument' | 'import', demo?, sr: {...},
     creeLe, modifieLe }
   ========================================================= */

const LIBELLES_CATEGORIE = {
  nouvelle: { texte: 'Nouvelle', style: 'background:rgba(79,193,181,.16); color:var(--accent-2)' },
  due: { texte: 'À réviser', style: 'background:rgba(237,164,80,.2); color:var(--attention)' },
  apprentissage: { texte: 'En cours', style: '' },
  maitrisee: { texte: 'Maîtrisée', style: 'background:rgba(92,201,138,.16); color:var(--succes)' },
};

const Flashcards = {
  /* ---------------- Outils ---------------- */

  /** Une carte correspond-elle au filtre thème/chapitre ? ('' = tout, '__aucun' = non classées) */
  correspond(carte, filtre) {
    if (!filtre) return true;
    const r = carte.rattachement ? Stockage.rattachement(carte.rattachement) : null;
    if (filtre === '__aucun') return !r;
    if (!r) return false;
    const f = Stockage.rattachement(filtre);
    if (!f) return false;
    if (f.type === 'theme') return r.theme.id === f.theme.id;
    return carte.rattachement === filtre;
  },

  /**
   * Cartes à réviser aujourd'hui :
   * - dues : cartes déjà vues dont l'échéance est arrivée ;
   * - nouvelles : cartes jamais vues, dans la limite quotidienne.
   */
  fileDuJour(filtre = '') {
    const jour = Revision.jour();
    const cartes = Stockage.donnees.flashcards.filter((c) => this.correspond(c, filtre));
    const dues = cartes.filter((c) => Revision.estDue(c, jour)).sort((a, b) => a.sr.echeance.localeCompare(b.sr.echeance));
    const toutesNouvelles = cartes.filter((c) => Revision.estNouvelle(c)).sort((a, b) => (a.creeLe || '').localeCompare(b.creeLe || ''));
    const limite = Number(Stockage.donnees.reglages.nouvellesParJour) || 0;
    const restantes = Math.max(0, limite - Stats.du(jour).nouvelles);
    return { dues, nouvelles: toutesNouvelles.slice(0, restantes), totalNouvelles: toutesNouvelles.length, restantes, limite };
  },

  argumentDe(carte) {
    return carte.argumentId ? Stockage.donnees.arguments.find((a) => a.id === carte.argumentId) || null : null;
  },

  /** Ajoute une carte dans les données (à appeler dans Stockage.modifier) */
  ajouter(d, { recto, verso, rattachement = null, argumentId = null, cle = null, source = 'manuel', demo = false }) {
    const maintenant = new Date().toISOString();
    const carte = { id: U.uid(), recto, verso, rattachement, argumentId, cle, source, sr: Revision.nouvelEtat(), creeLe: maintenant, modifieLe: maintenant };
    if (demo) carte.demo = true;
    d.flashcards.push(carte);
    return carte;
  },

  /** Options d'une liste déroulante de rattachement (thème entier ou chapitre) */
  optionsRattachement(selection) {
    let html = `<option value="">Non classée</option>`;
    for (const t of Stockage.donnees.themes) {
      html += `<option value="${t.id}" ${selection === t.id ? 'selected' : ''}>${U.esc(t.nom)} (thème entier)</option>`;
      for (const c of t.chapitres) html += `<option value="${c.id}" ${selection === c.id ? 'selected' : ''}>   ↳ ${U.esc(c.nom)}</option>`;
    }
    return html;
  },

  /* ---------------- Génération depuis un argument ---------------- */

  /** Cartes proposées pour un argument */
  propositions(arg) {
    const props = [];
    const cle = (genre, texte) => `${genre}|${U.norm(texte).slice(0, 80)}`;
    // « de Jules Ferry » mais « d'Alain Peyrefitte »
    const de = (nom) => (/^[aeiouyhàâéèêîïôûAEIOUYHÀÂÉÈÊÎÏÔÛ]/.test(nom) ? "d'" : 'de ') + nom;
    for (const c of arg.citations) {
      props.push({
        cle: cle('citation-auteur', c.texte), genre: 'Citation → auteur', coche: true,
        recto: `Qui a dit : « ${c.texte} » ?`,
        verso: `**${c.auteur}**${c.contexte ? ' : ' + c.contexte : ''}`,
      });
      props.push({
        cle: cle('citation-texte', c.texte), genre: 'Auteur → citation', coche: true,
        recto: c.contexte
          ? `Quelle phrase ${de(c.auteur)} (${c.contexte}) peux-tu citer ?`
          : `Quelle phrase ${de(c.auteur)} peux-tu citer pour illustrer : « ${arg.idee} » ?`,
        verso: `« ${c.texte} »`,
      });
    }
    for (const e of arg.exemples) {
      props.push({
        cle: cle('chiffre', e.mesure + ' ' + e.date), genre: 'Chiffre', coche: true,
        recto: `${e.mesure}${e.date ? ` (${e.date})` : ''} ?`,
        verso: `**${e.chiffre}**${e.source ? ` (source : ${e.source})` : ''}`,
      });
    }
    for (const d of arg.dates) {
      props.push({
        cle: cle('date', d.libelle), genre: 'Date', coche: false,
        recto: `Date : ${d.libelle} ?`,
        verso: `**${d.date}**`,
      });
    }
    const existantes = new Set(Stockage.donnees.flashcards.filter((f) => f.argumentId === arg.id && f.cle).map((f) => f.cle));
    for (const p of props) {
      p.existe = existantes.has(p.cle);
      if (p.existe) p.coche = false;
    }
    return props;
  },

  /** Fenêtre de génération (cases à cocher, textes modifiables) */
  ouvrirGeneration(arg) {
    const props = this.propositions(arg);
    if (!props.length) {
      toast("Cet argument n'a ni exemple chiffré, ni citation, ni date : rien à générer.", 'attention', 5000);
      return;
    }
    const chapitreDefaut = arg.rattachements.find((r) => Stockage.rattachement(r)) || '';
    const m = Modal.ouvrir({
      titre: 'Générer des flashcards',
      large: true,
      contenu: `
        <p class="muet">À partir de : <strong>${U.esc(arg.idee)}</strong></p>
        <p class="muet petit">Coche les cartes à créer. Tu peux modifier le texte avant de valider. Les cartes gardent un lien vers cet argument, consultable pendant la révision.</p>
        <div class="champ" style="max-width:520px">
          <label>Ranger les cartes dans</label>
          <select data-rattachement>${this.optionsRattachement(chapitreDefaut)}</select>
        </div>
        <div data-props>
          ${props.map((p, i) => `
            <div class="carte" style="background:var(--surface-2); padding:10px 12px; margin-bottom:8px; ${p.existe ? 'opacity:.6' : ''}">
              <label style="display:flex; gap:10px; align-items:center; font-weight:normal; margin-bottom:6px">
                <input type="checkbox" data-i="${i}" ${p.coche ? 'checked' : ''}>
                <span class="chip">${U.esc(p.genre)}</span>
                ${p.existe ? '<span class="chip chip-demo">Déjà créée</span>' : ''}
              </label>
              <div class="ligne-champs" style="grid-template-columns:1fr 1fr">
                <textarea data-recto="${i}" rows="3" style="min-height:84px">${U.esc(p.recto)}</textarea>
                <textarea data-verso="${i}" rows="3" style="min-height:84px">${U.esc(p.verso)}</textarea>
              </div>
            </div>`).join('')}
        </div>
        <div class="modal-pied">
          <button class="btn" data-annuler>Annuler</button>
          <button class="btn btn-principal" data-creer>Créer les cartes cochées</button>
        </div>`,
    });
    const c = m.corps;
    const majBouton = () => {
      const n = c.querySelectorAll('[data-i]:checked').length;
      c.querySelector('[data-creer]').textContent = n ? `Créer ${U.pluriel(n, 'carte')}` : 'Aucune carte cochée';
      c.querySelector('[data-creer]').disabled = !n;
    };
    c.addEventListener('change', majBouton);
    majBouton();
    c.querySelector('[data-annuler]').addEventListener('click', () => m.fermer(true));
    c.querySelector('[data-creer]').addEventListener('click', () => {
      const rattachement = c.querySelector('[data-rattachement]').value || null;
      let n = 0;
      Stockage.modifier((d) => {
        c.querySelectorAll('[data-i]:checked').forEach((caseACocher) => {
          const i = Number(caseACocher.dataset.i);
          const recto = c.querySelector(`[data-recto="${i}"]`).value.trim();
          const verso = c.querySelector(`[data-verso="${i}"]`).value.trim();
          if (!recto || !verso) return;
          this.ajouter(d, { recto, verso, rattachement, argumentId: arg.id, cle: props[i].cle, source: 'argument', demo: !!arg.demo });
          n++;
        });
      });
      m.fermer(true);
      toast(`${U.pluriel(n, 'flashcard créée', 'flashcards créées')}. Elles apparaîtront dans ta prochaine révision.`);
      App.rafraichir();
    });
  },

  /* ---------------- Formulaire ---------------- */

  ouvrirFormulaire(carte, { rattachement = '' } = {}) {
    const nouvelle = !carte;
    const c = carte || { recto: '', verso: '', rattachement };
    const arg = carte ? this.argumentDe(carte) : null;
    let initial = null;
    const m = Modal.ouvrir({
      titre: nouvelle ? 'Nouvelle flashcard' : 'Modifier la flashcard',
      contenu: `
        <form data-form>
          <div class="champ">
            <label>Recto <span class="aide">(la question)</span></label>
            <textarea name="recto" rows="3">${U.esc(c.recto)}</textarea>
          </div>
          <div class="champ">
            <label>Verso <span class="aide">(la réponse ; **gras** et listes « - » possibles)</span></label>
            <textarea name="verso" rows="4">${U.esc(c.verso)}</textarea>
          </div>
          <div class="champ">
            <label>Thème / chapitre</label>
            <select name="rattachement">${this.optionsRattachement(c.rattachement || '')}</select>
          </div>
          ${arg ? `<p class="muet petit">Liée à l'argument : « ${U.esc(arg.idee)} »</p>` : ''}
          <div class="modal-pied">
            <button type="button" class="btn" data-annuler>Annuler</button>
            <button type="submit" class="btn btn-principal">${nouvelle ? 'Créer' : 'Enregistrer'}</button>
          </div>
        </form>`,
      avantFermeture: async () => {
        if (lire() === initial) return true;
        return confirmer('Tu as des modifications non enregistrées. Fermer quand même ?', { texteOk: 'Fermer sans enregistrer', danger: true });
      },
    });
    const form = m.corps.querySelector('[data-form]');
    const lire = () => JSON.stringify([form.recto.value.trim(), form.verso.value.trim(), form.rattachement.value]);
    initial = lire();
    form.querySelector('[data-annuler]').addEventListener('click', () => m.fermer());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const recto = form.recto.value.trim();
      const verso = form.verso.value.trim();
      if (!recto) { toast('Le recto est obligatoire.', 'erreur'); form.recto.focus(); return; }
      if (!verso) { toast('Le verso est obligatoire.', 'erreur'); form.verso.focus(); return; }
      const ratt = form.rattachement.value || null;
      Stockage.modifier((d) => {
        if (nouvelle) this.ajouter(d, { recto, verso, rattachement: ratt });
        else Object.assign(d.flashcards.find((x) => x.id === carte.id), { recto, verso, rattachement: ratt, modifieLe: new Date().toISOString() });
      });
      m.fermer(true);
      toast(nouvelle ? 'Flashcard créée.' : 'Flashcard enregistrée.');
      App.rafraichir();
      if (nouvelle) {
        // On enchaîne facilement : la fenêtre se rouvre, dans le même chapitre
        this.ouvrirFormulaire(null, { rattachement: ratt || '' });
      }
    });
  },

  /* ---------------- Fiche d'une carte ---------------- */

  ouvrirFiche(id) {
    const carte = Stockage.donnees.flashcards.find((x) => x.id === id);
    if (!carte) return;
    const arg = this.argumentDe(carte);
    const r = carte.rattachement ? Stockage.rattachement(carte.rattachement) : null;
    const cat = LIBELLES_CATEGORIE[Revision.categorie(carte)];
    const s = carte.sr || Revision.nouvelEtat();
    const m = Modal.ouvrir({
      titre: 'Flashcard',
      contenu: `
        <div class="fiche">
          <div><span class="chip" style="${cat.style}">${cat.texte}</span>${r ? `<span class="chip chip-theme">${U.esc(r.nom)}</span>` : '<span class="chip">Non classée</span>'}${carte.demo ? '<span class="chip chip-demo">Démo</span>' : ''}</div>
          <section><h3>Recto</h3><div class="texte-riche">${U.md(carte.recto)}</div></section>
          <section><h3>Verso</h3><div class="texte-riche">${U.md(carte.verso)}</div></section>
          <section><h3>Progression</h3>
            <p class="petit">${Revision.estNouvelle(carte) ? 'Jamais révisée.' : `Prochaine révision : <strong>${Revision.libelleEcheance(carte)}</strong> · intervalle ${Revision.libelleIntervalle(s.intervalle)} · ${U.pluriel(s.revisions, 'révision')} · ${U.pluriel(s.echecs, 'oubli')} · facilité ${String(s.facilite).replace('.', ',')}`}</p>
          </section>
          ${arg ? `<section><h3>Argument d'origine</h3><p><a href="#" data-voir-arg>${U.esc(arg.idee)}</a></p></section>` : ''}
        </div>
        <div class="modal-pied">
          <button class="btn btn-danger" data-suppr>Supprimer</button>
          ${Revision.estNouvelle(carte) ? '' : '<button class="btn" data-reinit>Repartir de zéro</button>'}
          <button class="btn btn-principal" data-modifier>Modifier</button>
        </div>`,
    });
    const c = m.corps;
    c.querySelector('[data-modifier]').addEventListener('click', () => { m.fermer(true); this.ouvrirFormulaire(carte); });
    const voir = c.querySelector('[data-voir-arg]');
    if (voir) voir.addEventListener('click', (e) => { e.preventDefault(); Vues.arguments.ouvrirFiche(arg.id); });
    const reinit = c.querySelector('[data-reinit]');
    if (reinit) reinit.addEventListener('click', async () => {
      if (!(await confirmer('Effacer la progression de cette carte ? Elle redeviendra « nouvelle ».', { texteOk: 'Repartir de zéro' }))) return;
      Stockage.modifier((d) => { d.flashcards.find((x) => x.id === id).sr = Revision.nouvelEtat(); });
      m.fermer(true);
      toast('Progression effacée.');
      App.rafraichir();
    });
    c.querySelector('[data-suppr]').addEventListener('click', async () => {
      if (!(await confirmer('Supprimer définitivement cette flashcard ?', { titre: 'Supprimer', texteOk: 'Supprimer', danger: true }))) return;
      Stockage.modifier((d) => { d.flashcards = d.flashcards.filter((x) => x.id !== id); });
      m.fermer(true);
      toast('Flashcard supprimée.');
      App.rafraichir();
    });
  },
};

/* =========================================================
   La page « Flashcards »
   ========================================================= */
Vues.flashcards = {
  filtres: { theme: '', etat: '', source: '', texte: '', argument: '' },
  limite: 100,

  rendre(el, params = {}, opts = {}) {
    if (!opts.rafraichissement) {
      if (params.argument !== undefined) this.filtres = { theme: '', etat: '', source: '', texte: '', argument: params.argument };
      if (params.filtre !== undefined) this.filtres.theme = params.filtre;
      if (params.etat !== undefined) this.filtres.etat = params.etat;
      this.limite = 100;
    }
    const f = this.filtres;
    const toutes = Stockage.donnees.flashcards;
    const jour = Revision.jour();
    const compte = { nouvelle: 0, due: 0, apprentissage: 0, maitrisee: 0 };
    for (const c of toutes) compte[Revision.categorie(c, jour)]++;
    const argFiltre = f.argument ? Stockage.donnees.arguments.find((a) => a.id === f.argument) : null;

    el.innerHTML = `
      <div class="entete-vue">
        <h1>🃏 Flashcards</h1>
        <div class="barre-actions">
          <a class="btn" href="#/reviser">🔁 Réviser</a>
          <button class="btn btn-principal" data-nouvelle>➕ Nouvelle flashcard</button>
        </div>
      </div>
      <div class="grille-stats">
        <div class="stat"><div class="stat-valeur">${toutes.length}</div><div class="stat-libelle">cartes au total</div></div>
        <div class="stat"><div class="stat-valeur">${compte.due}</div><div class="stat-libelle">à réviser aujourd'hui</div></div>
        <div class="stat"><div class="stat-valeur">${compte.nouvelle}</div><div class="stat-libelle">nouvelles (jamais vues)</div></div>
        <div class="stat"><div class="stat-valeur">${compte.maitrisee}</div><div class="stat-libelle">maîtrisées (≥ ${SEUIL_MAITRISE} j)</div></div>
      </div>
      <p class="muet petit">Astuce : pour créer des cartes à partir de tes exemples chiffrés et citations, ouvre un argument et clique sur « 🃏 Générer des flashcards ».</p>
      <div class="mise-en-page-filtres">
        <aside class="filtres carte">
          ${argFiltre ? `<div class="champ"><label>Argument</label><span class="chip chip-theme">${U.esc(argFiltre.idee.slice(0, 60))}${argFiltre.idee.length > 60 ? '…' : ''} <button data-sans-arg title="Retirer ce filtre">×</button></span></div>` : ''}
          <div class="champ"><label>Recherche</label><input type="search" data-f="texte" value="${U.esc(f.texte)}" placeholder="Mot du recto ou du verso"></div>
          <div class="champ"><label>Thème / chapitre</label><select data-f="theme">${optionsFiltreThemes(f.theme)}</select></div>
          <div class="champ"><label>État</label>
            <select data-f="etat">
              <option value="">Tous</option>
              ${Object.entries(LIBELLES_CATEGORIE).map(([k, v]) => `<option value="${k}" ${f.etat === k ? 'selected' : ''}>${v.texte}</option>`).join('')}
            </select></div>
          <div class="champ"><label>Origine</label>
            <select data-f="source">
              <option value="">Toutes</option>
              <option value="manuel" ${f.source === 'manuel' ? 'selected' : ''}>Créées à la main</option>
              <option value="argument" ${f.source === 'argument' ? 'selected' : ''}>Générées depuis un argument</option>
              <option value="import" ${f.source === 'import' ? 'selected' : ''}>Importées</option>
              <option value="demo" ${f.source === 'demo' ? 'selected' : ''}>Démo</option>
            </select></div>
          <button class="btn btn-discret btn-bloc btn-petit" data-reinit>Effacer les filtres</button>
        </aside>
        <section>
          <div class="muet petit" data-compte style="margin-bottom:10px"></div>
          <div data-liste></div>
        </section>
      </div>`;

    el.querySelector('[data-nouvelle]').addEventListener('click', () => Flashcards.ouvrirFormulaire(null, { rattachement: f.theme && f.theme !== '__aucun' ? f.theme : '' }));
    el.querySelectorAll('[data-f]').forEach((champ) => champ.addEventListener(champ.tagName === 'INPUT' ? 'input' : 'change', () => {
      this.filtres[champ.dataset.f] = champ.value;
      this.limite = 100;
      this.dessinerListe(el);
    }));
    el.querySelector('[data-reinit]').addEventListener('click', () => { this.filtres = { theme: '', etat: '', source: '', texte: '', argument: '' }; App.aller('flashcards'); });
    const sansArg = el.querySelector('[data-sans-arg]');
    if (sansArg) sansArg.addEventListener('click', () => { this.filtres.argument = ''; App.aller('flashcards'); });
    el.querySelector('[data-liste]').addEventListener('click', (e) => {
      if (e.target.closest('[data-plus]')) { this.limite += 100; this.dessinerListe(el); return; }
      const ligne = e.target.closest('[data-id]');
      if (ligne) Flashcards.ouvrirFiche(ligne.dataset.id);
    });
    this.dessinerListe(el);
  },

  filtrer() {
    const f = this.filtres;
    const jour = Revision.jour();
    let liste = Stockage.donnees.flashcards.filter((c) => Flashcards.correspond(c, f.theme));
    if (f.argument) liste = liste.filter((c) => c.argumentId === f.argument);
    if (f.etat) liste = liste.filter((c) => Revision.categorie(c, jour) === f.etat);
    if (f.source === 'demo') liste = liste.filter((c) => c.demo);
    else if (f.source) liste = liste.filter((c) => (c.source || 'manuel') === f.source);
    if (f.texte.trim()) {
      const mots = U.norm(f.texte).split(' ');
      liste = liste.filter((c) => { const t = U.norm(c.recto + ' ' + c.verso); return mots.every((m) => t.includes(m)); });
    }
    return liste.sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''));
  },

  dessinerListe(el) {
    const liste = this.filtrer();
    const total = Stockage.donnees.flashcards.length;
    el.querySelector('[data-compte]').textContent = liste.length === total ? U.pluriel(total, 'carte') : `${liste.length} sur ${U.pluriel(total, 'carte')}`;
    const zone = el.querySelector('[data-liste]');
    if (!liste.length) {
      zone.innerHTML = `<div class="carte vide">${total ? 'Aucune carte ne correspond à ces filtres.' : 'Aucune flashcard pour l\'instant. Crée-en une, génère-les depuis un argument, ou importe-les.'}</div>`;
      return;
    }
    const jour = Revision.jour();
    zone.innerHTML = liste.slice(0, this.limite).map((c) => {
      const cat = LIBELLES_CATEGORIE[Revision.categorie(c, jour)];
      const r = c.rattachement ? Stockage.rattachement(c.rattachement) : null;
      return `
        <div class="carte carte-cliquable" data-id="${c.id}" style="padding:12px 16px; margin-bottom:10px">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start">
            <div class="texte-riche" style="font-weight:600">${U.md(c.recto)}</div>
            <span class="chip" style="${cat.style}; flex-shrink:0">${cat.texte}</span>
          </div>
          <div class="muet petit">${U.esc(c.verso.replace(/\*\*/g, '').slice(0, 140))}${c.verso.length > 140 ? '…' : ''}</div>
          <div class="petit" style="margin-top:4px">
            ${c.demo ? '<span class="chip chip-demo">Démo</span>' : ''}
            ${r ? `<span class="chip chip-theme">${U.esc(r.nom)}</span>` : '<span class="chip">Non classée</span>'}
            ${c.argumentId ? '<span class="chip">🔗 argument</span>' : ''}
            <span class="muet">${Revision.libelleEcheance(c, jour)}</span>
          </div>
        </div>`;
    }).join('') + (liste.length > this.limite ? `<button class="btn btn-bloc" data-plus>Afficher plus (${liste.length - this.limite} restantes)</button>` : '');
  },
};
