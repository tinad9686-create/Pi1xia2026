
import React, { useState } from 'react';

type DocType = 'terms' | 'privacy' | 'waiver';

interface Props {
  initialTab?: DocType;
  onClose: () => void;
}

const LegalModal: React.FC<Props> = ({ initialTab = 'terms', onClose }) => {
  const [activeTab, setActiveTab] = useState<DocType>(initialTab);

  const tabs: { id: DocType; label: string; icon: string }[] = [
    { id: 'terms', label: 'Terms of Service', icon: 'fa-file-contract' },
    { id: 'privacy', label: 'Privacy Policy', icon: 'fa-user-shield' },
    { id: 'waiver', label: 'Liability Waiver', icon: 'fa-file-signature' },
  ];

  return (
    <div className="fixed inset-0 z-[150] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <div>
            <h2 className="text-2xl font-black text-stone-800">Legal Center</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pi1xia Technologies Inc.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone-200 text-stone-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-green-900 border-b-4 border-lime-500' 
                  : 'bg-stone-50 text-stone-400 hover:bg-stone-100'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 text-stone-600 leading-relaxed text-sm scrollbar-hide">
          
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-black text-stone-800 mb-4">1. Acceptance of Terms</h3>
              <p>By accessing and using the "Pi1Xia" app (operated by Pi1xia Technologies), you agree to be bound by these Terms. If you disagree with any part of these terms, you may not use our Service.</p>
              
              <h3 className="text-xl font-black text-stone-800 mb-4">2. Subscription & Payments</h3>
              <p>Pi1Xia offers Free, Pro, and Elite subscription tiers. By selecting a paid tier, you authorize us to charge your payment method on a recurring monthly basis. You may cancel at any time via your Profile settings.</p>

              <h3 className="text-xl font-black text-stone-800 mb-4">3. User Conduct</h3>
              <p>Pi1Xia is a community built on sportsmanship. We have a zero-tolerance policy for harassment, hate speech, or unsportsmanlike conduct during matches arranged via our platform.</p>

              <h3 className="text-xl font-black text-stone-800 mb-4">4. Intellectual Property & Data Ownership</h3>
              <p>While you retain ownership of your personal profile information, you acknowledge that <strong>Pi1xia Technologies owns all aggregated statistical data, performance metrics, and AI analysis results</strong> generated through the use of the App. You grant us a perpetual, irrevocable, worldwide, royalty-free license to use your anonymized gameplay data for the purposes of improving our algorithms, developing new features, and commercializing aggregated datasets.</p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-black text-stone-800 mb-4">1. Data Collection</h3>
              <p>We collect information you provide directly to us, including your name, email, location data, and skill self-assessments.</p>

              <h3 className="text-xl font-black text-stone-800 mb-4">2. AI & Biometric Analysis</h3>
              <p className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 font-medium">
                <strong>Important:</strong> When you upload gameplay videos, we utilize Google Gemini AI to analyze your biomechanics. By uploading, you grant us permission to process this visual data solely for the purpose of generating performance reports. We do not sell your raw video footage to third parties without explicit consent.
              </p>

              <h3 className="text-xl font-black text-stone-800 mb-4">3. Location Services</h3>
              <p>To power the "Local Radar" matchmaking feature, we access your device's geolocation. You can revoke this permission at any time, though it will limit matchmaking functionality.</p>

              <h3 className="text-xl font-black text-stone-800 mb-4">4. Research & Development</h3>
              <p>We use collected data (including match history, skill progression, and user interactions) to conduct internal research and development. This allows us to train our AI models (Gemini integration), improve matchmaking accuracy, and create new sports technology products.</p>

              <h3 className="text-xl font-black text-stone-800 mb-4">5. Business Transfers & Commercial Sale</h3>
              <p className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-900 font-medium">
                <strong>Commercial Rights:</strong> We reserve the right to sell, license, or transfer aggregated and anonymized user data to third-party companies, sports organizations, or research institutions. Additionally, in the event of a merger, acquisition, reorganization, or sale of assets, your user data may be transferred to the acquiring entity as part of the transaction.
              </p>
            </div>
          )}

          {activeTab === 'waiver' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 mb-6">
                <h3 className="text-lg font-black text-rose-600 uppercase mb-2"><i className="fas fa-exclamation-triangle mr-2"></i> Assumption of Risk</h3>
                <p className="text-rose-800 font-bold text-xs">Pickleball is a physical sport that carries inherent risks of injury.</p>
              </div>

              <h3 className="text-xl font-black text-stone-800 mb-4">1. Release of Liability</h3>
              <p>You hereby release Pi1xia Technologies, its founders, employees, and AI agents from any and all liability for injuries, damages, or losses incurred during matches arranged through the App. This includes, but is not limited to: ankle sprains, paddle impacts, court surface irregularities, or disputes with other players.</p>

              <h3 className="text-xl font-black text-stone-800 mb-4">2. Health Certification</h3>
              <p>By using the App, you certify that you are physically fit and have not been advised to the contrary by a qualified medical professional. You understand that the "AI Coach" provides tactical advice, not medical advice.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-stone-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 transition-colors shadow-lg">
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
