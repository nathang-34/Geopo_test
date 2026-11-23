/* =========================================================
   carte-histoire.js : frontières à une date donnée (1886-2019)
   - tracés : js/carte-frontieres.js (CShapes 2.0), chargé à la demande ;
   - noms français, pays actuels et empire de chaque territoire : ci-dessous.
   CShapes ne dit pas à qui appartient une colonie : cette table a été
   rédigée pour le site, à l'année près. Elle se corrige ici facilement.
   ========================================================= */

/* Couleurs fixes : un empire garde toujours la sienne. Sans « c » : groupe « Autres empires » */
const HISTOIRE_EMPIRES = {
  GB: { nom: 'Empire britannique', c: 'GB', centre: 200 },
  FR: { nom: 'Empire français', c: 'FR', centre: 220 },
  RU: { nom: 'Empire russe', c: 'RU', centre: 365 },
  DE: { nom: 'Empire allemand', c: 'DE', centre: 255 },
  PT: { nom: 'Empire portugais', c: 'PT', centre: 235 },
  NL: { nom: 'Empire néerlandais', c: 'NL', centre: 210 },
  JP: { nom: 'Empire du Japon', c: 'JP', centre: 740 },
  OT: { nom: 'Empire ottoman', c: 'OT', centre: 640 },
  BE: { nom: 'Belgique et colonies', centre: 211 },
  IT: { nom: 'Italie et colonies', centre: 325 },
  ES: { nom: 'Espagne et colonies', centre: 230 },
  US: { nom: 'États-Unis et dépendances', centre: 2 },
  AH: { nom: 'Autriche-Hongrie', centre: 300 },
  DK: { nom: 'Danemark et dépendances', centre: 390 },
  ZA: { nom: 'Afrique du Sud et Sud-Ouest africain', centre: 560 },
  AU: { nom: 'Australie et Papouasie', centre: 900 },
  ID: { nom: 'Indonésie et Timor oriental', centre: 850 },
};

/* code : [nom, pays actuels séparés par | (vide = le nom), puis empire, année de fin, empire, année de fin...]
   L'année de fin est la première année où le territoire n'en dépend plus. */
