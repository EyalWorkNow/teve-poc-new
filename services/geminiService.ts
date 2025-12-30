
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { IntelligencePackage, ChatMessage, ContextCard, PinnedItem, StudyItem, SynapseAnalysis, Entity, Relation, GraphData, Statement, IntelQuestion, IntelTask, NarrativeBlock } from "../types";

/**
 * ==================================================================================
 * PART 1: DATA ALGORITHM ENGINE
 * Handles graph construction and data normalization.
 * ==================================================================================
 */
class DataAlgorithmEngine {
    static buildGraph(entities: Entity[], relations: Relation[]): GraphData {
        const uniqueNodes = new Map<string, any>();
        const edges: any[] = [];

        entities.forEach(e => {
            const id = e.name;
            if (!uniqueNodes.has(id)) {
                uniqueNodes.set(id, {
                    id: id,
                    group: this.getTypeGroup(e.type),
                    type: e.type
                });
            }
        });

        relations.forEach(r => {
            const source = typeof r.source === 'string' ? r.source : (r.source as any).name;
            const target = typeof r.target === 'string' ? r.target : (r.target as any).name;

            if (!uniqueNodes.has(source)) uniqueNodes.set(source, { id: source, group: 8, type: 'MISC' });
            if (!uniqueNodes.has(target)) uniqueNodes.set(target, { id: target, group: 8, type: 'MISC' });

            edges.push({
                source: source,
                target: target,
                value: (r.confidence || 0.5) * 5
            });
        });

        return {
            nodes: Array.from(uniqueNodes.values()),
            edges: edges
        };
    }

    static getTypeGroup(type: string) {
        const t = type?.toUpperCase() || 'MISC';
        switch (t) {
            case 'PERSON': return 1;
            case 'ORG': case 'ORGANIZATION': case 'UNIT': return 2;
            case 'LOCATION': case 'REGION': case 'FACILITY': return 3;
            case 'OBJECT': case 'ASSET': case 'WEAPON': case 'SYSTEM': return 4;
            case 'EVENT': case 'INCIDENT': return 5;
            case 'DATE': case 'TIME': return 6;
            case 'CAPABILITY': case 'TECH': case 'CYBER': return 7;
            default: return 8;
        }
    }

    static isEntityMatch(e1Name: string, e2Name: string): boolean {
        if (!e1Name || !e2Name) return false;
        const normalize = (s: string) => s.toLowerCase().replace(/['"״׳]/g, '').replace(/[-_]/g, ' ').trim();
        const n1 = normalize(e1Name);
        const n2 = normalize(e2Name);
        return n1 === n2 || (n1.length > 4 && n2.length > 4 && (n1.includes(n2) || n2.includes(n1)));
    }
}

/**
 * ==================================================================================
 * PART 2: COGNITIVE GATEWAY (SDK WRAPPER)
 * Pure implementation of Gemini API rules.
 * ==================================================================================
 */
class CognitiveGateway {
    static async generate(params: {
        prompt: string,
        model?: string,
        systemInstruction?: string,
        schema?: any
    }): Promise<string> {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY is missing. Ensure your .env file or environment is correctly configured.");
        
        const ai = new GoogleGenAI({ apiKey });
        const config: any = {
            systemInstruction: params.systemInstruction || "You are TEVEL, an elite intelligence analyst.",
            temperature: 0.2,
        };

        if (params.schema) {
            config.responseMimeType = "application/json";
            config.responseSchema = params.schema;
        }

        const response = await ai.models.generateContent({
            model: params.model || 'gemini-3-flash-preview',
            contents: params.prompt,
            config
        });

        return response.text || "{}";
    }
}

/**
 * ==================================================================================
 * PART 3: SCHEMAS
 * ==================================================================================
 */
const DOCUMENT_ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        entities: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    role: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                },
                required: ["name", "type"]
            }
        },
        relations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    type: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                },
                required: ["source", "target", "type"]
            }
        },
        insights: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    text: { type: Type.STRING }
                }
            }
        },
        timeline: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    event: { type: Type.STRING }
                }
            }
        }
    }
};

const CONTEXT_CARD_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        entityName: { type: Type.STRING },
        type: { type: Type.STRING },
        summary: { type: Type.STRING },
        role_in_document: { type: Type.STRING },
        significance: { type: Type.STRING },
        affiliation: { type: Type.STRING },
        status: { type: Type.STRING }
    },
    required: ["entityName", "summary"]
};

/**
 * ==================================================================================
 * PART 4: PUBLIC API
 * ==================================================================================
 */

export const analyzeDocument = async (text: string): Promise<IntelligencePackage> => {
    try {
        const jsonStr = await CognitiveGateway.generate({
            prompt: `Analyze the following intelligence report: """${text.substring(0, 30000)}"""`,
            systemInstruction: "Extract detailed intelligence data including entities and relations.",
            schema: DOCUMENT_ANALYSIS_SCHEMA
        });

        const data = JSON.parse(jsonStr);
        const entities: Entity[] = (data.entities || []).map((e: any) => ({
            id: e.name,
            name: e.name,
            type: e.type.toUpperCase(),
            description: e.role || '',
            confidence: e.confidence || 0.9
        }));

        const relations: Relation[] = (data.relations || []).map((r: any) => ({
            source: r.source,
            target: r.target,
            type: r.type,
            confidence: r.confidence || 0.8
        }));

        return {
            clean_text: data.title || "Intelligence Report",
            raw_text: text,
            word_count: text.length,
            entities,
            relations,
            insights: data.insights || [],
            timeline: data.timeline || [],
            context_cards: {},
            graph: DataAlgorithmEngine.buildGraph(entities, relations)
        };
    } catch (error) {
        console.error("Analysis failed:", error);
        throw error;
    }
};

