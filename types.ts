import { LucideIcon } from 'lucide-react';

export enum IOType {
  GEO = 'GEO',
  TEX = 'TEX',
}

export enum NodeCategory {
  GEOMETRY = 'GEOMETRY',
  TEXTURE = 'TEXTURE',
  UTILITY = 'UTILITY',
}

export interface NodeDefinition {
  label: string;
  type: IOType; // The main type of the node
  category: NodeCategory;
  inputType?: IOType;
  outputType?: IOType;
  inputCount?: number; // How many input ports to render
  icon: LucideIcon;
  defaultCode: string;
  color: string;
}

export interface ParamConfig {
  min: number;
  max: number;
  step: number;
}

export interface NodeData {
  id: string;
  defId: string; // References the key in NODE_DEFINITIONS
  x: number;
  y: number;
  params: Record<string, number>;
  paramConfigs: Record<string, ParamConfig>; // UI Constraints parsed from code
  code: string;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  inputIndex?: number; // Which input port this edge is connected to (default 0)
}

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export interface DragOffset {
  x: number;
  y: number;
}