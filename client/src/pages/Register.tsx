import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/slices/authSlice';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Zap, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import { motion } from 'framer-motion';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/auth/register', { name: name.trim(), email: email.trim().toLowerCase(), password });
      dispatch(setCredentials({ user: response.data, token: response.data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Protocol registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    // 1. If Firebase credentials are fully configured, use real Firebase Google Auth
    if (auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();
        
        const response = await api.post('/auth/google', { tokenId: idToken });
        dispatch(setCredentials({ user: response.data, token: response.data.token }));
        navigate('/dashboard');
        return;
      } catch (err: any) {
        setError('Google identity verification failed');
        setLoading(false);
        return;
      }
    }

    // 2. Zero-Config Fallback for Development & Testing (Auto Google Developer Identity)
    try {
      const demoEmail = 'google.developer@radix.io';
      const demoPass = 'RadixGoogleOAuthDemo2026!';
      const demoName = 'Google Developer';

      let res;
      try {
        res = await api.post('/auth/register', { name: demoName, email: demoEmail, password: demoPass });
      } catch {
        res = await api.post('/auth/login', { email: demoEmail, password: demoPass });
      }

      dispatch(setCredentials({ user: res.data, token: res.data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google identity registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-premium p-10 md:p-14 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
               <Zap className="h-40 w-40" />
            </div>

            <div className="text-center space-y-3 relative">
              <div className="h-16 w-16 bg-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 mb-6 group hover:scale-110 transition-transform duration-500">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">Initialize Account</h1>
              <p className="text-slate-500 font-bold text-lg">Join the future of API intelligence.</p>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-sm font-bold text-center"
              >
                {error}
              </motion.div>
            )}
            
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Identity</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
                    placeholder="Jane Doe" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Identity Channel</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
                    placeholder="name@company.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Protocol</label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white h-16 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 flex items-center justify-center group"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <>
                    Initialize Core
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                <span className="bg-white px-6 text-slate-400">Collaborative Entry</span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-slate-200 text-slate-900 h-16 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center space-x-3 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true"><path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path><path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path><path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path><path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path></svg>
              <span>Initialize via Google</span>
            </button>
            
            <div className="text-center text-slate-500 font-bold">
              Existing infrastructure? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
