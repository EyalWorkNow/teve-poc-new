
import React, { useMemo, useState, useEffect } from 'react';
import { StudyItem } from '../types';
import { 
    Activity, 
    ShieldCheck, 
    AlertTriangle, 
    Target, 
    TrendingUp, 
    Clock, 
    AlertOctagon, 
    Zap, 
    Globe, 
    Cpu, 
    Database, 
    Layers, 
    ArrowUpRight, 
    Terminal, 
    CheckCircle2,
    BarChart3,
    ArrowRight,
    Play,
    StopCircle,
    Layout
} from 'lucide-react';

interface ManagementDashboardProps {
    studies: StudyItem[];
    onNavigate: (view: 'feed' | 'operations' | 'ingest') => void;
}

// --- SUB-COMPONENTS ---

// 1. Radar Chart (Domain Analysis)
const DomainRadarChart = ({ domains }: { domains: Record<string, number> }) => {
    const keys = Object.keys(domains);
    const maxVal = Math.max(...Object.values(domains), 1);
    const radius = 80;
    const center = 100;
    
    const points = keys.map((key, i) => {
        const value = domains[key] || 0;
        const normalized = (value / maxVal) * radius;
        const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
        const x = center + Math.cos(angle) * normalized;
        const y = center + Math.sin(angle) * normalized;
        return `${x},${y}`;
    }).join(' ');

    const axisPoints = keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        return { x, y, label: keys[i] };
    });

    return (
        <div className="relative w-full h-64 flex items-center justify-center animate-fadeIn">
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-[240px]">
                {/* Background Grid */}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#334155" strokeWidth="1" strokeOpacity="0.5" />
                <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
                <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
                
                {/* Spokes */}
                {axisPoints.map((p, i) => (
                    <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#334155" strokeWidth="1" strokeOpacity="0.5" />
                ))}

                {/* Data Shape */}
                <polygon points={points} fill="rgba(5, 223, 156, 0.15)" stroke="#05DF9C" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(5,223,156,0.5)]" />
                
                {/* Data Points */}
                {keys.map((key, i) => {
                    const value = domains[key] || 0;
                    const normalized = (value / maxVal) * radius;
                    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
                    const x = center + Math.cos(angle) * normalized;
                    const y = center + Math.sin(angle) * normalized;
                    return (
                        <circle key={i} cx={x} cy={y} r="3" fill="#fff" className="animate-pulse" />
                    );
                })}
            </svg>
            
            {/* Labels */}
            {axisPoints.map((p, i) => {
                 const style = {
                     left: `${(p.x / 200) * 100}%`,
                     top: `${(p.y / 200) * 100}%`,
                     transform: `translate(${p.x < center ? '-100%' : '0%'}, ${p.y < center ? '-50%' : '0%'})`
                 };
                 const xOffset = p.x < center ? -10 : 10;
                 return (
                     <div key={i} className="absolute text-[9px] font-bold text-slate-400 uppercase tracking-wider" style={{...style, marginLeft: p.x > center ? '8px' : '-8px', marginTop: p.y > center ? '8px' : '-8px'}}>
                        {p.label}
                     </div>
                 );
            })}
        </div>
    );
};

// 2. Real-time Clock
const LiveClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className="flex flex-col items-end">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock size={10} /> SYSTEM TIME
            </div>
            <div className="flex gap-3 font-mono text-sm">
                <span className="text-white">{time.toLocaleTimeString()} <span className="text-slate-600">L</span></span>
                <span className="text-[#05DF9C]">{time.toISOString().split('T')[1].split('.')[0]} <span className="text-[#05DF9C]/50">Z</span></span>
            </div>
        </div>
    );
};

