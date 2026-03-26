import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type GamePhase = 'incoming' | 'decision' | 'hitting' | 'reposition' | 'feedback';
type GridCell = { row: number, col: number } | null;
type Weapon = 'Serve' | 'Forehand' | 'Backhand' | 'Lob' | 'Dink';
type FeedbackResult = { success: boolean; title: string; message: string; sparks: number } | null;

type Scenario = {
  id: string;
  title: string;
  description: string;
  opponent1Pos: { top: string, left: string };
  opponent2Pos: { top: string, left: string };
  partnerPos: { top: string, left: string };
  ballStartPos: { top: string, left: string };
  playerStartPos: { top: number, left: number };
  evaluate: (weapon: Weapon, cell: NonNullable<GridCell>, finalPlayerPos: {top: number, left: number}) => NonNullable<FeedbackResult>;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'return_of_serve',
    title: 'Scenario 1: The Return of Serve',
    description: 'Salmon just served the ball to you. Edamame is waiting at the kitchen line. Where should you hit your return, and where should you move after?',
    opponent1Pos: { top: '15%', left: '25%' },
    opponent2Pos: { top: '20%', left: '75%' },
    partnerPos: { top: '75%', left: '25%' },
    ballStartPos: { top: '15%', left: '25%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (weapon, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (weapon === 'Serve') {
        return { success: false, title: 'Illegal Shot!', message: "You can't serve a return. That's a fault!", sparks: 0 };
      }

      if (cell.col === 2) {
        shotMsg = "You hit it right at Edamame, who was waiting at the kitchen line. Easy smash for them.";
      } else if (cell.row === 2) {
        shotMsg = "You hit it into the kitchen. Edamame stepped over and put it away.";
      } else if (cell.row === 1) {
        shotMsg = "Landing mid-court gives Salmon an easy 3rd shot drive.";
        shotScore = 5;
      } else {
        shotMsg = "Deep to the server! This keeps them back.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 80) {
        posMsg = "But you stayed at the baseline! You need to move up to the kitchen line after a return.";
        success = false;
      } else if (finalPlayerPos.top < 65) {
        posMsg = "And you moved up to the kitchen line! Perfect positioning.";
        shotScore += 10;
      } else {
        posMsg = "You moved up a bit, but try to get all the way to the kitchen line.";
        shotScore += 5;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'third_shot_drop',
    title: 'Scenario 2: Third Shot Drop',
    description: 'You are back at the baseline. Both opponents are at the kitchen line ready to attack. Hit a drop shot into the kitchen to neutralize them!',
    opponent1Pos: { top: '20%', left: '25%' },
    opponent2Pos: { top: '20%', left: '75%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '20%', left: '25%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (weapon, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (weapon === 'Serve') {
        return { success: false, title: 'Illegal Shot!', message: "You can't serve here.", sparks: 0 };
      }

      if (cell.row === 0 || cell.row === 1) {
        shotMsg = "You hit it high and deep. The opponents easily smashed it.";
      } else if (cell.row === 2) {
        shotMsg = "Perfect drop shot into the kitchen! They can't attack it.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 80) {
        posMsg = "You stayed back. Try to follow your drop shot to the kitchen line.";
        success = false;
      } else {
        posMsg = "Good job moving forward to follow your shot!";
        shotScore += 10;
      }

      return { success, title: success ? 'Masterful Drop!' : 'Smashed!', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'dink_battle',
    title: 'Scenario 3: Dink Battle',
    description: 'Everyone is at the kitchen line. Keep the ball low and unattackable in the kitchen.',
    opponent1Pos: { top: '20%', left: '25%' },
    opponent2Pos: { top: '20%', left: '75%' },
    partnerPos: { top: '60%', left: '25%' },
    ballStartPos: { top: '20%', left: '75%' },
    playerStartPos: { top: 60, left: 75 },
    evaluate: (weapon, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (weapon === 'Serve') {
        return { success: false, title: 'Illegal Shot!', message: "You can't serve here.", sparks: 0 };
      }

      if (cell.row === 0 || cell.row === 1) {
        shotMsg = "You popped it up deep! Easy put-away for the opponents.";
      } else if (cell.row === 2) {
        shotMsg = "Nice low dink into the kitchen. The rally continues.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 70) {
        posMsg = "Why did you back up? Stay at the kitchen line during a dink battle!";
        success = false;
      } else {
        posMsg = "Way to hold your ground at the line.";
        shotScore += 10;
      }

      return { success, title: success ? 'Solid Defense!' : 'Popped Up!', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  }
];


export default function BentoIQGame() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('incoming');
  const [gameFlow, setGameFlow] = useState<'serve' | '3rd_shot'>('serve');
  const [selectedCell, setSelectedCell] = useState<GridCell>(null);
  const [selectedPower, setSelectedPower] = useState<'soft' | 'mid' | 'high' | null>(null);
  const [selectedType, setSelectedType] = useState<Weapon | null>(null);
  const [selectedSpin, setSelectedSpin] = useState<'top' | 'back' | 'non' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [aimPos, setAimPos] = useState({ x: 50, y: 50 });
  const [sparksEarned, setSparksEarned] = useState(0);
  const [playerPos, setPlayerPos] = useState({ top: 92, left: 75 });
  const [ballPos, setBallPos] = useState({ top: '15%', left: '25%' });
  const [feedback, setFeedback] = useState<FeedbackResult>(null);

  const currentScenario = SCENARIOS[currentScenarioIndex];

  useEffect(() => {
    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;

    if (phase === 'incoming') {
      setBallPos(currentScenario.ballStartPos);
      setPlayerPos(currentScenario.playerStartPos);
      timeout1 = setTimeout(() => {
        setBallPos({ top: `${currentScenario.playerStartPos.top}%`, left: `${currentScenario.playerStartPos.left}%` });
      }, 100);
      timeout2 = setTimeout(() => {
        setPhase('decision');
      }, 1200);
    } else if (phase === 'hitting' && selectedCell) {
      const topPercent = 10 + (selectedCell.row * 13.33) + 6.66; 
      const leftPercent = 5 + (selectedCell.col * 30) + 15;
      setBallPos({ top: `${topPercent}%`, left: `${leftPercent}%` });
      
      timeout1 = setTimeout(() => {
        setPhase('reposition');
      }, 800);
    } else if (phase === 'reposition') {
      timeout1 = setTimeout(() => {
        setPhase('feedback');
      }, 2500); // 2.5 seconds to reposition
    } else if (phase === 'feedback') {
      const result = currentScenario.evaluate(selectedType!, selectedCell!, playerPos);
      setFeedback(result);
      setSparksEarned(s => s + result.sparks);
    }

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [phase, selectedCell, currentScenarioIndex]); // Removed playerPos to avoid resetting reposition timer

  const handleCellClick = (row: number, col: number) => {
    if (!selectedPower || !selectedType || !selectedSpin || isLocked) return;
    setSelectedCell({ row, col });
    setPhase('hitting');
  };

  const resetGame = () => {
    setSelectedCell(null);
    setSelectedPower(null);
    setSelectedType(null);
    setSelectedSpin(null);
    setIsLocked(false);
    setFeedback(null);
    setPhase('incoming');
  };

  const nextScenario = () => {
    setCurrentScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
    resetGame();
  };

  return (
    <div className="max-w-md mx-auto p-4 animate-in fade-in duration-500 pb-24">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-amber-200">
          <i className="fas fa-hard-hat"></i>
          Under Construction - Try it out!
        </div>
        <h2 className="text-3xl font-black text-stone-800 tracking-tight">2026 Pi1xia Digital IQ</h2>
        <p className="text-stone-500 font-bold text-xs uppercase tracking-widest mt-1">Outsmart the competition</p>
      </div>

      {/* The Bento Box (Court Container) */}
      <div className="relative w-full aspect-[1/2] bg-[#e8d5b5] rounded-[2.5rem] border-8 border-[#8b5a2b] shadow-2xl overflow-hidden p-2">
        
        {/* Left side controls */}
        <div className="absolute top-1/4 left-2 z-50 flex flex-col gap-2">
          <select 
            value={selectedPower || ''}
            onChange={(e) => phase === 'decision' && setSelectedPower(e.target.value as 'soft' | 'mid' | 'high')}
            disabled={phase !== 'decision'}
            className="bg-white text-stone-800 font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded-lg border-2 border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-20"
          >
            <option value="" disabled>Power</option>
            {['soft', 'mid', 'high'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select 
            value={selectedType || ''}
            onChange={(e) => phase === 'decision' && setSelectedType(e.target.value as Weapon)}
            disabled={phase !== 'decision'}
            className="bg-white text-stone-800 font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded-lg border-2 border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-20"
          >
            <option value="" disabled>Type</option>
            {['Serve', 'Lob', 'Forehand', 'Backhand', 'Dink'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select 
            value={selectedSpin || ''}
            onChange={(e) => phase === 'decision' && setSelectedSpin(e.target.value as 'top' | 'back' | 'non')}
            disabled={phase !== 'decision'}
            className="bg-white text-stone-800 font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded-lg border-2 border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-20"
          >
            <option value="" disabled>Spin</option>
            {['top', 'back', 'non'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Right side controls */}
        <div className="absolute top-1/4 right-2 z-50 flex flex-col gap-2 items-center">
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className={`bg-white text-stone-800 font-black text-xs uppercase tracking-widest px-3 py-2 rounded-xl border-2 shadow-sm ${isLocked ? 'border-lime-500' : 'border-stone-300'}`}
          >
            {isLocked ? '🔓' : '🔒'}
          </button>
          <div className="relative group">
            <button className="bg-white text-stone-800 font-black text-xs uppercase tracking-widest px-3 py-2 rounded-xl border-2 border-stone-300 shadow-sm">
              💡
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white p-3 rounded-xl border border-stone-200 shadow-lg text-[10px] text-stone-600 hidden group-hover:block z-50">
              {phase === 'decision' && !(selectedPower && selectedType && selectedSpin) ? "👆 First, select Power, Type, and Spin from the dropdowns!" : "👆 Click once to lock aim, click again to shoot!"}
            </div>
          </div>
        </div>
        
        {/* The Bamboo Mat (Court Surface) */}
        <div className="absolute top-[10%] left-[5%] w-[90%] h-[80%] border-4 border-[#a06b35] rounded-sm bg-[#e6c280]">
          
          {/* Center Net (Chopstick) */}
          <div className="absolute top-1/2 left-[-5%] w-[110%] h-3 bg-[#5c3a21] -translate-y-1/2 shadow-sm z-10 rounded-full"></div>
          
          {/* Top Kitchen Line */}
          <div className="absolute top-[35%] left-0 w-full h-1 bg-[#a06b35]"></div>
          {/* Bottom Kitchen Line */}
          <div className="absolute bottom-[35%] left-0 w-full h-1 bg-[#a06b35]"></div>
          
          {/* Top Centerline */}
          <div className="absolute top-0 left-1/2 w-1 h-[35%] bg-[#a06b35] -translate-x-1/2"></div>
          {/* Bottom Centerline */}
          <div className="absolute bottom-0 left-1/2 w-1 h-[35%] bg-[#a06b35] -translate-x-1/2"></div>

          {/* Top Kitchen Area (Color tint) */}
          <div className="absolute top-[35%] left-0 w-full h-[15%] bg-[#d2b48c]/40"></div>
          {/* Bottom Kitchen Area (Color tint) */}
          <div className="absolute bottom-[35%] left-0 w-full h-[15%] bg-[#d2b48c]/40"></div>
        </div>

        {/* --- CHARACTERS --- */}
        
        {/* Player 1 (User) - Onigiri */}
        <motion.div 
          className="absolute z-20"
          initial={false}
          animate={{ top: `${playerPos.top}%`, left: `${playerPos.left}%`, x: '-50%', y: '-50%' }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={{ width: '48px', height: '48px' }}
        >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Rice body */}
              <path d="M50 10 C 20 80, 10 90, 50 90 C 90 90, 80 80, 50 10 Z" fill="#ffffff" stroke="#ddd" strokeWidth="2"/>
              {/* Seaweed */}
              <rect x="35" y="70" width="30" height="20" fill="#2a2a2a" rx="2"/>
              {/* Eyes */}
              <circle cx="40" cy="55" r="4" fill="#2a2a2a"/>
              <circle cx="60" cy="55" r="4" fill="#2a2a2a"/>
              {/* Blush */}
              <circle cx="32" cy="60" r="3" fill="#ff9999" opacity="0.6"/>
              <circle cx="68" cy="60" r="3" fill="#ff9999" opacity="0.6"/>
            </svg>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-sm">YOU</div>
          </motion.div>

          {/* Player 2 (Partner) - Tamago (Bottom Left) */}
          <motion.div 
            className="absolute z-20"
            initial={false}
            animate={currentScenario.partnerPos}
            transition={{ duration: 1, type: 'spring' }}
            style={{ width: '48px', height: '48px', x: '-50%', y: '-50%' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Egg body */}
              <rect x="15" y="20" width="70" height="60" rx="15" fill="#fceea7" stroke="#e5c158" strokeWidth="2"/>
              {/* Seaweed belt */}
              <rect x="10" y="45" width="80" height="10" fill="#2a2a2a"/>
              {/* Eyes */}
              <circle cx="35" cy="35" r="4" fill="#2a2a2a"/>
              <circle cx="65" cy="35" r="4" fill="#2a2a2a"/>
            </svg>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-sm">PARTNER</div>
          </motion.div>

          {/* Opponent 1 - Salmon Sashimi (Top Left) */}
          <motion.div 
            className="absolute z-20"
            initial={false}
            animate={currentScenario.opponent1Pos}
            transition={{ duration: 1, type: 'spring' }}
            style={{ width: '48px', height: '48px', x: '-50%', y: '-50%' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Salmon body */}
              <rect x="20" y="15" width="60" height="70" rx="10" fill="#ff7e67" stroke="#e05a45" strokeWidth="2"/>
              {/* Fat lines */}
              <path d="M25 30 L75 40 M25 50 L75 60 M25 70 L75 80" stroke="#ffd3c9" strokeWidth="4" strokeLinecap="round"/>
              {/* Eyes */}
              <circle cx="35" cy="35" r="4" fill="#2a2a2a"/>
              <circle cx="65" cy="35" r="4" fill="#2a2a2a"/>
              {/* Angry eyebrows */}
              <path d="M30 25 L40 30 M70 25 L60 30" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </motion.div>

          {/* Opponent 2 - Edamame (Top Right) */}
          <motion.div 
            className="absolute z-20"
            initial={false}
            animate={currentScenario.opponent2Pos}
            transition={{ duration: 1, type: 'spring' }}
            style={{ width: '48px', height: '48px', x: '-50%', y: '-50%' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Pod */}
              <path d="M20 20 Q 80 10, 80 80 Q 20 90, 20 20 Z" fill="#7bc043" stroke="#5a962e" strokeWidth="2"/>
              {/* Beans */}
              <circle cx="40" cy="35" r="8" fill="#98d665"/>
              <circle cx="55" cy="50" r="8" fill="#98d665"/>
              <circle cx="65" cy="65" r="8" fill="#98d665"/>
              {/* Eyes on middle bean */}
              <circle cx="52" cy="48" r="2" fill="#2a2a2a"/>
              <circle cx="58" cy="48" r="2" fill="#2a2a2a"/>
            </svg>
          </motion.div>

          {/* The Ball (Pickleball) */}
          <motion.div 
            className="absolute z-30"
            initial={false}
            animate={ballPos}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
            style={{ width: '28px', height: '28px', x: '-50%', y: '-50%' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
              <circle cx="50" cy="50" r="45" fill="#bef264" stroke="#65a30d" strokeWidth="4"/>
              <circle cx="35" cy="35" r="5" fill="#65a30d" opacity="0.6"/>
              <circle cx="65" cy="35" r="5" fill="#65a30d" opacity="0.6"/>
              <circle cx="50" cy="50" r="5" fill="#65a30d" opacity="0.6"/>
              <circle cx="35" cy="65" r="5" fill="#65a30d" opacity="0.6"/>
              <circle cx="65" cy="65" r="5" fill="#65a30d" opacity="0.6"/>
              <circle cx="50" cy="20" r="4" fill="#65a30d" opacity="0.6"/>
              <circle cx="50" cy="80" r="4" fill="#65a30d" opacity="0.6"/>
              <circle cx="20" cy="50" r="4" fill="#65a30d" opacity="0.6"/>
              <circle cx="80" cy="50" r="4" fill="#65a30d" opacity="0.6"/>
            </svg>
          </motion.div>

          {/* Indication Line */}
          {phase === 'decision' && (
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-25">
              <line x1={ballPos.left} y1={ballPos.top} x2={`${aimPos.x}%`} y2={`${aimPos.y}%`} stroke="white" strokeWidth="3" strokeDasharray="6 6" className="transition-all duration-75 ease-out" />
              <circle cx={`${aimPos.x}%`} cy={`${aimPos.y}%`} r="4" fill="none" stroke="white" strokeWidth="3" strokeDasharray="6 6" className="transition-all duration-75 ease-out" />
            </svg>
          )}

          {/* Tactical Grid Overlay (Phase 1) */}
          {(phase === 'decision' || phase === 'hitting' || phase === 'feedback') && (
            <div className="absolute top-[10%] left-[5%] w-[90%] h-[40%] grid grid-cols-3 grid-rows-3 z-40 pointer-events-none">
              {[0, 1, 2].map(row => (
                [0, 1, 2].map(col => {
                  const isHovered = phase === 'decision' && 
                                    aimPos.y >= 10 + row * (40/3) && aimPos.y < 10 + (row+1) * (40/3) &&
                                    aimPos.x >= 5 + col * (90/3) && aimPos.x < 5 + (col+1) * (90/3);
                  const isSelected = selectedCell?.row === row && selectedCell?.col === col;
                  const showHighlight = isSelected || (isHovered && isLocked);
                  const showHover = isHovered && !isLocked && selectedPower && selectedType && selectedSpin;
                  return (
                    <div
                      key={`r${row}c${col}`}
                      className={`
                        border border-white/10 transition-all duration-200
                        ${showHover ? 'bg-white/20 border-white/50' : ''}
                        ${showHighlight ? 'bg-lime-400/60 border-lime-400 shadow-[inset_0_0_20px_rgba(163,230,53,0.5)]' : ''}
                      `}
                    />
                  );
                })
              ))}
            </div>
          )}

          {/* Player Movement Area */}
          {(phase === 'decision' || phase === 'reposition') && (
            <div 
              className="absolute top-0 left-0 w-full h-full z-30 cursor-crosshair"
              onMouseMove={(e) => {
                if (phase === 'decision' && !isLocked) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAimPos({ 
                    x: ((e.clientX - rect.left) / rect.width) * 100, 
                    y: ((e.clientY - rect.top) / rect.height) * 100 
                  });
                }
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const topPercent = (y / rect.height) * 100;
                const leftPercent = (x / rect.width) * 100;
                
                if (phase === 'decision') {
                  if (topPercent > 50) {
                    // Move player only if clicking on their side
                    setPlayerPos({ top: topPercent, left: leftPercent });
                    setBallPos({ top: `${topPercent}%`, left: `${leftPercent}%` });
                  } else {
                    // Clicking on opponent side
                    if (!selectedPower || !selectedType || !selectedSpin) return;

                    if (!isLocked) {
                      setIsLocked(true);
                      setAimPos({ x: leftPercent, y: topPercent });
                    } else {
                      let row = Math.floor((aimPos.y - 10) / (40 / 3));
                      let col = Math.floor((aimPos.x - 5) / (90 / 3));
                      row = Math.max(0, Math.min(2, row));
                      col = Math.max(0, Math.min(2, col));
                      setSelectedCell({ row, col });
                      setPhase('hitting');
                    }
                  }
                } else if (phase === 'reposition') {
                  setPlayerPos({ top: topPercent, left: leftPercent });
                }
              }}
            >
              {phase === 'decision' && !(selectedPower && selectedType && selectedSpin) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-stone-800/80 text-white text-[12px] uppercase tracking-widest font-black px-6 py-3 rounded-full animate-pulse shadow-lg">
                    Tap your side to move
                  </span>
                </div>
              )}
            </div>
          )}

      </div>
      
      {/* Game Content */}
      <div className="mt-4 bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm">
        {phase === 'incoming' ? (
          <div className="text-center p-5 bg-stone-50 rounded-2xl border-2 border-stone-100">
            <p className="font-black text-stone-800 text-sm animate-pulse">Incoming shot...</p>
          </div>
        ) : phase === 'hitting' ? (
          <div className="text-center p-5 bg-stone-50 rounded-2xl border-2 border-stone-100">
            <p className="font-black text-stone-800 text-sm animate-pulse">Hitting...</p>
          </div>
        ) : phase === 'reposition' ? (
          <div className="text-center p-5 bg-amber-50 rounded-2xl border-2 border-amber-200">
            <p className="font-black text-amber-800 text-sm animate-pulse">
              👆 Quick! Tap your side to reposition for the next shot!
            </p>
          </div>
        ) : phase === 'feedback' && feedback ? (
          <div className={`p-5 rounded-2xl border-2 animate-in zoom-in-95 duration-300 ${feedback.success ? 'bg-lime-50 border-lime-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${feedback.success ? 'bg-lime-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
                <i className={`fas ${feedback.success ? 'fa-check' : 'fa-xmark'} text-lg`}></i>
              </div>
              <div>
                <h4 className={`font-black uppercase tracking-widest text-xs mb-1 ${feedback.success ? 'text-green-900' : 'text-red-900'}`}>
                  {feedback.title}
                </h4>
                <p className={`text-xs font-medium leading-relaxed ${feedback.success ? 'text-green-800' : 'text-red-800'}`}>
                  {feedback.message}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={resetGame}
                className="flex-1 bg-stone-200 text-stone-700 font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-stone-300 transition-colors"
              >
                Retry
              </button>
              <button 
                onClick={nextScenario}
                className="flex-1 bg-stone-800 text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-stone-700 transition-colors"
              >
                Next Scenario
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Contact Section */}
      <div className="mt-8 bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
        <h2 className="font-black text-stone-800 text-4xl leading-tight mb-4">
          Questions?<br/>Let's Chat.
        </h2>
        <p className="text-stone-500 font-medium text-sm leading-relaxed mb-8 max-w-md">
          Whether you're a club director, a coach, or just getting started, we're here to help you get the most out of Pi1Xia.
        </p>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center bg-white shrink-0">
            <i className="fas fa-envelope text-stone-400"></i>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Email Us Directly
            </div>
            <a href="mailto:ascepd.pi1xia@gmail.com" className="text-stone-800 font-bold text-sm hover:text-lime-600 transition-colors">
              ascepd.pi1xia@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
