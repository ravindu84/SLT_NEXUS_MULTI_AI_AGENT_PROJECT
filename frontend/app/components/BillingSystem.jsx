"use client";
import React, { useState } from 'react';
import { Search, CreditCard, Coins, X, FileText, ChevronRight } from 'lucide-react';

export default function BillingSystem({ API_URL }) {
  const [phone, setPhone] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  const handleSearch = async () => {
    if (!phone) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/billing/${phone}`);
      if (!res.ok) throw new Error("Failed to fetch billing data");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg relative">
      <div className="p-5 flex justify-between items-center shrink-0 border-b border-slate-800/50">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
           <CreditCard className="w-5 h-5 text-emerald-500"/> Billing System
        </h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Enter Phone Number..."
            className="bg-[#13141a] border border-slate-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
            <Search className="w-4 h-4"/> {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {error && <div className="text-rose-500 p-4 bg-rose-500/10 rounded-lg font-bold">{error}</div>}
        
        {data && data.customer && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-[#13141a] p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-1">Customer Name</h4>
                    <p className="text-white font-bold text-lg">{data.customer.registered_name}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-1">Total Outstanding</h4>
                    <p className="text-rose-400 font-bold text-xl">Rs. {data.customer.total_due ? data.customer.total_due.toFixed(2) : '0.00'}</p>
                  </div>
               </div>
               
               <div className="bg-[#13141a] p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                 <div>
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-1">Payment Status</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${data.customer.payment_status === 'Active' || data.customer.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {data.customer.payment_status || 'Unknown'}
                    </span>
                 </div>
                 <div className="text-right">
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-1">Nexus Coins</h4>
                    <div className="flex items-center gap-1 text-amber-500 justify-end">
                      <Coins className="w-4 h-4"/>
                      <span className="font-bold text-lg">{data.customer.nxc_balance || 0} NXC</span>
                    </div>
                 </div>
               </div>
            </div>

            <div className="bg-[#13141a] border border-slate-800 rounded-xl overflow-hidden">
               <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="text-white font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-400"/> Last 3 Months Billing History</h4>
                  <span className="text-xs text-slate-500 font-medium bg-slate-800/50 px-2 py-1 rounded">Click on a row to view bill details</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-800/20 text-xs uppercase text-slate-400 font-bold border-b border-slate-800/50">
                       <th className="p-4">Month</th>
                       <th className="p-4">Year</th>
                       <th className="p-4 text-right">Amount Billed</th>
                       <th className="p-4 text-right">Amount Paid</th>
                       <th className="p-4 text-right">Arrears</th>
                       <th className="p-4"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50 text-sm">
                     {data.billing_history && data.billing_history.map((bill, i) => (
                       <tr 
                          key={i} 
                          onClick={() => setSelectedBill(bill)}
                          className="hover:bg-slate-800/30 cursor-pointer transition-colors group"
                       >
                         <td className="p-4 text-white font-medium">{bill.month}</td>
                         <td className="p-4 text-slate-400">{bill.year}</td>
                         <td className="p-4 text-right font-mono text-white">Rs. {bill.amount_billed}</td>
                         <td className="p-4 text-right font-mono text-emerald-400">Rs. {bill.amount_paid}</td>
                         <td className="p-4 text-right font-mono text-rose-400 font-bold">Rs. {bill.arrears}</td>
                         <td className="p-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 inline-block transition-colors"/>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL / POPUP FOR BILL BREAKDOWN */}
      {selectedBill && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-[#13141a] border border-slate-700 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             
             {/* Header */}
             <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
               <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400"/> Bill Statement
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">{selectedBill.month} {selectedBill.year}</p>
               </div>
               <button onClick={() => setSelectedBill(null)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                 <X className="w-5 h-5"/>
               </button>
             </div>
             
             {/* Body */}
             <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium">Voice Charge</span>
                   <span className="text-white font-mono font-medium">Rs. {selectedBill.breakdown.voice_charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium">Internet Charge</span>
                   <span className="text-white font-mono font-medium">Rs. {selectedBill.breakdown.internet_charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium">PEO TV (IPTV) Charge</span>
                   <span className="text-white font-mono font-medium">Rs. {selectedBill.breakdown.peo_tv_charge.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-slate-800 my-2 pt-2"></div>
                
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-medium flex items-center gap-1">Government Tax <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-500">4%</span></span>
                   <span className="text-rose-400 font-mono font-medium">+ Rs. {selectedBill.breakdown.tax_4_percent.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-dashed border-slate-700 my-2 pt-2"></div>
                
                <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                   <span className="text-emerald-400 font-bold uppercase text-sm">Total Bill</span>
                   <span className="text-emerald-400 font-mono font-bold text-lg">Rs. {selectedBill.amount_billed.toFixed(2)}</span>
                </div>
             </div>
             
           </div>
        </div>
      )}
    </div>
  );
}
