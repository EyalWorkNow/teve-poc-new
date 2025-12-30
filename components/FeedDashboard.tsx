
import React, { useState, useMemo } from 'react';
import { StudyItem } from '../types';
import { 
  Search, 
  Video,
  FileText, 
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  LayoutGrid,
  Filter,
  MoreVertical,
  Activity,
  Radio,
  Globe,
  ShieldAlert,
  Hash,
  Cpu,
  Signal,
  Sparkles,
  GitMerge
} from 'lucide-react';
import { isEntityMatch } from '../services/geminiService';


interface FeedDashboardProps {
  studies: StudyItem[];
  onSelectStudy: (study: StudyItem) => void;
  onNewAnalysis: () => void;
}

// This would typically be a complex calculation, maybe even a separate AI call.
// For the POC, we simulate it based on reliability and cross-connections.
const calculateSynapseScore = (study: StudyItem, allStudies: StudyItem[]): { score: number, reason: string } => {
    let score = (study.intelligence.reliability || 0.5) * 50; // Base score from reliability
    let connections = 0;
    let highValueLinks: string[] = [];

    const otherStudies = allStudies.filter(s => s.id !== study.id);
    
    study.intelligence.entities.forEach(entity => {
        const isMatch = otherStudies.some(other => 
            other.intelligence.entities.some(otherEntity => isEntityMatch(entity.name, otherEntity.name))
        );
        if (isMatch) {
            connections++;
            if (highValueLinks.length < 2) highValueLinks.push(entity.name);
        }
    });

    // Bonus for high number of connections
    score += Math.min(connections * 10, 50);
    score = Math.round(score);

    let reason = "Standard procedural review.";
    if (score > 90) reason = "CRITICAL: High reliability & network impact.";
    else if (score > 75) reason = `High priority. Links to: ${highValueLinks.join(', ')}.`;
    else if (connections > 0) reason = `Moderate priority. Cross-references existing cases.`;

    return { score, reason };
};


