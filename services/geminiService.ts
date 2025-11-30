import { GoogleGenAI, Type } from "@google/genai";
import { BOSS_DATA } from "../constants";
import { ParsedCommand } from "../types";

export const parseCommandWithGemini = async (input: string): Promise<ParsedCommand> => {
  if (!process.env.API_KEY) {
    return {
      bossName: null,
      hour: null,
      minute: null,
      isPass: false,
      error: "Missing API Key",
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create a simplified list of names and aliases for the prompt context
  const bossListString = BOSS_DATA.map(b => `${b.name} (${b.aliases.join(', ')})`).join('\n');

  const prompt = `
    Analyze the following user input for a game boss timer.
    User Input: "${input}"

    Rules:
    1. Extract the time (Hours and Minutes). 
       - Input formats might be "0300", "300", "3:00", "03:00".
       - If only "300" is given, assume 03:00.
    2. Identify the Boss Name from the list below. Map aliases to the main Name.
       - If the user uses an alias like "東飛", map it to "85飛龍".
       - Fuzzy match if necessary but prefer exact alias matches.
    3. Check if the input implies the boss was "passed" (missed/checked but not killed).
       - Look for keywords like "過", "pass", "沒打", "miss".
    
    Boss List:
    ${bossListString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bossName: { type: Type.STRING, nullable: true },
            hour: { type: Type.INTEGER, nullable: true },
            minute: { type: Type.INTEGER, nullable: true },
            isPass: { type: Type.BOOLEAN },
            found: { type: Type.BOOLEAN, description: "True if a boss and time were successfully identified" }
          },
          required: ["isPass", "found"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    if (!result.found || !result.bossName || result.hour === null || result.minute === null) {
      return {
        bossName: null,
        hour: null,
        minute: null,
        isPass: false,
        error: "無法辨識輸入。請確認格式 (例如: 0300 東飛)",
      };
    }

    return {
      bossName: result.bossName,
      hour: result.hour,
      minute: result.minute,
      isPass: result.isPass,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      bossName: null,
      hour: null,
      minute: null,
      isPass: false,
      error: "AI 服務暫時無法使用",
    };
  }
};
