
// ENUMS from DB
export type KnowledgeType = 'FACT' | 'ASSESSMENT' | 'HYPOTHESIS' | 'TASK' | 'WARNING';
export type EntityType = 'PERSON' | 'ORG' | 'LOCATION' | 'OBJECT' | 'METHOD' | 'EVENT' | 'OTHER';
export type StatementCategory = 'STRATEGIC' | 'FINANCIAL' | 'TACTICAL' | 'LOGISTICAL' | 'IDEOLOGICAL' | 'COLLECTION' | 'OTHER';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
export type RelationshipType = 'ASSOCIATED_WITH' | 'COMMUNICATED_WITH' | 'FUNDED_BY' | 'MOVED_TO' | 'OWNED_BY' | 'ALIAS_OF' | 'PART_OF' | 'USED_IN' | 'OPERATED_BY' | 'UNKNOWN';

// CORE STRUCTURES

export interface DocumentMetadata {
  document_id?: string;
  title: string;
  classification: string;
  author: string;
  source_orgs: string;
  language: string;
}

export interface Statement {
  statement_id: string; // UUID
  knowledge: KnowledgeType;
  category: StatementCategory;
  statement_text: string;
  confidence: number; // 0.00 - 1.00
  assumption_flag: boolean;
  intelligence_gap: boolean;
  impact: ImpactLevel;
  operational_relevance: UrgencyLevel;
  related_entities?: string[]; // IDs of entities involved
}

export interface IntelQuestion { // "questions" table
  question_id: string;
  statement_id?: string; // Linked context
  question_text: string;
  priority: ImpactLevel;
  owner?: string;
}

export interface IntelTask { // "tasks" table
  task_id: string;
  statement_id?: string; // Linked context
  task_text: string;
  urgency: UrgencyLevel;
  status: 'OPEN' | 'CLOSED';
}

export interface Entity {
  id: string; // UUID
  name: string; // canonical_name
  type: EntityType | string; // Relaxed for UI
  description?: string;
  confidence?: number;
}

export interface Relation {
  source: string; // Entity ID or Name
  target: string; // Entity ID or Name
  type: RelationshipType | string; 
  confidence: number;
  statement_id?: string; // Provenance
}

// UI & LEGACY COMPATIBILITY TYPES

export interface Insight {
  type: 'key_event' | 'pattern' | 'anomaly' | 'summary';
  importance: number;
  text: string;
}

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface TacticalAssessment {
  ttps: string[]; 
  recommendations: string[]; 
  gaps: string[]; 
}

export interface ContextCard {
  // Identification for Algorithm
  id?: string; 
  score?: number; // 0-100 score based on graph importance

  entityName: string;
  type?: string;
  summary: string;
  key_mentions: string[];
  role_in_document: string;
  extended_profile?: string;
  // Enhanced Fields
  significance?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affiliation?: string;
  aliases?: string[];
  status?: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' | 'DETAINED' | 'ELIMINATED';
  isShallow?: boolean; // Flag to indicate if this is a placeholder from initial scan
}

export interface GraphNode {
  id: string;
  group: number;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  value: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  label: string;
  description?: string;
  tags?: string[];
}

export interface RawMedia {
  id: string;
  type: 'image' | 'video' | 'text' | 'log' | 'audio';
  title: string;
  url?: string;
  content?: string;
  date?: string;
  metadata?: Record<string, string>;
  annotations?: Annotation[]; 
}

// --- BIOMETRIC TYPES ---
export interface FaceRecognition {
    id: string;
    detectedName: string;
    matchConfidence: number; 
    imageUrl: string;
    timestamp?: string; 
    sourceFile: string;
    watchlistStatus: 'MATCH' | 'UNKNOWN' | 'CLEAR';
}

export interface VoicePrint {
    id: string;
    speakerName: string;
    matchConfidence: number;
    language: string;
    tone: string;
    clipUrl?: string; 
    transcript?: string;
}

export interface BiometricData {
    faces: FaceRecognition[];
    voices: VoicePrint[];
}

export interface NarrativeBlock {
    insertAfterIndex: number;
    title: string;
    explanation: string;
    type: 'TRIGGER' | 'CONTEXT' | 'RESULT';
}

// The main object used in the UI
export interface IntelligencePackage {
  clean_text: string; // Summary
  raw_text?: string; // Original Text for DB
  word_count: number;
  
  // New Structured Data
  document_metadata?: DocumentMetadata;
  statements?: Statement[];
  intel_questions?: IntelQuestion[];
  intel_tasks?: IntelTask[];

  // Graph / Visualization Data
  entities: Entity[];
  relations: Relation[];
  
  // Legacy / Derived Data
  insights: Insight[];
  timeline?: TimelineEvent[]; 
  tactical_assessment?: TacticalAssessment;
  context_cards: Record<string, ContextCard>; 
  graph: GraphData;
  reliability?: number;
  media?: RawMedia[]; 
  biometrics?: BiometricData;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface StudyItem {
  id: string;
  title: string;
  date: string;
  source: 'Telegram' | 'News' | 'Report' | 'Signal';
  status: 'Approved' | 'Review' | 'Processing';
  thumbnailUrl?: string; 
  intelligence: IntelligencePackage; 
  tags: string[];
  super_intelligence?: Record<string, any>; // Context Cards (Standard)
  knowledge_intelligence?: Record<string, any>; // Expanded Intel (Deep Dive)
}

// ... (Rest of UI types like TeamMember, Task, PinnedItem remain largely same for UI state)
export interface TeamMember { id: string; name: string; role: string; status: 'online' | 'busy' | 'offline'; avatar: string; }
export interface Task { id: string; title: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; status: 'COLLECTION' | 'PROCESSING' | 'REVIEW' | 'FINISHED'; assigneeId?: string; tag: string; dueDate?: string; relatedStudyId?: string; }
export interface TeamMessage { id: string; senderId: string; content: string; timestamp: Date; isSystem?: boolean; }
export interface PinnedItem { id: string; type: 'entity' | 'insight' | 'snippet' | 'file'; title: string; content: string; sourceId?: string; context?: string; }
export interface SynapseHypothesis { type: 'HYPOTHESIS' | 'PATTERN' | 'PREDICTION'; title: string; description: string; confidence: number; evidence: { sourceStudyId: string; sourceStudyTitle: string; text: string; }[]; }
export interface SynapseAnalysis { summary: string; results: SynapseHypothesis[]; }
