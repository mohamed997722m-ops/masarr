/* ========================================
   MASAR - مسار | Main App Logic
   ======================================== */

// ===== DATA =====
const FACULTIES = [
  'كلية الهندسة','كلية الطب البشري','كلية طب الأسنان','كلية الصيدلة',
  'كلية العلوم','كلية الآداب','كلية التجارة','كلية الحقوق',
  'كلية الزراعة','كلية التربية','كلية الطب البيطري','كلية الاقتصاد والعلوم السياسية',
  'كلية الإعلام','كلية الفنون الجميلة','كلية التربية الرياضية',
  'كلية الحاسبات والمعلومات','كلية الهندسة المعمارية','كلية التمريض',
  'كلية العلوم التطبيقية','كلية اللغات والترجمة'
];

const DEPTS = {
  'كلية الهندسة': ['هندسة مدنية','هندسة كهربائية','هندسة ميكانيكية','هندسة إلكترونيات وكهرباء اتصالات','هندسة كيميائية','هندسة الحاسبات'],
  'كلية الطب البشري': ['طب عام','جراحة','باطنة','أطفال','نساء وتوليد','أشعة','تخدير'],
  'كلية التجارة': ['محاسبة','إدارة أعمال','اقتصاد','إحصاء','تأمين','تجارة دولية'],
  'كلية الحاسبات والمعلومات': ['علوم الحاسب','نظم المعلومات','شبكات','ذكاء اصطناعي'],
  'كلية العلوم': ['رياضيات','فيزياء','كيمياء','أحياء','جيولوجيا'],
  'default': ['القسم الأول','القسم الثاني','القسم الثالث']
};

const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

const PRAYER_TIMES = {
  fajr:    [4,30],
  dhuhr:   [12,0],
  asr:     [15,30],
  maghrib: [18,15],
  isha:    [19,45]
};
const PRAYER_NAMES = { fajr:'الفجر', dhuhr:'الظهر', asr:'العصر', maghrib:'المغرب', isha:'العشاء' };

// ===== STATE =====
let userData = JSON.parse(localStorage.getItem('masar_user') || 'null');
let schedules = JSON.parse(localStorage.getItem('masar_schedules') || '[]');
let tasks = JSON.parse(localStorage.getItem('masar_tasks') || '[]');
let notes = JSON.parse(localStorage.getItem('masar_notes') || '[]');
let links = JSON.parse(localStorage.getItem('masar_links') || '[]');
let silentMode = localStorage.getItem('masar_silent') === 'true';
let isDark = localStorage.getItem('masar_dark') === 'true';
let currentStep = 1;
let selectedSchColor = '#1a237e';
let selectedNoteColor = '#e8eaf6';
let scheduleEditId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  if (userData) {
    launchApp();
  } else {
    document.getElementById('onboarding-screen').classList.add('active');
    initFacultyList();
  }
  startClock();
  scheduleDailyReminder();
  setupColorPickers();
});

// ── DATA STORAGE ─────────────────────────────────────────────────
// All data is saved locally on the device using localStorage.
// No data is sent to any server. Each device has its own independent data.
function save() {
  try {
    localStorage.setItem('masar_user',      JSON.stringify(userData));
    localStorage.setItem('masar_schedules', JSON.stringify(schedules));
    localStorage.setItem('masar_tasks',     JSON.stringify(tasks));
    localStorage.setItem('masar_notes',     JSON.stringify(notes));
    localStorage.setItem('masar_links',     JSON.stringify(links));
  } catch(e) {
    // Storage quota exceeded — notify user
    console.warn('Storage warning:', e);
  }
}

function exportData() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    userData, schedules, tasks, notes, links, attendance
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'masar-backup.json';
  a.click(); URL.revokeObjectURL(url);
  showToast('✅ تم تصدير البيانات بنجاح');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.userData)   { userData = data.userData; }
      if (data.schedules)  { schedules = data.schedules; }
      if (data.tasks)      { tasks = data.tasks; }
      if (data.notes)      { notes = data.notes; }
      if (data.links)      { links = data.links; }
      if (data.attendance) { attendance = data.attendance; localStorage.setItem('masar_attendance', JSON.stringify(attendance)); }
      save(); updateProfileDisplay(); renderHome(); renderLectures(); renderSections(); renderTasks(); renderNotes(); renderLinks();
      showToast('✅ تم استيراد البيانات بنجاح');
    } catch(err) { showToast('❌ الملف غير صالح'); }
  };
  reader.readAsText(file);
}

// ===== THEME =====
function applyTheme() {
  if (isDark) {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  const toggle = document.getElementById('dark-toggle');
  if (toggle) toggle.checked = isDark;
}

function toggleDark() {
  isDark = !isDark;
  localStorage.setItem('masar_dark', isDark);
  applyTheme();
}

// ===== CLOCK & DATES =====
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(checkPrayerTimes, 60000);
  setInterval(checkScheduleReminders, 60000);
  fetchRealPrayerTimes();
}

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  const timeEl = document.getElementById('time-display');
  if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;

  const miladiEl = document.getElementById('date-miladi');
  if (miladiEl) {
    miladiEl.textContent = now.toLocaleDateString('ar-EG', { year:'numeric', month:'2-digit', day:'2-digit' });
  }

  const hijriEl = document.getElementById('date-hijri');
  if (hijriEl) {
    try {
      hijriEl.textContent = now.toLocaleDateString('ar-SA-u-ca-islamic', { year:'numeric', month:'long', day:'numeric' });
    } catch(e) {
      hijriEl.textContent = getHijriDate(now);
    }
  }
  updateNextPrayer(now);
}

function getHijriDate(date) {
  try {
    return new Intl.DateTimeFormat('ar-TN-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  } catch(e) { return ''; }
}

// ===== REAL PRAYER TIMES FROM GPS =====
function fetchRealPrayerTimes() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const today = new Date();
      const d = today.getDate();
      const mo = today.getMonth() + 1;
      const y = today.getFullYear();
      const url = `https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${latitude}&longitude=${longitude}&method=5`;

      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data.code !== 200) return;
          const t = data.data.timings;
          const parse = str => { const [hh,mm] = str.split(':').map(Number); return [hh, mm]; };
          PRAYER_TIMES.fajr    = parse(t.Fajr);
          PRAYER_TIMES.dhuhr   = parse(t.Dhuhr);
          PRAYER_TIMES.asr     = parse(t.Asr);
          PRAYER_TIMES.maghrib = parse(t.Maghrib);
          PRAYER_TIMES.isha    = parse(t.Isha);
          // حفظ الأوقات في localStorage عشان تشتغل offline
          localStorage.setItem('masar_prayer', JSON.stringify(PRAYER_TIMES));
          updateNextPrayer(new Date());
        })
        .catch(() => loadSavedPrayerTimes());
    },
    () => loadSavedPrayerTimes(), // لو رفض الإذن خد المحفوظ
    { timeout: 8000, maximumAge: 3600000 } // كاش ساعة
  );
}

function loadSavedPrayerTimes() {
  const saved = localStorage.getItem('masar_prayer');
  if (saved) {
    try { Object.assign(PRAYER_TIMES, JSON.parse(saved)); } catch(e) {}
  }
}

function updateNextPrayer(now) {
  const totalMins = now.getHours() * 60 + now.getMinutes();
  let nextName = null, nextMins = null;
  const order = ['fajr','dhuhr','asr','maghrib','isha'];
  for (const p of order) {
    const t = PRAYER_TIMES[p];
    const pm = t[0]*60 + t[1];
    if (pm > totalMins) { nextName = p; nextMins = pm; break; }
  }
  if (!nextName) { nextName = 'fajr'; nextMins = PRAYER_TIMES.fajr[0]*60 + PRAYER_TIMES.fajr[1] + 1440; }
  const diff = nextMins - totalMins;
  const hh = Math.floor(diff/60), mm = diff%60;
  const nameEl = document.getElementById('next-prayer-name');
  const timeEl = document.getElementById('next-prayer-time');
  if (nameEl) nameEl.textContent = PRAYER_NAMES[nextName];
  if (timeEl) timeEl.textContent = `${hh > 0 ? hh+'س ' : ''}${mm}د`;
}

function checkPrayerTimes() {
  if (silentMode) return;
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  for (const [key, t] of Object.entries(PRAYER_TIMES)) {
    const pm = t[0]*60 + t[1];
    if (totalMins === pm) {
      showToast(`🕌 حان وقت صلاة ${PRAYER_NAMES[key]}`);
      playSound('prayer');
    }
  }
}

