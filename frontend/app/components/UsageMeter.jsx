"use client";
import React, { useState } from 'react';
import { Search, Globe, Calendar } from 'lucide-react';

export default function UsageMeter({ API_URL }) {
  const [phone, setPhone] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);

  const handleSearch = async () => {
    if (!phone) return;
    setLoading(true);
    setError('');
    setData(null);
    setSelectedDay(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/usage/${phone}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      if (json.logs && json.logs.length > 0) {
        setSelectedDay(json.logs[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
      <div className="p-5 flex justify-between items-center shrink-0 border-b border-slate-800/50">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
           <Globe className="w-5 h-5 text-cyan-500"/> Usage Meter
        </h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Enter Phone Number..."
            className="bg-[#13141a] border border-slate-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
            <Search className="w-4 h-4"/> {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {error && <div className="text-rose-500 p-4 bg-rose-500/10 rounded-lg font-bold">{error}</div>}
        
        {data && data.customer && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-[#13141a] p-4 rounded-xl border border-slate-800">
                  <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Customer Details</h4>
                  <p className="text-white font-bold text-lg">{data.customer.registered_name}</p>
                  <p className="text-slate-500 text-sm">{data.customer.address}</p>
               </div>
               <div className="bg-[#13141a] p-4 rounded-xl border border-slate-800">
                  <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Package Info</h4>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-cyan-400 font-bold text-lg">{data.customer.package_name}</p>
                      <p className={`text-sm font-bold ${data.customer.usage_status === 'Active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {data.customer.usage_status}
                      </p>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-black text-white">{data.customer.used_data_gb} <span className="text-sm text-slate-500 font-normal">/ {data.customer.total_data_gb} GB</span></p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
                     <div className="h-full bg-cyan-500 rounded-full" style={{width: `${(data.customer.used_data_gb / data.customer.total_data_gb) * 100}%`}}></div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 bg-[#13141a] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-96">
                <div className="p-3 bg-slate-800/30 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase shrink-0">31 Day History</div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                  {data.logs.map((log, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedDay(log)}
                      className={`w-full text-left p-2 rounded-lg text-sm flex justify-between items-center transition-colors ${selectedDay?.log_date === log.log_date ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/> {log.log_date}</span>
                      <span className="font-mono text-xs">{log.total_gb} GB</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full md:flex-1 bg-[#13141a] border border-slate-800 rounded-xl p-5 flex flex-col h-96">
                {selectedDay ? (
                  <>
                    <h4 className="text-white font-bold mb-6 border-b border-slate-800 pb-3 flex justify-between">
                       <span>Usage Breakdown for {selectedDay.log_date}</span>
                       <span className="text-cyan-400">{selectedDay.total_gb} GB Total</span>
                    </h4>
                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                       {[
                         { name: 'Google', val: selectedDay.google_gb, color: 'bg-blue-400' },
                         { name: 'Facebook', val: selectedDay.facebook_gb, color: 'bg-blue-600' },
                         { name: 'YouTube', val: selectedDay.youtube_gb, color: 'bg-red-500' },
                         { name: 'Amazon', val: selectedDay.amazon_gb, color: 'bg-amber-500' },
                         { name: 'TikTok', val: selectedDay.tiktok_gb, color: 'bg-pink-500' }
                       ].map(site => {
                         const maxGb = Math.max(0.1, selectedDay.total_gb); // Prevent div by 0
                         const percent = Math.min(100, Math.max(0, (site.val / maxGb) * 100));
                         return (
                           <div key={site.name}>
                              <div className="flex justify-between text-sm mb-2">
                                 <span className="text-slate-300 font-medium">{site.name}</span>
                                 <span className="text-white font-mono">{site.val} GB <span className="text-slate-500 text-xs">({percent.toFixed(1)}%)</span></span>
                              </div>
                              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                 <div className={`h-full ${site.color} rounded-full`} style={{width: `${percent}%`}}></div>
                              </div>
                           </div>
                         )
                       })}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">Select a day to view breakdown</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
