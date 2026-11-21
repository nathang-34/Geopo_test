/* =========================================================
   app.js : démarrage du site et navigation entre les pages
   L'adresse de la page est dans le « # » de l'URL :
   index.html#/arguments, index.html#/themes...
   ========================================================= */

/* Pages prévues pour les étapes suivantes */
const PAGES_A_VENIR = {
};

const SEUIL_JOURS_RAPPEL = 3;
const SEUIL_MODIFS_RAPPEL = 30;

const App = {
  rappelMasque: false,

  demarrer() {
    Stockage.charger();
    this.ajouterCartesDemo();
    this.appliquerApparence();

    document.getElementById('btn-sauver-menu').addEventListener('click', () => App.sauvegarderMaintenant());

    // Marque les pages pas encore disponibles dans le menu
    for (const nom of Object.keys(PAGES_A_VENIR)) {
      if (!Vues[nom]) document.querySelector(`.menu-liens a[data-vue="${nom}"]`).classList.add('bientot');
    }

    try { this.rappelMasque = sessionStorage.getItem('geopo-rappel-masque') === '1'; } catch (e) { /* rien */ }
    AutoSauvegarde.init();

    window.addEventListener('hashchange', () => App.afficher());
    if (!location.hash) location.hash = '#/tableau';
    else this.afficher();

    if (!Stockage.disponible) {
      toast("Attention : ton navigateur bloque l'enregistrement local. Tes modifications seront perdues à la fermeture.", 'erreur', 15000);
    }
  },

  /**
   * Une seule fois : crée les flashcards de démonstration à partir des
   * arguments de démonstration (y compris pour les données créées avant l'étape 3).
   */
  ajouterCartesDemo() {
    const d = Stockage.donnees;
    if (d.meta.cartesDemoAjoutees) return;
    const argsDemo = d.arguments.filter((a) => a.demo);
    Stockage.modifier((dd) => {
      for (const a of argsDemo) {
        const ratt = a.rattachements.find((r) => Stockage.rattachement(r)) || null;
        for (const p of Flashcards.propositions(a)) {
          if (p.coche) Flashcards.ajouter(dd, { recto: p.recto, verso: p.verso, rattachement: ratt, argumentId: a.id, cle: p.cle, source: 'argument', demo: true });
        }
      }
      dd.meta.cartesDemoAjoutees = true;
    });
    if (!argsDemo.length) d.meta.modifsDepuisSauvegarde = Math.max(0, d.meta.modifsDepuisSauvegarde - 1);
  },

  /** Nombre de cartes à réviser, affiché dans le menu */
  majBadgeReviser() {
    const lien = document.querySelector('.menu-liens a[data-vue="reviser"]');
    if (!lien) return;
    const f = Flashcards.fileDuJour('');
    const n = f.dues.length + f.nouvelles.length;
    lien.innerHTML = `🔁 Réviser${n ? ` <span class="badge">${n}</span>` : ''}`;
  },

  /** Lit l'adresse (#/page?param=valeur) */
  lireAdresse() {
    const brut = location.hash.replace(/^#\/?/, '');
    const [nom, requete] = brut.split('?');
    const params = {};
    new URLSearchParams(requete || '').forEach((v, k) => { params[k] = v; });
    return { nom: nom || 'tableau', params };
  },

  /** Va vers une page : App.aller('arguments', { filtre: 'ch-1913' }) */
  aller(nom, params = {}) {
    const q = new URLSearchParams(params).toString();
    const cible = '#/' + nom + (q ? '?' + q : '');
    if (location.hash === cible) this.afficher();
    else location.hash = cible;
  },

  /** Affiche la page demandée dans l'adresse */
  afficher() {
    const { nom, params } = this.lireAdresse();
    const conteneur = document.getElementById('vue');
    document.querySelectorAll('.menu-liens a').forEach((a) => a.classList.toggle('actif', a.dataset.vue === nom));
    // Ferme les fenêtres éventuellement ouvertes
    Modal.pile.slice().forEach((m) => Modal.fermer(m, true));

    const vue = Vues[nom];
    if (vue) {
      vue.rendre(this.nouvellePage(), params);
    } else if (PAGES_A_VENIR[nom]) {
      const p = PAGES_A_VENIR[nom];
      conteneur.innerHTML = `<div class="entete-vue"><h1>${p.titre}</h1></div>
        <div class="carte vide"><p style="font-size:2rem">🚧</p><p>${U.esc(p.texte)}</p><p class="petit">Cette page sera construite à l'étape ${p.etape}.</p></div>`;
    } else {
      this.aller('tableau');
      return;
    }
    window.scrollTo(0, 0);
    this.majEtatSauvegarde();
  },

  /**
   * Vide la zone principale et y place un bloc neuf : chaque page
   * part ainsi d'une feuille blanche (sans anciens écouteurs de clics).
   */
  nouvellePage() {
    const conteneur = document.getElementById('vue');
    const page = document.createElement('div');
    conteneur.replaceChildren(page);
    return page;
  },

  /** Réaffiche la page courante (après une modification) */
  rafraichir() {
    const { nom, params } = this.lireAdresse();
    if (Vues[nom]) Vues[nom].rendre(this.nouvellePage(), params, { rafraichissement: true });
    this.majEtatSauvegarde();
  },

  appliquerApparence() {
    const r = Stockage.donnees.reglages;
    document.documentElement.dataset.theme = r.theme;
    document.documentElement.dataset.taille = r.taille;
  },

  /**
   * Bouton « Sauvegarder maintenant » :
   * - sauvegarde auto active : met le fichier à jour tout de suite ;
   * - sinon : télécharge un fichier de sauvegarde.
   */
  async sauvegarderMaintenant() {
    const auto = AutoSauvegarde;
    if (auto.etat === 'pause') { await auto.reprendre(); return; }
    if (auto.etat === 'active' || auto.etat === 'erreur') {
      clearTimeout(auto.minuteur);
      if (await auto.ecrire()) toast(`Fichier de sauvegarde mis à jour dans « ${auto.dossier.name} ».`);
      return;
    }
    this.telechargerSauvegarde();
  },

  /** Télécharge la sauvegarde complète */
  telechargerSauvegarde() {
    const contenu = Stockage.exporter();
    U.telecharger(Stockage.nomFichierSauvegarde(), contenu);
    toast('Sauvegarde téléchargée. Range-la dans un dossier sûr (ou une clé USB, un cloud...).');
    this.majEtatSauvegarde();
  },

  /** Faut-il rappeler de sauvegarder ? Renvoie un message ou null */
  messageRappel() {
    const m = Stockage.donnees.meta;
    const modifs = m.modifsDepuisSauvegarde || 0;
    if (modifs === 0) return null;
    if (!m.derniereSauvegarde) {
      return modifs >= 5 ? "Tu n'as encore jamais sauvegardé ton travail dans un fichier." : null;
    }
    const jours = (Date.now() - new Date(m.derniereSauvegarde).getTime()) / 86400000;
    if (jours >= SEUIL_JOURS_RAPPEL) return `Ta dernière sauvegarde date de ${Math.floor(jours)} jours (${modifs} modifications depuis).`;
    if (modifs >= SEUIL_MODIFS_RAPPEL) return `Tu as fait ${modifs} modifications depuis ta dernière sauvegarde.`;
    return null;
  },

  /** Met à jour le petit texte du menu et le bandeau de rappel */
  majEtatSauvegarde() {
    this.majBadgeReviser();
    const m = Stockage.donnees.meta;
    const etat = document.getElementById('etat-sauvegarde');
    const message = this.messageRappel();
    etat.textContent = 'Dernière sauvegarde : ' + U.depuis(m.derniereSauvegarde);
    etat.classList.toggle('alerte', !!message);

    const auto = AutoSauvegarde;
    const etatAuto = document.getElementById('etat-auto');
    const t = auto.texteEtat();
    etatAuto.textContent = t.texte;
    etatAuto.className = 'etat-auto ' + t.classe;
    const autoMarche = auto.etat === 'active';
    etat.style.display = autoMarche ? 'none' : '';

    const bandeau = document.getElementById('bandeau');
    if (auto.etat === 'pause' && !this.rappelMasque) {
      bandeau.innerHTML = `<div class="bandeau">
          <span>⏸️ <strong>Sauvegarde automatique en pause.</strong> Par sécurité, Chrome demande ton accord à chaque ouverture du site pour écrire dans « ${U.esc(auto.dossier.name)} ».</span>
          <span class="barre-actions">
            <button class="btn btn-principal btn-petit" data-reprendre>Reprendre la sauvegarde auto</button>
            <button class="btn btn-discret btn-petit" data-plus-tard>Plus tard</button>
          </span>
        </div>`;
      bandeau.querySelector('[data-reprendre]').addEventListener('click', () => auto.reprendre());
    } else if (auto.etat === 'erreur') {
      bandeau.innerHTML = `<div class="bandeau">
          <span>⚠️ <strong>La sauvegarde automatique a échoué.</strong> Le fichier est peut-être ouvert dans un autre logiciel, ou le dossier a été déplacé. Tes données restent enregistrées dans le navigateur.</span>
          <span class="barre-actions">
            <button class="btn btn-principal btn-petit" data-reessayer>Réessayer</button>
            <a class="btn btn-discret btn-petit" href="#/sauvegarde">Réglages</a>
          </span>
        </div>`;
      bandeau.querySelector('[data-reessayer]').addEventListener('click', () => auto.ecrire());
    } else if (message && !autoMarche && !this.rappelMasque) {
      bandeau.innerHTML = `<div class="bandeau">
          <span>💾 <strong>Pense à sauvegarder.</strong> ${U.esc(message)}</span>
          <span class="barre-actions">
            ${auto.etat === 'inactive' ? '<a class="btn btn-petit" href="#/sauvegarde">Activer la sauvegarde auto</a>' : ''}
            <button class="btn btn-principal btn-petit" data-sauver>Sauvegarder maintenant</button>
            <button class="btn btn-discret btn-petit" data-plus-tard>Plus tard</button>
          </span>
        </div>`;
      bandeau.querySelector('[data-sauver]').addEventListener('click', () => App.sauvegarderMaintenant());
    } else {
      bandeau.innerHTML = '';
    }
    const plusTard = bandeau.querySelector('[data-plus-tard]');
    if (plusTard) {
      plusTard.addEventListener('click', () => {
        App.rappelMasque = true;
        try { sessionStorage.setItem('geopo-rappel-masque', '1'); } catch (e) { /* rien */ }
        App.majEtatSauvegarde();
      });
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.demarrer());
