// =========================================================
// أتوبيس كومبليت - معالجة وتوافق كامل لجميع الأجهزة (iPad / iOS / Safari / Mobile)
// حماية من قيود التصفح الخاص، وتنظيف المسارات، ودعم اللمس الفوري
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

// إعدادات Firebase الخاصة بمشروعك
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

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// قائمة الحروف العربية للجولات
const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ر', 'ز', 
  'س', 'ش', 'ص', 'ض', 'ط', 'ع', 'غ', 'ف', 'ق', 'ك', 
  'ل', 'م', 'ن', 'هـ', 'و', 'ي'
];

// فئات اللعبة الخمسة
const CATEGORIES = ['human', 'animal', 'plant', 'item', 'country'];

// دوال تخزين آمنة لا تتعطل في Safari و iPad (Private Browsing Safe)
function safeSetStorage(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { console.warn("Storage warning:", e); }
}

function safeGetStorage(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeRemoveStorage(key) {
  try { localStorage.removeItem(key); } catch (e) { console.warn("Storage warning:", e); }
}

// تنظيف الأسماء لتكون مسارات آمنة 100% في Firebase
function sanitizeFirebaseKey(str) {
  if (!str) return 'user_' + Math.floor(Math.random() * 1000);
  return str.replace(/[.#$\[\]\/]/g, '_').trim();
}

// حالة التطبيق
let currentUsername = safeGetStorage('agy_user_name') || '';
let currentRoomId = null;
let currentRoomRef = null;
let myRole = null; // 'player1' (Host) or 'player2' (Guest)
let gameStatus = 'lobby';
let timerInterval = null;
let timeLeft = 60;
let hasSubmitted = false;

// عناصر واجهة المستخدم
const elements = {
  // الشاشات
  authScreen: document.getElementById('auth-screen'),
  lobbyScreen: document.getElementById('lobby-screen'),
  waitingScreen: document.getElementById('waiting-screen'),
  gameScreen: document.getElementById('game-screen'),
  resultsScreen: document.getElementById('results-screen'),

  // التسجيل والدخول
  loginUsername: document.getElementById('login-username'),
  btnLogin: document.getElementById('btn-login'),
  displayUserName: document.getElementById('display-user-name'),
  btnLogout: document.getElementById('btn-logout'),

  // اللوبي
  btnCreateRoom: document.getElementById('btn-create-room'),
  roomCodeInput: document.getElementById('room-code-input'),
  btnJoinRoom: document.getElementById('btn-join-room'),

  // الانتظار
  displayRoomCode: document.getElementById('display-room-code'),
  btnCopyLink: document.getElementById('btn-copy-link'),
  hostName: document.getElementById('host-name'),
  guestName: document.getElementById('guest-name'),
  guestAvatar: document.getElementById('guest-avatar'),
  guestStatus: document.getElementById('guest-status'),
  btnStartGame: document.getElementById('btn-start-game'),
  waitingHint: document.getElementById('waiting-hint'),

  // شريط تقدم الخصم الواحد فقط
  oppProgName: document.getElementById('opp-prog-name'),
  oppProgCount: document.getElementById('opp-prog-count'),
  oppProgFill: document.getElementById('opp-prog-fill'),

  // اللعب الحية
  timerSeconds: document.getElementById('timer-seconds'),
  currentLetterBadge: document.getElementById('current-letter'),
  btnSubmit: document.getElementById('btn-submit'),
  inputs: {
    human: document.getElementById('input-human'),
    animal: document.getElementById('input-animal'),
    plant: document.getElementById('input-plant'),
    item: document.getElementById('input-item'),
    country: document.getElementById('input-country')
  },
  rows: {
    human: document.getElementById('row-human'),
    animal: document.getElementById('row-animal'),
    plant: document.getElementById('row-plant'),
    item: document.getElementById('row-item'),
    country: document.getElementById('row-country')
  },

  // النتائج
  resNameP1: document.getElementById('res-name-p1'),
  resNameP2: document.getElementById('res-name-p2'),
  badgeP1: document.getElementById('badge-p1'),
  badgeP2: document.getElementById('badge-p2'),
  colTitleP1: document.getElementById('col-title-p1'),
  colTitleP2: document.getElementById('col-title-p2'),
  winnerAnnouncement: document.getElementById('winner-announcement'),
  winnerSubtitle: document.getElementById('winner-subtitle'),
  winnerCrown: document.getElementById('winner-crown'),
  btnNextRound: document.getElementById('btn-next-round'),
  btnLeaveRoom: document.getElementById('btn-leave-room')
};

// =========================================================
// 2. دوال مساعدة
// =========================================================

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function normalizeArabic(text) {
  if (!text) return '';
  let str = text.trim().toLowerCase();
  if (str.startsWith('ال') && str.length > 2) {
    str = str.substring(2);
  }
  str = str.replace(/[أإآا]/g, 'ا');
  str = str.replace(/ة/g, 'ه');
  str = str.replace(/ى/g, 'ي');
  return str;
}

function checkFirstLetter(word, letter) {
  if (!word || word.trim().length === 0) return false;
  const normWord = normalizeArabic(word);
  const normLetter = normalizeArabic(letter);
  return normWord.startsWith(normLetter);
}

function showScreen(screen) {
  elements.authScreen.classList.add('hidden');
  elements.lobbyScreen.classList.add('hidden');
  elements.waitingScreen.classList.add('hidden');
  elements.gameScreen.classList.add('hidden');
  elements.resultsScreen.classList.add('hidden');
  screen.classList.remove('hidden');
}

function getCurrentInputAnswers() {
  return {
    human: elements.inputs.human ? elements.inputs.human.value.trim() : '',
    animal: elements.inputs.animal ? elements.inputs.animal.value.trim() : '',
    plant: elements.inputs.plant ? elements.inputs.plant.value.trim() : '',
    item: elements.inputs.item ? elements.inputs.item.value.trim() : '',
    country: elements.inputs.country ? elements.inputs.country.value.trim() : ''
  };
}

function calculateMyFilledCount() {
  let count = 0;
  CATEGORIES.forEach(cat => {
    if (elements.inputs[cat] && elements.inputs[cat].value.trim().length > 0) {
      count++;
    }
  });
  return count;
}

// =========================================================
// 3. تسجيل الدخول وحساب المستخدم الآمن لـ iPad / Safari
// =========================================================

async function handleLogin() {
  const name = elements.loginUsername.value.trim();
  if (!name) {
    alert("يرجى كتابة اسمك أولاً!");
    elements.loginUsername.focus();
    return;
  }

  currentUsername = name;
  safeSetStorage('agy_user_name', name);

  // تحديث الداتابيز في الخلفية بدون حجب الانتقال
  const safeKey = sanitizeFirebaseKey(name);
  set(ref(db, `users/${safeKey}`), {
    username: name,
    lastLogin: Date.now(),
    device: navigator.userAgent
  }).catch(e => console.warn("User sync notice:", e));

  goToLobby();
}

function goToLobby() {
  elements.displayUserName.innerText = currentUsername;
  showScreen(elements.lobbyScreen);
}

function handleLogout() {
  safeRemoveStorage('agy_user_name');
  currentUsername = '';
  elements.loginUsername.value = '';
  showScreen(elements.authScreen);
}

// =========================================================
// 4. إنشاء ودخول الغرف المتوافق مع شاشات اللمس
// =========================================================

async function handleCreateRoom() {
  if (!currentUsername) {
    showScreen(elements.authScreen);
    return;
  }

  currentRoomId = generateRoomCode();
  myRole = 'player1';
  const randomLetter = ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)];

  const initialRoomData = {
    roomId: currentRoomId,
    status: 'waiting',
    currentLetter: randomLetter,
    hostName: currentUsername,
    guestName: null,
    winner: null,
    submittedBy: null,
    player1: {
      name: currentUsername,
      answers: { human: '', animal: '', plant: '', item: '', country: '' },
      progressCount: 0,
      submitted: false
    },
    player2: null
  };

  try {
    elements.btnCreateRoom.disabled = true;
    elements.btnCreateRoom.innerText = '⏳ جاري الإنشاء...';

    currentRoomRef = ref(db, `rooms/${currentRoomId}`);
    await set(currentRoomRef, initialRoomData);

    listenToRoom(currentRoomId);
  } catch (error) {
    console.error("Error creating room:", error);
    alert("حدث خطأ أثناء الاتصال بقاعدة البيانات!");
  } finally {
    elements.btnCreateRoom.disabled = false;
    elements.btnCreateRoom.innerText = '✨ إنشاء غرفة جديدة 🎀';
  }
}

async function handleJoinRoom() {
  if (!currentUsername) {
    showScreen(elements.authScreen);
    return;
  }

  const code = elements.roomCodeInput.value.trim();
  if (!code) {
    alert("يرجى كتابة كود الغرفة أولاً!");
    elements.roomCodeInput.focus();
    return;
  }

  currentRoomId = code;
  myRole = 'player2';

  try {
    elements.btnJoinRoom.disabled = true;
    elements.btnJoinRoom.innerText = '⏳...';

    const roomSnap = await get(ref(db, `rooms/${code}`));
    if (!roomSnap.exists()) {
      alert("الغرفة غير موجودة! تأكد من صحة الكود.");
      return;
    }

    const roomData = roomSnap.val();
    if (roomData.player2 && roomData.player2.name && roomData.player2.name !== currentUsername && roomData.status !== 'waiting') {
      alert("الغرفة ممتلئة بالكامل أو بدأت بالفعل!");
      return;
    }

    // تسجيل اللاعب الثاني
    await update(ref(db, `rooms/${code}`), {
      guestName: currentUsername,
      player2: {
        name: currentUsername,
        answers: { human: '', animal: '', plant: '', item: '', country: '' },
        progressCount: 0,
        submitted: false
      }
    });

    listenToRoom(code);
  } catch (error) {
    console.error("Error joining room:", error);
    alert("حدث خطأ أثناء الانضمام للغرفة!");
  } finally {
    elements.btnJoinRoom.disabled = false;
    elements.btnJoinRoom.innerText = 'دخول 💕';
  }
}

// =========================================================
// 5. الاستماع المركزي لحالة الغرفة (Realtime Database)
// =========================================================

function listenToRoom(roomId) {
  if (currentRoomRef) {
    off(currentRoomRef);
  }

  currentRoomId = roomId;
  currentRoomRef = ref(db, `rooms/${roomId}`);

  onValue(currentRoomRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const room = snapshot.val();
    handleRoomUpdate(room);
  });
}

