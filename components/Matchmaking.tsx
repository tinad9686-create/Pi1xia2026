
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_PLAYERS, AGE_OPTIONS } from '../constants';
import { PlayerProfile, SkillGroup, HotSession, AgeGroup } from '../types';
import WeatherWidget from './WeatherWidget';

interface Props {
  currentUser: PlayerProfile;
  onUpdate: (profile: PlayerProfile) => void;
  onAddPartner: (partnerId: string) => void;
  onCreateHotSession: (session: HotSession) => void;
  onConfirmMatch: (params: { location: string, day: number, time: string, duration: number }) => void;
  onEditProfile?: () => void;
  greetingContext?: string;
  onRequireAuth?: () => boolean;
  isAdmin?: boolean;
  allPlayers?: PlayerProfile[];
  onDirectorBroadcast?: (day: number, time: string, text: string, location: string) => void;
  onDirectorConfirm?: (session: HotSession) => void;
  onDirectorDelete?: (session: HotSession) => void;
  onJoinHotSession?: (session: HotSession) => void;
  hotSessions?: HotSession[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMES = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

const ComparisonTable: React.FC<{ 
  comparison: any, 
  userName: string, 
  partnerName: string, 
  onPostHot: () => void 
}> = ({ comparison, userName, partnerName, onPostHot }) => {
  const rows = [
    { label: 'Skill Group', data: comparison.skill },
    { label: 'Location', data: comparison.location, type: 'location' },
    { label: 'Time Match', data: comparison.time, type: 'time' },
    { label: 'Goal', data: comparison.goal },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100 shadow-sm mb-6">
      <table className="w-full text-left text-[10px]">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-100 font-black text-stone-400 uppercase tracking-widest">
            <th className="px-4 py-3">Factor</th>
            <th className="px-4 py-3">{userName}</th>
            <th className="px-4 py-3">{partnerName}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {rows.map((row, i) => (
            <tr key={i} className="group hover:bg-stone-50/50 transition-colors">
              <td className="px-4 py-3 font-black text-stone-400 uppercase tracking-tight">{row.label}</td>
              <td className={`px-4 py-3 font-bold ${row.data.isMatch ? 'text-[#D98B79]' : 'text-[#4A4238]'}`}>
                {row.data.user}
              </td>
              <td className={`px-4 py-3 font-bold ${row.data.isMatch ? 'text-[#D98B79]' : 'text-[#94A684]'}`}>
                {row.data.partner}
              </td>
              {row.type === 'time' && row.data.isMatch && (
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={onPostHot}
                    className="bg-[#D98B79] hover:bg-[#c47a69] text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-1 ml-auto"
                  >
                    <i className="fas fa-bullhorn"></i>
                    Post Hot
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Matchmaking: React.FC<Props> = ({ 
  currentUser, onUpdate, onAddPartner, onCreateHotSession, 
  onConfirmMatch, onEditProfile, greetingContext = "", onRequireAuth, 
  isAdmin, allPlayers = [], onDirectorBroadcast, onDirectorConfirm, onDirectorDelete, onJoinHotSession, hotSessions = [] 
}) => {
  const availableCourts = useMemo(() => {
     const locationsMap = new Map<string, string>();
     const addLoc = (l: string) => {
         if (!l) return;
         const key = l.trim().toLowerCase();
         if (!locationsMap.has(key)) locationsMap.set(key, l.trim());
     };
     addLoc("Bonsor Pickle Court");
     addLoc("Jack Crosby Sports Box");
     MOCK_PLAYERS.forEach(p => p.locations.forEach(addLoc));
     if (currentUser.locations) currentUser.locations.forEach(addLoc);
     hotSessions.forEach(hs => addLoc(hs.location));
     return Array.from(locationsMap.values());
  }, [currentUser, allPlayers, hotSessions]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [customMatch, setCustomMatch] = useState({ day: 0, time: '18:00', location: '' });
  const [directorTargetCourt, setDirectorTargetCourt] = useState(availableCourts[0]);
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    value: string;
    onSubmit: (val: string) => void;
  }>({ isOpen: false, title: '', value: '', onSubmit: () => {} });

  const isPaidTier = currentUser.membershipTier === 'Pro' || currentUser.membershipTier === 'Elite' || isAdmin;

  // Calculate Member Counts per Court Location
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const playersToCount = allPlayers && allPlayers.length > 0 
        ? allPlayers 
        : [currentUser, ...MOCK_PLAYERS.filter(p => p.id !== currentUser.id)];
    
    playersToCount.forEach(p => {
      if (p.locations) {
        p.locations.forEach(loc => {
          if (loc) counts[loc] = (counts[loc] || 0) + 1;
        });
      }
    });
    return counts;
  }, [allPlayers, currentUser]);

  const handleDirectorCellClick = (day: number, time: string, session: HotSession | undefined) => {
      if (!isAdmin) return;
      if (session) {
          if (!session.isManuallyConfirmed && onDirectorConfirm) {
              onDirectorConfirm(session);
          } else {
              alert("This session is already confirmed.");
          }
      } else {
          setPromptModal({
            isOpen: true,
            title: `Enter broadcast message for ${directorTargetCourt} at ${DAYS[day]} ${time}:`,
            value: '',
            onSubmit: (text) => {
              if (text && text.trim() && onDirectorBroadcast) onDirectorBroadcast(day, time, text.trim(), directorTargetCourt);
            }
          });
      }
  };

  const toggleSchedule = (day: number, time: string, session?: HotSession) => {
    if (isAdmin) { handleDirectorCellClick(day, time, session); return; }
    if (onRequireAuth && onRequireAuth()) return;

    // If there's a broadcast session, prioritize joining it
    if (session) {
      if (onJoinHotSession) {
        onJoinHotSession(session);
      }
      return;
    }

    const existingIndex = currentUser.schedule.findIndex(s => s.day === day && s.time === time);
    let newSchedule = [...currentUser.schedule];
    if (existingIndex !== -1) {
      const match = newSchedule[existingIndex];
      if (!match.status || match.status === 'preferred') {
         newSchedule[existingIndex] = { ...match, status: 'pending' as const, isConfirmedMatch: false };
      } else if (match.status === 'pending') {
         newSchedule[existingIndex] = { ...match, status: 'confirmed' as const, isConfirmedMatch: true };
      } else {
         newSchedule.splice(existingIndex, 1);
      }
    } else {
      newSchedule.push({ 
        id: Math.random().toString(36).substring(7), day, time, location: currentUser.location, 
        isConfirmedMatch: false, status: 'preferred' as const, duration: 2 
      });
    }
    onUpdate({ ...currentUser, schedule: newSchedule });
  };

  const handleAddCustomMatch = () => {
    if (isAdmin) {
        if (!customMatch.location.trim()) { alert("Please enter the event text"); return; }
        if (onDirectorBroadcast) {
            onDirectorBroadcast(customMatch.day, customMatch.time, customMatch.location, directorTargetCourt);
            setCustomMatch({ ...customMatch, location: '' });
            alert("Master Entry Broadcasted!");
        }
        return;
    }
    if (onRequireAuth && onRequireAuth()) return;
    if (!customMatch.location.trim()) { alert("Please enter a location."); return; }
    const newSchedule = [...currentUser.schedule, {
      id: Math.random().toString(36).substring(7), day: customMatch.day, time: customMatch.time,
      location: customMatch.location, isConfirmedMatch: false, status: 'preferred' as const, duration: 2
    }];
    onUpdate({ ...currentUser, schedule: newSchedule });
    setCustomMatch({ ...customMatch, location: '' });
    alert("Custom Match Added!");
  };

  const handleMatch = async () => {
    if (onRequireAuth && onRequireAuth()) return;
    setLoading(true);
    setResults([]);
    setTimeout(() => {
        const strictMatches = MOCK_PLAYERS.map(p => {
            if (p.id === currentUser.id) return null;
            let isSkillMatch = false;
            const prefLevel = currentUser.preferredSkillLevel;
            if (prefLevel === 'All' || !prefLevel) isSkillMatch = true;
            else {
                 const levelNum = typeof prefLevel === 'string' ? parseFloat(prefLevel) : prefLevel;
                 if (currentUser.skillMatchMode === 'Strict') isSkillMatch = Math.abs(p.duprRank - levelNum) <= 0.25; 
                 else isSkillMatch = p.duprRank >= levelNum;
            }
            if (!isSkillMatch) return null;
            if (currentUser.agePreference && currentUser.agePreference !== 'All' && p.ageGroup !== currentUser.agePreference) return null;
            if (currentUser.durationPreference && currentUser.durationPreference !== 'All' && p.duration < (currentUser.durationPreference as number)) return null;

            const commonLocations = p.locations.filter(loc => currentUser.locations.includes(loc));
            if (commonLocations.length === 0) return null;

            let commonTime: { day: number, time: string, duration: number } | null = null;
            for (const uSlot of currentUser.schedule) {
                const pSlot = p.schedule.find(ps => ps.day === uSlot.day && Math.abs(parseInt(ps.time) - parseInt(uSlot.time)) <= 1);
                if (pSlot) {
                    const uTime = parseInt(uSlot.time);
                    const pTime = parseInt(pSlot.time);
                    const startH = Math.max(uTime, pTime);
                    const endH = Math.min(uTime + (uSlot.duration || 2), pTime + (pSlot.duration || 2));
                    if (endH > startH) {
                         commonTime = { day: uSlot.day, time: `${startH.toString().padStart(2, '0')}:00`, duration: endH - startH };
                         break;
                    }
                }
            }
            if (!commonTime) return null;
            const startH = parseInt(commonTime.time);
            const endH = startH + commonTime.duration;
            const formattedTimeRange = `${DAYS[commonTime.day]} ${startH}:00-${endH}:00`;

            return {
                partnerId: p.id, matchScore: 98, player: p,
                overlapDetails: { location: commonLocations[0], day: commonTime.day, time: commonTime.time, duration: commonTime.duration },
                comparison: {
                    skill: { user: currentUser.skillGroup, partner: p.skillGroup, isMatch: true },
                    location: { user: currentUser.locations[0], partner: p.locations[0], isMatch: true, overlap: commonLocations[0] },
                    time: { user: formattedTimeRange, partner: formattedTimeRange, isMatch: true, overlap: formattedTimeRange },
                    goal: { user: currentUser.goal, partner: p.goal, isMatch: currentUser.goal === p.goal }
                }
            };
        }).filter(Boolean); 
        setResults(strictMatches);
        setLoading(false);
    }, 1500);
  };

  const handlePostHotOverlap = (match: any) => {
    const details = match.overlapDetails;
    const hot: HotSession = {
      id: Math.random().toString(), city: details.location.split(' ')[0], location: details.location,
      shortLocation: details.location.substring(0, 10), level: currentUser.skillGroup,
      skillGroup: currentUser.skillGroup, sessionType: 'Mix', day: DAYS[details.day], time: details.time,
      needed: 2, duration: details.duration, createdBy: currentUser.id, participants: [currentUser.id, match.player.id],
      description: `Matched Session: ${currentUser.name} & ${match.player.name} Need 2.`,
      isFlexible: currentUser.preferredSkillLevel === 'All'
    };
    onCreateHotSession(hot);
    alert(`Hot Message Posted!`);
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100 min-h-[600px]">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-4">
             <h2 className="text-3xl font-black text-green-900 flex items-center gap-3">
                 <i className="fas fa-radar text-lime-500"></i> Discovery Radar
             </h2>
             {isAdmin && <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-md">Director Mode</div>}
         </div>
      </div>

      <div className="bg-stone-50 rounded-[2.5rem] p-6 mb-8 border border-stone-100">
            <div className="flex items-center justify-between mb-4 px-2">
               <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{isAdmin ? 'Managing Schedule For:' : 'Your Weekly Planner'}</h4>
               {isAdmin ? (
                  <select 
                    value={directorTargetCourt} 
                    onChange={e => {
                      if (e.target.value === '__add_new__') {
                        setPromptModal({
                          isOpen: true,
                          title: "Enter new court name:",
                          value: '',
                          onSubmit: (newCourt) => {
                            if (newCourt && newCourt.trim()) {
                              setDirectorTargetCourt(newCourt.trim());
                            }
                          }
                        });
                      } else {
                        setDirectorTargetCourt(e.target.value);
                      }
                    }} 
                    className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black uppercase rounded-lg px-2 py-1 outline-none"
                  >
                    {availableCourts.map(c => <option key={c} value={c}>{c}</option>)}
                    {directorTargetCourt && !availableCourts.some(c => c.toLowerCase() === directorTargetCourt.toLowerCase()) && (
                      <option value={directorTargetCourt}>{directorTargetCourt}</option>
                    )}
                    <option value="__add_new__">+ ADD NEW COURT...</option>
                  </select>
               ) : (
                 <div className="flex flex-wrap items-center gap-2">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-lime-400"></div><span className="text-[8px] font-bold text-stone-400 uppercase">Available</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-[8px] font-bold text-stone-400 uppercase">Pending</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-bold text-stone-400 uppercase">Confirmed</span></div>
                 </div>
               )}
            </div>
            <WeatherWidget location={currentUser.locations[0] || "Your Home Court"} />
            <div className="overflow-x-auto mt-6 pb-2">
               <div className="grid grid-cols-8 gap-1.5 min-w-[500px]">
                 <div className="col-span-1 sticky left-0 bg-stone-50 z-20"></div>
                 {DAYS.map(d => <div key={d} className="text-[9px] font-black text-center text-stone-300 uppercase">{d}</div>)}
                 {TIMES.map(time => (
                   <React.Fragment key={time}>
                     <div className="text-[8px] font-black text-right pr-2 text-stone-400 flex flex-col justify-center sticky left-0 bg-stone-50 z-20">{time}</div>
                     {DAYS.map((_, dayIdx) => {
                       const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
                       const broadcastSession = hotSessions.find(hs => {
                          const hsDay = dayMap[hs.day] ?? 0;
                          if (hsDay !== dayIdx || hs.time !== time) return false;
                          if (isAdmin) return hs.location.trim().toLowerCase() === (directorTargetCourt || '').trim().toLowerCase();
                          return currentUser.locations.some(l => l.trim().toLowerCase() === hs.location.trim().toLowerCase());
                       });
                       const matches = currentUser.schedule.filter(s => s.day === dayIdx && s.time === time);
                       const match = matches.find(m => m.isConfirmedMatch) || matches[0];
                       
                       // Check if this match is linked to a HotSession that has become full
                       let status = match?.status || (match?.isConfirmedMatch ? 'confirmed' : 'preferred');
                       if (match && match.id) {
                           const linkedSession = hotSessions.find(hs => hs.id === match.id);
                           if (linkedSession && (linkedSession.needed <= 0 || linkedSession.isManuallyConfirmed)) {
                               status = 'confirmed';
                           }
                       }

                       const locToCheck = match?.location || broadcastSession?.location || '';
                       const isHomeCourt = currentUser.locations.some(l => l.trim().toLowerCase() === locToCheck.trim().toLowerCase());

                       let bgClass = 'bg-white border-stone-100 hover:border-lime-200';
                       if (match) {
                           if (status === 'confirmed') bgClass = 'bg-emerald-500 border-emerald-600 text-white';
                           else if (status === 'pending') bgClass = 'bg-orange-400 border-orange-500 text-white';
                           else bgClass = 'bg-lime-400 border-lime-500 text-green-900'; 
                       } else if (broadcastSession) {
                          if (broadcastSession.isManuallyConfirmed || broadcastSession.needed <= 0) bgClass = 'bg-emerald-500 border-emerald-600 text-white';
                          else bgClass = 'bg-orange-100 border-orange-300 text-orange-800'; 
                       }
                       return (
                         <motion.button 
                           key={dayIdx} 
                           whileHover={{ scale: 0.98 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => toggleSchedule(dayIdx, time, broadcastSession)}
                           title={match ? match.location : "Click to Add"}
                           className={`h-12 min-h-[48px] rounded-xl border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden group p-1 ${bgClass}`}
                         >
                           {isHomeCourt && (match || broadcastSession) && (
                               <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm z-10 animate-pulse"></div>
                           )}
                           {isAdmin && broadcastSession ? (
                              <div className="text-center w-full relative h-full flex flex-col items-center justify-center">
                                 <span className="text-[6px] font-black uppercase leading-tight line-clamp-2 w-full">{broadcastSession.description}</span>
                                 {broadcastSession.needed > 0 && <span className="text-[6px] font-bold block">Need {broadcastSession.needed}</span>}
                                 <div 
                                   onClick={(e) => { e.stopPropagation(); onDirectorDelete?.(broadcastSession); }}
                                   className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                   title="Cancel Session"
                                   role="button"
                                 >
                                   <i className="fas fa-trash text-[8px]"></i>
                                 </div>
                              </div>
                           ) : match ? (
                              <div className="text-center w-full">
                                 <span className="text-[7px] font-black uppercase leading-tight line-clamp-2 w-full">{match.location}</span>
                                 {match.participants && match.participants.length > 0 && status === 'pending' && (
                                   <div className="absolute top-0 right-0 bg-white text-orange-500 text-[6px] font-bold px-1 rounded-bl-lg shadow-sm">
                                     {match.participants.length}
                                   </div>
                                 )}
                              </div>
                           ) : broadcastSession && !isAdmin ? (
                              <div className="text-center w-full">
                                 <span className="text-[6px] font-black uppercase leading-tight line-clamp-2 w-full">{broadcastSession.description || "Event"}</span>
                                 <div className="flex items-center justify-center gap-1 mt-0.5">
                                   <span className="text-[5px] font-bold uppercase opacity-70">{broadcastSession.isManuallyConfirmed ? "CONFIRMED" : "JOIN"}</span>
                                   {broadcastSession.needed > 0 && (
                                     <span className="text-[5px] font-black bg-orange-500 text-white px-1 rounded-full">{broadcastSession.needed}</span>
                                   )}
                                 </div>
                              </div>
                           ) : <span className={`opacity-0 group-hover:opacity-30 text-[8px] font-bold uppercase ${isAdmin ? 'text-indigo-400' : 'text-stone-400'}`}>{isAdmin ? 'Broadcast' : 'Add'}</span>}
                         </motion.button>
                       );
                     })}
                   </React.Fragment>
                 ))}
               </div>
            </div>
            {(isPaidTier || isAdmin) && (
              <div className="mt-4 pt-4 border-t border-stone-200 animate-in slide-in-from-top-2">
                 <div className="flex flex-col sm:flex-row items-center gap-3 bg-yellow-50 p-3 rounded-2xl border border-yellow-100">
                    <div className="flex items-center gap-2 px-2 shrink-0">
                       <i className={`fas ${isAdmin ? 'fa-tower-broadcast' : 'fa-crown'} text-yellow-500 text-sm`}></i>
                       <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">{isAdmin ? 'Master Entry' : 'Custom Entry'}</span>
                    </div>
                    <div className="flex-1 flex gap-2 w-full">
                       <select value={customMatch.day} onChange={e => setCustomMatch({...customMatch, day: parseInt(e.target.value)})} className="bg-white border border-yellow-200 rounded-xl px-2 py-2 text-[10px] font-bold text-stone-700 outline-none">{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
                       <select value={customMatch.time} onChange={e => setCustomMatch({...customMatch, time: e.target.value})} className="bg-white border border-yellow-200 rounded-xl px-2 py-2 text-[10px] font-bold text-stone-700 outline-none">{TIMES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                       <input type="text" placeholder={isAdmin ? "Event Name..." : "Custom Location..."} value={customMatch.location} onChange={e => setCustomMatch({...customMatch, location: e.target.value})} className="flex-1 bg-white border border-yellow-200 rounded-xl px-3 py-2 text-[10px] font-bold text-stone-700 outline-none" />
                    </div>
                    <button onClick={handleAddCustomMatch} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">{isAdmin ? 'Broadcast' : 'Add Match'}</button>
                 </div>
              </div>
            )}
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
        <div><p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Syncing with Preferences...</p></div>
        <div className="flex gap-4 w-full xl:w-auto">
          <button onClick={handleMatch} disabled={loading} className="flex-1 xl:flex-initial bg-green-900 hover:bg-green-800 text-white text-[10px] font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-green-100 disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-3">
            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-satellite"></i>} {loading ? 'Scanning...' : 'Sync'}
          </button>
        </div>
      </div>

      {!results.length && !loading && (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-lime-50 rounded-full flex items-center justify-center mb-6 border border-lime-100 shadow-inner"><i className="fas fa-tower-broadcast text-3xl text-lime-500 animate-pulse"></i></div>
          <h3 className="text-xl font-black text-green-900 mb-2 uppercase tracking-tighter">Radar Idle</h3>
          <p className="text-stone-400 font-medium text-sm max-w-xs leading-relaxed mb-8">Press Sync to find partners.</p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Matches Found</h3>
            <button onClick={() => setResults([])} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest">Reset</button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {results.map((match, idx) => (
                <div key={idx} className={`group bg-white hover:bg-lime-50/30 p-6 rounded-3xl transition-all border shadow-lg shadow-stone-100 overflow-hidden relative border-stone-100`}>
                  <div className="flex flex-col sm:flex-row gap-8 items-start relative z-10">
                    <div className="relative shrink-0 pt-2">
                      <img src={match.player.avatar} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-xl bg-white" />
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-green-900 text-[10px] font-black w-8 h-8 flex items-center justify-center rounded-lg shadow-lg">#{idx + 1}</div>
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-black text-2xl text-green-900 tracking-tighter">{match.player.name}</h4>
                          </div>
                          <div className="text-[9px] text-stone-400 font-bold uppercase mt-1">Age Group: <span className="text-stone-600">{match.player.ageGroup}</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-lime-600 leading-none">{match.matchScore}%</div>
                          <p className="text-[9px] text-stone-400 uppercase font-black tracking-[0.2em] mt-1">Match Score</p>
                        </div>
                      </div>
                      <ComparisonTable comparison={match.comparison} userName={currentUser.name} partnerName={match.player.name} onPostHot={() => handlePostHotOverlap(match)} />
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-stone-800 mb-4">{promptModal.title}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              promptModal.onSubmit(promptModal.value);
              setPromptModal({ ...promptModal, isOpen: false });
            }}>
              <input
                type="text"
                autoFocus
                value={promptModal.value}
                onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPromptModal({ ...promptModal, isOpen: false })}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matchmaking;
