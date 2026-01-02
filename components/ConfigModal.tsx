
import React, { useState } from 'react';
import { Save, AlertCircle, Database, Download, Upload } from 'lucide-react';

interface ConfigModalProps {
  currentConfig: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ currentConfig, onSave, onClose }) => {
  const [jsonInput, setJsonInput] = useState(
    currentConfig ? JSON.stringify(currentConfig, null, 2) : ''
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const config = JSON.parse(jsonInput);
      if (!config.apiKey || !config.databaseURL) throw new Error("設定檔不完整");
      onSave(config);
      onClose();
    } catch (e: any) { setError(e.message || "格式錯誤"); }
  };

  const exportBackup = () => {
      const room = localStorage.getItem('lm_room_id') || 'main';
      const cache = localStorage.getItem(`lm_cache_${room}`);
      if (!cache) { alert("目前 Room 沒有可備份的資料"); return; }
      
      const blob = new Blob([cache], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LMM_Backup_${room}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-zinc-800/50 border-b border-zinc-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="text-blue-500" size={20} />
            資料庫與備份設定
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={exportBackup} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl border border-zinc-700 text-sm">
                  <Download size={16} /> 導出備份
              </button>
              <div className="relative">
                  <input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                          const content = event.target?.result as string;
                          const room = localStorage.getItem('lm_room_id') || 'main';
                          localStorage.setItem(`lm_cache_${room}`, content);
                          alert("已載入備份！請關閉此視窗並點擊主頁的「還原救回」按鈕。");
                      };
                      reader.readAsText(file);
                  }} />
                  <button className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl border border-zinc-700 text-sm">
                      <Upload size={16} /> 導入備份
                  </button>
              </div>
          </div>

          <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-4">Firebase 配置 JSON：</div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-32 bg-black/50 border border-zinc-700 rounded-xl p-3 text-xs font-mono text-zinc-300 resize-none"
          />

          {error && <div className="text-red-400 text-xs bg-red-900/20 p-3 rounded-lg">{error}</div>}

          <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
            <Save size={18} /> 儲存資料庫設定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
