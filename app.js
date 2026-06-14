// ─── STATE ───────────────────────────────────────────
const S = {
  known: {}, starred: {},
  quizDir: 'enHe', quizLen: 20,
  fcDir: 'enHe',
  fcGroup: 'all', quizGroup: 'all', typeGroup: 'all',
  darkMode: false,
  listFilter: 'all', listSearch: '',
};

function save() { localStorage.setItem('pv', JSON.stringify(S)); }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('pv') || '{}');
    Object.assign(S, d);
    // migrate old state keys
    if ('fcOnlyStarred' in S)   { S.fcGroup   = S.fcOnlyStarred   ? 'starred' : 'all'; delete S.fcOnlyStarred; }
    if ('quizOnlyStarred' in S) { S.quizGroup = S.quizOnlyStarred ? 'starred' : 'all'; delete S.quizOnlyStarred; }
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

function getPoolByGroup(group) {
  if (group === 'starred') return WORDS.filter(w => S.starred[w.en]);
  if (group === 'unknown') return WORDS.filter(w => S.known[w.en] === false);
  return WORDS;
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
  setTimeout(() => t.classList.remove('show'), 2000);
}

function totalKnown()   { return WORDS.filter(w => S.known[w.en] === true).length; }
function totalUnknown() { return WORDS.filter(w => S.known[w.en] === false).length; }
function totalStarred() { return WORDS.filter(w => S.starred[w.en]).length; }

// ─── GROUP CHIP COUNTS ────────────────────────────────
function updateGroupChips(mode) {
  const starCount = totalStarred();
  const unkCount  = totalUnknown();
  const group = S[mode + 'Group'];

  document.querySelectorAll('#' + mode + '-groups .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.g === group);
  });
  const sc = document.getElementById(mode + '-g-star-c');
  const uc = document.getElementById(mode + '-g-unk-c');
  if (sc) sc.textContent = starCount ? ` (${starCount})` : '';
  if (uc) uc.textContent = unkCount  ? ` (${unkCount})` : '';
}

// ─── TABS ─────────────────────────────────────────────
const tabs = ['fc', 'quiz', 'type', 'list', 'progress'];
function switchTab(id) {
  tabs.forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === id);
    document.getElementById('view-' + t).classList.toggle('active', t === id);
  });
  if (id === 'fc')       initFC();
  if (id === 'quiz')     initQuiz();
  if (id === 'type')     initType();
  if (id === 'list')     renderList();
  if (id === 'progress') renderProgress();
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─── FLASHCARDS ──────────────────────────────────────
let fcPool = [], fcIdx = 0, fcFlipped = false;
let fcCustomPool = null; // set when "תרגל קבוצה זו" is clicked from list

function setFCGroup(group) {
  S.fcGroup = group;
  fcCustomPool = null;
  save();
  initFC();
}

function initFC() {
  const pool = fcCustomPool !== null ? fcCustomPool : getPoolByGroup(S.fcGroup);
  fcPool = leitnerSort(pool);
  fcIdx = 0; fcFlipped = false;
  if (fcCustomPool === null) updateGroupChips('fc');
  else {
    // custom pool — deselect all group chips
    document.querySelectorAll('#fc-groups .filter-btn').forEach(b => b.classList.remove('active'));
  }
  renderFC();
}

function renderFC() {
  const emptyEl = document.getElementById('fc-empty');
  const mainEl  = document.getElementById('fc-main');
  if (!fcPool.length) {
    const group = fcCustomPool ? 'custom' : S.fcGroup;
    emptyEl.textContent =
      group === 'starred' ? 'אין מועדפים. הוסף ⭐ לכרטיסיות.' :
      group === 'unknown' ? 'אין מילים לא ידועות. סמן "לא ידעתי" בתרגול.' :
      'אין מילים להצגה.';
    emptyEl.style.display = 'block';
    mainEl.style.display  = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  mainEl.style.display  = 'block';

  const w = fcPool[fcIdx];
  const isEnHe = S.fcDir === 'enHe';
  const front = isEnHe ? w.en : w.he;
  const back  = isEnHe ? w.he : w.en;
  document.getElementById('fc-front-lang').textContent = isEnHe ? 'אנגלית' : 'עברית';
  document.getElementById('fc-back-lang').textContent  = isEnHe ? 'עברית'  : 'אנגלית';
  const fw = document.getElementById('fc-front-word');
  const bw = document.getElementById('fc-back-word');
  fw.textContent = front;
  bw.textContent = back;
  fw.className = 'fc-word' + (isEnHe ? ' en' : '');
  bw.className = 'fc-word' + (!isEnHe ? ' en' : '');

  document.getElementById('fc-star').textContent = S.starred[w.en] ? '⭐' : '☆';
  const card = document.getElementById('fc-card');
  fcFlipped = false;
  card.classList.remove('flipped');
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
    const pool = fcCustomPool !== null ? fcCustomPool : getPoolByGroup(S.fcGroup);
    fcPool = leitnerSort(pool);
  }
  // refresh group chip counts (known/unknown changed)
  if (fcCustomPool === null) updateGroupChips('fc');
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
  updateGroupChips('fc');
}

