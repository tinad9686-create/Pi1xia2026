import React from 'react';
import { Theme } from '../types';

interface Pi1xiaBottomBannerProps {
  theme?: Theme;
  onClick?: () => void;
}

const Pi1xiaBottomBanner: React.FC<Pi1xiaBottomBannerProps> = ({ onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="relative w-full rounded-full overflow-hidden shadow-xl cursor-pointer group bg-gradient-to-r from-[#FBCB24] to-[#F26522] p-6 md:p-8 flex items-center justify-between transition-transform hover:scale-[1.02]"
    >
      {/* Decorative background elements */}
      <div className="absolute right-0 top-0 bottom-0 w-64 opacity-20 pointer-events-none">
        <i className="fas fa-brain text-9xl -mr-10 -mt-4"></i>
      </div>
      
      <div className="relative z-10 flex-1">
        <h2 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight mb-1 md:mb-2">
          PI1XIA 2026 DIGITAL OPEN GAME
        </h2>
        <p className="text-white/90 text-xs md:text-base font-medium">
          Test your tactical knowledge in the new IQ Simulator!
        </p>
      </div>
      
      <div className="relative z-10 shrink-0 ml-4">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <i className="fas fa-play text-white text-lg md:text-2xl ml-1"></i>
        </div>
      </div>
    </div>
  );
};

export default Pi1xiaBottomBanner;
