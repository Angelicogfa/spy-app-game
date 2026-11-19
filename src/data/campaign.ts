import { CharacterId } from './characters';
import { MissionDomain } from '../types/game';

export interface CampaignChapter {
  index: number;
  timeOfDay: string;
  timeEmoji: string;
  chapterTitle: string;
  domain: MissionDomain;
  host: CharacterId;
  storyHook: string;
  outroCelebration: string;
}

/**
 * "Um Dia na Família Forger" — 5 connected story chapters giving the child
 * clear predictability with beginning, middle, and joyful end of the day.
 */
export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    index: 0,
    timeOfDay: '1 · Manhã',
    timeEmoji: '🌅',
    chapterTitle: 'Hora da Academia Eden',
    domain: 'routine',
    host: 'yor',
    storyHook: 'O sol nasceu! Vamos arrumar a mochila com a Yor antes de ir para a escola.',
    outroCelebration: 'Mochila pronta! Agora a Anya chegou na Academia Eden para ver os amigos!',
  },
  {
    index: 1,
    timeOfDay: '2 · Recreio',
    timeEmoji: '🏫',
    chapterTitle: 'Amigos na Escola',
    domain: 'emotions',
    host: 'anya',
    storyHook: 'Hora do recreio! Use a telepatia da Anya para ajudar os colegas com carinho.',
    outroCelebration: 'Que amizade linda! Chegamos em casa com fome — hora do lanche!',
  },
  {
    index: 2,
    timeOfDay: '3 · Lanche',
    timeEmoji: '🥜',
    chapterTitle: 'Amendoins com o Bond',
    domain: 'math',
    host: 'anya',
    storyHook: 'O Loid preparou lanches e amendoins! Vamos contar e dividir certinho com o Bond.',
    outroCelebration: 'Barriguinha feliz! O Agente Twilight chamou para uma missão secreta!',
  },
  {
    index: 3,
    timeOfDay: '4 · Tarde Secreta',
    timeEmoji: '🔎',
    chapterTitle: 'Códigos do Twilight',
    domain: 'logic',
    host: 'loid',
    storyHook: 'O Loid e o Bond precisam da sua ajuda para decifrar padrões e visões secretas.',
    outroCelebration: 'Código decifrado! Só falta guardar tudo no Dossiê da Família antes de descansar!',
  },
  {
    index: 4,
    timeOfDay: '5 · Fim do Dia',
    timeEmoji: '🏡',
    chapterTitle: 'Dossiê dos Forger',
    domain: 'classification',
    host: 'bond',
    storyHook: 'Último capítulo do dia! Vamos separar os objetos da família nas pastas certinhas.',
    outroCelebration: 'Dia Completo na Família Forger! Você cumpriu todas as 5 aventuras!',
  },
];

export function getCampaignChapter(index: number): CampaignChapter {
  const safe = Math.max(0, Math.min(CAMPAIGN_CHAPTERS.length - 1, index));
  return CAMPAIGN_CHAPTERS[safe];
}
