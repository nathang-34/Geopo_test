/* =========================================================
   composants.js : éléments d'interface réutilisables
   - champ à étiquettes avec suggestions (pays, mots-clés)
   - arbre de cases à cocher thèmes / chapitres
   - liste déroulante de filtre par thème / chapitre
   ========================================================= */

/**
 * Champ à étiquettes (« chips »).
 * options :
 *  - valeurs : tableau de départ
 *  - suggestions(texte) : renvoie [{ valeur, info, groupe }]
 *  - creer(texte) : appelé pour une valeur absente des suggestions ; renvoie la valeur à ajouter ou null
 *  - texteCreer(texte) : libellé de l'option de création
 *  - affichage(valeur) : texte de l'étiquette
 *  - classeChip : classe CSS des étiquettes
 */
function ChampEtiquettes(conteneur, options) {
  let valeurs = [...(options.valeurs || [])];
  let ouvert = false;
  let indexActif = -1;
  let optionsVisibles = [];

  conteneur.classList.add('champ-etiquettes');
  conteneur.innerHTML = `<div class="zone"><input type="text" placeholder="${U.esc(options.placeholder || '')}"></div>`;
  const zone = conteneur.querySelector('.zone');
  const champ = zone.querySelector('input');
  let liste = null;

  function dessinerChips() {
    zone.querySelectorAll('.chip').forEach((c) => c.remove());
    valeurs.forEach((v, i) => {
      const texte = options.affichage ? options.affichage(v) : v;
      const chip = U.html(`<span class="chip ${options.classeChip || ''}">${U.esc(texte)}<button type="button" title="Retirer">×</button></span>`);
      chip.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        valeurs.splice(i, 1);
        dessinerChips();
        champ.focus();
      });
      zone.insertBefore(chip, champ);
    });
  }

  function fermer() {
    if (liste) liste.remove();
    liste = null;
    ouvert = false;
    indexActif = -1;
  }

  function ouvrir() {
    const texte = champ.value.trim();
    const sugg = options.suggestions(texte).filter((s) => !valeurs.includes(s.valeur));
    optionsVisibles = [];
    let html = '';
    let groupeCourant = null;
    for (const s of sugg) {
      if (s.groupe && s.groupe !== groupeCourant) {
        html += `<div class="groupe">${U.esc(s.groupe)}</div>`;
        groupeCourant = s.groupe;
      }
      html += `<div class="option" data-i="${optionsVisibles.length}">${U.esc(s.libelle || s.valeur)}${s.info ? `<span class="info">${U.esc(s.info)}</span>` : ''}</div>`;
      optionsVisibles.push({ type: 'valeur', valeur: s.valeur });
    }
    const exact = sugg.some((s) => U.norm(s.valeur) === U.norm(texte)) || valeurs.some((v) => U.norm(v) === U.norm(texte));
    if (texte && options.creer && !exact) {
      html += `<div class="option" data-i="${optionsVisibles.length}">➕ ${U.esc(options.texteCreer ? options.texteCreer(texte) : 'Ajouter « ' + texte + ' »')}</div>`;
      optionsVisibles.push({ type: 'creer', texte });
    }
    fermer();
    if (!html) return;
    liste = U.html(`<div class="suggestions">${html}</div>`);
    liste.addEventListener('mousedown', (e) => {
      e.preventDefault(); // garde le focus dans le champ
      const opt = e.target.closest('.option');
      if (opt) choisir(Number(opt.dataset.i));
    });
    conteneur.appendChild(liste);
    ouvert = true;
    indexActif = texte ? 0 : -1;
    surligner();
  }

  function surligner() {
    if (!liste) return;
    liste.querySelectorAll('.option').forEach((o) => o.classList.toggle('active', Number(o.dataset.i) === indexActif));
    const actif = liste.querySelector('.option.active');
    if (actif) actif.scrollIntoView({ block: 'nearest' });
  }

  function ajouter(valeur) {
    if (valeur && !valeurs.includes(valeur)) valeurs.push(valeur);
    champ.value = '';
    dessinerChips();
  }

  function choisir(i) {
    const o = optionsVisibles[i];
    if (!o) return;
    if (o.type === 'valeur') ajouter(o.valeur);
    else ajouter(options.creer(o.texte));
    fermer(); // la liste se rouvre dès qu'on tape à nouveau
  }

  zone.addEventListener('click', () => champ.focus());
  champ.addEventListener('focus', ouvrir);
  champ.addEventListener('input', ouvrir);
  champ.addEventListener('blur', () => setTimeout(fermer, 120));
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!ouvert) ouvrir(); indexActif = Math.min(indexActif + 1, optionsVisibles.length - 1); surligner(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); indexActif = Math.max(indexActif - 1, 0); surligner(); }
    else if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      if (champ.value.trim() || indexActif >= 0) {
        e.preventDefault();
        if (indexActif >= 0) choisir(indexActif);
        else if (options.creer) { ajouter(options.creer(champ.value.trim())); fermer(); }
      } else if (e.key === 'Enter') {
        e.preventDefault(); // ne valide pas le formulaire par erreur
      }
    }
    else if (e.key === 'Backspace' && !champ.value && valeurs.length) { valeurs.pop(); dessinerChips(); }
    else if (e.key === 'Escape') { if (ouvert) { e.stopPropagation(); fermer(); } }
  });

  dessinerChips();
  return {
    valeurs: () => {
      // Une valeur tapée mais pas encore validée est ajoutée aussi
      const reste = champ.value.trim();
      if (reste && options.creer) ajouter(options.creer(reste));
      return [...valeurs];
    },
  };
}

