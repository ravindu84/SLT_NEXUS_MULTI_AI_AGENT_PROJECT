import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { NetworkNode } from '../types';
import { Activity, Radio, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SignalPoint {
  hour: string;
  strength: number;
  noise: number;
  strengthCompare?: number;
}

interface SignalTrendChartProps {
  selectedNode: NetworkNode | null;
  compareNode?: NetworkNode | null;
}

export default function SignalTrendChart({ selectedNode, compareNode = null }: SignalTrendChartProps) {
  // Generate 24 hourly data points based on selected node status
  const trendData = useMemo(() => {
    const data: SignalPoint[] = [];
    const currentHour = new Date().getHours();

    for (let i = 23; i >= 0; i--) {
      // Calculate hour string
      const hr = (currentHour - i + 24) % 24;
      const hourStr = `${hr.toString().padStart(2, '0')}:00`;

      // Base strength calculations with pseudo-random seed based on index and node ID
      const seed = selectedNode ? selectedNode.id.charCodeAt(selectedNode.id.length - 1) || 5 : 42;
      const waveVal = Math.sin((hr + seed) * 0.5) * 3;
      const randNoise = (Math.cos(hr * 1.3 + seed) * 1.5);

      let strength = 92 + waveVal + randNoise; // default high quality normal signal

      if (selectedNode) {
        if (selectedNode.status === 'fault') {
          // If the node has a fault, simulate a sudden dramatic drop 5 hours ago
          if (i <= 5) {
            // Signal plummeted and is highly unstable in the last 5 hours
            strength = 18 + Math.sin(hr * 2) * 4 + (Math.random() - 0.5) * 3;
          } else {
            // normal signal before the failure event
            strength = 89 + waveVal + randNoise;
          }
        }
      } else {
        // Aggregated standard network average
        strength = 94.5 + waveVal * 0.4 + randNoise * 0.3;
      }

      // bound value between 0 and 100
      strength = Math.max(2, Math.min(100, parseFloat(strength.toFixed(1))));

      // Compare node logic
      let strengthCompare: number | undefined = undefined;
      if (compareNode) {
        const compareSeed = compareNode.id.charCodeAt(compareNode.id.length - 1) || 7;
        const compareWaveVal = Math.sin((hr + compareSeed) * 0.5) * 3;
        const compareRandNoise = (Math.cos(hr * 1.3 + compareSeed) * 1.5);
        let sComp = 92 + compareWaveVal + compareRandNoise;

        if (compareNode.status === 'fault') {
          if (i <= 5) {
            sComp = 18 + Math.sin(hr * 2) * 4 + (Math.random() - 0.5) * 3;
          } else {
            sComp = 89 + compareWaveVal + compareRandNoise;
          }
        }
        strengthCompare = Math.max(2, Math.min(100, parseFloat(sComp.toFixed(1))));
      }

      data.push({
        hour: hourStr,
        strength,
        noise: parseFloat((1.2 + Math.abs(randNoise) * 0.15).toFixed(2)),
        strengthCompare
      });
    }
    return data;
  }, [selectedNode, compareNode]);

  // Determine accent color and diagnostic stats based on mode
  const isFault = selectedNode?.status === 'fault';
  const strokeColor = isFault ? '#f43f5e' : '#22d3ee'; // rose-500 vs cyan-400
  const fillColor = isFault ? 'url(#colorFault)' : 'url(#colorNormal)';

  const currentStrength = useMemo(() => {
    if (trendData.length === 0) return 100;
    return trendData[trendData.length - 1].strength;
  }, [trendData]);

  const minStrength = useMemo(() => {
    return Math.min(...trendData.map(d => d.strength));
  }, [trendData]);

  const maxStrength = useMemo(() => {
    return Math.max(...trendData.map(d => d.strength));
  }, [trendData]);

  const avgStrength = useMemo(() => {
    if (trendData.length === 0) return 0;
    const sum = trendData.reduce((acc, d) => acc + d.strength, 0);
    return parseFloat((sum / trendData.length).toFixed(1));
  }, [trendData]);

  const compareStats = useMemo(() => {
    if (!compareNode) return null;
    const strengths = trendData.map(d => d.strengthCompare || 0);
    const maxVal = Math.max(...strengths);
    const minVal = Math.min(...strengths);
    const avgVal = parseFloat((strengths.reduce((acc, v) => acc + v, 0) / strengths.length).toFixed(1));
    return { maxVal, minVal, avgVal, isFault: compareNode.status === 'fault' };
  }, [compareNode, trendData]);

  return (
    <div className="flex flex-col bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 h-full select-none" id="signal-trend-container">
      {/* Chart Header details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-slate-300">
            <Radio className={`w-3.5 h-3.5 ${isFault ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}`} />
            <span>24H SIGNAL INTENSITY COMPARISON</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            {compareNode 
              ? `${selectedNode?.label?.replace('HO-HTN-', '') || selectedNode?.id} (Cyan) vs ${compareNode.label?.replace('HO-HTN-', '') || compareNode.id} (Purple)`
              : (selectedNode ? `Live telemetry slice for ${selectedNode.label}` : 'Network Aggregated Sector Mean')}
          </span>
        </div>

        {/* Dynamic Quick Stat Badges */}
        {!compareNode ? (
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] self-start sm:self-center">
            <div className="px-2 py-0.5 bg-slate-950 border border-slate-900 rounded">
              <span className="text-slate-500 mr-1">MAX:</span>
              <span className="text-white font-bold">{maxStrength}%</span>
            </div>
            <div className="px-2 py-0.5 bg-slate-950 border border-slate-900 rounded">
              <span className="text-slate-500 mr-1">MIN:</span>
              <span className={`font-bold ${isFault ? 'text-rose-400' : 'text-emerald-400'}`}>{minStrength}%</span>
            </div>
            <div className="px-2 py-0.5 bg-slate-950 border border-slate-900 rounded">
              <span className="text-slate-500 mr-1">AVG:</span>
              <span className="text-cyan-400 font-bold">{avgStrength}%</span>
            </div>
            <div className="px-2 py-0.5 bg-slate-950/80 border border-cyan-500/15 text-cyan-400 font-bold rounded text-[9px]">
              <span>1H INTERVAL</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 text-[8.5px] sm:text-[9.5px] font-mono leading-none self-start sm:self-center" id="hud-comparison-legend-stats">
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
              <span className="text-slate-500">PRIMARY AVG:</span>
              <span className="text-cyan-400 font-bold">{avgStrength}%</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">MIN:</span>
              <span className={isFault ? 'text-rose-450 font-bold' : 'text-slate-300'}>{minStrength}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
              <span className="text-slate-500">COMPARE AVG:</span>
              <span className="text-purple-400 font-bold">{compareStats?.avgVal}%</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">MIN:</span>
              <span className={compareStats?.isFault ? 'text-rose-455 font-bold' : 'text-slate-300'}>{compareStats?.minVal}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/10 text-cyan-400 font-bold text-[8.5px]">
              <span className="text-slate-550">SAMPLE INTERVAL:</span>
              <span>1 HOUR</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart viewport container */}
      <div className="flex-1 min-h-[140px] relative mt-1" id="recharts-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorFault" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorCompare" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />

            <XAxis
              dataKey="hour"
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={8}
              tickFormatter={(tick) => {
                // Return every 4th hour tick to keep presentation tidy
                const hourNum = parseInt(tick.split(':')[0]);
                return hourNum % 4 === 0 ? tick : '';
              }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as SignalPoint;
                  return (
                    <div className="p-2.5 bg-slate-950/92 border border-slate-800/80 backdrop-blur rounded shadow-xl font-mono text-[10px] space-y-1 z-30">
                      <div className="text-slate-400 font-semibold">{data.hour}</div>
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-cyan-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                          Primary Node:
                        </span>
                        <span className={`font-black ${data.strength < 40 ? 'text-rose-455 animate-pulse' : 'text-cyan-400'}`}>
                          {data.strength}%
                        </span>
                      </div>
                      {compareNode && data.strengthCompare !== undefined && (
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-purple-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                            Compare Node:
                          </span>
                          <span className={`font-black ${data.strengthCompare < 40 ? 'text-rose-455 animate-pulse' : 'text-purple-405'}`}>
                            {data.strengthCompare}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 justify-between border-t border-slate-900 pt-1 mt-1">
                        <span className="text-slate-500">Phase Error:</span>
                        <span className="text-slate-300 font-bold">±{data.noise} dB</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="strength"
              stroke={strokeColor}
              strokeWidth={1.5}
              fillOpacity={1}
              fill={fillColor}
              activeDot={{ r: 4, strokeWidth: 1, fill: '#090d16' }}
            />

            {compareNode && (
              <Area
                type="monotone"
                dataKey="strengthCompare"
                stroke={compareNode.status === 'fault' ? '#f43f5e' : '#c084fc'}
                strokeWidth={1.5}
                fillOpacity={1}
                fill={compareNode.status === 'fault' ? 'url(#colorFault)' : 'url(#colorCompare)'}
                activeDot={{ r: 4, strokeWidth: 1, fill: '#090d16' }}
              />
            )}

            {/* Threshold level marker lines */}
            <ReferenceLine y={45} stroke="rgba(244,63,94,0.18)" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick summary line at the bottom */}
      <div className="flex items-center justify-between font-mono text-[10px] pt-2 border-t border-slate-900">
        <div className="flex items-center gap-1">
          {compareNode ? (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9.5px] uppercase font-bold text-slate-500">CORRELATION:</span>
              <span className={isFault || compareNode.status === 'fault' ? 'text-amber-400 animate-pulse font-semibold' : 'text-emerald-450 font-semibold'}>
                {isFault && compareNode.status === 'fault' 
                  ? 'MUTUAL OUTAGE' 
                  : (isFault || compareNode.status === 'fault' ? 'CROSS ATTENUATION' : 'COHERENT PATTERN')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {isFault ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span className="text-rose-450 font-semibold animate-pulse">ATTENUATION DETECTED</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">COHERENCY OPTIMAL</span>
                </>
              )}
            </div>
          )}
        </div>
        <span className="text-slate-500">
          {compareNode && trendData[trendData.length - 1].strengthCompare !== undefined ? (
            <>
              G1: <span className="font-bold text-cyan-400 mr-2">{currentStrength}%</span>
              G2: <span className="font-bold text-purple-400">{trendData[trendData.length - 1].strengthCompare}%</span>
            </>
          ) : (
            <>
              CURRENT GAIN: <span className="font-bold text-slate-300">{currentStrength}%</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
