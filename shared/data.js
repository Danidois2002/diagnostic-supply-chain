/* =========================================================
   Contenu du diagnostic, partagé par le site (src/) et l'API (api/)
   ========================================================= */

/* Les 4 niveaux de maturité, du moins au plus mature */
export const LEVELS = {
  F: {
    rank: 1,
    title: 'Supply Chain Fragmentée',
    short: 'Fragmentée',
    image: 'img/niveau-f.webp',
    description: 'Fonctionnement en silos & en réaction à la demande',
    details: "Ce niveau de maturité reflète une connaissance peu poussée des composants de la logistique et d'une Supply Chain. Il sous-entend un fonctionnement en silos au sein de votre entreprise ; cela veut dire que la série de risques pour vos activités logistiques est plus forte mais peut vous aider à exploser vos coûts logistiques. Aussi, vous risquez de souffrir des fluctuations de la demande sans pouvoir les anticiper complètement.",
    risks: ['Ruptures de stocks', 'Retards de livraison', 'Coûts logistiques importants', 'Erreurs dans les informations internes'],
  },
  E: {
    rank: 2,
    title: 'Excellence interne',
    short: 'Excellence interne',
    image: 'img/niveau-e.webp',
    description: 'Optimisation des activités internes, anticipation & planification',
    details: "Ce niveau de maturité reflète une réelle maîtrise des activités internes, en les anticipant et en cherchant à les optimiser. Cependant, dans le contexte d'une Supply Chain, les limites de l'entreprise doivent être vues comme étendues jusqu'aux fournisseurs, clients et partenaires clés qui y jouent un rôle central. Ce niveau de maturité sous-entend que cela n'est pas encore intégré, ce qui génère des risques fournisseurs, et qui limite votre visibilité sur l'ensemble de la chaîne. Cela vous rend vulnérable aux éléments extérieurs à vos activités propres.",
    risks: ['Risques fournisseurs (confiance, qualité, etc.)', "Visibilité partielle sur la chaîne d'approvisionnement"],
  },
  I: {
    rank: 3,
    title: 'Intégration',
    short: 'Intégration',
    image: 'img/niveau-i.webp',
    description: "Pilotage en temps réel, interconnexion avec les partenaires clés, hautes performances & utilisation efficiente d'outils digitaux",
    details: "Ce niveau de maturité reflète l'application du concept d'entreprise étendue : vous étendez votre transversalité jusqu'aux partenaires clés, ce qui vous permet de piloter les flux en temps réel. Cette visibilité sur l'ensemble de la chaîne et les interconnexions avec les partenaires crée ainsi un réseau complexe. Cette complexité et l'alignement de vos partenaires avec votre entreprise sont des éléments sensibles à gérer, sources de risques.",
    risks: ['Complexité du réseau', 'Alignement des objectifs long-termes'],
  },
  C: {
    rank: 4,
    title: 'Supply Chain Collaborative',
    short: 'Collaborative',
    image: 'img/niveau-c.webp',
    description: "Maîtrise totale des flux d'un bout à l'autre de la chaîne, système hyperconnecté plus efficace, fiable et performant dans son intégralité",
    details: "Ce niveau de maturité reflète une Supply Chain pilotée de bout en bout, en véritable collaboration avec vos fournisseurs, vos clients et vos prestataires. Les informations sont partagées en temps réel, les prévisions et les approvisionnements sont construits ensemble (par exemple en Gestion Partagée des Approvisionnements) et les capacités de transport ou de stockage sont mutualisées avec d'autres acteurs. Votre chaîne logistique gagne ainsi en efficience, en fiabilité et en résilience face aux aléas. L'enjeu est désormais de faire durer cette dynamique : entretenir la confiance avec vos partenaires, partager équitablement les gains et continuer à innover.",
    risks: [],
  },
};
export const LEVEL_ORDER = ['F', 'E', 'I', 'C'];

/* Les 7 thématiques : la première question de chacune, son titre et sa description */
export const THEMES = [
  { start: 1, title: 'Transversalité en interne', desc: 'Cette section évalue la communication et la collaboration entre les services internes de votre supply chain.' },
  { start: 5, title: 'Sécurisation de la supply chain', desc: "Cette partie examine les mesures prises pour sécuriser l'ensemble de votre chaîne logistique." },
  { start: 9, title: 'Satisfaction client', desc: 'Ici, on mesure la manière dont votre entreprise prend en compte la satisfaction client dans sa logistique.' },
  { start: 13, title: 'Gestion de la demande', desc: 'Cette section explore vos pratiques de prévision et de gestion de la demande.' },
  { start: 16, title: 'Professionnalisation', desc: 'On évalue ici le niveau de professionnalisation et de formalisation de vos processus logistiques.' },
  { start: 20, title: 'Intégration des partenaires', desc: "Cette section analyse le niveau d'intégration avec vos partenaires logistiques et commerciaux." },
  { start: 24, title: 'Innovation', desc: "On s'intéresse ici à la capacité d'innovation et à l'usage de technologies ou partenariats avancés." },
];

