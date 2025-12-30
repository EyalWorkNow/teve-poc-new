
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff, Check, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center p-4 font-sans text-slate-200">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        
        {/* LOGO */}
        <div className="mb-8 flex flex-col items-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
                <rect x="10.5" y="2" width="3" height="20" rx="1.5" fill="#05DF9C" />
                <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(45 12 12)" fill="#05DF9C" />
                <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(90 12 12)" fill="#05DF9C" />
                <rect x="10.5" y="2" width="3" height="20" rx="1.5" transform="rotate(135 12 12)" fill="#05DF9C" />
            </svg>
            <span className="text-3xl font-black text-white tracking-tight">TEVEL</span>
        </div>

        {/* HEADINGS (ENGLISH) */}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight text-center">
          {isRegistering ? 'Create Account' : 'System Login'}
        </h1>
        <p className="text-slate-400 text-sm mb-8 text-center">
          {isRegistering ? 'Create a new account to get started' : 'Enter your credentials to access'}
        </p>

        {/* DIVIDER */}
        <div className="w-full flex items-center gap-4 mb-8">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-slate-600 text-xs font-mono lowercase">or</span>
            <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        {/* FORM */}
        <form onSubmit={handleAuth} className="w-full space-y-5">
            
            {/* EMAIL */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-200 block">Email</label>
                <input 
                    type="email" 
                    required
                    placeholder="mail@simmmple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121212] border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#05DF9C] transition-colors"
                />
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-200 block">Password<span className="text-[#05DF9C]">*</span></label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#121212] border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#05DF9C] transition-colors pr-10"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* ACTIONS ROW */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setKeepLoggedIn(!keepLoggedIn)}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${keepLoggedIn ? 'bg-[#05DF9C] border-[#05DF9C]' : 'bg-transparent border-slate-600'}`}>
                        {keepLoggedIn && <Check size={14} className="text-black" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-slate-300 select-none">Keep me logged in</span>
                </div>
                <button type="button" className="text-sm text-[#05DF9C] hover:text-[#04b882] font-medium transition-colors">
                    Forgot password?
                </button>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <div className="text-rose-500 text-xs font-bold text-center bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
                    {error}
                </div>
            )}

            {/* SUBMIT BUTTON */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#05DF9C] hover:bg-[#04c48a] text-black font-bold text-sm py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(5,223,156,0.15)] hover:shadow-[0_0_30px_rgba(5,223,156,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>

        </form>

        {/* FOOTER TOGGLE */}
        <div className="mt-8 text-sm text-slate-400">
            {isRegistering ? 'Already have an account?' : 'Not registered yet?'}{' '}
            <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
                className="text-white font-bold hover:text-[#05DF9C] transition-colors"
            >
                {isRegistering ? 'Sign In' : 'Create an Account'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