// ===== ONBOARDING =====
function initFacultyList() {
  showFacultyList();
}

function filterFaculties(val) {
  const list = document.getElementById('faculty-list');
  const filtered = val ? FACULTIES.filter(f => f.includes(val)) : FACULTIES;
  renderList(list, filtered, (item) => {
    document.getElementById('inp-faculty').value = item;
    list.classList.remove('open');
    loadDepts(item);
  });
  list.classList.toggle('open', filtered.length > 0);
}

function showFacultyList() {
  const val = document.getElementById('inp-faculty').value;
  filterFaculties(val);
}

function loadDepts(faculty) {
  const depts = DEPTS[faculty] || DEPTS['default'];
  const list = document.getElementById('dept-list');
  renderList(list, depts, (item) => {
    document.getElementById('inp-dept').value = item;
    list.classList.remove('open');
  });
}

function filterDepts(val) {
  const faculty = document.getElementById('inp-faculty').value;
  const all = DEPTS[faculty] || DEPTS['default'];
  const filtered = val ? all.filter(d => d.includes(val)) : all;
  const list = document.getElementById('dept-list');
  renderList(list, filtered, (item) => {
    document.getElementById('inp-dept').value = item;
    list.classList.remove('open');
  });
  list.classList.toggle('open', filtered.length > 0);
}

function showDeptList() {
  const val = document.getElementById('inp-dept').value;
  filterDepts(val || '');
}

function renderList(listEl, items, onClick) {
  listEl.innerHTML = items.map(item =>
    `<div class="autocomplete-item" onclick="(${onClick.toString()})('${item.replace(/'/g,"\\'")}')">
      ${item}
    </div>`
  ).join('');
}

function goStep(n) {
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.querySelectorAll('.dot')[currentStep-1].classList.remove('active');
  currentStep = n;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.querySelectorAll('.dot')[currentStep-1].classList.add('active');
}

function skipOnboard() {
  userData = { name:'', faculty:'', dept:'', age:'', phone:'', address:'', instagram:'' };
  save();
  launchApp();
}

function finishOnboard() {
  userData = {
    name: document.getElementById('inp-name').value || '',
    age:  document.getElementById('inp-age').value || '',
    faculty: document.getElementById('inp-faculty').value || '',
    dept:    document.getElementById('inp-dept').value || '',
    phone:   document.getElementById('inp-phone').value || '',
    address: document.getElementById('inp-address').value || '',
    instagram: document.getElementById('inp-instagram').value || ''
  };
  save();
  launchApp();
}

// ===== LAUNCH APP =====
function launchApp() {
  document.getElementById('onboarding-screen').classList.remove('active');
  const app = document.getElementById('app-screen');
  app.classList.add('active');
  app.style.display = 'block';

  updateProfileDisplay();
  renderHome();
  renderLectures();
  renderSections();
  renderTasks();
  renderNotes();
  renderLinks();

  if (silentMode) {
    document.getElementById('silent-btn').textContent = '🔕';
    document.getElementById('silent-btn').classList.add('silent');
  }
}

function updateProfileDisplay() {
  if (!userData) return;
  const initials = userData.name ? userData.name.split(' ').map(w=>w[0]).slice(0,2).join('') : '؟';
  const avatarEl = document.getElementById('avatar-initials');
  const profileLarge = document.getElementById('profile-avatar-large');
  if (avatarEl) avatarEl.textContent = initials;
  if (profileLarge) profileLarge.textContent = initials;

  const greet = document.getElementById('greeting-text');
  if (greet) greet.textContent = userData.name ? `أهلاً ${userData.name.split(' ')[0]} 👋` : 'أهلاً بك 👋';

  setText('pf-name', userData.name || '-');
  setText('pf-faculty', userData.faculty || '-');
  setText('pf-dept', userData.dept || '-');
  setText('pf-age', userData.age ? userData.age + ' سنة' : '-');
  setText('pf-phone', userData.phone || '-');
  setText('pf-address', userData.address || '-');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('active');
}

// ===== PAGES =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');

  // sidebar nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(`'${name}'`)) {
      n.classList.add('active');
    }
  });

  // bottom nav
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const bnavMap = { home:'bnav-home', lectures:'bnav-lectures', sections:'bnav-lectures', tasks:'bnav-tasks', notes:'bnav-notes', profile:'bnav-profile' };
  const bnavId = bnavMap[name];
  if (bnavId) { const el = document.getElementById(bnavId); if (el) el.classList.add('active'); }

  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== RENDER HOME =====
