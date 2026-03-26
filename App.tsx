
import * as React from 'react';
import { useState, useEffect, useRef, useMemo, Component } from 'react';
import { auth, db } from './services/firebase';
import { 
  onAuthStateChanged, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { PICKLE_QUOTES, INITIAL_HOT_SESSIONS, MOCK_PLAYERS } from './constants';
import PlayerClassification from './components/PlayerClassification';
import Matchmaking from './components/Matchmaking';
import PerformanceReport from './components/PerformanceReport';
import RegistrationModal from './components/RegistrationModal';
import LoginModal from './components/LoginModal';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import DemoModal from './components/DemoModal';
import LegalModal from './components/LegalModal';
import MyAccount from './components/MyAccount';
import Logo from './components/Logo';
import Pi1xiaBottomBanner from './components/Pi1xiaBottomBanner';
import BentoIQGame from './components/BentoIQGame';
import { PlayerProfile, SkillGroup, ScheduledMatch, HotSession, Theme } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ... (Keep existing Type definitions like Tab, Ball)
type Tab = 'Home' | 'Evaluation' | 'Matchmaking' | 'Stats' | 'Account' | 'Game';
type AppView = 'landing' | 'app' | 'admin';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: { bg: string; border: string; shadow: string };
}


const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper to compare skill groups
const getSkillTier = (sg: SkillGroup) => {
  switch(sg) {
      case SkillGroup.GROUP_3: return 3;
      case SkillGroup.GROUP_2: return 2;
      case SkillGroup.GROUP_1: return 1;
      default: return 0;
  }
};

const themeClasses = {
  bg: {
    sunny: 'bg-[#E6D5C8]',
    classic: 'bg-[#E5E9EB]',
    dark: 'bg-[#1a3300]'
  },
  nav: {
    sunny: 'bg-[#E6D5C8]/80',
    classic: 'bg-[#E5E9EB]/80',
    dark: 'bg-[#1a3300]/80'
  },
  text: {
    sunny: 'text-[#4A4238]',
    classic: 'text-[#3B474C]',
    dark: 'text-[#33FFFC]'
  }
};

