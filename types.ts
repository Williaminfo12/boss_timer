export interface Boss {
  name: string;
  respawnHours: number;
  aliases: string[];
}

export interface Timer {
  id: string;
  bossName: string;
  killTime: number; // Timestamp of the kill/check
  nextSpawn: number; // Timestamp of the next spawn
  isPass: boolean; // If true, marked as "過"
  note?: string; // New field for notes like "未知"
  originalInput: string;
}

export interface ParsedCommand {
  bossName: string | null;
  hour: number | null;
  minute: number | null;
  isPass: boolean;
  error?: string;
}

export interface FixedBoss {
  name: string;
  location?: string;
  spawnTimes: string[]; // e.g., ["06:00", "12:00"]
  days?: number[]; // 0=Sun, 1=Mon... undefined = everyday
  description?: string;
}

export type InputMode = 'kill' | 'spawn';