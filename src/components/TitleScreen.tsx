import { useState } from 'react';
import { Play, Star, UserPlus, Users } from 'lucide-react';
import { CHARACTER_PROFILES } from '../data/characters';
import { HERO_IMAGE_PATH } from '../data/missions';
import { PlayerProfile, ProfileAvatarId } from '../types/game';
import { ArtworkImage } from './ArtworkImage';
import { GuardianHoldButton } from './GuardianHoldButton';
import { ProfileSelectorModal } from './ProfileSelectorModal';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  profiles: PlayerProfile[];
  activeProfile: PlayerProfile | null;
  cameraReady: boolean;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, avatarId: ProfileAvatarId) => void;
  onImportProfile: (profile: PlayerProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  onStart: () => void;
  onOpenGuardian: () => void;
}

export function TitleScreen({
  profiles,
  activeProfile,
  cameraReady,
  onSelectProfile,
  onCreateProfile,
  onImportProfile,
  onDeleteProfile,
  onStart,
  onOpenGuardian,
}: TitleScreenProps) {
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const activeChar = activeProfile
    ? CHARACTER_PROFILES[activeProfile.avatarId] || CHARACTER_PROFILES.anya
    : null;

  const handlePlayClick = () => {
    if (!activeProfile) {
      setProfileModalOpen(true);
      return;
    }
    onStart();
  };

  return (
    <main className="relative flex h-dvh w-full items-center justify-center overflow-hidden p-3 sm:p-5">
      {/* Full-Viewport Game Cabinet Container */}
      <div className="relative flex h-full max-h-[820px] w-full max-w-[1160px] flex-col justify-between overflow-hidden rounded-[2rem] border-4 border-[#14532D] border-b-[10px] bg-[#14532D] shadow-2xl">
        {/* Full-Bleed Vibrant Anime Backdrop */}
        <div className="absolute inset-0">
          <ArtworkImage
            src={HERO_IMAGE_PATH}
            alt="Família de espiões em frente à Academia Eden"
            fallbackTitle="Operação Stella"
            fallbackGradient="from-[#14532D] via-[#1B6B3A] to-[#CA8A04]"
            className="h-full w-full object-cover object-center"
          />
          {/* Calm warm cinematic gradient scrim so foreground title & Play button stay crisp */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#14532D]/60 via-transparent via-45% to-[#14532D]/92" />
        </div>

        {/* Top Floating Game Corner HUD: Active Profile Switcher + Install + Parents */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 p-4 sm:p-6">
          {/* Active Player Profile Pill (click to load session or create new player) */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="game-btn-3d flex items-center gap-2.5 rounded-2xl border-2 border-[#EAB308] border-b-4 border-b-[#B45309] bg-[#FFFDF7]/95 py-1.5 pl-2 pr-3.5 text-left shadow-md hover:bg-[#FEF9C3] cursor-pointer"
            title="Trocar jogador, carregar sessão ou criar novo perfil"
          >
            {activeProfile && activeChar ? (
              <>
                <div
                  className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${activeChar.ringColor}`}
                >
                  <ArtworkImage
                    src={activeChar.portraitSrc}
                    alt={activeProfile.name}
                    fallbackTitle={activeChar.displayName}
                    fallbackGradient={activeChar.fallbackGradient}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <span className="block max-w-[140px] truncate font-display text-sm font-extrabold leading-tight text-[#14532D]">
                    {activeProfile.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-[#92400E]">
                    <Star className="h-3.5 w-3.5 fill-[#EAB308] text-[#B45309]" />
                    <span className="tabular-nums">{activeProfile.progress.totalStellaStars}</span>
                    <span className="text-[#57534E]">· Trocar</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1 text-[#14532D]">
                <UserPlus className="h-5 w-5 text-[#EC4899]" />
                <span className="font-display text-sm font-extrabold">Criar ou Carregar Perfil</span>
              </div>
            )}
          </button>

          <div className="flex items-center gap-2">
            <PWAInstallButton variant="title" />

            <GuardianHoldButton variant="title" onOpenGuardian={onOpenGuardian} />
          </div>
        </div>

        {/* Bottom Center: Game Emblem Title + Big Chunky PLAY & Profiles Buttons */}
        <div className="relative z-10 flex flex-col items-center px-6 pb-6 text-center sm:pb-9">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#EAB308]/80 bg-[#14532D]/90 px-4 py-1 text-xs font-extrabold tracking-wide text-[#FEF08A] shadow-sm">
            <span>ACADEMIA EDEN</span>
            <span aria-hidden="true">·</span>
            <span>JOGO POR GESTOS DAS MÃOS</span>
          </div>

          <h1
            className="mt-2.5 font-display text-4xl font-extrabold tracking-tight text-[#FFFBF2] sm:text-6xl"
            style={{ textShadow: '0 4px 18px rgba(0, 0, 0, 0.55)' }}
          >
            Operação Stella
          </h1>

          <p className="mt-1.5 max-w-md text-sm font-semibold text-[#FEF9C3] sm:text-base">
            Use sua mão no ar para cumprir missões secretas com Anya, Loid, Yor e Bond!
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePlayClick}
              className="game-btn-3d inline-flex items-center gap-3.5 rounded-3xl border-3 border-[#FBCFE8] border-b-[7px] border-b-[#9D174D] bg-[#EC4899] px-10 py-4 font-display text-2xl font-extrabold text-white shadow-xl hover:scale-[1.03] hover:bg-[#DB2777] cursor-pointer whitespace-nowrap sm:px-12 sm:py-5"
            >
              <Play className="h-7 w-7 fill-white" />
              <span>
                {!activeProfile
                  ? 'COMEÇAR'
                  : cameraReady
                    ? `CONTINUAR (${activeProfile.name})`
                    : 'JOGAR'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="game-btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-[#FEF08A] border-b-[5px] border-b-[#B45309] bg-[#FFFDF7]/95 px-5 py-3.5 font-display text-sm font-extrabold text-[#14532D] shadow-lg hover:bg-[#FEF9C3] cursor-pointer whitespace-nowrap"
            >
              <Users className="h-4 w-4 text-[#EC4899]" />
              <span>{profiles.length > 0 ? 'Perfis e Sessões' : 'Novo Jogador'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Player Profiles & Session Loader Modal */}
      {profileModalOpen && (
        <ProfileSelectorModal
          profiles={profiles}
          activeProfileId={activeProfile?.id ?? null}
          allowClose={true}
          onSelectProfile={(id) => {
            onSelectProfile(id);
            setProfileModalOpen(false);
          }}
          onCreateProfile={(name, avatarId) => {
            onCreateProfile(name, avatarId);
            setProfileModalOpen(false);
          }}
          onImportProfile={(prof) => {
            onImportProfile(prof);
            setProfileModalOpen(false);
          }}
          onDeleteProfile={onDeleteProfile}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </main>
  );
}