const RollingPickleballs: React.FC<{ theme: Theme }> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const ballColors = useMemo(() => {
    if (theme === 'dark') return [
      { bg: '#0A4D54', border: '#33FFFC', shadow: 'rgba(51, 255, 252, 0.4)' }, 
      { bg: '#052F33', border: '#00E5FF', shadow: 'rgba(0, 229, 255, 0.4)' }, 
      { bg: '#103F44', border: '#D9FDFD', shadow: 'rgba(217, 253, 253, 0.4)' }, 
      { bg: '#0a1a00', border: '#33FFFC', shadow: 'rgba(51, 255, 252, 0.4)' }, 
    ];
    if (theme === 'classic') return [
      { bg: '#A7B9C0', border: '#FFFFFF', shadow: 'rgba(167, 185, 192, 0.3)' }, 
      { bg: '#8EA3A6', border: '#FFFFFF', shadow: 'rgba(142, 163, 166, 0.3)' }, 
      { bg: '#B0BFC3', border: '#FFFFFF', shadow: 'rgba(176, 191, 195, 0.3)' }, 
      { bg: '#D1DCE0', border: '#FFFFFF', shadow: 'rgba(209, 220, 224, 0.3)' }, 
    ];
    return [
      { bg: '#C4A45C', border: '#FFFFFF', shadow: 'rgba(196, 164, 92, 0.3)' }, 
      { bg: '#94A684', border: '#FFFFFF', shadow: 'rgba(148, 166, 132, 0.3)' }, 
      { bg: '#D98B79', border: '#FFFFFF', shadow: 'rgba(217, 139, 121, 0.3)' }, 
      { bg: '#8EA3A6', border: '#FFFFFF', shadow: 'rgba(142, 163, 166, 0.3)' }, 
    ];
  }, [theme]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    const initialBalls: Ball[] = Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 35, 
      vy: (Math.random() - 0.5) * 35,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      color: ballColors[i % ballColors.length],
    }));
    setBalls(initialBalls);

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      setBalls((prevBalls) =>
        prevBalls.map((ball) => {
          let { x, y, vx, vy, rotation, rotationSpeed } = ball;
          const radius = 32; 
          if (elapsed > 3000) {
            const friction = 0.96;
            vx *= friction;
            vy *= friction;
          }
          x += vx;
          y += vy;
          rotation += rotationSpeed;
          if (x + radius > window.innerWidth || x - radius < 0) vx = -vx;
          if (y + radius > window.innerHeight || y - radius < 0) vy = -vy;
          return { ...ball, x, y, vx, vy, rotation };
        })
      );
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current !== null) cancelAnimationFrame(requestRef.current); };
  }, [ballColors]);

  return (
    <div ref={containerRef} className={`fixed inset-0 overflow-hidden pointer-events-none z-15 ${theme === 'dark' ? 'opacity-30' : 'opacity-65'}`}>
      {balls.map((ball) => (
        <div key={ball.id} className="absolute will-change-transform" style={{ transform: `translate3d(${ball.x - 32}px, ${ball.y - 32}px, 0) rotate(${ball.rotation}deg)` }}>
          <div className="relative w-16 h-16 rounded-full border-2" style={{ backgroundColor: ball.color.bg, borderColor: ball.color.border, boxShadow: `0 8px 16px -4px ${ball.color.shadow}` }} />
        </div>
      ))}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse((this as any).state.errorInfo || "{}");
        if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
          displayMessage = "You don't have permission to perform this action. Please check your account settings or contact support.";
        } else if (parsed.error) {
          displayMessage = `Database Error: ${parsed.error}`;
        }
      } catch (e) {
        displayMessage = (this as any).state.errorInfo || "An unexpected error occurred.";
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
              <i className="fas fa-exclamation-triangle text-2xl text-rose-500"></i>
            </div>
            <h2 className="text-2xl font-black text-stone-800 mb-4 uppercase tracking-tight">Application Error</h2>
            <p className="text-stone-500 font-medium mb-8 leading-relaxed">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-green-900 hover:bg-green-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg uppercase tracking-widest"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  // New Routing State
  const [currentView, setCurrentView] = useState<AppView>('landing');

  // Existing State from previous App component
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [regStep, setRegStep] = useState(1);
  
  // New Modal States
  const [showDemo, setShowDemo] = useState(false);
  const [showLegal, setShowLegal] = useState<{show: boolean, tab: 'terms' | 'privacy' | 'waiver'}>({ show: false, tab: 'terms' });
  const [emailPromptVisible, setEmailPromptVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailPromptError, setEmailPromptError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    window.alert = (msg?: any) => {
      showToast(String(msg || ''));
    };
  }, []);

  const [theme, setTheme] = useState<Theme>('sunny');
  const [language, setLanguage] = useState<'EN' | 'CN'>('EN');
  const [quote, setQuote] = useState('');
  
  // Admin Secret Trigger State
  const [secretClickCount, setSecretClickCount] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [hotSessions, setHotSessions] = useState<HotSession[]>(INITIAL_HOT_SESSIONS);
  const [deletedMockIds, setDeletedMockIds] = useState<string[]>([]);
  
  // Global Player List
  const [allPlayers, setAllPlayers] = useState<PlayerProfile[]>([...MOCK_PLAYERS]);

  // Firebase Real-time Listeners
  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection successful");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    // Only attach listeners if authenticated to avoid permission errors on landing
    if (!isAuthenticated) return;

    // 1. Listen to all users for Matchmaking
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const players: PlayerProfile[] = [];
      snapshot.forEach((doc) => {
        players.push(doc.data() as PlayerProfile);
      });
      if (players.length > 0) {
        setAllPlayers(players);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "users");
    });

    // 2. Listen to all matches for Hot Sessions
    const unsubscribeMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      const sessions: HotSession[] = [];
      snapshot.forEach((doc) => {
        sessions.push({ ...doc.data(), id: doc.id } as HotSession);
      });
      // Merge with initial mock data to ensure they stay visible for demonstration
      setHotSessions([...INITIAL_HOT_SESSIONS.filter(init => !deletedMockIds.includes(init.id) && !sessions.some(s => s.id === init.id)), ...sessions]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "matches");
    });

    return () => {
      unsubscribeUsers();
      unsubscribeMatches();
    };
  }, [isAuthenticated, deletedMockIds]);

  // Firebase Auth Listener
  useEffect(() => {
    // Check for Magic Link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        setEmailPromptVisible(true);
      } else {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            // Auth state listener will handle the rest
          })
          .catch((error) => {
            console.error("Magic Link Error:", error);
            setEmailPromptError("Error signing in with magic link. Please try again.");
            setEmailPromptVisible(true);
          });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data() as PlayerProfile;
            setUserProfile(profile);
            setIsAuthenticated(true);
            // Only auto-redirect to app if we are on landing
            if (currentView === 'landing') {
              setCurrentView(profile.isAdmin ? 'admin' : 'app');
            }
          } else {
            // User is authenticated but has no Firestore profile
            setIsAuthenticated(true);
            setShowReg(true); // Open registration to complete profile
            setRegStep(1);
            if (currentView === 'landing') {
              setCurrentView('app');
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        // User is signed out
        setIsAuthenticated(false);
        // We don't force 'landing' here anymore, allowing the 'Launch App' button to work
        // handleLogout handles the explicit redirect to landing
      }
    });
    return () => unsubscribe();
  }, []); // Run once on mount

  // New state for next match alarm
  const [nextMatch, setNextMatch] = useState<{match: ScheduledMatch, date: Date, countdown: string} | null>(null);
  
  const [userProfile, setUserProfile] = useState<PlayerProfile>({
    id: 'user-0',
    name: 'Guest',
    ageGroup: '30-39',
    skillGroup: SkillGroup.GROUP_2,
    selfEval: 3.0,
    duprRank: 3.2,
    location: '', 
    locations: [], 
    isLocationFlexible: true,
    membershipTier: 'Pro', 
    integrityHistory: [],
    schedule: [], 
    isScheduleFlexible: true,
    preferredTimes: ['Mornings'],
    duration: 2,
    yearsPlayed: 2,
    frequency: 'Weekly',
    language: ['English'],
    goal: 'Improving Skills',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pi1xia&mouth=smile',
    isRegistered: false,
    connectedPartners: [],
    loggedMatches: [],
    contactPreference: 'Email',
    contactInfo: '',
    isAdmin: false,
    weeklyStats: {
      matchesPlayed: 0,
      matchesTarget: 3,
      latenessMinutes: [],
      missedMatches: 0,
      invitesSent: 0,
      friendInvites: [],
      warmupsCount: 0,
      usedAIAnalysis: false,
      aiShownImprovement: false
    },
    integrityStreakMonths: 2,
    evaluationsThisMonth: 0,
    totalEvaluations: 0,
    lastEvaluationDate: ''
  });

  const handleUpdateProfile = async (updated: PlayerProfile) => {
    setUserProfile(updated);
    
    // Save to Firestore if logged in
    if (auth.currentUser && updated.isRegistered) {
        try {
            await setDoc(doc(db, "users", auth.currentUser.uid), updated);
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}`);
        }
    }

    if (updated.isRegistered) {
        setAllPlayers(prev => {
            const exists = prev.find(p => p.id === updated.id);
            if (exists) {
                return prev.map(p => p.id === updated.id ? updated : p);
            } else {
                return [updated, ...prev];
            }
        });
    }
  };

  const translations = {
    EN: {
      welcome: "Welcome",
      home: "Home",
      eval: "Eval",
      match: "Match",
      stats: "Stats",
      account: "Account",
      aiSkillSync: "AI Skill Sync",
      aiSkillSyncDesc: "Leverage Gemini AI for advanced mechanical skill assessment.",
      localRadar: "Local Radar",
      localRadarDesc: "Discover compatible partners in your neighborhood.",
      signIn: "Sign In",
      register: "Register",
      subHeader: "AI-powered performance analysis and tracking for serious players to find partners.",
      hotSessions: "Hot Sessions",
      needed: "needed",
      join: "Join",
      activeAlarm: "Match Alarm Active!",
      alarmDesc: "Your game starts in less than 24 hours. Be ready!",
      urgentAlarm: "URGENT: COURT TIME SOON!",
      startsIn: "Game starts in:",
    },
    CN: {
      welcome: "欢迎",
      home: "首页",
      eval: "技能评估",
      match: "伙伴匹配",
      stats: "数据统计",
      account: "账户",
      aiSkillSync: "AI 技能同步",
      aiSkillSyncDesc: "利用 Gemini AI 进行先进的机械技能评估。",
      localRadar: "本地雷达",
      localRadarDesc: "发现您附近的兼容伙伴。",
      signIn: "登录",
      register: "注册",
      subHeader: "同级别匹配，精准 AI 分析",
      hotSessions: "火热场次",
      needed: "人空缺",
      join: "加入",
      activeAlarm: "比赛闹钟激活！",
      alarmDesc: "您的比赛将在 24 小时内开始。准备好！",
      urgentAlarm: "紧急：比赛即将开始！",
      startsIn: "比赛倒计时：",
    }
  };

  const t = translations[language];

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return {
      players: MOCK_PLAYERS.filter(p => p.name.toLowerCase().includes(query))
    };
  }, [searchQuery]);

  const handleSearchResultClick = (type: 'player', item: any) => {
    setActiveTab('Matchmaking');
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'CN' : 'EN');
  };

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'sunny') return 'classic';
      if (prev === 'classic') return 'dark';
      return 'sunny';
    });
  };

  useEffect(() => {
    const checkSchedule = setInterval(() => {
      const now = new Date();
      setHotSessions(prev => prev.filter(hs => {
        const hsTime = hs.time.includes(':') ? hs.time.split(':') : ["10", "00"];
        const hsDate = new Date();
        const hsDayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        let hsDayOffset = (hsDayMap[hs.day] ?? 0) - now.getDay();
        if (hsDayOffset < 0) hsDayOffset += 7;
        hsDate.setDate(now.getDate() + hsDayOffset);
        hsDate.setHours(parseInt(hsTime[0]), parseInt(hsTime[1] || '0'), 0);
        const diffHrs = (hsDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHrs >= -2;
      }));

      const confirmedHotSessions = hotSessions.filter(hs => (hs.needed <= 0 || hs.isManuallyConfirmed) && hs.participants?.includes(userProfile.id));
      
      const confirmedMatches = [...userProfile.schedule.filter(s => s.isConfirmedMatch)];
      
      confirmedHotSessions.forEach(hs => {
         const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
         const d = dayMap[hs.day] || 0;
         if (!confirmedMatches.find(m => m.day === d && m.time === hs.time)) {
             confirmedMatches.push({ 
                 id: hs.id, 
                 day: d, 
                 time: hs.time, 
                 location: hs.location, 
                 isConfirmedMatch: true, 
                 status: 'confirmed',
                 duration: hs.duration 
             });
         }
      });

      if (confirmedMatches.length > 0) {
        const upcomingMatches = confirmedMatches.map(m => {
           const [h, min] = m.time.split(':').map(Number);
           const mDate = new Date();
           mDate.setHours(h, min || 0, 0, 0);
           let dayDiff = m.day - now.getDay();
           if (dayDiff < 0 || (dayDiff === 0 && mDate.getTime() < now.getTime())) dayDiff += 7;
           mDate.setDate(now.getDate() + dayDiff);
           return { match: m, date: mDate };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());

        const next = upcomingMatches[0];
        if (next) {
           const diff = next.date.getTime() - now.getTime();
           if (diff > 0) {
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              let countdownStr = "";
              if (days > 0) countdownStr += `${days}d `;
              if (hours > 0 || days > 0) countdownStr += `${hours}h `;
              countdownStr += `${minutes}m`;
              setNextMatch({ match: next.match, date: next.date, countdown: countdownStr.trim() || "< 1m" });
           } else { setNextMatch(null); }
        } else { setNextMatch(null); }
      } else { setNextMatch(null); }
    }, 1000);
    return () => clearInterval(checkSchedule);
  }, [userProfile.schedule, hotSessions]);

  useEffect(() => {
    setQuote(PICKLE_QUOTES[Math.floor(Math.random() * PICKLE_QUOTES.length)]);
  }, []);

  const handleRequireAuth = () => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return true;
    }
    return false;
  };

  const handleJoinHotSession = async (session: HotSession) => {
    if (handleRequireAuth()) return;
    
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const sessionDayIdx = dayMap[session.day] ?? 0;
    const sessionStart = parseInt(session.time.split(':')[0]) + (parseInt(session.time.split(':')[1] || '0') / 60);
    const sessionEnd = sessionStart + session.duration;
    
    const hasConflict = userProfile.schedule.some(s => {
        if (!s.isConfirmedMatch && s.status !== 'confirmed') return false; 
        if (s.day !== sessionDayIdx) return false;
        const sStart = parseInt(s.time.split(':')[0]) + (parseInt(s.time.split(':')[1] || '0') / 60);
        const sEnd = sStart + (s.duration || 2);
        return Math.max(sessionStart, sStart) < Math.min(sessionEnd, sEnd);
    });

    if (hasConflict) { 
        showToast("You already have a confirmed game at this time! You cannot join two games simultaneously."); 
        return; 
    }

    const currentParticipants = session.participants || [];
    if (currentParticipants.includes(userProfile.id)) { showToast("You have already joined this session!"); return; }
    
    const updatedParticipants = [...currentParticipants, userProfile.id];
    const newNeeded = session.needed - 1;
    const isNowFull = newNeeded <= 0;
    
    const scheduledMatch: ScheduledMatch = { 
        id: session.id, 
        day: sessionDayIdx, 
        time: session.time, 
        location: session.location, 
        isConfirmedMatch: isNowFull,
        status: isNowFull ? 'confirmed' : 'pending',
        duration: session.duration, 
        participants: updatedParticipants 
    };

    // 1. Update User Profile (Schedule)
    handleUpdateProfile({ 
        ...userProfile, 
        schedule: [...userProfile.schedule.filter(s => !(s.day === sessionDayIdx && s.time === session.time)), scheduledMatch] 
    });

    // 2. Update Session in Firestore
    try {
      const sessionRef = doc(db, "matches", session.id);
      await updateDoc(sessionRef, {
        needed: newNeeded,
        participants: updatedParticipants
      });
      
      if (isNowFull) { 
          showToast(`Match Confirmed! Session full at ${session.location}.`); 
      } else { 
          showToast(`Joined! Session at ${session.location} added to your schedule (Pending).`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${session.id}`);
    }
  };

  const handleDirectorBroadcast = async (day: number, time: string, text: string, location: string) => {
    const match = text.match(/^(.*?) need (\d+),?\s*(.*)$/i);
    let description = text;
    let needed = 4;
    let notes = "";
    
    if (match) {
        description = match[1].trim();
        needed = parseInt(match[2]);
        notes = match[3].trim();
    }

    const session: Omit<HotSession, 'id'> = {
        city: location.split(' ')[0], 
        location: location,
        shortLocation: location.substring(0, 15),
        level: notes.includes('group 3') ? '4.0' : '3.0',
        skillGroup: notes.includes('group 3') ? SkillGroup.GROUP_3 : SkillGroup.GROUP_2,
        sessionType: 'Broadcast',
        day: DAYS[day],
        time: time,
        needed: needed,
        duration: 2,
        createdBy: 'Director',
        description: `${description} (${notes})`,
        participants: [],
        isFlexible: true,
        isManuallyConfirmed: false
    };

    try {
      await addDoc(collection(db, "matches"), session);
      showToast("Broadcast Sent! Session will appear on members' Home Page and Schedule.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "matches");
    }
  };

  const handleDirectorConfirm = async (session: HotSession) => {
      if (!userProfile.isAdmin) return;
      try {
        await updateDoc(doc(db, "matches", session.id), { isManuallyConfirmed: true });
        setHotSessions(prev => prev.map(s => s.id === session.id ? { ...s, isManuallyConfirmed: true } : s));
        showToast("Session Confirmed! Participants will receive an alarm.");
      } catch (error) {
        setHotSessions(prev => prev.map(s => s.id === session.id ? { ...s, isManuallyConfirmed: true } : s));
        showToast("Session Confirmed! Participants will receive an alarm.");
        // handleFirestoreError(error, OperationType.UPDATE, `matches/${session.id}`);
      }
  };

  const handleDirectorDelete = async (session: HotSession) => {
      if (!userProfile.isAdmin) return;
      
      try {
        if (INITIAL_HOT_SESSIONS.some(s => s.id === session.id)) {
            setDeletedMockIds(prev => [...prev, session.id]);
        } else {
            await deleteDoc(doc(db, "matches", session.id));
        }
        setHotSessions(prev => prev.filter(s => s.id !== session.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `matches/${session.id}`);
      }
  };

  const handleCreateHotSession = async (session: HotSession) => {
    if (handleRequireAuth()) return;
    
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const sessionDayIdx = dayMap[session.day] ?? 0;
    
    try {
      const docRef = await addDoc(collection(db, "matches"), session);
      const sessionId = docRef.id;

      const scheduledMatch: ScheduledMatch = { 
          id: sessionId, 
          day: sessionDayIdx, 
          time: session.time, 
          location: session.location, 
          isConfirmedMatch: false, 
          status: 'pending',
          duration: session.duration, 
          participants: session.participants || []
      };

      handleUpdateProfile({ 
          ...userProfile, 
          schedule: [...userProfile.schedule.filter(s => !(s.day === sessionDayIdx && s.time === session.time)), scheduledMatch] 
      });

      showToast("Hot Session Posted! Other players can now join.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "matches");
    }
  };

  const handleLogin = (name: string, role: 'admin' | 'user') => {
    if (role === 'admin') {
      setCurrentView('admin');
      setActiveTab('Matchmaking');
      setShowAdminLogin(false);
      setIsAuthenticated(true);
      handleUpdateProfile({ ...userProfile, isAdmin: true, name: name || 'Admin', isRegistered: true });
    } else {
      // User login is handled by LoginModal calling signInWithEmailAndPassword
      // which triggers onAuthStateChanged above.
      setShowLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout Error:", error);
    }
    setIsAuthenticated(false);
    setShowLogin(false);
    setShowAdminLogin(false);
    setActiveTab('Home');
    setCurrentView('landing'); 
    handleUpdateProfile({ ...userProfile, isAdmin: false, isRegistered: false, name: 'Guest', id: 'user-0' });
  };
  
  const handleSecretFooterClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 5) {
      setShowAdminLogin(true);
      setSecretClickCount(0);
    }
  };

  const handleEmailPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    
    signInWithEmailLink(auth, emailInput, window.location.href)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        setEmailPromptVisible(false);
        setEmailPromptError('');
      })
      .catch((error) => {
        console.error("Magic Link Error:", error);
        setEmailPromptError("Error signing in with magic link. Please try again.");
      });
  };

  if (emailPromptVisible) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-black text-stone-800 mb-4">Confirm Your Email</h2>
          <p className="text-stone-600 mb-6">Please enter your email address to complete the sign-in process.</p>
          <form onSubmit={handleEmailPromptSubmit} className="space-y-4">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            {emailPromptError && <p className="text-rose-500 text-sm">{emailPromptError}</p>}
            <button
              type="submit"
              className="w-full bg-green-900 hover:bg-green-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg uppercase tracking-widest"
            >
              Verify Email
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'landing') {
    return (
      <ErrorBoundary>
        {showAdminLogin && (
          <LoginModal 
            mode="admin"
            onLogin={handleLogin}
            onRegister={() => {}}
            onClose={() => setShowAdminLogin(false)}
            theme={theme}
          />
        )}
        <LandingPage 
          onLaunchApp={() => setCurrentView('app')}
          onAdminLogin={() => setShowAdminLogin(true)}
          onWatchDemo={() => setShowDemo(true)}
          onViewLegal={(tab) => setShowLegal({ show: true, tab })}
        />
        {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
        {showLegal.show && <LegalModal initialTab={showLegal.tab} onClose={() => setShowLegal({ ...showLegal, show: false })} />}
      </ErrorBoundary>
    );
  }

  if (currentView === 'admin') {
    return (
      <ErrorBoundary>
        <AdminDashboard 
          onLogout={handleLogout}
          onLaunchApp={() => setCurrentView('app')}
          players={allPlayers}
          onCreateGroupEvent={handleCreateHotSession}
          onUpdatePlayer={handleUpdateProfile}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen transition-colors duration-500 ${themeClasses.bg[theme]} pb-32 font-['Plus_Jakarta_Sans']`}>
      {showLogin && (
        <LoginModal 
          mode="user"
          onLogin={handleLogin}
          onRegister={() => { setShowLogin(false); setShowReg(true); setRegStep(1); }}
          onClose={() => setShowLogin(false)}
          theme={theme}
        />
      )}
      {(!isAuthenticated && showAdminLogin) && (
        <LoginModal 
          mode="admin"
          onLogin={handleLogin}
          onRegister={() => {}}
          onClose={() => setShowAdminLogin(false)}
          theme={theme}
        />
      )}
      
      {showLegal.show && <LegalModal initialTab={showLegal.tab} onClose={() => setShowLegal({ ...showLegal, show: false })} />}

      <nav className={`fixed top-0 left-0 right-0 h-20 backdrop-blur-xl border-b z-50 px-4 md:px-8 flex items-center justify-between transition-all ${themeClasses.nav[theme]} ${theme === 'sunny' ? 'border-[#4A4238]/10' : theme === 'classic' ? 'border-[#3B474C]/10' : 'border-cyan-900/40'}`}>
        <div onClick={() => setActiveTab('Home')} className="cursor-pointer shrink-0">
          <Logo showText theme={theme} />
        </div>
        
        {/* Search Bar ... */}
        <div className="flex-1 max-w-md mx-4 hidden md:block relative z-50">
            <div className={`relative flex items-center w-full h-10 rounded-2xl transition-all ${theme === 'dark' ? 'bg-cyan-950/40 border border-cyan-400/20 text-cyan-50' : 'bg-stone-50 border border-stone-200 text-stone-800'} focus-within:ring-2 focus-within:ring-lime-400 focus-within:bg-white`}>
              <i className="fas fa-search absolute left-4 text-xs opacity-50"></i>
              <input 
                  type="text" 
                  placeholder="Find players or courts..." 
                  className="w-full h-full bg-transparent pl-10 pr-4 outline-none text-[10px] font-black uppercase tracking-widest placeholder:opacity-50"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-stone-400 hover:text-rose-500 transition-colors">
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>

            {isSearchFocused && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-96 overflow-y-auto">
                {searchResults.players.length === 0 && (
                    <div className="p-6 text-center text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                      No results found
                    </div>
                )}
                {searchResults.players.length > 0 && (
                  <div>
                    <div className="bg-stone-50 px-4 py-2 text-[9px] font-black uppercase text-stone-400 tracking-widest border-b border-stone-100">Players</div>
                    {searchResults.players.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => handleSearchResultClick('player', p)}
                        className="flex items-center gap-3 p-3 hover:bg-lime-50 cursor-pointer border-b border-stone-50 last:border-0 transition-colors group"
                      >
                          <img src={p.avatar} alt="" className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200" />
                          <div>
                            <h4 className="text-[10px] font-black text-stone-700 group-hover:text-green-900">{p.name}</h4>
                            <p className="text-[8px] font-bold text-stone-400">{p.skillGroup} • {p.location}</p>
                          </div>
                          <i className="fas fa-arrow-right ml-auto text-stone-300 group-hover:text-lime-500 text-xs"></i>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {userProfile.isAdmin && (
            <button onClick={() => setCurrentView('admin')} className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all">
               Dashboard
            </button>
          )}
          <button onClick={toggleLanguage} className={`px-2 py-1 md:px-3 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest transition-all border-2 ${theme === 'sunny' ? 'bg-[#4A4238]/5 border-[#4A4238]/10 text-[#4A4238]' : theme === 'classic' ? 'bg-[#3B474C]/5 border-[#3B474C]/10 text-[#3B474C]' : 'bg-cyan-950/40 border-cyan-400/20 text-[#33FFFC]'}`}>
            {language}
          </button>
          <button onClick={cycleTheme} className={`w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center transition-all border-2 ${theme === 'sunny' ? 'bg-[#4A4238]/5 border-[#4A4238]/10 text-[#C4A45C]' : theme === 'classic' ? 'bg-[#3B474C]/5 border-[#3B474C]/10 text-[#8EA3A6]' : 'bg-cyan-950/40 border-cyan-400/20 text-[#33FFFC]'}`}>
            <i className={`fas ${theme === 'sunny' ? 'fa-sun' : theme === 'classic' ? 'fa-eye' : 'fa-wave-square'} text-lg md:text-xl`}></i>
          </button>
          {isAuthenticated || userProfile.isAdmin ? (
            <button onClick={handleLogout} className="w-9 h-9 md:w-11 md:h-11 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all border-2 border-rose-100" title="Sign Out">
              <i className="fas fa-sign-out-alt text-sm md:text-base"></i>
            </button>
          ) : (
            <button onClick={() => setCurrentView('landing')} className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-stone-100 text-stone-500 hover:text-stone-800 font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all">
               Exit
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto pt-28 px-4 md:pt-32 md:px-6">
        {activeTab === 'Home' && (
          <div className="space-y-12 animate-in fade-in duration-500 pb-16">
            <RollingPickleballs theme={theme} />
            {nextMatch && isAuthenticated && (
              <div className="p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border-4 border-white transition-all duration-500 bg-rose-500 text-white relative overflow-hidden animate-in slide-in-from-top-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 animate-pulse"><i className="fas fa-clock text-2xl"></i></div>
                <div className="flex-1 z-10">
                  <h4 className="font-black uppercase text-xs tracking-[0.1em] mb-1">Upcoming Match Confirmed</h4>
                  <p className="text-[10px] font-bold opacity-90 uppercase truncate max-w-[200px] md:max-w-md">{nextMatch.match.location} @ {DAYS[nextMatch.match.day]} {nextMatch.match.time}</p>
                  <div className="font-mono font-black text-3xl tracking-widest mt-1 text-shadow-sm">{nextMatch.countdown}</div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-white/10 text-9xl"><i className="fas fa-stopwatch"></i></div>
              </div>
            )}

            <div className={`p-8 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group ${theme === 'sunny' ? 'bg-[#E7D9CF] text-[#4A4238]' : theme === 'classic' ? 'bg-[#B0BFC3] text-[#3B474C]' : 'bg-[#0A292C] text-[#D9FDFD]'}`}>
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div onClick={() => setActiveTab('Account')} className={`w-28 h-28 md:w-32 md:h-32 rounded-[2.5rem] overflow-hidden cursor-pointer border-4 transition-all hover:scale-100 shadow-xl shrink-0 ${theme === 'sunny' ? 'border-[#FAF7F0]' : 'border-cyan-400/40'}`}>
                  <img src={userProfile.avatar} alt="User" className="w-full h-full object-cover bg-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className={`text-xs md:text-sm font-black uppercase tracking-[0.25em] mb-2 drop-shadow-sm ${theme === 'dark' ? 'text-cyan-400' : 'text-orange-900/70'}`}>{t.subHeader}</div>
                  <h1 className="text-xl md:text-3xl font-black mb-3">{t.welcome}{isAuthenticated ? `, ${userProfile.name}` : ''}</h1>
                  <p className="text-[10px] font-medium italic opacity-60 leading-relaxed max-w-lg mx-auto md:mx-0">"{quote}"</p>
                  {!isAuthenticated && (
                    <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
                      <button onClick={() => { setShowReg(true); setRegStep(1); }} className={`px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all hover:scale-105 ${theme === 'sunny' ? 'bg-lime-400 text-green-900 hover:bg-lime-300' : theme === 'classic' ? 'bg-[#8EA3A6] text-white' : 'bg-cyan-400 text-[#0a1a00]'}`}>{t.register}</button>
                      <button onClick={() => setShowLogin(true)} className={`px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all hover:scale-105 ${theme === 'sunny' ? 'bg-green-900 text-white hover:bg-green-800' : theme === 'classic' ? 'bg-[#3B474C] text-white' : 'bg-transparent border border-cyan-400 text-cyan-400 hover:bg-cyan-950/30'}`}>{t.signIn}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Pi1xiaBottomBanner onClick={() => setActiveTab('Game')} />

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === 'sunny' ? 'text-[#4A4238]/40' : 'text-cyan-400/40'}`}>{t.hotSessions}</h3>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 animate-pulse"><i className="fas fa-fire"></i></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {hotSessions
                  .filter(session => {
                      if (userProfile.isAdmin) return true;
                      if (!userProfile.locations.includes(session.location) && session.sessionType !== 'Group Event') return false;
                      if (session.participants && session.participants.includes(userProfile.id)) return false;
                      if (session.needed <= 0) return false;
                      if (session.isManuallyConfirmed && session.sessionType !== 'Group Event') return false;
                      if (session.createdBy === userProfile.id) return false;
                      if (isAuthenticated && !session.isFlexible && getSkillTier(userProfile.skillGroup) < getSkillTier(session.skillGroup)) return false;
                      return true;
                  })
                  .map(session => (
                  <div key={session.id} className={`p-6 rounded-[2.5rem] border shadow-xl relative overflow-hidden ${theme === 'dark' ? 'bg-cyan-950/20 border-cyan-400/10 text-cyan-50' : 'bg-white border-stone-100'}`}>
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black uppercase text-orange-500">{session.city}</span>
                      <span className="text-[10px] font-black text-stone-400">{session.day} {session.time} <span className="text-stone-300 mx-1">•</span> {session.duration}h</span>
                    </div>
                    <h4 className="font-black uppercase text-sm mb-1 truncate">{session.location}</h4>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-6 flex items-center gap-1">{session.description || session.skillGroup} {session.isFlexible && <span className="text-lime-500 font-bold ml-1">(Flex)</span>}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-[10px] font-black">{session.needed > 0 ? session.needed : 0}</div>
                        <span className="text-[8px] font-black uppercase text-stone-400">{t.needed}</span>
                      </div>
                      
                      {userProfile.isAdmin ? (
                         <div className="flex gap-2">
                            {session.isManuallyConfirmed ? (
                               <span className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase">Confirmed</span>
                            ) : (
                               <span className="bg-orange-100 text-orange-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase">Pending</span>
                            )}
                            <button onClick={() => handleDirectorDelete(session)} className="bg-rose-50 text-rose-500 text-[9px] font-black px-3 py-2 rounded-xl uppercase tracking-widest hover:bg-rose-100"><i className="fas fa-trash"></i></button>
                         </div>
                      ) : (
                         <button onClick={() => handleJoinHotSession(session)} className="bg-orange-500 text-white text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg">{t.join}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div onClick={() => setActiveTab('Evaluation')} className={`p-10 rounded-[3rem] border transition-all cursor-pointer shadow-xl ${theme === 'sunny' ? 'bg-[#FAF7F0] border-[#4A4238]/10' : 'bg-[#0A292C] border-cyan-400/10 text-[#D9FDFD]'}`}>
                <i className={`fas fa-award text-5xl mb-6 ${theme === 'sunny' ? 'text-[#D98B79]' : 'text-[#33FFFC]'}`}></i>
                <h3 className="text-2xl font-black mb-3 uppercase">{t.aiSkillSync}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{t.aiSkillSyncDesc}</p>
              </div>
              <div onClick={() => setActiveTab('Matchmaking')} className={`p-10 rounded-[3rem] border transition-all cursor-pointer shadow-xl ${theme === 'sunny' ? 'bg-[#C4A45C] text-white shadow-[#C4A45C]/20' : 'bg-[#052F33] text-white border-cyan-400/20'}`}>
                <i className={`fas fa-users text-5xl mb-6 ${theme === 'dark' ? 'text-cyan-400' : ''}`}></i>
                <h3 className="text-2xl font-black mb-3 uppercase">{t.localRadar}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{t.localRadarDesc}</p>
              </div>
            </div>

            <div className="mt-8">
            </div>
          </div>
        )}
        
        {activeTab === 'Evaluation' && (
          <PlayerClassification 
            profile={userProfile} 
            onUpdate={handleUpdateProfile} 
            onRequireAuth={handleRequireAuth} 
            onUpgrade={() => { setRegStep(5); setShowReg(true); }}
            isAdmin={userProfile.isAdmin}
          />
        )}
        {activeTab === 'Matchmaking' && (
          <Matchmaking 
            currentUser={userProfile} 
            onUpdate={handleUpdateProfile} 
            onAddPartner={(id) => handleUpdateProfile({...userProfile, connectedPartners: [...(userProfile.connectedPartners||[]), id]})} 
            onCreateHotSession={handleCreateHotSession} 
            onConfirmMatch={() => {}} 
            onEditProfile={() => { setRegStep(1); setShowReg(true); }} 
            onRequireAuth={handleRequireAuth} 
            isAdmin={userProfile.isAdmin}
            allPlayers={allPlayers}
            onDirectorBroadcast={handleDirectorBroadcast}
            onDirectorConfirm={handleDirectorConfirm}
            onDirectorDelete={handleDirectorDelete}
            onJoinHotSession={handleJoinHotSession}
            hotSessions={hotSessions}
          />
        )}
        {activeTab === 'Stats' && (
          <PerformanceReport 
            userProfile={userProfile} 
            onLogMatch={() => {}} 
            onUpdateProfile={handleUpdateProfile} 
            onRevertMatchToHotSession={(match) => { }} 
            theme={theme} 
            onRequireAuth={handleRequireAuth}
            isAdmin={userProfile.isAdmin}
            allPlayers={allPlayers}
          />
        )}
        {activeTab === 'Game' && (
          <BentoIQGame />
        )}
        {activeTab === 'Account' && (
          <MyAccount 
            profile={userProfile}
            onEdit={() => {
               if(handleRequireAuth()) return;
               setRegStep(1);
               setShowReg(true);
            }}
            onUpgrade={() => {
               if(handleRequireAuth()) return;
               setRegStep(5);
               setShowReg(true);
            }}
            onLogout={handleLogout}
            theme={theme}
          />
        )}
      </main>

      <footer className="max-w-4xl mx-auto py-8 text-center pb-32 lg:pb-12 opacity-50">
         <p onClick={handleSecretFooterClick} className={`text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer select-none ${themeClasses.text[theme]} hover:opacity-100 transition-opacity`} title="© Pi1Xia">
           &copy; 2026 ASCEP Well-being Design
         </p>
      </footer>

      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 backdrop-blur-2xl border px-6 py-4 md:px-10 md:py-5 rounded-[2.5rem] shadow-2xl z-50 flex gap-0 justify-between md:gap-14 md:justify-center items-center transition-all animate-in slide-in-from-bottom-10 duration-500 w-[90%] md:w-auto md:static md:translate-x-0 md:mx-auto md:mb-12 md:mt-8 ${theme === 'dark' ? 'bg-[#0a1a00]/95 border-cyan-400/20' : 'bg-white/90 border-stone-100'}`}>
        <NavButton icon="fa-home" label={t.home} active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} theme={theme} />
        <NavButton icon="fa-award" label={t.eval} active={activeTab === 'Evaluation'} onClick={() => setActiveTab('Evaluation')} theme={theme} />
        <NavButton icon="fa-users" label={t.match} active={activeTab === 'Matchmaking'} onClick={() => setActiveTab('Matchmaking')} theme={theme} />
        <NavButton icon="fa-gamepad" label="Game" active={activeTab === 'Game'} onClick={() => setActiveTab('Game')} theme={theme} />
        <NavButton icon="fa-chart-pie" label={t.stats} active={activeTab === 'Stats'} onClick={() => setActiveTab('Stats')} theme={theme} />
        <NavButton icon="fa-user" label={t.account} active={activeTab === 'Account'} onClick={() => setActiveTab('Account')} theme={theme} />
      </div>

      {showReg && (
          <RegistrationModal 
            profile={userProfile} 
            initialStep={regStep}
            onUpdate={(p) => { 
                handleUpdateProfile(p);
                setShowReg(false); 
                setIsAuthenticated(true); 
            }} 
            onClose={() => { setShowReg(false); }} 
            onViewLegal={(tab) => setShowLegal({ show: true, tab })}
          />
      )}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-sm animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

const NavButton: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; theme: Theme }> = ({ icon, label, active, onClick, theme }) => {
  const activeColor = theme === 'sunny' ? 'text-[#D98B79]' : theme === 'classic' ? 'text-[#5E7078]' : 'text-[#33FFFC]';
  const inactiveColor = theme === 'sunny' ? 'text-[#4A4238]/30' : theme === 'classic' ? 'text-[#3B474C]/30' : 'text-cyan-400/30';
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all w-16 ${active ? `${activeColor} scale-110` : `${inactiveColor}`}`}>
      <i className={`fas ${icon} text-lg md:text-xl`}></i>
      <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">{label}</span>
    </button>
  );
};

export default App;
