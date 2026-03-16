/* ================================================================
   MASAR — Sound Engine + Notification Permissions
   ================================================================ */

// ── REQUEST NOTIFICATION PERMISSION ─────────────────────────────
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        showToast('✅ تم تفعيل الإشعارات');
        playSound('success');
      }
    });
  }
}

// ── SOUND ENGINE (Web Audio API) ─────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // resume if suspended (browser policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = ctx.currentTime + delay;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch(e) {}
}

// ── SOUND LIBRARY ────────────────────────────────────────────────
function playSound(type) {
  if (silentMode) return;

  switch(type) {

    // ✅ حفظ بنجاح — نغمة صاعدة خفيفة
    case 'success':
      playTone(523, 0.12, 'sine', 0.25, 0.0);   // C5
      playTone(659, 0.12, 'sine', 0.25, 0.1);   // E5
      playTone(784, 0.22, 'sine', 0.28, 0.2);   // G5
      break;

    // 🗑️ حذف — نغمة هابطة
    case 'delete':
      playTone(440, 0.1,  'sine', 0.2, 0.0);
      playTone(330, 0.18, 'sine', 0.2, 0.1);
      break;

    // 🔔 تذكير / reminder — نبضة تنبيه
    case 'reminder':
      playTone(880, 0.1,  'sine',    0.3, 0.0);
      playTone(880, 0.1,  'sine',    0.3, 0.15);
      playTone(1047, 0.25,'sine',    0.3, 0.3);
      break;

    // 🕌 وقت الصلاة — نغمة هادئة إسلامية
    case 'prayer':
      playTone(440,  0.4, 'sine',     0.2, 0.0);
      playTone(495,  0.4, 'sine',     0.2, 0.35);
      playTone(528,  0.5, 'sine',     0.22,0.7);
      playTone(495,  0.4, 'sine',     0.18,1.1);
      playTone(440,  0.6, 'sine',     0.15,1.45);
      break;

    // 🎉 احتفال نهاية الترم
    case 'celebrate':
      [523,587,659,698,784,880,988,1047].forEach((f,i) => {
        playTone(f, 0.18, 'sine', 0.22, i * 0.1);
      });
      // chord at end
      setTimeout(() => {
        playTone(523, 0.5, 'sine', 0.2);
        playTone(659, 0.5, 'sine', 0.2);
        playTone(784, 0.5, 'sine', 0.2);
      }, 900);
      break;

    // ✓ إتمام مهمة
    case 'done':
      playTone(659, 0.1, 'sine', 0.2, 0.0);
      playTone(784, 0.2, 'sine', 0.2, 0.1);
      break;

    // ⚠️ خطأ / تحذير
    case 'error':
      playTone(220, 0.15, 'sawtooth', 0.2, 0.0);
      playTone(196, 0.25, 'sawtooth', 0.15,0.15);
      break;

    // 📳 notification عامة — نقرتان
    case 'notify':
      playTone(800, 0.08, 'sine', 0.25, 0.0);
      playTone(800, 0.08, 'sine', 0.25, 0.12);
      break;

    // 🌙 تذكير ليلي — نغمة هادئة
    case 'night':
      playTone(392, 0.3, 'sine', 0.18, 0.0);
      playTone(349, 0.3, 'sine', 0.15, 0.3);
      playTone(330, 0.5, 'sine', 0.12, 0.6);
      break;
  }
}

// ── SEND NOTIFICATION (browser push) ─────────────────────────────
function sendNotification(title, body, sound = 'notify') {
  if (silentMode) return;
  playSound(sound);
  showToast(`🔔 ${title}${body ? ' — ' + body : ''}`, 5000);
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'favicon.svg',
        badge: 'favicon.svg',
        lang: 'ar',
        dir: 'rtl'
      });
    } catch(e) {}
  }
}

// ── AUTO-REQUEST PERMISSION ON FIRST INTERACTION ─────────────────
document.addEventListener('click', function _firstClick() {
  requestNotificationPermission();
  // unlock AudioContext on mobile
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  document.removeEventListener('click', _firstClick);
}, { once: true });
