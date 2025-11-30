import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Timer } from '../types';

export const useMultiplayerTimers = (roomName: string) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [peers, setPeers] = useState(0);
  const [synced, setSynced] = useState(false);
  
  // Refs to keep instances stable across renders
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    // 1. Cleanup previous connection if room changes
    if (providerRef.current) providerRef.current.destroy();
    if (persistenceRef.current) persistenceRef.current.destroy();
    if (ydocRef.current) ydocRef.current.destroy();

    // 2. Initialize Y.Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // 3. Connect to WebRTC (Public signaling servers for discovery)
    // We add a prefix to avoid collisions with other demos
    const fullRoomName = `lineage-m-timer-v1-${roomName}`;
    const provider = new WebrtcProvider(fullRoomName, ydoc, {
        // Use public signaling servers. In a production app, you'd host your own.
        signaling: [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com'
        ]
    });
    providerRef.current = provider;

    // 4. Connect to IndexedDB for offline persistence
    const persistence = new IndexeddbPersistence(fullRoomName, ydoc);
    persistenceRef.current = persistence;

    const yArray = ydoc.getArray<Timer>('timers');

    // 5. Handle updates
    const handleSync = () => {
       setTimers(yArray.toArray());
    };

    // Observer: fires whenever the shared array changes (from anyone)
    yArray.observe(handleSync);
    
    // Persistence Loaded: fires when data is loaded from local IDB
    persistence.on('synced', () => {
        setSynced(true);
        handleSync(); 
    });

    // Peer tracking: update count of connected users
    provider.on('peers', ({ webrtcPeers }: any) => {
        setPeers(webrtcPeers.size);
    });

    return () => {
        provider.destroy();
        persistence.destroy();
        ydoc.destroy();
    };
  }, [roomName]);

  // Actions
  const addTimer = (timer: Timer) => {
      if (!ydocRef.current) return;
      const yArray = ydocRef.current.getArray<Timer>('timers');
      
      ydocRef.current.transact(() => {
          // Remove existing timer for this boss (overwrite behavior)
          const current = yArray.toArray();
          let index = -1;
          for(let i=0; i<current.length; i++) {
              if (current[i].bossName === timer.bossName) {
                  index = i;
                  break;
              }
          }
          if (index !== -1) {
              yArray.delete(index, 1);
          }
          yArray.push([timer]);
      });
  };

  const removeTimer = (id: string) => {
       if (!ydocRef.current) return;
       const yArray = ydocRef.current.getArray<Timer>('timers');
       ydocRef.current.transact(() => {
          const current = yArray.toArray();
          let index = -1;
          for(let i=0; i<current.length; i++) {
              if (current[i].id === id) {
                  index = i;
                  break;
              }
          }
          if (index !== -1) {
              yArray.delete(index, 1);
          }
       });
  };

  const updateTimer = (timer: Timer) => {
      // Logic is same as add (replace by boss name/ID)
      // Since our addTimer logic finds by BossName, we might need to be careful if we change names
      // But boss names are constant keys here.
      addTimer(timer);
  };
  
  return {
      timers,
      addTimer,
      removeTimer,
      updateTimer,
      peers,
      synced
  };
};