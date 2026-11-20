/* =========================================================
   demo.js : contenu de départ
   - la structure de ton programme (thème + chapitres) : elle
     t'appartient et reste en place ;
   - des arguments de DÉMONSTRATION (marqués demo: true), que
     tu peux supprimer en un clic (page Sauvegarde ou bandeau
     du tableau de bord).
   ========================================================= */

const Demo = {
  themesInitiaux() {
    return [
      {
        id: 'th-mutations',
        nom: 'Les grandes mutations du monde de 1913 à nos jours',
        chapitres: [
          { id: 'ch-1913', nom: 'Le tableau géopolitique du monde en 1913' },
          { id: 'ch-1939', nom: 'Le tableau géopolitique du monde en 1939' },
          { id: 'ch-1945', nom: 'Le tableau géopolitique du monde en 1945' },
          { id: 'ch-gf', nom: 'Géopolitique de la guerre froide et de la décolonisation' },
        ],
      },
    ];
  },

  argumentsDemo() {
    const maintenant = new Date().toISOString();
    const args = [
      {
        idee: "En 1913, l'Europe domine le monde par son économie, ses empires coloniaux et son rayonnement culturel.",
        explication: "L'Europe est le **centre du monde** à la veille de la Première Guerre mondiale.\n\n- Puissance économique : berceau de la révolution industrielle, elle concentre l'industrie, les capitaux et le commerce mondial (Londres est la première place financière).\n- Puissance politique : les empires coloniaux couvrent une grande partie de l'Afrique et de l'Asie.\n- Puissance culturelle : diffusion des langues, des modèles politiques et d'une idée de « mission civilisatrice ».\n\nCette domination est pourtant déjà **concurrencée** (États-Unis, Japon) et minée par les rivalités entre Européens.",
        exemples: [
          { mesure: "Part du Royaume-Uni, de l'Allemagne et de la France dans la production manufacturière mondiale", chiffre: 'environ 35 %', date: '1913', source: 'Paul Bairoch' },
          { mesure: "Population de l'Empire britannique", chiffre: "environ 400 millions d'habitants, près d'un quart de l'humanité", date: '1913', source: 'estimations d\'Angus Maddison' },
        ],
        citations: [
          { texte: "Il faut dire ouvertement qu'en effet les races supérieures ont un droit vis-à-vis des races inférieures.", auteur: 'Jules Ferry', contexte: 'Discours à la Chambre des députés, 28 juillet 1885' },
          { texte: "Reprenez le fardeau de l'homme blanc.", auteur: 'Rudyard Kipling', contexte: "Poème « Le fardeau de l'homme blanc », 1899" },
        ],
        rattachements: ['ch-1913'],
        motsCles: ['impérialisme', 'colonisation', 'puissance', 'Europe'],
        pays: ['Royaume-Uni', 'France', 'Empire allemand', 'Empire britannique', 'Empire colonial français'],
        dates: [{ date: '1884-1885', libelle: "Conférence de Berlin : partage de l'Afrique entre Européens" }],
      },
      {
        idee: 'Dès 1913, les États-Unis sont la première puissance économique mondiale, mais ils restent en retrait de la scène diplomatique.',
        explication: "Les États-Unis dépassent le Royaume-Uni dès la fin du XIXe siècle par leur production industrielle. Pourtant, leur politique étrangère reste centrée sur le continent américain (**doctrine Monroe**, politique du « gros bâton » en Amérique latine).\n\nAprès 1918, malgré le rôle du président Wilson dans la création de la SDN, le Sénat refuse de ratifier le traité de Versailles : c'est le retour à **l'isolationnisme**, qui dure jusqu'à 1941.",
        exemples: [
          { mesure: 'Part des États-Unis dans la production manufacturière mondiale', chiffre: '32 %', date: '1913', source: 'Paul Bairoch' },
        ],
        citations: [
          { texte: 'Parlez doucement et portez un gros bâton, vous irez loin.', auteur: 'Theodore Roosevelt', contexte: 'Proverbe repris dans un discours, 1901 (politique du « Big Stick »)' },
        ],
        rattachements: ['ch-1913', 'ch-1939'],
        motsCles: ['isolationnisme', 'puissance économique', 'doctrine Monroe'],
        pays: ['États-Unis', 'Amérique latine'],
        dates: [
          { date: '1823', libelle: 'Doctrine Monroe' },
          { date: '1898', libelle: 'Guerre hispano-américaine' },
          { date: '1919-1920', libelle: 'Le Sénat américain refuse de ratifier le traité de Versailles' },
        ],
      },
      {
        idee: "L'Europe de 1913 est une poudrière : deux systèmes d'alliances rivaux et des nationalismes exacerbés, surtout dans les Balkans.",
        explication: "Deux blocs se font face : la **Triple Alliance** (Allemagne, Autriche-Hongrie, Italie) et la **Triple Entente** (France, Royaume-Uni, Russie). La course aux armements et les crises successives (crises marocaines, guerres balkaniques) tendent les relations.\n\nLes Balkans, où reculent l'Empire ottoman et où s'opposent les ambitions russes et austro-hongroises, sont le point de friction principal : l'attentat de Sarajevo y déclenche la guerre.",
        exemples: [
          { mesure: 'Durée du service militaire en France après la « loi des trois ans »', chiffre: '3 ans', date: '1913', source: 'loi du 7 août 1913' },
        ],
        citations: [
          { texte: "La prochaine guerre européenne éclatera à cause d'une bêtise dans les Balkans.", auteur: 'Otto von Bismarck', contexte: 'Propos attribué, fin du XIXe siècle' },
        ],
        rattachements: ['ch-1913'],
        motsCles: ['alliances', 'nationalismes', 'Balkans', 'course aux armements'],
        pays: ['Empire allemand', 'Autriche-Hongrie', 'Empire russe', 'France', 'Royaume-Uni', 'Serbie', 'Balkans', 'Triple Alliance', 'Triple Entente'],
        dates: [
          { date: '1882', libelle: 'Triple Alliance' },
          { date: '1907', libelle: 'Triple Entente' },
          { date: '1912-1913', libelle: 'Guerres balkaniques' },
          { date: '28 juin 1914', libelle: 'Attentat de Sarajevo' },
        ],
      },
      {
        idee: "En 1939, les régimes totalitaires détruisent l'ordre de Versailles face à des démocraties qui choisissent l'apaisement.",
        explication: "La crise de 1929 fragilise les démocraties et favorise les régimes autoritaires. L'Allemagne nazie, l'Italie fasciste et le Japon militariste quittent la SDN et multiplient les coups de force.\n\nLa France et le Royaume-Uni, traumatisés par 1914-1918, pratiquent **l'apaisement** jusqu'aux accords de Munich. Le pacte germano-soviétique ouvre la voie à l'invasion de la Pologne.",
        exemples: [
          { mesure: 'Nombre de chômeurs en Allemagne', chiffre: 'environ 6 millions', date: '1932', source: 'statistiques officielles allemandes' },
        ],
        citations: [
          { texte: "Vous aviez le choix entre la guerre et le déshonneur. Vous avez choisi le déshonneur et vous aurez la guerre.", auteur: 'Winston Churchill', contexte: 'Propos attribué, après les accords de Munich (1938)' },
        ],
        rattachements: ['ch-1939'],
        motsCles: ['totalitarisme', 'apaisement', 'SDN', 'Munich'],
        pays: ['IIIe Reich', 'Italie', 'Empire du Japon', 'URSS', 'France', 'Royaume-Uni', 'Société des Nations (SDN)', 'Tchécoslovaquie'],
        dates: [
          { date: '7 mars 1936', libelle: 'Remilitarisation de la Rhénanie' },
          { date: '12 mars 1938', libelle: 'Anschluss' },
          { date: '30 septembre 1938', libelle: 'Accords de Munich' },
          { date: '23 août 1939', libelle: 'Pacte germano-soviétique' },
          { date: '1er septembre 1939', libelle: 'Invasion de la Pologne' },
        ],
      },
      {
        idee: "En 1945, l'Europe est ruinée et le monde devient bipolaire, dominé par les États-Unis et l'URSS.",
        explication: "La Seconde Guerre mondiale est la plus meurtrière de l'histoire. L'Europe sort **détruite et affaiblie**, tandis que deux puissances s'imposent :\n\n- les États-Unis, intacts sur leur territoire, détenteurs de la bombe atomique et de la moitié de la production industrielle mondiale ;\n- l'URSS, saignée mais victorieuse, qui occupe l'Europe de l'Est.\n\nUn nouvel ordre est pensé (ONU, Bretton Woods), mais les désaccords entre vainqueurs mènent vite à la guerre froide.",
        exemples: [
          { mesure: 'Nombre de morts de la Seconde Guerre mondiale', chiffre: 'entre 60 et 70 millions', date: '1939-1945', source: 'estimations des historiens' },
          { mesure: "Nombre de morts soviétiques", chiffre: 'environ 26 millions', date: '1941-1945', source: 'estimations des historiens' },
          { mesure: 'Part des États-Unis dans la production industrielle mondiale', chiffre: 'environ la moitié', date: '1945', source: 'estimations courantes' },
        ],
        citations: [
          { texte: "De Stettin dans la Baltique jusqu'à Trieste dans l'Adriatique, un rideau de fer est descendu à travers le continent.", auteur: 'Winston Churchill', contexte: 'Discours de Fulton (États-Unis), 5 mars 1946' },
        ],
        rattachements: ['ch-1945', 'ch-gf'],
        motsCles: ['bipolarisation', 'superpuissances', 'ONU', 'reconstruction'],
        pays: ['États-Unis', 'URSS', 'Organisation des Nations unies (ONU)', 'Europe occidentale', "Europe de l'Est"],
        dates: [
          { date: 'juillet 1944', libelle: 'Accords de Bretton Woods' },
          { date: 'février 1945', libelle: 'Conférence de Yalta' },
          { date: '26 juin 1945', libelle: "Signature de la Charte des Nations unies à San Francisco" },
          { date: 'août 1945', libelle: 'Bombardements atomiques sur Hiroshima et Nagasaki' },
        ],
      },
      {
        idee: 'La guerre froide est un affrontement indirect : la dissuasion nucléaire empêche la guerre directe et déplace les tensions vers des crises et des conflits périphériques.',
        explication: "Les deux Grands ne s'affrontent jamais directement. Leur rivalité prend la forme de **crises** (Berlin, Cuba) et de **guerres par alliés interposés** (Corée, Viêt Nam, Afghanistan).\n\nLa possession de l'arme nucléaire par les deux camps (URSS en 1949) rend une guerre totale suicidaire : c'est l'équilibre de la terreur.",
        exemples: [
          { mesure: 'Fret acheminé par le pont aérien vers Berlin-Ouest', chiffre: 'environ 2,3 millions de tonnes', date: 'juin 1948 - mai 1949', source: 'US Air Force' },
        ],
        citations: [
          { texte: 'Paix impossible, guerre improbable.', auteur: 'Raymond Aron', contexte: 'Le Grand Schisme, 1948' },
        ],
        rattachements: ['ch-gf'],
        motsCles: ['guerre froide', 'dissuasion nucléaire', 'crises', 'bipolarisation'],
        pays: ['États-Unis', 'URSS', 'RFA', 'RDA', 'Cuba', 'Corée du Nord', 'Corée du Sud', 'OTAN', 'Pacte de Varsovie'],
        dates: [
          { date: '1948-1949', libelle: 'Blocus de Berlin' },
          { date: '1950-1953', libelle: 'Guerre de Corée' },
          { date: 'octobre 1962', libelle: 'Crise des missiles de Cuba' },
        ],
      },
      {
        idee: "La décolonisation est accélérée par la Seconde Guerre mondiale et donne naissance au Tiers-Monde, qui cherche à exister entre les deux blocs.",
        explication: "La guerre affaiblit les métropoles et ruine leur prestige. Les deux Grands et l'ONU se déclarent anticolonialistes.\n\nLa décolonisation se fait par la **négociation** (Inde) ou par la **guerre** (Indochine, Algérie). Les nouveaux États affirment leur voix à **Bandung** (1955), puis dans le mouvement des non-alignés.",
        exemples: [
          { mesure: 'Nombre de pays africains et asiatiques réunis à la conférence de Bandung', chiffre: '29', date: 'avril 1955', source: 'Conférence de Bandung' },
          { mesure: "Nombre d'États africains devenus indépendants en 1960, « l'année de l'Afrique »", chiffre: '17', date: '1960', source: 'ONU' },
        ],
        citations: [
          { texte: "Au douzième coup de minuit, alors que le monde dort, l'Inde s'éveillera à la vie et à la liberté.", auteur: 'Jawaharlal Nehru', contexte: "Discours « Tryst with Destiny », 14-15 août 1947" },
        ],
        rattachements: ['ch-gf'],
        motsCles: ['décolonisation', 'Tiers-Monde', 'non-alignement', 'Bandung'],
        pays: ['Inde', 'Raj britannique', 'Indochine française', 'Algérie française', 'Indonésie', 'Tiers-Monde', 'Mouvement des non-alignés'],
        dates: [
          { date: '15 août 1947', libelle: "Indépendance de l'Inde" },
          { date: '7 mai 1954', libelle: 'Défaite française à Diên Biên Phu' },
          { date: 'avril 1955', libelle: 'Conférence de Bandung' },
          { date: '18 mars 1962', libelle: "Accords d'Évian : indépendance de l'Algérie" },
        ],
      },
    ];
    return args.map((a, i) => ({
      id: 'demo-arg-' + (i + 1),
      demo: true,
      creeLe: maintenant,
      modifieLe: maintenant,
      ...a,
    }));
  },
};
