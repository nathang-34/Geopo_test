/* =========================================================
   arguments.js : page « Banque d'arguments »
   Liste filtrable, fiche détaillée, formulaire de création /
   modification, suppression, duplication.
   ========================================================= */

Vues.arguments = {
  // Filtres gardés en mémoire tant que la page du site reste ouverte
  filtres: { theme: '', pays: '', motCle: '', texte: '', tri: 'recent', demo: '' },

  rendre(el, params = {}, opts = {}) {
    if (!opts.rafraichissement && params.filtre !== undefined) this.filtres.theme = params.filtre;
    if (!opts.rafraichissement && params.pays !== undefined) this.filtres.pays = params.pays;
    if (!opts.rafraichissement && params.motCle !== undefined) this.filtres.motCle = params.motCle;
    const f = this.filtres;
    const args = Stockage.donnees.arguments;

    // Listes pour les filtres (seulement les valeurs réellement utilisées)
    const paysUtilises = [...new Set(args.flatMap((a) => a.pays))].sort((a, b) => a.localeCompare(b, 'fr'));
    const motsUtilises = [...new Set(args.flatMap((a) => a.motsCles))].sort((a, b) => a.localeCompare(b, 'fr'));

    el.innerHTML = `
      <div class="entete-vue">
        <h1>📚 Banque d'arguments</h1>
        <button class="btn btn-principal" data-nouvel>➕ Nouvel argument</button>
      </div>
      <div class="mise-en-page-filtres">
        <aside class="filtres carte">
          <div class="champ">
            <label>Recherche</label>
            <input type="search" data-f="texte" placeholder="Mot, auteur, chiffre..." value="${U.esc(f.texte)}">
          </div>
          <div class="champ">
            <label>Thème / chapitre</label>
            <select data-f="theme">${optionsFiltreThemes(f.theme)}</select>
          </div>
          <div class="champ">
            <label>Pays / acteur</label>
            <select data-f="pays">
              <option value="">Tous</option>
              ${paysUtilises.map((p) => `<option ${p === f.pays ? 'selected' : ''}>${U.esc(p)}</option>`).join('')}
            </select>
          </div>
          <div class="champ">
            <label>Mot-clé</label>
            <select data-f="motCle">
              <option value="">Tous</option>
              ${motsUtilises.map((m) => `<option ${m === f.motCle ? 'selected' : ''}>${U.esc(m)}</option>`).join('')}
            </select>
          </div>
          <div class="champ">
            <label>Origine</label>
            <select data-f="demo">
              <option value="">Tous</option>
              <option value="perso" ${f.demo === 'perso' ? 'selected' : ''}>Mes arguments</option>
              <option value="demo" ${f.demo === 'demo' ? 'selected' : ''}>Démo uniquement</option>
            </select>
          </div>
          <div class="champ">
            <label>Trier par</label>
            <select data-f="tri">
              <option value="recent" ${f.tri === 'recent' ? 'selected' : ''}>Derniers modifiés</option>
              <option value="alpha" ${f.tri === 'alpha' ? 'selected' : ''}>Ordre alphabétique</option>
              <option value="programme" ${f.tri === 'programme' ? 'selected' : ''}>Ordre du programme</option>
            </select>
          </div>
          <button class="btn btn-discret btn-bloc btn-petit" data-reinit>Effacer les filtres</button>
        </aside>
        <section>
          <div class="muet petit" data-compte style="margin-bottom:10px"></div>
          <div data-liste></div>
        </section>
      </div>
    `;

    el.querySelector('[data-nouvel]').addEventListener('click', () => this.ouvrirFormulaire(null));
    el.querySelectorAll('[data-f]').forEach((champ) => {
      champ.addEventListener(champ.tagName === 'INPUT' ? 'input' : 'change', () => {
        this.filtres[champ.dataset.f] = champ.value;
        this.dessinerListe(el);
      });
    });
    el.querySelector('[data-reinit]').addEventListener('click', () => {
      this.filtres = { theme: '', pays: '', motCle: '', texte: '', tri: 'recent', demo: '' };
      App.aller('arguments');
    });
    el.querySelector('[data-liste]').addEventListener('click', (e) => {
      const carte = e.target.closest('[data-id]');
      if (carte) this.ouvrirFiche(carte.dataset.id);
    });
    this.dessinerListe(el);
  },

  /** Applique les filtres */
  filtrer() {
    const f = this.filtres;
    let liste = Stockage.donnees.arguments.slice();
    if (f.theme === '__aucun') {
      liste = liste.filter((a) => !a.rattachements.some((r) => Stockage.rattachement(r)));
    } else if (f.theme) {
      const ids = new Set(Stockage.argumentsDe(f.theme).map((a) => a.id));
      liste = liste.filter((a) => ids.has(a.id));
    }
    if (f.pays) liste = liste.filter((a) => a.pays.includes(f.pays));
    if (f.motCle) liste = liste.filter((a) => a.motsCles.includes(f.motCle));
    if (f.demo === 'demo') liste = liste.filter((a) => a.demo);
    if (f.demo === 'perso') liste = liste.filter((a) => !a.demo);
    if (f.texte.trim()) {
      const mots = U.norm(f.texte).split(' ');
      liste = liste.filter((a) => {
        const t = this.texteRecherche(a);
        return mots.every((m) => t.includes(m));
      });
    }
    if (f.tri === 'alpha') liste.sort((a, b) => a.idee.localeCompare(b.idee, 'fr'));
    else if (f.tri === 'programme') {
      const ordre = {};
      let n = 0;
      for (const t of Stockage.donnees.themes) { ordre[t.id] = n++; for (const c of t.chapitres) ordre[c.id] = n++; }
      const rang = (a) => Math.min(9999, ...a.rattachements.map((r) => ordre[r] ?? 9999));
      liste.sort((a, b) => rang(a) - rang(b));
    } else liste.sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
    return liste;
  },

  /** Tout le texte d'un argument, sans accents, pour la recherche */
  texteRecherche(a) {
    return U.norm([
      a.idee, a.explication,
      ...a.exemples.flatMap((x) => [x.mesure, x.chiffre, x.date, x.source]),
      ...a.citations.flatMap((c) => [c.texte, c.auteur, c.contexte]),
      ...a.motsCles, ...a.pays,
      ...a.dates.flatMap((d) => [d.date, d.libelle]),
    ].join(' '));
  },

  dessinerListe(el) {
    const liste = this.filtrer();
    const total = Stockage.donnees.arguments.length;
    el.querySelector('[data-compte]').textContent = liste.length === total
      ? U.pluriel(total, 'argument')
      : `${liste.length} sur ${U.pluriel(total, 'argument')}`;
    const zone = el.querySelector('[data-liste]');
    if (!liste.length) {
      zone.innerHTML = `<div class="carte vide">${total ? 'Aucun argument ne correspond à ces filtres.' : 'Ta banque est vide. Clique sur « Nouvel argument » pour commencer.'}</div>`;
      return;
    }
    zone.innerHTML = liste.map((a) => `
      <div class="carte carte-cliquable argument-resume" data-id="${a.id}">
        <h3>${a.demo ? '<span class="chip chip-demo">Démo</span> ' : ''}${U.esc(a.idee)}</h3>
        <div>${this.htmlChipsRattachements(a)}</div>
        <div class="meta">
          ${U.pluriel(a.exemples.length, 'exemple chiffré', 'exemples chiffrés')} · ${U.pluriel(a.citations.length, 'citation')}
          ${a.pays.length ? ' · ' + U.esc(a.pays.slice(0, 4).join(', ')) + (a.pays.length > 4 ? '…' : '') : ''}
        </div>
      </div>`).join('');
  },

  htmlChipsRattachements(a) {
    return a.rattachements.map((id) => Stockage.rattachement(id)).filter(Boolean)
      .map((r) => `<span class="chip chip-theme" title="${U.esc(r.theme.nom)}">${U.esc(r.nom)}</span>`).join('')
      || '<span class="chip">Non classé</span>';
  },

  /* ---------------- Fiche détaillée ---------------- */

  ouvrirFiche(id) {
    const a = Stockage.donnees.arguments.find((x) => x.id === id);
    if (!a) return;
    const m = Modal.ouvrir({
      titre: a.demo ? "Argument (démonstration)" : 'Argument',
      large: true,
      contenu: `
        <div class="fiche">
          <h2>${U.esc(a.idee)}</h2>
          <div>${this.htmlChipsRattachements(a)}</div>

          ${a.explication ? `<section><h3>Explication</h3><div class="texte-riche">${U.md(a.explication)}</div></section>` : ''}

          ${a.exemples.length ? `<section><h3>Exemples chiffrés</h3>
            ${a.exemples.map((x) => `<div class="exemple-chiffre">
              ${U.esc(x.mesure)} : <span class="valeur">${U.esc(x.chiffre)}</span>
              ${x.date || x.source ? `<span class="muet petit"> (${[x.date, x.source].filter(Boolean).map(U.esc).join(', ')})</span>` : ''}
            </div>`).join('')}</section>` : ''}

          ${a.citations.length ? `<section><h3>Citations</h3>
            ${a.citations.map((c) => `<blockquote class="citation">« ${U.esc(c.texte)} »
              <footer>${U.esc(c.auteur)}${c.contexte ? ', ' + U.esc(c.contexte) : ''}</footer></blockquote>`).join('')}</section>` : ''}

          ${a.dates.length ? `<section><h3>Dates importantes</h3>
            ${a.dates.map((d) => `<div><strong>${U.esc(d.date)}</strong> : ${U.esc(d.libelle)}</div>`).join('')}</section>` : ''}

          ${a.pays.length ? `<section><h3>Pays et acteurs</h3>
            ${a.pays.map((p) => {
              const e = Pays.trouver(p);
              const periode = e && e.type === 'historique' ? Pays.periode(e) : '';
              return `<a href="#/arguments?pays=${encodeURIComponent(p)}" class="chip chip-pays" style="text-decoration:none" title="Voir tous les arguments sur ${U.esc(p)}">${U.esc(p)}${periode ? ' (' + periode + ')' : ''}</a>`;
            }).join('')}</section>` : ''}

          ${a.motsCles.length ? `<section><h3>Mots-clés</h3>
            ${a.motsCles.map((k) => `<a href="#/arguments?motCle=${encodeURIComponent(k)}" class="chip" style="text-decoration:none">${U.esc(k)}</a>`).join('')}</section>` : ''}

          <p class="muet petit" style="margin-top:18px">Créé le ${U.dateLisible(a.creeLe)}${a.modifieLe !== a.creeLe ? ' · modifié le ' + U.dateLisible(a.modifieLe) : ''}</p>
        </div>
        <div class="modal-pied">
          <button class="btn btn-danger" data-suppr>Supprimer</button>
          <button class="btn" data-dupliquer>Dupliquer</button>
          <button class="btn" data-generer>🃏 Générer des flashcards</button>
          <button class="btn btn-principal" data-modifier>Modifier</button>
        </div>`,
    });
    const nbCartes = Stockage.donnees.flashcards.filter((c) => c.argumentId === a.id).length;
    if (nbCartes) {
      m.corps.querySelector('.fiche').insertAdjacentHTML('beforeend',
        `<p class="petit"><a href="#/flashcards?argument=${a.id}">🃏 ${U.pluriel(nbCartes, 'flashcard liée', 'flashcards liées')} à cet argument</a></p>`);
    }
    m.corps.querySelector('[data-generer]').addEventListener('click', () => { m.fermer(true); Flashcards.ouvrirGeneration(a); });
    m.corps.querySelector('[data-modifier]').addEventListener('click', () => { m.fermer(true); this.ouvrirFormulaire(a); });
    m.corps.querySelector('[data-dupliquer]').addEventListener('click', () => { m.fermer(true); this.ouvrirFormulaire(a, { copie: true }); });
    m.corps.querySelector('[data-suppr]').addEventListener('click', async () => {
      if (await this.supprimer(a)) m.fermer(true);
    });
  },

  async supprimer(a) {
    const nbCartes = Stockage.donnees.flashcards.filter((c) => c.argumentId === a.id).length;
    const ok = await confirmer(`<p>Supprimer définitivement cet argument ?</p><p class="muet">« ${U.esc(a.idee)} »</p>
      ${nbCartes ? `<p>Les <strong>${U.pluriel(nbCartes, 'flashcard générée', 'flashcards générées')}</strong> à partir de cet argument seront aussi supprimées.</p>` : ''}`,
      { titre: 'Supprimer un argument', texteOk: 'Supprimer', danger: true });
    if (!ok) return false;
    Stockage.modifier((d) => {
      d.arguments = d.arguments.filter((x) => x.id !== a.id);
      d.flashcards = d.flashcards.filter((c) => c.argumentId !== a.id);
    });
    toast('Argument supprimé.');
    App.rafraichir();
    return true;
  },

  /* ---------------- Formulaire ---------------- */

  /**
   * Ouvre le formulaire.
   * arg = null : nouvel argument ; sinon modification (ou copie si opts.copie)
   */
  ouvrirFormulaire(arg, opts = {}) {
    const nouveau = !arg || opts.copie;
    const a = arg ? U.copie(arg) : {
      idee: '', explication: '', exemples: [], citations: [], dates: [], motsCles: [], pays: [],
      // Pré-sélectionne le chapitre filtré dans la liste, c'est souvent celui sur lequel on travaille
      rattachements: this.filtres.theme && this.filtres.theme !== '__aucun' ? [this.filtres.theme] : [],
    };
    if (opts.copie) a.idee = a.idee + ' (copie)';

    let instantane = null; // état initial, pour détecter les modifications non enregistrées
    const m = Modal.ouvrir({
      titre: opts.copie ? 'Dupliquer un argument' : (nouveau ? 'Nouvel argument' : "Modifier l'argument"),
      large: true,
      contenu: `
        <form data-form novalidate>
          <div class="champ">
            <label>Idée principale <span class="aide">(une phrase, obligatoire)</span></label>
            <input type="text" name="idee" value="${U.esc(a.idee)}" placeholder="Ex : En 1945, l'Europe est ruinée et le monde devient bipolaire.">
          </div>
          <div class="champ">
            <label>Explication développée <span class="aide">(**gras**, *italique*, lignes commençant par « - » pour une liste)</span></label>
            <textarea name="explication" rows="6">${U.esc(a.explication)}</textarea>
          </div>

          <div class="groupe-repetable">
            <div class="titre-groupe"><label>Exemples chiffrés</label><button type="button" class="btn btn-petit" data-ajout="exemple">➕ Ajouter un exemple</button></div>
            <div class="aide" style="margin-bottom:6px">Ce qui est mesuré · chiffre · date · source</div>
            <div data-liste="exemple"></div>
          </div>

          <div class="groupe-repetable">
            <div class="titre-groupe"><label>Citations</label><button type="button" class="btn btn-petit" data-ajout="citation">➕ Ajouter une citation</button></div>
            <div class="aide" style="margin-bottom:6px">Citation · auteur · ouvrage ou contexte</div>
            <div data-liste="citation"></div>
          </div>

          <div class="champ">
            <label>Thèmes / chapitres <span class="aide">(un argument peut en avoir plusieurs)</span></label>
            <div data-rattachements></div>
          </div>

          <div class="champ">
            <label>Mots-clés</label>
            <div data-mots></div>
          </div>

          <div class="champ">
            <label>Pays, empires, organisations <span class="aide">(facultatif, sert pour la future carte du monde)</span></label>
            <div data-pays></div>
          </div>

          <div class="groupe-repetable">
            <div class="titre-groupe"><label>Dates importantes <span class="aide">(facultatif, pour la future frise)</span></label><button type="button" class="btn btn-petit" data-ajout="date">➕ Ajouter une date</button></div>
            <div class="aide" style="margin-bottom:6px">Date (« 1949 » ou « 1er octobre 1949 ») · ce qui s'est passé</div>
            <div data-liste="date"></div>
          </div>

          <div class="modal-pied">
            <button type="button" class="btn" data-annuler>Annuler</button>
            <button type="submit" class="btn btn-principal">${nouveau ? "Créer l'argument" : 'Enregistrer'}</button>
          </div>
        </form>`,
      avantFermeture: async () => {
        if (JSON.stringify(lire(false)) === instantane) return true;
        return confirmer('Tu as des modifications non enregistrées. Fermer quand même ?', { texteOk: 'Fermer sans enregistrer', danger: true });
      },
    });

    const form = m.corps.querySelector('[data-form]');

    // --- Lignes répétables (exemples, citations, dates) ---
    const modeles = {
      exemple: (x = {}) => `
        <input type="text" data-c="mesure" placeholder="Ce qui est mesuré" value="${U.esc(x.mesure)}">
        <input type="text" data-c="chiffre" placeholder="Chiffre" value="${U.esc(x.chiffre)}">
        <input type="text" data-c="date" placeholder="Date" value="${U.esc(x.date)}">
        <input type="text" data-c="source" placeholder="Source" value="${U.esc(x.source)}">`,
      citation: (x = {}) => `
        <textarea data-c="texte" placeholder="Citation (sans les guillemets)">${U.esc(x.texte)}</textarea>
        <input type="text" data-c="auteur" placeholder="Auteur" value="${U.esc(x.auteur)}">
        <input type="text" data-c="contexte" placeholder="Ouvrage ou contexte, date" value="${U.esc(x.contexte)}">`,
      date: (x = {}) => `
        <input type="text" data-c="date" placeholder="Date" value="${U.esc(x.date)}">
        <input type="text" data-c="libelle" placeholder="Événement" value="${U.esc(x.libelle)}">`,
    };
    const ajouterLigne = (type, valeurs, focus = false) => {
      const ligne = U.html(`<div class="element-repetable ${type}">${modeles[type](valeurs)}<button type="button" class="btn btn-discret btn-icone" title="Retirer">✕</button></div>`);
      ligne.querySelector('button').addEventListener('click', () => ligne.remove());
      form.querySelector(`[data-liste="${type}"]`).appendChild(ligne);
      if (focus) ligne.querySelector('input, textarea').focus();
    };
    a.exemples.forEach((x) => ajouterLigne('exemple', x));
    a.citations.forEach((x) => ajouterLigne('citation', x));
    a.dates.forEach((x) => ajouterLigne('date', x));
    form.querySelectorAll('[data-ajout]').forEach((b) => b.addEventListener('click', () => ajouterLigne(b.dataset.ajout, {}, true)));

    // --- Champs spéciaux ---
    const arbre = ArbreRattachements(form.querySelector('[data-rattachements]'), a.rattachements);
    const champMots = ChampMotsCles(form.querySelector('[data-mots]'), a.motsCles);
    const idsPourSuggestions = () => {
      // Chapitres cochés + chapitres des thèmes cochés
      const ids = new Set(arbre.valeurs());
      for (const t of Stockage.donnees.themes) if (ids.has(t.id)) t.chapitres.forEach((c) => ids.add(c.id));
      return [...ids];
    };
    const champPays = ChampPays(form.querySelector('[data-pays]'), a.pays, idsPourSuggestions);

    /** Lit le formulaire. finaliser = true : intègre aussi le texte tapé dans les champs à étiquettes */
    function lire(finaliser = true) {
      const lignes = (type, champs) => [...form.querySelectorAll(`[data-liste="${type}"] .element-repetable`)].map((l) => {
        const o = {};
        for (const c of champs) o[c] = l.querySelector(`[data-c="${c}"]`).value.trim();
        return o;
      }).filter((o) => Object.values(o).some(Boolean));
      return {
        idee: form.idee.value.trim(),
        explication: form.explication.value.trim(),
        exemples: lignes('exemple', ['mesure', 'chiffre', 'date', 'source']),
        citations: lignes('citation', ['texte', 'auteur', 'contexte']),
        dates: lignes('date', ['date', 'libelle']),
        rattachements: arbre.valeurs(),
        motsCles: finaliser ? champMots.valeurs() : null,
        pays: finaliser ? champPays.valeurs() : null,
      };
    }
    instantane = JSON.stringify(lire(false));

    form.querySelector('[data-annuler]').addEventListener('click', () => m.fermer());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = lire(true);
      // Vérifications
      const erreur = (msg, champ) => { toast(msg, 'erreur'); if (champ) champ.focus(); };
      if (!v.idee) return erreur("L'idée principale est obligatoire.", form.idee);
      const exIncomplet = v.exemples.findIndex((x) => !x.mesure || !x.chiffre);
      if (exIncomplet >= 0) return erreur(`Exemple n°${exIncomplet + 1} : indique au moins ce qui est mesuré et le chiffre.`);
      const citIncomplete = v.citations.findIndex((c) => !c.texte || !c.auteur);
      if (citIncomplete >= 0) return erreur(`Citation n°${citIncomplete + 1} : indique au moins la citation et son auteur.`);
      const dateIncomplete = v.dates.findIndex((d) => !d.date || !d.libelle);
      if (dateIncomplete >= 0) return erreur(`Date n°${dateIncomplete + 1} : indique la date et l'événement.`);
      v.citations.forEach((c) => { c.texte = c.texte.replace(/^[«"“\s]+|[»"”\s]+$/g, ''); });

      const maintenant = new Date().toISOString();
      let id;
      Stockage.modifier((d) => {
        if (nouveau) {
          id = U.uid();
          d.arguments.push({ id, ...v, creeLe: maintenant, modifieLe: maintenant });
        } else {
          id = arg.id;
          const i = d.arguments.findIndex((x) => x.id === id);
          d.arguments[i] = { ...d.arguments[i], ...v, modifieLe: maintenant };
        }
      });
      m.fermer(true);
      toast(nouveau ? 'Argument créé.' : 'Argument enregistré.');
      App.rafraichir();
      this.ouvrirFiche(id);
    });
  },
};
