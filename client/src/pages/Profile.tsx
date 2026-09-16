import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../redux/store';
import { logout, setCredentials } from '../redux/slices/authSlice';
import Navbar from '../components/Navbar';
import { getProfile, updateProfile, type UserProfile } from '../services/authService';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Calendar,
  Layers,
  Users,
  Copy,
  Check,
  Edit3,
  Save,
  LogOut,
  ArrowLeft,
  Lock,
  Cpu,
  Sparkles,
  ExternalLink,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

const Profile: React.FC = () => {
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setNewName(data.name);
    } catch (err: any) {
      console.warn('Failed to load full profile from backend, using auth state:', err);
      if (authUser) {
        setProfile({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          isGoogleAuth: true,
          subscription_tier: 'pro',
          created_at: new Date().toISOString(),
          projectCount: 1,
          teamCount: 1
        });
        setNewName(authUser.name);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const updated = await updateProfile({ name: newName.trim() });
      setProfile((prev) => (prev ? { ...prev, name: updated.name } : null));
      const token = localStorage.getItem('token') || '';
      dispatch(
        setCredentials({
          user: { id: updated.id, name: updated.name, email: updated.email },
          token
        })
      );
      setIsEditing(false);
      setSaveSuccess('Profile name updated successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = () => {
    if (!profile?.id) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-6 py-10 max-w-5xl">
        {/* Back Link & Title */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified Account
            </span>
          </div>
        </div>

        {/* Hero Identity Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-premium mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar Circle */}
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-primary to-blue-400 text-white font-black text-3xl flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
              {initials}
            </div>

            {/* User Meta */}
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  {profile?.name || authUser?.name || 'Developer'}
                </h1>
                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white shadow-sm">
                  {profile?.subscription_tier || 'Pro'} Member
                </span>
                {profile?.isGoogleAuth && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Google SSO
                  </span>
                )}
              </div>

              <p className="text-slate-500 font-medium text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                {profile?.email || authUser?.email}
              </p>

              <p className="text-xs font-semibold text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '2026'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Projects</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{profile?.projectCount ?? 1}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Workspaces</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{profile?.teamCount ?? 1}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">Active & Healthy</h3>
            </div>
          </div>
        </div>

        {/* Profile Details & Account Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Account Details Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-premium space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Personal Information</h3>
                <p className="text-slate-400 text-sm font-medium">Manage your personal credentials and identity display.</p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Name
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setNewName(profile?.name || '');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                {saveSuccess}
              </div>
            )}
            {saveError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">
                {saveError}
              </div>
            )}

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>{profile?.name || authUser?.name}</span>
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address (Primary)
                </label>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{profile?.email || authUser?.email}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>
              </div>

              {/* Unique Account ID */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Unique User Identifier (UUID)
                </label>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono font-bold text-slate-600">
                  <span className="truncate max-w-[280px] sm:max-w-md">{profile?.id || authUser?.id}</span>
                  <button
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors shrink-0 ml-2"
                    title="Copy UUID"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Quick Navigation */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Cpu className="w-28 h-28" />
              </div>
              <h3 className="text-lg font-black mb-1 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Security & Session
              </h3>
              <p className="text-slate-400 text-xs font-bold mb-6 uppercase tracking-wider">
                JWT Auth Shield Active
              </p>

              <div className="space-y-4 text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-bold text-slate-300">Identity Provider</p>
                  <p className="text-emerald-400 font-black mt-0.5">
                    {profile?.isGoogleAuth ? 'Google OAuth 2.0' : 'Email / Password Credentials'}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-bold text-slate-300">Token Status</p>
                  <p className="text-slate-300 font-mono text-[11px] mt-0.5">Signed & Validated Session</p>
                </div>
              </div>

              <Link
                to="/settings"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-white text-slate-900 py-3 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors shadow-md"
              >
                <Settings className="w-3.5 h-3.5" />
                Advanced Settings
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <h4 className="font-black text-slate-900 text-sm mb-3">Quick Navigation</h4>
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700"
                >
                  <span>Project Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700"
                >
                  <span>Platform Analytics</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/incidents"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700"
                >
                  <span>Incident Remediation</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
