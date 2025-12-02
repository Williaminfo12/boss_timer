import { useState, useEffect, useRef } from 'react';
import { Timer } from '../types';
import { FIREBASE_CONFIG } from '../constants';

// Define global firebase interface
declare global {
  interface Window {
    firebase: any;
  }
}

const STORAGE_KEY = 'lm_firebase_config';

export const useMultiplayerTimers = (roomName: string) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [connected, setConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Use 'any' to bypass TS checks for the global firebase object
  const dbRef = useRef<any>(null);

  // Initialize Firebase using the global window.firebase object
  useEffect(() => {
    const initFirebase = () => {
        // Wait for Firebase script to load
        if (!window.firebase) {
            setTimeout(initFirebase, 100);
            return;
        }

        const customConfigStr = localStorage.getItem(STORAGE_KEY);
        let configToUse = FIREBASE_CONFIG;

        // Load custom config if exists
        if (customConfigStr) {
            try {
                const parsed = JSON.parse(customConfigStr);
                if (parsed.apiKey && parsed.databaseURL) {
                    configToUse = parsed;
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
            }
        }

        // Force correct database URL for your specific project
        if (configToUse.projectId === "bosstimer-a1514") {
            configToUse = {
                ...configToUse,
                databaseURL: "https://bosstimer-a1514-default-rtdb.firebaseio.com"
            };
        }

        if (configToUse && configToUse.databaseURL) {
            setIsConfigured(true);
            try {
                // Initialize App (if not already initialized)
                if (!window.firebase.apps.length) {
                    window.firebase.initializeApp(configToUse);
                } else {
                    // If config changed, delete and re-init (rare case)
                    const app = window.firebase.app();
                    if (app.options.apiKey !== configToUse.apiKey) {
                        app.delete().then(() => {
                            window.firebase.initializeApp(configToUse);
                        });
                    }
                }

                // Get Database Reference
                dbRef.current = window.firebase.database();
                
                // Monitor connection state
                const connectedRef = dbRef.current.ref(".info/connected");
                connectedRef.on("value", (snap: any) => {
                    if (snap.val() === true) {
                        setConnected(true);
                    } else {
                        setConnected(false);
                    }
                });

            } catch (e) {
                console.error("Firebase Init Error:", e);
                setConnected(false);
            }
        } else {
            console.error("Missing Database URL");
            setConnected(false);
        }
    };

    initFirebase();
  }, []);

  const saveConfig = (config: any) => {
    if (!config.databaseURL) {
      alert("錯誤：設定檔缺少 databaseURL");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setIsConfigured(true);
    window.location.reload();
  };

  // Sync Logic
  useEffect(() => {
    if (!dbRef.current || !roomName) return;

    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    const timersRef = dbRef.current.ref(`rooms/${normalizedRoom}/timers`);

    const handleValue = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const loadedTimers = Object.values(data) as Timer[];
        setTimers(loadedTimers);
      } else {
        setTimers([]);
      }
    };

    timersRef.on('value', handleValue);

    return () => {
        timersRef.off('value', handleValue);
    };
  }, [roomName, connected]); // Wait for connection

  // Helper to remove undefined keys which Firebase doesn't support
  const sanitizeTimer = (timer: Timer) => {
      return JSON.parse(JSON.stringify(timer));
  };

  // Actions
  const addTimer = (timer: Timer) => {
    if (!dbRef.current || !roomName) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    
    const existing = timers.find(t => t.bossName === timer.bossName);
    const updates: any = {};
    
    // Use multi-path update to delete old and add new atomically
    if (existing) {
        updates[`rooms/${normalizedRoom}/timers/${existing.id}`] = null;
    }
    
    const safeTimer = sanitizeTimer(timer);
    updates[`rooms/${normalizedRoom}/timers/${timer.id}`] = safeTimer;
    
    dbRef.current.ref().update(updates);
  };

  const removeTimer = (id: string) => {
    if (!dbRef.current || !roomName) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    dbRef.current.ref(`rooms/${normalizedRoom}/timers/${id}`).remove();
  };

  const updateTimer = (timer: Timer) => {
    if (!dbRef.current || !roomName) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    const safeTimer = sanitizeTimer(timer);
    dbRef.current.ref(`rooms/${normalizedRoom}/timers/${timer.id}`).set(safeTimer);
  };
  
  return {
    timers,
    addTimer,
    removeTimer,
    updateTimer,
    connected,
    isConfigured,
    saveConfig
  };
};