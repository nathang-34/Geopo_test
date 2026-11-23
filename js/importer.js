/* =========================================================
   importer.js : page « Importer »
   1. Prompt modèle à copier pour Claude (avec la liste à jour
      de tes thèmes et chapitres).
   2. Collage de la réponse JSON de Claude : vérification,
      aperçu, erreurs, doublons, chapitres inconnus, import
      de la sélection.
   ========================================================= */

const MOTS_VIDES = new Set('les des une est sont dans pour par sur avec aux que qui ses son leur leurs plus mais pas cette ces elle ils entre lors dont comme fait tres tout tous toute toutes ainsi aussi deux apres avant depuis'.split(' '));

/** Mots significatifs d'un texte (sans accents, sans petits mots) */
function motsSignificatifs(texte) {
  return new Set(U.norm(texte).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((m) => m.length >= 3 && !MOTS_VIDES.has(m)));
}

/** Ressemblance entre deux textes, de 0 (rien en commun) à 1 (mêmes mots) */
function ressemblance(a, b) {
  if (U.norm(a) === U.norm(b)) return 1;
  const A = motsSignificatifs(a);
  const B = motsSignificatifs(b);
  if (!A.size || !B.size) return 0;
  let communs = 0;
  for (const m of A) if (B.has(m)) communs++;
  return communs / (A.size + B.size - communs);
}

const SEUIL_DOUBLON_ARGUMENT = 0.7;
const SEUIL_DOUBLON_CARTE = 0.85;

