
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIEventResponse, GameEvent, Resources, Resolution, Choice, ShipClass, Item, CombatDetails } from '../types';

const fallbackEvents: GameEvent[] = [
  {
    id: 'fallback-1',
    title: 'Asteroid Field',
    description: 'Navigational sensors detect a dense asteroid field directly in your trajectory. The auto-pilot recommends a detour, but fuel is low.',
    choices: [
      { id: 'c1', text: 'Blast through using shields', type: 'aggressive', risk: 'high' },
      { id: 'c2', text: 'Calculate a precise path manually', type: 'scientific', risk: 'medium' },
      { id: 'c3', text: 'Go around (Costs Energy)', type: 'evasive', risk: 'low' }
    ]
  }
];

export class GeminiGameMaster {
  private ai: GoogleGenAI | null = null;
  private modelId = "gemini-2.5-flash";

  constructor() {
    try {
      if (process.env.API_KEY) {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      }
    } catch (e) {
      console.error("Failed to initialize Gemini Client", e);
    }
  }

  private get isAvailable() {
    return !!this.ai;
  }

  async generateEvent(turn: number, resources: Resources, shipClass: ShipClass | null, inventory: Item[]): Promise<GameEvent> {
    if (!this.isAvailable) return fallbackEvents[0];

    const inventoryNames = inventory.map(i => i.name).join(", ");
    const shipContext = shipClass ? `Commanding a ${shipClass.name} class ship.` : "";

    const prompt = `
      Turn: ${turn}. 
      ${shipContext}
      Current Status: Hull ${resources.hull}%, Energy ${resources.energy}%, Crew ${resources.crew}, Credits ${resources.credits}.
      Inventory Artifacts: [${inventoryNames}].
      
      Generate a highly engaging Sci-Fi RPG scenario.
      If the player has specific items, occasionally reference them in the situation.
      
      Create 3 distinct choices. 
      - Aggressive (Combat/Force)
      - Diplomatic (Talk/Trade)
      - Scientific (Scan/Hack)
      - Evasive (Run/Stealth)
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        choices: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['aggressive', 'diplomatic', 'scientific', 'evasive'] },
              risk: { type: Type.STRING, enum: ['low', 'medium', 'high', 'extreme'] }
            },
            required: ['text', 'type', 'risk']
          }
        }
      },
      required: ['title', 'description', 'choices']
    };

    try {
      const response = await this.ai!.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "You are an intense Sci-Fi RPG Game Master. Be concise but atmospheric. Use terminology like 'Warp Core', 'Quantum Flux', 'Pirate Raiders'."
        }
      });

      const data = JSON.parse(response.text || "{}") as AIEventResponse;
      
      return {
        id: `evt-${Date.now()}`,
        title: data.title,
        description: data.description,
        choices: data.choices.map((c, i) => ({
          id: `choice-${i}`,
          text: c.text,
          type: c.type as any,
          risk: c.risk as any
        }))
      };

    } catch (error) {
      console.error("Gemini Generation Error:", error);
      return fallbackEvents[0];
    }
  }

  async generateCombatDetails(eventDescription: string): Promise<CombatDetails> {
    if (!this.isAvailable) {
      return {
        enemyName: "Unknown Assailant",
        enemyClass: "Unknown",
        description: "Sensors cannot identify the target. Visuals obscured.",
        weakness: "None detected",
        threatLevel: "CRITICAL"
      };
    }

    const prompt = `
      Context: The player has chosen to ATTACK in this situation: "${eventDescription}".
      
      Generate tactical details about the enemy.
      Make it sound like a military scanner output.
      
      Output JSON.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            enemyName: { type: Type.STRING },
            enemyClass: { type: Type.STRING },
            description: { type: Type.STRING },
            weakness: { type: Type.STRING },
            threatLevel: { type: Type.STRING, enum: ['LOW', 'MODERATE', 'CRITICAL', 'EXTREME'] }
        },
        required: ['enemyName', 'enemyClass', 'description', 'weakness', 'threatLevel']
    };

    try {
        const response = await this.ai!.models.generateContent({
            model: this.modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are a tactical combat computer analysis system. Brief, uppercase, choppy sentences."
            }
        });
        return JSON.parse(response.text || "{}") as CombatDetails;
    } catch (error) {
        return {
            enemyName: "Hostile Entity",
            enemyClass: "Standard",
            description: "Target locked.",
            weakness: "Shields",
            threatLevel: "MODERATE"
        };
    }
  }

  async resolveAction(event: GameEvent, choice: Choice, resources: Resources, shipClass: ShipClass | null): Promise<Resolution> {
    if (!this.isAvailable) {
      return {
        success: Math.random() > 0.5,
        outcomeText: "Sensors offline. Outcome uncertain.",
        resourceChanges: { credits: 10 }
      };
    }

    const shipBonus = shipClass ? `Ship Bonus: ${shipClass.bonus}` : "";

    const prompt = `
      Situation: ${event.description}
      Action: ${choice.text} (${choice.type}, Risk: ${choice.risk}).
      ${shipBonus}
      
      Determine outcome. 
      - If 'Diplomatic' was chosen, describe the negotiation or alien reaction in detail. Did they get offended? Impressed?
      - If 'Scientific' was chosen, describe the data or anomaly found.
      - If success is TRUE, there is a 30% chance to find a sci-fi item (Loot).
      
      Output JSON:
      - outcomeText: Deep narrative result describing the consequences.
      - success: boolean.
      - hull/energy/crew/creditsChange: integers (negative for loss).
      - itemFoundName: Name of item if found (or null).
      - itemFoundDesc: Short description of item if found (or null).
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        outcomeText: { type: Type.STRING },
        success: { type: Type.BOOLEAN },
        hullChange: { type: Type.INTEGER },
        energyChange: { type: Type.INTEGER },
        crewChange: { type: Type.INTEGER },
        creditsChange: { type: Type.INTEGER },
        itemFoundName: { type: Type.STRING, nullable: true },
        itemFoundDesc: { type: Type.STRING, nullable: true },
      },
      required: ['outcomeText', 'success']
    };

    try {
      const response = await this.ai!.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "You are a master Sci-Fi Storyteller. Outcomes should have emotional weight and vivid descriptions. Diplomacy involves complex dialogue results. Failure should be punishing but fair."
        }
      });

      const data = JSON.parse(response.text || "{}");

      let newItem: Item | undefined = undefined;
      if (data.success && data.itemFoundName) {
        newItem = {
          id: `item-${Date.now()}`,
          name: data.itemFoundName,
          description: data.itemFoundDesc || "An alien artifact.",
          icon: 'Box' 
        };
      }

      return {
        outcomeText: data.outcomeText,
        success: data.success,
        resourceChanges: {
          hull: data.hullChange || 0,
          energy: data.energyChange || 0,
          crew: data.crewChange || 0,
          credits: data.creditsChange || 0
        },
        itemReward: newItem || null
      };

    } catch (error) {
      console.error("Gemini Resolution Error:", error);
      return {
        success: false,
        outcomeText: "Communication interference. Static fills the screen.",
        resourceChanges: { energy: -5 }
      };
    }
  }
}
