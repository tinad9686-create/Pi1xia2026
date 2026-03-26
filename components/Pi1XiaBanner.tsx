import React from 'react';

interface Props {
  onLaunchApp?: () => void;
}

const Pi1XiaBanner: React.FC<Props> = () => {
  return (
    <div className="relative w-full pt-20 pb-16 md:pt-32 md:pb-24 flex items-center justify-center px-4">
      <div className="text-center font-black leading-[0.85] tracking-tighter">
        <div className="text-[12vw] md:text-[8rem] text-[#A7A7A7] uppercase">
          Don't just
        </div>
        <div className="text-[12vw] md:text-[8rem] text-[#A7A7A7] uppercase">
          Play.
        </div>
        <div className="text-[12vw] md:text-[8rem] uppercase mt-2 md:mt-4 bg-gradient-to-r from-[#D4E01A] to-[#39B54A] text-transparent bg-clip-text">
          Outsmart
        </div>
        <div className="text-[10vw] md:text-[6.5rem] mt-1 md:mt-2 bg-gradient-to-r from-[#D4E01A] to-[#39B54A] text-transparent bg-clip-text">
          the Game.
        </div>
      </div>
    </div>
  );
};

export default Pi1XiaBanner;
