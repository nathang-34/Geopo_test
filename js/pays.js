/* =========================================================
   pays.js : liste des acteurs géopolitiques
   - pays actuels, regroupés par région
   - entités historiques (avec leurs dates et les pays actuels
     qui les composent, pour la future carte du monde)
   - organisations, alliances et grands ensembles régionaux
   Tu peux ajouter tes propres acteurs depuis le formulaire
   d'un argument (ils sont alors stockés dans tes données).
   ========================================================= */

const PAYS_ACTUELS = {
  'Europe': 'Albanie|Allemagne|Andorre|Autriche|Belgique|Biélorussie|Bosnie-Herzégovine|Bulgarie|Chypre|Croatie|Danemark|Espagne|Estonie|Finlande|France|Grèce|Hongrie|Irlande|Islande|Italie|Kosovo|Lettonie|Liechtenstein|Lituanie|Luxembourg|Macédoine du Nord|Malte|Moldavie|Monaco|Monténégro|Norvège|Pays-Bas|Pologne|Portugal|Roumanie|Royaume-Uni|Russie|Saint-Marin|Serbie|Slovaquie|Slovénie|Suède|Suisse|Tchéquie|Ukraine|Vatican',
  'Amériques': 'Antigua-et-Barbuda|Argentine|Bahamas|Barbade|Belize|Bolivie|Brésil|Canada|Chili|Colombie|Costa Rica|Cuba|Dominique|Équateur|États-Unis|Grenade|Guatemala|Guyana|Haïti|Honduras|Jamaïque|Mexique|Nicaragua|Panama|Paraguay|Pérou|République dominicaine|Saint-Christophe-et-Niévès|Sainte-Lucie|Saint-Vincent-et-les-Grenadines|Salvador|Suriname|Trinité-et-Tobago|Uruguay|Venezuela',
  'Moyen-Orient': 'Arabie saoudite|Bahreïn|Égypte|Émirats arabes unis|Irak|Iran|Israël|Jordanie|Koweït|Liban|Oman|Palestine|Qatar|Syrie|Turquie|Yémen',
  'Afrique': "Afrique du Sud|Algérie|Angola|Bénin|Botswana|Burkina Faso|Burundi|Cameroun|Cap-Vert|Centrafrique|Comores|Congo|Côte d'Ivoire|Djibouti|Érythrée|Eswatini|Éthiopie|Gabon|Gambie|Ghana|Guinée|Guinée-Bissau|Guinée équatoriale|Kenya|Lesotho|Libéria|Libye|Madagascar|Malawi|Mali|Maroc|Maurice|Mauritanie|Mozambique|Namibie|Niger|Nigeria|Ouganda|RDC|Rwanda|Sao Tomé-et-Principe|Sénégal|Seychelles|Sierra Leone|Somalie|Soudan|Soudan du Sud|Tanzanie|Tchad|Togo|Tunisie|Zambie|Zimbabwe",
  'Asie': 'Afghanistan|Arménie|Azerbaïdjan|Bangladesh|Bhoutan|Birmanie|Brunei|Cambodge|Chine|Corée du Nord|Corée du Sud|Géorgie|Inde|Indonésie|Japon|Kazakhstan|Kirghizistan|Laos|Malaisie|Maldives|Mongolie|Népal|Ouzbékistan|Pakistan|Philippines|Singapour|Sri Lanka|Tadjikistan|Taïwan|Thaïlande|Timor oriental|Turkménistan|Viêt Nam',
  'Océanie': 'Australie|Fidji|Kiribati|Îles Marshall|Micronésie|Nauru|Nouvelle-Zélande|Palaos|Papouasie-Nouvelle-Guinée|Îles Salomon|Samoa|Tonga|Tuvalu|Vanuatu',
};

/* Autres noms acceptés dans la recherche */
const PAYS_ALIAS = {
  'États-Unis': ['USA', 'Amérique', 'EUA'],
  'Royaume-Uni': ['Angleterre', 'Grande-Bretagne', 'UK'],
  'Chine': ['RPC', 'République populaire de Chine', 'Pékin'],
  'Russie': ['Fédération de Russie', 'Moscou'],
  'RDC': ['République démocratique du Congo', 'Congo-Kinshasa'],
  'Congo': ['Congo-Brazzaville'],
  'Tchéquie': ['République tchèque'],
  'Birmanie': ['Myanmar'],
  'Viêt Nam': ['Vietnam'],
  'Corée du Nord': ['RPDC'],
  'Taïwan': ['Formose'],
  'Eswatini': ['Swaziland'],
  'Macédoine du Nord': ['Macédoine'],
  'Biélorussie': ['Bélarus'],
  'Pays-Bas': ['Hollande'],
  'Centrafrique': ['République centrafricaine'],
  'Émirats arabes unis': ['EAU'],
  'Arabie saoudite': ['Arabie'],
  'Sri Lanka': ['Ceylan'],
  'URSS': ['Union soviétique', 'Union des républiques socialistes soviétiques'],
  'IIIe Reich': ['Allemagne nazie', 'Troisième Reich', 'Reich'],
  'Empire allemand': ['Reich allemand', 'Allemagne wilhelmienne', 'IIe Reich'],
  'RFA': ['Allemagne de l\'Ouest', 'République fédérale d\'Allemagne'],
  'RDA': ['Allemagne de l\'Est', 'République démocratique allemande'],
  'Raj britannique': ['Empire des Indes', 'Inde britannique'],
  'Empire ottoman': ['Turquie ottomane', 'Sublime Porte'],
  'Autriche-Hongrie': ['Empire austro-hongrois', 'Double monarchie'],
  'Empire du Japon': ['Japon impérial'],
  'Empire Qing': ['Chine impériale', 'Dynastie Qing'],
  'Organisation des Nations unies (ONU)': ['ONU', 'Nations unies'],
  'Société des Nations (SDN)': ['SDN'],
  'OTAN': ['Alliance atlantique', 'NATO'],
  'Union européenne (UE)': ['UE', 'Union européenne'],
  'Communauté économique européenne (CEE)': ['CEE', 'Marché commun'],
  'CAEM (Comecon)': ['Comecon', 'CAEM'],
};

