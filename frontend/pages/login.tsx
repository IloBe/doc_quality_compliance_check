
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LuLayoutTemplate, 
  LuLock, 
  LuShieldCheck, 
  LuEye, 
  LuArrowRight,
  LuLoader,
  LuMail,
  LuKeyRound,
  LuBriefcase,
   LuCompass,
   LuWifi,
   LuWifiOff
} from 'react-icons/lu';
import { checkAuthServiceHealth, loginWithPassword } from '../lib/authClient';

const Login = () => {
   const router = useRouter();
   const [email, setEmail] = useState('mvp-user@example.invalid');
    const [password, setPassword] = useState('CHANGE_ME_BEFORE_USE');
  const [isLoading, setIsLoading] = useState(false);
   const [rememberSession, setRememberSession] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [authServiceOnline, setAuthServiceOnline] = useState<boolean | null>(null);
   const [authServiceVersion, setAuthServiceVersion] = useState<string | null>(null);

   useEffect(() => {
      let mounted = true;

      const refreshHealth = async () => {
         const health = await checkAuthServiceHealth();
         if (!mounted) {
            return;
         }
         setAuthServiceOnline(health.online);
         setAuthServiceVersion(health.version ?? null);
      };

      refreshHealth();
      const interval = setInterval(refreshHealth, 15000);
      return () => {
         mounted = false;
         clearInterval(interval);
      };
   }, []);

   const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
      setError(null);
      try {
         await loginWithPassword(email, password, rememberSession);
         router.replace('/');
      } catch (err) {
         setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
         setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden font-sans antialiased text-neutral-900">
      {/* Left: Branding & Value Proposition */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-[#F8FAFC]">
         {/* Complex Background Design */}
         <div className="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-br from-blue-100 via-white to-emerald-100" />
         <div className="absolute top-10 left-10 w-64 h-64 bg-blue-400/5 blur-[120px] rounded-full" />
         <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/5 blur-[150px] rounded-full" />
         
         <div className="relative flex flex-col justify-center px-24 space-y-12">
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-700">
               <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 ring-8 ring-blue-50">
                  <LuLayoutTemplate className="w-7 h-7" />
               </div>
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-neutral-900 tracking-tight leading-none mb-1">DocQuality</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none">Bridge System</span>
               </div>
            </div>

            <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-left-4 duration-1000 delay-100">
               <h1 className="text-6xl font-black text-neutral-900 leading-[1.1] tracking-tight">
                  Accelerate <span className="text-blue-600">Compliance</span> for Technical Teams.
               </h1>
               <p className="text-xl text-neutral-500 font-medium leading-relaxed max-w-xl">
                  Connect your Technical Documentation with Bridge layer to automate quality checks, compliance verification, and regulatory research in seconds.
               </p>
            </div>

            <div className="flex items-center gap-8 animate-in fade-in slide-in-from-left-4 duration-1000 delay-300">
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-neutral-900 leading-none mb-2 tracking-tight">ISO-Ready</span>
                  <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest leading-none">ISO 9001 · ISO 27001 · EU AI Act</p>
               </div>
               <div className="h-10 w-px bg-neutral-200" />
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-neutral-900 leading-none mb-2 tracking-tight">Multi-Agent</span>
                  <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest leading-none">Core Architecture</p>
               </div>
               <div className="h-10 w-px bg-neutral-200" />
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-neutral-900 leading-none mb-2 tracking-tight">Phase 0</span>
                  <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest leading-none">Evaluation MVP</p>
               </div>
            </div>
         </div>
      </div>

      {/* Right: Security & Login Form */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-10 sm:px-20 bg-white shadow-2xl z-10 border-l border-neutral-100 relative">
         {/* Subtle decoration for mobile */}
         <div className="lg:hidden absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
         
         <div className="max-w-md w-full mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-2">
               <div className="inline-flex items-center justify-center p-3 bg-neutral-50 rounded-2xl mb-4 border border-neutral-100">
                  <LuLock className="w-6 h-6 text-neutral-400 group-hover:text-neutral-600 transition" />
               </div>
               <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Enterprise Access</h2>
               <p className="text-neutral-400 text-sm font-medium leading-relaxed">
                  Sign in with your corporate SSO or project email.
               </p>
                      <div className={`inline-flex items-center gap-2 mt-2 rounded-full px-3 py-1 text-[11px] font-bold ${
                         authServiceOnline === true
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : authServiceOnline === false
                               ? 'bg-amber-50 text-amber-700 border border-amber-100'
                               : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                         {authServiceOnline === true
                            ? <LuWifi className="w-3.5 h-3.5" />
                            : authServiceOnline === false
                               ? <LuWifiOff className="w-3.5 h-3.5" />
                               : <LuLoader className="w-3.5 h-3.5 animate-spin" />}
                         <span>
                            Auth API: {authServiceOnline === true ? 'Online' : authServiceOnline === false ? 'Offline' : 'Checking...'}
                            {authServiceVersion ? ` (v${authServiceVersion})` : ''}
                         </span>
                      </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
               <div className="space-y-1.5 focus-within:transform focus-within:scale-[1.02] transition-transform duration-300">
                  <label htmlFor="email" className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.1em] ml-1">
                    Work Email Address
                  </label>
                  <div className="relative group focus-within:ring-4 focus-within:ring-blue-50 rounded-2xl transition-all">
                    <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blue-500 transition" />
                    <input 
                      id="email"
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-100 pl-12 pr-4 py-4 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-400 transition"
                      required
                    />
                  </div>
               </div>

                      <div className="space-y-1.5 focus-within:transform focus-within:scale-[1.02] transition-transform duration-300">
                           <label htmlFor="password" className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.1em] ml-1">
                              Password
                           </label>
                           <div className="relative group focus-within:ring-4 focus-within:ring-blue-50 rounded-2xl transition-all">
                              <LuKeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blue-500 transition" />
                              <input 
                                 id="password"
                                 type="password"
                                 value={password}
                                 onChange={(e) => setPassword(e.target.value)}
                                 className="w-full bg-neutral-50 border border-neutral-100 pl-12 pr-4 py-4 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-400 transition"
                                 required
                              />
                           </div>
                      </div>

                      {error && (
                         <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="polite">
                            {error}
                         </div>
                      )}

               <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-tight ml-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(e) => setRememberSession(e.target.checked)}
                        className="w-4 h-4 rounded-lg bg-neutral-100 border-none transition focus:ring-blue-400 group-hover:ring-2"
                     />
                     Remember session
                  </label>
                  <Link href="/forgot-access" className="hover:text-blue-600 transition tracking-tighter decoration-dotted underline underline-offset-4">Forgot Access?</Link>
               </div>

               <button 
                 type="submit" 
                         disabled={isLoading}
                         className="w-full font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isLoading ? (
                    <>
                      <LuLoader className="w-5 h-5 animate-spin-slow" />
                      Decrypting...
                    </>
                  ) : (
                    <>
                      Station Authentication
                      <LuArrowRight className="w-5 h-5" />
                    </>
                  )}
               </button>
            </form>

            <div className="pt-10 flex flex-col items-center space-y-6">
               <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-px bg-neutral-100" />
                  <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest leading-none">Secure By</span>
                  <div className="flex-1 h-px bg-neutral-100" />
               </div>
               
               <div className="flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition duration-500">
                  <LuShieldCheck className="w-8 h-8 text-neutral-900" title="Security Compliance" />
                  <LuCompass className="w-8 h-8 text-neutral-900" title="Governance Map" />
                  <LuBriefcase className="w-8 h-8 text-neutral-900" title="Project Control" />
               </div>
            </div>
         </div>

         {/* Footer / Legal */}
         <div className="absolute bottom-10 inset-x-0 text-center text-[10px] text-neutral-300 font-bold uppercase tracking-[0.3em] overflow-hidden">
            QM Core System v1.0 &copy; 2026
         </div>
      </div>
    </div>
  );
};

export default Login;