const HISTOIRE_UNITES = {
  2: ['États-Unis', ''], 3: ['Alaska', 'États-Unis', 'US', 9999], 4: ['Hawaï', 'États-Unis', 'US', 9999],
  6: ['Porto Rico', 'États-Unis', 'ES', 1899, 'US', 9999],
  20: ['Canada', '', 'GB', 1931], 21: ['Terre-Neuve', 'Canada', 'GB', 9999], 31: ['Bahamas', '', 'GB', 1973],
  40: ['Cuba', '', 'ES', 1899, 'US', 1902], 41: ['Haïti', ''], 42: ['République dominicaine', ''],
  51: ['Jamaïque', '', 'GB', 1962], 52: ['Trinité-et-Tobago', '', 'GB', 1962], 53: ['Barbade', '', 'GB', 1966],
  65: ['Guadeloupe', 'France', 'FR', 9999], 66: ['Martinique', 'France', 'FR', 9999],
  70: ['Mexique', ''], 80: ['Belize', '', 'GB', 1981], 90: ['Guatemala', ''], 91: ['Honduras', ''], 92: ['Salvador', ''],
  93: ['Nicaragua', ''], 94: ['Costa Rica', ''], 95: ['Panama', ''], 100: ['Colombie', ''], 101: ['Venezuela', ''],
  110: ['Guyana', '', 'GB', 1966], 115: ['Suriname', '', 'NL', 1975], 120: ['Guyane', 'France', 'FR', 9999],
  130: ['Équateur', ''], 135: ['Pérou', ''], 140: ['Brésil', ''], 145: ['Bolivie', ''], 150: ['Paraguay', ''],
  155: ['Chili', ''], 160: ['Argentine', ''], 165: ['Uruguay', ''],
  200: ['Royaume-Uni', ''], 205: ['Irlande', '', 'GB', 1931], 210: ['Pays-Bas', ''], 211: ['Belgique', ''], 212: ['Luxembourg', ''],
  220: ['France', ''], 225: ['Suisse', ''], 230: ['Espagne', ''], 235: ['Portugal', ''],
  255: ['Allemagne', 'Allemagne|Pologne'], 260: ['Allemagne', ''], 265: ['RDA', 'Allemagne'],
  290: ['Pologne', ''], 291: ['Ville libre de Dantzig', 'Pologne'],
  300: ['Autriche-Hongrie', 'Autriche|Hongrie|Tchéquie|Slovaquie|Slovénie|Croatie|Bosnie-Herzégovine|Pologne|Ukraine|Roumanie|Italie', 'AH', 9999],
  305: ['Autriche', ''], 310: ['Hongrie', ''], 315: ['Tchécoslovaquie', 'Tchéquie|Slovaquie'], 316: ['Tchéquie', ''], 317: ['Slovaquie', ''],
  325: ['Italie', ''], 338: ['Malte', '', 'GB', 1964], 339: ['Albanie', ''], 340: ['Serbie', ''], 341: ['Monténégro', ''],
  343: ['Macédoine du Nord', ''], 344: ['Croatie', ''], 345: ['Yougoslavie', 'Serbie|Croatie|Slovénie|Bosnie-Herzégovine|Monténégro|Macédoine du Nord|Kosovo'],
  346: ['Bosnie-Herzégovine', ''], 347: ['Kosovo', ''], 349: ['Slovénie', ''], 350: ['Grèce', ''], 352: ['Chypre', '', 'GB', 1960],
  355: ['Bulgarie', '', 'OT', 1908], 359: ['Moldavie', ''], 360: ['Roumanie', ''],
  365: ['Russie', 'Russie|Ukraine|Biélorussie|Lituanie|Lettonie|Estonie|Moldavie|Géorgie|Arménie|Azerbaïdjan|Kazakhstan|Ouzbékistan|Turkménistan|Kirghizistan|Tadjikistan'],
  366: ['Estonie', ''], 367: ['Lettonie', ''], 368: ['Lituanie', ''], 369: ['Ukraine', ''], 370: ['Biélorussie', ''],
  371: ['Arménie', ''], 372: ['Géorgie', ''], 373: ['Azerbaïdjan', ''], 375: ['Finlande', ''], 380: ['Suède', ''],
  385: ['Norvège', ''], 390: ['Danemark', ''], 395: ['Islande', '', 'DK', 1918],
  402: ['Cap-Vert', '', 'PT', 1975], 404: ['Guinée-Bissau', '', 'PT', 1974], 411: ['Guinée équatoriale', '', 'ES', 1968],
  420: ['Gambie', '', 'GB', 1965], 430: ['Afrique-Occidentale française', 'Sénégal|Mali|Mauritanie|Guinée|Côte d\'Ivoire|Burkina Faso|Niger|Bénin', 'FR', 9999],
  432: ['Mali', '', 'FR', 1960], 433: ['Sénégal', '', 'FR', 1960], 434: ['Bénin', '', 'FR', 1960], 435: ['Mauritanie', '', 'FR', 1960],
  436: ['Niger', '', 'FR', 1960], 437: ["Côte d'Ivoire", '', 'FR', 1960], 438: ['Guinée', '', 'FR', 1958], 439: ['Burkina Faso', '', 'FR', 1960],
  450: ['Libéria', ''], 451: ['Sierra Leone', '', 'GB', 1961], 452: ['Ghana', '', 'GB', 1957],
  460: ['Togoland', 'Togo|Ghana', 'DE', 1919, 'FR', 9999], 461: ['Togo', '', 'FR', 1960], 462: ['Togoland britannique', 'Ghana', 'GB', 9999],
  470: ['Kamerun', 'Cameroun', 'DE', 9999], 471: ['Cameroun', '', 'FR', 1960], 472: ['Cameroun britannique', 'Cameroun|Nigeria', 'GB', 9999],
  475: ['Nigeria', '', 'GB', 1960], 481: ['Gabon', '', 'FR', 1960], 482: ['Centrafrique', '', 'FR', 1960], 483: ['Tchad', '', 'FR', 1960],
  484: ['Congo', '', 'FR', 1960], 490: ['RDC', '', 'BE', 1960], 500: ['Ouganda', '', 'GB', 1962], 501: ['Kenya', '', 'GB', 1963],
  510: ['Tanzanie', '', 'DE', 1919, 'GB', 1961], 511: ['Zanzibar', 'Tanzanie', 'GB', 1963], 515: ['Ruanda-Urundi', 'Rwanda|Burundi', 'BE', 9999],
  516: ['Burundi', ''], 517: ['Rwanda', ''], 520: ['Somalie', ''], 521: ['Somaliland britannique', 'Somalie', 'GB', 1960],
  522: ['Djibouti', '', 'FR', 1977], 530: ['Éthiopie', '', '', 1936, 'IT', 1941], 531: ['Érythrée', '', 'IT', 1941, 'GB', 1952],
  540: ['Angola', '', 'PT', 1975], 541: ['Mozambique', '', 'PT', 1975], 550: ['Fédération de Rhodésie et du Nyassaland', 'Zambie|Zimbabwe|Malawi', 'GB', 9999],
  551: ['Zambie', '', 'GB', 1964], 552: ['Zimbabwe', '', 'GB', 1965], 553: ['Malawi', '', 'GB', 1964], 560: ['Afrique du Sud', '', 'GB', 1931],
  561: ['Colonie du Cap', 'Afrique du Sud', 'GB', 9999], 562: ['Natal', 'Afrique du Sud', 'GB', 9999],
  563: ['Transvaal', 'Afrique du Sud', '', 1902, 'GB', 9999], 564: ["État libre d'Orange", 'Afrique du Sud', '', 1902, 'GB', 9999],
  565: ['Namibie', '', 'DE', 1919, 'ZA', 1990], 570: ['Lesotho', '', 'GB', 1966], 571: ['Botswana', '', 'GB', 1966], 572: ['Eswatini', '', 'GB', 1968],
  580: ['Madagascar', '', 'FR', 1960], 581: ['Comores', '', 'FR', 1975], 585: ['La Réunion', 'France', 'FR', 9999], 590: ['Maurice', '', 'GB', 1968],
  600: ['Maroc', '', '', 1912, 'FR', 1956], 602: ['Maroc espagnol', 'Maroc', 'ES', 9999], 609: ['Sahara espagnol', 'Maroc', 'ES', 9999],
  610: ['Afrique-Occidentale espagnole', 'Maroc', 'ES', 9999], 615: ['Algérie', '', 'FR', 1962], 616: ['Tunisie', '', 'FR', 1956],
  620: ['Libye', '', 'IT', 1943, 'GB', 1951], 625: ['Soudan', '', 'GB', 1956], 626: ['Soudan du Sud', ''],
  630: ['Iran', ''], 640: ['Turquie', '', 'OT', 1923], 645: ['Irak', '', 'GB', 1932], 651: ['Égypte', '', 'GB', 1922],
  652: ['Syrie', '', 'FR', 1946], 660: ['Liban', '', 'FR', 1943], 663: ['Jordanie', '', 'GB', 1946], 665: ['Palestine mandataire', 'Israël|Palestine', 'GB', 9999],
  666: ['Israël', ''], 670: ['Arabie saoudite', ''], 678: ['Yémen', ''], 680: ['Yémen du Sud', 'Yémen'], 681: ['Aden', 'Yémen', 'GB', 9999],
  690: ['Koweït', ''], 692: ['Bahreïn', ''], 694: ['Qatar', '', 'GB', 1971], 696: ['Émirats arabes unis', '', 'GB', 1971], 698: ['Oman', ''],
  700: ['Afghanistan', ''], 701: ['Turkménistan', ''], 702: ['Tadjikistan', ''], 703: ['Kirghizistan', ''], 704: ['Ouzbékistan', ''], 705: ['Kazakhstan', ''],
  710: ['Chine', ''], 711: ['Tibet', 'Chine'], 712: ['Mongolie', ''], 713: ['Taïwan', '', 'JP', 1945],
  730: ['Corée', 'Corée du Nord|Corée du Sud', '', 1910, 'JP', 9999], 731: ['Corée du Nord', ''], 732: ['Corée du Sud', ''], 740: ['Japon', ''],
  750: ['Inde', 'Inde|Pakistan|Bangladesh', 'GB', 1947], 760: ['Bhoutan', ''], 770: ['Pakistan', ''], 771: ['Bangladesh', ''],
  775: ['Birmanie', '', 'GB', 1948], 780: ['Sri Lanka', '', 'GB', 1948], 781: ['Maldives', '', 'GB', 1965], 790: ['Népal', ''], 800: ['Thaïlande', ''],
  811: ['Cambodge', '', 'FR', 1953], 812: ['Laos', '', 'FR', 1953], 815: ['Viêt Nam (Annam, Tonkin, Cochinchine)', 'Viêt Nam', 'FR', 9999],
  816: ['Viêt Nam', ''], 817: ['Sud-Viêt Nam', 'Viêt Nam'], 820: ['Malaisie', '', 'GB', 1957], 821: ['États malais fédérés', 'Malaisie', 'GB', 9999],
  822: ['États malais non fédérés', 'Malaisie', 'GB', 9999], 823: ['Bornéo du Nord', 'Malaisie', 'GB', 9999], 824: ['Sarawak', 'Malaisie', 'GB', 9999],
  827: ['Établissements des Détroits', 'Malaisie|Singapour', 'GB', 9999], 830: ['Singapour', '', 'GB', 1963], 835: ['Brunei', '', 'GB', 1984],
  840: ['Philippines', '', 'ES', 1899, 'US', 1946], 850: ['Indonésie', '', 'NL', 1949], 851: ['Nouvelle-Guinée néerlandaise', 'Indonésie', 'NL', 9999],
  860: ['Timor oriental', '', 'PT', 1975, 'ID', 2002], 900: ['Australie', '', 'GB', 1931], 901: ['Nouvelle-Galles du Sud', 'Australie', 'GB', 9999],
  902: ['Australie-Occidentale', 'Australie', 'GB', 9999], 903: ['Australie-Méridionale', 'Australie', 'GB', 9999], 904: ['Victoria', 'Australie', 'GB', 9999],
  905: ['Queensland', 'Australie', 'GB', 9999], 906: ['Tasmanie', 'Australie', 'GB', 9999], 910: ['Papouasie-Nouvelle-Guinée', '', 'AU', 1975],
  911: ['Papouasie', 'Papouasie-Nouvelle-Guinée', 'GB', 1906, 'AU', 9999], 912: ['Nouvelle-Guinée', 'Papouasie-Nouvelle-Guinée', 'DE', 1919, 'AU', 9999],
  920: ['Nouvelle-Zélande', '', 'GB', 1931], 930: ['Nouvelle-Calédonie', 'France', 'FR', 9999], 940: ['Îles Salomon', '', 'GB', 1978], 950: ['Fidji', '', 'GB', 1970],
  960: ['Polynésie française', 'France', 'FR', 9999], 1201: ['Inini', 'France', 'FR', 9999], 3461: ['Bosnie', 'Bosnie-Herzégovine', 'AH', 9999],
  3462: ['Herzégovine', 'Bosnie-Herzégovine', 'AH', 9999], 4781: ['Lagos', 'Nigeria', 'GB', 9999], 4782: ['Protectorat des Oil Rivers', 'Nigeria', 'GB', 9999],
  4783: ['Nigeria du Sud', 'Nigeria', 'GB', 9999], 4784: ['Nigeria du Nord', 'Nigeria', 'GB', 9999], 5200: ['Somalie italienne', 'Somalie', 'IT', 1941, 'GB', 1950, 'IT', 1960],
  5518: ['Rhodésie du Nord-Est', 'Zambie', 'GB', 9999], 5519: ['Rhodésie du Nord-Ouest', 'Zambie', 'GB', 9999], 5612: ['Bechuanaland britannique', 'Afrique du Sud', 'GB', 9999],
  6021: ['Zone sud du Maroc espagnol', 'Maroc', 'ES', 9999], 6511: ["Gaza (sous administration égyptienne)", 'Palestine'], 6631: ['Cisjordanie (sous administration jordanienne)', 'Palestine'],
  6801: ["Fédération d'Arabie du Sud", 'Yémen', 'GB', 9999], 6812: ["Protectorat d'Aden oriental", 'Yémen', 'GB', 9999], 7020: ['Émirat de Boukhara', 'Ouzbékistan|Tadjikistan', 'RU', 1918],
  7030: ['Khanat de Khiva', 'Ouzbékistan|Turkménistan', 'RU', 1918], 7351: ['Sakhaline du Sud', 'Russie', 'JP', 9999], 7506: ['Jammu-et-Cachemire', 'Inde|Pakistan'], 7708: ['Cachemire du Nord', 'Pakistan|Inde'],
  8201: ['Perak', 'Malaisie', 'GB', 9999], 8202: ['Selangor', 'Malaisie', 'GB', 9999], 8203: ['Pahang', 'Malaisie', 'GB', 9999], 9401: ['Salomon allemandes', 'Papouasie-Nouvelle-Guinée|Îles Salomon', 'DE', 9999],
};

