# Géopo Révision : suivi d'avancement

Site personnel de révision de géopolitique (prépa ECG, option HGG) : banque d'arguments, flashcards avec répétition espacée, aide au plan de dissertation.
Ce fichier sert à reprendre le projet dans une nouvelle conversation : il résume ce qui est fait, les choix techniques et la suite.

## Comment ouvrir le site

1. Télécharger le dépôt (GitHub, branche `main`, bouton vert « Code » puis « Download ZIP ») et le décompresser.
2. Double-cliquer sur `index.html` (Chrome ou Edge recommandés).

Aucune installation, aucun serveur, aucune connexion Internet nécessaire.

## État des étapes

| Étape | Contenu | État |
|---|---|---|
| 1 | Structure, thèmes et chapitres, banque d'arguments, sauvegarde et export | ✅ Terminée et validée |
| 2 | Import JSON (vérification, aperçu, doublons) et prompt modèle pour Claude | ✅ Terminée et validée (testée avec un vrai cours) |
| 3 | Flashcards, génération depuis les arguments, SM-2, session du jour, tableau de bord | ✅ Terminée, en test par l'utilisateur |
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
- Le choix sombre / clair se fait uniquement dans Réglages (bouton retiré de la barre latérale à la demande de l'utilisateur).
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
  flashcards: [{
    id, recto, verso, rattachement,         // un seul id de thème ou de chapitre, ou null
    argumentId, cle,                        // lien vers l'argument d'origine et clé anti-doublon (cartes générées)
    source: 'manuel'|'argument'|'import', demo?,
    sr: { intervalle, facilite, repetitions, echeance: 'AAAA-MM-JJ'|null, echecs, revisions, derniereRevision },
    creeLe, modifieLe
  }],
  plans: [],        // étape 4
  stats: { jours: { 'AAAA-MM-JJ': { revues, reussies, nouvelles, secondes, themes: { idTheme: [revues, reussies] } } },
           sessions: [{ debut, fin, revues, reussies, filtre, type }] },   // 100 dernières séances
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

## Étape 2 : page Importer (`js/importer.js`)

- **Prompt modèle** généré par `Vues.importer.genererPrompt({ chapitre, flashcards })` : règles de fond (fidélité au cours, compléments marqués « à vérifier », un argument = une idée en une phrase + 4 à 8 phrases d'explication), règles par champ, liste des noms d'acteurs historiques / organisations / grands ensembles tirée de `pays.js`, liste à jour des thèmes et chapitres, exemple JSON valide. Options : chapitre ciblé, flashcards oui/non. Bouton Copier (presse-papiers, avec une méthode de secours).
- **Lecture du JSON** (`lireJson`) : retrouve le bloc ```json dans une réponse complète, garde le texte de la première { à la dernière }, corrige automatiquement les virgules en trop et les guillemets typographiques, sinon message clair avec la ligne fautive.
- **Format d'import** :
  ```json
  { "format": "geopo-import", "version": 1,
    "arguments": [{ "idee", "explication", "exemples": [{ "mesure", "chiffre", "date", "source" }],
                    "citations": [{ "texte", "auteur", "contexte" }], "chapitres": ["nom"],
                    "motsCles": [], "pays": [], "dates": [{ "date", "libelle" }] }],
    "flashcards": [{ "recto", "verso", "chapitre": "nom" }] }
  ```
  Tolérances : `motsCles`, `pays` et `chapitres` acceptent un texte séparé par des virgules ; les sous-éléments incomplets sont ignorés avec un avertissement ; les guillemets autour des citations sont retirés.
- **Vérification** : erreurs bloquantes (idée vide, recto ou verso vide, mauvais type) en rouge ; doublons possibles en orange, décochés par défaut (ressemblance des mots significatifs ≥ 0,7 pour l'idée, ≥ 0,85 pour le recto, avec la banque et dans le même import) ; pays reconnus par nom ou alias (« USA » → « États-Unis »), inconnus ajoutés aux acteurs personnalisés.
- **Chapitres inconnus** : un choix par nom (associer à un thème ou chapitre existant, créer le chapitre dans un thème, créer un nouveau thème, ignorer). Par défaut : le chapitre le plus ressemblant (≥ 0,5), sinon création dans le dernier thème.
- **Import** : les éléments reçoivent `source: 'import'`. Les flashcards sont stockées dès maintenant sous la forme `{ id, recto, verso, rattachement, argumentId: null, source, creeLe, modifieLe }` ; les champs de répétition espacée seront ajoutés à l'étape 3 (prévoir des valeurs par défaut dans `Stockage.completer`).

## Étape 3 : flashcards et répétition espacée

- `js/sm2.js` (`Revision`) : jour logique (changement à `heureChangementJour`, 4 h par défaut), algorithme SM-2 adapté :
  - À revoir : facilité − 0,2, répétitions remises à 0, la carte revient 3 cartes plus loin dans la séance (échéance = aujourd'hui) ;
  - 1re réussite : 1 j (Facile : 4 j) ; 2e : Difficile 3 j, Bien 6 j, Facile 10 j ; ensuite intervalle × 1,2 (Difficile), × facilité (Bien), × facilité × 1,3 (Facile) ;
  - facilité : Difficile − 0,15, Facile + 0,15, minimum 1,3 ; ± 5 % de hasard au-delà de 7 jours ; maximum 10 ans ;
  - carte maîtrisée si intervalle ≥ 21 jours (`SEUIL_MAITRISE`).
- `js/stats.js` (`Stats`) : résumé par jour (seule la première réponse à une carte dans une séance compte pour la réussite), séances, série de jours (le jour en cours ne casse pas la série tant qu'il n'est pas fini), réussite sur 30 jours globale et par thème.
- `js/flashcards.js` : outils `Flashcards` (`fileDuJour(filtre)` = cartes dues + nouvelles dans la limite quotidienne, `propositions(arg)`, `ouvrirGeneration`, `ouvrirFormulaire`, `ouvrirFiche`) et page `Vues.flashcards` (filtres thème, état, origine, recherche, argument ; affichage par 100).
- Génération depuis un argument (bouton dans la fiche d'un argument) : citation → auteur, auteur → citation (« de » / « d' » selon l'initiale), chiffre → « mesure (date) ? », date → événement (décoché par défaut). Textes modifiables avant création, clé anti-doublon, chapitre de rangement au choix.
- `js/reviser.js` : accueil (filtre par thème, compteurs, série), séance (dues mélangées, une nouvelle toutes les 3 cartes), raccourcis Espace/Entrée puis 1 à 4, aperçu de l'intervalle sur chaque bouton, « Voir l'argument » et « Modifier la carte » après la réponse, fin de séance avec bilan. Options si rien à réviser : réviser en avance (20 cartes), 10 nouvelles cartes de plus.
- Tableau de bord : tuiles (à réviser, série, maîtrisées, réussite 30 j), histogramme 30 jours (une seule série, info-bulle par jour, version tableau), tableau par thème, dernières séances, contenu de la banque.
- Menu : pastille avec le nombre de cartes à réviser (`App.majBadgeReviser`).
- Réglages : nouvelles cartes par jour, heure de changement de jour, effacement des statistiques.
- Démo : 27 flashcards générées une seule fois à partir des arguments de démo (`meta.cartesDemoAjoutees`).
- Supprimer un argument supprime aussi les flashcards générées à partir de lui (message dans la confirmation).

## Organisation Git

- Claude travaille sur la branche `claude/awesome-archimedes-mqnv5u`. L'utilisateur fusionne dans `main` (pull request) à chaque étape validée ; les étapes 1 et 2 sont fusionnées (PR n°1).
- Après une fusion, repartir de `origin/main` avant de continuer.

## Import par le dépôt (en plus du copier-coller)

- L'utilisateur dépose ses photos dans `cours/<chapitre>/` (dépôt public, il est d'accord).
- Quand il demande « Traite les photos de `cours/xxx` » : lire les photos, produire `imports/xxx.json` au format `geopo-import` en appliquant **exactement les règles du prompt modèle** (`Vues.importer.genererPrompt` dans `js/importer.js`, noms de chapitres actuels du thème, noms d'acteurs de `pays.js`), vérifier le fichier avec la page Importer (test Playwright), puis signaler les passages illisibles et les compléments à vérifier.
- Les noms de chapitres réels de l'utilisateur sont dans son navigateur, pas dans le dépôt : utiliser ceux de `js/demo.js` et ceux qu'il indique dans la conversation ; les noms inconnus seront de toute façon associés par la page Importer.
- L'utilisateur charge le fichier avec « 📂 Charger un fichier » (page Importer).

## Évolution future prévue

Rendre le site accessible à d'autres utilisateurs, chacun avec sa propre sauvegarde. Piste naturelle : publier le site avec GitHub Pages. Les données restent dans le navigateur de chaque visiteur, donc chacun a déjà ses propres données ; la sauvegarde automatique fonctionne aussi en https. Le contenu de démo et le thème initial (`js/demo.js`) devront alors être pensés pour un nouvel utilisateur.

## Prochaine étape

**Étape 4 : aide au plan de dissertation.**
- Saisie d'un sujet ; recherche dans la banque par pertinence (mots-clés, chapitres, texte, accents ignorés, liste de synonymes modifiable : Chine ~ chinois, Pékin, RPC).
- Construction d'un plan en I / II / III avec sous-parties, en y rangeant les arguments choisis.
- Sauvegarde des plans (`plans`), consultation ultérieure, export : copier (texte), fichier `.txt`, impression / PDF, avec exemples et citations.
