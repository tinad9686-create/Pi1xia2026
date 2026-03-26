
export type Theme = 'sunny' | 'classic' | 'dark';

export type AgeGroup = 'Junior' | '18-29' | '30-39' | '40-49' | '50-59' | '60-69' | '70+' | 'All';

export enum SkillGroup {
  GROUP_1 = 'Group 1', // 1.0 - 2.5
  GROUP_2 = 'Group 2', // 2.6 - 3.9
  GROUP_3 = 'Group 3', // 4.0 - 5.0+
}

export interface ScheduledMatch {
  id: string;
  day: number; // 0-6 (Sun-Sat)
  time: string; // "HH:mm" or "Morning", "Afternoon", etc.
  location: string;
  isConfirmedMatch?: boolean; // Legacy support
  status?: 'preferred' | 'pending' | 'confirmed'; // New 3-state logic
  playersNeeded?: number;
  duration?: number;
  participants?: string[];
  
  // Group Event Fields
  eventType?: string; // e.g., "After-Work Game", "Weekend Mixer"
  minPlayers?: number;
  maxPlayers?: number;
  currentStatus?: 'Pending' | 'Confirmed' | 'Full';
}

export interface HotSession {
  id: string;
  city: string;
  location: string;
  shortLocation: string;
  level: string;
  skillGroup: SkillGroup;
  sessionType: string; // e.g. "Mix", "Men", "Women"
  day: string;
  time: string;
  needed: number;
  duration: number;
  description?: string;
  createdBy: string;
  participants?: string[]; // IDs of players already in this session (creator + partner)
  isFlexible?: boolean; // If true, lower skill groups can join
  isManuallyConfirmed?: boolean; // Director confirmation flag
}

export interface WeeklyStats {
  matchesPlayed: number;
  matchesTarget: number;
  latenessMinutes: number[]; // e.g., [10, 0, 30] for each match
  missedMatches: number;
  invitesSent: number;
  friendInvites?: string[]; // List of names invited
  warmupsCount: number; // Combined before/after
  usedAIAnalysis: boolean;
  aiShownImprovement: boolean;
  activeImprovementPlan?: string; // New field for selected plan
}

export interface PlayerProfile {
  id: string;
  name: string;
  email?: string; // New
  phone?: string; // New
  mailingAddress?: string; // New
  isAdmin?: boolean;
  membershipTier?: 'Free' | 'Pro' | 'Elite' | 'Custom'; // New field for redemption eligibility
  integrityHistory?: number[]; // Scores from previous months [26, 28, ...]
  ageGroup: AgeGroup;
  agePreference?: AgeGroup;
  durationPreference?: number | 'All';
  skillMatchMode?: 'Strict' | 'Flexible'; // New field for matchmaking logic
  preferredSkillLevel?: number | 'All';
  minSkillLevel?: number | 'All';
  skillGroup: SkillGroup;
  selfEval: number;
  duprRank: number;
  location: string;
  locations: string[]; 
  isLocationFlexible: boolean;
  schedule: ScheduledMatch[];
  isScheduleFlexible: boolean;
  preferredTimes: string[];
  duration: number;
  yearsPlayed: number;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  language: string[];
  goal: 'Improving Skills' | 'Social Play';
  avatar: string;
  isRegistered: boolean;
  connectedPartners?: string[]; 
  loggedMatches?: MatchHistory[];
  contactPreference?: 'Email' | 'Phone' | 'WeChat' | 'WhatsApp';
  contactInfo?: string;
  coachComments?: string;
  weeklyStats?: WeeklyStats;
  integrityStreakMonths?: number;
  referralSource?: string;
  referralName?: string;
  playerTag?: string; // New: Unique license plate
  referralProcessed?: boolean; // New: To track if referral sparks were given
  
  // Evaluation Tracking
  evaluationsThisMonth?: number;
  totalEvaluations?: number;
  lastEvaluationDate?: string;
  sparksBalance?: number;
  surveyResponses?: Record<string, number>;
}

export interface MatchPlayerInfo {
  name: string;
  level: number;
}

export interface GameResult {
  score: string;
  result: 'Win' | 'Loss';
}

export interface MatchHistory {
  date: string;
  duration: string;
  location: string;
  coachNotes: string;
  
  // New Structure
  type?: 'Match' | 'Assessment'; // Distinguish between real games and AI evals
  assessmentData?: ClassificationResult; // Store the result if type is Assessment

  partner?: MatchPlayerInfo;
  opponents: MatchPlayerInfo[]; // Can be 1 (singles) or 2 (doubles)
  games: GameResult[]; // Multiple games in one match session
  
  // Legacy fields for backward compatibility/AI (can be derived)
  opponentAgeGroup?: AgeGroup;
  isExample?: boolean; // Flag for placeholder data
}

export interface PerformanceReport {
  tableData: Array<{
    date: string;
    duration: string;
    score: string;
    location: string;
    opponentLevel: string;
    opponentAgeGroup: string;
    note: string;
    opponentName?: string;
  }>;
  improvementSummary: string;
  focusArea: string;
}

export interface DriveAnalysisResult {
  isDriveShot: boolean;
  overallScore?: number;
  summary?: string;
  steps?: {
    name: string;
    score: number;
    feedback: string;
    status: 'perfect' | 'good' | 'needs_work';
  }[];
  drills?: string[];
}

export interface ClassificationResult {
  groupId: SkillGroup;
  summary: string;
  improvementPlan: string[];
  preciseRating?: number; // e.g., 3.775
  action?: string; // e.g., "SMASH", "SERVING", "DRIVING"
  insight?: string; // e.g., "Control (+), Timing (-)"
  radarStats?: {
    power: number;
    control: number;
    footwork: number;
    strategy: number;
    spin: number;
  };
}

export interface WeatherData {
  day: string;
  temp: number;
  condition: string;
  icon: string;
}
