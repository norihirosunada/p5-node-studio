import React, { useState, useEffect } from 'react';
import { X, Save, Terminal } from 'lucide-react';

interface CodeEditorProps {
  isOpen: boolean;
  initialCode: string;
  nodeTitle: string;
  onClose: () => void;
  onSave: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ isOpen, initialCode, nodeTitle, onClose, onSave }) => {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl flex flex-col h-[60vh] md:h-[500px] animate-in fade-in zoom-in duration-200">
        <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-950 rounded-t-lg">
          <div className="flex items-center gap-2 text-blue-400">
            <Terminal size={16} />
            <span className="font-mono font-bold text-sm">Editing: {nodeTitle}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:text-white text-gray-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 relative">
          <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full bg-neutral-900 text-gray-300 font-mono text-xs p-4 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 leading-relaxed"
            spellCheck={false}
          />
        </div>

        <div className="h-12 border-t border-neutral-800 flex items-center justify-end px-4 gap-3 bg-neutral-950 rounded-b-lg">
          <span className="text-xs text-gray-600 mr-auto hidden sm:block">
            Available: p, pg, inputs, params, log
          </span>
          <button 
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onSave(code); onClose(); }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors"
          >
            <Save size={14} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
