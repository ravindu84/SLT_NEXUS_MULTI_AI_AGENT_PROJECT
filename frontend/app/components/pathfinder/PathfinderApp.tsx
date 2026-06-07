// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Compass,
  Layers,
  Activity,
  PlusCircle,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  MapPin,
  Clock,
  Radio,
  Network,
  Cpu,
  Terminal,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  X,
  GitCompare,
  Search,
  Zap,
  Sparkles,
  Mic,
  MicOff,
  CloudLightning
} from 'lucide-react';
import { NetworkNode, Connection, NodeStatus, NodeType } from './types';
import { HISTORICAL_TIMELINE } from './historicalData';
import { motion, AnimatePresence } from 'framer-motion';
import DigitalTwinMap, { getTerrainElevation, getDistanceMeters } from './components/DigitalTwinMap';
import SignalTrendChart from './components/SignalTrendChart';

// Initial pre-loaded state representing real geographic spots projected onto the 3D environment.
const INITIAL_NODES: NetworkNode[] = [
  {
    id: 'node-01',
    type: 'pole',
    lat: 6.8400,
    lon: 80.0000,
    status: 'normal',
    label: 'HO-HTN-0100-PL01',
    description: 'Homagama Town Central Feeder Trunk Pole'
  },
  {
    id: 'node-02',
    type: 'dp',
    lat: 6.8415,
    lon: 80.0030,
    status: 'normal',
    label: 'HO-HTN-0100-001',
    description: 'Homagama Town Court Complex Distribution Point 001'
  },
  {
    id: 'node-03',
    type: 'pole',
    lat: 6.8485,
    lon: 80.0075,
    status: 'normal',
    label: 'HO-ATR-0520-PL02',
    description: 'Homagama Athurugiriya Road Feeder Trunk Pole'
  },
  {
    id: 'node-04',
    type: 'dp',
    lat: 6.8510,
    lon: 80.0105,
    status: 'fault',
    label: 'HO-ATR-0520-001',
    description: 'Athurugiriya Road Cabinet Active Distribution Point 001',
    faultDetectedAt: Date.now() - 45 * 60 * 1000
  },
  {
    id: 'node-05',
    type: 'pole',
    lat: 6.8320,
    lon: 80.0160,
    status: 'normal',
    label: 'HO-PTP-0310-PL03',
    description: 'Pitipana Tech-City Secondary Feeder Trunk Pole'
  },
  {
    id: 'node-06',
    type: 'dp',
    lat: 6.8280,
    lon: 80.0210,
    status: 'normal',
    label: 'HO-PTP-0310-001',
    description: 'Pitipana NSBM Green University Distribution Point 001'
  },
  {
    id: 'node-07',
    type: 'dp',
    lat: 6.8530,
    lon: 80.0130,
    status: 'normal',
    label: 'HO-ATR-0520-002',
    description: 'Athurugiriya Road Regional Distribution Point 002'
  },
  {
    id: 'node-08',
    type: 'dp',
    lat: 6.8465,
    lon: 80.0050,
    status: 'normal',
    label: 'HO-ATR-0520-003',
    description: 'Athurugiriya Road Sub-Sector Distribution Point 003'
  },
  {
    id: 'node-09',
    type: 'dp',
    lat: 6.8300,
    lon: 80.0185,
    status: 'normal',
    label: 'HO-PTP-0310-002',
    description: 'Pitipana Nanotechnology Park Distribution Point 002'
  },
  {
    id: 'node-10',
    type: 'dp',
    lat: 6.8335,
    lon: 80.0140,
    status: 'normal',
    label: 'HO-PTP-0310-003',
    description: 'Pitipana Faculty of Technology Distribution Point 003'
  },
  {
    id: 'node-11',
    type: 'dp',
    lat: 6.8435,
    lon: 79.9860,
    status: 'normal',
    label: 'HO-KOT-0960-001',
    description: 'Kottawa East Junction Distribution Point 001'
  },
  {
    id: 'node-12',
    type: 'pole',
    lat: 6.8420,
    lon: 79.9910,
    status: 'normal',
    label: 'HO-KOT-0960-PL04',
    description: 'Kottawa Highway Interchange Feeder Trunk Pole'
  },
  // Sub Page A Database: Copper PSTN MSAN Grid (Kottawa Sector)
  {
    id: 'msan-01',
    type: 'msan',
    lat: 6.8410,
    lon: 79.9600,
    status: 'normal',
    label: 'SL-MSAN-KOT-M01',
    description: 'Kottawa Central High-Capacity PSTN MSAN Exchange Shelf 01'
  },
  {
    id: 'msan-02',
    type: 'msan',
    lat: 6.8445,
    lon: 79.9625,
    status: 'normal',
    label: 'SL-MSAN-KOT-M02',
    description: 'Kottawa Court Junction Secondary MSAN Cabinet'
  },
  {
    id: 'msan-03',
    type: 'msan',
    lat: 6.8390,
    lon: 79.9575,
    status: 'normal',
    label: 'SL-MSAN-KOT-M03',
    description: 'Kottawa South Railway Road PSTN MSAN Cabinet'
  },
  {
    id: 'msan-04',
    type: 'msan',
    lat: 6.8360,
    lon: 79.9610,
    status: 'fault', // Trigger a visible outage out-of-the-box
    label: 'SL-MSAN-PAN-M04',
    description: 'Pannipitiya Road MSAN Node 04 High-Temperature Thermal Alert',
    faultDetectedAt: Date.now() - 30 * 60 * 1000
  },
  {
    id: 'msan-05',
    type: 'msan',
    lat: 6.8450,
    lon: 79.9690,
    status: 'normal',
    label: 'SL-MSAN-PAN-M05',
    description: 'Pannipitiya Nursing School Road Active MSAN Node 05'
  },
  {
    id: 'msan-06',
    type: 'msan',
    lat: 6.8402,
    lon: 79.9720,
    status: 'normal',
    label: 'SL-MSAN-MAT-M06',
    description: 'Mattegoda Housing Scheme PSTN/Broadband MSAN 06'
  },
  {
    id: 'msan-07',
    type: 'msan',
    lat: 6.8355,
    lon: 79.9665,
    status: 'normal',
    label: 'SL-MSAN-MAT-M07',
    description: 'Mattegoda Junction Main Access Substation 07'
  },
  {
    id: 'msan-08',
    type: 'msan',
    lat: 6.8430,
    lon: 79.9560,
    status: 'normal',
    label: 'SL-MSAN-KOT-M08',
    description: 'Kottawa Highway Entrance Core PSTN MSAN Node 08'
  },
  {
    id: 'msan-09',
    type: 'msan',
    lat: 6.8480,
    lon: 79.9650,
    status: 'normal',
    label: 'SL-MSAN-KOT-M09',
    description: 'Kottawa North Industrial Zone PSTN Exchange Cabinet 09'
  },
  {
    id: 'msan-10',
    type: 'msan',
    lat: 6.8375,
    lon: 79.9710,
    status: 'normal',
    label: 'SL-MSAN-PAN-M10',
    description: 'Pannipitiya Depot Feeder Link Dedicated Active MSAN 10'
  },
  // Sub Page B Database: FTTH Cabinet Hub (Pitipana Tech-City Sector)
  {
    id: 'cab-01',
    type: 'cabinet',
    lat: 6.8250,
    lon: 80.0200,
    status: 'normal',
    label: 'SL-CAB-PTP-F01',
    description: 'Pitipana Tech-City Smart Feeder FTTH Cabinet F01'
  },
  {
    id: 'cab-02',
    type: 'cabinet',
    lat: 6.8270,
    lon: 80.0235,
    status: 'normal',
    label: 'SL-CAB-PTP-F02',
    description: 'Pitipana SLIIT Core Academic Sector FTTH Cabinet F02'
  },
  {
    id: 'cab-03',
    type: 'cabinet',
    lat: 6.8220,
    lon: 80.0180,
    status: 'normal',
    label: 'SL-CAB-PTP-F03',
    description: 'Pitipana Green University Student Plaza FTTH Cabinet F03'
  },
  {
    id: 'cab-04',
    type: 'cabinet',
    lat: 6.8205,
    lon: 80.0220,
    status: 'fault', // Outage visual indicator
    label: 'SL-CAB-PTP-F04',
    description: 'Pitipana Southern Research Block Optical Power Low Attenuation Fault',
    faultDetectedAt: Date.now() - 15 * 60 * 1000
  },
  {
    id: 'cab-05',
    type: 'cabinet',
    lat: 6.8285,
    lon: 80.0165,
    status: 'normal',
    label: 'SL-CAB-HTN-F05',
    description: 'Homagama South Biotech Innovation Zone FTTH Cabinet F05'
  },
  {
    id: 'cab-06',
    type: 'cabinet',
    lat: 6.8240,
    lon: 80.0270,
    status: 'normal',
    label: 'SL-CAB-HTN-F06',
    description: 'Pitipana High-Density Residential Core Optical splitter F06'
  },
  {
    id: 'cab-07',
    type: 'cabinet',
    lat: 6.8190,
    lon: 80.0295,
    status: 'normal',
    label: 'SL-CAB-PTP-F07',
    description: 'Pitipana South Industrial Complex Fiber Hub F07'
  },
  {
    id: 'cab-08',
    type: 'cabinet',
    lat: 6.8262,
    lon: 80.0140,
    status: 'normal',
    label: 'SL-CAB-HTN-F08',
    description: 'Homagama South Railway Crossing Distribution Center F08'
  },
  {
    id: 'cab-09',
    type: 'cabinet',
    lat: 6.8295,
    lon: 80.0260,
    status: 'normal',
    label: 'SL-CAB-PTP-F09',
    description: 'Mahenwatta Smart Community Hub Access Cabinet F09'
  },
  {
    id: 'cab-10',
    type: 'cabinet',
    lat: 6.8215,
    lon: 80.0315,
    status: 'normal',
    label: 'SL-CAB-PTP-F10',
    description: 'Pitipana East Agro-Tech Park Dedicated High-Fiber Cabinet F010'
  }
];

const INITIAL_CONNECTIONS: Connection[] = [
  // Homagama baseline connections
  { from: 'node-01', to: 'node-02', type: 'fiber' },
  { from: 'node-01', to: 'node-03', type: 'fiber' },
  { from: 'node-03', to: 'node-04', type: 'copper' },
  { from: 'node-01', to: 'node-05', type: 'fiber' },
  { from: 'node-05', to: 'node-06', type: 'fiber' },
  { from: 'node-03', to: 'node-07', type: 'copper' },
  { from: 'node-03', to: 'node-08', type: 'copper' },
  { from: 'node-05', to: 'node-09', type: 'fiber' },
  { from: 'node-05', to: 'node-10', type: 'fiber' },
  { from: 'node-01', to: 'node-12', type: 'fiber' },
  { from: 'node-12', to: 'node-11', type: 'copper' },

  // Sub Page A connections: Copper PSTN MSAN Grid
  { from: 'msan-01', to: 'msan-02', type: 'fiber' },
  { from: 'msan-01', to: 'msan-03', type: 'copper' },
  { from: 'msan-02', to: 'msan-04', type: 'copper' },
  { from: 'msan-01', to: 'msan-05', type: 'fiber' },
  { from: 'msan-05', to: 'msan-06', type: 'fiber' },
  { from: 'msan-03', to: 'msan-07', type: 'copper' },
  { from: 'msan-01', to: 'msan-08', type: 'fiber' },
  { from: 'msan-02', to: 'msan-09', type: 'copper' },
  { from: 'msan-06', to: 'msan-10', type: 'copper' },

  // Sub Page B connections: FTTH Cabinet Hub
  { from: 'cab-01', to: 'cab-02', type: 'fiber' },
  { from: 'cab-01', to: 'cab-03', type: 'fiber' },
  { from: 'cab-01', to: 'cab-04', type: 'fiber' },
  { from: 'cab-02', to: 'cab-05', type: 'fiber' },
  { from: 'cab-02', to: 'cab-06', type: 'fiber' },
  { from: 'cab-03', to: 'cab-07', type: 'fiber' },
  { from: 'cab-01', to: 'cab-08', type: 'fiber' },
  { from: 'cab-05', to: 'cab-09', type: 'fiber' },
  { from: 'cab-06', to: 'cab-10', type: 'fiber' }
];

const MAINTENANCE_HUBS = [
  { name: 'NOC Central', lat: 6.8410, lon: 80.0035 },
  { name: 'Depot Pitipana', lat: 6.8320, lon: 80.0160 },
  { name: 'Depot Kottawa', lat: 6.8435, lon: 79.9860 }
];

export function getEstimatedRepairTime(nodeLat: number, nodeLon: number) {
  let minDistance = Infinity;
  let nearestHub = 'NOC Central';
  
  MAINTENANCE_HUBS.forEach(hub => {
    const dist = getDistanceMeters(nodeLat, nodeLon, hub.lat, hub.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestHub = hub.name;
    }
  });

  // Convert distance to minutes
  // 1 minute per 120m travel distance baseline, plus 12 mins fixed troubleshooting/repair setup time
  const travelMins = Math.ceil(minDistance / 120);
  const fixMins = 12;
  const totalMins = travelMins + fixMins;

  return {
    minutes: totalMins,
    hub: nearestHub,
    distanceKm: (minDistance / 1000).toFixed(2)
  };
}

export function getFaultDetectedAtSimulated(nodeId: string) {
  const charSum = nodeId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const offsetMins = (charSum % 60) + 15; // deterministic 15 to 75 minutes ago
  return Date.now() - offsetMins * 60 * 1000;
}

export function AnimatedTimer({ timerStr }: { timerStr: string }) {
  const isBreached = timerStr.includes('BREACH');
  
  if (isBreached) {
    return (
      <span className="font-mono font-bold tracking-wider animate-pulse text-rose-500">
        {timerStr}
      </span>
    );
  }

  return (
    <span className="flex items-center font-mono leading-none">
      {timerStr.split('').map((char, idx) => {
        const widthVal = char === ':' ? '0.45em' : '0.65em';
        return (
          <span 
            key={`${idx}`} 
            className="inline-block relative overflow-hidden h-[1em]" 
            style={{ width: widthVal }}
          >
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`${char}-${idx}`}
                layout
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="absolute inset-0 flex items-center justify-center font-mono"
              >
                {char}
              </motion.span>
            </AnimatePresence>
            {/* Invisible spacer to maintain container size */}
            <span className="opacity-0 pointer-events-none select-none font-mono">{char}</span>
          </span>
        );
      })}
    </span>
  );
}