function toggleFCDir() {
  S.fcDir = S.fcDir === 'enHe' ? 'heEn' : 'enHe';
  save();
  document.getElementById('fc-dir-label').textContent = S.fcDir === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
  renderFC();
}

// swipe
let fcTouchX = null;
document.getElementById('fc-arena').addEventListener('touchstart', e => { fcTouchX = e.touches[0].clientX; }, {passive: true});
document.getElementById('fc-arena').addEventListener('touchend', e => {
  if (fcTouchX === null) return;
  const dx = e.changedTouches[0].clientX - fcTouchX;
  fcTouchX = null;
  if (Math.abs(dx) < 40) { fcFlip(); return; }
  if (dx < -40) fcNav(1);
  else fcNav(-1);
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

function setQuizGroup(group) {
  S.quizGroup = group;
  save();
  updateGroupChips('quiz');
  initQuiz();
}

function initQuiz() {
  updateGroupChips('quiz');
  const base = getPoolByGroup(S.quizGroup);
  if (base.length < 4) {
    const msg = S.quizGroup === 'unknown' ? 'צריך לסמן לפחות 4 מילים כ"לא ידעתי"' :
                S.quizGroup === 'starred' ? 'צריך לפחות 4 מועדפים' : 'צריך לפחות 4 מילים';
    showToast(msg);
    return;
  }
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

  const correct = isEnHe ? w.he : w.en;
  const others = shuffle(WORDS.filter(x => x.en !== w.en)).slice(0, 3).map(x => isEnHe ? x.he : x.en);
  const options = shuffle([correct, ...others]);

  const container = document.getElementById('quiz-options');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
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
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
  });
  const w = qPool[qIdx];
  S.known[w.en] = isCorrect;
  save();
  updateGroupChips('quiz');
  document.getElementById('quiz-next').style.display = 'block';
  document.getElementById('q-score').textContent = qScore;
}

function quizNext() {
  qIdx++;
  if (qIdx >= qPool.length) showQuizResult();
  else renderQuiz();
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

function setTypeGroup(group) {
  S.typeGroup = group;
  save();
  updateGroupChips('type');
  initType();
}

function initType() {
  updateGroupChips('type');
  const base = getPoolByGroup(S.typeGroup);
  if (!base.length) {
    showToast(S.typeGroup === 'unknown' ? 'אין מילים לא ידועות עדיין' : 'אין מועדפים');
    return;
  }
  typePool = leitnerSort(base);
  typeIdx = 0; typeChecked = false;
  renderType();
}

function renderType() {
  if (!typePool.length) return;
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
  if (!ans) return;
  const accepted = w.he.split(',').map(s => s.trim().toLowerCase());
  const clean = ans.toLowerCase();
  const ok = accepted.some(a => a === clean || a.includes(clean) || clean.includes(a.split(' ')[0]));
  document.getElementById('type-input').className = 'type-input ' + (ok ? 'correct' : 'wrong');
  const fb = document.getElementById('type-feedback');
  fb.className = 'type-feedback ' + (ok ? 'ok' : 'bad');
  fb.textContent = ok ? '✓ נכון!' : `✗ ${w.he}`;
  S.known[w.en] = ok;
  save();
  typeChecked = true;
  document.getElementById('type-check-btn').textContent = 'הבא →';
  updateGroupChips('type');
}

function typeNext() {
  typeIdx = (typeIdx + 1) % typePool.length;
  if (typeIdx === 0) {
    typePool = leitnerSort(getPoolByGroup(S.typeGroup));
    showToast('סיבוב חדש!');
  }
  renderType();
}

document.getElementById('type-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkType();
});

