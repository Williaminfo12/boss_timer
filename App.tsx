
import React, { useState, useEffect, useMemo } from 'react';
import { Timer, InputMode } from './types';
import { BOSS_DATA, APP_TITLE, FIREBASE_CONFIG } from './constants';
import { parseCommandWithGemini } from './services/geminiService';
import InputBar from './components/InputBar';
import TimerList from './components/TimerList';
import FixedBossList from './components/FixedBossList';
import EditModal from './components/EditModal';
import ActionMenu from './components/ActionMenu';
import ConfigModal from './components/ConfigModal';
import { useMultiplayerTimers } from './hooks/useMultiplayerTimers';
import { Copy, AlertTriangle, Search, ArrowUpDown, Database, Wifi, Settings, Wrench, LifeBuoy, Download } from 'lucide-react';

type SortOption = 'nextSpawn' | 'name' | 'killTime';

const App: React.FC = () => {
  const [localRoomName, setLocalRoomName] = useState(() => localStorage.getItem('lm_room_id') || 'main');
  const [activeRoomName, setActiveRoomName] = useState(() => localStorage.getItem('lm_room_id') || 'main');

  const { 
      timers, 
      localCache, 
      addTimer, 
      removeTimer, 
      updateTimer, 
      replaceAllTimers, 
      connected, 
      isConfigured, 
      saveConfig 
  } = useMultiplayerTimers(activeRoomName);

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

  // Automatic lost check
  useEffect(() => {
    if (!connected || timers.length === 0) return;
    const intervalId = setInterval(() => {
        const now = Date.now();
        const threshold = 30 * 60 * 1000;
        timers.forEach(timer => {
            if (now > timer.nextSpawn + threshold) {
                const bossData = BOSS_DATA.find(b => b.name === timer.bossName);
                if (bossData) {
                    const respawnMs = bossData.respawnHours * 60 * 60 * 1000;
                    let newNextSpawn = timer.nextSpawn;
                    while (newNextSpawn + threshold < now) { newNextSpawn += respawnMs; }
                    if (newNextSpawn !== timer.nextSpawn) {
                        updateTimer({ ...timer, nextSpawn: newNextSpawn, note: '遺失', isPass: true });
                    }
                }
            }
        });
    }, 5000);
    return () => clearInterval(intervalId);
  }, [timers, connected, updateTimer]);

  const handleRestoreFromCache = () => {
      if (localCache.length > 0 && window.confirm(`發現本地備份 (${localCache.length} 筆資料)，是否要還原至目前 Room?`)) {
          replaceAllTimers(localCache);
      }
  };

  const handleRoomNameSubmit = () => {
    if (localRoomName.trim() !== activeRoomName) setActiveRoomName(localRoomName.trim());
  };

  const handleMaintenanceReset = () => {
    if (!window.confirm("確定要執行「維修重置」嗎？\n這將會清除目前所有計時，並設定為週三 09:00。")) return;
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 7 : day) + 3;
    const wednesday = new Date(now.setDate(diff));
    wednesday.setHours(9, 0, 0, 0);
    const resetTime = wednesday.getTime();
    const newTimers: Timer[] = BOSS_DATA.map(boss => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bossName: boss.name,
        killTime: resetTime - (boss.respawnHours * 60 * 60 * 1000), 
        nextSpawn: resetTime,
        isPass: false,
        note: '維修',
        originalInput: 'Maintenance Reset'
    }));
    replaceAllTimers(newTimers);
  };

  const handleCommand = async (input: string, mode: InputMode) => {
    if (!connected) { setErrorMsg("尚未連線"); return; }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const result = await parseCommandWithGemini(input);
      if (result.error || !result.bossName || result.hour === null || result.minute === null) {
        setErrorMsg(result.error || "無法解析"); return;
      }
      const boss = BOSS_DATA.find(b => b.name === result.bossName);
      if (!boss) return;
      const now = new Date();
      let inputDate = new Date();
      inputDate.setHours(result.hour, result.minute, 0, 0);
      let killTime, nextSpawnTime;
      if (mode === 'kill') {
          if (inputDate.getTime() > now.getTime() + 15 * 60 * 1000) inputDate.setDate(inputDate.getDate() - 1);
          killTime = inputDate.getTime();
          nextSpawnTime = killTime + boss.respawnHours * 60 * 60 * 1000;
      } else {
          if (inputDate.getTime() < now.getTime() - 15 * 60 * 1000) inputDate.setDate(inputDate.getDate() + 1);
          nextSpawnTime = inputDate.getTime();
          killTime = nextSpawnTime - boss.respawnHours * 60 * 60 * 1000;
      }
      addTimer({ id: Date.now().toString(), bossName: boss.name, killTime, nextSpawn: nextSpawnTime, isPass: result.isPass, originalInput: input });
    } catch (e) { setErrorMsg("錯誤"); } finally { setIsProcessing(false); }
  };

  const copyToClipboard = () => {
    if (timers.length === 0) return;
    const listText = displayedTimers.map(t => {
      const date = new Date(t.nextSpawn);
      const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
      const boss = BOSS_DATA.find(b => b.name === t.bossName);
      const displayName = boss && boss.aliases.length > 0 ? boss.aliases[0] : t.bossName;
      return `${timeStr} ${displayName}${t.isPass ? '(過)' : ''}${t.note ? ` (${t.note})` : ''}`;
    }).join('\n');
    navigator.clipboard.writeText(listText);
    alert("已複製！");
  };

  const displayedTimers = useMemo(() => {
    let result = [...timers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => {
          const boss = BOSS_DATA.find(b => b.name === t.bossName);
          return t.bossName.toLowerCase().includes(term) || (boss?.aliases.join(' ').toLowerCase().includes(term));
      });
    }
    result.sort((a, b) => {
      if (sortBy === 'name') return a.bossName.localeCompare(b.bossName, 'zh-TW');
      if (sortBy === 'killTime') return b.killTime - a.killTime;
      return a.nextSpawn - b.nextSpawn;
    });
    return result;
  }, [timers, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="fixed top-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-yellow-600 flex items-center justify-center font-bold">M</div>
             <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white leading-none">{APP_TITLE}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-500">Room:</span>
                    <input value={localRoomName} onChange={e => setLocalRoomName(e.target.value)} onBlur={handleRoomNameSubmit} className="bg-transparent border-b border-zinc-700 text-[10px] text-zinc-300 w-16 focus:outline-none" />
                    <div className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? 'text-green-400 bg-green-900/30' : 'text-zinc-400 bg-zinc-800'}`}>
                        {connected ? '已連線' : '離線'}
                    </div>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleMaintenanceReset} className="p-2 text-zinc-400 bg-zinc-900/50 rounded-lg border border-zinc-800"><Wrench size={20} /></button>
            <button onClick={() => setShowConfig(true)} className="p-2 text-zinc-400 bg-zinc-900/50 rounded-lg border border-zinc-800"><Settings size={20} /></button>
            <button onClick={copyToClipboard} disabled={timers.length === 0} className="p-2 text-zinc-400 bg-zinc-900/50 rounded-lg border border-zinc-800"><Copy size={20} /></button>
          </div>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-3xl mx-auto">
        {errorMsg && <div className="mb-4 p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-200">{errorMsg}</div>}
        
        {/* EMERGENCY RESTORE BUTTON */}
        {timers.length === 0 && localCache.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-yellow-200">
                    <LifeBuoy className="animate-pulse" />
                    <div>
                        <p className="font-bold">發現資料消失？</p>
                        <p className="text-xs opacity-80">瀏覽器存有 {localCache.length} 筆最後同步的備份。</p>
                    </div>
                </div>
                <button onClick={handleRestoreFromCache} className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-bold">還原救回</button>
            </div>
        )}

        {timers.length > 0 && (
          <div className="flex gap-2 mb-4 sticky top-16 bg-zinc-950/95 py-2 z-30">
            <input type="text" placeholder="搜尋 BOSS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200">
                <option value="nextSpawn">重生時間</option>
                <option value="name">名稱</option>
            </select>
          </div>
        )}

        <TimerList timers={displayedTimers} onRemove={removeTimer} onEdit={setEditingTimer} onSelect={setActionMenuTimer} onKill={timer => addTimer({...timer, id: Date.now().toString(), killTime: Date.now(), nextSpawn: Date.now() + (BOSS_DATA.find(b => b.name === timer.bossName)?.respawnHours || 0) * 3600000})} onPass={timer => updateTimer({...timer, isPass: true})} />
        <FixedBossList />
      </main>

      <InputBar onSubmit={handleCommand} isProcessing={isProcessing} />

      {editingTimer && <EditModal timer={editingTimer} onClose={() => setEditingTimer(null)} onSave={(id, tStr, m, p) => {
          const boss = BOSS_DATA.find(b => b.name === editingTimer.bossName);
          if (!boss) return;
          let h = parseInt(tStr.length === 3 ? tStr[0] : tStr.substring(0, 2));
          let m_val = parseInt(tStr.length === 3 ? tStr.substring(1) : tStr.substring(2));
          let inputDate = new Date(); inputDate.setHours(h, m_val, 0, 0);
          let killTime = inputDate.getTime(), nextSpawn = killTime + boss.respawnHours * 3600000;
          updateTimer({ ...editingTimer, killTime, nextSpawn, isPass: p });
          setEditingTimer(null);
      }} />}

      {actionMenuTimer && <ActionMenu timer={actionMenuTimer} onClose={() => setActionMenuTimer(null)} onKill={t => { addTimer({...t, id: Date.now().toString(), killTime: Date.now(), nextSpawn: Date.now() + (BOSS_DATA.find(b => b.name === t.bossName)?.respawnHours || 0) * 3600000}); setActionMenuTimer(null); }} onPass={t => { updateTimer({...t, isPass: true}); setActionMenuTimer(null); }} onUnknown={t => { updateTimer({...t, note: '未知'}); setActionMenuTimer(null); }} />}

      {showConfig && <ConfigModal currentConfig={localStorage.getItem('lm_firebase_config') ? JSON.parse(localStorage.getItem('lm_firebase_config')!) : FIREBASE_CONFIG} onSave={saveConfig} onClose={() => setShowConfig(false)} />}
    </div>
  );
};

export default App;
