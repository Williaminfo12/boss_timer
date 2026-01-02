
import { useState, useEffect, useRef } from 'react';
import { Timer } from '../types';
import { FIREBASE_CONFIG } from '../constants';

declare global {
  interface Window {
    firebase: any;
  }
}

const CONFIG_STORAGE_KEY = 'lm_firebase_config';
const CACHE_PREFIX = 'lm_cache_';

export const useMultiplayerTimers = (roomName: string) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [connected, setConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [localCache, setLocalCache] = useState<Timer[]>([]);
  
  const dbRef = useRef<any>(null);

  useEffect(() => {
    const initFirebase = () => {
        if (!window.firebase) {
            setTimeout(initFirebase, 100);
            return;
        }

        const customConfigStr = localStorage.getItem(CONFIG_STORAGE_KEY);
        let configToUse = FIREBASE_CONFIG;

        if (customConfigStr) {
            try {
                const parsed = JSON.parse(customConfigStr);
                if (parsed.apiKey && parsed.databaseURL) {
                    configToUse = parsed;
                }
            } catch (e) {
                localStorage.removeItem(CONFIG_STORAGE_KEY);
            }
        }

        if (configToUse.projectId === "bosstimer-a1514") {
            configToUse = {
                ...configToUse,
                databaseURL: "https://bosstimer-a1514-default-rtdb.firebaseio.com"
            };
        }

        if (configToUse && configToUse.databaseURL) {
            setIsConfigured(true);
            try {
                if (!window.firebase.apps.length) {
                    window.firebase.initializeApp(configToUse);
                }
                dbRef.current = window.firebase.database();
                const connectedRef = dbRef.current.ref(".info/connected");
                connectedRef.on("value", (snap: any) => {
                    setConnected(snap.val() === true);
                });
            } catch (e) {
                console.error("Firebase Init Error:", e);
                setConnected(false);
            }
        }
    };
    initFirebase();
  }, []);

  // Load and update local cache
  useEffect(() => {
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    const cached = localStorage.getItem(CACHE_PREFIX + normalizedRoom);
    if (cached) {
        try {
            setLocalCache(JSON.parse(cached));
        } catch (e) {
            console.error("Cache load error", e);
        }
    }

    if (!dbRef.current || !roomName) return;

    const timersRef = dbRef.current.ref(`rooms/${normalizedRoom}/timers`);
    const handleValue = (snapshot: any) => {
      const data = snapshot.val();
      const loadedTimers = data ? (Object.values(data) as Timer[]) : [];
      setTimers(loadedTimers);
      
      // Update local cache whenever we get new data from cloud
      if (loadedTimers.length > 0) {
          localStorage.setItem(CACHE_PREFIX + normalizedRoom, JSON.stringify(loadedTimers));
          setLocalCache(loadedTimers);
      }
    };

    timersRef.on('value', handleValue);
    return () => timersRef.off('value', handleValue);
  }, [roomName, connected]);

  const sanitizeTimer = (timer: Timer) => JSON.parse(JSON.stringify(timer));

  const addTimer = (timer: Timer) => {
    if (!dbRef.current) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    const existing = timers.find(t => t.bossName === timer.bossName);
    const updates: any = {};
    if (existing) updates[`rooms/${normalizedRoom}/timers/${existing.id}`] = null;
    updates[`rooms/${normalizedRoom}/timers/${timer.id}`] = sanitizeTimer(timer);
    dbRef.current.ref().update(updates);
  };

  const removeTimer = (id: string) => {
    if (!dbRef.current) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    dbRef.current.ref(`rooms/${normalizedRoom}/timers/${id}`).remove();
  };

  const updateTimer = (timer: Timer) => {
    if (!dbRef.current) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    dbRef.current.ref(`rooms/${normalizedRoom}/timers/${timer.id}`).set(sanitizeTimer(timer));
  };

  const replaceAllTimers = (newTimers: Timer[]) => {
    if (!dbRef.current) return;
    const normalizedRoom = roomName.trim().toLowerCase() || 'main';
    const timersObj: Record<string, any> = {};
    newTimers.forEach(t => { timersObj[t.id] = sanitizeTimer(t); });
    dbRef.current.ref(`rooms/${normalizedRoom}/timers`).set(timersObj);
  };
  
  return {
    timers,
    localCache,
    addTimer,
    removeTimer,
    updateTimer,
    replaceAllTimers,
    connected,
    isConfigured,
    saveConfig: (config: any) => {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        window.location.reload();
    }
  };
};