function renderHome() {
  const today = new Date().getDay();
  const todaySchedules = schedules.filter(s => parseInt(s.day) === today);
  const container = document.getElementById('today-schedule');

  if (todaySchedules.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>لا توجد محاضرات مسجّلة اليوم</p><button class="btn-add-small" onclick="showPage('lectures')">أضف محاضرة</button></div>`;
  } else {
    const sorted = todaySchedules.sort((a,b) => a.from.localeCompare(b.from));
    container.innerHTML = sorted.map(s => scheduleCardHTML(s, true)).join('');
  }

  // Today tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.due === todayStr && !t.done);
  const tasksEl = document.getElementById('today-tasks-list');
  tasksEl.innerHTML = todayTasks.length ? todayTasks.map(taskCardHTML).join('') : '<p style="color:var(--text3);font-size:0.85rem;margin-bottom:1rem;">لا توجد مهام مطلوبة اليوم</p>';

  // Notes preview
  const notesEl = document.getElementById('today-notes-list');
  notesEl.innerHTML = notes.slice(0,4).map(n =>
    `<div class="note-preview-chip" style="background:${n.color}">${n.title || 'ملاحظة'}</div>`
  ).join('') || '<p style="color:var(--text3);font-size:0.85rem;">لا توجد ملاحظات مضافة</p>';
}

// ===== SCHEDULE =====
function renderLectures() {
  const el = document.getElementById('lectures-list');
  const data = schedules.filter(s => s.type === 'lecture');
  el.innerHTML = data.length ? groupByDay(data) : emptyHTML('📚', 'لا توجد محاضرات مسجّلة', 'إضافة المحاضرة الأولى');
}

function renderSections() {
  const el = document.getElementById('sections-list');
  const data = schedules.filter(s => s.type === 'section');
  el.innerHTML = data.length ? groupByDay(data) : emptyHTML('📖', 'لا توجد سكاشن مسجّلة', 'إضافة أول سكشن');
}

function groupByDay(data) {
  const groups = {};
  data.forEach(s => {
    const d = DAYS[parseInt(s.day)] || 'غير محدد';
    if (!groups[d]) groups[d] = [];
    groups[d].push(s);
  });
  return Object.entries(groups).map(([day, items]) =>
    `<div style="margin-bottom:1rem"><div class="section-title">${day}</div>${items.sort((a,b)=>a.from.localeCompare(b.from)).map(s=>scheduleCardHTML(s)).join('')}</div>`
  ).join('');
}

function scheduleCardHTML(s, compact=false) {
  return `<div class="schedule-card" style="border-right-color:${s.color||'var(--accent)'}">
    <div class="sch-header">
      <div class="sch-subject">${s.subject}</div>
      <div class="sch-time">${s.from} - ${s.to}</div>
    </div>
    <div class="sch-doctor">👨‍🏫 ${s.doctor}</div>
    <div class="sch-place">📍 ${s.place}${s.building ? ' | ' + s.building : ''}</div>
    ${s.note ? `<div class="sch-note-text">📝 ${s.note}</div>` : ''}
    ${!compact ? `<button class="sch-delete" onclick="deleteSchedule('${s.id}')">✕</button>` : ''}
  </div>`;
}

function openAddScheduleModal(type) {
  document.getElementById('schedule-type').value = type;
  document.getElementById('modal-schedule-title').textContent = type === 'lecture' ? 'إضافة محاضرة' : 'إضافة سكشن';
  document.getElementById('modal-schedule').classList.add('open');
}

function saveSchedule() {
  const type  = document.getElementById('schedule-type').value;
  const subj  = document.getElementById('sch-subject').value.trim();
  const doc   = document.getElementById('sch-doctor').value.trim();
  const day   = document.getElementById('sch-day').value;
  const from  = document.getElementById('sch-from').value;
  const to    = document.getElementById('sch-to').value;
  const place = document.getElementById('sch-place').value.trim();
  const bldg  = document.getElementById('sch-building').value.trim();
  const note  = document.getElementById('sch-note').value.trim();

  if (!subj || !from || !to) { showToast('⚠️ يرجى إدخال اسم المادة والوقت'); return; }

  schedules.push({ id: genId(), type, subject: subj, doctor: doc, day, from, to, place, building: bldg, note, color: selectedSchColor, reminderTime: '' });
  save();
  closeModal('modal-schedule');
  clearForm(['sch-subject','sch-doctor','sch-from','sch-to','sch-place','sch-building','sch-note']);
  renderLectures(); renderSections(); renderHome();
  showToast('✅ تم الحفظ بنجاح');
  scheduleNotifications();
}

function deleteSchedule(id) {
  schedules = schedules.filter(s => s.id !== id);
  save(); renderLectures(); renderSections(); renderHome();
  showToast('🗑️ تم الحذف');
}

// ===== TASKS =====
function renderTasks() {
  const el = document.getElementById('tasks-list');
  if (!tasks.length) { el.innerHTML = emptyHTML('✅','لا توجد مهام','أضف أول تسكة لك'); return; }
  const sorted = [...tasks].sort((a,b) => {
    const p = { high:0, medium:1, low:2 };
    return (p[a.priority]||1) - (p[b.priority]||1);
  });
  el.innerHTML = sorted.map(taskCardHTML).join('');
}

function taskCardHTML(t) {
  const pLabel = { high:'عالية 🔴', medium:'متوسطة 🟡', low:'منخفضة 🟢' };
  return `<div class="task-card ${t.done ? 'done-card' : ''}" id="tc-${t.id}">
    <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}')"></div>
    <div class="task-content">
      <div class="task-title-text">${t.title}</div>
      <div class="task-meta">
        ${t.subject ? `📚 ${t.subject} · ` : ''}
        ${t.due ? `📅 ${t.due}` : ''}
        <span class="task-priority ${t.priority}">${pLabel[t.priority]||''}</span>
      </div>
      ${t.note ? `<div style="font-size:0.75rem;color:var(--text3);margin-top:3px;">${t.note}</div>` : ''}
    </div>
    <button class="task-del-btn" onclick="deleteTask('${t.id}')">✕</button>
  </div>`;
}

function openAddTaskModal() { document.getElementById('modal-task').classList.add('open'); }

function saveTask() {
  const title = document.getElementById('task-title').value.trim();
  if (!title) { showToast('⚠️ يرجى إدخال عنوان المهمة'); return; }
  tasks.push({
    id: genId(), title,
    subject: document.getElementById('task-subject').value.trim(),
    due:      document.getElementById('task-due').value,
    priority: document.getElementById('task-priority').value,
    note:     document.getElementById('task-note').value.trim(),
    done: false
  });
  save(); closeModal('modal-task');
  clearForm(['task-title','task-subject','task-due','task-note']);
  renderTasks(); renderHome(); showToast('✅ تم الحفظ بنجاح');
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); renderTasks(); renderHome(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save(); renderTasks(); renderHome(); showToast('🗑️ تم الحذف');
}

// ===== NOTES =====
function renderNotes() {
  const el = document.getElementById('notes-grid');
  el.innerHTML = notes.length ? notes.map(noteCardHTML).join('') : emptyHTML('📌','لا توجد ملاحظات مضافة','إضافة ملاحظة جديدة');
}

function noteCardHTML(n) {
  return `<div class="note-card" style="background:${n.color}">
    <button class="note-del-btn" onclick="deleteNote('${n.id}')">✕</button>
    <div class="note-card-title">${n.title || 'ملاحظة'}</div>
    <div class="note-card-body">${n.body || ''}</div>
  </div>`;
}

function openAddNoteModal() { document.getElementById('modal-note').classList.add('open'); }

function saveNote() {
  const title = document.getElementById('note-title').value.trim();
  notes.push({
    id: genId(),
    title,
    body: document.getElementById('note-body').value.trim(),
    color: selectedNoteColor
  });
  save(); closeModal('modal-note');
  clearForm(['note-title','note-body']);
  renderNotes(); renderHome(); showToast('✅ تم الحفظ بنجاح');
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  save(); renderNotes(); renderHome(); showToast('🗑️ تم الحذف');
}

// ===== LINKS =====
function renderLinks() {
  const el = document.getElementById('links-grid');
  el.innerHTML = links.length ? links.map(linkCardHTML).join('') : emptyHTML('🔗','لا توجد روابط مضافة','إضافة رابط سريع');
}

function linkCardHTML(l) {
  const iconMap = { 'instagram':'📸', 'facebook':'👍', 'youtube':'▶️', 'google':'🔍', 'university':'🏛️', 'default':'🌐' };
  let icon = iconMap.default;
  if (l.url.includes('instagram')) icon = iconMap.instagram;
  else if (l.url.includes('facebook')) icon = iconMap.facebook;
  else if (l.url.includes('youtube')) icon = iconMap.youtube;
  else if (l.url.includes('google')) icon = iconMap.google;

  return `<a class="link-card" href="${l.url}" target="_blank">
    <button class="link-del-btn" onclick="event.preventDefault();deleteLink('${l.id}')">✕</button>
    <div class="link-icon">${icon}</div>
    <div class="link-name">${l.name}</div>
  </a>`;
}

function openAddLinkModal() { document.getElementById('modal-link').classList.add('open'); }

function saveLink() {
  const name = document.getElementById('link-name').value.trim();
  const url  = document.getElementById('link-url').value.trim();
  if (!name || !url) { showToast('⚠️ يرجى إدخال الاسم والرابط'); return; }
  links.push({ id: genId(), name, url });
  save(); closeModal('modal-link');
  clearForm(['link-name','link-url']);
  renderLinks(); showToast('✅ تم الحفظ بنجاح');
}

function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  save(); renderLinks(); showToast('🗑️ تم الحذف');
}

// ===== PROFILE EDIT =====
function openEditProfile() {
  if (!userData) return;
  const name = prompt('الاسم:', userData.name || '');
  if (name !== null) userData.name = name;
  const faculty = prompt('الكلية:', userData.faculty || '');
  if (faculty !== null) userData.faculty = faculty;
  const dept = prompt('القسم:', userData.dept || '');
  if (dept !== null) userData.dept = dept;
  const phone = prompt('التليفون:', userData.phone || '');
  if (phone !== null) userData.phone = phone;
  save();
  updateProfileDisplay();
  showToast('✅ تم تحديث البيانات');
}

// ===== SILENT MODE =====
function toggleSilent() {
  silentMode = !silentMode;
  localStorage.setItem('masar_silent', silentMode);
  const btn = document.getElementById('silent-btn');
  btn.textContent = silentMode ? '🔕' : '🔔';
  btn.classList.toggle('silent', silentMode);
  showToast(silentMode ? '🔕 وضع الصمت مفعّل' : '🔔 الإشعارات مفعّلة');
}

// ===== NOTIFICATIONS =====
function scheduleNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleDailyReminder() {
  // Check every minute if it's 10 PM
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 22 && now.getMinutes() === 0) {
      sendDailySummary();
    }
  }, 60000);
}

function sendDailySummary() {
  if (silentMode) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDay();
  const tomorrowSchedules = schedules.filter(s => parseInt(s.day) === tomorrowDay);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowTasks = tasks.filter(t => t.due === tomorrowStr && !t.done);

  if (tomorrowSchedules.length || tomorrowTasks.length) {
    const msg = `🌙 تذكير: غداً عندك ${tomorrowSchedules.length} مواعيد و${tomorrowTasks.length} تسكات`;
    showToast(msg, 5000);
    if (Notification.permission === 'granted') {
      new Notification('مسار - تذكير بكرة', { body: msg, icon: '/favicon.ico' });
    }
    playSound('reminder');
  }
}



// ===== MODALS =====
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) ov.classList.remove('open');
  });
});

// ===== COLOR PICKERS =====
function setupColorPickers() {
  document.querySelectorAll('.color-picker').forEach(picker => {
    picker.querySelectorAll('.color-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        picker.querySelectorAll('.color-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        if (picker.id === 'sch-color-picker') selectedSchColor = opt.dataset.color;
        if (picker.id === 'note-color-picker') selectedNoteColor = opt.dataset.color;
      });
    });
  });
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, duration=3000) {
  const toast = document.getElementById('notification-toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== HELPERS =====
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }
function emptyHTML(icon, msg, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p><p style="font-size:0.78rem;color:var(--text3);margin-top:4px">${sub}</p></div>`;
}
function clearForm(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  }
});

