import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

type GamePhase = 'incoming' | 'decision' | 'hitting' | 'reposition' | 'feedback' | 'completed';
type GridCell = { row: number, col: number } | null;
type ShotType = 'Drive' | 'Drop' | 'Lob' | 'Dink' | 'Volley' | 'Block';
type StrokeSide = 'Forehand' | 'Backhand';
type PaddleAngle = 'Down/Closed' | 'Up/Open' | 'Neutral';
type PowerLevel = 'soft' | 'mid' | 'high';
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
  evaluate: (type: ShotType | null, side: StrokeSide | null, angle: PaddleAngle | null, power: PowerLevel | null, cell: NonNullable<GridCell>, finalPlayerPos: {top: number, left: number}) => NonNullable<FeedbackResult>;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'return_of_serve',
    title: 'Scenario 1: The Return of Serve',
    description: 'Salmon serves to you, Edmanme is waiting at the kitchen, where to return the ball and where should you go, after you return the ball?',
    opponent1Pos: { top: '15%', left: '25%' },
    opponent2Pos: { top: '20%', left: '75%' },
    partnerPos: { top: '75%', left: '25%' },
    ballStartPos: { top: '15%', left: '25%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 0) {
        shotMsg = "You need to return the ball deep to the baseline to keep Salmon back!";
      } else if (type !== 'Drive') {
        shotMsg = "A Drive is the best shot type for a deep, powerful return.";
      } else if (power !== 'high') {
        shotMsg = "A deep return needs high power to push the opponent back!";
      } else if (side !== 'Forehand') {
        shotMsg = "Try using your Forehand for a stronger, more controlled deep return here!";
      } else if (angle !== 'Neutral') {
        shotMsg = "Keep your paddle angle Neutral for a flat, driving return.";
      } else {
        shotMsg = "Perfect! You hit a deep forehand drive to keep them back.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "But you stayed back! You need to move up to the kitchen line after returning.";
        success = false;
      } else {
        posMsg = "And you immediately moved up to the kitchen line to take control of the net!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'third_shot_drop',
    title: 'Scenario 2: Third Shot Drop',
    description: 'You are back at the baseline. Both opponents are at the kitchen line ready to attack. how to hit the ball where to drop the ball so they can\'t smash it, and follow up where should you stand.',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '32%', left: '25%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 2) {
         shotMsg = "You need to drop the ball short into the kitchen (bottom row) so they can't smash it.";
      } else if (type !== 'Drop') {
         shotMsg = "This is a classic Third Shot Drop scenario. Select 'Drop'!";
      } else if (power !== 'soft') {
        shotMsg = "A drop shot requires soft power to land gently in the kitchen.";
      } else if (angle !== 'Up/Open') {
        shotMsg = "Use an Up/Open paddle angle to lift the ball over the net and drop it in.";
      } else {
        shotMsg = "Perfect soft drop shot! You neutralized their attack.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "But you stayed back! You need to move up to the kitchen line.";
        success = false;
      } else {
        posMsg = "And you immediately moved up to the kitchen line!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'dink_battle',
    title: 'Scenario 3: Dink Battle',
    description: 'Everyone is up at the kitchen line, where to shot the ball and what type of power and spin should you apply?',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '60%', left: '25%' },
    ballStartPos: { top: '32%', left: '75%' },
    playerStartPos: { top: 60, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 2) {
        shotMsg = "Keep the ball in the kitchen (bottom row) during a dink battle!";
      } else if (type !== 'Dink') {
        shotMsg = "You should select 'Dink' for a dink battle.";
      } else if (power !== 'soft') {
        shotMsg = "A dink requires soft power.";
      } else if (angle !== 'Up/Open') {
        shotMsg = "Use an Up/Open paddle angle to gently lift the dink over the net.";
      } else {
        shotMsg = "Great dink! You kept the rally going safely.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Don't back up! Stay at the kitchen line during a dink battle.";
        success = false;
      } else {
        posMsg = "Good job holding your ground at the kitchen line.";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'middle_hole_threader',
    title: 'Scenario 4: The "Middle Hole" Threader',
    description: 'Both opponents are at the kitchen, but they are spread too wide, what is you best choice to shot the ball, so the opponents clash paddles or both hesitate',
    opponent1Pos: { top: '32%', left: '15%' },
    opponent2Pos: { top: '32%', left: '85%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '32%', left: '85%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.col !== 1) {
        shotMsg = "Aim right down the middle (center column) to cause confusion!";
      } else if (type !== 'Drive') {
        shotMsg = "A Drive is the best shot to punch it through the gap quickly.";
      } else if (power !== 'high') {
        shotMsg = "You need high power to get it past them before they react.";
      } else if (side !== 'Forehand') {
        shotMsg = "Use your Forehand for maximum power down the middle.";
      } else if (angle !== 'Neutral') {
        shotMsg = "Keep the paddle angle Neutral to drive the ball flat and fast.";
      } else {
        shotMsg = "Perfect! You threaded the needle right down the middle, causing them to clash paddles!";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Make sure to move up to the kitchen line to follow your attack!";
        success = false;
      } else {
        posMsg = "And you moved up to the kitchen line to capitalize!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'short_long_yoyo',
    title: 'Scenario 5: "Short-Long" Yo-Yo',
    description: 'The opponent is standing at the front of kitchen line, and hit everything out of the air. You and your partner are at the baseline running. When you get the ball, how should you return the ball to avoid the opponents leaning forward at the kitchen for dinks and get jammed by the deep ball?',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '32%', left: '25%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 0) {
        shotMsg = "Aim deep close to the baseline (top row) to jam them!";
      } else if (type !== 'Drive') {
        shotMsg = "A Drive is effective here to keep the ball low and fast.";
      } else if (power !== 'mid') {
        shotMsg = "Mid power is perfect—enough to jam them, but not so hard it goes out.";
      } else if (angle !== 'Neutral') {
        shotMsg = "A Neutral paddle angle keeps the trajectory flat.";
      } else {
        shotMsg = "Perfect! You hit a deep Drive with mid power, jamming the opponents at the kitchen line!";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Try to move up to the kitchen line after a good shot to take control!";
        success = false;
      } else {
        posMsg = "And you moved up to the kitchen line!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'inside_out_redirect',
    title: 'Scenario 6: The "Inside-Out" Redirect',
    description: 'Both you and your opponents are in front of the kitchen line dink (cross-court) rally (diagonal), how to win this if you have a sudden chance to hit the ball back?',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '60%', left: '25%' },
    ballStartPos: { top: '32%', left: '25%' },
    playerStartPos: { top: 60, left: 85 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.col !== 2) {
        shotMsg = "Aim straight ahead (right column) to change the direction of the cross-court rally!";
      } else if (type !== 'Drive') {
        shotMsg = "A Drive is great for a sudden redirect attack.";
      } else if (side !== 'Backhand') {
        shotMsg = "Since the ball is coming to your left, use a Backhand to redirect it down the line.";
      } else if (power !== 'mid') {
        shotMsg = "Mid power gives you the control needed for this precision redirect.";
      } else if (angle !== 'Neutral') {
        shotMsg = "A Neutral paddle angle keeps the shot flat and offensive.";
      } else {
        shotMsg = "Perfect! You hit a straight Backhand Drive, catching them off guard!";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Don't back up! Stay at the kitchen line.";
        success = false;
      } else {
        posMsg = "Good job holding your ground at the kitchen line.";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'body_smash_defense',
    title: 'Scenario 7: "Body Smash" Defense',
    description: 'Both opponents are standing in front of the kitchen line, one is about to smash an overhead ball directly at you. What do you need to prepare your return?',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '60%', left: '25%' },
    ballStartPos: { top: '32%', left: '75%' },
    playerStartPos: { top: 60, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 2) {
        shotMsg = "Aim to drop the ball short into the kitchen (bottom row) to neutralize the smash!";
      } else if (type !== 'Block') {
        shotMsg = "When facing a smash, a Block is your best defense.";
      } else if (side !== 'Forehand') {
        shotMsg = "Use your Forehand to block this specific shot.";
      } else if (angle !== 'Down/Closed') {
        shotMsg = "Keep the paddle angle Down/Closed to keep the blocked ball low.";
      } else if (power !== 'soft') {
        shotMsg = "Use soft power to absorb the pace of the smash and drop it short.";
      } else {
        shotMsg = "Perfect! You successfully blocked the smash and reset the point.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Hold your ground at the kitchen line, don't back up!";
        success = false;
      } else {
        posMsg = "Great job holding your ground!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'feet_feeder',
    title: 'Scenario 8: "Feet-Feeder"',
    description: 'You are at the baseline, both opponents are at the kitchen line. How should you return the ball to make your opponents return the ball "up"?',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '32%', left: '75%' },
    playerStartPos: { top: 92, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 2 || cell.col !== 2) {
        shotMsg = "Aim for your direct opponent's shoelaces at the kitchen line (bottom right cell)!";
      } else if (type !== 'Drive') {
        shotMsg = "A Drive is effective here to keep the ball dipping fast.";
      } else if (side !== 'Forehand') {
        shotMsg = "Use your Forehand to drive the ball at their feet.";
      } else if (angle !== 'Down/Closed') {
        shotMsg = "Keep the paddle angle Down/Closed to ensure the ball dips quickly.";
      } else if (power !== 'soft') {
        shotMsg = "Use soft power so the ball drops at their feet instead of popping up or going long.";
      } else {
        shotMsg = "Perfect! You hit a dipping drive right at their shoelaces, forcing them to pop it up.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Make sure to move up to the kitchen line after hitting this shot!";
        success = false;
      } else {
        posMsg = "And you moved up to the kitchen line to put away the pop-up!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'shake_and_bake',
    title: 'Scenario 9: "Shake-and-Bake" Finish',
    description: 'Your partner just hit a hard drive, the opponent "blocks" it, and the ball is floating high in the middle. How do you clean up the point by hitting the ball back?',
    opponent1Pos: { top: '32%', left: '25%' },
    opponent2Pos: { top: '32%', left: '75%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '32%', left: '50%' },
    playerStartPos: { top: 60, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 0) {
        shotMsg = "Aim for the open back court (top row) to hit it past the opponents!";
      } else if (type !== 'Drive') {
        shotMsg = "A Drive is perfect to smash this high floating ball.";
      } else if (side !== 'Forehand') {
        shotMsg = "Use your Forehand for maximum power on the put-away.";
      } else if (angle !== 'Down/Closed') {
        shotMsg = "Keep the paddle angle Down/Closed to smash the ball downwards into the court.";
      } else if (power !== 'high') {
        shotMsg = "Use high power to finish the point decisively!";
      } else {
        shotMsg = "Perfect! You executed the Shake-and-Bake finish flawlessly.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Make sure you stay up at the kitchen line!";
        success = false;
      } else {
        posMsg = "And you held your ground at the kitchen line.";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  },
  {
    id: 'short_hop_reset',
    title: 'Scenario 10: "Short-Hop" Reset',
    description: 'You are caught in "No man\'s land", a hard drive is coming at your feet. Both opponents are standing at the baseline. How do you absorb all the speed so the ball can drop short into the kitchen area?',
    opponent1Pos: { top: '15%', left: '25%' },
    opponent2Pos: { top: '15%', left: '75%' },
    partnerPos: { top: '92%', left: '25%' },
    ballStartPos: { top: '15%', left: '75%' },
    playerStartPos: { top: 75, left: 75 },
    evaluate: (type, side, angle, power, cell, finalPlayerPos) => {
      let shotScore = 0;
      let shotMsg = '';
      let posMsg = '';
      let success = false;

      if (cell.row !== 2) {
        shotMsg = "Aim to drop the ball short into the kitchen (bottom row) where there are no opponents!";
      } else if (type !== 'Drop') {
        shotMsg = "A Drop shot is needed to reset the point and absorb the pace.";
      } else if (side !== 'Forehand') {
        shotMsg = "Use your Forehand to dig out this low ball.";
      } else if (angle !== 'Neutral') {
        shotMsg = "Keep the paddle angle Neutral to block the ball softly over the net without popping it up.";
      } else if (power !== 'soft') {
        shotMsg = "Use soft power to absorb the speed of the hard drive.";
      } else {
        shotMsg = "Perfect! You absorbed the pace and dropped it safely into the kitchen.";
        shotScore = 15;
        success = true;
      }

      if (finalPlayerPos.top > 65) {
        posMsg = "Make sure to move up to the kitchen line after hitting the reset!";
        success = false;
      } else {
        posMsg = "And you successfully moved up to the kitchen line!";
        shotScore += 10;
      }

      return { success, title: success ? 'Great Play!' : 'Needs Work', message: `${shotMsg} ${posMsg}`, sparks: shotScore };
    }
  }
];


export default function BentoIQGame() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(5);
  const [phase, setPhase] = useState<GamePhase>('incoming');
  const [gameFlow, setGameFlow] = useState<'serve' | '3rd_shot'>('serve');
  const [selectedCell, setSelectedCell] = useState<GridCell>(null);
  const [selectedType, setSelectedType] = useState<ShotType | null>(null);
  const [selectedSide, setSelectedSide] = useState<StrokeSide | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<PaddleAngle | null>(null);
  const [selectedPower, setSelectedPower] = useState<PowerLevel | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [aimPos, setAimPos] = useState({ x: 50, y: 50 });
  const [sparksEarned, setSparksEarned] = useState(50);
  const [levelsPassed, setLevelsPassed] = useState(0);
  const [playerPos, setPlayerPos] = useState({ top: 92, left: 75 });
  const [ballPos, setBallPos] = useState({ top: '15%', left: '25%' });
  const [feedback, setFeedback] = useState<FeedbackResult>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1c1917', // stone-900 to match the overlay
        scale: 2, // better quality
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'pi1xia-results.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Pi1xia Digital IQ',
              text: `I just passed ${levelsPassed} levels and earned ${sparksEarned} sparks in the 2026 Pickleball Digital Open Game!`,
              files: [file]
            });
          } catch (err) {
            console.error('Share failed:', err);
          }
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pi1xia-results.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

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
      }, 1500);
    } else if (phase === 'feedback') {
      const result = currentScenario.evaluate(selectedType, selectedSide, selectedAngle, selectedPower, selectedCell!, playerPos);
      setFeedback(result);
      if (!result.success) {
        setSparksEarned(s => Math.max(0, s - 10));
      } else {
        setLevelsPassed(l => l + 1);
      }
    }

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [phase, selectedCell, currentScenarioIndex]); // Removed playerPos to avoid resetting reposition timer

  const handleCellClick = (row: number, col: number) => {
    if (!selectedType || !selectedSide || !selectedAngle || !selectedPower || isLocked) return;
    setSelectedCell({ row, col });
    setPhase('hitting');
  };

  const nextScenario = () => {
    if (currentScenarioIndex + 1 >= SCENARIOS.length || sparksEarned <= 0) {
      setPhase('completed');
      return;
    }
    const nextIndex = currentScenarioIndex + 1;
    setCurrentScenarioIndex(nextIndex);
    setSelectedCell(null);
    setSelectedType(null);
    setSelectedSide(null);
    setSelectedAngle(null);
    setSelectedPower(null);
    setIsLocked(false);
    setFeedback(null);
    setBallPos(SCENARIOS[nextIndex].ballStartPos);
    setPlayerPos(SCENARIOS[nextIndex].playerStartPos);
    setPhase('incoming');
  };

  return (
    <div className="max-w-md mx-auto p-4 animate-in fade-in duration-500 pb-24">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest mb-3 border border-amber-200 shadow-sm">
          <i className="fas fa-bolt text-amber-500"></i>
          {sparksEarned}/50 Sparks
        </div>
        <h2 className="text-3xl font-black text-stone-800 tracking-tight">2026 Pi1xia Digital IQ</h2>
        <p className="text-stone-500 font-bold text-xs uppercase tracking-widest mt-1">Outsmart the competition</p>
      </div>

      {/* The Bento Box (Court Container) */}
      <div className="relative w-full aspect-[1/2] bg-[#e8d5b5] rounded-[2.5rem] border-8 border-[#8b5a2b] shadow-2xl overflow-hidden p-2">
        
        {/* Scenario Title Overlay */}
        {phase !== 'completed' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <span className="bg-stone-800/60 text-white/90 text-[12px] uppercase tracking-widest font-black px-6 py-3 rounded-full shadow-sm backdrop-blur-sm">
              {currentScenario.title.split(': ')[1] || currentScenario.title}
            </span>
          </div>
        )}

        {/* Left side controls */}
        <div className="absolute top-[25%] left-1 z-50 flex flex-col gap-1">
          <select 
            value={selectedType || ''}
            onChange={(e) => phase === 'decision' && setSelectedType(e.target.value as ShotType)}
            disabled={phase !== 'decision'}
            className="bg-white/90 backdrop-blur-sm text-stone-800 font-black text-[8px] uppercase tracking-widest px-1 py-1 rounded border border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-[55px] text-center"
          >
            <option value="" disabled>Type</option>
            {['Drive', 'Drop', 'Lob', 'Dink', 'Volley', 'Block'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select 
            value={selectedSide || ''}
            onChange={(e) => phase === 'decision' && setSelectedSide(e.target.value as StrokeSide)}
            disabled={phase !== 'decision'}
            className="bg-white/90 backdrop-blur-sm text-stone-800 font-black text-[8px] uppercase tracking-widest px-1 py-1 rounded border border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-[55px] text-center"
          >
            <option value="" disabled>Side</option>
            {['Forehand', 'Backhand'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select 
            value={selectedAngle || ''}
            onChange={(e) => phase === 'decision' && setSelectedAngle(e.target.value as PaddleAngle)}
            disabled={phase !== 'decision'}
            className="bg-white/90 backdrop-blur-sm text-stone-800 font-black text-[8px] uppercase tracking-widest px-1 py-1 rounded border border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-[55px] text-center"
          >
            <option value="" disabled>Angle</option>
            {['Down/Closed', 'Up/Open', 'Neutral'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select 
            value={selectedPower || ''}
            onChange={(e) => phase === 'decision' && setSelectedPower(e.target.value as PowerLevel)}
            disabled={phase !== 'decision'}
            className="bg-white/90 backdrop-blur-sm text-stone-800 font-black text-[8px] uppercase tracking-widest px-1 py-1 rounded border border-stone-300 shadow-sm focus:outline-none focus:border-indigo-500 w-[55px] text-center"
          >
            <option value="" disabled>Power</option>
            {['soft', 'mid', 'high'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Right side controls */}
        <div className="absolute top-[25%] right-1 z-50 flex flex-col gap-1 items-center">
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className={`bg-white/90 backdrop-blur-sm text-stone-800 font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded border shadow-sm ${isLocked ? 'border-lime-500' : 'border-stone-300'}`}
          >
            {isLocked ? '🔓' : '🔒'}
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowHint(!showHint)}
              className={`bg-white/90 backdrop-blur-sm text-stone-800 font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded border shadow-sm ${showHint ? 'border-amber-400 bg-amber-50' : 'border-stone-300'}`}
            >
              💡
            </button>
            {showHint && (
              <div className="absolute right-0 mt-1 w-48 bg-white/95 backdrop-blur-md p-3 rounded-lg border border-amber-200 shadow-xl text-[9px] text-stone-700 z-50 font-medium leading-relaxed">
                <div className="font-black text-amber-600 mb-1 uppercase tracking-wider text-[8px]">Scenario Hint</div>
                {currentScenario.description}
                <div className="mt-1 pt-1 border-t border-amber-100 text-[8px] text-stone-500 italic">
                  {phase === 'decision' && !(selectedType && selectedSide && selectedAngle && selectedPower) ? "👆 First, select Type, Side, Angle, and Power from the dropdowns!" : "👆 Click once to aim, click again to shoot!"}
                </div>
              </div>
            )}
          </div>
          {phase === 'reposition' && (
            <button 
              onClick={() => setPhase('feedback')}
              className="bg-amber-500/90 backdrop-blur-sm text-white font-black uppercase tracking-widest text-[8px] px-2 py-1 rounded hover:bg-amber-600 transition-colors shadow-md animate-bounce"
            >
              GO!
            </button>
          )}
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
          transition={{ duration: 1.0, type: 'spring' }}
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
            transition={{ duration: 1.5, type: 'spring', bounce: 0.2 }}
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
                  const showHover = isHovered && !isLocked && selectedType && selectedSide && selectedAngle && selectedPower;
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
          {(phase === 'decision' || phase === 'hitting' || phase === 'reposition') && (
            <div 
              className="absolute top-0 left-0 w-full h-full z-30 cursor-crosshair"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const topPercent = (y / rect.height) * 100;
                const leftPercent = (x / rect.width) * 100;
                
                if (phase === 'decision') {
                  if (topPercent > 50) {
                    // Allow moving player before shooting
                    setPlayerPos({ top: topPercent, left: leftPercent });
                    return;
                  } else {
                    // Clicking on opponent side
                    const dist = Math.sqrt(Math.pow(aimPos.x - leftPercent, 2) + Math.pow(aimPos.y - topPercent, 2));
                    const isSameSpot = isLocked && dist < 5; // within 5% distance
                    
                    if (!isLocked || !isSameSpot) {
                      setIsLocked(true);
                      setAimPos({ x: leftPercent, y: topPercent });
                    } else {
                      if (!selectedType || !selectedSide || !selectedAngle || !selectedPower) {
                        alert("Please select Type, Side, Angle, and Power before shooting!");
                        return;
                      }
                      let row = Math.floor((aimPos.y - 10) / (40 / 3));
                      let col = Math.floor((aimPos.x - 5) / (90 / 3));
                      row = Math.max(0, Math.min(2, row));
                      col = Math.max(0, Math.min(2, col));
                      setSelectedCell({ row, col });
                      setPhase('hitting');
                    }
                  }
                } else if (phase === 'hitting' || phase === 'reposition') {
                  if (topPercent > 50) {
                    setPlayerPos({ top: topPercent, left: leftPercent });
                  }
                }
              }}
            >

            </div>
          )}

        {/* Winner's Card Overlay */}
        {phase === 'completed' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 text-center">
            <div ref={cardRef} className="max-w-sm w-full relative flex flex-col items-center bg-stone-900/95 p-6 rounded-3xl border border-white/10 shadow-2xl">
              
              <h3 className="text-lg font-black bg-gradient-to-r from-lime-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent uppercase tracking-tight mb-1 drop-shadow-lg">
                2026 Pickleball Digital Open Game
              </h3>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-4 drop-shadow-md">(Test Mode)</p>
              
              <div className="relative w-24 h-24 mx-auto mb-2 mt-2">
                {/* Stars Arch around the head */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(5)].map((_, i) => {
                    const angle = (i * 36) - 72; // -72, -36, 0, 36, 72 degrees
                    const radius = 65; // distance from center
                    const x = Math.sin(angle * Math.PI / 180) * radius;
                    const y = -Math.cos(angle * Math.PI / 180) * radius;
                    const isEarned = i < Math.floor(sparksEarned / 10);
                    return (
                      <i 
                        key={i} 
                        className={`fas fa-star absolute text-xl transition-all duration-500 ${isEarned ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'text-stone-600/40'}`}
                        style={{ 
                          top: '50%', left: '50%', 
                          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle}deg)` 
                        }}
                      ></i>
                    );
                  })}
                </div>
                
                <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-pulse blur-xl"></div>
                <div className="absolute inset-2 bg-stone-800 rounded-full flex items-center justify-center border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] overflow-hidden">
                  <i className="fas fa-user-astronaut text-4xl text-amber-400"></i>
                </div>
              </div>
              
              <p className="text-[8px] text-stone-400 mb-4 max-w-[200px] leading-tight">
                If registered, your profile picture and name will appear here.
              </p>
              
              <div className="flex justify-center gap-4 mb-4 bg-stone-800/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md w-full">
                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-white drop-shadow-md">{levelsPassed}</div>
                  <div className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mt-1">Levels Passed</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-white drop-shadow-md">{sparksEarned}</div>
                  <div className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mt-1">Sparks Left</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 w-full">
                <div className="bg-white p-1.5 rounded-lg shadow-sm shrink-0">
                  <QRCodeSVG value={window.location.href} size={48} />
                </div>
                <button 
                  onClick={handleShare}
                  className="flex-1 bg-gradient-to-r from-lime-500 to-emerald-500 text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform flex items-center justify-center gap-2 h-[60px]"
                >
                  <i className="fas fa-share-nodes"></i> Share Results
                </button>
              </div>
              
              <div className="pt-2 w-full flex flex-col items-center border-t border-white/10">
                {/* Pi1xia Logo Approximation */}
                <div className="flex items-center justify-center gap-0.5 mb-1 relative mt-2">
                  <span className="text-2xl font-black bg-gradient-to-br from-amber-300 via-red-400 to-slate-400 bg-clip-text text-transparent italic -ml-2">P</span>
                  <div className="flex items-baseline text-xl font-black tracking-tighter">
                    <div className="relative">
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400/80"></span>
                      <span className="text-slate-400">i</span>
                    </div>
                    <span className="text-amber-500/80">1</span>
                    <span className="text-amber-600/80">x</span>
                    <div className="relative">
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400/80"></span>
                      <span className="text-amber-500/80">i</span>
                    </div>
                    <span className="text-amber-400/80">a</span>
                  </div>
                </div>
                
                <p className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">ascepd.com</p>
                <p className="text-[7px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">© ASCEPD Pi1xia App</p>
              </div>
            </div>
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
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${feedback.success ? 'bg-lime-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
                <i className={`fas ${feedback.success ? 'fa-check' : 'fa-xmark'} text-lg`}></i>
              </div>
              <div>
                <h4 className={`font-black uppercase tracking-widest text-xs ${feedback.success ? 'text-green-900' : 'text-red-900'}`}>
                  {feedback.title}
                </h4>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
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
