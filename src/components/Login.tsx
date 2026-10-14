import React, { useState, useEffect } from 'react';
import { UserSession, Teacher } from '../types';
import { ClipboardCheck, Lock, User, Eye, EyeOff, AlertCircle, ChevronDown, Copy, Check, X, Smartphone, ShieldCheck, RefreshCw } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
  availableTeachers: Teacher[];
}

export default function Login({ onLoginSuccess, availableTeachers }: LoginProps) {
  const [role, setRole] = useState<'admin' | 'manager' | 'teacher' | 'academic_coordinator' | 'community_member' | 'wellness' | 'sport' | 'arp' | 'serp'>('arp');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [copiedText, setCopiedText] = useState<'username' | 'password' | null>(null);

  // OTP Validation Flow States
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'mobile' | 'otp' | 'change_password' | 'success'>('mobile');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [simulatedSms, setSimulatedSms] = useState<string | null>(null);

  // Password reset specific states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Live Timer for Resend SMS
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = () => {
    setOtpError(null);
    const cleanMobile = forgotMobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setOtpError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (cleanMobile !== '7057585238') {
      setOtpError('Mobile number not authorized! OTP can only be sent to authorized mobile 7057585238.');
      return;
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpStep('otp');
    setResendTimer(30);

    // Simulate SMS notification with an eye-catching banner
    setSimulatedSms(`✉️ SMS OTP Received: ${code}`);

    // Automatically fade out simulated SMS alert after 15 seconds
    setTimeout(() => {
      setSimulatedSms(null);
    }, 15000);
  };

  const handleVerifyOtp = () => {
    setOtpError(null);
    if (forgotOtp.trim() === generatedOtp) {
      setOtpStep('change_password');
      setSimulatedSms(null);
    } else {
      setOtpError('Incorrect OTP! Please try again.');
    }
  };

  const handleChangePassword = () => {
    setOtpError(null);
    if (!newPassword.trim()) {
      setOtpError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 4) {
      setOtpError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setOtpError('Passwords do not match! Please check again.');
      return;
    }

    // Save the new password override in localStorage
    localStorage.setItem('admin_password_changed', newPassword);
    setOtpStep('success');
  };

  const resetForgotFlow = () => {
    setForgotMobile('');
    setForgotOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setOtpStep('mobile');
    setGeneratedOtp('');
    setOtpError(null);
    setSimulatedSms(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password;

    if (!cleanUser || !cleanPass) {
      setError('Please enter both ID and password.');
      return;
    }

    if (role === 'admin') {
      const activeAdminPassword = localStorage.getItem('admin_password_changed') || 'Samir@2396';
      if (cleanUser === 'Samir23' && cleanPass === activeAdminPassword) {
        const session: UserSession = {
          id: 'Samir23',
          name: 'System Admin',
          role: 'admin'
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Admin ID or Password');
      }
    } else if (role === 'manager') {
      if (cleanUser === 'Manager12' && cleanPass === 'Manager@23647482') {
        const session: UserSession = {
          id: 'Manager12',
          name: 'School Manager',
          role: 'manager'
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Manager ID or Password');
      }
    } else if (role === 'academic_coordinator') {
      if (cleanUser === 'Coordinator12' && cleanPass === 'Coord@1234') {
        const session: UserSession = {
          id: 'Coordinator12',
          name: 'Academic Coordinator',
          role: 'academic_coordinator'
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Coordinator ID or Password');
      }
    } else if (role === 'community_member') {
      if (cleanUser === 'Community12' && cleanPass === 'Community@1234') {
        const session: UserSession = {
          id: 'Community12',
          name: 'Community Mentor',
          role: 'community_member'
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Community Mentor ID or Password');
      }
    } else if (role === 'arp') {
      const matchedTeacher = availableTeachers.find(
        t => t.id.toLowerCase() === cleanUser.toLowerCase() && 
             t.password === cleanPass && 
             (t.types?.includes('ARP') || t.types?.includes('arp'))
      );

      if (matchedTeacher) {
        const session: UserSession = {
          id: matchedTeacher.id,
          name: matchedTeacher.name,
          role: 'teacher',
          allowedSchools: matchedTeacher.allowedSchools || [],
          types: matchedTeacher.types || ['ARP']
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid ARP Teacher ID or Password.');
      }
    } else if (role === 'serp') {
      const matchedTeacher = availableTeachers.find(
        t => t.id.toLowerCase() === cleanUser.toLowerCase() && 
             t.password === cleanPass && 
             (t.types?.includes('SERP') || t.types?.includes('serp'))
      );

      if (matchedTeacher) {
        const session: UserSession = {
          id: matchedTeacher.id,
          name: matchedTeacher.name,
          role: 'teacher',
          allowedSchools: matchedTeacher.allowedSchools || [],
          types: matchedTeacher.types || ['SERP']
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid SERP Teacher ID or Password.');
      }
    } else if (role === 'wellness') {
      const matchedTeacher = availableTeachers.find(
        t => t.id.toLowerCase() === cleanUser.toLowerCase() && 
             t.password === cleanPass && 
             (t.types?.includes('Wellness') || t.types?.includes('WELLNESS'))
      );

      if (matchedTeacher) {
        const session: UserSession = {
          id: matchedTeacher.id,
          name: matchedTeacher.name,
          role: 'teacher',
          allowedSchools: matchedTeacher.allowedSchools || [],
          types: matchedTeacher.types || ['Wellness']
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Wellness Teacher ID or Password.');
      }
    } else if (role === 'sport') {
      const matchedTeacher = availableTeachers.find(
        t => t.id.toLowerCase() === cleanUser.toLowerCase() && 
             t.password === cleanPass && 
             (t.types?.includes('Sport') || t.types?.includes('SPORT'))
      );

      if (matchedTeacher) {
        const session: UserSession = {
          id: matchedTeacher.id,
          name: matchedTeacher.name,
          role: 'teacher',
          allowedSchools: matchedTeacher.allowedSchools || [],
          types: matchedTeacher.types || ['Sport']
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Sport Teacher ID or Password.');
      }
    } else {
      const matchedTeacher = availableTeachers.find(
        t => t.id.toLowerCase() === cleanUser.toLowerCase() && t.password === cleanPass
      );

      if (matchedTeacher) {
        const session: UserSession = {
          id: matchedTeacher.id,
          name: matchedTeacher.name,
          role: 'teacher',
          allowedSchools: matchedTeacher.allowedSchools || [],
          types: matchedTeacher.types
        };
        onLoginSuccess(session);
      } else {
        setError('Invalid Teacher ID or Password. Contact Admin for credentials.');
      }
    }
  };

  const getPlaceholder = () => {
    switch (role) {
      case 'admin': return "e.g. Samir23";
      case 'manager': return "e.g. Manager12";
      case 'academic_coordinator': return "e.g. Coordinator12";
      case 'community_member': return "e.g. Community12";
      case 'wellness': return "e.g. teacher_wellness";
      case 'sport': return "e.g. teacher_sport";
      case 'arp': return "e.g. teacher_arp";
      case 'serp': return "e.g. teacher_serp";
      default: return "e.g. teacher_arun";
    }
  };

  const getLabel = () => {
    switch (role) {
      case 'admin': return "Admin Login ID";
      case 'manager': return "Manager Login ID";
      case 'academic_coordinator': return "Coordinator Login ID";
      case 'community_member': return "Community Mentor Login ID";
      case 'wellness': return "Wellness Teacher ID";
      case 'sport': return "Sport Teacher ID";
      case 'arp': return "ARP Teacher ID";
      case 'serp': return "SERP Teacher ID";
      default: return "Teacher Login ID";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 font-sans select-none relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-950/40 mb-3 animate-bounce-slow">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide">Attendance Management System</h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Secure Portal</p>
        </div>

        <div className="bg-slate-800 border border-slate-700/50 rounded-3xl p-6 shadow-xl space-y-6">
          
          <div className="space-y-1.5 relative">
            <label className="block text-xs font-bold text-slate-400">Select Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as any);
                  setError(null);
                }}
                className="w-full appearance-none px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-2xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-white font-bold text-xs cursor-pointer"
              >
                <option value="arp">Teacher - ARP</option>
                <option value="serp">Teacher - SERP</option>
                <option value="wellness">Teacher - Wellness</option>
                <option value="sport">Teacher - Sport</option>
                <option value="academic_coordinator">Academic Coordinator</option>
                <option value="manager">Manager</option>
                <option value="admin">System Admin</option>
                <option value="community_member">Community Mentor</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-2 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400">{getLabel()}</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={getPlaceholder()}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs font-bold text-white pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-2xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-400">Password</label>
                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] sm:text-xs font-black text-violet-400 hover:text-violet-300 hover:underline transition-all cursor-pointer outline-none bg-transparent border-none p-0"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-mono font-bold text-white pl-11 pr-11 py-3 bg-slate-900/60 border border-slate-700 rounded-2xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-550/20 text-rose-450 text-xs font-bold rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-rose-200">{error}</span>
              </div>
            )}

            {role === 'admin' && (
              <div className="text-[10px] text-slate-500 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 leading-normal font-mono">
                <span className="text-amber-500 font-bold">INFO:</span> Default Admin Credentials exist. (ID: Samir23, Pass: Samir@2396)
              </div>
            )}
            {role === 'manager' && (
              <div className="text-[10px] text-slate-500 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 leading-normal font-mono">
                <span className="text-amber-500 font-bold">INFO:</span> Default Manager Credentials exist. (ID: Manager12, Pass: Manager@23647482)
              </div>
            )}
            {role === 'academic_coordinator' && (
              <div className="text-[10px] text-slate-500 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 leading-normal font-mono">
                <span className="text-amber-500 font-bold">INFO:</span> Default Coordinator Credentials exist. (ID: Coordinator12, Pass: Coord@1234)
              </div>
            )}
            {role === 'community_member' && (
              <div className="text-[10px] text-slate-500 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 leading-normal font-mono">
                <span className="text-amber-500 font-bold">INFO:</span> Default Community Mentor Credentials exist. (ID: Community12, Pass: Community@1234)
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg hover:from-violet-500 hover:to-indigo-500 focus:ring-2 focus:ring-violet-500 hover:scale-[1.01] transition-all cursor-pointer mt-2"
            >
              Sign In
            </button>
          </form>

        </div>

        <div className="mt-8 text-center">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-full border border-slate-850">
            🔒 Secure Sandbox Mode
          </span>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-6 overflow-hidden">
            
            {/* Close button */}
            <button
              onClick={() => {
                setShowForgotModal(false);
                resetForgotFlow();
              }}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-700/50 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Dynamic simulated SMS push notification overlay inside the modal */}
            {simulatedSms && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-3.5 shadow-xl border border-amber-400/30 animate-bounce text-xs font-bold flex gap-3 items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-widest text-amber-100 flex items-center gap-1">
                    💬 SMS Received
                  </p>
                  <p className="font-sans leading-relaxed">{simulatedSms}</p>
                </div>
                <button
                  onClick={() => {
                    // Copy OTP to clipboard and autofill
                    navigator.clipboard.writeText(generatedOtp);
                    setForgotOtp(generatedOtp);
                    setSimulatedSms(null);
                  }}
                  className="bg-white/20 hover:bg-white/30 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition-all shrink-0 cursor-pointer"
                >
                  Autofill & Copy
                </button>
              </div>
            )}

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-700/60 pb-4">
              <div className="p-3 bg-violet-600/20 text-violet-400 rounded-xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Password Recovery (OTP)</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Password via OTP</p>
              </div>
            </div>

            {/* Error Banner */}
            {otpError && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{otpError}</span>
              </div>
            )}

            {/* Steps Container */}
            {otpStep === 'mobile' && (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                  Please enter your registered 10-digit mobile number. We'll send a 6-digit OTP for verification.
                </p>

                <div className="space-y-1.5ClassName">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Mobile</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={forgotMobile}
                      onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-white placeholder:font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-450 leading-relaxed block mt-1 font-bold">
                    💡 Please enter the authorized mobile number '7057585238' for verification.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  Send OTP
                </button>
              </div>
            )}

            {otpStep === 'otp' && (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-300 leading-relaxed">
                  We've sent an OTP code to <span className="text-violet-400 font-extrabold">+91 {forgotMobile}</span>. Please enter it below.
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 482910"
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-center tracking-widest font-mono text-lg font-black text-violet-400 placeholder:font-semibold placeholder:text-xs placeholder:tracking-normal focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="hover:text-white transition-colors cursor-pointer outline-none bg-transparent border-none p-0"
                  >
                    ← Change number
                  </button>
                  {resendTimer > 0 ? (
                    <span>Resend in: {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1 outline-none bg-transparent border-none p-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin-slow" />
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  Verify OTP
                </button>
              </div>
            )}

            {otpStep === 'change_password' && (
              <div className="space-y-4 text-left animate-fade-in">
                <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                  Successful verification! Please set a new Admin password.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 4 characters"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-xs font-bold text-white placeholder:font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Retype password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-xs font-bold text-white placeholder:font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="w-1/3 py-3 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="grow py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    Set Password
                  </button>
                </div>
              </div>
            )}

            {otpStep === 'success' && (
              <div className="space-y-4 animate-fade-in text-center">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 mx-auto mb-1">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                
                <h4 className="text-sm font-black text-white">Password Changed!</h4>
                <p className="text-xs font-semibold text-slate-300 leading-relaxed px-2">
                  The admin login password has been successfully updated.
                </p>

                <div className="bg-slate-900 border border-slate-755 p-3 rounded-2xl space-y-2 text-left">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1.5">
                    <span>Admin ID: <span className="text-white font-mono">Samir23</span></span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('Samir23');
                        setCopiedText('username');
                        setTimeout(() => setCopiedText(null), 2000);
                      }}
                      className="text-violet-400 hover:text-violet-300 text-[10px]"
                    >
                      {copiedText === 'username' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 pt-0.5">
                    <span>New Password: <span className="text-white font-mono">{localStorage.getItem('admin_password_changed') || 'Samir@2396'}</span></span>
                    <button
                      onClick={() => {
                        const activePass = localStorage.getItem('admin_password_changed') || 'Samir@2396';
                        navigator.clipboard.writeText(activePass);
                        setCopiedText('password');
                        setTimeout(() => setCopiedText(null), 2000);
                      }}
                      className="text-violet-400 hover:text-violet-300 text-[10px]"
                    >
                      {copiedText === 'password' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const activePass = localStorage.getItem('admin_password_changed') || 'Samir@2396';
                    setUsername('Samir23');
                    setPassword(activePass);
                    setShowForgotModal(false);
                    resetForgotFlow();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-2xl shadow-lg hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  Autofill & Login
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