// ===== CLOSE AUTOCOMPLETE ON OUTSIDE CLICK =====
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) {
    document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('open'));
  }
});

/* ================================================================
   STATS, ATTENDANCE, ACTIVITY GRID, SCORE, REMINDERS
   ================================================================ */

// ── ATTENDANCE DATA ──────────────────────────────────────────────
let attendance = JSON.parse(localStorage.getItem('masar_attendance') || '{}');
// attendance[dateStr][scheduleId] = 'present' | 'absent'

let termStart = localStorage.getItem('masar_term_start') || new Date().toISOString().split('T')[0];
let reminderTime = localStorage.getItem('masar_reminder_time') || '22:00';

function saveAttendance() {
  localStorage.setItem('masar_attendance', JSON.stringify(attendance));
}

// ── REMINDER TIME ────────────────────────────────────────────────
function openReminderTimeModal() {
  document.getElementById('reminder-time-input').value = reminderTime;
  document.getElementById('modal-reminder-time').classList.add('open');
}
function saveReminderTime() {
  reminderTime = document.getElementById('reminder-time-input').value;
  localStorage.setItem('masar_reminder_time', reminderTime);
  closeModal('modal-reminder-time');
  showToast('✅ تم حفظ وقت التذكير: ' + reminderTime);
  scheduleNightReminder();
}

// ── NIGHT REMINDER (checks every minute) ─────────────────────────
function scheduleNightReminder() {
  // already running via interval in scheduleDailyReminder
}

// Override the daily reminder check with user-set time
const _origSchedule = scheduleDailyReminder;
function scheduleDailyReminder() {
  setInterval(() => {
    const now = new Date();
    const [rh, rm] = reminderTime.split(':').map(Number);
    if (now.getHours() === rh && now.getMinutes() === rm) {
      sendDailySummary();
    }
  }, 60000);
}

// ── OPEN ATTENDANCE FOR TODAY ─────────────────────────────────────
function openAttendanceModal() {
  const today = new Date();
  const todayDay = today.getDay();
  const todayStr = today.toISOString().split('T')[0];
  const todaySchedules = schedules.filter(s => parseInt(s.day) === todayDay);

  const body = document.getElementById('attend-modal-body');
  const title = document.getElementById('attend-modal-title');
  title.textContent = '✅ تسجيل حضور ' + today.toLocaleDateString('ar-EG', {weekday:'long', day:'numeric', month:'long'});

  if (!todaySchedules.length) {
    body.innerHTML = `<div class="empty-state" style="padding:1.5rem"><div class="empty-icon">😴</div><p>لا توجد محاضرات مسجّلة اليوم</p></div>`;
  } else {
    if (!attendance[todayStr]) attendance[todayStr] = {};
    body.innerHTML = `<div class="attend-list">${todaySchedules.map(s => {
      const cur = attendance[todayStr][s.id] || '';
      return `<div class="attend-item">
        <div class="attend-info">
          <div class="attend-subject">${s.subject}</div>
          <div class="attend-meta">⏰ ${s.from} · 📍 ${s.place || ''}</div>
        </div>
        <div class="attend-btns">
          <button class="attend-btn present ${cur==='present'?'selected':''}"
            onclick="markAttend('${todayStr}','${s.id}','present',this)">✓</button>
          <button class="attend-btn absent ${cur==='absent'?'selected':''}"
            onclick="markAttend('${todayStr}','${s.id}','absent',this)">✗</button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }
  document.getElementById('modal-attend').classList.add('open');
}

