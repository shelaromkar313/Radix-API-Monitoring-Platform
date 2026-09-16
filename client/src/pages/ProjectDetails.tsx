import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { setEndpoints, setSelectedEndpoint } from '../redux/slices/endpointSlice';
import type { Endpoint } from '../redux/slices/endpointSlice';
import api from '../services/api';
import Navbar from '../components/Navbar';
import TestingConsole from '../components/TestingConsole';
import AIExplanation from '../components/AIExplanation';
import AIAudit from '../components/AIAudit';
import AIRefactor from '../components/AIRefactor';
import AITestCases from '../components/AITestCases';
import EndpointMetrics from '../components/EndpointMetrics';
import { Search, Code as CodeIcon, Server, Database, ArrowLeft, Terminal, Info, ChevronRight, Download, FileText, ChevronDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const dispatch = useDispatch();
  const { endpoints, selectedEndpoint } = useSelector((state: RootState) => state.endpoint);

  const fetchProjectData = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const [epRes, projRes] = await Promise.allSettled([
        api.get(`/endpoints/project/${id}`),
        api.get(`/projects/${id}`)
      ]);
      if (epRes.status === 'fulfilled') {
        dispatch(setEndpoints(epRes.value.data));
        if (epRes.value.data && epRes.value.data.length > 0 && !selectedEndpoint) {
          dispatch(setSelectedEndpoint(epRes.value.data[0]));
        }
      }
      if (projRes.status === 'fulfilled') {
        setProject(projRes.value.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch project details', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load endpoints');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProjectData();
  }, [id, dispatch]);

  // Real-time polling while status is scanning
  useEffect(() => {
    if (project?.status !== 'scanning' && project?.status !== 'pending') return;
    const interval = setInterval(() => {
      fetchProjectData(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [project?.status, id]);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await api.post(`/projects/${id}/rescan`);
      setProject((prev: any) => ({ ...prev, status: 'scanning' }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to trigger re-scan');
    } finally {
      setRescanning(false);
    }
  };

  const handleExportOpenApi = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/projects/${id}/export/openapi`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openapi-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (err) {
      console.error('Failed to export OpenAPI spec', err);
      alert('Failed to export OpenAPI specification.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPostman = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/projects/${id}/export/postman`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postman-collection-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (err) {
      console.error('Failed to export Postman collection', err);
      alert('Failed to export Postman collection.');
    } finally {
      setExporting(false);
    }
  };

  const methodStyles = (method: string, active: boolean) => {
    const methods: Record<string, string> = {
      'GET': active ? 'bg-blue-600 text-white' : 'text-blue-600 bg-blue-50 border-blue-100',
      'POST': active ? 'bg-emerald-600 text-white' : 'text-emerald-600 bg-emerald-50 border-emerald-100',
      'PUT': active ? 'bg-amber-600 text-white' : 'text-amber-600 bg-amber-50 border-amber-100',
      'DELETE': active ? 'bg-rose-600 text-white' : 'text-rose-600 bg-rose-50 border-rose-100',
      'PATCH': active ? 'bg-violet-600 text-white' : 'text-violet-600 bg-violet-50 border-violet-100',
    };
    return methods[method.toUpperCase()] || (active ? 'bg-slate-600 text-white' : 'text-slate-600 bg-slate-50 border-slate-100');
  };

  const filteredEndpoints = endpoints.filter(ep => 
    ep.path.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ep.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-4rem)]">
          <div className="p-6 space-y-6 border-b border-slate-100">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors group">
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to Workspace
            </Link>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search endpoints..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {project?.status === 'scanning' && (
              <div className="p-4 mb-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-center space-y-2">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Scanning Codebase</p>
                <p className="text-[11px] text-blue-600">Extracting API routes in background...</p>
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : errorMessage ? (
              <div className="py-12 px-4 text-center space-y-3">
                <p className="text-xs font-bold text-rose-500">{errorMessage}</p>
                <button
                  onClick={() => fetchProjectData()}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="py-16 text-center space-y-4 px-2">
                <Search className="h-10 w-10 text-slate-200 mx-auto" />
                <p className="text-sm font-bold text-slate-400">
                  {project?.status === 'scanning' ? 'Discovering endpoints...' : 'No endpoints detected'}
                </p>
                <button
                  onClick={handleRescan}
                  disabled={rescanning || project?.status === 'scanning'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${rescanning || project?.status === 'scanning' ? 'animate-spin' : ''}`} />
                  Re-scan Repository
                </button>
              </div>
            ) : (
              filteredEndpoints.map((ep: Endpoint) => (
                <button
                  key={ep.id}
                  onClick={() => dispatch(setSelectedEndpoint(ep))}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all group ${
                    selectedEndpoint?.id === ep.id 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 scale-[1.02]' 
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-tighter transition-colors ${
                    methodStyles(ep.method, selectedEndpoint?.id === ep.id)
                  }`}>
                    {ep.method}
                  </span>
                  <span className="truncate flex-1 font-bold text-sm tracking-tight">{ep.path}</span>
                  <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${selectedEndpoint?.id === ep.id ? 'text-slate-400' : 'text-slate-300'}`} />
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {selectedEndpoint ? (
              <motion.div 
                key={selectedEndpoint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-10 max-w-6xl mx-auto space-y-10 pb-32"
              >
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`p-5 rounded-2xl border ${methodStyles(selectedEndpoint.method, false)} shadow-sm`}>
                      <CodeIcon className="h-7 w-7" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black tracking-tight text-slate-900 font-mono">{selectedEndpoint.path}</h1>
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
                        <span className="text-primary">{selectedEndpoint.method}</span>
                        <div className="h-1 w-1 bg-slate-300 rounded-full" />
                        <span>Interactive Intelligence</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 relative">
                    <button
                      onClick={handleRescan}
                      disabled={rescanning || project?.status === 'scanning'}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      title="Re-scan code repository for endpoints"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-primary ${rescanning || project?.status === 'scanning' ? 'animate-spin' : ''}`} />
                      <span>{project?.status === 'scanning' ? 'Scanning...' : 'Re-scan'}</span>
                    </button>

                    <div className="relative">
                      <button 
                        onClick={() => setExportOpen(!exportOpen)}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        <span>{exporting ? 'Exporting...' : 'Export Specs'}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {exportOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={handleExportOpenApi}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-emerald-500" />
                            <div>
                              <div className="leading-tight">OpenAPI 3.1 Specification</div>
                              <span className="text-[10px] text-slate-400 font-normal">JSON / Swagger compatible</span>
                            </div>
                          </button>
                          <button
                            onClick={handleExportPostman}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                          >
                            <Download className="h-4 w-4 text-orange-500" />
                            <div>
                              <div className="leading-tight">Postman Collection v2.1</div>
                              <span className="text-[10px] text-slate-400 font-normal">Ready for 1-click import</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Endpoint Observability & Telemetry (Latency, Requests, Errors) */}
                <EndpointMetrics
                  key={`metrics-${selectedEndpoint.id}`}
                  endpoint={selectedEndpoint}
                />

                {/* AI Explanation Integrated */}
                <AIExplanation 
                  key={`explanation-${selectedEndpoint.id}`}
                  endpointId={selectedEndpoint.id} 
                  initialExplanation={selectedEndpoint.ai_explanation} 
                />

                {/* AI Security Auditor Integrated */}
                <AIAudit key={`audit-${selectedEndpoint.id}`} endpointId={selectedEndpoint.id} />

                {/* AI Refactoring Expert Integrated */}
                <AIRefactor key={`refactor-${selectedEndpoint.id}`} endpointId={selectedEndpoint.id} />

                {/* AI QA Test Generator Integrated */}
                <AITestCases key={`tests-${selectedEndpoint.id}`} endpointId={selectedEndpoint.id} />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  {/* Left Column: Schemas */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Database className="w-5 h-5 text-primary" /> Request Payload
                        </h3>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-tighter">Application/JSON</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-3xl p-8 relative shadow-premium group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <CodeIcon className="h-4 w-4 text-slate-300" />
                        </div>
                        {selectedEndpoint.request_schema ? (
                          <pre className="text-xs font-mono text-slate-700 overflow-x-auto leading-relaxed scrollbar-hide">
                            {JSON.stringify(selectedEndpoint.request_schema, null, 2)}
                          </pre>
                        ) : (
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-400 py-4 italic">
                            <Info className="h-5 w-5" /> No request payload required.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Server className="w-5 h-5 text-emerald-500" /> Response Template
                        </h3>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-tighter">200 OK</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-3xl p-8 relative shadow-premium group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <CodeIcon className="h-4 w-4 text-slate-300" />
                        </div>
                        {selectedEndpoint.response_schema ? (
                          <pre className="text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed scrollbar-hide">
                            {JSON.stringify(selectedEndpoint.response_schema, null, 2)}
                          </pre>
                        ) : (
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-400 py-4 italic">
                             No response schema detected.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Testing Console */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <Terminal className="w-6 h-6 text-primary" /> Technical Console
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-premium overflow-hidden">
                       <TestingConsole endpoint={selectedEndpoint} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : project?.status === 'scanning' ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto p-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                  <div className="relative p-8 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-premium">
                    <RefreshCw className="w-12 h-12 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900">Scanning Repository</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    RADIX is actively cloning and parsing API route declarations from <span className="font-mono font-semibold text-slate-700">{project?.name || 'repository'}</span>. Endpoints will automatically populate once discovery completes.
                  </p>
                </div>
              </div>
            ) : endpoints.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto p-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full" />
                  <div className="relative p-8 bg-amber-50 text-amber-600 rounded-full border border-amber-100 shadow-premium">
                    <CodeIcon className="w-12 h-12" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-black text-slate-900">No Endpoints Detected</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    No route definitions were discovered in this repository yet, or the previous scan was interrupted.
                  </p>
                  <button
                    onClick={handleRescan}
                    disabled={rescanning}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${rescanning ? 'animate-spin' : ''}`} />
                    <span>{rescanning ? 'Starting Scan...' : 'Re-scan Repository'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                   <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                   <div className="relative p-12 bg-white rounded-full border border-slate-100 shadow-premium">
                      <CodeIcon className="w-20 h-20 text-slate-200" />
                   </div>
                </div>
                <div className="text-center max-w-sm space-y-3">
                  <h2 className="text-2xl font-black text-slate-900">Select an Endpoint</h2>
                  <p className="text-slate-500 font-medium leading-relaxed">Choose an intelligence node from the sidebar to explore technical schemas and run automated tests.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ProjectDetails;
