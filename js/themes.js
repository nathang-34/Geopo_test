/* =========================================================
   themes.js : page « Thèmes »
   Ajouter, renommer, supprimer, réordonner les thèmes et
   chapitres, déplacer un chapitre vers un autre thème.
   ========================================================= */

Vues.themes = {
  rendre(el) {
    const themes = Stockage.donnees.themes;

    el.innerHTML = `
      <div class="entete-vue">
        <h1>🗂️ Thèmes et chapitres</h1>
        <button class="btn btn-principal" data-nouveau-theme>➕ Nouveau thème</button>
      </div>
      <p class="muet">Organise ton programme au fil de l'année. Clique sur le nom d'un chapitre pour voir ses arguments. Les flèches ↑ ↓ changent l'ordre.</p>
      ${themes.length ? '' : '<div class="carte vide">Aucun thème. Clique sur « Nouveau thème » pour commencer.</div>'}
      ${themes.map((t, i) => this.htmlTheme(t, i, themes.length)).join('')}
    `;

    el.querySelector('[data-nouveau-theme]').addEventListener('click', () => this.nouveauTheme());

    // Un seul écouteur pour tous les boutons de la page (« délégation d'événements »)
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b) return;
      const { action, theme, chapitre } = b.dataset;
      this.action(action, theme, chapitre, b);
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-deplacer]')) {
        this.deplacerChapitre(e.target.dataset.theme, e.target.dataset.chapitre, e.target.value);
      }
    });
    el.querySelectorAll('form[data-ajout-chapitre]').forEach((f) => {
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const champ = f.querySelector('input');
        const nom = champ.value.trim();
        if (!nom) return;
        Stockage.modifier((d) => {
          d.themes.find((t) => t.id === f.dataset.ajoutChapitre).chapitres.push({ id: U.uid(), nom });
        });
        toast(`Chapitre « ${nom} » ajouté.`);
        App.rafraichir();
        // Remet le curseur dans le champ pour enchaîner les ajouts
        const nouveauChamp = document.querySelector(`form[data-ajout-chapitre="${f.dataset.ajoutChapitre}"] input`);
        if (nouveauChamp) nouveauChamp.focus();
      });
    });
  },

  htmlTheme(t, i, total) {
    const nbArgs = Stockage.argumentsDe(t.id).length;
    const autres = Stockage.donnees.themes.filter((x) => x.id !== t.id);
    return `
      <div class="carte theme-bloc" data-anim-id="${t.id}">
        <div class="theme-entete">
          <div>
            <span class="theme-nom">${U.esc(t.nom)}</span>
            <span class="muet petit"> · ${U.pluriel(t.chapitres.length, 'chapitre')} · <a href="#/arguments?filtre=${t.id}">${U.pluriel(nbArgs, 'argument')}</a></span>
          </div>
          <div class="barre-actions">
            <button class="btn btn-petit btn-icone" data-action="monter-theme" data-theme="${t.id}" ${i === 0 ? 'disabled' : ''} title="Monter">↑</button>
            <button class="btn btn-petit btn-icone" data-action="descendre-theme" data-theme="${t.id}" ${i === total - 1 ? 'disabled' : ''} title="Descendre">↓</button>
            <button class="btn btn-petit" data-action="renommer-theme" data-theme="${t.id}">Renommer</button>
            <button class="btn btn-petit btn-danger" data-action="supprimer-theme" data-theme="${t.id}">Supprimer</button>
          </div>
        </div>
        <ul class="liste-chapitres">
          ${t.chapitres.map((c, j) => `
            <li data-anim-id="${c.id}">
              <span class="nom-chapitre" data-action="voir-chapitre" data-chapitre="${c.id}" title="Voir les arguments de ce chapitre">
                ${U.esc(c.nom)} <span class="muet petit">(${Stockage.argumentsDe(c.id).length})</span>
              </span>
              <span class="barre-actions">
                <button class="btn btn-petit btn-icone" data-action="monter-chapitre" data-theme="${t.id}" data-chapitre="${c.id}" ${j === 0 ? 'disabled' : ''} title="Monter">↑</button>
                <button class="btn btn-petit btn-icone" data-action="descendre-chapitre" data-theme="${t.id}" data-chapitre="${c.id}" ${j === t.chapitres.length - 1 ? 'disabled' : ''} title="Descendre">↓</button>
                ${autres.length ? `<select class="btn-petit" style="width:auto" data-deplacer data-theme="${t.id}" data-chapitre="${c.id}" title="Déplacer vers un autre thème">
                    <option value="">Déplacer vers…</option>
                    ${autres.map((a) => `<option value="${a.id}">${U.esc(a.nom)}</option>`).join('')}
                  </select>` : ''}
                <button class="btn btn-petit" data-action="renommer-chapitre" data-theme="${t.id}" data-chapitre="${c.id}">Renommer</button>
                <button class="btn btn-petit btn-danger btn-icone" data-action="supprimer-chapitre" data-theme="${t.id}" data-chapitre="${c.id}" title="Supprimer">✕</button>
              </span>
            </li>`).join('')}
        </ul>
        <form class="ajout-chapitre" data-ajout-chapitre="${t.id}">
          <input type="text" placeholder="Nom du nouveau chapitre">
          <button class="btn" type="submit">Ajouter le chapitre</button>
        </form>
      </div>`;
  },

  async nouveauTheme() {
    const nom = await demanderTexte('Nouveau thème', { libelle: 'Nom du thème', texteOk: 'Créer' });
    if (!nom) return;
    Stockage.modifier((d) => d.themes.push({ id: U.uid(), nom, chapitres: [] }));
    toast(`Thème « ${nom} » créé. Ajoute-lui des chapitres.`);
    App.rafraichir();
  },

  async action(action, themeId, chapitreId) {
    const d = Stockage.donnees;
    const theme = d.themes.find((t) => t.id === themeId);
    const echanger = (tab, i, j) => { [tab[i], tab[j]] = [tab[j], tab[i]]; };

    switch (action) {
      case 'voir-chapitre':
        App.aller('arguments', { filtre: chapitreId });
        return;

      case 'monter-theme':
      case 'descendre-theme': {
        const i = d.themes.indexOf(theme);
        const j = action === 'monter-theme' ? i - 1 : i + 1;
        if (j < 0 || j >= d.themes.length) return;
        this.animer(() => Stockage.modifier((dd) => echanger(dd.themes, i, j)), themeId, `[data-action="${action}"][data-theme="${themeId}"]`);
        return;
      }

      case 'monter-chapitre':
      case 'descendre-chapitre': {
        const i = theme.chapitres.findIndex((c) => c.id === chapitreId);
        const j = action === 'monter-chapitre' ? i - 1 : i + 1;
        if (j < 0 || j >= theme.chapitres.length) return;
        this.animer(() => Stockage.modifier(() => echanger(theme.chapitres, i, j)), chapitreId, `[data-action="${action}"][data-chapitre="${chapitreId}"]`);
        return;
      }

      case 'renommer-theme': {
        const nom = await demanderTexte('Renommer le thème', { valeur: theme.nom, texteOk: 'Renommer' });
        if (!nom || nom === theme.nom) return;
        Stockage.modifier(() => { theme.nom = nom; });
        toast('Thème renommé.');
        break;
      }

      case 'renommer-chapitre': {
        const ch = theme.chapitres.find((c) => c.id === chapitreId);
        const nom = await demanderTexte('Renommer le chapitre', { valeur: ch.nom, texteOk: 'Renommer' });
        if (!nom || nom === ch.nom) return;
        Stockage.modifier(() => { ch.nom = nom; });
        toast('Chapitre renommé.');
        break;
      }

      case 'supprimer-theme': {
        const nbArgs = Stockage.argumentsDe(theme.id).length;
        const ok = await confirmer(
          `<p>Supprimer le thème <strong>${U.esc(theme.nom)}</strong> et ses ${U.pluriel(theme.chapitres.length, 'chapitre')} ?</p>
           ${nbArgs ? `<p>Les <strong>${U.pluriel(nbArgs, 'argument')}</strong> rattachés ne seront <strong>pas supprimés</strong> : ils perdront juste ce rattachement (ils deviendront « non classés » s'ils n'en ont pas d'autre).</p>` : ''}`,
          { titre: 'Supprimer un thème', texteOk: 'Supprimer', danger: true },
        );
        if (!ok) return;
        const ids = Stockage.idsDuTheme(theme);
        Stockage.modifier((dd) => {
          dd.themes = dd.themes.filter((t) => t.id !== theme.id);
          this.retirerRattachements(dd, ids);
        });
        toast('Thème supprimé.');
        break;
      }

      case 'supprimer-chapitre': {
        const ch = theme.chapitres.find((c) => c.id === chapitreId);
        const nbArgs = Stockage.argumentsDe(ch.id).length;
        const ok = await confirmer(
          `<p>Supprimer le chapitre <strong>${U.esc(ch.nom)}</strong> ?</p>
           ${nbArgs ? `<p>Les <strong>${U.pluriel(nbArgs, 'argument')}</strong> rattachés ne seront <strong>pas supprimés</strong> : ils perdront juste ce rattachement.</p>` : ''}`,
          { titre: 'Supprimer un chapitre', texteOk: 'Supprimer', danger: true },
        );
        if (!ok) return;
        Stockage.modifier((dd) => {
          theme.chapitres = theme.chapitres.filter((c) => c.id !== ch.id);
          this.retirerRattachements(dd, [ch.id]);
        });
        toast('Chapitre supprimé.');
        break;
      }

      default:
        return;
    }
    App.rafraichir();
  },

  /** Retire des identifiants de thème/chapitre de tous les arguments (et flashcards) */
  retirerRattachements(d, ids) {
    for (const a of d.arguments) a.rattachements = a.rattachements.filter((r) => !ids.includes(r));
    for (const f of d.flashcards) if (ids.includes(f.rattachement)) f.rattachement = null;
  },

  deplacerChapitre(depuisId, chapitreId, versId) {
    if (!versId) return;
    this.animer(() => Stockage.modifier((d) => {
      const depuis = d.themes.find((t) => t.id === depuisId);
      const vers = d.themes.find((t) => t.id === versId);
      const i = depuis.chapitres.findIndex((c) => c.id === chapitreId);
      const [ch] = depuis.chapitres.splice(i, 1);
      vers.chapitres.push(ch);
    }), chapitreId);
    toast('Chapitre déplacé.');
  },

  /**
   * Animation de réorganisation (technique « FLIP ») :
   * 1. on note la position de chaque thème / chapitre à l'écran ;
   * 2. on applique la modification et on redessine la page ;
   * 3. chaque élément qui a bougé repart de son ancienne position
   *    et glisse jusqu'à la nouvelle. L'élément déplacé s'illumine.
   */
  animer(modification, idDeplace, selecteurAFocaliser) {
    const avant = {};
    document.querySelectorAll('[data-anim-id]').forEach((e) => { avant[e.dataset.animId] = e.getBoundingClientRect().top; });

    modification();
    App.rafraichir();

    // Remet le focus sur le bouton cliqué, pour pouvoir cliquer plusieurs fois de suite
    if (selecteurAFocaliser) {
      const b = document.querySelector(selecteurAFocaliser);
      if (b && !b.disabled) b.focus();
    }

    // Respecte le réglage « réduire les animations » de Windows
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('[data-anim-id]').forEach((e) => {
      const ancien = avant[e.dataset.animId];
      if (ancien === undefined) return;
      const decalage = ancien - e.getBoundingClientRect().top;
      if (Math.abs(decalage) < 1) return;
      e.animate(
        [{ transform: `translateY(${decalage}px)` }, { transform: 'translateY(0)' }],
        { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    });

    const deplace = document.querySelector(`[data-anim-id="${idDeplace}"]`);
    if (deplace) {
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      deplace.style.position = 'relative';
      deplace.style.zIndex = '2';
      deplace.animate(
        [{ boxShadow: `0 0 0 2px ${accent}` }, { boxShadow: `0 0 0 2px ${accent}`, offset: 0.5 }, { boxShadow: '0 0 0 0 transparent' }],
        { duration: 1000, easing: 'ease-out' },
      );
    }
  },
};
