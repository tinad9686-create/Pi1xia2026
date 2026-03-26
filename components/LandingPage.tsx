
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import MilestoneCard from './MilestoneCard';
import { SkillGroup } from '../types';
interface Props {
  onLaunchApp: () => void;
  onAdminLogin: () => void;
  onWatchDemo: () => void;
  onViewLegal: (tab: 'terms' | 'privacy' | 'waiver') => void;
}

const RewardBadge: React.FC<{ text: string; icon: string; color: string }> = ({ text, icon, color }) => (
  <div className={`absolute -top-10 -right-10 md:-right-16 bg-white p-2 pr-4 rounded-xl shadow-xl border-2 border-${color}-100 flex items-center gap-2 animate-bounce`} style={{ animationDuration: '3s' }}>
    <div className={`w-8 h-8 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div>
      <span className="block text-[8px] font-black uppercase text-stone-400">Unlock Reward</span>
      <span className={`block text-[10px] font-black text-${color}-600 leading-none`}>{text}</span>
    </div>
  </div>
);

const MysteryStop: React.FC<{ left: string; top: string; delay: string }> = ({ left, top, delay }) => (
  <div 
    className="absolute z-0 w-8 h-8 md:w-10 md:h-10 bg-[#F4E185] rounded-full border-4 border-[#C4A45C] border-dashed flex items-center justify-center shadow-lg animate-bounce hover:scale-125 transition-transform cursor-help group" 
    style={{ left, top, animationDelay: delay }}
  >
     <i className="fas fa-question text-[#91783F] text-xs md:text-sm"></i>
     <div className="absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap bg-stone-900/90 backdrop-blur-sm text-white text-[9px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/20 z-50">
        Mystery Gift <i className="fas fa-gift ml-1 text-yellow-400"></i>
     </div>
  </div>
);

const ContactSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    const handlePrefill = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setFormData(prev => ({ ...prev, message: customEvent.detail }));
      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('prefill-contact', handlePrefill);
    return () => window.removeEventListener('prefill-contact', handlePrefill);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Pi1Xia Inquiry from ${formData.name}`;
    const body = `Name: ${formData.name}%0D%0AEmail: ${formData.email}%0D%0A%0D%0AMessage:%0D%0A${formData.message}`;
    window.location.href = `mailto:ascepd.pi1xia@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <section id="contact-section" className="py-20 px-4 relative z-10 bg-white border-t border-stone-100">
      <div className="max-w-4xl mx-auto bg-stone-50 rounded-[3rem] p-8 md:p-12 shadow-xl border border-stone-200 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-lime-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-100 rounded-full blur-3xl -ml-10 -mb-10 opacity-60"></div>

        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-lime-600 bg-lime-50 px-3 py-1 rounded-full mb-4 inline-block">Support</span>
            <h2 className="text-2xl md:text-4xl font-black text-stone-800 mb-4">Questions? <br/>Let's Chat.</h2>
            <p className="text-stone-500 font-medium text-xs md:text-sm leading-relaxed mb-8">
              Whether you're a club director, a coach, or just getting started, we're here to help you get the most out of Pi1Xia.
            </p>
            
            <div className="flex items-center gap-4 text-stone-600 mb-2">
              <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 shadow-sm">
                <i className="fas fa-envelope"></i>
              </div>
              <div>
                <span className="block text-[9px] font-black uppercase tracking-widest text-stone-400">Email Us Directly</span>
                <a href="mailto:ascepd.pi1xia@gmail.com" className="text-sm font-bold hover:text-lime-600 transition-colors">ascepd.pi1xia@gmail.com</a>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] shadow-lg border border-stone-100 space-y-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 ml-2">Your Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-lime-400 focus:bg-white transition-all text-xs font-bold"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 ml-2">Email Address</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-lime-400 focus:bg-white transition-all text-xs font-bold"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 ml-2">Message</label>
              <textarea 
                required
                rows={3}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-lime-400 focus:bg-white transition-all text-xs font-bold resize-none"
                placeholder="How can we help?"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-stone-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 transition-transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2">
              Send Message <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

const GameMapSection = () => {
  return (
    <section className="py-20 bg-[#F0F8FF] relative overflow-hidden border-y border-stone-200">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">Gamified Progression</span>
           <h2 className="text-2xl md:text-6xl font-black text-stone-800 mt-4 mb-4">Climb the Ranks</h2>
           <p className="text-stone-500 font-bold max-w-2xl mx-auto text-xs md:text-base">
             Play matches, maintain integrity, and unlock real-world rewards. Follow the path to mastery.
           </p>
        </div>

        {/* MAP CONTAINER - Reduced min-height for mobile from 1000px to 700px */}
        <div className="relative w-full min-h-[700px] md:min-h-[600px] bg-[#4FB4C8] rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden border-8 border-white/50 select-none group perspective-1000">
           
           {/* Water Texture */}
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
           
           {/* DECORATIONS */}
           <i className="fas fa-water text-6xl text-white/20 absolute top-20 left-20 animate-pulse"></i>
           <i className="fas fa-water text-4xl text-white/20 absolute bottom-40 right-40 animate-pulse" style={{ animationDelay: '1s' }}></i>
           <i className="fas fa-ship text-5xl text-stone-800/20 absolute top-1/3 right-20 transform -rotate-12"></i>
           <i className="fas fa-compass text-9xl text-stone-900/5 absolute bottom-10 left-10 fa-spin" style={{ animationDuration: '30s' }}></i>
           
           {/* Octopus */}
           <div className="absolute bottom-[10%] left-[20%] text-[#E76F51] opacity-80 hidden md:block">
              <i className="fas fa-octopus-deploy text-6xl animate-bounce" style={{ animationDuration: '4s' }}></i>
           </div>

           {/* DESKTOP PATH (SVG) - Horizontal Wave */}
           <svg className="absolute inset-0 w-full h-full hidden md:block pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M 5 60 C 20 60, 20 20, 35 20 S 50 70, 65 70 S 80 20, 95 20" 
                fill="none" 
                stroke="white" 
                strokeWidth="0.8" 
                strokeDasharray="3 3" 
                className="drop-shadow-lg"
              />
           </svg>

           {/* MOBILE PATH (Vertical Dashed) */}
           <div className="absolute top-0 bottom-0 left-1/2 w-1 border-l-4 border-dashed border-white/40 -translate-x-1/2 md:hidden"></div>

           {/* --- MYSTERY STOPS --- */}
           {/* Horizontal positioning for Desktop, default fallback for mobile logic handled via media queries or generic positioning */}
           <div className="hidden md:block">
             <MysteryStop left="18%" top="35%" delay="0s" />
             <MysteryStop left="48%" top="45%" delay="1s" />
             <MysteryStop left="78%" top="35%" delay="2s" />
           </div>
           
           {/* Mobile Mystery Stops */}
           <div className="md:hidden">
             <MysteryStop left="20%" top="25%" delay="0s" />
             <MysteryStop left="80%" top="50%" delay="1s" />
             <MysteryStop left="20%" top="75%" delay="2s" />
           </div>

           {/* --- MAIN STATIONS --- */}
           {/* Note: Cards are scaled down (scale-[0.5]) to look like markers, and scale up on hover */}

           {/* 1. START */}
           <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[5%] top-[5%] md:top-[50%] z-10 transition-all duration-500 transform scale-[0.5] hover:scale-100 hover:z-50 origin-center cursor-pointer group/station">
              <div className="relative">
                 {/* Island Blob */}
                 <svg viewBox="0 0 200 200" className="absolute -bottom-16 -left-16 w-[300px] h-[300px] text-[#E4D5CE] fill-current -z-10 opacity-90"><path d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,87.6,-3.5C85.1,11,77.4,24.6,68.6,37.1C59.8,49.6,49.9,61,38.2,68.3C26.5,75.6,13,78.8,-0.2,79.1C-13.4,79.5,-27.1,76.9,-39.3,70.3C-51.5,63.7,-62.2,53.1,-70.8,40.7C-79.4,28.3,-85.9,14.1,-86.3,-0.5C-86.7,-15.1,-81,-30.2,-71.4,-42.6C-61.8,-55,-48.3,-64.7,-34.5,-72.1C-20.7,-79.5,-6.6,-84.6,3.9,-89.9L14.4,-95.2" transform="translate(100 100)" /></svg>
                 <i className="fas fa-umbrella-beach absolute -bottom-4 -left-4 text-3xl text-red-400 transform -rotate-12 group-hover/station:scale-125 transition-transform"></i>
                 
                 <div className="relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg opacity-100 group-hover/station:opacity-0 transition-opacity whitespace-nowrap">
                       Start Here
                    </div>
                    <MilestoneCard 
                      theme="sunny"
                      name="Newbie Nick"
                      image="https://api.dicebear.com/7.x/avataaars/svg?seed=Nick&mouth=smile"
                      rankTitle="Rookie Rally"
                      rankIcon="fa-table-tennis-paddle-ball"
                      score={15}
                      winRate={45}
                      aiInsight="Great hustle! Work on your kitchen line positioning."
                      momentum={[10, 20, 15, 25, 30, 35]}
                    />
                 </div>
                 <div className="opacity-0 group-hover/station:opacity-100 transition-opacity duration-500">
                    <RewardBadge text="Free Profile" icon="fa-id-badge" color="orange" />
                 </div>
              </div>
           </div>

           {/* 2. MID 1 */}
           <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[32%] top-[30%] md:top-[15%] z-10 transition-all duration-500 transform scale-[0.5] hover:scale-100 hover:z-50 origin-center cursor-pointer group/station">
              <div className="relative">
                 <svg viewBox="0 0 200 200" className="absolute -bottom-16 -left-16 w-[320px] h-[320px] text-[#C4A45C] fill-current -z-10 opacity-90"><path d="M41.4,-72.1C53.7,-64.4,63.9,-53.2,72.4,-40.8C80.9,-28.4,87.7,-14.8,86.4,-1.8C85.1,11.3,75.7,23.7,66.3,35.4C56.9,47.1,47.5,58,36.3,65.3C25.1,72.6,12.1,76.3,-0.6,77.3C-13.3,78.3,-26.9,76.6,-39.3,70.4C-51.7,64.2,-62.9,53.5,-70.7,41C-78.5,28.5,-82.9,14.2,-81.9,0.7C-80.9,-12.8,-74.5,-25.6,-65.4,-36.8C-56.3,-48,-44.5,-57.6,-32.1,-65.2C-19.7,-72.8,-6.7,-78.4,5.4,-86.9L17.5,-95.4" transform="translate(100 100)" /></svg>
                 <i className="fas fa-tree absolute -bottom-6 -right-6 text-4xl text-green-700 transform rotate-6 group-hover/station:scale-125 transition-transform"></i>
                 
                 <div className="relative">
                    <MilestoneCard 
                      theme="blue"
                      name="Volley Val"
                      image="https://api.dicebear.com/7.x/avataaars/svg?seed=Val&mouth=smile"
                      rankTitle="Kitchen King"
                      rankIcon="fa-crown"
                      score={22}
                      winRate={60}
                      aiInsight="Solid dinking. Try adding topspin to your serve."
                      momentum={[30, 35, 40, 38, 45, 50]}
                    />
                 </div>
                 <div className="opacity-0 group-hover/station:opacity-100 transition-opacity duration-500">
                    <RewardBadge text="10% Off Gear" icon="fa-shirt" color="blue" />
                 </div>
              </div>
           </div>

           {/* 3. MID 2 */}
           <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[60%] top-[55%] md:top-[60%] z-10 transition-all duration-500 transform scale-[0.5] hover:scale-100 hover:z-50 origin-center cursor-pointer group/station">
              <div className="relative">
                 <svg viewBox="0 0 200 200" className="absolute -bottom-16 -left-16 w-[300px] h-[300px] text-[#8EA3A6] fill-current -z-10 opacity-90"><path d="M45.7,-77.3C58.9,-69.3,69.1,-56.3,76.3,-42.2C83.5,-28.1,87.7,-12.9,86.6,1.9C85.5,16.7,79.1,31.1,70.1,43.3C61.1,55.5,49.5,65.5,36.5,72.4C23.5,79.3,9.1,83.1,-4.2,89.6C-17.5,96.1,-29.7,105.3,-40.7,103.1C-51.7,100.9,-61.5,87.3,-69.3,73.5C-77.1,59.7,-82.9,45.7,-85.4,31.2C-87.9,16.7,-87.1,1.7,-83.4,-11.8C-79.7,-25.3,-73.1,-37.3,-63.6,-47.4C-54.1,-57.5,-41.7,-65.7,-29.2,-71.4C-16.7,-77.1,-4.1,-80.3,7.9,-92.5L19.9,-104.7" transform="translate(100 100)" /></svg>
                 <i className="fas fa-volcano absolute -top-8 left-0 text-4xl text-stone-600 group-hover/station:scale-125 transition-transform"></i>
                 
                 <div className="relative">
                    <MilestoneCard 
                      theme="rose"
                      name="Smash Sarah"
                      image="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&mouth=smile"
                      rankTitle="Momentum Master"
                      rankIcon="fa-fire"
                      score={28}
                      winRate={75}
                      aiInsight="Dominant net play. Excellent anticipation."
                      momentum={[50, 60, 65, 70, 75, 80]}
                    />
                 </div>
                 <div className="opacity-0 group-hover/station:opacity-100 transition-opacity duration-500">
                    <RewardBadge text="Pro Coaching" icon="fa-graduation-cap" color="rose" />
                 </div>
              </div>
           </div>

           {/* 4. TREASURE */}
           <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[90%] top-[80%] md:top-[15%] z-10 transition-all duration-500 transform scale-[0.5] hover:scale-100 hover:z-50 origin-center cursor-pointer group/station">
              <div className="relative">
                 <svg viewBox="0 0 200 200" className="absolute -bottom-20 -left-20 w-[350px] h-[350px] text-[#F4E185] fill-current -z-10 opacity-90"><path d="M38.1,-64.4C49.5,-59.5,59.1,-50.2,67.6,-39.3C76.1,-28.4,83.5,-15.9,82.4,-3.9C81.3,8.1,71.7,19.6,63.1,30.3C54.5,41,46.9,50.9,37.3,58.6C27.7,66.3,16.1,71.8,3.9,73.1C-8.3,74.4,-21.1,71.5,-32.7,65.3C-44.3,59.1,-54.7,49.6,-63.3,38.3C-71.9,27,-78.7,13.9,-78.6,0.9C-78.5,-12.1,-71.5,-25,-62.3,-35.6C-53.1,-46.2,-41.7,-54.5,-29.9,-59.2C-18.1,-63.9,-5.9,-65,5.8,-74.1L17.5,-83.2" transform="translate(100 100)" /></svg>
                 
                 {/* Treasure Chest */}
                 <div className="absolute -top-12 right-0 text-5xl text-yellow-600 animate-bounce drop-shadow-xl z-20 group-hover/station:scale-125 transition-transform">
                    <i className="fas fa-treasure-chest"></i>
                    <div className="absolute -top-2 -right-2 text-yellow-400 animate-ping opacity-75"><i className="fas fa-star text-sm"></i></div>
                 </div>

                 <div className="relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg opacity-100 group-hover/station:opacity-0 transition-opacity whitespace-nowrap animate-pulse">
                       Ultimate Goal
                    </div>
                    <MilestoneCard 
                      theme="dark"
                      name="Pro Pete"
                      image="https://api.dicebear.com/7.x/avataaars/svg?seed=Pete&mouth=smile"
                      rankTitle="Club Champion"
                      rankIcon="fa-trophy"
                      score={30}
                      winRate={92}
                      aiInsight="Flawless technique. Ready for tournament play."
                      momentum={[80, 85, 88, 90, 92, 95]}
                    />
                 </div>
                 <div className="opacity-0 group-hover/station:opacity-100 transition-opacity duration-500">
                    <RewardBadge text="Free Month" icon="fa-gem" color="purple" />
                 </div>
              </div>
           </div>

        </div>
      </div>
    </section>
  );
};

const LandingPage: React.FC<Props> = ({ onLaunchApp, onAdminLogin, onWatchDemo, onViewLegal }) => {
  return (
    <div className="min-h-screen bg-[#F2E9E1] font-['Plus_Jakarta_Sans'] text-[#4A4238] overflow-x-hidden selection:bg-lime-400 selection:text-green-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6 max-w-7xl mx-auto">
        <Logo showText theme="sunny" className="scale-90 md:scale-100 origin-left" />
        <div className="flex items-center gap-6">
          <button onClick={onLaunchApp} className="bg-green-900 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-green-800 transition-transform hover:scale-105">
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-12 animate-in slide-in-from-top-4 duration-700 px-4">
        <h1 className="text-4xl md:text-7xl font-black text-stone-400 uppercase tracking-tighter leading-[0.9]">
          DON'T JUST<br/>PLAY.
        </h1>
        <h1 className="text-4xl md:text-7xl font-black text-lime-600 uppercase tracking-tighter leading-[0.9] mt-2">
          OUTSMART<br/>the Game.
        </h1>
      </div>

          {/* NEW MANIFESTO SECTION (Replaced Cards) */}
          <div className="max-w-4xl mx-auto text-left bg-white/80 backdrop-blur-sm p-6 md:p-14 rounded-[2rem] md:rounded-[3rem] border border-white shadow-xl animate-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
             {/* Decorative Background Blur */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-200 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
             
             <div className="relative z-10 space-y-8 md:space-y-12">
                {/* Single Paragraph Manifesto */}
                <div className="text-left">
                   <p className="text-xs md:text-3xl font-bold text-stone-400 leading-tight mb-4 md:mb-8">
                     Between <span className="text-stone-500">school</span>, <span className="text-stone-500">work</span>, and <span className="text-stone-500">family</span>, finding time for fitness is hard.
                   </p>
                   
                   <h2 className="text-xl md:text-5xl font-black text-stone-800 tracking-tighter leading-[0.9] mb-6 md:mb-10">
                     We make it <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-green-600">easy.</span>
                   </h2>

                   <p className="text-xs md:text-3xl font-bold text-stone-500 leading-relaxed">
                     We connect you to local players with <span title="Bonsor Burnaby court (Public outdoor) and Jack Crosby Sports Box Burnaby (Public Indoor) open games. please check the hot session and your timetable..." className="inline-block px-1 decoration-2 md:decoration-4 decoration-blue-300 underline underline-offset-2 text-stone-700 hover:text-blue-600 transition-colors cursor-help">after-work games</span>, <span title="Bonsor Burnaby court (Public outdoor) and Jack Crosby Sports Box Burnaby (Public Indoor) open games. please check the hot session and your timetable..." className="inline-block px-1 decoration-2 md:decoration-4 decoration-orange-300 underline underline-offset-2 text-stone-700 hover:text-orange-600 transition-colors cursor-help">weekend mixers</span>, and <span title="Bonsor Burnaby court (Public outdoor) and Jack Crosby Sports Box Burnaby (Public Indoor) open games. please check the hot session and your timetable..." className="inline-block px-1 decoration-2 md:decoration-4 decoration-rose-300 underline underline-offset-2 text-stone-700 hover:text-rose-600 transition-colors cursor-help">"open play" nights</span> designed for the <span className="bg-stone-800 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-lg md:rounded-xl transform -rotate-1 inline-block text-xs md:text-2xl font-black uppercase tracking-widest shadow-lg ml-1 hover:rotate-1 transition-transform">9-to-5 hustle</span>.
                   </p>
                   
                   <div className="mt-6 flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 items-start md:items-center animate-in slide-in-from-bottom-4 duration-700 delay-300">
                     <button 
                       onClick={() => window.dispatchEvent(new CustomEvent('prefill-contact', { detail: 'I am interested in the upcoming Downtown Vancouver Mixed game!' }))}
                       className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest shadow-sm hover:bg-cyan-100 hover:scale-105 transition-all text-left"
                     >
                       <i className="fas fa-city animate-pulse"></i> Downtown Vancouver Mixed game opening soon
                     </button>
                     <button 
                       onClick={() => window.dispatchEvent(new CustomEvent('prefill-contact', { detail: 'I am interested in becoming a game organizer or coach!' }))}
                       className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest shadow-sm hover:bg-amber-100 hover:scale-105 transition-all text-left"
                     >
                       <i className="fas fa-bullhorn"></i> Looking for game organizers & coaches
                     </button>
                     <button 
                       onClick={() => window.dispatchEvent(new CustomEvent('prefill-contact', { detail: 'I am interested in Pi1Xia coming to my local court/location!' }))}
                       className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest shadow-sm hover:bg-purple-100 hover:scale-105 transition-all text-left"
                     >
                       <i className="fas fa-map-marker-alt"></i> Interested in other locations
                     </button>
                   </div>
                </div>

                <div className="py-6 md:py-8 border-t border-b border-stone-100 my-6 md:my-8">
                  <h4 className="text-base md:text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-stone-800 to-stone-500 uppercase tracking-tight leading-tight">We handle the 'people' part, you just handle the 'pickle' part.</h4>
                </div>

                <div className="space-y-4 md:space-y-6 text-stone-600 leading-relaxed text-xs md:text-lg font-medium">
                  <p>
                    Whether you are an <span className="font-black text-stone-800 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">introvert</span> who just wants a high-level training session without the small talk, or a <span className="font-black text-stone-800 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">social butterfly</span> looking for a fun weekend rally, <strong>Pi1Xia</strong> ensures you never have to "stretch" yourself again.
                  </p>
                  <p>
                    Our AI-powered platform matches you with players who align with your <span className="font-black text-lime-600 bg-lime-50 px-2 py-0.5 rounded-lg">exact Time, skill level, and goals</span>.
                  </p>
                  
                  {/* REDESIGNED PAIN POINT BANNERS - Square Stickers Row */}
                  <div className="grid grid-cols-3 gap-2 md:gap-6 mt-6 md:mt-10">
                    {/* Card 1 - Terracotta (Social Anxiety) */}
                    <div className="aspect-square relative group bg-[#D98B79]/10 p-2 md:p-5 rounded-xl md:rounded-[2rem] border-2 border-[#D98B79]/20 shadow-md transform hover:scale-105 transition-all duration-300 hover:-rotate-2 overflow-hidden flex flex-col justify-between">
                      <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 text-[#D98B79] text-4xl md:text-8xl opacity-15 group-hover:opacity-30 transition-opacity rotate-12">
                        <i className="fas fa-heart-crack"></i>
                      </div>
                      <div className="relative z-10">
                         <div className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[7px] md:text-xs font-black uppercase tracking-widest text-[#D98B79] shadow-sm border border-[#D98B79]/20 w-fit">
                           Anxiety?
                         </div>
                      </div>
                      <div className="relative z-10">
                         <span className="block text-[6px] md:text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-0.5 md:mb-1">No more</span>
                         <h4 className="text-xs md:text-5xl font-black text-[#8F4F42] leading-[0.85] tracking-tighter break-words">Awkward <br/>"No's"</h4>
                      </div>
                    </div>

                    {/* Card 2 - Moody Blue (Noise) */}
                    <div className="aspect-square relative group bg-[#8EA3A6]/10 p-2 md:p-5 rounded-xl md:rounded-[2rem] border-2 border-[#8EA3A6]/20 shadow-md transform hover:scale-105 transition-all duration-300 hover:rotate-2 overflow-hidden flex flex-col justify-between">
                      <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 text-[#8EA3A6] text-4xl md:text-8xl opacity-15 group-hover:opacity-30 transition-opacity -rotate-12">
                        <i className="fas fa-bell-slash"></i>
                      </div>
                      <div className="relative z-10">
                         <div className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[7px] md:text-xs font-black uppercase tracking-widest text-[#5E7073] shadow-sm border border-[#8EA3A6]/20 w-fit">
                           Spam?
                         </div>
                      </div>
                      <div className="relative z-10">
                         <span className="block text-[6px] md:text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-0.5 md:mb-1">No more</span>
                         <h4 className="text-xs md:text-5xl font-black text-[#4A595C] leading-[0.85] tracking-tighter break-words">Group <br/>Noise</h4>
                      </div>
                    </div>

                    {/* Card 3 - Ghost Yellow (Time) */}
                    <div className="aspect-square relative group bg-[#C4A45C]/10 p-2 md:p-5 rounded-xl md:rounded-[2rem] border-2 border-[#C4A45C]/20 shadow-md transform hover:scale-105 transition-all duration-300 hover:-rotate-6 overflow-hidden flex flex-col justify-between">
                      <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 text-[#C4A45C] text-4xl md:text-8xl opacity-15 group-hover:opacity-30 transition-opacity rotate-6">
                        <i className="fas fa-hourglass-end"></i>
                      </div>
                      <div className="relative z-10">
                         <div className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-[7px] md:text-xs font-black uppercase tracking-widest text-[#91783F] shadow-sm border border-[#C4A45C]/20 w-fit">
                           Bad Match?
                         </div>
                      </div>
                      <div className="relative z-10">
                         <span className="block text-[6px] md:text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-0.5 md:mb-1">No more</span>
                         <h4 className="text-xs md:text-5xl font-black text-[#756030] leading-[0.85] tracking-tighter break-words">Wasted <br/>Time</h4>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-6 md:pt-8">
                  <p className="text-base md:text-2xl font-black text-stone-800 mb-6 md:mb-8 italic">Experience the game on your terms.</p>
                  <button onClick={onLaunchApp} className="bg-green-900 hover:bg-green-800 text-white text-xs md:text-sm font-black px-8 py-4 md:px-12 md:py-6 rounded-2xl md:rounded-[2rem] uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform flex items-center gap-3 md:gap-4 mx-auto group">
                    Start Your Free Membership <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>
             </div>
          </div>


      <section className="pt-16 md:pt-20 pb-20 md:pb-24 bg-white relative z-20 rounded-[3rem] md:rounded-[4rem] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] border-t border-stone-100 mb-[-4rem]">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* The Solution */}
          <div className="bg-gradient-to-br from-[#8EA3A6] to-[#D98B79] rounded-[2rem] md:rounded-[3rem] p-6 md:p-16 relative overflow-hidden text-white shadow-2xl border border-white/20 mb-12">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4A45C] rounded-full blur-[100px] opacity-30"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E4D5CE] rounded-full blur-[100px] opacity-30"></div>
             
             <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
                <span className="text-white/80 font-black tracking-[0.2em] text-[10px] md:text-xs uppercase mb-2 block">The Pi1Xia Solution</span>
                <h2 className="text-xl md:text-4xl font-black mb-4 md:mb-6">Organized by AI. <br/>Powered by Community.</h2>
                <p className="text-white/90 opacity-90 leading-relaxed font-medium mb-8 md:mb-12 max-w-2xl text-xs md:text-base">
                  We don't just connect players; we engineer the perfect game. Using <strong>Gemini AI</strong>, we verify skills and automate logistics so you just show up and play.
                </p>
                <ul className="grid md:grid-cols-2 gap-4 md:gap-8 text-left mb-8 md:mb-10 w-full">
                  <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-lime-300 text-green-900 flex items-center justify-center text-lg shrink-0">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div>
                        <span className="text-xs font-bold block mb-1">AI-Verified Skill Ratings</span>
                        <span className="text-[10px] opacity-80 leading-relaxed">No more mismatches. Gemini AI analyzes your actual gameplay mechanics.</span>
                      </div>
                  </li>
                  <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-lime-300 text-green-900 flex items-center justify-center text-lg shrink-0">
                        <i className="fas fa-fire"></i>
                      </div>
                      <div>
                        <span className="text-xs font-bold block mb-1">The "Hot Invitation" Engine</span>
                        <span className="text-[10px] opacity-80 leading-relaxed">Fill empty spots instantly. One click broadcasts to compatible locals.</span>
                      </div>
                  </li>
                  <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-lime-300 text-green-900 flex items-center justify-center text-lg shrink-0">
                        <i className="fas fa-calendar-check"></i>
                      </div>
                      <div>
                        <span className="text-xs font-bold block mb-1">3-Click "Set & Forget" Scheduler</span>
                        <span className="text-[10px] opacity-80 leading-relaxed">Visual planning. Click once for Available, twice for Pending, thrice for Confirmed.</span>
                      </div>
                  </li>
                  <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-lime-300 text-green-900 flex items-center justify-center text-lg shrink-0">
                        <i className="fas fa-trophy"></i>
                      </div>
                      <div>
                        <span className="text-xs font-bold block mb-1">Integrity That Pays</span>
                        <span className="text-[10px] opacity-80 leading-relaxed">Reliability earns you free membership. Good sportsmanship pays off.</span>
                      </div>
                  </li>
                </ul>
                <button onClick={onLaunchApp} className="mt-2 bg-white text-[#D98B79] px-8 py-4 md:px-10 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center gap-3 shadow-lg transform hover:scale-105">
                  Get Your Free Membership <i className="fas fa-thumbs-up"></i>
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* NEW CONTACT SECTION */}
      <ContactSection />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 pt-16 md:pt-20 pb-8 px-6 border-t border-stone-800 relative z-0">
        <div className="max-w-6xl mx-auto">
            {/* Stats Row - Strictly Horizontal */}
            <div className="flex flex-row flex-wrap justify-center items-center gap-8 md:gap-16 mb-12 md:mb-16 border-b border-stone-800 pb-12 md:pb-16">
                 <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-stone-800 text-blue-500 flex items-center justify-center text-lg md:text-xl shrink-0">
                       <i className="fas fa-users"></i>
                    </div>
                    <div>
                       <div className="text-2xl md:text-3xl font-black text-white leading-none">1,240+</div>
                       <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-1">Registered Players</div>
                    </div>
                 </div>
                 
                 <div className="w-px h-8 md:h-12 bg-stone-800 hidden sm:block"></div>

                 <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-stone-800 text-orange-500 flex items-center justify-center text-lg md:text-xl shrink-0">
                       <i className="fas fa-calendar-check"></i>
                    </div>
                    <div>
                       <div className="text-2xl md:text-3xl font-black text-white leading-none">85+</div>
                       <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-1">Games Booked</div>
                    </div>
                 </div>

                 <div className="w-px h-8 md:h-12 bg-stone-800 hidden sm:block"></div>

                 <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-stone-800 text-rose-500 flex items-center justify-center text-lg md:text-xl animate-pulse shrink-0">
                       <i className="fas fa-circle-play"></i>
                    </div>
                    <div>
                       <div className="text-2xl md:text-3xl font-black text-white leading-none">15</div>
                       <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-1">Live Games</div>
                    </div>
                 </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-center md:text-left">
                    © 2026 ASCEP Well-being Design. All Rights Reserved.
                </div>
                <button onClick={onAdminLogin} className="text-[9px] font-bold uppercase tracking-widest text-stone-600 hover:text-stone-300 transition-colors flex items-center gap-2">
                    <i className="fas fa-building"></i> Corporate Access
                </button>
              </div>

              <div className="flex gap-6">
                <button onClick={() => onViewLegal('terms')} className="text-[10px] font-bold uppercase hover:text-white transition-colors">Terms</button>
                <button onClick={() => onViewLegal('privacy')} className="text-[10px] font-bold uppercase hover:text-white transition-colors">Privacy</button>
                <button onClick={() => onViewLegal('waiver')} className="text-[10px] font-bold uppercase hover:text-white transition-colors">Waiver</button>
              </div>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors"><i className="fab fa-twitter text-lg md:text-xl"></i></a>
                <a href="#" className="hover:text-white transition-colors"><i className="fab fa-instagram text-lg md:text-xl"></i></a>
                <a href="#" className="hover:text-white transition-colors"><i className="fab fa-tiktok text-lg md:text-xl"></i></a>
              </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
