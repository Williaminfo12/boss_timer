import React, { useEffect, useState } from 'react';
import { Timer } from '../types';
import { BOSS_DATA } from '../constants';
import { Trash2, Clock, CheckCircle2, SearchX, Pencil } from 'lucide-react';

interface TimerListProps {
  timers: Timer[];
  onRemove: (id: string) => void;
  onEdit: (timer: Timer) => void;
  onSelect: (timer: Timer) => void;
  isFiltered?: boolean;
}

const TimerList: React.FC<TimerListProps> = ({ timers, onRemove, onEdit, onSelect, isFiltered = false }) => {
  // Trigger re-render every minute to update "time remaining" logic if needed
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
  };

  const getStatusColor = (timer: Timer) => {
    const now = Date.now();
    const diff = timer.nextSpawn - now;
    
    // Spawning within 10 minutes
    if (diff > 0 && diff < 10 * 60 * 1000) return 'text-red-400 animate-pulse';
    // Already spawned
    if (diff <= 0) return 'text-green-400';
    // Normal future spawn
    return 'text-yellow-500';
  };

  const getRowBackground = (timer: Timer) => {
      const now = Date.now();
      if (now >= timer.nextSpawn) return 'bg-zinc-800/80 border-l-2 border-l-green-500'; // Spawned
      const diff = timer.nextSpawn - now;
      if (diff < 10 * 60 * 1000) return 'bg-zinc-800/80 border-l-2 border-l-red-500'; // Close
      return 'bg-zinc-800/40 border-l-2 border-l-zinc-600'; // Far
  };

  const getDisplayName = (bossName: string) => {
    const boss = BOSS_DATA.find(b => b.name === bossName);
    if (boss && boss.aliases.length > 0) {
        return boss.aliases[0]; // Use the first alias (short name)
    }
    return bossName;
  };

  if (timers.length === 0) {
    if (isFiltered) {
        return (
            <div className="text-center py-20 px-4 text-zinc-500 flex flex-col items-center">
                <SearchX size={40} className="mb-4 text-zinc-700" />
                <p>找不到符合的 BOSS</p>
            </div>
        );
    }
    return (
      <div className="text-center py-20 px-4">
        <div className="bg-zinc-800/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <Clock size={32} className="text-zinc-600" />
        </div>
        <h3 className="text-lg font-bold text-zinc-300 mb-2">尚無計時</h3>
        <p className="text-zinc-500 text-sm">請輸入時間與名稱</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-36">
        <div className="grid gap-2">
          {timers.map((timer) => (
            <div 
                key={timer.id} 
                onClick={() => onSelect(timer)}
                className={`relative pl-3 pr-2 py-2 rounded-lg border border-zinc-700/50 shadow-sm flex items-center justify-between transition-all cursor-pointer hover:brightness-110 active:scale-[0.99] group ${getRowBackground(timer)}`}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`font-mono text-xl font-bold tracking-tight min-w-[3.5rem] text-center ${getStatusColor(timer)}`}>
                        {formatTime(timer.nextSpawn)}
                    </span>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-zinc-200 truncate leading-tight">
                                {getDisplayName(timer.bossName)}
                            </span>
                            {timer.note && (
                                <span className="text-xs font-bold text-yellow-500 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-700/50">
                                    {timer.note}
                                </span>
                            )}
                            {timer.isPass && (
                                <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-red-900/50 text-red-200 border border-red-800/50">
                                    過
                                </span>
                            )}
                            {Date.now() >= timer.nextSpawn && (
                                <span className="text-green-400 flex items-center">
                                    <CheckCircle2 size={14}/>
                                </span>
                            )}
                        </div>
                         <div className="text-[10px] text-zinc-500 leading-tight">
                            擊殺: {formatTime(timer.killTime)}
                         </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(timer);
                      }}
                      className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-700/50 rounded-lg transition-colors"
                      aria-label="Edit timer"
                  >
                      <Pencil size={18} />
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(timer.id);
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50 rounded-lg transition-colors"
                      aria-label="Remove timer"
                  >
                      <Trash2 size={18} />
                  </button>
                </div>
            </div>
          ))}
        </div>
    </div>
  );
};

export default TimerList;