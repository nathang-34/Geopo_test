/* =========================================================
   plans.js : page « Plans de dissertation » (étape 4)
   - Pertinence : recherche des arguments utiles pour un sujet
     (accents ignorés, pluriels simples, liste de synonymes) ;
   - Vues.plans : liste des plans, éditeur I / II / III avec
     sous-parties, glisser-déposer, export (copie, .txt, PDF).
   ========================================================= */

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const LETTRES = 'ABCDEFGHIJ';

/* Mots sans intérêt pour la recherche (déjà sans accents) */
const MOTS_VIDES_SUJET = new Set((
  'a au aux avec ce ces cet cette comme dans de des du d elle elles en entre est et etre il ils l la le les ' +
  'leur leurs lui mais ne ni nos notre on ou par pas peut plus pour qu que quel quelle quelles quels qui sa ' +
  'sans se ses son sont sous sur un une vers y quoi dont donc car or ete etait jusqu depuis jours mesure ' +
  'faut doit s t n c j m tout tous toute toutes si fait ainsi face'
).split(' '));

/* ---------------------------------------------------------
   Recherche par pertinence
   --------------------------------------------------------- */
const Pertinence = {
  /** Mots normalisés (minuscules, sans accents) */
  mots(texte) {
    return U.norm(texte).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  },

  /** Mêmes mots, mais tels qu'ils ont été écrits (pour l'affichage) */
  motsOriginaux(texte) {
    return String(texte ?? '').normalize('NFC').replace(/[’']/g, ' ').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  },

  /** Racine très simple : retire les terminaisons courantes (pluriels, -isme, -ique...) */
  racine(mot) {
    if (/^\d+$/.test(mot)) return mot;
    const fins = ['ements', 'ement', 'ations', 'ation', 'ismes', 'isme', 'istes', 'iste', 'iques', 'ique',
      'euses', 'euse', 'eurs', 'eur', 'eaux', 'aux', 'ees', 'ee', 'es', 's', 'x', 'e'];
    for (const f of fins) {
      if (mot.endsWith(f) && mot.length - f.length >= 4) return mot.slice(0, -f.length);
    }
    return mot;
  },

  /** Deux racines se correspondent-elles ? (égales, ou l'une prolonge l'autre si elles sont assez longues) */
  egal(a, b) {
    if (a === b) return true;
    if (a.length < 5 || b.length < 5) return false;
    return a.startsWith(b) || b.startsWith(a);
  },

  /** La suite de racines « terme » apparaît-elle dans « racines » ? */
  contient(racines, terme) {
    suivant: for (let i = 0; i <= racines.length - terme.length; i++) {
      for (let j = 0; j < terme.length; j++) if (!this.egal(racines[i + j], terme[j])) continue suivant;
      return true;
    }
    return false;
  },

  racines(texte) {
    return this.mots(texte).map((m) => this.racine(m));
  },

  /** Groupes de synonymes : [{ libelle, termes: [[racines], ...] }] */
  groupes() {
    return (Stockage.donnees.synonymes || []).map((ligne) => {
      const termes = String(ligne).split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      return { libelle: termes[0], liste: termes, termes: termes.map((t) => this.racines(t)).filter((t) => t.length) };
    }).filter((g) => g.termes.length);
  },

  /** Découpe le sujet en « notions » à chercher, et repère une période (deux années ou plus) */
  analyser(sujet) {
    const mots = this.mots(sujet);
    const originaux = this.motsOriginaux(sujet);
    const racines = mots.map((m) => this.racine(m));
    const pris = mots.map(() => false);
    const concepts = [];
    const annees = mots.filter((m) => /^(1[5-9]\d\d|20\d\d)$/.test(m)).map(Number);
    const plage = annees.length >= 2 ? [Math.min(...annees), Math.max(...annees)] : null;

    // 1. Groupes de synonymes (les termes les plus longs d'abord : « guerre froide » avant « guerre »)
    for (const g of this.groupes()) {
      const termes = [...g.termes].sort((a, b) => b.length - a.length);
      let trouve = false;
      for (const terme of termes) {
        for (let i = 0; i <= racines.length - terme.length && !trouve; i++) {
          if (pris.slice(i, i + terme.length).some(Boolean)) continue;
          if (terme.every((r, j) => this.egal(racines[i + j], r))) {
            for (let j = 0; j < terme.length; j++) pris[i + j] = true;
            concepts.push({ libelle: g.libelle, synonymes: g.liste, termes: g.termes });
            trouve = true;
          }
        }
        if (trouve) break;
      }
    }

    // 2. Mots restants
    mots.forEach((m, i) => {
      if (pris[i] || MOTS_VIDES_SUJET.has(m)) return;
      const nombre = /^\d+$/.test(m);
      if (!nombre && m.length < 3) return;
      if (plage && nombre) return; // les années servent pour la période
      if (concepts.some((c) => c.termes.some((t) => t.length === 1 && this.egal(t[0], racines[i])))) return;
      concepts.push({ libelle: originaux[i] || m, synonymes: null, termes: [[racines[i]]] });
    });
    return { concepts, plage };
  },

  /** Champs d'un argument, avec leur poids */
  indexer(a) {
    const listes = (textes) => textes.filter(Boolean).map((t) => this.racines(t));
    const ratt = a.rattachements.map((id) => Stockage.rattachement(id)).filter(Boolean).map((r) => r.nom);
    const pays = a.pays.flatMap((p) => {
      const e = typeof Pays !== 'undefined' ? Pays.trouver(p) : null;
      return [p, ...((e && e.alias) || [])];
    });
    return [
      { poids: 3, listes: listes([a.idee]) },
      { poids: 3, listes: listes(a.motsCles) },
      { poids: 2.5, listes: listes(pays) },
      { poids: 2, listes: listes(ratt) },
      { poids: 1, listes: listes([a.explication]) },
      { poids: 1, listes: listes(a.citations.flatMap((c) => [c.texte, c.auteur, c.contexte])) },
      { poids: 1, listes: listes(a.exemples.flatMap((x) => [x.mesure, x.chiffre, x.date, x.source])) },
      { poids: 1, listes: listes(a.dates.flatMap((d) => [d.date, d.libelle])) },
    ];
  },

  /** Années citées dans un argument */
  anneesDe(a) {
    const texte = [a.idee, a.explication, ...a.dates.map((d) => d.date + ' ' + d.libelle), ...a.exemples.map((x) => x.date)].join(' ');
    return (texte.match(/\b(1[5-9]\d\d|20\d\d)\b/g) || []).map(Number);
  },

  /** Meilleur poids obtenu par une notion dans un argument (0 si absente) */
  poidsConcept(champs, concept) {
    let meilleur = 0;
    for (const champ of champs) {
      if (champ.poids <= meilleur) continue;
      if (champ.listes.some((l) => concept.termes.some((t) => this.contient(l, t)))) meilleur = champ.poids;
    }
    return meilleur;
  },

  /**
   * Classe les arguments pour un sujet.
   * Renvoie { concepts, plage, resultats: [{ arg, score, trouves }], sansCritere }
   */
  rechercher(sujet, { theme = '' } = {}) {
    const { concepts, plage } = this.analyser(sujet);
    let args = Stockage.donnees.arguments;
    if (theme === '__aucun') args = args.filter((a) => !a.rattachements.some((r) => Stockage.rattachement(r)));
    else if (theme) {
      const ids = new Set(Stockage.argumentsDe(theme).map((a) => a.id));
      args = args.filter((a) => ids.has(a.id));
    }
    if (!concepts.length && !plage) {
      return { concepts, plage, sansCritere: true, resultats: args.map((arg) => ({ arg, score: 0, trouves: [] })) };
    }
    const tous = Stockage.donnees.arguments;
    const index = new Map(tous.map((a) => [a.id, this.indexer(a)]));
    // Rareté de chaque notion dans toute la banque : un mot présent partout compte moins
    const N = Math.max(1, tous.length);
    const rarete = concepts.map((c) => {
      const df = tous.filter((a) => this.poidsConcept(index.get(a.id), c) > 0).length;
      return Math.log(1 + N / Math.max(1, df));
    });

    const resultats = [];
    for (const arg of args) {
      const champs = index.get(arg.id);
      let score = 0;
      const trouves = [];
      concepts.forEach((c, i) => {
        const p = this.poidsConcept(champs, c);
        if (p) { score += p * rarete[i]; trouves.push(c.libelle); }
      });
      if (concepts.length) score *= 0.5 + 0.5 * (trouves.length / concepts.length);
      if (plage) {
        const annees = this.anneesDe(arg);
        if (annees.some((y) => y >= plage[0] && y <= plage[1])) {
          score += 1;
          trouves.push(`${plage[0]}-${plage[1]}`);
        } else if (annees.length) score *= 0.7;
      }
      if (score > 0) resultats.push({ arg, score, trouves });
    }
    resultats.sort((a, b) => b.score - a.score);
    return { concepts, plage, sansCritere: false, resultats };
  },
};

/* ---------------------------------------------------------
   Page Plans
   --------------------------------------------------------- */
Vues.plans = {
  plan: null,       // copie de travail du plan ouvert
  active: null,     // id de la sous-partie où « ＋ » ajoute les arguments
  minuteur: null,
  minuteurRecherche: null,
  recherche: { texte: '', theme: '', masquerPlaces: false },

  rendre(el, params = {}) {
    this.enregistrerMaintenant();
    if (params.id) {
      const p = Stockage.donnees.plans.find((x) => x.id === params.id);
      if (!p) {
        toast("Ce plan n'existe plus.", 'erreur');
        App.aller('plans');
        return;
      }
      this.rendreEditeur(el, p);
    } else {
      this.plan = null;
      this.rendreListe(el);
    }
  },

  /* ---------------- Outils sur les plans ---------------- */

  planVide(sujet) {
    const sp = () => ({ id: U.uid(), titre: '', notes: '', argumentIds: [] });
    const partie = () => ({ id: U.uid(), titre: '', sousParties: [sp(), sp()] });
    const maintenant = new Date().toISOString();
    return {
      id: U.uid(), sujet, problematique: '', introduction: '', conclusion: '',
      parties: [partie(), partie(), partie()],
      creeLe: maintenant, modifieLe: maintenant,
    };
  },

  nbArguments(p) {
    return p.parties.reduce((n, pa) => n + pa.sousParties.reduce((m, sp) => m + sp.argumentIds.length, 0), 0);
  },

  /** Où un argument est placé dans le plan : ['I.A', 'II.B'] */
  positions(p, argId) {
    const res = [];
    p.parties.forEach((pa, i) => pa.sousParties.forEach((sp, j) => {
      if (sp.argumentIds.includes(argId)) res.push(`${ROMAINS[i]}.${LETTRES[j]}`);
    }));
    return res;
  },

  /** Retrouve une sous-partie : { partie, sp, i, j } */
  trouverSp(id) {
    const p = this.plan;
    for (let i = 0; i < p.parties.length; i++) {
      const j = p.parties[i].sousParties.findIndex((sp) => sp.id === id);
      if (j >= 0) return { partie: p.parties[i], sp: p.parties[i].sousParties[j], i, j };
    }
    return null;
  },

  toutesSp() {
    return this.plan.parties.flatMap((pa) => pa.sousParties);
  },

  /* ---------------- Enregistrement ---------------- */

  /** Enregistre le plan ouvert : tout de suite (changement de structure) ou un peu plus tard (frappe) */
  sauver(immediat = false) {
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.enregistrerMaintenant(), 700);
    const etat = document.querySelector('[data-etat-enreg]');
    if (etat) etat.textContent = 'Enregistrement…';
    if (immediat) this.enregistrerMaintenant();
  },

  enregistrerMaintenant() {
    if (!this.minuteur) return;
    clearTimeout(this.minuteur);
    this.minuteur = null;
    const p = this.plan;
    if (!p) return;
    p.modifieLe = new Date().toISOString();
    Stockage.modifier((d) => {
      const i = d.plans.findIndex((x) => x.id === p.id);
      if (i >= 0) d.plans[i] = U.copie(p);
    });
    const etat = document.querySelector('[data-etat-enreg]');
    if (etat) etat.textContent = 'Enregistré automatiquement.';
  },

  /* ---------------- Liste des plans ---------------- */

  rendreListe(el) {
    const plans = Stockage.donnees.plans.slice().sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
    el.innerHTML = `
      <div class="entete-vue">
        <h1>📝 Plans de dissertation</h1>
        <div class="barre-actions">
          <button class="btn" data-synonymes>🔤 Synonymes de recherche</button>
          <button class="btn btn-principal" data-nouveau>➕ Nouveau plan</button>
        </div>
      </div>
      <p class="muet">Écris un sujet : le site te propose les arguments de ta banque les plus pertinents, que tu ranges ensuite dans un plan en parties et sous-parties.</p>
      <div data-liste>
        ${plans.length ? plans.map((p) => `
          <div class="carte carte-cliquable plan-resume" data-id="${p.id}">
            <div class="plan-resume-haut">
              <h3>${U.esc(p.sujet || 'Sujet sans titre')}</h3>
              <span class="barre-actions">
                <button class="btn btn-petit" data-dupliquer="${p.id}">Dupliquer</button>
                <button class="btn btn-petit btn-danger" data-suppr="${p.id}">Supprimer</button>
              </span>
            </div>
            ${p.problematique ? `<p class="muet">${U.esc(p.problematique)}</p>` : ''}
            <div class="meta muet petit">
              ${U.pluriel(p.parties.length, 'partie')} · ${U.pluriel(this.nbArguments(p), 'argument')} · modifié ${U.depuis(p.modifieLe)}
            </div>
          </div>`).join('') : `
          <div class="carte vide">
            <p style="font-size:2rem">📝</p>
            <p>Aucun plan pour l'instant.</p>
            <button class="btn btn-principal" data-nouveau>➕ Créer mon premier plan</button>
          </div>`}
      </div>`;

    el.querySelectorAll('[data-nouveau]').forEach((b) => b.addEventListener('click', () => this.nouveau()));
    el.querySelector('[data-synonymes]').addEventListener('click', () => this.ouvrirSynonymes());
    el.querySelector('[data-liste]').addEventListener('click', async (e) => {
      const dup = e.target.closest('[data-dupliquer]');
      const sup = e.target.closest('[data-suppr]');
      if (dup) { this.dupliquer(dup.dataset.dupliquer); return; }
      if (sup) { await this.supprimer(sup.dataset.suppr); return; }
      const carte = e.target.closest('[data-id]');
      if (carte) App.aller('plans', { id: carte.dataset.id });
    });
  },

  async nouveau() {
    const sujet = await demanderTexte('Nouveau plan', { libelle: 'Sujet de la dissertation', texteOk: 'Créer le plan' });
    if (!sujet) return;
    const p = this.planVide(sujet);
    Stockage.modifier((d) => d.plans.push(p));
    this.recherche.texte = '';
    App.aller('plans', { id: p.id });
  },

  dupliquer(id) {
    this.enregistrerMaintenant();
    const orig = Stockage.donnees.plans.find((x) => x.id === id);
    if (!orig) return;
    const p = U.copie(orig);
    const maintenant = new Date().toISOString();
    p.id = U.uid();
    p.sujet = p.sujet + ' (copie)';
    p.creeLe = maintenant;
    p.modifieLe = maintenant;
    delete p.demo;
    for (const pa of p.parties) { pa.id = U.uid(); for (const sp of pa.sousParties) sp.id = U.uid(); }
    Stockage.modifier((d) => d.plans.push(p));
    toast('Plan dupliqué.');
    App.aller('plans', { id: p.id });
  },

  async supprimer(id) {
    const p = Stockage.donnees.plans.find((x) => x.id === id);
    if (!p) return false;
    const ok = await confirmer(`<p>Supprimer définitivement ce plan ?</p><p class="muet">« ${U.esc(p.sujet)} »</p>
      <p class="petit muet">Les arguments eux-mêmes restent dans ta banque.</p>`,
    { titre: 'Supprimer un plan', texteOk: 'Supprimer', danger: true });
    if (!ok) return false;
    if (this.plan && this.plan.id === id) { clearTimeout(this.minuteur); this.minuteur = null; this.plan = null; }
    Stockage.modifier((d) => { d.plans = d.plans.filter((x) => x.id !== id); });
    toast('Plan supprimé.');
    App.aller('plans');
    return true;
  },

  /* ---------------- Synonymes ---------------- */

  ouvrirSynonymes() {
    const initial = Stockage.donnees.synonymes.join('\n');
    const m = Modal.ouvrir({
      titre: 'Synonymes de recherche',
      large: true,
      contenu: `
        <p>Chaque ligne est un groupe de mots considérés comme <strong>équivalents</strong> quand le site cherche les arguments d'un sujet. Sépare les mots par des virgules.</p>
        <p class="muet petit">Les accents, les majuscules et les pluriels simples sont déjà ignorés : inutile d'écrire « puissances » en plus de « puissance ». Une expression de plusieurs mots (« guerre froide ») est cherchée telle quelle.</p>
        <textarea data-syn rows="16" spellcheck="false">${U.esc(initial)}</textarea>
        <div class="modal-pied">
          <button class="btn btn-discret" data-defaut style="margin-right:auto">Rétablir la liste de départ</button>
          <button class="btn" data-annuler>Annuler</button>
          <button class="btn btn-principal" data-ok>Enregistrer</button>
        </div>`,
      avantFermeture: async () => {
        if (zone.value.trim() === initial.trim()) return true;
        return confirmer('Fermer sans enregistrer les synonymes ?', { texteOk: 'Fermer sans enregistrer', danger: true });
      },
    });
    const zone = m.corps.querySelector('[data-syn]');
    m.corps.querySelector('[data-defaut]').addEventListener('click', () => { zone.value = Demo.synonymesInitiaux().join('\n'); });
    m.corps.querySelector('[data-annuler]').addEventListener('click', () => m.fermer());
    m.corps.querySelector('[data-ok]').addEventListener('click', () => {
      const lignes = zone.value.split('\n')
        .map((l) => l.split(/[,;]/).map((t) => t.trim()).filter(Boolean))
        .filter((t) => t.length >= 2)
        .map((t) => t.join(', '));
      Stockage.modifier((d) => { d.synonymes = lignes; });
      m.fermer(true);
      toast(`${U.pluriel(lignes.length, 'groupe')} de synonymes enregistré${lignes.length > 1 ? 's' : ''}.`);
      if (this.plan) this.dessinerResultats();
    });
  },

  /* ---------------- Éditeur ---------------- */

  rendreEditeur(el, planStocke) {
    if (!this.plan || this.plan.id !== planStocke.id) {
      this.recherche.texte = '';
      this.active = null;
    }
    this.plan = U.copie(planStocke);
    this.el = el;
    if (!this.active || !this.trouverSp(this.active)) this.active = (this.toutesSp()[0] || {}).id || null;
    const p = this.plan;
    const r = this.recherche;

    el.innerHTML = `
      <div class="entete-vue">
        <div>
          <a href="#/plans" class="petit">← Mes plans</a>
          <h1>📝 Plan de dissertation</h1>
        </div>
        <div class="barre-actions">
          <button class="btn btn-principal" data-exporter>📤 Exporter</button>
          <button class="btn" data-dupliquer>Dupliquer</button>
          <button class="btn btn-danger" data-suppr>Supprimer</button>
        </div>
      </div>
      <div class="plan-editeur">
        <section class="plan-colonne">
          <div class="carte">
            <div class="champ">
              <label>Sujet</label>
              <textarea class="champ-sujet" data-champ="sujet" rows="2" placeholder="Ex : La Chine, une puissance mondiale ?">${U.esc(p.sujet)}</textarea>
            </div>
            <div class="champ">
              <label>Problématique</label>
              <textarea data-champ="problematique" rows="2" placeholder="La question à laquelle ton plan répond">${U.esc(p.problematique)}</textarea>
            </div>
            <details ${p.introduction ? 'open' : ''}>
              <summary>Introduction <span class="aide">(accroche, définitions, annonce du plan)</span></summary>
              <textarea data-champ="introduction" rows="4">${U.esc(p.introduction)}</textarea>
            </details>
          </div>
          <div data-parties></div>
          <button class="btn" data-act="ajout-partie">➕ Ajouter une partie</button>
          <div class="carte" style="margin-top:16px">
            <details ${p.conclusion ? 'open' : ''}>
              <summary>Conclusion <span class="aide">(bilan, réponse à la problématique, ouverture)</span></summary>
              <textarea data-champ="conclusion" rows="4">${U.esc(p.conclusion)}</textarea>
            </details>
          </div>
          <p class="muet petit" data-etat-enreg>Enregistré automatiquement.</p>
        </section>

        <aside class="plan-recherche carte">
          <div class="recherche-entete">
            <h2>🔎 Arguments pertinents</h2>
            <button type="button" class="btn btn-petit" data-act="synonymes" title="Mots considérés comme équivalents dans la recherche">🔤 Synonymes</button>
          </div>
          <div class="champ">
            <input type="search" data-r="texte" value="${U.esc(r.texte)}" placeholder="Affiner (vide : d'après le sujet)">
          </div>
          <div class="champ">
            <select data-r="theme">${optionsFiltreThemes(r.theme)}</select>
          </div>
          <label class="case"><input type="checkbox" data-r="masquerPlaces" ${r.masquerPlaces ? 'checked' : ''}> Masquer les arguments déjà placés</label>
          <div class="destination" data-destination></div>
          <div class="petit muet" data-analyse></div>
          <div data-resultats></div>
        </aside>
      </div>`;

    this.dessinerParties();
    this.dessinerResultats();
    this.brancherEvenements(el);
  },

  dessinerParties() {
    const p = this.plan;
    const zone = this.el.querySelector('[data-parties]');
    const outils = (act, id, extra = '') => `
      <span class="outils">
        <button type="button" class="btn btn-discret btn-icone" data-act="monter-${act}" data-id="${id}" ${extra} title="Monter">↑</button>
        <button type="button" class="btn btn-discret btn-icone" data-act="descendre-${act}" data-id="${id}" ${extra} title="Descendre">↓</button>
        <button type="button" class="btn btn-discret btn-icone" data-act="retirer-${act}" data-id="${id}" ${extra} title="Retirer">✕</button>
      </span>`;
    const htmlArg = (argId, sp) => {
      const a = Stockage.donnees.arguments.find((x) => x.id === argId);
      const infos = a ? [
        a.exemples.length ? U.pluriel(a.exemples.length, 'exemple') : '',
        a.citations.length ? U.pluriel(a.citations.length, 'citation') : '',
      ].filter(Boolean).join(' · ') : '';
      return `
        <div class="arg-plan" draggable="true" data-arg="${argId}" data-depuis="${sp.id}">
          <span class="poignee" title="Glisser pour déplacer">⠿</span>
          <div class="arg-texte">
            ${a ? `<a href="javascript:void 0" data-act="fiche" data-id="${a.id}">${U.esc(a.idee)}</a>` : '<em class="muet">Argument supprimé de la banque</em>'}
            ${infos ? `<div class="petit muet">${infos}</div>` : ''}
          </div>
          ${outils('arg', argId, `data-sp="${sp.id}"`)}
        </div>`;
    };
    zone.innerHTML = p.parties.map((pa, i) => `
      <div class="carte partie" data-partie="${pa.id}">
        <div class="partie-entete">
          <span class="numero">${ROMAINS[i] || i + 1}.</span>
          <input type="text" data-titre-partie="${pa.id}" value="${U.esc(pa.titre)}" placeholder="Titre de la partie (idée directrice)">
          ${outils('partie', pa.id)}
        </div>
        ${pa.sousParties.map((sp, j) => `
          <div class="sous-partie ${sp.id === this.active ? 'active' : ''}" data-sp="${sp.id}">
            <div class="sp-entete">
              <span class="numero">${LETTRES[j] || j + 1}.</span>
              <input type="text" data-titre-sp="${sp.id}" value="${U.esc(sp.titre)}" placeholder="Titre de la sous-partie">
              ${outils('sp', sp.id)}
            </div>
            <textarea class="sp-notes" data-notes-sp="${sp.id}" rows="1" placeholder="Notes : idée, exemple à développer, transition...">${U.esc(sp.notes)}</textarea>
            <div class="sp-args">
              ${sp.argumentIds.map((id) => htmlArg(id, sp)).join('')}
              <div class="zone-depot">${sp.argumentIds.length ? '' : 'Glisse un argument ici, ou clique sur ＋ dans la liste de droite.'}</div>
            </div>
          </div>`).join('')}
        <button type="button" class="btn btn-discret btn-petit" data-act="ajout-sp" data-id="${pa.id}">➕ Ajouter une sous-partie</button>
      </div>`).join('');
    this.majDestination();
  },

  /** Texte « Ajout dans : I.A ... » */
  majDestination() {
    const zone = this.el.querySelector('[data-destination]');
    const t = this.active && this.trouverSp(this.active);
    zone.innerHTML = t
      ? `Les ＋ ajoutent dans <strong>${ROMAINS[t.i]}.${LETTRES[t.j]}</strong>${t.sp.titre ? ' ' + U.esc(t.sp.titre) : ''} <span class="muet">(clique sur une sous-partie pour changer)</span>`
      : 'Ajoute une sous-partie pour y ranger des arguments.';
  },

  dessinerResultats() {
    if (!this.el) return;
    const r = this.recherche;
    const p = this.plan;
    const requete = r.texte.trim() || p.sujet;
    const res = Pertinence.rechercher(requete, { theme: r.theme });
    const analyse = this.el.querySelector('[data-analyse]');
    if (res.sansCritere) {
      analyse.textContent = Stockage.donnees.arguments.length
        ? 'Écris un sujet (ou des mots dans la recherche) pour classer les arguments par pertinence.'
        : '';
    } else {
      const morceaux = res.concepts.map((c) => c.synonymes
        ? `<strong title="${U.esc(c.synonymes.join(', '))}">${U.esc(c.libelle)}</strong><span class="muet"> (+ synonymes)</span>`
        : `<strong>${U.esc(c.libelle)}</strong>`);
      if (res.plage) morceaux.push(`période <strong>${res.plage[0]}-${res.plage[1]}</strong>`);
      analyse.innerHTML = 'Recherche : ' + morceaux.join(', ');
    }

    let liste = res.resultats;
    if (r.masquerPlaces) liste = liste.filter((x) => !this.positions(p, x.arg.id).length);
    const zone = this.el.querySelector('[data-resultats]');
    if (!Stockage.donnees.arguments.length) {
      zone.innerHTML = '<div class="vide petit">Ta banque d\'arguments est vide.</div>';
      return;
    }
    if (!liste.length) {
      zone.innerHTML = `<div class="vide petit">Aucun argument trouvé.${res.sansCritere ? '' : '<br>Essaie d\'autres mots, ou ajoute des synonymes (bouton « 🔤 Synonymes » ci-dessus).'}</div>`;
      return;
    }
    const max = Math.max(...liste.map((x) => x.score), 0.0001);
    const LIMITE = 60;
    zone.innerHTML = liste.slice(0, LIMITE).map(({ arg, score, trouves }) => {
      const places = this.positions(p, arg.id);
      return `
        <div class="resultat ${places.length ? 'place' : ''}" draggable="true" data-arg="${arg.id}">
          <div class="resultat-haut">
            ${res.sansCritere ? '<span></span>' : `<div class="jauge-pertinence" title="Pertinence"><div style="width:${Math.max(6, Math.round((score / max) * 100))}%"></div></div>`}
            <button type="button" class="btn btn-petit btn-principal" data-act="ajouter" data-id="${arg.id}" title="Ajouter dans la sous-partie choisie">＋</button>
          </div>
          <a href="javascript:void 0" data-act="fiche" data-id="${arg.id}">${arg.demo ? '<span class="chip chip-demo">Démo</span> ' : ''}${U.esc(arg.idee)}</a>
          <div>
            ${places.map((x) => `<span class="chip chip-place">✓ ${x}</span>`).join('')}
            ${trouves.map((t) => `<span class="chip chip-trouve">${U.esc(t)}</span>`).join('')}
          </div>
        </div>`;
    }).join('') + (liste.length > LIMITE ? `<p class="muet petit">… et ${liste.length - LIMITE} autres. Affine la recherche pour les voir.</p>` : '');
  },

  /** Choisit la sous-partie où ajouter les arguments */
  activer(spId) {
    if (this.active === spId) return;
    this.active = spId;
    this.el.querySelectorAll('.sous-partie').forEach((x) => x.classList.toggle('active', x.dataset.sp === spId));
    this.majDestination();
  },

  /** Ajoute (ou déplace) un argument dans une sous-partie, à la position voulue */
  placer(argId, spId, index = null, depuisSp = null) {
    const cible = this.trouverSp(spId);
    if (!cible) return;
    if (depuisSp) {
      const orig = this.trouverSp(depuisSp);
      if (orig) {
        const k = orig.sp.argumentIds.indexOf(argId);
        if (k >= 0) {
          orig.sp.argumentIds.splice(k, 1);
          if (depuisSp === spId && index !== null && k < index) index--;
        }
      }
    } else if (cible.sp.argumentIds.includes(argId)) {
      toast('Cet argument est déjà dans cette sous-partie.', 'attention');
      return;
    }
    const liste = cible.sp.argumentIds;
    liste.splice(index === null ? liste.length : Math.min(index, liste.length), 0, argId);
    this.sauver(true);
    this.dessinerParties();
    this.dessinerResultats();
  },

  /** Déplace un argument d'un cran ; il passe à la sous-partie voisine s'il est au bord */
  deplacerArg(argId, spId, sens) {
    const sps = this.toutesSp();
    const k = sps.findIndex((s) => s.id === spId);
    const sp = sps[k];
    const pos = sp.argumentIds.indexOf(argId);
    const voisin = pos + sens;
    if (voisin >= 0 && voisin < sp.argumentIds.length) {
      [sp.argumentIds[pos], sp.argumentIds[voisin]] = [sp.argumentIds[voisin], sp.argumentIds[pos]];
    } else {
      const autre = sps[k + sens];
      if (!autre) return;
      if (autre.argumentIds.includes(argId)) { toast('Cet argument est déjà dans la sous-partie voisine.', 'attention'); return; }
      sp.argumentIds.splice(pos, 1);
      if (sens < 0) autre.argumentIds.push(argId); else autre.argumentIds.unshift(argId);
    }
    this.sauver(true);
    this.dessinerParties();
    this.dessinerResultats();
  },

  echanger(liste, i, sens) {
    const j = i + sens;
    if (j < 0 || j >= liste.length) return false;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    return true;
  },

  async action(act, bouton) {
    const p = this.plan;
    const id = bouton.dataset.id;
    const apres = () => { this.sauver(true); this.dessinerParties(); this.dessinerResultats(); };

    switch (act) {
      case 'synonymes':
        this.ouvrirSynonymes();
        return;
      case 'fiche':
        this.enregistrerMaintenant();
        Vues.arguments.ouvrirFiche(id);
        return;
      case 'ajouter':
        if (!this.active || !this.trouverSp(this.active)) { toast('Ajoute d\'abord une sous-partie à ton plan.', 'attention'); return; }
        this.placer(id, this.active);
        return;
      case 'ajout-partie': {
        if (p.parties.length >= ROMAINS.length) { toast('Ça fait beaucoup de parties !', 'attention'); return; }
        const sp = { id: U.uid(), titre: '', notes: '', argumentIds: [] };
        p.parties.push({ id: U.uid(), titre: '', sousParties: [sp, { id: U.uid(), titre: '', notes: '', argumentIds: [] }] });
        this.active = sp.id;
        apres();
        return;
      }
      case 'ajout-sp': {
        const pa = p.parties.find((x) => x.id === id);
        if (pa.sousParties.length >= LETTRES.length) return;
        const sp = { id: U.uid(), titre: '', notes: '', argumentIds: [] };
        pa.sousParties.push(sp);
        this.active = sp.id;
        apres();
        return;
      }
      case 'monter-partie':
      case 'descendre-partie': {
        const i = p.parties.findIndex((x) => x.id === id);
        if (this.echanger(p.parties, i, act.startsWith('monter') ? -1 : 1)) apres();
        return;
      }
      case 'monter-sp':
      case 'descendre-sp': {
        const t = this.trouverSp(id);
        if (this.echanger(t.partie.sousParties, t.j, act.startsWith('monter') ? -1 : 1)) apres();
        return;
      }
      case 'monter-arg':
      case 'descendre-arg':
        this.deplacerArg(id, bouton.dataset.sp, act.startsWith('monter') ? -1 : 1);
        return;
      case 'retirer-arg': {
        const t = this.trouverSp(bouton.dataset.sp);
        t.sp.argumentIds = t.sp.argumentIds.filter((x) => x !== id);
        apres();
        return;
      }
      case 'retirer-sp': {
        const t = this.trouverSp(id);
        if ((t.sp.argumentIds.length || t.sp.titre || t.sp.notes) && !await confirmer(
          `<p>Retirer la sous-partie <strong>${ROMAINS[t.i]}.${LETTRES[t.j]}</strong>${t.sp.titre ? ' « ' + U.esc(t.sp.titre) + ' »' : ''} ?</p>
           ${t.sp.argumentIds.length ? `<p class="muet">Les ${U.pluriel(t.sp.argumentIds.length, 'argument')} rangés dedans restent dans ta banque.</p>` : ''}`,
          { texteOk: 'Retirer', danger: true })) return;
        t.partie.sousParties.splice(t.j, 1);
        apres();
        return;
      }
      case 'retirer-partie': {
        const i = p.parties.findIndex((x) => x.id === id);
        const pa = p.parties[i];
        const plein = pa.titre || pa.sousParties.some((sp) => sp.titre || sp.notes || sp.argumentIds.length);
        if (plein && !await confirmer(`<p>Retirer la partie <strong>${ROMAINS[i]}</strong>${pa.titre ? ' « ' + U.esc(pa.titre) + ' »' : ''} et toutes ses sous-parties ?</p>
          <p class="muet">Les arguments restent dans ta banque.</p>`, { texteOk: 'Retirer', danger: true })) return;
        p.parties.splice(i, 1);
        apres();
        return;
      }
      default:
    }
  },

  brancherEvenements(el) {
    // Boutons d'en-tête
    el.querySelector('[data-exporter]').addEventListener('click', () => { this.enregistrerMaintenant(); this.ouvrirExport(); });
    el.querySelector('[data-dupliquer]').addEventListener('click', () => this.dupliquer(this.plan.id));
    el.querySelector('[data-suppr]').addEventListener('click', () => this.supprimer(this.plan.id));

    // Clics : actions et choix de la sous-partie active
    el.addEventListener('click', (e) => {
      const bouton = e.target.closest('[data-act]');
      if (bouton) { e.preventDefault(); this.action(bouton.dataset.act, bouton); }
      const sp = e.target.closest('.sous-partie');
      if (sp && this.trouverSp(sp.dataset.sp)) this.activer(sp.dataset.sp);
    });
    el.addEventListener('focusin', (e) => {
      const sp = e.target.closest('.sous-partie');
      if (sp) this.activer(sp.dataset.sp);
    });

    // Saisie de texte
    el.addEventListener('input', (e) => {
      const c = e.target;
      const p = this.plan;
      if (c.dataset.champ) {
        p[c.dataset.champ] = c.value;
        this.sauver();
        if (c.dataset.champ === 'sujet' && !this.recherche.texte.trim()) this.rechercherBientot();
      } else if (c.dataset.titrePartie) {
        p.parties.find((x) => x.id === c.dataset.titrePartie).titre = c.value;
        this.sauver();
      } else if (c.dataset.titreSp) {
        this.trouverSp(c.dataset.titreSp).sp.titre = c.value;
        this.sauver();
        if (c.dataset.titreSp === this.active) this.majDestination();
      } else if (c.dataset.notesSp) {
        this.trouverSp(c.dataset.notesSp).sp.notes = c.value;
        this.ajusterHauteur(c);
        this.sauver();
      } else if (c.dataset.r === 'texte') {
        this.recherche.texte = c.value;
        this.rechercherBientot();
      }
    });
    el.addEventListener('change', (e) => {
      const c = e.target;
      if (c.dataset.r === 'theme') { this.recherche.theme = c.value; this.dessinerResultats(); }
      if (c.dataset.r === 'masquerPlaces') { this.recherche.masquerPlaces = c.checked; this.dessinerResultats(); }
    });
    el.querySelectorAll('.sp-notes').forEach((t) => this.ajusterHauteur(t));

    // Glisser-déposer
    let glisse = null;
    el.addEventListener('dragstart', (e) => {
      const item = e.target.closest && e.target.closest('[draggable="true"]');
      if (!item) return;
      glisse = { arg: item.dataset.arg, depuis: item.dataset.depuis || null };
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/plain', item.dataset.arg);
      item.classList.add('glisse');
    });
    const nettoyer = () => {
      el.querySelectorAll('.survol, .inserer-avant, .glisse').forEach((x) => x.classList.remove('survol', 'inserer-avant', 'glisse'));
    };
    el.addEventListener('dragend', () => { nettoyer(); glisse = null; });
    const indexDepot = (spEl, y) => {
      const items = [...spEl.querySelectorAll('.arg-plan')];
      const k = items.findIndex((it) => { const r = it.getBoundingClientRect(); return y < r.top + r.height / 2; });
      return { items, k };
    };
    el.addEventListener('dragover', (e) => {
      const spEl = glisse && e.target.closest('.sous-partie');
      if (!spEl) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = glisse.depuis ? 'move' : 'copy';
      el.querySelectorAll('.survol, .inserer-avant').forEach((x) => x.classList.remove('survol', 'inserer-avant'));
      spEl.classList.add('survol');
      const { items, k } = indexDepot(spEl, e.clientY);
      if (k >= 0) items[k].classList.add('inserer-avant');
    });
    el.addEventListener('drop', (e) => {
      const spEl = glisse && e.target.closest('.sous-partie');
      if (!spEl) return;
      e.preventDefault();
      const { items, k } = indexDepot(spEl, e.clientY);
      const g = glisse;
      nettoyer();
      glisse = null;
      this.activer(spEl.dataset.sp);
      this.placer(g.arg, spEl.dataset.sp, k >= 0 ? k : items.length, g.depuis);
    });
  },

  rechercherBientot() {
    clearTimeout(this.minuteurRecherche);
    this.minuteurRecherche = setTimeout(() => this.dessinerResultats(), 300);
  },

  ajusterHauteur(t) {
    t.style.height = 'auto';
    t.style.height = Math.max(34, t.scrollHeight + 2) + 'px';
  },

  /* ---------------- Export ---------------- */

  /** Retire la mise en forme légère (**gras**, *italique*) */
  texteBrut(s) {
    return String(s ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
  },

  texteExemple(x) {
    const extra = [x.date, x.source].filter(Boolean).join(', ');
    return `${x.mesure} : ${x.chiffre}${extra ? ` (${extra})` : ''}`;
  },

  texteCitation(c) {
    return `« ${c.texte} » (${[c.auteur, c.contexte].filter(Boolean).join(', ')})`;
  },

  /** Version texte du plan */
  versTexte(p, o) {
    const L = [];
    const indenter = (texte, retrait) => this.texteBrut(texte).split('\n').map((l) => retrait + l).join('\n');
    L.push('SUJET : ' + (p.sujet || ''));
    if (p.problematique) L.push('', 'Problématique : ' + p.problematique);
    if (o.notes && p.introduction) L.push('', 'INTRODUCTION', indenter(p.introduction, ''));
    p.parties.forEach((pa, i) => {
      L.push('', `${ROMAINS[i] || i + 1}. ${pa.titre || '(titre à trouver)'}`);
      pa.sousParties.forEach((sp, j) => {
        L.push('', `   ${LETTRES[j] || j + 1}. ${sp.titre || '(titre à trouver)'}`);
        if (o.notes && sp.notes) L.push(indenter(sp.notes, '      '));
        for (const id of sp.argumentIds) {
          const a = Stockage.donnees.arguments.find((x) => x.id === id);
          if (!a) continue;
          L.push(`      • ${a.idee}`);
          if (o.explications && a.explication) L.push(indenter(a.explication, '          '));
          if (o.details) {
            for (const x of a.exemples) L.push('          - Chiffre : ' + this.texteExemple(x));
            for (const c of a.citations) L.push('          - Citation : ' + this.texteCitation(c));
          }
        }
      });
    });
    if (o.notes && p.conclusion) L.push('', 'CONCLUSION', indenter(p.conclusion, ''));
    return L.join('\n') + '\n';
  },

  /** Version HTML du plan (impression / PDF) */
  versHtml(p, o) {
    const md = (t) => U.md(t);
    let h = `<h1>${U.esc(p.sujet || '')}</h1>`;
    if (p.problematique) h += `<p class="imp-problematique"><strong>Problématique :</strong> ${U.esc(p.problematique)}</p>`;
    if (o.notes && p.introduction) h += `<h2>Introduction</h2><div class="imp-notes">${md(p.introduction)}</div>`;
    p.parties.forEach((pa, i) => {
      h += `<h2>${ROMAINS[i] || i + 1}. ${U.esc(pa.titre || '(titre à trouver)')}</h2>`;
      pa.sousParties.forEach((sp, j) => {
        h += `<h3>${LETTRES[j] || j + 1}. ${U.esc(sp.titre || '(titre à trouver)')}</h3>`;
        if (o.notes && sp.notes) h += `<div class="imp-notes">${md(sp.notes)}</div>`;
        const args = sp.argumentIds.map((id) => Stockage.donnees.arguments.find((x) => x.id === id)).filter(Boolean);
        if (!args.length) return;
        h += '<ul class="imp-args">' + args.map((a) => `<li><strong>${U.esc(a.idee)}</strong>
          ${o.explications && a.explication ? `<div>${md(a.explication)}</div>` : ''}
          ${o.details && (a.exemples.length || a.citations.length) ? `<ul>
            ${a.exemples.map((x) => `<li>${U.esc(x.mesure)} : <strong>${U.esc(x.chiffre)}</strong>${x.date || x.source ? ' (' + U.esc([x.date, x.source].filter(Boolean).join(', ')) + ')' : ''}</li>`).join('')}
            ${a.citations.map((c) => `<li><em>« ${U.esc(c.texte)} »</em> (${U.esc([c.auteur, c.contexte].filter(Boolean).join(', '))})</li>`).join('')}
          </ul>` : ''}</li>`).join('') + '</ul>';
      });
    });
    if (o.notes && p.conclusion) h += `<h2>Conclusion</h2><div class="imp-notes">${md(p.conclusion)}</div>`;
    return h;
  },

  nomFichier(p) {
    const base = U.norm(p.sujet || 'plan').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'plan';
    return `plan-${base}.txt`;
  },

  ouvrirExport() {
    const p = this.plan;
    const o = { details: true, explications: false, notes: true };
    const m = Modal.ouvrir({
      titre: 'Exporter le plan',
      large: true,
      contenu: `
        <div class="barre-actions" style="margin-bottom:12px">
          <label class="case"><input type="checkbox" data-o="details" checked> Exemples chiffrés et citations</label>
          <label class="case"><input type="checkbox" data-o="explications"> Explications des arguments</label>
          <label class="case"><input type="checkbox" data-o="notes" checked> Mes notes (introduction, sous-parties, conclusion)</label>
        </div>
        <textarea class="apercu-export" data-apercu rows="18" readonly spellcheck="false"></textarea>
        <div class="modal-pied">
          <button class="btn" data-copier>📋 Copier le texte</button>
          <button class="btn" data-txt>💾 Fichier .txt</button>
          <button class="btn btn-principal" data-imprimer>🖨️ Imprimer / PDF</button>
        </div>`,
    });
    const apercu = m.corps.querySelector('[data-apercu]');
    const maj = () => { apercu.value = this.versTexte(p, o); };
    m.corps.querySelectorAll('[data-o]').forEach((c) => c.addEventListener('change', () => { o[c.dataset.o] = c.checked; maj(); }));
    maj();
    m.corps.querySelector('[data-copier]').addEventListener('click', () => this.copier(apercu));
    m.corps.querySelector('[data-txt]').addEventListener('click', () => {
      U.telecharger(this.nomFichier(p), apercu.value, 'text/plain');
      toast('Fichier téléchargé.');
    });
    m.corps.querySelector('[data-imprimer]').addEventListener('click', () => this.imprimer(this.versHtml(p, o)));
  },

  async copier(zone) {
    try {
      await navigator.clipboard.writeText(zone.value);
      toast('Plan copié dans le presse-papiers.');
    } catch (e) {
      zone.select();
      const ok = document.execCommand && document.execCommand('copy');
      toast(ok ? 'Plan copié dans le presse-papiers.' : 'Copie impossible : sélectionne le texte et fais Ctrl + C.', ok ? 'info' : 'attention');
    }
  },

  /** Imprime le plan seul (choisir « Enregistrer au format PDF » dans la fenêtre d'impression pour un PDF) */
  imprimer(html) {
    let zone = document.getElementById('impression');
    if (!zone) {
      zone = document.createElement('div');
      zone.id = 'impression';
      document.body.appendChild(zone);
    }
    zone.innerHTML = html;
    document.documentElement.classList.add('impression');
    const fin = () => {
      document.documentElement.classList.remove('impression');
      zone.innerHTML = '';
      window.removeEventListener('afterprint', fin);
    };
    window.addEventListener('afterprint', fin);
    setTimeout(() => window.print(), 50);
  },
};

/* Ne rien perdre si on ferme l'onglet juste après avoir tapé */
window.addEventListener('beforeunload', () => Vues.plans.enregistrerMaintenant());
