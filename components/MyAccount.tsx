
import React, { useState, useEffect } from 'react';
import { PlayerProfile, Theme } from '../types';
import { db, auth } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface Props {
  profile: PlayerProfile;
  onEdit: () => void;
  onUpgrade: () => void;
  onLogout: () => void;
  theme: Theme;
}

const MyAccount: React.FC<Props> = ({ profile, onEdit, onUpgrade, onLogout, theme }) => {
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-cyan-50' : 'text-stone-800';
  const subTextColor = isDark ? 'text-cyan-400/60' : 'text-stone-400';
  const cardBg = isDark ? 'bg-[#0A292C] border-cyan-900/30' : 'bg-white border-stone-100';
  const accentColor = isDark ? 'text-cyan-400' : 'text-green-900';

  const isFree = profile.membershipTier === 'Free';
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });

  const handleUnsubscribe = async () => {
    try {
      if (!auth.currentUser) return;
      const user = auth.currentUser;
      
      // 1. Add to unsubscribed_users
      await setDoc(doc(db, 'unsubscribed_users', user.uid), {
        email: user.email || profile.email,
        phone: user.phoneNumber || profile.phone || '',
        unsubscribedAt: new Date().toISOString()
      });

      // 2. Delete from users collection
      await deleteDoc(doc(db, 'users', user.uid));

      // 3. Try to delete the auth user (may fail if requires recent login)
      try {
        await user.delete();
      } catch (e) {
        console.warn("Could not delete auth user, signing out instead", e);
      }

      // 4. Close modal and logout
      setShowUnsubscribeModal(false);
      onLogout();
    } catch (error) {
      console.error("Error unsubscribing:", error);
      alert("There was an error unsubscribing. Please try again.");
    }
  };

  const handlePremiumClick = (featureName: string) => {
    if (isFree) {
        // Ask to upgrade
        setConfirmModal({
          isOpen: true,
          message: `🔒 ${featureName} is a Premium Feature.\n\nWant to upgrade to Pro or Elite to unlock this?`,
          onConfirm: () => {
            setConfirmModal({ ...confirmModal, isOpen: false });
            onUpgrade();
          }
        });
    } else {
        // Already has it, just open edit to manage settings
        onEdit();
    }
  };

  useEffect(() => {
    const renderButtons = () => {
      const w = window as any;
      if (w.paypal && w.paypal.HostedButtons) {
        if (document.getElementById('paypal-container-25CKXBFPAX4UU') && !document.getElementById('paypal-container-25CKXBFPAX4UU')?.hasChildNodes()) {
          w.paypal.HostedButtons({ hostedButtonId: "25CKXBFPAX4UU" }).render("#paypal-container-25CKXBFPAX4UU");
        }
        if (document.getElementById('paypal-container-MWJP5QGSYZBGJ') && !document.getElementById('paypal-container-MWJP5QGSYZBGJ')?.hasChildNodes()) {
          w.paypal.HostedButtons({ hostedButtonId: "MWJP5QGSYZBGJ" }).render("#paypal-container-MWJP5QGSYZBGJ");
        }
        if (document.getElementById('paypal-container-95UEQHJTXKS56') && !document.getElementById('paypal-container-95UEQHJTXKS56')?.hasChildNodes()) {
          w.paypal.HostedButtons({ hostedButtonId: "95UEQHJTXKS56" }).render("#paypal-container-95UEQHJTXKS56");
        }
      }
    };

    renderButtons();
    const interval = setInterval(() => {
      if ((window as any).paypal) {
        renderButtons();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* Header Profile Card */}
      <div className={`p-8 rounded-[3rem] shadow-xl border relative overflow-hidden ${cardBg}`}>
         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative group cursor-pointer" onClick={onEdit}>
               <div className={`w-32 h-32 rounded-full overflow-hidden border-4 shadow-2xl ${isDark ? 'border-cyan-500/20' : 'border-stone-100'}`}>
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
               </div>
               <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fas fa-camera text-white text-2xl"></i>
               </div>
               {profile.membershipTier === 'Free' && (
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-md whitespace-nowrap z-20 group/spark cursor-help">
                    ⚡ {profile.isAdmin ? '∞' : (profile.sparksBalance || 0)} Sparks
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover/spark:block w-32 p-2 bg-black/90 text-white text-[9px] text-center rounded-lg shadow-xl z-50 whitespace-normal">
                      Toon Headimage: 20 ⚡
                    </div>
                 </div>
               )}
               {profile.membershipTier !== 'Free' && (
                 <div className="absolute bottom-0 right-0 bg-yellow-400 text-yellow-900 w-10 h-10 flex items-center justify-center rounded-full border-4 border-white shadow-lg text-lg" title="Premium Member">
                    <i className="fas fa-crown"></i>
                 </div>
               )}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
               <div>
                 <h2 className={`text-3xl font-black ${textColor} tracking-tight`}>{profile.name}</h2>
                 <p className={`text-xs font-bold uppercase tracking-widest ${subTextColor} mt-1`}>
                   {profile.location || 'No Home Court Set'}
                 </p>
                 {profile.playerTag && (
                   <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-stone-100 text-stone-500'}`}>
                       License: {profile.playerTag}
                     </span>
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(profile.playerTag || '');
                         alert('License Number copied!');
                       }}
                       className={`text-[10px] hover:opacity-70 transition-opacity ${isDark ? 'text-cyan-400' : 'text-stone-400'}`}
                       title="Copy License Number"
                     >
                       <i className="fas fa-copy"></i>
                     </button>
                   </div>
                 )}
               </div>
               
               <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isDark ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400' : 'bg-stone-50 border-stone-200 text-stone-500'}`}>
                    {profile.skillGroup}
                  </span>
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isDark ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400' : 'bg-stone-50 border-stone-200 text-stone-500'}`}>
                    DUPR: {profile.duprRank.toFixed(2)}
                  </span>
               </div>
            </div>

            <button 
              onClick={onEdit} 
              className={`p-4 rounded-2xl border-2 transition-all group ${isDark ? 'border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400' : 'border-stone-100 hover:border-lime-400 hover:bg-lime-50 text-stone-400 hover:text-green-900'}`}
            >
               <i className="fas fa-pencil-alt text-lg"></i>
            </button>
         </div>
      </div>

      {/* Membership Card */}
      <div className={`p-8 rounded-[2.5rem] shadow-lg border flex flex-col justify-between relative overflow-hidden ${cardBg}`}>
        {/* Background Decoration */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 ${profile.membershipTier === 'Elite' ? 'bg-yellow-400' : profile.membershipTier === 'Pro' ? 'bg-lime-400' : 'bg-stone-400'}`}></div>

        <div className="relative z-10">
            <span className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${subTextColor}`}>Current Plan</span>
            <h3 className={`text-3xl font-black uppercase mb-1 ${profile.membershipTier === 'Elite' ? 'text-yellow-500' : profile.membershipTier === 'Pro' ? 'text-lime-500' : textColor}`}>
                {profile.membershipTier === 'Free' ? 'The Dinker' : profile.membershipTier === 'Pro' ? 'The Banger' : profile.membershipTier === 'Elite' ? 'Kitchen King' : profile.membershipTier}
            </h3>
            <p className={`text-xs font-bold ${subTextColor}`}>
                {profile.membershipTier === 'Free' ? 'Basic Access' : 'Billed Monthly'}
            </p>
        </div>

        <div className="mt-8 relative z-10">
            <button 
                onClick={onUpgrade} 
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all bg-green-900 text-white hover:bg-green-800 hover:scale-[1.02]`}
            >
                {profile.membershipTier === 'Free' ? 'Upgrade Plan' : 'Change Plan'}
            </button>
        </div>
      </div>

      {/* Sparks Wallet Card */}
      <div className={`p-8 rounded-[2.5rem] shadow-lg border flex flex-col justify-between relative overflow-hidden ${cardBg}`}>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <span className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${subTextColor}`}>Sparks Wallet</span>
                <h3 className={`text-3xl font-black uppercase mb-1 text-yellow-500 flex items-center gap-2`}>
                    <i className="fas fa-bolt"></i> {profile.isAdmin ? '∞' : (profile.sparksBalance || 0)}
                </h3>
                <p className={`text-xs font-bold ${subTextColor} max-w-[200px]`}>
                    Pay-as-you-go credits for Premium AI features.
                </p>
            </div>
            <div className="relative group cursor-help">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-cyan-400' : 'bg-stone-100 text-stone-400'}`}>
                    <i className="fas fa-info"></i>
                </div>
                <div className={`absolute right-0 top-10 w-64 p-4 rounded-2xl shadow-xl text-xs z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all ${isDark ? 'bg-cyan-950 border border-cyan-800 text-cyan-100' : 'bg-white border border-stone-200 text-stone-600'}`}>
                    <strong>What are Sparks?</strong><br/>
                    Sparks are one-time purchase credits used for AI features. They are non-refundable and do not expire.<br/><br/>
                    <strong>Costs:</strong><br/>
                    • Toon Headimage: 20 ⚡<br/>
                    • AI Scan: 50 ⚡<br/>
                    • Missing Scores (10): 50 ⚡
                </div>
            </div>
        </div>

        <div className="mt-6 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border-2 text-center ${isDark ? 'border-cyan-500/30 bg-cyan-900/10' : 'border-stone-200 bg-white'}`}>
                <div id="paypal-container-25CKXBFPAX4UU" className="w-full"></div>
            </div>
            <div className={`p-4 rounded-xl border-2 text-center ${isDark ? 'border-cyan-500/30 bg-cyan-900/10' : 'border-stone-200 bg-white'}`}>
                <div id="paypal-container-MWJP5QGSYZBGJ" className="w-full"></div>
            </div>
            <div className={`p-4 rounded-xl border-2 text-center ${isDark ? 'border-cyan-500/30 bg-cyan-900/10' : 'border-stone-200 bg-white'}`}>
                <div id="paypal-container-95UEQHJTXKS56" className="w-full"></div>
            </div>
        </div>

        <div className={`mt-6 p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
            <div>
                <span className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-cyan-400' : 'text-yellow-800'}`}>Invite a Friend</span>
                <span className={`block text-xs font-bold ${isDark ? 'text-cyan-100' : 'text-yellow-900/70'}`}>Get 10 ⚡ when they sign up</span>
            </div>
            <button 
                onClick={() => {
                  navigator.clipboard.writeText(profile.playerTag || '');
                  setShowShareModal(true);
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-cyan-500 text-cyan-950' : 'bg-yellow-400 text-yellow-900'}`}
            >
                Share
            </button>
        </div>
      </div>

      {/* MEMBER PRIVILEGES GRID */}
      <div className="space-y-4">
         <h4 className={`text-[10px] font-black uppercase tracking-widest ml-2 ${subTextColor}`}>Member Privileges</h4>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* 1. Multi-Court Radar */}
            <div 
              onClick={() => handlePremiumClick("Multi-Court Radar")}
              className={`p-4 rounded-3xl border flex flex-col items-center text-center gap-3 cursor-pointer hover:scale-[1.02] transition-all group ${isFree ? (isDark ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100') : (isDark ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-lime-50 border-lime-200')}`}
            >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${isFree ? 'bg-stone-200 text-stone-400' : 'bg-lime-400 text-green-900'}`}>
                  <i className="fas fa-location-dot"></i>
                  {isFree && <div className="absolute -top-1 -right-1 bg-stone-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-stone-50"><i className="fas fa-lock"></i></div>}
               </div>
               <div className="space-y-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest block ${textColor}`}>Locations</span>
                  <span className={`text-[8px] font-bold block ${isFree ? 'text-stone-400' : 'text-lime-600'}`}>{isFree ? '1 Court Only' : 'Multi-Court'}</span>
               </div>
            </div>

            {/* 2. Strict Skill Sync */}
            <div 
              onClick={() => handlePremiumClick("Strict Skill Sync")}
              className={`p-4 rounded-3xl border flex flex-col items-center text-center gap-3 cursor-pointer hover:scale-[1.02] transition-all group ${isFree ? (isDark ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100') : (isDark ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-lime-50 border-lime-200')}`}
            >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${isFree ? 'bg-stone-200 text-stone-400' : 'bg-lime-400 text-green-900'}`}>
                  <i className="fas fa-sliders"></i>
                  {isFree && <div className="absolute -top-1 -right-1 bg-stone-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-stone-50"><i className="fas fa-lock"></i></div>}
               </div>
               <div className="space-y-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest block ${textColor}`}>Match Filter</span>
                  <span className={`text-[8px] font-bold block ${isFree ? 'text-stone-400' : 'text-lime-600'}`}>{isFree ? 'Flexible' : 'Strict Mode'}</span>
               </div>
            </div>

            {/* 3. AI Analysis */}
            <div 
              onClick={() => handlePremiumClick("Monthly AI Analysis")}
              className={`p-4 rounded-3xl border flex flex-col items-center text-center gap-3 cursor-pointer hover:scale-[1.02] transition-all group ${isFree ? (isDark ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100') : (isDark ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-lime-50 border-lime-200')}`}
            >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${isFree ? 'bg-stone-200 text-stone-400' : 'bg-lime-400 text-green-900'}`}>
                  <i className="fas fa-robot"></i>
                  {isFree && <div className="absolute -top-1 -right-1 bg-stone-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-stone-50"><i className="fas fa-lock"></i></div>}
               </div>
               <div className="space-y-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest block ${textColor}`}>AI Coach</span>
                  <span className={`text-[8px] font-bold block ${isFree ? 'text-stone-400' : 'text-lime-600'}`}>{isFree ? '1x Lifetime' : 'Monthly Scans'}</span>
               </div>
            </div>

            {/* 4. Reward Redemption */}
            <div 
              onClick={() => handlePremiumClick("Integrity Rewards")}
              className={`p-4 rounded-3xl border flex flex-col items-center text-center gap-3 cursor-pointer hover:scale-[1.02] transition-all group ${isFree ? (isDark ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100') : (isDark ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-yellow-100 border-yellow-200')}`}
            >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${isFree ? 'bg-stone-200 text-stone-400' : 'bg-yellow-400 text-yellow-900'}`}>
                  <i className="fas fa-gift"></i>
                  {isFree && <div className="absolute -top-1 -right-1 bg-stone-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-stone-50"><i className="fas fa-lock"></i></div>}
               </div>
               <div className="space-y-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest block ${textColor}`}>Rewards</span>
                  <span className={`text-[8px] font-bold block ${isFree ? 'text-stone-400' : 'text-yellow-600'}`}>{isFree ? 'Locked' : 'Eligible'}</span>
               </div>
            </div>

         </div>
      </div>

      {/* Account Details List */}
      <div className={`p-6 rounded-[2.5rem] shadow-lg border ${cardBg}`}>
         <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 ml-2 ${subTextColor}`}>Account Settings</h4>
         
         <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-stone-50'}`}>
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 text-cyan-400' : 'bg-white text-stone-400'}`}>
                     <i className="fas fa-envelope"></i>
                  </div>
                  <div>
                     <span className={`block text-[9px] font-black uppercase tracking-widest ${subTextColor}`}>Email / Contact</span>
                     <span className={`block text-xs font-bold ${textColor}`}>{profile.email || profile.contactInfo || 'Not set'}</span>
                  </div>
               </div>
               <button onClick={onEdit} className={`${subTextColor} hover:${accentColor} transition-colors`}><i className="fas fa-pencil"></i></button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer group hover:bg-stone-100 transition-colors ${isDark ? 'bg-black/20 hover:bg-black/30' : 'bg-stone-50'}`} onClick={() => handlePremiumClick("Multi-Court Management")}>
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 text-cyan-400' : 'bg-white text-stone-400'}`}>
                     <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                     <span className={`block text-[9px] font-black uppercase tracking-widest ${subTextColor}`}>Primary Location</span>
                     <span className={`block text-xs font-bold ${textColor}`}>
                        {profile.locations[0] || 'Not set'} 
                        {profile.locations.length > 1 && <span className="text-stone-400 font-normal"> +{profile.locations.length - 1} more</span>}
                     </span>
                  </div>
               </div>
               <button className={`${isFree ? 'text-stone-300' : subTextColor} group-hover:${accentColor} transition-colors`}>
                  {isFree ? <i className="fas fa-lock"></i> : <i className="fas fa-chevron-right"></i>}
               </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer group hover:bg-stone-100 transition-colors ${isDark ? 'bg-black/20 hover:bg-black/30' : 'bg-stone-50'}`} onClick={() => handlePremiumClick("Advanced Matchmaking Preferences")}>
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 text-cyan-400' : 'bg-white text-stone-400'}`}>
                     <i className="fas fa-sliders"></i>
                  </div>
                  <div>
                     <span className={`block text-[9px] font-black uppercase tracking-widest ${subTextColor}`}>Match Preferences</span>
                     <span className={`block text-xs font-bold ${textColor}`}>
                        {isFree ? 'Basic' : `${profile.skillMatchMode} • ${profile.isScheduleFlexible ? 'Flexible' : 'Fixed'}`}
                     </span>
                  </div>
               </div>
               <button className={`${isFree ? 'text-stone-300' : subTextColor} group-hover:${accentColor} transition-colors`}>
                  {isFree ? <i className="fas fa-lock"></i> : <i className="fas fa-chevron-right"></i>}
               </button>
            </div>
         </div>
      </div>

      {/* Logout Button */}
      <button 
        onClick={() => setShowUnsubscribeModal(true)}
        className={`w-full py-5 rounded-[2rem] border-2 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group ${isDark ? 'border-rose-900/50 text-rose-400 hover:bg-rose-900/20' : 'border-rose-100 text-rose-400 hover:bg-rose-50 hover:border-rose-200'}`}
      >
         <i className="fas fa-sign-out-alt group-hover:-translate-x-1 transition-transform"></i> Unsubscribe
      </button>

      {/* Modals */}
      {showShareModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-cyan-950 border border-cyan-800' : 'bg-white border border-stone-100'}`}>
            <div className="w-16 h-16 bg-yellow-400 text-yellow-900 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto shadow-lg">
              <i className="fas fa-id-card"></i>
            </div>
            <h3 className={`text-xl font-black text-center mb-2 ${textColor}`}>License Copied!</h3>
            <p className={`text-sm text-center mb-8 ${subTextColor}`}>
              Your License Number <strong>{profile.playerTag}</strong> has been copied! Send it to a friend and tell them to enter it during registration so you can get 10 Sparks!
            </p>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full py-4 rounded-2xl bg-stone-100 text-stone-600 font-black uppercase tracking-widest text-[10px] hover:bg-stone-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showUnsubscribeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-cyan-950 border border-cyan-800' : 'bg-white border border-stone-100'}`}>
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto shadow-lg">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <h3 className={`text-xl font-black text-center mb-2 text-rose-600`}>Warning</h3>
            <p className={`text-sm text-center mb-8 ${subTextColor}`}>
              If you unsubscribe, you will <strong className="text-rose-500">lose all your Sparks</strong> and you <strong className="text-rose-500">cannot register as a free member again</strong>. Are you sure you want to unsubscribe?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowUnsubscribeModal(false)}
                className="flex-1 py-4 rounded-2xl bg-stone-100 text-stone-600 font-black uppercase tracking-widest text-[10px] hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUnsubscribe}
                className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/30"
              >
                Unsubscribe
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-black text-stone-800 mb-4 whitespace-pre-line">{confirmModal.message}</h3>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyAccount;
