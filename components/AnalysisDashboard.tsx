
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { IntelligencePackage, ChatMessage, Entity, ContextCard, StudyItem, TimelineEvent, PinnedItem, SynapseAnalysis, Relation, NarrativeBlock } from '../types';
// Import generateStoryFromTimeline
import { askContextualQuestion, generateEntityContext, generateExecutiveBrief, generateSynthesis, isEntityMatch, generateSynapseAnalysis, generateExtendedEntityProfile, crossReferenceStudies, generateTimelineNarrative, reanalyzeEntityWithCrossReference, generateStoryFromTimeline } from '../services/geminiService';
import { StudyService, generateUUID } from '../services/studyService';
import GraphView from './GraphView';
import MapView from './MapView';
import SourceView from './SourceView';
import { 
  Network, 
  BrainCircuit, 
  Search, 
  MessageSquare, 
  Users, 
  MapPin, 
  Building2, 
  Calendar,
  Zap,
  ChevronRight,
  Send,
  X,
  Loader2,
  ArrowLeft,
  Lightbulb,
  ExternalLink,
  Download,
  Clock,
  ShieldCheck,
  FileText,
  Link,
  FolderOpen,
  Folder,
  Layers,
  Box,
  Map,
  FileSearch,
  History,
  Target,
  AlertOctagon,
  ClipboardList,
  Save,
  MessageCircle,
  Minimize2,
  Trash2,
  StickyNote,
  AlertTriangle,
  GitMerge,
  Share2,
  Pin,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Quote,
  GitCommit,
  HelpCircle,
  FileQuestion,
  FlaskConical,
  Activity,
  Fingerprint,
  ScanFace,
  Mic,
  UserCheck,
  Scan,
  MoreHorizontal,
  Bookmark,
  Check,
  ZapOff,
  Cpu,
  BookOpen,
  FolderSymlink,
  Waypoints,
  Play,
  Pause,
  User,
  AudioWaveform,
  CalendarRange,
  ArrowDown,
  Info,
  GitBranch,
  ArrowRightLeft,
  Book,
  Eye,
  Settings2,
  Maximize,
  Plus,
  RefreshCcw,
  Filter,
  Workflow
} from 'lucide-react';

