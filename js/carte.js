/* =========================================================
   carte.js : page « Carte du monde » (étape 5)
   - colore chaque pays selon le nombre d'arguments qui le citent
     (les entités historiques comptent pour leurs pays actuels) ;
   - clic sur un pays : ses arguments ; zoom et déplacement ;
   - emprise d'une entité historique (pays actuels concernés).
   Contours : js/carte-donnees.js (Natural Earth, sans Internet).
   ========================================================= */

const MONDE_LARGEUR = 1000;
const MONDE_ZOOM_MAX = 14;
const MONDE_SEUIL_PETIT = 4;  // en dessous, le pays reçoit aussi un point visible
/* Pays absents du fond de carte : [longitude, latitude] */
const MONDE_SANS_CONTOUR = { Tuvalu: [179.2, -8.5] };

Vues.carte = {
  f: { theme: '', historiques: true, emprise: '', annee: null, couleur: 'empires', empire: '' },
  choisi: null,
  uniteChoisie: null,
  geo: null,
  vue: null,

  /* ---------------- Géométrie ---------------- */

  /** Projection « Natural Earth » : lon, lat en degrés -> x, y */
  projeter(lon, lat) {
    const l = (lon * Math.PI) / 180;
    const p = (lat * Math.PI) / 180;
    const p2 = p * p;
    const p4 = p2 * p2;
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    const S = MONDE_LARGEUR / (2 * Math.PI * 0.8707);
    return [Math.round((MONDE_LARGEUR / 2 + S * x) * 100) / 100, Math.round(-S * y * 100) / 100];
  },

  /**
   * Un contour qui traverse la ligne de changement de date (Russie, Fidji...)
   * ferait le tour de la carte : on le découpe en morceaux à ±180°.
   * pts = [[x, y, lon, lat]...] ; renvoie une liste de morceaux [[x, y]...].
   */
  couperAntimeridien(pts) {
    const n = pts.length;
    let traverse = false;
    for (let i = 0; i < n && !traverse; i++) traverse = Math.abs(pts[i][2] - pts[(i + 1) % n][2]) > 180;
    if (!traverse) return [pts];

    // Longitudes rendues continues (elles peuvent dépasser ±180)
    let decalage = 0;
    const continu = pts.map((p, i) => {
      if (i) {
        const d = p[2] - pts[i - 1][2];
        if (d > 180) decalage -= 360;
        else if (d < -180) decalage += 360;
      }
      return [p[2] + decalage, p[3]];
    });
    const couper = (poly, limite, sens) => {
      const res = [];
      const dedans = (p) => (p[0] - limite) * sens >= 0;
      poly.forEach((p, i) => {
        const q = poly[(i + 1) % poly.length];
        if (dedans(p)) res.push(p);
        if (dedans(p) !== dedans(q)) {
          const t = (limite - p[0]) / (q[0] - p[0]);
          res.push([limite, p[1] + t * (q[1] - p[1])]);
        }
      });
      return res;
    };
    const morceaux = [];
    for (const k of [-360, 0, 360]) {
      let poly = continu.map(([lon, lat]) => [lon + k, lat]);
      poly = couper(poly, -180, 1);
      if (poly.length) poly = couper(poly, 180, -1);
      if (poly.length >= 3) morceaux.push(poly.map(([lon, lat]) => this.projeter(lon, lat)));
    }
    return morceaux;
  },

  /** Décode les contours une seule fois (chemins SVG, boîtes, points des petits pays) */
  construire() {
    if (this.geo) return this.geo;
    const D = CARTE_DONNEES;
    const [sx, sy] = D.echelle;
    const [tx, ty] = D.origine;
    const arcs = D.arcs.map((a) => {
      const pts = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i < a.length; i += 2) {
        x += a[i];
        y += a[i + 1];
        const lon = x * sx + tx;
        const lat = y * sy + ty;
        const q = this.projeter(lon, lat);
        const d = pts[pts.length - 1];
        // Retire les points quasi confondus, en gardant toujours les extrémités de l'arc
        if (!d || i === a.length - 2 || Math.abs(q[0] - d[0]) + Math.abs(q[1] - d[1]) >= 0.06) pts.push([q[0], q[1], lon, lat]);
      }
      return pts;
    });
    const B = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const anneau = (liste, boite) => {
      const pts = [];
      liste.forEach((n, k) => {
        const a = n < 0 ? arcs[-n - 1].slice().reverse() : arcs[n];
        for (let i = k ? 1 : 0; i < a.length; i++) pts.push(a[i]);
      });
      let d = '';
      let principal = null;
      for (const part of this.couperAntimeridien(pts)) {
        const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        for (const [x, y] of part) {
          if (x < b.x0) b.x0 = x;
          if (x > b.x1) b.x1 = x;
          if (y < b.y0) b.y0 = y;
          if (y > b.y1) b.y1 = y;
        }
        B.x0 = Math.min(B.x0, b.x0);
        B.x1 = Math.max(B.x1, b.x1);
        B.y0 = Math.min(B.y0, b.y0);
        B.y1 = Math.max(B.y1, b.y1);
        d += 'M' + part.map((p) => p[0] + ',' + p[1]).join('L') + 'Z';
        if (!principal || part.length > principal.n) principal = { ...b, n: part.length };
      }
      // Un pays coupé par la ligne de changement de date garde la boîte de son plus grand morceau
      if (principal) {
        boite.x0 = Math.min(boite.x0, principal.x0);
        boite.x1 = Math.max(boite.x1, principal.x1);
        boite.y0 = Math.min(boite.y0, principal.y0);
        boite.y1 = Math.max(boite.y1, principal.y1);
      }
      return d;
    };
    const chemin = (polygones) => {
      let d = '';
      let grande = null;
      for (const poly of polygones) {
        const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        poly.forEach((r, i) => { d += anneau(r, i ? { ...b } : b); });
        const aire = (b.x1 - b.x0) * (b.y1 - b.y0);
        if (!grande || aire > grande.aire) grande = { ...b, aire };
      }
      return { d, grande };
    };
    const pays = Object.entries(D.pays).map(([nom, polys]) => {
      const { d, grande } = chemin(polys);
      const petit = Math.max(grande.x1 - grande.x0, grande.y1 - grande.y0) < MONDE_SEUIL_PETIT;
      return { nom, d, petit, cx: (grande.x0 + grande.x1) / 2, cy: (grande.y0 + grande.y1) / 2 };
    });
    for (const [nom, [lon, lat]] of Object.entries(MONDE_SANS_CONTOUR)) {
      const [cx, cy] = this.projeter(lon, lat);
      pays.push({ nom, d: '', petit: true, cx, cy });
    }
    const neutres = chemin(D.neutres).d;
    const marge = 6;
    const boite = { x: B.x0 - marge, y: B.y0 - marge, w: B.x1 - B.x0 + 2 * marge, h: B.y1 - B.y0 + 2 * marge };
    this.geo = { pays, neutres, boite };
    return this.geo;
  },

  /* ---------------- Données ---------------- */

  argumentsFiltres() {
    const f = this.f;
    const args = Stockage.donnees.arguments;
    if (f.theme === '__aucun') return args.filter((a) => !a.rattachements.some((r) => Stockage.rattachement(r)));
    if (f.theme) { const ids = new Set(Stockage.argumentsDe(f.theme).map((a) => a.id)); return args.filter((a) => ids.has(a.id)); }
    return args;
  },

  /**
   * Par pays : Map nom -> Map(idArgument -> { arg, via: [entités historiques] }).
   * Autres acteurs (organisations, grands ensembles, personnalisés) : Map nom -> [arguments].
   */
  compter() {
    const parPays = new Map();
    const autres = new Map();
    const noter = (nom, arg, via) => {
      if (!parPays.has(nom)) parPays.set(nom, new Map());
      const m = parPays.get(nom);
      if (!m.has(arg.id)) m.set(arg.id, { arg, direct: false, via: [] });
      const x = m.get(arg.id);
      if (via) { if (!x.via.includes(via)) x.via.push(via); } else x.direct = true;
    };
    for (const arg of this.argumentsFiltres()) {
      for (const nom of arg.pays) {
        const e = Pays.trouver(nom);
        if (e && e.type === 'pays') noter(nom, arg, null);
        else if (e && e.type === 'historique' && e.actuels.length) {
          if (this.f.historiques) e.actuels.forEach((p) => noter(p, arg, nom));
          else this.ajouterAutre(autres, nom, arg);
        } else this.ajouterAutre(autres, nom, arg);
      }
    }
    return { parPays, autres };
  },

  ajouterAutre(autres, nom, arg) {
    if (!autres.has(nom)) autres.set(nom, []);
    if (!autres.get(nom).includes(arg)) autres.get(nom).push(arg);
  },

  /** Classe de couleur : seuils fixes, pour comparer d'un filtre à l'autre */
  classe(n) {
    if (!n) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    if (n <= 7) return 3;
    return 4;
  },

  /* ---------------- Page ---------------- */

  rendre(el, params = {}, opts = {}) {
    this.el = el;
    if (!opts.rafraichissement) {
      if (params.filtre !== undefined) this.f.theme = params.filtre;
      if (params.pays !== undefined) { this.choisi = params.pays; this.f.annee = null; }
    }
    const geo = this.construire();
    if (!this.vue) this.vue = { x: geo.boite.x, y: geo.boite.y, w: geo.boite.w };
    const f = this.f;
    const entites = ENTITES_HISTORIQUES.map((e) => e[0]).sort((a, b) => a.localeCompare(b, 'fr'));

    el.innerHTML = `
      <div class="entete-vue"><h1>🗺️ Carte du monde</h1></div>
      <p class="muet">Choisis une époque, puis clique sur un territoire pour retrouver tes arguments.</p>
      <div class="carte monde-epoque">
        <div class="monde-epoque-haut">
          <strong class="monde-annee" data-annee-titre></strong>
          <div class="monde-reperes" role="group" aria-label="Dates repères">
            ${HISTOIRE_REPERES.map((a) => `<button type="button" class="btn btn-petit" data-repere="${a}">${a}</button>`).join('')}
            <button type="button" class="btn btn-petit" data-repere="">Aujourd'hui</button>
          </div>
        </div>
        <input type="range" class="monde-curseur" data-annee min="1886" max="2019" step="1" aria-label="Année affichée sur la carte">
        <div class="monde-curseur-bornes muet petit"><span>1886</span><span>2019</span></div>
        <div class="champ monde-couleur" data-options-histoire hidden><label>Colorer selon</label>
          <select data-f="couleur">
            <option value="empires" ${f.couleur === 'empires' ? 'selected' : ''}>Les empires</option>
            <option value="arguments" ${f.couleur === 'arguments' ? 'selected' : ''}>Le nombre de mes arguments</option>
          </select></div>
      </div>
      <div class="carte monde-filtres">
        <div class="champ"><label>Thème ou chapitre</label><select data-f="theme">${optionsFiltreThemes(f.theme)}</select></div>
        <div class="champ" data-champ-emprise><label>Montrer l'emprise de</label>
          <select data-f="emprise"><option value="">Aucune entité historique</option>${entites.map((n) => `<option ${n === f.emprise ? 'selected' : ''}>${U.esc(n)}</option>`).join('')}</select></div>
        <label class="case"><input type="checkbox" data-historiques ${f.historiques ? 'checked' : ''}> Compter les entités historiques sur leurs pays actuels</label>
      </div>
      <div class="monde-grille">
        <div class="carte monde-bloc">
          <div class="monde-cadre" data-cadre style="aspect-ratio:${geo.boite.w} / ${geo.boite.h}">
            <svg class="monde-svg" data-svg role="img" aria-label="Carte du monde : nombre d'arguments par pays. La liste à côté donne les mêmes informations.">
              <path class="monde-neutre" d="${geo.neutres}"></path>
              <g class="monde-couche-actuelle">${geo.pays.filter((p) => p.d).map((p) => `<path class="monde-pays" data-pays="${U.esc(p.nom)}" d="${p.d}"></path>`).join('')}</g>
              <g data-points>${geo.pays.filter((p) => p.petit).map((p) => `<circle class="monde-pays monde-point" data-pays="${U.esc(p.nom)}" cx="${p.cx}" cy="${p.cy}" r="3"></circle>`).join('')}</g>
              <g data-histoire></g>
              <g data-surcouche></g>
            </svg>
            <div class="monde-zoom">
              <button class="btn btn-petit" data-zoom="in" title="Zoomer" aria-label="Zoomer">＋</button>
              <button class="btn btn-petit" data-zoom="out" title="Dézoomer" aria-label="Dézoomer">－</button>
              <button class="btn btn-petit" data-zoom="reset" title="Voir le monde entier" aria-label="Voir le monde entier">⟲</button>
            </div>
            <div class="monde-bulle" data-bulle hidden></div>
          </div>
          <div class="monde-pied">
            <div class="monde-legende" data-legende aria-label="Légende de la carte"></div>
            <span class="muet petit">Molette : zoom · glisser : déplacer</span>
          </div>
          <p class="muet petit" data-note-emprise></p>
        </div>
        <aside class="carte monde-panneau" data-panneau></aside>
      </div>`;

    el.querySelectorAll('[data-f]').forEach((s) => s.addEventListener('change', () => {
      f[s.dataset.f] = s.value;
      this.maj();
    }));
    el.querySelector('[data-historiques]').addEventListener('change', (e) => { f.historiques = e.target.checked; this.maj(); });
    el.querySelectorAll('[data-repere]').forEach((b) => b.addEventListener('click', () => {
      this.choisirAnnee(b.dataset.repere === '' ? null : Number(b.dataset.repere));
    }));
    let attente = null;
    el.querySelector('[data-annee]').addEventListener('input', (e) => {
      const a = Number(e.target.value);
      if (attente) cancelAnimationFrame(attente);
      attente = requestAnimationFrame(() => { attente = null; this.choisirAnnee(a); });
    });
    el.querySelector('[data-panneau]').addEventListener('click', (e) => {
      const fiche = e.target.closest('[data-fiche]');
      if (fiche) { Vues.arguments.ouvrirFiche(fiche.dataset.fiche); return; }
      const emp = e.target.closest('[data-empire]');
      if (emp) { f.empire = f.empire === emp.dataset.empire ? '' : emp.dataset.empire; this.maj(); return; }
      const terr = e.target.closest('[data-choisir-unite]');
      if (terr) { this.uniteChoisie = Number(terr.dataset.choisirUnite); this.maj(); return; }
      if (e.target.closest('[data-retour-unite]')) { this.uniteChoisie = null; this.maj(); return; }
      const p = e.target.closest('[data-choisir]');
      if (p) { this.choisi = p.dataset.choisir; this.maj(); return; }
      if (e.target.closest('[data-retour]')) { this.choisi = null; this.maj(); }
    });
    this.brancherCarte();
    this.appliquerVue();
    this.majEpoque();
    this.maj();
  },

  /** Recolore la carte et met à jour le panneau (sans redessiner les contours) */
  maj() {
    const el = this.el;
    this.stats = this.compter();
    if (this.f.annee !== null) { this.majHistoire(); return; }
    el.querySelector('[data-svg]').classList.remove('monde-histo');
    el.querySelector('[data-histoire]').innerHTML = '';
    el.querySelector('[data-legende]').innerHTML = this.legendeArguments();
    const { parPays } = this.stats;
    const e = this.f.emprise ? Pays.trouver(this.f.emprise) : null;
    const emprise = new Set(e ? e.actuels : []);
    el.querySelectorAll('.monde-pays').forEach((p) => {
      const nom = p.dataset.pays;
      const n = parPays.has(nom) ? parPays.get(nom).size : 0;
      const point = p.classList.contains('monde-point');
      p.setAttribute('class', `monde-pays ${point ? 'monde-point' : ''} n${this.classe(n)}`);
      if (point) p.style.display = n || emprise.has(nom) || nom === this.choisi ? '' : 'none';
    });
    const geo = this.geo;
    const trace = (nom, classe) => {
      const p = geo.pays.find((x) => x.nom === nom);
      if (!p) return '';
      const r = this.rayon() + 1;
      return (p.d ? `<path class="${classe}" d="${p.d}"></path>` : '')
        + (p.petit ? `<circle class="${classe} monde-anneau" cx="${p.cx}" cy="${p.cy}" r="${r}"></circle>` : '');
    };
    el.querySelector('[data-surcouche]').innerHTML = [...emprise].map((n) => trace(n, 'monde-emprise')).join('')
      + (this.choisi ? trace(this.choisi, 'monde-choisi') : '');
    el.querySelector('[data-note-emprise]').textContent = e
      ? `${e.nom}${Pays.periode(e) ? ' (' + Pays.periode(e) + ')' : ''} : pays actuels concernés, en totalité ou en partie. Ce ne sont pas les frontières de l'époque.`
      : '';
    this.dessinerPanneau();
  },

  dessinerPanneau() {
    const zone = this.el.querySelector('[data-panneau]');
    const { parPays, autres } = this.stats;
    if (this.choisi) {
      const m = parPays.get(this.choisi);
      const lignes = m ? [...m.values()] : [];
      zone.innerHTML = `
        <button class="btn btn-discret btn-petit" data-retour>← Tous les pays</button>
        <h2 class="monde-titre">${U.esc(this.choisi)}</h2>
        <p class="muet petit">${lignes.length ? U.pluriel(lignes.length, 'argument') : 'Aucun argument avec ces filtres.'}</p>
        <ul class="monde-args">${lignes.map(({ arg, direct, via }) => `<li>
          <a href="javascript:void 0" data-fiche="${arg.id}">${U.esc(arg.idee)}</a>
          ${!direct && via.length ? `<div class="petit muet">via ${via.map(U.esc).join(', ')}</div>` : ''}
        </li>`).join('')}</ul>
        ${lignes.some((l) => l.direct) ? `<a class="btn btn-petit" href="#/arguments?pays=${encodeURIComponent(this.choisi)}">📚 Voir dans Arguments</a>` : ''}`;
      return;
    }
    const classement = [...parPays.entries()].map(([nom, m]) => ({ nom, n: m.size }))
      .sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, 'fr'));
    const horsCarte = [...autres.entries()].map(([nom, l]) => ({ nom, n: l.length }))
      .sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, 'fr'));
    const max = Math.max(1, ...classement.map((x) => x.n));
    zone.innerHTML = `
      <h2 class="monde-titre">Pays les plus cités</h2>
      ${classement.length ? `<ol class="monde-classement">${classement.map((x) => `<li>
        <button type="button" data-choisir="${U.esc(x.nom)}">
          <span class="monde-nom">${U.esc(x.nom)}</span>
          <span class="monde-barre"><i style="width:${Math.max(4, Math.round((x.n / max) * 100))}%"></i></span>
          <span class="monde-nb">${x.n}</span>
        </button></li>`).join('')}</ol>` : '<p class="muet petit">Aucun pays cité avec ces filtres.</p>'}
      ${horsCarte.length ? `<details class="monde-autres"><summary>Acteurs hors carte (${horsCarte.length})</summary>
        <p class="muet petit">Organisations, grands ensembles et acteurs personnalisés.</p>
        <ul>${horsCarte.map((x) => `<li><a href="#/arguments?pays=${encodeURIComponent(x.nom)}">${U.esc(x.nom)}</a> <span class="muet">${x.n}</span></li>`).join('')}</ul>
      </details>` : ''}`;
  },

  /* ---------------- Zoom et déplacement ---------------- */

  rayon() {
    return Math.max(0.35, 3 * (this.vue.w / this.geo.boite.w));
  },

  limiter() {
    const b = this.geo.boite;
    const v = this.vue;
    v.w = Math.min(b.w, Math.max(b.w / MONDE_ZOOM_MAX, v.w));
    const h = (v.w * b.h) / b.w;
    v.x = Math.min(b.x + b.w - v.w, Math.max(b.x, v.x));
    v.y = Math.min(b.y + b.h - h, Math.max(b.y, v.y));
  },

  appliquerVue() {
    const svg = this.el.querySelector('[data-svg]');
    if (!svg) return;
    this.limiter();
    const b = this.geo.boite;
    const v = this.vue;
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${(v.w * b.h) / b.w}`);
    const r = this.rayon();
    svg.querySelectorAll('[data-points] circle').forEach((c) => c.setAttribute('r', r));
    svg.querySelectorAll('[data-surcouche] circle').forEach((c) => c.setAttribute('r', r + r / 3));
  },

  /** Zoome d'un facteur autour d'un point de la carte (fx, fy entre 0 et 1) */
  zoomer(facteur, fx = 0.5, fy = 0.5) {
    const b = this.geo.boite;
    const v = this.vue;
    const h = (v.w * b.h) / b.w;
    const px = v.x + fx * v.w;
    const py = v.y + fy * h;
    v.w = Math.min(b.w, Math.max(b.w / MONDE_ZOOM_MAX, v.w / facteur));
    v.x = px - fx * v.w;
    v.y = py - (fy * v.w * b.h) / b.w;
    this.appliquerVue();
  },

  brancherCarte() {
    const cadre = this.el.querySelector('[data-cadre]');
    const svg = this.el.querySelector('[data-svg]');
    const bulle = this.el.querySelector('[data-bulle]');
    let glisse = null;

    cadre.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.zoom === 'in') this.zoomer(1.6);
      else if (b.dataset.zoom === 'out') this.zoomer(1 / 1.6);
      else { const g = this.geo.boite; this.vue = { x: g.x, y: g.y, w: g.w }; this.appliquerVue(); }
    }));
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      this.zoomer(e.deltaY < 0 ? 1.25 : 0.8, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, { passive: false });

    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      glisse = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: this.vue.x, vy: this.vue.y, bouge: false, cible: e.target.closest('[data-pays],[data-unite]') };
    });
    svg.addEventListener('pointermove', (e) => {
      if (glisse && glisse.id === e.pointerId) {
        const dx = e.clientX - glisse.x;
        const dy = e.clientY - glisse.y;
        if (!glisse.bouge && Math.abs(dx) + Math.abs(dy) > 4) {
          glisse.bouge = true;
          svg.setPointerCapture(e.pointerId);
          svg.classList.add('glisse');
          bulle.hidden = true;
        }
        if (glisse.bouge) {
          const k = this.vue.w / svg.getBoundingClientRect().width;
          this.vue.x = glisse.vx - dx * k;
          this.vue.y = glisse.vy - dy * k;
          this.appliquerVue();
          return;
        }
      }
      const p = e.target.closest('[data-pays],[data-unite]');
      if (!p) { bulle.hidden = true; return; }
      if (p.dataset.unite) bulle.innerHTML = this.bulleUnite(Number(p.dataset.unite));
      else {
        const nom = p.dataset.pays;
        const m = this.stats.parPays.get(nom);
        bulle.innerHTML = `<strong>${U.esc(nom)}</strong><br>${m ? U.pluriel(m.size, 'argument') : 'Aucun argument'}`;
      }
      bulle.hidden = false;
      const r = cadre.getBoundingClientRect();
      const x = e.clientX - r.left;
      bulle.style.left = (x > r.width - 190 ? x - bulle.offsetWidth - 12 : x + 12) + 'px';
      bulle.style.top = Math.max(4, e.clientY - r.top - bulle.offsetHeight - 8) + 'px';
    });
    svg.addEventListener('pointerleave', () => { if (!glisse) bulle.hidden = true; });
    const fin = (e) => {
      if (!glisse || glisse.id !== e.pointerId) return;
      const g = glisse;
      glisse = null;
      svg.classList.remove('glisse');
      if (!g.bouge && e.type === 'pointerup') {
        if (this.f.annee !== null) this.uniteChoisie = g.cible && g.cible.dataset.unite ? Number(g.cible.dataset.unite) : null;
        else this.choisi = g.cible ? g.cible.dataset.pays : null;
        this.maj();
      }
    };
    svg.addEventListener('pointerup', fin);
    svg.addEventListener('pointercancel', fin);
  },
};
