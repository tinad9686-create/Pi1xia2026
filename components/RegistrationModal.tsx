
import { generateAvatarStyle } from '../services/geminiService';
import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  sendSignInLinkToEmail,
  onAuthStateChanged,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { PlayerProfile, SkillGroup, AgeGroup } from '../types';
import { AGE_OPTIONS } from '../constants';

const PayPalSubscription = ({ planId, clientId, disabled, onValidationFail, onSuccess }: { planId: string, clientId: string, disabled: boolean, onValidationFail: () => void, onSuccess: (subscriptionId: string) => void }) => {
  const containerId = `paypal-button-container-${planId}`;
  const renderedRef = useRef(false);
  const callbacksRef = useRef({ onValidationFail, onSuccess });

  useEffect(() => {
    callbacksRef.current = { onValidationFail, onSuccess };
  }, [onValidationFail, onSuccess]);
  
  useEffect(() => {
    if (renderedRef.current) return;

    const namespace = 'paypal_sub_' + planId.replace(/[^a-zA-Z0-9]/g, '');
    const scriptId = `paypal-script-${namespace}`;
    
    const renderButton = () => {
      const paypal = (window as any)[namespace];
      if (!paypal) return;
      
      const container = document.getElementById(containerId);
      if (container && !container.hasChildNodes()) {
        renderedRef.current = true;
        paypal.Buttons({
          style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
          onInit: function(data: any, actions: any) {
            if (document.getElementById(containerId)?.getAttribute('data-disabled') === 'true') {
              actions.disable();
            } else {
              actions.enable();
            }
            
            // Listen for changes to the disabled prop
            const observer = new MutationObserver(() => {
               const isDisabled = document.getElementById(containerId)?.getAttribute('data-disabled') === 'true';
               if (isDisabled) {
                 actions.disable();
               } else {
                 actions.enable();
               }
            });
            observer.observe(document.getElementById(containerId)!, { attributes: true });
          },
          onClick: function() {
            const isDisabled = document.getElementById(containerId)?.getAttribute('data-disabled') === 'true';
            if (isDisabled) {
              callbacksRef.current.onValidationFail();
            }
          },
          createSubscription: function(data: any, actions: any) {
            return actions.subscription.create({ plan_id: planId });
          },
          onApprove: function(data: any, actions: any) {
            callbacksRef.current.onSuccess(data.subscriptionID);
          }
        }).render(`#${containerId}`);
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.setAttribute('data-namespace', namespace);
      script.onload = renderButton;
      document.body.appendChild(script);
    } else {
      renderButton();
    }
  }, [planId, clientId, containerId]);

  return <div id={containerId} data-disabled={disabled} className="w-full mt-4 z-0 relative min-h-[50px]"></div>;
};

interface Props {
  profile: PlayerProfile;
  onUpdate: (profile: PlayerProfile) => void;
  onClose: () => void;
  onViewLegal: (tab: 'terms' | 'privacy' | 'waiver') => void;
  initialStep?: number;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Cali&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Pickler&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Vivian&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Joy&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoey&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryker&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Cooper&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Parker&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&mouth=smile',
];

const LANGUAGES = [
  'English', 'Spanish', 'Chinese', 'French', 'Korean', 'German', 'Japanese', 'Vietnamese', 'Hindi', 'Arabic'
];

const REFERRAL_OPTIONS = [
  "Google Search", "Social Media", "Friend", "Club / Coach", "Other"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block ml-1.5 z-40">
      <i 
        onClick={() => setIsOpen(!isOpen)}
        className={`fas fa-circle-info text-[10px] transition-colors cursor-pointer ${isOpen ? 'text-lime-500' : 'text-stone-300 hover:text-lime-500'}`}
      ></i>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-green-900 text-white text-[10px] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 leading-relaxed font-medium pointer-events-auto">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-green-900 pointer-events-none"></div>
        </div>
      )}
    </div>
  );
};

const PricingCard: React.FC<{ 
  title: string; 
  price: string; 
  subtitle?: string;
  features: (string | { text: string; tooltip: string })[]; 
  selected: boolean; 
  onSelect: () => void; 
  isBestValue?: boolean;
  color: string;
}> = ({ title, price, subtitle, features, selected, onSelect, isBestValue, color }) => (
  <div 
    onClick={onSelect}
    className={`relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 flex flex-col h-full ${selected ? `border-${color}-500 bg-${color}-50 shadow-xl scale-105 z-10` : 'border-stone-100 bg-white hover:border-stone-200 hover:bg-stone-50'}`}
  >
    {isBestValue && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-md tracking-widest whitespace-nowrap">
        Most Popular
      </div>
    )}
    <h3 className={`text-lg font-black uppercase mb-1 ${selected ? `text-${color}-600` : 'text-stone-700'}`}>{title}</h3>
    <div className="flex items-baseline mb-1">
      <span className="text-2xl md:text-3xl font-black text-stone-800">{price}</span>
      {price !== 'Free' && price !== 'Quote' && <span className="text-xs font-bold text-stone-400 ml-1">/mo</span>}
    </div>
    {subtitle ? (
      <div className="text-[9px] font-bold text-stone-400 mb-4 uppercase tracking-widest">{subtitle}</div>
    ) : (
      <div className="mb-4"></div>
    )}
    <ul className="space-y-2 mb-4 flex-1">
      {features.map((f, i) => {
        const text = typeof f === 'string' ? f : f.text;
        const tooltip = typeof f === 'string' ? null : f.tooltip;
        return (
          <li key={i} className="flex items-start gap-2 text-[10px] font-bold text-stone-500">
            <i className={`fas fa-check mt-0.5 ${selected ? `text-${color}-500` : 'text-stone-300'}`}></i>
            <span className="leading-tight flex flex-wrap items-center">
              {text}
              {tooltip && <Tooltip text={tooltip} />}
            </span>
          </li>
        );
      })}
    </ul>
    <div className={`w-6 h-6 rounded-full border-2 ml-auto flex items-center justify-center ${selected ? `border-${color}-500 bg-${color}-500` : 'border-stone-200'}`}>
      {selected && <i className="fas fa-check text-white text-xs"></i>}
    </div>
  </div>
);

