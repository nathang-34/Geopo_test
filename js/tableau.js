/* =========================================================
   tableau.js : page « Tableau de bord »
   ========================================================= */

Vues.tableau = {
  rendre(el) {
    const d = Stockage.donnees;
    const jour = Revision.jour();
    const file = Flashcards.fileDuJour('');
    const aReviser = file.dues.length + file.nouvelles.length;
    const { serie, aujourdhuiFait } = Stats.serie();
    const maitrisees = d.flashcards.filter((c) => Revision.estMaitrisee(c)).length;
    const r30 = Stats.reussite(30);

    el.innerHTML = `
      <div class="entete-vue">
        <h1>📊 Tableau de bord</h1>
        <div class="barre-actions">
          <button class="btn" data-nouvel>➕ Nouvel argument</button>
          <a class="btn btn-principal" href="#/reviser">🔁 Réviser${aReviser ? ` (${aReviser})` : ''}</a>
        </div>
      </div>

      ${Stockage.aDeLaDemo() ? `
        <div class="bandeau info">
          <span>👋 Le site contient des <strong>exemples de démonstration</strong> (étiquette « Démo ») pour te montrer à quoi il ressemble rempli. Ton thème et tes chapitres, eux, restent en place.</span>
          <button class="btn btn-petit" data-suppr-demo>Supprimer la démo</button>
        </div>` : ''}

      <div class="grille-stats">
        <div class="stat"><div class="stat-valeur">${aReviser}</div><div class="stat-libelle">cartes à réviser aujourd'hui${file.nouvelles.length ? ` (dont ${file.nouvelles.length} nouvelles)` : ''}</div></div>
        <div class="stat"><div class="stat-valeur">${serie} 🔥</div><div class="stat-libelle">jour${serie > 1 ? 's' : ''} de suite${serie && !aujourdhuiFait ? ' · révise aujourd\'hui pour continuer' : ''}</div></div>
        <div class="stat"><div class="stat-valeur">${maitrisees} <span class="muet" style="font-size:1rem">/ ${d.flashcards.length}</span></div><div class="stat-libelle">cartes maîtrisées</div></div>
        <div class="stat"><div class="stat-valeur">${r30.taux === null ? '–' : Math.round(r30.taux * 100) + ' %'}</div><div class="stat-libelle">de réussite sur 30 jours</div></div>
      </div>

      ${this.htmlHistogramme()}
      ${this.htmlParTheme()}
      ${this.htmlSessions()}
      ${this.htmlContenu()}
    `;

    el.querySelector('[data-nouvel]').addEventListener('click', () => Vues.arguments.ouvrirFormulaire(null));
    const btnDemo = el.querySelector('[data-suppr-demo]');
    if (btnDemo) btnDemo.addEventListener('click', () => Vues.sauvegarde.demanderSuppressionDemo());
  },

  /** Révisions des 30 derniers jours (une colonne par jour) */
  htmlHistogramme() {
    const jours = Stats.derniersJours(30);
    const max = Math.max(1, ...jours.map((j) => j.revues));
    const total = jours.reduce((s, j) => s + j.revues, 0);
    const date = (j) => new Date(j + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return `
      <div class="carte">
        <h2>Cartes révisées par jour <span class="muet petit">(30 derniers jours · ${total} au total)</span></h2>
        ${total ? `
          <div class="histogramme" role="img" aria-label="Nombre de cartes révisées chaque jour sur 30 jours">
            ${jours.map((j) => `<div class="colonne ${j.revues ? '' : 'vide'}" title="${date(j.jour)} : ${U.pluriel(j.revues, 'carte')}${j.revues ? `, ${Math.round((j.reussies / j.revues) * 100)} % de réussite` : ''}"><div style="height:${(j.revues / max) * 100}%"></div></div>`).join('')}
          </div>
          <div class="axe-histogramme"><span>${date(jours[0].jour)}</span><span>max ${max} / jour</span><span>aujourd'hui</span></div>
          <details style="margin-top:8px"><summary class="petit" style="cursor:pointer; color:var(--accent-2)">Voir en tableau</summary>
            <table class="tableau-simple" style="margin-top:6px"><tr><th>Jour</th><th>Cartes</th><th>Réussite</th><th>Nouvelles</th></tr>
              ${jours.filter((j) => j.revues).reverse().map((j) => `<tr><td>${date(j.jour)}</td><td>${j.revues}</td><td>${Math.round((j.reussies / j.revues) * 100)} %</td><td>${j.nouvelles}</td></tr>`).join('')}
            </table>
          </details>`
        : '<p class="muet">Aucune révision pour l\'instant. Lance ta première séance depuis « Réviser » !</p>'}
      </div>`;
  },

  /** Cartes, maîtrise et réussite par thème */
  htmlParTheme() {
    const d = Stockage.donnees;
    const reussite = Stats.reussiteParTheme(30);
    const lignes = d.themes.map((t) => ({ id: t.id, nom: t.nom }));
    if (d.flashcards.some((c) => Stats.themeDe(c) === '__aucun')) lignes.push({ id: '__aucun', nom: 'Non classées' });
    const barre = (v, couleur) => `<div class="barre-fond" style="min-width:80px"><div class="barre-rempli" style="width:${Math.round(v * 100)}%; background:${couleur}"></div></div>`;
    const contenu = lignes.map((l) => {
      const cartes = d.flashcards.filter((c) => Stats.themeDe(c) === l.id);
      const m = cartes.filter((c) => Revision.estMaitrisee(c)).length;
      const r = reussite[l.id];
      const taux = r && r.revues ? r.reussies / r.revues : null;
      return `<tr>
          <td><a href="#/flashcards?filtre=${l.id}">${U.esc(l.nom)}</a></td>
          <td>${cartes.length}</td>
          <td><div style="display:flex; gap:8px; align-items:center">${barre(cartes.length ? m / cartes.length : 0, 'var(--succes)')}<span class="petit">${m}</span></div></td>
          <td><div style="display:flex; gap:8px; align-items:center">${taux === null ? '<span class="muet petit">pas encore révisé</span>' : barre(taux, 'var(--accent)') + `<span class="petit">${Math.round(taux * 100)} %</span>`}</div></td>
        </tr>`;
    }).join('');
    return `
      <div class="carte">
        <h2>Par thème</h2>
        ${lignes.length ? `<table class="tableau-simple">
          <tr><th>Thème</th><th>Cartes</th><th>Maîtrisées</th><th>Réussite (30 j)</th></tr>
          ${contenu}
        </table>` : '<p class="muet">Aucun thème.</p>'}
      </div>`;
  },

  /** Dernières séances */
  htmlSessions() {
    const sessions = Stats.donnees().sessions.slice(-8).reverse();
    if (!sessions.length) return '';
    const nomFiltre = (f) => {
      if (!f) return 'Tous les thèmes';
      if (f === '__aucun') return 'Non classées';
      const r = Stockage.rattachement(f);
      return r ? r.nom : '(thème supprimé)';
    };
    return `
      <div class="carte">
        <h2>Dernières séances</h2>
        <table class="tableau-simple">
          <tr><th>Date</th><th>Sélection</th><th>Cartes</th><th>Réussite</th><th>Durée</th></tr>
          ${sessions.map((s) => `<tr>
            <td>${U.dateLisible(s.debut)}</td>
            <td>${U.esc(nomFiltre(s.filtre))}${s.type === 'avance' ? ' <span class="muet petit">(en avance)</span>' : ''}</td>
            <td>${s.revues}</td>
            <td>${Math.round((s.reussies / s.revues) * 100)} %</td>
            <td>${Math.max(1, Math.round((new Date(s.fin) - new Date(s.debut)) / 60000))} min</td>
          </tr>`).join('')}
        </table>
      </div>`;
  },

  /** Contenu de la banque d'arguments */
  htmlContenu() {
    const d = Stockage.donnees;
    const nbChapitres = d.themes.reduce((s, t) => s + t.chapitres.length, 0);
    const nbExemples = d.arguments.reduce((s, a) => s + a.exemples.length, 0);
    const nbCitations = d.arguments.reduce((s, a) => s + a.citations.length, 0);
    const lignes = [];
    for (const t of d.themes) for (const c of t.chapitres) lignes.push({ id: c.id, nom: c.nom, n: Stockage.argumentsDe(c.id).length });
    const max = Math.max(1, ...lignes.map((l) => l.n));
    const nonClasses = d.arguments.filter((a) => !a.rattachements.some((r) => Stockage.rattachement(r))).length;
    return `
      <div class="carte">
        <h2>Ma banque d'arguments</h2>
        <p class="muet">${U.pluriel(d.arguments.length, 'argument')} · ${U.pluriel(nbExemples, 'exemple chiffré', 'exemples chiffrés')} · ${U.pluriel(nbCitations, 'citation')} · ${U.pluriel(d.themes.length, 'thème')} · ${U.pluriel(nbChapitres, 'chapitre')}</p>
        ${lignes.map((l) => `
          <div class="barre-ligne">
            <a href="#/arguments?filtre=${l.id}" title="Voir ces arguments">${U.esc(l.nom)}</a>
            <div class="barre-fond"><div class="barre-rempli" style="width:${(l.n / max) * 100}%"></div></div>
            <span>${l.n}</span>
          </div>`).join('')}
        ${nonClasses ? `<p class="petit muet">${U.pluriel(nonClasses, 'argument non classé', 'arguments non classés')} : <a href="#/arguments?filtre=__aucun">les voir</a></p>` : ''}
      </div>`;
  },
};
