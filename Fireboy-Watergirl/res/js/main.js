const $ = (id) => document.getElementById(id);

let gameStarted = false;
let roomWatching = false;
let network = null;
let gameModule = null;
let helpersModule = null;
let dataReadyPromise = null;

function showLobbyMessage(message, error = false) {
    const waiting = $("room-waiting");
    const box = waiting && !waiting.classList.contains("hidden") ? $("room-message-waiting") : $("room-message-setup");
    if (!box) return;
    box.textContent = message;
    box.classList.toggle("error", error);
    box.classList.toggle("success", !error);
}

async function ensureGameLoaded() {
    if (!dataReadyPromise) {
        dataReadyPromise = (async () => {
            helpersModule = helpersModule || await import("./helpers.js");
            await helpersModule.loadData();
            helpersModule.loadDataFromLocalStorage();
            gameModule = gameModule || await import("./game.js");
            return gameModule;
        })().catch((error) => {
            dataReadyPromise = null;
            gameModule = null;
            helpersModule = null;
            throw error;
        });
    }
    return dataReadyPromise;
}

async function getNetwork() {
    if (network) return network;
    network = await import("./network.js");
    return network;
}

async function startLocalGame() {
    if (gameStarted) return;
    const button = $("local-play");
    if (button) button.disabled = true;
    showLobbyMessage("Loading game...");

    try {
        const game = await ensureGameLoaded();
        if (gameStarted) return;

        $("mode-menu").classList.add("hidden");
        $("room-lobby").classList.add("hidden");
        $("canvas").classList.remove("hidden");
        game.playGame();
        gameStarted = true;
    } catch (error) {
        console.error("Fireboy-Watergirl startup error:", error);
        showLobbyMessage(error?.message || "The game could not start. Open the browser console for details.", true);
        if (button) button.disabled = false;
    }
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
    if (!rect.width || !rect.height) return;
    const x = rect.left + rect.width * 0.48;
    const y = rect.top + rect.height * 0.9;
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y }));
    canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y }));
}

async function beginOnlineGame() {
    if (gameStarted) return;
    try {
        await ensureGameLoaded();
        const net = await getNetwork();
        net.patchPlayerNetworking();

        if (gameStarted) return;
        const info = net.getRoomInfo();
        document.body.classList.add("playing-online");
        $("room-lobby").classList.add("hidden");
        $("canvas").classList.remove("hidden");
        history.replaceState(null, "", `${window.location.pathname}?room=${info.roomCode}`);
        gameModule.playGame();
        gameStarted = true;
        setTimeout(autoSelectFirstLevel, 150);
    } catch (error) {
        gameStarted = false;
        showLobbyMessage(error.message || "Game could not start.", true);
    }
}

async function create() {
    const name = $("player-name").value.trim();
    if (!name) return showLobbyMessage("Write your name first.", true);
    localStorage.setItem("fireboy_watergirl_name", name);
    $("create-room").disabled = true;
    $("join-room").disabled = true;
    try {
        const net = await getNetwork();
        const code = await net.createRoom(name);
        history.replaceState(null, "", `${window.location.pathname}?room=${code}`);
        setRoomPanel({ code, role: "host", host: { name }, guest: null });
        watch();
    } catch (error) {
        showLobbyMessage(error.message || "Could not create room.", true);
        $("create-room").disabled = false;
        $("join-room").disabled = false;
    }
}

async function join() {
    const name = $("player-name").value.trim();
    const code = $("room-code-input").value.trim();
    if (!name) return showLobbyMessage("Write your name first.", true);
    if (!code) return showLobbyMessage("Enter the room code.", true);
    localStorage.setItem("fireboy_watergirl_name", name);
    $("create-room").disabled = true;
    $("join-room").disabled = true;
    try {
        const net = await getNetwork();
        await net.joinRoom(code, name);
        watch();
    } catch (error) {
        showLobbyMessage(error.message || "Could not join room.", true);
        $("create-room").disabled = false;
        $("join-room").disabled = false;
    }
}

async function watch() {
    if (roomWatching) return;
    roomWatching = true;
    try {
        const net = await getNetwork();
        net.watchRoom((room) => {
            if (room.status === "closed") {
                roomWatching = false;
                gameStarted = false;
                $("room-lobby").classList.remove("hidden");
                $("room-waiting").classList.add("hidden");
                $("room-setup").classList.remove("hidden");
                showLobbyMessage("The room was closed.", true);
                return;
            }
            const info = net.getRoomInfo();
            setRoomPanel({ ...room, code: info.roomCode, role: info.role });
            if (room.status === "playing") beginOnlineGame();
        });
    } catch (error) {
        roomWatching = false;
        showLobbyMessage(error.message || "Could not watch room.", true);
    }
}

async function start() {
    try {
        const net = await getNetwork();
        const info = net.getRoomInfo();
        if (info.role !== "host") return;
        await net.startRoom(1);
    } catch (error) {
        showLobbyMessage(error.message || "Could not start the game.", true);
    }
}

async function copyRoom() {
    try {
        const net = await getNetwork();
        const info = net.getRoomInfo();
        const invite = net.getInviteUrl();
        await navigator.clipboard.writeText(invite || info.roomCode);
        showLobbyMessage("Room invite copied.");
    } catch (error) {
        showLobbyMessage(error.message || "Could not copy room.", true);
    }
}

async function leave() {
    try {
        const net = await getNetwork();
        await net.leaveRoom();
    } finally {
        location.href = location.pathname;
    }
}

function showMode() {
    $("room-lobby").classList.add("hidden");
    $("mode-menu").classList.remove("hidden");
}

function showOnline() {
    $("mode-menu").classList.add("hidden");
    $("room-lobby").classList.remove("hidden");
}

function boot() {
    $("local-play")?.addEventListener("click", startLocalGame);
    $("online-play")?.addEventListener("click", showOnline);
    $("back-mode")?.addEventListener("click", showMode);
    $("create-room")?.addEventListener("click", create);
    $("join-room")?.addEventListener("click", join);
    $("start-game")?.addEventListener("click", start);
    $("copy-room")?.addEventListener("click", copyRoom);
    $("leave-room")?.addEventListener("click", leave);

    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) {
        $("room-code-input").value = roomFromUrl;
        showOnline();
    }
    $("player-name").value = localStorage.getItem("fireboy_watergirl_name") || "";
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
