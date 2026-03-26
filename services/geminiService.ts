import { GoogleGenAI, Type } from "@google/genai";
import { PlayerProfile, SkillGroup, ClassificationResult, PerformanceReport, MatchHistory, HotSession, DriveAnalysisResult } from "../types";

// Define the genAI client for specific model calls if needed, using the unified key
let genAI: GoogleGenAI | null = null;
const getGenAI = () => {
  if (!genAI) {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (key) {
      genAI = new GoogleGenAI({ apiKey: key });
    } else {
      throw new Error("API key must be set");
    }
  }
  return genAI;
};

export const analyzeDrive = async (
  mediaData: { data: string; mimeType: string },
  modelId: string = 'gemini-3-pro-preview'
): Promise<DriveAnalysisResult> => {
  const parts: any[] = [
    { text: `Act as an expert USAPA-certified Pickleball Pro and technical video analyst. Perform a deep evaluation of a player's drive shot based on the provided video.
      
      ANALYSIS GUIDELINES:
      First, determine if the video actually contains a pickleball drive shot. If it does not, set isDriveShot to false and you do not need to provide the other fields.
      If it DOES contain a drive shot, set isDriveShot to true and analyze the drive shot across these 5 distinct phases:
      1. Ready Position: Is the player balanced, paddle up, and tracking the ball?
      2. Loading Phase: Is there proper unit turn, weight transfer to the back foot, and paddle preparation?
      3. Forward Swing: Is the kinetic chain engaged (hips -> torso -> arm)? Is the swing path low-to-high?
      4. Contact Point: Is contact made out in front of the body? Is the paddle face stable?
      5. Follow-through: Does the paddle finish high over the opposite shoulder? Is balance maintained?

      OUTPUT REQUIREMENT:
      Return a JSON object with:
      - isDriveShot: (Boolean indicating if a drive shot is present in the video)
      - overallScore: (A number from 1 to 100 representing the overall quality of the drive)
      - summary: (A 2-3 sentence high-level summary of the drive mechanics)
      - steps: (An array of exactly 5 objects, one for each phase above. Each object must have:
          - name: The name of the phase (e.g., "1. Ready Position")
          - score: A number from 1 to 100 for this specific phase
          - feedback: A 1-2 sentence technical critique of this phase
          - status: One of "perfect", "good", or "needs_work" based on the score
        )
      - drills: (An array of 2-3 specific practice drills to improve the weakest phases)` }
  ];

  if (mediaData) {
    parts.push({
      inlineData: {
        data: mediaData.data,
        mimeType: mediaData.mimeType
      }
    });
  }

  const response = await getGenAI().models.generateContent({
    model: modelId,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isDriveShot: { type: Type.BOOLEAN },
          overallScore: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                score: { type: Type.INTEGER },
                feedback: { type: Type.STRING },
                status: { type: Type.STRING }
              },
              required: ["name", "score", "feedback", "status"]
            }
          },
          drills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["isDriveShot"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as DriveAnalysisResult;
  } catch (e) {
    console.error("Failed to parse drive analysis", e);
    return { 
      isDriveShot: false
    };
  }
};