// ─── LIST / SEARCH ────────────────────────────────────
let selectMode = false;
const selectedWords = new Set();

function getFilteredWords() {
  const q = S.listSearch.toLowerCase();
  const filter = S.listFilter;
  let words = WORDS;
  if (q) words = words.filter(w => w.en.toLowerCase().includes(q) || w.he.includes(q));
  if (filter === 'starred') words = words.filter(w => S.starred[w.en]);
  if (filter === 'known')   words = words.filter(w => S.known[w.en] === true);
  if (filter === 'unknown') words = words.filter(w => !S.known[w.en]);
  return words;
}

function toggleSelectMode() {
  selectMode = !selectMode;
  selectedWords.clear();
  document.getElementById('list-select-btn').textContent = selectMode ? 'בטל בחירה' : 'בחר';
  document.getElementById('list-select-actions').style.display = selectMode ? 'flex' : 'none';
  updateBulkBar();
  renderList();
}

function toggleSelectAll() {
  const filtered = getFilteredWords();
  if (selectedWords.size >= filtered.length) {
    selectedWords.clear();
  } else {
    filtered.forEach(w => selectedWords.add(w.en));
  }
  updateBulkBar();
  renderList();
}

function toggleWordSelect(en) {
  if (selectedWords.has(en)) selectedWords.delete(en);
  else selectedWords.add(en);
  updateBulkBar();
  const item = document.querySelector(`.word-item[data-en="${CSS.escape(en)}"]`);
  if (item) {
    item.classList.toggle('selected', selectedWords.has(en));
    const cb = item.querySelector('.wi-check');
    if (cb) cb.checked = selectedWords.has(en);
  }
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (selectMode && selectedWords.size > 0) {
    bar.classList.add('show');
    document.getElementById('bulk-count').textContent = `${selectedWords.size} נבחרו`;
  } else {
    bar.classList.remove('show');
  }
}

function bulkAction(action) {
  const count = selectedWords.size;
  if (!count) return;
  selectedWords.forEach(en => {
    if (action === 'star')    S.starred[en] = true;
    if (action === 'unstar')  delete S.starred[en];
    if (action === 'known')   S.known[en] = true;
    if (action === 'unknown') S.known[en] = false;
  });
  save();
  selectedWords.clear();
  updateBulkBar();
  renderList();
  const msgs = {
    star:    `⭐ ${count} מילים נוספו למועדפים`,
    unstar:  `☆ ${count} מילים הוסרו ממועדפים`,
    known:   `✓ ${count} מילים סומנו כידועות`,
    unknown: `✗ ${count} מילים סומנו כ"לא ידעתי"`,
  };
  showToast(msgs[action]);
  // refresh group chip counts everywhere
  updateGroupChips('fc');
  updateGroupChips('quiz');
  updateGroupChips('type');
}

function practiceGroup() {
  const words = getFilteredWords();
  if (words.length === 0) { showToast('אין מילים לתרגול'); return; }
  fcCustomPool = [...words];
  switchTab('fc');
  showToast(`מתרגל ${words.length} מילים`);
}

