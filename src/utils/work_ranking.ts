export type Ranking = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export function determineCEFRLevel(word: string): Ranking {
  // Check if word is a string, if not convert it
  const wordStr = String(word || '');

  // Convert to lowercase for consistent analysis
  const wordLower = wordStr.toLowerCase();

  // Basic word lists by level (small samples of typical words for each level)
  const a1Words = new Set([
    'et',
    'je',
    'tu',
    'il',
    'elle',
    'nous',
    'vous',
    'ils',
    'elles',
    'un',
    'une',
    'le',
    'la',
    'les',
    'bonjour',
    'merci',
    'au revoir',
    'oui',
    'non',
    "s'il vous plaît",
    'manger',
    'boire',
    'dormir',
    'jour',
    'nuit',
    'lundi',
    'mardi',
    'homme',
    'femme',
    'enfant',
    'chat',
    'chien',
    'maison',
    'école',
    'aller',
    'venir',
    'faire',
    'voir',
    'parler',
    'ami',
    'famille',
    'père',
    'mère',
    'frère',
    'sœur',
  ]);

  const a2Words = new Set([
    'maintenant',
    'hier',
    'demain',
    'toujours',
    'jamais',
    'souvent',
    'acheter',
    'vendre',
    'travailler',
    'étudier',
    'voyager',
    'vacances',
    'restaurant',
    'cuisine',
    'chambre',
    'salle',
    'train',
    'bus',
    'voiture',
    'vélo',
    'téléphone',
    'ordinateur',
    'lettre',
    'livre',
    'journal',
    'magazine',
    'ville',
    'pays',
    'nation',
    'temps',
    'météo',
    'pluie',
    'soleil',
    'froid',
    'chaud',
    'saison',
    'printemps',
    'été',
    'automne',
    'hiver',
    'couleur',
    'rouge',
    'bleu',
    'vert',
    'jaune',
    'blanc',
    'noir',
  ]);

  const b1Words = new Set([
    'cependant',
    'pourtant',
    'néanmoins',
    'donc',
    'ainsi',
    "d'ailleurs",
    'effectivement',
    'en effet',
    'tellement',
    'plutôt',
    'assez',
    'également',
    'environnement',
    'développement',
    'technologie',
    'système',
    'société',
    'culture',
    'économie',
    'politique',
    'gouvernement',
    'citoyen',
    'droit',
    'devoir',
    'responsabilité',
    'possibilité',
    'différence',
    'ressemblance',
    'cause',
    'conséquence',
    'problème',
    'solution',
    'opinion',
    'idée',
    'pensée',
    'sentiment',
    'émotion',
    'espoir',
    'crainte',
    'joie',
    'tristesse',
    'colère',
    'surprise',
    'inquiétude',
  ]);

  const b2Words = new Set([
    'préconiser',
    'argumenter',
    'débattre',
    'envisager',
    'supposer',
    'remettre en question',
    'contester',
    'réfuter',
    'nier',
    'affirmer',
    'considérer',
    'estimer',
    'juger',
    'évaluer',
    'critiquer',
    'analyser',
    'synthétiser',
    'résumer',
    'conclure',
    'inférer',
    'déduire',
    'phénomène',
    'tendance',
    'évolution',
    'révolution',
    'transformation',
    'modification',
    'altération',
    'détérioration',
    'amélioration',
    'progrès',
    'régression',
    'stagnation',
    'essor',
    'déclin',
    'croissance',
    'décroissance',
    'institution',
    'organisation',
  ]);

  const c1Words = new Set([
    'paradigme',
    'dichotomie',
    'ambivalence',
    'paradoxe',
    'oxymore',
    'antagonisme',
    'dialectique',
    'syllogisme',
    'analogie',
    'métaphore',
    'allégorie',
    'euphémisme',
    'litote',
    'hyperbole',
    'pléonasme',
    'métonymie',
    'synecdoque',
    'périphrase',
    'antithèse',
    'chiasme',
    'anachronisme',
    'amalgame',
    'aphorisme',
    'digression',
    'dilemme',
    'problématique',
    'postulat',
    'hypothèse',
    'théorème',
    'conjecture',
    'rhétorique',
    'sophistique',
    'casuistique',
    'herméneutique',
    'épistémologie',
    'ontologie',
    'téléologie',
    'déontologie',
    'axiologie',
  ]);

  // Words with certain characteristics
  // Length analysis
  const wordLength = wordLower.length;

  // Check for complex prefixes/suffixes
  const hasComplexPrefix =
    /^(anti|contre|extra|hyper|infra|inter|intra|macro|micro|post|pré|proto|pseudo|super|supra|trans|ultra)/.test(
      wordLower,
    );
  const hasComplexSuffix =
    /(ification|isation|abilité|ibilité|atoire|itoire|escent|escence|algie|isme|iste|ique|ment|logie|graphie|crate|cratie)$/.test(
      wordLower,
    );

  // Check for technical/scientific terms
  const isScientific =
    /(logie|nomie|ique|scope|mètre|gène|phile|phobe|morphe|cide|fère|vore|some|ptère|cyte|lyse|ose|ite)$/.test(
      wordLower,
    );

  // Check for common words by direct match
  if (a1Words.has(wordLower)) return 'A1';
  if (a2Words.has(wordLower)) return 'A2';
  if (b1Words.has(wordLower)) return 'B1';
  if (b2Words.has(wordLower)) return 'B2';
  if (c1Words.has(wordLower)) return 'C1';

  // Length-based heuristics (very simplistic baseline)
  if (wordLength <= 4) return 'A1';
  if (wordLength <= 6) return 'A2';
  if (wordLength <= 8) return 'B1';

  // Complexity-based heuristics
  if (hasComplexPrefix || hasComplexSuffix) {
    if (wordLength > 12 || isScientific) return 'C2';
    return 'C1';
  }

  if (isScientific) return 'C1';

  if (wordLength > 10) return 'B2';

  // Default fallback
  return 'B1';
}
