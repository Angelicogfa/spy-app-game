import { useEffect, useState } from 'react';
import { Hand, Play, Sparkles, Star, Volume2 } from 'lucide-react';
import {
  CHARACTER_PROFILES,
  MISSION_BRIEFINGS,
  resolveCharacterProfile,
} from '../data/characters';
import { getMissionMeta } from '../data/missions';
import { MissionDomain } from '../types/game';
import { subscribeSpeechState } from '../utils/audio';
import { ArtworkImage } from './ArtworkImage';

export type NarratorMood = 'idle' | 'speaking' | 'encourage' | 'celebrate';

interface CharacterNarratorProps {
  characterName: string;
  domain: MissionDomain;
  prompt: string;
  mood: NarratorMood;
  replayButtonRef?: React.RefObject<HTMLButtonElement | null>;
  replayHovered?: boolean;
  onReplayAudio: () => void;
}

export function CharacterNarrator({
  characterName,
  domain,
  prompt,
  mood,
  replayButtonRef,
  replayHovered = false,
  onReplayAudio,
}: CharacterNarratorProps) {
  const [speechActive, setSpeechActive] = useState(false);

  useEffect(() => {
    return subscribeSpeechState((state) => {
      setSpeechActive(state.speaking);
    });
  }, []);

  const profile = resolveCharacterProfile(characterName, domain);
  const effectiveMood: NarratorMood =
    mood === 'celebrate'
      ? 'celebrate'
      : mood === 'encourage'
        ? 'encourage'
        : speechActive
          ? 'speaking'
          : 'idle';

  const avatarAnimClass =
    effectiveMood === 'celebrate'
      ? 'animate-char-celebrate'
      : effectiveMood === 'encourage'
        ? 'animate-char-encourage'
        : effectiveMood === 'speaking'
          ? 'animate-char-talk'
          : 'animate-char-breathe';

  return (
    <div className="flex shrink-0 items-center gap-3">
      {/* Animated Expressive Character Portrait */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onReplayAudio}
          title={`Ouvir ${characterName} falar novamente`}
          aria-label={`Ouvir ${characterName} falar novamente`}
          className={`relative block h-14 w-14 overflow-hidden rounded-2xl border-3 bg-[#FFFDF7] shadow-md transition-shadow cursor-pointer sm:h-16 sm:w-16 ${
            profile.ringColor
          } ${avatarAnimClass} ${
            effectiveMood === 'speaking'
              ? 'ring-4 ring-[#FBCFE8]/80'
              : effectiveMood === 'celebrate'
                ? 'ring-4 ring-[#FDE047]'
                : ''
          }`}
        >
          <ArtworkImage
            src={profile.portraitSrc}
            alt={characterName}
            fallbackTitle={profile.displayName}
            fallbackGradient={profile.fallbackGradient}
            className="h-full w-full object-cover object-top"
          />
        </button>

        {/* Mood Sparkle / Reaction Emblem */}
        {effectiveMood === 'celebrate' && (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#EAB308] shadow-sm animate-stella-pop">
            <Star className="h-3.5 w-3.5 fill-white text-white" />
          </span>
        )}
        {effectiveMood === 'speaking' && (
          <span
            className={`pointer-events-none absolute -bottom-1 -right-1 flex h-5 items-end gap-0.5 rounded-full border-2 border-white px-1.5 py-1 shadow-sm ${profile.badgeBg}`}
            aria-hidden="true"
          >
            <span
              className="animate-voice-bar h-2 w-0.5 rounded-full bg-white"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="animate-voice-bar h-2.5 w-0.5 rounded-full bg-white"
              style={{ animationDelay: '130ms' }}
            />
            <span
              className="animate-voice-bar h-2 w-0.5 rounded-full bg-white"
              style={{ animationDelay: '260ms' }}
            />
          </span>
        )}
      </div>

      {/* Stylized Anime Speech Bubble with Left Tail */}
      <div
        className={`relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 px-3.5 py-2 shadow-xs transition-colors ${profile.bubbleBg} ${profile.bubbleBorder}`}
      >
        {/* Speech tail pointing to character */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b-2 border-l-2 ${profile.bubbleBg} ${profile.bubbleBorder}`}
        />

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-display text-[10px] font-extrabold tracking-wide ${profile.badgeBg} ${profile.badgeText}`}
            >
              <span>{characterName}</span>
            </span>
            {effectiveMood === 'speaking' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#57534E]">
                <Sparkles className="h-3 w-3 text-[#EC4899]" />
                <span>Falando...</span>
              </span>
            )}
          </div>
          <h1 className="mt-0.5 font-display text-sm font-extrabold leading-snug text-[#1C1917] sm:text-lg">
            {prompt}
          </h1>
        </div>

        {/* Replay Voice & Animation Button (Pinchable + Clickable) */}
        <button
          ref={replayButtonRef}
          type="button"
          onClick={onReplayAudio}
          className={`game-btn-3d relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] text-[#14532D] hover:bg-[#DCFCE7] cursor-pointer ${
            replayHovered ? 'scale-110 border-[#EC4899] ring-4 ring-[#FBCFE8]' : ''
          }`}
          title="Ouvir o personagem explicar novamente"
          aria-label="Ouvir o personagem explicar novamente"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface MissionIntroCutsceneProps {
  domain: MissionDomain;
  startButtonRef: React.RefObject<HTMLButtonElement | null>;
  startHovered: boolean;
  onReplayIntro: () => void;
  onStartMission: () => void;
}

export function MissionIntroCutscene({
  domain,
  startButtonRef,
  startHovered,
  onReplayIntro,
  onStartMission,
}: MissionIntroCutsceneProps) {
  const [speechActive, setSpeechActive] = useState(true);
  const [revealedWords, setRevealedWords] = useState(0);

  const missionMeta = getMissionMeta(domain);
  const briefing = MISSION_BRIEFINGS[domain];
  const profile = CHARACTER_PROFILES[briefing.host];
  const words = briefing.missionGoal.split(' ');

  useEffect(() => {
    return subscribeSpeechState((state) => {
      setSpeechActive(state.speaking);
    });
  }, []);

  // Gentle progressive text reveal synchronized as the character presents the mission
  useEffect(() => {
    setRevealedWords(3);
    const timer = window.setInterval(() => {
      setRevealedWords((prev) => {
        if (prev >= words.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 2;
      });
    }, 150);
    return () => window.clearInterval(timer);
  }, [domain, words.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto overscroll-contain py-2 sm:justify-center">
      <div className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-[2rem] border-3 border-[#DFD4BC] bg-[#FAF6EB] p-5 text-center shadow-inner sm:p-6">
        {/* Soft Mission Scene Banner Accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden opacity-22">
          <ArtworkImage
            src={missionMeta.imagePath}
            alt={missionMeta.title}
            fallbackTitle={missionMeta.shortTitle}
            fallbackGradient={missionMeta.fallbackGradient}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FAF6EB]" />
        </div>

        {/* Large Animated Speaking Character Stage */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <div
              className={`h-28 w-28 overflow-hidden rounded-full border-4 bg-[#FFFDF7] shadow-xl sm:h-32 sm:w-32 ${
                profile.ringColor
              } ${speechActive ? 'animate-char-talk ring-4 ring-[#FBCFE8]' : 'animate-char-breathe'}`}
            >
              <ArtworkImage
                src={profile.portraitSrc}
                alt={briefing.hostTitle}
                fallbackTitle={briefing.hostTitle}
                fallbackGradient={profile.fallbackGradient}
                className="h-full w-full object-cover object-top"
              />
            </div>

            {/* Animated Speaking Equalizer Pill */}
            <div
              className={`absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-white px-3 py-0.5 shadow-md whitespace-nowrap ${profile.badgeBg} ${profile.badgeText}`}
            >
              <span className="font-display text-xs font-extrabold">{briefing.hostTitle}</span>
              {speechActive && (
                <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
                  <span
                    className="animate-voice-bar h-2 w-0.5 rounded-full bg-white"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="animate-voice-bar h-3 w-0.5 rounded-full bg-white"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="animate-voice-bar h-2 w-0.5 rounded-full bg-white"
                    style={{ animationDelay: '240ms' }}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Animated Character Speech Bubble */}
          <div
            className={`animate-bubble-appear relative mt-5 w-full rounded-3xl border-2 px-5 py-4 text-center shadow-sm ${profile.bubbleBg} ${profile.bubbleBorder}`}
          >
            {/* Top Speech Pointer Triangle */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-l-2 border-t-2 ${profile.bubbleBg} ${profile.bubbleBorder}`}
            />

            <p className="font-display text-lg font-extrabold text-[#14532D] sm:text-xl">
              “{briefing.greeting}”
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#44403C] sm:text-base">
              {words.slice(0, revealedWords).join(' ')}
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#DFD4BC] bg-white/90 px-3 py-1.5 text-xs font-bold text-[#14532D]">
              <Hand className="h-4 w-4 shrink-0 text-[#EC4899]" />
              <span>{briefing.gestureTip}</span>
            </div>
          </div>

          {/* Action Row: Replay Speech + Big Pinchable START Button */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onReplayIntro}
              className="game-btn-3d inline-flex items-center gap-1.5 rounded-2xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] px-4 py-3 font-display text-xs font-extrabold text-[#14532D] hover:bg-[#DCFCE7] cursor-pointer"
            >
              <Volume2 className="h-4 w-4" />
              <span>Ouvir de Novo</span>
            </button>

            <button
              ref={startButtonRef}
              type="button"
              onClick={onStartMission}
              className={`game-btn-3d inline-flex items-center gap-2.5 rounded-2xl border-3 border-[#FBCFE8] border-b-[6px] border-b-[#9D174D] bg-[#EC4899] px-8 py-3 font-display text-lg font-extrabold text-white shadow-lg hover:bg-[#DB2777] cursor-pointer ${
                startHovered ? 'scale-108 ring-4 ring-[#FBCFE8]' : ''
              }`}
            >
              <Play className="h-5 w-5 fill-white" />
              <span>COMEÇAR MISSÃO!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
