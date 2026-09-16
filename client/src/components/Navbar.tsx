import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../redux/store';
import { logout } from '../redux/slices/authSlice';
import { LogOut, User as UserIcon, Settings, Bell, Zap } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <nav className="glass-nav relative">
      <div className="container flex h-16 items-center mx-auto px-6 max-w-7xl justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-primary transition-all shadow-lg shadow-slate-200">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black font-sans tracking-tight text-slate-900 italic uppercase">RA<span className="text-primary not-italic">DIX</span></span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">
                Dashboard
              </Link>
              <Link to="/incidents" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors tracking-wide flex items-center gap-1.5">
                Incidents
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              </Link>
              <Link to="/teams" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">
                Teams
              </Link>
              <Link to="/analytics" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">
                Analytics
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                <Bell className="h-5 w-5" />
              </button>
              <Link to="/settings" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                <Settings className="h-5 w-5" />
              </Link>
              
              <div className="h-8 w-px bg-slate-200 mx-2" />
              
              <div className="flex items-center space-x-4 pl-2">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all group active:scale-95 shadow-sm"
                  title="View Your Profile"
                >
                  <div className="h-6 w-6 rounded-lg bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors">
                    <UserIcon className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{user?.name}</span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-200"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
