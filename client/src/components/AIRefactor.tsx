import { useState } from 'react';
import { Settings, Wrench, Loader2, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { refactorEndpoint } from '../services/aiService';

interface AIRefactorProps {
  endpointId: string;
}

const AIRefactor = ({ endpointId }: AIRefactorProps) => {
  const [loading, setLoading] = useState(false);
  const [refactor, setRefactor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefactor = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await refactorEndpoint(endpointId);
      setRefactor(result);
    } catch (err: any) {
      console.error('Failed to run AI refactoring suggestions', err);
      setError(err.response?.data?.message || err.message || 'Optimization engine unavailable. Please retry.');
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

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-premium relative group overflow-hidden mt-10">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900 leading-tight">Code Optimization & Refactoring</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">NVIDIA NIM Modernizer</p>
          </div>
        </div>
        
        <button
          onClick={handleRefactor}
          disabled={loading}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all disabled:opacity-50 shadow-lg active:scale-95 ${
            refactor 
              ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-none' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : refactor ? <RefreshCw className="h-4 w-4 mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
          {loading ? 'Analyzing Structure...' : refactor ? 'Regenerate Suggestions' : 'Get Refactoring Ideas'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={handleRefactor} className="text-xs font-bold underline hover:no-underline ml-4">Retry</button>
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
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <div className="space-y-2 max-w-xs">
              <h4 className="font-bold text-slate-900">Evaluating Architecture...</h4>
              <p className="text-sm text-slate-400 font-medium">Analyzing maintainability, robust patterns, and scalable design.</p>
            </div>
          </motion.div>
        ) : refactor ? (
          <motion.div key="refactorContent" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            
            <motion.div variants={itemVariants} className="flex items-center gap-2 text-indigo-600 mb-2">
              <TrendingUp className="h-5 w-5" />
              <h4 className="font-bold text-slate-900">Key Improvements</h4>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {refactor.improvements?.length > 0 ? (
                refactor.improvements.map((improvement: any, idx: number) => {
                  const content = typeof improvement === 'string' 
                    ? improvement 
                    : (improvement?.description || improvement?.action || improvement?.suggestion || JSON.stringify(improvement));
                  
                  return (
                    <motion.div key={idx} variants={itemVariants} className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex items-start gap-4 hover:bg-indigo-50/80 transition-colors">
                      <div className="p-2 bg-indigo-100 rounded-xl flex-shrink-0 mt-0.5">
                         <Zap className="h-4 w-4 text-indigo-600" />
                      </div>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed pt-1">{content}</p>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full bg-slate-50 p-6 text-center rounded-2xl border border-slate-100 text-sm font-medium text-slate-500">
                  Code structure looks incredibly solid. No major architectural improvements suggested at this time.
                </div>
              )}
            </div>

          </motion.div>
        ) : (
          <motion.div
            key="emptyState"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30 flex flex-col items-center justify-center text-center space-y-4"
          >
            <Wrench className="h-12 w-12 text-slate-200" />
            <div className="max-w-xs space-y-1">
              <h4 className="font-bold text-slate-900">Optimization Engine Ready</h4>
              <p className="text-sm text-slate-400 font-medium">
                Initiate a deep structural scan to receive performance and maintainability upgrades.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIRefactor;
