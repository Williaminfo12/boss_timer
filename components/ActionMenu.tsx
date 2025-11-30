import React from 'react';
import { Timer } from '../types';
import { X, Sword, StepForward, HelpCircle } from 'lucide-react';

interface ActionMenuProps {
  timer: Timer;
  onClose: () => void;
  onKill: (timer: Timer) => void;
  onPass: (timer: Timer) => void;
  onUnknown: (timer: Timer) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ timer, onClose, onKill, onPass, onUnknown }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Menu Content */}
      <div className="relative w-full max-w-sm bg-zinc-900 border-t sm:border border-zinc-700 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-800/50 border-b border-zinc-700">
          <div>
              <h3 className="text-xl font-bold text-zinc-100">
                {timer.bossName}
              </h3>
              <p className="text-zinc-400 text-sm font-mono mt-1">
                 預計重生: {new Date(timer.nextSpawn).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
            <button
                onClick={() => onKill(timer)}
                className="w-full bg-red-600/90 hover:bg-red-500 text-white p-4 rounded-2xl flex items-center justify-between group transition-all active:scale-[0.98] shadow-lg shadow-red-900/20"
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-800/50 rounded-xl group-hover:bg-red-700/50 transition-colors">
                        <Sword size={24} />
                    </div>
                    <div className="text-left">
                        <div className="text-base font-bold">確認擊殺</div>
                        <div className="text-red-200 text-xs opacity-80">以此時間重新計算</div>
                    </div>
                </div>
                <div className="text-xl font-mono font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    NOW
                </div>
            </button>

            <button
                onClick={() => onPass(timer)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-4 rounded-2xl flex items-center justify-between group transition-all active:scale-[0.98] border border-zinc-700"
            >
                <div className="flex items-center gap-4">
                     <div className="p-2 bg-zinc-900/50 rounded-xl group-hover:bg-black/40 transition-colors">
                        <StepForward size={24} />
                    </div>
                    <div className="text-left">
                        <div className="text-base font-bold">標記為 "過"</div>
                        <div className="text-zinc-400 text-xs">本次未重生，延後一輪</div>
                    </div>
                </div>
                 <div className="text-xl font-mono font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    +1
                </div>
            </button>
            
            <button
                onClick={() => onUnknown(timer)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-4 rounded-2xl flex items-center justify-between group transition-all active:scale-[0.98] border border-zinc-700"
            >
                <div className="flex items-center gap-4">
                     <div className="p-2 bg-zinc-900/50 rounded-xl group-hover:bg-black/40 transition-colors">
                        <HelpCircle size={24} className="text-yellow-500" />
                    </div>
                    <div className="text-left">
                        <div className="text-base font-bold">備註 (未知)</div>
                        <div className="text-zinc-400 text-xs">標記為時間不確定</div>
                    </div>
                </div>
                 <div className="text-sm font-bold text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded">
                    未知
                </div>
            </button>
        </div>
        
        <div className="px-6 pb-6 text-center">
             <p className="text-[10px] text-zinc-600">
                點擊上方按鈕將會同步更新至所有連線裝置
             </p>
        </div>
      </div>
    </div>
  );
};

export default ActionMenu;