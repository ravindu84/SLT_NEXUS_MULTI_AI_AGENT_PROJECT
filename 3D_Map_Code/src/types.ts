/**
 * Types for the 3D Telecom Network Digital Twin
 */

export type NodeStatus = 'normal' | 'fault';
export type NodeType = 'pole' | 'dp' | 'msan' | 'cabinet';

export interface NetworkNode {
  id: string;
  type: NodeType;
  lat: number;
  lon: number;
  status: NodeStatus;
  label?: string;
  description?: string;
  faultDetectedAt?: number;
}

export interface GISCoordinates {
  lat: number;
  lon: number;
}

export interface Connection {
  from: string;
  to: string;
  type: 'fiber' | 'copper';
}
