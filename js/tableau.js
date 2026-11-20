/* =========================================================
   tableau.js : page « Tableau de bord »
   (à l'étape 3, on y ajoutera les statistiques de révision)
   ========================================================= */

Vues.tableau = {
  rendre(el) {
    const d = Stockage.donnees;
    const nbChapitres = d.themes.reduce((s, t) => s + t.chapitres.length, 0);
    const nbExemples = d.arguments.reduce((s, a) => s + a.exemples.length, 0);
    const nbCitations = d.arguments.reduce((s, a) => s + a.citations.length, 0);

    // Nombre d'arguments par chapitre
    const lignes = [];
    for (const t of d.themes) {
      for (const c of t.chapitres) lignes.push({ id: c.id, nom: c.nom, n: Stockage.argumentsDe(c.id).length });
    }
    const max = Math.max(1, ...lignes.map((l) => l.n));
    const nonClasses = d.arguments.filter((a) => !a.rattachements.some((r) => Stockage.rattachement(r))).length;

    el.innerHTML = `
      <div class="entete-vue">
        <h1>📊 Tableau de bord</h1>
        <button class="btn btn-principal" data-nouvel>➕ Nouvel argument</button>
      </div>

      ${Stockage.aDeLaDemo() ? `
        <div class="bandeau info">
          <span>👋 Le site contient des <strong>exemples de démonstration</strong> (étiquette « Démo ») pour te montrer à quoi il ressemble rempli. Ton thème et tes chapitres, eux, restent en place.</span>
          <button class="btn btn-petit" data-suppr-demo>Supprimer la démo</button>
        </div>` : ''}

      <div class="grille-stats">
        <div class="stat"><div class="stat-valeur">${d.arguments.length}</div><div class="stat-libelle">arguments</div></div>
        <div class="stat"><div class="stat-valeur">${nbExemples}</div><div class="stat-libelle">exemples chiffrés</div></div>
        <div class="stat"><div class="stat-valeur">${nbCitations}</div><div class="stat-libelle">citations</div></div>
        <div class="stat"><div class="stat-valeur">${d.themes.length} / ${nbChapitres}</div><div class="stat-libelle">thèmes / chapitres</div></div>
      </div>

      <div class="carte">
        <h2>Arguments par chapitre</h2>
        ${lignes.length ? lignes.map((l) => `
          <div class="barre-ligne">
            <a href="#/arguments?filtre=${l.id}" title="Voir ces arguments">${U.esc(l.nom)}</a>
            <div class="barre-fond"><div class="barre-rempli" style="width:${(l.n / max) * 100}%"></div></div>
            <span>${l.n}</span>
          </div>`).join('') : '<p class="muet">Aucun chapitre. Commence par créer tes thèmes et chapitres.</p>'}
        ${nonClasses ? `<p class="petit muet">${U.pluriel(nonClasses, 'argument non classé', 'arguments non classés')} (rattaché à aucun chapitre) : <a href="#/arguments?filtre=__aucun">les voir</a></p>` : ''}
      </div>

      <div class="carte">
        <h2>Révisions</h2>
        <p class="muet">Les flashcards, la répétition espacée et tes statistiques de révision (cartes du jour, série de jours, taux de réussite) arriveront à l'étape 3.</p>
      </div>
    `;

    el.querySelector('[data-nouvel]').addEventListener('click', () => Vues.arguments.ouvrirFormulaire(null));
    const btnDemo = el.querySelector('[data-suppr-demo]');
    if (btnDemo) btnDemo.addEventListener('click', () => Vues.sauvegarde.demanderSuppressionDemo());
  },
};
