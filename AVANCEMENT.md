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
| 3 | Flashcards, génération depuis les arguments, SM-2, session du jour, tableau de bord | ✅ Terminée et fusionnée (PR n°2) ; ajout du choix mélangé / dans l'ordre |
| 4 | Aide au plan de dissertation (recherche par pertinence, plan I/II/III, export) | ✅ Terminée, à valider par l'utilisateur |
| 5 | Bonus : mode colle, chronologie (la frise graphique a été abandonnée), carte du monde | ✅ Construite ; chronologie, révision par type de cartes et carte à valider par l'utilisateur |

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
  - Pages : `tableau.js`, `themes.js`, `arguments.js`, `flashcards.js`, `reviser.js`, `sauvegarde.js`, `reglages.js`, `importer.js`, `plans.js`, `colle.js`, `chronologie.js`, `carte.js` (précédé de `carte-donnees.js`). Chaque page s'enregistre dans `Vues.<nom> = { rendre(el, params, opts) }`.
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
  sujetsColle: [{ id, texte, rattachement, demo?, creeLe, modifieLe }],   // étape 5
  colles: [{ id, sujet, sujetId, planId, rattachement, date, dureePrepa, dureeOral, tempsPrepa, tempsOral,
             brouillon, note, commentaire, argumentsProposes: [], argumentsUtilises: [], creeLe, modifieLe }],  // 200 dernières
  plans: [{ id, sujet, problematique, introduction, conclusion,
           parties: [{ id, titre, sousParties: [{ id, titre, notes, argumentIds: [] }] }], creeLe, modifieLe }],
  synonymes: ["Chine, chinois, Pékin, RPC", ...],   // une ligne = un groupe de mots équivalents
  stats: { jours: { 'AAAA-MM-JJ': { revues, reussies, nouvelles, secondes, themes: { idTheme: [revues, reussies] } } },
           sessions: [{ debut, fin, revues, reussies, filtre, type }] },   // 100 dernières séances
  paysPerso: [{ nom }],
  reglages: { theme: 'sombre'|'clair', taille: 'normal'|'grand', nouvellesParJour: 20, heureChangementJour: 4,
              ordreRevision: 'melange'|'ordre', collePrepa: 20, colleOral: 10 },
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
- `js/reviser.js` : accueil (filtre par thème, choix de l'ordre, compteurs, série), séance rangée selon `reglages.ordreRevision` : `'melange'` (par défaut, tirage au hasard de toutes les cartes de la séance) ou `'ordre'` (chapitre par chapitre selon la page Thèmes, puis ordre de création / d'import) ; choix aussi dans Réglages. Les nouvelles cartes du jour restent les plus anciennes (limite quotidienne), seul leur ordre de passage change, raccourcis Espace/Entrée puis 1 à 4, aperçu de l'intervalle sur chaque bouton, « Voir l'argument » et « Modifier la carte » après la réponse, fin de séance avec bilan. Options si rien à réviser : réviser en avance (20 cartes), 10 nouvelles cartes de plus.
- Tableau de bord : tuiles (à réviser, série, maîtrisées, réussite 30 j), histogramme 30 jours (une seule série, info-bulle par jour, version tableau), tableau par thème, dernières séances, contenu de la banque.
- Menu : pastille avec le nombre de cartes à réviser (`App.majBadgeReviser`).
- Réglages : nouvelles cartes par jour, heure de changement de jour, effacement des statistiques.
- Démo : 27 flashcards générées une seule fois à partir des arguments de démo (`meta.cartesDemoAjoutees`).
- Supprimer un argument supprime aussi les flashcards générées à partir de lui (message dans la confirmation).

## Organisation Git

- Claude travaille sur la branche `claude/awesome-archimedes-mqnv5u`. L'utilisateur fusionne dans `main` (pull request) à chaque étape validée ; les étapes 1 et 2 sont fusionnées (PR n°1).
- Après une fusion, repartir de `origin/main` avant de continuer.
- Étape 4 : faite directement dans le dossier décompressé du ZIP sur le PC de l'utilisateur (`OneDrive/Bureau/.../GEOPO/Site/Geopo_test-main`, pas un dépôt Git). Fichiers à envoyer sur GitHub : `js/plans.js` (nouveau), `index.html`, `css/style.css`, `js/app.js`, `js/arguments.js`, `js/demo.js`, `js/stockage.js`, `AVANCEMENT.md`.

## Import par le dépôt (en plus du copier-coller)

