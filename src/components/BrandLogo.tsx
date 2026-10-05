import React, { useState } from 'react';

export interface BrandLogoProps {
  logoUrl?: string | null;
  businessName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'compact';
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
}

/**
 * BrandLogo provides a modern, executive-grade container for the user's business logo.
 * It ensures that ANY uploaded image (square, rectangular, transparent, white-background, SVG, etc.)
 * is framed with professional padding, subtle depth, and crisp borders so it looks integrated
 * like a native enterprise app logo rather than an unstyled raw image.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  businessName = '',
  size = 'md',
  variant = 'icon',
  showSubtitle = false,
  subtitleText = '',
  className = '',
  badgeClassName = '',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  // Size specifications
  const sizeMap = {
    xs: {
      box: 'w-6 h-6 rounded-md p-0.5',
      icon: 'w-3 h-3 text-[10px]',
      fontSize: 'text-xs',
      subSize: 'text-[9px]',
    },
    sm: {
      box: 'w-8 h-8 rounded-lg p-1',
      icon: 'w-4 h-4 text-xs',
      fontSize: 'text-xs font-semibold',
      subSize: 'text-[10px]',
    },
    md: {
      box: 'w-9 h-9 rounded-xl p-1.5',
      icon: 'w-4.5 h-4.5 text-xs',
      fontSize: 'text-sm font-semibold',
      subSize: 'text-[11px]',
    },
    lg: {
      box: 'w-12 h-12 rounded-2xl p-2',
      icon: 'w-6 h-6 text-sm',
      fontSize: 'text-base font-semibold',
      subSize: 'text-xs',
    },
    xl: {
      box: 'w-16 h-16 rounded-2xl p-2.5',
      icon: 'w-8 h-8 text-base',
      fontSize: 'text-lg font-bold',
      subSize: 'text-xs',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const hasValidLogo = !!logoUrl && !imgError && logoUrl.trim().length > 0;
  const cleanName = (businessName || '').trim();
  const hasBusinessName = cleanName.length > 0;

  // STRICT REQUIREMENT: No default logo or name unless the user configured it in Settings!
  if (!hasValidLogo && !hasBusinessName) {
    return null;
  }

  // Derives initial for fallback emblem only when user provided their actual business name
  const initial = cleanName.charAt(0).toUpperCase();

  const logoBadge = (
    <div
      className={`relative shrink-0 flex items-center justify-center bg-white border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02] transition-all overflow-hidden ${currentSize.box} ${badgeClassName}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {hasValidLogo ? (
        <img
          src={logoUrl}
          alt={cleanName || 'Business Logo'}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain select-none"
          loading="eager"
        />
      ) : (
        /* Dynamic Lettermark only if user configured a business name */
        <div className="w-full h-full rounded-md bg-neutral-900 flex items-center justify-center text-white font-bold select-none">
          <span className={`${currentSize.icon} font-mono tracking-tight`}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );

  if (variant === 'icon') {
    return (
      <div 
        className={`inline-flex items-center shrink-0 ${className} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
        onClick={onClick}
      >
        {logoBadge}
      </div>
    );
  }

  // Horizontal Full / Compact representation (Logo + Title + optional Subtitle)
  return (
    <div 
      className={`inline-flex items-center gap-2.5 min-w-0 select-none ${className} ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      {logoBadge}
      {hasBusinessName && (
        <div className="min-w-0 flex flex-col justify-center leading-tight">
          <span className={`text-neutral-900 tracking-tight truncate ${currentSize.fontSize} group-hover:text-black transition-colors`}>
            {cleanName}
          </span>
          {showSubtitle && subtitleText && (
            <span className={`text-neutral-500 font-normal truncate mt-0.5 ${currentSize.subSize}`}>
              {subtitleText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