/* Les 27 affirmations et leur catégorie de notation (F, E, I ou C) */
export const QUESTIONS = [
  { cat: 'E', text: "Nous disposons d'un système d'information performant et intégré nous permettant d'améliorer la communication entre les fonctions clés de notre supply chain, d'accélérer nos activités logistiques et d'assurer une bonne traçabilité." },
  { cat: 'E', text: "Nous mesurons la performance de nos activités au travers d'indicateurs pour analyser leur alignement avec les objectifs fixés et prendre les actions nécessaires." },
  { cat: 'E', text: 'Nos différents systèmes et outils IT sont interopérables, et nous minimisons ainsi le double encodage.' },
  { cat: 'E', text: 'Nous avons des équipes pluridisciplinaires pour gagner en efficacité globale, et plus particulièrement notre logistique et notre marketing/vente collaborent constamment pour optimiser les activités et la réponse aux clients.' },
  { cat: 'E', text: "Régulièrement, nous réalisons un audit et/ou une cartographie des risques encourus par notre entreprise en tout point de la chaîne logistique afin de prendre les mesures nécessaires de sécurisation." },
  { cat: 'E', text: "Nous enregistrons et gardons un historique des incidents rencontrés, et définissons ensuite des plans d'action pour les incidents répétitifs et/ou impactant le plus l'efficacité de nos activités." },
  { cat: 'F', text: "Nous avons une liste de fournisseurs clés critiques, nécessaires au bon fonctionnement de nos activités, et pour lesquels nous avons mis en place des dispositions telles que du double sourcing, la mise en place d'un stock de sécurité, la définition de règles de substitution en cas de défaillance, etc." },
  { cat: 'E', text: 'Pour nos clients clés, nous avons défini des normes de service, une liste de produits critiques et des critères de priorité permettant de leur assurer un haut taux de service client.' },
  { cat: 'I', text: 'Nous réalisons périodiquement des enquêtes sur les attentes de nos clients (clés), et nous développons une stratégie logistique basée sur ces analyses pour améliorer la satisfaction et la fidélisation des clients (clés).' },
  { cat: 'I', text: "Par la signature d'accords de service et la définition de normes de service par produit et/ou par catégorie de produit, nous connaissons parfaitement les exigences de nos clients (par exemple, les délais jugés acceptables)." },
  { cat: 'E', text: 'Les conditions de soutien après-vente sont stipulées dans les contrats.' },
  { cat: 'E', text: "Pour absorber les fortes variations de la demande, nous avons développé l'un des concepts suivant dans notre entreprise : la conception modulaire, la gestion dynamique des stocks, la différenciation retardée, la réallocation rapide des ressources." },
  { cat: 'E', text: "Nous réalisons des prévisions de ventes et de flux logistiques basées sur la demande réelle et des paramètres d'ajustement." },
  { cat: 'E', text: "Nous utilisons nos prévisions de ventes comme base au dimensionnement de nos stocks, à la planification de nos ressources de distribution, et au pilotage de nos activités d'approvisionnement et de production." },
  { cat: 'I', text: 'Nous estimons la fiabilité de nos prévisions de ventes à plus de 90%.' },
  { cat: 'E', text: 'Nous avons une cartographie de notre processus logistique, des matières premières jusqu\'aux produits finis, représentant les process et activités, les temps opératoires et les paramètres de gestion logistique.' },
  { cat: 'E', text: "Nous définissons et rédigeons des procédures précises pour assurer le bon déroulement de nos activités, et ce même en cas d'absence et/ou de remplacement de nos employés." },
  { cat: 'E', text: "Notre processus logistique fait l'objet de certifications selon des normes de qualité telles que des normes ISO." },
  { cat: 'E', text: 'Nous calculons et analysons régulièrement les coûts réels de notre logistique par niveau de service, par type de client et/ou par canal de distribution.' },
  { cat: 'I', text: "Nous fluidifions et accélérons les échanges d'informations entre notre entreprise et nos partenaires clés grâce à des moyens d'échanges de données informatisés, ce qui permet un alignement quasi en temps réel." },
  { cat: 'I', text: "Nous dressons et signons des accords de services (ou Service Level Agreement) avec nos partenaires, incluant des objectifs de performance ainsi que des critères d'évaluation, et tenant compte des attentes et contraintes de toutes les parties prenantes." },
  { cat: 'C', text: 'Nous avons mis en place des méthodes de gestion collaborative des activités avec nos fournisseurs, clients et/ou prestataires pour améliorer la transparence, la visibilité et l\'efficacité de la chaîne de valeur dans sa globalité (par exemple : GPA Gestion Partagée des Approvisionnements).' },
  { cat: 'C', text: "Nous réfléchissons constamment aux opportunités de mutualisation des capacités de transport, des capacités de stockage, mais aussi du temps et des connaissances avec d'autres acteurs, afin de répartir les coûts et de gagner en efficience." },
  { cat: 'E', text: 'Nous avons des données disponibles, structurées, validées et largement communiquées parmi les différents départements.' },
  { cat: 'E', text: 'Nous sommes renseignés quant aux aides proposées par la région wallonne pour le développement de solutions digitales visant à améliorer notre Supply Chain.' },
  { cat: 'I', text: 'Nous avons déjà collaboré avec des Universités, des Hautes Ecoles et/ou des fournisseurs de solution.' },
  { cat: 'I', text: "Nous mettons en place des actions autour de nos activités logistiques afin de réduire leur empreinte écologique et/ou nos émissions de gaz à effet de serre." },
];