/* Noms qui changent : [année de début, nom]. Avant la première année : le premier nom. */
const HISTOIRE_NOMS = {
  80: [[0, 'Honduras britannique'], [1973, 'Belize']], 110: [[0, 'Guyane britannique'], [1966, 'Guyana']], 115: [[0, 'Guyane néerlandaise'], [1975, 'Suriname']],
  255: [[0, 'Empire allemand'], [1919, 'République de Weimar'], [1933, 'IIIe Reich']], 260: [[0, "Allemagne de l'Ouest (RFA)"], [1990, 'Allemagne']],
  343: [[0, 'Macédoine'], [2019, 'Macédoine du Nord']], 345: [[0, 'Yougoslavie'], [2003, 'Serbie-et-Monténégro']],
  365: [[0, 'Empire russe'], [1918, 'Russie soviétique'], [1923, 'URSS'], [1992, 'Russie']], 404: [[0, 'Guinée portugaise'], [1974, 'Guinée-Bissau']],
  411: [[0, 'Guinée espagnole'], [1968, 'Guinée équatoriale']], 432: [[0, 'Soudan français'], [1960, 'Mali']], 434: [[0, 'Dahomey'], [1975, 'Bénin']],
  439: [[0, 'Haute-Volta'], [1984, 'Burkina Faso']], 452: [[0, "Côte-de-l'Or"], [1957, 'Ghana']], 482: [[0, 'Oubangui-Chari'], [1960, 'Centrafrique']],
  484: [[0, 'Congo français'], [1960, 'Congo']], 490: [[0, 'État indépendant du Congo'], [1908, 'Congo belge'], [1960, 'Congo-Léopoldville'], [1971, 'Zaïre'], [1997, 'RDC']],
  510: [[0, 'Afrique orientale allemande'], [1919, 'Tanganyika'], [1964, 'Tanzanie']], 522: [[0, 'Côte française des Somalis'], [1967, 'Territoire français des Afars et des Issas'], [1977, 'Djibouti']],
  551: [[0, 'Rhodésie du Nord'], [1964, 'Zambie']], 552: [[0, 'Rhodésie du Sud'], [1965, 'Rhodésie'], [1980, 'Zimbabwe']], 553: [[0, 'Nyassaland'], [1964, 'Malawi']],
  565: [[0, 'Sud-Ouest africain'], [1990, 'Namibie']], 570: [[0, 'Basutoland'], [1966, 'Lesotho']], 571: [[0, 'Bechuanaland'], [1966, 'Botswana']], 572: [[0, 'Swaziland'], [2018, 'Eswatini']],
  630: [[0, 'Perse'], [1935, 'Iran']], 640: [[0, 'Empire ottoman'], [1923, 'Turquie']], 663: [[0, 'Transjordanie'], [1946, 'Jordanie']], 678: [[0, 'Yémen du Nord'], [1990, 'Yémen']],
  696: [[0, 'États de la Trêve'], [1971, 'Émirats arabes unis']], 710: [[0, 'Empire Qing'], [1912, 'République de Chine'], [1949, 'Chine']], 750: [[0, 'Raj britannique'], [1947, 'Inde']],
  713: [[0, 'Formose'], [1945, 'Taïwan']], 730: [[0, 'Corée'], [1910, 'Corée japonaise']], 775: [[0, 'Birmanie britannique'], [1948, 'Birmanie']], 780: [[0, 'Ceylan'], [1972, 'Sri Lanka']],
  800: [[0, 'Siam'], [1939, 'Thaïlande']], 816: [[0, 'Nord-Viêt Nam'], [1976, 'Viêt Nam']], 820: [[0, 'Malaisie britannique'], [1957, 'Malaisie']],
  850: [[0, 'Indes néerlandaises'], [1949, 'Indonésie']], 910: [[0, 'Territoire de Papouasie-Nouvelle-Guinée'], [1975, 'Papouasie-Nouvelle-Guinée']],
};

