
import React from 'react';

interface Props {
  onClose: () => void;
}

const DemoModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      <button 
        onClick={onClose} 
        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-50"
      >
        <i className="fas fa-times text-3xl"></i>
      </button>

      <div className="w-full max-w-6xl aspect-video rounded-[2rem] overflow-hidden shadow-2xl relative border border-white/10 group">
        {/* Using a high-quality Pickleball match highlight from YouTube as a placeholder for the app demo */}
        <iframe 
          width="100%" 
          height="100%" 
          src="https://www.youtube.com/embed/41X1W-5s2W0?autoplay=1&rel=0&modestbranding=1" 
          title="Pi1xia App Demo" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
          className="w-full h-full"
        ></iframe>
        
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
          <h2 className="text-white text-3xl font-black mb-2">See Pi1xia in Action</h2>
          <p className="text-white/70 font-medium">Watch how AI analysis transforms your game instantly.</p>
        </div>
      </div>
    </div>
  );
};

export default DemoModal;