- L'utilisateur dépose ses photos dans `cours/<chapitre>/` (dépôt public, il est d'accord).
- Quand il demande « Traite les photos de `cours/xxx` » : lire les photos, produire `imports/xxx.json` au format `geopo-import` en appliquant **exactement les règles du prompt modèle** (`Vues.importer.genererPrompt` dans `js/importer.js`, noms de chapitres actuels du thème, noms d'acteurs de `pays.js`), vérifier le fichier avec la page Importer (test Playwright), puis signaler les passages illisibles et les compléments à vérifier.
- Les noms de chapitres réels de l'utilisateur sont dans son navigateur, pas dans le dépôt : utiliser ceux de `js/demo.js` et ceux qu'il indique dans la conversation ; les noms inconnus seront de toute façon associés par la page Importer.
- L'utilisateur charge le fichier avec « 📂 Charger un fichier » (page Importer).

## Évolution future prévue

Rendre le site accessible à d'autres utilisateurs, chacun avec sa propre sauvegarde. Piste naturelle : publier le site avec GitHub Pages. Les données restent dans le navigateur de chaque visiteur, donc chacun a déjà ses propres données ; la sauvegarde automatique fonctionne aussi en https. Le contenu de démo et le thème initial (`js/demo.js`) devront alors être pensés pour un nouvel utilisateur.

## Étape 4 : plans de dissertation (`js/plans.js`)

- **Recherche par pertinence** (`Pertinence.rechercher(sujet, { theme })`) :
  - mots normalisés (accents et majuscules ignorés), mots vides retirés, racine simple (pluriels, -isme, -ique, -ation...) et correspondance par début de mot pour les mots d'au moins 5 lettres ;
  - groupes de synonymes (`donnees.synonymes`, une ligne = un groupe, modifiable via le bouton « Synonymes de recherche » de la liste des plans, ou « 🔤 Synonymes » dans la colonne de recherche de l'éditeur) ; les expressions de plusieurs mots (« guerre froide ») sont reconnues en premier ;
  - poids par champ : idée 3, mots-clés 3, pays (avec alias de `pays.js`) 2,5, nom du chapitre ou thème 2, explication / citations / exemples / dates 1 ; une notion rare dans la banque compte plus (log(1 + N / nb d'arguments qui la contiennent)) ; bonus si l'argument couvre plusieurs notions du sujet ;
  - deux années ou plus dans le sujet = une période (« 1945-1991 ») : bonus si l'argument cite une année dans la période, léger malus s'il ne cite que des années hors période.
- **Page Plans** : liste des plans (dupliquer, supprimer), éditeur `#/plans?id=...` :
  - sujet, problématique, introduction et conclusion (notes), parties I, II, III... avec sous-parties A, B... (titre + notes) ; 3 parties de 2 sous-parties au départ ; flèches pour réordonner, ✕ pour retirer (confirmation si non vide) ;
  - colonne de droite : arguments classés par pertinence (jauge, notions trouvées, « ✓ I.A » si déjà placé), recherche pour affiner, filtre par thème, option « masquer les arguments déjà placés » ;
  - ajout par le bouton ＋ (dans la sous-partie active, bordure dorée, choisie d'un clic) ou par glisser-déposer ; les arguments placés se déplacent par glisser-déposer ou flèches (au bord d'une sous-partie, la flèche le fait passer dans la voisine) ; clic sur l'idée = fiche de l'argument ;
  - enregistrement automatique (0,7 s après la frappe, immédiat pour les changements de structure, et à la fermeture de l'onglet).
- **Export** : aperçu texte avec options (exemples et citations, explications, notes), bouton Copier, fichier `.txt`, Imprimer / PDF (zone `#impression` + classe `html.impression` et styles `@media print`).
- Supprimer un argument le retire aussi des plans (signalé dans la confirmation).
- Tests : le navigateur intégré de Claude n'ouvre pas les `file://` ; tests faits avec un petit serveur PowerShell (`HttpListener`) car ni Python ni Node ne sont installés sur ce PC.

## Étape 5 : bonus

Décisions validées : ordre mode colle, puis frise, puis carte, avec une validation de l'utilisateur entre chaque.

### Mode colle (`js/colle.js`, page `#/colle`, menu « 🎤 Colle ») : fait

- **Sujets** : liste `donnees.sujetsColle` rangée par thème ou chapitre (ajout d'un sujet, ou « Ajouter plusieurs sujets » : un par ligne, numéros et tirets retirés, doublons ignorés), avec en plus les sujets des plans (option cochée par défaut). Un plan correspond à un chapitre s'il contient au moins un argument de ce chapitre. 5 sujets de démo (`demo: true`, retirés avec la démo ; ajoutés aux données existantes seulement si la démo est encore là).
- **Tirage** : au hasard parmi les sujets jamais tirés, sinon parmi la moitié tirée il y a le plus longtemps ; bouton « Un autre sujet » ; bouton ▶️ dans la liste pour choisir un sujet précis.
- **Déroulé** : préparation 20 min puis oral 10 min par défaut (`reglages.collePrepa` / `colleOral`, réglables sur la page ; 0 = pas de compte à rebours, le temps passé est seulement mesuré). Minuteur basé sur l'heure réelle (juste même si on change de page), pause, orange à moins d'1 min, rouge avec « +0:40 » en cas de dépassement, trois bips (Web Audio, sans fichier) et une notification à la fin du temps. Brouillon pendant la préparation et l'oral. La colle en cours est gardée si on change de page (comme la séance de révision).
- **Correction** : les 12 arguments les plus pertinents (`Pertinence.rechercher` de l'étape 4), dépliables (explication, exemples, citations), case « utilisé » pour chacun, note sur 20 facultative (virgule acceptée), commentaire, brouillon.
- **Historique** (`donnees.colles`, 200 dernières) : nombre de colles, moyenne, 15 dernières ; clic = détail (arguments utilisés et non utilisés, brouillon), « Repasser ce sujet », « En faire un plan » (crée un plan avec le brouillon en introduction et les arguments utilisés en I.A), suppression.
- « face » ajouté aux mots ignorés par la recherche par pertinence.
- Fichiers modifiés : `js/colle.js` (nouveau), `index.html`, `css/style.css`, `js/stockage.js`, `js/demo.js`, `js/plans.js`, `AVANCEMENT.md`.

### Chronologie (`js/chronologie.js`, page `#/chronologie`, menu « 🕰️ Chronologie ») : à valider

- **Frise graphique abandonnée** à la demande de l'utilisateur (les dates proches s'empilaient, peu lisible) : `js/frise.js` supprimé, on ne garde que la liste. Ne pas reproposer de frise horizontale.
- **Lecture des dates** (`Chrono.analyser(texte)` → `{ debut, fin, annee, periode }` en années décimales, ou `null`) : « 1913 », « 28 juin 1914 », « 1er septembre 1939 », « avril 1955 », « 28/06/1914 », « 1914-1918 », « 1914-18 », « 28 juin 1914 - 11 novembre 1918 », « de 1947 à 1991 », « du 6 juin au 25 août 1944 », « années 1960 ». Sans année sur 4 chiffres (« XIXe siècle »), la date est listée dans « dates non placées » avec un lien vers l'argument.
- **Événements** : les dates des arguments (champ `dates` seulement, pas les dates des exemples chiffrés) ; même date et même intitulé dans plusieurs arguments = un seul événement (« ×2 »). Couleur de la bordure selon le premier chapitre de l'argument (8 couleurs, ordre de la page Thèmes, variables `--chrono-1` à `--chrono-8` et classes `.c0` à `.c8` pour les deux modes), légende.
- **Filtres** : thème ou chapitre, pays ou acteur, recherche (intitulé, date ou idée de l'argument), années de / à. Adresse possible : `#/chronologie?filtre=ch-1913` ou `?pays=URSS`.
- **Liste** par décennie, liens vers les arguments ; mode entraînement « masquer les dates » (ordre mélangé, bouton « Date ? » pour vérifier, compteur, Remélanger, Tout dévoiler).

### Réviser par type de cartes (demandé par l'utilisateur) : à valider

- `TYPES_CARTE` (`js/flashcards.js`) : `date`, `citation`, `chiffre`, `autre` (« Notions et autres »). `Flashcards.type(carte)` : `carte.type` s'il a été choisi à la main, sinon la clé des cartes générées (`date|…`, `citation-auteur|…`, `citation-texte|…`, `chiffre|…`), sinon une estimation d'après le texte (`typeDevine` : « Qui a dit », guillemets, « Quand / En quelle année », réponse courte qui est une date lue par `Chrono`, « Combien », %, millions...).
- Page Réviser : cases « Types de cartes » (avec le nombre de cartes du jour par type), mémorisées dans `reglages.typesRevision` (`null` = tous). `Flashcards.correspond(carte, filtre, types)` et `fileDuJour(filtre, types)` prennent ce filtre ; il s'applique aussi à « Réviser en avance », « nouvelles cartes de plus » et « Continuer ». La pastille du menu compte toujours toutes les cartes.
- Formulaire d'une flashcard : liste « Type » (« Automatique (détecté : ...) » ou un type imposé). Page Flashcards : filtre « Type » et étiquette du type sur chaque carte.
- Import : champ facultatif `"type"` dans les flashcards (`date`, `citation`, `chiffre`, `autre`), demandé dans le prompt modèle.
- Fichiers modifiés depuis la version avec frise : `js/chronologie.js` (nouveau), `js/frise.js` (supprimé), `index.html`, `css/style.css`, `js/flashcards.js`, `js/reviser.js`, `js/stockage.js`, `js/importer.js`, `AVANCEMENT.md`.

### Carte du monde (`js/carte.js`, page `#/carte`, menu « 🗺️ Carte ») : à valider

- **Fond de carte** : `js/carte-donnees.js` (533 Ko, fichier généré, `CARTE_DONNEES`), issu de `countries-50m.json` du paquet `world-atlas` 2.0.2 (Natural Earth 1:50m, domaine public), téléchargé une fois avec l'accord de l'utilisateur. Le site fonctionne sans Internet. 196 pays aux noms de `pays.js` ; Antarctique retiré ; territoires dépendants et Sahara occidental en gris neutre, non cliquables. Rattachements : Somaliland → Somalie, Chypre du Nord → Chypre, Hong Kong et Macao → Chine. Tuvalu, absent du fond, est un simple point (`MONDE_SANS_CONTOUR`).
- **Dessin** : SVG, projection Natural Earth ; `couperAntimeridien` découpe à ±180° les contours qui traversent la ligne de changement de date (Russie, Fidji). Les très petits pays (moins de 4 unités) ont un point visible s'ils sont cités ou sélectionnés.
- **Couleurs** : une seule teinte, seuils fixes 0 / 1 / 2-3 / 4-7 / 8 et + (variables `--monde-*` pour chaque mode).
- **Comptage** (`compter`) : un argument compte une fois par pays ; une entité historique compte pour ses `actuels` (case à décocher) ; organisations, grands ensembles et acteurs personnalisés sont dans « Acteurs hors carte ».
- **Interactions** : filtre thème ou chapitre, info-bulle, clic sur un pays = ses arguments (avec « via URSS »...), classement des pays à droite, zoom (molette ou boutons, jusqu'à ×14), déplacement à la souris, « Montrer l'emprise de » une entité historique. Adresse possible : `#/carte?pays=France` ou `?filtre=ch-1913`.
- **Emprise** : affiche les pays actuels listés dans `ENTITES_HISTORIQUES` (`pays.js`), pas les frontières d'époque. Listes des empires complétées (ottoman, britannique, français, portugais) et nouveaux empires coloniaux espagnol, néerlandais, belge, italien et allemand.
- Fichiers modifiés : `js/carte.js` et `js/carte-donnees.js` (nouveaux), `index.html`, `css/style.css`, `AVANCEMENT.md`.

### Frontières historiques sur la carte (`js/carte-histoire.js`) : à valider

- **Source** : CShapes 2.0 (ETH Zurich, 1886-2019), licence **CC BY-NC-SA 4.0** : crédit affiché sous la carte, usage non commercial, partage dans les mêmes conditions. Téléchargée une fois avec l'accord de l'utilisateur.
- **Données** : `js/carte-frontieres.js` (485 Ko, fichier généré, `CARTE_FRONTIERES`), 710 unités datées, tracés simplifiés sans décaler les frontières communes. Chargé seulement au premier choix d'une date.
- **Table rédigée pour le site** (`HISTOIRE_UNITES`, `HISTOIRE_NOMS`, `HISTOIRE_EMPIRES`) : nom français selon l'époque, pays actuels, empire de rattachement à l'année près. CShapes ne donne pas le propriétaire des colonies : **table à relire**. Les dominions comptent dans l'Empire britannique jusqu'en 1931.
- **Page Carte** : curseur 1886-2019, dates repères (1886, 1913, 1919, 1939, 1945, 1962, 1991, Aujourd'hui), situation au 1er juillet, couleur par empire ou par nombre d'arguments, liste des empires et de leurs territoires, clic sur un territoire pour voir son statut et ses arguments.
- **Couleurs** : 8 empires ont une couleur fixe ; les autres sont groupés en « Autres empires » (gris) et restent identifiables par la liste et l'info-bulle.
- **Limites** : l'Anschluss et les occupations de 1939-1945 ne figurent pas dans CShapes (avertissement affiché pour 1938-1945). Pas de données après 2019 : « Aujourd'hui » utilise le fond Natural Earth.
- Fichiers modifiés : `js/carte-histoire.js` et `js/carte-frontieres.js` (nouveaux), `js/carte.js`, `js/pays.js`, `index.html`, `css/style.css`, `AVANCEMENT.md`.

## Prochaine étape

1. Validation de la chronologie, des types de cartes, de la carte et des frontières historiques par l'utilisateur.
2. Relecture de la table des empires dans `js/carte-histoire.js`.
