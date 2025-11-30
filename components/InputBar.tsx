import React, { useState } from 'react';
import { ArrowRight, Loader2, Sparkles, Sword, Clock } from 'lucide-react';
import { InputMode } from '../types';

interface InputBarProps {
  onSubmit: (input: string, mode: InputMode) => Promise<void>;
  isProcessing: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSubmit, isProcessing }) => {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<InputMode>('kill');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    await onSubmit(value, mode);
    setValue('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 backdrop-blur-lg bg-opacity-95 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-3xl mx-auto w-full px-4 pt-3 pb-4">
        
        {/* Mode Toggles */}
        <div className="flex gap-2 mb-3">
            <button
                type="button"
                onClick={() => setMode('kill')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'kill' 
                    ? 'bg-red-900/40 text-red-200 border border-red-700/50 shadow-inner' 
                    : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-750'
                }`}
            >
                <Sword size={14} />
                <span>擊殺時間輸入</span>
            </button>
            <button
                type="button"
                onClick={() => setMode('spawn')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'spawn' 
                    ? 'bg-blue-900/40 text-blue-200 border border-blue-700/50 shadow-inner' 
                    : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-750'
                }`}
            >
                <Clock size={14} />
                <span>重生時間輸入</span>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1 group">
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${mode === 'kill' ? 'text-red-500' : 'text-blue-500'}`}>
              <Sparkles size={18} />
            </div>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === 'kill' ? "例: 0300 東飛 (輸入擊殺時間)" : "例: 0600 東飛 (輸入重生時間)"}
              className={`w-full bg-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-lg placeholder-zinc-500 text-lg ${
                  mode === 'kill' ? 'focus:ring-red-500/30' : 'focus:ring-blue-500/30'
              }`}
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing || !value.trim()}
            className={`p-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center min-w-[3rem] text-white ${
                mode === 'kill' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <ArrowRight size={24} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InputBar;
