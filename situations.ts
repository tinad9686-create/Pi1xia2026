export type ErrorCategory = 'Technical' | 'Spatial' | 'Communication';

export interface CourtCoordinates {
  playerPos: { x: number; y: number };
  partnerPos?: { x: number; y: number };
  ballPos: { x: number; y: number };
}

export interface Situation {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  description: string;
  highIqChoice: string;
  deathChoice: string;
  penaltyValue: number;
  errorCategory: ErrorCategory;
  courtCoords: CourtCoordinates;
}

export const DIRTY_DOZEN: Situation[] = [
  // LEVEL 1: The Fundamentals
  {
    id: 'deep-return',
    level: 1,
    title: 'The "Deep Return" 3rd Shot',
    description: 'The incoming return of serve is deep and heavy at your feet.',
    highIqChoice: 'Hit a high-arc drop into the kitchen to buy time.',
    deathChoice: 'Drive it hard into the net or hit a high-speed "out" ball.',
    penaltyValue: 15,
    errorCategory: 'Technical',
    courtCoords: { playerPos: { x: 50, y: 90 }, ballPos: { x: 50, y: 80 } }
  },
  {
    id: 'shoulder-high',
    level: 1,
    title: 'The "Shoulder-High" Drive',
    description: 'The opponent smashes a fast drive right at your chest/shoulder level.',
    highIqChoice: 'Duck! Drop your paddle and let it fly out of bounds.',
    deathChoice: 'Reach out and "block" a ball that was clearly going long.',
    penaltyValue: 15,
    errorCategory: 'Technical',
    courtCoords: { playerPos: { x: 50, y: 50 }, ballPos: { x: 50, y: 40 } }
  },
  {
    id: 'short-serve',
    level: 1,
    title: 'The "Short Serve" Recovery',
    description: 'Your partner accidentally hits a short serve that the opponent is rushing to attack.',
    highIqChoice: 'Immediately yell "Yours!" or "Watch out!" and adjust positioning.',
    deathChoice: 'Both players freeze silently at the baseline like deer in headlights.',
    penaltyValue: 5,
    errorCategory: 'Communication',
    courtCoords: { playerPos: { x: 30, y: 90 }, partnerPos: { x: 70, y: 90 }, ballPos: { x: 50, y: 30 } }
  },

  // LEVEL 2: The Doubles "Sync"
  {
    id: 'wide-partner',
    level: 2,
    title: 'The "Wide Partner" Shift',
    description: 'Your partner is pulled far out to the right sideline to return a wide dink.',
    highIqChoice: 'Shift with them to the middle "T" to cover the center gap.',
    deathChoice: 'Stay glued to your half of the court, leaving the middle wide open.',
    penaltyValue: 10,
    errorCategory: 'Spatial',
    courtCoords: { playerPos: { x: 50, y: 50 }, partnerPos: { x: 90, y: 50 }, ballPos: { x: 90, y: 20 } }
  },
  {
    id: 'middle-hole',
    level: 2,
    title: 'The "Middle Hole" Priority',
    description: 'A ball is hit exactly down the middle between you and your partner.',
    highIqChoice: 'The player with the forehand in the middle takes charge with a loud "Mine!".',
    deathChoice: 'Silent collision, or the classic "After you, Alphonse" hesitation.',
    penaltyValue: 5,
    errorCategory: 'Communication',
    courtCoords: { playerPos: { x: 40, y: 50 }, partnerPos: { x: 60, y: 50 }, ballPos: { x: 50, y: 50 } }
  },
  {
    id: 'lob-switch',
    level: 2,
    title: 'The "Lob Switch"',
    description: 'A lob goes cleanly over your partner’s head while you are both at the NVZ line.',
    highIqChoice: 'You drop back diagonally to cover it; your partner slides over to your side.',
    deathChoice: 'Both of you run backward for the same ball, or both stay completely stationary.',
    penaltyValue: 10,
    errorCategory: 'Spatial',
    courtCoords: { playerPos: { x: 40, y: 50 }, partnerPos: { x: 60, y: 50 }, ballPos: { x: 60, y: 10 } }
  },
  {
    id: 'successful-drop',
    level: 2,
    title: 'The "Successful Drop" Advance',
    description: 'Your partner hits a beautiful, un-attackable 3rd shot drop into the kitchen.',
    highIqChoice: 'Both players sprint forward to the NVZ line together.',
    deathChoice: 'One player stays back at the baseline (the "Stranded Partner").',
    penaltyValue: 10,
    errorCategory: 'Spatial',
    courtCoords: { playerPos: { x: 50, y: 90 }, partnerPos: { x: 50, y: 50 }, ballPos: { x: 50, y: 50 } }
  },
  {
    id: 'shake-and-bake',
    level: 2,
    title: 'The "Shake-and-Bake" Drive',
    description: 'Your partner steps in and drives a hard 3rd shot directly at the opponent.',
    highIqChoice: 'Move forward aggressively to "hunt" and put away the 5th shot pop-up.',
    deathChoice: 'Stay passive and flat-footed at the baseline watching the drive.',
    penaltyValue: 10,
    errorCategory: 'Spatial',
    courtCoords: { playerPos: { x: 50, y: 90 }, partnerPos: { x: 50, y: 50 }, ballPos: { x: 50, y: 20 } }
  },

  // LEVEL 3: The 4.0+ "Pro Read"
  {
    id: 'high-to-low',
    level: 3,
    title: 'The "High-to-Low" Reset',
    description: 'You popped the ball up, and the opponent is winding up to smash it.',
    highIqChoice: 'Drop your paddle low, bend your knees, and prepare for a soft reset block.',
    deathChoice: 'Stand tall with your paddle up at chest height, becoming an easy target.',
    penaltyValue: 15,
    errorCategory: 'Technical',
    courtCoords: { playerPos: { x: 50, y: 50 }, ballPos: { x: 50, y: 20 } }
  },
  {
    id: 'dink-patience',
    level: 3,
    title: 'The "Dink Patience" Test',
    description: 'You are on the 6th dink of a grueling, patient cross-court rally.',
    highIqChoice: 'Hit another un-attackable, patient dink to their backhand.',
    deathChoice: 'Attempt an impatient, low-percentage "speed-up" right into the net.',
    penaltyValue: 15,
    errorCategory: 'Technical',
    courtCoords: { playerPos: { x: 50, y: 50 }, ballPos: { x: 50, y: 50 } }
  },
  {
    id: 'paddle-face',
    level: 3,
    title: 'The "Paddle Face" Poach',
    description: 'The opponent prepares to dink but shows a very open, upward-facing paddle face.',
    highIqChoice: 'Anticipate the high, floaty cross-court trajectory and lean in for a poach.',
    deathChoice: 'Wait reactively on your heels and only play defense.',
    penaltyValue: 10,
    errorCategory: 'Spatial',
    courtCoords: { playerPos: { x: 50, y: 50 }, partnerPos: { x: 50, y: 50 }, ballPos: { x: 50, y: 50 } }
  },
  {
    id: 'baseline-reset',
    level: 3,
    title: 'The "Baseline Reset"',
    description: 'You are stuck at the baseline, and a ball is driven hard and low at your feet.',
    highIqChoice: 'Hit a soft reset drop into the kitchen to buy yourself time to move up.',
    deathChoice: 'Try to "out-drive" the net player from the baseline.',
    penaltyValue: 15,
    errorCategory: 'Technical',
    courtCoords: { playerPos: { x: 50, y: 90 }, ballPos: { x: 50, y: 80 } }
  }
];
