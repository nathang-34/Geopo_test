/* =========================================================
   utils.js : petits outils utilisés partout dans le site
   (identifiants, texte, fenêtres modales, notifications...)
   ========================================================= */

const U = {
  /** Crée un identifiant unique, ex : "lq3k9x2a8f1c" */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /** Protège un texte avant de l'insérer dans la page (évite qu'un « < » casse l'affichage) */
  esc(texte) {
    return String(texte ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /** Met un texte en minuscules sans accents, pour les recherches : "Égypte" -> "egypte" */
  norm(texte) {
    return String(texte ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Mise en forme légère : **gras**, *italique*, listes avec "- ",
   * lignes vides = nouveaux paragraphes.
   */
  md(texte) {
    const enLigne = (s) => U.esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    const lignes = String(texte ?? '').replace(/\r/g, '').split('\n');
    let html = '';
    let paragraphe = [];
    let liste = [];
    const viderParagraphe = () => {
      if (paragraphe.length) html += '<p>' + paragraphe.map(enLigne).join('<br>') + '</p>';
      paragraphe = [];
    };
    const viderListe = () => {
      if (liste.length) html += '<ul>' + liste.map((l) => '<li>' + enLigne(l) + '</li>').join('') + '</ul>';
      liste = [];
    };
    for (const ligne of lignes) {
      const puce = ligne.match(/^\s*[-•]\s+(.*)$/);
      if (puce) { viderParagraphe(); liste.push(puce[1]); }
      else if (ligne.trim() === '') { viderParagraphe(); viderListe(); }
      else { viderListe(); paragraphe.push(ligne); }
    }
    viderParagraphe();
    viderListe();
    return html;
  },

  /** Ajoute un « s » si besoin : U.pluriel(3, 'argument') -> "3 arguments" */
  pluriel(n, mot, motPluriel) {
    return n + ' ' + (n > 1 ? (motPluriel || mot + 's') : mot);
  },

  /** "il y a 3 jours", "aujourd'hui"... */
  depuis(dateIso) {
    if (!dateIso) return 'jamais';
    const ms = Date.now() - new Date(dateIso).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return 'il y a ' + U.pluriel(minutes, 'minute');
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return 'il y a ' + U.pluriel(heures, 'heure');
    const jours = Math.floor(heures / 24);
    return 'il y a ' + U.pluriel(jours, 'jour');
  },

  /** Date lisible : "20/11/2026 à 16:05" */
  dateLisible(dateIso) {
    if (!dateIso) return '';
    const d = new Date(dateIso);
    return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },

  /** Taille lisible : 15300 -> "14,9 Ko" */
  taille(octets) {
    if (octets < 1024) return octets + ' o';
    if (octets < 1024 * 1024) return (octets / 1024).toFixed(1).replace('.', ',') + ' Ko';
    return (octets / 1024 / 1024).toFixed(2).replace('.', ',') + ' Mo';
  },

  /** Copie profonde d'un objet (pour ne pas modifier l'original par erreur) */
  copie(objet) {
    return JSON.parse(JSON.stringify(objet));
  },

  /** Déclenche le téléchargement d'un fichier texte */
  telecharger(nomFichier, contenu, type = 'application/json') {
    const blob = new Blob([contenu], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Crée un élément HTML à partir d'un morceau de texte HTML */
  html(code) {
    const t = document.createElement('template');
    t.innerHTML = code.trim();
    return t.content.firstElementChild;
  },
};

/* ---------------------------------------------------------
   Notifications (petits messages en bas à droite)
   --------------------------------------------------------- */
function toast(message, type = 'info', duree = 3500) {
  const el = U.html(`<div class="toast ${type}">${U.esc(message)}</div>`);
  const zone = document.getElementById('toasts');
  zone.appendChild(el);
  // Au plus 3 notifications à la fois : on retire les plus anciennes
  while (zone.children.length > 3) zone.firstElementChild.remove();
  setTimeout(() => el.remove(), duree);
}

/* ---------------------------------------------------------
   Fenêtres modales
   --------------------------------------------------------- */
const Modal = {
  pile: [],

  /**
   * Ouvre une fenêtre. Options :
   *  - titre, contenu (texte HTML), large (bool)
   *  - avantFermeture() : renvoie false (ou une promesse de false) pour empêcher la fermeture
   */
  ouvrir({ titre, contenu = '', large = false, avantFermeture = null }) {
    const fond = U.html(`
      <div class="fond-modal">
        <div class="modal ${large ? 'large' : ''}" role="dialog" aria-modal="true">
          <div class="modal-entete">
            <h2>${U.esc(titre)}</h2>
            <button class="btn btn-discret btn-icone" data-fermer title="Fermer (Échap)">✕</button>
          </div>
          <div class="modal-corps">${contenu}</div>
        </div>
      </div>`);
    const entree = { fond, avantFermeture };
    fond.querySelector('[data-fermer]').addEventListener('click', () => Modal.fermer(entree));
    fond.addEventListener('mousedown', (e) => {
      if (e.target === fond) Modal.fermer(entree);
    });
    document.getElementById('modales').appendChild(fond);
    Modal.pile.push(entree);
    const premier = fond.querySelector('input, textarea, select');
    if (premier) setTimeout(() => premier.focus(), 30);
    entree.corps = fond.querySelector('.modal-corps');
    entree.fermer = (force) => Modal.fermer(entree, force);
    return entree;
  },

  async fermer(entree, force = false) {
    entree = entree || Modal.pile[Modal.pile.length - 1];
    if (!entree) return;
    if (!force && entree.avantFermeture) {
      const ok = await entree.avantFermeture();
      if (ok === false) return;
    }
    entree.fond.remove();
    Modal.pile = Modal.pile.filter((m) => m !== entree);
  },
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && Modal.pile.length) {
    // Ne pas fermer si une liste de suggestions est ouverte (elle gère Échap elle-même)
    if (document.querySelector('.suggestions')) return;
    Modal.fermer();
  }
});

/** Demande une confirmation. Renvoie une promesse : true (OK) ou false (Annuler). */
function confirmer(message, { titre = 'Confirmation', texteOk = 'Confirmer', danger = false } = {}) {
  return new Promise((resoudre) => {
    let repondu = false;
    const m = Modal.ouvrir({
      titre,
      contenu: `<div>${message}</div>
        <div class="modal-pied">
          <button class="btn" data-non>Annuler</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-principal'}" data-oui>${U.esc(texteOk)}</button>
        </div>`,
      avantFermeture: () => { if (!repondu) resoudre(false); },
    });
    m.corps.querySelector('[data-non]').addEventListener('click', () => { repondu = true; resoudre(false); m.fermer(true); });
    m.corps.querySelector('[data-oui]').addEventListener('click', () => { repondu = true; resoudre(true); m.fermer(true); });
    setTimeout(() => m.corps.querySelector('[data-oui]').focus(), 30);
  });
}

/** Demande un texte (ex : nouveau nom). Renvoie le texte, ou null si annulé. */
function demanderTexte(titre, { valeur = '', libelle = '', texteOk = 'Valider' } = {}) {
  return new Promise((resoudre) => {
    let repondu = false;
    const m = Modal.ouvrir({
      titre,
      contenu: `<form>
          ${libelle ? `<label>${U.esc(libelle)}</label>` : ''}
          <input type="text" value="${U.esc(valeur)}">
          <div class="modal-pied">
            <button type="button" class="btn" data-non>Annuler</button>
            <button type="submit" class="btn btn-principal">${U.esc(texteOk)}</button>
          </div>
        </form>`,
      avantFermeture: () => { if (!repondu) resoudre(null); },
    });
    const champ = m.corps.querySelector('input');
    setTimeout(() => champ.select(), 40);
    m.corps.querySelector('[data-non]').addEventListener('click', () => { repondu = true; resoudre(null); m.fermer(true); });
    m.corps.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const texte = champ.value.trim();
      if (!texte) { champ.focus(); return; }
      repondu = true;
      resoudre(texte);
      m.fermer(true);
    });
  });
}

/* Registre des pages du site : chaque fichier de page s'y ajoute (Vues.arguments = {...}) */
const Vues = {};
