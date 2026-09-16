import { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Loader2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auditEndpoint } from '../services/aiService';

interface AIAuditProps {
  endpointId: string;
}

const AIAudit = ({ endpointId }: AIAuditProps) => {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditEndpoint(endpointId);
      setAudit(result);
    } catch (err: any) {
      console.error('Failed to run AI audit', err);
      setError(err.response?.data?.message || err.message || 'Audit engine connection error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (score >= 5) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-500 bg-rose-50 border-rose-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return <ShieldCheck className="h-6 w-6 text-emerald-500" />;
    if (score >= 5) return <Shield className="h-6 w-6 text-amber-500" />;
    return <ShieldAlert className="h-6 w-6 text-rose-500" />;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-premium relative group overflow-hidden">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900 leading-tight">Security Auditor</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">Deep Architecture Scan</p>
          </div>
        </div>
        
        <button
          onClick={handleAudit}
          disabled={loading}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all disabled:opacity-50 shadow-lg active:scale-95 ${
            audit 
              ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-none' 
              : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20'
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : audit ? <RefreshCw className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
          {loading ? 'Scanning...' : audit ? 'Rescan Endpoint' : 'Run Security Audit'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={handleAudit} className="text-xs font-bold underline hover:no-underline ml-4">Retry</button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 py-12 flex flex-col items-center justify-center text-center"
          >
            <Loader2 className="h-10 w-10 text-rose-500 animate-spin mb-4" />
            <div className="space-y-2 max-w-xs">
              <h4 className="font-bold text-slate-900">Analyzing Vulnerabilities...</h4>
              <p className="text-sm text-slate-400 font-medium">Checking auth, validation, and exposure risks.</p>
            </div>
          </motion.div>
        ) : audit ? (
          <motion.div key="auditContent" variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            
            {/* Score Section */}
            <motion.div variants={itemVariants} className={`flex items-center gap-6 p-6 rounded-2xl border ${getScoreColor(audit.security_score)}`}>
              <div className="p-4 bg-white rounded-full shadow-sm">
                {getScoreIcon(audit.security_score)}
              </div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-widest opacity-80 mb-1">Security Score</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{audit.security_score}</span>
                  <span className="text-sm font-bold opacity-60">/ 10</span>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Issues */}
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                  <h4 className="font-bold text-slate-900">Detected Issues</h4>
                </div>
                <div className="space-y-3">
                  {audit.issues?.length > 0 ? (
                    audit.issues.map((issue: string, idx: number) => (
                      <div key={idx} className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{issue}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-sm text-emerald-700 font-medium">No direct issues detected.</div>
                  )}
                </div>
              </motion.div>

              {/* Suggestions */}
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                  <h4 className="font-bold text-slate-900">Actionable Suggestions</h4>
                </div>
                <div className="space-y-3">
                  {audit.suggestions?.length > 0 ? (
                    audit.suggestions.map((suggestion: string, idx: number) => (
                      <div key={idx} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{suggestion}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-500">No suggestions available.</div>
                  )}
                </div>
              </motion.div>
            </div>

          </motion.div>
        ) : (
          <motion.div
            key="emptyState"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30 flex flex-col items-center justify-center text-center space-y-4"
          >
            <ShieldAlert className="h-12 w-12 text-slate-200" />
            <div className="max-w-xs space-y-1">
              <h4 className="font-bold text-slate-900">Auditor Ready</h4>
              <p className="text-sm text-slate-400 font-medium">
                Initiate a security scan to identify missing auth, validation errors, and vulnerabilities.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAudit;