function renderList() {
  const words = getFilteredWords();
  document.getElementById('list-count').textContent = `${words.length} מילים`;

  // Show/hide "practice" button
  const practBtn = document.getElementById('practice-group-btn');
  const canPractice = S.listFilter !== 'all' || S.listSearch.length > 0;
  practBtn.style.display = (canPractice && words.length > 0) ? 'block' : 'none';

  // Select-all button label
  const selAllBtn = document.getElementById('select-all-btn');
  if (selAllBtn) {
    const allSelected = words.length > 0 && words.every(w => selectedWords.has(w.en));
    selAllBtn.textContent = allSelected ? 'בטל הכל' : 'סמן הכל';
  }

  const ul = document.getElementById('word-list');
  ul.innerHTML = '';
  words.forEach(w => {
    const div = document.createElement('div');
    div.className = 'word-item' + (selectedWords.has(w.en) ? ' selected' : '');
    div.dataset.en = w.en;

    const isStarred = S.starred[w.en];
    const knownVal  = S.known[w.en];
    const statusHtml = knownVal === true
      ? '<span class="wi-status knew">✓</span>'
      : knownVal === false
      ? '<span class="wi-status unk">✗</span>'
      : '';

    if (selectMode) {
      div.innerHTML = `
        <input type="checkbox" class="wi-check" ${selectedWords.has(w.en) ? 'checked' : ''}>
        <span class="wi-en">${w.en}</span>
        <span class="wi-he">${w.he}</span>
        ${statusHtml}`;
      div.querySelector('.wi-check').addEventListener('change', () => toggleWordSelect(w.en));
      div.addEventListener('click', e => {
        if (e.target.tagName !== 'INPUT') toggleWordSelect(w.en);
      });
    } else {
      div.innerHTML = `
        <button class="wi-star${isStarred ? ' starred' : ''}" data-en="${w.en}">${isStarred ? '⭐' : '☆'}</button>
        <span class="wi-en">${w.en}</span>
        <span class="wi-he">${w.he}</span>
        ${statusHtml}`;
      div.querySelector('.wi-star').addEventListener('click', e => {
        e.stopPropagation();
        const en = e.currentTarget.dataset.en;
        S.starred[en] = !S.starred[en];
        if (!S.starred[en]) delete S.starred[en];
        save();
        e.currentTarget.textContent = S.starred[en] ? '⭐' : '☆';
        e.currentTarget.className = 'wi-star' + (S.starred[en] ? ' starred' : '');
        showToast(S.starred[en] ? '⭐ נוסף' : 'הוסר');
        updateGroupChips('fc'); updateGroupChips('quiz'); updateGroupChips('type');
      });
    }
    ul.appendChild(div);
  });
}

document.getElementById('list-search').addEventListener('input', e => {
  S.listSearch = e.target.value;
  renderList();
});
document.querySelectorAll('.filter-btn[data-f]').forEach(btn => {
  btn.addEventListener('click', () => {
    S.listFilter = btn.dataset.f;
    document.querySelectorAll('.filter-btn[data-f]').forEach(b => b.classList.toggle('active', b === btn));
    renderList();
  });
});

// ─── PROGRESS ────────────────────────────────────────
function renderProgress() {
  const total   = WORDS.length;
  const known   = totalKnown();
  const unknown = totalUnknown();
  const starred = totalStarred();
  const unseen  = total - known - unknown;
  const pct     = Math.round((known / total) * 100);

  document.getElementById('prog-pct').textContent = pct + '%';
  document.getElementById('prog-known-fill').style.width  = `${(known / total) * 100}%`;
  document.getElementById('prog-unk-fill').style.width    = `${(unknown / total) * 100}%`;
  document.getElementById('prog-unseen-fill').style.width = `${(unseen / total) * 100}%`;
  document.getElementById('prog-star-fill').style.width   = `${(starred / total) * 100}%`;
  document.getElementById('prog-known-num').textContent   = known;
  document.getElementById('prog-unk-num').textContent     = unknown;
  document.getElementById('prog-unseen-num').textContent  = unseen;
  document.getElementById('prog-star-num').textContent    = starred;
}

function resetProgress() {
  if (!confirm('לאפס את כל ההתקדמות?')) return;
  WORDS.forEach(w => { delete S.known[w.en]; });
  save();
  renderProgress();
  showToast('ההתקדמות אופסה');
  updateGroupChips('fc'); updateGroupChips('quiz'); updateGroupChips('type');
}

// ─── SETTINGS ────────────────────────────────────────
function openSettings() { document.getElementById('settings-modal').classList.add('open'); }
function closeSettings() { document.getElementById('settings-modal').classList.remove('open'); }
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

// ─── INIT ─────────────────────────────────────────────
document.getElementById('quiz-dir-btn').textContent = S.quizDir === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
document.getElementById('fc-dir-label').textContent  = S.fcDir   === 'enHe' ? 'אנגלית → עברית' : 'עברית → אנגלית';
// Activate correct list filter button
document.querySelectorAll('.filter-btn[data-f]').forEach(b => b.classList.toggle('active', b.dataset.f === S.listFilter));
initFC();