function handleRoomUpdate(room) {
  if (!room) return;

  // تحديد دوري بدقة
  const isPlayer1 = (currentUsername === room.player1?.name);
  myRole = isPlayer1 ? 'player1' : 'player2';
  const oppRole = isPlayer1 ? 'player2' : 'player1';

  const myData = room[myRole];
  const oppData = room[oppRole];

  elements.displayRoomCode.innerText = currentRoomId;

  // 1. حالة الانتظار (WAITING)
  if (room.status === 'waiting') {
    gameStatus = 'waiting';
    showScreen(elements.waitingScreen);

    elements.hostName.innerText = room.player1?.name || 'المضيف';

    if (room.player2 && room.player2.name) {
      elements.guestName.innerText = room.player2.name;
      elements.guestAvatar.innerText = '🌸';
      elements.guestStatus.innerText = 'جاهز 💖';
      elements.guestStatus.className = 'status ready';

      if (isPlayer1) {
        elements.btnStartGame.classList.remove('hidden');
        elements.btnStartGame.disabled = false;
        elements.btnStartGame.innerText = '🚀 ابدأي اللعبة الآن 💖';
        elements.waitingHint.innerText = `${room.player2.name} جاهزة! اضغطي ابدأي للعب 🌸`;
      } else {
        elements.btnStartGame.classList.add('hidden');
        elements.waitingHint.innerText = 'في انتظار المضيف لبدء الجولة... 💕';
      }
    } else {
      elements.guestName.innerText = 'في انتظار الخصم...';
      elements.guestAvatar.innerText = '⏳🎀';
      elements.guestStatus.innerText = 'ينتظر';
      elements.guestStatus.className = 'status waiting';
      elements.btnStartGame.classList.add('hidden');
      elements.waitingHint.innerText = 'شاركي الكود مع صاحبتك للبدء فوراً! 💌✨';
    }
  }

  // 2. حالة اللعب الحية (PLAYING)
  else if (room.status === 'playing') {
    if (gameStatus !== 'playing' || elements.gameScreen.classList.contains('hidden')) {
      startLocalRound(room);
    }

    const oppName = oppData ? oppData.name : 'الخصم';
    elements.oppProgName.innerText = `👤 تقدم ${oppName}:`;

    const oppProgress = (oppData && typeof oppData.progressCount === 'number') ? oppData.progressCount : 0;
    elements.oppProgFill.style.width = `${(oppProgress / 5) * 100}%`;
    elements.oppProgCount.innerText = `${oppProgress}/5`;
  }

  // 3. حالة انتهاء الجولة (ENDED)
  else if (room.status === 'ended') {
    endRoundAndShowResults(room, isPlayer1);
  }
}

