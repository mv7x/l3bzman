// =========================================================
// Ember & Tide - Firebase Realtime Database Network Client
// Reliable real-time 1v1 online multiplayer
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
    this.status = 'disconnected';
    this.roomId = null;
    this.playerSlot = null;
    this.role = null;
    this.playerName = localStorage.getItem('agy_user_name') || localStorage.getItem('ember_tide_player_name') || 'Player';
    this.roomRef = null;

    this.pingMs = 20;
    this.lastStateSendTime = 0;
    this.stateSequence = 0;
    this.lastRemoteSequence = 0;

    // Remote snapshots are interpolated locally instead of applying every
    // Firebase packet directly to the player's position.
    this.remoteSnapshots = [];
    this.remoteInterpolationDelay = 90;
    this.remoteUpdateTimer = null;

    // Firebase onValue can fire repeatedly for the same lastEvent and for
    // every child update of a room. These guards prevent duplicate actions.
    this.lastProcessedEventKey = null;
    this.lastGameStartKey = null;
    this.lastDisconnectKey = null;

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
    this.playerName = (name || 'Player').substring(0, 16).trim() || 'Player';
    try {
      localStorage.setItem('agy_user_name', this.playerName);
      localStorage.setItem('ember_tide_player_name', this.playerName);
    } catch (_) {}
  }

  generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  setStatus(st) {
    this.status = st;
    if (this.onStatusChange) this.onStatusChange(st);
  }

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
      p1: { name: this.playerName, role: 'ember', isReady: false, isConnected: true },
      p2: null,
      p1_state: null,
      p2_state: null,
      lastEvent: null,
      gameStartedAt: null
    };

    try {
      this.roomRef = ref(db, `et_rooms/${code}`);
      await set(this.roomRef, initialData);
      onDisconnect(ref(db, `et_rooms/${code}/p1/isConnected`)).set(false);

      this.setStatus('connected');
      this.listenToRoom(code);
      if (this.onRoomCreated) {
        this.onRoomCreated({ roomId: code, playerSlot: 'p1', role: 'ember', name: this.playerName });
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
      if (!roomSnapshot.exists()) throw new Error('Room not found. Please check the code.');

      const roomData = roomSnapshot.val();
      if (roomData.p2 && roomData.p2.isConnected && roomData.p2.name !== this.playerName) {
        throw new Error('This room is already full (2/2 players).');
      }

      this.roomId = normalizedCode;
      this.playerSlot = 'p2';
      this.role = 'tide';
      this.roomRef = ref(db, `et_rooms/${normalizedCode}`);

      const p2Data = { name: this.playerName, role: 'tide', isReady: false, isConnected: true };
      await update(this.roomRef, { p2: p2Data, lastAction: Date.now() });
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

  listenToRoom(roomId) {
    this.cleanupListeners();
    this.remoteSnapshots = [];
    this.lastRemoteSequence = 0;
    this.lastProcessedEventKey = null;
    this.lastGameStartKey = null;
    this.lastDisconnectKey = null;

    const roomRef = ref(db, `et_rooms/${roomId}`);
    const roomCallback = (snapshot) => {
      if (!snapshot.exists()) {
        if (this.onError) this.onError('Room has been closed.');
        this.leaveRoom();
        return;
      }

      const data = snapshot.val();

      // IMPORTANT: parent listeners fire for every player-state write.
      // Only launch the game once for a unique start event.
      if (data.status === 'playing' && this.onGameStart) {
        const startKey = `${data.currentLevel || 1}:${data.gameStartedAt || data.lastAction || 'playing'}`;
        if (startKey !== this.lastGameStartKey) {
          this.lastGameStartKey = startKey;
          this.onGameStart(data.currentLevel || 1, data);
        }
      }

      const partnerSlot = this.playerSlot === 'p1' ? 'p2' : 'p1';
      const partner = data[partnerSlot];
      if (partner && partner.isConnected === false && this.onPlayerDisconnected) {
        const disconnectKey = `${partnerSlot}:${partner.name || 'Partner'}:${data.lastAction || ''}`;
        if (disconnectKey !== this.lastDisconnectKey) {
          this.lastDisconnectKey = disconnectKey;
          this.onPlayerDisconnected({
            message: `${partner.name || 'Partner'} lost connection.`,
            reconnectWindow: 25
          });
        }
      } else if (!partner || partner.isConnected !== false) {
        this.lastDisconnectKey = null;
      }

      if (this.onRoomUpdated) this.onRoomUpdated(data);
    };
    onValue(roomRef, roomCallback);
    this.activeListeners.push({ ref: roomRef, callback: roomCallback });

    const remoteStateKey = this.playerSlot === 'p1' ? 'p2_state' : 'p1_state';
    const remoteSlot = this.playerSlot === 'p1' ? 'p2' : 'p1';
    const remoteStateRef = ref(db, `et_rooms/${roomId}/${remoteStateKey}`);

    const remoteCallback = (snapshot) => {
      if (!snapshot.exists()) return;
      const state = snapshot.val();
      const seq = Number(state.seq || 0);

      // Ignore stale/out-of-order snapshots. This is critical because an older
      // packet must never move the remote character back across the map.
      if (seq && seq <= this.lastRemoteSequence) return;
      if (seq) this.lastRemoteSequence = seq;

      this.remoteSnapshots.push({
        state,
        receivedAt: performance.now()
      });
      if (this.remoteSnapshots.length > 12) this.remoteSnapshots.shift();
    };
    onValue(remoteStateRef, remoteCallback);
    this.activeListeners.push({ ref: remoteStateRef, callback: remoteCallback });

    // Emit an interpolated remote snapshot at a stable cadence.
    this.remoteUpdateTimer = setInterval(() => this.flushRemoteSnapshot(remoteSlot), 33);

    const eventsRef = ref(db, `et_rooms/${roomId}/lastEvent`);
    const eventsCallback = (snapshot) => {
      if (!snapshot.exists()) return;
      const evt = snapshot.val();
      if (!evt || evt.sender === this.playerSlot) return;

      const eventKey = `${evt.sender || ''}:${evt.type || ''}:${evt.t || ''}`;
      if (eventKey === this.lastProcessedEventKey) return;
      this.lastProcessedEventKey = eventKey;

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
    };
    onValue(eventsRef, eventsCallback);
    this.activeListeners.push({ ref: eventsRef, callback: eventsCallback });
  }

  flushRemoteSnapshot(remoteSlot) {
    if (!this.onRemotePlayerState || this.remoteSnapshots.length === 0) return;

    const now = performance.now();
    const renderTime = now - this.remoteInterpolationDelay;
    const snapshots = this.remoteSnapshots;

    let a = snapshots[0];
    let b = snapshots[snapshots.length - 1];

    for (let i = 0; i < snapshots.length - 1; i++) {
      if (snapshots[i].receivedAt <= renderTime && renderTime <= snapshots[i + 1].receivedAt) {
        a = snapshots[i];
        b = snapshots[i + 1];
        break;
      }
    }

    let result;
    const ax = Number(a.state.x) || 0;
    const ay = Number(a.state.y) || 0;
    const bx = Number(b.state.x) || ax;
    const by = Number(b.state.y) || ay;
    const span = b.receivedAt - a.receivedAt;

    if (a !== b && span > 0) {
      const t = Math.max(0, Math.min(1, (renderTime - a.receivedAt) / span));
      result = this.interpolateState(a.state, b.state, t);
    } else {
      // Small bounded extrapolation during a short packet gap.
      const age = Math.max(0, Math.min(90, now - b.receivedAt));
      result = { ...b.state };
      result.x = bx + (Number(b.state.vx) || 0) * age / 1000;
      result.y = by + (Number(b.state.vy) || 0) * age / 1000;
    }

    this.onRemotePlayerState(remoteSlot, result);
  }

  interpolateState(a, b, t) {
    const lerp = (x, y) => x + (y - x) * t;
    return {
      ...b,
      x: lerp(Number(a.x) || 0, Number(b.x) || 0),
      y: lerp(Number(a.y) || 0, Number(b.y) || 0),
      vx: lerp(Number(a.vx) || 0, Number(b.vx) || 0),
      vy: lerp(Number(a.vy) || 0, Number(b.vy) || 0),
      scaleX: lerp(Number(a.scaleX) || 1, Number(b.scaleX) || 1),
      scaleY: lerp(Number(a.scaleY) || 1, Number(b.scaleY) || 1)
    };
  }

  cleanupListeners() {
    this.activeListeners.forEach(item => {
      try { off(item.ref, 'value', item.callback); } catch (_) {}
    });
    this.activeListeners = [];
    if (this.remoteUpdateTimer) {
      clearInterval(this.remoteUpdateTimer);
      this.remoteUpdateTimer = null;
    }
  }

  async setReady(isReady) {
    if (!this.roomId || !this.playerSlot) return;
    try {
      await update(ref(db, `et_rooms/${this.roomId}/${this.playerSlot}`), { isReady: !!isReady });
      const snap = await get(ref(db, `et_rooms/${this.roomId}`));
      if (snap.exists()) {
        const d = snap.val();
        if (d.p1?.isReady && d.p2?.isReady && d.status !== 'playing') {
          await update(ref(db, `et_rooms/${this.roomId}`), {
            status: 'playing',
            gameStartedAt: Date.now(),
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
      await update(ref(db, `et_rooms/${this.roomId}`), { currentLevel: Number(levelId), lastAction: Date.now() });
    } catch (e) {
      console.warn('Failed to update level:', e);
    }
  }

  sendPlayerState(player) {
    if (!this.roomId || !this.playerSlot) return;
    const now = Date.now();
    if (now - this.lastStateSendTime < 33) return;
    this.lastStateSendTime = now;
    this.stateSequence++;

    const stateKey = this.playerSlot === 'p1' ? 'p1_state' : 'p2_state';
    const state = {
      x: Math.round(player.x * 10) / 10,
      y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx),
      vy: Math.round(player.vy),
      facing: player.facing,
      scaleX: Math.round(player.scaleX * 100) / 100,
      scaleY: Math.round(player.scaleY * 100) / 100,
      isGrounded: !!player.isGrounded,
      isDead: !!player.isDead,
      isVictory: !!player.isVictory,
      animTime: Math.round(player.animTime * 10) / 10,
      seq: this.stateSequence,
      t: now
    };

    set(ref(db, `et_rooms/${this.roomId}/${stateKey}`), state).catch(() => {});
  }

  sendEvent(payload) {
    if (!this.roomId) return;
    set(ref(db, `et_rooms/${this.roomId}/lastEvent`), {
      ...payload,
      sender: this.playerSlot,
      t: Date.now()
    }).catch(() => {});
  }

  sendPuzzleAction(action, data) { this.sendEvent({ type: 'puzzle_action', action, data }); }
  sendShardCollected(shardIndex, shardType) { this.sendEvent({ type: 'collect_shard', shardIndex, shardType }); }
  sendCheckpointReached(checkpointId, x, y) { this.sendEvent({ type: 'checkpoint_sync', checkpointId, x, y }); }
  sendPlayerDied(playerType, cause) { this.sendEvent({ type: 'player_died', playerType, cause }); }
  sendRestartRequest(levelId) { this.sendEvent({ type: 'restart_level', levelId }); }
  sendLevelComplete(data) { this.sendEvent({ type: 'complete_level', ...data }); }

  async leaveRoom() {
    if (this.roomId && this.playerSlot) {
      try {
        if (this.playerSlot === 'p1') {
          remove(ref(db, `et_rooms/${this.roomId}`)).catch(() => {});
        } else {
          update(ref(db, `et_rooms/${this.roomId}`), { p2: null, lastAction: Date.now() }).catch(() => {});
        }
      } catch (_) {}
    }

    this.cleanupListeners();
    this.roomId = null;
    this.playerSlot = null;
    this.role = null;
    this.setStatus('disconnected');
  }
}
