/* =========================================================
   chronologie.js : page « Chronologie » (étape 5)
   - Chrono : lecture des dates écrites librement dans les
     arguments (« 1913 », « 28 juin 1914 », « 1914-1918 »,
     « du 6 juin au 25 août 1944 », « années 1960 »...) ;
   - Vues.chronologie : liste des dates par décennie, avec un
     mode entraînement (dates masquées, ordre mélangé).
   ========================================================= */

const MOIS_FR = {
  janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6,
  juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12,
};
const NB_COULEURS_CHRONO = 8;

/* ---------------------------------------------------------
   Lecture des dates
   --------------------------------------------------------- */
const Chrono = {
  anneeValide(y) { return y >= 1000 && y <= 2100; },

  /** Un morceau de date : { y, mo, d } (l'année peut manquer : « 6 juin ») ou null */
  morceau(t) {
    let m = t.match(/\b(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[/.]\s*(\d{4})\b/);
    if (m && +m[2] >= 1 && +m[2] <= 12) return { y: +m[3], mo: +m[2], d: +m[1] };
    m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m && +m[2] >= 1 && +m[2] <= 12) return { y: +m[1], mo: +m[2], d: +m[3] };
    const mots = t.split(/[^a-z0-9]+/).filter(Boolean);
    const annee = mots.find((x) => /^\d{4}$/.test(x) && this.anneeValide(+x));
    const iMois = mots.findIndex((x) => MOIS_FR[x]);
    const res = { y: annee ? +annee : null, mo: null, d: null };
    if (iMois >= 0) {
      res.mo = MOIS_FR[mots[iMois]];
      const avant = (mots[iMois - 1] || '').replace(/er$/, '');
      if (/^\d{1,2}$/.test(avant) && +avant >= 1 && +avant <= 31) res.d = +avant;
    }
    return res.y || res.mo ? res : null;
  },

  /** Valeur décimale (1914,5 = mi-1914) du début d'un morceau */
  debut(p) { return p.y + (p.mo ? (p.mo - 1) / 12 : 0) + (p.d ? (p.d - 1) / 366 : 0); },
  /** Valeur décimale de la fin d'un morceau (fin du jour, du mois ou de l'année) */
  fin(p) { return this.debut(p) + (p.d ? 1 / 366 : p.mo ? 1 / 12 : 1); },

  /**
   * Lit une date libre. Renvoie { debut, fin, annee, periode } ou null si illisible.
   * periode = true pour une durée (« 1914-1918 »).
   */
  analyser(texte) {
    const t = U.norm(texte).replace(/[–—]/g, '-');
    if (!t) return null;
    // Date complète au format AAAA-MM-JJ (à ne pas confondre avec une période)
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(t)) {
      const p = this.morceau(t);
      return p && p.y ? { debut: this.debut(p), fin: this.fin(p), annee: p.y, periode: false } : null;
    }
    // « années 1960 » / « années 60 »
    let m = t.match(/\bannees\s+(\d{4}|\d{2})\b/);
    if (m) {
      const y = m[1].length === 2 ? 1900 + +m[1] : +m[1];
      if (this.anneeValide(y)) return { debut: y, fin: y + 10, annee: y, periode: true };
    }
    // « 1914-1918 », « 1914-18 » (forme courte collée, pour ne pas lire « 1914 - 11 novembre »)
    m = t.match(/\b(\d{4})\s*-\s*(\d{4})\b/) || t.match(/\b(\d{4})-(\d{2})\b(?!\s*[-/]?\s*\d)/);
    if (m) {
      const a = +m[1];
      let b = m[2].length === 2 ? Math.floor(a / 100) * 100 + +m[2] : +m[2];
      if (b < a && m[2].length === 2) b += 100;
      if (this.anneeValide(a) && this.anneeValide(b) && b >= a) return { debut: a, fin: b + 1, annee: a, periode: b > a };
    }
    // « 28 juin 1914 - 11 novembre 1918 », « de 1947 à 1991 », « du 6 juin au 25 août 1944 »
    const parts = t.replace(/^(?:de|du|depuis)\s+/, '').split(/\s(?:-|a|au|jusqu en|jusqu au)\s/);
    if (parts.length === 2) {
      const a = this.morceau(parts[0]);
      const b = this.morceau(parts[1]);
      if (a && b && b.y) {
        if (!a.y) a.y = b.y;
        if (this.debut(b) >= this.debut(a)) return { debut: this.debut(a), fin: this.fin(b), annee: a.y, periode: true };
      }
    }
    const p = this.morceau(t);
    if (!p || !p.y) return null;
    return { debut: this.debut(p), fin: this.fin(p), annee: p.y, periode: false };
  },
};

