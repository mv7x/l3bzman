import { playGame } from "./game.js";
import { loadData, loadDataFromLocalStorage } from "./helpers.js";
import { createRoom, joinRoom, watchRoom, startRoom, patchPlayerNetworking, getRoomInfo, getInviteUrl, leaveRoom } from "./network.js";

const $ = (id) => document.getElementById(id);
let gameStarted = false;
let roomWatching = false;
let localMode = false;

function showLobbyMessage(message, error = false) {
    const box = $("room-waiting").classList.contains("hidden") ? $("room-message-setup") : $("room-message-waiting");
    if (!box) return;
    box.textContent = message;
    box.classList.toggle("error", error);
    box.classList.toggle("success", !error);
}

function startLocalGame() {
    if (gameStarted) return;
    localMode = true;
    gameStarted = true;
    $("mode-menu").classList.add("hidden");
    $("canvas").classList.remove("hidden");
    playGame();
}

function setRoomPanel(room) {
    $("room-code").textContent = room.code || "----";
    $("room-role").textContent = room.role === "host" ? "Host" : "Guest";
    $("host-name").textContent = room.host?.name || "Waiting...";
    $("guest-name").textContent = room.guest?.name || "Waiting for player...";
    const ready = !!room.guest;
    $("start-game").disabled = room.role !== "host" || !ready;
    $("copy-room").disabled = !room.code;
    $("room-setup").classList.add("hidden");
    $("room-waiting").classList.remove("hidden");
    showLobbyMessage(room.role === "host" ? (ready ? "Your friend joined. Start the game." : "Send the room code to your friend.") : "Connected. Waiting for the host to start...");
}

function autoSelectFirstLevel() {
    const canvas = $("canvas");
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width * 0.48;
    const y = rect.top + rect.height * 0.9;
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y }));
    canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y }));
}

function beginOnlineGame() {
    if (gameStarted) return;
    gameStarted = true;
    const info = getRoomInfo();
    document.body.classList.add("playing-online");
    $("room-lobby").classList.add("hidden");
    $("canvas").classList.remove("hidden");
    history.replaceState(null, "", `${window.location.pathname}?room=${info.roomCode}`);
    playGame();
    setTimeout(autoSelectFirstLevel, 80);
}

async function create() {
    const name = $("player-name").value.trim();
    if (!name) return showLobbyMessage("Write your name first.", true);
    localStorage.setItem("fireboy_watergirl_name", name);
    $("create-room").disabled = true; $("join-room").disabled = true;
    try { const code = await createRoom(name); history.replaceState(null, "", `${window.location.pathname}?room=${code}`); setRoomPanel({ code, role: "host", host: { name }, guest: null }); watch(); }
    catch (error) { showLobbyMessage(error.message || "Could not create room.", true); $("create-room").disabled = false; $("join-room").disabled = false; }
}

async function join() {
    const name = $("player-name").value.trim();
    const code = $("room-code-input").value.trim();
    if (!name) return showLobbyMessage("Write your name first.", true);
    if (!code) return showLobbyMessage("Enter the room code.", true);
    localStorage.setItem("fireboy_watergirl_name", name);
    $("create-room").disabled = true; $("join-room").disabled = true;
    try { await joinRoom(code, name); watch(); }
    catch (error) { showLobbyMessage(error.message || "Could not join room.", true); $("create-room").disabled = false; $("join-room").disabled = false; }
}

function watch() {
    if (roomWatching) return;
    roomWatching = true;
    watchRoom((room) => {
        if (room.status === "closed") { roomWatching = false; gameStarted = false; $("room-lobby").classList.remove("hidden"); $("room-waiting").classList.add("hidden"); $("room-setup").classList.remove("hidden"); showLobbyMessage("The room was closed.", true); return; }
        const info = getRoomInfo();
        setRoomPanel({ ...room, code: info.roomCode, role: info.role });
        if (room.status === "playing") beginOnlineGame();
    });
}

async function start() {
    const info = getRoomInfo();
    if (info.role !== "host") return;
    try { await startRoom(1); } catch (error) { showLobbyMessage(error.message || "Could not start the game.", true); }
}

async function copyRoom() {
    const info = getRoomInfo();
    try { await navigator.clipboard.writeText(getInviteUrl()); showLobbyMessage("Room invite copied."); }
    catch { await navigator.clipboard.writeText(info.roomCode); showLobbyMessage("Room code copied."); }
}

async function leave() { await leaveRoom(); location.href = location.pathname; }

async function boot() {
    patchPlayerNetworking();
    await loadData();
    loadDataFromLocalStorage();
    $("local-play").addEventListener("click", startLocalGame);
    $("online-play").addEventListener("click", () => { $("mode-menu").classList.add("hidden"); $("room-lobby").classList.remove("hidden"); });
    $("back-mode").addEventListener("click", () => { $("room-lobby").classList.add("hidden"); $("mode-menu").classList.remove("hidden"); });
    $("create-room").addEventListener("click", create);
    $("join-room").addEventListener("click", join);
    $("start-game").addEventListener("click", start);
    $("copy-room").addEventListener("click", copyRoom);
    $("leave-room").addEventListener("click", leave);
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) { $("room-code-input").value = roomFromUrl; $("mode-menu").classList.add("hidden"); $("room-lobby").classList.remove("hidden"); }
    $("player-name").value = localStorage.getItem("fireboy_watergirl_name") || "";
}
window.addEventListener("load", boot);
