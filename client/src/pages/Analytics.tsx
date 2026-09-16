import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Zap, AlertCircle, BarChart3, TrendingUp, Clock, ShieldAlert, Cpu, Server, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPlatformOverview } from '../services/analyticsService';

interface PlatformOverviewData {
  totalProjects: number;
  totalEndpoints: number;
  totalCalls: number;
  avgLatencyMs: number;
  errorRatePct: string;
  errorCount: number;
  recentHistory: Array<{
    id: string;
    method: string;
    url: string;
    status: number;
    duration: number;
    created_at: string;
  }>;
}

const Analytics = () => {
  const [platformData, setPlatformData] = useState<PlatformOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await getPlatformOverview();
        setPlatformData(data);
      } catch (err) {
        console.error('Failed to load platform analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  const mockLatencyData = [
    { time: '10:00', p95: 120, p99: 450 },
    { time: '11:00', p95: 132, p99: 480 },
    { time: '12:00', p95: 101, p99: 420 },
    { time: '13:00', p95: 154, p99: 610 },
    { time: '14:00', p95: 180, p99: 720 },
    { time: '15:00', p95: 140, p99: 550 },
    { time: '16:00', p95: 125, p99: 490 },
  ];

  const mockUsageData = [
    { day: 'Mon', calls: 4000 },
    { day: 'Tue', calls: 3000 },
    { day: 'Wed', calls: 2000 },
    { day: 'Thu', calls: 2780 },
    { day: 'Fri', calls: 1890 },
    { day: 'Sat', calls: 2390 },
    { day: 'Sun', calls: 3490 },
  ];

  const statsList = [
    {
      label: 'Total API Calls',
      value: platformData ? platformData.totalCalls.toLocaleString() : (loading ? '...' : '0'),
      change: '+12.5%',
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Avg Latency',
      value: platformData ? `${platformData.avgLatencyMs}ms` : (loading ? '...' : '0ms'),
      change: platformData && platformData.avgLatencyMs > 500 ? '+15%' : '-4.2%',
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Error Rate',
      value: platformData ? `${platformData.errorRatePct}%` : (loading ? '...' : '0.00%'),
      change: platformData && Number(platformData.errorRatePct) > 5 ? '+2.1%' : '-0.05%',
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    },
    {
      label: 'Monitored Endpoints',
      value: platformData ? platformData.totalEndpoints.toString() : (loading ? '...' : '0'),
      change: `in ${platformData?.totalProjects ?? 0} projects`,
      icon: Server,
      color: 'text-violet-600',
      bg: 'bg-violet-50'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-6 py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Platform Analytics</h1>
            <p className="text-slate-500 text-lg">Real-time telemetry and AI intelligence across your API ecosystem.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Telemetry Feed</span>
             </div>
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statsList.map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label} 
              className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-colors group-hover:scale-110 duration-300`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${stat.change.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-premium">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" /> Latency Distribution
                   </h3>
                   <p className="text-slate-400 text-sm font-medium">P95 and P99 percentiles across all nodes.</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-primary rounded-full" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">P95</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">P99</span>
                   </div>
                </div>
             </div>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockLatencyData}>
                    <defs>
                      <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <YAxis fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="p95" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorP95)" />
                    <Area type="monotone" dataKey="p99" stroke="#e2e8f0" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Side Analytics */}
          <div className="space-y-8">
             <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden h-full shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                   <Zap className="h-32 w-32" />
                </div>
                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                   <Cpu className="h-5 w-5 text-primary" /> AI Intelligence
                </h3>
                <p className="text-slate-400 text-sm font-bold mb-8 uppercase tracking-widest">Powered by NVIDIA NIM</p>
                
                <div className="space-y-6">
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Diagnostic Engine</p>
                      <p className="text-sm font-medium leading-relaxed">Continuous endpoint analysis for regressions, code vulnerabilities, and edge cases.</p>
                   </div>
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Automated Incident Guard</p>
                      <p className="text-sm font-medium leading-relaxed">Latency anomalies &gt; 3000ms or recurring 5xx errors automatically spawn incident alerts.</p>
                   </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
                   <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                   <span className="text-xs font-semibold text-slate-300">Telemetry Engine Active</span>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-premium">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                 <BarChart3 className="h-5 w-5 text-primary" /> Weekly Traffic Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <YAxis fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="calls" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-premium">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                 <AlertCircle className="h-5 w-5 text-primary" /> {platformData?.recentHistory?.length ? 'Recent Telemetry Requests' : 'Incident Stream'}
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                 {platformData?.recentHistory && platformData.recentHistory.length > 0 ? (
                   platformData.recentHistory.map((item) => {
                     const isError = item.status >= 400;
                     return (
                       <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                               item.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                               item.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                               item.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                               item.method === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                             }`}>
                               {item.method}
                             </span>
                             <div className="truncate">
                                <p className="font-semibold text-slate-900 text-sm truncate">{item.url}</p>
                                <p className="text-[11px] font-medium text-slate-400">
                                  {new Date(item.created_at).toLocaleTimeString()} &middot; {item.duration}ms
                                </p>
                             </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                            isError ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {item.status}
                          </span>
                       </div>
                     );
                   })
                 ) : (
                   [
                     { id: '1', title: '500 Server Error Spikes', time: '2 mins ago', severity: 'Critical', color: 'bg-rose-50 text-rose-600' },
                     { id: '2', title: 'High Latency on Login', time: '14 mins ago', severity: 'Warning', color: 'bg-amber-50 text-amber-600' },
                     { id: '3', title: 'Unusual Traffic Pattern', time: '1 hour ago', severity: 'Info', color: 'bg-blue-50 text-blue-600' },
                   ].map(incident => (
                     <div key={incident.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`h-2 w-2 rounded-full ${incident.severity === 'Critical' ? 'bg-rose-500 animate-pulse' : incident.severity === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                           <div>
                              <p className="font-bold text-slate-900">{incident.title}</p>
                              <p className="text-xs font-bold text-slate-400 mt-0.5">{incident.time}</p>
                           </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${incident.color}`}>
                           {incident.severity}
                        </span>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;