function markAttend(dateStr, schedId, status, btn) {
  if (!attendance[dateStr]) attendance[dateStr] = {};
  attendance[dateStr][schedId] = status;
  saveAttendance();
  // update UI
  const row = btn.closest('.attend-item');
  row.querySelectorAll('.attend-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // update score live
  renderStats();
}

// ── SCORE CALCULATION ─────────────────────────────────────────────
function calcScore() {
  let total = 0, present = 0;
  Object.values(attendance).forEach(day => {
    Object.values(day).forEach(v => {
      total++;
      if (v === 'present') present++;
    });
  });
  return total === 0 ? 0 : Math.round((present / total) * 100);
}

function scoreToFlowers(pct) {
  if (pct === 0)   return '🌱';
  if (pct < 20)    return '🌿';
  if (pct < 40)    return '🌼';
  if (pct < 55)    return '🌸';
  if (pct < 70)    return '🌺';
  if (pct < 80)    return '🌷🌸';
  if (pct < 90)    return '🌹🌷🌸';
  if (pct < 95)    return '💐🌹🌷';
  return '💐🌹🌷🌸🌺🌼';
}

function scoreToPraise(pct) {
  if (pct === 0)   return 'سجّل حضورك لترى نتيجتك!';
  if (pct < 40)    return 'ابدأ بجدية أكثر، عندك وقت تعوّض! 💪';
  if (pct < 60)    return 'معقولة بس تقدر أحسن، حاول تحضر أكتر 📚';
  if (pct < 75)    return 'كويس! استمر واحضر أكتر 👍';
  if (pct < 85)    return 'ممتاز! أنت على الطريق الصح 🌟';
  if (pct < 95)    return 'رائع جداً! تقريباً مثالي 🔥';
  return 'أسطورة! حضورك مثالي تقريباً 👑🏆';
}

// ── RENDER STATS PAGE ─────────────────────────────────────────────
function renderStats() {
  const pct = calcScore();
  // ring
  const dashEl = document.getElementById('score-ring-dash');
  if (dashEl) {
    const offset = 314 - (314 * pct / 100);
    dashEl.style.strokeDashoffset = offset;
  }
  setText('score-num', pct + '%');
  const praiseEl = document.getElementById('score-praise');
  if (praiseEl) praiseEl.textContent = scoreToPraise(pct);
  const bouquetEl = document.getElementById('score-bouquet');
  if (bouquetEl) {
    bouquetEl.textContent = scoreToFlowers(pct);
    bouquetEl.style.animation = 'none';
    setTimeout(() => bouquetEl.style.animation = '', 10);
  }

  renderWeekSummary();
  renderActivityGrid();
}

// ── WEEK SUMMARY ─────────────────────────────────────────────────
function renderWeekSummary() {
  const grid = document.getElementById('week-summary-grid');
  if (!grid) return;

  // group attendance by subject
  const subjectStats = {};
  schedules.forEach(s => {
    if (!subjectStats[s.subject]) subjectStats[s.subject] = { present:0, absent:0, total:0, color:s.color };
  });

  Object.entries(attendance).forEach(([date, dayData]) => {
    Object.entries(dayData).forEach(([sid, status]) => {
      const sch = schedules.find(s => s.id === sid);
      if (!sch) return;
      if (!subjectStats[sch.subject]) subjectStats[sch.subject] = { present:0, absent:0, total:0 };
      subjectStats[sch.subject].total++;
      if (status === 'present') subjectStats[sch.subject].present++;
      else subjectStats[sch.subject].absent++;
    });
  });

  if (!Object.keys(subjectStats).length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📊</div><p>سجّل حضورك لتظهر الإحصائيات</p></div>`;
    return;
  }

  grid.innerHTML = Object.entries(subjectStats).map(([name, s]) => {
    const pct = s.total ? Math.round(s.present/s.total*100) : 0;
    return `<div class="week-subject-card">
      <div class="wsub-name">${name}</div>
      <div class="wsub-bar-wrap"><div class="wsub-bar" style="width:${pct}%"></div></div>
      <div class="wsub-stats">
        <span>✅ ${s.present} حضور</span>
        <span>${pct}%</span>
      </div>
    </div>`;
  }).join('');
}

// ── ACTIVITY GRID (github style) ──────────────────────────────────
function renderActivityGrid() {
  const grid = document.getElementById('activity-grid');
  if (!grid) return;

  const start = new Date(termStart);
  const today = new Date();
  const totalDays = Math.min(Math.ceil((today - start)/(1000*60*60*24)) + 1, 140);
  const weeksNeeded = Math.ceil(totalDays / 7);
  const gridDays = weeksNeeded * 7;

  let html = '';
  for (let i = 0; i < gridDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isFuture = d > today;

    if (isFuture) {
      html += `<div class="act-day future" title="${dateStr}"></div>`;
      continue;
    }

    const dayData = attendance[dateStr] || {};
    const vals = Object.values(dayData);
    const presentCount = vals.filter(v => v==='present').length;
    const totalCount = vals.length;

    let lv = 0;
    if (totalCount > 0) {
      const ratio = presentCount / totalCount;
      if (ratio === 0) lv = 1;
      else if (ratio < 0.6) lv = 2;
      else lv = 3;
    }

    html += `<div class="act-day lv${lv}" title="${dateStr}: ${presentCount}/${totalCount}" onclick="showDayAttend('${dateStr}')"></div>`;
  }
  grid.innerHTML = html;
}

function showDayAttend(dateStr) {
  const dayData = attendance[dateStr];
  if (!dayData || !Object.keys(dayData).length) {
    showToast('📅 ' + dateStr + ' — لا توجد بيانات');
    return;
  }
  const lines = Object.entries(dayData).map(([sid, st]) => {
    const sch = schedules.find(s => s.id === sid);
    const name = sch ? sch.subject : sid;
    return `${name}: ${st==='present'?'✅ حاضر':'❌ غايب'}`;
  });
  showToast(lines.join(' | '), 4000);
}

// ── END TERM ─────────────────────────────────────────────────────
function confirmEndTerm() {
  document.getElementById('modal-endterm').classList.add('open');
}

function endTerm() {
  closeModal('modal-endterm');
  const pct = calcScore();
  const bouquet = scoreToFlowers(pct);
  const praise = scoreToPraise(pct);

  // fetch motivational message from Claude API
  document.getElementById('celeb-bouquet').textContent = bouquet;
  document.getElementById('celeb-score').textContent = pct + '% حضور';
  document.getElementById('celeb-msg').textContent = praise;
  document.getElementById('celebration-overlay').style.display = 'flex';

  // get AI praise
  fetchCelebMessage(pct).then(msg => {
    const el = document.getElementById('celeb-msg');
    if (el) el.textContent = msg;
  });

  // reset for next term
  attendance = {};
  termStart = new Date().toISOString().split('T')[0];
  localStorage.setItem('masar_term_start', termStart);
  saveAttendance();
  playSound('celebrate');
  launchConfetti();
}

function closeCelebration() {
  document.getElementById('celebration-overlay').style.display = 'none';
  renderStats();
}

async function fetchCelebMessage(pct) {
  try {
    const level = pct >= 90 ? 'ممتاز جداً' : pct >= 75 ? 'جيد جداً' : pct >= 60 ? 'مقبول' : 'ضعيف';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:150,
        messages:[{
          role:'user',
          content:`اكتب رسالة تهنئة قصيرة جداً (جملتين فقط) لطالب أنهى الترم بنسبة حضور ${pct}% (مستوى: ${level}). الرسالة بالعربية وتكون ${pct >= 75 ? 'حارة ومشجعة' : 'ملطفة ومحفزة'}. لا تكتب أي شيء غير الرسالة.`
        }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || scoreToPraise(pct);
  } catch(e) {
    return scoreToPraise(pct);
  }
}

// ── CONFETTI ─────────────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#7c6dfa','#2dd4bf','#fbbf24','#ff6b6b','#a78bfa'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed; top:-10px; left:${Math.random()*100}vw;
        width:8px; height:8px; border-radius:${Math.random()>0.5?'50%':'2px'};
        background:${colors[Math.floor(Math.random()*colors.length)]};
        z-index:7000; pointer-events:none;
        animation:confettiFall ${1.5+Math.random()*2}s ease-in forwards;
        transform:rotate(${Math.random()*360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }, i * 40);
  }
}

// add confetti animation
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
@keyframes confettiFall {
  to { transform:translateY(100vh) rotate(720deg); opacity:0; }
}`;
document.head.appendChild(confettiStyle);

// ── EXTEND playSound for celebrate ───────────────────────────────
const _origPlaySound = playSound;


// ── HOOK INTO showPage to render stats ───────────────────────────
const _origShowPage = showPage;
function showPage(name) {
  _origShowPage(name);
  if (name === 'stats') renderStats();
  // update bnav for stats
  const bnavMap2 = { home:'bnav-home', lectures:'bnav-lectures', sections:'bnav-lectures', tasks:'bnav-tasks', notes:'bnav-notes', profile:'bnav-profile', stats:'bnav-stats', links:'bnav-links' };
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const bid = bnavMap2[name];
  if (bid) { const el = document.getElementById(bid); if (el) el.classList.add('active'); }
}

// ── ADD ATTEND BUTTON TO HOME PAGE ───────────────────────────────
function renderHome() {
  const today = new Date().getDay();
  const todaySchedules = schedules.filter(s => parseInt(s.day) === today);
  const container = document.getElementById('today-schedule');

  // attendance CTA
  const hasTodaySchedule = todaySchedules.length > 0;
  let attendBtn = hasTodaySchedule
    ? `<button class="btn-attend-today" onclick="openAttendanceModal()">✅ سجّل حضور اليوم</button>`
    : '';

  if (!todaySchedules.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>لا توجد محاضرات مسجّلة اليوم</p><button class="btn-add-small" onclick="showPage('lectures')">أضف محاضرة</button></div>`;
  } else {
    const sorted = todaySchedules.sort((a,b) => a.from.localeCompare(b.from));
    container.innerHTML = sorted.map(s => scheduleCardHTML(s, true)).join('') + attendBtn;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.due === todayStr && !t.done);
  const tasksEl = document.getElementById('today-tasks-list');
  tasksEl.innerHTML = todayTasks.length
    ? todayTasks.map(taskCardHTML).join('')
    : '<p style="color:var(--text3);font-size:.85rem;margin-bottom:1rem;">لا توجد مهام مطلوبة اليوم</p>';

  const notesEl = document.getElementById('today-notes-list');
  notesEl.innerHTML = notes.slice(0,4).map(n =>
    `<div class="note-preview-chip" style="background:${n.color}">${n.title || 'ملاحظة'}</div>`
  ).join('') || '<p style="color:var(--text3);font-size:.85rem;">لا توجد ملاحظات مضافة</p>';
}

/* ================================================================
   BULK SCHEDULE IMPORT
   ================================================================ */

let bulkDay = 0;
let bulkRowCount = 0;

function openBulkModal() {
  bulkDay = 0;
  bulkRowCount = 0;
  document.getElementById('modal-bulk').classList.add('open');
  // reset tabs
  document.querySelectorAll('.bulk-day-tab').forEach((t,i) => t.classList.toggle('active', i===0));
  // init with 3 empty rows
  const c = document.getElementById('bulk-rows-container');
  c.innerHTML = '';
  bulkRowCount = 0;
  addBulkRow(); addBulkRow(); addBulkRow();
}

function selectBulkDay(day) {
  bulkDay = day;
  document.querySelectorAll('.bulk-day-tab').forEach(t =>
    t.classList.toggle('active', parseInt(t.dataset.day) === day)
  );
}

function addBulkRow() {
  const c = document.getElementById('bulk-rows-container');
  const id = ++bulkRowCount;
  const row = document.createElement('div');
  row.className = 'bulk-row';
  row.id = `bulk-row-${id}`;
  row.innerHTML = `
    <input type="text"  id="br-subj-${id}" placeholder="اسم المادة" autocomplete="off">
    <input type="text"  id="br-doc-${id}"  placeholder="الدكتور"    autocomplete="off">
    <input type="time"  id="br-from-${id}">
    <input type="time"  id="br-to-${id}">
    <button class="bulk-row-del" onclick="removeBulkRow(${id})">✕</button>
  `;
  c.appendChild(row);
}

function removeBulkRow(id) {
  const el = document.getElementById(`bulk-row-${id}`);
  if (el) el.remove();
}

function saveBulkSchedule() {
  let added = 0;
  const rows = document.querySelectorAll('.bulk-row');
  rows.forEach(row => {
    const id = row.id.replace('bulk-row-','');
    const subj = document.getElementById(`br-subj-${id}`)?.value.trim();
    const doc  = document.getElementById(`br-doc-${id}`)?.value.trim();
    const from = document.getElementById(`br-from-${id}`)?.value;
    const to   = document.getElementById(`br-to-${id}`)?.value;
    if (!subj || !from) return; // skip empty
    schedules.push({
      id: genId(), type:'lecture',
      subject:subj, doctor:doc||'',
      day: String(bulkDay),
      from, to: to||'',
      place:'', building:'', note:'',
      color:'#1a237e', reminderTime:''
    });
    added++;
  });

  if (!added) { showToast('⚠️ لم يتم إدخال أي محاضرة'); return; }
  save();
  closeModal('modal-bulk');
  renderLectures(); renderSections(); renderHome();
  showToast(`✅ تم حفظ ${added} محاضرة بنجاح`);
}

/* ================================================================
   FRIENDS FEATURE — Firebase Realtime Database
   ================================================================
   ⚠️  ضع Firebase config الخاص بك هنا بعد إنشاء المشروع:
   https://console.firebase.google.com
   ================================================================ */

const FIREBASE_CONFIG = {
  apiKey:      "YOUR_API_KEY",
  authDomain:  "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:   "YOUR_PROJECT_ID"
};

// ── Firebase state ──────────────────────────────────────────────
let firebaseReady = false;
let dbRef = null;

function initFirebase() {
  if (typeof firebase === 'undefined') { firebaseReady = false; return; }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    dbRef = firebase.database();
    firebaseReady = FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
  } catch(e) { firebaseReady = false; }
}

// ── Friends local storage ───────────────────────────────────────
let friends = JSON.parse(localStorage.getItem('masar_friends') || '[]');
function saveFriends() { localStorage.setItem('masar_friends', JSON.stringify(friends)); }

// ── USERNAME VALIDATION ─────────────────────────────────────────
let usernameCheckTimer = null;

function checkUsername(val) {
  const status = document.getElementById('username-status');
  if (!status) return;
  val = val.toLowerCase().replace(/[^a-z0-9_]/g,'');
  document.getElementById('inp-username').value = val;

  if (!val) { status.textContent = ''; status.className = 'username-status'; return; }
  if (val.length < 3) {
    status.textContent = '⚠️ يجب أن يكون 3 أحرف على الأقل';
    status.className = 'username-status invalid'; return;
  }
  if (!/^[a-z0-9_]+$/.test(val)) {
    status.textContent = '⚠️ أحرف إنجليزية وأرقام و _ فقط';
    status.className = 'username-status invalid'; return;
  }

  status.textContent = '⏳ جاري التحقق...';
  status.className = 'username-status checking';

  clearTimeout(usernameCheckTimer);
  usernameCheckTimer = setTimeout(() => {
    if (!firebaseReady) {
      status.textContent = '✅ متاح (سيتم التحقق عند الاتصال)';
      status.className = 'username-status available';
      return;
    }
    dbRef.ref(`users/${val}`).once('value', snap => {
      if (snap.exists()) {
        status.textContent = '❌ هذا الاسم مأخوذ';
        status.className = 'username-status taken';
      } else {
        status.textContent = '✅ هذا الاسم متاح';
        status.className = 'username-status available';
      }
    });
  }, 600);
}

// ── FINISH ONBOARD — save username to Firebase ──────────────────
const _origFinishOnboard = finishOnboard;
function finishOnboard() {
  const username = (document.getElementById('inp-username')?.value || '').toLowerCase().trim();
  userData = {
    username,
    name:      document.getElementById('inp-name').value || '',
    age:       document.getElementById('inp-age').value  || '',
    faculty:   document.getElementById('inp-faculty').value || '',
    dept:      document.getElementById('inp-dept').value || '',
    phone:     document.getElementById('inp-phone').value || '',
    address:   document.getElementById('inp-address').value || '',
    instagram: document.getElementById('inp-instagram')?.value || ''
  };
  save();

  // push public profile to Firebase
  if (firebaseReady && username) {
    dbRef.ref(`users/${username}`).set({
      username,
      name:    userData.name,
      faculty: userData.faculty,
      dept:    userData.dept,
      updatedAt: Date.now()
    });
  }

  launchApp();
}

// update done badge in step 4
function updateDoneBadge() {
  const badge = document.getElementById('done-id-badge');
  const val   = document.getElementById('inp-username')?.value || '';
  if (badge) badge.textContent = val ? '@' + val : '@---';
}

// hook goStep to update badge
const _origGoStep = goStep;
function goStep(n) {
  _origGoStep(n);
  if (n === 4) updateDoneBadge();
}

// ── FRIENDS PAGE ────────────────────────────────────────────────
function renderFriendsPage() {
  // my id card
  const u = userData || {};
  const initials = u.name ? u.name.split(' ').map(w=>w[0]).slice(0,2).join('') : '؟';
  setText('my-id-avatar',       initials);
  setText('my-id-username',     u.username ? '@' + u.username : '@---');
  setText('my-id-name-display', u.name || '---');

  renderFriendsList();
}

function copyMyId() {
  const username = userData?.username;
  if (!username) { showToast('⚠️ لم تحدد اسم مستخدم بعد'); return; }
  navigator.clipboard?.writeText('@' + username).then(() => {
    const btn = document.getElementById('copy-id-btn');
    if (btn) { btn.classList.add('copied'); btn.innerHTML = '✅ تم النسخ'; }
    showToast('✅ تم نسخ @' + username);
    setTimeout(() => {
      const b = document.getElementById('copy-id-btn');
      if (b) { b.classList.remove('copied'); b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> نسخ الـ ID'; }
    }, 2500);
  }).catch(() => showToast('@' + username));
}

// ── SEARCH FRIEND ────────────────────────────────────────────────
let searchTimer = null;

function searchFriend(val) {
  val = val.toLowerCase().replace('@','').trim();
  const res = document.getElementById('friend-search-result');
  if (!val) { res.innerHTML=''; return; }

  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchUserProfile(val, res, true), 500);
}

function searchFriendModal(val) {
  val = val.toLowerCase().replace('@','').trim();
  const res = document.getElementById('add-friend-result');
  if (!val) { res.innerHTML=''; return; }
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchUserProfile(val, res, true), 500);
}

function fetchUserProfile(username, container, showAdd=false) {
  if (!firebaseReady) {
    container.innerHTML = `<div class="search-not-found">🔌 Firebase غير متصل — أضف الـ config أولاً</div>`;
    return;
  }
  container.innerHTML = `<div class="search-not-found">⏳ جاري البحث...</div>`;
  dbRef.ref(`users/${username}`).once('value', snap => {
    if (!snap.exists()) {
      container.innerHTML = `<div class="search-not-found">❌ لم يُوجد مستخدم بهذا الاسم</div>`;
      return;
    }
    const p = snap.val();
    const alreadyFriend = friends.find(f => f.username === username);
    const isMe = userData?.username === username;
    container.innerHTML = `
      <div class="search-found-card">
        <div class="friend-avatar">${(p.name||'؟')[0]}</div>
        <div class="friend-info">
          <div class="friend-username">@${p.username}</div>
          <div class="friend-meta">${p.faculty||''} ${p.dept ? '· '+p.dept : ''}</div>
        </div>
        ${showAdd && !alreadyFriend && !isMe
          ? `<button class="btn-add-friend" onclick="addFriend('${p.username}','${p.name||''}','${p.faculty||''}','${p.dept||'')">إضافة</button>`
          : alreadyFriend ? `<span style="font-size:.78rem;color:var(--text2)">مضاف ✓</span>`
          : isMe ? `<span style="font-size:.78rem;color:var(--text2)">أنت</span>` : ''
        }
      </div>`;
  });
}

function addFriend(username, name, faculty, dept) {
  if (friends.find(f => f.username === username)) { showToast('⚠️ مضاف بالفعل'); return; }
  friends.push({ username, name, faculty, dept, addedAt: Date.now() });
  saveFriends();
  renderFriendsList();
  closeModal('modal-add-friend');
  showToast('✅ تمت إضافة @' + username);
}

function renderFriendsList() {
  const el = document.getElementById('friends-list');
  if (!el) return;
  if (!friends.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>لم تضف أي أصحاب بعد</p><p style="font-size:.78rem;margin-top:.3rem;color:var(--text3)">ابحث بالـ @username أعلاه</p></div>`;
    return;
  }
  el.innerHTML = friends.map(f => `
    <div class="friend-card" onclick="viewFriendProfile('${f.username}')">
      <div class="friend-avatar">${(f.name||'؟')[0].toUpperCase()}</div>
      <div class="friend-info">
        <div class="friend-username">@${f.username}</div>
        <div class="friend-meta">${f.faculty||''} ${f.dept ? '· '+f.dept : ''}</div>
      </div>
      <div class="friend-actions">
        <button class="friend-action-btn compare-btn" title="مقارنة الجدول"
          onclick="event.stopPropagation(); compareSchedule('${f.username}')">📅</button>
        <button class="friend-action-btn" title="إزالة"
          onclick="event.stopPropagation(); removeFriend('${f.username}')">✕</button>
      </div>
    </div>`).join('');
}

function removeFriend(username) {
  friends = friends.filter(f => f.username !== username);
  saveFriends(); renderFriendsList();
  showToast('🗑️ تم إزالة @' + username);
}

function openAddFriendModal() {
  document.getElementById('add-friend-inp').value = '';
  document.getElementById('add-friend-result').innerHTML = '';
  document.getElementById('modal-add-friend').classList.add('open');
}

// ── VIEW FRIEND PROFILE ──────────────────────────────────────────
function viewFriendProfile(username) {
  const body = document.getElementById('friend-profile-body');
  const title = document.getElementById('friend-profile-title');
  title.textContent = '@' + username;
  body.innerHTML = '<p style="color:var(--text2);font-size:.88rem;">⏳ جاري التحميل...</p>';
  document.getElementById('modal-friend-profile').classList.add('open');

  if (!firebaseReady) {
    body.innerHTML = `<div class="search-not-found">🔌 Firebase غير متصل</div>`; return;
  }
  dbRef.ref(`users/${username}`).once('value', snap => {
    if (!snap.exists()) { body.innerHTML='<p>لم يُوجد الملف</p>'; return; }
    const p = snap.val();
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:.85rem;margin-bottom:1.25rem">
        <div class="friend-avatar" style="width:54px;height:54px;font-size:1.3rem">${(p.name||'؟')[0]}</div>
        <div>
          <div style="font-weight:800;font-size:1rem">@${p.username}</div>
          <div style="font-size:.82rem;color:var(--text2)">${p.name||''}</div>
          <div style="font-size:.78rem;color:var(--text3)">${p.faculty||''} ${p.dept ? '· '+p.dept : ''}</div>
        </div>
      </div>
      <button class="btn-add" style="width:100%" onclick="compareSchedule('${username}');closeModal('modal-friend-profile')">📅 مقارنة الجدول</button>
    `;
  });
}

// ── COMPARE SCHEDULES ────────────────────────────────────────────
function compareSchedule(friendUsername) {
  if (!firebaseReady) { showToast('🔌 Firebase غير متصل'); return; }

  dbRef.ref(`schedules/${friendUsername}`).once('value', snap => {
    const friendScheds = snap.exists() ? Object.values(snap.val()) : [];
    showCompareModal(friendUsername, friendScheds);
  });
}

// Push my schedules to Firebase when I save
const _origSave = save;
function save() {
  _origSave();
  if (firebaseReady && userData?.username && schedules.length) {
    const obj = {};
    schedules.forEach(s => { obj[s.id] = s; });
    dbRef.ref(`schedules/${userData.username}`).set(obj);
  }
}

function showCompareModal(friendUsername, friendScheds) {
  const byDay = {};
  const DAYS_LIST = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];

  // my schedules
  schedules.forEach(s => {
    const d = parseInt(s.day);
    if (!byDay[d]) byDay[d] = { mine:[], theirs:[] };
    byDay[d].mine.push(s);
  });
  friendScheds.forEach(s => {
    const d = parseInt(s.day);
    if (!byDay[d]) byDay[d] = { mine:[], theirs:[] };
    byDay[d].theirs.push(s);
  });

  let html = `
    <div class="compare-legend">
      <span><span class="compare-dot mine"></span> أنا</span>
      <span><span class="compare-dot theirs"></span> @${friendUsername}</span>
      <span><span class="compare-dot shared"></span> مشترك</span>
    </div>`;

  Object.entries(byDay).sort((a,b)=>a[0]-b[0]).forEach(([day, data]) => {
    html += `<div class="compare-day"><div class="compare-day-title">${DAYS_LIST[parseInt(day)]||'يوم '+day}</div>`;

    const mySubjects    = data.mine.map(s=>s.subject);
    const theirSubjects = data.theirs.map(s=>s.subject);

    // shared
    const shared = mySubjects.filter(s => theirSubjects.includes(s));
    // mine only
    data.mine.forEach(s => {
      const isShared = theirSubjects.includes(s.subject);
      html += `<div class="compare-item">
        <span class="compare-dot ${isShared?'shared':'mine'}"></span>
        <span>${s.subject}</span>
        <span style="color:var(--text2);font-size:.75rem;margin-right:auto">${s.from}</span>
      </div>`;
    });
    // theirs only
    data.theirs.filter(s => !mySubjects.includes(s.subject)).forEach(s => {
      html += `<div class="compare-item">
        <span class="compare-dot theirs"></span>
        <span style="color:var(--text2)">${s.subject}</span>
        <span style="color:var(--text2);font-size:.75rem;margin-right:auto">${s.from}</span>
      </div>`;
    });
    html += `</div>`;
  });

  if (!Object.keys(byDay).length) html += `<div class="empty-state"><div class="empty-icon">📅</div><p>لا توجد بيانات مشتركة</p></div>`;

  const body = document.getElementById('friend-profile-body');
  const title = document.getElementById('friend-profile-title');
  title.textContent = `مقارنة مع @${friendUsername}`;
  body.innerHTML = `<div class="compare-wrap">${html}</div>`;
  document.getElementById('modal-friend-profile').classList.add('open');
}

// ── HOOK showPage for friends ─────────────────────────────────────
const _origShowPage2 = showPage;
function showPage(name) {
  _origShowPage2(name);
  if (name === 'friends') renderFriendsPage();
  // update bnav for friends
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const bmap = { home:'bnav-home', lectures:'bnav-lectures', sections:'bnav-lectures',
                 tasks:'bnav-tasks', notes:'bnav-notes', profile:'bnav-profile',
                 stats:'bnav-stats', friends:'bnav-friends', links:'bnav-links' };
  const bid = bmap[name]; if (bid) { const el=document.getElementById(bid); if(el) el.classList.add('active'); }
}

// ── INIT FIREBASE on load ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { initFirebase(); }, true);

/* ================================================================
   REMINDERS — Custom personal reminders with date/time
   ================================================================ */

let reminders = JSON.parse(localStorage.getItem('masar_reminders_custom') || '[]');
function saveRemindersCustom() { localStorage.setItem('masar_reminders_custom', JSON.stringify(reminders)); }

function openAddReminderModal() {
  // set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('rem-date').value = today;
  document.getElementById('rem-time').value = '09:00';
  document.getElementById('rem-title').value = '';
  document.getElementById('rem-note').value  = '';
  document.getElementById('modal-reminder').classList.add('open');
}

function saveReminder() {
  const title = document.getElementById('rem-title').value.trim();
  if (!title) { showToast('⚠️ أدخل عنوان التذكير'); return; }
  reminders.push({
    id:       genId(),
    title,
    date:     document.getElementById('rem-date').value,
    time:     document.getElementById('rem-time').value,
    note:     document.getElementById('rem-note').value.trim(),
    priority: document.getElementById('rem-priority').value,
    done:     false,
    createdAt: Date.now()
  });
  reminders.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  saveRemindersCustom();
  closeModal('modal-reminder');
  clearForm(['rem-title','rem-note']);
  renderReminders();
  showToast('✅ تم حفظ التذكير');
  scheduleReminderNotification(reminders[reminders.length-1]);
}

function scheduleReminderNotification(rem) {
  if (!rem.date || !rem.time) return;
  const target = new Date(rem.date + 'T' + rem.time);
  const now    = new Date();
  const diff   = target - now;
  if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      if (silentMode) return;
      showToast(`🔔 ${rem.title}`, 6000);
      playSound('reminder');
      if (Notification.permission === 'granted') {
        new Notification('مسار — تذكير', { body: rem.title + (rem.note ? '\n' + rem.note : '') });
      }
    }, diff);
  }
}

function renderReminders() {
  const el = document.getElementById('reminders-list');
  if (!el) return;
  if (!reminders.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><p>لا توجد تذكيرات مضافة</p></div>`;
    return;
  }
  const now = new Date();
  el.innerHTML = reminders.map(r => {
    const dt = r.date ? new Date(r.date + 'T' + (r.time||'00:00')) : null;
    const isOverdue = dt && dt < now && !r.done;
    const dtLabel = dt ? dt.toLocaleDateString('ar-EG',{weekday:'short',day:'numeric',month:'short'}) + ' ' + (r.time||'') : '';
    return `<div class="reminder-card ${r.priority} ${r.done?'done-rem':''}">
      <div class="rem-check ${r.done?'done':''}" onclick="toggleReminder('${r.id}')"></div>
      <div class="rem-body">
        <div class="rem-title">${r.title} ${isOverdue ? '<span class="rem-overdue">متأخر</span>' : ''}</div>
        <div class="rem-datetime">📅 ${dtLabel}</div>
        ${r.note ? `<div class="rem-note">${r.note}</div>` : ''}
      </div>
      <button class="rem-del" onclick="deleteReminder('${r.id}')">✕</button>
    </div>`;
  }).join('');
}

function toggleReminder(id) {
  const r = reminders.find(x => x.id === id);
  if (r) { r.done = !r.done; saveRemindersCustom(); renderReminders(); }
}

function deleteReminder(id) {
  reminders = reminders.filter(x => x.id !== id);
  saveRemindersCustom(); renderReminders();
  showToast('🗑️ تم الحذف');
}

// check reminders every minute
setInterval(() => {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  const todayStr = now.toISOString().split('T')[0];
  reminders.filter(r => !r.done && r.date === todayStr && r.time === hh+':'+mm).forEach(r => {
    showToast(`🔔 ${r.title}`, 6000);
    playSound('reminder');
  });
}, 60000);

/* ================================================================
   AVATAR PICKER
   ================================================================ */

const AVATARS = [
  '🐱','🐭','🦁','🐺','🐻','🦊','🐯','🐼','🐸','🐧',
  '🦉','🦅','🦋','🐬','🦄','🐲','🤖','👾','🧙','🧑‍🚀',
  '👨‍💻','👩‍🔬','🧑‍🎨','👨‍🏫','🧑‍⚕️'
];

let selectedAvatar = localStorage.getItem('masar_avatar') || '';

function openAvatarPicker() {
  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = AVATARS.map(a =>
    `<div class="avatar-opt ${selectedAvatar===a?'selected':''}" onclick="pickAvatar('${a}')">${a}</div>`
  ).join('');
  document.getElementById('modal-avatar').classList.add('open');
}

function pickAvatar(emoji) {
  selectedAvatar = emoji;
  localStorage.setItem('masar_avatar', emoji);
  document.querySelectorAll('.avatar-opt').forEach(o => o.classList.toggle('selected', o.textContent === emoji));
  updateAvatarDisplay();
  closeModal('modal-avatar');
}

function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    localStorage.setItem('masar_avatar_photo', dataUrl);
    selectedAvatar = '__photo__';
    localStorage.setItem('masar_avatar', '__photo__');
    updateAvatarDisplay();
    closeModal('modal-avatar');
    showToast('✅ تم تحديث الصورة');
  };
  reader.readAsDataURL(file);
}

function updateAvatarDisplay() {
  const large  = document.getElementById('profile-avatar-large');
  const topBtn = document.getElementById('avatar-initials');
  const photo  = localStorage.getItem('masar_avatar_photo');

  if (selectedAvatar === '__photo__' && photo) {
    if (large) { large.innerHTML = `<img src="${photo}" alt="avatar">`; large.classList.add('has-photo'); }
    if (topBtn) topBtn.textContent = '';
  } else if (selectedAvatar && selectedAvatar !== '__photo__') {
    if (large) { large.textContent = selectedAvatar; large.classList.remove('has-photo'); }
    if (topBtn) topBtn.textContent = selectedAvatar;
  } else {
    const initials = userData?.name ? userData.name.split(' ').map(w=>w[0]).slice(0,2).join('') : '؟';
    if (large) { large.textContent = initials; large.classList.remove('has-photo'); }
    if (topBtn) topBtn.textContent = initials;
  }
}

/* ================================================================
   LANGUAGE TOGGLE (AR / EN)
   ================================================================ */

let currentLang = localStorage.getItem('masar_lang') || 'ar';

const TRANSLATIONS = {
  ar: {
    home:'الرئيسية', lectures:'المحاضرات', tasks:'المهام', notes:'الملاحظات',
    reminders:'تذكيراتي', friends:'الأصحاب', profile:'الملف الشخصي',
    today:'جدول اليوم', addBtn:'+ إضافة', darkMode:'الوضع الليلي',
    lang:'العربية', langBtn:'EN', dir:'rtl'
  },
  en: {
    home:'Home', lectures:'Lectures', tasks:'Tasks', notes:'Notes',
    reminders:'Reminders', friends:'Friends', profile:'Profile',
    today:"Today's Schedule", addBtn:'+ Add', darkMode:'Dark Mode',
    lang:'English', langBtn:'AR', dir:'ltr'
  }
};

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('masar_lang', lang);
  const t = TRANSLATIONS[lang];
  document.documentElement.setAttribute('dir', t.dir);
  document.documentElement.setAttribute('lang', lang);
  const setText2 = (id, txt) => { const e=document.getElementById(id); if(e) e.textContent=txt; };
  setText2('lang-toggle-label', t.lang);
  setText2('lang-btn', t.langBtn);
  // update page subtitle
  const sub = document.querySelector('.page-sub');
  if (sub) sub.textContent = t.today;
}

function toggleLang() {
  applyLang(currentLang === 'ar' ? 'en' : 'ar');
}

// ── update invite id display ──────────────────────────────────────
function renderFriendsPage() {
  const u = userData || {};
  const initials = u.name ? u.name.split(' ').map(w=>w[0]).slice(0,2).join('') : '؟';
  setText('my-id-avatar',       initials);
  setText('my-id-username',     u.username ? '@' + u.username : '@---');
  setText('my-id-name-display', u.name || '---');
  // invite id
  setText('invite-id-display', u.username ? '@' + u.username : '@---');
  renderFriendsList();
}

// ── Hook launchApp to load avatar + lang + reminders ─────────────
const _origLaunchApp = launchApp;
function launchApp() {
  _origLaunchApp();
  selectedAvatar = localStorage.getItem('masar_avatar') || '';
  updateAvatarDisplay();
  applyLang(currentLang);
  renderReminders();
  reminders.forEach(scheduleReminderNotification);
}

// ── Hook showPage for reminders ────────────────────────────────────
const _origShowPageR = showPage;
function showPage(name) {
  _origShowPageR(name);
  if (name === 'reminders') renderReminders();
  // snav active
  document.querySelectorAll('[id^="snav-"]').forEach(el => el.classList.remove('active'));
  const snavId = 'snav-' + name;
  const snavEl = document.getElementById(snavId);
  if (snavEl) snavEl.classList.add('active');
}

/* ── UPDATED renderFriendsPage for new hero design ────────────── */
function renderFriendsPage() {
  const u = userData || {};

  // avatar
  const heroAvatar = document.getElementById('my-id-avatar');
  const photo = localStorage.getItem('masar_avatar_photo');
  const av    = localStorage.getItem('masar_avatar') || '';
  if (heroAvatar) {
    if (av === '__photo__' && photo) {
      heroAvatar.innerHTML = `<img src="${photo}" alt="avatar">`;
    } else if (av && av !== '__photo__') {
      heroAvatar.textContent = av;
    } else {
      heroAvatar.textContent = u.name ? u.name[0].toUpperCase() : '؟';
    }
  }

  // info
  setText('my-id-name-display', u.name || 'لم يُحدَّد الاسم');
  setText('my-id-username', u.username ? '@' + u.username : '@---');
  setText('my-id-faculty-display', [u.faculty, u.dept].filter(Boolean).join(' · '));

  // invite & old elements for backward compat
  setText('invite-id-display', u.username ? '@' + u.username : '@---');

  renderFriendsList();
}

/* ── SHARE MY ID ──────────────────────────────────────────────── */
function shareMyId() {
  const u = userData;
  if (!u?.username) { showToast('⚠️ لم تحدد اسم مستخدم بعد'); return; }
  const text = `ابحث عني على مسار: @${u.username}`;
  if (navigator.share) {
    navigator.share({ title: 'مسار — معرّفي', text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).then(() => showToast('✅ تم نسخ الرابط'));
  }
}

/* override copyMyId for new button ────────────────────────────── */
function copyMyId() {
  const username = userData?.username;
  if (!username) { showToast('⚠️ لم تحدد اسم مستخدم بعد'); return; }
  navigator.clipboard?.writeText('@' + username).then(() => {
    showToast('✅ تم نسخ @' + username);
    const btn = document.getElementById('copy-id-btn');
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = '✅ تم النسخ';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> نسخ`;
      }, 2500);
    }
  }).catch(() => showToast('@' + username));
}
