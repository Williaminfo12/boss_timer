import React, { useState, useEffect } from 'react';
import { Timer, InputMode } from '../types';
import { X, Save, Clock, Sword } from 'lucide-react';

interface EditModalProps {
  timer: Timer;
  onClose: () => void;
  onSave: (id: string, timeStr: string, mode: InputMode, isPass: boolean) => void;
}

const EditModal: React.FC<EditModalProps> = ({ timer, onClose, onSave }) => {
  const [timeStr, setTimeStr] = useState('');
  const [mode, setMode] = useState<InputMode>('spawn');
  const [isPass, setIsPass] = useState(false);

  // Initialize state from timer
  useEffect(() => {
    const date = new Date(timer.nextSpawn);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    setTimeStr(`${hh}${mm}`);
    setMode('spawn'); // Default to editing the spawn time
    setIsPass(timer.isPass);
  }, [timer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(timer.id, timeStr, mode, isPass);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-800/50 border-b border-zinc-700">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            修改: {timer.bossName}
          </h3>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          
          {/* Time Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {mode === 'spawn' ? '設定重生時間' : '設定擊殺時間'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={timeStr}
                onChange={(e) => {
                  // Only allow numbers
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setTimeStr(val);
                }}
                placeholder="HHMM (例如 0630)"
                className={`w-full bg-black/40 text-center text-3xl font-mono font-bold py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                  mode === 'spawn' 
                    ? 'border-blue-900/50 focus:border-blue-500 text-blue-100' 
                    : 'border-red-900/50 focus:border-red-500 text-red-100'
                }`}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-sm pointer-events-none">
                HHMM
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950/50 p-1 rounded-xl">
             <button
              type="button"
              onClick={() => setMode('kill')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'kill' 
                  ? 'bg-red-900/60 text-red-100 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Sword size={14} />
              擊殺時間
            </button>
            <button
              type="button"
              onClick={() => setMode('spawn')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'spawn' 
                  ? 'bg-blue-900/60 text-blue-100 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Clock size={14} />
              重生時間
            </button>
          </div>

          {/* Pass Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800 cursor-pointer" onClick={() => setIsPass(!isPass)}>
            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isPass ? 'bg-yellow-600 border-yellow-600' : 'border-zinc-600 bg-transparent'}`}>
              {isPass && <X size={14} className="text-white" />}
            </div>
            <span className="text-sm text-zinc-300 font-medium">標記為 "過" (未擊殺)</span>
          </div>

          {/* Actions */}
          <button
            type="submit"
            disabled={timeStr.length < 3} // allow 3 digits e.g. 300
            className="w-full bg-zinc-100 text-zinc-900 font-bold py-3.5 rounded-xl hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            確認修改
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditModal;