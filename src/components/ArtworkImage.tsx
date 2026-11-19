import { useState } from 'react';
import { Star } from 'lucide-react';

interface ArtworkImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  fallbackGradient?: string;
  className?: string;
}

export function ArtworkImage({
  src,
  alt,
  fallbackTitle,
  fallbackGradient = 'from-[#DCFCE7] via-[#FEF9C3] to-[#FCE7F3]',
  className = 'w-full h-full object-cover',
}: ArtworkImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${fallbackGradient} p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-[#14532D] shadow-sm">
          <Star className="h-7 w-7 fill-[#EAB308] text-[#B45309]" />
        </div>
        <span className="mt-3 font-display text-base font-bold text-[#1C1917]">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