const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ studies, onNavigate }) => {
    
    // --- ANALYTICS LOGIC ---
    const analytics = useMemo(() => {
        const total = studies.length;
        
        // Pipeline
        const pipeline = {
            collection: studies.filter(s => s.source === 'Signal' || s.source === 'Telegram').length,
            processing: studies.filter(s => s.status === 'Processing').length,
            review: studies.filter(s => s.status === 'Review').length,
            approved: studies.filter(s => s.status === 'Approved').length
        };
        const clearanceRate = total > 0 ? (pipeline.approved / total) * 100 : 0;
        
        // Criticality
        const criticalStudies = studies.filter(s => 
            (s.intelligence.reliability || 0) >= 0.95 || 
            s.tags.map(t => t.toUpperCase()).includes('CRITICAL') ||
            s.tags.map(t => t.toUpperCase()).includes('URGENT')
        );

        // Bottlenecks (Oldest 'Review')
        const bottlenecks = studies
            .filter(s => s.status === 'Review')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3);

        // Domains
        const domains: Record<string, number> = { 'CYBER': 0, 'FINANCE': 0, 'MILITARY': 0, 'POLITICAL': 0, 'INFRA': 0 };
        studies.forEach(s => {
            const txt = (s.title + s.tags.join(' ')).toUpperCase();
            if (txt.includes('CYBER') || txt.includes('MALWARE')) domains['CYBER']++;
            else if (txt.includes('FINANCE') || txt.includes('MONEY')) domains['FINANCE']++;
            else if (txt.includes('MILITARY') || txt.includes('WEAPON')) domains['MILITARY']++;
            else if (txt.includes('GRID') || txt.includes('POWER')) domains['INFRA']++;
            else domains['POLITICAL']++;
        });

        // Entities (HVT)
        const entityFrequency: Record<string, { count: number, type: string }> = {};
        studies.forEach(s => {
            s.intelligence.entities.forEach(e => {
                if (!entityFrequency[e.name]) entityFrequency[e.name] = { count: 0, type: e.type };
                entityFrequency[e.name].count++;
            });
        });
        const topEntities = Object.entries(entityFrequency)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 4)
            .map(([name, data]) => ({ name, ...data }));

        // Velocity (Mocked for visual balance if empty)
        const dateMap: Record<string, number> = {};
        for(let i=13; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = `${String(d.getDate()).padStart(2, '0')}`;
            dateMap[dateStr] = Math.floor(Math.random() * 5) + 1; // Mock baseline activity
        }
        studies.forEach(s => {
            const day = s.date.split('/')[0];
            if (dateMap[day] !== undefined) dateMap[day] += 5; // Weight actual data higher
        });
        const velocityValues = Object.entries(dateMap).map(([day, count]) => ({ day, count }));
        const velocityMax = Math.max(...velocityValues.map(v => v.count), 10);

        return { total, pipeline, clearanceRate, criticalCount: criticalStudies.length, bottlenecks, domains, topEntities, velocity: { values: velocityValues, max: velocityMax } };
    }, [studies]);

    const threatLevel = analytics.criticalCount > 3 ? 'HIGH' : analytics.criticalCount > 1 ? 'ELEVATED' : 'LOW';
    const threatColor = threatLevel === 'HIGH' ? 'text-rose-500' : threatLevel === 'ELEVATED' ? 'text-amber-500' : 'text-[#05DF9C]';

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#09090b] p-6 lg:p-8 font-sans text-slate-200">
            
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-slate-800 pb-6 relative gap-4">
                <div className="absolute top-0 left-0 w-32 h-1 bg-[#05DF9C] shadow-[0_0_20px_#05DF9C]"></div>
                
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4 mb-2">
                        <Layout size={32} className="text-[#05DF9C]" />
                        COMMAND DECK
                    </h1>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest pl-1">
                        <span className="flex items-center gap-2 text-[#05DF9C] bg-[#05DF9C]/10 px-2 py-0.5 rounded border border-[#05DF9C]/20">
                            <Activity size={12} className="animate-pulse" /> SYSTEM ONLINE
                        </span>
                        <span>|</span>
                        <span>Cycle: {new Date().getFullYear()}-Q3</span>
                    </div>
                </div>

                <div className="flex gap-8 items-end">
                    <LiveClock />
                    <div className="h-10 w-px bg-slate-800 hidden md:block"></div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-end gap-2">
                            Global Threat <ShieldCheck size={12} />
                        </div>
                        <div className={`text-2xl font-black ${threatColor} tracking-tighter flex items-center gap-2 justify-end`}>
                            <AlertTriangle size={20} /> DEFCON {threatLevel}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- KPI CARDS (Interactive Navigation) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                {/* 1. Clearance Rate */}
                <div className="bg-[#121212] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500"><CheckCircle2 size={18} /></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Efficiency</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tighter">{analytics.clearanceRate.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">Throughput Rate</div>
                    {/* Tiny Chart */}
                    <div className="flex items-end gap-0.5 h-6 mt-3 opacity-30">
                        {[4,6,3,7,5,8,9,6,8,10].map((h, i) => <div key={i} className="flex-1 bg-emerald-500" style={{height: `${h*10}%`}}></div>)}
                    </div>
                </div>

                {/* 2. Critical Intel -> GO TO FEED */}
                <div 
                    onClick={() => onNavigate('feed')}
                    className="bg-[#121212] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-rose-500 transition-all cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors"><ShieldCheck size={18} /></div>
                        {analytics.criticalCount > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
                    </div>
                    <div className="text-3xl font-black text-white tracking-tighter group-hover:text-rose-400 transition-colors">{analytics.criticalCount}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">Critical Threats</div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 text-[9px] font-bold uppercase flex items-center gap-1">
                        View Feed <ArrowRight size={10} />
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/30"></div>
                </div>

                {/* 3. Volume / Intake -> GO TO INGEST */}
                <div 
                    onClick={() => onNavigate('ingest')}
                    className="bg-[#121212] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-sky-500 transition-all cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors"><Database size={18} /></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Volume</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tighter group-hover:text-sky-400 transition-colors">{analytics.total}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">Total Intelligence Items</div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-sky-500 text-[9px] font-bold uppercase flex items-center gap-1">
                        Ingest Data <ArrowRight size={10} />
                    </div>
                </div>

                {/* 4. Network Status */}
                <div className="bg-[#121212] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500"><Cpu size={18} /></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Synapse</span>
                    </div>
                    <div className="flex gap-1 items-end h-8 mt-2">
                        {[40, 70, 45, 90, 60, 80, 50, 75, 40, 60].map((h, i) => (
                             <div key={i} className="flex-1 bg-slate-800 hover:bg-[#05DF9C] transition-colors rounded-t-sm" style={{height: `${h}%`}}></div>
                        ))}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">Network Activity (Live)</div>
                </div>
            </div>

            {/* --- MAIN DASHBOARD LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* COL 1: TACTICAL ANALYSIS (Radar & HVTs) */}
                <div className="space-y-6">
                    {/* Radar */}
                    <div className="bg-[#121212] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-widest">
                                <Globe size={14} className="text-[#05DF9C]" /> DOMAIN DOMINANCE
                            </h3>
                        </div>
                        <DomainRadarChart domains={analytics.domains} />
                    </div>

                    {/* HVTs List -> GO TO FEED (Filtered) */}
                    <div className="bg-[#121212] border border-slate-800 rounded-xl p-6 flex flex-col h-[340px]">
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-widest">
                                <Target size={14} className="text-rose-500" /> HIGH VALUE TARGETS
                            </h3>
                            <button onClick={() => onNavigate('feed')} className="text-[10px] text-slate-500 hover:text-white uppercase">View All</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {analytics.topEntities.map((e, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onNavigate('feed')}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-800 transition-all group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-700 group-hover:text-rose-500 group-hover:border-rose-500">{i+1}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate max-w-[120px]">{e.name}</span>
                                            <span className="text-[9px] font-mono text-slate-500 group-hover:text-rose-400">{e.count} MENTIONS</span>
                                        </div>
                                        {/* Activity Bar */}
                                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-rose-500 h-full rounded-full" style={{width: `${Math.min(e.count * 10, 100)}%`}}></div>
                                        </div>
                                    </div>
                                    <ArrowUpRight size={14} className="text-slate-600 group-hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                             {analytics.topEntities.length === 0 && <div className="text-center text-xs text-slate-600 py-4">No targets indexed.</div>}
                        </div>
                    </div>
                </div>

                {/* COL 2: OPS PIPELINE & ACTION ITEMS */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Pipeline Visualization */}
                    <div className="bg-[#121212] border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-widest">
                                <Layers size={14} className="text-sky-400" /> INTELLIGENCE LIFECYCLE
                            </h3>
                        </div>
                        
                        <div className="flex items-center gap-2 relative">
                            {/* Connector Line */}
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
                            
                            {[
                                { label: 'Collection', count: analytics.pipeline.collection, color: 'text-slate-400', border: 'border-slate-700' },
                                { label: 'Processing', count: analytics.pipeline.processing, color: 'text-amber-400', border: 'border-amber-500/50' },
                                { label: 'Review', count: analytics.pipeline.review, color: 'text-rose-400', border: 'border-rose-500/50' },
                                { label: 'Finished', count: analytics.pipeline.approved, color: 'text-emerald-400', border: 'border-emerald-500/50' },
                            ].map((stage, i) => (
                                <div key={i} className={`flex-1 bg-[#09090b] rounded-lg border ${stage.border} p-4 flex flex-col items-center justify-center relative z-10 transition-transform hover:-translate-y-1`}>
                                    <div className={`text-2xl font-black ${stage.color}`}>{stage.count}</div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">{stage.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottlenecks -> GO TO OPERATIONS */}
                    <div className="flex-1 bg-[#121212] border border-slate-800 rounded-xl p-6 flex flex-col relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-widest">
                                <AlertOctagon size={14} className="text-rose-500" /> CRITICAL BOTTLENECKS
                            </h3>
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                <span className="text-[10px] text-rose-500 font-bold uppercase">Stalled in Review</span>
                             </div>
                        </div>
                        
                        <div className="flex-1 space-y-3 relative z-10">
                            {analytics.bottlenecks.map((study) => (
                                <div key={study.id} className="bg-[#09090b]/80 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-rose-500/30 transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1">{study.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] text-slate-500 font-mono uppercase bg-slate-900 px-1.5 rounded">{study.source}</span>
                                                <span className="text-[9px] text-rose-400 font-mono">{study.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onNavigate('operations')}
                                        className="bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
                                    >
                                        <Zap size={12} fill="currentColor" /> Expedite
                                    </button>
                                </div>
                            ))}
                            {analytics.bottlenecks.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 min-h-[150px]">
                                    <CheckCircle2 size={32} className="text-emerald-500/50" />
                                    <span className="text-xs uppercase tracking-widest">Pipeline Clear</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FOOTER: INTAKE VELOCITY --- */}
            <div className="bg-[#121212] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                 <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-widest">
                        <TrendingUp size={14} className="text-[#05DF9C]" /> 14-DAY INTAKE VELOCITY
                    </h3>
                </div>
                <div className="h-32 flex items-end gap-2 relative z-10 px-2">
                    {analytics.velocity.values.map((v, i) => {
                         const height = (v.count / analytics.velocity.max) * 100;
                         return (
                             <div key={i} className="flex-1 flex flex-col justify-end group relative cursor-pointer" onClick={() => onNavigate('ingest')}>
                                 <div 
                                    className="w-full bg-slate-800 rounded-t group-hover:bg-[#05DF9C] transition-all duration-300 relative overflow-hidden"
                                    style={{height: `${Math.max(height, 5)}%`}}
                                 >
                                     <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent"></div>
                                 </div>
                                 <div className="text-[9px] text-slate-600 font-mono text-center mt-2 group-hover:text-white transition-colors">{v.day}</div>
                                 
                                 {/* Tooltip */}
                                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-slate-700 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                     {v.count} Items
                                 </div>
                             </div>
                         )
                    })}
                </div>
            </div>

        </div>
    );
};

export default ManagementDashboard;
