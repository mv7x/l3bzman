// =========================================================
// Matching Cards - لعبة الذاكرة بورق الكوتشينة 1v1
// Firebase Realtime Database
// معمارية فائقة الأداء والموثوقية (Zero-Error Architecture)
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  onValue, 
  off 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

// إعدادات Firebase
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

// =========================================================
// بناء مجموعة البطاقات (52 بطاقة = 26 زوج)
// =========================================================

const SUITS = [
  { suit: '♠', color: 'black' },
  { suit: '♣', color: 'black' },
  { suit: '♥', color: 'red' },
  { suit: '♦', color: 'red' }
];

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function buildDeck() {
  const deck = [];
  let id = 0;
  for (const s of SUITS) {
    for (const v of VALUES) {
      deck.push({
        id: id++,
        value: v,
        suit: s.suit,
        color: s.color,
        matchKey: `${v}_${s.color}`,
        flipped: false,
        matched: false
      });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =========================================================
// التخزين الآمن وتجهيز الأسماء (Safari / iPad Safe)
// =========================================================

function safeSetStorage(key, val) {
  try { localStorage.setItem(key, val); } catch (e) {}
}

function safeGetStorage(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeRemoveStorage(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function sanitizeFirebaseKey(str) {
  if (!str) return 'user_' + Math.floor(Math.random() * 1000);
  return str.replace(/[.#$\[\]\/]/g, '_').trim();
}

// حالة التطبيق
let currentUsername = safeGetStorage('agy_user_name') || '';
let currentRoomId = null;
let currentRoomRef = null;
let myRole = null; // 'player1' | 'player2'
let isMyTurn = false;
let isProcessing = false;
let currentRoomData = null;

// =========================================================
// دوال الواجهة المساعدة
// =========================================================

function $(id) {
  return document.getElementById(id);
}

function showScreen(screenId) {
  ['auth-screen', 'lobby-screen', 'waiting-screen', 'game-screen', 'results-screen'].forEach(id => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
  const target = $(screenId);
  if (target) target.classList.remove('hidden');
}

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// =========================================================
// 1. تسجيل الدخول
// =========================================================

export async function handleLogin() {
  const input = $('login-username');
  const name = input ? input.value.trim() : '';

  if (!name) {
    alert("يرجى كتابة اسمك أولاً!");
    if (input) input.focus();
    return;
  }

  currentUsername = name;
  safeSetStorage('agy_user_name', name);

  const safeKey = sanitizeFirebaseKey(name);
  set(ref(db, `users/${safeKey}`), {
    username: name,
    lastLogin: Date.now()
  }).catch(() => {});

  goToLobby();
}

export function goToLobby() {
  const displayEl = $('display-user-name');
  if (displayEl) displayEl.innerText = currentUsername;
  showScreen('lobby-screen');
}

export function handleLogout() {
  safeRemoveStorage('agy_user_name');
  currentUsername = '';
  const input = $('login-username');
  if (input) input.value = '';
  showScreen('auth-screen');
}

// =========================================================
// 2. إنشاء غرفة جديدة
// =========================================================

export async function handleCreateRoom() {
  if (!currentUsername) {
    showScreen('auth-screen');
    return;
  }

  currentRoomId = generateRoomCode();
  myRole = 'player1';
  const deck = shuffleDeck(buildDeck());

  const initialRoomData = {
    roomId: currentRoomId,
    status: 'waiting',
    hostName: currentUsername,
    guestName: null,
    currentTurn: 'player1',
    firstFlipped: null,
    secondFlipped: null,
    player1: { name: currentUsername, score: 0 },
    player2: null,
    cards: deck,
    lastAction: Date.now()
  };

  const btn = $('btn-create-room');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ جاري الإنشاء...';
  }

  try {
    currentRoomRef = ref(db, `mc_rooms/${currentRoomId}`);
    await set(currentRoomRef, initialRoomData);
    listenToRoom(currentRoomId);
  } catch (error) {
    console.error("Error creating room:", error);
    alert("حدث خطأ أثناء إنشاء الغرفة!");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '✨ إنشاء غرفة جديدة';
    }
  }
}

// =========================================================
// 3. الانضمام لغرفة
// =========================================================

export async function handleJoinRoom() {
  if (!currentUsername) {
    showScreen('auth-screen');
    return;
  }

  const input = $('room-code-input');
  const code = input ? input.value.trim() : '';

  if (!code) {
    alert("يرجى كتابة كود الغرفة أولاً!");
    if (input) input.focus();
    return;
  }

  currentRoomId = code;
  myRole = 'player2';

  const btn = $('btn-join-room');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳...';
  }

  try {
    const roomSnap = await get(ref(db, `mc_rooms/${code}`));
    if (!roomSnap.exists()) {
      alert("الغرفة غير موجودة! تأكد من صحة الكود.");
      return;
    }

    const roomData = roomSnap.val();
    if (roomData.player2 && roomData.player2.name && roomData.player2.name !== currentUsername && roomData.status !== 'waiting') {
      alert("الغرفة مكتملة أو اللعبة بدأت بالفعل!");
      return;
    }

    await update(ref(db, `mc_rooms/${code}`), {
      guestName: currentUsername,
      player2: { name: currentUsername, score: 0 }
    });

    listenToRoom(code);
  } catch (error) {
    console.error("Error joining room:", error);
    alert("حدث خطأ أثناء الانضمام للغرفة!");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'دخول';
    }
  }
}

// =========================================================
// 4. بدء اللعبة (فوري ومباشر)
// =========================================================

export async function handleStartGameClick() {
  if (!currentRoomId) return;

  const btn = $('btn-start-game');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '🚀 جاري بدء اللعبة...';
  }

  try {
    const p1Name = currentRoomData?.hostName || currentUsername;
    const p2Name = currentRoomData?.guestName || currentRoomData?.player2?.name || 'الخصم';
    const deck = shuffleDeck(buildDeck());

    await update(ref(db, `mc_rooms/${currentRoomId}`), {
      status: 'playing',
      currentTurn: 'player1',
      firstFlipped: null,
      secondFlipped: null,
      cards: deck,
      lastAction: Date.now(),
      player1: { name: p1Name, score: 0 },
      player2: { name: p2Name, score: 0 }
    });
  } catch (e) {
    console.error("Error starting game:", e);
    alert("حدث خطأ أثناء بدء اللعبة!");
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🚀 ابدأ اللعبة الآن 🎴';
    }
  }
}

// =========================================================
// 5. الاستماع المركزي لتحديثات الغرفة (Realtime Database)
// =========================================================

function listenToRoom(roomId) {
  if (currentRoomRef) off(currentRoomRef);

  currentRoomId = roomId;
  currentRoomRef = ref(db, `mc_rooms/${roomId}`);

  onValue(currentRoomRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const room = snapshot.val();
    currentRoomData = room;
    handleRoomUpdate(room);
  });
}

function handleRoomUpdate(room) {
  if (!room) return;

  const isPlayer1 = (currentUsername === room.hostName);
  myRole = isPlayer1 ? 'player1' : 'player2';
  const oppRole = isPlayer1 ? 'player2' : 'player1';

  const myData = room[myRole] || { name: currentUsername, score: 0 };
  const oppData = room[oppRole] || { name: 'الخصم', score: 0 };

  const codeDisplay = $('display-room-code');
  if (codeDisplay) codeDisplay.innerText = currentRoomId;

  // ── A. غرفة الانتظار ──
  if (room.status === 'waiting') {
    showScreen('waiting-screen');

    const hostNameEl = $('host-name');
    if (hostNameEl) hostNameEl.innerText = room.hostName || 'المضيف';

    const guestNameEl = $('guest-name');
    const guestAvatarEl = $('guest-avatar');
    const guestStatusEl = $('guest-status');
    const startBtn = $('btn-start-game');
    const hintEl = $('waiting-hint');

    const hasGuest = Boolean(room.player2 && room.player2.name);

    if (hasGuest) {
      if (guestNameEl) guestNameEl.innerText = room.player2.name;
      if (guestAvatarEl) guestAvatarEl.innerText = '♥️';
      if (guestStatusEl) {
        guestStatusEl.innerText = 'جاهز';
        guestStatusEl.className = 'pslot-badge ready';
      }

      if (isPlayer1) {
        if (startBtn) {
          startBtn.classList.remove('hidden');
          startBtn.disabled = false;
          startBtn.innerText = '🚀 ابدأ اللعبة الآن 🎴';
        }
        if (hintEl) hintEl.innerText = `${room.player2.name} جاهز! اضغط ابدأ للعب 🃏`;
      } else {
        if (startBtn) startBtn.classList.add('hidden');
        if (hintEl) hintEl.innerText = 'في انتظار المضيف لبدء اللعبة... 🎴';
      }
    } else {
      if (guestNameEl) guestNameEl.innerText = 'في انتظار خصم...';
      if (guestAvatarEl) guestAvatarEl.innerText = '⏳';
      if (guestStatusEl) {
        guestStatusEl.innerText = 'ينتظر';
        guestStatusEl.className = 'pslot-badge waiting';
      }
      if (isPlayer1 && startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.disabled = false;
        startBtn.innerText = '🚀 ابدأ اللعبة الآن 🎴';
      }
      if (hintEl) hintEl.innerText = 'شارك كود الغرفة مع صاحبك! 🎴';
    }
  }

  // ── B. شاشة اللعب الحية ──
  else if (room.status === 'playing') {
    showScreen('game-screen');

    const scoreNameMe = $('score-name-me');
    const scoreNameOpp = $('score-name-opp');
    const scoreMe = $('score-me');
    const scoreOpp = $('score-opp');

    if (scoreNameMe) scoreNameMe.innerText = myData.name || currentUsername;
    if (scoreNameOpp) scoreNameOpp.innerText = oppData.name || 'الخصم';
    if (scoreMe) scoreMe.innerText = myData.score || 0;
    if (scoreOpp) scoreOpp.innerText = oppData.score || 0;

    isMyTurn = (room.currentTurn === myRole);
    updateTurnUI(room, myData, oppData);

    if (room.cards) {
      renderCards(room.cards, room.firstFlipped, room.secondFlipped);
    }

    if (room.cards && room.cards.every(c => c.matched)) {
      setTimeout(() => showResults(room, isPlayer1, myData, oppData), 800);
    }
  }

  // ── C. شاشة النتائج ──
  else if (room.status === 'ended') {
    const isPlayer1Final = (currentUsername === room.hostName);
    const myDataF = room[isPlayer1Final ? 'player1' : 'player2'] || { name: currentUsername, score: 0 };
    const oppDataF = room[isPlayer1Final ? 'player2' : 'player1'] || { name: 'الخصم', score: 0 };
    showResults(room, isPlayer1Final, myDataF, oppDataF);
  }
}

// =========================================================
// 6. رسم شبكة البطاقات
// =========================================================

function renderCards(cards, firstIdx, secondIdx) {
  const grid = $('cards-grid');
  if (!grid) return;

  const existingCells = grid.querySelectorAll('.card-cell');

  if (existingCells.length === cards.length) {
    cards.forEach((card, i) => {
      const cell = existingCells[i];
      if (!cell) return;

      const isFlipped = card.flipped || card.matched || i === firstIdx || i === secondIdx;
      const wasFlipped = cell.classList.contains('flipped');
      const isMatched = card.matched;

      if (isFlipped && !wasFlipped) cell.classList.add('flipped');
      if (!isFlipped && wasFlipped) cell.classList.remove('flipped');
      if (isMatched) cell.classList.add('is-matched');
    });
    return;
  }

  grid.innerHTML = '';
  cards.forEach((card, i) => {
    const cell = document.createElement('div');
    cell.className = 'card-cell';
    cell.dataset.index = i;

    const isFlipped = card.flipped || card.matched || i === firstIdx || i === secondIdx;
    if (isFlipped) cell.classList.add('flipped');
    if (card.matched) cell.classList.add('is-matched');

    cell.innerHTML = `
      <div class="card-inner">
        <div class="card-back">
          <div class="card-back-pattern">🃏</div>
        </div>
        <div class="card-face ${card.color}">
          <div class="card-corner-top">
            <span class="card-value">${card.value}</span>
            <span class="card-suit-sm">${card.suit}</span>
          </div>
          <span class="card-center-suit">${card.suit}</span>
          <div class="card-corner-bot">
            <span class="card-value">${card.value}</span>
            <span class="card-suit-sm">${card.suit}</span>
          </div>
        </div>
      </div>
    `;

    cell.addEventListener('click', () => handleCardClick(i));
    grid.appendChild(cell);
  });
}

// =========================================================
// 7. منطق النقر والمطابقة
// =========================================================

async function handleCardClick(index) {
  if (!isMyTurn || isProcessing || !currentRoomId) return;

  const snap = await get(currentRoomRef);
  const room = snap.val();
  if (!room || room.status !== 'playing') return;

  const cards = room.cards;
  const card = cards[index];

  if (card.matched || card.flipped || index === room.firstFlipped) return;

  // قلب البطاقة الأولى
  if (room.firstFlipped === null || room.firstFlipped === undefined) {
    await update(ref(db, `mc_rooms/${currentRoomId}`), {
      firstFlipped: index,
      lastAction: Date.now()
    });
    return;
  }

  // قلب البطاقة الثانية
  const firstCard = cards[room.firstFlipped];
  isProcessing = true;

  await update(ref(db, `mc_rooms/${currentRoomId}`), {
    secondFlipped: index,
    lastAction: Date.now()
  });

  await delay(900);

  const matched = (firstCard.matchKey === card.matchKey);

  const updatedCards = cards.map((c, i) => {
    if (i === room.firstFlipped || i === index) {
      return { ...c, flipped: false, matched };
    }
    return c;
  });

  const currentScore = room[myRole]?.score || 0;
  const nextTurn = matched ? myRole : (myRole === 'player1' ? 'player2' : 'player1');

  const roomUpdates = {
    cards: updatedCards,
    firstFlipped: null,
    secondFlipped: null,
    currentTurn: nextTurn,
    lastAction: Date.now()
  };

  if (matched) {
    roomUpdates[`${myRole}/score`] = currentScore + 1;
  }

  const allMatched = updatedCards.every(c => c.matched);
  if (allMatched) roomUpdates.status = 'ended';

  await update(ref(db, `mc_rooms/${currentRoomId}`), roomUpdates);
  isProcessing = false;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateTurnUI(room, myData, oppData) {
  const isMyTurnNow = (room.currentTurn === myRole);
  const activePlayerName = isMyTurnNow ? (myData.name || currentUsername) : (oppData.name || 'الخصم');

  const turnText = $('turn-text');
  const turnSub = $('turn-sub');
  const myTurnBanner = $('my-turn-banner');
  const scoreBoxMe = $('score-box-me');
  const scoreBoxOpp = $('score-box-opp');

  if (turnText) turnText.innerText = `🎴 دور ${activePlayerName}`;
  if (turnSub) turnSub.innerText = isMyTurnNow ? 'دورك الآن! اقلب بطاقتين...' : 'ينتظر دوره...';

  if (isMyTurnNow) {
    if (myTurnBanner) myTurnBanner.classList.remove('hidden');
    if (scoreBoxMe) scoreBoxMe.classList.add('active');
    if (scoreBoxOpp) scoreBoxOpp.classList.remove('active');
  } else {
    if (myTurnBanner) myTurnBanner.classList.add('hidden');
    if (scoreBoxMe) scoreBoxMe.classList.remove('active');
    if (scoreBoxOpp) scoreBoxOpp.classList.add('active');
  }
}

// =========================================================
// 8. شاشة النتائج
// =========================================================

function showResults(room, isPlayer1, myData, oppData) {
  const myScore = myData.score || 0;
  const oppScore = oppData.score || 0;
  const iWon = myScore > oppScore;
  const isDraw = myScore === oppScore;

  const finalNameMe = $('final-name-me');
  const finalNameOpp = $('final-name-opp');
  const finalNumMe = $('final-num-me');
  const finalNumOpp = $('final-num-opp');
  const finalCardMe = $('final-card-me');
  const finalCardOpp = $('final-card-opp');
  const resultsTrophy = $('results-trophy');
  const resultsTitle = $('results-title');
  const resultsSub = $('results-sub');

  if (finalNameMe) finalNameMe.innerText = myData.name || currentUsername;
  if (finalNameOpp) finalNameOpp.innerText = oppData.name || 'الخصم';
  if (finalNumMe) finalNumMe.innerText = myScore;
  if (finalNumOpp) finalNumOpp.innerText = oppScore;

  if (isDraw) {
    if (resultsTrophy) resultsTrophy.innerText = '🤝';
    if (resultsTitle) resultsTitle.innerText = 'تعادل رائع!';
    if (resultsSub) resultsSub.innerText = 'أداء وتركيز متكافئ وقوي! 💪';
    if (finalCardMe) finalCardMe.classList.remove('winner-card');
    if (finalCardOpp) finalCardOpp.classList.remove('winner-card');
  } else if (iWon) {
    if (resultsTrophy) resultsTrophy.innerText = '🏆';
    if (resultsTitle) resultsTitle.innerText = `مبروك يا ${currentUsername}! 🎉`;
    if (resultsSub) resultsSub.innerText = 'فوز مستحق بفضل الذاكرة القوية! 🃏';
    if (finalCardMe) finalCardMe.classList.add('winner-card');
    if (finalCardOpp) finalCardOpp.classList.remove('winner-card');
    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  } else {
    if (resultsTrophy) resultsTrophy.innerText = '🥈';
    if (resultsTitle) resultsTitle.innerText = `فاز ${oppData.name || 'الخصم'}!`;
    if (resultsSub) resultsSub.innerText = 'حظ أوفر في الجولة القادمة! 💪';
    if (finalCardMe) finalCardMe.classList.remove('winner-card');
    if (finalCardOpp) finalCardOpp.classList.add('winner-card');
  }

  showScreen('results-screen');
}

// =========================================================
// 9. جولة جديدة ومغادرة
// =========================================================

export async function handlePlayAgain() {
  if (!currentRoomId) { goToLobby(); return; }

  const btn = $('btn-play-again');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ جاري التجهيز...';
  }

  const newDeck = shuffleDeck(buildDeck());
  try {
    await update(ref(db, `mc_rooms/${currentRoomId}`), {
      status: 'playing',
      currentTurn: 'player1',
      firstFlipped: null,
      secondFlipped: null,
      cards: newDeck,
      lastAction: Date.now(),
      'player1/score': 0,
      'player2/score': 0
    });
  } catch (e) {
    console.error(e);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🔄 جولة جديدة';
    }
  }
}

