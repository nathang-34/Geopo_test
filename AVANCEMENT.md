# Géopo Révision : suivi d'avancement

Site personnel de révision de géopolitique (prépa ECG, option HGG) : banque d'arguments, flashcards avec répétition espacée, aide au plan de dissertation.
Ce fichier sert à reprendre le projet dans une nouvelle conversation : il résume ce qui est fait, les choix techniques et la suite.

## Comment ouvrir le site

1. Télécharger le dépôt (GitHub, bouton vert « Code » puis « Download ZIP ») et le décompresser.
2. Double-cliquer sur `index.html` (Chrome ou Edge recommandés).

Aucune installation, aucun serveur, aucune connexion Internet nécessaire.

## État des étapes

| Étape | Contenu | État |
|---|---|---|
| 1 | Structure, thèmes et chapitres, banque d'arguments, sauvegarde et export | ✅ Terminée, en test par l'utilisateur |
| 2 | Import JSON (vérification, aperçu, doublons) et prompt modèle pour Claude | ⏳ À faire |
| 3 | Flashcards, génération depuis les arguments, SM-2, session du jour, tableau de bord | ⏳ À faire |
| 4 | Aide au plan de dissertation (recherche par pertinence, plan I/II/III, export) | ⏳ À faire |
| 5 | Bonus : mode colle, frise chronologique, carte du monde | ⏳ À faire |

## Décisions validées avec l'utilisateur

