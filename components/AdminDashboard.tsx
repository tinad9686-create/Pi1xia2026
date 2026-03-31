
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { PlayerProfile } from '../types';
import { DAYS, TIMES } from '../constants';
import Logo from './Logo';

type Department = 'Director' | 'Marketing' | 'Finance' | 'Education' | 'Support' | 'System';

interface Props {
  onLogout: () => void;
  onLaunchApp: () => void;
  players: PlayerProfile[]; 
  onCreateGroupEvent?: (event: any) => void;
  onUpdatePlayer?: (player: PlayerProfile) => void;
}

// Lazy initialize Gemini
let ai: GoogleGenAI | null = null;
const getAi = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (key) {
      ai = new GoogleGenAI({ apiKey: key });
    } else {
      throw new Error("API key must be set");
    }
  }
  return ai;
};

const AdminDashboard: React.FC<Props> = ({ onLogout, onLaunchApp, players, onCreateGroupEvent, onUpdatePlayer }) => {
  const [activeRole, setActiveRole] = useState<Department>('Director'); 
  const [activeView, setActiveView] = useState<string>('overview');
  const [isSoloMode, setIsSoloMode] = useState(false); 
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [selectedPlayerForSparks, setSelectedPlayerForSparks] = useState<PlayerProfile | null>(null);
  const [sparkAmount, setSparkAmount] = useState<number>(10);
  const [gameComments, setGameComments] = useState<any[]>([]);
  const [unsubscribedUsers, setUnsubscribedUsers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'game_comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGameComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'unsubscribed_users'), orderBy('unsubscribedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnsubscribedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const surveyResults = useMemo(() => {
    const results: Record<string, { total: number, count: number }> = {
      backhand_volley: { total: 0, count: 0 },
      serve_analysis: { total: 0, count: 0 },
      spatial_analysis: { total: 0, count: 0 },
      tactic_analysis: { total: 0, count: 0 },
      drive_analysis: { total: 0, count: 0 }
    };
    
    players.forEach(p => {
      if (p.surveyResponses) {
        Object.entries(p.surveyResponses).forEach(([key, value]) => {
          if (results[key]) {
            results[key].total += value as number;
            results[key].count += 1;
          }
        });
      }
    });
    
    return results;
  }, [players]);

  const revenueData = [
    { month: 'Jan', amount: 12500 }, { month: 'Feb', amount: 15200 }, 
    { month: 'Mar', amount: 18900 }, { month: 'Apr', amount: 24500 }
  ];

  const tickets = [
    { id: 102, user: 'Smash Sarah', issue: 'Wrong skill group assigned', status: 'Pending', priority: 'Medium' },
    { id: 103, user: 'Lobber Linda', issue: 'Reset password', status: 'Closed', priority: 'Low' },
  ];

  const campaigns = [
    { name: 'Spring Open', reach: '45K', clicks: '2.1K', conversion: '4.5%' },
    { name: 'Senior League Push', reach: '12K', clicks: '800', conversion: '6.2%' },
  ];

  const canAccess = (dept: Department) => {
    if (isSoloMode) return true; 
    if (activeRole === 'Director') return true;
    return activeRole === dept;
  };

  const generateInsight = async () => {
    setLoadingInsight(true);
    setAiInsight(null);
    let promptContext = "";
    let systemRole = "";

    if (isSoloMode) {
      systemRole = "Act as a Chief of Staff for a busy Solo Founder running a Pickleball Tech Startup.";
      promptContext = `Daily Briefing Data: Cash: $24,500/mo. Urgent: ${tickets.length} Tickets. Growth: ${players.length} Users.`;
    } else {
      systemRole = `Act as the Chief ${activeRole === 'Director' ? 'Strategy' : activeRole} Officer.`;
      if (activeView === 'overview') promptContext = `Analyze status: Revenue $24,500/mo, ${players.length} Users.`;
      else if (activeView === 'finance') promptContext = `Analyze Financials: Trend: Jan($12.5k) -> Apr($24.5k).`;
      else if (activeView === 'marketing') promptContext = `Analyze Marketing: 'Spring Open' (45k reach), 'Senior Push' (12k reach).`;
      else if (activeView === 'clients') promptContext = `Analyze Client Base: ${players.length} players.`;
    }

    try {
      const aiClient = getAi();
      if (!aiClient) {
        setAiInsight("AI Advisor is currently unavailable.");
        setLoadingInsight(false);
        return;
      }
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Role: ${systemRole}. Context: ${promptContext}. Task: 1-sentence insight + 1 action.`
      });
      setAiInsight(response.text || "Analysis complete.");
    } catch (e) {
      setAiInsight("Unable to connect to AI Board Advisor.");
    } finally {
      setLoadingInsight(false);
    }
  };

  const exportClientsToCSV = () => {
    if (!players || !players.length) return;
    const headers = ["Name", "Contact", "Age Group", "Skill Group", "Plan Tier", "Home Court"];
    const rows = players.map(p => [
      p.name, p.contactInfo || "N/A", p.ageGroup, p.skillGroup, p.membershipTier || "Free", `"${p.location || "N/A"}"`
    ].join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pi1Xia_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Report generated!`);
  };

  const handleAddSparks = () => {
    if (selectedPlayerForSparks && onUpdatePlayer) {
      const currentSparks = selectedPlayerForSparks.sparksBalance || 0;
      onUpdatePlayer({
        ...selectedPlayerForSparks,
        sparksBalance: currentSparks + sparkAmount
      });
      setSelectedPlayerForSparks(null);
    }
  };

  const renderSidebarItem = (dept: Department, icon: string, label: string) => {
    if (!canAccess(dept)) return null;
    return (
      <button 
        onClick={() => { setActiveView(dept.toLowerCase()); setAiInsight(null); }}
        className={`w-full text-left p-4 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all ${activeView === dept.toLowerCase() ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <i className={`fas ${icon} w-5`}></i> {label}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center"><i className="fas fa-building text-white text-sm"></i></div>
            <span className="font-black text-lg tracking-tight">ASCEP Design</span>
          </div>
          <div className="mb-6 p-4 bg-slate-800 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operation Mode</span>
               <div onClick={() => { setIsSoloMode(!isSoloMode); setActiveView('overview'); setAiInsight(null); }} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${isSoloMode ? 'bg-lime-500' : 'bg-slate-600'}`}>
                 <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isSoloMode ? 'translate-x-5' : ''}`}></div>
               </div>
            </div>
            <p className="text-[9px] text-slate-300 font-medium leading-tight">{isSoloMode ? "Solo Operator" : "Corporate"}</p>
          </div>
          {!isSoloMode && (
            <div className="mb-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Impersonate Role</label>
              <select value={activeRole} onChange={(e) => { setActiveRole(e.target.value as Department); setActiveView('overview'); setAiInsight(null); }} className="w-full bg-slate-800 text-white text-xs font-bold p-3 rounded-xl border border-slate-700 outline-none focus:border-indigo-500">
                <option value="Director">Director</option><option value="Finance">Finance Dept</option><option value="Marketing">Marketing Dept</option><option value="Education">Education Dept</option><option value="Support">Tech Support</option><option value="System">System Admin</option>
              </select>
            </div>
          )}
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveView('overview'); setAiInsight(null); }} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all ${activeView === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <i className={`fas ${isSoloMode ? 'fa-clipboard-list' : 'fa-home'} w-5`}></i> {isSoloMode ? 'Morning Briefing' : 'Dashboard'}
          </button>
          {!isSoloMode && (
            <>
              <div className="my-4 border-t border-slate-800"></div>
              <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Departments</p>
              {renderSidebarItem('Finance', 'fa-chart-line', 'Financials')}
              {renderSidebarItem('Marketing', 'fa-bullhorn', 'Marketing')}
              {renderSidebarItem('Education', 'fa-graduation-cap', 'Education')}
              {renderSidebarItem('Support', 'fa-headset', 'Support')}
              {renderSidebarItem('System', 'fa-server', 'System & Hosting')}
              {activeRole === 'Director' && (
                <>
                  <button onClick={() => { setActiveView('clients'); setAiInsight(null); }} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all ${activeView === 'clients' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-users w-5"></i> Client List
                  </button>
                  <button onClick={() => { setActiveView('game_feedback'); setAiInsight(null); }} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all ${activeView === 'game_feedback' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-gamepad w-5"></i> Game Feedback
                  </button>
                  <button onClick={() => { setActiveView('cancelled_members'); setAiInsight(null); }} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all ${activeView === 'cancelled_members' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-user-slash w-5"></i> Cancelled Members
                  </button>
                </>
              )}
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
          {(isSoloMode || activeRole === 'Director') && <button onClick={onLaunchApp} className="w-full py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors"><i className="fas fa-play"></i> Enter Live App</button>}
          <button onClick={onLogout} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"><i className="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
        <header className="flex justify-between items-center mb-12">
          <div><h1 className="text-3xl font-black text-slate-800 mb-1">{isSoloMode ? 'Good Morning, Founder' : (activeView === 'overview' ? `Welcome back, ${activeRole}` : activeView.charAt(0).toUpperCase() + activeView.slice(1))}</h1><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toDateString()} • System Status: <span className="text-emerald-500">Online</span></p></div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block"><div className="text-sm font-black text-slate-800">{isSoloMode ? 'One-Man Army' : 'Administrator'}</div><div className="text-[10px] font-bold text-slate-400 uppercase">{isSoloMode ? 'Full Access' : `${activeRole} Permissions`}</div></div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white border-2 border-white/50 shadow-lg ${isSoloMode ? 'bg-lime-500' : 'bg-indigo-600'}`}><i className={`fas ${isSoloMode ? 'fa-rocket' : 'fa-user-tie'}`}></i></div>
          </div>
        </header>

        <div className="mb-8 relative">
           {!aiInsight ? (
             <button onClick={generateInsight} disabled={loadingInsight} className={`group w-full p-6 rounded-[2rem] bg-gradient-to-r text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-between ${isSoloMode ? 'from-lime-600 to-emerald-600' : 'from-indigo-600 to-purple-600'}`}>
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">{loadingInsight ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sparkles"></i>}</div><div className="text-left"><h3 className="font-black text-lg">{isSoloMode ? "Get Daily Priorities" : "Generate Strategic Insight"}</h3><p className={`text-xs font-medium ${isSoloMode ? 'text-lime-100' : 'text-indigo-100'}`}>{isSoloMode ? "Ask Gemini to organize your tasks." : `Ask Gemini AI to analyze the current ${activeView} data.`}</p></div></div><i className="fas fa-arrow-right text-xl opacity-60"></i>
             </button>
           ) : (
             <div className={`w-full p-8 rounded-[2rem] border relative animate-in fade-in slide-in-from-top-2 ${isSoloMode ? 'bg-lime-50 border-lime-200' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex items-start gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${isSoloMode ? 'bg-lime-600' : 'bg-indigo-600'}`}><i className="fas fa-brain"></i></div><div className="flex-1"><h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isSoloMode ? 'text-lime-600' : 'text-indigo-400'}`}>{isSoloMode ? "Chief of Staff Advice" : "AI Board Advisor"}</h4><p className="text-slate-800 font-medium leading-relaxed text-sm md:text-base">{aiInsight}</p></div><button onClick={() => setAiInsight(null)} className="text-slate-300 hover:text-slate-500"><i className="fas fa-times"></i></button></div>
             </div>
           )}
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* CLIENTS VIEW - MAP REMOVED */}
          {activeView === 'clients' && activeRole === 'Director' && !isSoloMode && (
            <div className="space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Database</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CONFIDENTIAL</p></div>
                    <button onClick={exportClientsToCSV} className="bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-indigo-500 transition-colors flex items-center gap-2"><i className="fas fa-file-csv"></i> Export</button>
                  </div>
                  <div className="overflow-x-auto admin-scroll pb-2">
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><th className="pb-3 pl-2">Client</th><th className="pb-3">Contact</th><th className="pb-3">Location & Tier</th><th className="pb-3 text-center">Stats</th><th className="pb-3 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {players.map(p => (
                          <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pl-2"><div className="flex items-center gap-3"><img src={p.avatar} className="w-10 h-10 rounded-full bg-slate-100 object-cover" /><div><div className="font-bold text-xs text-slate-800">{p.name}</div><div className="text-[9px] text-slate-400 font-bold">{p.ageGroup} • {p.skillGroup}</div></div></div></td>
                            <td className="py-4"><div className="text-xs font-bold text-slate-700">{p.email || 'No email'}</div><div className="text-[9px] text-slate-400 font-bold mt-0.5">{p.phone || 'No phone'}</div></td>
                            <td className="py-4"><div className="text-xs font-bold text-slate-700">{p.location || 'Unknown'}</div><span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase mt-1 inline-block bg-slate-100 text-slate-500`}>{p.membershipTier || 'Free'}</span></td>
                            <td className="py-4 text-center"><div className="text-xs font-black text-slate-800">{p.loggedMatches?.length || 0} Matches</div></td>
                            <td className="py-4 text-right">
                              <button onClick={() => setSelectedPlayerForSparks(p)} className="text-yellow-500 hover:text-yellow-600 mr-3" title="Manage Sparks"><i className="fas fa-bolt"></i></button>
                              <button className="text-slate-300 hover:text-indigo-500"><i className="fas fa-ellipsis-h"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

           {/* GAME FEEDBACK VIEW */}
          {activeView === 'game_feedback' && activeRole === 'Director' && !isSoloMode && (
            <div className="space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Game Feedback</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">BentoIQ Comments</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {gameComments.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                        <i className="fas fa-comment-slash text-4xl text-slate-300 mb-4"></i>
                        <p className="text-sm font-bold text-slate-500">No feedback received yet.</p>
                      </div>
                    ) : (
                      gameComments.map(comment => (
                        <div key={comment.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                {comment.userName ? comment.userName.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-800">{comment.userName || 'Anonymous'}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : 'Just now'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          )}

           {/* CANCELLED MEMBERS VIEW */}
          {activeView === 'cancelled_members' && activeRole === 'Director' && !isSoloMode && (
            <div className="space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cancelled Members</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unsubscribed Users List</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto admin-scroll pb-2">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="pb-3 pl-2">Email</th>
                          <th className="pb-3">Phone</th>
                          <th className="pb-3">Unsubscribed At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {unsubscribedUsers.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400 font-bold text-sm">
                              No cancelled members found.
                            </td>
                          </tr>
                        ) : (
                          unsubscribedUsers.map(user => (
                            <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 pl-2 font-bold text-xs text-slate-800">{user.email || 'N/A'}</td>
                              <td className="py-4 font-bold text-xs text-slate-700">{user.phone || 'N/A'}</td>
                              <td className="py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                                {new Date(user.unsubscribedAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* DIRECTOR OVERVIEW DASHBOARD - MAP REMOVED */}
          {!isSoloMode && activeRole === 'Director' && activeView === 'overview' && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Stats Cards */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center"><i className="fas fa-wallet"></i></div><h3 className="font-black text-lg text-slate-800">Cash Flow</h3></div><div className="text-center py-6"><span className="text-4xl font-black text-slate-800 block mb-2">$24,500</span><span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full">+12%</span></div></div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center"><i className="fas fa-rocket"></i></div><h3 className="font-black text-lg text-slate-800">Growth</h3></div><div className="bg-slate-50 p-4 rounded-2xl text-center"><div className="text-2xl font-black text-blue-600">{players.length}</div><div className="text-[8px] font-bold uppercase text-slate-400">Users</div></div></div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center"><i className="fas fa-bell"></i></div><h3 className="font-black text-lg text-slate-800">Alerts</h3></div><div className="bg-slate-50 p-4 rounded-2xl text-center"><div className="text-2xl font-black text-rose-600">{tickets.length}</div><div className="text-[8px] font-bold uppercase text-slate-400">Open Tickets</div></div></div>
               </div>

               {/* Survey Results */}
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                      <i className="fas fa-poll"></i>
                    </div>
                    <h3 className="font-black text-lg text-slate-800">Future Feature Interest Survey</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(surveyResults).map(([key, data]: [string, any]) => {
                      if (key === 'drive_analysis') return null;
                      const average = data.count > 0 ? (data.total / data.count).toFixed(1) : '0.0';
                      const titles: Record<string, string> = {
                        backhand_volley: 'Backhand Volley',
                        serve_analysis: 'Serve Analysis',
                        spatial_analysis: 'Spatial Analysis',
                        tactic_analysis: 'Tactic Analysis'
                      };
                      return (
                        <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{titles[key] || key}</div>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-800">{average}</span>
                            <span className="text-xs font-bold text-slate-400 mb-1">/ 5.0</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1">{data.count} votes</div>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </div>
          )}

          {isSoloMode && activeView === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Urgent Actions */}
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center"><i className="fas fa-bell"></i></div><h3 className="font-black text-lg text-slate-800">Urgent</h3></div>
                    <div className="space-y-4">{tickets.filter(t => t.status === 'Open' || t.status === 'Pending').map(t => (<div key={t.id} className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center group cursor-pointer hover:bg-rose-100"><div className="text-xs font-black text-slate-800">{t.issue}</div><i className="fas fa-arrow-right text-rose-300"></i></div>))}</div>
                 </div>
                 {/* Cash Flow */}
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center"><i className="fas fa-wallet"></i></div><h3 className="font-black text-lg text-slate-800">Cash Flow</h3></div><div className="text-center py-6"><span className="text-4xl font-black text-slate-800 block mb-2">$24,500</span><span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full">+12%</span></div></div>
                 {/* Growth */}
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center"><i className="fas fa-rocket"></i></div><h3 className="font-black text-lg text-slate-800">Growth</h3></div><div className="bg-slate-50 p-4 rounded-2xl text-center"><div className="text-2xl font-black text-blue-600">{players.length}</div><div className="text-[8px] font-bold uppercase text-slate-400">Users</div></div></div>
              </div>

              {/* Survey Results */}
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                      <i className="fas fa-poll"></i>
                    </div>
                    <h3 className="font-black text-lg text-slate-800">Future Feature Interest Survey</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(surveyResults).map(([key, data]: [string, any]) => {
                      if (key === 'drive_analysis') return null;
                      const average = data.count > 0 ? (data.total / data.count).toFixed(1) : '0.0';
                      const titles: Record<string, string> = {
                        backhand_volley: 'Backhand Volley',
                        serve_analysis: 'Serve Analysis',
                        spatial_analysis: 'Spatial Analysis',
                        tactic_analysis: 'Tactic Analysis'
                      };
                      return (
                        <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{titles[key] || key}</div>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-800">{average}</span>
                            <span className="text-xs font-bold text-slate-400 mb-1">/ 5.0</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1">{data.count} votes</div>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </div>
          )}

          {!isSoloMode && activeView === 'marketing' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="col-span-1 lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center"><i className="fas fa-bullhorn"></i></div>
                      <h3 className="font-black text-lg text-slate-800">Marketing Campaigns</h3>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-6">
                      <p className="text-slate-500">Marketing features coming soon.</p>
                  </div>
               </div>
             </div>
          )}

        </div>
      </main>

      {/* Sparks Management Modal */}
      {selectedPlayerForSparks && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">Manage Sparks</h3>
              <button onClick={() => setSelectedPlayerForSparks(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <img src={selectedPlayerForSparks.avatar} className="w-12 h-12 rounded-full bg-slate-100 object-cover" />
                <div>
                  <div className="font-bold text-slate-800">{selectedPlayerForSparks.name}</div>
                  <div className="text-xs text-slate-500">Current Balance: <span className="font-black text-yellow-500">{selectedPlayerForSparks.sparksBalance || 0} ⚡</span></div>
                </div>
              </div>

              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Amount to Add</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[10, 50, 100, 175].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setSparkAmount(amount)}
                    className={`py-3 rounded-xl font-black text-sm transition-all ${sparkAmount === amount ? 'bg-yellow-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    +{amount} ⚡
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={sparkAmount} 
                  onChange={(e) => setSparkAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Custom amount"
                />
              </div>
            </div>

            <button 
              onClick={handleAddSparks}
              className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
            >
              Confirm Addition
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
