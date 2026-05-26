"use client";

import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Users, Shield, Terminal, Settings, 
  MapPin, CheckCircle, AlertTriangle, Clock, ChevronRight, ChevronLeft,
  Search, Bell, Menu, Zap, Globe, Cpu, Database, User, MessageSquare
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import dynamic from 'next/dynamic';
import { useLanguage } from '../context/LanguageContext';

const LiyaProDashboard = dynamic(() => import('../components/LiyaProDashboard'), {
  ssr: false,
});
const NeoDashboard = dynamic(() => import('../components/NeoDashboard'), {
  ssr: false,
});
import UsageMeter from '../components/UsageMeter';

// --- MOCK DATA FOR CHARTS ---
const loadData = [
  { name: 'Mon', faults: 40, traffic: 120 },
  { name: 'Tue', faults: 70, traffic: 130 },
  { name: 'Wed', faults: 45, traffic: 110 },
  { name: 'Thu', faults: 90, traffic: 160 },
  { name: 'Fri', faults: 65, traffic: 140 },
  { name: 'Sat', faults: 85, traffic: 150 },
  { name: 'Sun', faults: 100, traffic: 180 },
];

const capacityData = [
  { name: 'Allocated', value: 62 },
  { name: 'Available', value: 38 },
];
const COLORS = ['#ef4444', '#1e293b']; // Red and dark slate

const revenueData = [
  { name: '2016', sales: 40, revenue: 24 },
  { name: '2017', sales: 30, revenue: 13 },
  { name: '2018', sales: 20, revenue: 98 },
  { name: '2019', sales: 27, revenue: 39 },
  { name: '2020', sales: 18, revenue: 48 },
  { name: '2021', sales: 23, revenue: 38 },
  { name: '2022', sales: 34, revenue: 43 },
];

