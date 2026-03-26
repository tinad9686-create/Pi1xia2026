
import React from 'react';
import { Theme } from '../types';

interface LogoProps {
  className?: string;
  showText?: boolean;
  theme?: Theme;
}

const PickleballIcon: React.FC<{ className?: string; color: string }> = ({ className = "w-4 h-4", color }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill={color} />
    {/* Characteristic pickleball holes */}
    <circle cx="50" cy="22" r="7" fill="black" fillOpacity="0.15" />
    <circle cx="25" cy="40" r="7" fill="black" fillOpacity="0.15" />
    <circle cx="75" cy="40" r="7" fill="black" fillOpacity="0.15" />
    <circle cx="35" cy="70" r="7" fill="black" fillOpacity="0.15" />
    <circle cx="65" cy="70" r="7" fill="black" fillOpacity="0.15" />
    <circle cx="50" cy="50" r="7" fill="black" fillOpacity="0.15" />
  </svg>
);

const Logo: React.FC<LogoProps> = ({ className = "", showText = false, theme = 'sunny' }) => {
  const isDark = theme === 'dark';
  const isSunny = theme === 'sunny';
  const isClassic = theme === 'classic';

  // Mood board colors
  const terracotta = "#D98B79";
  const moodyBlue = "#8EA3A6";
  const icyBlue = "#D1DCE0";
  const skinClay = "#E4D5CE";
  const neonCyan = "#33FFFC";
  const deepTeal = "#052F33";
  const ghostYellow = "#C4A45C";

  const ballColor1 = isDark ? neonCyan : isClassic ? moodyBlue : terracotta;
  const ballColor2 = isDark ? deepTeal : isClassic ? skinClay : ghostYellow;

  return (
    <div className={`flex items-center gap-0 ${className}`}>
      {/* Icon container with negative margin to pull it closer to the text */}
      <div className="relative flex-shrink-0 w-12 h-12 -mr-1">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Rotated 135 degrees clockwise and Mirrored Group */}
          <g transform="rotate(135, 50, 50) scale(-1, 1) translate(-100, 0)">
            {/* Bouncy 'p' shape fusion */}
            <path 
              d="M35 25C35 25 35 80 35 85M35 55C35 55 85 40 85 65C85 90 35 90 35 85" 
              stroke="url(#vibrantPiGradient)" 
              strokeWidth="11" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </g>
          
          <defs>
            <linearGradient id="vibrantPiGradient" x1="30" y1="20" x2="75" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isDark ? neonCyan : isClassic ? icyBlue : moodyBlue} />
              <stop offset="50%" stopColor={isDark ? deepTeal : isClassic ? skinClay : terracotta} />
              <stop offset="100%" stopColor={isDark ? neonCyan : isClassic ? moodyBlue : ghostYellow} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {showText && (
        <div className="relative flex flex-col leading-none pt-4">
          {/* Two Pickleballs on top of text */}
          <div className="absolute top-0 left-0 right-0 flex justify-center gap-8 pointer-events-none">
            <PickleballIcon color={ballColor1} className="w-5 h-5 animate-bounce [animation-duration:2s]" />
            <PickleballIcon color={ballColor2} className="w-4 h-4 animate-bounce [animation-duration:2.5s] mt-1" />
          </div>

          <span 
            className={`text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter lowercase bg-clip-text text-transparent bg-gradient-to-r ${
              isDark 
                ? 'from-[#33FFFC] via-[#0A4D54] to-[#33FFFC]' 
                : isSunny 
                  ? `from-[#8EA3A6] via-[#D98B79] to-[#C4A45C]` 
                  : `from-[#8EA3A6] via-[#D1DCE0] to-[#E4D5CE]`
            }`}
          >
            i1xia
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