/*
  Entités historiques : [nom, région, début, fin, pays actuels concernés]
*/
const ENTITES_HISTORIQUES = [
  ['Empire allemand', 'Europe', 1871, 1918, ['Allemagne', 'Pologne', 'France']],
  ['République de Weimar', 'Europe', 1918, 1933, ['Allemagne', 'Pologne']],
  ['IIIe Reich', 'Europe', 1933, 1945, ['Allemagne', 'Autriche', 'Pologne', 'Tchéquie']],
  ['RFA', 'Europe', 1949, 1990, ['Allemagne']],
  ['RDA', 'Europe', 1949, 1990, ['Allemagne']],
  ['Autriche-Hongrie', 'Europe', 1867, 1918, ['Autriche', 'Hongrie', 'Tchéquie', 'Slovaquie', 'Slovénie', 'Croatie', 'Bosnie-Herzégovine', 'Pologne', 'Ukraine', 'Roumanie', 'Italie']],
  ['Empire russe', 'Europe', 1721, 1917, ['Russie', 'Finlande', 'Pologne', 'Ukraine', 'Biélorussie', 'Lituanie', 'Lettonie', 'Estonie', 'Moldavie', 'Géorgie', 'Arménie', 'Azerbaïdjan', 'Kazakhstan', 'Ouzbékistan', 'Turkménistan', 'Kirghizistan', 'Tadjikistan']],
  ['URSS', 'Europe', 1922, 1991, ['Russie', 'Ukraine', 'Biélorussie', 'Lituanie', 'Lettonie', 'Estonie', 'Moldavie', 'Géorgie', 'Arménie', 'Azerbaïdjan', 'Kazakhstan', 'Ouzbékistan', 'Turkménistan', 'Kirghizistan', 'Tadjikistan']],
  ['Tchécoslovaquie', 'Europe', 1918, 1992, ['Tchéquie', 'Slovaquie']],
  ['Yougoslavie', 'Europe', 1918, 1992, ['Serbie', 'Croatie', 'Slovénie', 'Bosnie-Herzégovine', 'Monténégro', 'Macédoine du Nord', 'Kosovo']],
  ['Empire ottoman', 'Moyen-Orient', 1299, 1922, ['Turquie', 'Syrie', 'Irak', 'Liban', 'Israël', 'Palestine', 'Jordanie', 'Arabie saoudite']],
  ['Perse', 'Moyen-Orient', null, 1935, ['Iran']],
  ['Empire Qing', 'Asie', 1644, 1912, ['Chine', 'Mongolie', 'Taïwan']],
  ['République de Chine', 'Asie', 1912, 1949, ['Chine', 'Taïwan']],
  ['Mandchoukouo', 'Asie', 1932, 1945, ['Chine']],
  ['Empire du Japon', 'Asie', 1868, 1947, ['Japon', 'Corée du Nord', 'Corée du Sud', 'Taïwan']],
  ['Siam', 'Asie', null, 1939, ['Thaïlande']],
  ['Nord-Viêt Nam', 'Asie', 1945, 1976, ['Viêt Nam']],
  ['Sud-Viêt Nam', 'Asie', 1955, 1975, ['Viêt Nam']],
  ['Raj britannique', 'Empires coloniaux', 1858, 1947, ['Inde', 'Pakistan', 'Bangladesh', 'Birmanie']],
  ['Indochine française', 'Empires coloniaux', 1887, 1954, ['Viêt Nam', 'Laos', 'Cambodge']],
  ['Algérie française', 'Empires coloniaux', 1830, 1962, ['Algérie']],
  ['Afrique-Occidentale française (AOF)', 'Empires coloniaux', 1895, 1958, ['Sénégal', 'Mali', 'Mauritanie', 'Guinée', "Côte d'Ivoire", 'Burkina Faso', 'Niger', 'Bénin']],
  ['Afrique-Équatoriale française (AEF)', 'Empires coloniaux', 1910, 1958, ['Gabon', 'Congo', 'Centrafrique', 'Tchad']],
  ['Congo belge', 'Empires coloniaux', 1908, 1960, ['RDC']],
  ['Empire britannique', 'Empires coloniaux', null, null, ['Royaume-Uni']],
  ['Empire colonial français', 'Empires coloniaux', null, null, ['France']],
  ['Empire colonial portugais', 'Empires coloniaux', null, null, ['Portugal', 'Angola', 'Mozambique']],
  ['Rhodésie', 'Afrique', 1965, 1979, ['Zimbabwe']],
  ['Zaïre', 'Afrique', 1971, 1997, ['RDC']],
];

