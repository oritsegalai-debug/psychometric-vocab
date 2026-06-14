// ─── STATE ───────────────────────────────────────────
const S = {
  known: {}, starred: {}, leitner: {},
  quizDir: 'enHe', quizLen: 20, quizOnlyStarred: false,
  fcDir: 'enHe', fcOnlyStarred: false,
  darkMode: false,
  listFilter: 'all', listSearch: '',
};
function save() { localStorage.setItem('pv', JSON.stringify(S)); }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('pv') || '{}');
    Object.assign(S, d);
  } catch(e) {}
}
load();

// ─── THEME ───────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.darkMode ? 'dark' : 'light');
}
applyTheme();

// ─── HELPERS ─────────────────────────────────────────
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getPool(onlyStarred) {
  return onlyStarred
    ? WORDS.filter(w => S.starred[w.en])
    : WORDS;
}
function leitnerSort(pool) {
  const unknown = pool.filter(w => !S.known[w.en]);
  const known   = pool.filter(w =>  S.known[w.en]);
  return [...shuffle(unknown), ...shuffle(known)];
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}
function totalKnown() { return Object.keys(S.known).filter(k => S.known[k]).length; }
function totalStarred() { return Object.keys(S.starred).filter(k => S.starred[k]).length; }

// ─── TABS ─────────────────────────────────────────────
const tabs = ['fc', 'quiz', 'type', 'list', 'progress'];
function switchTab(id) {
  tabs.forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === id);
    document.getElementById('view-' + t).classList.toggle('active', t === id);
  });
  if (id === 'fc') initFC();
  if (id === 'quiz') initQuiz();
  if (id === 'type') initType();
  if (id === 'list') renderList();
  if (id === 'progress') renderProgress();
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─── FLASHCARDS ──────────────────────────────────────
let fcPool = [], fcIdx = 0, fcFlipped = false;

function initFC() {
  fcPool = leitnerSort(getPool(S.fcOnlyStarred));
  fcIdx = 0; fcFlipped = false;
  renderFC();
}

function renderFC() {
  if (!fcPool.length) {
    document.getElementById('fc-empty').style.display = 'block';
    document.getElementById('fc-main').style.display = 'none';
    return;
  }
  document.getElementById('fc-empty').style.display = 'none';
  document.getElementById('fc-main').style.display = 'block';
  const w = fcPool[fcIdx];
  const isEnHe = S.fcDir === 'enHe';
  const front = isEnHe ? w.en : w.he;
  const back  = isEnHe ? w.he : w.en;
  const frontLang = isEnHe ? 'אנגלית' : 'עברית';
  const backLang  = isEnHe ? 'עברית'  : 'אנגלית';

  document.getElementById('fc-front-lang').textContent = frontLang;
  document.getElementById('fc-back-lang').textContent  = backLang;
  const fw = document.getElementById('fc-front-word');
  const bw = document.getElementById('fc-back-word');
  fw.textContent = front;
  bw.textContent = back;
  fw.className = 'fc-word' + (isEnHe ? ' en' : '');
  bw.className = 'fc-word' + (!isEnHe ? ' en' : '');

  // star
  const star = document.getElementById('fc-star');
  star.textContent = S.starred[w.en] ? '⭐' : '☆';

  // flip state
  const card = document.getElementById('fc-card');
  fcFlipped = false;
  card.classList.remove('flipped');

  // counter & progress
  document.getElementById('fc-counter').textContent = `${fcIdx + 1} / ${fcPool.length}`;
  document.getElementById('fc-prog-fill').style.width = `${((fcIdx + 1) / fcPool.length) * 100}%`;
}

function fcFlip() {
  fcFlipped = !fcFlipped;
  document.getElementById('fc-card').classList.toggle('flipped', fcFlipped);
}

function fcAnswer(knew) {
  const w = fcPool[fcIdx];
  S.known[w.en] = knew;
  save();
  fcIdx = (fcIdx + 1) % fcPool.length;
  if (fcIdx === 0) {
    showToast('סיימת סיבוב! ממשיך...');
    fcPool = leitnerSort(getPool(S.fcOnlyStarred));
  }
  renderFC();
}