interface AnalysisDashboardProps {
  data: IntelligencePackage;
  allStudies: StudyItem[];
  onReset: () => void;
  onSave: () => void;
  onSelectStudy: (study: StudyItem) => void;
  study: StudyItem;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ data, allStudies, onReset, onSave, onSelectStudy, study }) => {
  const [localEntities, setLocalEntities] = useState<Entity[]>(data.entities);
  const [localGraph, setLocalGraph] = useState(data.graph);
  const [localMedia, setLocalMedia] = useState(data.media || []);
  const [analystNotes, setAnalystNotes] = useState<Record<string, string>>({});
  
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'graph' | 'map' | 'timeline' | 'biometrics' | 'assessment' | 'evidence' | 'insights' | 'synapse'>('graph');
  const [entitySearch, setEntitySearch] = useState('');
  const [graphSearch, setGraphSearch] = useState('');

  // --- FILTER STATE ---
  const [showFilters, setShowFilters] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const [activeTypeFilters, setActiveTypeFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'confidence'>('name');

  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  // --- CROSS REFERENCE (MERGE) STATE ---
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedMergeIds, setSelectedMergeIds] = useState<Set<string>>(new Set());
  const [isMerging, setIsMerging] = useState(false);
  const [mergedInsight, setMergedInsight] = useState<string | null>(null);

  // --- TIMELINE STATE ---
  const [timelineSortOrder, setTimelineSortOrder] = useState<'asc' | 'desc'>('asc');
  const [timelineGroupBy, setTimelineGroupBy] = useState<'none' | 'week'>('none');
  const [narrativeBlocks, setNarrativeBlocks] = useState<NarrativeBlock[]>([]);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [showCausalityReport, setShowCausalityReport] = useState(false); // NEW: Toggles the Textual Document View
  
  // --- NARRATIVE STORY STATE ---
  const [causalityStory, setCausalityStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // --- BIOMETRICS STATE (NEW) ---
  const [selectedBioId, setSelectedBioId] = useState<string | null>(null);
  const [bioTab, setBioTab] = useState<'all' | 'faces' | 'voices'>('all');

  // --- DROPDOWN STATE FOR TABS ---
  const [isMoreTabsOpen, setIsMoreTabsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- PLAYBACK STATE FOR BIOMETRICS ---
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreTabsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [viewingLinkedStudy, setViewingLinkedStudy] = useState<StudyItem | null>(null);
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [synthesisText, setSynthesisText] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  const [synapseAnalysis, setSynapseAnalysis] = useState<SynapseAnalysis | null>(null);
  const [isAnalyzingSynapse, setIsAnalyzingSynapse] = useState(false);

  const [contextCardsCache, setContextCardsCache] = useState<Record<string, ContextCard>>(data.context_cards || {});
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [isExpandingProfile, setIsExpandingProfile] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'PERSON': true, 'ORGANIZATION': true, 'LOCATION': true, 'ASSET': true, 'EVENT': false, 'DATE': false, 'MISC': false
  });

  const allGlobalEntities = useMemo(() => {
    if (!allStudies) return [];
    return allStudies.flatMap(s => s.intelligence.entities);
  }, [allStudies]);

  // Init selectedBioId when entering biometrics tab or data changes
  useEffect(() => {
      if (activeTab === 'biometrics' && !selectedBioId) {
          const firstFace = data.biometrics?.faces?.[0]?.id;
          const firstVoice = data.biometrics?.voices?.[0]?.id;
          if (firstFace) setSelectedBioId(firstFace);
          else if (firstVoice) setSelectedBioId(firstVoice);
      }
  }, [activeTab, data.biometrics, selectedBioId]);

  // Clear narrative when data changes
  useEffect(() => {
      setCausalityStory(null);
  }, [data, timelineSortOrder, timelineGroupBy]);

  // PRE-LOAD CACHE FROM SUPER INTELLIGENCE & KNOWLEDGE INTELLIGENCE COLUMNS
  useEffect(() => {
    setLocalEntities(data.entities);
    setLocalGraph(data.graph);
    setLocalMedia(data.media || []);
    setChatHistory([]);
    setSynapseAnalysis(null);
    setMergedInsight(null);
    setSelectedMergeIds(new Set());
    setNarrativeBlocks([]); 

    const enrichedCache = { ...data.context_cards };

    // --- INTEGRATE SUPER INTELLIGENCE (Standard Context) ---
    if (study.super_intelligence) {
        Object.entries(study.super_intelligence).forEach(([name, data]) => {
            const entData = data as any;
            const existing = enrichedCache[name];
            
            if (existing) {
                enrichedCache[name] = { 
                    ...existing, 
                    summary: entData.fusion_summary || existing.summary,
                    id: entData.id || existing.id,
                    score: entData.score || existing.score,
                    isShallow: false 
                };
            } else {
                const ent = study.intelligence.entities.find((e:Entity) => e.name === name);
                enrichedCache[name] = {
                    id: entData.id,
                    score: entData.score,
                    entityName: name,
                    type: ent?.type || 'UNKNOWN',
                    role_in_document: ent?.description || 'Identified Target',
                    summary: entData.fusion_summary || "Profile Loaded from Super Intelligence.",
                    key_mentions: [],
                    significance: 'HIGH',
                    status: 'ACTIVE',
                    isShallow: false
                };
            }
        });
    }

    // --- INTEGRATE KNOWLEDGE INTELLIGENCE (Extended Profiles) ---
    if (study.knowledge_intelligence) {
        Object.entries(study.knowledge_intelligence).forEach(([name, data]) => {
            const entData = data as any;
            if (enrichedCache[name]) {
                enrichedCache[name] = {
                    ...enrichedCache[name],
                    extended_profile: entData.extended_profile
                };
            }
        });
    }

    setContextCardsCache(enrichedCache);

  }, [data.clean_text, study.super_intelligence, study.knowledge_intelligence]);

  const getEntity = (id: string) => localEntities.find(e => e.id === id || e.name === id);
  const getContextCard = (name: string) => contextCardsCache[name];
  
  const selectedEntity = useMemo(() => getEntity(selectedEntityId || ''), [selectedEntityId, localEntities]);
  const effectiveEntity = useMemo(() => {
      if (selectedEntity) return selectedEntity;
      if (selectedEntityId) return { id: selectedEntityId, name: selectedEntityId, type: 'UNKNOWN', confidence: 0 } as Entity;
      return null;
  }, [selectedEntity, selectedEntityId]);

  const contextCard = useMemo(() => getContextCard(selectedEntityId || ''), [selectedEntityId, contextCardsCache]);

  const normalize = (str: string) => str.toLowerCase().trim().replace(/[-_]/g, ' ');

  const handlePinItem = (type: PinnedItem['type'], title: string, content: string, sourceId?: string) => {
      const newItem: PinnedItem = { id: Date.now().toString(), type, title, content, sourceId, context: activeTab.toUpperCase() };
      setPinnedItems(prev => [...prev, newItem]);
  };

  const handleSynthesize = async () => {
      setShowSynthesis(true);
      if (!synthesisText) {
          setIsSynthesizing(true);
          try {
              const text = await generateSynthesis(pinnedItems);
              setSynthesisText(text);
          } catch (e) { console.error(e); } finally { setIsSynthesizing(false); }
      }
  };

  const calculateTargetScore = (nodeId: string): number => {
      // Basic heuristic: Connections * Confidence
      const connections = data.relations.filter(r => r.source === nodeId || r.target === nodeId);
      const degree = connections.length;
      const avgConfidence = connections.reduce((acc, r) => acc + r.confidence, 0) / (degree || 1);
      
      // Normalized Score 0-100
      let score = (degree * 10) + (avgConfidence * 20);
      return Math.min(Math.round(score), 100);
  };

  const handleNodeClick = async (nodeId: string) => {
    // 1. Immediate UI update
    setSelectedEntityId(nodeId);
    setSuggestedQueries([]); 

    // 2. Check Cache
    const existingCard = contextCardsCache[nodeId];

    // 3. Fetch full context if missing or shallow
    if (!existingCard || existingCard.isShallow) {
        setIsLoadingCard(true);
        try {
            // --- ENHANCED CONTEXT BUILDING ---
            const relatedRels = data.relations
                .filter(r => r.source === nodeId || r.target === nodeId)
                .map(r => `> Connected to ${r.source === nodeId ? r.target : r.source} via [${r.type}]`)
                .join('\n');
            
            const richContext = `
DOCUMENT SOURCE TEXT:
"""${data.raw_text || data.clean_text || "Text unavailable."}"""

KNOWN NETWORK CONNECTIONS (GRAPH DATA):
${relatedRels || "No direct connections found in graph."}
            `;

            const newCard = await generateEntityContext(nodeId, richContext);
            
            // --- GENERATE ID AND SCORE ---
            const targetId = generateUUID();
            const targetScore = calculateTargetScore(nodeId);

            const enrichedCard: ContextCard = {
                ...newCard,
                id: targetId,
                score: targetScore,
                isShallow: false
            };
            
            // Update Local State
            setContextCardsCache(prev => ({ 
                ...prev, 
                [nodeId]: enrichedCard
            }));

            // --- SAVE TO SUPER INTELLIGENCE (Standard Context) ---
            if (study && study.id) {
                // Ensure we save ID and Score along with the summary
                await StudyService.updateSuperIntelligence(study.id, nodeId, { 
                    fusion_summary: newCard.summary,
                    id: targetId,
                    score: targetScore
                });
            }

        } catch (e) { 
            console.error("Context Gen Failed:", e); 
        } finally { 
            setIsLoadingCard(false); 
        }
    }
  };

  // Manual retry handler if card is empty
  const handleRetryContext = async () => {
      if (!selectedEntityId) return;
      setIsLoadingCard(true);
      try {
          const relatedRels = data.relations
                .filter(r => r.source === selectedEntityId || r.target === selectedEntityId)
                .map(r => `> Connected to ${r.source === selectedEntityId ? r.target : r.source} via [${r.type}]`)
                .join('\n');
            
          const richContext = `
DOCUMENT SOURCE TEXT:
"""${data.raw_text || data.clean_text || ""}"""

KNOWN NETWORK CONNECTIONS:
${relatedRels}
          `;
          const newCard = await generateEntityContext(selectedEntityId, richContext);
          
          const targetId = generateUUID();
          const targetScore = calculateTargetScore(selectedEntityId);
          
          const enrichedCard = { ...newCard, id: targetId, score: targetScore, isShallow: false };

          setContextCardsCache(prev => ({ ...prev, [selectedEntityId]: enrichedCard }));

          if (study && study.id) {
              await StudyService.updateSuperIntelligence(study.id, selectedEntityId, { 
                  fusion_summary: newCard.summary,
                  id: targetId,
                  score: targetScore
              });
          }

      } catch (e) { console.error(e); } finally { setIsLoadingCard(false); }
  };

  const handleDeepReanalysis = async () => {
      if (!selectedEntityId || !contextCard) return;
      setIsReanalyzing(true);
      try {
          const newSummary = await reanalyzeEntityWithCrossReference(
              selectedEntityId, 
              data.raw_text || data.clean_text || "", 
              linkedStudiesForEntity
          );
          
          if (newSummary.startsWith("Unable to")) {
             alert(newSummary); // Alert the user instead of corrupting the data
             return;
          }

          const updatedCard = { ...contextCard, summary: newSummary };
          setContextCardsCache(prev => ({ ...prev, [selectedEntityId]: updatedCard }));
          
          // Persist to "Super Intelligence" column as JSONB (update summary only)
          if (study && study.id) {
             await StudyService.updateSuperIntelligence(study.id, selectedEntityId, { fusion_summary: newSummary });
          }
      } catch (e) { console.error(e); } finally { setIsReanalyzing(false); }
  };

  const handleExpandContext = async () => {
      if (!selectedEntityId || !contextCard) return;
      if (contextCard.extended_profile) return;
      setIsExpandingProfile(true);
      try {
          const extendedProfile = await generateExtendedEntityProfile(selectedEntityId, data.clean_text || "");
          const updatedCard = { ...contextCard, extended_profile: extendedProfile };
          setContextCardsCache(prev => ({ ...prev, [selectedEntityId]: updatedCard }));
          
          // Save locally to legacy blob (UI cache)
          await StudyService.updateStudyContextCard(study.id, selectedEntityId, updatedCard);
          
          // --- SAVE TO KNOWLEDGE INTELLIGENCE (Expanded Profile) ---
          if (study && study.id) {
              await StudyService.updateKnowledgeIntelligence(study.id, selectedEntityId, { 
                  extended_profile: extendedProfile 
              });
          }

      } catch (e) { console.error("Error expanding profile:", e); } finally { setIsExpandingProfile(false); }
  };

  const handleDeleteEntity = (id: string) => {
      setLocalEntities(prev => prev.filter(e => e.id !== id && e.name !== id));
      if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const handleAddRealTimeEntity = (name: string, type: string) => {
      const newEntity: Entity = { id: name, name: name, type: type, confidence: 1.0 };
      setLocalEntities(prev => { if (prev.some(e => e.name === name)) return prev; return [...prev, newEntity]; });
      setLocalGraph(prev => ({ nodes: [...prev.nodes, { id: name, group: 8, type }], edges: prev.edges }));
  };

  const handleSendMessage = async (overrideMessage?: string) => {
    const messageContent = overrideMessage || chatInput;
    if (!messageContent.trim()) return;
    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: messageContent, timestamp: new Date() };
    setChatHistory(prev => [...prev, newMessage]);
    setChatInput('');
    setIsChatting(true);
    if(!isChatOpen) setIsChatOpen(true);
    try {
      const response = await askContextualQuestion(newMessage.content, data, chatHistory);
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: response, timestamp: new Date() }]);
    } catch (e) { console.error(e); } finally { setIsChatting(false); }
  };

  const toggleMergeSelection = (id: string) => {
      const next = new Set(selectedMergeIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedMergeIds(next);
  };

  const executeMerge = async () => {
      if (selectedMergeIds.size === 0) return;
      setIsMerging(true);
      try {
          const selectedStudies = allStudies.filter(s => selectedMergeIds.has(s.id));
          const insight = await crossReferenceStudies(data, selectedStudies);
          setMergedInsight(insight);
          let newNodes = [...localGraph.nodes];
          let newEdges = [...localGraph.edges];
          let newEntities = [...localEntities];
          selectedStudies.forEach(s => {
              s.intelligence.entities.forEach(e => {
                  if (!newEntities.find(le => le.name === e.name)) { newEntities.push({ ...e, type: e.type + ' (External)' }); }
                  if (!newNodes.find(n => n.id === e.name)) { newNodes.push({ id: e.name, group: 9, type: 'IMPORTED' }); }
              });
              s.intelligence.graph.edges.forEach(e => { newEdges.push({ ...e, value: 1 }); });
          });
          setLocalGraph({ nodes: newNodes, edges: newEdges });
          setLocalEntities(newEntities);
          setShowMergeModal(false);
          setActiveTab('synapse');
      } catch (e) { console.error("Merge failed", e); } finally { setIsMerging(false); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isChatOpen]);

  const handleGenerateBrief = async () => {
    setShowBriefing(true);
    if (!briefingText) {
        setIsGeneratingBrief(true);
        try { const text = await generateExecutiveBrief(data); setBriefingText(text); } catch(e) { } finally { setIsGeneratingBrief(false); }
    }
  };

  const handleOpenLinkedStudy = (studyId: string) => {
      const study = allStudies.find(s => s.id === studyId);
      if (study) setViewingLinkedStudy(study);
  };
  
  const handleRunSynapse = async () => {
      const linkedStudies = allStudies.filter(s => s.id !== study.id && allBridgedEntities.some(bridge => s.intelligence.entities.some(e => isEntityMatch(e.name, bridge.name))));
      if (linkedStudies.length === 0) return;
      setIsAnalyzingSynapse(true);
      try { const result = await generateSynapseAnalysis(study, linkedStudies); setSynapseAnalysis(result); } catch (error) { console.error(error); } finally { setIsAnalyzingSynapse(false); }
  };

  // --- NEW: Narrative Generation ---
  const handleGenerateNarrative = async () => {
      setIsGeneratingNarrative(true);
      try {
          const blocks = await generateTimelineNarrative(combinedTimeline);
          setNarrativeBlocks(blocks);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingNarrative(false);
      }
  };

  // --- FILTER & SORT LOGIC ---
  const availableTypes = useMemo(() => Array.from(new Set(localEntities.map(e => e.type))), [localEntities]);

  const toggleTypeFilter = (type: string) => {
      setActiveTypeFilters(prev => 
          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
  };

  const groupedEntities = useMemo<Record<string, Entity[]>>(() => {
    const groups: Record<string, Entity[]> = {};
    const lowerSearch = entitySearch.toLowerCase();
    
    // 1. Filter
    const filtered = (localEntities || []).filter(entity => {
       const matchesSearch = !lowerSearch || entity.name.toLowerCase().includes(lowerSearch) || entity.type.toLowerCase().includes(lowerSearch);
       const matchesConf = (entity.confidence || 0) * 100 >= minConfidence;
       const matchesType = activeTypeFilters.length === 0 || activeTypeFilters.includes(entity.type);
       return matchesSearch && matchesConf && matchesType;
    });

    // 2. Sort
    filtered.sort((a, b) => {
        if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
        return a.name.localeCompare(b.name);
    });

    // 3. Group
    filtered.forEach(entity => {
      if (!groups[entity.type]) groups[entity.type] = [];
      groups[entity.type].push(entity);
    });
    return groups;
  }, [localEntities, entitySearch, minConfidence, activeTypeFilters, sortBy]);

  const toggleCategory = (cat: string) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleAllCategories = (open: boolean) => setExpandedCategories(Object.keys(groupedEntities).reduce((acc, key) => ({ ...acc, [key]: open }), {}));

  const directConnections: Relation[] = useMemo(() => {
    if (!selectedEntityId) return [];
    const normSelected = selectedEntityId.toLowerCase().trim();
    return data.relations.filter(r => {
        const strictMatch = isEntityMatch(r.source, selectedEntityId) || isEntityMatch(r.target, selectedEntityId);
        const sourceLower = r.source.toLowerCase();
        const targetLower = r.target.toLowerCase();
        const looseMatch = sourceLower.includes(normSelected) || normSelected.includes(sourceLower) || targetLower.includes(normSelected) || normSelected.includes(targetLower);
        return strictMatch || looseMatch;
    });
  }, [selectedEntityId, data.relations]);

  const allBridgedEntities = useMemo(() => {
    if (!allStudies || !study) return [];
    const otherStudies = allStudies.filter(s => s.id !== study.id);
    const otherEntityNames: string[] = [];
    otherStudies.forEach(s => { s.intelligence.entities.forEach(e => otherEntityNames.push(e.name)); });
    return localEntities.filter(localEnt => otherEntityNames.some(otherName => isEntityMatch(localEnt.name, otherName)));
  }, [localEntities, allStudies, study.id]);

  const linkedStudiesForEntity = useMemo(() => {
      if (!effectiveEntity || !allStudies) return [];
      return allStudies.filter(s => s.id !== study.id && s.intelligence.entities.some(e => isEntityMatch(e.name, effectiveEntity.name)));
  }, [effectiveEntity, allStudies, study.id]);

  const gapAnalysisResults = useMemo(() => {
      const gaps = data.tactical_assessment?.gaps || [];
      if (gaps.length === 0) return [];
      
      const results: { gap: string; leads: { sourceStudy: StudyItem; text: string }[] }[] = [];
      
      gaps.forEach(gap => {
          // Find potential leads in other studies based on shared entities (simple heuristic for POC)
          const relevantStudies = allStudies.filter(s => 
              s.id !== study.id && 
              s.intelligence.entities.some(e => 
                  data.entities.some(localE => isEntityMatch(e.name, localE.name))
              )
          ).slice(0, 2); 

          if (relevantStudies.length > 0) {
              results.push({
                  gap,
                  leads: relevantStudies.map(s => ({
                      sourceStudy: s,
                      text: s.intelligence.insights[0]?.text || "Potential correlation found in this report."
                  }))
              });
          }
      });
      
      return results;
  }, [data, allStudies, study.id]);

  // --- TIMELINE PROCESSING ---
  const combinedTimeline = useMemo(() => {
      const parseDate = (dateStr: string) => {
          if (!dateStr) return 0;
          const parts = dateStr.split('/');
          // Assume DD/MM/YYYY or similar formats
          if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) ? d.getTime() : 0;
      };

      // 1. Current events
      const currentEvents = (data.timeline || []).map(e => ({
          ...e,
          _source: 'current',
          _studyId: study.id,
          _studyTitle: study.title,
          _timestamp: parseDate(e.date)
      }));

      const externalEvents: any[] = [];
      const currentEntityNames = data.entities.map(e => e.name);

      // 2. Scan all other studies
      allStudies.forEach(s => {
          if (s.id === study.id) return;
          
          // Find WHICH entity is the bridge
          const bridgingEntity = s.intelligence.entities.find(ent => 
              currentEntityNames.some(localName => isEntityMatch(localName, ent.name))
          );

          if (bridgingEntity && s.intelligence.timeline) {
              s.intelligence.timeline.forEach(e => {
                  externalEvents.push({
                      ...e,
                      _source: 'external',
                      _studyId: s.id,
                      _studyTitle: s.title,
                      _timestamp: parseDate(e.date),
                      _bridgeEntity: bridgingEntity.name, // Store the entity that caused this link
                      _contextSummary: s.intelligence.insights?.[0]?.text || "No context available." // ADDED: Deeper context for the AI
                  });
              });
          }
      });

      // 3. Merge and Sort
      let merged = [...currentEvents, ...externalEvents].filter(e => e._timestamp > 0);
      
      // Sort
      merged.sort((a, b) => {
          return timelineSortOrder === 'asc' 
            ? a._timestamp - b._timestamp
            : b._timestamp - a._timestamp;
      });

      return merged;
  }, [data, allStudies, study, timelineSortOrder]);

  const renderEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return <Users size={18} className="text-rose-400" />;
      case 'ORGANIZATION': return <Building2 size={18} className="text-sky-400" />;
      case 'LOCATION': return <MapPin size={18} className="text-emerald-400" />;
      case 'DATE': return <Calendar size={18} className="text-amber-400" />;
      case 'ASSET': return <Box size={18} className="text-amber-500" />;
      case 'EVENT': return <Zap size={18} className="text-purple-400" />;
      default: return <Layers size={18} className="text-slate-400" />;
    }
  };

  // --- NEW: HANDLE OPEN CAUSALITY REPORT ---
  const handleOpenCausalityReport = () => {
      setShowCausalityReport(true);
      if (!causalityStory && !isGeneratingStory) {
          generateNarrativeStory();
      }
  };

  const generateNarrativeStory = async () => {
      setIsGeneratingStory(true);
      try {
          const story = await generateStoryFromTimeline(combinedTimeline);
          setCausalityStory(story);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingStory(false);
      }
  };

  // --- NEW: CAUSALITY DOCUMENT REPORT RENDERING ---
  const renderCausalityReport = () => {
      if (!showCausalityReport) return null;

      // PARSING FUNCTION: Replaces {{LINK:index}} with interactive components
      const renderParsedStory = () => {
          if (!causalityStory) return null;
          
          // Split by placeholder pattern
          const parts = causalityStory.split(/({{LINK:\d+}})/g);
          
          return parts.map((part, i) => {
              if (part.startsWith('{{LINK:')) {
                  const match = part.match(/{{LINK:(\d+)}}/);
                  if (match) {
                      const index = parseInt(match[1]);
                      const event = combinedTimeline[index];
                      if (event) {
                          return (
                              <span 
                                  key={i} 
                                  className="inline-flex items-baseline gap-1 text-amber-500 cursor-pointer hover:text-amber-400 hover:underline decoration-dashed underline-offset-4 font-bold mx-1 transition-colors"
                                  onClick={() => {
                                      handleOpenLinkedStudy(event._studyId);
                                      // Optional: close report or keep it open? Let's keep it open but maybe shrink it or overlay.
                                      // For now, simpler interaction is to view context in background or dedicated modal.
                                      // Better UX: Close report to show context.
                                      setShowCausalityReport(false);
                                  }}
                                  title={`Source: ${event._studyTitle}`}
                              >
                                  {event.event}
                                  <ExternalLink size={10} className="self-center" />
                              </span>
                          );
                      }
                  }
              }
              // Return regular text
              return <span key={i} className="text-slate-300">{part}</span>;
          });
      };

      return (
          <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn">
              <div className="bg-[#121212] border border-amber-500/30 w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl shadow-2xl relative overflow-hidden">
                  
                  {/* Decorative Header Bar */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                  
                  <button onClick={() => setShowCausalityReport(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20">
                      <X size={20} />
                  </button>

                  <div className="p-8 border-b border-slate-800 bg-[#121212]">
                      <div className="flex items-center gap-3 mb-2">
                          <Workflow className="text-amber-500" size={24} />
                          <h2 className="text-2xl font-bold text-white tracking-tight">CAUSALITY REPORT</h2>
                      </div>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-[0.2em]">INTELLIGENCE FUSION // CHRONOLOGICAL RECONSTRUCTION</p>
                  </div>

                  <div className="p-10 overflow-y-auto flex-1 bg-[#09090b] font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                      {isGeneratingStory ? (
                          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                              <Loader2 className="animate-spin text-amber-500" size={32} />
                              <div className="text-xs font-mono uppercase tracking-widest">Constructing Narrative...</div>
                          </div>
                      ) : (
                          <div className="max-w-2xl mx-auto space-y-6 relative whitespace-pre-wrap">
                              {renderParsedStory()}
                          </div>
                      )}
                      
                      {!isGeneratingStory && (
                          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
                              --- END OF REPORT ---
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  // --- NEW SPLIT-STREAM TIMELINE RENDERER ---
  const renderSplitStreamTimeline = () => {
      let lastDate: number = 0;

      return (
          <div className="relative max-w-6xl mx-auto pl-4 pr-4">
              
              {/* EXPLANATORY HEADER & CONTROLS */}
              <div className="mb-10 bg-[#121212] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#05DF9C] to-amber-500"></div>
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                              <GitBranch size={20} className="text-slate-400" />
                              CHRONOS: INTELLIGENCE FUSION
                          </h3>
                          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                              This timeline merges events from the <span className="text-[#05DF9C] font-bold">Current Report (Right)</span> with historical data from <span className="text-amber-500 font-bold">Linked Studies (Left)</span>.
                              Connections are drawn when entities appear in both contexts, revealing hidden temporal patterns.
                          </p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                          <button 
                              onClick={handleOpenCausalityReport}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 hover:scale-105"
                          >
                              <FileText size={14} /> Trace Causality Report
                          </button>
                          
                          <div className="flex gap-4 text-[10px] font-mono font-bold uppercase tracking-wider">
                              <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/20 rounded border border-amber-900/50 text-amber-500">
                                  <ArrowLeft size={12} /> Historical Context
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-[#05DF9C]/10 rounded border border-[#05DF9C]/20 text-[#05DF9C]">
                                  Current Operation <ArrowRightLeft size={12} />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* CENTRAL SPINE */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800 transform -translate-x-1/2 z-0"></div>

              <div className="space-y-12 relative z-10">
                  {combinedTimeline.map((event: any, idx: number) => {
                      const isExternal = event._source === 'external';
                      
                      // Check for Narrative Block Insertion
                      const narrative = narrativeBlocks.find(b => b.insertAfterIndex === idx - 1); // Insert BEFORE this event (so check prev index)

                      // Gap Detection
                      let showGap = false;
                      if (lastDate > 0 && event._timestamp > 0) {
                          const diffDays = Math.ceil(Math.abs(event._timestamp - lastDate) / (1000 * 60 * 60 * 24));
                          if (diffDays > 14) showGap = true;
                      }
                      lastDate = event._timestamp;

                      return (
                          <div key={`${event.date}-${idx}`} className="relative">
                              
                              {/* INJECTED NARRATIVE BLOCK */}
                              {narrative && (
                                  <div className="flex justify-center my-12 animate-fadeIn relative z-20">
                                      <div className="w-[80%] max-w-2xl bg-[#16181d] border border-amber-500/40 rounded-xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative">
                                          {/* Connector Lines */}
                                          <div className="absolute -top-12 left-1/2 w-0.5 h-12 bg-amber-500/40 border-l border-dashed border-amber-500"></div>
                                          <div className="absolute -bottom-12 left-1/2 w-0.5 h-12 bg-amber-500/40 border-l border-dashed border-amber-500"></div>
                                          
                                          <div className="flex items-start gap-4">
                                              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                                  <GitCommit size={20} />
                                              </div>
                                              <div>
                                                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">{narrative.title}</h4>
                                                  <p className="text-sm text-slate-300 leading-relaxed font-medium">"{narrative.explanation}"</p>
                                                  <div className="mt-2 flex gap-2">
                                                      <span className="text-[9px] bg-black/40 px-2 py-1 rounded text-slate-500 font-mono uppercase">{narrative.type}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {/* TIME GAP INDICATOR */}
                              {showGap && (
                                  <div className="flex justify-center my-8">
                                      <div className="bg-[#09090b] border border-slate-700 text-slate-500 text-[9px] font-mono px-3 py-1 rounded-full flex items-center gap-2 z-20">
                                          <Clock size={10} /> TIME GAP DETECTED
                                      </div>
                                  </div>
                              )}

                              <div className={`flex items-center w-full ${isExternal ? 'justify-start' : 'justify-end'} group`}>
                                  
                                  {/* THE CARD */}
                                  <div className={`w-[45%] relative ${isExternal ? 'pr-8' : 'pl-8'}`}>
                                      
                                      {/* Connector Dot */}
                                      <div className={`
                                          absolute top-6 w-3 h-3 rounded-full border-2 z-20 bg-[#09090b]
                                          ${isExternal 
                                              ? 'right-[-7px] border-amber-500 group-hover:bg-amber-500' 
                                              : 'left-[-7px] border-[#05DF9C] group-hover:bg-[#05DF9C]'}
                                          transition-colors
                                      `}></div>

                                      {/* Card Content */}
                                      <div 
                                          className={`
                                              p-5 rounded-xl border relative transition-all hover:scale-[1.02] cursor-pointer
                                              ${isExternal 
                                                  ? 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500 text-right' 
                                                  : 'bg-[#121212] border-slate-800 hover:border-[#05DF9C] text-left'}
                                          `}
                                          onClick={() => isExternal ? handleOpenLinkedStudy(event._studyId) : handlePinItem('snippet', event.date, event.event)}
                                      >
                                          {/* Date Badge */}
                                          <div className={`inline-block mb-3 px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${isExternal ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-[#05DF9C]/10 text-[#05DF9C] border-[#05DF9C]/20'}`}>
                                              {event.date}
                                          </div>

                                          <p 
                                              className={`text-sm font-medium leading-relaxed transition-colors ${isExternal ? 'text-amber-100/90' : 'text-slate-200'}`}
                                          >
                                              {event.event}
                                          </p>

                                          {/* BRIDGE BADGE (Crucial for explaining WHY this is here) */}
                                          {isExternal && event._bridgeEntity && (
                                              <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-col gap-1 items-end">
                                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                                                      <GitMerge size={10} /> Linked via {event._bridgeEntity}
                                                  </div>
                                                  <div className="text-[9px] text-slate-500 font-mono">
                                                      Source: {event._studyTitle}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
              
              {/* END OF LINE */}
              <div className="flex justify-center mt-12 pb-12">
                  <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
              </div>
          </div>
      );
  };

  const renderBiometricAnalysis = () => {
      // Helper to find selected bio item
      const faces = data.biometrics?.faces || [];
      const voices = data.biometrics?.voices || [];
      const allBioItems = [...faces.map(f => ({...f, type: 'face'})), ...voices.map(v => ({...v, type: 'voice'}))];
      const selectedItem = allBioItems.find(i => i.id === selectedBioId) || allBioItems[0];

      if (!selectedItem) {
          return (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <Scan size={48} className="opacity-20" />
                  <p className="text-sm font-mono uppercase tracking-widest">No Biometric Data Found</p>
              </div>
          );
      }

      const isFace = selectedItem.type === 'face';
      const statusColor = (selectedItem as any).watchlistStatus === 'MATCH' ? 'text-rose-500' : 'text-amber-500';
      const statusBorder = (selectedItem as any).watchlistStatus === 'MATCH' ? 'border-rose-500' : 'border-amber-500';

      return (
          <div className="flex h-full animate-fadeIn">
              {/* LEFT: TARGET LIST */}
              <div className="w-72 bg-[#121212] border-r border-slate-800 flex flex-col shrink-0">
                  <div className="p-4 border-b border-slate-800">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                          <Users size={14} /> Identified Targets
                      </h3>
                      <div className="flex bg-slate-900 rounded p-1">
                          <button onClick={() => setBioTab('all')} className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${bioTab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>ALL</button>
                          <button onClick={() => setBioTab('faces')} className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${bioTab === 'faces' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>FACES</button>
                          <button onClick={() => setBioTab('voices')} className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${bioTab === 'voices' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>VOICES</button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {allBioItems
                          .filter(i => bioTab === 'all' || (bioTab === 'faces' && i.type === 'face') || (bioTab === 'voices' && i.type === 'voice'))
                          .map((item: any) => (
                          <button 
                              key={item.id} 
                              onClick={() => setSelectedBioId(item.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedBioId === item.id ? 'bg-[#05DF9C]/10 border-[#05DF9C]/50' : 'bg-transparent border-transparent hover:bg-slate-800'}`}
                          >
                              <div className="relative shrink-0">
                                  {item.type === 'face' ? (
                                      <img src={item.imageUrl} className="w-10 h-10 rounded-md object-cover border border-slate-700" alt="target" />
                                  ) : (
                                      <div className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700 text-sky-400"><AudioWaveform size={16} /></div>
                                  )}
                                  {item.watchlistStatus === 'MATCH' && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-black animate-pulse"></div>}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                  <div className={`text-xs font-bold truncate ${selectedBioId === item.id ? 'text-white' : 'text-slate-300'}`}>
                                      {item.type === 'face' ? item.detectedName : item.speakerName}
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                      <span className="text-[9px] font-mono text-slate-500 uppercase">{item.type}</span>
                                      <span className={`text-[9px] font-mono font-bold ${item.matchConfidence > 0.9 ? 'text-[#05DF9C]' : 'text-amber-500'}`}>
                                          {(item.matchConfidence * 100).toFixed(0)}%
                                      </span>
                                  </div>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>

              {/* CENTER: ANALYSIS CANVAS */}
              <div className="flex-1 bg-[#09090b] flex flex-col relative overflow-hidden">
                  {/* Canvas Header */}
                  <div className="h-14 border-b border-slate-800 flex justify-between items-center px-6 bg-[#121212]">
                      <div className="flex items-center gap-4">
                          <div className={`px-2 py-1 rounded border text-[10px] font-bold uppercase ${(selectedItem as any).watchlistStatus === 'MATCH' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-amber-500/10 border-amber-500 text-amber-500'}`}>
                              {(selectedItem as any).watchlistStatus === 'MATCH' ? 'WATCHLIST CONFIRMED' : 'UNKNOWN SUBJECT'}
                          </div>
                          <div className="h-4 w-px bg-slate-700"></div>
                          <div className="text-xs text-slate-400 font-mono">ID: {selectedItem.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"><Maximize size={16} /></button>
                          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"><Settings2 size={16} /></button>
                      </div>
                  </div>

                  {/* Main Visualizer */}
                  <div className="flex-1 relative flex items-center justify-center p-8">
                      {/* Grid Background */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                      
                      {isFace ? (
                          <div className="relative group">
                              <img src={(selectedItem as any).imageUrl} className="max-h-[60vh] rounded-lg shadow-2xl border border-slate-700" alt="Analysis Subject" />
                              {/* Face Mesh Overlay Effect */}
                              <div className="absolute inset-0 border border-[#05DF9C]/30 rounded-lg pointer-events-none">
                                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-[#05DF9C]/50 rounded-full opacity-50 animate-pulse"></div>
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-[#05DF9C]/50 to-transparent"></div>
                                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#05DF9C]/50 to-transparent"></div>
                                  
                                  {/* Face Landmarks (Fake) */}
                                  <div className="absolute top-[35%] left-[35%] w-2 h-2 bg-[#05DF9C] rounded-full shadow-[0_0_10px_#05DF9C]"></div>
                                  <div className="absolute top-[35%] right-[35%] w-2 h-2 bg-[#05DF9C] rounded-full shadow-[0_0_10px_#05DF9C]"></div>
                                  <div className="absolute bottom-[35%] left-[50%] -translate-x-1/2 w-2 h-2 bg-[#05DF9C] rounded-full shadow-[0_0_10px_#05DF9C]"></div>
                              </div>
                              <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur border border-[#05DF9C]/30 px-3 py-2 rounded text-[#05DF9C] font-mono text-xs">
                                  <div>PITCH: +4.2°</div>
                                  <div>YAW: -1.8°</div>
                                  <div>QUALITY: 98.4</div>
                              </div>
                          </div>
                      ) : (
                          <div className="w-full max-w-2xl bg-[#121212] border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-purple-500 to-sky-500 animate-pulse"></div>
                              <div className="flex items-center gap-6 mb-8">
                                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                                      <Mic size={32} />
                                  </div>
                                  <div>
                                      <div className="text-2xl font-bold text-white">{(selectedItem as any).speakerName}</div>
                                      <div className="text-sm text-slate-400 font-mono">Voiceprint ID: {selectedItem.id}</div>
                                  </div>
                              </div>
                              
                              {/* Fake Spectrogram */}
                              <div className="h-32 flex items-end gap-1 mb-6 opacity-80">
                                  {Array.from({length: 60}).map((_, i) => (
                                      <div key={i} className="flex-1 bg-sky-500 rounded-t-sm animate-[pulse_1s_ease-in-out_infinite]" style={{height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s`}}></div>
                                  ))}
                              </div>

                              {/* Playback Controls */}
                              <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                  <button onClick={() => setPlayingAudioId(playingAudioId === selectedItem.id ? null : selectedItem.id)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform">
                                      {playingAudioId === selectedItem.id ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" className="ml-0.5"/>}
                                  </button>
                                  <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                      <div className={`h-full bg-sky-500 ${playingAudioId === selectedItem.id ? 'w-2/3' : 'w-0'} transition-all duration-1000`}></div>
                                  </div>
                                  <div className="text-xs font-mono text-slate-400">00:14 / 00:45</div>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Canvas Footer */}
                  <div className="h-16 border-t border-slate-800 bg-[#121212] flex justify-end items-center px-6 gap-3">
                      <button className="text-xs font-bold text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded transition-colors">REJECT MATCH</button>
                      <button className="bg-[#05DF9C] hover:bg-white text-black font-bold px-6 py-2 rounded text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(5,223,156,0.2)]">
                          <Check size={14} /> CONFIRM IDENTITY
                      </button>
                  </div>
              </div>

              {/* RIGHT: INTELLIGENCE PROFILE */}
              <div className="w-80 bg-[#121212] border-l border-slate-800 flex flex-col shrink-0">
                  <div className="p-6 border-b border-slate-800">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Biometric Profile</h3>
                      
                      <div className="space-y-4">
                          <div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Confidence Score</div>
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${selectedItem.matchConfidence > 0.9 ? 'bg-[#05DF9C]' : 'bg-amber-500'}`} style={{width: `${selectedItem.matchConfidence * 100}%`}}></div>
                              </div>
                              <div className="flex justify-between mt-1 text-[10px] font-mono">
                                  <span className="text-white">{(selectedItem.matchConfidence * 100).toFixed(1)}%</span>
                                  <span className="text-slate-500">THRESHOLD: 85%</span>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                  <div className="text-[9px] text-slate-500 uppercase">Estimated Age</div>
                                  <div className="text-sm font-bold text-white">35 - 42</div>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                  <div className="text-[9px] text-slate-500 uppercase">Gender</div>
                                  <div className="text-sm font-bold text-white">Male</div>
                              </div>
                              {selectedItem.type === 'voice' && (
                                  <>
                                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                          <div className="text-[9px] text-slate-500 uppercase">Language</div>
                                          <div className="text-sm font-bold text-white">{(selectedItem as any).language}</div>
                                      </div>
                                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                          <div className="text-[9px] text-slate-500 uppercase">Tone</div>
                                          <div className="text-sm font-bold text-amber-400">{(selectedItem as any).tone}</div>
                                      </div>
                                  </>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {(selectedItem as any).transcript && (
                          <div>
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transcript</h4>
                              <div className="bg-slate-900/50 p-3 rounded border border-slate-800 font-mono text-xs text-slate-300 italic leading-relaxed">
                                  "{(selectedItem as any).transcript}"
                              </div>
                          </div>
                      )}

                      <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><History size={12}/> Appearance History</h4>
                          <div className="space-y-2">
                              {[1,2].map((_, i) => (
                                  <div key={i} className="flex gap-3 text-xs border-l-2 border-slate-800 pl-3 py-1">
                                      <div className="text-slate-500 font-mono">0{i+1}/09/25</div>
                                      <div className="text-slate-300">Sighted in <span className="text-white font-bold">Sector 4 Footage</span></div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><GitMerge size={12}/> Linked Identities</h4>
                          <div className="flex gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">AB</div>
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">XY</div>
                              <button className="w-8 h-8 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:text-white hover:border-white transition-colors"><Plus size={14}/></button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const allTabs = [
    { id: 'graph', icon: Network, label: 'Graph' },
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'timeline', icon: Clock, label: 'Timeline' },
    { id: 'biometrics', icon: Fingerprint, label: 'Biometrics' },
    { id: 'assessment', icon: ClipboardList, label: 'Assessment' },
    { id: 'evidence', icon: FileSearch, label: 'Evidence (Real-Time)' },
    { id: 'insights', icon: Lightbulb, label: 'Insights' },
    { id: 'synapse', icon: BrainCircuit, label: 'Synapse AI' },
  ];

  const fixedTabs = allTabs.slice(0, 5);
  const dropdownTabs = allTabs.slice(5);
  const isDropdownTabActive = dropdownTabs.some(tab => tab.id === activeTab);

  return (
    <div className="flex h-full overflow-hidden bg-[#181818] text-slate-200 relative">
      
      {/* MERGE MODAL */}
      {showMergeModal && (
          <div className="absolute inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn">
              <div className="bg-[#121212] border border-[#05DF9C]/50 w-full max-w-3xl flex flex-col rounded-2xl shadow-[0_0_50px_rgba(5,223,156,0.1)] relative overflow-hidden max-h-[80vh]">
                  <div className="p-6 border-b border-slate-800 bg-[#16181d]">
                      <div className="flex items-center justify-between">
                          <div><h2 className="text-xl font-bold text-white flex items-center gap-3"><GitMerge size={20} className="text-[#05DF9C]" /> INTELLIGENCE FUSION</h2><p className="text-slate-500 text-xs mt-1">Select studies to cross-reference and merge into the current operational graph.</p></div>
                          <button onClick={() => setShowMergeModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-2">{allStudies.filter(s => s.id !== study.id).map(s => (<div key={s.id} onClick={() => toggleMergeSelection(s.id)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedMergeIds.has(s.id) ? 'bg-[#05DF9C]/10 border-[#05DF9C]' : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMergeIds.has(s.id) ? 'border-[#05DF9C] bg-[#05DF9C]' : 'border-slate-600'}`}>{selectedMergeIds.has(s.id) && <Check size={12} className="text-black" />}</div><div className="flex-1"><h4 className="font-bold text-sm text-slate-200">{s.title}</h4><div className="flex gap-3 text-[10px] text-slate-500 mt-1 font-mono"><span>{s.date}</span><span>|</span><span>{s.intelligence.entities.length} Entities</span></div></div></div>))}</div>
                  <div className="p-6 border-t border-slate-800 bg-[#121212] flex justify-end gap-3"><button onClick={() => setShowMergeModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">CANCEL</button><button onClick={executeMerge} disabled={isMerging || selectedMergeIds.size === 0} className="bg-[#05DF9C] hover:bg-white text-black px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(5,223,156,0.2)] disabled:opacity-50">{isMerging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}{isMerging ? 'Merging Intel...' : `Merge (${selectedMergeIds.size}) Studies`}</button></div>
              </div>
          </div>
      )}

      {/* NEW: CAUSALITY REPORT MODAL */}
      {renderCausalityReport()}

      {showSynthesis && ( <div className="absolute inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn"><div className="bg-[#121212] border border-[#05DF9C]/30 w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl shadow-[0_0_50px_rgba(5,223,156,0.1)] relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#05DF9C] to-transparent"></div><button onClick={() => setShowSynthesis(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X /></button><div className="p-8 border-b border-slate-800 bg-[#121212]"><h2 className="text-2xl font-bold text-white flex items-center gap-3"><Sparkles className="text-[#05DF9C]" /> INVESTIGATION SYNTHESIS</h2><p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-[0.2em]">Hypothesis Generation based on {pinnedItems.length} Evidence Points</p></div><div className="p-10 overflow-y-auto flex-1 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-[#05DF9C]/30 scrollbar-thin scrollbar-thumb-slate-700" dir="auto">{isSynthesizing ? (<div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500"><Loader2 className="animate-spin text-[#05DF9C]" size={32} />Connecting the dots...</div>) : synthesisText}</div></div></div> )}
      {showBriefing && ( <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn"><div className="bg-[#121212] border border-slate-700 w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500"></div><button onClick={() => setShowBriefing(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X /></button><div className="p-8 border-b border-slate-800 bg-[#121212]"><h2 className="text-2xl font-bold text-white flex items-center gap-3"><FileText className="text-[#05DF9C]" /> EXECUTIVE BRIEFING</h2><p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-[0.2em]">Classification: SECRET // Automated Intelligence Product</p></div><div className="p-10 overflow-y-auto flex-1 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-[#05DF9C]/30 scrollbar-thin scrollbar-thumb-slate-700" dir="auto">{isGeneratingBrief ? (<div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500"><Loader2 className="animate-spin text-[#05DF9C]" size={32} />Compiling Situation Report...</div>) : briefingText}</div></div></div> )}
      {viewingLinkedStudy && ( <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn"><div className="bg-[#16181d] border border-amber-500/50 w-full max-w-2xl flex flex-col rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400"></div><button onClick={() => setViewingLinkedStudy(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X /></button><div className="p-6 border-b border-slate-800 bg-[#121212]"><div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-mono text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-500/10 uppercase">Cross-Referenced Intelligence</span><span className="text-[10px] text-slate-500">{viewingLinkedStudy.date}</span></div><h2 className="text-xl font-bold text-white">{viewingLinkedStudy.title}</h2></div><div className="p-6 flex-1 overflow-y-auto space-y-4"><h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Key Insights</h4><div className="space-y-2">{viewingLinkedStudy.intelligence.insights.slice(0, 3).map((insight, idx) => (<div key={idx} className="bg-slate-900/50 p-3 rounded border border-slate-800 text-sm text-slate-300">{insight.text}</div>))}</div><h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Entities Involved</h4><div className="flex flex-wrap gap-2">{viewingLinkedStudy.intelligence.entities.slice(0,10).map(e => (<span key={e.id} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">{e.name}</span>))}</div></div><div className="p-4 border-t border-slate-800 bg-[#121212] flex justify-end gap-2"><button onClick={() => setViewingLinkedStudy(null)} className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2">Close</button><button onClick={() => { setViewingLinkedStudy(null); onSelectStudy(viewingLinkedStudy); }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2">Open Full Case <ExternalLink size={14} /></button></div></div></div> )}

      {/* LEFT SIDEBAR: Entities (Only shown when NOT in Biometrics Mode to avoid clutter) */}
      {activeTab !== 'biometrics' && (
      <div className="w-80 border-r border-slate-800/50 bg-[#121212]/80 backdrop-blur-md flex flex-col z-10 shrink-0 shadow-2xl">
        <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-[#121212]/50">
          <button onClick={onReset} className="text-slate-400 hover:text-[#05DF9C] flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"><ArrowLeft size={14} /> Back to Feed</button>
          <div className="flex items-center gap-2"><span className="text-[9px] font-mono text-slate-500">ID: {study.id}</span></div>
        </div>
        
        {/* ENTITY SEARCH & FILTER */}
        <div className="p-4 border-b border-slate-800/50 bg-[#121212]/30 flex flex-col gap-3">
          <div className="flex gap-2">
              <div className="relative group flex-1">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#05DF9C] transition-colors" />
                 <input 
                    type="text" 
                    placeholder="Filter entities..." 
                    className="w-full bg-[#181818] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#05DF9C] transition-all font-mono" 
                    value={entitySearch} 
                    onChange={(e) => setEntitySearch(e.target.value)} 
                 />
              </div>
              <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  className={`px-3 rounded-lg border transition-all ${showFilters ? 'bg-[#05DF9C] text-black border-[#05DF9C]' : 'bg-[#181818] border-slate-700 text-slate-400 hover:text-white'}`}
              >
                  <Filter size={16} />
              </button>
          </div>
          
          {/* FILTER PANEL */}
          {showFilters && (
              <div className="bg-[#09090b] border border-slate-800 rounded-lg p-3 space-y-4 animate-fadeIn">
                  {/* Confidence */}
                  <div>
                      <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500 mb-2">
                          <span>Min Confidence</span>
                          <span className="text-[#05DF9C]">{minConfidence}%</span>
                      </div>
                      <input 
                          type="range" min="0" max="100" value={minConfidence} 
                          onChange={(e) => setMinConfidence(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#05DF9C]"
                      />
                  </div>
                  {/* Types */}
                  <div>
                      <div className="text-[9px] uppercase font-bold text-slate-500 mb-2">Entity Types</div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                          {availableTypes.map(t => (
                              <button 
                                  key={t} onClick={() => toggleTypeFilter(t)}
                                  className={`text-[9px] px-2 py-1 rounded border transition-all ${activeTypeFilters.includes(t) ? 'bg-[#05DF9C]/20 border-[#05DF9C] text-[#05DF9C]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                              >
                                  {t}
                              </button>
                          ))}
                      </div>
                  </div>
                  {/* Sort */}
                  <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => setSortBy('name')} className={`py-1.5 rounded text-[9px] font-bold uppercase border transition-all ${sortBy === 'name' ? 'bg-slate-700 border-slate-500 text-white' : 'border-slate-800 text-slate-600'}`}>Name (A-Z)</button>
                       <button onClick={() => setSortBy('confidence')} className={`py-1.5 rounded text-[9px] font-bold uppercase border transition-all ${sortBy === 'confidence' ? 'bg-slate-700 border-slate-500 text-white' : 'border-slate-800 text-slate-600'}`}>Confidence</button>
                  </div>
              </div>
          )}

          <div className="flex justify-between items-center px-1">
             <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">{Object.values(groupedEntities).flat().length} Targets Identified</span>
             <div className="flex gap-2"><button onClick={() => toggleAllCategories(true)} className="text-[9px] text-slate-500 hover:text-[#05DF9C] font-bold uppercase">EXPAND</button><button onClick={() => toggleAllCategories(false)} className="text-[9px] text-slate-500 hover:text-[#05DF9C] font-bold uppercase">COLLAPSE</button></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 space-y-1 mb-20">
           {(Object.entries(groupedEntities) as [string, Entity[]][]).map(([type, entities]) => (
               <div key={type} className="mb-1 rounded border border-slate-800/30 bg-[#121212]/50 overflow-hidden">
                   <button onClick={() => toggleCategory(type)} className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors group">
                       <div className="flex items-center gap-2">
                           {expandedCategories[type] ? <FolderOpen size={14} className="text-[#05DF9C]" /> : <Folder size={14} className="text-slate-600 group-hover:text-slate-400" />}
                           <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide group-hover:text-white">{type}</span>
                       </div>
                       <span className="bg-slate-800/50 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-mono group-hover:bg-slate-700">{entities.length}</span>
                   </button>
                   {expandedCategories[type] && (
                       <div className="bg-black/20 border-t border-slate-800/30">
                           {entities.map((entity, idx) => {
                                const isBridged = allBridgedEntities.some(e => isEntityMatch(e.name, entity.name));
                                return (
                                    <div 
                                      key={`${entity.id}-${idx}`} 
                                      onClick={(e) => {
                                        e.stopPropagation(); // Stop propagation
                                        handleNodeClick(entity.name);
                                      }}
                                      className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition-all border-l-[2px] ${selectedEntityId === entity.name ? 'bg-[#05DF9C]/10 border-[#05DF9C] text-white' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`shrink-0 ${selectedEntityId === entity.name ? 'opacity-100' : 'opacity-60'}`}>{renderEntityIcon(entity.type)}</div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="text-[11px] truncate font-medium font-mono" dir="auto">{entity.name}</div>
                                                {isBridged && <span className="text-[8px] text-amber-500 flex items-center gap-1"><GitMerge size={8} /> Linked</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handlePinItem('entity', entity.name, `Entity Type: ${entity.type}`, entity.name); }} className="p-1 text-slate-600 hover:text-[#05DF9C] opacity-0 group-hover:opacity-100 transition-opacity" title="Pin to Board"><Pin size={12} /></button>
                                            <ChevronRight size={12} className={`shrink-0 transition-opacity ${selectedEntityId === entity.name ? 'opacity-100 text-[#05DF9C]' : 'opacity-0 group-hover:opacity-50'}`} />
                                        </div>
                                    </div>
                                );
                           })}
                       </div>
                   )}
               </div>
           ))}
        </div>
      </div>
      )}

      {/* CENTER: Visualization */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#121212]">
        <div className="h-16 border-b border-slate-800/50 bg-[#121212]/80 backdrop-blur-md flex items-center px-6 justify-between shrink-0 shadow-lg z-40">
           <div className="flex gap-1 bg-[#181818] p-1 rounded-lg border border-slate-800">
              {fixedTabs.map(tab => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded transition-all whitespace-nowrap uppercase tracking-wide ${activeTab === tab.id ? 'bg-[#05DF9C]/10 text-[#05DF9C] shadow-sm border border-[#05DF9C]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-transparent'}`}>
                   <tab.icon size={12} /> {tab.label}
                 </button>
              ))}
              <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setIsMoreTabsOpen(!isMoreTabsOpen)} className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded transition-all whitespace-nowrap uppercase tracking-wide ${isDropdownTabActive ? 'bg-[#05DF9C]/10 text-[#05DF9C] shadow-sm border border-[#05DF9C]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-transparent'}`}><MoreHorizontal size={14} /></button>
                  {isMoreTabsOpen && (<div className="absolute top-full right-0 mt-2 w-48 bg-[#121212]/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl z-50 p-1 animate-fadeIn">{dropdownTabs.map(tab => (<button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setIsMoreTabsOpen(false); }} className={`w-full flex items-center gap-3 text-xs font-bold p-3 rounded transition-colors ${activeTab === tab.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}><tab.icon size={14} /> {tab.label}</button>))}</div>)}
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <button onClick={() => setShowMergeModal(true)} className="hidden xl:flex text-slate-400 hover:text-[#05DF9C] text-xs gap-2 items-center font-bold px-3 py-2 rounded border border-transparent hover:border-[#05DF9C]/30 hover:bg-[#05DF9C]/10 transition-all"><GitMerge size={14} /> Merge Studies</button>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="flex items-center gap-3">
                  <button onClick={handleGenerateBrief} className="hidden xl:flex text-slate-400 hover:text-white text-xs gap-2 items-center font-bold px-3 py-2 rounded border border-transparent hover:border-slate-700 transition-all"><FileText size={14} /> Brief</button>
                  <button onClick={onSave} className="bg-[#05DF9C] hover:bg-white text-black text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(5,223,156,0.2)] hover:shadow-[0_0_20px_rgba(5,223,156,0.4)]"><Save size={14} /> ADD TO CASE</button>
              </div>
           </div>
        </div>

        <div className="flex-1 bg-[#181818] relative overflow-hidden flex flex-col mb-40">
           {activeTab === 'graph' && <div className="w-full h-full relative"><div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-96 group"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#05DF9C]" /><input type="text" placeholder="Search graph..." value={graphSearch} onChange={(e) => setGraphSearch(e.target.value)} className="w-full bg-[#121212]/80 backdrop-blur border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#05DF9C]/50 transition-all shadow-2xl"/></div><GraphView data={localGraph} onNodeClick={handleNodeClick} crossRefEntities={allBridgedEntities.map(e => e.name)} searchTerm={graphSearch} selectedNodeId={selectedEntityId || undefined} /></div>}
           {activeTab === 'map' && <MapView locations={localEntities.filter(e => e.type === 'LOCATION')} relations={data.relations} onLocationClick={handleNodeClick} />}
           {activeTab === 'evidence' && <SourceView text={data.raw_text || data.clean_text || "No content available."} media={localMedia} entities={localEntities} knownEntities={allGlobalEntities} onEntityClick={handleNodeClick} onPinItem={handlePinItem} onAddEntity={(name, type) => handleAddRealTimeEntity(name, type)} onAddMedia={(newMedia) => setLocalMedia(prev => [...prev, newMedia])} />}
           
           {/* --- SPLIT-STREAM TIMELINE (NEW DESIGN) --- */}
           {activeTab === 'timeline' && (
               <div className="p-8 h-full overflow-y-auto animate-fadeIn relative">
                   {/* Header */}
                   <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#181818]/90 backdrop-blur-md z-20 py-2 border-b border-slate-800/50">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 shadow-lg shadow-amber-500/10"><Clock size={20} className="text-amber-400" /></div>
                           <div><h2 className="text-xl font-bold text-white tracking-tight">CHRONOS</h2><p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">INTELLIGENCE FUSION & GAP ANALYSIS</p></div>
                       </div>
                       <div className="flex gap-2">
                           {/* --- CAUSALITY REPORT BUTTON (MODIFIED) --- */}
                           <button 
                                onClick={handleOpenCausalityReport}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 transition-all bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95`}
                           >
                               <FileText size={12}/> Trace Causality
                           </button>

                           <button 
                                onClick={() => setTimelineGroupBy(prev => prev === 'none' ? 'week' : 'none')}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 transition-all ${timelineGroupBy === 'week' ? 'bg-[#05DF9C]/10 text-[#05DF9C] border border-[#05DF9C]/20' : 'text-slate-400 hover:text-white bg-slate-800'}`}
                           >
                               <CalendarRange size={12}/> {timelineGroupBy === 'week' ? 'Ungroup' : 'Group by Week'}
                           </button>
                           <button 
                                onClick={() => setTimelineSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 transition-all ${timelineSortOrder === 'desc' ? 'bg-[#05DF9C]/10 text-[#05DF9C] border border-[#05DF9C]/20' : 'text-slate-400 hover:text-white bg-slate-800'}`}
                           >
                               <ArrowDown size={12} className={`transition-transform duration-300 ${timelineSortOrder === 'asc' ? 'rotate-180' : ''}`}/> 
                               {timelineSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                           </button>
                       </div>
                   </div>

                   {/* Render the New Split Stream Timeline */}
                   {renderSplitStreamTimeline()}
               </div>
           )}

           {/* --- BIOMETRICS WORKBENCH (NEW DESIGN) --- */}
           {activeTab === 'biometrics' && renderBiometricAnalysis()}

           {activeTab === 'assessment' && ( <div className="p-12 overflow-y-auto h-full animate-fadeIn"><div className="flex items-center gap-3 mb-8"><div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 shadow-lg shadow-purple-500/10"><ClipboardList size={24} className="text-purple-400" /></div><div><h2 className="text-2xl font-bold text-white tracking-tight">Tactical Assessment</h2><p className="text-xs text-slate-500 uppercase tracking-widest font-mono">TTPs, Recommendations & Intelligence Gaps</p></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="bg-[#121212]/50 border border-slate-800 rounded-xl p-6"><h3 className="font-bold text-white flex items-center gap-2 mb-4"><Target size={16} className="text-rose-400" /> Tactics, Techniques, Procedures</h3><ul className="space-y-3">{(data.tactical_assessment?.ttps || []).map((item, i) => (<li key={i} className="flex gap-3 text-sm text-slate-300 group"><ChevronRight size={16} className="mt-1 text-slate-600 shrink-0" /><span className="flex-1" dir="auto">{item}</span><button onClick={() => handlePinItem('snippet', 'TTP', item)} className="opacity-0 group-hover:opacity-100"><Pin size={12} className="text-slate-500 hover:text-white"/></button></li>))}</ul></div><div className="bg-[#121212]/50 border border-slate-800 rounded-xl p-6"><h3 className="font-bold text-white flex items-center gap-2 mb-4"><ClipboardList size={16} className="text-sky-400" /> Recommended Actions</h3><ul className="space-y-3">{(data.tactical_assessment?.recommendations || []).map((item, i) => (<li key={i} className="flex gap-3 text-sm text-slate-300 group"><ChevronRight size={16} className="mt-1 text-slate-600 shrink-0" /><span className="flex-1" dir="auto">{item}</span><button onClick={() => handlePinItem('snippet', 'Recommendation', item)} className="opacity-0 group-hover:opacity-100"><Pin size={12} className="text-slate-500 hover:text-white"/></button></li>))}</ul></div><div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-6"><h3 className="font-bold text-amber-300 flex items-center gap-2 mb-4"><AlertOctagon size={16} className="text-amber-400" /> Intelligence Gaps</h3><ul className="space-y-3">{(data.tactical_assessment?.gaps || []).map((item, i) => (<li key={i} className="flex gap-3 text-sm text-amber-200/90 group"><HelpCircle size={16} className="mt-1 text-amber-400/50 shrink-0" /><span className="flex-1" dir="auto">{item}</span><button onClick={() => handlePinItem('snippet', 'Intel Gap', item)} className="opacity-0 group-hover:opacity-100"><Pin size={12} className="text-amber-300 hover:text-white"/></button></li>))}</ul></div></div></div> )}
           {activeTab === 'insights' && ( <div className="p-12 overflow-y-auto h-full space-y-12 animate-fadeIn"><div><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-500/10"><Lightbulb size={24} className="text-emerald-400" /></div><div><h2 className="text-2xl font-bold text-white tracking-tight">Key Insights</h2><p className="text-xs text-slate-500 uppercase tracking-widest font-mono">AI-Generated Findings from Current Document</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{(data.insights || []).map((insight, i) => (<div key={i} className="bg-[#121212]/50 border border-slate-800 rounded-xl p-5 flex gap-4 group"><div className="flex-1" dir="auto"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{insight.type.replace('_', ' ')}</span><p className="text-slate-200 mt-1">{insight.text}</p></div><div className="flex flex-col items-center gap-2"><button onClick={() => handlePinItem('insight', `Insight: ${insight.type}`, insight.text)} className="p-2 text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Pin size={14} /></button></div></div>))}</div></div>{(gapAnalysisResults.length > 0 || allBridgedEntities.length > 0) && (<div><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-amber-500/10 rounded-lg border border-emerald-500/20 shadow-lg shadow-amber-500/10"><GitMerge size={24} className="text-amber-400" /></div><div><h2 className="text-2xl font-bold text-white tracking-tight">Cross-Correlation Analysis</h2><p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Closing Intelligence Gaps with Network Data</p></div></div><div className="space-y-6">{gapAnalysisResults.map(({ gap, leads }, i) => (<div key={i} className="bg-[#121212]/50 border border-amber-500/20 rounded-xl p-5"><div className="flex items-start gap-3"><FileQuestion size={20} className="text-amber-400 shrink-0 mt-1"/><div><p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">Intelligence Gap</p><p className="text-amber-200/90 italic">"{gap}"</p></div></div><div className="border-t border-amber-500/20 my-4"></div><div className="space-y-3 pl-8">{leads.map((lead, j) => (<div key={j} className="relative group"><div className="absolute -left-5 top-2 w-3 h-3 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50"></div><p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Potential Lead from <span className="underline cursor-pointer" onClick={() => handleOpenLinkedStudy(lead.sourceStudy.id)}>{lead.sourceStudy.title}</span></p><blockquote className="text-sm text-slate-300 pl-4 border-l-2 border-slate-700 mt-1" dir="auto">{lead.text}</blockquote></div>))}</div></div>))}</div></div>)}</div> )}
           {activeTab === 'synapse' && ( <div className="p-12 overflow-y-auto h-full space-y-12 animate-fadeIn">
               <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 shadow-lg shadow-purple-500/10"><BrainCircuit size={24} className="text-purple-400" /></div><div><h2 className="text-2xl font-bold text-white tracking-tight">SYNAPSE AI</h2><p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Strategic Analysis Engine</p></div></div>
               
               {/* MERGE RESULT DISPLAY */}
               {mergedInsight && (
                   <div className="bg-[#121212] border border-[#05DF9C]/30 p-6 rounded-xl relative overflow-hidden animate-fadeIn mb-8">
                       <div className="absolute top-0 left-0 w-1 h-full bg-[#05DF9C]"></div>
                       <div className="flex items-center gap-3 mb-4">
                           <GitMerge size={20} className="text-[#05DF9C]"/>
                           <h3 className="text-lg font-bold text-white uppercase tracking-wider">Cross-Study Fusion Report</h3>
                       </div>
                       <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                           {mergedInsight}
                       </div>
                   </div>
               )}

               {!synapseAnalysis && !isAnalyzingSynapse && !mergedInsight && (<div className="text-center flex flex-col items-center justify-center h-[60%]"><p className="text-slate-400 mb-6 max-w-lg">Synapse AI scans for non-obvious connections across the entire intelligence network to generate novel hypotheses and predictive insights.</p><button onClick={handleRunSynapse} disabled={allBridgedEntities.length === 0} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-3 text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"><Sparkles size={16} /> Run Deep Analysis</button>{allBridgedEntities.length === 0 && <p className="text-xs text-amber-500 mt-4 font-mono">Network links required to run analysis.</p>}</div>)}{isAnalyzingSynapse && (<div className="text-center flex flex-col items-center justify-center h-[60%] gap-4 text-slate-400"><Loader2 className="animate-spin text-[#05DF9C]" size={48} /><span className="font-mono text-lg">Correlating network data...</span><span className="text-xs max-w-sm">This may take a moment as Synapse cross-references multiple intelligence packages to find hidden patterns.</span></div>)}{synapseAnalysis && (<div className="space-y-8"><div className="bg-[#121212]/50 border border-slate-800 p-4 rounded-xl text-center"><p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Strategic Summary</p><p className="text-lg text-white font-semibold">"{synapseAnalysis.summary}"</p></div>{synapseAnalysis.results.map((result, i) => { const icons = { HYPOTHESIS: FlaskConical, PATTERN: GitMerge, PREDICTION: Activity }; const colors = { HYPOTHESIS: 'text-sky-400', PATTERN: 'text-amber-400', PREDICTION: 'text-rose-400' }; const Icon = icons[result.type]; const color = colors[result.type]; return (<div key={i} className="bg-[#121212]/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group"><div className="flex items-start gap-4"><div className="flex flex-col items-center gap-2"><Icon size={24} className={color} /><div className="w-px h-full bg-slate-700"></div></div><div className="flex-1"><p className={`text-xs font-bold uppercase tracking-wider ${color}`}>{result.type}</p><h3 className="text-lg font-bold text-white mt-1">{result.title}</h3><p className="text-sm text-slate-300 mt-2 leading-relaxed" dir="auto">{result.description}</p><div className="flex items-center gap-4 mt-4"><span className="text-xs font-bold text-slate-400">CONFIDENCE</span><div className="w-40 h-2 bg-slate-800 rounded-full"><div className="h-full bg-[#05DF9C] rounded-full" style={{width: `${result.confidence*100}%`}}></div></div><span className="text-sm font-mono text-[#05DF9C]">{ (result.confidence*100).toFixed(0) }%</span></div><div className="mt-4 border-t border-slate-800 pt-4"><p className="text-xs font-bold text-slate-400 mb-2">SUPPORTING EVIDENCE</p><div className="space-y-2">{result.evidence.map((ev, j) => (<div key={j} className="bg-slate-900/50 p-3 rounded border border-slate-800/50 text-xs text-slate-400 cursor-pointer hover:border-slate-600" onClick={() => handleOpenLinkedStudy(ev.sourceStudyId)}><span className="font-bold text-slate-300">FROM: {ev.sourceStudyTitle}</span><blockquote className="pl-2 border-l-2 border-slate-600 mt-1 italic">"{ev.text}"</blockquote></div>))}</div></div></div></div></div>);})}</div>)}</div> )}
        </div>
      </div>
      
      {/* RIGHT SIDEBAR: ENTITY DETAIL PANEL (Only shown if NOT in Biometrics Tab) */}
      {activeTab !== 'biometrics' && (
      <div className={`absolute top-0 right-0 h-full w-[450px] bg-[#121212]/95 backdrop-blur-xl border-l border-slate-700/50 transform transition-transform duration-500 ease-in-out z-[100] flex flex-col ${selectedEntityId ? 'translate-x-0' : 'translate-x-full'}`}>
        {effectiveEntity && ( 
        <> 
            <div className="p-6 border-b border-slate-800 bg-[#121212]/50 relative shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setSelectedEntityId(null); }} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all" aria-label="Close details panel"><X size={20} /></button>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">{renderEntityIcon(effectiveEntity.type)}</div>
                    <div>
                        <h2 className="text-xl font-bold text-white leading-tight" dir="auto">{effectiveEntity.name}</h2>
                        <div className="flex items-center gap-3 mt-1"><p className="text-xs font-mono uppercase tracking-widest text-slate-400">{effectiveEntity.type}</p><span className="w-1 h-1 bg-slate-600 rounded-full"></span><p className="text-[10px] font-mono text-[#05DF9C]">{directConnections.length} CONNECTIONS</p></div>
                    </div>
                </div>
            </div> 
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700">
                {/* CONTEXT CARD SECTION */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileText size={14} /> Context Card</h3>
                        {/* EXPAND BUTTON */}
                        <div className="flex gap-2">
                            {/* Manual Retry Button - useful if automated fetch fails */}
                            <button 
                                onClick={handleRetryContext}
                                className="text-slate-500 hover:text-[#05DF9C] p-1 rounded"
                                title="Regenerate Context Card"
                            >
                                <RefreshCcw size={14} className={isLoadingCard ? 'animate-spin' : ''}/>
                            </button>
                            
                            {/* Re-analysis Fusion Button */}
                            <button 
                                onClick={handleDeepReanalysis}
                                disabled={isLoadingCard || isExpandingProfile || isReanalyzing}
                                className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${isReanalyzing ? 'bg-amber-500/10 text-amber-400 border-amber-500/50 cursor-default' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:border-slate-500'}`}
                                title="Deep Analyze with Cross-References"
                            >
                                {isReanalyzing ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
                                {isReanalyzing ? 'Fusing Intel...' : 'Fusion Scan'}
                            </button>

                            <button 
                                onClick={handleExpandContext}
                                disabled={isLoadingCard || isExpandingProfile || !!contextCard?.extended_profile}
                                className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${contextCard?.extended_profile ? 'bg-purple-500/10 text-purple-400 border-purple-500/50 cursor-default' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:border-slate-500'}`}
                            >
                                {isExpandingProfile ? <Loader2 size={12} className="animate-spin" /> : contextCard?.extended_profile ? <BookOpen size={12} /> : <Sparkles size={12} />}
                                {isExpandingProfile ? 'Analysing...' : contextCard?.extended_profile ? 'Deep Dive Active' : 'Expand Intel'}
                            </button>
                        </div>
                    </div>

                    {isLoadingCard && (<div className="flex items-center justify-center h-24 bg-[#121212] border border-slate-800 rounded-xl"><Loader2 className="animate-spin text-slate-500" /></div>)}
                    
                    {contextCard ? (
                        <div className="bg-[#121212] border border-slate-800 p-4 rounded-xl space-y-4 shadow-sm relative overflow-hidden group">
                            
                            {/* --- TOP TACTICAL BAR --- */}
                            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
                                {/* Significance Badge */}
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Threat Level</span>
                                    <span className={`text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded border 
                                        ${contextCard.significance === 'CRITICAL' ? 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20 shadow-md' :
                                          contextCard.significance === 'HIGH' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 
                                          contextCard.significance === 'MEDIUM' ? 'bg-sky-500/20 text-sky-400 border-sky-500/50' :
                                          'bg-slate-700/50 text-slate-400 border-slate-600'
                                        }`}>
                                        {contextCard.significance || 'UNKNOWN'}
                                    </span>
                                </div>
                                {/* Status */}
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Status</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${contextCard.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                        <span className="text-xs font-mono text-slate-300">{contextCard.status || 'UNKNOWN'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* --- SUMMARY --- */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Executive Summary</label>
                                <p className="text-sm text-slate-300 leading-relaxed bg-black/20 p-2 rounded border border-slate-800/50" dir="auto">{contextCard.summary}</p>
                            </div>

                            {/* --- AFFILIATION & ROLE --- */}
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Affiliation</label>
                                    <div className="text-xs font-bold text-white mt-0.5 truncate" title={contextCard.affiliation}>{contextCard.affiliation || 'Unknown'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role in Context</label>
                                    <div className="text-xs font-bold text-white mt-0.5 truncate" title={contextCard.role_in_document}>{contextCard.role_in_document}</div>
                                </div>
                            </div>

                            {/* --- ALIASES --- */}
                            {contextCard.aliases && contextCard.aliases.length > 0 && (
                                <div className="mt-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Known Aliases</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {contextCard.aliases.map((alias, i) => (
                                            <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">{alias}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* EXTENDED PROFILE DISPLAY - IMPROVED RENDERING */}
                            {contextCard.extended_profile && (
                                <div className="mt-4 pt-4 border-t border-slate-800/50 animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-2 text-purple-400">
                                        <BookOpen size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Deep Dive Dossier</span>
                                    </div>
                                    <div className="text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap font-mono bg-black/20 p-4 rounded-lg border border-slate-800/50 shadow-inner max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                        {/* Simple formatting for improved readability */}
                                        {(contextCard.extended_profile ? contextCard.extended_profile.split('\n') : []).map((line: string, i: number) => {
                                            if (line.startsWith('##')) return <h4 key={i} className="text-[#05DF9C] font-bold mt-4 mb-2 uppercase tracking-wide border-b border-[#05DF9C]/20 pb-1">{line.replace(/#/g, '')}</h4>
                                            if (line.startsWith('- **')) {
                                                const [bold, rest] = line.split('**:', 2);
                                                return <div key={i} className="pl-2"><span className="text-slate-400 font-bold">{bold.replace('- **', '')}:</span><span className="text-slate-300">{rest}</span></div>
                                            }
                                            return <div key={i} className="min-h-[1em]">{line}</div>
                                        })}
                                    </div>
                                </div>
                            )}

                            {contextCard.key_mentions?.length > 0 && (<div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key Mentions</label><div className="space-y-2 mt-2">{(contextCard.key_mentions || []).map((mention, i) => (<blockquote key={i} className="text-xs text-slate-400 pl-3 border-l-2 border-[#05DF9C]/50 bg-slate-800/20 p-2 rounded-r-lg" dir="auto"><Quote className="inline-block mr-2 opacity-30" size={12} />{mention}</blockquote>))}</div></div>)}
                            
                            {/* --- QUICK ACTIONS BAR --- */}
                            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between">
                                <button className="text-[10px] font-bold text-slate-500 hover:text-white flex items-center gap-1 transition-colors"><Search size={12} /> Search DB</button>
                                <button className="text-[10px] font-bold text-slate-500 hover:text-[#05DF9C] flex items-center gap-1 transition-colors"><Share2 size={12} /> Export</button>
                            </div>
                        </div>
                    ) : !isLoadingCard && (
                        <div className="text-center p-6 bg-[#121212] border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3">
                            <FileQuestion size={24} className="text-slate-600" />
                            <div className="text-xs text-slate-500 font-mono">No profile data generated yet.</div>
                            <button onClick={handleRetryContext} className="bg-slate-800 hover:bg-[#05DF9C] hover:text-black text-slate-300 px-4 py-2 rounded text-xs font-bold uppercase transition-colors">Generate Profile</button>
                        </div>
                    )}
                </div>

                {/* Direct Connections */}
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><GitCommit size={14} /> Direct Connections</h3>
                    <div className="bg-[#121212] border border-slate-800 rounded-xl overflow-hidden"><div className="space-y-0.5">{directConnections.length > 0 ? directConnections.map((rel, i) => { 
                    // IMPROVED MATCHING FOR UI DISPLAY
                    // We use the same loose matching logic to determine direction
                    const normSelected = selectedEntityId?.toLowerCase().trim() || '';
                    const normSource = rel.source.toLowerCase();
                    const isSource = isEntityMatch(rel.source, effectiveEntity.name) || normSource.includes(normSelected) || normSelected.includes(normSource);
                    
                    const otherEntityName = isSource ? rel.target : rel.source; 
                    
                    return ( <div key={i} onClick={() => handleNodeClick(otherEntityName)} className="bg-slate-800/20 hover:bg-slate-800/50 p-3 border-b border-slate-800/50 group transition-all cursor-pointer last:border-0"><div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase mb-1.5"><div className="flex items-center gap-2">{isSource ? (<span className="text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">OUTBOUND <ArrowLeft size={8} className="rotate-180"/></span>) : (<span className="text-amber-500 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded"><ArrowLeft size={8} /> INBOUND</span>)}</div><span className="text-[#05DF9C] font-mono">{(rel.confidence * 100).toFixed(0)}%</span></div><div className="flex items-center gap-3"><div className="flex-1 min-w-0"><div className="text-[10px] text-slate-400 font-mono mb-0.5 uppercase tracking-wide">{rel.type.replace(/_/g, ' ')}</div><div className="text-xs font-bold text-white group-hover:text-[#05DF9C] transition-colors truncate" dir="auto">{otherEntityName}</div></div><ChevronRight size={12} className="text-slate-600 group-hover:text-[#05DF9C] shrink-0" /></div></div> ); }) : (<div className="p-4 text-xs text-slate-600 italic text-center">No direct relations defined.</div>)}</div></div>
                </div>

                {/* --- NEW: CROSS-FILE CORRELATIONS --- */}
                {linkedStudiesForEntity.length > 0 && (
                    <div className="animate-fadeIn">
                        <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Waypoints size={14} /> Cross-File Correlations
                        </h3>
                        <div className="space-y-3">
                            {linkedStudiesForEntity.slice(0, 5).map((linkedStudy, i) => (
                                <div 
                                    key={i} 
                                    className="bg-amber-950/10 border border-amber-500/30 rounded-xl p-3 hover:bg-amber-900/20 hover:border-amber-500/50 transition-all cursor-pointer group relative overflow-hidden"
                                    onClick={() => setViewingLinkedStudy(linkedStudy)}
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                                    
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <FolderSymlink size={14} className="text-amber-500" />
                                            <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide">External Match</span>
                                        </div>
                                        <div className="bg-amber-500/10 px-2 py-0.5 rounded text-[9px] font-mono text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                            <ExternalLink size={8} /> OPEN
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-xs font-bold text-white mb-1 leading-snug group-hover:text-amber-200 transition-colors">
                                        {linkedStudy.title}
                                    </h4>
                                    
                                    <div className="flex items-center gap-3 text-[9px] text-slate-400 font-mono mt-2">
                                        <span>{linkedStudy.date}</span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className="uppercase">{linkedStudy.source}</span>
                                    </div>
                                </div>
                            ))}
                            {linkedStudiesForEntity.length > 5 && (
                                <div className="text-center text-[10px] text-slate-500 font-mono italic pt-2">
                                    + {linkedStudiesForEntity.length - 5} more correlated files
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
            
            <div className="p-4 border-t border-slate-800 bg-[#121212]/50 shrink-0 flex items-center justify-between">
                <button onClick={() => handlePinItem('entity', effectiveEntity.name, `Type: ${effectiveEntity.type}`, effectiveEntity.id)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700 transition-colors"><Pin size={14} /> PIN TO BOARD</button>
                <button onClick={() => handleDeleteEntity(effectiveEntity.id)} className="flex items-center gap-2 text-xs font-bold text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-colors"><Trash2 size={14} /></button>
            </div> 
        </>
        )}
      </div>
      )}

    </div>
  );
};

export default AnalysisDashboard;
