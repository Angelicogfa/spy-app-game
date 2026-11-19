import { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Hand,
  Sliders,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react';
import { getMissionMeta, MISSIONS_META } from '../data/missions';
import { AccessibilitySettings, PlayerProgress } from '../types/game';
import { exportProgressJson } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface GuardianPanelProps {
  progress: PlayerProgress;
  onUpdateSettings: (next: AccessibilitySettings) => void;
  onResetProgress: () => void;
  onBack: () => void;
}

export function GuardianPanel({
  progress,
  onUpdateSettings,
  onResetProgress,
  onBack,
}: GuardianPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const totalChallenges = Object.values(progress.skillStats).reduce(
    (acc, s) => acc + s.completedChallenges,
    0
  );
  const totalFirstTry = Object.values(progress.skillStats).reduce(
    (acc, s) => acc + s.firstTryCorrect,
    0
  );
  const firstTryRate =
    totalChallenges > 0 ? Math.round((totalFirstTry / totalChallenges) * 100) : 0;

  const { successfulPinches, earlyDrops } = progress.gestureTelemetry;
  const totalGestureAttempts = successfulPinches + earlyDrops;
  const pinchStability =
    totalGestureAttempts > 0
      ? Math.round((successfulPinches / totalGestureAttempts) * 100)
      : 100;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9CEB8] pb-5">
        <div>
          <p className="text-xs font-semibold text-[#57534E]">
            Área dos Responsáveis e Terapeutas · Dados salvos localmente no navegador
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#14532D]">
            Relatório de Progresso e Calibração Motora
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PWAInstallButton variant="panel" />

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-[#14532D] bg-[#14532D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1B6B3A] whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Jogo</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#57534E]">
            <span>Estrelas Stella</span>
            <Star className="h-4 w-4 fill-[#EAB308] text-[#B45309]" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#B45309] tabular-nums">
            {progress.totalStellaStars}
          </p>
          <p className="mt-1 text-xs text-[#57534E]">Acumuladas em 5 competências</p>
        </div>

        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#57534E]">
            <span>Sessões Concluídas</span>
            <Sliders className="h-4 w-4 text-[#14532D]" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#14532D] tabular-nums">
            {progress.recentSessions.length}
          </p>
          <p className="mt-1 font-mono text-xs text-[#57534E] tabular-nums">
            {progress.gestureTelemetry.totalMissionMinutes.toFixed(1)} min praticados
          </p>
        </div>

        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#57534E]">
            <span>Acerto de Primeira</span>
            <Volume2 className="h-4 w-4 text-[#EC4899]" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#1C1917] tabular-nums">
            {totalChallenges > 0 ? `${firstTryRate}%` : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-[#57534E] tabular-nums">
            {totalFirstTry} de {totalChallenges} desafios
          </p>
        </div>

        <div className="rounded-2xl border border-[#D9CEB8] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#57534E]">
            <span>Estabilidade da Pinça</span>
            <Hand className="h-4 w-4 text-[#14532D]" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#14532D] tabular-nums">
            {totalGestureAttempts > 0 ? `${pinchStability}%` : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-[#57534E] tabular-nums">
            {successfulPinches} pinças · {earlyDrops} solturas precoces
          </p>
        </div>
      </section>

      {/* Main Content Split: Competency Breakdown + Calibration Sliders */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* 5-Skill Breakdown Table */}
        <section className="rounded-3xl border border-[#D9CEB8] bg-white p-6 lg:col-span-7">
          <h2 className="font-display text-xl font-extrabold text-[#14532D]">
            Desempenho por Competência
          </h2>
          <p className="mt-1 text-xs text-[#57534E]">
            Acompanhe evolução em cada habilidade cognitiva, motora e social.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#D9CEB8] text-xs font-semibold text-[#57534E]">
                  <th className="py-2.5 pr-3">Competência</th>
                  <th className="px-3 py-2.5 text-right">Sessões</th>
                  <th className="px-3 py-2.5 text-right">1ª Tentativa</th>
                  <th className="px-3 py-2.5 text-right">Dicas</th>
                  <th className="py-2.5 pl-3 text-right">Tempo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7D4]">
                {MISSIONS_META.map((m) => {
                  const st = progress.skillStats[m.domain];
                  const acc =
                    st.completedChallenges > 0
                      ? `${Math.round((st.firstTryCorrect / st.completedChallenges) * 100)}%`
                      : '—';
                  const avgSec =
                    st.completedChallenges > 0
                      ? `${Math.round(st.totalTimeSec / st.completedChallenges)}s`
                      : '—';

                  return (
                    <tr key={m.domain}>
                      <td className="py-3.5 pr-3">
                        <span className="block font-semibold text-[#1C1917]">{m.skillLabel}</span>
                        <span className="text-xs text-[#57534E]">{m.shortTitle}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#1C1917]">
                        {st.sessionsCompleted}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-[#14532D]">
                        {acc}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#57534E]">
                        {st.hintsUsed}
                      </td>
                      <td className="py-3.5 pl-3 text-right font-mono tabular-nums text-[#57534E]">
                        {avgSec}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Motor & Sensory Calibration Settings */}
        <section className="flex flex-col justify-between rounded-3xl border border-[#D9CEB8] bg-[#F6EFE0] p-6 lg:col-span-5">
          <div>
            <h2 className="font-display text-xl font-extrabold text-[#14532D]">
              Ajustes Motores e Sensoriais
            </h2>
            <p className="mt-1 text-xs text-[#57534E]">
              Adapte a sensibilidade da pinça e a suavização do cursor ao conforto motor da
              criança.
            </p>

            <div className="mt-6 space-y-5">
              {/* Pinch Threshold Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                  <label htmlFor="pinch-slider">Sensibilidade da Pinça</label>
                  <span className="font-mono text-[#14532D] tabular-nums">
                    {Math.round(progress.settings.pinchThreshold * 100)}%
                  </span>
                </div>
                <input
                  id="pinch-slider"
                  type="range"
                  min={0.24}
                  max={0.52}
                  step={0.02}
                  value={progress.settings.pinchThreshold}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...progress.settings,
                      pinchThreshold: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-[#14532D] cursor-pointer"
                />
                <div className="mt-1 flex justify-between text-[11px] text-[#57534E]">
                  <span>Mais precisa (dedos juntos)</span>
                  <span>Mais fácil (menor esforço)</span>
                </div>
              </div>

              {/* Cursor Smoothing Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                  <label htmlFor="smooth-slider">Suavização do Cursor</label>
                  <span className="font-mono text-[#14532D] tabular-nums">
                    {Math.round((1 - progress.settings.smoothingFactor) * 100)}%
                  </span>
                </div>
                <input
                  id="smooth-slider"
                  type="range"
                  min={0.15}
                  max={0.65}
                  step={0.05}
                  value={progress.settings.smoothingFactor}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...progress.settings,
                      smoothingFactor: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-[#EC4899] cursor-pointer"
                />
                <div className="mt-1 flex justify-between text-[11px] text-[#57534E]">
                  <span>Muito estável (filtra tremor)</span>
                  <span>Mais ágil</span>
                </div>
              </div>

              {/* Camera Display Mode (Anti-distraction control for ASD focus) */}
              <div className="border-t border-[#D9CEB8] pt-4">
                <span className="block text-xs font-bold text-[#1C1917]">
                  Exibição da Câmera (Foco no Jogo)
                </span>
                <p className="mt-0.5 text-[11px] text-[#57534E]">
                  Oculte o vídeo para evitar que a criança se distraia com a própria imagem.
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'hidden', label: 'Oculta (Só Mão)' },
                      { id: 'hand_only', label: 'Painel Só Mão' },
                      { id: 'video', label: 'Vídeo Completo' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...progress.settings,
                          cameraDisplayMode: opt.id,
                        })
                      }
                      className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
                        progress.settings.cameraDisplayMode === opt.id
                          ? 'border-[#14532D] bg-[#14532D] text-white'
                          : 'border-[#D9CEB8] bg-white text-[#44403C] hover:bg-[#FFFBF2]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio & Voice Toggles */}
              <div className="space-y-3 border-t border-[#D9CEB8] pt-4">
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-[#1C1917] cursor-pointer">
                  <span>Efeitos sonoros alegres</span>
                  <input
                    type="checkbox"
                    checked={progress.settings.soundEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...progress.settings,
                        soundEnabled: e.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-[#14532D] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-[#1C1917] cursor-pointer">
                  <span>Narração automática em voz alta (pt-BR)</span>
                  <input
                    type="checkbox"
                    checked={progress.settings.narrationEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...progress.settings,
                        narrationEnabled: e.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-[#14532D] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Data Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#D9CEB8] pt-5">
            <button
              type="button"
              onClick={() => exportProgressJson(progress)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#14532D] bg-white px-4 py-2.5 text-xs font-bold text-[#14532D] hover:bg-[#DCFCE7] whitespace-nowrap cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Exportar JSON</span>
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DC2626]/40 bg-white px-4 py-2.5 text-xs font-bold text-[#DC2626] hover:bg-[#FEE2E2] whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Redefinir Dados</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="rounded-xl bg-[#DC2626] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#B91C1C] whitespace-nowrap cursor-pointer"
                >
                  Confirmar Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-xl border border-[#D9CEB8] bg-white px-3 py-2 text-xs font-semibold text-[#57534E] whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent Session Log */}
      <section className="mt-8 rounded-3xl border border-[#D9CEB8] bg-white p-6">
        <h2 className="font-display text-xl font-extrabold text-[#14532D]">
          Histórico Recente de Missões
        </h2>

        {progress.recentSessions.length === 0 ? (
          <p className="mt-4 text-sm text-[#57534E]">
            Nenhuma missão concluída ainda. Assim que a criança finalizar a primeira rodada,
            o histórico detalhado aparecerá aqui.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#D9CEB8] text-xs font-semibold text-[#57534E]">
                  <th className="py-2 pr-3">Data</th>
                  <th className="px-3 py-2">Missão</th>
                  <th className="px-3 py-2 text-right">Nível</th>
                  <th className="px-3 py-2 text-right">Estrelas</th>
                  <th className="px-3 py-2 text-right">1ª Tentativa</th>
                  <th className="py-2 pl-3 text-right">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7D4]">
                {progress.recentSessions.slice(0, 12).map((s) => {
                  const meta = getMissionMeta(s.domain);
                  const dateLabel = new Date(s.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={s.id}>
                      <td className="py-3 pr-3 font-mono text-xs text-[#57534E] tabular-nums">
                        {dateLabel}
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#1C1917]">{meta.title}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#57534E]">
                        Nível {s.level}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-[#B45309]">
                        {s.starsEarned} ★
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#14532D]">
                        {s.firstTryCount}/{s.totalChallenges}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono tabular-nums text-[#57534E]">
                        {s.durationSec}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
