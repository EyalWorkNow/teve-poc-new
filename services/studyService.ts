
import { supabase } from './supabaseClient';
import { StudyItem, ContextCard, Entity, Relation } from '../types';

// Helper to generate UUIDs
export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Handles persistence of Intelligence Studies to Supabase.
 * Implements a Dual-Write strategy:
 * 1. Writes to 'studies' table (JSON blob) for fast UI retrieval.
 * 2. Writes to Normalized Tables (documents, entities, relations) for strict SQL adherence and advanced querying.
 */
export class StudyService {
    
    /**
     * Fetches all studies from Supabase (Legacy Table).
     */
    static async getAllStudies(): Promise<StudyItem[]> {
        try {
            const { data, error } = await supabase
                .from('studies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase fetch error:', error.message);
                return [];
            }

            return (data || []).map((row: any) => ({
                id: row.id,
                title: row.title,
                date: row.date || row.date_str || 'Unknown Date', 
                source: row.source,
                status: row.status,
                tags: row.tags || [],
                intelligence: row.intelligence,
                super_intelligence: row['Super intelligence'] || row.super_intelligence || {},
                knowledge_intelligence: row.knowledge_intelligence || {}
            }));
        } catch (e) {
            console.error("Critical error in getAllStudies:", e);
            return [];
        }
    }

    /**
     * Saves a new study to Supabase.
     * Returns the final UUID of the saved study, or null if failed.
     */
    static async saveStudy(study: StudyItem): Promise<string | null> {
        // Ensure ID is a valid UUID
        let finalId = study.id;
        if (!finalId || finalId.startsWith('s_') || finalId.startsWith('rt_')) {
            finalId = generateUUID();
        }
        const studyWithId = { ...study, id: finalId };

        // 1. Save to Legacy Table (UI Cache) - This is the primary storage for the POC
        const legacySuccess = await this.saveToLegacyTable(studyWithId);

        // 2. Save Normalized Data (Background Process - Non-blocking for UI)
        if (legacySuccess) {
            this.saveNormalizedData(studyWithId).catch(err => 
                console.warn("Normalized save failed (likely due to missing tables in this POC env), but UI save succeeded.", err)
            );
            return finalId;
        }

        return null;
    }

    /**
     * Updates a specific ContextCard within a Study's intelligence package.
     * This persists the "Deep Dive" data so we don't need to re-generate it.
     */
    static async updateStudyContextCard(studyId: string, entityName: string, updatedCard: ContextCard): Promise<boolean> {
        try {
            // 1. Fetch current study to get the JSON blob
            const { data: currentData, error: fetchError } = await supabase
                .from('studies')
                .select('intelligence')
                .eq('id', studyId)
                .single();

            if (fetchError || !currentData) {
                console.error("Error fetching study for update:", fetchError);
                return false;
            }

            // 2. Modify the JSON blob
            const intelligence = currentData.intelligence;
            if (!intelligence.context_cards) {
                intelligence.context_cards = {};
            }
            
            // Normalize key to avoid case sensitivity issues
            const existingKeys = Object.keys(intelligence.context_cards);
            const matchKey = existingKeys.find(k => k.toLowerCase() === entityName.toLowerCase()) || entityName;
            
            intelligence.context_cards[matchKey] = updatedCard;

            // 3. Write back the updated JSON blob
            const { error: updateError } = await supabase
                .from('studies')
                .update({ intelligence: intelligence })
                .eq('id', studyId);

            if (updateError) {
                console.error("Error updating context card:", updateError);
                return false;
            }

            return true;
        } catch (e) {
            console.error("Exception in updateStudyContextCard:", e);
            return false;
        }
    }

    /**
     * Updates the 'Super intelligence' column in Supabase for a specific study.
     * This now stores standard Context Card data including ID and Score.
     * 
     * @param studyId The ID of the study
     * @param entityName The name of the entity to update
     * @param content The content object to merge (e.g., ContextCard with ID/Score)
     */
    static async updateSuperIntelligence(studyId: string, entityName: string, content: any): Promise<boolean> {
        try {
            // 1. Fetch current data
            const { data: currentData, error: fetchError } = await supabase
                .from('studies')
                .select('*')
                .eq('id', studyId)
                .single();

            if (fetchError || !currentData) {
                console.error("Error fetching study for Super Intelligence update:", fetchError);
                return false;
            }

            // 2. Determine which column key to use (prefer existing data if present)
            let superData = currentData['Super intelligence'] || currentData.super_intelligence || {};
            
            // Safety check for JSON type
            if (typeof superData !== 'object' || superData === null) {
                superData = {};
            }

            // 3. Merge new content with existing entity data
            superData[entityName] = { ...(superData[entityName] || {}), ...content };

            // 4. Write back to "Super intelligence"
            const { error: updateError } = await supabase
                .from('studies')
                .update({ "Super intelligence": superData })
                .eq('id', studyId);

            if (updateError) {
                console.error("Error updating Super intelligence:", updateError);
                return false;
            }

            return true;
        } catch (e) {
            console.error("Exception in updateSuperIntelligence:", e);
            return false;
        }
    }

    /**
     * Updates the 'knowledge_intelligence' column in Supabase.
     * This stores the "Expand Intel" (Deep Dive) data.
     */
    static async updateKnowledgeIntelligence(studyId: string, entityName: string, content: any): Promise<boolean> {
        try {
            // 1. Fetch current data
            // Note: If the column doesn't exist, this might fail. We use * to be safer in some envs, but specific column is better for perf.
            // Using * here to avoid "column does not exist" crashing everything if schema isn't perfect.
            const { data: currentData, error: fetchError } = await supabase
                .from('studies')
                .select('*')
                .eq('id', studyId)
                .single();

            if (fetchError || !currentData) {
                console.error("Error fetching study for Knowledge Intelligence update:", fetchError?.message || fetchError);
                return false;
            }

            // 2. Prepare JSON object
            let knowledgeData = currentData.knowledge_intelligence || {};
            if (typeof knowledgeData !== 'object' || knowledgeData === null) {
                knowledgeData = {};
            }

            // 3. Merge content
            knowledgeData[entityName] = { ...(knowledgeData[entityName] || {}), ...content };

            // 4. Write back to 'knowledge_intelligence' column
            const { error: updateError } = await supabase
                .from('studies')
                .update({ knowledge_intelligence: knowledgeData })
                .eq('id', studyId);

            if (updateError) {
                console.error("Error updating knowledge_intelligence:", updateError.message);
                return false;
            }

            return true;
        } catch (e) {
            console.error("Exception in updateKnowledgeIntelligence:", e);
            return false;
        }
    }

    private static async saveToLegacyTable(study: StudyItem): Promise<boolean> {
        try {
            const payload = {
                id: study.id,
                title: study.title,
                content: study.intelligence.clean_text || "No content provided.", 
                date: study.date,
                source: study.source,
                status: study.status,
                tags: study.tags,
                intelligence: study.intelligence,
                "Super intelligence": study.super_intelligence || {},
                knowledge_intelligence: study.knowledge_intelligence || {}
            };

            // Use upsert to handle updates gracefully
            const { error } = await supabase.from('studies').upsert(payload, { onConflict: 'id' });

            if (error) {
                console.error('Error saving study to DB:', error.message);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Exception in saveToLegacyTable:", e);
            return false;
        }
    }

    /**
     * EXTRACTS data and writes to 'entities' and 'relations' tables.
     * This creates a queryable SQL structure alongside the JSON blob.
     * Uses Upsert to be idempotent.
     */
    private static async saveNormalizedData(study: StudyItem): Promise<void> {
        const studyId = study.id;
        
        // 1. Prepare Entities Payload
        // We use a Map to ensure unique entities by name within this batch
        const uniqueEntities = new Map();
        study.intelligence.entities.forEach(e => {
            if (!uniqueEntities.has(e.name)) {
                uniqueEntities.set(e.name, {
                    study_id: studyId,
                    name: e.name,
                    type: e.type,
                    role: e.description || 'Unknown',
                    metadata: { confidence: e.confidence }
                });
            }
        });
        const entityRows = Array.from(uniqueEntities.values());

        // 2. Prepare Relations Payload
        const relationRows = study.intelligence.relations.map((r: Relation) => ({
            study_id: studyId,
            source_entity: r.source,
            target_entity: r.target,
            relation_type: r.type,
            confidence: r.confidence
        }));

        // 3. Parallel Upsert (Fire & Forget style)
        if (entityRows.length > 0) {
            // Note: In a real Prod env, you'd likely have a UNIQUE(study_id, name) constraint on entities
            const { error } = await supabase.from('entities').upsert(entityRows, { ignoreDuplicates: true });
            if (error) console.warn("Entity sync warning:", error.message);
        }
        if (relationRows.length > 0) {
            const { error } = await supabase.from('relations').upsert(relationRows, { ignoreDuplicates: true });
            if (error) console.warn("Relation sync warning:", error.message);
        }
    }

    /**
     * Batch inserts initial mock data into the database.
     */
    static async seedStudies(studies: StudyItem[]): Promise<boolean> {
        try {
            const payload = studies.map(s => ({
                id: generateUUID(), 
                title: s.title,
                content: s.intelligence.clean_text || "No content provided.",
                date: s.date,
                source: s.source,
                status: s.status,
                tags: s.tags,
                intelligence: s.intelligence,
                "Super intelligence": {},
                knowledge_intelligence: {}
            }));

            // Use upsert to avoid crashing if seed runs twice
            const { error } = await supabase.from('studies').upsert(payload, { onConflict: 'title' });

            if (error) {
                console.error('Seed error message:', error.message); 
                return false;
            }
            return true;
        } catch (e: any) {
            console.error("Exception in seedStudies:", e.message || e);
            return false;
        }
    }
}
