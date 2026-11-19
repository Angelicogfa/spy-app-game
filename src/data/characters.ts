import charAnyaImg from '../assets/images/char_anya_portrait_1795101765996.jpg';
import charBondImg from '../assets/images/char_bond_portrait_1795101765171.jpg';
import charLoidImg from '../assets/images/char_loid_portrait_1795101766170.jpg';
import charYorImg from '../assets/images/char_yor_portrait_1795101766460.jpg';
import { MissionDomain } from '../types/game';

export type CharacterId = 'anya' | 'loid' | 'yor' | 'bond';

export interface CharacterProfile {
  id: CharacterId;
  displayName: string;
  portraitSrc: string;
  ringColor: string;
  bubbleBg: string;
  bubbleBorder: string;
  badgeBg: string;
  badgeText: string;
  waveColor: string;
  fallbackGradient: string;
}

export const CHARACTER_PROFILES: Record<CharacterId, CharacterProfile> = {
  anya: {
    id: 'anya',
    displayName: 'Anya',
    portraitSrc: charAnyaImg,
    ringColor: 'border-[#EC4899]',
    bubbleBg: 'bg-[#FFF5FA]',
    bubbleBorder: 'border-[#F9A8D4]',
    badgeBg: 'bg-[#EC4899]',
    badgeText: 'text-white',
    waveColor: 'bg-[#EC4899]',
    fallbackGradient: 'from-[#FCE7F3] to-[#F472B6]',
  },
  loid: {
    id: 'loid',
    displayName: 'Loid (Twilight)',
    portraitSrc: charLoidImg,
    ringColor: 'border-[#14532D]',
    bubbleBg: 'bg-[#F0FDF4]',
    bubbleBorder: 'border-[#86EFAC]',
    badgeBg: 'bg-[#14532D]',
    badgeText: 'text-[#FEF9C3]',
    waveColor: 'bg-[#14532D]',
    fallbackGradient: 'from-[#DCFCE7] to-[#22C55E]',
  },
  yor: {
    id: 'yor',
    displayName: 'Yor',
    portraitSrc: charYorImg,
    ringColor: 'border-[#DC2626]',
    bubbleBg: 'bg-[#FFF5F5]',
    bubbleBorder: 'border-[#FCA5A5]',
    badgeBg: 'bg-[#DC2626]',
    badgeText: 'text-white',
    waveColor: 'bg-[#DC2626]',
    fallbackGradient: 'from-[#FFE4E6] to-[#F43F5E]',
  },
  bond: {
    id: 'bond',
    displayName: 'Bond',
    portraitSrc: charBondImg,
    ringColor: 'border-[#CA8A04]',
    bubbleBg: 'bg-[#FEFCE8]',
    bubbleBorder: 'border-[#FDE047]',
    badgeBg: 'bg-[#CA8A04]',
    badgeText: 'text-white',
    waveColor: 'bg-[#CA8A04]',
    fallbackGradient: 'from-[#FEF9C3] to-[#FACC15]',
  },
};

export interface MissionBriefingScript {
  host: CharacterId;
  hostTitle: string;
  greeting: string;
  missionGoal: string;
  gestureTip: string;
  narration: string;
}

export const MISSION_BRIEFINGS: Record<MissionDomain, MissionBriefingScript> = {
  math: {
    host: 'anya',
    hostTitle: 'Anya Forger',
    greeting: 'Waku waku! Vamos contar amendoins juntos!',
    missionGoal:
      'Ajude a família Forger a contar, somar e dividir os lanches certinhos para ganhar Estrelas Stella!',
    gestureTip: 'Faça pinça com os dedos para pegar e arrastar os amendoins.',
    narration:
      'Oi! Eu sou a Anya! Vamos contar amendoins e preparar os lanches da família juntos! Use sua mãozinha fazendo pinça para pegar os objetos!',
  },
  routine: {
    host: 'yor',
    hostTitle: 'Yor Forger',
    greeting: 'Bom dia! Hora de se preparar para a Academia Eden!',
    missionGoal:
      'Vamos arrumar a mochila escolar, separar o lanche e colocar a rotina da manhã na ordem certinha.',
    gestureTip: 'Pegue cada item com pinça e leve até o lugar combinado.',
    narration:
      'Bom dia! Eu sou a Yor! Vamos arrumar a mochila e organizar a rotina da manhã para a Academia Eden juntos!',
  },
  emotions: {
    host: 'anya',
    hostTitle: 'Anya Telepata',
    greeting: 'Vamos usar a telepatia para entender os amigos!',
    missionGoal:
      'Aponte para o balão de pensamento para descobrir como o amigo se sente e escolha o gesto mais gentil.',
    gestureTip: 'Aponte no balão mágico e faça pinça na melhor resposta.',
    narration:
      'Ei! Vamos usar minha telepatia! Aponte para o balão de pensamento para ouvir o que o amigo sente e escolha como ajudar!',
  },
  logic: {
    host: 'loid',
    hostTitle: 'Agente Twilight',
    greeting: 'Missão secreta da WISE! Pronto para decifrar códigos?',
    missionGoal:
      'Observe os padrões com calma e use as visões do Bond para descobrir qual peça completa a sequência.',
    gestureTip: 'Observe a ordem das peças e faça pinça na peça que falta.',
    narration:
      'Olá, agente! Eu sou o Loid. Vamos observar os códigos secretos e as visões do Bond juntos para completar cada sequência!',
  },
  classification: {
    host: 'bond',
    hostTitle: 'Bond Forger',
    greeting: 'Borf! Vamos organizar o Dossiê Secreto da família!',
    missionGoal:
      'Separe cada objeto na pasta certa por personagem, cor ou forma usando seu olhar atento de espião.',
    gestureTip: 'Pegue cada item com pinça e solte dentro da pasta certa.',
    narration:
      'Borf! Eu sou o Bond! Vamos separar os objetos secretos da família nas pastas certinhas juntos!',
  },
};

export function resolveCharacterProfile(characterName: string, domain: MissionDomain): CharacterProfile {
  const lower = characterName.toLowerCase();
  if (lower.includes('bond')) return CHARACTER_PROFILES.bond;
  if (lower.includes('yor')) return CHARACTER_PROFILES.yor;
  if (lower.includes('loid') || lower.includes('twilight') || lower.includes('henderson')) {
    return CHARACTER_PROFILES.loid;
  }
  if (lower.includes('anya') || lower.includes('becky') || lower.includes('damian')) {
    return CHARACTER_PROFILES.anya;
  }
  return CHARACTER_PROFILES[MISSION_BRIEFINGS[domain].host];
}
