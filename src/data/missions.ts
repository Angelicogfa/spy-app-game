import heroSpyFamilyImg from '../assets/images/hero_spy_family_1795096736081.jpg';
import missionMathImg from '../assets/images/mission_math_peanuts_1795096736080.jpg';
import missionRoutineImg from '../assets/images/mission_routine_eden_1795096735021.jpg';
import missionEmotionsImg from '../assets/images/mission_emotions_telepathy_1795096735445.jpg';
import missionLogicImg from '../assets/images/mission_logic_twilight_1795096735903.jpg';
import missionClassificationImg from '../assets/images/mission_classification_forger_1795096734724.jpg';
import {
  ChoiceOption,
  DifficultyLevel,
  DraggableItem,
  MissionChallenge,
  MissionDomain,
  MissionMetadata,
  SequenceSlotItem,
  VisualToken,
} from '../types/game';

export const HERO_IMAGE_PATH = heroSpyFamilyImg;

export const MISSIONS_META: MissionMetadata[] = [
  {
    domain: 'math',
    title: 'Operação Amendoins da Anya',
    shortTitle: 'Matemática',
    animeReference: 'Lanche e Amendoins da Família Forger',
    skillLabel: 'Matemática Básica',
    description:
      'Ajude a Anya a contar amendoins, somar os lanches feitos pelo Loid e dividir biscoitos igualmente para o Bond.',
    characterGuide: 'Anya e Bond',
    imagePath: missionMathImg,
    fallbackGradient: 'from-[#FEF3C7] via-[#FDE68A] to-[#F59E0B]',
    accentColor: '#EC4899',
    badgeText: 'Contagem · Soma · Subtração · Divisão',
  },
  {
    domain: 'routine',
    title: 'Preparação para a Academia Eden',
    shortTitle: 'Rotina Diária',
    animeReference: 'Entrevista "Elegante!" no Colégio Eden',
    skillLabel: 'Rotina e Autonomia',
    description:
      'Organize a mochila escolar, monte um lanche equilibrado e coloque os passos da manhã na ordem certa.',
    characterGuide: 'Anya e Sr. Henderson',
    imagePath: missionRoutineImg,
    fallbackGradient: 'from-[#DCFCE7] via-[#86EFAC] to-[#15803D]',
    accentColor: '#14532D',
    badgeText: 'Mochila · Sequência do Dia · Autonomia',
  },
  {
    domain: 'emotions',
    title: 'Telepatia da Anya',
    shortTitle: 'Emoções',
    animeReference: 'Leitura de Pensamentos na Sala de Aula',
    skillLabel: 'Emoções e Situações Sociais',
    description:
      'Use o poder telepático apontando para o personagem, descubra como ele se sente e escolha a atitude mais gentil.',
    characterGuide: 'Anya, Damian e Becky',
    imagePath: missionEmotionsImg,
    fallbackGradient: 'from-[#FCE7F3] via-[#F9A8D4] to-[#DB2777]',
    accentColor: '#DB2777',
    badgeText: 'Empatia · Expressões · Amizade',
  },
  {
    domain: 'logic',
    title: 'Códigos do Twilight e Visões do Bond',
    shortTitle: 'Sequência Lógica',
    animeReference: 'Mensagens da WISE e Premonições do Bond',
    skillLabel: 'Sequência Lógica e Padrões',
    description:
      'Decifre padrões secretos com o Agente Twilight e complete a ordem das cenas previstas pelo cão Bond.',
    characterGuide: 'Loid e Bond',
    imagePath: missionLogicImg,
    fallbackGradient: 'from-[#FEF9C3] via-[#FDE047] to-[#CA8A04]',
    accentColor: '#B45309',
    badgeText: 'Padrões · Códigos · Causa e Efeito',
  },
  {
    domain: 'classification',
    title: 'Dossiê Secreto dos Forger',
    shortTitle: 'Classificação',
    animeReference: 'Organizando os Segredos na Sala dos Forger',
    skillLabel: 'Classificação e Atenção Visual',
    description:
      'Separe os objetos da família nas pastas certas por categoria, cor ou forma e treine seu olhar de espião.',
    characterGuide: 'Loid, Yor e Anya',
    imagePath: missionClassificationImg,
    fallbackGradient: 'from-[#FEE2E2] via-[#FCA5A5] to-[#DC2626]',
    accentColor: '#DC2626',
    badgeText: 'Categorias · Cores · Atenção Seletiva',
  },
];

