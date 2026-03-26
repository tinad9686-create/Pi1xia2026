import React from 'react';

interface Props {
  coords: {
    playerPos: { x: number; y: number };
    partnerPos?: { x: number; y: number };
    ballPos: { x: number; y: number };
  };
}

export const PickleballCourt: React.FC<Props> = ({ coords }) => {
  // Player icon with paddle (top-down view)
  const PlayerIcon = ({ color, glow, rotation = 0 }: { color: string; glow: string; rotation?: number }) => (
    <div className="relative w-12 h-12 flex items-center justify-center" style={{ transform: `rotate(${rotation}deg)` }}>
      <div className={`w-8 h-8 ${color} rounded-full border border-white/50 shadow-[0_0_15px_${glow}]`} />
      <div className={`absolute w-3 h-6 ${color} rounded-sm -right-1 rotate-45 border border-white/50 shadow-[0_0_10px_${glow}]`} />
    </div>
  );

  return (
    <div className="relative w-full aspect-[2/1] bg-blue-600 rounded-lg border-4 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Kitchen (NVZ) - Darker shade */}
      <div className="absolute inset-y-0 left-[34%] right-[34%] bg-blue-800" />
      
      {/* Net (Vertical) */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-4 border-white" />
      
      {/* Kitchen Lines (NVZ) */}
      <div className="absolute inset-y-0 left-[34%] border-l-2 border-white" />
      <div className="absolute inset-y-0 right-[34%] border-r-2 border-white" />
      
      {/* Center Service Lines */}
      <div className="absolute left-0 w-[34%] top-1/2 border-t-2 border-white" />
      <div className="absolute right-0 w-[34%] top-1/2 border-t-2 border-white" />
      
      {/* Player (You) - Bright white circle */}
      <div className="absolute" style={{ left: '10%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="w-8 h-8 bg-white rounded-full shadow-lg" />
      </div>
      
      {/* Partner - Smaller, faded circle */}
      <div className="absolute" style={{ left: '10%', top: '20%', transform: 'translate(-50%, -50%)' }}>
        <div className="w-6 h-6 bg-white/50 rounded-full" />
      </div>
      
      {/* Opponents */}
      <div className="absolute" style={{ left: '90%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <div className="w-8 h-8 bg-red-500 rounded-full" />
      </div>
      <div className="absolute" style={{ left: '90%', top: '70%', transform: 'translate(-50%, -50%)' }}>
        <div className="w-8 h-8 bg-red-500 rounded-full" />
      </div>
      
      {/* Ball */}
      <div 
        className="absolute w-4 h-4 bg-yellow-300 rounded-full shadow-md"
        style={{ left: `${coords.ballPos.x}%`, top: `${coords.ballPos.y}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
};