/* Les 3 réponses possibles (la valeur est celle utilisée par le calcul) */
export const ANSWERS = [
  { value: '0', label: 'Pas du tout' },
  { value: '1', label: 'En cours' },
  { value: '2', label: 'Mis en place' },
];

/* Lexique : termes soulignés dans les questions */
export const LEXIQUE = {
  'Supply Chain': "La Supply Chain englobe la chaîne de l'offre et de la demande, depuis les matières premières jusqu'au client final. Elle traverse toutes les activités logistiques et comprend aussi les flux d'informations et les flux financiers. La Supply Chain a pour but central la satisfaction de la demande des clients, et s'appuie pour cela sur un processus transversal incluant la planification, la coordination et le pilotage des flux dans l'entreprise.",
  'Chaîne logistique': "La chaîne logistique englobe toutes les fonctions clés logistiques (processus de stockage, de production, de transport et de distribution), leurs liens, les flux d'information qu'ils requièrent, et tous les mouvements générés au cours de ces différentes étapes.",
  'Taux de service client': "Le taux de service client est une mesure clé permettant de juger du niveau de service apporté aux clients, c'est-à-dire la capacité à fournir les produits/services selon les temps, les quantités et la qualité convenus. Cet indicateur reflète donc l'efficacité et la fiabilité de la Supply Chain de l'entreprise pour répondre aux attentes de ses clients. Typiquement, le taux de service client se calcule en divisant le nombre de demandes (commandes) satisfaites dans les délais par le nombre total de demandes (commandes), multiplié par 100 pour obtenir un pourcentage.",
  'Stratégie logistique': "La stratégie logistique représente une série de décisions ayant pour but de faciliter l'optimisation des activités logistiques (en termes de coûts mais aussi de performance) tout en facilitant la satisfaction client (respect des délais et de la qualité attendue). Ainsi, le choix des méthodes de transport, d'approvisionnement, de stockage ou de distribution sont autant de décisions composant cette stratégie.",
  'Processus logistique': "Un processus logistique désigne l'ensemble des étapes et phases par lesquelles passe un produit, depuis sa fabrication jusqu'à sa livraison au client. Il désigne donc les activités successives réalisées tout au long du cycle de vie du produit, en ce compris le transport, le stockage et la distribution.",
  'Gestion collaborative': "En logistique, une gestion collaborative des activités consiste à coopérer en temps réel avec ses partenaires pour gagner en efficacité globale et optimiser la Supply Chain. Toutes les informations de la chaîne logistique sont partagées en temps réel, créant une base commune pour des décisions conjointes, encadrées par la définition d'objectifs communs et par le suivi de mesures du respect de ces objectifs.",
  'GPA': "La Gestion Partagée des Approvisionnements (GPA) est une stratégie de réapprovisionnement en continu ayant pour but d'améliorer la disponibilité des produits tout en réduisant les stocks et en augmentant la réactivité. Elle passe par une collaboration étroite entre l'entreprise et ses fournisseurs qui deviennent acteurs dans la gestion des approvisionnements, selon des règles de gestions définies dans un contrat de coopération logistique.",
  'Efficience': "L'efficience est la consommation de ressources utilisées pour atteindre un certain résultat. Gagner en efficience dans ses activités logistiques, c'est en fait tendre vers la maximisation de l'utilisation des ressources (matérielles et immatérielles) sollicitées dans ces activités logistiques.",
};

/* Numéros des questions de chaque thématique (à partir de 1) */
export const THEME_QUESTIONS = THEMES.map((theme, i) => {
  const end = THEMES[i + 1] ? THEMES[i + 1].start : QUESTIONS.length + 1;
  return Array.from({ length: end - theme.start }, (_, k) => theme.start + k);
});