export function handleLeaveRoom() {
  if (currentRoomRef) off(currentRoomRef);
  currentRoomId = null;
  const input = $('room-code-input');
  if (input) input.value = '';
  goToLobby();
}

// إتاحة الدوال على window
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleCreateRoom = handleCreateRoom;
window.handleJoinRoom = handleJoinRoom;
window.handleStartGameClick = handleStartGameClick;
window.handleLeaveRoom = handleLeaveRoom;
window.handlePlayAgain = handlePlayAgain;

// =========================================================
// ربط الأحداث
// =========================================================

function setupEventListeners() {
  const btnLogin = $('btn-login');
  if (btnLogin) btnLogin.addEventListener('click', handleLogin);

  const loginInput = $('login-username');
  if (loginInput) {
    loginInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  const btnLogout = $('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  const btnCreateRoom = $('btn-create-room');
  if (btnCreateRoom) btnCreateRoom.addEventListener('click', handleCreateRoom);

  const btnJoinRoom = $('btn-join-room');
  if (btnJoinRoom) btnJoinRoom.addEventListener('click', handleJoinRoom);

  const roomCodeInput = $('room-code-input');
  if (roomCodeInput) {
    roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleJoinRoom();
    });
  }

  const btnCopyCode = $('btn-copy-code');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const txt = currentRoomId || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => {
          btnCopyCode.innerText = '✅';
          setTimeout(() => btnCopyCode.innerText = '📋', 2000);
        });
      } else {
        prompt("كود الغرفة:", txt);
      }
    });
  }

  const btnStartGame = $('btn-start-game');
  if (btnStartGame) btnStartGame.addEventListener('click', handleStartGameClick);

  const btnLeaveRoom = $('btn-leave-room');
  if (btnLeaveRoom) btnLeaveRoom.addEventListener('click', handleLeaveRoom);

  const btnPlayAgain = $('btn-play-again');
  if (btnPlayAgain) btnPlayAgain.addEventListener('click', handlePlayAgain);

  const btnResultsHome = $('btn-results-home');
  if (btnResultsHome) btnResultsHome.addEventListener('click', handleLeaveRoom);
}

function initApp() {
  setupEventListeners();
  if (currentUsername) {
    goToLobby();
  } else {
    showScreen('auth-screen');
  }
}

initApp();
