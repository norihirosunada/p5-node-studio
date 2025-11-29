import React, { memo } from 'react';
import { NodeData, NodeDefinition, IOType } from '../types';
import { NODE_DEFINITIONS, NODE_WIDTH, PREVIEW_HEIGHT } from '../constants';
import { Code, Trash2 } from 'lucide-react';

interface NodeItemProps {
  node: NodeData;
  connectedInputs: number[]; 
  onMouseDown: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onConnectStart: (e: React.MouseEvent | React.TouchEvent, id: string, io: 'input' | 'output') => void;
  onDisconnect: (id: string, inputIndex: number) => void;
  onDelete: (id: string) => void;
  onEditCode: (id: string) => void;
  onParamChange: (id: string, param: string, value: number) => void;
}

const NodeItem: React.FC<NodeItemProps> = memo(({ node, connectedInputs, onMouseDown, onConnectStart, onDisconnect, onDelete, onEditCode, onParamChange }) => {
  const def: NodeDefinition = NODE_DEFINITIONS[node.defId];

  // Determine number of inputs
  const inputCount = def.inputCount !== undefined ? def.inputCount : (def.inputType ? 1 : 0);
  const inputPorts = Array.from({ length: inputCount });

  return (
    <div
      className={`absolute flex flex-col rounded-lg shadow-xl pointer-events-auto transition-all duration-200 border backdrop-blur-md select-none group ${def.color}`}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
      }}
    >
      {/* Header / Drag Handle */}
      <div
        className="h-[40px] flex items-center justify-between px-3 border-b border-white/10 cursor-grab active:cursor-grabbing bg-black/40 rounded-t-lg"
        onMouseDown={(e) => onMouseDown(e, node.id)}
        onTouchStart={(e) => onMouseDown(e, node.id)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <def.icon size={14} className={def.type === IOType.GEO ? 'text-yellow-400' : 'text-blue-400'} />
          <span className="text-xs font-bold text-gray-200 truncate">{def.label}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-drag" onMouseDown={e => e.stopPropagation()}>
          <button onClick={() => onEditCode(node.id)} className="p-1.5 rounded hover:bg-white/20 text-gray-400 hover:text-white transition-colors">
            <Code size={12} />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative w-full bg-black/80 overflow-hidden group-hover:bg-black/90 transition-colors" style={{ height: PREVIEW_HEIGHT }}>
        <canvas
          id={`preview-${node.id}`}
          width={NODE_WIDTH}
          height={PREVIEW_HEIGHT}
          className="w-full h-full object-cover block"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Dynamic Input Ports */}
        {inputPorts.map((_, index) => {
            const isPortConnected = connectedInputs.includes(index);
            // Calculate evenly distributed vertical position
            const topPercent = ((index + 1) / (inputCount + 1)) * 100;

            return (
              <div
                key={`in-${index}`}
                className={`absolute -left-2.5 -translate-y-1/2 w-5 h-5 border rounded-full flex items-center justify-center cursor-crosshair hover:scale-125 transition-all z-10 ${
                  isPortConnected 
                    ? 'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
                    : 'bg-black border-gray-500 hover:border-white'
                }`}
                style={{ top: `${topPercent}%` }}
                title={`Input ${index + 1} (Right-click to disconnect)`}
                data-port-type="input"
                data-node-id={node.id}
                data-input-index={index}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDisconnect(node.id, index);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onDisconnect(node.id, index);
                }}
              >
                <div className={`w-2 h-2 rounded-full ${def.inputType === IOType.GEO ? 'bg-yellow-500' : 'bg-blue-500'} ${isPortConnected ? 'opacity-0' : 'opacity-100'}`} />
              </div>
            );
        })}
        
        {/* Output Port (Single for now) */}
        <div
          className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 bg-black border border-gray-500 rounded-full flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform hover:border-white z-10"
          data-port-type="output"
          data-node-id={node.id}
          onMouseDown={(e) => onConnectStart(e, node.id, 'output')}
          onTouchStart={(e) => onConnectStart(e, node.id, 'output')}
        >
          <div className={`w-2 h-2 rounded-full ${def.outputType === IOType.GEO ? 'bg-yellow-500' : 'bg-blue-500'}`} />
        </div>
      </div>

      {/* Parameters */}
      <div className="p-2 space-y-2 bg-black/20 rounded-b-lg border-t border-white/5">
        {Object.entries(node.params).map(([key, value]) => {
          // Fallback if config is missing (robustness)
          const config = node.paramConfigs?.[key] || { min: 0, max: 100, step: 1 };
          
          return (
            <div key={key} className="flex flex-col gap-1 no-drag">
              <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wider">
                <span className="truncate max-w-[100px]" title={key}>{key}</span>
                <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
              </div>
              <input
                type="range"
                min={config.min}
                max={config.max}
                step={config.step}
                value={value}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onChange={(e) => onParamChange(node.id, key, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          );
        })}
        {Object.keys(node.params).length === 0 && (
          <div className="text-[10px] text-gray-500 text-center italic py-1">No Parameters</div>
        )}
      </div>
    </div>
  );
});

export default NodeItem;