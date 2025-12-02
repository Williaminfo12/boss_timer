import React, { useState, useEffect, useMemo } from 'react';
import { Timer, InputMode } from './types';
import { BOSS_DATA, APP_TITLE, FIREBASE_CONFIG } from './constants';
import { parseCommandWithGemini } from './services/geminiService';
import InputBar from './components/InputBar';
import TimerList from './components/TimerList';
import FixedBossList from './components/FixedBossList'; // Import new component
import EditModal from './components/EditModal';
import ActionMenu from './components/ActionMenu';
import ConfigModal from './components/ConfigModal';
import { useMultiplayerTimers } from './hooks/useMultiplayerTimers';
import { Copy, AlertTriangle, Search, ArrowUpDown, Database, Wifi, Settings, Wrench } from 'lucide-react';

type SortOption = 'nextSpawn' | 'name' | 'killTime';

const App: React.FC = () => {
  const [localRoomName, setLocalRoomName] = useState(() => localStorage.getItem('lm_room_id') || 'main');
  const [activeRoomName, setActiveRoomName] = useState(() => localStorage.getItem('lm_room_id') || 'main');

  const { timers, addTimer, removeTimer, updateTimer, replaceAllTimers, connected, isConfigured, saveConfig } = useMultiplayerTimers(activeRoomName);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('nextSpawn');

  const [editingTimer, setEditingTimer] = useState<Timer | null>(null);
  const [actionMenuTimer, setActionMenuTimer] = useState<Timer | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    localStorage.setItem('lm_room_id', activeRoomName);
  }, [activeRoomName]);

  // --- AUTOMATIC LOST CHECK ---
  // Checks every 5 seconds if any boss is overdue by > 5 minutes
  useEffect(() => {
    if (!connected || timers.length === 0) return;

    const intervalId = setInterval(() => {
        const now = Date.now();
        const threshold = 5 * 60 * 1000; // 5 minutes tolerance

        timers.forEach(timer => {
            // If current time is past (nextSpawn + 5 mins)
            if (now > timer.nextSpawn + threshold) {
                const bossData = BOSS_DATA.find(b => b.name === timer.bossName);
                if (bossData) {
                    const respawnMs = bossData.respawnHours * 60 * 60 * 1000;
                    let newNextSpawn = timer.nextSpawn;
                    
                    // Add intervals until the spawn time is in the future
                    while (newNextSpawn + threshold < now) {
                        newNextSpawn += respawnMs;
                    }

                    // Only update if it actually changed
                    if (newNextSpawn !== timer.nextSpawn) {
                        updateTimer({
                            ...timer,
                            nextSpawn: newNextSpawn,
                            note: '遺失', // Mark as Lost
                            isPass: true
                        });
                    }
                }
            }
        });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [timers, connected, updateTimer]);

  const handleRoomNameSubmit = () => {
    if (localRoomName.trim() !== activeRoomName) {
      setActiveRoomName(localRoomName.trim());
    }
  };

  const handleRoomNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRoomNameSubmit();
      (e.target as HTMLInputElement).blur();
    }
  };

  // --- MAINTENANCE RESET LOGIC ---
  const handleMaintenanceReset = () => {
    if (!window.confirm("確定要執行「維修重置」嗎？\n\n這將會清除目前所有計時，並將所有 BOSS 的重生時間設定為本週三早上 09:00。")) {
        return;
    }

    const now = new Date();
    // Find the Wednesday of the current week
    // Day 0 (Sun) to 6 (Sat). Wednesday is 3.
    const day = now.getDay();
    const diff = now.getDate() - day + 3; // Adjust to Wednesday
    
    // If today is after Wednesday (Thu-Sat), 'diff' points to this week's Wednesday.
    // If today is before Wednesday (Sun-Tue), 'diff' points to this week's Wednesday.
    // If today is Wednesday, 'diff' is today.
    // However, if we are on Thu, Fri, Sat, usually maintenance was 'yesterday' or 'days ago'.
    // If we are on Sun, Mon, Tue, usually maintenance is 'upcoming' or we want 'last week'.
    // Assuming simple logic: "This week's Wednesday"
    
    const wednesday = new Date(now.setDate(diff));
    wednesday.setHours(9, 0, 0, 0);

    const resetTime = wednesday.getTime();
    
    const newTimers: Timer[] = BOSS_DATA.map(boss => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique IDs
        bossName: boss.name,
        // killTime = nextSpawn - respawnTime (Reverse engineered)
        killTime: resetTime - (boss.respawnHours * 60 * 60 * 1000), 
        nextSpawn: resetTime,
        isPass: false,
        note: '維修',
        originalInput: 'Maintenance Reset'
    }));

    if (replaceAllTimers) {
        replaceAllTimers(newTimers);
    } else {
        alert("請重新整理頁面以套用最新功能");
    }
  };

  const calculateTimes = (bossRespawnHours: number, hour: number, minute: number, mode: InputMode) => {
    const now = new Date();
    let inputDate = new Date();
    inputDate.setHours(hour, minute, 0, 0);
    
    let killTime: number;
    let nextSpawnTime: number;

    if (mode === 'kill') {
      if (inputDate.getTime() > now.getTime() + 15 * 60 * 1000) {
          inputDate.setDate(inputDate.getDate() - 1);
      }
      killTime = inputDate.getTime();
      nextSpawnTime = killTime + bossRespawnHours * 60 * 60 * 1000;
    } else {
      if (inputDate.getTime() < now.getTime() - 15 * 60 * 1000) {
          inputDate.setDate(inputDate.getDate() + 1);
      }
      nextSpawnTime = inputDate.getTime();
      killTime = nextSpawnTime - bossRespawnHours * 60 * 60 * 1000;
    }
    return { killTime, nextSpawnTime };
  };

  const handleCommand = async (input: string, mode: InputMode) => {
    if (!connected) {
        setErrorMsg("尚未連線至資料庫，請檢查網路或設定");
        return;
    }
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await parseCommandWithGemini(input);

      if (result.error || !result.bossName || result.hour === null || result.minute === null) {
        setErrorMsg(result.error || "無法解析指令");
        setIsProcessing(false);
        return;
      }

      const boss = BOSS_DATA.find(b => b.name === result.bossName);
      if (!boss) {
        setErrorMsg(`找不到 Boss: ${result.bossName}`);
        setIsProcessing(false);
        return;
      }

      const { killTime, nextSpawnTime } = calculateTimes(boss.respawnHours, result.hour, result.minute, mode);

      const newTimer: Timer = {
        id: Date.now().toString(),
        bossName: boss.name,
        killTime: killTime,
        nextSpawn: nextSpawnTime,
        isPass: result.isPass,
        originalInput: input
      };

      addTimer(newTimer);

    } catch (e) {
      console.error(e);
      setErrorMsg("發生未預期的錯誤");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTimer = (id: string, timeStr: string, mode: InputMode, isPass: boolean) => {
    if (!/^\d{3,4}$/.test(timeStr)) {
        setErrorMsg("時間格式錯誤，請輸入 3-4 位數字 (例如 0300)");
        return;
    }

    const timer = timers.find(t => t.id === id);
    if (!timer) return;

    const boss = BOSS_DATA.find(b => b.name === timer.bossName);
    if (!boss) return;

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
        note: undefined, 
        originalInput: `(Edit) ${timeStr} ${timer.bossName}`
    };

    updateTimer(updatedTimer);
  };

  const handleQuickKill = (timer: Timer) => {
    const boss = BOSS_DATA.find(b => b.name === timer.bossName);
    if (!boss) return;

    const now = Date.now();
    const nextSpawn = now + boss.respawnHours * 60 * 60 * 1000;

    const updated: Timer = {
        ...timer,
        killTime: now,
        nextSpawn: nextSpawn,
        isPass: false,
        note: undefined,
        originalInput: `Quick Kill`
    };
    updateTimer(updated);
    setActionMenuTimer(null);
  };

  const handleQuickPass = (timer: Timer) => {
    const boss = BOSS_DATA.find(b => b.name === timer.bossName);
    if (!boss) return;

    const intervalMs = boss.respawnHours * 60 * 60 * 1000;
    const currentSpawn = timer.nextSpawn;
    
    const updated: Timer = {
        ...timer,
        killTime: currentSpawn,
        nextSpawn: currentSpawn + intervalMs,
        isPass: true,
        note: undefined,
        originalInput: `Quick Pass`
    };
    updateTimer(updated);
    setActionMenuTimer(null);
  };

  const handleQuickUnknown = (timer: Timer) => {
    const updated: Timer = {
        ...timer,
        note: '未知',
        originalInput: `Mark Unknown`
    };
    updateTimer(updated);
    setActionMenuTimer(null);
  };

  const copyToClipboard = () => {
    if (timers.length === 0) return;

    const listText = displayedTimers.map(t => {
      const date = new Date(t.nextSpawn);
      const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
      const passStr = t.isPass ? '(過)' : '';
      const noteStr = t.note ? ` (${t.note})` : '';
      const status = Date.now() >= t.nextSpawn ? ' [已出]' : '';
      const boss = BOSS_DATA.find(b => b.name === t.bossName);
      const displayName = boss && boss.aliases.length > 0 ? boss.aliases[0] : t.bossName;
      return `${timeStr} ${displayName}${passStr}${noteStr}${status}`;
    }).join('\n');

    navigator.clipboard.writeText(listText).then(() => {
    }).catch(console.error);
    alert("已複製到剪貼簿！");
  };

  const displayedTimers = useMemo(() => {
    let result = [...timers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => {
          const boss = BOSS_DATA.find(b => b.name === t.bossName);
          const aliases = boss ? boss.aliases.join(' ') : '';
          return t.bossName.toLowerCase().includes(term) || aliases.toLowerCase().includes(term);
      });
    }
    result.sort((a, b) => {
      if (sortBy === 'name') return a.bossName.localeCompare(b.bossName, 'zh-TW');
      else if (sortBy === 'killTime') return b.killTime - a.killTime;
      else return a.nextSpawn - b.nextSpawn;
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
                        value={localRoomName}
                        onChange={(e) => setLocalRoomName(e.target.value)}
                        onBlur={handleRoomNameSubmit}
                        onKeyDown={handleRoomNameKeyDown}
                        className="bg-transparent border-b border-zinc-700 text-[10px] text-zinc-300 w-16 focus:outline-none focus:border-yellow-600 focus:w-24 transition-all font-mono"
                        placeholder="RoomID"
                    />
                    
                    <button 
                        onClick={() => window.location.reload()}
                        className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full transition-colors ${connected ? 'text-green-400 bg-green-900/30' : 'text-zinc-400 bg-zinc-800'}`}
                        title="連線狀態"
                    >
                        {connected ? <Database size={10} /> : <Wifi size={10} />}
                        <span className="font-medium">{connected ? '已連線' : '離線'}</span>
                    </button>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleMaintenanceReset}
                className="p-2 text-zinc-400 hover:text-red-400 transition-colors bg-zinc-900/50 rounded-lg border border-zinc-800"
                title="維修重置 (週三 09:00)"
            >
                <Wrench size={20} />
            </button>
            <button 
                onClick={() => setShowConfig(true)}
                className="p-2 text-zinc-400 hover:text-blue-400 transition-colors bg-zinc-900/50 rounded-lg border border-zinc-800"
                title="設定"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={copyToClipboard}
                disabled={timers.length === 0}
                className="p-2 text-zinc-400 hover:text-yellow-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors bg-zinc-900/50 rounded-lg border border-zinc-800"
                title="複製清單"
            >
                <Copy size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-3xl mx-auto min-h-screen box-border">
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-center gap-3 text-red-200 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="shrink-0" size={20} />
            <p>{errorMsg}</p>
          </div>
        )}
        
        {!isConfigured && !showConfig && (
            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl flex flex-col gap-2 text-blue-200 text-center items-center">
                <Database size={32} />
                <h3 className="font-bold text-lg">尚未設定資料庫</h3>
                <p className="text-sm opacity-80">請點擊右上角設定圖示，貼上 Firebase 設定檔以啟用多人連線功能。</p>
                <button 
                    onClick={() => setShowConfig(true)}
                    className="mt-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                    立即設定
                </button>
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
          onSelect={setActionMenuTimer}
          onKill={handleQuickKill}
          onPass={handleQuickPass}
          isFiltered={timers.length > 0 && displayedTimers.length === 0}
        />

        {timers.length === 0 && !isProcessing && isConfigured && (
           <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
              <p className="text-zinc-500 mb-2">請於下方輸入時間開始</p>
              <div className="inline-flex flex-col items-start bg-black/40 p-4 rounded-lg text-sm text-zinc-400 font-mono gap-1">
                 <span>0300 東飛 (擊殺 -> 預測重生)</span>
                 <span>0600 東飛 (重生 -> 設定重生)</span>
              </div>
           </div>
        )}

        <FixedBossList />
      </main>

      <InputBar onSubmit={handleCommand} isProcessing={isProcessing} />

      {editingTimer && (
        <EditModal 
            timer={editingTimer} 
            onClose={() => setEditingTimer(null)} 
            onSave={handleUpdateTimer} 
        />
      )}

      {actionMenuTimer && (
        <ActionMenu
            timer={actionMenuTimer}
            onClose={() => setActionMenuTimer(null)}
            onKill={handleQuickKill}
            onPass={handleQuickPass}
            onUnknown={handleQuickUnknown}
        />
      )}

      {showConfig && (
        <ConfigModal 
            currentConfig={localStorage.getItem('lm_firebase_config') ? JSON.parse(localStorage.getItem('lm_firebase_config')!) : FIREBASE_CONFIG}
            onSave={saveConfig}
            onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
};

export default App;