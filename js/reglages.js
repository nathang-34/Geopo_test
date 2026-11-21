/* =========================================================
   reglages.js : page « Réglages »
   ========================================================= */

Vues.reglages = {
  rendre(el) {
    const r = Stockage.donnees.reglages;
    const nbPerso = Stockage.donnees.paysPerso.length;
    el.innerHTML = `
      <div class="entete-vue"><h1>⚙️ Réglages</h1></div>

      <div class="carte">
        <h2>Apparence</h2>
        <div class="champ">
          <label>Thème</label>
          <select data-r="theme" style="max-width:300px">
            <option value="sombre" ${r.theme === 'sombre' ? 'selected' : ''}>🌙 Sombre</option>
            <option value="clair" ${r.theme === 'clair' ? 'selected' : ''}>☀️ Clair</option>
          </select>
        </div>
        <div class="champ">
          <label>Taille du texte</label>
          <select data-r="taille" style="max-width:300px">
            <option value="normal" ${r.taille === 'normal' ? 'selected' : ''}>Normale</option>
            <option value="grand" ${r.taille === 'grand' ? 'selected' : ''}>Grande</option>
          </select>
        </div>
      </div>

      <div class="carte">
        <h2>Mes acteurs personnalisés</h2>
        <p class="muet">Les pays ou acteurs que tu as ajoutés toi-même depuis le formulaire d'un argument.</p>
        ${nbPerso ? Stockage.donnees.paysPerso.map((p, i) => `<span class="chip chip-pays">${U.esc(p.nom)} <button data-suppr-perso="${i}" title="Retirer de la liste">×</button></span>`).join('') : '<p class="muet petit">Aucun pour l\'instant.</p>'}
      </div>

      <div class="carte">
        <h2>Révision</h2>
        <div class="champ">
          <label>Nouvelles cartes par jour <span class="aide">(cartes jamais vues ajoutées à chaque séance du jour ; 20 par défaut)</span></label>
          <input type="number" min="0" max="500" data-num="nouvellesParJour" value="${r.nouvellesParJour}" style="max-width:140px">
        </div>
        <div class="champ">
          <label>Heure de changement de jour <span class="aide">(comme Anki : à 4 h, une révision à 1 h du matin compte pour la veille)</span></label>
          <input type="number" min="0" max="12" data-num="heureChangementJour" value="${r.heureChangementJour}" style="max-width:140px"> <span class="muet petit">h</span>
        </div>
        <div class="champ">
          <label>Ordre des cartes en révision</label>
          <select data-r-revision="ordreRevision" style="max-width:300px">
            <option value="melange" ${r.ordreRevision !== 'ordre' ? 'selected' : ''}>🔀 Mélangées</option>
            <option value="ordre" ${r.ordreRevision === 'ordre' ? 'selected' : ''}>📋 Dans l'ordre du cours</option>
          </select>
          <div class="aide">Modifiable aussi directement sur la page Réviser.</div>
        </div>
        <p class="muet petit">Une carte est « maîtrisée » quand son intervalle de révision atteint ${SEUIL_MAITRISE} jours.</p>
        <button class="btn btn-danger btn-petit" data-effacer-stats>Effacer les statistiques de révision</button>
      </div>
    `;
    el.querySelectorAll('[data-r]').forEach((s) => s.addEventListener('change', () => {
      Stockage.reglage(s.dataset.r, s.value);
      App.appliquerApparence();
    }));
    el.querySelectorAll('[data-num]').forEach((champ) => champ.addEventListener('change', () => {
      const max = Number(champ.max);
      const v = Math.min(max, Math.max(0, Math.round(Number(champ.value) || 0)));
      champ.value = v;
      Stockage.reglage(champ.dataset.num, v);
      toast('Réglage enregistré.');
      App.majBadgeReviser();
    }));
    el.querySelector('[data-r-revision]').addEventListener('change', (e) => {
      Stockage.reglage('ordreRevision', e.target.value);
      toast('Réglage enregistré.');
    });
    el.querySelector('[data-effacer-stats]').addEventListener('click', async () => {
      const ok = await confirmer("<p>Effacer l'historique des séances, la série de jours et les taux de réussite ?</p><p class=\"muet\">Les flashcards et leur planification sont conservées.</p>", { texteOk: 'Effacer', danger: true });
      if (!ok) return;
      Stats.effacer();
      toast('Statistiques effacées.');
    });
    el.querySelectorAll('[data-suppr-perso]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.supprPerso);
      Stockage.modifier((d) => d.paysPerso.splice(i, 1));
      toast('Retiré de la liste (les arguments qui l\'utilisent le gardent).');
      App.rafraichir();
    }));
  },
};
