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
  originalInput: string;
}

export interface ParsedCommand {
  bossName: string | null;
  hour: number | null;
  minute: number | null;
  isPass: boolean;
  error?: string;
}

export type InputMode = 'kill' | 'spawn';