/** Champ des pays / acteurs, avec suggestions tenant compte des chapitres choisis */
function ChampPays(conteneur, valeurs, chapitresChoisis) {
  return ChampEtiquettes(conteneur, {
    valeurs,
    classeChip: 'chip-pays',
    placeholder: 'Tape un pays, un empire, une organisation...',
    affichage: (v) => {
      const e = Pays.trouver(v);
      const p = Pays.periode(e);
      return p && e.type === 'historique' ? `${v} (${p})` : v;
    },
    suggestions: (texte) => {
      const tous = Pays.tous();
      const info = (e) => {
        const p = Pays.periode(e);
        return [p, e.alias && e.alias.length ? e.alias[0] : ''].filter(Boolean).join(' · ');
      };
      if (!texte) {
        // Suggestions selon les chapitres sélectionnés dans le formulaire
        const ids = chapitresChoisis();
        const compte = {};
        for (const a of Stockage.donnees.arguments) {
          if (!a.rattachements.some((r) => ids.includes(r))) continue;
          for (const p of a.pays) compte[p] = (compte[p] || 0) + 1;
        }
        const frequents = Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 12)
          .map(([nom, n]) => ({ valeur: nom, info: U.pluriel(n, 'argument'), groupe: 'Souvent utilisés dans ce(s) chapitre(s)' }));
        const dejaProposes = frequents.map((f) => f.valeur);
        const parRegion = Pays.ordreRegions
          .flatMap((r) => tous.filter((e) => e.region === r && !dejaProposes.includes(e.nom)))
          .map((e) => ({ valeur: e.nom, info: info(e), groupe: e.region }));
        return frequents.concat(parRegion);
      }
      const t = U.norm(texte);
      const trouves = tous.filter((e) => e.cle.includes(t));
      // Ceux qui commencent par le texte d'abord
      trouves.sort((a, b) => (U.norm(a.nom).startsWith(t) ? 0 : 1) - (U.norm(b.nom).startsWith(t) ? 0 : 1));
      return trouves.slice(0, 30).map((e) => ({ valeur: e.nom, info: info(e), groupe: e.region }));
    },
    creer: (texte) => {
      const existant = Pays.tous().find((e) => U.norm(e.nom) === U.norm(texte) || e.alias.some((a) => U.norm(a) === U.norm(texte)));
      if (existant) return existant.nom;
      Stockage.modifier((d) => d.paysPerso.push({ nom: texte }));
      toast(`« ${texte} » ajouté à tes acteurs personnalisés.`);
      return texte;
    },
    texteCreer: (texte) => `Ajouter « ${texte} » comme acteur personnalisé`,
  });
}

/** Champ des mots-clés, avec suggestions des mots-clés déjà utilisés */
function ChampMotsCles(conteneur, valeurs) {
  return ChampEtiquettes(conteneur, {
    valeurs,
    placeholder: 'Tape un mot-clé puis Entrée',
    suggestions: (texte) => {
      const compte = {};
      for (const a of Stockage.donnees.arguments) for (const m of a.motsCles) compte[m] = (compte[m] || 0) + 1;
      let liste = Object.entries(compte);
      if (texte) liste = liste.filter(([m]) => U.norm(m).includes(U.norm(texte)));
      return liste.sort((a, b) => b[1] - a[1]).slice(0, 15).map(([m, n]) => ({ valeur: m, info: U.pluriel(n, 'argument'), groupe: 'Mots-clés existants' }));
    },
    creer: (texte) => texte,
  });
}

/** Arbre de cases à cocher : thèmes et chapitres. Renvoie { valeurs(), surChangement(fn) } */
function ArbreRattachements(conteneur, valeurs) {
  const themes = Stockage.donnees.themes;
  if (!themes.length) {
    conteneur.innerHTML = '<p class="muet petit">Aucun thème pour l\'instant. Crée-en un dans la page Thèmes.</p>';
    return { valeurs: () => [], surChangement: () => {} };
  }
  conteneur.innerHTML = `<div class="arbre-rattachements">${themes.map((t) => `
      <label class="theme-case"><input type="checkbox" value="${t.id}" ${valeurs.includes(t.id) ? 'checked' : ''}> ${U.esc(t.nom)} <span class="aide">(thème entier)</span></label>
      ${t.chapitres.map((c) => `<label class="chapitre-case"><input type="checkbox" value="${c.id}" ${valeurs.includes(c.id) ? 'checked' : ''}> ${U.esc(c.nom)}</label>`).join('')}
    `).join('')}</div>`;
  return {
    valeurs: () => [...conteneur.querySelectorAll('input:checked')].map((i) => i.value),
    surChangement: (fn) => conteneur.addEventListener('change', fn),
  };
}

/** Options d'une liste déroulante « Thème / chapitre » pour les filtres */
function optionsFiltreThemes(selection, { avecNonClasses = true } = {}) {
  let html = `<option value="">Tous les thèmes</option>`;
  if (avecNonClasses) html += `<option value="__aucun" ${selection === '__aucun' ? 'selected' : ''}>Non classés</option>`;
  for (const t of Stockage.donnees.themes) {
    html += `<option value="${t.id}" ${selection === t.id ? 'selected' : ''}>${U.esc(t.nom)}</option>`;
    for (const c of t.chapitres) {
      html += `<option value="${c.id}" ${selection === c.id ? 'selected' : ''}>   ↳ ${U.esc(c.nom)}</option>`;
    }
  }
  return html;
}
