export const promptMessage = (word: string) => `
Vous êtes un professeur de français expérimenté. Pour le mot "${word}", fournissez une réponse structurée en format JSON suivant ce modèle :

{
  "mot": "${word}",
  "type": "verbe, adjectif, ...",
  "explication": "Définition claire et accessible du mot avec ses principaux usages en français",
  "niveau_max": "B1",
  "phrases": [
    {
      "texte": "Phrase d'exemple 1",
      "niveau": "A1",
      "contexte": "Description du contexte"
    },
    {
      "texte": "Phrase d'exemple 2",
      "niveau": "A2",
      "contexte": "Description du contexte" 
    },
    {
      "texte": "Phrase d'exemple 3",
      "niveau": "B1",
      "contexte": "Description du contexte"
    }
  ],
  "image": {
    "prompt": "Description détaillée pour générer l'image",
    "elements_cles": ["élément 1", "élément 2", "élément 3"],
    "objectif_pedagogique": "Description de l'objectif pédagogique de l'image"
  }
}

Les phrases doivent être simples, authentiques et adaptées au niveau indiqué. L'explication doit être accessible pour des apprenants de niveau B1 maximum. Le prompt d'image doit permettre de générer une illustration claire et pédagogique du concept.
`;