export const generateEntityContext = async (entityName: string, fullText: string): Promise<ContextCard> => {
    try {
        const jsonStr = await CognitiveGateway.generate({
            prompt: `Construct a profile for "${entityName}" based on: """${fullText.substring(0, 20000)}"""`,
            systemInstruction: "Create a detailed target dossier.",
            schema: CONTEXT_CARD_SCHEMA
        });

        const card = JSON.parse(jsonStr);
        return {
            ...card,
            isShallow: false,
            key_mentions: []
        };
    } catch (error) {
        console.error("Context generation failed:", error);
        // Added missing key_mentions property to the fallback object to match ContextCard interface.
        return {
            entityName,
            summary: "Error generating profile. Please check API connectivity.",
            role_in_document: "Unknown",
            isShallow: false,
            key_mentions: []
        };
    }
};

export const askContextualQuestion = async (question: string, contextData: IntelligencePackage, history: ChatMessage[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Comms Offline: API Key Missing.";
    
    const ai = new GoogleGenAI({ apiKey });
    const historyText = history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n');
    const prompt = `CONTEXT:\n${contextData.clean_text}\n\nHISTORY:\n${historyText}\n\nUSER: ${question}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text || "No response.";
};

export const generateStoryFromTimeline = async (events: any[]): Promise<string> => {
    // Enrich events for the prompt with deep context
    const enrichedEvents = events.map((e, i) => ({
        index: i,
        date: e.date,
        event: e.event,
        isExternal: e._source === 'external',
        sourceTitle: e._studyTitle,
        bridgeEntity: e._bridgeEntity, // The key player connecting the dots
        contextSummary: e._contextSummary // The deeper insight from the external study
    }));

    const prompt = `
    You are a SENIOR INTELLIGENCE HISTORIAN crafting a "Deep Causality Report".
    
    OBJECTIVE:
    Weave a coherent, dramatic, and analytical narrative that explains how historical events (External) influenced current operations (Current).
    Do not just list events. Explain the *implications* and *connections*.

    DATA STREAM:
    ${JSON.stringify(enrichedEvents, null, 2)}

    NARRATIVE RULES:
    1. **Storytelling Arc**: Start with the earliest context and build towards the current operational reality. Use transitions like "However, the groundwork was laid...", "This pattern re-emerged when...", "Crucially, intelligence from...".
    2. **Deep Context (CRITICAL)**: When you encounter an 'External' event (isExternal: true), you MUST use the provided 'contextSummary' and 'bridgeEntity' to explain WHY this event matters. Do not just say "Event X happened". Say "Investigative files on [Bridge Entity] revealed [Context Summary], which explains the event: {{LINK:index}}".
    3. **Interactive Placeholders**: The actual text of the external event MUST be represented by the placeholder {{LINK:index}} (where index matches the JSON). This allows the user to click it. 
       - CORRECT: "New intelligence correlates with {{LINK:3}}, indicating a long-standing pattern."
       - INCORRECT: "{{LINK:3}}" (Do not leave it dangling without narrative context).
    4. **Bridge Entity Emphasis**: Highlight the role of the 'bridgeEntity' in connecting the disparate studies.
    5. **Tone**: Professional, analytical, authoritative, yet gripping (like a high-level intelligence briefing). No markdown headers. Just paragraphs.
    
    Example Output Style:
    "Initial operations focused on the immediate threat, but deep analysis reveals a disturbing timeline. The earliest indicators surfaced in 2023, where surveillance of [Bridge Entity] uncovered hidden financial flows. This is confirmed by {{LINK:0}}, which was previously dismissed as noise. This foundational event directly enabled the logistics network we see today..."
    `;

    try {
        const text = await CognitiveGateway.generate({
            prompt: prompt,
            systemInstruction: "You are TEVEL's Chief Narrative Analyst. Connect the dots with depth and precision."
        });
        return text;
    } catch (e) {
        console.error("Story generation failed", e);
        return "Narrative generation unavailable. Check secure uplink.";
    }
};

export const isEntityMatch = (a: string, b: string) => DataAlgorithmEngine.isEntityMatch(a, b);
export const reanalyzeEntityWithCrossReference = async (entityName: string, currentText: string, linkedStudies: any[]): Promise<string> => "Analysis pending...";
export const generateExtendedEntityProfile = async (entityName: string, fullText: string): Promise<string> => "Generating dossier...";
export const crossReferenceStudies = async (currentStudy: IntelligencePackage, externalStudies: StudyItem[]): Promise<string> => "Cross-referencing...";
export const generateTimelineNarrative = async (events: any[]): Promise<NarrativeBlock[]> => [];
export const generateExecutiveBrief = async (contextData: IntelligencePackage): Promise<string> => "Generating sitrep...";
export const generateSynthesis = async (pinnedItems: PinnedItem[]): Promise<string> => "Synthesizing...";
export const generateSynapseAnalysis = async (currentStudy: StudyItem, linkedStudies: StudyItem[]): Promise<SynapseAnalysis> => ({ summary: "Offline", results: [] });