function fcNav(dir) {
  fcIdx = Math.max(0, Math.min(fcPool.length - 1, fcIdx + dir));
  renderFC();
}

function toggleFCStar() {
  const w = fcPool[fcIdx];
  S.starred[w.en] = !S.starred[w.en];
  save();
  document.getElementById('fc-star').textContent = S.starred[w.en] ? '⭐' : '☆';
  showToast(S.starred[w.en] ? 'נוסף למועדפים ⭐' : 'הוסר מהמועדפים');
}

function toggleFCDir() {
  S.fcDir = S.fcDir === 'enHe' ? 'heEn' : 'enHe';
  save();
  const label = document.getElementById('fc-dir-label');
  label.textContent = S.fcDir === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
  renderFC();
}

// swipe support
let fcTouchX = null;
document.getElementById('fc-arena').addEventListener('touchstart', e => { fcTouchX = e.touches[0].clientX; }, {passive: true});
document.getElementById('fc-arena').addEventListener('touchend', e => {
  if (fcTouchX === null) return;
  const dx = e.changedTouches[0].clientX - fcTouchX;
  fcTouchX = null;
  if (Math.abs(dx) < 40) { fcFlip(); return; }
  if (dx < -40) fcNav(1);  // swipe left → next
  else fcNav(-1);           // swipe right → prev
}, {passive: true});
document.getElementById('fc-card').addEventListener('click', fcFlip);

// keyboard
document.addEventListener('keydown', e => {
  const active = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (active === 'fc') {
    if (e.key === 'ArrowRight') fcNav(-1);
    if (e.key === 'ArrowLeft')  fcNav(1);
    if (e.key === ' ') { e.preventDefault(); fcFlip(); }
    if (e.key === 'y' || e.key === 'k') fcAnswer(true);
    if (e.key === 'n' || e.key === 'u') fcAnswer(false);
  }
});

// ─── QUIZ ─────────────────────────────────────────────
let qPool = [], qIdx = 0, qScore = 0, qAnswered = false;

function initQuiz() {
  const base = getPool(S.quizOnlyStarred);
  if (base.length < 4) { showToast('צריך לפחות 4 מילים'); return; }
  qPool = shuffle(base).slice(0, Math.min(S.quizLen, base.length));
  qIdx = 0; qScore = 0; qAnswered = false;
  document.getElementById('quiz-result').classList.remove('show');
  document.getElementById('quiz-body').style.display = 'block';
  document.getElementById('quiz-next').style.display = 'none';
  renderQuiz();
}

function renderQuiz() {
  const total = qPool.length;
  document.getElementById('q-prog-fill').style.width = `${(qIdx / total) * 100}%`;
  document.getElementById('q-score').textContent = qScore;
  document.getElementById('q-total').textContent = total;
  document.getElementById('q-num').textContent = `שאלה ${qIdx + 1}/${total}`;

  const w = qPool[qIdx];
  const isEnHe = S.quizDir === 'enHe';
  document.getElementById('quiz-question').textContent = isEnHe ? w.en : w.he;
  document.getElementById('quiz-question').className = 'quiz-question' + (isEnHe ? ' en' : '');
  document.getElementById('quiz-q-label').textContent = isEnHe ? 'מה המשמעות בעברית?' : 'מה המשמעות באנגלית?';

  // 4 options: correct + 3 random others
  const correct = isEnHe ? w.he : w.en;
  const others = shuffle(WORDS.filter(x => x.en !== w.en))
    .slice(0, 3)
    .map(x => isEnHe ? x.he : x.en);
  const options = shuffle([correct, ...others]);

  const container = document.getElementById('quiz-options');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.dataset.val = opt;
    btn.dataset.correct = (opt === correct).toString();
    btn.addEventListener('click', () => checkQuiz(btn, correct));
    container.appendChild(btn);
  });
  qAnswered = false;
  document.getElementById('quiz-next').style.display = 'none';
}

