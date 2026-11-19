import { Camera, Hand, Pointer, Sparkles, Star } from 'lucide-react';
import { HERO_IMAGE_PATH, MISSIONS_META } from '../data/missions';
import { PlayerProgress } from '../types/game';
import { ArtworkImage } from './ArtworkImage';

interface TitleScreenProps {
  progress: PlayerProgress;
  cameraReady: boolean;
  onStart: () => void;
}

export function TitleScreen({ progress, cameraReady, onStart }: TitleScreenProps) {
  const totalSessions = progress.recentSessions.length;

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-10">
      {/* 2-Column Hero Split with items-stretch */}
      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-3xl border border-[#D9CEB8] bg-[#F6EFE0] p-8 lg:col-span-5 lg:p-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
              <span>Academia Eden</span>
              <span aria-hidden="true">·</span>
              <span>Gestos pela Webcam</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#B45309]">
                {progress.totalStellaStars} Estrelas Stella
              </span>
            </div>

            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[#14532D] sm:text-5xl">
              Missões secretas com as mãos no ar
            </h1>

            <p className="mt-5 text-base leading-relaxed text-[#44403C]">
              Ajude Anya, Loid, Yor e Bond a resolver desafios divertidos de matemática,
              rotina escolar, emoções, lógica e organização usando apenas gestos de apontar
              e pinça na webcam.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <button
              type="button"
              onClick={onStart}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#EC4899] px-6 py-4 font-display text-lg font-bold text-white shadow-sm transition-transform duration-150 hover:scale-[1.01] hover:bg-[#DB2777] active:scale-[0.99] whitespace-nowrap cursor-pointer"
            >
              <Camera className="h-5 w-5 shrink-0" />
              <span>{cameraReady ? 'Continuar Missões' : 'Ativar Câmera e Jogar'}</span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D9CEB8] pt-4 text-xs text-[#57534E]">
              <span>Privacidade total: o vídeo fica só no seu navegador.</span>
              {totalSessions > 0 && (
                <span className="font-mono font-semibold text-[#14532D] tabular-nums">
                  {totalSessions} {totalSessions === 1 ? 'missão concluída' : 'missões concluídas'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vibrant Anime Key Visual */}
        <div className="relative min-h-[340px] overflow-hidden rounded-3xl border border-[#D9CEB8] bg-[#14532D] lg:col-span-7">
          <ArtworkImage
            src={HERO_IMAGE_PATH}
            alt="Família de espiões inspirada em Spy x Family sorrindo em frente à Academia Eden"
            fallbackTitle="Operação Stella: Família Forger"
            fallbackGradient="from-[#14532D] via-[#1B6B3A] to-[#CA8A04]"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-6 text-white">
            <p className="font-display text-xl font-bold">
              Waku waku! Conquiste Estrelas Stella na Academia Eden
            </p>
            <p className="mt-1 text-sm text-white/90">
              Sem pressa e sem punições: dicas visuais acolhedoras em cada desafio.
            </p>
          </div>
        </div>
      </section>

      {/* Full-width 4-Column Guide Strip below Hero */}
      <section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <Pointer className="h-6 w-6 text-[#EC4899]" />
          <h2 className="mt-3 font-display text-lg font-bold text-[#1C1917]">
            1. Apontar com o dedo
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#57534E]">
            Levante a mão para a câmera e mova o dedo indicador para guiar o cursor mágico
            pela tela.
          </p>
        </div>

        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <Hand className="h-6 w-6 text-[#B45309]" />
          <h2 className="mt-3 font-display text-lg font-bold text-[#1C1917]">
            2. Pinça para agarrar
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#57534E]">
            Junte o polegar e o indicador para pegar amendoins, arrastar pistas ou escolher
            um cartão.
          </p>
        </div>

        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <Sparkles className="h-6 w-6 text-[#14532D]" />
          <h2 className="mt-3 font-display text-lg font-bold text-[#1C1917]">
            3. Cinco missões do anime
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#57534E]">
            Matemática, rotina escolar, telepatia de emoções, códigos secretos e organização
            dos Forger.
          </p>
        </div>

        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <Star className="h-6 w-6 fill-[#EAB308] text-[#B45309]" />
          <h2 className="mt-3 font-display text-lg font-bold text-[#1C1917]">
            4. Feito para crianças TEA
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#57534E]">
            Passos previsíveis, narração em voz alta, suavização motora e painel completo
            para responsáveis.
          </p>
        </div>
      </section>

      {/* Preview of the 5 Themes */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-[#14532D]">
            As 5 Missões da Operação Stella
          </h2>
          <span className="text-sm text-[#57534E]">
            3 níveis progressivos em cada missão · Progresso salvo no navegador
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {MISSIONS_META.map((m) => (
            <div
              key={m.domain}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#D9CEB8] bg-white"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F6EFE0]">
                <ArtworkImage
                  src={m.imagePath}
                  alt={m.title}
                  fallbackTitle={m.shortTitle}
                  fallbackGradient={m.fallbackGradient}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <span className="text-xs font-semibold text-[#57534E]">{m.skillLabel}</span>
                <h3 className="mt-1 font-display text-base font-bold text-[#1C1917]">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#57534E]">
                  {m.animeReference}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
