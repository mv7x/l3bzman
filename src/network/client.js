// =========================================================
// Ember & Tide - Firebase Realtime Database Network Client
// High-performance real-time 1v1 online multiplayer
// Uses the shared project Firebase RTDB instance (tgame-6a455)
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  off,
  onDisconnect,
  remove
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

// Shared Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDBUnS_KZ3qNiQw5HX0p-uKK9akPOnCI8",
  authDomain: "tgame-6a455.firebaseapp.com",
  databaseURL: "https://tgame-6a455-default-rtdb.firebaseio.com",
  projectId: "tgame-6a455",
  storageBucket: "tgame-6a455.firebasestorage.app",
  messagingSenderId: "480514009504",
  appId: "1:480514009504:web:af022d72d9705ee1725cc5",
  measurementId: "G-S95DWXH5NE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export class NetworkClient {
  constructor() {
    this.status = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'reconnecting'
    this.roomId = null;
    this.playerSlot = null; // 'p1' (Ember) or 'p2' (Tide)
    this.role = null; // 'ember' or 'tide'
    this.playerName = localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || 'Player';
    this.roomRef = null;
    this.p1StateRef = null;
    this.p2StateRef = null;
    this.puzzleEventsRef = null;

    this.pingMs = 20;
    this.lastStateSendTime = 0;

    // Callbacks
    this.onStatusChange = null;
    this.onPingUpdate = null;
    this.onRoomCreated = null;
    this.onRoomJoined = null;
    this.onRoomUpdated = null;
    this.onGameStart = null;
    this.onRemotePlayerState = null;
    this.onPuzzleSync = null;
    this.onShardCollected = null;
    this.onCheckpointSync = null;
    this.onPlayerDied = null;
    this.onRestartSync = null;
    this.onLevelCompleteSync = null;
    this.onPlayerDisconnected = null;
    this.onError = null;

    this.activeListeners = [];
  }

  setPlayerName(name) {
    this.playerName = (name || 'Player').substring(0, 16).trim();
    try {
      localStorage.setItem('agy_user_name', this.playerName);
      localStorage.setItem('ember_tide_player_name', this.playerName);
    } catch(e) {}
  }

  generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  setStatus(st) {
    this.status = st;
    if (this.onStatusChange) this.onStatusChange(st);
  }

  // ----------------------------------------------------
  // Room Creation & Joining
  // ----------------------------------------------------

  async createRoom(name) {
    if (name) this.setPlayerName(name);
    this.setStatus('connecting');

    const code = this.generateRoomCode();
    this.roomId = code;
    this.playerSlot = 'p1';
    this.role = 'ember';

    const initialData = {
      roomId: code,
      status: 'waiting',
      createdAt: Date.now(),
      lastAction: Date.now(),
      currentLevel: 1,
      p1: {
        name: this.playerName,
        role: 'ember',
        isReady: false,
        isConnected: true
      },
      p2: null,
      p1_state: null,
      p2_state: null,
      lastEvent: null
    };

    try {
      this.roomRef = ref(db, `et_rooms/${code}`);
      await set(this.roomRef, initialData);

      // Presence on disconnect
      onDisconnect(ref(db, `et_rooms/${code}/p1/isConnected`)).set(false);

      this.setStatus('connected');
      this.listenToRoom(code);

      if (this.onRoomCreated) {
        this.onRoomCreated({
          roomId: code,
          playerSlot: 'p1',
          role: 'ember',
          name: this.playerName
        });
      }
    } catch (err) {
      console.error('Firebase create room error:', err);
      this.setStatus('disconnected');
      if (this.onError) this.onError('Failed to create room on Firebase.');
      throw err;
    }
  }

  async joinRoom(code, name) {
    if (name) this.setPlayerName(name);
    const normalizedCode = (code || '').trim().toUpperCase();
    this.setStatus('connecting');

    try {
      const roomSnapshot = await get(ref(db, `et_rooms/${normalizedCode}`));

      if (!roomSnapshot.exists()) {
        this.setStatus('disconnected');
        const err = 'Room not found. Please check the code.';
        if (this.onError) this.onError(err);
        throw new Error(err);
      }

      const roomData = roomSnapshot.val();

      // Check if slot 2 is available
      if (roomData.p2 && roomData.p2.isConnected && roomData.p2.name !== this.playerName) {
        this.setStatus('disconnected');
        const err = 'This room is already full (2/2 players).';
        if (this.onError) this.onError(err);
        throw new Error(err);
      }

      this.roomId = normalizedCode;
      this.playerSlot = 'p2';
      this.role = 'tide';
      this.roomRef = ref(db, `et_rooms/${normalizedCode}`);

      const p2Data = {
        name: this.playerName,
        role: 'tide',
        isReady: false,
        isConnected: true
      };

      await update(ref(db, `et_rooms/${normalizedCode}`), {
        p2: p2Data,
        lastAction: Date.now()
      });

      // Presence on disconnect
      onDisconnect(ref(db, `et_rooms/${normalizedCode}/p2/isConnected`)).set(false);

      this.setStatus('connected');
      this.listenToRoom(normalizedCode);

      if (this.onRoomJoined) {
        this.onRoomJoined({
          roomId: normalizedCode,
          playerSlot: 'p2',
          role: 'tide',
          name: this.playerName,
          roomData: { ...roomData, p2: p2Data }
        });
      }
    } catch (err) {
      console.error('Firebase join room error:', err);
      this.setStatus('disconnected');
      if (this.onError) this.onError(err.message || 'Failed to join room.');
      throw err;
    }
  }

  // ----------------------------------------------------
  // Room Listeners
  // ----------------------------------------------------

  listenToRoom(roomId) {
    this.cleanupListeners();

    // 1. Main room listener (status, ready states, level)
    const roomRef = ref(db, `et_rooms/${roomId}`);
    const unsubscribeRoom = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (this.onError) this.onError('Room has been closed.');
        this.leaveRoom();
        return;
      }

      const data = snapshot.val();

      // Check if game started
      if (data.status === 'playing' && this.onGameStart) {
        this.onGameStart(data.currentLevel || 1, data);
      }

      // Check partner disconnect
      const partnerSlot = this.playerSlot === 'p1' ? 'p2' : 'p1';
      const partner = data[partnerSlot];
      if (partner && partner.isConnected === false && this.onPlayerDisconnected) {
        this.onPlayerDisconnected({
          message: `${partner.name || 'Partner'} lost connection.`,
          reconnectWindow: 25
        });
      }

      if (this.onRoomUpdated) {
        this.onRoomUpdated(data);
      }
    });
    this.activeListeners.push({ ref: roomRef, callback: unsubscribeRoom });

    // 2. Remote player state stream listener
    const remoteStateKey = this.playerSlot === 'p1' ? 'p2_state' : 'p1_state';
    const remoteSlot = this.playerSlot === 'p1' ? 'p2' : 'p1';
    const remoteStateRef = ref(db, `et_rooms/${roomId}/${remoteStateKey}`);

    const unsubscribeRemote = onValue(remoteStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.val();
        if (this.onRemotePlayerState) {
          this.onRemotePlayerState(remoteSlot, state);
        }
      }
    });
    this.activeListeners.push({ ref: remoteStateRef, callback: unsubscribeRemote });

    // 3. Shared puzzle events listener
    const eventsRef = ref(db, `et_rooms/${roomId}/lastEvent`);
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const evt = snapshot.val();
        // Ignore events sent by self
        if (evt.sender === this.playerSlot) return;

        if (evt.type === 'puzzle_action' && this.onPuzzleSync) {
          this.onPuzzleSync(evt.action, evt.data);
        } else if (evt.type === 'collect_shard' && this.onShardCollected) {
          this.onShardCollected(evt);
        } else if (evt.type === 'checkpoint_sync' && this.onCheckpointSync) {
          this.onCheckpointSync(evt);
        } else if (evt.type === 'player_died' && this.onPlayerDied) {
          this.onPlayerDied(evt);
        } else if (evt.type === 'restart_level' && this.onRestartSync) {
          this.onRestartSync(evt.levelId);
        } else if (evt.type === 'complete_level' && this.onLevelCompleteSync) {
          this.onLevelCompleteSync(evt);
        }
      }
    });
    this.activeListeners.push({ ref: eventsRef, callback: unsubscribeEvents });
  }

  cleanupListeners() {
    this.activeListeners.forEach(item => {
      try {
        off(item.ref);
      } catch (e) {}
    });
    this.activeListeners = [];
  }

  // ----------------------------------------------------
  // Outgoing Actions
  // ----------------------------------------------------

  async setReady(isReady) {
    if (!this.roomId || !this.playerSlot) return;
    try {
      await update(ref(db, `et_rooms/${this.roomId}/${this.playerSlot}`), {
        isReady: !!isReady
      });

      // Check if both ready
      const snap = await get(ref(db, `et_rooms/${this.roomId}`));
      if (snap.exists()) {
        const d = snap.val();
        if (d.p1 && d.p1.isReady && d.p2 && d.p2.isReady && d.status !== 'playing') {
          await update(ref(db, `et_rooms/${this.roomId}`), {
            status: 'playing',
            lastAction: Date.now()
          });
        }
      }
    } catch (e) {
      console.warn('Failed to set ready state:', e);
    }
  }

  async selectLevel(levelId) {
    if (!this.roomId || this.playerSlot !== 'p1') return;
    try {
      await update(ref(db, `et_rooms/${this.roomId}`), {
        currentLevel: Number(levelId)
      });
    } catch (e) {
      console.warn('Failed to update level:', e);
    }
  }

  sendPlayerState(player) {
    if (!this.roomId || !this.playerSlot) return;

    // Throttle to ~30 FPS (33ms)
    const now = Date.now();
    if (now - this.lastStateSendTime < 30) return;
    this.lastStateSendTime = now;

    const stateKey = this.playerSlot === 'p1' ? 'p1_state' : 'p2_state';
    const state = {
      x: Math.round(player.x * 10) / 10,
      y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx),
      vy: Math.round(player.vy),
      facing: player.facing,
      scaleX: Math.round(player.scaleX * 100) / 100,
      scaleY: Math.round(player.scaleY * 100) / 100,
      isGrounded: player.isGrounded,
      isDead: player.isDead,
      isVictory: player.isVictory,
      animTime: Math.round(player.animTime * 10) / 10,
      t: now
    };

    set(ref(db, `et_rooms/${this.roomId}/${stateKey}`), state).catch(() => {});
  }

  sendPuzzleAction(action, data) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      type: 'puzzle_action',
      sender: this.playerSlot,
      action,
      data,
      t: Date.now()
    }).catch(() => {});
  }

  sendShardCollected(shardIndex, shardType) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      type: 'collect_shard',
      sender: this.playerSlot,
      shardIndex,
      shardType,
      t: Date.now()
    }).catch(() => {});
  }

  sendCheckpointReached(checkpointId, x, y) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      type: 'checkpoint_sync',
      sender: this.playerSlot,
      checkpointId,
      x, y,
      t: Date.now()
    }).catch(() => {});
  }

  sendPlayerDied(playerType, cause) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      type: 'player_died',
      sender: this.playerSlot,
      playerType,
      cause,
      t: Date.now()
    }).catch(() => {});
  }

  sendRestartRequest(levelId) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      type: 'restart_level',
      sender: this.playerSlot,
      levelId,
      t: Date.now()
    }).catch(() => {});
  }

  sendLevelComplete(data) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      type: 'complete_level',
      sender: this.playerSlot,
      ...data,
      t: Date.now()
    }).catch(() => {});
  }

  async leaveRoom() {
    if (this.roomId && this.playerSlot) {
      try {
        if (this.playerSlot === 'p1') {
          // Remove room if host leaves
          remove(ref(db, `et_rooms/${this.roomId}`)).catch(() => {});
        } else {
          // Clear P2 slot
          update(ref(db, `et_rooms/${this.roomId}`), {
            p2: null,
            lastAction: Date.now()
          }).catch(() => {});
        }
      } catch (e) {}
    }

    this.cleanupListeners();
    this.roomId = null;
    this.playerSlot = null;
    this.role = null;
    this.setStatus('disconnected');
  }
}