/* Organisations, alliances et grands ensembles : [nom, groupe, début, fin] */
const ORGANISATIONS = [
  ['Triple Alliance', 'Organisations et alliances', 1882, 1915],
  ['Triple Entente', 'Organisations et alliances', 1907, 1917],
  ['Société des Nations (SDN)', 'Organisations et alliances', 1920, 1946],
  ['Axe', 'Organisations et alliances', 1936, 1945],
  ['Organisation des Nations unies (ONU)', 'Organisations et alliances', 1945, null],
  ['FMI', 'Organisations et alliances', 1944, null],
  ['Banque mondiale', 'Organisations et alliances', 1944, null],
  ['Ligue arabe', 'Organisations et alliances', 1945, null],
  ['OTAN', 'Organisations et alliances', 1949, null],
  ['CAEM (Comecon)', 'Organisations et alliances', 1949, 1991],
  ['CECA', 'Organisations et alliances', 1951, 2002],
  ['Pacte de Varsovie', 'Organisations et alliances', 1955, 1991],
  ['Communauté économique européenne (CEE)', 'Organisations et alliances', 1957, 1993],
  ['OPEP', 'Organisations et alliances', 1960, null],
  ['Mouvement des non-alignés', 'Organisations et alliances', 1961, null],
  ['OUA', 'Organisations et alliances', 1963, 2002],
  ['ASEAN', 'Organisations et alliances', 1967, null],
  ['Union européenne (UE)', 'Organisations et alliances', 1993, null],
  ['Union africaine', 'Organisations et alliances', 2002, null],
  ['BRICS', 'Organisations et alliances', 2009, null],
  ['Commonwealth', 'Organisations et alliances', 1931, null],
  ['Balkans', 'Grands ensembles', null, null],
  ['Europe de l\'Est', 'Grands ensembles', null, null],
  ['Europe occidentale', 'Grands ensembles', null, null],
  ['Proche-Orient', 'Grands ensembles', null, null],
  ['Maghreb', 'Grands ensembles', null, null],
  ['Sahel', 'Grands ensembles', null, null],
  ['Afrique subsaharienne', 'Grands ensembles', null, null],
  ['Amérique latine', 'Grands ensembles', null, null],
  ['Asie du Sud-Est', 'Grands ensembles', null, null],
  ['Indo-Pacifique', 'Grands ensembles', null, null],
  ['Tiers-Monde', 'Grands ensembles', null, null],
];

/* ---------------------------------------------------------
   Construction de la liste complète (utilisée par le site)
   --------------------------------------------------------- */
const Pays = {
  _liste: null,

  /** Liste de base (sans les acteurs personnalisés) */
  base() {
    if (this._liste) return this._liste;
    const liste = [];
    for (const [region, noms] of Object.entries(PAYS_ACTUELS)) {
      for (const nom of noms.split('|')) {
        liste.push({ nom, region, type: 'pays', actuels: [nom] });
      }
    }
    for (const [nom, region, debut, fin, actuels] of ENTITES_HISTORIQUES) {
      liste.push({ nom, region, type: 'historique', debut, fin, actuels });
    }
    for (const [nom, region, debut, fin] of ORGANISATIONS) {
      liste.push({ nom, region, type: 'organisation', debut, fin, actuels: [] });
    }
    for (const e of liste) {
      e.alias = PAYS_ALIAS[e.nom] || [];
      e.cle = U.norm([e.nom, ...e.alias].join(' '));
    }
    this._liste = liste;
    return liste;
  },

  /** Liste complète, avec les acteurs personnalisés de l'utilisateur */
  tous() {
    const perso = (Stockage.donnees.paysPerso || []).map((p) => ({
      nom: p.nom, region: 'Mes acteurs personnalisés', type: 'perso', actuels: [], alias: [], cle: U.norm(p.nom),
    }));
    return this.base().concat(perso);
  },

  trouver(nom) {
    return this.tous().find((e) => e.nom === nom) || null;
  },

  /** Texte des dates : "1922-1991", "jusqu'en 1935" */
  periode(e) {
    if (!e || (!e.debut && !e.fin)) return '';
    if (e.debut && e.fin) return e.debut + '-' + e.fin;
    if (e.debut) return 'depuis ' + e.debut;
    return "jusqu'en " + e.fin;
  },

  /** Ordre d'affichage des régions */
  ordreRegions: ['Europe', 'Amériques', 'Moyen-Orient', 'Afrique', 'Asie', 'Océanie', 'Empires coloniaux', 'Organisations et alliances', 'Grands ensembles', 'Mes acteurs personnalisés'],
};
