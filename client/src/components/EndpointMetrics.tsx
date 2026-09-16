import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  RefreshCw, 
  BarChart2, 
  Radio
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getEndpointMetrics, executeApiRequest } from '../services/testingService';

interface EndpointMetricsProps {
  endpoint: {
    id: string;
    project_id: string;
    method: string;
    path: string;
    request_schema?: any;
    response_schema?: any;
  };
}

interface MetricsData {
  totalRequests: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  errorCount: number;
  errorRatePct: number;
  successCount: number;
  lastStatus: number | null;
  lastLatencyMs: number | null;
  recentHistory: Array<{
    id: string;
    method: string;
    url: string;
    status: number;
    duration: number;
    created_at: string;
  }>;
  statusBreakdown: Record<string, number>;
}

const EndpointMetrics: React.FC<EndpointMetricsProps> = ({ endpoint }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'log'>('chart');

  const fetchMetrics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getEndpointMetrics(endpoint.id);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load endpoint telemetry metrics', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [endpoint.id]);

  const handleQuickProbe = async () => {
    setProbing(true);
    try {
      const backendBase = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
      const mockUrl = `${backendBase}/api/mock/${endpoint.project_id}${endpoint.path}`;

      await executeApiRequest({
        endpointId: endpoint.id,
        method: endpoint.method.toUpperCase(),
        url: mockUrl,
        headers: { 'Content-Type': 'application/json' },
        body: ['POST', 'PUT', 'PATCH'].includes(endpoint.method.toUpperCase()) ? (endpoint.request_schema || {}) : undefined
      });

      // Refresh telemetry
      await fetchMetrics(true);
    } catch (err) {
      console.error('Quick probe failed', err);
    } finally {
      setProbing(false);
    }
  };

  const chartData = (metrics?.recentHistory || []).slice().reverse().map((item, index) => ({
    call: `#${index + 1}`,
    latency: item.duration,
    status: item.status,
    time: new Date(item.created_at).toLocaleTimeString()
  }));

  const getLatencyBadge = (ms: number) => {
    if (ms === 0) return { label: 'Awaiting Traffic', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (ms < 150) return { label: 'Optimal Speed (<150ms)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (ms < 500) return { label: 'Acceptable Latency', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (ms < 1500) return { label: 'Elevated Latency', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Critical Latency (>1.5s)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const latencyBadge = getLatencyBadge(metrics?.avgLatencyMs || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-premium space-y-8 relative overflow-hidden">
      {/* Top Header & Probe Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Endpoint Live Telemetry</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Real-time response times, request frequency, latency distributions, and error health metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMetrics(false)}
            disabled={loading}
            title="Refresh telemetry"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            onClick={handleQuickProbe}
            disabled={probing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-200 transition-all disabled:opacity-50"
          >
            {probing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            )}
            <span>{probing ? 'Probing...' : 'Ping Endpoint Now'}</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Latency / Response Time */}
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500" /> Avg Response Time
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${latencyBadge.color}`}>
              {metrics?.avgLatencyMs ? `${metrics.avgLatencyMs}ms` : 'No data'}
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {metrics?.avgLatencyMs ? `${metrics.avgLatencyMs} ms` : '—'}
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {metrics?.totalRequests ? `Min: ${metrics.minLatencyMs}ms · P95: ${metrics.p95LatencyMs}ms` : 'Run a ping to measure'}
            </p>
          </div>
        </div>

        {/* Card 2: Total API Requests */}
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5 text-primary" /> Total Requests
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-slate-100 text-slate-600 border-slate-200">
              Database
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {metrics?.totalRequests ?? 0}
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {metrics?.totalRequests ? `${metrics.successCount} OK · ${metrics.errorCount} Errors` : '0 calls recorded'}
            </p>
          </div>
        </div>

        {/* Card 3: Error Rate & Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className={`h-3.5 w-3.5 ${(metrics?.errorCount || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`} /> Error Rate
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
              (metrics?.errorCount || 0) === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {(metrics?.errorCount || 0) === 0 ? 'Healthy' : `${metrics?.errorCount} Failed`}
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {metrics?.errorRatePct ?? 0}%
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {metrics?.totalRequests 
                ? `4xx: ${metrics.statusBreakdown['400'] || 0} · 5xx: ${metrics.statusBreakdown['500'] || 0}`
                : 'Zero errors reported'}
            </p>
          </div>
        </div>

        {/* Card 4: Last Response Status */}
        <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Latest Status
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-blue-50 text-blue-700 border-blue-200">
              Live Verified
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-center gap-2">
              {metrics?.lastStatus ? (
                <>
                  <span className={metrics.lastStatus < 400 ? 'text-emerald-600' : 'text-rose-600'}>
                    {metrics.lastStatus}
                  </span>
                  <span className="text-sm font-sans font-bold text-slate-400">
                    {metrics.lastStatus < 300 ? 'OK' : metrics.lastStatus < 400 ? 'Redirect' : 'Error'}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-2xl font-sans">Ready</span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {metrics?.lastLatencyMs ? `Took ${metrics.lastLatencyMs}ms` : 'Click Ping to benchmark'}
            </p>
          </div>
        </div>
      </div>

      {/* Latency Trajectory Chart & Live Request Stream */}
      {metrics?.recentHistory && metrics.recentHistory.length > 0 ? (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'chart' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Latency Trend
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'log' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Recent Requests ({metrics.recentHistory.length})
              </button>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Last updated: {new Date(metrics.recentHistory[0]?.created_at).toLocaleTimeString()}
            </span>
          </div>

          {activeTab === 'chart' ? (
            <div className="h-52 w-full pt-4 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="call" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="ms" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <p className="font-bold">{data.time}</p>
                            <p className="text-blue-300 font-mono font-bold">Latency: {data.latency}ms</p>
                            <p className={data.status < 400 ? 'text-emerald-400' : 'text-rose-400'}>
                              Status: {data.status}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#latencyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {metrics.recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl text-xs hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      item.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                      item.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                      item.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                      item.method === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {item.method}
                    </span>
                    <span className="font-mono font-semibold text-slate-800 truncate">{item.url}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-slate-500">{item.duration}ms</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                      item.status < 400 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-600 font-bold text-sm">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            No Telemetry Recorded Yet for This Route
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This endpoint has not processed traffic yet. Click the button below to send an instant ping and measure its real response time and status.
          </p>
          <button
            onClick={handleQuickProbe}
            disabled={probing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {probing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            )}
            <span>{probing ? 'Measuring...' : 'Ping Endpoint Now'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EndpointMetrics;
