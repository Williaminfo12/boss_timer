import { Boss, FixedBoss } from './types';

export const BOSS_DATA: Boss[] = [
  { name: '不死鳥', respawnHours: 8, aliases: [] },
  { name: '伊弗利特', respawnHours: 2, aliases: ['伊佛', 'EF', 'ef'] },
  { name: '大黑長者', respawnHours: 3, aliases: ['大黑'] },
  { name: '暗黑長者', respawnHours: 6, aliases: [] },
  { name: '巨大飛龍', respawnHours: 6, aliases: ['巨飛'] },
  { name: '861左飛龍', respawnHours: 2, aliases: ['西左', '左飛'] },
  { name: '862右飛龍', respawnHours: 2, aliases: ['西右', '右飛'] },
  { name: '83飛龍', respawnHours: 3, aliases: ['中飛'] },
  { name: '85飛龍', respawnHours: 3, aliases: ['東飛'] },
  { name: '變形怪首領', respawnHours: 3.5, aliases: ['變怪'] },
  { name: '強盜頭目', respawnHours: 3, aliases: ['強盜'] },
  { name: '綠王', respawnHours: 2, aliases: [] },
  { name: '紅王', respawnHours: 2, aliases: [] },
  { name: '四色', respawnHours: 2, aliases: [] },
  { name: '魔法師', respawnHours: 2, aliases: [] },
  { name: '死亡騎士', respawnHours: 4, aliases: ['死騎'] },
  { name: '力卡溫', respawnHours: 8, aliases: ['狼王'] },
  { name: '克特', respawnHours: 10, aliases: [] },
  { name: '古代巨人', respawnHours: 8.5, aliases: ['古巨'] },
  { name: '惡魔監視者', respawnHours: 6, aliases: [] },
  { name: '曼波兔王', respawnHours: 3, aliases: [] },
  { name: '暗黑大將軍貝里斯', respawnHours: 6, aliases: [] },
  { name: '賽尼斯的分身', respawnHours: 3, aliases: ['賽老師'] },
  { name: '卡司特王', respawnHours: 7.5, aliases: ['卡王'] },
  { name: '樹精', respawnHours: 3, aliases: [] },
  { name: '烏勒庫斯', respawnHours: 6, aliases: ['烏王'] },
  { name: '奈克諾斯', respawnHours: 4, aliases: ['奈王'] },
  { name: '蜘蛛', respawnHours: 4, aliases: [] },
  { name: '巨大鱷魚', respawnHours: 3, aliases: ['巨鱷'] },
  { name: '大腳瑪幽', respawnHours: 3, aliases: ['大腳'] },
  { name: '巨大守護螞蟻', respawnHours: 3.5, aliases: ['螞蟻'] },
  { name: '巨型蠕蟲(海底)', respawnHours: 2, aliases: ['海蟲'] },
];

export const FIXED_BOSS_DATA: FixedBoss[] = [
  { 
    name: '奇岩1樓', 
    location: '奇岩地監',
    spawnTimes: ['06:00', '12:00', '18:00', '00:00'], 
    days: [1, 2, 3, 4, 5], // Mon-Fri
    description: '週一至週五' 
  },
  { 
    name: '奇岩2樓', 
    location: '奇岩地監',
    spawnTimes: ['07:00', '14:00', '21:00'], 
    days: [1, 2, 3, 4, 5], 
    description: '週一至週五' 
  },
  { 
    name: '奇岩3樓', 
    location: '奇岩地監',
    spawnTimes: ['20:15'], 
    days: [1, 2, 3, 4, 5], 
    description: '週一至週五' 
  },
  { 
    name: '奇岩4樓', 
    location: '奇岩地監',
    spawnTimes: ['21:15'], 
    days: [1, 2, 3, 4, 5], 
    description: '週一至週五' 
  },
  { 
    name: '魔法師', 
    spawnTimes: ['01:00', '03:00', '05:00', '07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'], 
    description: '每天單數小時' 
  },
  { 
    name: '巴風特', 
    location: '冒險洞穴',
    spawnTimes: ['14:00', '20:00'], 
    description: '14:00~14:30 / 20:00~20:30 (間隔6H)' 
  },
  { 
    name: '暗黑地監4F王(週日)', 
    spawnTimes: ['18:00'], 
    days: [0], // Sunday
    description: '週日限定' 
  },
  { 
    name: '惡魔', 
    location: '象牙塔',
    spawnTimes: ['22:00'], 
    description: '每天' 
  },
  { 
    name: '古代兵器復仇者', 
    spawnTimes: ['22:30'], 
    description: '每天' 
  },
  { 
    name: '異界的惡魔', 
    spawnTimes: ['23:00'], 
    description: '每天' 
  },
  { 
    name: '烈焰的死亡騎士', 
    spawnTimes: ['23:30'], 
    description: '每天' 
  },
  { 
    name: '暗黑地監4F王(夜)', 
    spawnTimes: ['00:00'], 
    description: '每天' 
  },
];

export const APP_TITLE = "天堂M BOSS 計時器";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBG1Xtfo-gXAaaq-veWA7bjG4FtyBRNq2M",
  authDomain: "bosstimer-a1514.firebaseapp.com",
  databaseURL: "https://bosstimer-a1514-default-rtdb.firebaseio.com",
  projectId: "bosstimer-a1514",
  storageBucket: "bosstimer-a1514.firebasestorage.app",
  messagingSenderId: "9859647388",
  appId: "1:9859647388:web:45defbb9e358038a4baa59",
  measurementId: "G-9N8G46ZY7S"
};