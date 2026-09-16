import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Zap, 
  BrainCircuit, 
  Search, 
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  Flame,
  Mail
} from 'lucide-react';
import type { RootState } from '../redux/store';
import { incidentService, type IncidentItem } from '../services/incidentService';
import { setIncidents, setStats, addOrUpdateIncident, setLoading } from '../redux/slices/incidentSlice';
import Navbar from '../components/Navbar';

const IncidentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { incidents, stats, loading } = useSelector((state: RootState) => state.incident);
  
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  const fetchIncidentsAndStats = async () => {
    dispatch(setLoading(true));
    try {
      const [incidentsRes, statsRes] = await Promise.all([
        incidentService.getIncidents({
          severity: selectedSeverity === 'ALL' ? undefined : selectedSeverity,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          limit: 30
        }),
        incidentService.getStats()
      ]);

      dispatch(setIncidents(incidentsRes));
      dispatch(setStats(statsRes));
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    fetchIncidentsAndStats();

    // Socket.io Real-Time Synchronization
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      reconnectionAttempts: 5
    });

    socket.on('incident.created', (data: { incident: IncidentItem }) => {
      dispatch(addOrUpdateIncident(data.incident));
    });

    socket.on('incident.analysis.completed', () => {
      fetchIncidentsAndStats();
    });

    socket.on('incident.resolved', () => {
      fetchIncidentsAndStats();
    });

    socket.on('incident.notification', (data: any) => {
      setSimulationToast(`Notification: ${data.title}`);
      setTimeout(() => setSimulationToast(null), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSeverity, selectedStatus]);

  const handleSimulateOutage = async () => {
    setIsSimulating(true);
    setSimulationToast('Triggering production outage simulation: /api/orders (Latency spike 1500ms, 35% 5xx)...');
    try {
      const res = await incidentService.simulateOutageDemo();
      setSimulationToast('🚨 Incident created! AI Agent is analyzing root cause in background...');
      await fetchIncidentsAndStats();
      
      // Auto-navigate to newly simulated incident after 1.5s
      if (res.incident?.id) {
        setTimeout(() => {
          navigate(`/incidents/${res.incident.id}`);
        }, 1200);
      }
    } catch (err: any) {
      setSimulationToast(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationToast(null), 5000);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setSimulationToast('📧 Dispatching test latency alert email to configured address...');
    try {
      const res = await incidentService.testEmailAlert();
      setSimulationToast(res.message || '✅ Test latency alert email sent successfully! Please check your inbox.');
    } catch (err: any) {
      setSimulationToast(`❌ Email test failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsTestingEmail(false);
      setTimeout(() => setSimulationToast(null), 6000);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return inc.title.toLowerCase().includes(q) ||
           inc.endpoint?.path.toLowerCase().includes(q) ||
           inc.category.toLowerCase().includes(q);
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 border border-rose-200">
            <Flame className="w-3.5 h-3.5 animate-pulse text-rose-600" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-200">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 border border-slate-200">
            {severity}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            RESOLVED
          </span>
        );
      case 'AI_ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
            <BrainCircuit className="w-3.5 h-3.5" />
            AI DIAGNOSING
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
            <ShieldAlert className="w-3.5 h-3.5" />
            AWAITING APPROVAL
          </span>
        );
      case 'REMEDIATING':
      case 'VERIFYING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />

      {simulationToast && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3 transition-all animate-in slide-in-from-top-4">
          <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{simulationToast}</div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-6 py-10 max-w-7xl">
        {/* Header Title & Outage Demo Trigger */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center border border-rose-200">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Incident Response & Remediation
              </h1>
            </div>
            <p className="text-slate-500 text-base mt-1.5">
              Autonomous telemetry anomaly detection, AI-powered root cause analysis, and safe remediation workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestEmail}
              disabled={isTestingEmail}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Send a sample latency alert email to test your SMTP / Gmail configuration"
            >
              <Mail className="w-4 h-4 text-indigo-600" />
              {isTestingEmail ? 'Sending Test...' : 'Test Latency Email'}
            </button>
            <button
              onClick={handleSimulateOutage}
              disabled={isSimulating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {isSimulating ? 'Simulating Outage...' : '⚡ Simulate Outage Scenario'}
            </button>
            <button
              onClick={fetchIncidentsAndStats}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
              title="Refresh Incidents"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Enterprise KPI Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Incidents</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">{stats?.openCount ?? 0}</h3>
              </div>
              <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-rose-600 mt-3 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {stats?.criticalCount ?? 0} Critical Priority
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mean Time to Resolve (MTTR)</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">
                  {stats?.mttrMinutes ? `${stats.mttrMinutes}m` : '< 1m'}
                </h3>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-emerald-600 mt-3 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Autonomous fix verification active
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Diagnosis Accuracy</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">
                  {stats?.aiAccuracyPct ?? 92.5}%
                </h3>
              </div>
              <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 border border-purple-100">
                <BrainCircuit className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-purple-600 mt-3">
              Verified by SRE engineer feedback
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Incidents Handled</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">{stats?.totalIncidents ?? incidents.length}</h3>
              </div>
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-blue-600 mt-3">
              {stats?.resolvedCount ?? 0} successfully auto-remediated
            </p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}

            <div className="h-5 w-px bg-slate-200 mx-2 hidden sm:block" />

            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Status:</span>
            {['ALL', 'OPEN', 'AWAITING_APPROVAL', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incidents by endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Incident Cards List */}
        {filteredIncidents.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-sm">
            <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">All Systems Nominal</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mt-2 mb-6">
              No active incidents detected matching the current filters. Your API health and latencies are within optimal parameters.
            </p>
            <button
              onClick={handleSimulateOutage}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Simulate Outage to Test AI Remediation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map((incident) => {
              const metrics = incident.metrics_snapshot;
              const hasAnalysis = incident.analyses && incident.analyses.length > 0;
              const latestAnalysis = hasAnalysis ? incident.analyses![0] : null;

              return (
                <div
                  key={incident.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Incident Title & Meta */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {getSeverityBadge(incident.severity)}
                        {getStatusBadge(incident.status)}
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {incident.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(incident.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div>
                        <Link 
                          to={`/incidents/${incident.id}`}
                          className="text-lg font-bold text-slate-900 hover:text-primary transition-colors flex items-center gap-2"
                        >
                          {incident.title}
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                        </Link>
                        {incident.endpoint && (
                          <p className="text-xs font-mono text-slate-500 mt-1">
                            <span className="font-bold text-slate-700">{incident.endpoint.method}</span> {incident.endpoint.path}
                          </p>
                        )}
                      </div>

                      {latestAnalysis && (
                        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 flex items-start gap-2.5 mt-2">
                          <BrainCircuit className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-purple-900">
                            <span className="font-bold">AI Diagnosis ({Math.round(latestAnalysis.confidence * 100)}% confidence):</span>{' '}
                            {latestAnalysis.root_cause}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Telemetry Metric Badges */}
                    {metrics && (
                      <div className="flex flex-wrap items-center gap-3 lg:border-l lg:border-slate-100 lg:pl-6">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center min-w-[90px]">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Latency</p>
                          <p className={`text-sm font-black ${metrics.latencyDeviationPct > 100 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {metrics.currentLatencyMs}ms
                          </p>
                          <p className="text-[10px] text-slate-400">base: {metrics.baselineLatencyMs}ms</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center min-w-[90px]">
                          <p className="text-[10px] uppercase font-bold text-slate-400">5xx Errors</p>
                          <p className={`text-sm font-black ${metrics.currentErrorRatePct > 5 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {metrics.currentErrorRatePct}%
                          </p>
                          <p className="text-[10px] text-slate-400">{metrics.fiveXxCount} failed</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center min-w-[90px]">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Timeouts</p>
                          <p className={`text-sm font-black ${metrics.timeoutCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                            {metrics.timeoutCount}
                          </p>
                          <p className="text-[10px] text-slate-400">in window</p>
                        </div>

                        <Link
                          to={`/incidents/${incident.id}`}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-2 cursor-pointer"
                        >
                          Review & Remediate
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default IncidentDashboard;