export const classifyPlayer = async (
  videoDescription: string, 
  coachComments: string, 
  selfEval: number,
  duprRank: number,
  yearsPlayed: number,
  mediaData?: { data: string; mimeType: string },
  modelId: string = 'gemini-3-pro-preview'
): Promise<ClassificationResult> => {
  const parts: any[] = [
    { text: `Act as an expert USAPA-certified Pickleball Pro and technical video analyst. Perform a deep evaluation of the player based on the following multi-modal inputs:
      
      INPUT DATA:
      - Coach Feedback: "${coachComments}"
      - Self-Perceived Level: ${selfEval}
      - Statistical DUPR Rank: ${duprRank}
      - Years of Court Experience: ${yearsPlayed}
      - Visual Context/Description: "${videoDescription}"
      
      ANALYSIS GUIDELINES:
      1. Biomechanical Analysis: Prioritize visual evidence of kinetic chain efficiency. Analyze the "uncoiling" of the body during drives and the stability of the "ready position" during dink rallies.
      2. Contact Point Geometry: Evaluate the paddle-to-ball relationship. Is the contact point consistently in front of the body? Analyze the "swing path" (low-to-high vs. flat).
      3. Kinetic Stability: Look for "excessive movement" in the non-dominant hand and the "quietness" of the head during impact.
      4. Tactical Positioning: Analyze "Kitchen line" discipline, "split-step" timing, and lateral recovery speed.
      5. Discrepancy Reconciliation: If DUPR is 0, perform a "blind" biomechanical rating. If DUPR exists, use it as a baseline but adjust based on visual "Pro-level" markers.

      SKILL GROUP DEFINITIONS:
      - Group 1: 1.0 - 2.5. Novice. Inefficient kinetic chain, inconsistent contact points, limited court awareness.
      - Group 2: 2.6 - 3.9. Intermediate. Functional mechanics, developing tactical depth, reliable third-shot drop, consistent dink stability.
      - Group 3: 4.0 - 5.5+. Advanced. Elite biomechanical efficiency, high-velocity reset capabilities, tactical poaching, and professional-grade court coverage.

      OUTPUT REQUIREMENT:
      Return a JSON object with:
      - groupId: (One of "Group 1", "Group 2", or "Group 3")
      - preciseRating: (A specific numeric rating between 1.0 and 6.0, e.g., 4.125. Be extremely precise.)
      - action: (A technical term for the primary action shown, e.g., "KINETIC_DRIVE", "DINK_STABILITY", "VOLLEY_RESET", "SERVE_MECHANICS")
      - insight: (A high-level technical insight in the format: "Technical Strength (+), but Biomechanical Leak (-)". E.g., "Kinetic Chain Efficiency (+), but Lateral Recovery (-)")
      - summary: (A 3-sentence high-end technical critique. Use professional coaching terminology like "kinetic chain," "paddle lag," "split-step timing," and "contact geometry.")
      - improvementPlan: (An array of 3 distinct "Pro-Level" practice options. Each option MUST describe a specific training frequency, a technical drill focus, and a recommended opponent level.)
      - radarStats: (An object with 5 keys: power, control, footwork, strategy, spin. Each value must be an integer from 1 to 100.)` }
  ];

  if (mediaData) {
    parts.push({
      inlineData: {
        data: mediaData.data,
        mimeType: mediaData.mimeType
      }
    });
  }

  const response = await getGenAI().models.generateContent({
    model: modelId,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          groupId: { type: Type.STRING },
          preciseRating: { type: Type.NUMBER },
          action: { type: Type.STRING },
          insight: { type: Type.STRING },
          summary: { type: Type.STRING },
          improvementPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          radarStats: {
            type: Type.OBJECT,
            properties: {
              power: { type: Type.INTEGER },
              control: { type: Type.INTEGER },
              footwork: { type: Type.INTEGER },
              strategy: { type: Type.INTEGER },
              spin: { type: Type.INTEGER }
            },
            required: ["power", "control", "footwork", "strategy", "spin"]
          }
        },
        required: ["groupId", "preciseRating", "action", "insight", "summary", "improvementPlan", "radarStats"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as ClassificationResult;
  } catch (e) {
    console.error("Failed to parse classification", e);
    return { 
      groupId: SkillGroup.GROUP_1, 
      summary: "Evaluation failed. Defaulting to Group 1.",
      improvementPlan: ["Practice consistency.", "Learn the rules.", "Play recreational games."]
    };
  }
};

export const generateAvatarStyle = async (
  imageBase64: string,
  style: 'cartoon'
): Promise<string> => {
  const modelId = 'gemini-3.1-flash-image-preview';
  
  const prompt = "Convert this portrait into a flat vector art avatar, vibrant colors, clean lines, white background, Disney/Pixar style. Professional character design.";

  try {
    // Remove data:image/png;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await getGenAI().models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64
            }
          }
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
        }
      }
    });

    // Extract the image from the response
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Avatar generation failed:", error);
    throw error;
  }
};

