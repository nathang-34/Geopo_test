/* =========================================================
   sauvegarde.js : page « Sauvegarde »
   Export / import du fichier JSON complet, espace utilisé,
   suppression de la démo, remise à zéro.
   ========================================================= */

const LIMITE_STOCKAGE = 5 * 1024 * 1024; // environ 5 Mo dans la plupart des navigateurs

Vues.sauvegarde = {
  rendre(el) {
    const d = Stockage.donnees;
    const m = d.meta;
    const taille = Stockage.tailleOctets();
    const pourcent = Math.min(100, (taille / LIMITE_STOCKAGE) * 100);

    el.innerHTML = `
      <div class="entete-vue"><h1>💾 Sauvegarde</h1></div>

      <div class="carte">
        <h2>Pourquoi sauvegarder ?</h2>
        <p>Tes données sont rangées <strong>dans ce navigateur, sur ce PC</strong>. Elles restent là quand tu fermes le site, mais elles peuvent disparaître si tu <strong>effaces les données de navigation</strong>, changes de navigateur ou d'ordinateur.</p>
        <p>La sauvegarde télécharge <strong>un fichier unique</strong> qui contient <em>tout</em> (thèmes, arguments, flashcards, plans, statistiques, réglages). Garde les derniers fichiers dans un dossier sûr, idéalement aussi sur une clé USB ou un cloud (OneDrive, Google Drive...).</p>
      </div>

      ${this.htmlAuto()}

      <div class="carte">
        <h2>Exporter (télécharger une sauvegarde)</h2>
        <p class="muet petit">Utile pour mettre une copie ailleurs (clé USB, autre PC), même si la sauvegarde automatique est activée.</p>
        <p>Dernière sauvegarde (automatique ou manuelle) : <strong>${m.derniereSauvegarde ? U.dateLisible(m.derniereSauvegarde) + ' (' + U.depuis(m.derniereSauvegarde) + ')' : 'jamais'}</strong>
          · ${U.pluriel(m.modifsDepuisSauvegarde || 0, 'modification')} depuis.</p>
        <button class="btn btn-principal" data-exporter>⬇️ Télécharger la sauvegarde complète</button>
        <p class="muet petit" style="margin-top:8px">Le fichier est enregistré dans ton dossier « Téléchargements » sous un nom du type <code>${U.esc(Stockage.nomFichierSauvegarde())}</code>.</p>
      </div>

      <div class="carte">
        <h2>Importer une sauvegarde</h2>
        <p>Choisis un fichier <code>geopo-sauvegarde-....json</code> téléchargé auparavant. Tu pourras ensuite choisir de <strong>remplacer</strong> tes données actuelles ou de les <strong>fusionner</strong>.</p>
        <input type="file" accept=".json,application/json" data-fichier>
        <div data-resultat-import style="margin-top:12px"></div>
      </div>

      <div class="carte">
        <h2>Espace utilisé</h2>
        <div class="jauge"><div style="width:${pourcent.toFixed(1)}%"></div></div>
        <p class="muet petit">${U.taille(taille)} utilisés sur environ ${U.taille(LIMITE_STOCKAGE)} (${pourcent.toFixed(1).replace('.', ',')} %).
          ${pourcent > 70 ? '<strong style="color:var(--attention)">L\'espace commence à manquer : exporte une sauvegarde.</strong>' : 'Tu as largement de la place.'}</p>
      </div>

      <div class="carte">
        <h2>Zone de nettoyage</h2>
        <div class="barre-actions">
          <button class="btn" data-suppr-demo ${Stockage.aDeLaDemo() ? '' : 'disabled'}>Supprimer les exemples de démonstration</button>
          <button class="btn btn-danger" data-tout-effacer>Tout effacer et repartir de zéro</button>
        </div>
      </div>
    `;

    el.querySelector('[data-exporter]').addEventListener('click', () => { App.telechargerSauvegarde(); App.rafraichir(); });
    el.querySelectorAll('[data-auto]').forEach((b) => b.addEventListener('click', async () => {
      const action = b.dataset.auto;
      if (action === 'activer') await AutoSauvegarde.choisirDossier();
      if (action === 'reprendre') await AutoSauvegarde.reprendre();
      if (action === 'ecrire') { if (await AutoSauvegarde.ecrire()) toast('Fichier mis à jour.'); }
      if (action === 'desactiver') {
        const ok = await confirmer('<p>Désactiver la sauvegarde automatique ?</p><p class="muet">Les fichiers déjà présents dans le dossier sont conservés.</p>', { texteOk: 'Désactiver', danger: true });
        if (ok) await AutoSauvegarde.desactiver();
      }
      App.rafraichir();
    }));
    el.querySelector('[data-suppr-demo]').addEventListener('click', () => this.demanderSuppressionDemo());
    el.querySelector('[data-tout-effacer]').addEventListener('click', () => this.toutEffacer());
    el.querySelector('[data-fichier]').addEventListener('change', (e) => {
      const fichier = e.target.files[0];
      if (!fichier) return;
      const lecteur = new FileReader();
      lecteur.onload = () => this.preparerImport(el, String(lecteur.result));
      lecteur.onerror = () => toast('Impossible de lire ce fichier.', 'erreur');
      lecteur.readAsText(fichier, 'utf-8');
    });
  },

  /** Carte « Sauvegarde automatique » */
  htmlAuto() {
    const a = AutoSauvegarde;
    const nomDossier = a.dossier ? U.esc(a.dossier.name) : '';
    let corps;
    switch (a.etat) {
      case 'non-supportee':
        corps = `<p>⚠️ Ton navigateur ne permet pas d'écrire automatiquement dans un dossier. Ouvre le site avec <strong>Chrome</strong> ou <strong>Edge</strong> pour l'activer. En attendant, utilise le téléchargement ci-dessous.</p>`;
        break;
      case 'inactive':
        corps = `
          <p>Le site peut copier ton travail <strong>tout seul</strong> dans un dossier de ton PC, quelques secondes après chaque modification. En choisissant un dossier <strong>OneDrive</strong>, tu as en plus une copie en ligne.</p>
          <ol>
            <li>Clique sur « Choisir le dossier ».</li>
            <li>Dans la fenêtre, clique sur <strong>OneDrive</strong> dans la colonne de gauche, crée un dossier (par exemple « Géopo Révision ») et ouvre-le.</li>
            <li>Clique sur « Sélectionner un dossier », puis accepte les deux demandes d'autorisation (voir les fichiers, puis enregistrer les modifications).</li>
          </ol>
          <button class="btn btn-principal" data-auto="activer">📁 Choisir le dossier</button>`;
        break;
      case 'pause':
        corps = `
          <p>⏸️ <strong>En pause.</strong> Dossier choisi : « ${nomDossier} ». Par sécurité, Chrome demande ton accord à chaque ouverture du site. Si Chrome te propose « Autoriser à chaque visite », choisis-le : tu n'auras plus à cliquer.</p>
          <div class="barre-actions">
            <button class="btn btn-principal" data-auto="reprendre">▶️ Reprendre la sauvegarde auto</button>
            <button class="btn" data-auto="activer">Changer de dossier</button>
            <button class="btn btn-discret" data-auto="desactiver">Désactiver</button>
          </div>`;
        break;
      default:
        corps = `
          <p>${a.etat === 'erreur' ? '⚠️ <strong>La dernière tentative a échoué.</strong>' : '✅ <strong>Activée.</strong>'} Dossier : « ${nomDossier} »${a.derniereEcriture ? ` · dernier enregistrement ${U.depuis(a.derniereEcriture.toISOString())}` : ''}.</p>
          <p class="muet petit">Dans ce dossier :<br>
            · <code>${a.NOM_FICHIER}</code> : ton travail, mis à jour quelques secondes après chaque modification ;<br>
            · <code>secours/</code> : une copie par jour (état à la première ouverture de la journée), les ${a.NB_SECOURS} derniers jours sont gardés.<br>
            Pour revenir en arrière, importe l'un de ces fichiers avec le bloc « Importer une sauvegarde » ci-dessous.</p>
          <div class="barre-actions">
            <button class="btn btn-principal" data-auto="ecrire">Enregistrer maintenant</button>
            <button class="btn" data-auto="activer">Changer de dossier</button>
            <button class="btn btn-discret" data-auto="desactiver">Désactiver</button>
          </div>`;
    }
    return `<div class="carte"><h2>🔄 Sauvegarde automatique</h2>${corps}</div>`;
  },

  preparerImport(el, texte) {
    const zone = el.querySelector('[data-resultat-import]');
    const res = Stockage.lireSauvegarde(texte);
    if (!res.ok) {
      zone.innerHTML = `<div class="bandeau"><span>❌ ${U.esc(res.erreur)}</span></div>`;
      return;
    }
    const s = res.donnees;
    zone.innerHTML = `
      <div class="carte" style="background:var(--surface-2)">
        <p>✅ Sauvegarde valide${res.exporteLe ? ', créée le <strong>' + U.dateLisible(res.exporteLe) + '</strong>' : ''}.</p>
        <p>Elle contient : ${U.pluriel(s.themes.length, 'thème')}, ${U.pluriel(s.arguments.length, 'argument')}, ${U.pluriel(s.flashcards.length, 'flashcard')}, ${U.pluriel(s.plans.length, 'plan')}.</p>
        <div class="barre-actions">
          <button class="btn btn-danger" data-remplacer>Remplacer toutes mes données</button>
          <button class="btn btn-principal" data-fusionner>Fusionner avec mes données</button>
        </div>
        <p class="muet petit" style="margin-top:8px"><strong>Remplacer</strong> : tes données actuelles sont effacées et remplacées par celles du fichier (idéal sur un nouveau PC ou après avoir vidé le navigateur).<br>
        <strong>Fusionner</strong> : ajoute ce qui manque ; quand un élément existe des deux côtés, la version modifiée le plus récemment est gardée.</p>
      </div>`;

    zone.querySelector('[data-remplacer]').addEventListener('click', async () => {
      const ok = await confirmer(
        `<p>Toutes tes données actuelles (${U.pluriel(Stockage.donnees.arguments.length, 'argument')}...) vont être <strong>remplacées</strong>.</p>
         <p>Conseil : si tu as un doute, annule et télécharge d'abord une sauvegarde de tes données actuelles.</p>`,
        { titre: 'Remplacer les données', texteOk: 'Remplacer', danger: true },
      );
      if (!ok) return;
      Stockage.remplacerPar(s);
      App.appliquerApparence();
      toast('Sauvegarde importée : tes données ont été remplacées.');
      App.rafraichir();
    });
    zone.querySelector('[data-fusionner]').addEventListener('click', () => {
      const b = Stockage.fusionnerAvec(s);
      toast(`Fusion terminée : ${b.themes} thème(s), ${b.chapitres} chapitre(s), ${b.arguments} argument(s), ${b.flashcards} flashcard(s), ${b.plans} plan(s) ajoutés ; ${b.misAJour} élément(s) mis à jour.`, 'info', 7000);
      App.rafraichir();
    });
  },

  async demanderSuppressionDemo() {
    const nb = Stockage.donnees.arguments.filter((a) => a.demo).length;
    const ok = await confirmer(
      `<p>Supprimer les <strong>${U.pluriel(nb, 'argument')} de démonstration</strong> (étiquette « Démo ») ?</p>
       <p class="muet">Ton thème, tes chapitres et tout ce que tu as créé toi-même sont conservés.</p>`,
      { titre: 'Supprimer la démo', texteOk: 'Supprimer la démo', danger: true },
    );
    if (!ok) return;
    Stockage.supprimerDemo();
    toast('Exemples de démonstration supprimés.');
    App.rafraichir();
  },

  async toutEffacer() {
    const ok = await confirmer(
      `<p>Cela efface <strong>tout</strong> : thèmes, chapitres, arguments, flashcards, plans et statistiques.</p>
       <p>Télécharge d'abord une sauvegarde si tu veux pouvoir revenir en arrière.</p>`,
      { titre: 'Tout effacer', texteOk: 'Continuer', danger: true },
    );
    if (!ok) return;
    const mot = await demanderTexte('Confirmation finale', { libelle: 'Tape EFFACER (en majuscules) pour confirmer', texteOk: 'Tout effacer' });
    if (mot !== 'EFFACER') { if (mot !== null) toast('Mot incorrect : rien n\'a été effacé.', 'attention'); return; }
    Stockage.toutEffacer();
    toast('Toutes les données ont été effacées.');
    App.rafraichir();
  },
};
