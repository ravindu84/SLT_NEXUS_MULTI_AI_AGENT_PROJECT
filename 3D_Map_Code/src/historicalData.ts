export interface TimelineEvent {
  title: string;
  desc: string;
  faults: string[];
  load: number;
  up: number;
  down: number;
}

export const HISTORICAL_TIMELINE: Record<number, TimelineEvent> = {
  0: {
    title: "LIVE TELEMETRY ACTIVE",
    desc: "Streaming real-time operations. Homagama Town, Pitipana Tech-City and Kottawa segments nominal.",
    faults: [],
    load: 24,
    up: 4.2,
    down: 9.8
  },
  1: {
    title: "GRID STABILITY OPTIMAL",
    desc: "1 HOUR AGO: Full-frequency optical check completed across HO-HTN sectors. Fiber loss holds <0.015 dB/km.",
    faults: [],
    load: 18,
    up: 4.2,
    down: 9.8
  },
  2: {
    title: "POST-SURGE MONITORING",
    desc: "2 HOURS AGO: Backplane buffer queues cleared at Homagama central exchange. Transients subsided.",
    faults: [],
    load: 16,
    up: 4.2,
    down: 9.8
  },
  3: {
    title: "STEADY STATE NOMINAL",
    desc: "3 HOURS AGO: Baseline FTTH latency metrics verify stable under 8ms with zero pocket drops.",
    faults: [],
    load: 19,
    up: 4.2,
    down: 9.8
  },
  4: {
    title: "HO-ATR ATTENUATION RISK",
    desc: "4 HOURS AGO: Athurugiriya Road cabinet DP HO-ATR-0520-001 reporting high resistance due to moisture ingress.",
    faults: ['node-04'],
    load: 35,
    up: 3.9,
    down: 9.0
  },
  5: {
    title: "ATR CABINET DISRUPTION",
    desc: "5 HOURS AGO: Storm winds disrupt overhead hook on HO-ATR-0520-001. High optical packet retry rates.",
    faults: ['node-04'],
    load: 45,
    up: 3.4,
    down: 8.5
  },
  6: {
    title: "HO-ATR-0520-001 ALARM CRITICAL",
    desc: "6 HOURS AGO: Wind gusts cause severe physical splitter attenuation at HO-ATR-0520-001. Auto-broadcast active.",
    faults: ['node-04'],
    load: 48,
    up: 3.3,
    down: 8.1
  },
  7: {
    title: "NOC REGIONAL DISPATCH",
    desc: "7 HOURS AGO: SLT engineering team dispatched to HO-ATR-0520 cabinet for overhead reinforcement.",
    faults: ['node-04'],
    load: 46,
    up: 3.5,
    down: 8.3
  },
  8: {
    title: "INTERFERENCE DECREASING",
    desc: "8 HOURS AGO: Winds drop. Joint splice box signal slowly rebounds from peak attenuation.",
    faults: ['node-04'],
    load: 38,
    up: 3.8,
    down: 8.9
  },
  9: {
    title: "AUTOMATED SHUNT ACTIVE",
    desc: "9 HOURS AGO: Network shunting algorithm isolates sector HO-ATR-0520-001 for safety. Packet loss normalized.",
    faults: [],
    load: 22,
    up: 4.2,
    down: 9.8
  },
  10: {
    title: "ATR SECTOR RECOVERY",
    desc: "10 HOURS AGO: Technician reports optical casing re-sealed at Athurugiriya Road. Power index nominal.",
    faults: [],
    load: 17,
    up: 4.2,
    down: 9.8
  },
  11: {
    title: "GRID OVERVIEW NOMINAL",
    desc: "11 HOURS AGO: Homagama central sector nominal. Dynamic safety logs flushed successfully.",
    faults: [],
    load: 20,
    up: 4.2,
    down: 9.8
  },
  12: {
    title: "PITIPANA SUBSTATION TRIP",
    desc: "12 HOURS AGO: Grid outage disables AC supply at Pitipana Tech-City Pole HO-PTP-0310-PL03. Battery backup engage.",
    faults: ['node-05'],
    load: 40,
    up: 3.8,
    down: 8.7
  },
  13: {
    title: "PTP BATTERY VOLTAGE SAG",
    desc: "13 HOURS AGO: Secondary voltage drop at Pitipana Pole. High customer load alert on DP HO-PTP-0310-001.",
    faults: ['node-05', 'node-06'],
    load: 65,
    up: 2.7,
    down: 6.3
  },
  14: {
    title: "PTP THERMAL FAULT ACTIVE",
    desc: "14 HOURS AGO: Cabinet temperature exceeds threshold at HO-PTP-0310-001. Circuit breakers tripped to protect cores.",
    faults: ['node-05', 'node-06'],
    load: 75,
    up: 2.1,
    down: 5.0
  },
  15: {
    title: "GPON CARRIER LOSS WARNING",
    desc: "15 HOURS AGO: Pitipana Ring loses optical carrier link. Dispatch team escalated to high-priority emergency.",
    faults: ['node-05', 'node-06'],
    load: 85,
    up: 1.7,
    down: 4.2
  },
  16: {
    title: "DIESEL BACKUP GENERATOR ALIGN",
    desc: "16 HOURS AGO: Emergency diesel generator booted at Pitipana central hub. Sector voltages stabilized.",
    faults: ['node-05'],
    load: 48,
    up: 3.6,
    down: 8.2
  },
  17: {
    title: "HIGH LEVEL ROAD TRUNK STRAIN",
    desc: "17 HOURS AGO: Strain sensors on High Level Road Central Pole HO-HTN-0100-PL01 report high physical deflection.",
    faults: ['node-01'],
    load: 32,
    up: 4.1,
    down: 9.5
  },
  18: {
    title: "TRUNK SECTOR DILATION",
    desc: "18 HOURS AGO: Heavy fiber feeder tension shifts. Defect reported on HO-HTN-0100-PL01 and HO-ATR-0520-PL02.",
    faults: ['node-01', 'node-03'],
    load: 58,
    up: 2.9,
    down: 6.9
  },
  19: {
    title: "KOTTAWA OPTICAL SEVERANCE",
    desc: "19 HOURS AGO: Cable severance by tall transport vehicle on High Level trunk. Multi-fiber cores deactivated.",
    faults: ['node-01', 'node-03'],
    load: 68,
    up: 2.2,
    down: 5.5
  },
  20: {
    title: "EMERGENCY FIBER JOINT SPLICE",
    desc: "20 HOURS AGO: Fast-splice team bypasses physical damage at Kottawa Road. Western link active.",
    faults: ['node-03'],
    load: 42,
    up: 3.7,
    down: 8.6
  },
  21: {
    title: "BYPASS LOG NOMINAL",
    desc: "21 HOURS AGO: Fiber diversion successful. Homagama central ring latency restored below 8ms.",
    faults: [],
    load: 21,
    up: 4.2,
    down: 9.8
  },
  22: {
    title: "DYNAMIC ROUTING SYNC",
    desc: "22 HOURS AGO: Overload streams cleared, core routing partition rebuilt. Auto-recovery validated.",
    faults: [],
    load: 18,
    up: 4.2,
    down: 9.8
  },
  23: {
    title: "GRID STEADY OVERNIGHT",
    desc: "23 HOURS AGO: Minimal nocturnal telecom traffic. Autonomous security sweeps report nominal status.",
    faults: [],
    load: 17,
    up: 4.2,
    down: 9.8
  },
  24: {
    title: "REGIONAL DIAGNOSTIC ROUND",
    desc: "24 HOURS AGO: Scheduled sweep of the regional Sri Lanka Telecom Homagama hub completed. Base metrics nominal.",
    faults: [],
    load: 19,
    up: 4.2,
    down: 9.8
  }
};
