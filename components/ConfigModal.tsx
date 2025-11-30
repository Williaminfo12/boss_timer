import React, { useState } from 'react';
import { Save, AlertCircle, Database } from 'lucide-react';

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
      if (!config.apiKey) {
        throw new Error("設定檔缺少 apiKey");
      }
      if (!config.databaseURL) {
        throw new Error("設定檔缺少 databaseURL (這是 Realtime Database 必須的)");
      }
      onSave(config);
      onClose();
    } catch (e: any) {
      setError(e.message || "格式錯誤: 請確保貼上的是正確的 Firebase JSON 物件");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-zinc-800/50 border-b border-zinc-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="text-blue-500" size={20} />
            資料庫設定 (Firebase)
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-zinc-400 space-y-2">
            <p>目前使用預設的資料庫設定。若您有自己的 Firebase 專案，可在此覆蓋。</p>
            <p className="text-xs text-yellow-500">
               注意：如果出現 "Service database is not available"，請確認您已在 Firebase Console 建立了 <strong>Realtime Database</strong>。
            </p>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{ "apiKey": "...", "authDomain": "...", "databaseURL": "..." }'
            className="w-full h-40 bg-black/50 border border-zinc-700 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 p-3 rounded-lg">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;