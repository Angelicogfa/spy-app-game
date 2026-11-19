import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'title' | 'panel';
}

export function PWAInstallButton({ variant = 'title' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const buttonClasses =
    variant === 'title'
      ? 'game-btn-3d inline-flex items-center gap-1.5 rounded-2xl border-2 border-[#EAB308] border-b-4 border-b-[#B45309] bg-[#FEF9C3]/95 px-4 py-2 font-display text-xs font-extrabold text-[#78350F] shadow-md hover:bg-[#FEF08A] cursor-pointer whitespace-nowrap'
      : 'inline-flex items-center gap-2 rounded-xl border border-[#14532D] bg-[#DCFCE7] px-4 py-2.5 text-xs font-bold text-[#14532D] hover:bg-[#BBF7D0] whitespace-nowrap cursor-pointer';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={buttonClasses}
        title="Instalar Operação Stella como aplicativo no dispositivo"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={buttonClasses}
          title="Como instalar no iPhone ou iPad"
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
            <div className="game-board-frame relative w-full max-w-sm p-6 text-left">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl border border-[#D9CEB8] bg-[#F8F4E8] text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                aria-label="Fechar instruções"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2.5 text-[#14532D]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DCFCE7]">
                  <Share className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-extrabold">
                  Instalar no iPhone / iPad
                </h3>
              </div>

              <ol className="mt-4 space-y-2.5 text-sm text-[#44403C]">
                <li className="flex gap-2">
                  <span className="font-display font-extrabold text-[#14532D]">1.</span>
                  <span>
                    Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-display font-extrabold text-[#14532D]">2.</span>
                  <span>
                    Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-display font-extrabold text-[#14532D]">3.</span>
                  <span>
                    Toque em <strong>Adicionar</strong> para abrir o jogo em tela cheia!
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="game-btn-3d mt-5 w-full rounded-2xl border-2 border-[#14532D] border-b-[#0D3B1E] bg-[#14532D] py-2.5 font-display text-sm font-extrabold text-white hover:bg-[#1B6B3A] cursor-pointer"
              >
                Entendi!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