const HISTOIRE_REPERES = [1886, 1913, 1919, 1939, 1945, 1962, 1991];

const Histoire = {
  _promesse: null,
  _arcs: null,
  _chemins: new Map(),

  pret() { return typeof CARTE_FRONTIERES !== 'undefined'; },

  /** Charge le gros fichier de tracés seulement quand on en a besoin (fonctionne en file://) */
  charger() {
    if (this.pret()) return Promise.resolve();
    if (this._promesse) return this._promesse;
    this._promesse = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'js/carte-frontieres.js';
      s.onload = () => ok();
      s.onerror = () => { this._promesse = null; ko(new Error('carte-frontieres.js introuvable')); };
      document.body.appendChild(s);
    });
    return this._promesse;
  },

  arcs() {
    if (this._arcs) return this._arcs;
    const pas = CARTE_FRONTIERES.pas;
    this._arcs = CARTE_FRONTIERES.arcs.map((a) => {
      const pts = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i < a.length; i += 2) {
        x += a[i];
        y += a[i + 1];
        const lon = x * pas;
        const lat = y * pas;
        const q = Vues.carte.projeter(lon, lat);
        pts.push([q[0], q[1], lon, lat]);
      }
      return pts;
    });
    return this._arcs;
  },

  /** Chemin SVG d'une géométrie, calculé une seule fois */
  chemin(id) {
    if (this._chemins.has(id)) return this._chemins.get(id);
    const arcs = this.arcs();
    let d = '';
    for (const poly of CARTE_FRONTIERES.geos[id]) {
      for (const anneau of poly) {
        const pts = [];
        anneau.forEach((n, k) => {
          const a = n < 0 ? arcs[-n - 1].slice().reverse() : arcs[n];
          for (let i = k ? 1 : 0; i < a.length; i++) pts.push(a[i]);
        });
        for (const part of Vues.carte.couperAntimeridien(pts)) {
          d += 'M' + part.map((p) => p[0] + ',' + p[1]).join('L') + 'Z';
        }
      }
    }
    this._chemins.set(id, d);
    return d;
  },

  nom(code, annee) {
    const liste = HISTOIRE_NOMS[code];
    if (!liste) return (HISTOIRE_UNITES[code] || ['Territoire ' + code])[0];
    let n = liste[0][1];
    for (const [a, t] of liste) if (annee >= a) n = t;
    return n;
  },

  /** Empire dont dépend le territoire cette année-là ('' = aucun) */
  maitre(code, annee) {
    const t = HISTOIRE_UNITES[code];
    if (!t) return '';
    for (let i = 2; i + 1 < t.length; i += 2) if (annee < t[i + 1]) return t[i];
    return '';
  },

  actuels(code, annee) {
    const t = HISTOIRE_UNITES[code];
    if (!t) return [];
    if (code === 255 && annee >= 1939) return ['Allemagne', 'Pologne', 'Tchéquie'];
    if (code === 365 && annee >= 1992) return ['Russie'];
    if (code === 345 && annee >= 1992) return ['Serbie', 'Monténégro', 'Kosovo'];
    return (t[1] || t[0]).split('|');
  },

  /** Territoires à la date choisie (1er juillet), avec leur empire et leur statut */
  etat(annee) {
    const date = annee * 10000 + 701;
    const liste = CARTE_FRONTIERES.unites.filter((u) => u[1] <= date && date <= u[2]).map(([code, debut, fin, geo]) => ({
      code, debut, fin, geo, nom: this.nom(code, annee), empire: this.maitre(code, annee), statut: 'independant',
    }));
    const actifs = new Set();
    for (const u of liste) {
      if (!u.empire) continue;
      actifs.add(u.empire);
      u.statut = HISTOIRE_EMPIRES[u.empire].centre === u.code ? 'centre' : 'dependant';
    }
    for (const u of liste) {
      if (u.empire) continue;
      const k = Object.keys(HISTOIRE_EMPIRES).find((c) => HISTOIRE_EMPIRES[c].centre === u.code);
      if (k && actifs.has(k)) { u.empire = k; u.statut = 'centre'; }
    }
    return liste;
  },

  classeCouleur(k) {
    if (!k) return 'e-libre';
    return 'e-' + (HISTOIRE_EMPIRES[k].c || 'autre');
  },

  /** Après la décolonisation, il ne reste que l'outre-mer : on ne parle plus d'empire */
  nomEmpire(k, annee) {
    if (k === 'FR' && annee >= 1977) return 'France et outre-mer';
    return HISTOIRE_EMPIRES[k].nom;
  },
};

