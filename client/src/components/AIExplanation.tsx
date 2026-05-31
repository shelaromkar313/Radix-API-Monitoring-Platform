import { useState } from 'react';
import { Brain, Code, Lightbulb, Loader2, BookOpen, Info, RefreshCw, CheckCircle2, Zap, Braces } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { explainEndpoint } from '../services/aiService';
import { useDispatch } from 'react-redux';
import { setAiExplanation } from '../redux/slices/endpointSlice';


interface AIExplanationProps {
  endpointId: string;
  initialExplanation?: any;
}

const AIExplanation = ({ endpointId, initialExplanation }: AIExplanationProps) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<any>(initialExplanation);
  const dispatch = useDispatch();

  const handleExplain = async () => {
    setLoading(true);
    try {
      const result = await explainEndpoint(endpointId);
      setExplanation(result);
      dispatch(setAiExplanation({ endpointId, explanation: result }));
    } catch (err) {
      console.error('Failed to get AI explanation', err);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-premium relative group overflow-hidden">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900 leading-tight">Smart API Documentation</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">Llama 3.3 70B Auto-Gen</p>
          </div>
        </div>
        
        <button
          onClick={handleExplain}
          disabled={loading}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all disabled:opacity-50 shadow-lg active:scale-95 ${
            explanation 
              ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-none' 
              : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : explanation ? <RefreshCw className="h-4 w-4 mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
          {loading ? 'Generating Docs...' : explanation ? 'Regenerate Docs' : 'Generate Smart Docs'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 py-12 flex flex-col items-center justify-center text-center"
          >
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <div className="space-y-2 max-w-xs">
              <h4 className="font-bold text-slate-900">Decoding API Patterns...</h4>
              <p className="text-sm text-slate-400 font-medium">Inferring schemas and generating technical documentation.</p>
            </div>
          </motion.div>
        ) : explanation ? (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Context Header */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
               <span className="text-xs font-black px-3 py-1 bg-slate-900 text-white rounded-lg tracking-wider">{explanation.method}</span>
               <span className="text-sm font-bold text-slate-600 font-mono tracking-tight">{explanation.endpoint}</span>
            </motion.div>

            {/* Description Section */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Info className="h-4 w-4" />
                <h4 className="text-[12px] font-black uppercase tracking-widest">Logic Description</h4>
              </div>
              <p className="text-slate-700 font-bold text-lg leading-snug">
                {explanation.description}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Inferred Request */}
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Code className="h-4 w-4" />
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Inferred Request Config</h4>
                  </div>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <pre className="text-xs font-mono text-slate-600 overflow-x-auto">
                    {JSON.stringify(explanation.request, null, 2)}
                  </pre>
                </div>
              </motion.div>

              {/* Inferred Response */}
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <h4 className="text-[12px] font-black uppercase tracking-widest">Inferred Response Tree</h4>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <pre className="text-xs font-mono text-slate-600 overflow-x-auto">
                    {JSON.stringify(explanation.response, null, 2)}
                  </pre>
                </div>
              </motion.div>
            </div>

            {/* Examples Section */}
            <motion.div variants={itemVariants} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-slate-200">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Example Request (cURL setup)</h4>
                  </div>
                   <div className="bg-black/50 p-4 rounded-xl">
                      <pre className="text-xs font-mono text-emerald-400 overflow-x-auto italic">
                        {typeof explanation.example_request === 'string' 
                            ? explanation.example_request 
                            : JSON.stringify(explanation.example_request, null, 2)}
                      </pre>
                   </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Braces className="h-4 w-4" />
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Example Response Output</h4>
                  </div>
                   <div className="bg-black/50 p-4 rounded-xl">
                      <pre className="text-xs font-mono text-blue-300 overflow-x-auto italic">
                         {typeof explanation.example_response === 'string' 
                            ? explanation.example_response 
                            : JSON.stringify(explanation.example_response, null, 2)}
                      </pre>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30 flex flex-col items-center justify-center text-center space-y-4"
          >
            <BookOpen className="h-12 w-12 text-slate-200" />
            <div className="max-w-xs space-y-1">
              <h4 className="font-bold text-slate-900">Intelligence Node Ready</h4>
              <p className="text-sm text-slate-400 font-medium">
                Initiate a deep crawl of this endpoint to unlock AI-powered logic summaries.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIExplanation;
