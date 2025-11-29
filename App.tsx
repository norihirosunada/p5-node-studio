import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NodeData, EdgeData, LogEntry, DragOffset, IOType } from './types';
import { NODE_DEFINITIONS, HEADER_HEIGHT, PREVIEW_HEIGHT, NODE_WIDTH } from './constants';
import { NodeEngine } from './services/engine';
import { parseParamsFromCode } from './utils/codeParser';
import NodeItem from './components/NodeItem';
import CodeEditor from './components/CodeEditor';
import Toolbar from './components/Toolbar';
import { AlertCircle, Activity, Terminal } from 'lucide-react';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<NodeEngine | null>(null);
  
  // --- Global State ---
  // Helper to init nodes with parsed params
  const initNode = (id: string, defId: string, x: number, y: number): NodeData => {
    const code = NODE_DEFINITIONS[defId].defaultCode;
    const { values, configs } = parseParamsFromCode(code);
    return {
        id,
        defId,
        x,
        y,
        code,
        params: values,
        paramConfigs: configs
    };
  };

  const [nodes, setNodes] = useState<NodeData[]>([
    initNode('geo1', 'GEO_CIRCLE', 50, 50),
    { ...initNode('geo_trans', 'GEO_TRANSFORM', 300, 50), params: { tx: 20, ty: 0, rotate: 0, scale: 1.0 }, paramConfigs: parseParamsFromCode(NODE_DEFINITIONS.GEO_TRANSFORM.defaultCode).configs },
    initNode('render1', 'GEO_RENDER', 550, 50),
    initNode('out1', 'FINAL_OUTPUT', 800, 50)
  ]);
  
  const [edges, setEdges] = useState<EdgeData[]>([
      { id: 'e1', source: 'geo1', target: 'geo_trans', inputIndex: 0 },
      { id: 'e2', source: 'geo_trans', target: 'render1', inputIndex: 0 },
      { id: 'e3', source: 'render1', target: 'out1', inputIndex: 0 }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  
  // --- Interaction State ---
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<DragOffset>({ x: 0, y: 0 });
  const [editModal, setEditModal] = useState<{ id: string, code: string } | null>(null);

  // Logging
  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), message, type }, ...prev].slice(0, 50));
  }, []);

  // Initialize Engine
  useEffect(() => {
    if (containerRef.current && !engineRef.current) {
      engineRef.current = new NodeEngine(containerRef.current, addLog);
    }
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [addLog]);

  // Sync State to Engine
  useEffect(() => {
    engineRef.current?.updateState(nodes, edges);
  }, [nodes, edges]);

  // Pointer Helpers
  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    // @ts-ignore
    const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
    // @ts-ignore
    const clientY = e.touches ? e.touches[0]?.clientY : e.clientY;
    
    if (clientX === undefined && 'changedTouches' in e) {
        // @ts-ignore
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: clientX || 0, y: clientY || 0 };
  };

  // Node Dragging
  const handleNodeDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    const { x, y } = getPointerPos(e);
    const node = nodes.find(n => n.id === id);
    if (node) {
      dragOffsetRef.current = { x: x - node.x, y: y - node.y };
      setDraggingNodeId(id);
    }
  };

  // Connection Start
  const handleConnectStart = (e: React.MouseEvent | React.TouchEvent, id: string, io: 'input' | 'output') => {
    e.stopPropagation();
    if (io === 'output') {
      setConnectingNodeId(id);
      if (engineRef.current) engineRef.current.connectingSource = id;
    }
  };

  // Global Move
  const handleGlobalMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPointerPos(e);
    
    // Update Engine Mouse Position
    if (engineRef.current) {
      engineRef.current.mouseX = x;
      engineRef.current.mouseY = y;
    }

    // Handle Node Drag
    if (draggingNodeId) {
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? {
        ...n,
        x: x - dragOffsetRef.current.x,
        y: y - dragOffsetRef.current.y
      } : n));
    }
  };

  // Global Up (End Drag/Connect)
  const handleGlobalUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (connectingNodeId) {
      const { x, y } = getPointerPos(e);
      const elements = document.elementsFromPoint(x, y);
      const portElement = elements.find(el => el.getAttribute('data-port-type') === 'input');
      
      if (portElement) {
        const targetId = portElement.getAttribute('data-node-id');
        const inputIndex = parseInt(portElement.getAttribute('data-input-index') || '0', 10);

        if (targetId && targetId !== connectingNodeId) {
          const sourceNode = nodes.find(n => n.id === connectingNodeId);
          const targetNode = nodes.find(n => n.id === targetId);
          
          if (sourceNode && targetNode) {
            const sDef = NODE_DEFINITIONS[sourceNode.defId];
            const tDef = NODE_DEFINITIONS[targetNode.defId];
            
            // Check Compatibility
            if (sDef.outputType === tDef.inputType) {
              setEdges(prev => {
                // Ensure unique connection per input index
                // Remove existing edge that targets this specific port
                const clean = prev.filter(edge => !(edge.target === targetId && (edge.inputIndex || 0) === inputIndex));
                
                return [...clean, { 
                    id: `e-${Date.now()}`, 
                    source: connectingNodeId, 
                    target: targetId,
                    inputIndex: inputIndex // Store which input index is used
                }];
              });
              addLog(`Connected ${sDef.label} to ${tDef.label} (In: ${inputIndex})`, 'success');
            } else {
              addLog(`Type Mismatch: ${sDef.outputType} cannot connect to ${tDef.inputType}`, 'error');
            }
          }
        }
      }
      
      setConnectingNodeId(null);
      if (engineRef.current) engineRef.current.connectingSource = null;
    }
    
    setDraggingNodeId(null);
  };

  // Node Operations
  const handleAddNode = (defId: string) => {
    const newNode = initNode(
        `n-${Date.now()}`, 
        defId, 
        window.innerWidth / 2 - NODE_WIDTH / 2, 
        window.innerHeight / 2 - PREVIEW_HEIGHT
    );
    setNodes(prev => [...prev, newNode]);
    addLog(`Added ${NODE_DEFINITIONS[defId].label}`, 'info');
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    addLog('Node deleted', 'info');
  };

  const handleDisconnect = (nodeId: string, inputIndex: number) => {
    setEdges(prev => {
      const newEdges = prev.filter(e => !(e.target === nodeId && (e.inputIndex || 0) === inputIndex));
      if (newEdges.length !== prev.length) {
        addLog(`Connection removed from Input ${inputIndex + 1}`, 'info');
      }
      return newEdges;
    });
  };

  const handleParamChange = (id: string, param: string, value: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, params: { ...n.params, [param]: value } } : n));
  };

  const handleSaveCode = (code: string) => {
    if (editModal) {
      // Parse params from the new code
      const { values: defaultValues, configs } = parseParamsFromCode(code);
      
      setNodes(prev => prev.map(n => {
        if (n.id === editModal.id) {
            // Merge existing params: Keep current value if key exists, otherwise use parsed default
            const mergedParams = { ...defaultValues };
            Object.keys(mergedParams).forEach(key => {
                if (n.params[key] !== undefined) {
                    mergedParams[key] = n.params[key];
                }
            });

            return { 
                ...n, 
                code,
                params: mergedParams,
                paramConfigs: configs
            };
        }
        return n;
      }));
      addLog('Code updated and params re-parsed', 'success');
    }
  };

  return (
    <div 
      className="w-full h-screen bg-black text-white overflow-hidden relative touch-none select-none font-sans"
      onMouseMove={handleGlobalMove}
      onTouchMove={handleGlobalMove}
      onMouseUp={handleGlobalUp}
      onTouchEnd={handleGlobalUp}
    >
      {/* Background Container for p5 */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* Node Layer */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {nodes.map(node => (
          <NodeItem
            key={node.id}
            node={node}
            connectedInputs={edges
                .filter(e => e.target === node.id)
                .map(e => e.inputIndex || 0)
            }
            onMouseDown={handleNodeDragStart}
            onConnectStart={handleConnectStart}
            onDisconnect={handleDisconnect}
            onDelete={handleDeleteNode}
            onEditCode={(id) => setEditModal({ id, code: nodes.find(n => n.id === id)?.code || '' })}
            onParamChange={handleParamChange}
          />
        ))}
      </div>

      {/* UI Layer */}
      <Toolbar onAddNode={handleAddNode} />

      {/* Code Editor Modal */}
      {editModal && (
        <CodeEditor
          isOpen={true}
          initialCode={editModal.code}
          nodeTitle={nodes.find(n => n.id === editModal.id)?.defId || 'Node'}
          onClose={() => setEditModal(null)}
          onSave={handleSaveCode}
        />
      )}
      
      {/* Logs / Console */}
      <div className={`fixed bottom-0 left-0 z-50 transition-all duration-300 ${consoleOpen ? 'h-48' : 'h-8'} w-full md:w-96 bg-black/80 backdrop-blur border-t border-r border-white/10 rounded-tr-lg overflow-hidden flex flex-col`}>
        <button 
            onClick={() => setConsoleOpen(!consoleOpen)}
            className="h-8 bg-neutral-900 flex items-center justify-between px-3 text-xs font-mono text-gray-400 hover:text-white cursor-pointer w-full text-left"
        >
            <div className="flex items-center gap-2">
                <Terminal size={12} />
                <span>Console ({logs.length})</span>
            </div>
            <Activity size={12} className={logs.length > 0 && logs[0].type === 'error' ? 'text-red-500' : 'text-gray-600'} />
        </button>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1 custom-scrollbar">
            {logs.map(log => (
                <div key={log.id} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className="opacity-50">[{log.time}]</span>
                    <span>{log.message}</span>
                </div>
            ))}
            {logs.length === 0 && <span className="text-gray-700 italic">System ready...</span>}
        </div>
      </div>

    </div>
  );
};

export default App;