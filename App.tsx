import React, { useState, useEffect, useMemo } from 'react';
import { Timer, InputMode } from './types';
import { BOSS_DATA, APP_TITLE } from './constants';
import { parseCommandWithGemini } from './services/geminiService';
import InputBar from './components/InputBar';
import TimerList from './components/TimerList';
import EditModal from './components/EditModal';
import { useMultiplayerTimers } from './hooks/useMultiplayerTimers';
import { Copy, AlertTriangle, Search, ArrowUpDown, Users, Wifi } from 'lucide-react';

type SortOption = 'nextSpawn' | 'name' | 'killTime';

const App: React.FC = () => {
  // Multiplayer State
  const [roomName, setRoomName] = useState(() => localStorage.getItem('lm_room_id') || 'main');
  const { timers, addTimer, removeTimer, updateTimer, peers, synced } = useMultiplayerTimers(roomName);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Sorting and Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('nextSpawn');

  // Edit State
  const [editingTimer, setEditingTimer] = useState<Timer | null>(null);

  // Persist Room Name preference
  useEffect(() => {
    localStorage.setItem('lm_room_id', roomName);
  }, [roomName]);

  const calculateTimes = (bossRespawnHours: number, hour: number, minute: number, mode: InputMode) => {
    const now = new Date();
    let inputDate = new Date();
    inputDate.setHours(hour, minute, 0, 0);
    
    let killTime: number;
    let nextSpawnTime: number;

    if (mode === 'kill') {
      // Mode 1: Kill Time Input
      // If input > now + 15m, assume yesterday
      if (inputDate.getTime() > now.getTime() + 15 * 60 * 1000) {
          inputDate.setDate(inputDate.getDate() - 1);
      }
      killTime = inputDate.getTime();
      nextSpawnTime = killTime + bossRespawnHours * 60 * 60 * 1000;

    } else {
      // Mode 2: Respawn Time Input (Manual Override)
      // If input < now - 15m, assume tomorrow
      if (inputDate.getTime() < now.getTime() - 15 * 60 * 1000) {
          inputDate.setDate(inputDate.getDate() + 1);
      }
      nextSpawnTime = inputDate.getTime();
      // Back-calculate kill time
      killTime = nextSpawnTime - bossRespawnHours * 60 * 60 * 1000;
    }

    return { killTime, nextSpawnTime };
  };

  const handleCommand = async (input: string, mode: InputMode) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Parse with Gemini
      const result = await parseCommandWithGemini(input);

      if (result.error || !result.bossName || result.hour === null || result.minute === null) {
        setErrorMsg(result.error || "無法解析指令");
        setIsProcessing(false);
        return;
      }

      // 2. Find Boss Data
      const boss = BOSS_DATA.find(b => b.name === result.bossName);
      if (!boss) {
        setErrorMsg(`找不到 Boss: ${result.bossName}`);
        setIsProcessing(false);
        return;
      }

      // 3. Calculate Timestamps
      const { killTime, nextSpawnTime } = calculateTimes(boss.respawnHours, result.hour, result.minute, mode);

      const newTimer: Timer = {
        id: Date.now().toString(),
        bossName: boss.name,
        killTime: killTime,
        nextSpawn: nextSpawnTime,
        isPass: result.isPass,
        originalInput: input
      };

      // 4. Update List via Multiplayer Hook
      addTimer(newTimer);

    } catch (e) {
      console.error(e);
      setErrorMsg("發生未預期的錯誤");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTimer = (id: string, timeStr: string, mode: InputMode, isPass: boolean) => {
    // Basic validation for HHMM
    if (!/^\d{3,4}$/.test(timeStr)) {
        setErrorMsg("時間格式錯誤，請輸入 3-4 位數字 (例如 0300)");
        return;
    }

    const timer = timers.find(t => t.id === id);
    if (!timer) return;

    const boss = BOSS_DATA.find(b => b.name === timer.bossName);
    if (!boss) return;

    // Parse HHMM
    let hour = 0, minute = 0;
    if (timeStr.length === 3) {
        hour = parseInt(timeStr.substring(0, 1));
        minute = parseInt(timeStr.substring(1));
    } else {
        hour = parseInt(timeStr.substring(0, 2));
        minute = parseInt(timeStr.substring(2));
    }

    if (hour > 23 || minute > 59) {
        setErrorMsg("時間無效");
        return;
    }

    const { killTime, nextSpawnTime } = calculateTimes(boss.respawnHours, hour, minute, mode);

    const updatedTimer = {
        ...timer,
        killTime,
        nextSpawn: nextSpawnTime,
        isPass,
        originalInput: `(Edit) ${timeStr} ${timer.bossName}`
    };

    // Update via Multiplayer Hook
    updateTimer(updatedTimer);
  };

  const copyToClipboard = () => {
    if (timers.length === 0) return;

    const listText = displayedTimers.map(t => {
      const date = new Date(t.nextSpawn);
      const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
      const passStr = t.isPass ? '(過)' : '';
      const status = Date.now() >= t.nextSpawn ? ' [已出]' : '';
      return `${timeStr} ${t.bossName}${passStr}${status}`;
    }).join('\n');

    navigator.clipboard.writeText(listText).then(() => {
       // Optional toast
    }).catch(console.error);
    
    alert("已複製到剪貼簿！");
  };

  // Compute displayed timers
  const displayedTimers = useMemo(() => {
    let result = [...timers];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => t.bossName.toLowerCase().includes(term));
    }

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.bossName.localeCompare(b.bossName, 'zh-TW');
      } else if (sortBy === 'killTime') {
        return b.killTime - a.killTime;
      } else {
        return a.nextSpawn - b.nextSpawn;
      }
    });

    return result;
  }, [timers, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-yellow-500/30">
      <header className="fixed top-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center font-bold shadow-lg shadow-yellow-900/20">
                M
             </div>
             <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">{APP_TITLE}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-500">Room:</span>
                    <input 
                        type="text" 
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="bg-transparent border-b border-zinc-700 text-[10px] text-zinc-300 w-16 focus:outline-none focus:border-yellow-600 focus:w-24 transition-all"
                        placeholder="RoomID"
                    />
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${synced ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        <Wifi size={8} />
                        <span>{synced ? 'Sync' : 'Off'}</span>
                    </div>
                    {peers > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                            <Users size={8} />
                            <span>{peers}</span>
                        </div>
                    )}
                </div>
             </div>
          </div>
          <button 
            onClick={copyToClipboard}
            disabled={timers.length === 0}
            className="p-2 text-zinc-400 hover:text-yellow-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
            title="複製清單"
          >
            <Copy size={24} />
          </button>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-3xl mx-auto min-h-screen box-border">
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-center gap-3 text-red-200 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="shrink-0" size={20} />
            <p>{errorMsg}</p>
          </div>
        )}

        {timers.length > 0 && (
          <div className="flex gap-2 mb-4 sticky top-16 bg-zinc-950/95 py-2 z-30 -mx-1 px-1 backdrop-blur-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="搜尋 BOSS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-yellow-600 transition-colors"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-9 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-yellow-600 h-full transition-colors font-medium"
              >
                <option value="nextSpawn">重生時間</option>
                <option value="name">BOSS 名稱</option>
                <option value="killTime">擊殺時間</option>
              </select>
               <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
            </div>
          </div>
        )}

        <TimerList 
          timers={displayedTimers} 
          onRemove={removeTimer} 
          onEdit={setEditingTimer}
          isFiltered={timers.length > 0 && displayedTimers.length === 0}
        />

        {timers.length === 0 && !isProcessing && (
           <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
              <p className="text-zinc-500 mb-2">請於下方輸入時間開始</p>
              <div className="inline-flex flex-col items-start bg-black/40 p-4 rounded-lg text-sm text-zinc-400 font-mono gap-1">
                 <span>0300 東飛 (擊殺 -> 預測重生)</span>
                 <span>0600 東飛 (重生 -> 設定重生)</span>
              </div>
           </div>
        )}
      </main>

      <InputBar onSubmit={handleCommand} isProcessing={isProcessing} />

      {editingTimer && (
        <EditModal 
            timer={editingTimer} 
            onClose={() => setEditingTimer(null)} 
            onSave={handleUpdateTimer} 
        />
      )}
    </div>
  );
};

export default App;