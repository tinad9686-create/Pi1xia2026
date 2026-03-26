
import { PlayerProfile, SkillGroup, MatchHistory, HotSession, AgeGroup } from './types';

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TIMES = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "17:00", "18:00", "19:00", "20:00", "22:00"];

export const AGE_OPTIONS: AgeGroup[] = ['Junior', '18-29', '30-39', '40-49', '50-59', '60-69', '70+'];

export const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Jack Crosby Sports box": { lat: 49.2432, lng: -122.9592 },
  "Downtown Courts": { lat: 49.2827, lng: -123.1207 },
  "Kitchen Central": { lat: 49.2618, lng: -123.1132 },
  "Burnaby Box": { lat: 49.2465, lng: -122.9734 },
  "Dink Dome": { lat: 49.1666, lng: -123.1336 },
  "North Park": { lat: 48.4359, lng: -123.3515 }, // Victoria
  "The Pickle Pit": { lat: 49.2500, lng: -123.1200 },
  "Baseline Blvd": { lat: 49.2700, lng: -123.1300 },
  "PPA Tour Highlights": { lat: 49.2800, lng: -123.1100 }
};

export const PICKLE_QUOTES = [
  "I'm all jar and no pickle today—looking for someone to help me get out of the kitchen!",
  "My dink is better than my drink, but it's a close race.",
  "Zero-Zero-Start: The only time I'm ever first at anything.",
  "If you can't stand the heat, stay out of the kitchen (unless you're dinking).",
  "Pickleball: The sport where 'getting pickled' doesn't involve a hangover.",
  "I don't always hit the net, but when I do, I make sure it's on a game point.",
  "My third shot drop is more like a third shot 'oh no'.",
  "Keep calm and dink on!",
  "I'm just here for the post-match snacks and the questionable line calls."
];

export const INITIAL_HOT_SESSIONS: HotSession[] = [
  {
    id: 'hs1',
    city: 'Burnaby',
    location: 'Burnaby Box',
    shortLocation: 'BBY Box',
    level: '3.5',
    skillGroup: SkillGroup.GROUP_2,
    sessionType: 'Mix',
    day: 'Tue',
    time: '14:00',
    needed: 1,
    duration: 2,
    createdBy: 'system',
    description: "Intense afternoon drills and match play. Looking for a consistent fourth for doubles rotation."
  },
  {
    id: 'hs2',
    city: 'Vancouver',
    location: 'Kitchen Central',
    shortLocation: 'Kitchen Ctrl',
    level: '4.0',
    skillGroup: SkillGroup.GROUP_3,
    sessionType: 'Men',
    day: 'Fri',
    time: '18:30',
    needed: 2,
    duration: 2,
    createdBy: 'system',
    description: "Friday night lights! Competitive play, high level required. We have 2 confirmed, need 2 more."
  },
  {
    id: 'hs3',
    city: 'Richmond',
    location: 'Dink Dome',
    shortLocation: 'Dink Dome',
    level: '3.0',
    skillGroup: SkillGroup.GROUP_2,
    sessionType: 'Social',
    day: 'Sat',
    time: '10:00',
    needed: 1,
    duration: 2,
    createdBy: 'system',
    description: "Saturday morning social. Low stress, high fun. Come dink with us!"
  }
];

export const MOCK_PLAYERS: PlayerProfile[] = [
  {
    id: '1',
    name: 'Dinking Dan',
    ageGroup: '50-59',
    skillGroup: SkillGroup.GROUP_2,
    selfEval: 3.2,
    duprRank: 3.15,
    location: 'Jack Crosby Sports box',
    locations: ['Jack Crosby Sports box', 'North Park'],
    isLocationFlexible: true,
    schedule: [
        { id: 's1', day: 3, time: '18:00', location: 'Jack Crosby Sports box', isConfirmedMatch: false, duration: 2 },
        { id: 's2', day: 6, time: '10:00', location: 'North Park', isConfirmedMatch: false, duration: 2 }
    ],
    isScheduleFlexible: true,
    preferredTimes: ['Mornings'],
    duration: 2,
    yearsPlayed: 3,
    frequency: 'Weekly',
    language: ['English'],
    goal: 'Social Play',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dan&mouth=smile',
    isRegistered: true
  },
  {
    id: '2',
    name: 'Lobber Linda',
    ageGroup: '40-49',
    skillGroup: SkillGroup.GROUP_2,
    selfEval: 3.0,
    duprRank: 3.05,
    location: 'Jack Crosby Sports box',
    locations: ['Jack Crosby Sports box'],
    isLocationFlexible: true,
    schedule: [
        { id: 's3', day: 3, time: '18:00', location: 'Jack Crosby Sports box', isConfirmedMatch: false, duration: 2 }
    ],
    isScheduleFlexible: false,
    preferredTimes: ['Mornings', 'Afternoons'],
    duration: 2,
    yearsPlayed: 2,
    frequency: 'Weekly',
    language: ['English'],
    goal: 'Improving Skills',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Linda&mouth=smile',
    isRegistered: true
  },
  {
    id: '3',
    name: 'Smash Sarah',
    ageGroup: '18-29',
    skillGroup: SkillGroup.GROUP_3,
    selfEval: 4.5,
    duprRank: 4.6,
    location: 'Downtown Courts',
    locations: ['Downtown Courts'],
    isLocationFlexible: true,
    schedule: [
        { id: 's4', day: 5, time: '18:00', location: 'Downtown Courts', isConfirmedMatch: false, duration: 3 }
    ],
    isScheduleFlexible: true,
    preferredTimes: ['Afternoons'],
    duration: 3,
    yearsPlayed: 5,
    frequency: 'Daily',
    language: ['Spanish', 'English'],
    goal: 'Improving Skills',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&mouth=smile',
    isRegistered: true
  }
];

export const MOCK_HISTORY: MatchHistory[] = [
  { 
    date: '2023-10-01', 
    duration: '45m', 
    location: 'Kitchen Central',
    coachNotes: 'Excellent lateral movement.',
    partner: { name: 'Doubles Dave', level: 3.2 },
    opponents: [{ name: 'Smash Sarah', level: 4.0 }, { name: 'Lobber Linda', level: 3.0 }],
    games: [
        { score: '11-8', result: 'Win' },
        { score: '9-11', result: 'Loss' },
        { score: '11-5', result: 'Win' }
    ],
    opponentAgeGroup: '50-59',
    isExample: true
  }
];
