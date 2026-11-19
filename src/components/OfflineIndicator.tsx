import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-xl border-2 border-[#B45309] bg-[#FEF3C7] px-3 py-1.5 font-display text-xs font-extrabold text-[#78350F] shadow-lg"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-[#B45309]" />
      <span>Modo Offline · Usando jogo salvo</span>
    </div>
  );
}
