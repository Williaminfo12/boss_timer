import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Timer } from '../types';

export const useMultiplayerTimers = (roomName: string) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [peers, setPeers] = useState(0);
  const [synced, setSynced] = useState(false); // Local storage synced
  const [connected, setConnected] = useState(false); // Signaling server connected
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!roomName) return;

    // Cleanup previous instance
    if (providerRef.current) providerRef.current.destroy();
    if (persistenceRef.current) persistenceRef.current.destroy();
    if (ydocRef.current) ydocRef.current.destroy();

    // Init Y.Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Connect to WebRTC
    // Using a specific prefix to avoid public collision
    const fullRoomName = `lineage-m-timer-production-v2-${roomName.trim()}`;
    
    // Note: We rely on WebrtcProvider to create its own Awareness instance internally
    // to avoid "Y.Awareness is not a constructor" errors with esm.sh imports.
    const provider = new WebrtcProvider(fullRoomName, ydoc, {
        // Signaling servers - prioritized order
        signaling: [
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com',
            'wss://signaling.yjs.dev'
        ],
        password: null, 
        filterBcConns: false, // Enable cross-tab communication
        peerOpts: {
            config: {
                // STUN servers for NAT traversal (Mobile <-> Desktop)
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        }
    });
    providerRef.current = provider;

    // Persistence (Offline Support)
    const persistence = new IndexeddbPersistence(fullRoomName, ydoc);
    persistenceRef.current = persistence;

    const yArray = ydoc.getArray<Timer>('timers');

    // Handlers
    const handleSync = () => {
       setTimers(yArray.toArray());
    };

    yArray.observe(handleSync);
    
    persistence.on('synced', () => {
        setSynced(true);
        handleSync(); 
    });

    provider.on('peers', ({ webrtcPeers }: any) => {
        setPeers(webrtcPeers.size);
    });

    provider.on('status', (event: { connected: boolean }) => {
        setConnected(event.connected);
    });

    return () => {
        provider.destroy();
        persistence.destroy();
        ydoc.destroy();
    };
  }, [roomName]);

  const addTimer = (timer: Timer) => {
      if (!ydocRef.current) return;
      const yArray = ydocRef.current.getArray<Timer>('timers');
      
      ydocRef.current.transact(() => {
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
      addTimer(timer);
  };
  
  return {
      timers,
      addTimer,
      removeTimer,
      updateTimer,
      peers,
      synced,
      connected
  };
};