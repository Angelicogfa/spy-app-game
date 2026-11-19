import { useRef, useState } from 'react';
import { Check, Plus, Star, Trash2, Upload, UserCheck, Users, X } from 'lucide-react';
import { CHARACTER_PROFILES } from '../data/characters';
import { PlayerProfile, ProfileAvatarId } from '../types/game';
import { parseImportedProfileJson } from '../utils/storage';
import { ArtworkImage } from './ArtworkImage';

interface ProfileSelectorModalProps {
  profiles: PlayerProfile[];
  activeProfileId: string | null;
  allowClose: boolean;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, avatarId: ProfileAvatarId) => void;
  onImportProfile: (profile: PlayerProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  onClose: () => void;
}

const AVATAR_OPTIONS: { id: ProfileAvatarId; label: string }[] = [
  { id: 'anya', label: 'Anya' },
  { id: 'bond', label: 'Bond' },
  { id: 'loid', label: 'Loid' },
  { id: 'yor', label: 'Yor' },
];

export function ProfileSelectorModal({
  profiles,
  activeProfileId,
  allowClose,
  onSelectProfile,
  onCreateProfile,
  onImportProfile,
  onDeleteProfile,
  onClose,
}: ProfileSelectorModalProps) {
  const [creating, setCreating] = useState(profiles.length === 0);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState<ProfileAvatarId>('anya');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProfile(trimmed, newAvatar);
    setNewName('');
    setCreating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const imported = parseImportedProfileJson(content);
      if (imported) {
        onImportProfile(imported);
        setImportFeedback(`Sessão "${imported.name}" carregada com sucesso!`);
        setCreating(false);
      } else {
        setImportFeedback('Arquivo inválido. Use um arquivo JSON exportado pelo jogo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14532D]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="game-board-frame relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EFE7D4] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#14532D]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2
                id="profile-modal-title"
                className="font-display text-xl font-extrabold text-[#14532D] sm:text-2xl"
              >
                Perfis dos Agentes
              </h2>
              <p className="text-xs font-medium text-[#57534E]">
                Carregue uma sessão existente ou cadastre um novo jogador com progresso próprio.
              </p>
            </div>
          </div>

          {allowClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#D9CEB8] bg-[#FAF6EB] text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              aria-label="Fechar janela de perfis"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {importFeedback && (
            <div className="mb-3 rounded-xl border border-[#14532D]/30 bg-[#DCFCE7] px-3.5 py-2 text-xs font-bold text-[#14532D]">
              {importFeedback}
            </div>
          )}

          {/* Mode Tabs when at least 1 profile exists */}
          {profiles.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border-2 border-[#D9CEB8] bg-[#FAF6EB] p-1">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-extrabold transition-colors cursor-pointer ${
                    !creating
                      ? 'bg-[#14532D] text-[#FEF9C3]'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Carregar Sessão ({profiles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-extrabold transition-colors cursor-pointer ${
                    creating
                      ? 'bg-[#EC4899] text-white'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Novo Jogador</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CEB8] bg-white px-3 py-1.5 text-xs font-bold text-[#14532D] hover:bg-[#DCFCE7] cursor-pointer"
                title="Importar um arquivo JSON de sessão salvo anteriormente"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Existing Profiles List */}
          {!creating && profiles.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profiles.map((prof) => {
                const char = CHARACTER_PROFILES[prof.avatarId] || CHARACTER_PROFILES.anya;
                const isActive = prof.id === activeProfileId;
                const lastDate = new Date(prof.lastPlayedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                });

                return (
                  <div
                    key={prof.id}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 p-3.5 transition-all ${
                      isActive
                        ? 'border-[#EC4899] bg-[#FFF5FA] shadow-md'
                        : 'border-[#DFD4BC] bg-[#FAF6EB] hover:border-[#14532D]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-3 bg-white shadow-xs ${char.ringColor}`}
                      >
                        <ArtworkImage
                          src={char.portraitSrc}
                          alt={prof.name}
                          fallbackTitle={char.displayName}
                          fallbackGradient={char.fallbackGradient}
                          className="h-full w-full object-cover object-top"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate font-display text-base font-extrabold text-[#1C1917]">
                            {prof.name}
                          </h3>
                          {isActive && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#14532D] px-2 py-0.5 text-[10px] font-bold text-[#FEF9C3]">
                              <Check className="h-2.5 w-2.5" />
                              Ativo
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#57534E]">
                          <span className="inline-flex items-center gap-1 text-[#B45309] tabular-nums">
                            <Star className="h-3.5 w-3.5 fill-[#EAB308] text-[#B45309]" />
                            {prof.progress.totalStellaStars}
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">
                            {prof.progress.recentSessions.length} sessões
                          </span>
                          <span>·</span>
                          <span>{lastDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#EFE7D4]">
                      <button
                        type="button"
                        onClick={() => onSelectProfile(prof.id)}
                        className={`game-btn-3d flex-1 rounded-xl border-2 px-3 py-2 font-display text-xs font-extrabold cursor-pointer ${
                          isActive
                            ? 'border-[#14532D] border-b-[#0D3B1E] bg-[#14532D] text-white'
                            : 'border-[#EC4899] border-b-[#9D174D] bg-[#EC4899] text-white hover:bg-[#DB2777]'
                        }`}
                      >
                        {isActive ? 'Continuar com este Perfil' : 'Carregar Sessão'}
                      </button>

                      {profiles.length > 1 && (
                        confirmDeleteId === prof.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteProfile(prof.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-xl bg-[#DC2626] px-2.5 py-2 text-[11px] font-bold text-white cursor-pointer"
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(prof.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DC2626]/30 bg-white text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer"
                            title={`Remover perfil ${prof.name}`}
                            aria-label={`Remover perfil ${prof.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create New Player Form */}
          {creating && (
            <form onSubmit={handleSubmitNew} className="space-y-4 rounded-2xl border-2 border-[#EFE7D4] bg-[#FAF6EB] p-4 sm:p-5">
              <div>
                <label
                  htmlFor="new-player-name"
                  className="block font-display text-sm font-extrabold text-[#14532D]"
                >
                  Nome ou apelido do jogador
                </label>
                <input
                  id="new-player-name"
                  type="text"
                  maxLength={24}
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Lucas, Sofia, Agente Estrela..."
                  className="mt-1.5 w-full rounded-xl border-2 border-[#D9CEB8] bg-white px-4 py-2.5 font-display text-base font-bold text-[#1C1917] placeholder:font-sans placeholder:font-normal placeholder:text-[#A8A29E] focus:border-[#EC4899] focus:outline-none"
                />
              </div>

              <div>
                <span className="block font-display text-sm font-extrabold text-[#14532D]">
                  Escolha o personagem favorito
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {AVATAR_OPTIONS.map((opt) => {
                    const char = CHARACTER_PROFILES[opt.id];
                    const selected = newAvatar === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNewAvatar(opt.id)}
                        className={`flex flex-col items-center rounded-2xl border-3 p-2.5 transition-all cursor-pointer ${
                          selected
                            ? `${char.ringColor} bg-white shadow-md scale-[1.03]`
                            : 'border-[#E6DEC8] bg-[#FFFDF7] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-xs">
                          <ArtworkImage
                            src={char.portraitSrc}
                            alt={opt.label}
                            fallbackTitle={opt.label}
                            fallbackGradient={char.fallbackGradient}
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                        <span className="mt-1.5 font-display text-xs font-extrabold text-[#1C1917]">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {profiles.length === 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CEB8] bg-white px-3.5 py-2.5 text-xs font-bold text-[#14532D] hover:bg-[#DCFCE7] cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Ou importar sessão (JSON)</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="rounded-xl border border-[#D9CEB8] bg-white px-4 py-2.5 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                  >
                    Voltar para Perfis
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="game-btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-[#FBCFE8] border-b-[#9D174D] bg-[#EC4899] px-6 py-2.5 font-display text-sm font-extrabold text-white shadow-md hover:bg-[#DB2777] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Criar Perfil e Jogar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