// =========================================================
// 6. بدء الجولة واللعب المباشر
// =========================================================

async function handleStartGameClick() {
  if (!currentRoomId) return;

  elements.btnStartGame.disabled = true;
  elements.btnStartGame.innerText = '🚀 جاري بدء اللعبة...';

  const randomLetter = ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)];

  try {
    const roomSnap = await get(ref(db, `rooms/${currentRoomId}`));
    const room = roomSnap.val();
    const p1Name = room?.player1?.name || currentUsername;
    const p2Name = room?.player2?.name || 'الخصم';

    await update(ref(db, `rooms/${currentRoomId}`), {
      status: 'playing',
      currentLetter: randomLetter,
      startedAt: Date.now(),
      submittedBy: null,
      winner: null,
      player1: {
        name: p1Name,
        answers: { human: '', animal: '', plant: '', item: '', country: '' },
        progressCount: 0,
        submitted: false
      },
      player2: {
        name: p2Name,
        answers: { human: '', animal: '', plant: '', item: '', country: '' },
        progressCount: 0,
        submitted: false
      }
    });
  } catch (err) {
    console.error("Error starting game:", err);
    alert("حدث خطأ أثناء بدء الجولة!");
    elements.btnStartGame.disabled = false;
    elements.btnStartGame.innerText = '🚀 ابدأي اللعبة الآن 💖';
  }
}

