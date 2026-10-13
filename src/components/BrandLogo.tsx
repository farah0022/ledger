import React, { useState } from 'react';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'compact';
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
  logoUrl?: string | null;
  businessName?: string;
}

/**
 * High-fidelity, self-contained SVG representation of the official Records Money Time brand logo.
 * Works offline, in Electron (file:// protocol), in browser print dialogs, and across all screen densities.
 */
export const AppLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Records Money Time Logo"
  >
    {/* Emerald rounded backdrop */}
    <rect width="512" height="512" rx="128" fill="#146C43" />
    {/* Dark green book base */}
    <rect x="136" y="116" width="240" height="280" rx="24" fill="#0E4B2E" />
    {/* White ledger card page */}
    <rect x="156" y="136" width="200" height="240" rx="16" fill="#FFFFFF" />
    {/* Ledger spine band */}
    <rect x="156" y="136" width="40" height="240" rx="8" fill="#E8ECE9" />
    {/* 3 crisp green ledger entry lines */}
    <rect x="220" y="180" width="110" height="18" rx="9" fill="#146C43" />
    <rect x="220" y="226" width="110" height="18" rx="9" fill="#146C43" />
    <rect x="220" y="272" width="80" height="18" rx="9" fill="#146C43" />
    {/* Amber coin badge with white outline */}
    <circle cx="360" cy="360" r="48" fill="#D97706" stroke="#FFFFFF" strokeWidth="8" />
    {/* White currency glyph */}
    <text
      x="360"
      y="375"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontSize="44"
      fontWeight="bold"
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
    >
      $
    </text>
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  badgeClassName = '',
  onClick,
  logoUrl,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    xs: { box: 'w-6 h-6 rounded-md' },
    sm: { box: 'w-8 h-8 rounded-lg' },
    md: { box: 'w-9 h-9 rounded-xl' },
    lg: { box: 'w-14 h-14 rounded-2xl' },
    xl: { box: 'w-16 h-16 rounded-2xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const hasCustomLogo = !imgError && Boolean(logoUrl && logoUrl.trim());

  return (
    <div 
      className={`inline-flex items-center shrink-0 ${className} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      onClick={onClick}
    >
      <div
        className={`relative shrink-0 flex items-center justify-center overflow-hidden transition-all aspect-square select-none ${currentSize.box} ${badgeClassName}`}
      >
        {hasCustomLogo ? (
          <img
            src={logoUrl!}
            alt="Business Logo"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover select-none rounded-[inherit]"
            loading="eager"
          />
        ) : (
          <AppLogoSvg className="w-full h-full select-none" />
        )}
      </div>
    </div>
  );
};