export const findPartners = async (
  user: PlayerProfile, 
  candidates: PlayerProfile[]
): Promise<any> => {
  const response = await getGenAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Find the best partners for this user: ${JSON.stringify(user)} based on these candidates: ${JSON.stringify(candidates)}.
      
      CRITERIA:
      1. LOCATION: Partners MUST have at least one overlapping location in their 'locations' arrays.
      2. TIME: Format the output time as a specific range "HH-HH" (e.g. "12-14", "10-12"). 
         - Use the 'schedule' data (day and start time) and 'duration' to calculate the range.
         - If the user has 'isScheduleFlexible: true', indicate their time as "Flexible" but still show the partner's specific available time range (e.g. "Partner: Sat 12-14").
         - If both have specific schedules that overlap, show the common range.
      3. GOAL: Goals can be different. Do not filter by goal.
      4. SKILL: Must be in the same skill group.
      
      Rank the top 3 potential partners.
      For each partner, provide a comparison table data structure.
      Return JSON as an array of objects.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            partnerId: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            reason: { type: Type.STRING },
            comparison: {
              type: Type.OBJECT,
              properties: {
                skill: { 
                  type: Type.OBJECT, 
                  properties: { user: { type: Type.STRING }, partner: { type: Type.STRING }, isMatch: { type: Type.BOOLEAN } } 
                },
                location: { 
                  type: Type.OBJECT, 
                  properties: { user: { type: Type.STRING }, partner: { type: Type.STRING }, isMatch: { type: Type.BOOLEAN }, overlap: { type: Type.STRING } } 
                },
                time: { 
                  type: Type.OBJECT, 
                  properties: { user: { type: Type.STRING }, partner: { type: Type.STRING }, isMatch: { type: Type.BOOLEAN }, overlap: { type: Type.STRING } } 
                },
                goal: { 
                  type: Type.OBJECT, 
                  properties: { user: { type: Type.STRING }, partner: { type: Type.STRING }, isMatch: { type: Type.BOOLEAN } } 
                }
              }
            }
          },
          required: ["partnerId", "matchScore", "reason", "comparison"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse partners JSON", e);
    return [];
  }
};

export const generateGreetingMessage = async (
  user: PlayerProfile,
  partner: PlayerProfile,
  contextNote: string
): Promise<string> => {
  const slot = user.schedule && user.schedule.length > 0 ? user.schedule[0] : null;
  const dayName = slot ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][slot.day] : "our next session";
  const timeStr = slot ? slot.time : "the usual time";

  const response = await getGenAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write a short, friendly, and funny pickleball invitation message from ${user.name} to ${partner.name}.
      
      MANDATORY TEMPLATE (Adjust to feel natural but keep the core info):
      "Hey! ${partner.name}, I am ${user.name}, I play at ${user.location} every week, do you want to join us at ${dayName} at ${timeStr}? looking forward to see your paddle skills!"
      
      Context from user: "${contextNote}".
      User Skill: ${user.skillGroup}, Goal: ${user.goal}.
      Partner Skill: ${partner.skillGroup}, Goal: ${partner.goal}.
      Keep it warm and funny. Include a subtle pickleball pun. Keep it under 40 words.`,
    config: {
      temperature: 0.8
    }
  });
  return response.text || `Hey! ${partner.name}, I am ${user.name}, I play at ${user.location} every week, do you want to join us at ${dayName} at ${timeStr}? looking forward to see your paddle skills!`;
};

export const extractSessionDetails = async (conversation: string, user: PlayerProfile): Promise<Partial<HotSession> | null> => {
  const response = await getGenAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze this pickleball conversation and extract session details: "${conversation}".
    Based on the user's profile: ${JSON.stringify(user)}.
    Extract:
    - city: (e.g., Burnaby, Vancouver)
    - location: (Court name)
    - day: (Sun, Mon, Tue, etc.)
    - time: (e.g., 14:00)
    - duration: (number in hours)
    - needed: (how many players still needed for a full 4-person game, usually 1 or 2)
    - skillGroup: (The skill level of the game)
    
    If information is missing, use user's profile defaults.
    Return JSON only.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          city: { type: Type.STRING },
          location: { type: Type.STRING },
          day: { type: Type.STRING },
          time: { type: Type.STRING },
          duration: { type: Type.NUMBER },
          needed: { type: Type.NUMBER },
          skillGroup: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || 'null');
  } catch {
    return null;
  }
};

export const generatePerformanceReport = async (
  history: MatchHistory[]
): Promise<PerformanceReport> => {
  const response = await getGenAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze this player’s historical match data: ${JSON.stringify(history)}.
      1. Generate a scores table including: date, game duration, score, location, opponent's level, opponent's age group, and key performance note.
      2. Create a summary of improvement highlighting trends in skill development (e.g., improved dinking consistency or serve accuracy).
      3. Provide a "Focus Area" for the next session based on recent coach comments.
      
      Return JSON matching this schema.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tableData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                duration: { type: Type.STRING },
                score: { type: Type.STRING },
                location: { type: Type.STRING },
                opponentLevel: { type: Type.STRING },
                opponentAgeGroup: { type: Type.STRING },
                note: { type: Type.STRING }
              }
            }
          },
          improvementSummary: { type: Type.STRING },
          focusArea: { type: Type.STRING }
        },
        required: ["tableData", "improvementSummary", "focusArea"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as PerformanceReport;
  } catch (e) {
    console.error("Failed to parse performance report JSON", e);
    return {
      tableData: [],
      improvementSummary: "Unable to generate summary at this time.",
      focusArea: "Consult with your coach for direct feedback."
    };
  }
};