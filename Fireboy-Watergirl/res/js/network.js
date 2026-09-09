import { Player } from "./player.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    set,
    update,
    onValue,
    onDisconnect,
    remove,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCDBUnS_KZ3qNiQw5HX0p-uKK9akPOnCI8",
    authDomain: "tgame-6a455.firebaseapp.com",
    databaseURL: "https://tgame-6a455-default-rtdb.firebaseio.com",
    projectId: "tgame-6a455",
    storageBucket: "tgame-6a455.firebasestorage.app",
    messagingSenderId: "480514009504",
    appId: "1:480514009504:web:af022d72d9705ee1725cc5",
};

const app = initializeApp(firebaseConfig, "fireboyWatergirlOnline");
const db = getDatabase(app);

let roomCode = null;
let role = null;
let username = null;
let roomRef = null;
let remotePlayers = {};
let lastSentAt = 0;
let roomListener = null;

const ROLE_TO_PLAYER = {
    host: "fire",
    guest: "water",
};

function playerKey(element) {
    return element === "fire" ? "fireboy" : "watergirl";
}

function sanitizeName(value) {
    return String(value || "Player").trim().slice(0, 24) || "Player";
}

function normalizeRoomCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 6);
}

function generateRoomCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

async function createRoom(playerName) {
    username = sanitizeName(playerName);

    for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateRoomCode();
        const candidate = ref(db, `fireboyWatergirlRooms/${code}`);
        const snapshot = await get(candidate);
        if (snapshot.exists()) continue;

        roomCode = code;
        role = "host";
        roomRef = candidate;

        await set(roomRef, {
            status: "waiting",
            level: 1,
            createdAt: Date.now(),
            host: { name: username, connected: true },
            guest: null,
            players: {},
        });

        onDisconnect(roomRef).remove();
        return code;
    }

    throw new Error("Could not create a room. Please try again.");
}

async function joinRoom(code, playerName) {
    const cleanCode = normalizeRoomCode(code);
    username = sanitizeName(playerName);

    if (cleanCode.length < 4) throw new Error("Enter a valid room code.");

    const candidate = ref(db, `fireboyWatergirlRooms/${cleanCode}`);
    const snapshot = await get(candidate);
    if (!snapshot.exists()) throw new Error("Room not found.");

    const room = snapshot.val();
    if (room.guest) throw new Error("This room is already full.");
    if (room.status !== "waiting") throw new Error("This game has already started.");

    roomCode = cleanCode;
    role = "guest";
    roomRef = candidate;

    await update(roomRef, {
        guest: { name: username, connected: true },
    });

    onDisconnect(ref(db, `fireboyWatergirlRooms/${roomCode}/guest`)).remove();
    return roomCode;
}

function watchRoom(callback) {
    if (!roomRef) throw new Error("No room selected.");
    if (roomListener) roomListener();

    roomListener = onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback({ status: "closed" });
            return;
        }

        const room = snapshot.val() || {};
        remotePlayers = room.players || {};
        callback(room);
    });

    return roomListener;
}

async function startRoom(level = 1) {
    if (!roomRef || role !== "host") return;
    await update(roomRef, {
        status: "playing",
        level: Number(level) || 1,
        startedAt: Date.now(),
    });
}

function publishPlayerState(player) {
    if (!roomRef || !role || !player) return;

    const now = performance.now();
    if (now - lastSentAt < 65) return;
    lastSentAt = now;

    const key = playerKey(player.element);
    const state = {
        x: Number(player.position.x) || 0,
        y: Number(player.position.y) || 0,
        vx: Number(player.velocity.x) || 0,
        vy: Number(player.velocity.y) || 0,
        animation: player.currentAnimation || "idle",
        died: !!player.died,
        at: Date.now(),
    };

    update(ref(db, `fireboyWatergirlRooms/${roomCode}/players/${key}`), state).catch(() => {});
}

function getRemoteState(element) {
    const key = playerKey(element);
    return remotePlayers[key] || null;
}

function isLocalPlayer(element) {
    return ROLE_TO_PLAYER[role] === element;
}

function patchPlayerNetworking() {
    if (Player.prototype.__onlinePatched) return;
    Player.prototype.__onlinePatched = true;

    const originalUpdate = Player.prototype.update;

    Player.prototype.update = function onlineUpdate() {
        if (!roomRef || !role) {
            originalUpdate.call(this);
            return;
        }

        if (!isLocalPlayer(this.element)) {
            const state = getRemoteState(this.element);
            if (state) {
                this.position.x = Number(state.x) || this.position.x;
                this.position.y = Number(state.y) || this.position.y;
                this.velocity.x = Number(state.vx) || 0;
                this.velocity.y = Number(state.vy) || 0;
                this.died = !!state.died;
                if (state.animation && this.animations[state.animation]) {
                    this.changeSprite(state.animation);
                }
                this.hitboxPositionCalc();
                this.legs.position = {
                    x: this.position.x + 37,
                    y: this.position.y + 72,
                };
            }
            return;
        }

        originalUpdate.call(this);
        publishPlayerState(this);
    };
}

function getRoomInfo() {
    return { roomCode, role, username };
}

async function leaveRoom() {
    if (!roomRef) return;
    try {
        if (role === "host") {
            await remove(roomRef);
        } else {
            await remove(ref(db, `fireboyWatergirlRooms/${roomCode}/guest`));
        }
    } finally {
        if (roomListener) roomListener();
        roomListener = null;
        roomCode = null;
        role = null;
        username = null;
        roomRef = null;
        remotePlayers = {};
    }
}

function getInviteUrl() {
    if (!roomCode) return window.location.href;
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomCode);
    return url.toString();
}

export {
    createRoom,
    joinRoom,
    watchRoom,
    startRoom,
    patchPlayerNetworking,
    getRoomInfo,
    getInviteUrl,
    leaveRoom,
    normalizeRoomCode,
};