function checkQuiz(btn, correct) {
  if (qAnswered) return;
  qAnswered = true;
  const isCorrect = btn.dataset.correct === 'true';
  if (isCorrect) { btn.classList.add('correct'); qScore++; }
  else { btn.classList.add('wrong'); }
  // show correct
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
  });
  // mark as known/unknown
  const w = qPool[qIdx];
  S.known[w.en] = isCorrect;
  save();
  document.getElementById('quiz-next').style.display = 'block';
  document.getElementById('q-score').textContent = qScore;
}

function quizNext() {
  qIdx++;
  if (qIdx >= qPool.length) {
    showQuizResult();
  } else {
    renderQuiz();
  }
}

function showQuizResult() {
  document.getElementById('quiz-body').style.display = 'none';
  const res = document.getElementById('quiz-result');
  res.classList.add('show');
  const pct = Math.round((qScore / qPool.length) * 100);
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : pct >= 40 ? '😅' : '💪';
  res.querySelector('.result-emoji').textContent = emoji;
  res.querySelector('.result-score').textContent = `${qScore} / ${qPool.length}`;
  res.querySelector('.result-detail').textContent = `${pct}% — ${pct >= 80 ? 'מצוין!' : pct >= 60 ? 'כל הכבוד!' : 'תמשיך/י להתאמן!'}`;
}

function toggleQuizDir() {
  S.quizDir = S.quizDir === 'enHe' ? 'heEn' : 'enHe';
  save();
  document.getElementById('quiz-dir-btn').textContent = S.quizDir === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
  initQuiz();
}

// ─── TYPE MODE ────────────────────────────────────────
let typePool = [], typeIdx = 0, typeChecked = false;

function initType() {
  typePool = leitnerSort(WORDS);
  typeIdx = 0; typeChecked = false;
  renderType();
}

function renderType() {
  const w = typePool[typeIdx];
  document.getElementById('type-word').textContent = w.en;
  document.getElementById('type-input').value = '';
  document.getElementById('type-input').className = 'type-input';
  document.getElementById('type-feedback').textContent = '';
  document.getElementById('type-feedback').className = 'type-feedback';
  document.getElementById('type-check-btn').textContent = 'בדוק';
  typeChecked = false;
  document.getElementById('type-counter').textContent = `${typeIdx + 1} / ${typePool.length}`;
  document.getElementById('type-input').focus();
}

function checkType() {
  if (typeChecked) { typeNext(); return; }
  const w = typePool[typeIdx];
  const ans = document.getElementById('type-input').value.trim();
  const accepted = w.he.split(',').map(s => s.trim().toLowerCase());
  const clean = ans.toLowerCase();
  const ok = accepted.some(a => a === clean || a.includes(clean) || clean.includes(a.split(' ')[0]));
  const inp = document.getElementById('type-input');
  const fb  = document.getElementById('type-feedback');
  inp.className = 'type-input ' + (ok ? 'correct' : 'wrong');
  fb.className = 'type-feedback ' + (ok ? 'ok' : 'bad');
  fb.textContent = ok ? '✓ נכון!' : `✗ ${w.he}`;
  S.known[w.en] = ok;
  save();
  typeChecked = true;
  document.getElementById('type-check-btn').textContent = 'הבא →';
}

function typeNext() {
  typeIdx = (typeIdx + 1) % typePool.length;
  if (typeIdx === 0) {
    typePool = leitnerSort(WORDS);
    showToast('סיבוב חדש!');
  }
  renderType();
}

// enter key
document.getElementById('type-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkType();
});

