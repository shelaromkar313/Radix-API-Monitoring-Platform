import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowRight, Code, Database, Layers, Zap, Globe, Cpu, Sparkles, Layout } from 'lucide-react';

const LandingPage = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white selection:bg-primary selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full animate-pulse-subtle" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 blur-[120px] rounded-full animate-pulse-subtle" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10"
          >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">The Intelligence-First RADIX Platform</span>

            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 leading-[0.95] max-w-5xl mx-auto italic uppercase">
              Reverse Engineer <br />
              <span className="text-primary not-italic">Infrastructure</span> Logic.
            </h1>

            <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Instantly convert backend repositories into clean documentation, intelligence diagrams, and AI-powered diagnostic consoles.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Link to="/register" className="w-full sm:w-auto bg-slate-900 text-white h-16 px-10 rounded-2xl text-lg font-black inline-flex items-center justify-center transition-all hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 active:scale-95 group">
                Begin Deployment <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto bg-white border border-slate-200 text-slate-900 h-16 px-10 rounded-2xl text-lg font-black inline-flex items-center justify-center transition-all hover:bg-slate-50 shadow-sm active:scale-95">
                Developer Console
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="py-20 border-y border-slate-100 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-center mb-12">Integrated with the Modern Stack</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {['GitHub', 'NVIDIA', 'Stripe', 'Redis', 'PostgreSQL', 'Docker'].map(logo => (
              <span key={logo} className="text-2xl font-black italic tracking-tighter text-slate-900">{logo}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 italic uppercase">Autonomous Analysis</h2>
            <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">Skip the manual onboarding. RADIX connects directly to your source.</p>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { title: 'Source Cloning', desc: 'Securely pull repositories from GitHub with one click.', icon: Database, color: 'bg-blue-50 text-blue-600' },
              { title: 'AST Scanning', desc: 'Deep parsing of Node.js logic to identify every endpoint.', icon: Code, color: 'bg-emerald-50 text-emerald-600' },
              { title: 'Schema Intelligence', desc: 'Auto-generate request and response types via static analysis.', icon: Layers, color: 'bg-violet-50 text-violet-600' },
              { title: 'NVIDIA NIM Feedback', desc: 'AI-driven suggestions for route optimization and security.', icon: Cpu, color: 'bg-amber-50 text-amber-600' },
              { title: 'Mock Ecosystem', desc: 'Instant virtual sandbox for internal testing and review.', icon: Layout, color: 'bg-rose-50 text-rose-600' },
              { title: 'Global Observability', desc: 'Real-time telemetry and error tracking for all projects.', icon: Globe, color: 'bg-cyan-50 text-cyan-600' }
            ].map((f, i) => (
              <motion.div
                variants={item}
                key={i}
                className="p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-primary/20 hover:shadow-premium transition-all group"
              >
                <div className={`p-4 rounded-2xl w-fit ${f.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-24 opacity-10 pointer-events-none">
          <Sparkles className="h-64 w-64 text-primary animate-pulse" />
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight italic uppercase mb-8 leading-none">
            Powered by <br />
            <span className="text-primary not-italic">NVIDIA Intelligence</span>
          </h2>
          <p className="text-slate-400 text-xl font-medium max-w-2xl mb-12">
            Our underlying LLM service uses NVIDIA NIM to provide sub-millisecond route diagnostics and security vulnerability detection.
          </p>
          <div className="w-full max-w-4xl p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Latency Reduction', val: '45%' },
                { label: 'Security Score', val: 'A+' },
                { label: 'Global Uptime', val: '99.99%' }
              ].map(stat => (
                <div key={stat.label} className="space-y-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{stat.label}</p>
                  <p className="text-4xl font-black italic">{stat.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase italic">Better by Design</h2>
            <p className="text-slate-500 text-lg font-medium">Why developers are switching to the RADIX intelligence platform.</p>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-premium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-8 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ecosystem Feature</th>
                  <th className="p-8 font-black text-slate-900 uppercase italic text-sm">Legacy Tools</th>
                  <th className="p-8 font-black text-primary uppercase italic text-sm bg-primary/5">RADIX Intelligence</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold">
                {[
                  { f: 'Documentation Strategy', old: 'Manual (Swagger)', new: 'Auto AST Generation' },
                  { f: 'Infrastructure Sync', old: 'Polling (Stale)', new: 'Real-time Deployment' },
                  { f: 'Vulnerability Scanning', old: 'Add-on ($$$)', new: 'Native AI Pipeline' },
                  { f: 'Team Intelligence', old: 'Isolated Projects', new: 'Collaborative Sandbox' },
                  { f: 'Integration Speed', old: 'Hours/Days', new: 'Under 120 Seconds' }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-8 text-slate-900">{row.f}</td>
                    <td className="p-8 text-slate-400">{row.old}</td>
                    <td className="p-8 text-primary bg-primary/5">{row.new}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-slate-50 border-t border-slate-100 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 uppercase italic">Start Building</h2>
          <p className="text-slate-500 text-xl font-medium">Join 2,400+ developers engineering the future of infrastructure intelligence.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="w-full sm:w-auto bg-primary text-white h-16 px-12 rounded-2xl font-black text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95">
              Create Free Protocol
            </Link>
            <div className="flex items-center gap-4 text-slate-400 font-bold">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-8 w-8 rounded-full border-2 border-white bg-slate-${i * 100 + 100}`} />
                ))}
              </div>
              <span className="text-xs uppercase tracking-widest">+2.4k users</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-black italic text-slate-900 tracking-tighter uppercase">RADIX Platform</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            &copy; 2026 THE INTELLIGENCE GROUP. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#" className="hover:text-primary transition-colors">Security</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">SLA</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;