/* ---------------- Mode historique de la page Carte ---------------- */
Object.assign(Vues.carte, {
  /** Change l'époque : null = frontières actuelles */
  choisirAnnee(annee) {
    this.f.annee = annee;
    this.uniteChoisie = null;
    if (annee !== null) this.choisi = null;
    this.majEpoque();
    this.maj();
  },

  majEpoque() {
    const el = this.el;
    const a = this.f.annee;
    el.querySelector('[data-annee-titre]').textContent = a === null ? "Frontières d'aujourd'hui" : `Frontières de ${a}`;
    const r = el.querySelector('[data-annee]');
    r.value = a === null ? r.max : a;
    r.setAttribute('aria-valuetext', a === null ? "Aujourd'hui" : String(a));
    el.querySelectorAll('[data-repere]').forEach((b) => {
      const actif = b.dataset.repere === '' ? a === null : Number(b.dataset.repere) === a;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    el.querySelector('[data-options-histoire]').hidden = a === null;
    el.querySelector('[data-champ-emprise]').hidden = a !== null;
  },

  /** Arguments liés à un territoire, à travers ses pays actuels */
  argumentsUnite(code, annee) {
    const res = new Map();
    for (const p of Histoire.actuels(code, annee)) {
      const m = this.stats.parPays.get(p);
      if (m) for (const [id, x] of m) if (!res.has(id)) res.set(id, x);
    }
    return [...res.values()];
  },

  majHistoire() {
    const el = this.el;
    const svg = el.querySelector('[data-svg]');
    const note = el.querySelector('[data-note-emprise]');
    svg.classList.add('monde-histo');
    el.querySelector('[data-surcouche]').innerHTML = '';
    if (!Histoire.pret()) {
      note.textContent = 'Chargement des frontières...';
      Histoire.charger().then(() => { if (this.el === el && el.isConnected) this.maj(); })
        .catch(() => { note.textContent = 'Le fichier js/carte-frontieres.js est introuvable : vérifie qu\'il est bien dans le dossier js.'; });
      return;
    }
    const annee = this.f.annee;
    const liste = Histoire.etat(annee);
    this.unites = new Map(liste.map((u) => [u.code, u]));
    if (this.uniteChoisie && !this.unites.has(this.uniteChoisie)) this.uniteChoisie = null;
    const parArgs = this.f.couleur === 'arguments';
    if (this.f.empire && !liste.some((u) => u.empire === this.f.empire)) this.f.empire = '';
    const classeDe = (u) => {
      const c = parArgs ? 'n' + this.classe(this.argumentsUnite(u.code, annee).length) : Histoire.classeCouleur(u.empire);
      const attenue = this.f.empire && u.empire !== this.f.empire ? ' monde-attenue' : '';
      return `monde-unite ${c}${!parArgs && u.statut === 'dependant' ? ' monde-dependant' : ''}${attenue}`;
    };
    el.querySelector('[data-histoire]').innerHTML = liste.map((u) => `<path class="${classeDe(u)}" data-unite="${u.code}" d="${Histoire.chemin(u.geo)}"></path>`).join('');
    if (this.uniteChoisie) {
      const u = this.unites.get(this.uniteChoisie);
      el.querySelector('[data-surcouche]').innerHTML = `<path class="monde-choisi" d="${Histoire.chemin(u.geo)}"></path>`;
    }
    this.dessinerLegendeHistoire(liste, parArgs);
    note.innerHTML = `Situation au 1er juillet ${annee}. ${annee >= 1938 && annee <= 1945 ? "<strong>Attention :</strong> l'Anschluss et les occupations de la Seconde Guerre mondiale ne sont pas tracés (Autriche, Pologne et France restent affichées). " : ''}Rattachements aux empires simplifiés, à l'année près. Frontières : <a href="https://icr.ethz.ch/data/cshapes/" target="_blank" rel="noopener">CShapes 2.0</a> (Schvitz, Rüegger, Girardin, Cederman, Weidmann, Gleditsch), licence CC BY-NC-SA 4.0, tracés simplifiés.`;
    this.dessinerPanneauHistoire(liste);
  },

  dessinerLegendeHistoire(liste, parArgs) {
    const zone = this.el.querySelector('[data-legende]');
    if (parArgs) { zone.innerHTML = this.legendeArguments(); return; }
    const presents = new Set(liste.map((u) => u.empire).filter(Boolean));
    const nommes = Object.keys(HISTOIRE_EMPIRES).filter((k) => HISTOIRE_EMPIRES[k].c && presents.has(k));
    const autres = [...presents].some((k) => !HISTOIRE_EMPIRES[k].c);
    zone.innerHTML = nommes.map((k) => `<span><i class="e-${k}"></i>${U.esc(Histoire.nomEmpire(k, this.f.annee))}</span>`).join('')
      + (autres ? '<span><i class="e-autre"></i>Autres empires</span>' : '')
      + '<span><i class="e-libre"></i>États indépendants</span>';
  },

  legendeArguments() {
    return '<span class="muet petit">Arguments :</span>'
      + [[0, '0'], [1, '1'], [2, '2-3'], [3, '4-7'], [4, '8 et +']].map(([c, t]) => `<span><i class="n${c}"></i>${t}</span>`).join('');
  },

  dessinerPanneauHistoire(liste) {
    const zone = this.el.querySelector('[data-panneau]');
    const annee = this.f.annee;
    if (this.uniteChoisie) {
      const u = this.unites.get(this.uniteChoisie);
      const emp = u.empire ? Histoire.nomEmpire(u.empire, this.f.annee) : '';
      const statut = u.statut === 'centre' ? `Centre : ${emp}` : u.statut === 'dependant' ? `Dépend de : ${emp}` : 'État indépendant';
      const lignes = this.argumentsUnite(u.code, annee);
      const actuels = Histoire.actuels(u.code, annee);
      zone.innerHTML = `
        <button class="btn btn-discret btn-petit" data-retour-unite>← Tous les empires</button>
        <h2 class="monde-titre">${U.esc(u.nom)}</h2>
        <p class="petit">${U.esc(statut)}</p>
        <p class="muet petit">Tracé valable du ${this.dateCourte(u.debut)} au ${this.dateCourte(u.fin)}.<br>Pays actuels : ${actuels.map(U.esc).join(', ')}.</p>
        <p class="muet petit">${lignes.length ? U.pluriel(lignes.length, 'argument') : 'Aucun argument avec ces filtres.'}</p>
        <ul class="monde-args">${lignes.map(({ arg }) => `<li><a href="javascript:void 0" data-fiche="${arg.id}">${U.esc(arg.idee)}</a></li>`).join('')}</ul>`;
      return;
    }
    const groupes = new Map();
    for (const u of liste) {
      if (!u.empire) continue;
      if (!groupes.has(u.empire)) groupes.set(u.empire, []);
      groupes.get(u.empire).push(u);
    }
    const ordre = Object.keys(HISTOIRE_EMPIRES).filter((k) => groupes.has(k));
    const independants = liste.filter((u) => !u.empire).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    const choisi = this.f.empire;
    zone.innerHTML = `
      <h2 class="monde-titre">Empires en ${annee}</h2>
      <p class="muet petit">Clique sur un empire pour le mettre en avant.</p>
      <ul class="monde-empires">${ordre.map((k) => `<li>
        <button type="button" data-empire="${k}" class="${k === choisi ? 'actif' : ''}" aria-pressed="${k === choisi}">
          <i class="${Histoire.classeCouleur(k)}"></i><span class="monde-nom">${U.esc(Histoire.nomEmpire(k, this.f.annee))}</span>
          <span class="monde-nb">${groupes.get(k).length}</span>
        </button>
        ${k === choisi ? `<div class="monde-territoires">${groupes.get(k).slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map((u) => `<button type="button" data-choisir-unite="${u.code}">${U.esc(u.nom)}</button>`).join('')}</div>` : ''}
      </li>`).join('')}</ul>
      <details class="monde-autres"><summary>États indépendants (${independants.length})</summary>
        <div class="monde-territoires">${independants.map((u) => `<button type="button" data-choisir-unite="${u.code}">${U.esc(u.nom)}</button>`).join('')}</div>
      </details>`;
  },

  dateCourte(n) {
    const a = Math.floor(n / 10000);
    const m = Math.floor(n / 100) % 100;
    const j = n % 100;
    return `${String(j).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
  },

  bulleUnite(code) {
    const u = this.unites && this.unites.get(code);
    if (!u) return '';
    if (this.f.couleur === 'arguments') {
      const n = this.argumentsUnite(code, this.f.annee).length;
      return `<strong>${U.esc(u.nom)}</strong><br>${n ? U.pluriel(n, 'argument') : 'Aucun argument'}`;
    }
    const emp = u.empire ? Histoire.nomEmpire(u.empire, this.f.annee) : '';
    const s = u.statut === 'centre' ? `Centre : ${emp}` : u.statut === 'dependant' ? `Dépend de : ${emp}` : 'État indépendant';
    return `<strong>${U.esc(u.nom)}</strong><br>${U.esc(s)}`;
  },
});