- Navigateur : Chrome ou Edge. Récupération du code via GitHub (ZIP).
- Programme : deux niveaux, Thème > Chapitre. Thème de départ « Les grandes mutations du monde de 1913 à nos jours » avec les 4 chapitres du professeur (1913, 1939, 1945, guerre froide et décolonisation). Ce ne sont pas des données de démo.
- Exemple chiffré = 4 champs : `mesure`, `chiffre`, `date`, `source`.
- Citation = `texte`, `auteur`, `contexte` (ouvrage ou contexte).
- Pays : liste unique d'« acteurs géopolitiques » par région (pays actuels, entités historiques datées, organisations, grands ensembles). Les entités historiques sont reliées aux pays actuels (`actuels`) pour la future carte. Suggestions en priorité des acteurs déjà utilisés dans les chapitres cochés. L'utilisateur peut ajouter des acteurs personnalisés.
- Dates importantes : texte libre (année seule ou date complète) + intitulé obligatoire.
- Mise en forme légère dans les explications : `**gras**`, `*italique*`, listes « - ».
- Flashcards générées (étape 3) : citation dans les deux sens (« Qui a dit... ? » et l'inverse), chiffre (« mesure (date) ? » → chiffre et source), avec cases à cocher avant génération.
- SM-2 : 4 boutons (À revoir / Difficile / Bien / Facile), 20 nouvelles cartes par jour (réglable), changement de jour à 4 h, carte « maîtrisée » si intervalle ≥ 21 jours.
- Rappel de sauvegarde : bandeau si dernière sauvegarde > 3 jours, ou ≥ 30 modifications, ou jamais sauvegardé après 5 modifications. Bouton « Sauvegarder maintenant » toujours visible.
- Volume prévu : environ 200 arguments et 1 000 flashcards. Stockage localStorage suffisant ; à l'étape 3, enregistrer des statistiques résumées par jour plutôt que chaque réponse.
- Plan de dissertation (étape 4) : export par copie (texte), fichier `.txt` et impression / PDF ; liste de synonymes modifiable (Chine ~ chinois, Pékin, RPC).
- Apparence : mode sombre par défaut (bleu nuit, accents doré et turquoise), mode clair disponible, taille de texte réglable. PC en priorité, affichage adaptatif.
- Interface entièrement en français. Pas de tirets cadratins dans les textes.

## Choix techniques

- HTML, CSS et JavaScript « classiques » (pas de modules ES, bloqués en `file://`), aucune bibliothèque externe.
- Une seule page (`index.html`) ; navigation par l'adresse : `index.html#/arguments?filtre=ch-1913`.
- Les scripts sont chargés dans cet ordre (chacun utilise les précédents) :
  - `js/utils.js` : outils (`U.esc`, `U.norm`, `U.md`, `U.uid`...), notifications `toast()`, fenêtres `Modal`, `confirmer()`, `demanderTexte()`, registre `Vues`.
  - `js/pays.js` : listes d'acteurs (`PAYS_ACTUELS`, `ENTITES_HISTORIQUES`, `ORGANISATIONS`, `PAYS_ALIAS`) et objet `Pays`.
  - `js/demo.js` : thème et chapitres initiaux + 7 arguments de démonstration (`demo: true`).
  - `js/stockage.js` : objet `Stockage` (chargement, `modifier(fn)`, export, import, fusion, suppression de la démo).
  - `js/composants.js` : `ChampEtiquettes`, `ChampPays`, `ChampMotsCles`, `ArbreRattachements`, `optionsFiltreThemes`.
  - Pages : `tableau.js`, `themes.js`, `arguments.js`, `sauvegarde.js`, `reglages.js`. Chaque page s'enregistre dans `Vues.<nom> = { rendre(el, params, opts) }`.
  - `js/app.js` : démarrage, navigation, bandeau de rappel de sauvegarde. Les pages pas encore construites sont listées dans `PAGES_A_VENIR`.
- Réorganisation des thèmes et chapitres animée (technique FLIP dans `Vues.themes.animer`, attribut `data-anim-id`), désactivée si Windows demande de réduire les animations.
- Chaque affichage de page part d'un bloc HTML neuf (`App.nouvellePage()`), pour éviter d'accumuler les écouteurs d'événements.
- Toute modification de données passe par `Stockage.modifier(d => ...)`, qui enregistre et incrémente le compteur de modifications (rappel de sauvegarde).

## Format des données (localStorage, clé `geopo-revision-donnees`)

```js
{
  version: 1,
  themes: [{ id, nom, chapitres: [{ id, nom }] }],
  arguments: [{
    id, idee, explication,
    exemples: [{ mesure, chiffre, date, source }],
    citations: [{ texte, auteur, contexte }],
    rattachements: [idThemeOuChapitre],   // un argument peut être rattaché à un thème entier ou à des chapitres
    motsCles: [texte], pays: [nomActeur], dates: [{ date, libelle }],
    demo?: true, creeLe, modifieLe          // dates ISO
  }],
  flashcards: [],   // étape 3 (prévu : { id, recto, verso, rattachement, argumentId?, demo?, sm2..., creeLe, modifieLe })
  plans: [],        // étape 4
  stats: {},        // étape 3
  paysPerso: [{ nom }],
  reglages: { theme: 'sombre'|'clair', taille: 'normal'|'grand', nouvellesParJour: 20, heureChangementJour: 4 },
  meta: { creeLe, derniereSauvegarde, modifsDepuisSauvegarde }
}
```

Fichier de sauvegarde exporté : `{ format: "geopo-sauvegarde", version: 1, exporteLe, donnees: {...} }`.
Fusion : ajout des éléments absents (par `id`), et pour les éléments présents des deux côtés, la version au `modifieLe` le plus récent l'emporte.

Format d'import prévu pour l'étape 2 (validé) : `{ format: "geopo-import", version: 1, arguments: [...], flashcards: [...] }`, avec les chapitres désignés **par leur nom** (champ `chapitres`), et un choix d'association si un nom est inconnu.

## Sauvegarde automatique (ajoutée après l'étape 1, validée : option A avec OneDrive)

- `js/autosauvegarde.js` : l'utilisateur choisit un dossier une fois (`showDirectoryPicker`, fonctionne en `file://` sous Chrome et Edge). Le dossier est mémorisé dans IndexedDB (base `geopo-revision`, magasin `reglages`, clé `dossier-sauvegarde`).
- 3 secondes après chaque `Stockage.modifier`, le fichier `geopo-sauvegarde-auto.json` est réécrit (même format que l'export manuel). Écriture immédiate si l'onglet est caché ou fermé.
- Copie de secours : `secours/geopo-secours-AAAA-MM-JJ.json`, une par jour (état à la première écriture du jour), 7 gardées.
- États : `non-supportee`, `inactive`, `pause` (Chrome redemande l'autorisation à chaque ouverture : bouton « Reprendre »), `active`, `erreur`. Message bref dans le menu (`#etat-auto`) et bandeau en cas de pause ou d'erreur.
- Le bandeau « Pense à sauvegarder » ne s'affiche plus quand la sauvegarde auto est active. Le bouton « Sauvegarder maintenant » du menu met à jour le fichier auto (ou télécharge un fichier si la sauvegarde auto n'est pas activée).
- Pièges JavaScript à retenir : les objets déclarés avec `const` (App, AutoSauvegarde...) ne sont pas accessibles via `window.X` ; tester avec `typeof X !== 'undefined'`.
- Test : le dossier virtuel du navigateur (OPFS) n'existe pas en `file://`, donc les tests automatiques passent par un petit serveur local (`python3 -m http.server`).

## Prochaine étape

**Étape 2 : page Importer et prompt modèle.**
- Coller du JSON, vérifier le format, afficher un aperçu avec cases à cocher, erreurs en rouge, doublons en orange (ressemblance de l'idée principale ou du recto), puis importer la sélection.
- Associer les noms de chapitres inconnus à un chapitre existant ou en créer un.
- Prompt modèle avec bouton Copier, qui intègre automatiquement la liste à jour des thèmes et chapitres.