// ─── LIST / SEARCH ────────────────────────────────────
function renderList() {
  const q = S.listSearch.toLowerCase();
  const filter = S.listFilter;
  let words = WORDS;
  if (q) words = words.filter(w => w.en.toLowerCase().includes(q) || w.he.includes(q));
  if (filter === 'starred') words = words.filter(w => S.starred[w.en]);
  if (filter === 'known')   words = words.filter(w => S.known[w.en]);
  if (filter === 'unknown') words = words.filter(w => !S.known[w.en]);

  document.getElementById('list-count').textContent = `${words.length} מילים`;
  const ul = document.getElementById('word-list');
  ul.innerHTML = '';
  words.forEach(w => {
    const div = document.createElement('div');
    div.className = 'word-item';
    const star = S.starred[w.en] ? '⭐' : '☆';
    const status = S.known[w.en] !== undefined
      ? (S.known[w.en] ? '<span class="wi-status knew">ידוע</span>' : '')
      : '';
    div.innerHTML = `
      <button class="wi-star ${S.starred[w.en] ? 'starred' : ''}" data-en="${w.en}">${star}</button>
      <span class="wi-en">${w.en}</span>
      <span class="wi-he">${w.he}</span>
      ${status}`;
    ul.appendChild(div);
  });
  ul.querySelectorAll('.wi-star').forEach(btn => {
    btn.addEventListener('click', () => {
      const en = btn.dataset.en;
      S.starred[en] = !S.starred[en];
      save();
      btn.textContent = S.starred[en] ? '⭐' : '☆';
      btn.className = 'wi-star' + (S.starred[en] ? ' starred' : '');
      showToast(S.starred[en] ? '⭐ נוסף' : 'הוסר');
    });
  });
}

document.getElementById('list-search').addEventListener('input', e => {
  S.listSearch = e.target.value;
  renderList();
});
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    S.listFilter = btn.dataset.f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderList();
  });
});

// ─── PROGRESS ────────────────────────────────────────
function renderProgress() {
  const total = WORDS.length;
  const known = totalKnown();
  const starred = totalStarred();
  const unknown = total - known;
  const pct = Math.round((known / total) * 100);

  document.getElementById('prog-pct').textContent = pct + '%';
  document.getElementById('prog-known-fill').style.width = `${(known / total) * 100}%`;
  document.getElementById('prog-unk-fill').style.width = `${(unknown / total) * 100}%`;
  document.getElementById('prog-star-fill').style.width = `${(starred / total) * 100}%`;
  document.getElementById('prog-known-num').textContent = known;
  document.getElementById('prog-unk-num').textContent = unknown;
  document.getElementById('prog-star-num').textContent = starred;
}

function resetProgress() {
  if (!confirm('לאפס את כל ההתקדמות?')) return;
  Object.keys(S.known).forEach(k => delete S.known[k]);
  save();
  renderProgress();
  showToast('ההתקדמות אופסה');
}

// ─── SETTINGS ────────────────────────────────────────
function openSettings() {
  document.getElementById('settings-modal').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}
document.getElementById('settings-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('settings-modal')) closeSettings();
});

document.getElementById('dark-toggle').classList.toggle('on', S.darkMode);
document.getElementById('dark-toggle').addEventListener('click', () => {
  S.darkMode = !S.darkMode;
  document.getElementById('dark-toggle').classList.toggle('on', S.darkMode);
  applyTheme();
  save();
});

document.getElementById('quiz-starred-toggle').classList.toggle('on', S.quizOnlyStarred);
document.getElementById('quiz-starred-toggle').addEventListener('click', () => {
  S.quizOnlyStarred = !S.quizOnlyStarred;
  document.getElementById('quiz-starred-toggle').classList.toggle('on', S.quizOnlyStarred);
  save();
});

document.getElementById('fc-starred-toggle').classList.toggle('on', S.fcOnlyStarred);
document.getElementById('fc-starred-toggle').addEventListener('click', () => {
  S.fcOnlyStarred = !S.fcOnlyStarred;
  document.getElementById('fc-starred-toggle').classList.toggle('on', S.fcOnlyStarred);
  save();
});

// ─── INIT ─────────────────────────────────────────────
// set initial toggle labels
document.getElementById('quiz-dir-btn').textContent = S.quizDir === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
document.getElementById('fc-dir-label').textContent  = S.fcDir === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
document.querySelector('[data-f="' + S.listFilter + '"]')?.classList.add('active');
initFC();
