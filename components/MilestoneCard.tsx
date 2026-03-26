
import React from 'react';

export interface MilestoneProps {
  theme: 'sunny' | 'classic' | 'dark' | 'rose' | 'blue';
  name: string;
  image: string;
  rankTitle: string; // e.g. "Kitchen King"
  rankIcon: string;
  score: number; // Integrity Score (out of 30)
  winRate: number;
  aiInsight: string;
  momentum: number[]; // Array of numbers for the graph
}

const MilestoneCard: React.FC<MilestoneProps> = ({ 
  theme, 
  name, 
  image, 
  rankTitle, 
  rankIcon, 
  score, 
  winRate, 
  aiInsight, 
  momentum 
}) => {
  
  // Theme Configuration
  const isDark = theme === 'dark';
  
  const colors = {
    sunny: { bg: 'bg-[#FDF6E3]', border: 'border-[#E7D9CF]', text: 'text-[#4A4238]', accent: 'text-[#D98B79]', graph: '#D98B79', circle: '#C4A45C' },
    classic: { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800', accent: 'text-blue-500', graph: '#3b82f6', circle: '#64748b' },
    dark: { bg: 'bg-[#0A292C]', border: 'border-cyan-900', text: 'text-[#D9FDFD]', accent: 'text-[#33FFFC]', graph: '#33FFFC', circle: '#0A4D54' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', accent: 'text-rose-500', graph: '#f43f5e', circle: '#fb7185' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', accent: 'text-blue-500', graph: '#3b82f6', circle: '#60a5fa' },
  }[theme];

  // Graph Logic
  const graphPath = `M 0 50 ` + momentum.map((p, i) => {
    const x = (i / (momentum.length - 1)) * 100;
    const y = 50 - (p / 2); // Scale roughly
    return `L ${x} ${y}`;
  }).join(' ');

  return (
    <div className={`w-44 relative flex-shrink-0 cursor-default transition-all duration-500 group hover:-translate-y-4 hover:z-50`}>
      {/* Card Container */}
      <div className={`rounded-[1.5rem] p-3 shadow-2xl border-4 ${colors.bg} ${colors.border} relative overflow-hidden h-full flex flex-col gap-2`}>
        
        {/* Header: Profile & Rank */}
        <div className="flex items-center gap-2 relative z-10">
           <div className="relative shrink-0">
              <div className={`w-10 h-10 rounded-full border-2 ${colors.border} overflow-hidden shadow-md`}>
                 <img src={image} alt={name} className="w-full h-full object-cover" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-sm ${theme === 'dark' ? 'bg-[#33FFFC] text-black' : 'bg-yellow-400 text-yellow-900'}`}>
                 <i className={`fas ${rankIcon}`}></i>
              </div>
           </div>
           <div className="min-w-0">
              <h3 className={`font-black text-[10px] uppercase leading-tight truncate ${colors.text}`}>{name}</h3>
              <div className={`text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg mt-0.5 inline-block ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-white/50 text-stone-500'}`}>
                 {rankTitle}
              </div>
           </div>
        </div>

        {/* Stats Row: Integrity Score & Win Rate */}
        <div className={`flex items-center justify-between p-1.5 rounded-xl ${isDark ? 'bg-black/20' : 'bg-white/60'} backdrop-blur-sm border ${isDark ? 'border-white/5' : 'border-white/40'}`}>
           {/* Integrity Circle */}
           <div className="flex flex-col items-center gap-0.5">
              <div className="relative w-8 h-8">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="14" stroke={isDark ? '#ffffff10' : '#e5e7eb'} strokeWidth="3" fill="transparent" />
                    <circle 
                      cx="50%" 
                      cy="50%" 
                      r="14" 
                      stroke={colors.circle} 
                      strokeWidth="3" 
                      fill="transparent" 
                      strokeDasharray={`${(score / 30) * (2 * Math.PI * 14)} ${(2 * Math.PI * 14)}`} 
                      strokeLinecap="round" 
                    />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-[10px] font-black ${colors.text}`}>{score}</span>
                 </div>
              </div>
              <span className={`text-[5px] font-bold uppercase tracking-widest ${colors.text} opacity-60`}>Integrity</span>
           </div>

           <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-stone-200'}`}></div>

           {/* Win Rate */}
           <div className="flex flex-col items-center gap-0.5">
              <span className={`text-sm font-black ${colors.accent}`}>{winRate}%</span>
              <span className={`text-[5px] font-bold uppercase tracking-widest ${colors.text} opacity-60`}>Win Rate</span>
           </div>
        </div>

        {/* Momentum Graph */}
        <div className={`p-1.5 rounded-xl ${isDark ? 'bg-black/20' : 'bg-white/60'} backdrop-blur-sm border ${isDark ? 'border-white/5' : 'border-white/40'}`}>
           <div className="flex justify-between items-center mb-1">
              <span className={`text-[5px] font-black uppercase tracking-widest ${colors.text} opacity-60`}>Momentum</span>
              <i className={`fas fa-arrow-trend-up text-[6px] ${colors.accent}`}></i>
           </div>
           <div className="h-4 w-full">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                 <path d={graphPath} fill="none" stroke={colors.graph} strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
           </div>
        </div>

        {/* AI Coach Bubble */}
        <div className={`mt-auto p-1.5 rounded-tr-xl rounded-bl-xl rounded-br-xl relative ${isDark ? 'bg-[#33FFFC]/10 border border-[#33FFFC]/20 text-[#33FFFC]' : 'bg-white border border-stone-100 shadow-sm text-stone-600'}`}>
           <div className={`absolute -top-1.5 -left-1 w-3 h-3 rounded-full flex items-center justify-center ${isDark ? 'bg-[#33FFFC] text-black' : 'bg-stone-800 text-white'} shadow-sm`}>
              <i className="fas fa-robot text-[5px]"></i>
           </div>
           <p className="text-[6px] font-bold italic leading-relaxed pl-1">
              "{aiInsight}"
           </p>
        </div>

      </div>
    </div>
  );
};

export default MilestoneCard;
