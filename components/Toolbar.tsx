import React, { useState } from 'react';
import { Plus, X, Box } from 'lucide-react';
import { NODE_DEFINITIONS } from '../constants';
import { NodeCategory } from '../types';

interface ToolbarProps {
  onAddNode: (key: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const categories = Object.values(NodeCategory).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-4 w-64 animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add Node</span>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {categories.map(cat => (
                    <div key={cat}>
                        <h4 className="text-[10px] text-gray-500 font-bold mb-2 uppercase">{cat}</h4>
                        <div className="grid grid-cols-1 gap-1">
                             {Object.entries(NODE_DEFINITIONS)
                                .filter(([_, def]) => def.category === cat)
                                .map(([key, def]) => (
                                    <button
                                        key={key}
                                        onClick={() => { onAddNode(key); setIsOpen(false); }}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-white/10 text-left transition-colors group"
                                    >
                                        <div className={`p-1.5 rounded bg-black/40 ${def.color.split(' ')[0].replace('border-', 'text-')}`}>
                                            <def.icon size={14} />
                                        </div>
                                        <span className="text-xs font-medium text-gray-300 group-hover:text-white">{def.label}</span>
                                    </button>
                                ))
                             }
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-red-500 rotate-45' : 'bg-blue-600 hover:bg-blue-500 hover:scale-110'}`}
      >
        <Plus size={28} className="text-white" />
      </button>
    </div>
  );
};

export default Toolbar;