function startLocalRound(room) {
  gameStatus = 'playing';
  hasSubmitted = false;
  elements.currentLetterBadge.innerText = room.currentLetter || 'أ';

  // تفريغ الحقول
  CATEGORIES.forEach(cat => {
    if (elements.inputs[cat]) {
      elements.inputs[cat].value = '';
      elements.inputs[cat].disabled = false;
    }
    if (elements.rows[cat]) {
      elements.rows[cat].className = 'category-row';
    }
  });

  elements.btnSubmit.disabled = false;
  elements.btnSubmit.innerText = 'أتوبيس كومبليت! 🎀✨';
  elements.oppProgFill.style.width = '0%';
  elements.oppProgCount.innerText = '0/5';

  showScreen(elements.gameScreen);

  if (elements.inputs.human) {
    elements.inputs.human.focus();
  }

  startTimer(room.timerDuration || 60);
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  timeLeft = seconds;
  elements.timerSeconds.innerText = timeLeft;
  document.querySelector('.timer-badge')?.classList.remove('urgent');

  timerInterval = setInterval(() => {
    timeLeft--;
    elements.timerSeconds.innerText = timeLeft;

    if (timeLeft <= 10) {
      document.querySelector('.timer-badge')?.classList.add('urgent');
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!hasSubmitted) {
        submitAnswers(true);
      }
    }
  }, 1000);
}

function handleInputChange(category) {
  const inputEl = elements.inputs[category];
  const rowEl = elements.rows[category];
  const val = inputEl.value.trim();

  const currentLetter = elements.currentLetterBadge.innerText.trim();

  if (val.length > 0) {
    rowEl.classList.add('active-filled');
    const isValidLetter = checkFirstLetter(val, currentLetter);
    if (isValidLetter) {
      rowEl.classList.add('valid-input');
    } else {
      rowEl.classList.remove('valid-input');
    }
  } else {
    rowEl.classList.remove('active-filled', 'valid-input');
  }

  const myCount = calculateMyFilledCount();
  syncAnswersAndProgress(myCount);
}

let syncTimeout = null;
function syncAnswersAndProgress(count) {
  if (!currentRoomId || gameStatus !== 'playing' || !myRole) return;

  const currentAnswers = getCurrentInputAnswers();

  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await update(ref(db, `rooms/${currentRoomId}/${myRole}`), {
        answers: currentAnswers,
        progressCount: count
      });
    } catch (err) {
      console.warn("RTDB sync error:", err);
    }
  }, 60);
}