export function getMissionMeta(domain: MissionDomain): MissionMetadata {
  return MISSIONS_META.find((m) => m.domain === domain) || MISSIONS_META[0];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeTokens(count: number, emoji: string, label: string, crossedOutCount = 0): VisualToken[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${label}_${i}`,
    label,
    emoji,
    crossedOut: i >= count - crossedOutCount,
  }));
}

function generateMathChallenges(level: DifficultyLevel): MissionChallenge[] {
  const maxVal = level === 1 ? 5 : level === 2 ? 9 : 14;
  const peanutTarget = level === 1 ? 3 : level === 2 ? 5 : 7;
  const totalPeanuts = peanutTarget + 3;

  const addA = level === 1 ? 2 : level === 2 ? 4 : 7;
  const addB = level === 1 ? 2 : level === 2 ? 3 : 6;
  const addSum = addA + addB;

  const subTotal = level === 1 ? 5 : level === 2 ? 8 : 12;
  const subRemove = level === 1 ? 2 : level === 2 ? 3 : 5;
  const subLeft = subTotal - subRemove;

  const shareEach = level === 1 ? 2 : level === 2 ? 3 : 4;
  const shareTotal = shareEach * 2;

  const compLeft = level === 1 ? 4 : level === 2 ? 7 : 11;
  const compRight = level === 1 ? 2 : level === 2 ? 5 : 8;

  const makeNumberChoices = (correct: number): ChoiceOption[] => {
    const distractors = new Set<number>();
    const offsets = [-2, -1, 1, 2, 3];
    for (const off of shuffle(offsets)) {
      const candidate = correct + off;
      if (candidate >= 1 && candidate <= maxVal + 6 && candidate !== correct) {
        distractors.add(candidate);
      }
      if (distractors.size === 2) break;
    }
    const vals = shuffle([correct, ...Array.from(distractors)]);
    return vals.map((v) => ({
      id: `num_${v}`,
      label: String(v),
      sublabel: v === 1 ? 'item' : 'itens',
      emoji: '⭐',
      isCorrect: v === correct,
      visualCount: v <= 10 ? v : undefined,
    }));
  };

  return [
    {
      id: `math_count_${level}`,
      domain: 'math',
      level,
      mode: 'drag_count',
      characterName: 'Anya',
      characterEmoji: '🥜',
      sceneTag: 'Mochila da Academia Eden',
      prompt: `Coloque exatamente ${peanutTarget} amendoins na mochila da Anya!`,
      narrationText: `Anya adora amendoins! Faça pinça e arraste exatamente ${peanutTarget} amendoins para a mochila da Academia Eden.`,
      hintText: `Conte devagar enquanto solta cada amendoim na mochila: falta completar ${peanutTarget}.`,
      successMessage: `Waku waku! Você colocou ${peanutTarget} amendoins certinhos!`,
      draggableItems: Array.from({ length: totalPeanuts }, (_, i) => ({
        id: `peanut_${i}`,
        label: `Amendoim ${i + 1}`,
        emoji: '🥜',
        category: 'peanut',
        accentBg: 'bg-[#FEF3C7]',
        accentBorder: 'border-[#F59E0B]',
      })),
      dropZones: [
        {
          id: 'satchel',
          label: 'Mochila da Anya',
          subtitle: `Meta: ${peanutTarget} amendoins`,
          emoji: '🎒',
          acceptsCategory: 'peanut',
          targetCount: peanutTarget,
          accentBg: 'bg-[#DCFCE7]',
          accentBorder: 'border-[#14532D]',
        },
      ],
      targetTotalCount: peanutTarget,
    },
    {
      id: `math_add_${level}`,
      domain: 'math',
      level,
      mode: 'pinch_choice',
      characterName: 'Loid',
      characterEmoji: '🍱',
      sceneTag: 'Cozinha da Família Forger',
      prompt: `Loid fez ${addA} bolinhos e ${addB} morangos. Quantos lanches temos juntos?`,
      narrationText: `Loid preparou ${addA} bolinhos e ${addB} morangos. Conte todos juntos e faça pinça no número certo.`,
      hintText: `Conte primeiro os ${addA} bolinhos e continue contando com os ${addB} morangos!`,
      successMessage: `Missão cumprida! ${addA} mais ${addB} é igual a ${addSum}.`,
      visualGroups: [
        {
          title: `${addA} bolinhos`,
          tokens: makeTokens(addA, '🍙', 'bolinho'),
          operatorAfter: '+',
        },
        {
          title: `${addB} morangos`,
          tokens: makeTokens(addB, '🍓', 'morango'),
        },
      ],
      choices: makeNumberChoices(addSum),
    },
    {
      id: `math_sub_${level}`,
      domain: 'math',
      level,
      mode: 'pinch_choice',
      characterName: 'Loid (Agente Twilight)',
      characterEmoji: '🕵️',
      sceneTag: 'Maleta de Missão',
      prompt: `Loid tinha ${subTotal} pistas secretas e entregou ${subRemove}. Quantas sobraram?`,
      narrationText: `Loid tinha ${subTotal} pistas secretas e entregou ${subRemove} delas. Veja as que ficaram sem risco e pinçe a resposta.`,
      hintText: `Conte apenas as cartas que NÃO estão riscadas na mesa!`,
      successMessage: `Excelente espião! Sobraram ${subLeft} pistas secretas.`,
      visualGroups: [
        {
          title: `${subTotal} pistas (tirou ${subRemove})`,
          tokens: makeTokens(subTotal, '✉️', 'pista', subRemove),
        },
      ],
      choices: makeNumberChoices(subLeft),
    },
    {
      id: `math_share_${level}`,
      domain: 'math',
      level,
      mode: 'drag_buckets',
      characterName: 'Bond',
      characterEmoji: '🐶',
      sceneTag: 'Hora dos Petiscos do Bond',
      prompt: `Divida os ${shareTotal} biscoitos igualmente: coloque ${shareEach} em cada tigela do Bond!`,
      narrationText: `Borf! Ajude a colocar ${shareEach} biscoitos na tigela da manhã e ${shareEach} na tigela da tarde.`,
      hintText: `Coloque um biscoito de cada vez alternando entre as duas tigelas até ambas terem ${shareEach}.`,
      successMessage: `Borf! Divisão super justa: ${shareEach} biscoitos em cada tigela!`,
      draggableItems: Array.from({ length: shareTotal }, (_, i) => ({
        id: `treat_${i}`,
        label: 'Biscoito',
        emoji: '🦴',
        category: 'any_bowl',
        accentBg: 'bg-[#FFEDD5]',
        accentBorder: 'border-[#EA580C]',
      })),
      dropZones: [
        {
          id: 'bowl_morning',
          label: 'Tigela da Manhã',
          subtitle: `Meta: ${shareEach}`,
          emoji: '🥣',
          acceptsCategory: 'any_bowl',
          targetCount: shareEach,
          accentBg: 'bg-[#FEF9C3]',
          accentBorder: 'border-[#CA8A04]',
        },
        {
          id: 'bowl_afternoon',
          label: 'Tigela da Tarde',
          subtitle: `Meta: ${shareEach}`,
          emoji: '🥣',
          acceptsCategory: 'any_bowl',
          targetCount: shareEach,
          accentBg: 'bg-[#FCE7F3]',
          accentBorder: 'border-[#DB2777]',
        },
      ],
    },
    {
      id: `math_compare_${level}`,
      domain: 'math',
      level,
      mode: 'pinch_choice',
      characterName: 'Anya e Becky',
      characterEmoji: '⭐',
      sceneTag: 'Recreio na Academia Eden',
      prompt: 'Qual bandeja tem MAIS estrelas douradas?',
      narrationText: 'Observe as duas bandejas com atenção e faça pinça na bandeja que tem mais estrelas douradas.',
      hintText: `Compare os números: a bandeja com ${compLeft} tem mais do que a bandeja com ${compRight}.`,
      successMessage: `Muito bem! ${compLeft} é maior que ${compRight}!`,
      visualGroups: [
        {
          title: `Bandeja A (${compLeft})`,
          tokens: makeTokens(compLeft, '⭐', 'estrelaA'),
        },
        {
          title: `Bandeja B (${compRight})`,
          tokens: makeTokens(compRight, '⭐', 'estrelaB'),
        },
      ],
      choices: shuffle([
        {
          id: 'tray_a',
          label: `Bandeja A (${compLeft})`,
          sublabel: 'Tem mais estrelas',
          emoji: '🌟',
          isCorrect: true,
        },
        {
          id: 'tray_b',
          label: `Bandeja B (${compRight})`,
          sublabel: 'Tem menos estrelas',
          emoji: '✨',
          isCorrect: false,
        },
      ]),
    },
  ];
}

function generateRoutineChallenges(level: DifficultyLevel): MissionChallenge[] {
  const backpackItems: DraggableItem[] = [
    {
      id: 'notebook',
      label: 'Caderno',
      emoji: '📓',
      category: 'school',
      accentBg: 'bg-[#DCFCE7]',
      accentBorder: 'border-[#15803D]',
    },
    {
      id: 'pencil',
      label: 'Lápis',
      emoji: '✏️',
      category: 'school',
      accentBg: 'bg-[#FEF9C3]',
      accentBorder: 'border-[#CA8A04]',
    },
    {
      id: 'pillow',
      label: 'Travesseiro',
      emoji: '🛏️',
      category: 'home',
      accentBg: 'bg-[#FCE7F3]',
      accentBorder: 'border-[#DB2777]',
    },
    {
      id: 'soap',
      label: 'Sabonete',
      emoji: '🧼',
      category: 'home',
      accentBg: 'bg-[#E0F2FE]',
      accentBorder: 'border-[#0284C7]',
    },
  ];

  if (level >= 2) {
    backpackItems.push({
      id: 'lunchbox',
      label: 'Lancheira',
      emoji: '🍱',
      category: 'school',
      accentBg: 'bg-[#FFEDD5]',
      accentBorder: 'border-[#EA580C]',
    });
  }

  const morningSteps: SequenceSlotItem[] = [
    { id: 'wake', label: '1º Acordar', emoji: '☀️', bgClass: 'bg-[#FEF9C3]' },
    { id: 'brush', label: '2º Escovar dentes', emoji: '🪥', bgClass: 'bg-[#E0F2FE]' },
    { id: 'uniform', label: '3º Vestir uniforme', emoji: '👔', bgClass: 'bg-[#DCFCE7]' },
  ];

  const lunchSteps: SequenceSlotItem[] = [
    { id: 'wash', label: '1º Lavar as mãos', emoji: '🫧', bgClass: 'bg-[#E0F2FE]' },
    { id: 'eat', label: '2º Comer o lanche', emoji: '🥪', bgClass: 'bg-[#FEF3C7]' },
    { id: 'tidy', label: '3º Guardar tudo', emoji: '🎒', bgClass: 'bg-[#DCFCE7]' },
  ];

  const nightSteps: SequenceSlotItem[] = [
    { id: 'bath', label: '1º Tomar banho', emoji: '🚿', bgClass: 'bg-[#E0F2FE]' },
    { id: 'pajama', label: '2º Vestir pijama', emoji: '👕', bgClass: 'bg-[#FCE7F3]' },
    { id: 'sleep', label: '3º Dormir calmo', emoji: '🌙', bgClass: 'bg-[#EDE9FE]' },
  ];

  const snackItems: DraggableItem[] = [
    {
      id: 'apple',
      label: 'Maçã',
      emoji: '🍎',
      category: 'snack',
      accentBg: 'bg-[#FEE2E2]',
      accentBorder: 'border-[#DC2626]',
    },
    {
      id: 'sandwich',
      label: 'Sanduíche',
      emoji: '🥪',
      category: 'snack',
      accentBg: 'bg-[#FEF3C7]',
      accentBorder: 'border-[#D97706]',
    },
    {
      id: 'water',
      label: 'Água',
      emoji: '💧',
      category: 'snack',
      accentBg: 'bg-[#E0F2FE]',
      accentBorder: 'border-[#0284C7]',
    },
    {
      id: 'shoe',
      label: 'Sapato',
      emoji: '👞',
      category: 'not_snack',
      accentBg: 'bg-[#F3F4F6]',
      accentBorder: 'border-[#6B7280]',
    },
  ];

  return [
    {
      id: `routine_bag_${level}`,
      domain: 'routine',
      level,
      mode: 'drag_buckets',
      characterName: 'Sr. Henderson',
      characterEmoji: '🎩',
      sceneTag: 'Preparação Elegante da Mochila',
      prompt: 'Separe cada objeto: o que vai na Mochila da Eden e o que fica em Casa!',
      narrationText: 'Vamos arrumar tudo com elegância! Arraste os materiais escolares para a mochila e o que fica em casa para a prateleira.',
      hintText: 'Caderno, lápis e lancheira vão para a escola. Travesseiro e sabonete ficam em casa!',
      successMessage: 'Elegante! A mochila da Academia Eden está impecável!',
      draggableItems: shuffle(backpackItems),
      dropZones: [
        {
          id: 'school_bag',
          label: 'Mochila da Eden',
          subtitle: 'Vai para a escola',
          emoji: '🎒',
          acceptsCategory: 'school',
          accentBg: 'bg-[#DCFCE7]',
          accentBorder: 'border-[#14532D]',
        },
        {
          id: 'home_shelf',
          label: 'Fica em Casa',
          subtitle: 'Quarto e banheiro',
          emoji: '🏠',
          acceptsCategory: 'home',
          accentBg: 'bg-[#FCE7F3]',
          accentBorder: 'border-[#DB2777]',
        },
      ],
    },
    {
      id: `routine_morning_${level}`,
      domain: 'routine',
      level,
      mode: 'sequence_order',
      characterName: 'Loid',
      characterEmoji: '⏰',
      sceneTag: 'Manhã na Casa dos Forger',
      prompt: 'Coloque a rotina da manhã na ordem certa (1º, 2º e 3º)!',
      narrationText: 'Ajude a Anya a se arrumar para a escola! Arraste os cartões para o primeiro, segundo e terceiro passos.',
      hintText: 'Primeiro acordamos com o sol, depois escovamos os dentes e por último vestimos o uniforme.',
      successMessage: 'Perfeito! Anya está pronta na hora certa para a aula!',
      sequencePromptItems: [null, null, null],
      sequenceExpectedOrder: morningSteps.map((s) => s.id),
      sequencePool: shuffle(morningSteps),
    },
    {
      id: `routine_snack_${level}`,
      domain: 'routine',
      level,
      mode: 'drag_buckets',
      characterName: 'Yor',
      characterEmoji: '🍎',
      sceneTag: 'Montando a Lancheira',
      prompt: 'Ajude a Yor a separar o que entra na Lancheira do recreio!',
      narrationText: 'Arraste os alimentos e a água para a lancheira. O que não é de comer vai para o guarda-roupa.',
      hintText: 'Maçã, sanduíche e água entram na lancheira!',
      successMessage: 'Que lanche caprichado! Yor ficou super feliz!',
      draggableItems: shuffle(snackItems),
      dropZones: [
        {
          id: 'lunchbox_zone',
          label: 'Lancheira',
          subtitle: 'Comida e água',
          emoji: '🍱',
          acceptsCategory: 'snack',
          accentBg: 'bg-[#FEF9C3]',
          accentBorder: 'border-[#CA8A04]',
        },
        {
          id: 'wardrobe_zone',
          label: 'Não é lanche',
          subtitle: 'Guardar no quarto',
          emoji: '🚪',
          acceptsCategory: 'not_snack',
          accentBg: 'bg-[#F3F4F6]',
          accentBorder: 'border-[#57534E]',
        },
      ],
    },
    {
      id: `routine_lunch_order_${level}`,
      domain: 'routine',
      level,
      mode: 'sequence_order',
      characterName: 'Anya',
      characterEmoji: '🥪',
      sceneTag: 'Hora do Recreio na Eden',
      prompt: 'Qual a ordem certa na hora do lanche? Encaixe 1º, 2º e 3º!',
      narrationText: 'Antes de comer o lanche, o que fazemos primeiro? Coloque os três passos na ordem correta.',
      hintText: 'Primeiro lavamos as mãos, depois comemos o lanche e por fim guardamos a lancheira.',
      successMessage: 'Nota 10 em autonomia! Que exemplo elegante!',
      sequencePromptItems: [null, null, null],
      sequenceExpectedOrder: lunchSteps.map((s) => s.id),
      sequencePool: shuffle(lunchSteps),
    },
    {
      id: `routine_night_${level}`,
      domain: 'routine',
      level,
      mode: 'sequence_order',
      characterName: 'Bond',
      characterEmoji: '🌙',
      sceneTag: 'Rotina Calma da Noite',
      prompt: 'Organize os 3 passos para uma noite tranquila antes de dormir!',
      narrationText: 'Coloque a rotina da noite na ordem certa para toda a família descansar bem.',
      hintText: 'Primeiro o banho quentinho, depois vestir o pijama e então dormir calmo.',
      successMessage: 'Bons sonhos para a Família Forger! Estrela garantida!',
      sequencePromptItems: [null, null, null],
      sequenceExpectedOrder: nightSteps.map((s) => s.id),
      sequencePool: shuffle(nightSteps),
    },
  ];
}

function generateEmotionsChallenges(level: DifficultyLevel): MissionChallenge[] {
  const pool: MissionChallenge[] = [
    {
      id: `emo_damian_${level}`,
      domain: 'emotions',
      level,
      mode: 'pinch_choice',
      characterName: 'Damian na Academia Eden',
      characterEmoji: '📚',
      sceneTag: 'Telepatia no Corredor',
      prompt: 'Aponte para o balão telepático! Damian derrubou todos os cadernos. Como ele se sente?',
      narrationText: 'Use a telepatia da Anya! Damian derrubou os cadernos no chão. Como ele está se sentindo agora?',
      telepathyThought: '“Ai não... meus cadernos caíram todos no chão e a aula já vai começar!”',
      hintText: 'Quando algo cai e dá medo de atrasar, ficamos preocupados ou chateados.',
      successMessage: 'Boa leitura! Você percebeu que Damian está preocupado!',
      choices: shuffle([
        { id: 'worried', label: 'Preocupado', sublabel: 'Precisa de ajuda', emoji: '😟', isCorrect: true },
        { id: 'sleepy', label: 'Com sono', sublabel: 'Quer dormir', emoji: '😴', isCorrect: false },
        { id: 'happy', label: 'Dando risada', sublabel: 'Muito divertido', emoji: '😄', isCorrect: false },
      ]),
    },
    {
      id: `emo_becky_${level}`,
      domain: 'emotions',
      level,
      mode: 'pinch_choice',
      characterName: 'Becky Blackbell',
      characterEmoji: '🎁',
      sceneTag: 'Telepatia no Pátio',
      prompt: 'Becky ganhou um chaveiro de ovelhinha igual ao da Anya! Qual emoção ela sente?',
      narrationText: 'Becky recebeu um presente lindo da melhor amiga. Como ela está se sentindo?',
      telepathyThought: '“Eba! Eu e a Anya temos chaveiros combinando! Que dia maravilhoso!”',
      hintText: 'Ganhar um presente especial de uma amiga deixa a gente muito feliz!',
      successMessage: 'Isso mesmo! Becky está radiante de alegria!',
      choices: shuffle([
        { id: 'joy', label: 'Muito Feliz', sublabel: 'Alegria', emoji: '😄', isCorrect: true },
        { id: 'angry', label: 'Bravo', sublabel: 'Irritado', emoji: '😠', isCorrect: false },
        { id: 'scared', label: 'Com medo', sublabel: 'Assustado', emoji: '😨', isCorrect: false },
      ]),
    },
    {
      id: `emo_bond_thunder_${level}`,
      domain: 'emotions',
      level,
      mode: 'pinch_choice',
      characterName: 'Bond',
      characterEmoji: '⛈️',
      sceneTag: 'Tempestade lá fora',
      prompt: 'Bond ouviu um trovão muito alto e tremeu atrás do sofá. Qual atitude ajuda o Bond?',
      narrationText: 'Bond está com medo do barulho do trovão. Escolha a atitude mais acolhedora para ajudar o Bond.',
      telepathyThought: '“Borf... esse trovão foi alto demais, estou assustado!”',
      hintText: 'Quando alguém tem medo de barulho alto, falar com voz calma e dar carinho ajuda muito.',
      successMessage: 'Que carinho lindo! Bond já ficou calmo e seguro!',
      choices: shuffle([
        {
          id: 'comfort',
          label: 'Fazer carinho e falar calmo',
          sublabel: 'Ajudar a relaxar',
          emoji: '🤗',
          isCorrect: true,
        },
        {
          id: 'shout',
          label: 'Fazer mais barulho',
          sublabel: 'Assusta ainda mais',
          emoji: '📢',
          isCorrect: false,
        },
        {
          id: 'ignore',
          label: 'Rir do susto dele',
          sublabel: 'Deixa triste',
          emoji: '😝',
          isCorrect: false,
        },
      ]),
    },
    {
      id: `emo_yor_dinner_${level}`,
      domain: 'emotions',
      level,
      mode: 'pinch_choice',
      characterName: 'Yor Forger',
      characterEmoji: '🍲',
      sceneTag: 'Jantar em Família',
      prompt: 'Yor está nervosa tentando aprender uma receita nova. O que podemos dizer para ela?',
      narrationText: 'Yor está tentando fazer o melhor jantar, mas está nervosa. Escolha uma frase gentil para incentivar a Yor.',
      telepathyThought: '“Tomara que a Anya e o Loid gostem... estou me esforçando tanto!”',
      hintText: 'Agradecer o esforço e incentivar com carinho faz a Yor se sentir acolhida!',
      successMessage: 'Waku waku! Yor sorriu e se sentiu muito amada!',
      choices: shuffle([
        {
          id: 'encourage',
          label: '“Obrigado por tentar, vamos ajudar!”',
          sublabel: 'Gentileza e incentivo',
          emoji: '💛',
          isCorrect: true,
        },
        {
          id: 'rude',
          label: '“Desiste logo disso!”',
          sublabel: 'Magoa a pessoa',
          emoji: '🙅',
          isCorrect: false,
        },
        {
          id: 'walkaway',
          label: 'Sair correndo sem falar nada',
          sublabel: 'Deixa a pessoa sozinha',
          emoji: '🏃',
          isCorrect: false,
        },
      ]),
    },
    {
      id: `emo_pencil_share_${level}`,
      domain: 'emotions',
      level,
      mode: 'pinch_choice',
      characterName: 'Colega da Turma',
      characterEmoji: '✏️',
      sceneTag: 'Prova de Desenho na Eden',
      prompt: 'Um colega esqueceu o lápis de cor e ficou triste. Qual atitude merece Estrela Stella?',
      narrationText: 'Um amigo da sala esqueceu o lápis e ficou triste. Qual escolha mostra empatia e amizade?',
      telepathyThought: '“Esqueci meu estojo em casa... não vou conseguir colorir meu desenho.”',
      hintText: 'Emprestar um lápis quando temos sobrando é um grande gesto de amizade!',
      successMessage: 'Estrela Stella de empatia! Compartilhar faz amigos felizes!',
      choices: shuffle([
        {
          id: 'lend',
          label: 'Emprestar um lápis com sorriso',
          sublabel: 'Atitude de amizade',
          emoji: '🤝',
          isCorrect: true,
        },
        {
          id: 'hide',
          label: 'Esconder o estojo',
          sublabel: 'Não ajuda o colega',
          emoji: '🙈',
          isCorrect: false,
        },
        {
          id: 'tease',
          label: 'Dizer que ele é esquecido',
          sublabel: 'Deixa mais triste',
          emoji: '🗣️',
          isCorrect: false,
        },
      ]),
    },
  ];

  return pool;
}

function generateLogicChallenges(level: DifficultyLevel): MissionChallenge[] {
  const star: SequenceSlotItem = { id: 'star', label: 'Estrela', emoji: '⭐', bgClass: 'bg-[#FEF9C3]' };
  const peanut: SequenceSlotItem = { id: 'peanut', label: 'Amendoim', emoji: '🥜', bgClass: 'bg-[#FFEDD5]' };
  const hat: SequenceSlotItem = { id: 'hat', label: 'Chapéu', emoji: '🎩', bgClass: 'bg-[#DCFCE7]' };
  const rose: SequenceSlotItem = { id: 'rose', label: 'Rosa', emoji: '🌹', bgClass: 'bg-[#FCE7F3]' };

  const pattern1Prompt =
    level === 1
      ? [star, peanut, star, null]
      : level === 2
        ? [star, peanut, hat, star, peanut, null]
        : [star, star, peanut, star, star, null];
  const pattern1Answer = level === 1 ? 'peanut' : level === 2 ? 'hat' : 'peanut';

  const pattern2Prompt =
    level === 1
      ? [rose, hat, rose, null]
      : level === 2
        ? [rose, rose, hat, rose, rose, null]
        : [hat, rose, star, hat, rose, null];
  const pattern2Answer = level === 1 ? 'hat' : level === 2 ? 'hat' : 'star';

  const numSeq = level === 1 ? [1, 2, 3, 4] : level === 2 ? [2, 4, 6, 8] : [3, 6, 9, 12];
  const numAnswer = numSeq[3];
  const numDistract1 = numAnswer + (level === 1 ? 2 : 1);
  const numDistract2 = Math.max(1, numAnswer - (level === 1 ? 2 : 3));

  return [
    {
      id: `logic_wise_1_${level}`,
      domain: 'logic',
      level,
      mode: 'sequence_order',
      characterName: 'Agente Twilight',
      characterEmoji: '🕵️',
      sceneTag: 'Código Secreto da WISE',
      prompt: 'Decifre o padrão secreto! Arraste a peça certa para completar o espaço "?".',
      narrationText: 'Olhe bem como os símbolos se repetem no código do Agente Twilight. Arraste a peça que completa o espaço com interrogação.',
      hintText: 'Leia os símbolos em voz alta em ritmo — o padrão sempre se repete igual!',
      successMessage: 'Código decifrado! O Agente Twilight aprovou seu raciocínio!',
      sequencePromptItems: pattern1Prompt,
      sequenceExpectedOrder: [pattern1Answer],
      sequencePool: shuffle([star, peanut, hat]),
    },
    {
      id: `logic_bond_rain_${level}`,
      domain: 'logic',
      level,
      mode: 'pinch_choice',
      characterName: 'Bond',
      characterEmoji: '🔮',
      sceneTag: 'Visão do Futuro do Bond',
      prompt: 'Bond viu nuvens escuras e pingos de chuva caindo! O que a família precisa levar?',
      narrationText: 'Bond teve uma visão do futuro! Nuvens escuras estão chegando com chuva. Qual objeto devemos pegar?',
      hintText: 'Quando chove lá fora, usamos algo para não molhar a cabeça!',
      successMessage: 'Borf! Graças à previsão do Bond, ninguém ficou molhado!',
      visualGroups: [
        {
          title: 'Visão do Bond',
          tokens: [
            { id: 'c1', label: 'Nuvem', emoji: '☁️' },
            { id: 'c2', label: 'Chuva', emoji: '🌧️' },
            { id: 'c3', label: 'Próximo?', emoji: '❓' },
          ],
        },
      ],
      choices: shuffle([
        { id: 'umbrella', label: 'Guarda-chuva', sublabel: 'Protege da chuva', emoji: '☂️', isCorrect: true },
        { id: 'sunglasses', label: 'Óculos de sol', sublabel: 'Para dias de sol', emoji: '🕶️', isCorrect: false },
        { id: 'icecream', label: 'Sorvete', sublabel: 'Sobremesa gelada', emoji: '🍦', isCorrect: false },
      ]),
    },
    {
      id: `logic_wise_2_${level}`,
      domain: 'logic',
      level,
      mode: 'sequence_order',
      characterName: 'Yor e Loid',
      characterEmoji: '🧩',
      sceneTag: 'Cofre de Símbolos',
      prompt: 'Mais um código secreto! Qual símbolo completa a sequência no final?',
      narrationText: 'Observe a ordem das peças do cofre e arraste o símbolo que completa o padrão.',
      hintText: 'Compare o início da fileira com o final para descobrir qual símbolo está faltando.',
      successMessage: 'Cofre aberto com elegância! Padrão resolvido!',
      sequencePromptItems: pattern2Prompt,
      sequenceExpectedOrder: [pattern2Answer],
      sequencePool: shuffle([rose, hat, star]),
    },
    {
      id: `logic_numbers_${level}`,
      domain: 'logic',
      level,
      mode: 'pinch_choice',
      characterName: 'Loid (Relógio Secreto)',
      characterEmoji: '⏱️',
      sceneTag: 'Senha Numérica da WISE',
      prompt: `Qual número completa a senha secreta: ${numSeq[0]} → ${numSeq[1]} → ${numSeq[2]} → ?`,
      narrationText: `Descubra o próximo número da senha secreta: ${numSeq[0]}, ${numSeq[1]}, ${numSeq[2]}, qual vem agora?`,
      hintText:
        level === 1
          ? 'Os números estão subindo de 1 em 1!'
          : level === 2
            ? 'Os números estão pulando de 2 em 2!'
            : 'Os números estão subindo de 3 em 3!',
      successMessage: `Senha confirmada! O número secreto é ${numAnswer}!`,
      visualGroups: [
        {
          title: 'Sequência do Relógio',
          tokens: [
            { id: 'n1', label: String(numSeq[0]), emoji: '🔢' },
            { id: 'n2', label: String(numSeq[1]), emoji: '🔢' },
            { id: 'n3', label: String(numSeq[2]), emoji: '🔢' },
            { id: 'nq', label: '?', emoji: '❓' },
          ],
        },
      ],
      choices: shuffle([
        { id: 'ans_ok', label: String(numAnswer), sublabel: 'Próximo número', emoji: '🔑', isCorrect: true },
        { id: 'ans_d1', label: String(numDistract1), sublabel: 'Número', emoji: '🔑', isCorrect: false },
        { id: 'ans_d2', label: String(numDistract2), sublabel: 'Número', emoji: '🔑', isCorrect: false },
      ]),
    },
    {
      id: `logic_bond_cake_${level}`,
      domain: 'logic',
      level,
      mode: 'pinch_choice',
      characterName: 'Bond e Anya',
      characterEmoji: '🎂',
      sceneTag: 'Segunda Visão do Bond',
      prompt: 'Loid colocou a massa de bolo no forno quentinho. O que sai do forno depois?',
      narrationText: 'Loid misturou farinha, ovos e colocou a massa no forno. O que acontece depois?',
      hintText: 'Quando assamos massa de bolo no forno, nasce uma sobremesa deliciosa!',
      successMessage: 'Waku waku! Um bolo quentinho para comemorar a Estrela Stella!',
      visualGroups: [
        {
          title: 'Causa e Efeito',
          tokens: [
            { id: 'b1', label: 'Ingredientes', emoji: '🥚' },
            { id: 'b2', label: 'Forno', emoji: '🔥' },
            { id: 'b3', label: 'Resultado?', emoji: '❓' },
          ],
        },
      ],
      choices: shuffle([
        { id: 'cake', label: 'Bolo assado', sublabel: 'Pronto para comer', emoji: '🎂', isCorrect: true },
        { id: 'snowman', label: 'Boneco de neve', sublabel: 'Feito de gelo', emoji: '⛄', isCorrect: false },
        { id: 'book', label: 'Livro escolar', sublabel: 'Para ler na aula', emoji: '📖', isCorrect: false },
      ]),
    },
  ];
}

function generateClassificationChallenges(level: DifficultyLevel): MissionChallenge[] {
  const familySortItems: DraggableItem[] = [
    {
      id: 'magnifying',
      label: 'Lupa',
      emoji: '🔍',
      category: 'loid',
      accentBg: 'bg-[#DCFCE7]',
      accentBorder: 'border-[#15803D]',
    },
    {
      id: 'hat_spy',
      label: 'Chapéu',
      emoji: '🎩',
      category: 'loid',
      accentBg: 'bg-[#DCFCE7]',
      accentBorder: 'border-[#15803D]',
    },
    {
      id: 'peanuts_cls',
      label: 'Amendoim',
      emoji: '🥜',
      category: 'anya',
      accentBg: 'bg-[#FCE7F3]',
      accentBorder: 'border-[#DB2777]',
    },
    {
      id: 'book_eden',
      label: 'Livro Eden',
      emoji: '📘',
      category: 'anya',
      accentBg: 'bg-[#FCE7F3]',
      accentBorder: 'border-[#DB2777]',
    },
  ];

  if (level >= 2) {
    familySortItems.push(
      {
        id: 'bone_bond',
        label: 'Osso',
        emoji: '🦴',
        category: 'bond',
        accentBg: 'bg-[#FEF9C3]',
        accentBorder: 'border-[#CA8A04]',
      },
      {
        id: 'ball_bond',
        label: 'Bolinha',
        emoji: '🎾',
        category: 'bond',
        accentBg: 'bg-[#FEF9C3]',
        accentBorder: 'border-[#CA8A04]',
      }
    );
  }

  const colorSortItems: DraggableItem[] = [
    {
      id: 'red_apple',
      label: 'Maçã Vermelha',
      emoji: '🍎',
      category: 'red',
      accentBg: 'bg-[#FEE2E2]',
      accentBorder: 'border-[#DC2626]',
    },
    {
      id: 'red_rose',
      label: 'Rosa Vermelha',
      emoji: '🌹',
      category: 'red',
      accentBg: 'bg-[#FEE2E2]',
      accentBorder: 'border-[#DC2626]',
    },
    {
      id: 'green_leaf',
      label: 'Folha Verde',
      emoji: '🍀',
      category: 'green',
      accentBg: 'bg-[#DCFCE7]',
      accentBorder: 'border-[#15803D]',
    },
    {
      id: 'green_frog',
      label: 'Sapo Verde',
      emoji: '🐸',
      category: 'green',
      accentBg: 'bg-[#DCFCE7]',
      accentBorder: 'border-[#15803D]',
    },
  ];

  const shapeSortItems: DraggableItem[] = [
    {
      id: 'circle_ball',
      label: 'Bola Redonda',
      emoji: '⚽',
      category: 'circle',
      accentBg: 'bg-[#E0F2FE]',
      accentBorder: 'border-[#0284C7]',
    },
    {
      id: 'circle_clock',
      label: 'Relógio Redondo',
      emoji: '🕒',
      category: 'circle',
      accentBg: 'bg-[#E0F2FE]',
      accentBorder: 'border-[#0284C7]',
    },
    {
      id: 'square_gift',
      label: 'Caixa Quadrada',
      emoji: '🎁',
      category: 'square',
      accentBg: 'bg-[#FEF3C7]',
      accentBorder: 'border-[#D97706]',
    },
    {
      id: 'square_window',
      label: 'Moldura Quadrada',
      emoji: '🖼️',
      category: 'square',
      accentBg: 'bg-[#FEF3C7]',
      accentBorder: 'border-[#D97706]',
    },
  ];

  return [
    {
      id: `cls_forger_${level}`,
      domain: 'classification',
      level,
      mode: 'drag_buckets',
      characterName: 'Família Forger',
      characterEmoji: '🗂️',
      sceneTag: 'Dossiês na Sala dos Forger',
      prompt: 'Organize os objetos secretos na pasta certa de cada membro da família!',
      narrationText: 'A sala está bagunçada! Faça pinça e arraste cada objeto para a pasta certa da família Forger.',
      hintText: 'Lupa e chapéu são do Loid. Amendoim e livro são da Anya.',
      successMessage: 'Segredos protegidos! Tudo guardado nas pastas certas!',
      draggableItems: shuffle(familySortItems),
      dropZones:
        level >= 2
          ? [
              {
                id: 'folder_loid',
                label: 'Pasta do Loid',
                subtitle: 'Espionagem',
                emoji: '🕵️',
                acceptsCategory: 'loid',
                accentBg: 'bg-[#DCFCE7]',
                accentBorder: 'border-[#14532D]',
              },
              {
                id: 'folder_anya',
                label: 'Pasta da Anya',
                subtitle: 'Escola e Lanche',
                emoji: '🎒',
                acceptsCategory: 'anya',
                accentBg: 'bg-[#FCE7F3]',
                accentBorder: 'border-[#DB2777]',
              },
              {
                id: 'folder_bond',
                label: 'Pasta do Bond',
                subtitle: 'Brinquedos',
                emoji: '🐶',
                acceptsCategory: 'bond',
                accentBg: 'bg-[#FEF9C3]',
                accentBorder: 'border-[#CA8A04]',
              },
            ]
          : [
              {
                id: 'folder_loid',
                label: 'Pasta do Loid',
                subtitle: 'Espionagem',
                emoji: '🕵️',
                acceptsCategory: 'loid',
                accentBg: 'bg-[#DCFCE7]',
                accentBorder: 'border-[#14532D]',
              },
              {
                id: 'folder_anya',
                label: 'Pasta da Anya',
                subtitle: 'Escola e Lanche',
                emoji: '🎒',
                acceptsCategory: 'anya',
                accentBg: 'bg-[#FCE7F3]',
                accentBorder: 'border-[#DB2777]',
              },
            ],
    },
    {
      id: `cls_colors_${level}`,
      domain: 'classification',
      level,
      mode: 'drag_buckets',
      characterName: 'Yor',
      characterEmoji: '🎨',
      sceneTag: 'Pastas por Cor',
      prompt: 'Separe os itens pela cor: Pasta Vermelha da Yor e Pasta Verde da Eden!',
      narrationText: 'Arraste os objetos vermelhos para a pasta vermelha e os objetos verdes para a pasta verde.',
      hintText: 'Maçã e rosa vão na pasta vermelha; folha e sapo vão na pasta verde.',
      successMessage: 'Cores organizadas com perfeição!',
      draggableItems: shuffle(colorSortItems),
      dropZones: [
        {
          id: 'color_red',
          label: 'Pasta Vermelha',
          subtitle: 'Itens vermelhos',
          emoji: '🔴',
          acceptsCategory: 'red',
          accentBg: 'bg-[#FEE2E2]',
          accentBorder: 'border-[#DC2626]',
        },
        {
          id: 'color_green',
          label: 'Pasta Verde',
          subtitle: 'Itens verdes',
          emoji: '🟢',
          acceptsCategory: 'green',
          accentBg: 'bg-[#DCFCE7]',
          accentBorder: 'border-[#15803D]',
        },
      ],
    },
    {
      id: `cls_spot_${level}`,
      domain: 'classification',
      level,
      mode: 'pinch_choice',
      characterName: 'Agente Twilight',
      characterEmoji: '🔎',
      sceneTag: 'Treino de Observação de Espião',
      prompt: 'Olho de águia! Encontre e pinçe o ÚNICO objeto que NÃO é comida.',
      narrationText: 'Treino de atenção do Agente Twilight! Olhe os três cartões e faça pinça no único item que não é comida.',
      hintText: 'Amendoim e maçã são comidas. Qual deles usamos para ver pistas?',
      successMessage: 'Olhar de super espião! A lupa não é comida!',
      choices: shuffle([
        { id: 'not_food', label: 'Lupa Secreta', sublabel: 'Objeto de busca', emoji: '🔍', isCorrect: true },
        { id: 'food1', label: 'Amendoim', sublabel: 'Comida', emoji: '🥜', isCorrect: false },
        { id: 'food2', label: 'Maçã', sublabel: 'Comida', emoji: '🍎', isCorrect: false },
      ]),
    },
    {
      id: `cls_shapes_${level}`,
      domain: 'classification',
      level,
      mode: 'drag_buckets',
      characterName: 'Anya',
      characterEmoji: '🔷',
      sceneTag: 'Formas na Mesa de Estudo',
      prompt: 'Separe os objetos pela forma: Redondos de um lado e Quadrados do outro!',
      narrationText: 'Observe o formato de cada objeto e arraste para a caixa dos redondos ou para a caixa dos quadrados.',
      hintText: 'Bola e relógio são redondos; presente e moldura são quadrados!',
      successMessage: 'Genial! Todas as formas foram separadas certinho!',
      draggableItems: shuffle(shapeSortItems),
      dropZones: [
        {
          id: 'shape_circle',
          label: 'Redondos (Círculo)',
          subtitle: 'Formato de bola',
          emoji: '⚪',
          acceptsCategory: 'circle',
          accentBg: 'bg-[#E0F2FE]',
          accentBorder: 'border-[#0284C7]',
        },
        {
          id: 'shape_square',
          label: 'Quadrados',
          subtitle: '4 lados iguais',
          emoji: '🟧',
          acceptsCategory: 'square',
          accentBg: 'bg-[#FEF3C7]',
          accentBorder: 'border-[#D97706]',
        },
      ],
    },
    {
      id: `cls_attention_star_${level}`,
      domain: 'classification',
      level,
      mode: 'pinch_choice',
      characterName: 'Sr. Henderson',
      characterEmoji: '🌟',
      sceneTag: 'Inspeção de Estrela Stella',
      prompt: 'Encontre exatamente a insígnia correta: Estrela Dourada da Academia Eden!',
      narrationText: 'Atenção aos detalhes! Faça pinça apenas no cartão que mostra a Estrela Dourada.',
      hintText: 'Procure o brilho dourado de cinco pontas!',
      successMessage: 'Elegância absoluta! Atenção de espião nível máximo!',
      choices: shuffle([
        { id: 'gold_star', label: 'Estrela Dourada', sublabel: 'Insígnia Stella', emoji: '⭐', isCorrect: true },
        { id: 'blue_diamond', label: 'Losango Azul', sublabel: 'Outra forma', emoji: '🔷', isCorrect: false },
        { id: 'red_heart', label: 'Coração Vermelho', sublabel: 'Outra forma', emoji: '❤️', isCorrect: false },
      ]),
    },
  ];
}

export function generateMissionChallenges(
  domain: MissionDomain,
  level: DifficultyLevel
): MissionChallenge[] {
  switch (domain) {
    case 'math':
      return generateMathChallenges(level);
    case 'routine':
      return generateRoutineChallenges(level);
    case 'emotions':
      return generateEmotionsChallenges(level);
    case 'logic':
      return generateLogicChallenges(level);
    case 'classification':
      return generateClassificationChallenges(level);
  }
}
