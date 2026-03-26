
import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';

interface Props {
  location?: string;
}

const WeatherWidget: React.FC<Props> = ({ location }) => {
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const conditions = ['Sunny', 'Partly Cloudy', 'Clear Skies', 'Sunny', 'Light Breeze', 'Sunny', 'Partly Cloudy'];
    const icons = ['fa-sun', 'fa-cloud-sun', 'fa-wind', 'fa-sun', 'fa-leaf', 'fa-sun', 'fa-cloud-sun'];
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    
    // Use location string to seed random values for variety
    const seed = location ? location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    
    const mockWeather: WeatherData[] = Array.from({ length: 7 }).map((_, i) => ({
      day: days[(today + i) % 7],
      temp: 68 + (seed % 10) + Math.floor(Math.random() * 5),
      condition: conditions[(i + (seed % 3)) % conditions.length],
      icon: icons[(i + (seed % 3)) % icons.length],
    }));

    setTimeout(() => {
      setWeather(mockWeather);
      setLoading(false);
    }, 800);
  }, [location]);

  const iconColors = ['text-yellow-500', 'text-blue-400', 'text-teal-400', 'text-yellow-500', 'text-green-400', 'text-yellow-500', 'text-blue-400'];

  if (loading) return <div className="h-16 flex items-center justify-center text-stone-400 font-black uppercase tracking-widest text-[10px]">Loading Forecast...</div>;

  return (
    <div className="bg-white p-4 rounded-3xl shadow-lg border border-stone-100 overflow-x-auto scrollbar-hide">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <i className="fas fa-cloud-sun text-lime-500 text-[10px]"></i>
          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
            {location ? `Forecast: ${location}` : 'Local Forecast'}
          </span>
        </div>
        <span className="text-[8px] font-bold text-stone-300 uppercase">7-Day Outlook</span>
      </div>
      <div className="flex justify-between min-w-[500px] items-center space-x-4">
        {weather.map((w, idx) => (
          <div key={idx} className="flex flex-col items-center text-center group">
            <span className={`text-[9px] font-black mb-1.5 uppercase tracking-widest ${idx === 0 ? 'text-green-900' : 'text-stone-300'}`}>
              {idx === 0 ? 'Today' : w.day}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-all ${idx === 0 ? 'bg-lime-100 shadow-md shadow-lime-100 scale-110' : 'bg-stone-50 border border-stone-100'}`}>
              <i className={`fas ${w.icon} text-xs ${idx === 0 ? iconColors[idx] : 'text-stone-300'}`}></i>
            </div>
            <span className="text-xs font-black text-stone-800">{w.temp}°</span>
            <span className="text-[7px] text-stone-400 uppercase font-black tracking-tighter mt-0.5">{w.condition}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherWidget;