async function submitAnswers(isTimeUp = false) {
  if (hasSubmitted) return;
  hasSubmitted = true;
  clearInterval(timerInterval);

  CATEGORIES.forEach(cat => {
    if (elements.inputs[cat]) elements.inputs[cat].disabled = true;
  });
  elements.btnSubmit.disabled = true;
  elements.btnSubmit.innerText = isTimeUp ? '⏰ انتهى الوقت...' : '🚀 تم التسليم!';

  const currentAnswers = getCurrentInputAnswers();
  const count = calculateMyFilledCount();

  try {
    const updates = {
      status: 'ended',
      submittedBy: isTimeUp ? 'time_up' : currentUsername,
      winner: isTimeUp ? 'تعادل الوقت' : currentUsername,
      [`${myRole}/answers`]: currentAnswers,
      [`${myRole}/progressCount`]: count,
      [`${myRole}/submitted`]: true,
      [`${myRole}/submittedAt`]: Date.now()
    };

    await update(ref(db, `rooms/${currentRoomId}`), updates);
  } catch (err) {
    console.error("Error submitting answers:", err);
  }
}

// =========================================================
// 7. شاشة النتائج والمقارنة
// =========================================================

function endRoundAndShowResults(room, isPlayer1) {
  gameStatus = 'ended';
  clearInterval(timerInterval);

  const myRoleKey = isPlayer1 ? 'player1' : 'player2';
  const oppRoleKey = isPlayer1 ? 'player2' : 'player1';

  const myData = room[myRoleKey] || { name: currentUsername, answers: {} };
  const oppData = room[oppRoleKey] || { name: 'الخصم', answers: {} };

  const myLocalAnswers = getCurrentInputAnswers();
  const myFinalAnswers = { ...myLocalAnswers, ...(myData.answers || {}) };
  const oppFinalAnswers = oppData.answers || {};

  const isMeWinner = (room.winner === currentUsername);
  const isTimeUp = (room.winner === 'تعادل الوقت');

  elements.resNameP1.innerText = `أنت (${myData.name || currentUsername || 'أنت'})`;
  elements.resNameP2.innerText = `${oppData.name || 'الخصم'}`;
  elements.colTitleP1.innerText = `أنت (${myData.name || currentUsername || 'أنت'})`;
  elements.colTitleP2.innerText = `${oppData.name || 'الخصم'}`;

  // بادجات الفائز
  if (isMeWinner) {
    elements.badgeP1.innerText = '🏆 سلمت أولاً (الفائز)';
    elements.badgeP1.className = 'p-badge winner-badge';
    elements.badgeP2.innerText = 'تم قفل الجولة عليه';
    elements.badgeP2.className = 'p-badge second-badge';
  } else if (!isTimeUp && room.winner) {
    elements.badgeP1.innerText = 'تم قفل الجولة عليك';
    elements.badgeP1.className = 'p-badge second-badge';
    elements.badgeP2.innerText = '🏆 سلم أولاً (الفائز)';
    elements.badgeP2.className = 'p-badge winner-badge';
  } else {
    elements.badgeP1.innerText = '⏰ انتهى الوقت';
    elements.badgeP2.innerText = '⏰ انتهى الوقت';
  }

  // ملء الجدول
  CATEGORIES.forEach(cat => {
    const myAns = (myFinalAnswers[cat] || '').trim();
    const oppAns = (oppFinalAnswers[cat] || '').trim();

    const elMy = document.getElementById(`res-p1-${cat}`);
    const elOpp = document.getElementById(`res-p2-${cat}`);

    if (elMy) {
      if (myAns.length > 0) {
        elMy.innerText = myAns;
        elMy.className = 'ans-box ans-p1';
      } else {
        elMy.innerText = '— فارغ';
        elMy.className = 'ans-box empty';
      }
    }

    if (elOpp) {
      if (oppAns.length > 0) {
        elOpp.innerText = oppAns;
        elOpp.className = 'ans-box ans-p2';
      } else {
        elOpp.innerText = '— فارغ';
        elOpp.className = 'ans-box empty';
      }
    }
  });

  // إعلان النتيجة والاحتفال
  if (isMeWinner) {
    elements.winnerAnnouncement.innerText = `🎉 ألف مبروك يا ${currentUsername}!`;
    elements.winnerSubtitle.innerText = 'سلمتي أولاً وأغلقتي الجولة وحسمتي الفوز! 🏆✨';
    elements.winnerCrown.innerText = '👑💖';

    if (typeof confetti === 'function') {
      confetti({ particleCount: 130, spread: 85, origin: { y: 0.6 } });
    }
  } else if (!isTimeUp && room.winner) {
    const oppWinnerName = oppData.name || 'الخصم';
    elements.winnerAnnouncement.innerText = `👏 الفائز: ${oppWinnerName}`;
    elements.winnerSubtitle.innerText = `${oppWinnerName} سلم قبلك وقفل الجولة! 💕`;
    elements.winnerCrown.innerText = '🌸🥈';
  } else {
    elements.winnerAnnouncement.innerText = '⏰ انتهى الوقت!';
    elements.winnerSubtitle.innerText = 'جولة سريعة ومثيرة، حان وقت تقييم الإجابات!';
    elements.winnerCrown.innerText = '⏱️';
  }

  showScreen(elements.resultsScreen);
}

