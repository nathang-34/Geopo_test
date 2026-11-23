/* =========================================================
   colle.js : page « Mode colle » (étape 5)
   1. Tirage au sort d'un sujet (liste de sujets de colle par
      chapitre + sujets des plans de dissertation) ;
   2. Préparation avec minuteur et brouillon ;
   3. Oral avec minuteur ;
   4. Correction : arguments pertinents de la banque (même
      recherche que l'aide au plan), arguments utilisés,
      note sur 20 et commentaire, gardés dans l'historique.
   Données : donnees.sujetsColle et donnees.colles.
   ========================================================= */

const COLLE_HISTORIQUE_MAX = 200;
const COLLE_NB_ARGUMENTS = 12;

Vues.colle = {
  session: null,   // colle en cours (gardée si on change de page)
  filtre: '',
  avecPlans: true,
  intervalle: null,

  rendre(el) {
    this.el = el;
    clearInterval(this.intervalle);
    const s = this.session;
    if (!s) this.dessinerAccueil();
    else if (s.etape === 'tirage') this.dessinerTirage();
    else if (s.etape === 'prepa' || s.etape === 'oral') this.dessinerMinuteur();
    else this.dessinerCorrection();
  },

  /* ---------------- Sujets ---------------- */

  /** Le sujet (de la liste) correspond-il au filtre thème / chapitre ? */
  correspond(rattachement, filtre) {
    if (!filtre) return true;
    if (filtre === '__aucun') return !rattachement || !Stockage.rattachement(rattachement);
    const r = Stockage.rattachement(filtre);
    if (!r) return false;
    const ids = r.type === 'theme' ? Stockage.idsDuTheme(r.theme) : [filtre];
    return ids.includes(rattachement);
  },

  /** Un plan correspond au filtre s'il contient au moins un argument de ce thème / chapitre */
  planCorrespond(p, filtre) {
    if (!filtre) return true;
    if (filtre === '__aucun') return false;
    const ids = new Set(Stockage.argumentsDe(filtre).map((a) => a.id));
    return p.parties.some((pa) => pa.sousParties.some((sp) => sp.argumentIds.some((id) => ids.has(id))));
  },

  /** Tous les sujets possibles pour le filtre : [{ cle, texte, rattachement, origine, sujetId?, planId? }] */
  sujetsPossibles(filtre = this.filtre, avecPlans = this.avecPlans) {
    const d = Stockage.donnees;
    const res = d.sujetsColle
      .filter((s) => this.correspond(s.rattachement, filtre))
      .map((s) => ({ cle: 's:' + s.id, texte: s.texte, rattachement: s.rattachement, origine: 'liste', sujetId: s.id }));
    if (avecPlans) {
      const deja = new Set(res.map((s) => U.norm(s.texte)));
      for (const p of d.plans) {
        const t = (p.sujet || '').trim();
        if (!t || deja.has(U.norm(t)) || !this.planCorrespond(p, filtre)) continue;
        deja.add(U.norm(t));
        res.push({ cle: 'p:' + p.id, texte: t, rattachement: null, origine: 'plan', planId: p.id });
      }
    }
    return res;
  },

  /** Colles déjà passées sur ce sujet (par texte, accents ignorés) */
  collesDu(texte) {
    const n = U.norm(texte);
    return Stockage.donnees.colles.filter((c) => U.norm(c.sujet) === n);
  },

  /**
   * Tire un sujet au hasard en favorisant ceux jamais tirés,
   * puis ceux tirés il y a le plus longtemps. Évite de retomber sur « exclure ».
   */
  tirer(exclure = null) {
    let liste = this.sujetsPossibles();
    if (liste.length > 1 && exclure) liste = liste.filter((s) => s.cle !== exclure);
    if (!liste.length) return null;
    const derniere = (s) => {
      const c = this.collesDu(s.texte);
      return c.length ? c.reduce((m, x) => (x.date > m ? x.date : m), '') : '';
    };
    const jamais = liste.filter((s) => !derniere(s));
    let candidats = jamais;
    if (!candidats.length) {
      // La moitié la plus ancienne (au moins un sujet)
      const tries = liste.slice().sort((a, b) => derniere(a).localeCompare(derniere(b)));
      candidats = tries.slice(0, Math.max(1, Math.ceil(tries.length / 2)));
    }
    return candidats[Math.floor(Math.random() * candidats.length)];
  },

  nomRattachement(id) {
    const r = id && Stockage.rattachement(id);
    return r ? r.nom : '';
  },

  /* ---------------- Accueil ---------------- */

  dessinerAccueil() {
    const el = this.el;
    const d = Stockage.donnees;
    const r = d.reglages;
    const possibles = this.sujetsPossibles();
    const nbPlans = possibles.filter((s) => s.origine === 'plan').length;
    const colles = d.colles.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const notees = colles.filter((c) => typeof c.note === 'number');
    const moyenne = notees.length ? notees.reduce((s, c) => s + c.note, 0) / notees.length : null;

    el.innerHTML = `
      <div class="entete-vue">
        <h1>🎤 Mode colle</h1>
        <div class="barre-actions">
          <button class="btn" data-ajout-bloc>📋 Ajouter plusieurs sujets</button>
          <button class="btn" data-ajout>➕ Ajouter un sujet</button>
        </div>
      </div>
      <p class="muet">Entraîne-toi comme en colle : un sujet tiré au sort, un temps de préparation avec un brouillon, puis un oral chronométré. À la fin, le site te montre les arguments de ta banque qui auraient pu servir.</p>

      <div class="colle-accueil">
        <div class="carte">
          <h2>🎲 Nouvelle colle</h2>
          <div class="champ">
            <label>Thème ou chapitre</label>
            <select data-filtre>${optionsFiltreThemes(this.filtre)}</select>
          </div>
          <label class="case"><input type="checkbox" data-avec-plans ${this.avecPlans ? 'checked' : ''}> Inclure les sujets de mes plans de dissertation</label>
          <div class="ligne-champs colle-durees">
            <div class="champ">
              <label>Préparation <span class="aide">(minutes)</span></label>
              <input type="number" min="0" max="180" step="1" data-duree="collePrepa" value="${r.collePrepa}">
            </div>
            <div class="champ">
              <label>Oral <span class="aide">(minutes)</span></label>
              <input type="number" min="0" max="120" step="1" data-duree="colleOral" value="${r.colleOral}">
            </div>
          </div>
          <p class="aide">0 minute = pas de compte à rebours (le temps passé est seulement mesuré).</p>
          <p class="muet petit">${possibles.length
            ? `${U.pluriel(possibles.length, 'sujet possible', 'sujets possibles')}${nbPlans ? ` (dont ${nbPlans} venant de tes plans)` : ''}.`
            : 'Aucun sujet pour cette sélection. Ajoute des sujets de colle avec les boutons en haut de la page.'}</p>
          <button class="btn btn-principal btn-grand" data-tirer ${possibles.length ? '' : 'disabled'}>🎲 Tirer un sujet</button>
        </div>

        <div class="carte">
          <h2>📈 Mes colles</h2>
          ${colles.length ? `
            <div class="grille-stats colle-stats">
              <div class="stat"><div class="stat-valeur">${colles.length}</div><div class="stat-libelle">colle${colles.length > 1 ? 's' : ''} passée${colles.length > 1 ? 's' : ''}</div></div>
              <div class="stat"><div class="stat-valeur">${moyenne === null ? '–' : this.note(moyenne)}</div><div class="stat-libelle">moyenne sur 20</div></div>
            </div>
            <table class="tableau-simple colle-historique">
              <thead><tr><th>Date</th><th>Sujet</th><th>Note</th></tr></thead>
              <tbody>
                ${colles.slice(0, 15).map((c) => `
                  <tr class="ligne-cliquable" data-colle="${c.id}">
                    <td class="petit">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
                    <td>${U.esc(c.sujet)}</td>
                    <td><strong>${typeof c.note === 'number' ? this.note(c.note) : '–'}</strong></td>
                  </tr>`).join('')}
              </tbody>
            </table>
            ${colles.length > 15 ? `<p class="muet petit">Les 15 dernières sur ${colles.length}.</p>` : ''}`
          : '<p class="muet">Aucune colle passée pour l\'instant. Ton historique et tes notes apparaîtront ici.</p>'}
        </div>
      </div>

      <div class="carte">
        <h2>📚 Sujets de colle <span class="muet petit">(${d.sujetsColle.length})</span></h2>
        <div data-liste-sujets></div>
      </div>`;

    el.querySelector('[data-filtre]').addEventListener('change', (e) => { this.filtre = e.target.value; this.dessinerAccueil(); });
    el.querySelector('[data-avec-plans]').addEventListener('change', (e) => { this.avecPlans = e.target.checked; this.dessinerAccueil(); });
    el.querySelectorAll('[data-duree]').forEach((champ) => champ.addEventListener('change', () => {
      let v = Math.round(Number(champ.value));
      if (!Number.isFinite(v) || v < 0) v = 0;
      v = Math.min(v, Number(champ.max));
      champ.value = v;
      Stockage.reglage(champ.dataset.duree, v);
    }));
    el.querySelector('[data-tirer]').addEventListener('click', () => {
      const s = this.tirer();
      if (!s) return;
      this.session = { etape: 'tirage', sujet: s, filtre: this.filtre };
      this.dessinerTirage();
    });
    el.querySelector('[data-ajout]').addEventListener('click', () => this.ouvrirSujet(null));
    el.querySelector('[data-ajout-bloc]').addEventListener('click', () => this.ouvrirAjoutBloc());
    el.querySelectorAll('[data-colle]').forEach((tr) => tr.addEventListener('click', () => this.ouvrirColle(tr.dataset.colle)));
    this.dessinerListeSujets();
  },

  /** Note lisible : 14.5 -> "14,5" */
  note(n) {
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  },

  dessinerListeSujets() {
    const zone = this.el.querySelector('[data-liste-sujets]');
    const d = Stockage.donnees;
    if (!d.sujetsColle.length) {
      zone.innerHTML = `<p class="muet">Aucun sujet enregistré. Ajoute les sujets donnés par ton professeur, ou colle-en une liste d'un coup (un sujet par ligne) avec « 📋 Ajouter plusieurs sujets ».</p>`;
      return;
    }
    // Rangés par thème / chapitre, dans l'ordre de la page Thèmes
    const groupes = [];
    for (const t of d.themes) {
      for (const id of [t.id, ...t.chapitres.map((c) => c.id)]) {
        const liste = d.sujetsColle.filter((s) => s.rattachement === id);
        if (liste.length) groupes.push({ nom: this.nomRattachement(id), liste });
      }
    }
    const sans = d.sujetsColle.filter((s) => !s.rattachement || !Stockage.rattachement(s.rattachement));
    if (sans.length) groupes.push({ nom: 'Non classés', liste: sans });

    zone.innerHTML = groupes.map((g) => `
      <h3 class="colle-groupe">${U.esc(g.nom)}</h3>
      <ul class="liste-sujets">
        ${g.liste.map((s) => {
          const c = this.collesDu(s.texte);
          const notes = c.filter((x) => typeof x.note === 'number');
          const info = c.length ? `${U.pluriel(c.length, 'fois', 'fois')}${notes.length ? ` · dernière note ${this.note(notes.sort((a, b) => b.date.localeCompare(a.date))[0].note)}` : ''}` : 'jamais tiré';
          return `<li>
            <span class="sujet-texte">${s.demo ? '<span class="chip chip-demo">Démo</span> ' : ''}${U.esc(s.texte)}</span>
            <span class="muet petit">${info}</span>
            <span class="outils">
              <button class="btn btn-discret btn-petit" data-passer="${s.id}" title="Passer une colle sur ce sujet">▶️</button>
              <button class="btn btn-discret btn-petit" data-modif="${s.id}" title="Modifier">✏️</button>
              <button class="btn btn-discret btn-petit" data-suppr="${s.id}" title="Supprimer">✕</button>
            </span>
          </li>`;
        }).join('')}
      </ul>`).join('');

    zone.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.modif) this.ouvrirSujet(b.dataset.modif);
      else if (b.dataset.passer) {
        const s = d.sujetsColle.find((x) => x.id === b.dataset.passer);
        if (!s) return;
        this.session = { etape: 'tirage', sujet: { cle: 's:' + s.id, texte: s.texte, rattachement: s.rattachement, origine: 'liste', sujetId: s.id }, filtre: this.filtre, choisi: true };
        this.dessinerTirage();
      } else if (b.dataset.suppr) {
        const s = d.sujetsColle.find((x) => x.id === b.dataset.suppr);
        if (!s) return;
        const ok = await confirmer(`<p>Supprimer ce sujet de colle ?</p><p class="muet">« ${U.esc(s.texte)} »</p><p class="petit muet">L'historique des colles déjà passées est conservé.</p>`,
          { titre: 'Supprimer un sujet', texteOk: 'Supprimer', danger: true });
        if (!ok) return;
        Stockage.modifier((dd) => { dd.sujetsColle = dd.sujetsColle.filter((x) => x.id !== s.id); });
        toast('Sujet supprimé.');
        this.dessinerAccueil();
      }
    });
  },

  /** Options de chapitre pour le rangement d'un sujet */
  optionsRangement(selection) {
    let html = '<option value="">Non classé</option>';
    for (const t of Stockage.donnees.themes) {
      html += `<option value="${t.id}" ${selection === t.id ? 'selected' : ''}>${U.esc(t.nom)} (thème entier)</option>`;
      for (const c of t.chapitres) html += `<option value="${c.id}" ${selection === c.id ? 'selected' : ''}>   ↳ ${U.esc(c.nom)}</option>`;
    }
    return html;
  },

  /** Rangement proposé par défaut : le filtre choisi s'il désigne un thème ou un chapitre */
  rangementParDefaut() {
    return this.filtre && this.filtre !== '__aucun' && Stockage.rattachement(this.filtre) ? this.filtre : '';
  },

  /** Ajout (id null) ou modification d'un sujet */
  ouvrirSujet(id) {
    const s = id ? Stockage.donnees.sujetsColle.find((x) => x.id === id) : null;
    const m = Modal.ouvrir({
      titre: s ? 'Modifier le sujet' : 'Nouveau sujet de colle',
      contenu: `<form>
          <div class="champ">
            <label>Sujet</label>
            <textarea rows="2" data-texte placeholder="Ex : Les États-Unis et le monde de 1945 à 1991">${U.esc(s ? s.texte : '')}</textarea>
          </div>
          <div class="champ">
            <label>Chapitre</label>
            <select data-ratt>${this.optionsRangement(s ? s.rattachement : this.rangementParDefaut())}</select>
          </div>
          <div class="modal-pied">
            <button type="button" class="btn" data-non>Annuler</button>
            <button type="submit" class="btn btn-principal">${s ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>`,
    });
    const champ = m.corps.querySelector('[data-texte]');
    m.corps.querySelector('[data-non]').addEventListener('click', () => m.fermer(true));
    m.corps.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const texte = champ.value.replace(/\s+/g, ' ').trim();
      if (!texte) { champ.focus(); return; }
      const ratt = m.corps.querySelector('[data-ratt]').value || null;
      const maintenant = new Date().toISOString();
      if (!s && Stockage.donnees.sujetsColle.some((x) => U.norm(x.texte) === U.norm(texte))) {
        toast('Ce sujet est déjà dans ta liste.', 'attention');
        return;
      }
      Stockage.modifier((d) => {
        if (s) {
          const x = d.sujetsColle.find((y) => y.id === s.id);
          x.texte = texte; x.rattachement = ratt; x.modifieLe = maintenant;
          delete x.demo;
        } else {
          d.sujetsColle.push({ id: U.uid(), texte, rattachement: ratt, creeLe: maintenant, modifieLe: maintenant });
        }
      });
      m.fermer(true);
      toast(s ? 'Sujet modifié.' : 'Sujet ajouté.');
      this.dessinerAccueil();
    });
  },

  /** Ajout de plusieurs sujets d'un coup (un par ligne) */
  ouvrirAjoutBloc() {
    const m = Modal.ouvrir({
      titre: 'Ajouter plusieurs sujets',
      large: true,
      contenu: `
        <p>Colle ta liste : <strong>un sujet par ligne</strong>. Les numéros et tirets en début de ligne sont retirés, les sujets déjà présents sont ignorés.</p>
        <textarea data-bloc rows="12" placeholder="1. La Chine, une puissance mondiale ?&#10;2. Les décolonisations en Afrique&#10;- L'ONU, un acteur de la guerre froide ?"></textarea>
        <div class="champ" style="margin-top:12px">
          <label>Chapitre de ces sujets</label>
          <select data-ratt>${this.optionsRangement(this.rangementParDefaut())}</select>
        </div>
        <p class="muet petit" data-compte></p>
        <div class="modal-pied">
          <button class="btn" data-non>Annuler</button>
          <button class="btn btn-principal" data-ok>Ajouter</button>
        </div>`,
    });
    const zone = m.corps.querySelector('[data-bloc]');
    const compte = m.corps.querySelector('[data-compte]');
    const lignes = () => {
      const vus = new Set(Stockage.donnees.sujetsColle.map((x) => U.norm(x.texte)));
      const res = [];
      for (const brut of zone.value.split('\n')) {
        const t = brut.replace(/^\s*(?:[-•*–]|\d+\s*[.)°-]|[a-zA-Z]\))\s*/, '').replace(/\s+/g, ' ').trim();
        if (t.length < 3 || vus.has(U.norm(t))) continue;
        vus.add(U.norm(t));
        res.push(t);
      }
      return res;
    };
    zone.addEventListener('input', () => {
      const n = lignes().length;
      compte.textContent = n ? `${U.pluriel(n, 'nouveau sujet', 'nouveaux sujets')} à ajouter.` : '';
    });
    m.corps.querySelector('[data-non]').addEventListener('click', () => m.fermer(true));
    m.corps.querySelector('[data-ok]').addEventListener('click', () => {
      const liste = lignes();
      if (!liste.length) { toast('Aucun nouveau sujet à ajouter.', 'attention'); return; }
      const ratt = m.corps.querySelector('[data-ratt]').value || null;
      const maintenant = new Date().toISOString();
      Stockage.modifier((d) => {
        for (const texte of liste) d.sujetsColle.push({ id: U.uid(), texte, rattachement: ratt, creeLe: maintenant, modifieLe: maintenant });
      });
      m.fermer(true);
      toast(`${U.pluriel(liste.length, 'sujet ajouté', 'sujets ajoutés')}.`);
      this.dessinerAccueil();
    });
  },

  /* ---------------- Tirage ---------------- */

  dessinerTirage() {
    const s = this.session;
    const r = Stockage.donnees.reglages;
    const deja = this.collesDu(s.sujet.texte);
    const chap = this.nomRattachement(s.sujet.rattachement);
    this.el.innerHTML = `
      <div class="entete-vue"><h1>🎤 Mode colle</h1></div>
      <div class="carte colle-sujet-carte">
        <div class="muet petit">${s.choisi ? 'Sujet choisi' : 'Sujet tiré au sort'}${chap ? ' · ' + U.esc(chap) : ''}${s.sujet.origine === 'plan' ? ' · vient de tes plans' : ''}</div>
        <div class="colle-sujet">${U.esc(s.sujet.texte)}</div>
        ${deja.length ? `<p class="muet petit">Déjà passé ${U.pluriel(deja.length, 'fois', 'fois')}.</p>` : ''}
        <p class="muet">Préparation : <strong>${this.libelleDuree(r.collePrepa)}</strong> · Oral : <strong>${this.libelleDuree(r.colleOral)}</strong></p>
        <div class="barre-actions colle-actions">
          <button class="btn btn-principal btn-grand" data-commencer>▶️ Commencer la préparation</button>
          ${s.choisi ? '' : `<button class="btn" data-autre ${this.sujetsPossibles().length > 1 ? '' : 'disabled'}>🎲 Un autre sujet</button>`}
          <button class="btn btn-discret" data-annuler>Annuler</button>
        </div>
      </div>`;
    const b = (sel, fn) => { const x = this.el.querySelector(sel); if (x) x.addEventListener('click', fn); };
    b('[data-commencer]', () => this.commencer());
    b('[data-autre]', () => {
      const n = this.tirer(s.sujet.cle);
      if (n) { s.sujet = n; this.dessinerTirage(); }
    });
    b('[data-annuler]', () => { this.session = null; this.dessinerAccueil(); });
  },

  libelleDuree(min) {
    return min > 0 ? U.pluriel(min, 'minute') : 'sans minuteur';
  },

  /* ---------------- Minuteurs ---------------- */

  commencer() {
    const s = this.session;
    const r = Stockage.donnees.reglages;
    s.dureePrepa = r.collePrepa;
    s.dureeOral = r.colleOral;
    s.debut = new Date().toISOString();
    s.brouillon = '';
    s.ecoule = { prepa: 0, oral: 0 };
    this.lancerEtape('prepa');
  },

  /** Démarre une étape (prepa ou oral) : le chrono repart de zéro */
  lancerEtape(etape) {
    const s = this.session;
    s.etape = etape;
    s.depart = Date.now();   // instant de départ (ou de reprise)
    s.cumul = 0;             // temps déjà écoulé avant la dernière pause (ms)
    s.enPause = false;
    s.sonne = false;
    this.dessinerMinuteur();
  },

  /** Temps écoulé dans l'étape en cours (ms) */
  ecouleMs() {
    const s = this.session;
    return s.cumul + (s.enPause ? 0 : Date.now() - s.depart);
  },

  formater(ms) {
    const total = Math.floor(Math.abs(ms) / 1000);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  },

  dessinerMinuteur() {
    const s = this.session;
    const prepa = s.etape === 'prepa';
    const duree = prepa ? s.dureePrepa : s.dureeOral;
    this.el.innerHTML = `
      <div class="entete-vue">
        <h1>${prepa ? '📝 Préparation' : '🎙️ Oral'}</h1>
        <div class="etapes-colle">
          <span class="${prepa ? 'actuelle' : 'faite'}">1. Préparation</span>
          <span class="${prepa ? '' : 'actuelle'}">2. Oral</span>
          <span>3. Correction</span>
        </div>
      </div>
      <div class="colle-minuteur-zone">
        <div class="carte colle-sujet-carte">
          <div class="colle-sujet petit-sujet">${U.esc(s.sujet.texte)}</div>
          <div class="minuteur" data-minuteur aria-live="off">--:--</div>
          <div class="barre-fond minuteur-barre"><div class="barre-rempli" data-barre style="width:0%"></div></div>
          <div class="muet petit" data-info-temps></div>
          <div class="barre-actions colle-actions">
            <button class="btn" data-pause>${s.enPause ? '▶️ Reprendre' : '⏸️ Pause'}</button>
            ${prepa
              ? '<button class="btn btn-principal" data-suivant>🎙️ Passer à l\'oral</button>'
              : '<button class="btn btn-principal" data-suivant>✅ Terminer l\'oral</button>'}
            <button class="btn btn-discret" data-abandon>Abandonner</button>
          </div>
        </div>
        <div class="carte">
          <label for="brouillon-colle">Brouillon ${prepa ? '<span class="aide">(problématique, plan, exemples : enregistré pendant la colle)</span>' : '<span class="aide">(tes notes de préparation)</span>'}</label>
          <textarea id="brouillon-colle" class="brouillon-colle" data-brouillon rows="18" placeholder="Accroche, définitions, problématique...&#10;I.&#10;  A.&#10;  B.&#10;II.&#10;...">${U.esc(s.brouillon)}</textarea>
        </div>
      </div>`;

    const brouillon = this.el.querySelector('[data-brouillon]');
    brouillon.addEventListener('input', () => { s.brouillon = brouillon.value; });
    if (prepa) setTimeout(() => brouillon.focus(), 30);

    this.el.querySelector('[data-pause]').addEventListener('click', (e) => {
      if (s.enPause) { s.depart = Date.now(); s.enPause = false; }
      else { s.cumul += Date.now() - s.depart; s.enPause = true; }
      e.currentTarget.textContent = s.enPause ? '▶️ Reprendre' : '⏸️ Pause';
      this.tic();
    });
    this.el.querySelector('[data-suivant]').addEventListener('click', () => {
      s.ecoule[s.etape] = Math.round(this.ecouleMs() / 1000);
      clearInterval(this.intervalle);
      if (prepa) this.lancerEtape('oral');
      else this.terminer();
    });
    this.el.querySelector('[data-abandon]').addEventListener('click', async () => {
      const ok = await confirmer('<p>Abandonner cette colle ?</p><p class="muet petit">Elle ne sera pas enregistrée dans ton historique.</p>', { texteOk: 'Abandonner', danger: true });
      if (!ok) return;
      clearInterval(this.intervalle);
      this.session = null;
      this.dessinerAccueil();
    });

    clearInterval(this.intervalle);
    this.tic();
    this.intervalle = setInterval(() => this.tic(), 250);
  },

  /** Met à jour l'affichage du minuteur (et sonne une fois à la fin du temps) */
  tic() {
    const s = this.session;
    if (!s || (s.etape !== 'prepa' && s.etape !== 'oral')) { clearInterval(this.intervalle); return; }
    const duree = (s.etape === 'prepa' ? s.dureePrepa : s.dureeOral) * 60000;
    const ecoule = this.ecouleMs();
    if (duree && ecoule >= duree && !s.sonne) {
      s.sonne = true;
      this.sonner();
      toast(s.etape === 'prepa' ? 'Temps de préparation écoulé : place à l\'oral !' : 'Temps d\'oral écoulé : conclus !', 'attention', 6000);
    }
    const aff = this.el && this.el.querySelector('[data-minuteur]');
    if (!aff || !document.body.contains(aff)) return; // page quittée : le chrono continue sans affichage
    const barre = this.el.querySelector('[data-barre]');
    const info = this.el.querySelector('[data-info-temps]');
    if (!duree) {
      aff.textContent = this.formater(ecoule);
      aff.className = 'minuteur';
      barre.parentElement.style.display = 'none';
      info.textContent = s.enPause ? 'En pause · temps écoulé' : 'Temps écoulé (pas de limite)';
      return;
    }
    const reste = duree - ecoule;
    const depasse = reste < 0;
    aff.textContent = (depasse ? '+' : '') + this.formater(reste);
    aff.className = 'minuteur' + (depasse ? ' depasse' : reste <= 60000 ? ' bientot' : '') + (s.enPause ? ' pause' : '');
    barre.style.width = Math.min(100, (ecoule / duree) * 100) + '%';
    barre.classList.toggle('depasse', depasse);
    info.textContent = s.enPause ? 'En pause' : depasse ? `Temps dépassé (prévu : ${this.libelleDuree(duree / 60000)})` : `Temps restant sur ${this.libelleDuree(duree / 60000)}`;
  },

  /** Petit signal sonore (trois bips), sans fichier audio */
  sonner() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [0, 0.35, 0.7].forEach((t) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.3);
      });
      setTimeout(() => ctx.close(), 1500);
    } catch (e) { /* pas de son : tant pis */ }
  },

  /* ---------------- Correction ---------------- */

  terminer() {
    const s = this.session;
    s.etape = 'correction';
    const res = Pertinence.rechercher(s.sujet.texte);
    s.proposes = res.sansCritere ? [] : res.resultats.slice(0, COLLE_NB_ARGUMENTS).map((x) => ({ id: x.arg.id, score: x.score, trouves: x.trouves }));
    s.notions = res.sansCritere ? [] : res.concepts.map((c) => c.libelle).concat(res.plage ? [`${res.plage[0]}-${res.plage[1]}`] : []);
    s.utilises = [];
    s.note = null;
    s.commentaire = '';
    this.dessinerCorrection();
  },

  dessinerCorrection() {
    const s = this.session;
    const args = s.proposes.map((p) => ({ ...p, arg: Stockage.donnees.arguments.find((a) => a.id === p.id) })).filter((p) => p.arg);
    const max = Math.max(0.0001, ...args.map((p) => p.score));
    this.el.innerHTML = `
      <div class="entete-vue">
        <h1>🧐 Correction</h1>
        <div class="etapes-colle"><span class="faite">1. Préparation</span><span class="faite">2. Oral</span><span class="actuelle">3. Correction</span></div>
      </div>
      <div class="carte colle-sujet-carte">
        <div class="colle-sujet petit-sujet">${U.esc(s.sujet.texte)}</div>
        <p class="muet petit">Préparation : ${this.formater(s.ecoule.prepa * 1000)}${s.dureePrepa ? ` / ${s.dureePrepa} min` : ''} · Oral : ${this.formater(s.ecoule.oral * 1000)}${s.dureeOral ? ` / ${s.dureeOral} min` : ''}</p>
      </div>

      <div class="colle-correction">
        <div>
          <div class="carte">
            <h2>📌 Arguments de ta banque pour ce sujet</h2>
            ${s.notions.length ? `<p class="petit muet">Notions repérées dans le sujet : ${s.notions.map((n) => `<span class="chip chip-trouve">${U.esc(n)}</span>`).join(' ')}</p>` : ''}
            ${args.length ? `
              <p class="petit">Coche ceux que tu as utilisés à l'oral. Ouvre-les pour revoir exemples et citations.</p>
              <div class="colle-arguments">
                ${args.map(({ arg, score, trouves }) => `
                  <details class="colle-arg">
                    <summary>
                      <label class="case"><input type="checkbox" data-utilise="${arg.id}" ${s.utilises.includes(arg.id) ? 'checked' : ''} title="Je l'ai utilisé"></label>
                      <span class="colle-arg-idee">${arg.demo ? '<span class="chip chip-demo">Démo</span> ' : ''}${U.esc(arg.idee)}</span>
                      <span class="jauge-pertinence" title="Pertinence"><span style="width:${Math.max(6, Math.round((score / max) * 100))}%"></span></span>
                    </summary>
                    <div class="colle-arg-corps">
                      ${arg.explication ? `<div class="texte-riche">${U.md(arg.explication)}</div>` : ''}
                      ${arg.exemples.map((x) => `<div class="exemple-chiffre">${U.esc(x.mesure)} : <span class="valeur">${U.esc(x.chiffre)}</span>${x.date || x.source ? `<span class="muet petit"> (${[x.date, x.source].filter(Boolean).map(U.esc).join(', ')})</span>` : ''}</div>`).join('')}
                      ${arg.citations.map((c) => `<blockquote class="citation">« ${U.esc(c.texte)} »<footer>${U.esc(c.auteur)}${c.contexte ? ', ' + U.esc(c.contexte) : ''}</footer></blockquote>`).join('')}
                      <div class="petit">${trouves.map((t) => `<span class="chip chip-trouve">${U.esc(t)}</span>`).join(' ')}
                        <a href="javascript:void 0" data-fiche="${arg.id}">Ouvrir la fiche complète</a></div>
                    </div>
                  </details>`).join('')}
              </div>
              <p class="petit muet" data-bilan-args></p>`
            : '<p class="muet">Aucun argument de ta banque ne correspond aux mots de ce sujet. Ajoute des arguments sur ce chapitre, ou des synonymes de recherche (page Plans).</p>'}
          </div>
        </div>

        <div>
          <div class="carte">
            <h2>📝 Ton bilan</h2>
            <div class="champ">
              <label>Note sur 20 <span class="aide">(auto-évaluation, facultative)</span></label>
              <input type="text" inputmode="decimal" data-note value="${s.note === null ? '' : this.note(s.note)}" placeholder="Ex : 13,5" style="max-width:120px">
            </div>
            <div class="champ">
              <label>Commentaire <span class="aide">(ce qui a marché, ce qu'il faut revoir)</span></label>
              <textarea rows="4" data-commentaire>${U.esc(s.commentaire)}</textarea>
            </div>
            <div class="barre-actions">
              <button class="btn btn-principal" data-enregistrer>💾 Enregistrer la colle</button>
              <button class="btn btn-discret" data-jeter>Ne pas enregistrer</button>
            </div>
          </div>
          <div class="carte">
            <details ${s.brouillon ? 'open' : ''}>
              <summary><strong>Ton brouillon</strong></summary>
              <div class="brouillon-lecture">${s.brouillon ? U.esc(s.brouillon) : '<span class="muet">(vide)</span>'}</div>
            </details>
          </div>
        </div>
      </div>`;

    const el = this.el;
    const majBilan = () => {
      const z = el.querySelector('[data-bilan-args]');
      if (z) z.textContent = `${s.utilises.length} argument${s.utilises.length > 1 ? 's' : ''} utilisé${s.utilises.length > 1 ? 's' : ''} sur ${args.length} proposé${args.length > 1 ? 's' : ''}.`;
    };
    majBilan();
    el.querySelectorAll('[data-utilise]').forEach((c) => c.addEventListener('change', () => {
      s.utilises = s.utilises.filter((x) => x !== c.dataset.utilise);
      if (c.checked) s.utilises.push(c.dataset.utilise);
      majBilan();
    }));
    el.querySelectorAll('[data-fiche]').forEach((a) => a.addEventListener('click', () => Vues.arguments.ouvrirFiche(a.dataset.fiche)));
    const champNote = el.querySelector('[data-note]');
    champNote.addEventListener('input', () => { s.noteTexte = champNote.value; });
    el.querySelector('[data-commentaire]').addEventListener('input', (e) => { s.commentaire = e.target.value; });
    el.querySelector('[data-enregistrer]').addEventListener('click', () => {
      const brut = champNote.value.trim().replace(',', '.');
      let note = null;
      if (brut) {
        note = Number(brut);
        if (!Number.isFinite(note) || note < 0 || note > 20) { toast('La note doit être un nombre entre 0 et 20.', 'erreur'); champNote.focus(); return; }
      }
      s.note = note;
      this.enregistrer();
    });
    el.querySelector('[data-jeter]').addEventListener('click', async () => {
      const ok = await confirmer('<p>Quitter sans enregistrer cette colle ?</p>', { texteOk: 'Quitter sans enregistrer', danger: true });
      if (!ok) return;
      this.session = null;
      this.dessinerAccueil();
    });
  },

  enregistrer() {
    const s = this.session;
    const maintenant = new Date().toISOString();
    const colle = {
      id: U.uid(),
      sujet: s.sujet.texte,
      sujetId: s.sujet.sujetId || null,
      planId: s.sujet.planId || null,
      rattachement: s.sujet.rattachement || null,
      date: s.debut,
      dureePrepa: s.dureePrepa,
      dureeOral: s.dureeOral,
      tempsPrepa: s.ecoule.prepa,
      tempsOral: s.ecoule.oral,
      brouillon: s.brouillon,
      note: s.note,
      commentaire: s.commentaire.trim(),
      argumentsProposes: s.proposes.map((p) => p.id),
      argumentsUtilises: s.utilises.slice(),
      creeLe: maintenant,
      modifieLe: maintenant,
    };
    Stockage.modifier((d) => {
      d.colles.push(colle);
      if (d.colles.length > COLLE_HISTORIQUE_MAX) {
        d.colles.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        d.colles = d.colles.slice(-COLLE_HISTORIQUE_MAX);
      }
    });
    this.session = null;
    toast('Colle enregistrée dans ton historique.');
    this.dessinerAccueil();
  },

  /* ---------------- Historique ---------------- */

  ouvrirColle(id) {
    const c = Stockage.donnees.colles.find((x) => x.id === id);
    if (!c) return;
    const nomArg = (aid) => {
      const a = Stockage.donnees.arguments.find((x) => x.id === aid);
      return a ? `<a href="javascript:void 0" data-fiche="${a.id}">${U.esc(a.idee)}</a>` : '<em class="muet">argument supprimé</em>';
    };
    const nonUtilises = (c.argumentsProposes || []).filter((x) => !(c.argumentsUtilises || []).includes(x));
    const m = Modal.ouvrir({
      titre: 'Colle du ' + U.dateLisible(c.date),
      large: true,
      contenu: `
        <div class="colle-sujet petit-sujet">${U.esc(c.sujet)}</div>
        <p class="muet petit">${this.nomRattachement(c.rattachement) ? U.esc(this.nomRattachement(c.rattachement)) + ' · ' : ''}Préparation ${this.formater(c.tempsPrepa * 1000)} · Oral ${this.formater(c.tempsOral * 1000)}</p>
        <p><strong>Note :</strong> ${typeof c.note === 'number' ? this.note(c.note) + ' / 20' : 'non notée'}</p>
        ${c.commentaire ? `<p><strong>Commentaire :</strong> ${U.esc(c.commentaire)}</p>` : ''}
        ${(c.argumentsUtilises || []).length ? `<h3>Arguments utilisés</h3><ul>${c.argumentsUtilises.map((x) => `<li>${nomArg(x)}</li>`).join('')}</ul>` : ''}
        ${nonUtilises.length ? `<h3>Arguments proposés non utilisés</h3><ul>${nonUtilises.map((x) => `<li>${nomArg(x)}</li>`).join('')}</ul>` : ''}
        <h3>Brouillon</h3>
        <div class="brouillon-lecture">${c.brouillon ? U.esc(c.brouillon) : '<span class="muet">(vide)</span>'}</div>
        <div class="modal-pied">
          <button class="btn btn-danger" data-suppr style="margin-right:auto">Supprimer</button>
          <button class="btn" data-plan>📝 En faire un plan</button>
          <button class="btn btn-principal" data-refaire>🔁 Repasser ce sujet</button>
        </div>`,
    });
    m.corps.querySelectorAll('[data-fiche]').forEach((a) => a.addEventListener('click', () => Vues.arguments.ouvrirFiche(a.dataset.fiche)));
    m.corps.querySelector('[data-suppr]').addEventListener('click', async () => {
      const ok = await confirmer('Supprimer cette colle de ton historique ?', { texteOk: 'Supprimer', danger: true });
      if (!ok) return;
      Stockage.modifier((d) => { d.colles = d.colles.filter((x) => x.id !== id); });
      m.fermer(true);
      toast('Colle supprimée.');
      this.dessinerAccueil();
    });
    m.corps.querySelector('[data-refaire]').addEventListener('click', () => {
      m.fermer(true);
      this.session = { etape: 'tirage', sujet: { cle: 'h:' + c.id, texte: c.sujet, rattachement: c.rattachement, origine: 'liste', sujetId: c.sujetId }, filtre: this.filtre, choisi: true };
      this.dessinerTirage();
    });
    m.corps.querySelector('[data-plan]').addEventListener('click', () => {
      const p = Vues.plans.planVide(c.sujet);
      p.introduction = c.brouillon ? 'Brouillon de colle (' + new Date(c.date).toLocaleDateString('fr-FR') + ') :\n' + c.brouillon : '';
      const sp = p.parties[0].sousParties[0];
      sp.argumentIds = (c.argumentsUtilises || []).filter((x) => Stockage.donnees.arguments.some((a) => a.id === x));
      Stockage.modifier((d) => d.plans.push(p));
      m.fermer(true);
      toast('Plan créé à partir de la colle (arguments utilisés placés en I.A).');
      App.aller('plans', { id: p.id });
    });
  },
};
