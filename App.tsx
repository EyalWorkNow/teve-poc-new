
import React, { useState, useEffect } from 'react';
import IngestionPanel from './components/IngestionPanel';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import FeedDashboard from './components/FeedDashboard';
import OperationsDashboard from './components/OperationsDashboard';
import ManagementDashboard from './components/ManagementDashboard';
import RealTimeDashboard from './components/RealTimeDashboard';
import LoginPage from './components/LoginPage';
import { SettingsPage } from './components/SettingsPage'; // Import Settings Page
import { analyzeDocument, isEntityMatch } from './services/geminiService';
import { StudyService } from './services/studyService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth'; // Modular SDK Imports
import { IntelligencePackage, StudyItem, Entity, RawMedia, GraphData } from './types';
import { AlertTriangle, LayoutGrid, PlusCircle, Settings, LogOut, Network, X, BarChart2, Cpu, ScanEye, Loader2, Terminal, Activity } from 'lucide-react';

type ViewState = 'feed' | 'analysis' | 'ingest' | 'operations' | 'management' | 'realtime' | 'settings';

// --- TEVEL ARCHITECTURE: CROSS-DOMAIN INTELLIGENCE DATASET ---

// Utility to create graph data from entities and relations
const createGraphData = (entities: Entity[], relations: any[]): GraphData => {
    const normalize = (s: string) => s ? s.trim().toLowerCase() : '';
    const entityMap = new Map<string, Entity>();
    entities.forEach(e => entityMap.set(normalize(e.name), e));

    const getTypeGroup = (type: string) => {
        switch (type) {
            case 'PERSON': return 1;
            case 'ORGANIZATION': return 2;
            case 'LOCATION': return 3;
            case 'ASSET': return 4;
            case 'EVENT': return 5;
            case 'DATE': return 6;
            default: return 7;
        }
    };

    const nodes = entities.map(e => ({
        id: e.name, 
        group: getTypeGroup(e.type),
        type: e.type
    }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: any[] = [];
    
    relations.forEach(r => {
        let sourceId = r.source;
        let targetId = r.target;
        const normalizeSource = normalize(sourceId);
        const normalizeTarget = normalize(targetId);

        if (entityMap.has(normalizeSource)) sourceId = entityMap.get(normalizeSource)!.name;
        if (entityMap.has(normalizeTarget)) targetId = entityMap.get(normalizeTarget)!.name;

        if (!nodeIds.has(sourceId)) {
            nodes.push({ id: sourceId, group: 8, type: 'MISC' });
            nodeIds.add(sourceId);
        }
        if (!nodeIds.has(targetId)) {
            nodes.push({ id: targetId, group: 8, type: 'MISC' });
            nodeIds.add(targetId);
        }

        edges.push({ source: sourceId, target: targetId, value: (r.confidence || 0.5) * 5 });
    });

    return { nodes, edges };
};

// SHARED ENTITIES
const LINK_SILVER_IODIDE: Entity = { id: "Silver Iodide", name: "יודיד הכסף (AgI)", type: "ASSET" };
const LINK_PROJECT_ZEPHYR: Entity = { id: "Project Zephyr", name: "Project Zephyr", type: "ORGANIZATION" };
const LINK_EAST_EUROPE: Entity = { id: "East Europe", name: "מזרח אירופה", type: "LOCATION" };
const LINK_RF_TECH: Entity = { id: "High Power RF", name: "High Power RF", type: "ASSET" };
const LINK_CONDUCTIVE_DUST: Entity = { id: "Conductive Dust", name: "אבק מוליך", type: "ASSET" };

// --- MOCK DATA FOR SEEDING ---
const financeEntities: Entity[] = [
    LINK_PROJECT_ZEPHYR, { id: "ESMA", name: "ESMA", type: "ORGANIZATION" }, LINK_EAST_EUROPE,
    { id: "Wheat Futures", name: "חוזים עתידיים (חיטה)", type: "ASSET" }, { id: "Cayman Islands", name: "איי קיימן", type: "LOCATION" }, { id: "ECMWF", name: "ECMWF", type: "ORGANIZATION" }
];
const financeRelations = [
    { source: "Project Zephyr", target: "חוזים עתידיים (חיטה)", type: "short_selling", confidence: 1.0 },
    { source: "Project Zephyr", target: "מזרח אירופה", type: "targeting", confidence: 0.95 },
    { source: "Project Zephyr", target: "איי קיימן", type: "registered_location", confidence: 1.0 },
    { source: "ECMWF", target: "מזרח אירופה", type: "weather_forecast", confidence: 0.8 }
];
const DATA_FINANCE: IntelligencePackage = {
    clean_text: "ציח מחקרי מס' 1: פיננסים ומסחר אלגוריתמי...",
    word_count: 320, reliability: 0.95, entities: financeEntities, relations: financeRelations,
    timeline: [{ date: "10/08/2025", event: "זיהוי דפוס מסחר אנומלי ע\"י ESMA" }, { date: "12/08/2025", event: "Project Zephyr פותחת פוזיציית שורט" }, { date: "15/08/2025", event: "אירוע אקלים משמיד יבולים בניגוד לתחזית" }],
    insights: [{ type: "anomaly", importance: 0.99, text: "94% אחוזי הצלחה בחיזוי אירועי אקלים 'בלתי צפויים'." }, { type: "pattern", importance: 0.90, text: "קורלציה בין קואורדינטות GPS ספציפיות לפקודות מסחר HFT." }],
    tactical_assessment: { ttps: ["Short Selling ממונף", "שימוש במידע פנים (Exotic Data)"], recommendations: ["איתור מקור המידע", "בדיקת תקשורת לווינית"], gaps: ["מהו הטריגר הפיזי?", "מי מפעיל את הטריגר?"] },
    context_cards: {}, graph: createGraphData(financeEntities, financeRelations)
};

const agroEntities: Entity[] = [LINK_SILVER_IODIDE, LINK_EAST_EUROPE, { id: "Silver Necrosis", name: "תסמונת הנמק הכסוף", type: "EVENT" }, { id: "Polymer Nanoparticles", name: "ננו-חלקיקים פולימריים", type: "ASSET" }, { id: "National Agriculture Institute", name: "המכון הלאומי לחקר החקלאות", type: "ORGANIZATION" }];
const agroRelations = [{ source: "תסמונת הנמק הכסוף", target: "יודיד הכסף (AgI)", type: "caused_by", confidence: 0.9 }, { source: "תסמונת הנמק הכסוף", target: "מזרח אירופה", type: "observed_in", confidence: 1.0 }, { source: "יודיד הכסף (AgI)", target: "ננו-חלקיקים פולימריים", type: "found_with", confidence: 0.85 }];
const DATA_AGRO: IntelligencePackage = {
    clean_text: "ציח מחקרי מס' 2: אגרונומיה ופתולוגיה של הצומח...",
    word_count: 280, reliability: 0.85, entities: agroEntities, relations: agroRelations,
    timeline: [{ date: "20/08/2025", event: "זיהוי ראשוני של 'הנמק הכסוף'." }, { date: "25/08/2025", event: "דגימות קרקע נלקחות." }, { date: "28/08/2025", event: "תוצאות מעבדה מאשרות נוכחות AgI." }],
    insights: [{ type: "key_event", importance: 0.9, text: "הנזק אינו ביולוגי אלא כימי." }, { type: "pattern", importance: 0.95, text: "הופעת החומרים הרעילים דרך משקעים." }],
    tactical_assessment: { ttps: ["פיזור חומרים כימיים", "הסוואת פעולה כאירוע טבעי"], recommendations: ["ניתוח דגימות גשם", "איתור המקור"], gaps: ["מהו הפולימר הבלתי מזוהה?", "כיצד החומרים מפוזרים?"] },
    context_cards: {}, graph: createGraphData(agroEntities, agroRelations)
};

const energyEntities: Entity[] = [LINK_CONDUCTIVE_DUST, { id: "Power Grid", name: "רשת החשמל", type: "INFRASTRUCTURE" }, { id: "Flashover Event", name: "פריצה חשמלית", type: "EVENT" }, { id: "Ionized Cloud", name: "ענן מיונן", type: "MISC" }];
const energyRelations = [{ source: "אבק מוליך", target: "פריצה חשמלית", type: "causes", confidence: 0.9 }, { source: "ענן מיונן", target: "אבק מוליך", type: "contains", confidence: 0.8 }];
const DATA_ENERGY: IntelligencePackage = {
    clean_text: "ציח מחקרי מס' 3: הנדסת חשמל ותשתיות...",
    word_count: 250, reliability: 0.8, entities: energyEntities, relations: energyRelations,
    timeline: [{ date: "01/09/2025", event: "דיווח על עלייה חדה בתקלות ברשת החשמל." }],
    insights: [{ type: "anomaly", importance: 0.9, text: "כשלים חשמליים ללא סיבה טבעית, מקושרים לאבק מוליך." }],
    tactical_assessment: { gaps: ["מקור האבק?"], recommendations: ["ניתוח הרכב"], ttps: [] },
    context_cards: {}, graph: createGraphData(energyEntities, energyRelations)
};

const physicsEntities: Entity[] = [LINK_RF_TECH, { id: "Ionization Bubbles", name: "בועות יינון", type: "EVENT" }, { id: "Atmospheric Lensing", name: "עדשות אטמוספריות", type: "MISC" }, { id: "National Observatory", name: "המצפה האסטרונומי", type: "ORGANIZATION" }];
const physicsRelations = [{ source: "High Power RF", target: "בועות יינון", type: "creates", confidence: 0.95 }, { source: "בועות יינון", target: "עדשות אטמוספריות", type: "acts_as", confidence: 0.8 }];
const DATA_PHYSICS: IntelligencePackage = {
    clean_text: "ציח מחקרי מס' 4: מדעי האטמוספירה ופיזיקת חלל...",
    word_count: 240, reliability: 0.98, entities: physicsEntities, relations: physicsRelations,
    timeline: [{ date: "05/09/2025", event: "זיהוי אנומליות GPS וראדאר." }],
    insights: [{ type: "pattern", importance: 1.0, text: "שימוש ב-RF ליצירת עננים באופן מלאכותי." }],
    tactical_assessment: { gaps: ["מיקום משדר ה-RF?"], recommendations: ["סריקת RF"], ttps: ["שינוי מזג אוויר ב-RF"] },
    context_cards: {}, graph: createGraphData(physicsEntities, physicsRelations)
};

const farm7Entities: Entity[] = [{ id: "Farm 7", name: "חווה 7", type: "LOCATION" }, LINK_RF_TECH, LINK_SILVER_IODIDE, LINK_PROJECT_ZEPHYR, LINK_CONDUCTIVE_DUST, { id: "Jordan Valley", name: "בקעת הירדן", type: "LOCATION" }, { id: "PMC", name: "PMC", type: "ORGANIZATION" }];
const farm7Relations = [{ source: "חווה 7", target: "High Power RF", type: "houses", confidence: 1.0 }, { source: "חווה 7", target: "יודיד הכסף (AgI)", type: "stores", confidence: 1.0 }, { source: "חווה 7", target: "Project Zephyr", type: "communicates_with", confidence: 1.0 }, { source: "חווה 7", target: "אבק מוליך", type: "disperses", confidence: 0.9 }];
const DATA_FARM_7: IntelligencePackage = {
    clean_text: "ציח מבצעי: פשיטה על 'חווה 7'...",
    word_count: 410, reliability: 1.0, entities: farm7Entities, relations: farm7Relations,
    timeline: [{ date: "10/09/2025", event: "פשיטה על 'חווה 7' ואיסוף ראיות." }],
    insights: [{ type: "summary", importance: 1.0, text: "חווה 7 היא התשתית המבצעית המקשרת." }],
    tactical_assessment: { gaps: [], recommendations: ["השתלטות על הציוד"], ttps: ["הסוואת תשתית צבאית"] },
    context_cards: {}, graph: createGraphData(farm7Entities, farm7Relations),
    biometrics: { faces: [{ id: "F01", detectedName: "PMC Commander", matchConfidence: 0.92, imageUrl: "https://i.pravatar.cc/300?u=pmc", sourceFile: "drone_footage.mp4", watchlistStatus: "MATCH" }], voices: [{ id: "V01", speakerName: "Unknown Operator", matchConfidence: 0.85, language: "Russian", tone: "Calm", transcript: "Confirm target coordinates..." }] }
};

const INITIAL_MOCK_STUDIES: StudyItem[] = [
    { id: '1', title: 'Financial Anomalies in Soft Commodities', date: '01/09/2025', source: 'Report', status: 'Approved', tags: ['Finance', 'Trading', 'Anomaly', 'Project Zephyr'], intelligence: DATA_FINANCE },
    { id: '2', title: 'Pathology Report: "Silver Necrosis" in Crops', date: '03/09/2025', source: 'Report', status: 'Approved', tags: ['Agronomy', 'Science', 'Chemical'], intelligence: DATA_AGRO },
    { id: '3', title: 'Systemic Failures in National Power Grid', date: '04/09/2025', source: 'Signal', status: 'Review', tags: ['Infrastructure', 'Energy', 'Critical'], intelligence: DATA_ENERGY },
    { id: '4', title: 'Atmospheric Ionization Anomalies Detected', date: '06/09/2025', source: 'Report', status: 'Approved', tags: ['Physics', 'Atmosphere', 'RF', 'Urgent'], intelligence: DATA_PHYSICS },
    { id: '5', title: 'RAID ANALYSIS: "Farm 7" Compound', date: '11/09/2025', source: 'Report', status: 'Approved', tags: ['Raid', 'Critical', 'Golden Gun', 'PMC'], intelligence: DATA_FARM_7 }
];

const App: React.FC = () => {
    // --- AUTH STATE ---
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [view, setView] = useState<ViewState>('feed');
    const [studies, setStudies] = useState<StudyItem[]>([]);
    const [selectedStudy, setSelectedStudy] = useState<StudyItem | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoadingApp, setIsLoadingApp] = useState(true); // Initial Load
    const [networkAlert, setNetworkAlert] = useState<{ newStudy: StudyItem, linkedEntities: Entity[] } | null>(null);
    const [isNavExpanded, setIsNavExpanded] = useState(false);

    // --- AUTH LISTENER ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return unsubscribe;
    }, []);

    // --- DATA FETCHING (Only if Authenticated) ---
    useEffect(() => {
        if (!user) return; // Don't fetch if not logged in

        const init = async () => {
            setIsLoadingApp(true);
            try {
                // 1. Fetch from Supabase
                const dbStudies = await StudyService.getAllStudies();
                
                if (dbStudies.length === 0) {
                    console.log("Database empty or offline. Attempting to seed or use local fallback...");
                    // 2. If empty, try to seed mock data.
                    const seeded = await StudyService.seedStudies(INITIAL_MOCK_STUDIES);
                    
                    if (seeded) {
                        // RE-FETCH to get the confirmed DB data (with UUIDs)
                        const reloaded = await StudyService.getAllStudies();
                        setStudies(reloaded.length > 0 ? reloaded : INITIAL_MOCK_STUDIES);
                    } else {
                        // If seed failed (e.g. RLS or network), strictly use local fallback but DON'T crash
                        console.warn("Using local fallback data (Offline Mode)");
                        setStudies(INITIAL_MOCK_STUDIES);
                    }
                } else {
                    console.log(`Loaded ${dbStudies.length} studies from Supabase.`);
                    setStudies(dbStudies);
                }
            } catch (e) {
                console.error("Initialization error (continuing in Offline Mode):", e);
                // Absolute fallback to memory to prevent white screen
                setStudies(INITIAL_MOCK_STUDIES);
            } finally {
                setIsLoadingApp(false);
            }
        };
        init();
    }, [user]); // Re-run when user logs in

    const handleSetView = (newView: ViewState) => {
        setView(newView);
        setSelectedStudy(null);
    };

    const handleAnalyze = async (text: string, title: string, media: RawMedia[]) => {
        setView('ingest');
        setIsAnalyzing(true);
        try {
            const intelligence = await analyzeDocument(text);
            intelligence.media = media;
            
            if (intelligence.entities && intelligence.relations) {
                intelligence.graph = createGraphData(intelligence.entities, intelligence.relations);
            }

            const today = new Date();
            const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

            const newStudy: StudyItem = {
                id: `s_${Date.now()}`, // Temporary ID, DB will handle persistence and return UUID
                title: title,
                date: formattedDate,
                source: 'Report',
                status: 'Review',
                tags: ['New', 'AI-Generated'],
                intelligence: intelligence,
            };

            // Save to DB and wait for the real ID
            const savedId = await StudyService.saveStudy(newStudy);
            
            if (savedId) {
                // Update with the real DB ID (UUID)
                newStudy.id = savedId;
            } else {
                console.warn("Saved to local state only (DB persist failed)");
            }

            // Check Links
            const linkedEntities = newStudy.intelligence.entities.filter(newEntity =>
                studies.some(existingStudy =>
                    existingStudy.intelligence.entities.some(existingEntity =>
                        isEntityMatch(newEntity.name, existingEntity.name)
                    )
                )
            );
            
            if (linkedEntities.length > 0) {
                setNetworkAlert({ newStudy, linkedEntities });
            }

            // Update State
            setStudies(prev => [newStudy, ...prev]);
            
            // Go to Feed
            setView('feed');
            setSelectedStudy(null);

        } catch (error) {
            console.error("Analysis Failed:", error);
            alert("Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handlePublishRealTimeStudy = async (title: string, intelligence: IntelligencePackage) => {
        const today = new Date();
        const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        const newStudy: StudyItem = {
            id: `rt_${Date.now()}`,
            title: title || 'Real-Time Research Session',
            date: formattedDate,
            source: 'Report',
            status: 'Approved',
            tags: ['Real-Time', 'Analyst-Generated'],
            intelligence: intelligence
        };
        
        // Save and update ID
        const savedId = await StudyService.saveStudy(newStudy);
        if (savedId) {
            newStudy.id = savedId;
        }

        const linkedEntities = newStudy.intelligence.entities.filter(newEntity =>
            studies.some(existingStudy =>
                existingStudy.intelligence.entities.some(existingEntity =>
                    isEntityMatch(newEntity.name, existingEntity.name)
                )
            )
        );
        
        if (linkedEntities.length > 0) {
            setNetworkAlert({ newStudy, linkedEntities });
        }

        setStudies(prev => [newStudy, ...prev]);
        setView('feed');
    };

    const handleSelectStudy = (study: StudyItem) => {
        setSelectedStudy(study);
        setView('analysis');
    };

    const resetToFeed = () => {
        setSelectedStudy(null);
        setView('feed');
    };

    const handleLogout = () => {
        auth.signOut();
    };

    // --- RENDER LOGIC ---

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#09090b] text-[#05DF9C] gap-4">
                <Loader2 size={48} className="animate-spin" />
                <div className="text-sm font-mono tracking-widest animate-pulse">AUTHENTICATING...</div>
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    const renderView = () => {
        if (isLoadingApp) return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-[#09090b] text-[#05DF9C] gap-4">
                <Loader2 size={48} className="animate-spin" />
                <div className="text-xl font-bold tracking-widest animate-pulse">CONNECTING TO TEVEL CLOUD...</div>
                <div className="text-xs text-slate-500 font-mono">Synchronizing Intelligence Database</div>
            </div>
        );

        if (isAnalyzing) return <IngestionPanel onAnalyze={handleAnalyze} isAnalyzing={true} onCancel={() => { setIsAnalyzing(false); resetToFeed(); }} />;
        
        switch(view) {
            case 'ingest': return <IngestionPanel onAnalyze={handleAnalyze} isAnalyzing={false} onCancel={resetToFeed} />;
            case 'realtime': return <RealTimeDashboard studies={studies} onPublish={handlePublishRealTimeStudy} />;
            case 'settings': return <SettingsPage user={user} onLogout={handleLogout} onBack={() => handleSetView('feed')} />;
            case 'analysis':
                if (selectedStudy) {
                    return <AnalysisDashboard 
                              data={selectedStudy.intelligence} 
                              allStudies={studies}
                              onReset={resetToFeed} 
                              onSave={() => alert('Saved')}
                              onSelectStudy={handleSelectStudy} 
                              study={selectedStudy}
                           />;
                }
                return <FeedDashboard studies={studies} onSelectStudy={handleSelectStudy} onNewAnalysis={() => setView('ingest')} />;
            case 'operations': return <OperationsDashboard studies={studies} />;
            case 'management': return <ManagementDashboard studies={studies} onNavigate={(v) => handleSetView(v as ViewState)} />;
            case 'feed':
            default: return <FeedDashboard studies={studies} onSelectStudy={handleSelectStudy} onNewAnalysis={() => setView('ingest')} />;
        }
    };

    const navItems = [
      { id: 'feed', icon: LayoutGrid, label: 'Intelligence Feed' },
      { id: 'operations', icon: Cpu, label: 'Operations Center' },
      { id: 'management', icon: BarChart2, label: 'Command Deck' },
      { id: 'ingest', icon: PlusCircle, label: 'Ingest Data' },
      { id: 'realtime', icon: ScanEye, label: 'Real-Time Research' }
    ];

    const bottomNavItems = [
      { id: 'settings', icon: Settings, label: 'Settings', action: () => handleSetView('settings') },
      { id: 'logout', icon: LogOut, label: 'Log Out', action: handleLogout }
    ];

    return (
        <div className="h-screen w-screen bg-[#09090b] flex font-sans overflow-hidden">
            
            {networkAlert && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
                    <div className="bg-[#121212] border border-amber-500/50 w-[500px] rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-amber-950/20 text-center">
                            <Network size={32} className="text-amber-400 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-xl font-bold text-white">ACTIVE SYNAPSE DETECTED</h2>
                            <p className="text-xs text-amber-300/80 font-mono mt-1">New intelligence has cross-referenced existing cases.</p>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-400 mb-4">The document <strong className="text-white">"{networkAlert.newStudy.title}"</strong> contains links to active investigations via:</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                                {networkAlert.linkedEntities.map(e => (
                                    <div key={e.id} className="bg-slate-800/50 p-2 rounded text-xs text-slate-300 font-mono border border-slate-700">{e.name}</div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-black/30 flex justify-end gap-3">
                            <button onClick={() => setNetworkAlert(null)} className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2">Dismiss</button>
                            <button onClick={() => { handleSelectStudy(networkAlert.newStudy); setNetworkAlert(null); }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-xs font-bold">JUMP TO ANALYSIS</button>
                        </div>
                    </div>
                </div>
            )}
            
            <nav 
                onMouseEnter={() => setIsNavExpanded(true)}
                onMouseLeave={() => setIsNavExpanded(false)}
                className={`bg-[#121212]/80 backdrop-blur-md border-r border-slate-800/50 flex flex-col justify-between py-6 shrink-0 z-30 shadow-2xl transition-all duration-300 ease-in-out ${isNavExpanded ? 'w-60' : 'w-20'}`}
            >
                <div className="flex flex-col gap-2 px-3">
                    <div className={`flex items-center h-12 mb-6 ${isNavExpanded ? 'px-4 justify-start' : 'justify-center'}`}>
                        <div className="shrink-0">
                           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <defs><linearGradient id="tevel-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#05DF9C" /><stop offset="100%" stopColor="#04a777" /></linearGradient></defs>
                               <rect x="10.5" y="2" width="3" height="20" rx="1.5" fill="url(#tevel-gradient)" />
                               <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(45 12 12)" fill="url(#tevel-gradient)" />
                               <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(90 12 12)" fill="url(#tevel-gradient)" />
                               <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(135 12 12)" fill="url(#tevel-gradient)" />
                           </svg>
                        </div>
                        <span className={`whitespace-nowrap transition-all duration-200 font-black text-2xl tracking-tight text-white ${isNavExpanded ? 'w-auto opacity-100 ml-4' : 'w-0 opacity-0 ml-0'}`}>TEVEL</span>
                    </div>
                    {navItems.map(item => (
                        <div key={item.id} className="relative group">
                            <button onClick={() => handleSetView(item.id as ViewState)} className={`flex items-center h-12 rounded-lg transition-colors duration-200 text-sm font-bold w-full relative overflow-hidden ${isNavExpanded ? 'px-4 justify-start' : 'justify-center'} ${view === item.id ? 'bg-slate-800/50' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#05DF9C] rounded-r-full shadow-[0_0_10px_#05DF9C] transition-all duration-300 ${view === item.id ? 'opacity-100' : 'opacity-0 scale-y-0'}`}></div>
                                <item.icon size={20} className={`shrink-0 transition-colors ${view === item.id ? 'text-[#05DF9C]' : 'text-slate-500 group-hover:text-slate-200'}`}/>
                                <span className={`whitespace-nowrap transition-all duration-200 font-bold ${isNavExpanded ? 'w-auto opacity-100 ml-4' : 'w-0 opacity-0 ml-0'} ${view === item.id ? 'text-white' : ''}`}>{item.label}</span>
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-2 px-3">
                    {bottomNavItems.map(item => (
                        <div key={item.id} className="relative group">
                            <button 
                                onClick={item.action}
                                className={`flex items-center h-12 rounded-lg transition-colors duration-200 text-sm font-bold w-full text-slate-500 hover:bg-slate-800/50 hover:text-slate-200 overflow-hidden ${isNavExpanded ? 'px-4 justify-start' : 'justify-center'} ${view === item.id ? 'bg-slate-800/50 text-white' : ''}`}
                            >
                                <item.icon size={20} className={`shrink-0 group-hover:text-slate-200 ${view === item.id ? 'text-[#05DF9C]' : ''}`}/>
                                <span className={`whitespace-nowrap transition-all duration-200 ${isNavExpanded ? 'w-auto opacity-100 ml-4' : 'w-0 opacity-0 ml-0'}`}>{item.label}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </nav>

            <main className="flex-1 overflow-hidden">
                {renderView()}
            </main>
        </div>
    );
};

export default App;
