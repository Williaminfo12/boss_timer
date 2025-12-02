import React, { useState, useEffect } from 'react';
import { FIXED_BOSS_DATA } from '../constants';
import { FixedBoss } from '../types';
import { CalendarClock, MapPin } from 'lucide-react';

const FixedBossList: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const getNextSpawn = (boss: FixedBoss) => {
    const currentDay = now.getDay(); // 0-6
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Check if boss spawns today
    if (boss.days && !boss.days.includes(currentDay)) {
        return { text: '非重生異', isToday: false };
    }

    // Sort times
    const times = boss.spawnTimes.map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }).sort((a, b) => a - b);

    // Find next time today
    const nextTime = times.find(t => t > currentTime);

    if (nextTime !== undefined) {
        const h = Math.floor(nextTime / 60).toString().padStart(2, '0');
        const m = (nextTime % 60).toString().padStart(2, '0');
        const diff = nextTime - currentTime;
        
        let color = 'text-zinc-400';
        if (diff <= 10) color = 'text-red-400 animate-pulse font-bold';
        else if (diff <= 30) color = 'text-yellow-400 font-bold';

        return { text: `${h}:${m}`, isToday: true, color };
    } else {
        // If no more times today, show first time tomorrow
        // (Simplified logic: assumes valid days exist)
        const firstTime = times[0];
        const h = Math.floor(firstTime / 60).toString().padStart(2, '0');
        const m = (firstTime % 60).toString().padStart(2, '0');
        return { text: `${h}:${m} (明日)`, isToday: false, color: 'text-zinc-500' };
    }
  };

  return (
    <div className="mt-8 border-t border-zinc-800 pt-6 pb-20">
      <div className="flex items-center gap-2 mb-4 px-1">
        <CalendarClock className="text-purple-400" size={20} />
        <h2 className="text-lg font-bold text-zinc-200">固定重生 BOSS</h2>
      </div>

      <div className="grid gap-2">
        {FIXED_BOSS_DATA.map((boss, idx) => {
            const next = getNextSpawn(boss);
            return (
                <div key={idx} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-300">{boss.name}</span>
                            {boss.location && (
                                <span className="text-xs text-zinc-500 flex items-center gap-0.5">
                                    <MapPin size={10} />
                                    {boss.location}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                            {boss.description}
                        </div>
                    </div>
                    <div className={`font-mono text-lg ${next.color || 'text-zinc-400'}`}>
                        {next.text}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default FixedBossList;