const FeedDashboard: React.FC<FeedDashboardProps> = ({ studies, onSelectStudy, onNewAnalysis }) => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const studiesWithScores = useMemo(() => {
    return studies.map(study => ({
        ...study,
        synapse: calculateSynapseScore(study, studies)
    })).sort((a, b) => b.synapse.score - a.synapse.score);
  }, [studies]);


  const filteredStudies = studiesWithScores.filter(s => {
    const lowerSearch = search.toLowerCase();
    const matchesSearch = s.title.toLowerCase().includes(lowerSearch) || s.tags.some(t => t.toLowerCase().includes(lowerSearch));
    const matchesFilter = filter === 'All' || s.source === filter;
    return matchesSearch && matchesFilter;
  });

  const getSourceConfig = (source: string) => {
      switch(source) {
          case 'Signal': return { icon: Signal, color: 'text-amber-400', border: 'border-amber-500/50', shadow: 'shadow-amber-500/20', bg: 'bg-amber-500/10' };
          case 'Telegram': return { icon: Video, color: 'text-sky-400', border: 'border-sky-500/50', shadow: 'shadow-sky-500/20', bg: 'bg-sky-500/10' };
          case 'News': return { icon: Globe, color: 'text-rose-400', border: 'border-rose-500/50', shadow: 'shadow-rose-500/20', bg: 'bg-rose-500/10' };
          default: return { icon: FileText, color: 'text-emerald-400', border: 'border-emerald-500/50', shadow: 'shadow-emerald-500/20', bg: 'bg-emerald-500/10' };
      }
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#181818] relative">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/40 via-[#181818] to-[#181818] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none opacity-20"></div>

      {/* Floating Header */}
      <div className="px-8 py-8 z-20 shrink-0">
          <div className="flex justify-between items-end mb-8">
              <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                      <LayoutGrid className="text-[#05DF9C]" size={28} />
                      INTELLIGENCE FEED
                  </h1>
                  <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest pl-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
                      Systems Nominal 
                      <span className="text-slate-700">|</span> 
                      {filteredStudies.length} Reports Active
                  </div>
              </div>
              <button 
                onClick={onNewAnalysis}
                className="group bg-[#05DF9C] hover:bg-white text-black pl-5 pr-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(5,223,156,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(5,223,156,0.5)] active:scale-95 text-xs uppercase tracking-wider"
              >
                  <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" /> New Operation
              </button>
          </div>

          {/* Search Bar */}
          <div className="bg-[#121212]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2 flex gap-4 shadow-2xl max-w-4xl transition-all focus-within:border-[#05DF9C]/50 focus-within:shadow-[0_0_30px_rgba(5,223,156,0.1)]">
              <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#05DF9C] transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search entities, keywords, locations..."
                    className="w-full bg-transparent border-none rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:outline-none placeholder-slate-600 font-mono transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
              </div>
              <div className="flex items-center gap-1 bg-[#181818] rounded-xl p-1 border border-slate-800">
                   {['All', 'Telegram', 'News', 'Signal'].map(f => (
                       <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 ${filter === f ? 'bg-slate-800 text-white shadow-lg shadow-black/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                       >
                           {f}
                       </button>
                   ))}
              </div>
          </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-10 scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-600 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
            {filteredStudies.map((study) => {
                const sourceCfg = getSourceConfig(study.source);
                const scoreColor = study.synapse.score > 90 ? 'text-rose-400' : study.synapse.score > 75 ? 'text-amber-400' : 'text-sky-400';
                
                return (
                <div 
                    key={study.id} 
                    onClick={() => onSelectStudy(study)}
                    className="group relative bg-[#121212]/40 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 flex flex-col h-80 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] hover:border-[#05DF9C]/30 hover:bg-[#121212]/80"
                >
                    {/* Active Glow Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    
                    {/* Top Accent Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-500 ${scoreColor.replace('text-', 'bg-')} opacity-0 group-hover:opacity-100`}></div>

                    {/* Large Abstract Icon */}
                    <sourceCfg.icon 
                        className={`absolute -right-8 -bottom-8 opacity-[0.02] group-hover:opacity-10 transition-transform duration-700 pointer-events-none ${sourceCfg.color} transform group-hover:scale-125 rotate-12`} 
                        size={180} 
                        strokeWidth={1}
                    />

                    <div className="p-6 flex flex-col h-full relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-lg border ${sourceCfg.bg} ${sourceCfg.border} ${sourceCfg.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                <sourceCfg.icon size={18} />
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className={`flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded border-b-2 ${scoreColor} ${scoreColor.replace('text-','border-')}/50 bg-black/40`}>
                                   <Sparkles size={10} /> SYNAPSE SCORE: {study.synapse.score}
                                </div>
                            </div>
                        </div>

                        {/* Title & Text */}
                        <div className="flex-1 min-h-0 mb-4 space-y-2">
                             <h3 dir="auto" className="text-sm font-bold text-slate-100 leading-snug group-hover:text-[#05DF9C] transition-colors line-clamp-2">
                                {study.title}
                            </h3>
                            <p dir="auto" className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 group-hover:text-slate-300 transition-colors font-medium">
                                {study.intelligence.insights[0]?.text || study.intelligence.clean_text}
                            </p>
                        </div>

                        {/* Footer Info */}
                        <div className="mt-auto space-y-3">
                             {/* Reason for Priority */}
                             <div className="bg-black/50 border border-slate-800 rounded-lg p-3 group-hover:border-slate-700 transition-colors">
                                 <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">
                                     <span>Triage Recommendation</span>
                                     <span className={study.synapse.score > 75 ? 'text-amber-400' : 'text-slate-500'}>
                                         {study.synapse.score > 75 ? 'ACTION REQ.' : 'ROUTINE'}
                                     </span>
                                 </div>
                                 <p className="text-[10px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors line-clamp-2" title={study.synapse.reason}>
                                     {study.synapse.reason}
                                 </p>
                             </div>
                            
                            {/* Tags */}
                            <div className="flex gap-1.5 flex-wrap h-6 overflow-hidden">
                                {study.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[9px] font-mono bg-black/40 text-slate-500 px-2 py-0.5 rounded border border-slate-800 group-hover:border-[#05DF9C]/30 group-hover:text-[#05DF9C] transition-colors whitespace-nowrap">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
};

export default FeedDashboard;