import React, { useState } from 'react';
import { useMedha } from '../context/MedhaContext';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { supabase } from '../lib/supabase';
import {
  saveDB,
  loadDB,
  createBlankDB,
  registerNewUser,
  findRegisteredUser,
  isDemoAccount,
  seedDB,
} from '../services/storage';
import { syncAllPatientDataToSupabase } from '../services/supabase/patientDataSync';
import { MedhaLogo } from './common/MedhaLogo';
import { isDemoRoute } from '../lib/appMode';

export const LoginScreen: React.FC = () => {
  const { db, login } = useMedha();
  const demoMode = isDemoRoute();
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'magiclink'>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('tmraju2349@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState('T.M. Raju');
  const [googleRoleChoice, setGoogleRoleChoice] = useState<'patient' | 'caregiver'>('caregiver');
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  const handleRegister = async (u: string, e: string, p: string, targetRole: 'patient' | 'caregiver') => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const uClean = u.trim().toLowerCase();
    const eClean = e.trim().toLowerCase();
    const pass = p.trim();
    if (demoMode) {
      if (isDemoAccount(uClean) || isDemoAccount(eClean)) {
        setErrorMsg('Demo accounts are available from the demo access buttons below.');
        setLoading(false);
        return;
      }
      const blankDb = createBlankDB(uClean, eClean, targetRole, pass);
      registerNewUser(uClean, eClean, pass, targetRole);
      saveDB(blankDb, uClean);
      sessionStorage.setItem('smriti_session', targetRole);
      sessionStorage.setItem('smriti_username', uClean);
      login(targetRole, uClean, blankDb);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setErrorMsg('Email authentication is not configured. Please add the Supabase connection first.');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: eClean,
        password: pass,
        options: { data: { role: targetRole, username: uClean, full_name: u.trim() } },
      });
      if (error) throw error;
      if (data.session) {
        setSuccessMsg('Account created. Opening MEDHA…');
      } else {
        setSuccessMsg('Account created. Check your email to confirm your account, then sign in.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not create the account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (identifier: string, p: string, targetRole: 'patient' | 'caregiver') => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const idClean = identifier.trim().toLowerCase();
    const pass = p.trim();
    if (demoMode) {
      const isDemo = isDemoAccount(idClean);
      if (isDemo && (pass === '123456' || pass === '1234' || !pass)) {
        sessionStorage.setItem('smriti_session', targetRole);
        sessionStorage.setItem('smriti_username', idClean);
        login(targetRole, idClean, loadDB(idClean));
        setLoading(false);
        return;
      }
      const registeredUser = findRegisteredUser(idClean);
      if (registeredUser && registeredUser.password === pass) {
        const effectiveRole = registeredUser.role || targetRole;
        sessionStorage.setItem('smriti_session', effectiveRole);
        sessionStorage.setItem('smriti_username', registeredUser.username);
        login(effectiveRole, registeredUser.username, loadDB(registeredUser.username));
        setLoading(false);
        return;
      }
      setErrorMsg('Use one of the demo accounts shown below.');
      setLoading(false);
      return;
    }
    if (!supabase) {
      setErrorMsg('Email authentication is not configured. Please add the Supabase connection first.');
      setLoading(false);
      return;
    }
    if (!idClean.includes('@')) {
      setErrorMsg('Use the email address linked to your MEDHA account.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: idClean, password: pass });
    if (error || !data.user) {
      setErrorMsg(error?.message || 'Email or password is incorrect.');
      setLoading(false);
      return;
    }
    setSuccessMsg('Signed in successfully. Opening MEDHA…');
    setLoading(false);
  };

  const handleDemoFill = async (u: string, p: string, targetRole: 'patient' | 'caregiver' = 'patient') => {
    if (!demoMode) {
      window.location.assign('/demo');
      return;
    }
    setAuthMode('signin');
    setUsername(u);
    setPassword(p);
    setRole(targetRole);
    await handleSignIn(u, p, targetRole);
  };

  const handleMagicLink = async () => {
    if (demoMode) {
      setErrorMsg('Email links are available on the main sign-in route. Use a demo account here.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Email authentication is not configured. Please add the Supabase connection first.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setSuccessMsg('Magic link sent. Check your email to sign in.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send the magic link.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'magiclink') {
      handleMagicLink();
      return;
    }
    if (authMode === 'register') {
      if (!username.trim()) {
        setErrorMsg('Please enter a username.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!password.trim() || password.trim().length < 4) {
        setErrorMsg('Please enter a password with at least 4 characters.');
        return;
      }
      handleRegister(username.trim(), email.trim(), password.trim(), role);
    } else {
      if (!username.trim() || !password.trim()) {
        setErrorMsg('Please enter your username/email and password.');
        return;
      }
      handleSignIn(username.trim(), password.trim(), role);
    }
  };

  const handleGoogleAuth = async () => {
    if (demoMode) {
      setErrorMsg('Google sign-in is available on the main route. Use a demo account here.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Google sign-in is not configured. Please add the Supabase connection first.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMsg(error.message || 'Google sign-in could not be started.');
      setLoading(false);
      return;
    }
    if (!data.url) {
      setErrorMsg('Google sign-in is not enabled for this application.');
      setLoading(false);
    }
  };

  const handleInstantGoogleLogin = async () => {
    setErrorMsg('Use the Google button to authenticate with your real Google account.');
  };

  return (
    <section id="loginScreen" className="min-h-screen flex">
      {/* Left art panel */}
      <div
        className="hidden lg:flex w-[46%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#074236,#0E7C66 55%,#12907A)' }}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice">
          <circle cx="120" cy="120" r="60" fill="#E3A63B" opacity=".9" />
          <circle cx="120" cy="120" r="90" fill="none" stroke="#E3A63B" strokeWidth="2" opacity=".4" />
          <path d="M-20 560 Q120 470 260 560 T540 560 V800 H-20 Z" fill="#0A5C4C" />
          <path d="M-20 620 Q130 540 280 620 T560 620 V800 H-20 Z" fill="#0E7C66" />
          <path d="M40 700 h420" stroke="#12907A" strokeWidth="3" strokeDasharray="4 18" opacity=".6" />
          <path d="M60 730 h380" stroke="#12907A" strokeWidth="3" strokeDasharray="4 18" opacity=".4" />
          <path d="M100 760 h300" stroke="#12907A" strokeWidth="3" strokeDasharray="4 18" opacity=".3" />
          {/* rhino silhouette */}
          <path
            d="M150 545 q-18 8 -22 30 q-2 14 8 22 q14 10 44 10 h120 q30 0 40 -16 q6 -10 -2 -18 q-10 -10 -34 -12 q-6 -22 -30 -28 q-26 -7 -48 4 q-16 8 -22 22 q-26 2 -40 0 q-10 -10 -14 -14 z"
            fill="#074236"
            opacity=".95"
          />
          <path
            d="M170 540 l8 -14 l6 14 M196 536 l7 -12 l7 12"
            stroke="#074236"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          {/* river */}
          <path
            d="M-20 480 C140 440 320 520 520 470"
            stroke="#9AD7C8"
            strokeWidth="26"
            fill="none"
            opacity=".35"
            strokeLinecap="round"
          />
          {/* orchids */}
          <g fontSize="26">
            <text x="60" y="240">🌺</text>
            <text x="420" y="200">🪷</text>
            <text x="380" y="640" fontSize="30">🍵</text>
            <text x="70" y="420">🍃</text>
          </g>
        </svg>
        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          <div>
            <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 inline-block shadow-lg">
              <MedhaLogo variant="full" size="md" theme="on-dark" />
            </div>
            <p className="text-xs tracking-widest uppercase text-white/70 mt-3 font-semibold">স্মৃতি • Memory Care</p>
          </div>
          <div>
            <h1 className="font-display text-5xl font-bold leading-tight">
              Every memory<br />
              deserves a<br />
              <span className="text-[#F2C063] italic">second spring.</span>
            </h1>
            <p className="mt-5 text-white/80 max-w-sm text-sm leading-relaxed">
              An AI companion for elders of the North East — adaptive brain games, a listening diary, a living memory book, and a guardian that never sleeps.
            </p>
            <div className="mt-6 flex gap-2 flex-wrap text-[11px] font-semibold">
              <span className="px-3 py-1.5 rounded-full bg-white/12 border border-white/20">🎙 Voice in 4 languages</span>
              <span className="px-3 py-1.5 rounded-full bg-white/12 border border-white/20">📶 Works offline</span>
              <span className="px-3 py-1.5 rounded-full bg-white/12 border border-white/20">🛡 Geo-safe SOS</span>
            </div>
          </div>
          <p className="text-white/50 text-xs">Made with ❤️ for the hills & valleys of NER • Demo build</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md pop">
          <div className="lg:hidden flex items-center justify-center mb-8 pb-4 border-b border-[#E8E1D5]">
            <MedhaLogo variant="full" size="sm" theme="light" />
          </div>
          <h2 className="font-display text-3xl font-bold ink">
            {authMode === 'register' ? 'Create Account' : authMode === 'magiclink' ? 'Magic Link' : 'Welcome back'}
          </h2>
          <p className="muted mt-1 text-sm">
            {authMode === 'register' ? 'Register to start caring.' : authMode === 'magiclink' ? 'Sign in via email link without a password.' : 'Sign in to continue caring.'}
          </p>
          
          <div className="flex gap-4 mt-6 border-b border-[#E8E1D5]">
            <button 
              type="button"
              className={`pb-2 text-sm font-bold uppercase tracking-wider ${authMode === 'signin' ? 'text-[#0E7C66] border-b-2 border-[#0E7C66]' : 'muted'}`}
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`pb-2 text-sm font-bold uppercase tracking-wider ${authMode === 'register' ? 'text-[#0E7C66] border-b-2 border-[#0E7C66]' : 'muted'}`}
              onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Register
            </button>
            <button 
              type="button"
              className={`pb-2 text-sm font-bold uppercase tracking-wider ${authMode === 'magiclink' ? 'text-[#0E7C66] border-b-2 border-[#0E7C66]' : 'muted'}`}
              onClick={() => { setAuthMode('magiclink'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Email Link
            </button>
          </div>

          <form id="loginForm" onSubmit={onSubmit} className="mt-6 space-y-4">
            {authMode === 'register' ? (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider muted">Username</label>
                  <input
                    id="registerUsername"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 bg-white text-base font-medium"
                    style={{ borderColor: 'var(--line)' }}
                    placeholder="Choose a username (e.g. rahul_sharma)"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider muted">Email Address</label>
                  <input
                    id="registerEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 bg-white text-base font-medium"
                    style={{ borderColor: 'var(--line)' }}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider muted">Password</label>
                  <div className="relative mt-1.5">
                    <input
                      id="registerPass"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 bg-white text-base font-medium"
                      style={{ borderColor: 'var(--line)' }}
                      placeholder="Create a password (min 4 characters)"
                      required
                    />
                    <button
                      type="button"
                      id="toggleRegisterPass"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 muted text-lg cursor-pointer"
                      aria-label="Show password"
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </>
            ) : authMode === 'magiclink' ? (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider muted">Email Address</label>
                  <input
                    id="magiclinkEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 bg-white text-base font-medium"
                    style={{ borderColor: 'var(--line)' }}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider muted">Username or Email</label>
                  <input
                    id="loginUser"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 bg-white text-base font-medium"
                    style={{ borderColor: 'var(--line)' }}
                    placeholder="Username or email address"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider muted">Password</label>
                  <div className="relative mt-1.5">
                    <input
                      id="loginPass"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 bg-white text-base font-medium"
                      style={{ borderColor: 'var(--line)' }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      id="toggleLoginPass"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 muted text-lg cursor-pointer"
                      aria-label="Show password"
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider muted">Account Role</label>
                <span className="text-[11px] text-[#0E7C66] font-semibold">Select access mode</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-1">
                <button
                  type="button"
                  id="rolePatientBtn"
                  onClick={() => setRole('patient')}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 transition cursor-pointer ${
                    role === 'patient'
                      ? 'bg-[#0E7C66] text-white border-[#0E7C66] shadow-sm'
                      : 'bg-white border-[#E8E1D5] text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">👴</span>
                  <span className="font-bold text-xs mt-0.5">Loved One Mode</span>
                  <span className={`text-[10px] ${role === 'patient' ? 'text-emerald-100' : 'text-gray-400'}`}>Companion View</span>
                </button>
                <button
                  type="button"
                  id="roleCaregiverBtn"
                  onClick={() => setRole('caregiver')}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 transition cursor-pointer ${
                    role === 'caregiver'
                      ? 'bg-[#0E7C66] text-white border-[#0E7C66] shadow-sm'
                      : 'bg-white border-[#E8E1D5] text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">👩‍⚕️</span>
                  <span className="font-bold text-xs mt-0.5">Care Circle</span>
                  <span className={`text-[10px] ${role === 'caregiver' ? 'text-emerald-100' : 'text-gray-400'}`}>Guardian Hub</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <p id="loginErr" className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-sm font-semibold text-[#0E7C66]">
                {successMsg}
              </p>
            )}
            <button
              type="submit"
              id="authSubmitBtn"
              disabled={loading}
              className="btn-p w-full py-4 text-base font-bold disabled:opacity-50 mt-2 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                'Processing...'
              ) : authMode === 'register' ? (
                'Create Account & Open MEDHA →'
              ) : authMode === 'magiclink' ? (
                'Send Magic Link 📧'
              ) : (
                'Sign In to MEDHA →'
              )}
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[#E8E1D5]"></div>
              <span className="flex-shrink-0 mx-4 text-xs muted font-semibold uppercase tracking-wider">OR</span>
              <div className="flex-grow border-t border-[#E8E1D5]"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 text-lg font-semibold bg-white border-2 border-[#E8E1D5] rounded-xl text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="mt-6 card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider muted">One-Click Quick Login</p>
                <p className="text-[11px] text-gray-500">Instant access · Runs on live sensors & real data</p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#0E7C66] border border-emerald-200">
                {supabase ? 'Supabase Sync Ready' : 'Local + Real Sensors'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="demoPatientBtn"
                disabled={loading}
                className="demo-fill chip py-3 px-3 text-sm bg-white text-center hover:bg-[#F6F9F7] border border-[#E8E1D5] rounded-xl flex flex-col items-center justify-center transition hover:border-[#0E7C66] shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
                onClick={() => handleDemoFill('patient', '123456', 'patient')}
              >
                <span className="text-2xl block mb-1">👴</span>
                <span className="font-bold ink text-sm">Biren Saikia</span>
                <span className="text-[11px] text-[#0E7C66] font-semibold">Demo Loved One / Elder</span>
                <span className="muted text-[11px] mt-1 font-mono">patient / 123456</span>
              </button>

              <button
                type="button"
                id="demoCaregiverBtn"
                disabled={loading}
                className="demo-fill chip py-3 px-3 text-sm bg-white text-center hover:bg-[#F6F9F7] border border-[#E8E1D5] rounded-xl flex flex-col items-center justify-center transition hover:border-[#0E7C66] shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
                onClick={() => handleDemoFill('caregiver', '123456', 'caregiver')}
              >
                <span className="text-2xl block mb-1">👩‍⚕️</span>
                <span className="font-bold ink text-sm">Pooja Saikia</span>
                <span className="text-[11px] text-[#0E7C66] font-semibold">Demo Care Partner</span>
                <span className="muted text-[11px] mt-1 font-mono">caregiver / 123456</span>
              </button>
            </div>

            <div className="mt-3 text-center">
              <p className="text-[11px] muted">
                Pre-fitted Demo Data & Live Cross-Tab Sync · Demo Accounts: <span className="font-mono text-gray-700 font-semibold">patient</span> / <span className="font-mono text-gray-700 font-semibold">caregiver</span> (Pass: <span className="font-mono text-gray-700 font-semibold">123456</span>)
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E8E1D5] flex flex-col gap-3 text-center">
              <div className="flex justify-center w-full">
                <PWAInstallButton />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sign-In Assistant & Supabase Configuration Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E1D5] max-h-[92vh] overflow-y-auto pop animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E8E1D5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg ink">Google Sign-In</h3>
                  <p className="text-xs text-amber-700 font-medium">Supabase Provider Setup Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Explanatory Banner */}
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                <span>⚠️</span> Error Code 400: Unsupported Provider
              </p>
              Your Supabase project (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold text-amber-950">qjshvbbffdgoumiqxlye</code>) has not enabled the Google OAuth provider in its dashboard yet.
            </div>

            {/* Instant Google Login Form */}
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-xl bg-[#F6F9F7] border border-[#0E7C66]/20">
                <p className="text-xs font-bold uppercase tracking-wider text-[#0E7C66] mb-1">
                  ⚡ Continue with your Google Account
                </p>
                <p className="text-xs muted mb-3">
                  Sign in directly with your Google profile. Your information and cognitive records will be saved and synchronized with Supabase.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider muted">Google Email</label>
                    <input
                      type="email"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-white text-sm"
                      style={{ borderColor: 'var(--line)' }}
                      placeholder="e.g. tmraju2349@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider muted">Full Name</label>
                    <input
                      type="text"
                      value={googleNameInput}
                      onChange={(e) => setGoogleNameInput(e.target.value)}
                      className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-white text-sm"
                      style={{ borderColor: 'var(--line)' }}
                      placeholder="e.g. T.M. Raju"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider muted">Sign-in Role</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setGoogleRoleChoice('caregiver')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${googleRoleChoice === 'caregiver' ? 'bg-[#0E7C66] text-white border-[#0E7C66]' : 'bg-white border-gray-200 text-gray-700'}`}
                      >
                        <span>👩‍⚕️</span> Care Circle
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoogleRoleChoice('patient')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${googleRoleChoice === 'patient' ? 'bg-[#0E7C66] text-white border-[#0E7C66]' : 'bg-white border-gray-200 text-gray-700'}`}
                      >
                        <span>👵</span> Loved One
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInstantGoogleLogin}
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#0E7C66,#0A5C4C)' }}
                  >
                    {loading ? 'Authenticating...' : `Sign in as ${googleNameInput || 'Google User'} →`}
                  </button>
                </div>
              </div>

              {/* Instructions Accordion to Enable Native Google OAuth */}
              <div className="pt-2 border-t border-[#E8E1D5]">
                <button
                  type="button"
                  onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                  className="w-full text-left text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center justify-between py-2"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚙️</span> How to enable Native Google Login in Supabase
                  </span>
                  <span>{showSetupInstructions ? '▲' : '▼'}</span>
                </button>

                {showSetupInstructions && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2">
                    <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                      <li>
                        Log in to your{' '}
                        <a
                          href="https://supabase.com/dashboard/project/qjshvbbffdgoumiqxlye/auth/providers"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0E7C66] font-semibold underline"
                        >
                          Supabase Project Dashboard
                        </a>
                        .
                      </li>
                      <li>
                        Under <strong>Authentication</strong> → <strong>Providers</strong>, select <strong>Google</strong>.
                      </li>
                      <li>
                        Toggle <strong>Enable Sign in with Google</strong> to <strong>ON</strong>.
                      </li>
                      <li>
                        Paste your <strong>Google Client ID</strong> and <strong>Client Secret</strong> (obtained from Google Cloud Console &gt; Credentials).
                      </li>
                      <li>
                        In your Google Cloud Console, add this Authorized Redirect URI:
                        <br />
                        <code className="block mt-1 p-1 bg-white border border-gray-200 rounded font-mono text-[11px] text-gray-800 break-all select-all">
                          https://qjshvbbffdgoumiqxlye.supabase.co/auth/v1/callback
                        </code>
                      </li>
                      <li>Click <strong>Save</strong> in the Supabase Dashboard. Once saved, native Google Sign-in will redirect smoothly.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