/* ---------------------------------------------------------
   Page Chronologie
   --------------------------------------------------------- */
Vues.chronologie = {
  f: { theme: '', pays: '', texte: '', de: '', a: '', masquer: false },
  ordreMelange: null,  // ordre des événements en mode entraînement
  reveles: new Set(),

  rendre(el, params = {}, opts = {}) {
    this.el = el;
    if (!opts.rafraichissement) {
      if (params.filtre !== undefined) this.f.theme = params.filtre;
      if (params.pays !== undefined) this.f.pays = params.pays;
    }
    const f = this.f;
    const paysUtilises = [...new Set(Stockage.donnees.arguments.flatMap((a) => a.pays))].sort((a, b) => a.localeCompare(b, 'fr'));

    el.innerHTML = `
      <div class="entete-vue"><h1>🕰️ Chronologie</h1></div>
      <p class="muet">Les dates importantes de tes arguments, remises dans l'ordre. Coche « S'entraîner » pour masquer les dates et tester ta mémoire.</p>
      <div class="carte chrono-filtres">
        <div class="champ"><label>Thème ou chapitre</label><select data-f="theme">${optionsFiltreThemes(f.theme)}</select></div>
        <div class="champ"><label>Pays ou acteur</label>
          <select data-f="pays"><option value="">Tous</option>${paysUtilises.map((p) => `<option ${p === f.pays ? 'selected' : ''}>${U.esc(p)}</option>`).join('')}</select></div>
        <div class="champ"><label>Recherche</label><input type="search" data-f="texte" value="${U.esc(f.texte)}" placeholder="Mot de l'événement ou de l'argument"></div>
        <div class="champ chrono-annees"><label>Années</label>
          <div><input type="number" data-f="de" value="${U.esc(f.de)}" placeholder="de"><input type="number" data-f="a" value="${U.esc(f.a)}" placeholder="à"></div></div>
      </div>
      <div data-zone></div>`;

    el.querySelector('[data-zone]').addEventListener('click', (e) => {
      const lien = e.target.closest('[data-fiche]');
      if (lien) Vues.arguments.ouvrirFiche(lien.dataset.fiche);
    });
    el.querySelectorAll('[data-f]').forEach((champ) => {
      champ.addEventListener(champ.tagName === 'SELECT' ? 'change' : 'input', () => {
        f[champ.dataset.f] = champ.value;
        this.ordreMelange = null;
        this.dessinerZone();
      });
    });
    this.dessinerZone();
  },

  /* ---------------- Données ---------------- */

  /** Couleur (1 à 8) de chaque thème et chapitre, dans l'ordre de la page Thèmes */
  couleurs() {
    const c = {};
    let n = 0;
    for (const t of Stockage.donnees.themes) {
      c[t.id] = (n++ % NB_COULEURS_CHRONO) + 1;
      for (const ch of t.chapitres) c[ch.id] = (n++ % NB_COULEURS_CHRONO) + 1;
    }
    return c;
  },

  argumentsFiltres() {
    const f = this.f;
    let args = Stockage.donnees.arguments;
    if (f.theme === '__aucun') args = args.filter((a) => !a.rattachements.some((r) => Stockage.rattachement(r)));
    else if (f.theme) { const ids = new Set(Stockage.argumentsDe(f.theme).map((a) => a.id)); args = args.filter((a) => ids.has(a.id)); }
    if (f.pays) args = args.filter((a) => a.pays.includes(f.pays));
    return args;
  },

  /** Événements (dates fusionnées si même date et même intitulé) et dates illisibles */
  evenements() {
    const f = this.f;
    const couleurs = this.couleurs();
    const parCle = new Map();
    const nonPlaces = [];
    const texte = U.norm(f.texte);
    const de = f.de !== '' ? Number(f.de) : null;
    const a = f.a !== '' ? Number(f.a) + 1 : null;
    for (const arg of this.argumentsFiltres()) {
      for (const d of arg.dates) {
        if (!d.date && !d.libelle) continue;
        if (texte && !U.norm([d.date, d.libelle, arg.idee].join(' ')).includes(texte)) continue;
        const p = Chrono.analyser(d.date);
        if (!p) { nonPlaces.push({ date: d.date, libelle: d.libelle, arg }); continue; }
        if (de !== null && p.fin <= de) continue;
        if (a !== null && p.debut >= a) continue;
        const cle = U.norm(d.date) + '|' + U.norm(d.libelle);
        let ev = parCle.get(cle);
        if (!ev) {
          const ratt = arg.rattachements.find((r) => couleurs[r]);
          ev = { cle, date: d.date, libelle: d.libelle, ...p, args: [], couleur: ratt ? couleurs[ratt] : 0, rattachement: ratt || null };
          parCle.set(cle, ev);
        }
        if (!ev.args.includes(arg)) ev.args.push(arg);
      }
    }
    const liste = [...parCle.values()].sort((x, y) => x.debut - y.debut || x.fin - y.fin);
    return { liste, nonPlaces };
  },

  court(texte, n) {
    const t = String(texte || '');
    return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
  },

  /* ---------------- Affichage ---------------- */

  dessinerZone() {
    const zone = this.el.querySelector('[data-zone]');
    const { liste, nonPlaces } = this.evenements();
    if (!liste.length && !nonPlaces.length) {
      zone.innerHTML = `<div class="carte vide"><p style="font-size:2rem">🕰️</p>
        <p>${Stockage.donnees.arguments.some((a) => a.dates.length) ? 'Aucune date ne correspond à ces filtres.' : 'Aucune date importante dans tes arguments pour l\'instant. Ajoute-les dans le formulaire d\'un argument (rubrique « Dates importantes »).'}</p></div>`;
      return;
    }
    zone.innerHTML = `<div data-contenu></div>${this.htmlNonPlaces(nonPlaces)}`;
    this.dessinerListe(zone.querySelector('[data-contenu]'), liste);
  },

  htmlNonPlaces(nonPlaces) {
    if (!nonPlaces.length) return '';
    return `<details class="carte chrono-non-places">
      <summary>⚠️ ${U.pluriel(nonPlaces.length, 'date non placée', 'dates non placées')} <span class="muet petit">(année introuvable dans le texte de la date)</span></summary>
      <p class="petit muet">Écris au moins une année sur 4 chiffres dans le champ « date » de l'argument (ex : « 1955 », « avril 1955 », « 1954-1962 »).</p>
      <ul>${nonPlaces.map((n) => `<li><strong>${U.esc(n.date || '(sans date)')}</strong> : ${U.esc(n.libelle)}
        <span class="petit">· <a href="javascript:void 0" data-fiche="${n.arg.id}">${U.esc(this.court(n.arg.idee, 70))}</a></span></li>`).join('')}</ul>
    </details>`;
  },

  legende(liste) {
    const vus = new Map();
    for (const ev of liste) if (ev.rattachement && !vus.has(ev.rattachement)) vus.set(ev.rattachement, ev.couleur);
    if (!vus.size) return '';
    const ordre = Object.keys(this.couleurs());
    return `<div class="chrono-legende">${[...vus.entries()].sort((x, y) => ordre.indexOf(x[0]) - ordre.indexOf(y[0]))
      .map(([id, c]) => `<span><i class="pastille c${c}"></i>${U.esc(Stockage.rattachement(id).nom)}</span>`).join('')}</div>`;
  },

  dessinerListe(zone, liste) {
    const f = this.f;
    const ligne = (ev, i) => {
      const cache = f.masquer && !this.reveles.has(ev.cle);
      return `
        <li class="chrono-ligne c${ev.couleur}">
          ${cache
            ? `<button type="button" class="btn btn-petit chrono-devoiler" data-reveler="${i}">Date ?</button>`
            : `<span class="chrono-date">${U.esc(ev.date)}</span>`}
          <div>
            <div>${U.esc(ev.libelle)}</div>
            <div class="petit muet">${ev.args.map((a) => `<a href="javascript:void 0" data-fiche="${a.id}">${U.esc(this.court(a.idee, 90))}</a>`).join(' · ')}</div>
          </div>
        </li>`;
    };

    let corps;
    if (f.masquer) {
      // Mode entraînement : ordre mélangé, dates à retrouver
      if (!this.ordreMelange || this.ordreMelange.length !== liste.length) {
        this.ordreMelange = liste.map((_, i) => i);
        for (let i = this.ordreMelange.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.ordreMelange[i], this.ordreMelange[j]] = [this.ordreMelange[j], this.ordreMelange[i]];
        }
      }
      const vus = liste.filter((ev) => this.reveles.has(ev.cle)).length;
      corps = `<p class="petit muet" data-compteur>Retrouve la date de chaque événement, puis clique sur « Date ? » pour vérifier. ${vus} / ${liste.length} dévoilées.</p>
        <ul class="chrono-liste">${this.ordreMelange.map((i) => ligne(liste[i], i)).join('')}</ul>`;
    } else {
      const groupes = [];
      for (const [i, ev] of liste.entries()) {
        const dec = Math.floor(ev.annee / 10) * 10;
        if (!groupes.length || groupes[groupes.length - 1].dec !== dec) groupes.push({ dec, items: [] });
        groupes[groupes.length - 1].items.push(ligne(ev, i));
      }
      corps = groupes.map((g) => `<h3 class="chrono-decennie">Années ${g.dec}</h3><ul class="chrono-liste">${g.items.join('')}</ul>`).join('');
    }

    zone.innerHTML = `
      <div class="carte">
        <div class="chrono-outils">
          <label class="case"><input type="checkbox" data-masquer ${f.masquer ? 'checked' : ''}> 🎯 S'entraîner : masquer les dates (ordre mélangé)</label>
          ${f.masquer ? `<span class="barre-actions">
            <button class="btn btn-petit" data-melanger>🔀 Remélanger</button>
            <button class="btn btn-petit" data-tout>Tout dévoiler</button>
          </span>` : `<span class="muet petit">${U.pluriel(liste.length, 'événement')}</span>`}
        </div>
        ${this.legende(liste)}
        ${liste.length ? corps : '<div class="vide petit">Aucune date placée avec ces filtres.</div>'}
      </div>`;

    zone.querySelector('[data-masquer]').addEventListener('change', (e) => {
      f.masquer = e.target.checked;
      this.ordreMelange = null;
      this.reveles = new Set();
      this.dessinerZone();
    });
    const b = (sel, fn) => { const x = zone.querySelector(sel); if (x) x.addEventListener('click', fn); };
    b('[data-melanger]', () => { this.ordreMelange = null; this.reveles = new Set(); this.dessinerZone(); });
    b('[data-tout]', () => { liste.forEach((ev) => this.reveles.add(ev.cle)); this.dessinerZone(); });
    zone.querySelectorAll('[data-reveler]').forEach((x) => x.addEventListener('click', () => {
      const ev = liste[Number(x.dataset.reveler)];
      this.reveles.add(ev.cle);
      x.outerHTML = `<span class="chrono-date">${U.esc(ev.date)}</span>`;
      const compteur = zone.querySelector('[data-compteur]');
      const vus = liste.filter((e) => this.reveles.has(e.cle)).length;
      if (compteur) compteur.textContent = `Retrouve la date de chaque événement, puis clique sur « Date ? » pour vérifier. ${vus} / ${liste.length} dévoilées.`;
    }));
  },
};
