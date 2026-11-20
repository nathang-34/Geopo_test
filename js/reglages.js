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
        <p class="muet">Les réglages de la répétition espacée (nouvelles cartes par jour, heure de changement de jour) arriveront à l'étape 3.</p>
      </div>
    `;
    el.querySelectorAll('[data-r]').forEach((s) => s.addEventListener('change', () => {
      Stockage.reglage(s.dataset.r, s.value);
      App.appliquerApparence();
    }));
    el.querySelectorAll('[data-suppr-perso]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.supprPerso);
      Stockage.modifier((d) => d.paysPerso.splice(i, 1));
      toast('Retiré de la liste (les arguments qui l\'utilisent le gardent).');
      App.rafraichir();
    }));
  },
};