export default function AdminDashboard() {
  const [data, setData] = useState({
    tickets: [],
    technicians: [],
    dps: [],
    loops: [],
    ledger: [],
    customers: []
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiChatTab, setAiChatTab] = useState('liya');
  const [isLoading, setIsLoading] = useState(true);
  
  // Language Context
  const { language, setLanguage } = useLanguage();
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [customerData, setCustomerData] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const API_URL = "http://localhost:8000";

  const fetchData = async () => {
    try {
      const [resTickets, resTechs, resDps, resLedger, resCustomers] = await Promise.all([
        fetch(`${API_URL}/api/admin/tickets`).then(r => r.json()).catch(e => ({ tickets: [] })),
        fetch(`${API_URL}/api/admin/technicians`).then(r => r.json()).catch(e => ({ technicians: [] })),
        fetch(`${API_URL}/api/admin/dps`).then(r => r.json()).catch(e => ({ dps: [], loops: [] })),
        fetch(`${API_URL}/api/admin/ledger`).then(r => r.json()).catch(e => ({ ledger: [] })),
        fetch(`${API_URL}/api/admin/customers`).then(r => r.json()).catch(e => ({ customers: [] }))
      ]);

      setData({
        tickets: resTickets.tickets || [],
        technicians: resTechs.technicians || [],
        dps: resDps.dps || [],
        loops: resDps.loops || [],
        ledger: resLedger.ledger || [],
        customers: resCustomers.customers || []
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/customer/${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerData(data);
      } else {
        setCustomerData({ error: 'Customer not found in SLT_Dummy Database' });
      }
    } catch (error) {
      setCustomerData({ error: 'Failed to connect to database' });
    }
    setIsSearching(false);
  };

  const totalTickets = data.tickets.length;
  const resolvedTickets = data.tickets.filter(t => t.status === 'Resolved').length;
  const activeTechs = data.technicians.filter(t => t.status === 'Available' || t.status === 'Dispatched').length;
  const totalLoops = data.dps.reduce((acc, dp) => acc + dp.loops_used, 0);

  // --- TAB COMPONENTS ---

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Stats Row like DarkPan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Tickets', value: totalTickets - resolvedTickets, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-[#1c1d25]' },
          { label: 'Technicians Online', value: activeTechs, icon: Users, color: 'text-rose-500', bg: 'bg-[#1c1d25]' },
          { label: 'Loops Bound', value: totalLoops, icon: Zap, color: 'text-rose-500', bg: 'bg-[#1c1d25]' },
          { label: 'Blocks Mined', value: data.ledger.length, icon: Database, color: 'text-rose-500', bg: 'bg-[#1c1d25]' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-6 flex items-center justify-between border border-slate-800/50 hover:border-rose-500/30 transition-all shadow-lg`}>
            <div className="flex items-center gap-4">
              <stat.icon className={`w-10 h-10 ${stat.color}`} />
              <div>
                <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SWARM AI CHAT QUICK LAUNCH */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-800 rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between shadow-lg shadow-rose-900/50 border border-rose-500/50 group cursor-pointer" onClick={() => window.open('/', '_blank')}>
         <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Cpu className="w-8 h-8 text-rose-200" />
              NEXUS SWARM AI (Customer App)
            </h2>
            <p className="text-rose-200 mt-2">Engage with Liya, Neo, and Maya in the full-screen immersive command center.</p>
         </div>
         <button className="mt-6 sm:mt-0 px-6 py-3 bg-white text-rose-600 font-bold rounded-full hover:bg-rose-100 transition-colors shadow-lg flex items-center gap-2 group-hover:scale-105 duration-300">
           Launch Full Screen <ChevronRight className="w-5 h-5" />
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: System Load (DarkPan Style Bar Chart) */}
        <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl p-6 h-[350px] flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white">Worldwide Sales (Traffic)</h3>
            <button className="text-xs text-rose-500 hover:text-rose-400 font-bold transition-colors">Show All</button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#13141a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{fill: '#1e293b'}}
                />
                <Bar dataKey="sales" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill="#7f1d1d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Sales & Revenue (DarkPan Style Area Chart) */}
        <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl p-6 h-[350px] flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white">Sales & Revenue (Faults)</h3>
            <button className="text-xs text-rose-500 hover:text-rose-400 font-bold transition-colors">Show All</button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#13141a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="revenue" stroke="#7f1d1d" strokeWidth={3} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 3: Pie Chart capacity */}
        <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl p-6 h-[350px] flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white">Total Revenue (Capacity)</h3>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={capacityData}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {capacityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#13141a', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-white">62%</span>
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Allocated</span>
            </div>
          </div>
        </div>

        {/* CUSTOMER SEARCH WIDGET */}
        <div className="lg:col-span-2 bg-[#1c1d25] border border-slate-800/50 rounded-xl p-6 shadow-lg flex flex-col">
           <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white">Customer Database Search</h3>
          </div>
          
          <form onSubmit={handleSearch} className="mb-6 flex gap-3">
             <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Enter Phone Number (e.g. 0112895800)"
                  className="w-full bg-[#13141a] border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
             </div>
             <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
             </button>
          </form>

          {customerData && !customerData.error && (
            <div className="flex-1 bg-[#13141a] border border-slate-800 rounded-lg p-5 flex flex-col justify-center animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white"><User className="w-5 h-5"/></div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Customer ID</p>
                        <p className="font-bold text-white">{customerData.user_id}</p>
                        <p className="text-xs text-rose-500">{customerData.phone_number}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-4 sm:border-l sm:border-slate-800 sm:pl-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${customerData.status === 'UP' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}><Activity className="w-5 h-5"/></div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Status</p>
                        <p className={`font-bold ${customerData.status === 'UP' ? 'text-emerald-500' : 'text-rose-500'}`}>{customerData.status}</p>
                        <p className="text-xs text-slate-500">Speed: {customerData.speed_mbps} Mbps</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-4 sm:border-l sm:border-slate-800 sm:pl-6">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center"><Server className="w-5 h-5"/></div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Data Usage</p>
                        <p className="font-bold text-white">{customerData.data_used_gb} <span className="text-xs text-slate-500">/ {customerData.data_total_gb} GB</span></p>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2">
                            <div className="h-full bg-cyan-500 rounded-full" style={{width: `${(customerData.data_used_gb/customerData.data_total_gb)*100}%`}}></div>
                        </div>
                      </div>
                  </div>
                </div>
            </div>
          )}

          {customerData && customerData.error && (
             <div className="flex-1 flex items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <p className="text-rose-500 font-medium">{customerData.error}</p>
             </div>
          )}
        </div>
      </div>

    </div>
  );

  const renderCustomers = () => {
    const filtered = globalSearch 
      ? data.customers.filter(c => c.phone_number.includes(globalSearch) || c.name.toLowerCase().includes(globalSearch.toLowerCase()))
      : data.customers;
      
    return (
    <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
      <div className="p-5 flex justify-between items-center shrink-0">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
           <Database className="w-5 h-5 text-rose-500"/> SLT Customer Database (CRM)
        </h3>
        <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-bold border border-rose-500/20">
          {filtered.length} Records Loaded
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#1c1d25] z-10">
            <tr className="text-sm text-white border-b border-slate-800/50">
              <th className="p-4 font-semibold">Phone Number</th>
              <th className="p-4 font-semibold">Contact Number</th>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Line Type</th>
              <th className="p-4 font-semibold">DP/LOOP</th>
              <th className="p-4 font-semibold">Network Status</th>
              <th className="p-4 font-semibold text-right">Bill Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((c, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 text-sm font-bold text-slate-200">{c.phone_number}</td>
                <td className="p-4 text-xs font-mono text-slate-500">{c.contact_number}</td>
                <td className="p-4 text-sm text-slate-400">{c.name}</td>
                <td className="p-4 text-sm text-slate-400">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${
                    c.type === 'Fiber' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-700/50 text-slate-300'
                  }`}>
                    {c.type}
                  </span>
                </td>
                <td className="p-4 text-xs font-mono text-slate-400">{c.dp_loop || 'N/A'}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                    c.status === 'UP' ? 'bg-emerald-500/10 text-emerald-500' : 
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${c.status === 'UP' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-right text-sm font-mono text-slate-300">
                  Rs. {c.total_due ? c.total_due.toFixed(2) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  }

  const renderFullDB = () => {
    const filtered = globalSearch 
      ? data.customers.filter(c => c.phone_number.includes(globalSearch) || c.name.toLowerCase().includes(globalSearch.toLowerCase()))
      : data.customers;
      
    return (
    <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
      <div className="p-5 flex justify-between items-center shrink-0 border-b border-slate-800/50">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
           <Server className="w-5 h-5 text-rose-500"/> Full Dummy DB (200 Records)
        </h3>
        <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-xs font-bold border border-rose-500/20">
          {filtered.length} Records Loaded
        </span>
      </div>
      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-[#1c1d25] z-10 shadow-md">
            <tr className="text-xs text-slate-400 border-b border-slate-800/50 uppercase tracking-wider">
              <th className="p-4 font-bold">Phone</th>
              <th className="p-4 font-bold">Name</th>
              <th className="p-4 font-bold">Type</th>
              <th className="p-4 font-bold">DP/LOOP</th>
              <th className="p-4 font-bold">TID (Copper)</th>
              <th className="p-4 font-bold">SNR/Attn (Copper)</th>
              <th className="p-4 font-bold">Power (Fiber)</th>
              <th className="p-4 font-bold">ONT</th>
              <th className="p-4 font-bold">Bill Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((c, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors text-sm">
                <td className="p-4 font-bold text-rose-400">{c.phone_number}</td>
                <td className="p-4 text-slate-300">{c.name}</td>
                <td className="p-4 text-slate-400">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                    c.type === 'Fiber' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-700/50 text-slate-300'
                  }`}>
                    {c.type}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs text-slate-400">{c.dp_loop || 'N/A'}</td>
                <td className="p-4 font-mono text-xs text-slate-400">{c.tid || 'N/A'}</td>
                <td className="p-4 text-xs text-slate-400">
                  {c.type === 'Copper' ? (
                     <span>SNR: <span className="text-emerald-400">{c.snr || 'N/A'}</span> | Attn: <span className="text-rose-400">{c.attenuation || 'N/A'}</span></span>
                  ) : 'N/A'}
                </td>
                <td className="p-4 text-xs text-slate-400">
                   {c.type === 'Fiber' ? (
                     <span><span className="text-emerald-400">{c.power_level || 'N/A'}</span> dBm</span>
                   ) : 'N/A'}
                </td>
                <td className="p-4 text-xs text-slate-400">{c.ont_type || 'N/A'}</td>
                <td className="p-4 text-xs">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-medium ${
                    c.payment_status === 'Active' || c.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    {c.payment_status || c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  }

  const renderFaultMatrix = () => (
    <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
      <div className="p-5 flex justify-between items-center shrink-0">
        <h3 className="text-base font-bold text-white">Recent Sales (Fault Tickets)</h3>
        <button className="text-xs text-rose-500 hover:text-rose-400 font-bold transition-colors">Show All</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#1c1d25] z-10">
            <tr className="text-sm text-white border-b border-slate-800/50">
              <th className="p-4 font-semibold">Ticket ID</th>
              <th className="p-4 font-semibold">Customer</th>
              <th className="p-4 font-semibold">Issue</th>
              <th className="p-4 font-semibold">Technician</th>
              <th className="p-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.tickets.map((t, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 text-sm text-slate-400">#{t.ticket_id.split('-').pop()}</td>
                <td className="p-4 text-sm text-slate-200">{t.phone_number}</td>
                <td className="p-4 text-sm text-slate-400">{t.issue_type}</td>
                <td className="p-4 text-sm text-slate-400">
                  {t.assigned_technician ? t.assigned_technician : <span className="italic">Unassigned</span>}
                </td>
                <td className="p-4 text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : 
                    t.status === 'Dispatched' ? 'bg-cyan-500/10 text-cyan-500' : 
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDispatch = () => (
    <div className="bg-[#1c1d25] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
      <div className="p-5 flex justify-between items-center shrink-0">
        <h3 className="text-base font-bold text-white">Technician Dispatch</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.technicians.map((tech, i) => (
          <div key={i} className="bg-[#13141a] rounded-xl p-5 border border-slate-800 hover:border-rose-500/30 transition-colors">
             <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white text-lg font-bold">
                    {tech.name.charAt(0)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#13141a] ${tech.status === 'Available' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </div>
                <div>
                   <h4 className="text-white font-bold">{tech.name}</h4>
                   <p className="text-xs text-slate-500">{tech.zone}</p>
                </div>
             </div>
             <div className="flex justify-between items-end">
                <div>
                   <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                   <p className={`text-sm font-medium ${tech.status === 'Available' ? 'text-emerald-500' : 'text-rose-500'}`}>{tech.status}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Active</p>
                   <p className="text-2xl font-bold text-white leading-none">{tech.active_tickets}</p>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVault = () => (
    <div className="bg-[#0f1015] border border-slate-800/50 rounded-xl overflow-hidden flex flex-col h-full shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-[#1c1d25] shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-mono text-emerald-500">nexus-ledger-daemon</h3>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed text-emerald-400/80 custom-scrollbar">
        <div className="mb-6 opacity-70">
          Initializing SLT_NEXUS Vault Protocol...<br/>
          Establishing secure connection... OK<br/>
          Awaiting events...
        </div>
        {data.ledger.map((log, i) => (
          <div key={i} className="mb-2">
            <span className="text-slate-500" suppressHydrationWarning>[{new Date(log.created_at).toISOString().split('T')[1].slice(0, 8)}]</span>{' '}
            <span className="text-emerald-300">[{log.transaction_type}]</span>{' '}
            {log.details}
          </div>
        ))}
        <div className="animate-pulse mt-2">_</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#060913] text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      {activeTab !== 'ai-chat' && (
        <div className="w-64 bg-[#13141a] border-r border-slate-800/50 flex flex-col shrink-0 transition-all duration-300">
          <div className="p-6 flex items-center justify-center">
            <img src="/assets/logo.png" alt="SLT NEXUS" className="h-14 object-contain" />
          </div>
        
        {/* User Info Profile */}
        <div className="p-6 flex items-center gap-4">
           <div className="relative">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-rose-500">
                 <User className="w-6 h-6 text-slate-400" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1c1d25]"></div>
           </div>
           <div>
              <p className="text-sm font-bold text-white">Ravindu Chinthana</p>
              <p className="text-xs text-slate-400">Admin</p>
           </div>
        </div>
        
        <div className="px-4 flex-1 space-y-1">
          {[
            { id: 'overview', icon: Activity, label: 'Dashboard' },
            { id: 'customers', icon: Database, label: 'CRM Database' },
            { id: 'tickets', icon: AlertTriangle, label: 'Fault Matrix' },
            { id: 'dispatch', icon: Users, label: 'Dispatch Center' },
            { id: 'usage-meter', icon: Globe, label: 'Usage Meter' },
            { id: 'vault', icon: Terminal, label: 'Ledger Terminal' },
            { id: 'full-db', icon: Server, label: 'Full Dummy DB' },
            { id: 'ai-chat', icon: MessageSquare, label: 'Swarm AI Chat' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-rose-500/10 text-rose-500 relative' 
                  : 'text-slate-400 hover:bg-[#13141a] hover:text-white'
              }`}
            >
              {activeTab === item.id && (
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-rose-500 rounded-r-full"></div>
              )}
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP NAVBAR (DarkPan Style) */}
        <header className={`h-20 px-8 justify-between items-center bg-[#1c1d25] border-b border-slate-800/50 shrink-0 ${activeTab === 'ai-chat' ? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden sm:block w-72">
               <input 
                 type="text" 
                 placeholder="Search phone or name..."
                 value={globalSearch}
                 onChange={(e) => setGlobalSearch(e.target.value)}
                 className="w-full bg-[#13141a] border-none text-white text-sm rounded-full pl-5 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-shadow"
               />
               <Search className="absolute right-4 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
               <MessageSquare className="w-5 h-5" />
               <span className="hidden sm:inline text-sm">Message</span>
            </button>
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors relative">
               <Bell className="w-5 h-5" />
               <span className="hidden sm:inline text-sm">Notification</span>
               <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-rose-500"></span>
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-6 border-l border-slate-800">
               <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                 <User className="w-4 h-4 text-slate-400" />
               </div>
               <span className="text-sm font-medium text-white">Ravindu Chinthana</span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === 'ai-chat' ? '' : 'p-6 sm:p-8'}`}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
               <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'customers' && renderCustomers()}
              {activeTab === 'full-db' && renderFullDB()}
              {activeTab === 'tickets' && renderFaultMatrix()}
              {activeTab === 'dispatch' && renderDispatch()}
              {activeTab === 'usage-meter' && <UsageMeter API_URL={API_URL} />}
              {activeTab === 'vault' && renderVault()}
              {activeTab === 'ai-chat' && (
                <div className="h-full w-full flex flex-col bg-[#1c1d25] overflow-hidden shadow-lg">
                  {/* Internal Sub-tabs for AI Chat */}
                  <div className="flex border-b border-slate-800/50 bg-[#13141a]">
                    <button 
                      onClick={() => setActiveTab('overview')}
                      className="px-4 py-3 text-slate-400 hover:text-white border-r border-slate-800/50 flex items-center justify-center transition-colors"
                      title="Back to Admin Dashboard"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setAiChatTab('liya')}
                      className={`flex-1 py-3 text-sm font-bold transition-colors ${aiChatTab === 'liya' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-slate-400 hover:text-white'}`}
                    >
                      Liya (Head of AI)
                    </button>
                    <button 
                      onClick={() => setAiChatTab('neo')}
                      className={`flex-1 py-3 text-sm font-bold transition-colors ${aiChatTab === 'neo' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}
                    >
                      Neo (AI Assistant 1)
                    </button>
                    <button 
                      onClick={() => setAiChatTab('maya')}
                      className={`flex-1 py-3 text-sm font-bold transition-colors ${aiChatTab === 'maya' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-400 hover:text-white'}`}
                    >
                      Maya (AI Assistant 2)
                    </button>

                    {/* Language Selector in Admin AI Chat */}
                    <div className="flex items-center px-4 ml-auto border-l border-slate-800/50 gap-2">
                      {['en', 'si', 'ta'].map((ln) => (
                        <button
                          key={ln}
                          onClick={() => setLanguage(ln)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                            language === ln 
                              ? 'bg-rose-500 text-white shadow-md' 
                              : 'bg-[#1c1d25] text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {ln === 'en' ? 'EN' : ln === 'si' ? 'සිං' : 'த'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sub-tab content */}
                  <div className="flex-1 relative overflow-hidden bg-[#13141a]">
                    <div style={{ display: aiChatTab === 'liya' ? 'block' : 'none', width: '100%', height: '100%' }}>
                      <LiyaProDashboard isAdmin={true} agent="liya" language={language} />
                    </div>
                    <div style={{ display: aiChatTab === 'neo' ? 'block' : 'none', width: '100%', height: '100%' }}>
                      <NeoDashboard isAdmin={true} language={language} />
                    </div>
                    <div style={{ display: aiChatTab === 'maya' ? 'block' : 'none', width: '100%', height: '100%' }}>
                      <LiyaProDashboard isAdmin={true} agent="maya" language={language} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #13141a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        
        /* Recharts fixes */
        .recharts-default-tooltip {
          background-color: #1c1d25 !important;
          border: 1px solid #334155 !important;
          border-radius: 8px !important;
        }
      `}</style>
    </div>
  );
}
