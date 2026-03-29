
import React, { useState, useEffect, useMemo } from 'react';
import { generatePerformanceReport } from '../services/geminiService';
import { PerformanceReport as IPerformanceReport, PlayerProfile, MatchHistory, ScheduledMatch, Theme, WeeklyStats, GameResult } from '../types';

interface Props {
  userProfile: PlayerProfile;
  onLogMatch: (match: MatchHistory) => void;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onRevertMatchToHotSession?: (match: ScheduledMatch) => void;
  theme?: Theme;
  onRequireAuth?: () => boolean; // Returns true if auth was required and handled
  isAdmin?: boolean;
  allPlayers?: PlayerProfile[];
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block ml-1.5 z-[100]">
      <i 
        onClick={() => setIsOpen(!isOpen)}
        className={`fas fa-circle-info text-[10px] transition-colors cursor-pointer ${isOpen ? 'text-lime-500' : 'text-stone-300 hover:text-lime-500'}`}
      ></i>
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-4 bg-green-900/95 backdrop-blur-sm text-white text-[9px] leading-relaxed rounded-xl shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          {text}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-green-900/95 pointer-events-none"></div>
        </div>
      )}
    </div>
  );
};

const CommitmentWidget: React.FC<{ 
  stats: WeeklyStats, 
  history: MatchHistory[], 
  schedule: ScheduledMatch[], 
  theme: Theme,
  userProfile: PlayerProfile, // Pass full profile for tier/history access
  isAdmin?: boolean
}> = ({ stats, history, schedule, theme, userProfile, isAdmin }) => {
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-100';
  const textClass = isDark ? 'text-white' : 'text-stone-800';
  const subTextClass = isDark ? 'text-white/40' : 'text-stone-400';

  // --- SCORING LOGIC ---
  
  const weeklyTarget = useMemo(() => {
    // If active improvement plan exists, try to extract frequency from it, otherwise use schedule
    if (stats.activeImprovementPlan) {
      // Look for patterns like "2x/week", "3 times", etc.
      const match = stats.activeImprovementPlan.match(/(\d+)\s*(?:x|times|days)/i);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    const confirmedCount = schedule.filter(s => s.isConfirmedMatch).length;
    return confirmedCount > 0 ? confirmedCount : 3;
  }, [schedule, stats.activeImprovementPlan]);

  const { weeksMet, weeksMissed } = useMemo(() => {
    const now = new Date();
    let met = 0;
    let missed = 0;
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const matchesThisWeek = history.filter(m => m.type !== 'Assessment' && new Date(m.date) >= weekStart && new Date(m.date) < weekEnd).length;
      if (matchesThisWeek >= weeklyTarget) {
        met++;
      } else {
        missed++;
      }
    }
    return { weeksMet: met, weeksMissed: missed };
  }, [history, weeklyTarget]);

  // Plan Adherence Logic (Max 40)
  // Gain 10 points for each week target met. Lose 2.5 points for each week missed.
  const planScore = Math.max(0, (weeksMet * 10) - (weeksMissed * 2.5));

  // Social Score (Max 20)
  // 20 people invited in one month to gain 20 points
  const socialScore = Math.min(20, stats.invitesSent);

  // Warmup Score (Max 10)
  // Assume 4 warmups per month = 10 points
  const warmupScore = Math.min(10, stats.warmupsCount * 2.5);
  const performanceImproved = useMemo(() => {
    if (history.length < 2) return false;
    const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = sorted.slice(0, 3);
    const older = sorted.slice(3, 6);
    
    const getWinRate = (matches: MatchHistory[]) => {
      if (matches.length === 0) return 0;
      const totalGames = matches.reduce((sum, m) => sum + m.games.length, 0);
      const wonGames = matches.reduce((sum, m) => sum + m.games.filter(g => g.result === 'Win').length, 0);
      return totalGames > 0 ? wonGames / totalGames : 0;
    };

    const recentWR = getWinRate(recent);
    const olderWR = getWinRate(older);

    return recentWR > olderWR || (recentWR === olderWR && recentWR > 0.5);
  }, [history]);

  const growthScore = performanceImproved ? 30 : 0; // Max 30

  let punctualityPenalty = 0;
  stats.latenessMinutes.forEach(m => {
    if (m >= 30) punctualityPenalty += 20;
    else if (m >= 10) punctualityPenalty += 10;
  });
  punctualityPenalty += (stats.missedMatches * 30);

  const baseScore = planScore + socialScore + warmupScore + growthScore;
  const totalScore = Math.max(0, baseScore - punctualityPenalty);

  const [animatedScores, setAnimatedScores] = useState({
    plan: 0,
    social: 0,
    warmup: 0,
    growth: 0
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScores({
        plan: planScore,
        social: socialScore,
        warmup: warmupScore,
        growth: growthScore
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [planScore, socialScore, warmupScore, growthScore]);

  const rPlan = 100;
  const rSocial = 88;
  const rWarmup = 76;
  const rGrowth = 64;

  const cPlan = 2 * Math.PI * rPlan;
  const cSocial = 2 * Math.PI * rSocial;
  const cWarmup = 2 * Math.PI * rWarmup;
  const cGrowth = 2 * Math.PI * rGrowth;
  
  const planOffset = cPlan - ((animatedScores.plan / 40) * cPlan);
  const socialOffset = cSocial - ((animatedScores.social / 20) * cSocial);
  const warmupOffset = cWarmup - ((animatedScores.warmup / 10) * cWarmup);
  const growthOffset = cGrowth - ((animatedScores.growth / 30) * cGrowth);

  // --- REDEMPTION LOGIC ---
  const isPaidMember = userProfile.membershipTier === 'Pro' || userProfile.membershipTier === 'Elite';
  // Use mock history from profile, plus current calculated score
  const scoreHistory = [...(userProfile.integrityHistory || []), totalScore]; 
  const recentThreeMonths = scoreHistory.slice(-3); // Get last 3 entries
  const qualifyingMonths = recentThreeMonths.filter(s => s >= 85).length;
  const isEligibleForRedemption = qualifyingMonths >= 3;

  const handleRedemptionRequest = () => {
    if (!isEligibleForRedemption) {
      alert("You need a score of 85+ for 3 consecutive months to redeem.");
      return;
    }
    if (!isPaidMember) {
      alert("🎉 Redemption Request Sent! \n\nThe Market Team has been notified. Upon verification of your 3-month streak, you will receive 1 month of Pro membership ($9.99 value) to try for free!");
    } else {
      alert("🎉 Redemption Request Sent! \n\nThe Market Team has been notified. Upon verification of your 3-month streak, your next month's membership fee will be waived.");
    }
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border ${bgClass} shadow-lg mb-8 transition-all relative overflow-visible z-10`}>
      <div className="flex items-center justify-between mb-8 relative z-50">
        <div>
          <h3 className={`text-xl font-black uppercase ${textClass} flex items-center`}>
            Pi1xia Integrity
            <Tooltip text="We redeem your score every 3 months! Paid members with a score over 85 for 3 months get 1 month of membership FREE. Points reset after each 3-month cycle." />
          </h3>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${subTextClass}`}>Monthly 100-Point Evaluation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1.5 rounded-full border-2 border-white shadow-md whitespace-nowrap flex items-center gap-1 relative group cursor-help">
             <i className="fas fa-bolt"></i> {isAdmin ? '∞' : (userProfile.sparksBalance || 0)} Sparks
             <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-40 p-2 bg-black/90 text-white text-[9px] text-center rounded-lg shadow-xl z-50 whitespace-normal">
               Recover 10 Missing Scores: 50 ⚡
             </div>
          </div>
          <div className={`px-3 py-1 rounded-full border ${isDark ? 'border-white/20 text-white' : 'border-stone-200 text-stone-500'} text-[9px] font-black uppercase tracking-widest`}>
            This Month
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-12 relative z-10">
        {/* Score Circle & Redemption Status */}
        <div className="flex flex-col items-center gap-6 shrink-0">
          <div className="relative w-56 h-56 group cursor-default">
             <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
               {/* Background tracks */}
               <circle cx="50%" cy="50%" r={rPlan} stroke={isDark ? '#3b82f620' : '#3b82f620'} strokeWidth="10" fill="transparent" />
               <circle cx="50%" cy="50%" r={rSocial} stroke={isDark ? '#a855f720' : '#a855f720'} strokeWidth="10" fill="transparent" />
               <circle cx="50%" cy="50%" r={rWarmup} stroke={isDark ? '#f9731620' : '#f9731620'} strokeWidth="10" fill="transparent" />
               <circle cx="50%" cy="50%" r={rGrowth} stroke={isDark ? '#10b98120' : '#10b98120'} strokeWidth="10" fill="transparent" />
               
               {/* Animated rings */}
               <circle cx="50%" cy="50%" r={rPlan} stroke="#3b82f6" strokeWidth="10" fill="transparent" strokeDasharray={`${cPlan} ${cPlan}`} strokeDashoffset={planOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
               <circle cx="50%" cy="50%" r={rSocial} stroke="#a855f7" strokeWidth="10" fill="transparent" strokeDasharray={`${cSocial} ${cSocial}`} strokeDashoffset={socialOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
               <circle cx="50%" cy="50%" r={rWarmup} stroke="#f97316" strokeWidth="10" fill="transparent" strokeDasharray={`${cWarmup} ${cWarmup}`} strokeDashoffset={warmupOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
               <circle cx="50%" cy="50%" r={rGrowth} stroke="#10b981" strokeWidth="10" fill="transparent" strokeDasharray={`${cGrowth} ${cGrowth}`} strokeDashoffset={growthOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <div className="relative flex flex-col items-center">
                 <span className={`text-5xl font-black tracking-tighter ${textClass}`}>{totalScore}</span>
                 <div className={`w-8 h-1 my-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-stone-200'}`}></div>
                 <span className={`text-xl font-black text-stone-400`}>100</span>
               </div>
             </div>
          </div>

          {/* Redemption Widget */}
          <div className={`w-full p-4 rounded-3xl border flex flex-col gap-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-yellow-50 border-yellow-100'}`}>
             <div className="flex justify-between items-center">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-yellow-800'}`}>Reward Progress</span>
                <span className={`text-[9px] font-bold ${isDark ? 'text-white/50' : 'text-yellow-600'}`}>{qualifyingMonths}/3 Months &gt; 85</span>
             </div>
             <div className="flex gap-2 justify-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i < qualifyingMonths ? 'bg-yellow-400 shadow-sm' : isDark ? 'bg-white/10' : 'bg-stone-200'}`}></div>
                ))}
             </div>
             <button 
               onClick={handleRedemptionRequest}
               disabled={!isEligibleForRedemption}
               className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 
                 ${isEligibleForRedemption 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:scale-105 shadow-yellow-200' 
                        : isDark ? 'bg-white/5 text-white/30 border border-white/10' : 'bg-white text-stone-300 border border-stone-100'
                 }`}
             >
               {isEligibleForRedemption ? <><i className="fas fa-gift"></i> Redeem Month</> : "Keep Going"}
             </button>
          </div>
        </div>

        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
           {/* Widgets */}
           <div className={`col-span-1 sm:col-span-2 p-4 rounded-3xl border border-l-4 ${isDark ? 'bg-white/5 border-white/5 border-l-blue-500' : 'bg-white border-stone-100 border-l-blue-500'} relative group hover:scale-[1.02] transition-transform z-10 hover:z-50`}>
             <div className="flex justify-between items-start relative z-10">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-500 flex items-center justify-center shadow-sm"><i className="fas fa-calendar-check text-sm"></i></div>
                 <div>
                   <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass} flex items-center`}>
                     Plan Adherence 
                     <Tooltip text={stats.activeImprovementPlan ? "Measuring matches played against frequency recommended in your AI Improvement Plan." : "Measures actual plays vs. scheduled matches."} />
                   </h4>
                   <p className={`text-[9px] font-bold ${subTextClass}`}>{weeksMet} Weeks Met / 4 Target</p>
                   {stats.activeImprovementPlan && (
                      <div className="mt-2 text-[9px] bg-blue-50 text-blue-800 p-2 rounded-lg font-medium border border-blue-100">
                        <span className="font-black uppercase text-[8px] text-blue-400 block mb-0.5">Active Plan:</span>
                        "{stats.activeImprovementPlan}"
                      </div>
                   )}
                 </div>
               </div>
               <span className="text-xl font-black text-blue-500">+{planScore}</span>
             </div>
           </div>
           
           <div className={`p-4 rounded-3xl border border-l-4 ${isDark ? 'bg-white/5 border-white/5 border-l-purple-500' : 'bg-white border-stone-100 border-l-purple-500'} relative group hover:scale-[1.02] transition-transform z-10 hover:z-50`}>
             <div className="flex justify-between items-center relative z-10">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center shadow-sm"><i className="fas fa-user-friends text-sm"></i></div>
                 <div>
                   <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass} flex items-center`}>Invites <Tooltip text="Invite 20 friends in a month to gain 20 points!" /></h4>
                   <p className={`text-[9px] font-bold ${subTextClass}`}>{stats.invitesSent} / 20 Friends Invited</p>
                 </div>
               </div>
               <span className="text-xl font-black text-purple-500">+{socialScore}</span>
             </div>
           </div>

           <div className={`p-4 rounded-3xl border border-l-4 ${isDark ? 'bg-white/5 border-white/5 border-l-orange-500' : 'bg-white border-stone-100 border-l-orange-500'} relative group hover:scale-[1.02] transition-transform z-10 hover:z-50`}>
             <div className="flex justify-between items-center relative z-10">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center shadow-sm"><i className="fas fa-running text-sm"></i></div>
                 <div>
                   <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass} flex items-center`}>Warm-Ups <Tooltip text="Record warm-ups. 4 warm-ups per month for max points." /></h4>
                   <p className={`text-[9px] font-bold ${subTextClass}`}>{stats.warmupsCount} / 4 Sessions</p>
                 </div>
               </div>
               <span className="text-xl font-black text-orange-500">+{warmupScore}</span>
             </div>
           </div>

           <div className={`p-4 rounded-3xl border border-l-4 ${isDark ? 'bg-white/5 border-white/5 border-l-emerald-500' : 'bg-white border-stone-100 border-l-emerald-500'} relative group hover:scale-[1.02] transition-transform z-10 hover:z-50`}>
             <div className="flex justify-between items-center relative z-10">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-500 flex items-center justify-center shadow-sm"><i className="fas fa-chart-line text-sm"></i></div>
                 <div>
                   <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass} flex items-center`}>Performance Growth <Tooltip text="Uses your recorded performance history to see if your match stats have improved." /></h4>
                   <p className={`text-[9px] font-bold ${subTextClass}`}>{performanceImproved ? 'Improvement Verified' : 'No Data'}</p>
                 </div>
               </div>
               <span className="text-xl font-black text-emerald-500">+{growthScore}</span>
             </div>
           </div>

           <div className={`col-span-1 sm:col-span-2 p-3 rounded-2xl border border-dashed flex items-center justify-between ${punctualityPenalty > 0 ? 'bg-rose-50 border-rose-200' : 'bg-transparent border-stone-200 opacity-50'}`}>
              <div className="flex items-center gap-3">
                 <i className={`fas fa-clock text-xs ${punctualityPenalty > 0 ? 'text-rose-500' : 'text-stone-300'}`}></i>
                 <span className={`text-[9px] font-black uppercase tracking-widest flex items-center ${punctualityPenalty > 0 ? 'text-rose-500' : 'text-stone-300'}`}>
                   {punctualityPenalty > 0 ? `Lateness Penalty Detected` : 'Perfect Punctuality'}
                 </span>
              </div>
              <span className={`text-sm font-black ${punctualityPenalty > 0 ? 'text-rose-500' : 'text-stone-300'}`}>
                {punctualityPenalty > 0 ? `-${punctualityPenalty}` : '0'}
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};

const PerformanceReport: React.FC<Props> = ({ 
  userProfile, 
  onLogMatch, 
  onUpdateProfile, 
  onRevertMatchToHotSession, 
  theme = 'sunny', 
  onRequireAuth, 
  isAdmin, 
  allPlayers 
}) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [newMatchData, setNewMatchData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: userProfile.location || '',
    partnerName: '',
    partnerLevel: '',
    opp1Name: '',
    opp1Level: '',
    opp2Name: '',
    opp2Level: '',
    games: [] as GameResult[], 
    currentScore: '',
    currentResult: 'Win' as 'Win' | 'Loss',
    coachNotes: '',
    didWarmup: false,
    invitedFriends: [] as string[],
    friendNameInput: ''
  });

  const matches = useMemo(() => userProfile.loggedMatches || [], [userProfile.loggedMatches]);
  
  const accentColor = theme === 'sunny' ? '#D98B79' : theme === 'classic' ? '#3b82f6' : '#33FFFC';
  const isDark = theme === 'dark';

  const analyticsData = useMemo(() => {
    if (matches.length === 0) return null;
    let wins = 0;
    let losses = 0;
    matches.forEach(m => {
        if (m.games && m.games.length > 0) {
            m.games.forEach(g => {
                if (g.result === 'Win') wins++; else losses++;
            });
        } else {
             // Fallback for flat structure if any
             const res = (m as any).result; 
             if (res === 'Win') wins++;
             else if (res === 'Loss') losses++;
        }
    });
    const total = wins + losses;
    const winRate = total === 0 ? 0 : Math.round((wins/total)*100);
    
    // Momentum
    const points: number[] = [50];
    let current = 50;
    // Iterate chronological
    const allResults: string[] = [];
    [...matches].reverse().forEach(m => {
        if (m.games && m.games.length > 0) {
            m.games.forEach(g => allResults.push(g.result));
        } else {
             const res = (m as any).result; 
             if(res) allResults.push(res);
        }
    });
    // Take last 20 games max for momentum
    allResults.slice(-20).forEach(r => {
        if(r === 'Win') current = Math.min(100, current + 10);
        else current = Math.max(0, current - 10);
        points.push(current);
    });
    
    return { wins, losses, winRate, points };
  }, [matches]);

  const addGame = () => {
      if(!newMatchData.currentScore) return;
      setNewMatchData(prev => ({
          ...prev,
          games: [...prev.games, { score: prev.currentScore, result: prev.currentResult }],
          currentScore: ''
      }));
  };

  const removeGame = (index: number) => {
      setNewMatchData(prev => ({
          ...prev,
          games: prev.games.filter((_, i) => i !== index)
      }));
  };

  const addFriend = () => {
      if(!newMatchData.friendNameInput) return;
      setNewMatchData(prev => ({
          ...prev,
          invitedFriends: [...prev.invitedFriends, prev.friendNameInput],
          friendNameInput: ''
      }));
  };

  const removeFriend = (index: number) => {
      setNewMatchData(prev => ({
          ...prev,
          invitedFriends: prev.invitedFriends.filter((_, i) => i !== index)
      }));
  };

  const handleSaveLog = () => {
      const history: MatchHistory = {
          date: newMatchData.date,
          duration: '1h',
          location: newMatchData.location,
          coachNotes: newMatchData.coachNotes,
          partner: newMatchData.partnerName ? { name: newMatchData.partnerName, level: parseFloat(newMatchData.partnerLevel)||3.0 } : undefined,
          opponents: [],
          games: newMatchData.games,
          type: 'Match'
      };

      if(newMatchData.opp1Name) history.opponents.push({ name: newMatchData.opp1Name, level: parseFloat(newMatchData.opp1Level)||3.0 });
      if(newMatchData.opp2Name) history.opponents.push({ name: newMatchData.opp2Name, level: parseFloat(newMatchData.opp2Level)||3.0 });

      // Update Stats
      const currentStats = userProfile.weeklyStats || {
        matchesPlayed: 0, matchesTarget: 3, latenessMinutes: [], missedMatches: 0,
        invitesSent: 0, friendInvites: [], warmupsCount: 0, usedAIAnalysis: false, aiShownImprovement: false
      };
      
      const newStats: WeeklyStats = {
          ...currentStats,
          matchesPlayed: currentStats.matchesPlayed + 1,
          invitesSent: currentStats.invitesSent + newMatchData.invitedFriends.length,
          friendInvites: [...(currentStats.friendInvites || []), ...newMatchData.invitedFriends],
          warmupsCount: currentStats.warmupsCount + (newMatchData.didWarmup ? 1 : 0)
      };

      const newProfile = {
          ...userProfile,
          loggedMatches: [history, ...matches],
          weeklyStats: newStats
      };

      onUpdateProfile(newProfile);
      setShowLogModal(false);
      
      // Reset
      setNewMatchData({
        date: new Date().toISOString().split('T')[0],
        location: userProfile.location || '',
        partnerName: '',
        partnerLevel: '',
        opp1Name: '',
        opp1Level: '',
        opp2Name: '',
        opp2Level: '',
        games: [],
        currentScore: '',
        currentResult: 'Win',
        coachNotes: '',
        didWarmup: false,
        invitedFriends: [],
        friendNameInput: ''
      });
  };

  const weeklyStats = userProfile.weeklyStats || {
    matchesPlayed: 0,
    matchesTarget: 3,
    latenessMinutes: [],
    missedMatches: 0,
    invitesSent: 0,
    warmupsCount: 0,
    usedAIAnalysis: false,
    aiShownImprovement: false,
    friendInvites: []
  };

  return (
    <div>
      <CommitmentWidget 
        stats={weeklyStats} 
        history={matches} 
        schedule={userProfile.schedule} 
        theme={theme}
        userProfile={userProfile} 
        isAdmin={isAdmin}
      />

      {/* Main Performance History Card */}
      <div className={`p-8 rounded-[2.5rem] shadow-xl border ${isDark ? 'bg-[#0A292C] border-cyan-400/10' : 'bg-white border-stone-100'}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">Performance History</h2>
            {!isAdmin && (
              <button 
                onClick={() => {
                  if(onRequireAuth && onRequireAuth()) return;
                  setShowLogModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-lime-100 hover:bg-lime-200 text-green-900 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
              >
                <i className="fas fa-plus"></i> Add Match Log
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 font-black text-stone-400 uppercase tracking-widest">
                  <th className="text-left pb-4">Date</th>
                  <th className="text-left pb-4">Partner</th>
                  <th className="text-left pb-4">Opponents</th>
                  <th className="text-left pb-4">Results</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((row, i) => {
                  // Special Rendering for AI Assessment Rows
                  if (row.type === 'Assessment' && row.assessmentData) {
                     return (
                       <tr key={i} className="border-b border-lime-100 bg-lime-50/50 hover:bg-lime-50 transition-colors animate-in fade-in slide-in-from-left-2">
                          <td className="py-5 font-bold align-top text-lime-800">
                             {row.date}
                             <div className="text-[9px] text-lime-600 font-medium mt-1 uppercase"><i className="fas fa-robot mr-1"></i> AI Eval</div>
                          </td>
                          <td colSpan={3} className="py-5 align-top">
                             <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                   <span className="bg-lime-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">{row.assessmentData.groupId}</span>
                                   <span className="text-stone-600 font-bold italic text-xs">"{row.assessmentData.summary}"</span>
                                </div>
                             </div>
                          </td>
                       </tr>
                     );
                  }

                  // Standard Match Rendering
                  const hasGames = row.games && row.games.length > 0;
                  const displayGames = hasGames ? row.games : (row as any).score ? [{ score: (row as any).score, result: (row as any).result }] : [];

                  return (
                    <tr key={i} className={`border-b border-stone-50 hover:bg-stone-50/50 transition-colors animate-in fade-in slide-in-from-left-2 ${row.isExample ? 'opacity-70 grayscale-[0.3]' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                      <td className="py-5 font-bold align-top">
                        {row.date}
                        <div className="text-[9px] text-stone-400 font-medium mt-1">{row.duration} @ {row.location}</div>
                      </td>
                      <td className="py-5 align-top">
                         {row.partner ? (
                           <div>
                             <span className="font-bold">{row.partner.name}</span>
                             <span className="text-[9px] text-stone-400 ml-1">({row.partner.level.toFixed(1)})</span>
                           </div>
                         ) : <span className="text-stone-300">-</span>}
                      </td>
                      <td className="py-5 align-top">
                        <div className="flex flex-col gap-1">
                          {row.opponents && row.opponents.length > 0 ? (
                             row.opponents.map((opp, idx) => (
                               <div key={idx}>
                                 <span className="font-black uppercase text-[10px]">{opp.name}</span>
                                 <span className="text-[9px] text-stone-400 font-bold ml-1">({opp.level.toFixed(1)})</span>
                               </div>
                             ))
                          ) : (
                             // Legacy fallback
                             <div>
                               <span className="font-black uppercase text-[10px]">{(row as any).opponentName || 'Unknown'}</span>
                               <span className="text-[9px] text-stone-400 font-bold ml-1">({(row as any).opponentLevel || '?'})</span>
                             </div>
                          )}
                        </div>
                      </td>
                      <td className="py-5 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                           {displayGames.map((g: any, idx: number) => (
                             <span key={idx} className={`px-2 py-1 rounded border font-mono text-[10px] font-bold ${g.result === 'Win' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                               {g.score} <span className="opacity-50 text-[8px] uppercase ml-1">({g.result})</span>
                             </span>
                           ))}
                           {row.isExample && (
                              <Tooltip text="Example Score: These stats are placeholders to demonstrate the app. They will disappear when you log your first real match." />
                           )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {matches.length === 0 && (
                   <tr>
                     <td colSpan={5} className="py-10 text-center text-stone-300 text-[10px] font-black uppercase tracking-widest">
                        No matches logged yet.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>

          {analyticsData && (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ... (Graphs remain unchanged) ... */}
              <div className="p-6 rounded-3xl border border-dashed border-stone-200">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Game Win Rate</h4>
                  <span className="text-lg font-black text-emerald-500">{analyticsData.winRate}%</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#f3f4f6" strokeWidth="4"></circle>
                      <circle cx="18" cy="18" r="16" fill="none" stroke={accentColor} strokeWidth="4" strokeDasharray={`${analyticsData.winRate}, 100`} strokeLinecap="round"></circle>
                    </svg>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${analyticsData.winRate}%` }}></div></div>
                    <p className="text-[8px] font-black uppercase text-stone-400">{analyticsData.wins} Games Won / {analyticsData.losses} Lost</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-dashed border-stone-200">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6">Momentum (Last 10 Games)</h4>
                <div className="h-24 w-full">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d={`M 0 100 ${analyticsData.points.map((p, i) => `L ${(i / (analyticsData.points.length - 1 || 1)) * 100} ${100 - p}`).join(' ')} L 100 100 Z`} fill={accentColor} fillOpacity="0.1" />
                    <path d={analyticsData.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (analyticsData.points.length - 1 || 1)) * 100} ${100 - p}`).join(' ')} fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Manual Match Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2 -mt-2">
                <h3 className="text-2xl font-black text-green-900">Log Match</h3>
                <button onClick={() => setShowLogModal(false)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600">
                  <i className="fas fa-times"></i>
                </button>
             </div>
             
             <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                      <input 
                        type="date" 
                        value={newMatchData.date} 
                        onChange={e => setNewMatchData({...newMatchData, date: e.target.value})}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-sm font-bold"
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Location</label>
                      <input 
                        type="text" 
                        value={newMatchData.location} 
                        onChange={e => setNewMatchData({...newMatchData, location: e.target.value})}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-sm font-bold"
                      />
                   </div>
                </div>

                {/* Partner Section */}
                <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50">
                   <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 ml-1">Your Partner (Optional)</label>
                   <div className="grid grid-cols-3 gap-3">
                     <input 
                        type="text" 
                        value={newMatchData.partnerName} 
                        onChange={e => setNewMatchData({...newMatchData, partnerName: e.target.value})}
                        placeholder="Partner Name"
                        className="col-span-2 w-full p-3 bg-white rounded-2xl border border-blue-100 focus:border-blue-400 outline-none text-sm font-bold"
                     />
                     <input 
                        type="number" 
                        step="0.1"
                        value={newMatchData.partnerLevel} 
                        onChange={e => setNewMatchData({...newMatchData, partnerLevel: e.target.value})}
                        placeholder="Lvl"
                        className="w-full p-3 bg-white rounded-2xl border border-blue-100 focus:border-blue-400 outline-none text-sm font-bold"
                     />
                   </div>
                </div>

                {/* Opponents Section */}
                <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100/50">
                   <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 ml-1">Opponents</label>
                   <div className="space-y-3">
                     <div className="grid grid-cols-3 gap-3">
                       <input 
                          type="text" 
                          value={newMatchData.opp1Name} 
                          onChange={e => setNewMatchData({...newMatchData, opp1Name: e.target.value})}
                          placeholder="Opponent 1 *"
                          className="col-span-2 w-full p-3 bg-white rounded-2xl border border-rose-100 focus:border-rose-400 outline-none text-sm font-bold"
                       />
                       <input 
                          type="number" 
                          step="0.1"
                          value={newMatchData.opp1Level} 
                          onChange={e => setNewMatchData({...newMatchData, opp1Level: e.target.value})}
                          placeholder="Lvl"
                          className="w-full p-3 bg-white rounded-2xl border border-rose-100 focus:border-rose-400 outline-none text-sm font-bold"
                       />
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                       <input 
                          type="text" 
                          value={newMatchData.opp2Name} 
                          onChange={e => setNewMatchData({...newMatchData, opp2Name: e.target.value})}
                          placeholder="Opponent 2 (Optional)"
                          className="col-span-2 w-full p-3 bg-white rounded-2xl border border-rose-100 focus:border-rose-400 outline-none text-sm font-bold"
                       />
                       <input 
                          type="number" 
                          step="0.1"
                          value={newMatchData.opp2Level} 
                          onChange={e => setNewMatchData({...newMatchData, opp2Level: e.target.value})}
                          placeholder="Lvl"
                          className="w-full p-3 bg-white rounded-2xl border border-rose-100 focus:border-rose-400 outline-none text-sm font-bold"
                       />
                     </div>
                   </div>
                </div>

                {/* Scores Section */}
                <div>
                   <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Game Results</label>
                   
                   {/* Game List */}
                   {newMatchData.games.length > 0 && (
                     <div className="flex flex-wrap gap-2 mb-3">
                       {newMatchData.games.map((g, idx) => (
                         <div key={idx} className={`pl-3 pr-2 py-1.5 rounded-xl border flex items-center gap-2 ${g.result === 'Win' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                           <span className="text-xs font-black">{g.score} ({g.result === 'Win' ? 'W' : 'L'})</span>
                           <button onClick={() => removeGame(idx)} className="w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center">
                             <i className="fas fa-times text-[10px]"></i>
                           </button>
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Add Game Inputs */}
                   <div className="flex gap-2 items-center">
                      <div className="flex p-1 bg-stone-50 rounded-2xl border border-stone-100 shrink-0">
                         <button 
                           onClick={() => setNewMatchData({...newMatchData, currentResult: 'Win'})}
                           className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newMatchData.currentResult === 'Win' ? 'bg-emerald-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                         >
                           Win
                         </button>
                         <button 
                           onClick={() => setNewMatchData({...newMatchData, currentResult: 'Loss'})}
                           className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newMatchData.currentResult === 'Loss' ? 'bg-rose-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                         >
                           Loss
                         </button>
                      </div>
                      <input 
                        type="text" 
                        value={newMatchData.currentScore} 
                        onChange={e => setNewMatchData({...newMatchData, currentScore: e.target.value})}
                        placeholder="Score (11-9)"
                        className="flex-1 w-full p-3 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-sm font-bold"
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            e.preventDefault();
                            addGame();
                          }
                        }}
                      />
                      <button onClick={addGame} className="w-12 h-12 rounded-2xl bg-stone-800 text-white hover:bg-black flex items-center justify-center shadow-lg transition-all" title="Add Game">
                        <i className="fas fa-plus"></i>
                      </button>
                   </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Integrity Actions</h4>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${newMatchData.didWarmup ? 'bg-lime-500 border-lime-500' : 'bg-white border-stone-300'}`}>
                                {newMatchData.didWarmup && <i className="fas fa-check text-white text-xs"></i>}
                             </div>
                             <input 
                                type="checkbox" 
                                className="hidden"
                                checked={newMatchData.didWarmup}
                                onChange={e => setNewMatchData({...newMatchData, didWarmup: e.target.checked})}
                             />
                             <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider group-hover:text-lime-600 transition-colors">Log Warm-up</span>
                        </label>

                        <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                             <div className="flex items-center gap-2 mb-2">
                               <i className="fas fa-user-plus text-purple-500 text-xs"></i>
                               <span className="text-[9px] font-black text-purple-700 uppercase tracking-widest">Invited Friends (registered name)</span>
                             </div>
                             
                             <div className="flex gap-2 mb-2">
                               <input 
                                  type="text" 
                                  placeholder="Enter friend's name..."
                                  value={newMatchData.friendNameInput}
                                  onChange={e => setNewMatchData({...newMatchData, friendNameInput: e.target.value})}
                                  onKeyDown={e => e.key === 'Enter' && addFriend()}
                                  className="flex-1 p-2 rounded-xl border border-purple-200 text-xs font-bold focus:border-purple-400 outline-none"
                               />
                               <button onClick={addFriend} className="px-3 rounded-xl bg-purple-500 text-white text-[10px] font-black uppercase">Add</button>
                             </div>

                             {newMatchData.invitedFriends.length > 0 && (
                               <div className="flex flex-wrap gap-1.5">
                                 {newMatchData.invitedFriends.map((friend, idx) => (
                                   <div key={idx} className="bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-sm">
                                     {friend}
                                     <button onClick={() => removeFriend(idx)} className="hover:text-purple-900"><i className="fas fa-times"></i></button>
                                   </div>
                                 ))}
                               </div>
                             )}
                        </div>
                    </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Notes / Key Moment</label>
                   <textarea 
                      value={newMatchData.coachNotes} 
                      onChange={e => setNewMatchData({...newMatchData, coachNotes: e.target.value})}
                      placeholder="What went well? What didn't?"
                      className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-sm font-medium h-20 resize-none"
                   />
                </div>
             </div>

             <div className="mt-8 flex gap-3">
                <button onClick={() => setShowLogModal(false)} className="flex-1 py-4 rounded-2xl bg-stone-100 text-stone-500 font-black uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors">Cancel</button>
                <button onClick={handleSaveLog} className="flex-[2] py-4 rounded-2xl bg-green-900 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-green-800 transition-colors">Save Match</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceReport;