Vues.importer = {
  texte: '',          // texte collé, gardé si on change de page
  analyse: null,      // résultat de la vérification
  correspondances: {}, // chapitres inconnus -> décision de l'utilisateur
  optionsPrompt: { chapitre: '', flashcards: true },

  rendre(el) {
    el.innerHTML = `
      <div class="entete-vue"><h1>📥 Importer du contenu</h1></div>
      <p class="muet">Méthode : ① copie le prompt modèle, ② envoie-le à Claude avec les photos de ton cours, ③ colle sa réponse ici, vérifie l'aperçu et importe.</p>

      <div class="carte">
        <h2>① Prompt modèle pour Claude</h2>
        <div class="ligne-champs" style="grid-template-columns: 2fr 1fr; align-items:end; margin-bottom:12px">
          <div>
            <label>Chapitre concerné par tes photos <span class="aide">(facultatif, aide Claude à bien ranger)</span></label>
            <select data-p="chapitre">
              <option value="">Je ne précise pas (Claude choisit dans la liste)</option>
              ${Stockage.donnees.themes.map((t) => `<optgroup label="${U.esc(t.nom)}">${t.chapitres.map((c) => `<option value="${c.id}" ${this.optionsPrompt.chapitre === c.id ? 'selected' : ''}>${U.esc(c.nom)}</option>`).join('')}</optgroup>`).join('')}
            </select>
          </div>
          <label style="display:flex; gap:8px; align-items:center; font-weight:normal; margin-bottom:10px">
            <input type="checkbox" data-p="flashcards" ${this.optionsPrompt.flashcards ? 'checked' : ''}> Demander aussi des flashcards de cours
          </label>
        </div>
        <textarea data-prompt readonly rows="10" style="font-size:0.85rem"></textarea>
        <div class="barre-actions" style="margin-top:10px">
          <button class="btn btn-principal" data-copier>📋 Copier le prompt</button>
          <span class="muet petit">Le prompt contient automatiquement la liste à jour de tes thèmes et chapitres.</span>
        </div>
      </div>

      <div class="carte">
        <h2>② Coller la réponse de Claude</h2>
        <p class="muet petit">Colle toute sa réponse, ou seulement le bloc JSON : le site retrouve le JSON tout seul. Tu peux aussi charger un fichier <code>.json</code>.</p>
        <textarea data-json rows="10" placeholder='{ "format": "geopo-import", "version": 1, "arguments": [ ... ], "flashcards": [ ... ] }' style="font-family: Consolas, monospace; font-size:0.85rem">${U.esc(this.texte)}</textarea>
        <div class="barre-actions" style="margin-top:10px">
          <button class="btn btn-principal" data-verifier>🔍 Vérifier</button>
          <label class="btn" style="margin:0; font-weight:normal">📂 Charger un fichier<input type="file" accept=".json,.txt,application/json" data-fichier hidden></label>
          <button class="btn btn-discret" data-effacer>Effacer</button>
        </div>
      </div>

      <div data-resultat></div>
    `;

    // Prompt
    const zonePrompt = el.querySelector('[data-prompt]');
    const majPrompt = () => { zonePrompt.value = this.genererPrompt(this.optionsPrompt); };
    majPrompt();
    el.querySelector('[data-p="chapitre"]').addEventListener('change', (e) => { this.optionsPrompt.chapitre = e.target.value; majPrompt(); });
    el.querySelector('[data-p="flashcards"]').addEventListener('change', (e) => { this.optionsPrompt.flashcards = e.target.checked; majPrompt(); });
    el.querySelector('[data-copier]').addEventListener('click', () => this.copier(zonePrompt));

    // JSON
    const zoneJson = el.querySelector('[data-json]');
    zoneJson.addEventListener('input', () => { this.texte = zoneJson.value; });
    el.querySelector('[data-verifier]').addEventListener('click', () => {
      this.texte = zoneJson.value;
      this.verifier();
      this.dessinerResultat(el);
      el.querySelector('[data-resultat]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el.querySelector('[data-effacer]').addEventListener('click', () => {
      this.texte = '';
      this.analyse = null;
      zoneJson.value = '';
      this.dessinerResultat(el);
    });
    el.querySelector('[data-fichier]').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const lecteur = new FileReader();
      lecteur.onload = () => {
        zoneJson.value = this.texte = String(lecteur.result);
        this.verifier();
        this.dessinerResultat(el);
      };
      lecteur.readAsText(f, 'utf-8');
    });

    this.dessinerResultat(el);
  },

  /* =====================================================
     Copier dans le presse-papiers
     ===================================================== */
  async copier(zone) {
    try {
      await navigator.clipboard.writeText(zone.value);
    } catch (e) {
      // Méthode de secours pour les navigateurs qui refusent
      zone.removeAttribute('readonly');
      zone.select();
      document.execCommand('copy');
      zone.setAttribute('readonly', '');
      window.getSelection().removeAllRanges();
    }
    toast('Prompt copié ! Colle-le dans Claude avec tes photos.');
  },

  /* =====================================================
     Le prompt modèle
     ===================================================== */
  genererPrompt({ chapitre, flashcards }) {
    const themes = Stockage.donnees.themes;
    const listeChapitres = themes.length
      ? themes.map((t) => `- Thème « ${t.nom} »\n${t.chapitres.map((c) => `  - "${c.nom}"`).join('\n') || '  (aucun chapitre)'}`).join('\n')
      : '(aucun thème pour l\'instant : propose un nom de chapitre, je l\'associerai moi-même)';
    const cible = chapitre ? Stockage.rattachement(chapitre) : null;
    const premierChapitre = cible ? cible.nom : (themes[0] && themes[0].chapitres[0] ? themes[0].chapitres[0].nom : 'Nom exact du chapitre');

    const historiques = Pays.base().filter((e) => e.type === 'historique').map((e) => e.nom);
    const organisations = Pays.base().filter((e) => e.type === 'organisation' && e.region === 'Organisations et alliances').map((e) => e.nom);
    const ensembles = Pays.base().filter((e) => e.region === 'Grands ensembles').map((e) => e.nom);

    const exemple = {
      format: 'geopo-import',
      version: 1,
      arguments: [
        {
          idee: "En 1945, l'Europe est ruinée et le monde devient bipolaire, dominé par les États-Unis et l'URSS.",
          explication: "La Seconde Guerre mondiale laisse l'Europe **détruite et affaiblie**.\n- Les États-Unis, intacts, dominent l'économie mondiale.\n- L'URSS, victorieuse, contrôle l'Europe de l'Est.\nLes désaccords entre vainqueurs mènent rapidement à la guerre froide.",
          exemples: [
            { mesure: 'Nombre de morts de la Seconde Guerre mondiale', chiffre: 'entre 60 et 70 millions', date: '1939-1945', source: 'cours' },
          ],
          citations: [
            { texte: "De Stettin dans la Baltique jusqu'à Trieste dans l'Adriatique, un rideau de fer est descendu à travers le continent.", auteur: 'Winston Churchill', contexte: 'Discours de Fulton, 5 mars 1946' },
          ],
          chapitres: [premierChapitre],
          motsCles: ['bipolarisation', 'superpuissances'],
          pays: ['États-Unis', 'URSS', 'Europe occidentale'],
          dates: [{ date: 'février 1945', libelle: 'Conférence de Yalta' }],
        },
      ],
      flashcards: flashcards ? [
        { recto: "Qu'est-ce que la « bipolarisation » du monde après 1945 ?", verso: "L'organisation du monde autour de deux superpuissances rivales, les États-Unis et l'URSS, chacune à la tête d'un bloc.", chapitre: premierChapitre, type: 'autre' },
      ] : [],
    };

    return `Tu es mon assistant de révision en géopolitique. Je suis en classe préparatoire ECG, option HGG (histoire, géographie et géopolitique du monde contemporain).

Je t'envoie des photos de mon cahier de cours. Ta mission : transformer ce cours en ARGUMENTS réutilisables en dissertation${flashcards ? ' et en FLASHCARDS' : ''}, au format JSON décrit plus bas, pour que je les importe dans mon site de révision.
${cible ? `\nCe cours correspond au chapitre "${cible.nom}" (thème « ${cible.theme.nom} »). Rattache tout à ce chapitre, sauf si un argument concerne clairement aussi un autre chapitre de la liste.\n` : ''}
## Règles sur le fond

1. FIDÉLITÉ : appuie-toi d'abord sur ce qui est écrit sur mes photos. N'invente jamais un chiffre, une date ou une citation. Si un passage est illisible, ne devine pas : signale-le après le JSON.
2. COMPLÉMENTS : tu peux ajouter un exemple chiffré ou une citation absents du cours seulement si tu es certain de leur exactitude. Dans ce cas, écris "complément Claude, à vérifier" dans "source" (pour un chiffre) ou à la fin de "contexte" (pour une citation).
3. UN ARGUMENT = UNE IDÉE mobilisable en dissertation :
   - "idee" : une affirmation complète en une phrase (pas un titre, pas une question) ;
   - "explication" : 4 à 8 phrases qui démontrent l'idée (causes, mécanismes, conséquences, nuances).
   Préfère plusieurs arguments précis à un argument fourre-tout : en général, un argument par sous-partie du cours.
4. EXEMPLES CHIFFRÉS (champ "exemples") :
   - "mesure" : ce qui est mesuré, compréhensible seul, car le site en fait une question de flashcard (ex : "Part des États-Unis dans la production industrielle mondiale") ;
   - "chiffre" : la valeur avec son unité (ex : "32 %", "environ 6 millions") ;
   - "date" : l'année ou la période ;
   - "source" : l'organisme ou l'auteur, ou "cours" si mon cours ne le précise pas.
5. CITATIONS : "texte" exact sans guillemets autour, "auteur" (prénom et nom), "contexte" (ouvrage, discours, lieu, date).
6. CHAPITRES : le champ "chapitres" contient un ou plusieurs noms recopiés EXACTEMENT depuis ma liste ci-dessous. Si vraiment aucun ne convient, propose un nouveau nom court : je l'associerai moi-même.
7. PAYS ET ACTEURS (champ "pays") : noms français usuels des pays actuels ("États-Unis", "Royaume-Uni", "Chine", "RDC"...). Pour les acteurs disparus ou collectifs, utilise de préférence ces noms exacts :
   - entités historiques : ${historiques.join(', ')} ;
   - organisations : ${organisations.join(', ')} ;
   - grands ensembles : ${ensembles.join(', ')}.
8. MOTS-CLÉS : 2 à 5 notions en minuscules (ex : "impérialisme", "bipolarisation", "apaisement").
9. DATES : les événements datés importants de l'argument ("date" en texte libre, ex : "1949" ou "1er octobre 1949", et "libelle" pour l'événement).
${flashcards ? `10. FLASHCARDS (champ "flashcards") : des cartes de cours sur les définitions de notions, les dates clés, les acteurs, les causes et conséquences.
   - "recto" : une question précise et autonome, compréhensible sans contexte ;
   - "verso" : une réponse courte (1 à 3 lignes) ;
   - "chapitre" : un nom de ma liste, recopié exactement ;
   - "type" : "date" (la réponse est une date), "citation", "chiffre" ou "autre" (notion, acteur, cause...).
   Ne fais PAS de cartes sur les chiffres et citations déjà présents dans les arguments : mon site les crée automatiquement.
` : ''}
## Mes thèmes et chapitres actuels

${listeChapitres}

## Format de réponse (très important)

Réponds avec UN SEUL bloc de code \`\`\`json, conforme à ce modèle (son contenu sert seulement à montrer la forme : ne le recopie pas) :

\`\`\`json
${JSON.stringify(exemple, null, 2)}
\`\`\`

Contraintes techniques :
- JSON valide : guillemets droits doubles " pour les clés et les valeurs, pas de virgule après le dernier élément d'une liste, aucun commentaire.
- À l'intérieur d'un texte, utilise les guillemets français « » plutôt que des guillemets droits.
- Tous les champs doivent être présents, même vides ([] ou "").
- Dans "explication" seulement, tu peux utiliser **gras** et des listes avec "- " ; les retours à la ligne s'écrivent \\n.
- Garde "format": "geopo-import" et "version": 1.${flashcards ? '' : '\n- Laisse "flashcards" vide : [].'}

Après le bloc JSON (en dehors du bloc), ajoute une courte liste :
- les passages illisibles ou incertains ;
- les compléments que tu as ajoutés et que je dois vérifier.`;
  },

  /* =====================================================
     Vérification du JSON collé
     ===================================================== */

  /** Retrouve le JSON dans le texte collé et le lit. Renvoie { ok, objet, corrections, erreur } */
  lireJson(texte) {
    let t = String(texte || '').trim();
    if (!t) return { ok: false, erreur: 'Rien à vérifier : colle d\'abord la réponse de Claude.' };
    const corrections = [];

    // Bloc ```json ... ``` dans une réponse complète
    const bloc = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (bloc) { t = bloc[1].trim(); }
    // Texte autour du JSON
    const debut = t.indexOf('{');
    const fin = t.lastIndexOf('}');
    if (debut === -1 || fin === -1) return { ok: false, erreur: 'Aucun objet JSON trouvé (il doit commencer par { et finir par }).' };
    if (debut > 0 || fin < t.length - 1) t = t.slice(debut, fin + 1);

    try {
      return { ok: true, objet: JSON.parse(t), corrections };
    } catch (e1) {
      // Corrections automatiques des erreurs les plus courantes
      let r = t
        .replace(/[“”]/g, '"')      // guillemets “ ” utilisés comme guillemets JSON
        .replace(/,\s*([}\]])/g, '$1');        // virgule en trop avant } ou ]
      try {
        const objet = JSON.parse(r);
        corrections.push('Petites erreurs de syntaxe corrigées automatiquement (virgules en trop ou guillemets typographiques).');
        return { ok: true, objet, corrections };
      } catch (e2) {
        return { ok: false, erreur: this.expliquerErreurJson(e1, t) };
      }
    }
  },

  /** Message clair, avec la ligne fautive */
  expliquerErreurJson(e, t) {
    const m = String(e.message).match(/position (\d+)/);
    let ou = '';
    if (m) {
      const pos = Number(m[1]);
      const avant = t.slice(0, pos);
      const ligne = avant.split('\n').length;
      const extrait = t.slice(Math.max(0, pos - 60), pos + 40).replace(/\n/g, ' ');
      ou = ` Problème vers la ligne ${ligne} : « …${extrait}… ».`;
    }
    return `Le JSON est mal formé.${ou} Vérifie que tu as bien copié tout le bloc, de la première { à la dernière }. Sinon, demande à Claude : « Ton JSON est invalide, renvoie-le corrigé, en entier. »`;
  },

  /** Transforme une valeur en liste de textes (tolère un texte seul ou séparé par des virgules) */
  listeTextes(v) {
    if (v === undefined || v === null || v === '') return [];
    if (typeof v === 'string') return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(v)) return v.map((x) => String(x ?? '').trim()).filter(Boolean);
    return null; // type incorrect
  },

  /** Retrouve un chapitre ou un thème par son nom. Renvoie l'id ou null */
  chapitreParNom(nom) {
    const n = U.norm(nom).replace(/^"|"$/g, '');
    for (const t of Stockage.donnees.themes) {
      for (const c of t.chapitres) if (U.norm(c.nom) === n) return c.id;
      if (U.norm(t.nom) === n) return t.id;
    }
    return null;
  },

  /** Nom officiel d'un pays tapé autrement (alias, majuscules...) ou null */
  paysParNom(nom) {
    const n = U.norm(nom);
    const e = Pays.tous().find((x) => U.norm(x.nom) === n || x.alias.some((a) => U.norm(a) === n));
    return e ? e.nom : null;
  },

  verifier() {
    const lu = this.lireJson(this.texte);
    if (!lu.ok) { this.analyse = { erreurGlobale: lu.erreur }; return; }
    const o = lu.objet;
    const avertissementsGlobaux = [...lu.corrections];

    if (Array.isArray(o)) { this.analyse = { erreurGlobale: 'Le JSON est une liste. Il faut un objet de la forme { "format": "geopo-import", "arguments": [...], "flashcards": [...] }.' }; return; }
    if (o.format === 'geopo-sauvegarde') { this.analyse = { erreurGlobale: "C'est un fichier de sauvegarde complète : importe-le depuis la page Sauvegarde." }; return; }
    if (o.format !== 'geopo-import') avertissementsGlobaux.push('Le champ "format" vaut normalement "geopo-import" : le contenu est quand même analysé.');
    if (!Array.isArray(o.arguments) && !Array.isArray(o.flashcards)) {
      this.analyse = { erreurGlobale: 'Aucune liste "arguments" ni "flashcards" trouvée dans le JSON.' };
      return;
    }

    const inconnus = new Map(); // nom normalisé -> nom tel qu'écrit
    const noterChapitre = (nom, el) => {
      const id = this.chapitreParNom(nom);
      if (id) el.rattachements.push(id);
      else {
        if (!inconnus.has(U.norm(nom))) inconnus.set(U.norm(nom), nom);
        el.chapitresInconnus.push(nom);
      }
    };

    // ---------- Arguments ----------
    const args = (Array.isArray(o.arguments) ? o.arguments : []).map((brut, i) => {
      const el = { type: 'argument', index: i, erreurs: [], avertissements: [], rattachements: [], chapitresInconnus: [], paysNouveaux: [] };
      if (!brut || typeof brut !== 'object' || Array.isArray(brut)) {
        el.erreurs.push('Cet élément n\'est pas un argument (objet attendu).');
        el.propre = { idee: '(illisible)', explication: '', exemples: [], citations: [], motsCles: [], pays: [], dates: [] };
        return el;
      }
      const texte = (v) => (typeof v === 'string' ? v.trim() : (v === undefined || v === null ? '' : String(v).trim()));
      const p = {
        idee: texte(brut.idee),
        explication: texte(brut.explication),
        exemples: [], citations: [], motsCles: [], pays: [], dates: [],
      };
      if (!p.idee) el.erreurs.push('L\'idée principale ("idee") est vide ou absente.');
      if (!p.explication) el.avertissements.push('Pas d\'explication.');

      const liste = (v, nomChamp) => {
        if (v === undefined || v === null) return [];
        if (!Array.isArray(v)) { el.erreurs.push(`"${nomChamp}" devrait être une liste [ ... ].`); return []; }
        return v;
      };
      liste(brut.exemples, 'exemples').forEach((x, j) => {
        const ex = { mesure: texte(x && x.mesure), chiffre: texte(x && x.chiffre), date: texte(x && x.date), source: texte(x && x.source) };
        if (!ex.mesure || !ex.chiffre) el.avertissements.push(`Exemple n°${j + 1} ignoré (il manque ce qui est mesuré ou le chiffre).`);
        else p.exemples.push(ex);
      });
      liste(brut.citations, 'citations').forEach((x, j) => {
        const c = { texte: texte(x && x.texte).replace(/^[«"“\s]+|[»"”\s]+$/g, ''), auteur: texte(x && x.auteur), contexte: texte(x && x.contexte) };
        if (!c.texte || !c.auteur) el.avertissements.push(`Citation n°${j + 1} ignorée (il manque le texte ou l'auteur).`);
        else p.citations.push(c);
      });
      liste(brut.dates, 'dates').forEach((x, j) => {
        const d = { date: texte(x && x.date), libelle: texte(x && x.libelle) };
        if (!d.date || !d.libelle) el.avertissements.push(`Date n°${j + 1} ignorée (il manque la date ou l'événement).`);
        else p.dates.push(d);
      });

      const mots = this.listeTextes(brut.motsCles);
      if (mots === null) el.erreurs.push('"motsCles" devrait être une liste de textes.');
      else p.motsCles = [...new Set(mots)];

      const pays = this.listeTextes(brut.pays);
      if (pays === null) el.erreurs.push('"pays" devrait être une liste de textes.');
      else {
        for (const nom of pays) {
          const officiel = this.paysParNom(nom);
          if (officiel) { if (!p.pays.includes(officiel)) p.pays.push(officiel); }
          else { p.pays.push(nom); el.paysNouveaux.push(nom); }
        }
        if (el.paysNouveaux.length) el.avertissements.push(`Acteur(s) inconnu(s), ajouté(s) à tes acteurs personnalisés : ${el.paysNouveaux.join(', ')}.`);
      }

      const chapitres = this.listeTextes(brut.chapitres);
      if (chapitres === null) el.erreurs.push('"chapitres" devrait être une liste de noms.');
      else chapitres.forEach((nom) => noterChapitre(nom, el));
      if (chapitres && !chapitres.length) el.avertissements.push('Aucun chapitre indiqué : l\'argument sera « non classé ».');

      el.propre = p;
      return el;
    });

    // ---------- Flashcards ----------
    const cartes = (Array.isArray(o.flashcards) ? o.flashcards : []).map((brut, i) => {
      const el = { type: 'flashcard', index: i, erreurs: [], avertissements: [], rattachements: [], chapitresInconnus: [] };
      const texte = (v) => (typeof v === 'string' ? v.trim() : (v === undefined || v === null ? '' : String(v).trim()));
      const p = { recto: texte(brut && brut.recto), verso: texte(brut && brut.verso) };
      const typeBrut = U.norm(brut && brut.type);
      if (TYPES_CARTE[typeBrut]) p.type = typeBrut;
      if (!p.recto) el.erreurs.push('Le recto est vide.');
      if (!p.verso) el.erreurs.push('Le verso est vide.');
      const ch = brut && (brut.chapitre ?? brut.chapitres);
      const noms = this.listeTextes(ch) || [];
      if (noms.length) noterChapitre(noms[0], el);
      else el.avertissements.push('Aucun chapitre indiqué : la carte sera « non classée ».');
      el.propre = p;
      return el;
    });

    // ---------- Doublons ----------
    const existantsArgs = Stockage.donnees.arguments;
    args.forEach((el, i) => {
      if (el.erreurs.length) return;
      const proche = existantsArgs.find((a) => ressemblance(a.idee, el.propre.idee) >= SEUIL_DOUBLON_ARGUMENT);
      if (proche) { el.doublon = `Ressemble à un argument déjà dans ta banque : « ${proche.idee} »`; return; }
      const avant = args.slice(0, i).find((x) => !x.erreurs.length && ressemblance(x.propre.idee, el.propre.idee) >= SEUIL_DOUBLON_ARGUMENT);
      if (avant) el.doublon = `Ressemble à l'argument n°${avant.index + 1} de cet import.`;
    });
    const existantesCartes = Stockage.donnees.flashcards;
    cartes.forEach((el, i) => {
      if (el.erreurs.length) return;
      const proche = existantesCartes.find((c) => ressemblance(c.recto, el.propre.recto) >= SEUIL_DOUBLON_CARTE);
      if (proche) { el.doublon = `Ressemble à une flashcard existante : « ${proche.recto} »`; return; }
      const avant = cartes.slice(0, i).find((x) => !x.erreurs.length && ressemblance(x.propre.recto, el.propre.recto) >= SEUIL_DOUBLON_CARTE);
      if (avant) el.doublon = `Ressemble à la flashcard n°${avant.index + 1} de cet import.`;
    });

    // Cochés par défaut : ce qui est valide et n'est pas un doublon
    for (const el of [...args, ...cartes]) el.coche = !el.erreurs.length && !el.doublon;

    // Décisions par défaut pour les chapitres inconnus
    for (const [cle, nom] of inconnus) {
      if (!this.correspondances[cle]) this.correspondances[cle] = this.decisionParDefaut(nom);
    }

    this.analyse = { args, cartes, inconnus: [...inconnus.entries()], avertissementsGlobaux };
  },

  /** Pour un chapitre inconnu : chapitre le plus ressemblant, sinon création dans le dernier thème */
  decisionParDefaut(nom) {
    let meilleur = null;
    let score = 0;
    for (const t of Stockage.donnees.themes) {
      for (const c of [...t.chapitres, t]) {
        const s = ressemblance(c.nom, nom);
        if (s > score) { score = s; meilleur = c.id; }
      }
    }
    if (meilleur && score >= 0.5) return 'existant:' + meilleur;
    const themes = Stockage.donnees.themes;
    return themes.length ? 'creer:' + themes[themes.length - 1].id : 'nouveau-theme';
  },

  /* =====================================================
     Affichage de l'aperçu
     ===================================================== */
  dessinerResultat(el) {
    const zone = el.querySelector('[data-resultat]');
    const a = this.analyse;
    if (!a) { zone.innerHTML = ''; return; }
    if (a.erreurGlobale) {
      zone.innerHTML = `<div class="carte" style="border-color:var(--danger)"><h2>❌ Impossible de lire le contenu</h2><p>${U.esc(a.erreurGlobale)}</p></div>`;
      return;
    }

    const compter = (liste) => ({
      total: liste.length,
      ok: liste.filter((x) => !x.erreurs.length && !x.doublon).length,
      doublons: liste.filter((x) => !x.erreurs.length && x.doublon).length,
      erreurs: liste.filter((x) => x.erreurs.length).length,
    });
    const ca = compter(a.args);
    const cc = compter(a.cartes);
    const resume = (c, mot) => `<strong>${U.pluriel(c.total, mot)}</strong> : ${c.ok} prêt(s)${c.doublons ? `, <span style="color:var(--attention)">${c.doublons} doublon(s) possible(s)</span>` : ''}${c.erreurs ? `, <span style="color:var(--danger)">${c.erreurs} avec erreur</span>` : ''}`;

    const optionsDecision = (cle) => {
      const choix = this.correspondances[cle];
      let html = '<optgroup label="Associer à un élément existant">';
      for (const t of Stockage.donnees.themes) {
        html += `<option value="existant:${t.id}" ${choix === 'existant:' + t.id ? 'selected' : ''}>Thème : ${U.esc(t.nom)}</option>`;
        for (const c of t.chapitres) html += `<option value="existant:${c.id}" ${choix === 'existant:' + c.id ? 'selected' : ''}>  ↳ ${U.esc(c.nom)}</option>`;
      }
      html += '</optgroup><optgroup label="Créer">';
      for (const t of Stockage.donnees.themes) html += `<option value="creer:${t.id}" ${choix === 'creer:' + t.id ? 'selected' : ''}>Créer ce chapitre dans « ${U.esc(t.nom)} »</option>`;
      html += `<option value="nouveau-theme" ${choix === 'nouveau-theme' ? 'selected' : ''}>Créer comme nouveau thème</option></optgroup>`;
      html += `<option value="ignorer" ${choix === 'ignorer' ? 'selected' : ''}>Ignorer (ne pas rattacher)</option>`;
      return html;
    };

    zone.innerHTML = `
      <div class="carte">
        <h2>③ Aperçu avant import</h2>
        <p>${resume(ca, 'argument')}<br>${resume(cc, 'flashcard')}</p>
        ${a.avertissementsGlobaux.map((m) => `<p class="petit" style="color:var(--attention)">ℹ️ ${U.esc(m)}</p>`).join('')}
        ${cc.total ? '<p class="muet petit">Les flashcards importées seront révisables dès l\'étape 3 (répétition espacée).</p>' : ''}
      </div>

      ${a.inconnus.length ? `
        <div class="carte" style="border-color:var(--attention)">
          <h2>📌 Chapitres inconnus</h2>
          <p class="muet petit">Ces noms ne correspondent à aucun de tes chapitres. Choisis quoi en faire (une proposition est déjà faite).</p>
          ${a.inconnus.map(([cle, nom]) => `
            <div class="ligne-champs" style="grid-template-columns: 1fr 1.4fr; align-items:center; margin-bottom:8px">
              <strong>« ${U.esc(nom)} »</strong>
              <select data-decision="${U.esc(cle)}">${optionsDecision(cle)}</select>
            </div>`).join('')}
        </div>` : ''}

      ${a.args.length ? this.htmlSection('arguments', 'Arguments', a.args) : ''}
      ${a.cartes.length ? this.htmlSection('flashcards', 'Flashcards', a.cartes) : ''}

      <div class="carte" style="position:sticky; bottom:12px; box-shadow:var(--ombre)">
        <div class="barre-actions" style="justify-content:space-between">
          <span data-nb-selection></span>
          <button class="btn btn-principal" data-importer>📥 Importer la sélection</button>
        </div>
      </div>
    `;

    zone.querySelectorAll('[data-decision]').forEach((s) => s.addEventListener('change', () => { this.correspondances[s.dataset.decision] = s.value; }));
    zone.querySelectorAll('[data-coche]').forEach((c) => c.addEventListener('change', () => {
      const [type, i] = c.dataset.coche.split(':');
      (type === 'argument' ? a.args : a.cartes)[Number(i)].coche = c.checked;
      this.majSelection(zone);
    }));
    zone.querySelectorAll('[data-tout]').forEach((b) => b.addEventListener('click', () => {
      const [section, valeur] = b.dataset.tout.split(':');
      const liste = section === 'arguments' ? a.args : a.cartes;
      liste.forEach((x) => { if (!x.erreurs.length) x.coche = valeur === '1'; });
      this.dessinerResultat(el);
    }));
    zone.querySelector('[data-importer]').addEventListener('click', () => this.importer(el));
    this.majSelection(zone);
  },

  majSelection(zone) {
    const a = this.analyse;
    const nbA = a.args.filter((x) => x.coche).length;
    const nbC = a.cartes.filter((x) => x.coche).length;
    zone.querySelector('[data-nb-selection]').textContent = `Sélection : ${U.pluriel(nbA, 'argument')}, ${U.pluriel(nbC, 'flashcard')}`;
    zone.querySelector('[data-importer]').disabled = nbA + nbC === 0;
  },

  htmlSection(cle, titre, liste) {
    return `
      <div class="carte">
        <div class="entete-vue" style="margin-bottom:10px">
          <h2 style="margin:0">${titre}</h2>
          <div class="barre-actions">
            <button class="btn btn-petit" data-tout="${cle}:1">Tout cocher</button>
            <button class="btn btn-petit" data-tout="${cle}:0">Tout décocher</button>
          </div>
        </div>
        ${liste.map((x) => this.htmlElement(x)).join('')}
      </div>`;
  },

  htmlElement(x) {
    const p = x.propre;
    const statut = x.erreurs.length
      ? '<span class="chip" style="background:rgba(236,107,113,.18); color:var(--danger)">Erreur</span>'
      : x.doublon
        ? '<span class="chip chip-demo">Doublon possible</span>'
        : '<span class="chip" style="background:rgba(92,201,138,.16); color:var(--succes)">Prêt</span>';
    const chips = [
      ...x.rattachements.map((id) => Stockage.rattachement(id)).filter(Boolean).map((r) => `<span class="chip chip-theme">${U.esc(r.nom)}</span>`),
      ...x.chapitresInconnus.map((n) => `<span class="chip chip-demo" title="Chapitre inconnu : voir le cadre « Chapitres inconnus »">${U.esc(n)} ?</span>`),
    ].join('');
    const bordure = x.erreurs.length ? 'var(--danger)' : x.doublon ? 'var(--attention)' : 'var(--bordure)';
    const titre = x.type === 'argument' ? p.idee : p.recto;
    const detail = x.type === 'argument' ? `
        ${p.explication ? `<div class="texte-riche">${U.md(p.explication)}</div>` : ''}
        ${p.exemples.map((e) => `<div class="exemple-chiffre">${U.esc(e.mesure)} : <span class="valeur">${U.esc(e.chiffre)}</span> <span class="muet petit">(${[e.date, e.source].filter(Boolean).map(U.esc).join(', ')})</span></div>`).join('')}
        ${p.citations.map((c) => `<blockquote class="citation">« ${U.esc(c.texte)} »<footer>${U.esc(c.auteur)}${c.contexte ? ', ' + U.esc(c.contexte) : ''}</footer></blockquote>`).join('')}
        ${p.dates.length ? `<p class="petit">${p.dates.map((d) => `<strong>${U.esc(d.date)}</strong> : ${U.esc(d.libelle)}`).join(' · ')}</p>` : ''}
        ${p.pays.length ? `<div>${p.pays.map((n) => `<span class="chip chip-pays">${U.esc(n)}</span>`).join('')}</div>` : ''}
        ${p.motsCles.length ? `<div>${p.motsCles.map((n) => `<span class="chip">${U.esc(n)}</span>`).join('')}</div>` : ''}`
      : `<p><strong>Verso :</strong> ${U.esc(p.verso)}</p>`;

    return `
      <div class="carte" style="background:var(--surface-2); border-color:${bordure}; padding:12px 14px; margin-bottom:10px">
        <label style="display:flex; gap:10px; align-items:flex-start; font-weight:normal; cursor:${x.erreurs.length ? 'default' : 'pointer'}; margin:0">
          <input type="checkbox" data-coche="${x.type}:${x.index}" ${x.coche ? 'checked' : ''} ${x.erreurs.length ? 'disabled' : ''} style="margin-top:5px">
          <span style="flex:1">
            ${statut} <strong>${x.index + 1}. ${U.esc(titre || '(vide)')}</strong>
            <div>${chips}</div>
            ${x.type === 'argument' ? `<div class="muet petit">${U.pluriel(p.exemples.length, 'exemple chiffré', 'exemples chiffrés')} · ${U.pluriel(p.citations.length, 'citation')} · ${U.pluriel(p.dates.length, 'date')}</div>` : ''}
          </span>
        </label>
        ${x.erreurs.map((m) => `<div class="petit" style="color:var(--danger)">❌ ${U.esc(m)}</div>`).join('')}
        ${x.doublon ? `<div class="petit" style="color:var(--attention)">⚠️ ${U.esc(x.doublon)} (décoché par défaut, coche-le pour l'importer quand même)</div>` : ''}
        ${x.avertissements.map((m) => `<div class="petit muet">ℹ️ ${U.esc(m)}</div>`).join('')}
        <details style="margin-top:6px"><summary class="petit" style="cursor:pointer; color:var(--accent-2)">Voir le détail</summary><div style="margin-top:8px">${detail}</div></details>
      </div>`;
  },

  /* =====================================================
     Import
     ===================================================== */
  importer(el) {
    const a = this.analyse;
    const choisisA = a.args.filter((x) => x.coche && !x.erreurs.length);
    const choisisC = a.cartes.filter((x) => x.coche && !x.erreurs.length);
    if (!choisisA.length && !choisisC.length) return;

    // Chapitres inconnus réellement utilisés par la sélection
    const utilises = new Set([...choisisA, ...choisisC].flatMap((x) => x.chapitresInconnus.map((n) => U.norm(n))));
    const maintenant = new Date().toISOString();
    const bilan = { args: 0, cartes: 0, chapitres: 0, themes: 0, acteurs: 0 };

    Stockage.modifier((d) => {
      // 1. Applique les décisions sur les chapitres inconnus
      const idPourNom = {};
      for (const [cle, nom] of a.inconnus) {
        if (!utilises.has(cle)) continue;
        const choix = this.correspondances[cle] || 'ignorer';
        if (choix.startsWith('existant:')) idPourNom[cle] = choix.slice(9);
        else if (choix.startsWith('creer:')) {
          const theme = d.themes.find((t) => t.id === choix.slice(6));
          const id = U.uid();
          theme.chapitres.push({ id, nom });
          idPourNom[cle] = id;
          bilan.chapitres++;
        } else if (choix === 'nouveau-theme') {
          const id = U.uid();
          d.themes.push({ id, nom, chapitres: [] });
          idPourNom[cle] = id;
          bilan.themes++;
        }
      }
      const rattachements = (x) => [...new Set([...x.rattachements, ...x.chapitresInconnus.map((n) => idPourNom[U.norm(n)]).filter(Boolean)])];

      // 2. Arguments
      for (const x of choisisA) {
        d.arguments.push({ id: U.uid(), ...x.propre, rattachements: rattachements(x), source: 'import', creeLe: maintenant, modifieLe: maintenant });
        for (const nom of x.paysNouveaux) {
          if (!d.paysPerso.some((p) => U.norm(p.nom) === U.norm(nom))) { d.paysPerso.push({ nom }); bilan.acteurs++; }
        }
        bilan.args++;
      }
      // 3. Flashcards
      for (const x of choisisC) {
        d.flashcards.push({ id: U.uid(), recto: x.propre.recto, verso: x.propre.verso, rattachement: rattachements(x)[0] || null, argumentId: null, source: 'import', ...(x.propre.type ? { type: x.propre.type } : {}), creeLe: maintenant, modifieLe: maintenant });
        bilan.cartes++;
      }
    });

    this.analyse = null;
    this.texte = '';
    this.correspondances = {};
    App.rafraichir();
    const zone = document.querySelector('[data-resultat]');
    zone.innerHTML = `
      <div class="carte" style="border-color:var(--succes)">
        <h2>✅ Import terminé</h2>
        <p>${U.pluriel(bilan.args, 'argument importé', 'arguments importés')}, ${U.pluriel(bilan.cartes, 'flashcard importée', 'flashcards importées')}${bilan.chapitres ? `, ${U.pluriel(bilan.chapitres, 'chapitre créé', 'chapitres créés')}` : ''}${bilan.themes ? `, ${U.pluriel(bilan.themes, 'thème créé', 'thèmes créés')}` : ''}${bilan.acteurs ? `, ${U.pluriel(bilan.acteurs, 'acteur personnalisé ajouté', 'acteurs personnalisés ajoutés')}` : ''}.</p>
        <div class="barre-actions">
          <a class="btn btn-principal" href="#/arguments">Voir mes arguments</a>
        </div>
      </div>`;
    zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Import terminé.');
  },
};
