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

    // Cleanup
    if (providerRef.current) providerRef.current.destroy();
    if (persistenceRef.current) persistenceRef.current.destroy();
    if (ydocRef.current) ydocRef.current.destroy();

    // Init Y.Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Room Name: Trim and ensure consistency
    const fullRoomName = `lineage-m-timer-production-v2-${roomName.trim()}`;
    
    // WebRTC Provider
    const provider = new WebrtcProvider(fullRoomName, ydoc, {
        // Only use the most reliable public signaling servers
        signaling: [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com'
        ],
        password: null, 
        maxConns: 20 + Math.floor(Math.random() * 15),
        filterBcConns: false,
        peerOpts: {
            config: {
                // GOOGLE STUN IS KING. Others often fail or timeout.
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ]
            }
        }
    });
    providerRef.current = provider;

    // IndexedDB Persistence
    const persistence = new IndexeddbPersistence(fullRoomName, ydoc);
    persistenceRef.current = persistence;

    const yArray = ydoc.getArray<Timer>('timers');

    // Sync Handlers
    const handleSync = () => {
       setTimers(yArray.toArray());
    };

    yArray.observe(handleSync);
    
    persistence.on('synced', () => {
        setSynced(true);
        handleSync(); 
    });

    // Connection Status Events
    provider.on('peers', ({ webrtcPeers }: any) => {
        setPeers(webrtcPeers.size);
    });

    // Monitor Signaling Connection
    provider.on('status', (event: { connected: boolean }) => {
        setConnected(event.connected);
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
      connected // Expose connection status
  };
};