const RegistrationModal: React.FC<Props> = ({ profile, onUpdate, onClose, onViewLegal, initialStep = 1 }) => {
  const [step, setStep] = useState(initialStep);
  const [tempProfile, setTempProfile] = useState<PlayerProfile>({ 
    ...profile, 
    email: profile.email || '',
    phone: profile.phone || '',
    mailingAddress: profile.mailingAddress || '',
    contactPreference: 'Email', 
    contactInfo: '',
    selfEval: profile.selfEval || 3.0,
    duprRank: profile.duprRank || 0,
    yearsPlayed: profile.yearsPlayed || 0,
    coachComments: profile.coachComments || '',
    locations: (profile.locations.length > 0 && profile.locations[0] !== 'Jack Crosby Sports box') ? profile.locations : [''],
    isLocationFlexible: profile.isLocationFlexible ?? true,
    isScheduleFlexible: profile.isScheduleFlexible ?? true,
    preferredSkillLevel: profile.preferredSkillLevel || 'All',
    skillMatchMode: profile.skillMatchMode || 'Flexible',
    durationPreference: profile.durationPreference || 'All',
    agePreference: profile.agePreference || 'All',
    referralSource: '',
    referralName: '',
    evaluationsThisMonth: profile.evaluationsThisMonth || 0,
    totalEvaluations: profile.totalEvaluations || 0
  });
  
  const [verification, setVerification] = useState<{email: boolean; phone: boolean}>({
    email: !!profile.email && !!profile.isRegistered, 
    phone: !!profile.phone && !!profile.isRegistered
  });

  const [verificationStep, setVerificationStep] = useState<'none' | 'sms_sent' | 'email_sent'>('none');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'elite' | 'custom'>(
    (profile.membershipTier?.toLowerCase() as 'free' | 'pro' | 'elite' | 'custom') || 'free'
  );
  const [cardInfo, setCardInfo] = useState({ number: '', expiry: '', cvc: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [mapQuery, setMapQuery] = useState(tempProfile.locations[0] || "Jack Crosby Sports box");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Avatar Styling State
  const [avatarFilter, setAvatarFilter] = useState<'original' | 'cartoon'>('original');
  const [processedAvatar, setProcessedAvatar] = useState<string>(tempProfile.avatar || PRESET_AVATARS[0]);

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [randomDigits] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  const cityPrefix = (tempProfile.locations[0] || 'PX').substring(0, 2).replace(/[^a-zA-Z]/g, '').padEnd(2, 'X').toUpperCase();
  const firstName = (tempProfile.name || 'Player').split(' ')[0].replace(/[^a-zA-Z]/g, '');
  const generatedPlayerTag = tempProfile.playerTag || `${cityPrefix}${firstName}${randomDigits}`;

  const isEditing = profile.isRegistered;
  // Premium features are locked if the user is not registered (new sign-up) or is on the Free tier
  const isPremiumLocked = !isEditing || tempProfile.membershipTier === 'Free';

  // Apply filters when avatar or filter state changes
  useEffect(() => {
    const applyFilter = async () => {
        if (!tempProfile.avatar) {
            setProcessedAvatar(PRESET_AVATARS[0]);
            return;
        }

        if (tempProfile.avatar.includes('dicebear')) {
             setProcessedAvatar(tempProfile.avatar);
             return;
        }

        if (avatarFilter === 'original') {
            setProcessedAvatar(tempProfile.avatar);
            return;
        }

        setIsGeneratingAvatar(true);
        setApiKeyError(false);
        try {
            const stylizedImage = await generateAvatarStyle(tempProfile.avatar, avatarFilter);
            setProcessedAvatar(stylizedImage);
        } catch (error: any) {
            console.error("Failed to generate avatar style", error);
            if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED') || JSON.stringify(error).includes('PERMISSION_DENIED')) {
                setApiKeyError(true);
            }
            // Fallback to original if generation fails
            setProcessedAvatar(tempProfile.avatar);
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    applyFilter();
  }, [avatarFilter, tempProfile.avatar]);



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is signed in via magic link or SMS, mark as verified
        if (user.email === tempProfile.email) {
          setVerification(prev => ({ ...prev, email: true }));
          setVerificationStep('none');
        }
        if (user.phoneNumber === tempProfile.phone) {
          setVerification(prev => ({ ...prev, phone: true }));
          setVerificationStep('none');
        }
      }
    });
    return () => unsubscribe();
  }, [tempProfile.email, tempProfile.phone]);

  useEffect(() => {
    if (!isEditing && step === 1 && !recaptchaVerifier.current && recaptchaRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
        'size': 'invisible'
      });
    }
  }, [isEditing, step]);

  const handleVerifyContact = async (type: 'email' | 'phone') => {
    const value = type === 'email' ? tempProfile.email : tempProfile.phone;
    if (!value) {
        alert(`Please enter your ${type} first.`);
        return;
    }
    
    setPaymentLoading(true);

    try {
      if (type === 'phone') {
        if (!recaptchaVerifier.current) throw new Error("Recaptcha not ready");
        
        // Sanitize phone number to E.164 format
        let formattedPhone = value.trim();
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
        setVerificationStep('sms_sent');
        alert("Verification code sent to your phone!");
      } else {
        const actionCodeSettings = {
          url: 'https://ascepd.com',
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, value, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', value);
        setVerificationStep('email_sent');
        alert("Magic Link sent to your email! Please click it to continue registration.");
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      alert("Verification failed: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleVerifySmsCode = async () => {
    if (!confirmationResult) return;
    setPaymentLoading(true);
    try {
      await confirmationResult.confirm(smsCode);
      setVerification(prev => ({ ...prev, phone: true }));
      setVerificationStep('none');
      alert("Phone verified successfully!");
    } catch (err: any) {
      alert("Invalid code: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    setPaymentLoading(true);
    try {
      // Auth is already handled by the verification step (SMS or Magic Link)
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication required");

      if (selectedPlan === 'free') {
        const emailToCheck = user.email || tempProfile.email;
        const phoneToCheck = user.phoneNumber || tempProfile.phone;

        let isUnsubscribed = false;

        if (emailToCheck) {
          const qEmail = query(collection(db, 'unsubscribed_users'), where('email', '==', emailToCheck));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) isUnsubscribed = true;
        }

        if (!isUnsubscribed && phoneToCheck) {
          const qPhone = query(collection(db, 'unsubscribed_users'), where('phone', '==', phoneToCheck));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) isUnsubscribed = true;
        }

        if (isUnsubscribed) {
          setPaymentLoading(false);
          alert("You have previously unsubscribed and cannot register as a free member again. Please select a paid plan.");
          return;
        }
      }

      // Generate playerTag if missing
      let playerTag = tempProfile.playerTag || generatedPlayerTag;

      // 2. Prepare the full profile
      const finalProfile: PlayerProfile = {
        ...tempProfile,
        id: user.uid,
        isRegistered: true,
        location: tempProfile.locations[0],
        avatar: processedAvatar, // Save the stylized avatar
        membershipTier: selectedPlan === 'custom' ? 'Custom' : (selectedPlan === 'elite' ? 'Elite' : (selectedPlan === 'pro' ? 'Pro' : 'Free')),
        playerTag
      };

      // 3. Save to Firestore
      await setDoc(doc(db, "users", user.uid), finalProfile);

      // 4. Handle Referral Sparks
      if (finalProfile.referralSource === 'Friend' && finalProfile.referralName && !finalProfile.referralProcessed) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("playerTag", "==", finalProfile.referralName.trim()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const referrerDoc = querySnapshot.docs[0];
            const referrerData = referrerDoc.data() as PlayerProfile;
            await updateDoc(doc(db, "users", referrerDoc.id), {
              sparksBalance: (referrerData.sparksBalance || 0) + 10
            });
            // Mark referral as processed
            await updateDoc(doc(db, "users", user.uid), {
              referralProcessed: true
            });
            finalProfile.referralProcessed = true;
          }
        } catch (err) {
          console.error("Error processing referral:", err);
        }
      }

      setPaymentLoading(false);
      onUpdate(finalProfile);
      
      if (selectedPlan === 'custom') {
        alert("Request Received! We have saved your profile and emailed our Director. We will customize your need with a quote shortly.");
      } else {
        alert("Welcome to the Court! Your account is now active.");
      }
    } catch (error: any) {
      setPaymentLoading(false);
      console.error("Registration Error:", error);
      alert("Registration Failed: " + (error.message || "Unknown error"));
    }
  };

  const handleNext = () => {
    console.log("handleNext: step =", step, "isEditing =", isEditing);
    // Validation Checks
    if (step === 1) {
        if (!tempProfile.name) {
            alert("Please enter your name!");
            return;
        }
        
        if (!verification.email && !verification.phone) {
            alert("Please verify at least one contact method (Email or Phone) to continue.");
            return;
        }
    }

    if (step === 2) {
      if (tempProfile.locations.filter(l => l.trim() !== "").length === 0) {
        alert("Please add at least one court location!");
        return;
      }
    }

    if (step === 5) {
      finalizeRegistration();
      return;
    }

    // Navigation Logic
    if (step === 4) {
      if (isEditing) {
        onUpdate(tempProfile);
        return;
      }
      setStep(5);
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLanguageChange = (index: number, val: string) => {
    const langs = [...tempProfile.language];
    langs[index] = val;
    setTempProfile({ ...tempProfile, language: langs.filter(l => l !== "") });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfile({ ...tempProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addLocationSlot = () => {
    if (tempProfile.locations.length < 3) {
      setTempProfile({ ...tempProfile, locations: [...tempProfile.locations, ''] });
    }
  };

  const updateLocationSlot = (index: number, value: string) => {
    const newLocs = [...tempProfile.locations];
    newLocs[index] = value;
    setTempProfile({ ...tempProfile, locations: newLocs });
  };

  const removeLocationSlot = (index: number) => {
    if (tempProfile.locations.length > 1) {
      const newLocs = tempProfile.locations.filter((_, i) => i !== index);
      setTempProfile({ ...tempProfile, locations: newLocs });
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        alert("Location found! Type the court name you see into the box.");
      }, () => {
        alert("Could not access location. Please type your city or court name.");
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const toggleSchedule = (day: number, time: string) => {
    const existingIndex = tempProfile.schedule.findIndex(s => s.day === day && s.time === time);
    let newSchedule = [...tempProfile.schedule];
    
    if (existingIndex !== -1) {
      newSchedule.splice(existingIndex, 1);
    } else {
      newSchedule.push({ 
        id: Math.random().toString(36).substring(7), 
        day, 
        time, 
        location: tempProfile.locations[0] || 'My Court', 
        isConfirmedMatch: false, 
        status: 'preferred',
        duration: 2 
      });
    }
    setTempProfile({ ...tempProfile, schedule: newSchedule });
  };

  const visualStep = step;
  const totalVisualSteps = 5;

  const getButtonLabel = () => {
    if (paymentLoading) return "";
    if (step === 5) {
       if (selectedPlan === 'custom') return "Request Quote";
       if (isEditing) return "Update Plan";
       return selectedPlan === 'free' ? "Accept & Join" : "Subscribe & Join";
    }
    if (isEditing && step === 3) return "Save Profile";
    return "Continue";
  };

  const maxCourts = isEditing 
    ? (tempProfile.membershipTier === 'Elite' ? 3 : tempProfile.membershipTier === 'Pro' ? 2 : 1)
    : 1;

  const canSetPreferences = isEditing && (tempProfile.membershipTier === 'Pro' || tempProfile.membershipTier === 'Elite');

  return (
    <div className="fixed inset-0 z-[100] bg-green-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-stone-300 hover:text-stone-500 transition-colors z-20">
          <i className="fas fa-times text-2xl"></i>
        </button>

        {/* Progress Bar */}
        <div className="h-2 bg-stone-100 w-full flex shrink-0">
          {Array.from({ length: totalVisualSteps }).map((_, i) => (
            <div key={i} className={`h-full flex-1 transition-all duration-500 ${visualStep >= (i + 1) ? 'bg-lime-500' : ''}`}></div>
          ))}
        </div>

        <div className="p-8 md:p-12 lg:p-14 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-lg mx-auto">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-black text-green-900 mb-2">{isEditing ? "Refine Profile" : "Welcome to \"Pi1Xia\"!"}</h2>
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Let's set up your secure profile</p>
              </div>
              
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden ring-8 ring-lime-100 shadow-xl bg-white relative">
                      <img src={processedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      
                      {/* Loading Overlay */}
                      {isGeneratingAvatar && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                            <i className="fas fa-spinner fa-spin text-lime-500 text-2xl"></i>
                        </div>
                      )}

                      {/* API Key Error Overlay */}
                      {apiKeyError && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 p-2 text-center animate-in fade-in">
                            <p className="text-white text-[8px] font-bold mb-1 uppercase tracking-wider">Premium Feature</p>
                            <button 
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        await (window as any).aistudio.openSelectKey();
                                        setApiKeyError(false);
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                className="bg-lime-500 text-white text-[8px] font-black px-2 py-1 rounded-full hover:bg-lime-400 transition-colors uppercase tracking-widest"
                            >
                                Connect Project
                            </button>
                        </div>
                      )}

                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
                      >
                        <i className="fas fa-camera text-white text-xl"></i>
                      </div>
                    </div>
                    {/* Style Filters */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 flex gap-2 bg-white p-1.5 rounded-xl shadow-lg border border-stone-100 w-max z-20">
                        <button 
                            onClick={() => setAvatarFilter('original')}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${avatarFilter === 'original' ? 'bg-lime-400 text-green-900 shadow-md' : 'text-stone-400 hover:bg-stone-50'}`}
                            title="Original"
                        >
                            <i className="fas fa-image text-xs"></i>
                        </button>
                        <div className="relative group">
                            <button 
                                onClick={() => !isPremiumLocked && setAvatarFilter('cartoon')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative ${avatarFilter === 'cartoon' ? 'bg-lime-400 text-green-900 shadow-md' : 'text-stone-400 hover:bg-stone-50'} ${isPremiumLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isPremiumLocked ? "Premium Feature: Unlock after subscription" : "Toon Style"}
                            >
                                <i className="fas fa-paint-brush text-xs"></i>
                                {isPremiumLocked && <div className="absolute -top-1 -right-1 bg-stone-500 text-white w-3 h-3 rounded-full flex items-center justify-center text-[6px] border border-white"><i className="fas fa-lock"></i></div>}
                            </button>
                            {isPremiumLocked && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 p-2 bg-stone-800 text-white text-[8px] rounded-lg text-center z-50 pointer-events-none">
                                    Unlock after subscription
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                    {isPremiumLocked && (
                        <p className="text-[8px] text-stone-400 font-bold uppercase tracking-widest mt-20 text-center animate-in fade-in">
                            <i className="fas fa-crown text-yellow-500 mr-1"></i> Unlock AI Styles with Premium
                        </p>
                    )}
                
                <div className="w-full space-y-4 mt-8">
                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 mb-2 uppercase tracking-[0.2em]">Your Name</label>
                    <input 
                      type="text"
                      value={tempProfile.name}
                      placeholder="E.g. Tijana"
                      onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                      className="w-full p-3 md:p-4 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 focus:ring-4 focus:ring-lime-400/10 outline-none text-base md:text-lg font-black text-stone-800 transition-all shadow-sm"
                    />
                    <div className="mt-2 flex items-center justify-between bg-stone-100 p-3 rounded-xl border border-stone-200">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Your License Number</span>
                        <span className="text-sm font-black text-stone-700 tracking-wider">{generatedPlayerTag}</span>
                      </div>
                      <Tooltip text="This unique License Number is generated using your city and name. Give this to friends so they can enter it when they sign up, and you'll earn 10 Sparks!" />
                    </div>
                  </div>
                  
                  {/* Verification Section */}
                  <div className="pt-4 border-t border-stone-100 animate-in slide-in-from-bottom-2">
                     <h4 className="text-[10px] font-black text-green-900 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2">
                       Verify Identity (Choose 1)
                       <Tooltip text="Pi1Xia is a passwordless app. Verify your phone or email to create your secure account." />
                     </h4>
                     
                     {/* Email Verification */}
                     <div className="mb-3 relative group">
                        <label className="block text-[10px] font-black text-stone-400 mb-1 uppercase tracking-[0.2em] ml-1 flex items-center">
                          Email Address
                          <Tooltip text="Click the link in your email to verify. The app will detect your sign-in automatically. If you're on a different device, you'll be asked to confirm your email." />
                        </label>
                        <div className="flex gap-2">
                           <input 
                             type="email"
                             value={tempProfile.email}
                             placeholder="you@email.com"
                             onChange={(e) => setTempProfile({...tempProfile, email: e.target.value})}
                             className={`flex-1 p-3 md:p-4 rounded-2xl border-2 outline-none font-bold text-sm transition-all ${verification.email ? 'bg-lime-50 border-lime-200 text-lime-800' : 'bg-stone-50 border-stone-100 focus:border-lime-400'}`}
                           />
                           {verification.email ? (
                              <div className="w-14 bg-lime-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce-short">
                                 <i className="fas fa-check"></i>
                              </div>
                           ) : (
                              <button 
                                type="button"
                                disabled={paymentLoading}
                                onClick={() => handleVerifyContact('email')}
                                className="px-4 bg-stone-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-stone-900 transition-colors shadow-lg active:scale-95"
                              >
                                {verificationStep === 'email_sent' ? 'Resend' : 'Send Link'}
                              </button>
                           )}
                        </div>
                        {verificationStep === 'email_sent' && !verification.email && (
                          <p className="text-[8px] text-lime-600 mt-2 font-bold uppercase tracking-widest animate-pulse">Check your inbox for the Magic Link!</p>
                        )}
                     </div>

                     {/* Phone Verification */}
                     <div className="mb-4 relative group">
                        <label className="block text-[10px] font-black text-stone-400 mb-1 uppercase tracking-[0.2em] ml-1 flex items-center">
                          Mobile Phone (SMS)
                          <Tooltip text="You'll receive a 6-digit code via SMS. Ensure you include the country code (e.g., +1 for USA). We'll automatically clean up spaces and dashes for you." />
                        </label>
                        <div className="flex gap-2">
                           <input 
                             type="tel"
                             value={tempProfile.phone}
                             placeholder="+15551234567"
                             onChange={(e) => setTempProfile({...tempProfile, phone: e.target.value})}
                             className={`flex-1 p-3 md:p-4 rounded-2xl border-2 outline-none font-bold text-sm transition-all ${verification.phone ? 'bg-lime-50 border-lime-200 text-lime-800' : 'bg-stone-50 border-stone-100 focus:border-lime-400'}`}
                           />
                           {verification.phone ? (
                              <div className="w-14 bg-lime-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce-short">
                                 <i className="fas fa-check"></i>
                              </div>
                           ) : (
                              <button 
                                type="button"
                                disabled={paymentLoading}
                                onClick={() => handleVerifyContact('phone')}
                                className="px-4 bg-stone-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-stone-900 transition-colors shadow-lg active:scale-95"
                              >
                                {verificationStep === 'sms_sent' ? 'Resend' : 'Send SMS'}
                              </button>
                           )}
                        </div>
                        {verificationStep === 'sms_sent' && !verification.phone && (
                          <div className="mt-3 flex gap-2 animate-in slide-in-from-top-2">
                            <input 
                              type="text"
                              placeholder="6-digit code"
                              value={smsCode}
                              onChange={(e) => setSmsCode(e.target.value)}
                              className="flex-1 p-3 bg-white border-2 border-lime-400 rounded-xl text-xs font-black tracking-widest text-center"
                              maxLength={6}
                            />
                            <button 
                              onClick={handleVerifySmsCode}
                              className="px-4 bg-lime-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              Verify
                            </button>
                          </div>
                        )}
                     </div>
                     <div id="recaptcha-reg" ref={recaptchaRef}></div>

                     {/* Optional Mailing Address */}
                     <div className="mb-4">
                        <label className="block text-[10px] font-black text-stone-400 mb-1 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                           Mailing Address <span className="bg-stone-100 text-stone-400 text-[8px] px-2 py-0.5 rounded">Optional</span>
                           <Tooltip text="We only use this to send you surprise gifts, tournament swags, or physical membership perks!" />
                        </label>
                        <input 
                          type="text"
                          value={tempProfile.mailingAddress}
                          placeholder="123 Pickleball Lane, City, Zip"
                          onChange={(e) => setTempProfile({...tempProfile, mailingAddress: e.target.value})}
                          className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 focus:ring-4 focus:ring-lime-400/10 outline-none text-sm font-bold text-stone-800 transition-all shadow-sm"
                        />
                     </div>
                  </div>
                  
                  {/* Referral Section */}
                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-stone-400 mb-2 uppercase tracking-[0.2em]">Where have you heard about us?</label>
                    <select 
                      value={tempProfile.referralSource}
                      onChange={(e) => setTempProfile({ ...tempProfile, referralSource: e.target.value })}
                      className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 focus:ring-4 focus:ring-lime-400/10 outline-none text-sm font-bold text-stone-800 transition-all shadow-sm"
                    >
                      <option value="">Select an option...</option>
                      {REFERRAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    
                    {tempProfile.referralSource === 'Friend' && (
                      <div className="mt-3 animate-in slide-in-from-top-2">
                        <label className="flex items-center text-[10px] font-black text-lime-600 mb-1 uppercase tracking-[0.2em] ml-2">
                          Friend's License Number
                          <Tooltip text="Please ask your friend for their unique License Number (e.g., VAMike1234) so they can receive their 10 Sparks credit!" />
                        </label>
                        <input 
                          type="text"
                          value={tempProfile.referralName}
                          placeholder="e.g. VAMike1234"
                          onChange={(e) => setTempProfile({ ...tempProfile, referralName: e.target.value })}
                          className="w-full p-4 bg-lime-50/50 rounded-2xl border-2 border-lime-200 focus:border-lime-400 outline-none text-sm font-bold text-green-900 transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-black text-stone-400 mb-4 uppercase tracking-[0.2em] text-center">Pick your Look</label>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 hover:border-lime-500 hover:text-lime-500 transition-all"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    {PRESET_AVATARS.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setTempProfile({ ...tempProfile, avatar: src })}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${tempProfile.avatar === src ? 'border-lime-500 scale-125 shadow-lg ring-4 ring-lime-200/50 z-10' : 'border-transparent opacity-40 hover:opacity-100'}`}
                      >
                        <img src={src} className="w-full h-full object-cover bg-white" alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pr-2 max-w-2xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-black text-green-900 mb-2">Home Courts</h2>
                <div className="flex items-center justify-center gap-2 mb-2">
                   <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">
                     {isEditing ? `Plan Limit: ${maxCourts} Court${maxCourts > 1 ? 's' : ''}` : "Pick the court you play most often"}
                   </p>
                   <Tooltip text="PROCESS: 1. Click 'Locate Me' or the Map link. 2. Find the exact court name on Google Maps. 3. Copy & Paste the name into the input box. 4. Continue once filled. The map opens in a new tab so you can switch back and forth easily." />
                </div>
              </div>
              {/* ... (Step 2 content remains same) ... */}
              <div className="space-y-6">
                {canSetPreferences && (
                  <div className="bg-lime-50 p-4 rounded-3xl border border-lime-200 animate-in slide-in-from-top-2">
                    <label className="block text-[10px] font-black text-green-900 mb-3 uppercase tracking-widest">Location Preference</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setTempProfile({...tempProfile, isLocationFlexible: false})}
                        className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!tempProfile.isLocationFlexible ? 'bg-green-900 text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100'}`}
                      >
                        Fixed (Only these)
                      </button>
                      <button 
                        onClick={() => setTempProfile({...tempProfile, isLocationFlexible: true})}
                        className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tempProfile.isLocationFlexible ? 'bg-lime-500 text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100'}`}
                      >
                        Flexible (Anywhere)
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {tempProfile.locations.map((loc, idx) => {
                    if (idx >= maxCourts) return null;
                    return (
                      <div key={idx} className="flex gap-2 group animate-in slide-in-from-left-2 duration-300">
                        <div className="relative flex-1 flex gap-2">
                          <input 
                            type="text"
                            value={loc}
                            placeholder={`Type court name here...`}
                            onFocus={() => loc && setMapQuery(loc)}
                            onChange={(e) => {
                              updateLocationSlot(idx, e.target.value);
                              if (e.target.value.length > 3) setMapQuery(e.target.value);
                            }}
                            className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 outline-none font-bold text-xs"
                          />
                          {/* Locate Me Button */}
                          <button 
                            onClick={getUserLocation}
                            className="px-4 bg-stone-100 hover:bg-lime-100 text-stone-400 hover:text-lime-600 rounded-2xl transition-colors border border-stone-200"
                            title="Find courts near me"
                          >
                            <i className="fas fa-location-crosshairs"></i>
                          </button>
                        </div>
                        {tempProfile.locations.length > 1 && (
                          <button 
                            onClick={() => removeLocationSlot(idx)}
                            className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-rose-100"
                          >
                            <i className="fas fa-trash-can text-sm"></i>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  
                  {tempProfile.locations.length < maxCourts && (
                    <button 
                      onClick={addLocationSlot}
                      className="w-full py-4 rounded-2xl border-2 border-dashed border-stone-200 text-stone-300 font-black uppercase text-[10px] tracking-widest hover:border-lime-400 hover:text-lime-500 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      Add Another Court
                    </button>
                  )}

                  {isEditing && tempProfile.membershipTier === 'Free' && (
                    <div className="p-3 bg-stone-50 rounded-2xl text-center border border-dashed border-stone-200">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                          Upgrade to Pro to add more courts & set flexibility!
                        </p>
                    </div>
                  )}
                </div>

                <div className="h-48 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl bg-stone-100 relative mt-6">
                  <iframe
                    title="Court Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery || "Jack Crosby Sports box")}&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 px-2 max-w-2xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-black text-green-900 mb-2">Refine Your Preferences</h2>
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Strict Sync @ {tempProfile.locations[0] || 'Selected Court'}</p>
              </div>
              {/* ... (Step 3 content remains same) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Matchmaking Preferences Section */}
                <div className="md:col-span-2 space-y-6 bg-lime-50 p-6 rounded-[2rem] border border-lime-200">
                  <label className="block text-[10px] font-black text-green-900 mb-2 uppercase tracking-widest">Matchmaking Filters</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Ideal Opponent Level</label>
                       <div className="flex gap-2 mb-2">
                          <button 
                            onClick={() => setTempProfile({...tempProfile, skillMatchMode: 'Flexible'})}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tempProfile.skillMatchMode === 'Flexible' ? 'bg-lime-500 text-white shadow-md' : 'bg-white border border-stone-100 text-stone-400'}`}
                          >
                            Flexible (Min)
                          </button>
                          <button 
                            onClick={() => setTempProfile({...tempProfile, skillMatchMode: 'Strict'})}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tempProfile.skillMatchMode === 'Strict' ? 'bg-green-900 text-white shadow-md' : 'bg-white border border-stone-100 text-stone-400'}`}
                          >
                            Strict
                          </button>
                       </div>
                       <select 
                         value={tempProfile.preferredSkillLevel}
                         onChange={(e) => setTempProfile({...tempProfile, preferredSkillLevel: e.target.value === 'All' ? 'All' : parseFloat(e.target.value)})}
                         className="w-full p-4 bg-white border border-stone-100 rounded-2xl text-stone-900 font-black text-xs outline-none"
                       >
                         <option value="All">Any Level</option>
                         {[2.5, 3.0, 3.5, 4.0, 4.5].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Ideal Opponent Age</label>
                       <select 
                         value={tempProfile.agePreference}
                         onChange={(e) => setTempProfile({...tempProfile, agePreference: e.target.value as AgeGroup | 'All'})}
                         className="w-full p-4 bg-white border border-stone-100 rounded-2xl text-stone-900 font-black text-xs outline-none"
                       >
                         <option value="All">All Ages</option>
                         {AGE_OPTIONS.map(age => <option key={age} value={age}>{age}</option>)}
                       </select>
                     </div>
                     
                     {/* Added Duration Preference */}
                     <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Preferred Game Duration</label>
                       <select 
                         value={tempProfile.durationPreference}
                         onChange={(e) => setTempProfile({...tempProfile, durationPreference: e.target.value === 'All' ? 'All' : parseInt(e.target.value)})}
                         className="w-full p-4 bg-white border border-stone-100 rounded-2xl text-stone-900 font-black text-xs outline-none"
                       >
                         <option value="All">Any Duration</option>
                         {[1, 2, 3, 4].map(d => <option key={d} value={d}>{d} Hour{d > 1 ? 's' : ''}</option>)}
                       </select>
                     </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-stone-400 mb-2 uppercase tracking-widest">Match Goal</label>
                      <div className="flex gap-4">
                        <button onClick={() => setTempProfile({...tempProfile, goal: 'Social Play'})} className={`flex-1 p-4 rounded-2xl border-2 transition-all font-bold text-xs ${tempProfile.goal === 'Social Play' ? 'bg-lime-500 border-lime-600 text-white shadow-lg' : 'bg-stone-50 border-stone-100 text-stone-400'}`}>Social / Fun</button>
                        <button onClick={() => setTempProfile({...tempProfile, goal: 'Improving Skills'})} className={`flex-1 p-4 rounded-2xl border-2 transition-all font-bold text-xs ${tempProfile.goal === 'Improving Skills' ? 'bg-lime-500 border-lime-600 text-white shadow-lg' : 'bg-stone-50 border-stone-100 text-stone-400'}`}>Competitive / Pro</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Stats Section */}
                <div className="md:col-span-2 space-y-6 pt-4 border-t border-stone-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 mb-2 uppercase tracking-widest">My Age Group</label>
                      <select 
                        value={tempProfile.ageGroup}
                        onChange={(e) => setTempProfile({...tempProfile, ageGroup: e.target.value as AgeGroup | 'All'})}
                        className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 outline-none text-xs font-bold"
                      >
                        {AGE_OPTIONS.map(age => <option key={age} value={age}>{age}</option>)}
                        <option value="All">All Ages</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 mb-2 uppercase tracking-widest">Years Played</label>
                      <input type="number" min="0" max="50" value={tempProfile.yearsPlayed} onChange={(e) => setTempProfile({ ...tempProfile, yearsPlayed: parseInt(e.target.value) || 0 })} className="w-full p-4 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 outline-none text-xs font-bold" />
                    </div>
                  </div>

                  <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-stone-600 flex items-center">
                          DUPR Rank
                          <Tooltip text="Dynamic Universal Pickleball Rating - A global rating system used to evaluate player skill levels accurately." />
                        </label>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg shadow-sm ${tempProfile.duprRank === 0 ? 'bg-stone-400 text-white' : 'bg-blue-500 text-white'}`}>
                          {tempProfile.duprRank === 0 ? 'no available' : tempProfile.duprRank.toFixed(2)}
                        </span>
                      </div>
                      <input type="range" min="0.00" max="8.00" step="0.01" value={tempProfile.duprRank} onChange={(e) => setTempProfile({...tempProfile, duprRank: parseFloat(e.target.value)})} className="w-full accent-blue-500 h-2 bg-stone-100 rounded-full appearance-none cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-stone-600 flex items-center">
                          Self-Evaluation Level
                          <Tooltip text="This is your own assessment of your skill level based on your consistency and shot variety." />
                        </label>
                        <span className="bg-lime-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">{tempProfile.selfEval.toFixed(1)}</span>
                      </div>
                      <input type="range" min="1.0" max="5.0" step="0.1" value={tempProfile.selfEval} onChange={(e) => setTempProfile({...tempProfile, selfEval: parseFloat(e.target.value)})} className="w-full accent-lime-500 h-2 bg-stone-100 rounded-full appearance-none cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 mb-2 uppercase tracking-widest">Coach Feedback (Optional)</label>
                      <textarea 
                        value={tempProfile.coachComments}
                        onChange={(e) => setTempProfile({...tempProfile, coachComments: e.target.value})}
                        placeholder="Any professional comments on your play style?"
                        className="w-full p-4 bg-white rounded-2xl border border-lime-200 focus:border-lime-500 outline-none text-xs font-bold h-24 shadow-inner"
                      />
                    </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <h2 className="text-3xl font-black text-green-900 mb-2">Routine</h2>
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">When are you hitting the kitchen?</p>
              </div>
              <div className="bg-lime-50 p-6 rounded-[2.5rem] border border-lime-200 mb-4">
                <label className="block text-[10px] font-black text-green-900 mb-3 uppercase tracking-widest">Schedule Type</label>
                <div className="flex gap-4">
                  <button onClick={() => setTempProfile({...tempProfile, isScheduleFlexible: false})} className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${!tempProfile.isScheduleFlexible ? 'bg-green-900 text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100'}`}>Fixed</button>
                  <button onClick={() => setTempProfile({...tempProfile, isScheduleFlexible: true})} className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${tempProfile.isScheduleFlexible ? 'bg-lime-500 text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100'}`}>Flexible</button>
                </div>
              </div>
              <div className="overflow-x-auto pb-4">
                <div className="grid grid-cols-8 gap-2 min-w-[500px]">
                  <div className="col-span-1"></div>
                  {DAYS.map(d => <div key={d} className="text-[10px] font-black text-stone-300 uppercase text-center">{d}</div>)}
                  {/* Updated times to match Matchmaking.tsx */}
                  {["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map(time => (
                    <React.Fragment key={time}>
                      <div className="text-[9px] font-black text-stone-400 flex items-center justify-end pr-2">{time}</div>
                      {DAYS.map((_, dayIdx) => {
                        const isSelected = tempProfile.schedule.some(s => s.day === dayIdx && s.time === time);
                        return <button key={dayIdx} onClick={() => toggleSchedule(dayIdx, time)} className={`h-10 rounded-lg transition-all border-2 ${isSelected ? 'bg-lime-400 border-lime-500 shadow-md scale-105' : 'bg-stone-50 border-stone-100'}`}></button>;
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-black text-green-900 mb-2">Choose Your Plan</h2>
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Join the fastest growing community</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <PricingCard 
                  title="The Dinker" 
                  price="Free" 
                  features={[
                    { text: '1 Lifetime AI Analysis (3 mins)', tooltip: 'Max 3 mins AI (Flash) analysis & improvement plan to kickstart your journey.' },
                    { text: '1 Action Shot', tooltip: 'A still frame from your uploaded video (e.g., the moment you hit a smash) to share on social media.' },
                    { text: '1 Saved Court (Local Radar)', tooltip: 'See invitations at your home court.' },
                    { text: 'Receive Match Invites', tooltip: 'From other members and organized games.' },
                    { text: 'Full Match Tracking Log', tooltip: 'Keep track of your improvement.' },
                    { text: 'Referral Rewards', tooltip: 'Introduce 10-20 members to gain the $9.99 membership for one month.' },
                    { text: 'Free Digital IQ game', tooltip: 'Play our digital IQ game for free.' }
                  ]} 
                  selected={selectedPlan === 'free'}
                  onSelect={() => setSelectedPlan('free')}
                  color="stone"
                />
                <PricingCard 
                  title="The Banger" 
                  price="$14.85" 
                  subtitle="Included Tax for first 50"
                  features={[
                    { 
                      text: '2 AI skill scans / month', 
                      tooltip: 'Includes a personalized improvement plan.'
                    }, 
                    {
                      text: '2 AI forehand drive shot schematic analysis',
                      tooltip: 'Detailed schematic analysis of your forehand drive.'
                    },
                    {
                      text: '2 Saved courts',
                      tooltip: 'For more "Hot Session" invitations.'
                    },
                    {
                      text: 'Climbing the Rank',
                      tooltip: 'Climbing the Rank to get the redeem.'
                    },
                    {
                      text: 'Free Digital IQ game',
                      tooltip: 'During the developing time, after game developed, 100 sparks/ month.'
                    }
                  ]} 
                  selected={selectedPlan === 'pro'}
                  onSelect={() => setSelectedPlan('pro')}
                  isBestValue
                  color="lime"
                />
                <PricingCard 
                  title="Kitchen King" 
                  price="$26.85" 
                  subtitle="Included Tax for first 50"
                  features={[
                    {
                      text: '4 AI skill scans / month',
                      tooltip: 'Includes a personalized improvement plan.'
                    },
                    {
                      text: '4 AI forehand drive shot schematic analysis',
                      tooltip: 'Detailed schematic analysis of your forehand drive.'
                    },
                    {
                      text: '3 saved courts',
                      tooltip: 'For maximum reach across the city.'
                    },
                    {
                      text: 'Climbing the rank',
                      tooltip: 'Climbing the rank for redeem.'
                    },
                    {
                      text: 'Free Digital IQ game',
                      tooltip: 'During the developing time, after game developed, 150 sparks / month.'
                    }
                  ]} 
                  selected={selectedPlan === 'elite'}
                  onSelect={() => setSelectedPlan('elite')}
                  color="yellow"
                />
                
                {/* 4th Custom Membership Option */}
                <PricingCard 
                  title="Custom" 
                  price="Quote" 
                  features={[
                    { text: 'Coaches & Directors', tooltip: 'For professionals managing teams, schools or facilities.' },
                    'Multi-Sport Options',
                    'Venue Management',
                    'Custom Features',
                    { text: 'We Customize For You', tooltip: 'We will customizing your need with quote.' }
                  ]} 
                  selected={selectedPlan === 'custom'}
                  onSelect={() => setSelectedPlan('custom')}
                  color="purple"
                />
              </div>

              {selectedPlan === 'custom' ? (
                <div className="bg-purple-50 p-6 rounded-[2rem] border-2 border-purple-100 shadow-inner space-y-4 animate-in slide-in-from-bottom-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-2">
                    <i className="fas fa-gem"></i> Tailored Experience
                  </h4>
                  <p className="text-xs font-bold text-stone-600 leading-relaxed">
                    If you are a <span className="text-purple-600">coach</span>, play <span className="text-purple-600">multiple sports</span> a week, a <span className="text-purple-600">courts owner</span>, or a <span className="text-purple-600">school director</span>, you may need more functions than our standard memberships offer.
                  </p>
                  <p className="text-xs font-bold text-stone-600 leading-relaxed">
                    We will customize your experience to fit your specific needs. Request a quote below and our Director will contact you shortly.
                  </p>
                </div>
              ) : selectedPlan === 'elite' ? (
                <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-100 shadow-inner space-y-4 animate-in slide-in-from-bottom-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-2">
                    <i className="fas fa-lock"></i> Secure Payment Details
                  </h4>
                  <PayPalSubscription 
                    planId="P-35564210BM111471HNHCC5QA" 
                    clientId="ATL4i00xwZc74Ddk_Onk5D5ICaTJVsr4-Kh52m1nk0rXvmczYO-clZ08LXGILVtoAGHai8Vun8egC_H5" 
                    disabled={!agreedToTerms}
                    onValidationFail={() => alert("Please agree to the terms and conditions first.")}
                    onSuccess={(subscriptionId) => {
                      finalizeRegistration();
                    }}
                  />
                </div>
              ) : selectedPlan === 'pro' ? (
                <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-100 shadow-inner space-y-4 animate-in slide-in-from-bottom-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-2">
                    <i className="fas fa-lock"></i> Secure Payment Details
                  </h4>
                  <PayPalSubscription 
                    planId="P-00C53913H1307843CNG6EUTA" 
                    clientId="ATL4i00xwZc74Ddk_Onk5D5ICaTJVsr4-Kh52m1nk0rXvmczYO-clZ08LXGILVtoAGHai8Vun8egC_H5" 
                    disabled={!agreedToTerms}
                    onValidationFail={() => alert("Please agree to the terms and conditions first.")}
                    onSuccess={(subscriptionId) => {
                      finalizeRegistration();
                    }}
                  />
                </div>
              ) : selectedPlan !== 'free' && (
                <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-100 shadow-inner space-y-4 animate-in slide-in-from-bottom-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-2">
                    <i className="fas fa-lock"></i> Secure Payment Details
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Card Number"
                        value={cardInfo.number}
                        onChange={(e) => setCardInfo({...cardInfo, number: e.target.value.replace(/\D/g, '').substring(0, 16)})}
                        className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-xs font-bold"
                      />
                      <i className="fas fa-credit-card absolute right-4 top-1/2 -translate-y-1/2 text-stone-300"></i>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="MM/YY"
                        value={cardInfo.expiry}
                        onChange={(e) => setCardInfo({...cardInfo, expiry: e.target.value})}
                        className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-xs font-bold"
                      />
                      <input 
                        type="password" 
                        placeholder="CVC"
                        value={cardInfo.cvc}
                        onChange={(e) => setCardInfo({...cardInfo, cvc: e.target.value.replace(/\D/g, '').substring(0, 3)})}
                        className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-100 focus:border-lime-400 outline-none text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Checkbox */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
                 <input 
                   type="checkbox" 
                   checked={agreedToTerms}
                   onChange={(e) => setAgreedToTerms(e.target.checked)}
                   className="mt-1 w-5 h-5 accent-lime-500 rounded cursor-pointer"
                 />
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-stone-600 leading-tight">
                      I agree to the 
                      <button onClick={() => onViewLegal('terms')} className="text-lime-600 hover:text-lime-700 mx-1 underline">Terms</button>,
                      <button onClick={() => onViewLegal('privacy')} className="text-lime-600 hover:text-lime-700 mx-1 underline">Privacy Policy</button>,
                      and 
                      <button onClick={() => onViewLegal('waiver')} className="text-lime-600 hover:text-lime-700 mx-1 underline">Liability Waiver</button>.
                      I understand that Pi1xia is not responsible for injuries sustained during matches.
                    </p>
                 </div>
              </div>

            </div>
          )}

          <div className="mt-8 flex gap-4 max-w-lg mx-auto">
            {step > 1 && <button onClick={handleBack} disabled={paymentLoading} className="flex-1 p-5 rounded-2xl bg-stone-100 text-stone-600 font-black uppercase tracking-widest text-xs transition-all hover:bg-stone-200">Back</button>}
            {!(step === 5 && (selectedPlan === 'elite' || selectedPlan === 'pro')) && (
              <button onClick={handleNext} disabled={paymentLoading} className={`flex-[2] p-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl flex items-center justify-center gap-3 ${step === 5 ? (selectedPlan === 'custom' ? 'bg-purple-600 shadow-purple-200 hover:bg-purple-500' : 'bg-green-900 shadow-green-100 hover:bg-green-800') : 'bg-lime-500 shadow-lime-100 hover:bg-lime-400'} ${step === 5 && !agreedToTerms ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {paymentLoading ? <i className="fas fa-circle-notch fa-spin"></i> : getButtonLabel()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;