// جولة جديدة
async function handleNextRound() {
  if (!currentRoomId) return;

  elements.btnNextRound.disabled = true;
  elements.btnNextRound.innerText = '⏳ جاري التجهيز...';

  const nextLetter = ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)];

  try {
    const roomSnap = await get(ref(db, `rooms/${currentRoomId}`));
    const room = roomSnap.val();
    const p1Name = room?.player1?.name || currentUsername;
    const p2Name = room?.player2?.name || 'الخصم';

    await update(ref(db, `rooms/${currentRoomId}`), {
      status: 'playing',
      currentLetter: nextLetter,
      startedAt: Date.now(),
      submittedBy: null,
      winner: null,
      player1: {
        name: p1Name,
        answers: { human: '', animal: '', plant: '', item: '', country: '' },
        progressCount: 0,
        submitted: false
      },
      player2: {
        name: p2Name,
        answers: { human: '', animal: '', plant: '', item: '', country: '' },
        progressCount: 0,
        submitted: false
      }
    });
  } catch (err) {
    console.error("Error starting next round:", err);
  } finally {
    elements.btnNextRound.disabled = false;
    elements.btnNextRound.innerText = '🔄 جولة جديدة بحرف آخر 🎀';
  }
}

// =========================================================
// 8. ربط الأحداث مع دعم شاشات اللمس (iPad Touch Events)
// =========================================================

function setupEventListeners() {
  // دعم الضغط واللمس المباشر في iPad
  elements.btnLogin.addEventListener('click', handleLogin);
  elements.loginUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  elements.btnLogout.addEventListener('click', handleLogout);

  elements.btnCreateRoom.addEventListener('click', handleCreateRoom);
  elements.btnJoinRoom.addEventListener('click', () => handleJoinRoom());
  elements.roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleJoinRoom();
  });

  elements.btnCopyLink.addEventListener('click', () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        elements.btnCopyLink.innerText = '✅';
        setTimeout(() => elements.btnCopyLink.innerText = '💌', 2000);
      });
    } else {
      prompt("انسخي رابط الغرفة من هنا:", inviteUrl);
    }
  });

  elements.btnStartGame.addEventListener('click', handleStartGameClick);

  CATEGORIES.forEach(cat => {
    if (elements.inputs[cat]) {
      elements.inputs[cat].addEventListener('input', () => handleInputChange(cat));
      elements.inputs[cat].addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const nextIndex = (CATEGORIES.indexOf(cat) + 1) % CATEGORIES.length;
          elements.inputs[CATEGORIES[nextIndex]]?.focus();
        }
      });
    }
  });

  elements.btnSubmit.addEventListener('click', () => submitAnswers(false));

  elements.btnNextRound.addEventListener('click', handleNextRound);
  elements.btnLeaveRoom.addEventListener('click', () => {
    if (currentRoomRef) off(currentRoomRef);
    goToLobby();
  });
}

function initApp() {
  if (currentUsername) {
    goToLobby();
  } else {
    showScreen(elements.authScreen);
  }
}

setupEventListeners();
initApp();
