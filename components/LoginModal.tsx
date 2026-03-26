
import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  sendSignInLinkToEmail,
  ConfirmationResult
} from 'firebase/auth';
import { Theme } from '../types';

interface Props {
  mode: 'user' | 'admin';
  onLogin: (name: string, role: 'admin' | 'user') => void;
  onRegister: () => void;
  onClose: () => void;
  theme: Theme;
}

// SECURITY UPDATE: Hardcoded Access Control List
// For a team of 1-5 people, we define specific allowed credentials here.
// In a production environment, this should be moved to a backend database.
const CORPORATE_ACCOUNTS: Record<string, string> = {
  'Director': 'PickleBoss2026',
  'Admin': 'Pi1xiaSecure!',
  'Marketing': 'Growth2026',
  'Finance': 'MoneyMatters',
  'Coach': 'KitchenKing'
};

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-1.5 z-40">
    <i className="fas fa-circle-info text-[10px] text-stone-300 hover:text-lime-500 transition-colors cursor-help"></i>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-green-900 text-white text-[10px] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 leading-relaxed font-medium pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-green-900"></div>
    </div>
  </div>
);

const LoginModal: React.FC<Props> = ({ mode, onLogin, onRegister, onClose, theme }) => {
  const [username, setUsername] = useState(''); // This will be email for users
  const [password, setPassword] = useState(''); // Used for Admin only now
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // User Verification State
  const [loginStep, setLoginStep] = useState<'identify' | 'verify'>('identify');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  const isAdminMode = mode === 'admin';

  useEffect(() => {
    if (!isAdminMode && loginMethod === 'phone' && !recaptchaVerifier.current && recaptchaRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, [isAdminMode, loginMethod]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!recaptchaVerifier.current) {
        throw new Error("Recaptcha not initialized");
      }
      
      // Sanitize phone number to E.164 format
      let formattedPhone = phoneNumber.trim();
      const digitsOnly = formattedPhone.replace(/\D/g, '');
      
      if (digitsOnly.length < 10) {
        throw new Error("Please enter a full phone number including area code.");
      }

      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+${digitsOnly}`;
      } else {
        formattedPhone = `+${digitsOnly}`;
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
      setConfirmationResult(confirmation);
      setLoginStep('verify');
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      console.error("SMS Send Error:", err);
      setError("Failed to send SMS: " + (err.message || "Check your number format (e.g. +15551234567)"));
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!confirmationResult) throw new Error("No verification in progress");
      await confirmationResult.confirm(verificationCode);
      // App.tsx will handle the state change via onAuthStateChanged
      onLogin("User", 'user');
    } catch (err: any) {
      setLoading(false);
      setError("Invalid Code: " + (err.message || "Please try again."));
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, username, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', username);
      setLoading(false);
      alert(`Magic Link sent to ${username}! Please check your inbox.`);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError("Failed to send Magic Link: " + (err.message || "Check your email address."));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isAdminMode) {
      // Simulated API/Auth delay for Admin
      setTimeout(() => {
        if (CORPORATE_ACCOUNTS[username] && CORPORATE_ACCOUNTS[username] === password) {
            onLogin(username, 'admin');
        } else {
            setError('Access Denied. Invalid Corporate Credentials.');
            setLoading(false);
        }
      }, 800);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dynamic Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-xl transition-colors duration-500 ${isDark ? 'bg-black/90' : 'bg-stone-900/40'}`}
        onClick={onClose}
      ></div>

      <div className={`relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border-4 transition-colors ${isAdminMode ? 'border-indigo-100' : 'border-white/50'}`}>
         
         {/* Close Button */}
         <button onClick={onClose} className="absolute top-6 right-6 z-20 text-stone-300 hover:text-stone-500 transition-colors">
            <i className="fas fa-times text-xl"></i>
         </button>

         {/* Top Decoration */}
         <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br opacity-20 transition-colors duration-500 ${isAdminMode ? 'from-indigo-600 via-purple-500 to-blue-400' : 'from-lime-400 via-lime-300 to-yellow-200'}`}></div>
         <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl transition-colors duration-500 ${isAdminMode ? 'bg-indigo-400/20' : 'bg-lime-400/20'}`}></div>
         <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl transition-colors duration-500 ${isAdminMode ? 'bg-purple-400/20' : 'bg-yellow-400/20'}`}></div>

         <div className="relative p-8 pt-12">
            {/* Header */}
            <div className="text-center mb-10">
               <div 
                 className={`w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 border-4 transform rotate-3 transition-all ${isAdminMode ? 'border-indigo-50 shadow-indigo-100' : 'border-lime-50 shadow-lime-100'}`}
               >
                  <i className={`fas ${isAdminMode ? 'fa-user-shield text-indigo-500' : 'fa-pickleball text-lime-500'} text-4xl`}></i>
               </div>
               <h2 className="text-2xl md:text-3xl font-black text-stone-800 tracking-tight transition-all">
                 {isAdminMode ? 'Corporate Access' : (loginStep === 'verify' ? 'Verify Identity' : 'Player Access')}
               </h2>
               <p className={`text-[10px] font-black uppercase tracking-widest mt-2 transition-colors ${isAdminMode ? 'text-indigo-400' : 'text-stone-400'}`}>
                 {isAdminMode ? 'Authorized Personnel Only' : (loginStep === 'verify' ? 'Enter the code sent to you' : 'Secure Gateway • Pi1xia App')}
               </p>
            </div>

            {/* Form */}
            <form onSubmit={isAdminMode ? handleLogin : (loginStep === 'verify' ? handleVerifyCode : (loginMethod === 'phone' ? handleSendCode : handleSendMagicLink))} className="space-y-4">
               {/* USER FLOW FIELDS */}
               {!isAdminMode && (
                 <>
                    {loginStep === 'identify' ? (
                      <div className="animate-in fade-in slide-in-from-left-4 space-y-4">
                        {/* Method Toggle */}
                        <div className="flex bg-stone-100 p-1 rounded-2xl mb-6">
                           <button 
                             type="button"
                             onClick={() => setLoginMethod('phone')}
                             className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMethod === 'phone' ? 'bg-white text-lime-600 shadow-sm' : 'text-stone-400'}`}
                           >
                             <i className="fas fa-phone mr-2"></i> Phone
                           </button>
                           <button 
                             type="button"
                             onClick={() => setLoginMethod('email')}
                             className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMethod === 'email' ? 'bg-white text-lime-600 shadow-sm' : 'text-stone-400'}`}
                           >
                             <i className="fas fa-envelope mr-2"></i> Email
                           </button>
                        </div>

                        {loginMethod === 'phone' ? (
                          <div className="relative group">
                            <i className="fas fa-phone absolute left-5 top-1/2 -translate-y-1/2 text-sm text-lime-300 group-focus-within:text-lime-500 transition-colors"></i>
                            <input 
                              type="tel" 
                              placeholder="Phone Number (e.g. +15551234567)"
                              value={phoneNumber}
                              onChange={e => setPhoneNumber(e.target.value)}
                              className="w-full p-4 pl-12 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 focus:bg-white outline-none text-sm font-bold text-stone-700 transition-all"
                              required
                            />
                            <div className="flex items-center mt-2 ml-2">
                              <p className="text-[8px] text-stone-400 font-bold uppercase tracking-widest">Include country code (e.g. +1 for USA)</p>
                              <Tooltip text="You'll receive a 6-digit code via SMS. Ensure you include the country code (e.g., +1 for USA). We'll automatically clean up spaces and dashes for you." />
                            </div>
                          </div>
                        ) : (
                          <div className="relative group">
                            <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-sm text-lime-300 group-focus-within:text-lime-500 transition-colors"></i>
                            <input 
                              type="email" 
                              placeholder="Email Address"
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              className="w-full p-4 pl-12 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 focus:bg-white outline-none text-sm font-bold text-stone-700 transition-all"
                              required
                            />
                            <div className="flex items-center mt-2 ml-2">
                              <p className="text-[8px] text-stone-400 font-bold uppercase tracking-widest">Passwordless Magic Link</p>
                              <Tooltip text="Click the link in your email to verify. The app will detect your sign-in automatically. If you're on a different device, you'll be asked to confirm your email." />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
                        <div className="relative group">
                          <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-sm text-lime-300 group-focus-within:text-lime-500 transition-colors"></i>
                          <input 
                            type="text" 
                            placeholder="6-Digit Verification Code"
                            value={verificationCode}
                            onChange={e => setVerificationCode(e.target.value)}
                            className="w-full p-4 pl-12 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 focus:bg-white outline-none text-sm font-bold text-stone-700 transition-all tracking-[0.5em] text-center"
                            maxLength={6}
                            required
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setLoginStep('identify')}
                          className="text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-lime-600 transition-colors block mx-auto"
                        >
                          Change Number
                        </button>
                      </div>
                    )}
                    <div id="recaptcha-container" ref={recaptchaRef}></div>
                 </>
               )}

               {/* ADMIN FLOW FIELDS */}
               {isAdminMode && (
                 <>
                   <div>
                      <div className="relative group">
                        <i className="fas fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-sm text-indigo-300 group-focus-within:text-indigo-500 transition-colors"></i>
                        <input 
                          type="text" 
                          placeholder="Corporate ID (e.g. Director)"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full p-4 pl-12 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-indigo-400 focus:bg-white outline-none text-sm font-bold text-stone-700 transition-all"
                        />
                      </div>
                   </div>
                   <div>
                      <div className="relative group">
                        <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-sm text-indigo-300 group-focus-within:text-indigo-500 transition-colors"></i>
                        <input 
                          type="password" 
                          placeholder="Secure Password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full p-4 pl-12 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-indigo-400 focus:bg-white outline-none text-sm font-bold text-stone-700 transition-all"
                        />
                      </div>
                   </div>
                 </>
               )}

               {error && (
                 <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-black text-center animate-shake">
                   <i className="fas fa-exclamation-circle mr-1"></i> {error}
                 </div>
               )}

               <button 
                 type="submit"
                 disabled={loading}
                 className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-[0.15em] text-xs shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 mt-6 ${isAdminMode ? 'bg-indigo-600 shadow-indigo-200' : 'bg-green-900 shadow-green-200'}`}
               >
                 {loading ? <i className="fas fa-circle-notch fa-spin"></i> : (
                   isAdminMode ? 'Authenticate' : (
                     loginStep === 'verify' ? 'Verify Code' : (
                       loginMethod === 'phone' ? 'Send SMS Code' : 'Send Magic Link'
                     )
                   )
                 )}
               </button>
            </form>

            {/* Footer */}
            {!isAdminMode && (
              <div className="mt-8 text-center animate-in fade-in">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                  New to the court? 
                  <button onClick={onRegister} className="ml-2 text-lime-600 hover:text-lime-700 underline decoration-2 underline-offset-4 decoration-lime-300">
                    Register Now
                  </button>
                </p>
              </div>
            )}
            
            {isAdminMode && (
               <div className="mt-8 text-center animate-in fade-in">
                <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-wide">
                   Strictly Confidential • Internal Use Only
                </p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default LoginModal;