const SCALE_COEFF = 600;

export default function App() {
  // Master states
  const [nodes, setNodes] = useState<NetworkNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [activeTab, setActiveTab] = useState<'main' | 'copper' | 'ftth'>('main');
  const [secondsTick, setSecondsTick] = useState<number>(0);

  // Periodic interval to drive real-time countdown clocks
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-04');
  const [compareNodeId, setCompareNodeId] = useState<string | null>(null);
  const [isSelectingCompareTarget, setIsSelectingCompareTarget] = useState<boolean>(false);
  
  // Historical scrubbing states
  const [playbackHourAgo, setPlaybackHourAgo] = useState<number>(0);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Auto-switch selected node when sub-page tab changes to ensure responsive selection experience
  useEffect(() => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
    setCommandBarQuery('');
    setConnectToNodeId('');
    
    if (activeTab === 'main') {
      setSelectedNodeId('node-04');
      setNewType('pole');
      setNewLat('6.8400');
      setNewLon('80.0000');
    } else if (activeTab === 'copper') {
      setSelectedNodeId('msan-04');
      setNewType('msan');
      setNewLat('6.8410');
      setNewLon('79.9600');
    } else if (activeTab === 'ftth') {
      setSelectedNodeId('cab-04');
      setNewType('cabinet');
      setNewLat('6.8250');
      setNewLon('80.0200');
    }
    setCompareNodeId(null);
    setIsSelectingCompareTarget(false);
  }, [activeTab]);

  // Compute overridden nodes under active timeline scrubbing
  const activeNodes = useMemo(() => {
    const tabNodes = nodes.filter(node => {
      if (activeTab === 'main') return node.id.startsWith('node-');
      if (activeTab === 'copper') return node.id.startsWith('msan-');
      if (activeTab === 'ftth') return node.id.startsWith('cab-');
      return true;
    });

    if (playbackHourAgo === 0) return tabNodes;
    const timelineEvent = HISTORICAL_TIMELINE[playbackHourAgo];
    if (!timelineEvent) return tabNodes;
    
    return tabNodes.map(node => {
      const isFault = timelineEvent.faults.includes(node.id);
      return {
        ...node,
        status: isFault ? 'fault' as const : 'normal' as const
      };
    });
  }, [nodes, playbackHourAgo, activeTab]);

  const activeConnections = useMemo(() => {
    const tabNodeIds = new Set(activeNodes.map(n => n.id));
    return connections.filter(conn => tabNodeIds.has(conn.from) && tabNodeIds.has(conn.to));
  }, [connections, activeNodes]);

  // Effect to automatically progress scrubbing slider when playing
  useEffect(() => {
    if (!isPlaybackPlaying) return;
    const intervalTime = 1600 / playbackSpeed;
    const playTimer = setInterval(() => {
      setPlaybackHourAgo(prev => {
        if (prev <= 0) return 24; // loop back to 24h ago
        return prev - 1;
      });
    }, intervalTime);
    return () => clearInterval(playTimer);
  }, [isPlaybackPlaying, playbackSpeed]);
  
  // Console state
  const [logs, setLogs] = useState<string[]>([
    '[SYSTEM] Initializing Digital Twin Layer... Success.',
    '[INFO] Local GIS coordinates successfully mapped to virtual grid room.',
    '[WARN] Active signal disruption discovered on node LA-Coax-Subdp-C3.',
    '[INFO] AI Agent monitoring 1,248 active physical signal paths.',
  ]);

  const addLog = (msg: string) => {
    const rTime = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${rTime}] ${msg}`].slice(-8)); // keep last 8
  };

  // Alarm Audio Alert state
  const [audioAlertEnabled, setAudioAlertEnabled] = useState<boolean>(true);

  // Dashboard collapse/minimize states
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState<boolean>(true);
  const [dashboardSortMode, setDashboardSortMode] = useState<'ttc-asc' | 'ttc-desc' | 'categorized'>('ttc-asc');

  // Session-wide fault resolution tracking
  const [resolvedAlarmsCount, setResolvedAlarmsCount] = useState<number>(0);
  const [totalFaultsEncounteredInSession, setTotalFaultsEncounteredInSession] = useState<number>(1);
  const [isWeatherActive, setIsWeatherActive] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isTopologyOverviewActive, setIsTopologyOverviewActive] = useState<boolean>(true);
  const [windSpeed, setWindSpeed] = useState<number>(45);
  const [windDirection, setWindDirection] = useState<string>('NE');
  const [isGlobalHudVisible, setIsGlobalHudVisible] = useState<boolean>(true);

  // Voice Command integration states
  const [voiceIsListening, setVoiceIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceStatus, setVoiceStatus] = useState<string>('Mic Standby');
  const [typedVoiceCommand, setTypedVoiceCommand] = useState<string>('');

  // Soft glowing state triggered when an operator-alerting new fault occurs
  const [hasNewFaultGlow, setHasNewFaultGlow] = useState<boolean>(false);

  useEffect(() => {
    if (totalFaultsEncounteredInSession > 1) {
      setHasNewFaultGlow(true);
      const timer = setTimeout(() => {
        setHasNewFaultGlow(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [totalFaultsEncounteredInSession]);

  const resolutionRate = useMemo(() => {
    if (totalFaultsEncounteredInSession <= 0) return 100;
    return Math.min(100, Math.round((resolvedAlarmsCount / totalFaultsEncounteredInSession) * 100));
  }, [resolvedAlarmsCount, totalFaultsEncounteredInSession]);

  // Helper to retrieve the actual remaining TTC countdown time for any node
  const getFaultNodeTTC = (node: NetworkNode) => {
    let defaultOffsetMs = 45 * 60 * 1000;
    if (node.type === 'dp' || node.type === 'pole') {
      defaultOffsetMs = 45 * 60 * 1000;
    } else if (node.type === 'msan') {
      defaultOffsetMs = 30 * 60 * 1000;
    } else if (node.type === 'cabinet') {
      defaultOffsetMs = 15 * 60 * 1000;
    }
    
    const faultStart = node.faultDetectedAt || (playbackHourAgo !== 0 ? getFaultDetectedAtSimulated(node.id) : (Date.now() - defaultOffsetMs));
    const elapsedMs = Date.now() - faultStart;
    const elapsedMins = elapsedMs / 60000;
    const isRed = elapsedMins > 60;
    
    const SLA_LIMIT_MS = 90 * 60 * 1000;
    const remainingMs = Math.max(0, SLA_LIMIT_MS - elapsedMs);
    const remMin = Math.floor(remainingMs / 60000);
    const remSec = Math.floor((remainingMs % 60000) / 1000);
    const displayTimer = remainingMs === 0 
      ? 'BREACH S.O.S' 
      : `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    
    return {
      faultStart,
      elapsedMs,
      elapsedMins,
      isRed,
      remainingMs,
      displayTimer
    };
  };

  // Helper to obtain the style and display parameters for card items based on equipment type
  const getFaultNodeDisplayMeta = (node: NetworkNode) => {
    switch (node.type) {
      case 'dp':
        return {
          themeColor: 'rose',
          loss: '-28.4 dB',
          probType: 'ATTENUATION',
          typeName: 'DP CELL',
          btnBg: 'bg-rose-500 hover:bg-rose-455 hover:scale-105 active:scale-95 text-slate-950 focus:outline-none',
          hoverBorder: 'rgba(244, 63, 94, 0.5)',
          hoverBg: 'rgba(244, 63, 94, 0.16)',
          shadow: '0 6px 16px rgba(244, 63, 94, 0.18)',
          textLight: 'text-rose-300',
          textMuted: 'text-rose-400',
          bgPill: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          bgCard: 'bg-rose-950/10 border border-rose-500/20',
          borderTTC: 'border-rose-955/20',
        };
      case 'pole':
        return {
          themeColor: 'amber',
          loss: '-12.8 dB',
          probType: 'SAG ALIGN',
          typeName: 'POLE STRUCT',
          btnBg: 'bg-amber-500 hover:bg-amber-455 hover:scale-105 active:scale-95 text-slate-950 focus:outline-none',
          hoverBorder: 'rgba(245, 158, 11, 0.5)',
          hoverBg: 'rgba(245, 158, 11, 0.16)',
          shadow: '0 6px 16px rgba(245, 158, 11, 0.18)',
          textLight: 'text-amber-300',
          textMuted: 'text-amber-400',
          bgPill: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          bgCard: 'bg-amber-950/10 border border-amber-500/20',
          borderTTC: 'border-amber-955/20',
        };
      case 'msan':
        return {
          themeColor: 'orange',
          loss: '-31.2 dB vdsl',
          probType: 'THERMAL HALT',
          typeName: 'MSAN EXCH',
          btnBg: 'bg-orange-500 hover:bg-orange-455 hover:scale-105 active:scale-95 text-slate-950 focus:outline-none',
          hoverBorder: 'rgba(249, 115, 22, 0.5)',
          hoverBg: 'rgba(249, 115, 22, 0.16)',
          shadow: '0 6px 16px rgba(249, 115, 22, 0.18)',
          textLight: 'text-orange-300',
          textMuted: 'text-orange-400',
          bgPill: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
          bgCard: 'bg-orange-950/10 border border-orange-500/20',
          borderTTC: 'border-orange-955/20',
        };
      case 'cabinet':
      default:
        return {
          themeColor: 'emerald',
          loss: '-29.8 dB',
          probType: 'LOW POWER',
          typeName: 'FIBER CAB',
          btnBg: 'bg-emerald-500 hover:bg-emerald-455 hover:scale-105 active:scale-95 text-slate-950 focus:outline-none',
          hoverBorder: 'rgba(16, 185, 129, 0.5)',
          hoverBg: 'rgba(16, 185, 129, 0.16)',
          shadow: '0 6px 16px rgba(16, 185, 129, 0.18)',
          textLight: 'text-emerald-300',
          textMuted: 'text-emerald-400',
          bgPill: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          bgCard: 'bg-emerald-950/10 border border-emerald-500/20',
          borderTTC: 'border-emerald-955/20',
        };
    }
  };

  // Memoized computed sorted active alarms list
  const sortedActiveAlarms = useMemo(() => {
    const faultNodes = activeNodes.filter(n => n.status === 'fault');
    
    // Sort logic
    if (dashboardSortMode === 'ttc-asc') {
      return [...faultNodes].sort((a, b) => {
        const ttcA = getFaultNodeTTC(a).remainingMs;
        const ttcB = getFaultNodeTTC(b).remainingMs;
        return ttcA - ttcB; // Shortest first (Priority)
      });
    } else if (dashboardSortMode === 'ttc-desc') {
      return [...faultNodes].sort((a, b) => {
        const ttcA = getFaultNodeTTC(a).remainingMs;
        const ttcB = getFaultNodeTTC(b).remainingMs;
        return ttcB - ttcA; // Longest first
      });
    }
    return faultNodes;
  }, [activeNodes, dashboardSortMode, playbackHourAgo]);

  // Sort each category by quickest remaining TTC countdown for grouped-by-type view
  const getSortedCategoryNodes = (type: NodeType) => {
    const list = activeNodes.filter(n => n.status === 'fault' && n.type === type);
    return [...list].sort((a, b) => {
      const ttcA = getFaultNodeTTC(a).remainingMs;
      const ttcB = getFaultNodeTTC(b).remainingMs;
      return ttcA - ttcB; // Shortest first (Priority)
    });
  };

  // Helper to render a specific fault node card
  const renderFaultNodeCard = (node: NetworkNode) => {
    const meta = getFaultNodeDisplayMeta(node);
    const ttc = getFaultNodeTTC(node);
    const est = getEstimatedRepairTime(node.lat, node.lon);

    return (
      <motion.div
        key={`resolver-${node.id}`}
        whileHover={{ 
          scale: 1.03, 
          borderColor: meta.hoverBorder, 
          backgroundColor: meta.hoverBg,
          boxShadow: meta.shadow
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className={`${meta.bgCard} border p-2.5 rounded-lg text-[10px] font-mono flex flex-col gap-1.5 relative cursor-pointer`}
        onClick={() => setSelectedNodeId(node.id)}
      >
        <div className="flex justify-between items-center gap-1">
          <span className={`font-extrabold ${meta.textLight} truncate max-w-[110px]`} title={node.label || node.id}>
            {node.label || node.id}
          </span>
          <span className={`text-[7px] px-1 py-0.5 rounded border leading-none ${meta.bgPill}`}>
            {meta.typeName}
          </span>
        </div>
        
        <div className={`grid grid-cols-2 gap-1 text-[8px] text-slate-400 border-t border-b ${meta.borderTTC} py-0.5 leading-none`}>
          <div>
            <span className="text-slate-550 block text-[7px] font-bold">LOSS:</span>
            <span className={`${meta.textMuted} block font-black`}>{meta.loss}</span>
          </div>
          <div>
            <span className="text-slate-550 block text-[7px] font-bold text-right">TYPE:</span>
            <span className={`${meta.textLight} block font-bold text-right truncate`}>{meta.probType}</span>
          </div>
        </div>

        <div className={`flex items-center justify-between text-[7.5px] font-mono py-1 border-b ${meta.borderTTC} text-slate-400 leading-none`}>
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>ETA: <span className="text-cyan-300 font-extrabold">{est.minutes}m</span></span>
          </div>
          <span className="text-slate-550 font-bold uppercase truncate max-w-[90px]" title={`${est.hub} (${est.distanceKm} km away)`}>
            {est.hub} ({est.distanceKm}k)
          </span>
        </div>

        <div className={`flex items-center justify-between text-[7.5px] font-mono py-1 border-b leading-none ${
          ttc.isRed 
            ? 'text-rose-400 bg-rose-950/20 border-rose-500/20 px-1 rounded animate-pulse font-extrabold' 
            : 'text-amber-400 ' + meta.borderTTC
        }`} id={`ttc-timer-${node.id}`} data-elapsed={ttc.elapsedMins}>
          <div className="flex items-center gap-1">
            <AlertTriangle className={`w-2.5 h-2.5 ${ttc.isRed ? 'text-rose-500' : 'text-amber-500'}`} />
            <span>TTC COUNTDOWN:</span>
          </div>
          <span className={`${ttc.isRed ? 'text-rose-400 font-extrabold font-mono text-[8.5px]' : 'text-amber-300 font-bold'}`}>
            <AnimatedTimer timerStr={ttc.displayTimer} />
          </span>
        </div>

        <div className="flex justify-between items-center gap-1 pt-0.5">
          <span className="text-[7.5px] text-slate-500 truncate max-w-[70px]">
            {node.lat.toFixed(4)}°, {node.lon.toFixed(4)}°
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOneClickRepair(node.id, node.label || node.id);
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 ${meta.btnBg} text-[8.5px] font-extrabold uppercase rounded cursor-pointer transition-all shadow-md shrink-0`}
          >
            <Wrench className="w-2.5 h-2.5 text-slate-950" />
            <span>REPAIR</span>
          </button>
        </div>
      </motion.div>
    );
  };

  // Handle weather storm front attenuation trigger effect
  useEffect(() => {
    if (!isWeatherActive) return;

    addLog('[WEATHER] Storm front simulation initiated over Homagama NOC sector.');

    const stormInterval = setInterval(() => {
      setNodes(prev => {
        const normalNodes = prev.filter(n => n.status === 'normal');
        if (normalNodes.length === 0) return prev;

        const targetNode = normalNodes[Math.floor(Math.random() * normalNodes.length)];
        addLog(`[WEATHER] Storm precipitation spike at '${targetNode.label || targetNode.id}'. Signal drop!`);
        
        if (audioAlertEnabled) {
          playAlertSound();
        }

        setTotalFaultsEncounteredInSession(t => t + 1);

        return prev.map(n => n.id === targetNode.id ? { ...n, status: 'fault', faultDetectedAt: Date.now() } : n);
      });
    }, 11000);

    return () => {
      clearInterval(stormInterval);
      addLog('[WEATHER] Storm front dispersed. Microwave / fiber propagation normal.');
    };
  }, [isWeatherActive, audioAlertEnabled]);

  // Play a beautiful, futuristic telecom alarm sound via Web Audio API synth
  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const now = audioCtx.currentTime;
      
      // Tone 1: High alarm warning chime sliding frequency
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.15); // slide up
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.35); // slide down
      
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      // Tone 2: Futuristic low resonant warble
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, now); // A2
      osc2.frequency.linearRampToValueAtTime(147, now + 0.2); // D3
      
      gain2.gain.setValueAtTime(0.18, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.42);
      
      osc2.start(now);
      osc2.stop(now + 0.47);
    } catch (err) {
      console.warn('Web Audio API is blocked or not sustained:', err);
    }
  };

  const playTestBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  };

  // High quality digital success acoustic signal for automated fiber repairs
  const playRepairChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;
      
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.08); // C6
      
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      gain2.gain.setValueAtTime(0.05, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.4);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (e) {}
  };

  // HUD, Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Unified Global Command Bar States
  const [commandBarQuery, setCommandBarQuery] = useState('');
  const [isCommandBarScanning, setIsCommandBarScanning] = useState(false);
  const [commandBarScanProgress, setCommandBarScanProgress] = useState(0);
  const [commandBarScanStep, setCommandBarScanStep] = useState('');
  
  // Provisioning Form States
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<NodeType>('pole');
  const [newLat, setNewLat] = useState('6.8400');
  const [newLon, setNewLon] = useState('80.0000');
  const [newDescription, setNewDescription] = useState('');
  const [connectToNodeId, setConnectToNodeId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  
  // Ticket Generator simulation state
  const [ticketRef, setTicketRef] = useState<string | null>(null);

  // Live clock display
  const [timeStr, setTimeStr] = useState('2026-06-05 13:56:27 UTC');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace('GMT', 'UTC'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute centers for coordinate translation calculation formula display
  const centerLat = useMemo(() => {
    if (nodes.length === 0) return 34.0525;
    return nodes.reduce((sum, n) => sum + n.lat, 0) / nodes.length;
  }, [nodes]);

  const centerLon = useMemo(() => {
    if (nodes.length === 0) return -118.2438;
    return nodes.reduce((sum, n) => sum + n.lon, 0) / nodes.length;
  }, [nodes]);

  // Selected node computed object
  const selectedNode = useMemo(() => {
    return activeNodes.find((n) => n.id === selectedNodeId) || null;
  }, [activeNodes, selectedNodeId]);

  // Compare node computed object
  const compareNode = useMemo(() => {
    return activeNodes.find((n) => n.id === compareNodeId) || null;
  }, [activeNodes, compareNodeId]);

  // Derived 3D coordinate values of selected node for live formula display
  const selectedNodeCoords3D = useMemo(() => {
    if (!selectedNode) return null;
    const coeff = 25000;
    const radCenterLat = centerLat * Math.PI / 180;
    const x = (selectedNode.lon - centerLon) * Math.cos(radCenterLat) * coeff;
    const z = -(selectedNode.lat - centerLat) * coeff;
    
    // Calculate actual local 3D scale-coefficient projection values to read elevation
    const mapX = (selectedNode.lon - centerLon) * Math.cos(radCenterLat) * 600;
    const mapZ = -(selectedNode.lat - centerLat) * 600;
    const terrainHeightUnits = getTerrainElevation(mapX, mapZ);
    // Physically scaled altitude meters above baseline
    const altitudeMeters = 18.2 + terrainHeightUnits * 14.5;

    return { x, y: altitudeMeters, z };
  }, [selectedNode, centerLat, centerLon]);

  // Analyze historical outage frequencies to predict an operational risk score (0-100%)
  const predictiveRiskScore = useMemo(() => {
    if (!selectedNode) return null;
    let outageCount = 0;
    let totalLogs = 0;
    Object.values(HISTORICAL_TIMELINE).forEach((event) => {
      totalLogs++;
      if (event.faults && event.faults.includes(selectedNode.id)) {
        outageCount++;
      }
    });
    
    // Base nominal risk of 3% for general thermal and line resistance noise, incremented by 18.5% per past incident
    const baseRisk = 3;
    const factor = outageCount * 18.5;
    const score = Math.max(0, Math.min(99.4, baseRisk + factor));
    
    // Choose status class and textual prognosis
    let status: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' = 'NOMINAL';
    let colorClass = 'text-emerald-400';
    let bgClass = 'bg-emerald-500/10 border-emerald-500/30';
    let prognosis = 'Highly resilient. Low probability of unscheduled faults.';

    if (score > 70) {
      status = 'CRITICAL';
      colorClass = 'text-rose-400';
      bgClass = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
      prognosis = 'Critical outage density. Urgent inspection recommended.';
    } else if (score > 35) {
      status = 'ELEVATED';
      colorClass = 'text-amber-400';
      bgClass = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      prognosis = 'Moderate failure history. Susceptible to local monsoon loads.';
    }

    return {
      score,
      outageCount,
      totalLogs,
      status,
      colorClass,
      bgClass,
      prognosis
    };
  }, [selectedNode]);

  // Calculate geodetic proximity (within 500m) for assets relative to currently selected node
  const proximateAssets = useMemo(() => {
    if (!selectedNode) return [];
    return activeNodes
      .filter((n) => n.id !== selectedNode.id)
      .map((n) => ({
        node: n,
        distance: getDistanceMeters(selectedNode.lat, selectedNode.lon, n.lat, n.lon)
      }))
      .filter((item) => item.distance <= 500)
      .sort((a, b) => a.distance - b.distance);
  }, [selectedNode, activeNodes]);

  // Filtered nodes list for directories
  const filteredNodes = useMemo(() => {
    return activeNodes.filter((n) => {
      const matchesSearch = n.label?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            n.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || n.type === filterType;
      const matchesStatus = filterStatus === 'all' || n.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [activeNodes, searchQuery, filterType, filterStatus]);

  // Count metrics and load details
  const stats = useMemo(() => {
    const total = activeNodes.length;
    const poles = activeNodes.filter(n => n.type === 'pole').length;
    const dps = activeNodes.filter(n => n.type === 'dp').length;
    const msans = activeNodes.filter(n => n.type === 'msan').length;
    const cabinets = activeNodes.filter(n => n.type === 'cabinet').length;
    const faults = activeNodes.filter(n => n.status === 'fault').length;
    const normal = activeNodes.filter(n => n.status === 'normal').length;
    const linkCount = activeConnections.length;
    
    // Dynamic load parameters mirroring Bento Grid mockup layout values
    let loadAvg = faults > 0 ? 32 + (faults * 15) : 24;
    let upstreamSpeed = faults > 0 ? (4.2 - (faults * 0.4)).toFixed(1) : "4.2";
    let downstreamSpeed = faults > 0 ? (9.8 - (faults * 0.9)).toFixed(1) : "9.8";

    if (playbackHourAgo > 0) {
      const event = HISTORICAL_TIMELINE[playbackHourAgo];
      if (event) {
        loadAvg = event.load;
        upstreamSpeed = event.up.toFixed(1);
        downstreamSpeed = event.down.toFixed(1);
      }
    }

    return { 
      total, 
      poles, 
      dps, 
      msans,
      cabinets,
      faults, 
      normal, 
      linkCount, 
      loadAvg, 
      upstreamSpeed, 
      downstreamSpeed 
    };
  }, [activeNodes, activeConnections, playbackHourAgo]);

  // Monitor fault count changes to trigger audible alert if enabled
  const prevFaultsCount = useRef<number>(stats.faults);
  useEffect(() => {
    if (audioAlertEnabled && stats.faults > prevFaultsCount.current) {
      playAlertSound();
    }
    prevFaultsCount.current = stats.faults;
  }, [stats.faults, audioAlertEnabled]);

  // Monitor fault count changes to handle auto-collapse and auto-expansion of Anomaly Resolution Dashboard
  const prevDashboardFaultsCount = useRef<number>(-1);
  useEffect(() => {
    if (stats.faults === 0) {
      setIsDashboardCollapsed(true);
    } else if (prevDashboardFaultsCount.current !== -1 && stats.faults > prevDashboardFaultsCount.current) {
      setIsDashboardCollapsed(false);
    } else if (prevDashboardFaultsCount.current === -1 && stats.faults > 0) {
      setIsDashboardCollapsed(false);
    }
    prevDashboardFaultsCount.current = stats.faults;
  }, [stats.faults]);

  // Handle support ticket creation Simulation
  const handleGenerateTicket = () => {
    const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketRef(ticketId);
    addLog(`[AI AGENT] Registered NetOps diagnostic ticket request ${ticketId} in corporate backlog.`);
    setTimeout(() => {
      setTicketRef(null);
    }, 4500);
  };

  // Handlers
  const handleToggleStatus = (id: string, label: string) => {
    if (playbackHourAgo > 0) {
      setPlaybackHourAgo(0);
      setIsPlaybackPlaying(false);
      addLog(`[SYSTEM] Exited historical playback to execute live node intervention.`);
    }
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        const nextStatus: NodeStatus = node.status === 'normal' ? 'fault' : 'normal';
        const msg = nextStatus === 'fault' 
          ? `USER SIMULATED FAULT: High signal attenuation detected at '${label}'.` 
          : `RESOLVED ALARM: Node Status reset to stable normal for '${label}'.`;
        addLog(msg);
        
        if (nextStatus === 'fault') {
          setTotalFaultsEncounteredInSession(t => t + 1);
        } else {
          setResolvedAlarmsCount(r => r + 1);
        }
        
        return { ...node, status: nextStatus, faultDetectedAt: nextStatus === 'fault' ? Date.now() : undefined };
      }
      return node;
    }));
  };

  const handleOneClickRepair = (id: string, label: string) => {
    if (playbackHourAgo > 0) {
      setPlaybackHourAgo(0);
      setIsPlaybackPlaying(false);
      addLog(`[SYSTEM] Exited historical playback to execute node repair.`);
    }
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        addLog(`[REPAIR] Triggering automatic laser OTDR calibration for '${label}'...`);
        addLog(`[REPAIR] Aligning micro-optics. Splice loss corrected to 0.01 dB.`);
        addLog(`[SUCCESS] Emergency resolved. '${label}' fiber loop is normal.`);
        playRepairChime();
        setResolvedAlarmsCount(r => r + 1);
        return { ...node, status: 'normal' as const, faultDetectedAt: undefined };
      }
      return node;
    }));
  };

  const handleSelectNode = (node: NetworkNode | null) => {
    if (node === null) {
      setSelectedNodeId(null);
      setCompareNodeId(null);
      setIsSelectingCompareTarget(false);
      addLog('[SYSTEM] Viewport reset. Targeting system overview.');
    } else if (isSelectingCompareTarget) {
      if (node.id === selectedNodeId) {
        addLog(`Cannot compare node '${node.label || node.id}' with itself. Select a different node.`);
        return;
      }
      setCompareNodeId(node.id);
      setIsSelectingCompareTarget(false);
      addLog(`Comparison target selected: '${node.label || node.id}'. Overlaying side-by-side trends.`);
    } else {
      setSelectedNodeId(node.id);
      setCompareNodeId(null);
      setIsSelectingCompareTarget(false);
      addLog(`Viewport pivoted targeting node: '${node.label || node.id}'`);
    }
  };

  // Web Speech API text-to-speech confirmation engine
  const speakBack = (text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  };

  // Extract reference node from human spoken commands
  const findNodeFromSpeech = (text: string): NetworkNode | null => {
    const cleanText = text.toLowerCase().trim();
    
    // 1. Direct label pattern (e.g. "HO-ATR-0520-001" or parts like "ho atr 520 001")
    for (const node of nodes) {
      const labelLower = (node.label || '').toLowerCase();
      if (labelLower && cleanText.includes(labelLower)) {
        return node;
      }
      
      const labelSpaceless = labelLower.replace(/[^a-z0-9]/g, '');
      const textSpaceless = cleanText.replace(/[^a-z0-9]/g, '');
      if (labelSpaceless && textSpaceless.includes(labelSpaceless)) {
        return node;
      }
    }

    // 2. Extracted digit or sequence number pattern (e.g. "04" or "4" for "node-04", or "node 4")
    const matchDigits = cleanText.match(/(?:node|pole|asset|spot|number)?\s*(\d+)/i);
    if (matchDigits) {
      const numVal = parseInt(matchDigits[1], 10);
      const paddedId = `node-${numVal.toString().padStart(2, '0')}`;
      const matchingNode = nodes.find(n => n.id === paddedId || n.id === `node-${numVal}`);
      if (matchingNode) {
        return matchingNode;
      }
    }

    // 3. Fallback description search matching (e.g. "Town Court" or "NSBM Green University")
    for (const node of nodes) {
      const descLower = (node.description || '').toLowerCase();
      if (descLower && cleanText.includes(descLower)) {
        return node;
      }
      
      // Match multi-word indicators (e.g. "NSBM" or "Kottawa")
      const words = descLower.split(/\s+/);
      let hitCount = 0;
      for (const word of words) {
        if (word.length >= 4 && cleanText.includes(word)) {
          hitCount++;
        }
      }
      if (hitCount >= 2) {
        return node;
      }
    }

    return null;
  };

  // Dispatch speech commands to actual application state modifiers
  const executeVoiceCommand = (transcript: string) => {
    const cleanSpeech = transcript.trim().toLowerCase();
    addLog(`[VOICE INPUT] Recognized: "${transcript}"`);

    // Command A: List faults / Show faults
    if (cleanSpeech.includes('show faults') || cleanSpeech.includes('list faults') || cleanSpeech.includes('check faults') || cleanSpeech.includes('view faults')) {
      const faultedNodes = nodes.filter(n => n.status === 'fault');
      if (faultedNodes.length === 0) {
        addLog(`[VOICE CMD] No active network attenuations detected. Global pathways are operating normally.`);
        speakBack('No active network faults detected. System integrity is running optimal.');
      } else {
        const labels = faultedNodes.map(n => n.label || n.id).join(', ');
        addLog(`[VOICE CMD] Active alarms on ${faultedNodes.length} nodes: ${labels}`);
        speakBack(`Discovered ${faultedNodes.length} active network alarms. Fault coordinates list: ${labels}. Ready to override.`);
        // Select the first faulted node
        handleSelectNode(faultedNodes[0]);
      }
      return;
    }

    // Command B: Clear selection / reset target
    if (cleanSpeech.includes('clear selection') || cleanSpeech.includes('deselect') || cleanSpeech.includes('reset view') || cleanSpeech.includes('clear target')) {
      handleSelectNode(null);
      addLog(`[VOICE CMD] Cleared selected nodes. Resetting view camera context.`);
      speakBack('Cleared target selection. View centered.');
      return;
    }

    // Command C: De-escalate / Resolve all
    if (cleanSpeech.includes('de-escalate') || cleanSpeech.includes('fix all') || cleanSpeech.includes('repair all') || cleanSpeech.includes('resolve everything') || cleanSpeech.includes('clear all alert')) {
      handleMuteAllFaults();
      addLog(`[VOICE CMD] Initiating master regional de-escalation overrides completed.`);
      speakBack('Regional network overrides complete. All fiber pathways restored to normal operations.');
      return;
    }

    // Command D: Start storm / trigger storm
    if (cleanSpeech.includes('trigger storm') || cleanSpeech.includes('start storm') || cleanSpeech.includes('simulate storm') || cleanSpeech.includes('activate weather') || cleanSpeech.includes('start weather')) {
      setIsWeatherActive(true);
      addLog(`[VOICE CMD] Heavy thunderstorm simulation triggered.`);
      speakBack('Tropical storm front simulation initiated over Homagama. Network warning alarms activated.');
      return;
    }
    if (cleanSpeech.includes('stop storm') || cleanSpeech.includes('shutdown storm') || cleanSpeech.includes('clear storm') || cleanSpeech.includes('disable weather') || cleanSpeech.includes('stable sky') || cleanSpeech.includes('clear weather')) {
      setIsWeatherActive(false);
      addLog(`[VOICE CMD] Terminated storm simulation.`);
      speakBack('Weather simulation shut down. Baseline atmospheric levels verified.');
      return;
    }

    // Command E: Silence alarm / stop buzzer
    if (cleanSpeech.includes('mute alarm') || cleanSpeech.includes('mute buzzer') || cleanSpeech.includes('silence alarm') || cleanSpeech.includes('stop buzzer')) {
      setAudioAlertEnabled(false);
      addLog(`[VOICE CMD] Network audio alarms disabled.`);
      speakBack('Network warning alarms muted.');
      return;
    }
    if (cleanSpeech.includes('enable alarm') || cleanSpeech.includes('activate alarm') || cleanSpeech.includes('turn on alarm')) {
      setAudioAlertEnabled(true);
      addLog(`[VOICE CMD] Network audio alarms enabled.`);
      speakBack('Network warning alarms enabled.');
      return;
    }

    // Command F: Repair target node (e.g. "Repair node 04")
    if (cleanSpeech.includes('repair') || cleanSpeech.includes('fix') || cleanSpeech.includes('restore') || cleanSpeech.includes('correct') || cleanSpeech.includes('resolve')) {
      const node = findNodeFromSpeech(cleanSpeech);
      if (node) {
        if (node.status === 'normal') {
          addLog(`[VOICE CMD] Asset '${node.label || node.id}' is already functioning inside normal limits.`);
          speakBack(`Asset ${node.label || node.id} is already in direct service.`);
        } else {
          handleOneClickRepair(node.id, node.label || node.id);
          speakBack(`Automatic laser repair sequence complete. Asset ${node.label || node.id} restored successfully.`);
        }
      } else {
        addLog(`[VOICE CMD] Repair target not identified. Ensure correct node code.`);
        speakBack(`Could not identify the network asset for repair.`);
      }
      return;
    }

    // Command G: Fault or break target node (e.g. "simulate fault node 03")
    if (cleanSpeech.includes('break') || cleanSpeech.includes('disrupt') || cleanSpeech.includes('fault') || cleanSpeech.includes('simulate fault') || cleanSpeech.includes('damage') || cleanSpeech.includes('disrupt node')) {
      const node = findNodeFromSpeech(cleanSpeech);
      if (node) {
        if (node.status === 'fault') {
          addLog(`[VOICE CMD] Asset '${node.label || node.id}' is already reporting signal attenuation faults.`);
          speakBack(`Asset ${node.label || node.id} already reports active attenuation alarms.`);
        } else {
          handleToggleStatus(node.id, node.label || node.id);
          speakBack(`Simulating localized signal attenuation. Verification telemetry reports critical alarm status.`);
        }
      } else {
        addLog(`[VOICE CMD] Disruption target not matched from query.`);
        speakBack(`Could not locate that network asset.`);
      }
      return;
    }

    // Command H: Match selection / pivot camera (e.g. "Select node 02")
    if (cleanSpeech.includes('select') || cleanSpeech.includes('show') || cleanSpeech.includes('view') || cleanSpeech.includes('inspect') || cleanSpeech.includes('target') || cleanSpeech.includes('track')) {
      const node = findNodeFromSpeech(cleanSpeech);
      if (node) {
        handleSelectNode(node);
        addLog(`[VOICE CMD] Re-centering NOC telemetry view on matching asset: ${node.label || node.id}`);
        speakBack(`Centering NOC coordinate fields on ${node.label || node.id}. Inspection mode active.`);
      } else {
        addLog(`[VOICE CMD] Selection target coordinate not identified.`);
        speakBack(`Could not find a matching network node.`);
      }
      return;
    }

    addLog(`[VOICE CMD] Unrecognized sequence "${transcript}". Try saying "Repair node 04" or "Show faults".`);
    speakBack(`Command not recognized. Ready for operator instruction.`);
  };

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceStatus('Speech API unsupported in this sandbox browser.');
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setVoiceIsListening(true);
      setVoiceStatus('Listening... Speak now.');
      setVoiceTranscript('');
    };

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const currentText = final || interim;
      setVoiceTranscript(currentText);
    };

    rec.onerror = (event: any) => {
      console.warn('Speech recognition interface error:', event);
      setVoiceIsListening(false);
      if (event.error === 'not-allowed') {
        setVoiceStatus('Microphone Access Blocked. Use manual override below.');
      } else {
        setVoiceStatus(`Mic Status: ${event.error}.`);
      }
    };

    rec.onend = () => {
      setVoiceIsListening(false);
      setVoiceStatus('Operator Mic: Standby');
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const prevIsListeningRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevIsListeningRef.current && !voiceIsListening && voiceTranscript.trim()) {
      executeVoiceCommand(voiceTranscript);
    }
    prevIsListeningRef.current = voiceIsListening;
  }, [voiceIsListening, voiceTranscript]);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        addLog('[VOICE ERR] Web Speech API not supported in the active iframe.');
        speakBack('Voice recognition is unsupported on this browser agent.');
        return;
      }
    }

    if (voiceIsListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Failed to start speech recognition context:', e);
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    }
  };

  const handleDeleteNode = (id: string, label: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    addLog(`DECOMMISSIONED: asset '${label}' completely unlinked from network topography.`);
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
    setFormSuccess('Asset decommissioned successfully.');
    setTimeout(() => setFormSuccess(''), 3000);
  };

  const handleProvisionNode = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const latVal = parseFloat(newLat);
    const lonVal = parseFloat(newLon);

    if (isNaN(latVal) || isNaN(lonVal)) {
      setFormError('Coordinates must be valid decimals.');
      return;
    }

    if (latVal < -90 || latVal > 90 || lonVal < -180 || lonVal > 180) {
      setFormError('Invalid Latitude or Longitude range.');
      return;
    }

    const fallbackLabel = newType === 'pole' 
      ? `Pole-${nodes.length + 1}` 
      : newType === 'dp' 
        ? `DP-${nodes.length + 1}` 
        : newType === 'msan' 
          ? `MSAN-${nodes.length + 1}` 
          : `Cabinet-${nodes.length + 1}`;
    const labelStr = newLabel.trim() || fallbackLabel;
    
    let prefix = 'node-';
    if (newType === 'msan') {
      prefix = 'msan-';
    } else if (newType === 'cabinet') {
      prefix = 'cab-';
    }
    const nextNodeId = `${prefix}custom-${Date.now().toString().slice(-4)}`;

    const newCreatedNode: NetworkNode = {
      id: nextNodeId,
      type: newType,
      lat: latVal,
      lon: lonVal,
      status: 'normal',
      label: labelStr,
      description: newDescription.trim() || `Newly provisioned ${newType} via NetOps Workspace.`
    };

    setNodes(prev => [...prev, newCreatedNode]);

    if (playbackHourAgo > 0) {
      setPlaybackHourAgo(0);
      setIsPlaybackPlaying(false);
      addLog(`[SYSTEM] Exited historical playback to view newly provisioned live node.`);
    }

    if (connectToNodeId) {
      const newConn: Connection = {
        from: connectToNodeId,
        to: nextNodeId,
        type: 'fiber'
      };
      setConnections(prev => [...prev, newConn]);
      const targetLabel = nodes.find(n => n.id === connectToNodeId)?.label || connectToNodeId;
      addLog(`PROVISIONED: Attached '${labelStr}' to aerial port: '${targetLabel}'`);
    } else {
      addLog(`PROVISIONED: Placed wireless independent structure '${labelStr}'`);
    }

    setSelectedNodeId(nextNodeId);
    setNewLabel('');
    setNewDescription('');
    setFormSuccess(`Successfully provisioned "${labelStr}" on GIS network.`);
    setTimeout(() => setFormSuccess(''), 4000);
  };

  const handleMuteAllFaults = () => {
    if (playbackHourAgo > 0) {
      setPlaybackHourAgo(0);
      setIsPlaybackPlaying(false);
      addLog(`[SYSTEM] Exited historical playback to de-escalate live system faults.`);
    }
    setNodes(prev => {
      const activeFaultsCount = prev.filter(n => n.status === 'fault').length;
      if (activeFaultsCount > 0) {
        setResolvedAlarmsCount(r => r + activeFaultsCount);
      }
      return prev.map(n => ({ ...n, status: 'normal', faultDetectedAt: undefined }));
    });
    addLog('[SYSTEM] De-escalated all local active alarm nodes back to system normal.');
  };

  const runGlobalDiagnostics = () => {
    if (isCommandBarScanning) return;
    setIsCommandBarScanning(true);
    setCommandBarScanProgress(0);
    setCommandBarScanStep('Initializing...');
    addLog('[DIAGNOSTICS] Launching system-wide map diagnostics telemetry...');

    const steps = [
      { p: 15, msg: 'Wavelength scanning (OTDR Fiber Lines)...', log: '[DIAGNOSTICS] Sweep spectrum wavelength sweep check on passive routes.' },
      { p: 40, msg: 'Calibrating aerial transceivers...', log: '[DIAGNOSTICS] Verified distribution points transceiver voltages to be within tolerance margins.' },
      { p: 65, msg: 'Modeling weather sag constraints...', log: '[DIAGNOSTICS] Computed weather sag risk based on storm precipitation parameters.' },
      { p: 85, msg: 'Processing AI predictive telemetry...', log: '[DIAGNOSTICS] Predictive algorithm reports signal levels are fully optimized.' },
      { p: 100, msg: 'Scan complete. All paths synchronized.', log: `[SUCCESS] Unified Diagnostics Complete. All ${activeNodes.length} nodes verified and stable.` }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setCommandBarScanProgress(step.p);
        setCommandBarScanStep(step.msg);
        addLog(step.log);
        if (step.p === 100) {
          setIsCommandBarScanning(false);
          // Audio chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (e) {}
        }
      }, (idx + 1) * 850);
    });
  };

  const handleExportCSV = () => {
    // Audit CSV Headings
    const headers = [
      "Node ID",
      "Label",
      "Type",
      "Latitude",
      "Longitude",
      "Status",
      "Description",
      "Outgoing Connections To",
      "Incoming Connections From"
    ];

    // Escape values with double quotes if they contain potential format characters
    const escape = (val: any) => {
      const text = String(val ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = nodes.map(node => {
      // Outgoing links where node is sender
      const outgoing = connections
        .filter(c => c.from === node.id)
        .map(c => `${c.to} (${c.type.toUpperCase()})`)
        .join("; ");

      // Incoming links where node is receiver
      const incoming = connections
        .filter(c => c.to === node.id)
        .map(c => `${c.from} (${c.type.toUpperCase()})`)
        .join("; ");

      return [
        escape(node.id),
        escape(node.label || ''),
        escape(node.type.toUpperCase()),
        escape(node.lat),
        escape(node.lon),
        escape(node.status.toUpperCase()),
        escape(node.description || ''),
        escape(outgoing),
        escape(incoming)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    // Trigger local client browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nexgen_creators_telecom_audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Write audit download indicator log to telemetry HUD
    addLog(`[AUDIT] Compiled database catalog index to CSV. Exported ${nodes.length} nodes and ${connections.length} live connections.`);
  };

  // Uptime bar charts mock array
  const uptimeProjectionHeights = [60, 80, 75, 90, 45, 70, 85, 95, 80, 90];

  return (
    <div className="min-h-screen bg-[#02040a] font-sans flex flex-col text-slate-100 p-3 sm:p-5 gap-4" id="app-root">
      
      {/* 1. Header Bento-Card */}
      <header className="relative overflow-hidden bg-[rgba(15,23,42,0.85)] border border-[rgba(56,189,248,0.2)] rounded-xl py-3 px-6 flex flex-col xl:flex-row justify-between items-center gap-4 before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#38bdf8] before:to-transparent before:opacity-50" id="bento-header">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center select-none shadow-lg shadow-cyan-500/20 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)] overflow-hidden">
            <img src="/assets/icon.png" alt="Icon" className="w-full h-full object-contain animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#38bdf8] uppercase">NEXUS • NEXGEN CREATORS</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[9px] font-mono text-emerald-400 font-semibold uppercase">NOC LINK ONLINE</span>
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              <img src="/assets/logo.png" alt="SLT NEXUS" className="h-6 object-contain" /> <span className="font-light text-slate-400">| DIGITAL TWIN MATRIX</span>
            </h1>
          </div>
        </div>

        {/* Right Section: Compact telemetry stats & modular action items grouped neatly and aligned perfectly */}
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto font-mono text-xs">
          
          {/* Telemetry Status Widget with unified flex line-up */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            {/* Status box */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3.5 py-1.5 h-9 flex items-center gap-3.5 grow w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase">DIAGNOSTICS:</span>
                <span className={`text-[10px] font-bold ${stats.faults > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                  {stats.faults > 0 ? 'ATTENUATION ALERT' : 'OPTIMAL'}
                </span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase">
                  {activeTab === 'main' ? 'TOTAL POLES:' : activeTab === 'copper' ? 'ACTIVE MSANS:' : 'FTTH CABINETS:'}
                </span>
                <span className="text-cyan-400 font-bold">
                  {activeTab === 'main' ? stats.poles : activeTab === 'copper' ? stats.msans : stats.cabinets} / {stats.total}
                </span>
              </div>
            </div>

            {/* Live Clock box with timezone indicator - aligned height */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3.5 py-1.5 h-9 flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-200 font-semibold text-[11px]">{timeStr}</span>
              <span className="text-[8px] bg-slate-900 border border-slate-800/50 text-slate-500 font-bold px-1.5 py-0.5 rounded">UTC</span>
            </div>
          </div>

          {/* Action buttons with unified design */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 active:scale-95 text-teal-400 border border-teal-500/20 hover:border-teal-500/40 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all w-full md:w-auto"
              title="Generate and download full network nodes & connections CSV audit report"
              id="export-csv-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span>CSV AUDIT</span>
            </button>

            <button
              onClick={() => {
                const nextState = !audioAlertEnabled;
                setAudioAlertEnabled(nextState);
                addLog(`[AUDIO] Network fault alarms ${nextState ? 'ENABLED' : 'MUTED'}.`);
                if (nextState) {
                  playTestBeep();
                }
              }}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all active:scale-95 w-full md:w-auto ${
                audioAlertEnabled
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 hover:border-rose-500/40'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-500 border-slate-850 hover:border-slate-800'
              }`}
              title="Toggle audible warning sound on new network faults"
              id="audio-alert-btn"
            >
              {audioAlertEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>ALARM ACTIVE</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>ALARM MUTED</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* 2. Elevate the 3D map viewport to sit prominently at the top across 100% full-width */}
      <div className="w-full flex flex-col gap-4 flex-1 items-stretch" id="bento-grid-workspace">
        
        {/* Dynamic Sub-Page Tab Navigation Controller */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3 bg-[rgba(15,23,42,0.8)] border border-[rgba(56,189,248,0.15)] rounded-2xl p-2.5 backdrop-blur-md shadow-lg" id="subpage-nav-bar">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-[#38bdf8] pl-2 shrink-0">
            <Layers className="w-4 h-4 text-[#38bdf8] animate-pulse" />
            <span className="font-black uppercase">ACTIVE MONITORING SUB-PAGE:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Main Baseline Twin Tab */}
            <button
              onClick={() => setActiveTab('main')}
              className={`flex items-center gap-2.5 px-4 h-10 rounded-xl text-xs font-mono font-bold tracking-tight cursor-pointer transition-all ${
                activeTab === 'main'
                  ? 'bg-gradient-to-r from-sky-500/20 to-cyan-500/10 border-2 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-950/40 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>[PAGE 1] HOMAGAMA TWIN</span>
              {nodes.filter(n => n.id.startsWith('node-') && n.status === 'fault').length > 0 ? (
                <span className="text-[9px] bg-rose-500 text-slate-950 font-black px-2 py-0.5 rounded animate-pulse">
                  {nodes.filter(n => n.id.startsWith('node-') && n.status === 'fault').length} ALARM
                </span>
              ) : (
                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded leading-none">
                  SECURE
                </span>
              )}
            </button>

            {/* Copper PSTN MSAN Tab */}
            <button
              onClick={() => setActiveTab('copper')}
              className={`flex items-center gap-2.5 px-4 h-10 rounded-xl text-xs font-mono font-bold tracking-tight cursor-pointer transition-all ${
                activeTab === 'copper'
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 border-2 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.25)]'
                  : 'bg-slate-950/40 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <Radio className="w-4 h-4 text-orange-400 anim-pulse-slow" />
              <span>[PAGE 2] COPPER MSAN INFRA (10 NODES)</span>
              {nodes.filter(n => n.id.startsWith('msan-') && n.status === 'fault').length > 0 ? (
                <span className="text-[9px] bg-rose-500 text-slate-950 font-black px-2 py-0.5 rounded animate-pulse">
                  {nodes.filter(n => n.id.startsWith('msan-') && n.status === 'fault').length} DOWN
                </span>
              ) : (
                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded leading-none">
                  NORMAL
                </span>
              )}
            </button>

            {/* FTTH Fiber Cabinets Tab */}
            <button
              onClick={() => setActiveTab('ftth')}
              className={`flex items-center gap-2.5 px-4 h-10 rounded-xl text-xs font-mono font-bold tracking-tight cursor-pointer transition-all ${
                activeTab === 'ftth'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/40 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <Network className="w-4 h-4 text-emerald-400" />
              <span>[PAGE 3] FTTH FIBER CABS (10 CABINETS)</span>
              {nodes.filter(n => n.id.startsWith('cab-') && n.status === 'fault').length > 0 ? (
                <span className="text-[9px] bg-rose-500 text-slate-950 font-black px-2 py-0.5 rounded animate-pulse">
                  {nodes.filter(n => n.id.startsWith('cab-') && n.status === 'fault').length} DOWN
                </span>
              ) : (
                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded leading-none">
                  ONLINE
                </span>
              )}
            </button>
          </div>
        </div>

        {/* UNIFIED GLOBAL COMMAND BAR */}
        <div 
          className="relative bg-slate-900/85 backdrop-blur-md border border-[rgba(56,189,248,0.25)] rounded-2xl p-3.5 shadow-2xl flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-4 select-none"
          id="unified-global-command-bar"
        >
          {/* Active scanning overlay pattern */}
          {isCommandBarScanning && (
            <div className="absolute inset-0 bg-cyan-500/[0.02] border border-cyan-500/20 rounded-2xl pointer-events-none animate-pulse" />
          )}

          {/* Section 1: Search Node ID or Label */}
          <div className="flex-1 min-w-[280px] flex flex-col gap-1 relative text-[11px] font-mono">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={commandBarQuery}
                onChange={(e) => setCommandBarQuery(e.target.value)}
                placeholder="Search NetOps node ID or label... (e.g. HO-HTN)"
                className="bg-transparent text-slate-200 text-xs font-mono font-medium placeholder-slate-500 focus:outline-none w-full"
              />
              {commandBarQuery && (
                <button 
                  onClick={() => setCommandBarQuery('')} 
                  className="text-slate-500 hover:text-slate-350 bg-slate-800 hover:bg-slate-755 rounded p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Float Autocomplete Results Dropdown Drawer */}
            <AnimatePresence>
              {commandBarQuery.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-slate-950/98 backdrop-blur-lg border border-slate-850 rounded-xl p-2 z-50 max-h-[220px] overflow-y-auto shadow-2xl space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800"
                >
                  <div className="text-[8px] font-extrabold text-slate-500 font-mono tracking-widest uppercase px-1.5 pb-1 border-b border-slate-905/30 flex justify-between">
                    <span>MATCHING PHYSICAL ASSETS</span>
                    <span className="text-cyan-400">SELECT TO VIEW / CORRECT</span>
                  </div>
                  {activeNodes.filter(n => 
                    n.id.toLowerCase().includes(commandBarQuery.toLowerCase()) || 
                    (n.label && n.label.toLowerCase().includes(commandBarQuery.toLowerCase()))
                  ).length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-[10px] font-mono">
                      No physical assets found matching "{commandBarQuery}"
                    </div>
                  ) : (
                    activeNodes.filter(n => 
                      n.id.toLowerCase().includes(commandBarQuery.toLowerCase()) || 
                      (n.label && n.label.toLowerCase().includes(commandBarQuery.toLowerCase()))
                    ).map(node => {
                      const isFaulted = node.status === 'fault';
                      return (
                        <div 
                          key={node.id} 
                          className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 transition-all outline-none ${
                            isFaulted 
                              ? 'bg-rose-950/10 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-950/20' 
                              : 'bg-slate-900/40 border-slate-850 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div 
                            className="flex-1 cursor-pointer" 
                            onClick={() => {
                              handleSelectNode(node);
                              setCommandBarQuery('');
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isFaulted ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                              <span className="font-bold text-slate-200 text-[10.5px] font-mono leading-none">{node.label || node.id}</span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono mt-1 block truncate max-w-[200px] leading-none">
                              {node.description || 'No asset description'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                handleSelectNode(node);
                                setCommandBarQuery('');
                              }}
                              className="px-1.5 py-0.5 text-[8.5px] font-extrabold font-mono uppercase bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer"
                              title="Pivots 3D view camera on this asset coordinate"
                            >
                              TARGET
                            </button>
                            {isFaulted && (
                              <button
                                onClick={() => {
                                  handleOneClickRepair(node.id, node.label || node.id);
                                  setCommandBarQuery('');
                                }}
                                className="px-1.5 py-0.5 text-[8.5px] font-extrabold font-mono uppercase bg-amber-500 hover:bg-amber-400 text-slate-950 rounded cursor-pointer"
                                title="Resolves active attenuations and structural alarms"
                              >
                                REPAIR
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 1.5: Map Controls (lifted from map) */}
          <div className="hidden xl:flex items-center justify-center gap-4 bg-slate-950/40 border border-slate-850/80 rounded-xl px-4 self-stretch shrink-0">
            {/* Weather Controller */}
            <div className="flex items-center gap-3 border-r border-slate-800/80 pr-4">
              <div className="flex items-center gap-2">
                <CloudLightning className={`w-4 h-4 shrink-0 ${isWeatherActive ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider leading-none">WEATHER SIM</span>
                  <span className="text-[8px] font-mono leading-none text-slate-500 mt-0.5 max-w-[100px] truncate">
                    {isWeatherActive ? "STORM ACTIVE" : "STABLE SKY"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsWeatherActive(!isWeatherActive)}
                className={`px-2 py-1 rounded border font-mono text-[8.5px] font-bold uppercase tracking-wider transition-all cursor-pointer select-none ${
                  isWeatherActive
                    ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse shadow-md"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-700 hover:text-white"
                }`}
              >
                {isWeatherActive ? "SHUTDOWN" : "🌩️ TRIGGER STORM"}
              </button>
            </div>

            {/* Map Presentation */}
            <div className="flex items-center gap-3 border-r border-slate-800/80 pr-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider leading-none">MAP PRESENTATION</span>
                  <span className="text-[8px] font-mono leading-none text-slate-500 mt-0.5">
                    {viewMode === '3d' ? "3D CYBER" : "2D VECTOR"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewMode(prev => prev === '3d' ? '2d' : '3d')}
                className={`px-2 py-1 rounded border font-mono text-[8.5px] font-bold uppercase transition-all cursor-pointer select-none ${
                  viewMode === '3d'
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/10'
                }`}
              >
                {viewMode === '3d' ? "⚙️ GO 2D SVG" : "📡 GO 3D MAP"}
              </button>
            </div>

            {/* Topology Overview */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Network className={`w-4 h-4 shrink-0 transition-all ${isTopologyOverviewActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider leading-none">TOPOLOGY CTL</span>
                  <span className="text-[8px] font-mono leading-none text-slate-500 mt-0.5 max-w-[100px] truncate">
                    {isTopologyOverviewActive ? "FLOW PARTICLES EN" : "STATIC GRID ONLY"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTopologyOverviewActive(!isTopologyOverviewActive)}
                className={`px-2 py-1 rounded border font-mono text-[8.5px] font-bold uppercase tracking-wider transition-all cursor-pointer select-none ${
                  isTopologyOverviewActive
                    ? "bg-cyan-500/20 hover:bg-cyan-505/30 text-cyan-300 border-cyan-505/50 shadow-md shadow-cyan-505/10"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-355 border-slate-700 hover:text-white"
                }`}
              >
                {isTopologyOverviewActive ? "DEACTIVATE" : "📡 ENGAGE FLOW"}
              </button>
            </div>
          </div>

          {/* Section 2: Global Diagnostic Controller */}
          <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850/80 rounded-xl px-4 py-2 font-mono flex-1 max-w-[460px]">
            {isCommandBarScanning ? (
              <div className="w-full flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-cyan-400">
                  <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" /> {commandBarScanStep}</span>
                  <span>{commandBarScanProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${commandBarScanProgress}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" 
                  />
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">SYSTEM REGISTRY STATUS</span>
                  <span className="text-[10px] text-emerald-400 font-extrabold leading-none mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> SECURE & HEALTHY
                  </span>
                </div>
                <button
                  onClick={runGlobalDiagnostics}
                  className="px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:border-cyan-500/80 rounded-lg cursor-pointer transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
                  title="Force a real-time full sweep spectral diagnostic monitoring feed across the total digital twin map"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                  <span>RUN DIAGNOSTICS</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Quick Maintenance Direct Telemetry Handlers */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Action A: De-escalate */}
            <button
              onClick={handleMuteAllFaults}
              className="px-2.5 py-1.5 text-[9.5px] font-extrabold font-mono uppercase tracking-wider border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-850 hover:border-slate-755 transition-all rounded-lg cursor-pointer active:scale-95 flex items-center gap-1"
              title="Return all currently faulted nodes to normal status and log de-escalation"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              <span>DE-ESCALATE</span>
            </button>

            {/* Quick Action B: OTDR Auto Sweep simulation */}
            <button
              onClick={() => {
                addLog('[OTDR] Initiating optical time-domain reflectometer laser audit sequence...');
                addLog('[OTDR] Transmitting laser pulses across fiber backhauls at 1550nm.');
                const fiberNodesCount = activeNodes.filter(n => n.type === 'dp').length;
                setTimeout(() => {
                  addLog(`[SUCCESS] OTDR sweep parsed successfully. Checked ${fiberNodesCount} high-density fiber terminals. Splice losses normal.`);
                }, 1000);
              }}
              className="px-2.5 py-1.5 text-[9.5px] font-extrabold font-mono uppercase tracking-wider border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all rounded-lg cursor-pointer active:scale-95 flex items-center gap-1"
              title="Run reflecting lasers across the optical network branches to verify cable structural integration"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              <span>OTDR SWEEP</span>
            </button>
          </div>

        </div>

        {/* Card C: The 3D Digital Twin map container viewport - Full-width horizontal expansion with increased 800px height */}
        <div className="relative overflow-hidden bg-slate-950 border border-[rgba(56,189,248,0.2)] rounded-xl shadow-lg h-[800px] min-h-[800px]" id="bento-map-viewport">
          
          {/* Overlay Tag for actively selected Sector */}
          <div className="absolute top-4 left-4 z-[40] pointer-events-none flex flex-col gap-1 font-mono select-none">
            <div className="flex items-center gap-2 bg-slate-950/95 border border-[rgba(56,189,248,0.4)] px-3 py-1.5 rounded-lg max-w-sm backdrop-blur-md shadow-2xl">
              <span className={`w-2 h-2 rounded-full animate-ping ${activeTab === 'main' ? 'bg-cyan-500' : activeTab === 'copper' ? 'bg-orange-500' : 'bg-emerald-550'}`} />
              <span className="text-[10px] font-black tracking-widest text-[#38bdf8] uppercase">
                {activeTab === 'main' 
                  ? 'Sector: Homagama Core (GPON/Fiber)' 
                  : activeTab === 'copper' 
                    ? 'Sector: Kottawa Copper MSAN Feeder' 
                    : 'Sector: Pitipana Smart FTTH Cabinets'}
              </span>
            </div>
          </div>

          {/* Real 3D Canvas environment with cyberpunk coordinates projection */}
          <DigitalTwinMap
            key={activeTab}
            nodes={activeNodes}
            connections={activeConnections}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            hoveredNodeId={hoveredNodeId}
            playbackHourAgo={playbackHourAgo}
            setPlaybackHourAgo={setPlaybackHourAgo}
            isPlaybackPlaying={isPlaybackPlaying}
            setIsPlaybackPlaying={setIsPlaybackPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            isWeatherActive={isWeatherActive}
            setIsWeatherActive={setIsWeatherActive}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isTopologyOverviewActive={isTopologyOverviewActive}
            setIsTopologyOverviewActive={setIsTopologyOverviewActive}
            windSpeed={windSpeed}
            setWindSpeed={setWindSpeed}
            windDirection={windDirection}
            setWindDirection={setWindDirection}
            isGlobalHudVisible={isGlobalHudVisible}
            setIsGlobalHudVisible={setIsGlobalHudVisible}
          />
        </div>

        {/* Support controls layout: Structured into three high-fidelity symmetrical grid columns directly below the Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch" id="bento-dashboard-decks">
          
          {/* COLUMN 1: INTEGRITY STATS & INVENTORY DIRECTORY */}
          <div className="flex flex-col gap-4" id="bento-left-column">
            
            {/* Card A: Network Overview statistics */}
            <div className="relative overflow-hidden bg-[rgba(15,23,42,0.6)] border border-[rgba(56,189,248,0.2)] rounded-xl p-5 flex flex-col before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#38bdf8] before:to-transparent before:opacity-50 justify-between min-h-[350px]">
              <div>
                <div className="text-[11px] tracking-wider text-slate-400 uppercase font-mono mb-2 flex items-center gap-1.5 font-bold font-mono">
                  <Network className="w-4 h-4 text-cyan-400 animate-pulse" /> {activeTab === 'main' ? 'GPON NETWORK TOPOLOGY' : activeTab === 'copper' ? 'COPPER PSTN NETWORK' : 'FTTH CABINET MATRIX'}
                </div>
                <p className="text-slate-400 text-xs font-mono leading-relaxed mb-4">
                  {activeTab === 'main' 
                    ? 'Real-time active physical components reporting path validation over Homagama telecommunication sectors.' 
                    : activeTab === 'copper' 
                      ? 'Decentralized multi-service copper/PSTN exchange cabinets mapping subscriber active telephone & ADSL lines.' 
                      : 'High-density fiber optic splitters operating on active urban smart-highway ring networks.'}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5 font-mono">
                  <div className="bg-[rgba(30,41,59,0.5)] border border-[rgba(56,189,248,0.1)] p-3 rounded-lg hover:border-cyan-500/20 transition-all">
                    <div className="text-[9px] text-slate-400 tracking-wider">UPSTREAM TRANSIT</div>
                    <div className="text-lg font-bold text-[#38bdf8]">{stats.upstreamSpeed} <span className="text-[9px] text-slate-500">Gb/s</span></div>
                  </div>
                  <div className="bg-[rgba(30,41,59,0.5)] border border-[rgba(56,189,248,0.1)] p-3 rounded-lg hover:border-cyan-500/20 transition-all">
                    <div className="text-[9px] text-slate-400 tracking-wider">DOWNSTREAM</div>
                    <div className="text-lg font-bold text-[#38bdf8]">{stats.downstreamSpeed} <span className="text-[9px] text-slate-500">Gb/s</span></div>
                  </div>
                  <div className="bg-[rgba(30,41,59,0.5)] border border-[rgba(56,189,248,0.1)] p-3 rounded-lg hover:border-cyan-500/20 transition-all">
                    <div className="text-[9px] text-slate-400 tracking-wider">
                      {activeTab === 'main' ? 'ACTIVE DPs' : activeTab === 'copper' ? 'ACTIVE MSANS' : 'FIBER CABINETS'}
                    </div>
                    <div className="text-lg font-bold text-white">
                      {activeTab === 'main' ? stats.dps : activeTab === 'copper' ? stats.msans : stats.cabinets} <span className="text-[9px] text-slate-500">Units</span>
                    </div>
                  </div>
                  <div className="bg-[rgba(30,41,59,0.5)] border border-[rgba(56,189,248,0.1)] p-3 rounded-lg hover:border-cyan-500/20 transition-all">
                    <div className="text-[9px] text-slate-400 tracking-wider">LOAD AVERAGE</div>
                    <div className="text-lg font-bold text-white">{stats.loadAvg}%</div>
                  </div>
                </div>
              </div>

              {/* Simulated Live Uptime Projection visual representation */}
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> HISTORIC SIGNAL STABILIZATION</span>
                  <span className="text-emerald-400">99.84% AVG</span>
                </div>
                <div className="height-[46px] w-full bg-slate-950/90 border border-slate-800/80 rounded p-1 flex items-end gap-1.5 h-12 overflow-hidden select-none">
                  {uptimeProjectionHeights.map((ht, idx) => {
                    const isLoadStressed = idx === 4 && stats.faults > 0;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${ht}%` }}
                        className={`flex-1 rounded-sm transition-all duration-500 ${
                          isLoadStressed 
                            ? 'bg-rose-500/80 animate-bounce' 
                            : 'bg-cyan-500/40 hover:bg-[#38bdf8] cursor-pointer'
                        }`}
                        title={`Operational standard health bucket: ${ht}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                  <span>120m AGO</span>
                  <span>SEC-ALPHA STABLE ONLINE</span>
                  <span>LIVE FEED</span>
                </div>
              </div>
            </div>

            {/* Card B: Structure Directory list filtering */}
            <div className="relative overflow-hidden bg-[rgba(15,23,42,0.6)] border border-[rgba(56,189,248,0.2)] rounded-xl p-4 flex flex-col before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#38bdf8] before:to-transparent before:opacity-50 min-h-[380px] flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-3">
                <div className="text-[11px] font-bold tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#38bdf8]" /> STRUCTURE DIRECTORY
                </div>
                <span className="text-[10px] bg-slate-950 text-cyan-400 font-mono px-2 py-0.5 rounded border border-slate-800">
                  {filteredNodes.length} NODES
                </span>
              </div>

              {/* Quick Filter Inputs */}
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Search label, ID, sector desc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#38bdf8]/60 font-mono"
                  id="search-nodes"
                />
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded p-1 text-slate-300 focus:outline-none focus:border-[#38bdf8]/60 cursor-pointer text-[10px]"
                    id="select-filter-type"
                  >
                    <option value="all">ANY STRUCTURE</option>
                    {activeTab === 'main' && (
                      <>
                        <option value="pole">POLE STRUCT</option>
                        <option value="dp">SERVICE DP</option>
                      </>
                    )}
                    {activeTab === 'copper' && (
                      <option value="msan">ACTIVE MSAN</option>
                    )}
                    {activeTab === 'ftth' && (
                      <option value="cabinet">FIBER CABINET</option>
                    )}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded p-1 text-slate-300 focus:outline-none focus:border-[#38bdf8]/60 cursor-pointer text-[10px]"
                    id="select-filter-status"
                  >
                    <option value="all">ALL CONDITIONS</option>
                    <option value="normal">NORMAL</option>
                    <option value="fault">ACTIVE FAULT</option>
                  </select>
                </div>
              </div>

              {/* Directory Nodes List Scrollbox */}
              <div className="flex-1 overflow-y-auto max-h-[220px] space-y-1.5 font-mono text-[11px]" id="directory-scroller-box">
                {filteredNodes.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No matching assets found.
                  </div>
                ) : (
                  filteredNodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isFault = node.status === 'fault';
                    return (
                      <div
                        key={node.id}
                        onClick={() => handleSelectNode(node)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-[#38bdf8]/70 shadow-sm shadow-[#38bdf8]/10'
                            : isFault
                              ? 'bg-red-950/20 border-red-500/30 hover:border-red-400'
                              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/20 hover:border-slate-700'
                        }`}
                        id={`bento-row-${node.id}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isFault ? 'bg-red-500 animate-pulse' : 'bg-teal-400'}`} />
                              <span className="font-bold text-slate-200 truncate block text-[11px]">
                                {node.label || node.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                              {node.type === 'pole' ? 'Overhead Pole Carrier' : 'Active Substation Box'}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(node.id, node.label || node.id);
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold shrink-0 self-center uppercase transition-colors ${
                              isFault
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                            id={`bento-btn-toggle-${node.id}`}
                          >
                            {isFault ? 'MUTE' : 'DISRUPT'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* COLUMN 2: OPERATIONS CRITICAL DECK */}
          <div className="flex flex-col gap-4" id="bento-center-column">
            
            {/* Card E: Active Alarm Center & AI Diagnostic Center */}
            <div className={`relative overflow-hidden bg-[rgba(15,23,42,0.6)] border rounded-xl p-4 flex flex-col before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:opacity-50 min-h-[350px] transition-all ${
              stats.faults > 0 
                ? 'border-rose-500/40 before:via-rose-500 bg-rose-950/5' 
                : 'border-[rgba(56,189,248,0.2)] before:via-[#38bdf8]'
            }`} id="bento-alarm-panel">
              
              <div className="border-b border-slate-800/80 pb-2 mb-3">
                <div className="text-[11px] font-bold tracking-wider uppercase font-mono flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 ${stats.faults > 0 ? 'text-rose-400' : 'text-[#38bdf8]'}`}>
                    <ShieldCheck className="w-4 h-4" /> ACTIVE ALARM CORES
                  </span>
                  {stats.faults > 0 && <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded px-1.5 animate-pulse">ALARM DISRUPT</span>}
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[170px] pr-1" id="active-alarm-box">
                {activeNodes.filter(n => n.status === 'fault').length === 0 ? (
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-lg text-center text-slate-400 text-[10px] flex flex-col items-center justify-center gap-1.5">
                    <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">✓</div>
                    <span className="font-semibold text-emerald-400">NO ANOMALIES DETECTED</span>
                    <span className="text-[9px]">ALL TERMINAL SPLICES FOR THE REGION ARE SECURE</span>
                  </div>
                ) : (
                  activeNodes.filter(n => n.status === 'fault').map(node => (
                    <div key={node.id} className="bg-rose-950/15 border border-rose-500/20 p-2.5 rounded-lg text-[11px] font-mono relative">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-rose-300">SYSTEM ATTENUATION</div>
                        <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 rounded font-normal uppercase">SECTOR ALERT</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Structure: <span className="text-white font-semibold">{node.label || node.id}</span></div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Coords: {node.lat.toFixed(4)}°, {node.lon.toFixed(4)}°</div>
                    </div>
                  ))
                )}
              </div>

              {/* AI Diagnostics Box (Dynamically changing based on selection!) */}
              <div className="bg-[#0f172a]/80 border border-cyan-500/20 rounded p-3 text-[11px] space-y-1 mb-2.5 mt-3">
                <span className="text-[9.5px] font-bold text-cyan-400 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 animate-pulse" /> AI Agent Diagnostics</span>
                {selectedNode ? (
                  <div className="text-slate-300 leading-relaxed font-mono">
                    {selectedNode.status === 'fault' 
                      ? `Warning code: SIGNAL_DROP. Primary attenuation analyzed at '${selectedNode.label || selectedNode.id}'. Check physical splice or aerial overhead attachment at ${Math.abs(selectedNode.lon * 0.1).toFixed(1)}m mark.`
                      : `Telemetry for '${selectedNode.label || selectedNode.id}' is within safe parameters limits. Optic carrier loss estimate is <0.02 dB/km.`
                    }
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No node currently in spotlight selection. Choose an asset on the map to trigger deep telemetry diagnostic.</div>
                )}
              </div>

              {/* Ticket generator simulation button */}
              <button
                onClick={handleGenerateTicket}
                disabled={ticketRef !== null}
                className={`w-full py-2 rounded text-[11px] font-mono font-bold uppercase cursor-pointer transition-all ${
                  ticketRef 
                    ? 'bg-slate-900 border border-slate-800 text-cyan-400' 
                    : stats.faults > 0
                      ? 'bg-rose-500 hover:bg-rose-600 text-slate-950 shadow shadow-rose-500/20'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow shadow-cyan-500/20'
                }`}
                id="ticket-generation-button"
              >
                {ticketRef ? `DIAGNOSTIC LODGED [${ticketRef}]` : 'GENERATE DISPATCH TICKET'}
              </button>
            </div>

            {/* Dedicated Anomaly Resolution Dashboard Section */}
            <motion.div 
              layout="position"
              className={`relative overflow-hidden bg-[rgba(15,23,42,0.65)] border rounded-xl p-4 flex flex-col before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:opacity-50 transition-all duration-300 ${
                hasNewFaultGlow 
                  ? 'dashboard-glow-new-fault bg-amber-950/10'
                  : stats.faults > 0 
                    ? 'border-amber-500/40 before:via-amber-500 bg-amber-950/5' 
                    : 'border-[rgba(56,189,248,0.2)] before:via-[#38bdf8]'
              } ${isDashboardCollapsed ? 'pb-2.5 min-h-[50px] md:min-h-[60px]' : 'min-h-[380px] flex-1 pb-4'}`} 
              id="anomaly-resolution-dashboard"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className={`border-b border-slate-800/80 pb-2 ${isDashboardCollapsed ? 'mb-0 border-b-0' : 'mb-3'}`}>
                <div className="text-[11px] font-bold tracking-wider uppercase font-mono flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 ${stats.faults > 0 ? 'text-amber-400 font-bold' : 'text-[#38bdf8]'}`}>
                    <Wrench className={`w-4 h-4 text-amber-400 ${stats.faults > 0 && !isDashboardCollapsed ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }} /> 
                    <span>ANOMALY RESOLUTION DASHBOARD</span>
                    {isDashboardCollapsed && (
                      <span className="text-[9px] text-slate-500 font-normal lowercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 ml-1">
                        collapsed
                      </span>
                    )}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Session Fault Resolution Rate Progress Indicator */}
                    <div className="flex items-center gap-1.5 bg-slate-950 text-slate-400 border border-slate-800/80 px-2 py-0.5 rounded font-bold" id="session-repair-stats" title="Percentage of faults resolved in the current session">
                      <span className="text-[8px] text-slate-500 uppercase">RESOLVED:</span>
                      <span className="text-emerald-400 font-extrabold text-[9.5px]">{resolutionRate}%</span>
                      <span className="text-[8.5px] text-slate-550 font-mono">({resolvedAlarmsCount}/{totalFaultsEncounteredInSession})</span>
                      <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shrink-0 hidden xs:block relative">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                          style={{ width: `${resolutionRate}%` }}
                        />
                      </div>
                    </div>

                    <span className="text-[9px] bg-slate-950 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded font-bold hidden sm:inline">
                      RESOLVER {stats.faults === 0 ? "STABLE" : `${stats.faults} ERR`}
                    </span>
                    <button
                      onClick={() => setIsDashboardCollapsed(!isDashboardCollapsed)}
                      className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded border transition-all cursor-pointer bg-slate-950 hover:bg-slate-900 text-teal-400 border-teal-500/20 hover:border-teal-500/45 flex items-center gap-1 shrink-0"
                      id="toggle-dashboard-collapse-btn"
                      title={isDashboardCollapsed ? "Expand Dashboard to inspect active alarms" : "Minimize Dashboard to save screen space"}
                    >
                      <span>{isDashboardCollapsed ? 'EXPAND ▲' : 'MINIMIZE ▼'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {!isDashboardCollapsed && (
                  <motion.div
                    key="anomaly-resolver-wrapper"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden space-y-3 flex-1 flex flex-col"
                  >
                    {/* Sort and View Mode Select Ribbon */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-950/45 border border-slate-800/60 px-3 py-2 rounded-lg text-[10px] font-mono text-slate-300">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        <span>SLA PRIORITY CONTROLLER:</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setDashboardSortMode('ttc-asc')}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 border ${
                            dashboardSortMode === 'ttc-asc'
                              ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow shadow-amber-500/10'
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                          title="Prioritize active alarms with the shortest remaining Time to Critical (TTC) countdown"
                        >
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>SHORTEST TTC (PRIORITY)</span>
                        </button>
                        <button
                          onClick={() => setDashboardSortMode('ttc-desc')}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 border ${
                            dashboardSortMode === 'ttc-desc'
                              ? 'bg-slate-850 border-slate-700 text-slate-200'
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                          title="Sort alarms with longest remaining Time to Critical (TTC) countdown"
                        >
                          <span>LONGEST TTC</span>
                        </button>
                        <button
                          onClick={() => setDashboardSortMode('categorized')}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 border ${
                            dashboardSortMode === 'categorized'
                              ? 'bg-cyan-550/15 border-cyan-500/40 text-cyan-300 shadow shadow-cyan-550/10'
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                          title="Organize alarms grouped by network asset groups, internal sorted by TTC"
                        >
                          <span>GROUP BY ASSET TYPE</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1 pt-0.5" id="anomaly-resolver-scroller">
                      {activeNodes.filter(n => n.status === 'fault').length === 0 ? (
                        <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-lg text-center text-slate-400 text-[10px] flex flex-col items-center justify-center gap-1.5">
                          <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-[10px] font-bold">✓</div>
                          <span className="font-semibold text-emerald-400">0 ACTIVE ANOMALIES</span>
                          <span className="text-[9px] text-slate-500 uppercase">NO EMERGENCY RESOLUTIONS REQUIRED AT THIS TIME</span>
                        </div>
                      ) : (
                        <div>
                          {dashboardSortMode !== 'categorized' ? (
                            /* UNIFIED SORTED LIST */
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                                    [SLA QUEUE] ACTIVE NETWORK OUTAGES ({sortedActiveAlarms.length})
                                  </span>
                                </div>
                                <span className="text-[7.5px] bg-slate-950 border border-slate-800 text-slate-400 font-extrabold px-1.5 py-0.5 rounded font-mono">
                                  SORTED: {dashboardSortMode === 'ttc-asc' ? 'SHORTEST TTC FIRST' : 'LONGEST TTC FIRST'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in">
                                {sortedActiveAlarms.map(node => renderFaultNodeCard(node))}
                              </div>
                            </div>
                          ) : (
                            /* CATEGORIZED LISTS */
                            <div className="space-y-4">
                              {/* CRITICAL DISTRIBUTION POINT OUTAGES */}
                              {activeNodes.filter(n => n.status === 'fault' && n.type === 'dp').length > 0 && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest font-mono">
                                        [CRITICAL] DISTRIBUTION OUTAGES ({activeNodes.filter(n => n.status === 'fault' && n.type === 'dp').length})
                                      </span>
                                    </div>
                                    <span className="text-[7.5px] bg-rose-550/10 border border-rose-500/30 text-rose-300 font-extrabold px-1 rounded font-mono">
                                      CAT A (OUTAGE)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getSortedCategoryNodes('dp').map(node => renderFaultNodeCard(node))}
                                  </div>
                                </div>
                              )}

                              {/* MAINTENANCE TALL POLES */}
                              {activeNodes.filter(n => n.status === 'fault' && n.type === 'pole').length > 0 && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <div className="flex items-center justify-between border-b border-amber-550/20 pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                                        [MAINTENANCE] TALL POLES ({activeNodes.filter(n => n.status === 'fault' && n.type === 'pole').length})
                                      </span>
                                    </div>
                                    <span className="text-[7.5px] bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold px-1 rounded font-mono">
                                      CAT B (SUPPORT)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getSortedCategoryNodes('pole').map(node => renderFaultNodeCard(node))}
                                  </div>
                                </div>
                              )}

                              {/* ACTIVE COPPER MSANS */}
                              {activeNodes.filter(n => n.status === 'fault' && n.type === 'msan').length > 0 && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <div className="flex items-center justify-between border-b border-orange-500/20 pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping shrink-0" />
                                      <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest font-mono">
                                        [CRITICAL] COPPER MSAN OUTAGES ({activeNodes.filter(n => n.status === 'fault' && n.type === 'msan').length})
                                      </span>
                                    </div>
                                    <span className="text-[7.5px] bg-orange-500/15 border border-orange-500/30 text-orange-300 font-extrabold px-1 rounded font-mono">
                                      CAT A (OUTAGE)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getSortedCategoryNodes('msan').map(node => renderFaultNodeCard(node))}
                                  </div>
                                </div>
                              )}

                              {/* FTTH DISTRIBUTION CABINETS */}
                              {activeNodes.filter(n => n.status === 'fault' && n.type === 'cabinet').length > 0 && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <div className="flex items-center justify-between border-b border-emerald-555/20 pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                                        [CRITICAL] FTTH CABINET OUTAGES ({activeNodes.filter(n => n.status === 'fault' && n.type === 'cabinet').length})
                                      </span>
                                    </div>
                                    <span className="text-[7.5px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold px-1 rounded font-mono">
                                      CAT A (OUTAGE)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getSortedCategoryNodes('cabinet').map(node => renderFaultNodeCard(node))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Column 2 ends here nicely */}
          </div>

          {/* COLUMN 3: SYSTEM OPERATIONS & TERMINAL */}
          <div className="flex flex-col gap-4" id="bento-right-column">

            {/* Card F: Provisioning Asset Form Bento Card */}
            <div className="relative overflow-hidden bg-[rgba(15,23,42,0.65)] border border-emerald-900/30 hover:border-emerald-500/30 transition-all rounded-xl p-4 flex flex-col before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500 before:to-transparent before:opacity-50 min-h-[350px]" id="bento-provision-form">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                <h2 className="text-[11px] font-bold tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-400" /> PROVISION NODE ASSET
                </h2>
                {/* Section Indicator badge for premium UI structure moved inside nicely */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-555/5 border border-emerald-500/30 text-emerald-400 rounded-md text-[7.5px] font-mono uppercase tracking-wider font-extrabold select-none animate-pulse shrink-0">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                  <span>NetOps Engine</span>
                </div>
              </div>

              <form onSubmit={handleProvisionNode} className="space-y-2.5 font-mono text-[11px] text-slate-300">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5 uppercase">Label ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HO-ATR-0520-004"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500/60"
                      id="input-label"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5 uppercase">Type Component</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as NodeType)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1 text-slate-100 text-[10px] cursor-pointer focus:outline-none focus:border-emerald-500/60"
                      id="select-type"
                    >
                      {activeTab === 'main' && (
                        <>
                          <option value="pole">🪵 TALL POLE</option>
                          <option value="dp">🌐 SERVICE DP</option>
                        </>
                      )}
                      {activeTab === 'copper' && (
                        <option value="msan">⚡ ACTIVE MSAN</option>
                      )}
                      {activeTab === 'ftth' && (
                        <option value="cabinet">🛄 FIBER CABINET</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5 uppercase">GIS Latitude</label>
                    <input
                      type="text"
                      required
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500/60"
                      id="input-lat"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-0.5 uppercase">GIS Longitude</label>
                    <input
                      type="text"
                      required
                      value={newLon}
                      onChange={(e) => setNewLon(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500/60"
                      id="input-lon"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5 uppercase">Topology Link Attachment</label>
                  <select
                    value={connectToNodeId}
                    onChange={(e) => setConnectToNodeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded p-1 text-slate-300 text-[10px] cursor-pointer focus:outline-none focus:border-emerald-500/60"
                    id="select-link-attach"
                  >
                    <option value="">-- ATTACH INDEPENDENT CABLE --</option>
                    {activeNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label || n.id} ({n.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5 uppercase">Sector Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Pitipana Sector GPON splice..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded p-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500/60"
                    id="input-desc"
                  />
                </div>

                {formError && (
                  <div className="p-1 px-2 border border-rose-500/30 bg-rose-950/20 text-rose-400 text-[10px] rounded flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="p-1 px-2 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-[10px] rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {formSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded font-bold uppercase tracking-wide text-[10px] transition-all cursor-pointer shadow-md shadow-emerald-500/15 font-mono"
                  id="btn-submit-asset"
                >
                  ATTACH PROVISIONED ASSET
                </button>
              </form>
            </div>

            {/* VOICE COMMAND CONSOLE BENTO CARD */}
            <div className="relative overflow-hidden bg-[rgba(15,23,42,0.65)] border border-[rgba(56,189,248,0.25)] hover:border-[#38bdf8]/50 transition-all rounded-xl p-4 flex flex-col justify-between before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400 before:to-transparent before:opacity-45" id="bento-voice-command">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                <h2 className="text-[11px] font-bold tracking-wider text-slate-300 font-mono flex items-center gap-1.5 uppercase">
                  <Mic className={`w-4 h-4 ${voiceIsListening ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}`} /> Voice Command Desk
                </h2>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase transition-all ${
                  voiceIsListening 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}>
                  {voiceIsListening ? 'RECORDING ON' : 'STANDBY'}
                </span>
              </div>

              {/* Tips list */}
              <div className="text-[10px] font-mono text-slate-400 mb-3 space-y-1 bg-slate-950/45 p-2.5 rounded-lg border border-slate-850">
                <div className="text-[8.5px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5">Voice Command Cheat Sheet</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>• <span className="text-slate-200">"Repair node 04"</span></div>
                  <div>• <span className="text-slate-200">"Show faults"</span></div>
                  <div>• <span className="text-slate-200">"Trigger storm"</span></div>
                  <div>• <span className="text-slate-205">"Stop storm"</span></div>
                  <div>• <span className="text-slate-200">"Mute alarms"</span></div>
                  <div>• <span className="text-slate-200">"Select node 08"</span></div>
                  <div>• <span className="text-slate-200">"De-escalate"</span></div>
                  <div>• <span className="text-slate-200">"Clear selection"</span></div>
                </div>
              </div>

              {/* Status and Recognized Transcript area */}
              <div className="flex flex-col gap-2 mb-3.5">
                <div className="flex items-center justify-between font-mono text-[9px] text-slate-500">
                  <span>MIC STATE INDICATOR:</span>
                  <span className={voiceIsListening ? 'text-rose-400 font-bold' : 'text-slate-400 font-semibold'}>{voiceStatus}</span>
                </div>

                <div className="h-11 bg-slate-950/80 border border-slate-850 p-2 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 font-mono text-[11px] text-slate-350 truncate">
                    {voiceTranscript ? (
                      <span className="text-slate-200 italic font-semibold">"{voiceTranscript}"</span>
                    ) : (
                      <span className="text-slate-500 select-none text-[10px]">Recognized voice input transcript appears here...</span>
                    )}
                  </div>
                  {voiceTranscript && (
                    <button
                      onClick={() => setVoiceTranscript('')}
                      className="text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 hover:text-slate-201 font-mono shrink-0 cursor-pointer"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* MIC INTERACTION ELEMENT AND COMBINED HANDLER */}
              <div className="flex gap-2">
                <button
                  onClick={toggleVoiceListening}
                  className={`flex-1 py-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 select-none shadow-md cursor-pointer font-mono text-[10px] ${
                    voiceIsListening
                      ? 'bg-gradient-to-r from-rose-500 to-red-600 text-slate-950 hover:brightness-110 shadow-rose-500/10'
                      : 'bg-gradient-to-r from-cyan-400 to-indigo-505 text-slate-950 hover:brightness-110 shadow-cyan-500/10'
                  }`}
                  title="Toggle continuous Web Speech API listening for hands-free control room operations"
                  id="btn-voice-mic"
                >
                  {voiceIsListening ? (
                    <>
                      <MicOff className="w-4 h-4 text-slate-950 animate-bounce" />
                      <span>STOP LISTENING</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-slate-950 text-slate-950" />
                      <span>INITIALIZE OPERATOR MIC</span>
                    </>
                  )}
                </button>

                {/* Keyboard Command input sandbox override so users can test on any browser/sandbox environment easily! */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (typedVoiceCommand.trim()) {
                      executeVoiceCommand(typedVoiceCommand);
                      setTypedVoiceCommand('');
                    }
                  }}
                  className="w-[45%] flex gap-1 relative font-mono"
                >
                  <input
                    type="text"
                    value={typedVoiceCommand}
                    onChange={(e) => setTypedVoiceCommand(e.target.value)}
                    placeholder="Type command overrides..."
                    className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg px-2 text-slate-200 text-[10px] placeholder-slate-700"
                  />
                  <button
                    type="submit"
                    className="px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-400 font-bold uppercase text-[9px] rounded-lg transition-all border border-slate-751 hover:border-slate-700 cursor-pointer shadow-sm shrink-0"
                    title="Simulate speaking this command to test the control room parsers"
                  >
                    SEND
                  </button>
                </form>
              </div>
            </div>

            {/* Card D: Dynamic Command Line / Terminal Outputs Box - Linked with high-density visual alignment */}
            <div className="relative overflow-hidden bg-slate-950/95 border border-[rgba(56,189,248,0.2)] hover:border-[#38bdf8]/40 transition-all rounded-xl p-4 font-mono text-xs flex flex-col justify-between min-h-[380px] flex-1" id="bento-terminal">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-slate-400 text-[10px] font-bold">
                <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-emerald-400" /> NOC ACTIVE PROCESS TERMINAL</span>
                <span className="text-emerald-500 text-[8px] px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 animate-pulse">ON-AIR FEED</span>
              </div>

              <div className="space-y-1 bg-black/60 p-3 rounded border border-slate-900/60 overflow-y-auto h-[220px] flex-1 text-emerald-400/95 text-[11px] scrollbar-thin scrollbar-thumb-slate-800" id="terminal-feed">
                {logs.map((log, index) => {
                  const isWarn = log.includes('[WARN]');
                  const isSystem = log.includes('[SYSTEM]');
                  return (
                    <div key={index} className={`leading-relaxed whitespace-pre-wrap ${isWarn ? 'text-rose-400' : isSystem ? 'text-cyan-300 font-semibold' : 'text-emerald-400'}`}>
                      {log}
                    </div>
                  );
                })}
                <div className="flex items-center gap-1">
                  <span className="animate-pulse font-bold text-emerald-500">&gt;</span>
                  <span className="w-2 h-3.5 bg-emerald-500/80 animate-pulse inline-block" />
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. LOWER HUD: DETAILED GEO-PROJECTION MATRICES VIEWPORT (Full-Width Card) */}
      <footer className="relative overflow-hidden bg-[rgba(15,23,42,0.8)] border border-[rgba(56,189,248,0.2)] rounded-xl p-5 before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#38bdf8] before:to-transparent before:opacity-50 min-h-[212px]" id="bento-lower-hud">
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key={`hud-selected-${selectedNode.id}`}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              {/* Left target details */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4 h-full">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 font-mono">
                  {/* Sector details */}
                  <div className="sm:col-span-4 space-y-1.5 sm:border-r sm:border-slate-800/80 sm:pr-5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase text-slate-400 flex items-center gap-1.5 font-bold">
                      <MapPin className="w-4 h-4 text-cyan-400" /> Active GIS Target Inspection
                    </span>
                    <h3 className="text-white text-sm font-bold truncate">
                      {selectedNode.label || selectedNode.id}
                    </h3>
                    <p className="text-[11px] text-slate-400 italic">
                      "{selectedNode.description || 'No database catalog description compiled for this route segment.'}"
                    </p>
                  </div>

                  {/* LIVE COORDINATE TRANSLATION DETAILS */}
                  <div className="sm:col-span-4 grid grid-cols-2 gap-2 text-[11px] self-center sm:border-r sm:border-slate-800/80 sm:pr-5">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">GPS GEODETIC INPUT:</span>
                      <span className="text-white block font-semibold truncate font-mono">LAT: {selectedNode.lat.toFixed(5)}°</span>
                      <span className="text-white block font-semibold truncate font-mono">LON: {selectedNode.lon.toFixed(5)}°</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">3D LOCAL TRANSLATION:</span>
                      <div className="flex flex-col gap-0.5 font-mono text-[#38bdf8] font-bold truncate">
                        <span>X: {selectedNodeCoords3D?.x.toFixed(1)}</span>
                        <span>Y: {selectedNodeCoords3D?.y.toFixed(1)}m</span>
                        <span>Z: {selectedNodeCoords3D?.z.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* PREDICTIVE RISK SCORE */}
                  <div className="sm:col-span-4 flex flex-col justify-center space-y-1" id="predictive-risk-score-hud">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> PREDICTIVE RISK ANALYSIS:
                    </span>
                    {predictiveRiskScore && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[15px] font-black font-mono tracking-tight ${predictiveRiskScore.colorClass}`}>
                            {predictiveRiskScore.score.toFixed(1)}%
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${predictiveRiskScore.bgClass} tracking-wide`}>
                            {predictiveRiskScore.status}
                          </span>
                        </div>
                        {/* Custom status bar */}
                        <div className="w-full h-1 bg-slate-950/80 rounded overflow-hidden border border-slate-900/60">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              predictiveRiskScore.status === 'CRITICAL' ? 'bg-rose-500' :
                              predictiveRiskScore.status === 'ELEVATED' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${predictiveRiskScore.score}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-slate-400 leading-tight">
                          Recorded incidents: <span className="text-slate-200 font-semibold">{predictiveRiskScore.outageCount} outages</span> in past {predictiveRiskScore.totalLogs}h.
                        </div>
                        <div className="text-[8px] text-slate-500 italic leading-tight">
                          {predictiveRiskScore.prognosis}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Geodetic Proximity Maintenance Zone Assets (<500m) */}
                <div className="border-t border-slate-900/60 pt-3 space-y-1.5" id="hud-proximity-zone-assets">
                  <div className="flex items-center justify-between font-mono text-[9px] sm:text-[10px]">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5 uppercase">
                      <Wrench className="w-3.5 h-3.5 text-sky-400" />
                      Interconnected Maintenance Hub (Radius: 500m)
                    </span>
                    <span className="text-[#38bdf8] font-black uppercase tracking-wider bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/60 font-mono">
                      {proximateAssets.length} asset{proximateAssets.length !== 1 ? 's' : ''} proximate
                    </span>
                  </div>
                  {proximateAssets.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 overflow-x-auto scroller-hidden py-0.5 max-h-[58px]" id="proximate-assets-list">
                      {proximateAssets.map(({ node, distance }) => (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer ${
                            node.status === 'fault'
                              ? 'bg-rose-500/10 text-rose-455 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/55 shadow shadow-rose-500/5'
                              : 'bg-sky-500/5 text-sky-300 border-sky-500/15 hover:bg-sky-500/15 hover:border-sky-500/35'
                          }`}
                          title={`Click to focus viewport on ${node.label || node.id}\nType: ${node.type.toUpperCase()}\nDistance: ${distance.toFixed(1)}m\nStatus: ${node.status.toUpperCase()}`}
                        >
                          <span className={`relative flex h-1.5 w-1.5 ${node.status === 'fault' ? 'mr-0.5' : ''}`}>
                            {node.status === 'fault' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${node.status === 'fault' ? 'bg-rose-500' : node.type === 'dp' ? 'bg-cyan-400' : 'bg-slate-400'}`} />
                          </span>
                          <span className="font-semibold truncate max-w-[14ch]">
                            {node.label ? node.label.replace('HO-HTN-', '').replace('SL-MSAN-', '').replace('SL-CAB-', '') : node.id}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold font-mono">
                            {distance.toFixed(0)}m
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9.5px] font-mono text-slate-500 italic pb-0.5" id="proximate-assets-empty">
                      No other interconnected network structures located within the 500m geodetic maintenance radius.
                    </p>
                  )}
                </div>

                {/* Quick action diagnostic controls */}
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-900/60 pt-3">
                  <button
                    onClick={() => handleToggleStatus(selectedNode.id, selectedNode.label || selectedNode.id)}
                    className={`py-1.5 px-3.5 text-[10px] font-bold rounded uppercase cursor-pointer transition-colors font-mono ${
                      selectedNode.status === 'fault'
                        ? 'bg-rose-500 text-slate-950 hover:bg-rose-600 shadow shadow-rose-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                    id="lower-hud-toggle"
                  >
                    {selectedNode.status === 'fault' ? '✓ RESOLVE FAULT' : '⚠ SIMULATE ATTENUATION'}
                  </button>

                  <button
                    onClick={() => {
                      if (compareNodeId) {
                        setCompareNodeId(null);
                        setIsSelectingCompareTarget(false);
                        addLog(`[SYSTEM] Cleared comparison node.`);
                      } else {
                        setIsSelectingCompareTarget(prev => !prev);
                        if (!isSelectingCompareTarget) {
                          addLog(`[SYSTEM] Mode: Click second node on map / list, or select from dropdown pointer.`);
                        }
                      }
                    }}
                    className={`py-1.5 px-3 border text-[10px] font-bold rounded uppercase cursor-pointer transition-all font-mono flex items-center gap-1.5 ${
                      compareNodeId
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
                        : isSelectingCompareTarget
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                    id="lower-hud-compare"
                    title="Compare historical telemetry with a second node"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    {compareNodeId ? 'RESET COMPARISON' : isSelectingCompareTarget ? 'SELECTING TARGET...' : 'COMPARE SIGNAL'}
                  </button>

                  {isSelectingCompareTarget && (
                    <div className="flex items-center gap-2" id="comparison-inline-picker">
                      <span className="text-[9px] text-slate-500 font-mono">DROPDOWN:</span>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setCompareNodeId(val);
                            setIsSelectingCompareTarget(false);
                            const candidateNode = activeNodes.find(n => n.id === val);
                            addLog(`Comparison target selected: '${candidateNode?.label || val}'. Overlaying side-by-side trends.`);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer pointer-events-auto"
                        defaultValue=""
                      >
                        <option value="" disabled>-- CHOOSE COMPARATIVE TARGET --</option>
                        {activeNodes
                          .filter(node => node.id !== selectedNode.id)
                          .map(node => (
                            <option key={node.id} value={node.id}>
                              {node.label ? node.label.replace('HO-HTN-', '').replace('SL-MSAN-', '').replace('SL-CAB-', '') : node.id} ({node.type.toUpperCase()})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {compareNode && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-950/20 border border-purple-500/20 rounded font-mono text-[9px] text-[#c084fc] animate-fade-in" id="comparison-active-badge">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      <span>COMPARING WITH: <strong className="text-white font-black">{compareNode.label ? compareNode.label.replace('HO-HTN-', '').replace('SL-MSAN-', '').replace('SL-CAB-', '') : compareNode.id}</strong></span>
                      <button
                        onClick={() => {
                          setCompareNodeId(null);
                          addLog(`[SYSTEM] Comparison cleared.`);
                        }}
                        className="ml-1 text-slate-400 hover:text-white cursor-pointer bg-transparent border-none p-0 flex items-center justify-center font-mono font-bold"
                        title="Clear Comparison"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteNode(selectedNode.id, selectedNode.label || selectedNode.id)}
                    className="p-1.5 border border-slate-800 bg-slate-950/30 hover:bg-rose-950/20 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer self-stretch flex items-center justify-center px-2.5"
                    title="Decommission Asset Structure"
                    id="lower-hud-delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Signal trend chart */}
              <div className="lg:col-span-5 h-[170px] min-h-[170px]" id="bento-signal-chart-container">
                <SignalTrendChart selectedNode={selectedNode} compareNode={compareNode} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="hud-standby"
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
            >
              {/* Standing instruction banner */}
              <div className="lg:col-span-7 flex flex-col justify-center gap-2">
                <div className="flex items-center gap-2 text-[11.5px] font-mono text-slate-400 text-left">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-300 uppercase tracking-wider">SPOTLIGHT INSPECTOR STANDBY</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-mono">
                  SELECT ANY TELECOM NODE STRUCTURE ON THE 3D MAP VIEWPORT TO TRIGGER DIAGNOSIS AND DISPLAY HISTORICAL SIGNAL INTENSITY STREAMS AND ATTENUATION FORMULAS.
                </p>
                <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                  ACTIVE TRANSLATOR RESOLUTION • 3D GRID PLANE LIMIT: 100M
                </div>
              </div>

              {/* Show network aggregated averages line chart placeholder */}
              <div className="lg:col-span-5 h-[170px] min-h-[170px]" id="bento-signal-chart-container-standby">
                <SignalTrendChart selectedNode={null} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Footer metadata alignment */}
      <footer className="font-mono text-[9px] text-slate-600 text-center select-none pt-1" id="bento-footer">
        NEXUS DIGITAL TWIN CONTROLLER • BY NEXGEN CREATORS • PROV ENGINE V4 • STATIONS ACTIVE IN HOMAGAMA, SRI LANKA REGION
      </footer>
    </div>
  );
}
