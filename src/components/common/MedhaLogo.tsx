import React from 'react';

interface MedhaLogoProps {
  variant?: 'full' | 'compact' | 'wordmark' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'on-dark';
  className?: string;
  showSubtitle?: boolean;
}

export const MedhaBrainIcon: React.FC<{
  size?: number | string;
  className?: string;
}> = ({ size = 48, className = '' }) => {
  return (
    <svg
      viewBox="0 0 260 260"
      width={size}
      height={size}
      className={`shrink-0 drop-shadow-xs transition-transform duration-200 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Left Tech Hemisphere Gradients */}
        <linearGradient id="mbTechGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="mbTechGradMid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C2FF" />
          <stop offset="45%" stopColor="#0077E6" />
          <stop offset="100%" stopColor="#003E9E" />
        </linearGradient>
        <linearGradient id="mbTechGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="60%" stopColor="#034694" />
          <stop offset="100%" stopColor="#082F49" />
        </linearGradient>
        <linearGradient id="mbTechGradDeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#05192D" />
        </linearGradient>

        {/* Right Organic Warm Gradients */}
        <linearGradient id="mbWarmRibbon1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFC107" />
          <stop offset="45%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF3366" />
        </linearGradient>
        <linearGradient id="mbWarmRibbon2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8A00" />
          <stop offset="55%" stopColor="#E52E71" />
          <stop offset="100%" stopColor="#9C27B0" />
        </linearGradient>
        <linearGradient id="mbWarmRibbon3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4D4D" />
          <stop offset="55%" stopColor="#C2185B" />
          <stop offset="100%" stopColor="#7B1FA2" />
        </linearGradient>
        <linearGradient id="mbWarmRibbon4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BA68C8" />
          <stop offset="65%" stopColor="#6A1B9A" />
          <stop offset="100%" stopColor="#3B0764" />
        </linearGradient>

        {/* Subtle glow filter for circuits */}
        <filter id="mbCircGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ground soft shadow */}
      <ellipse cx="130" cy="246" rx="72" ry="7" fill="#001845" opacity="0.12" />

      {/* Group centered in 260x260 canvas */}
      <g transform="translate(13, 8) scale(0.72)">
        {/* LEFT HEMISPHERE: TECH & CIRCUITS */}
        <g id="left-hemisphere">
          {/* Fold 1 (Top) */}
          <path
            d="M 152 42 C 118 42 96 58 84 84 C 76 100 86 120 106 120 C 130 120 144 120 152 120 Z"
            fill="url(#mbTechGradTop)"
          />
          <path
            d="M 152 42 C 124 42 100 56 90 78 C 106 72 128 70 152 72 Z"
            fill="#7DD3FC"
            opacity="0.4"
          />

          {/* Fold 2 (Upper-Mid) */}
          <path
            d="M 152 120 C 90 120 62 136 54 162 C 46 188 62 208 88 208 C 118 208 140 208 152 208 Z"
            fill="url(#mbTechGradMid)"
          />

          {/* Fold 3 (Mid lobe) */}
          <path
            d="M 152 208 C 76 208 46 224 42 250 C 38 276 56 294 92 294 C 122 294 142 294 152 294 Z"
            fill="url(#mbTechGradDark)"
          />

          {/* Fold 4 (Lower cerebellum lobe) */}
          <path
            d="M 152 294 C 86 294 62 308 62 328 C 62 348 82 360 110 360 C 134 360 146 358 152 356 Z"
            fill="url(#mbTechGradDeep)"
          />

          {/* Circuit Traces & Glowing Nodes */}
          <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#mbCircGlow)">
            {/* Trace 1 */}
            <path d="M 148 82 L 116 82" />
            <circle cx="112" cy="82" r="4.2" fill="#FFFFFF" />

            {/* Trace 2 */}
            <path d="M 148 130 L 102 130 L 86 146 L 72 146" />
            <circle cx="68" cy="146" r="4.2" fill="#FFFFFF" />

            {/* Trace 3 */}
            <path d="M 148 178 L 90 178" />
            <circle cx="86" cy="178" r="4.8" fill="#FFFFFF" />

            {/* Trace 4 */}
            <path d="M 148 226 L 110 226 L 96 242 L 68 242" />
            <circle cx="64" cy="242" r="4.2" fill="#FFFFFF" />

            {/* Trace 5 */}
            <path d="M 148 272 L 104 272" />
            <circle cx="100" cy="272" r="4.2" fill="#FFFFFF" />

            {/* Vertical bus line */}
            <path d="M 136 82 L 136 272" strokeWidth="2.5" strokeDasharray="7 5" opacity="0.8" />
            <circle cx="136" cy="130" r="2.8" fill="#FFFFFF" />
            <circle cx="136" cy="178" r="2.8" fill="#FFFFFF" />
            <circle cx="136" cy="226" r="2.8" fill="#FFFFFF" />
          </g>
        </g>

        {/* RIGHT HEMISPHERE: WARM ORGANIC FLOWING RIBBONS */}
        <g id="right-hemisphere">
          {/* Ribbon 1 (Top swirl - Gold to Orange to Coral) */}
          <path
            d="M 162 44 C 174 42 202 46 230 66 C 262 88 272 118 260 144 C 250 162 226 176 200 176 C 176 176 164 168 162 166 C 174 140 200 122 220 108 C 206 86 182 66 162 44 Z"
            fill="url(#mbWarmRibbon1)"
          />

          {/* Ribbon 2 (Upper-Mid swirl - Orange to Crimson to Purple) */}
          <path
            d="M 162 152 C 180 156 216 162 246 184 C 276 206 280 236 266 262 C 252 284 224 294 198 294 C 174 294 164 284 162 280 C 176 254 206 240 228 224 C 214 198 186 176 162 152 Z"
            fill="url(#mbWarmRibbon2)"
          />

          {/* Ribbon 3 (Lower-Mid swirl - Coral to Ruby to Violet) */}
          <path
            d="M 162 254 C 178 258 208 266 234 288 C 260 310 258 338 238 360 C 222 376 198 380 178 380 C 166 380 162 374 162 370 C 172 348 198 334 214 318 C 200 296 176 278 162 254 Z"
            fill="url(#mbWarmRibbon3)"
          />

          {/* Ribbon 4 (Bottom tail - Lavender to Deep Plum) */}
          <path
            d="M 162 352 C 170 354 184 362 192 376 C 200 394 190 410 178 422 C 170 430 164 432 162 432 C 160 420 162 386 162 352 Z"
            fill="url(#mbWarmRibbon4)"
          />
        </g>
      </g>
    </svg>
  );
};

export const MedhaLogo: React.FC<MedhaLogoProps> = ({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className = '',
  showSubtitle = true,
}) => {
  // Dimension and typography presets
  const sizeConfig = {
    xs: { iconSize: 26, titleClass: 'text-base', subClass: 'text-[9px]' },
    sm: { iconSize: 34, titleClass: 'text-xl', subClass: 'text-[10px]' },
    md: { iconSize: 46, titleClass: 'text-2xl', subClass: 'text-xs' },
    lg: { iconSize: 58, titleClass: 'text-3xl sm:text-4xl', subClass: 'text-xs sm:text-sm' },
    xl: { iconSize: 76, titleClass: 'text-4xl sm:text-5xl', subClass: 'text-sm sm:text-base' },
  }[size];

  const isOnDark = theme === 'on-dark';

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <MedhaBrainIcon size={sizeConfig.iconSize} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}
      aria-label="medha - Memory Enhancement and Dementia Health Assistant"
    >
      <MedhaBrainIcon size={sizeConfig.iconSize} />

      <div className="flex flex-col justify-center leading-tight">
        {/* Wordmark "medha" */}
        <span
          className={`font-black tracking-tight lowercase ${sizeConfig.titleClass} ${
            isOnDark
              ? 'text-white'
              : 'text-[#0052B4] bg-gradient-to-r from-[#0072CE] via-[#0052B4] to-[#002D72] bg-clip-text text-transparent'
          }`}
          style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          medha
        </span>

        {/* Subtitle / Acronym Expansion */}
        {showSubtitle && variant !== 'wordmark' && (
          <span
            className={`font-semibold tracking-tight mt-0.5 max-w-[280px] sm:max-w-none leading-tight ${sizeConfig.subClass} ${
              isOnDark ? 'text-white/80' : 'text-slate-600'
            }`}
          >
            {variant === 'compact' ? (
              'Memory & Dementia Assistant'
            ) : (
              'Memory Enhancement and Dementia Health Assistant'
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default MedhaLogo;
