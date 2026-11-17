(() => {
  'use strict';

  if (document.documentElement.classList.contains('site-game')) {
    document.querySelector('.introduction').append(document.querySelector('.toolbox'));
  }

  const byId = id => document.getElementById(id);
  const board = byId('board');
  const bgm = byId('bgm');
  bgm.volume = 0.47;
  const ctx = board.getContext('2d');
  const art = window.SuikaArt;
  const i18n = window.SuikaI18n;
  const game = new window.SuikaPhysics.Game({
    width: 440, height: 504, dangerY: 78, spawnY: 37,
    radii: [18, 23, 29, 36, 44, 53, 63, 75, 89, 104, 120]
  });
  const lastStage = art.pieces.length - 1;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = byId('overlay');
  const primary = byId('overlayPrimary');
  const secondary = byId('overlaySecondary');
  const cabinet = byId('cabinet');
  const keys = new Set();
  const effects = [];
  const formatScore = score => String(score).padStart(4, '0');
  const store = {
    read(key) { try { return localStorage.getItem('sukima-suika-' + key); } catch { return null; } },
    write(key, value) { try { localStorage.setItem('sukima-suika-' + key, String(value)); } catch { /* Private or file browsing. */ } }
  };

  let aim = game.width / 2;
  let heldPointer = null;
  let modal = '';
  let returnModal = '';
  let hasPlayed = false;
  let albumReached = false;
  let best = Math.max(0, Number(store.read('best')) || 0);
  let sound = store.read('sound') !== 'off';
  let soundActivated = false;
  let audio;
  let effectsGain;
  let previousTime;
  let needsPaint = true;
  let warning = false;
  let knownLevel = 0;
  let announcementKey = '';

  function syncMusic() {
    if (sound && soundActivated && !modal && !game.over && !document.hidden) {
      // play() can be declined before a touch is released. The next gesture retries.
      if (bgm.paused) bgm.play().catch(() => {});
    } else if (!bgm.paused) {
      bgm.pause();
    }
  }

  function prepareSound() {
    soundActivated = true;
    syncMusic();
    if (!sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audio) {
        audio = new Audio();
        effectsGain = audio.createGain();
        effectsGain.connect(audio.destination);
      }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { /* Gameplay is independent of audio support. */ }
  }

  function playNotes(notes, volume) {
    if (!sound || !audio || audio.state !== 'running') return;
    notes.forEach((frequency, i) => {
      const at = audio.currentTime + i * 0.075;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(effectsGain);
      osc.start(at);
      osc.stop(at + 0.23);
    });
  }

  function paintIcon(canvas, level) {
    const size = 144;
    canvas.width = canvas.height = size;
    const brush = canvas.getContext('2d');
    art.draw(brush, level, size / 2, size / 2, size * 0.46, 0);
  }

  const lineup = byId('lineup');
  const steps = art.pieces.map((_, index) => {
    const step = document.createElement('li');
    step.className = 'evolution-step';
    const icon = document.createElement('canvas');
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'step-number';
    label.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'step-name';
    step.append(icon, label, name);
    lineup.append(step);
    return {step, icon, name};
  });

  function showNext() {
    paintIcon(byId('nextIcon'), game.next);
    byId('nextName').textContent = i18n.pieceName(game.next);
  }

  function scoreChanged() {
    byId('score').textContent = formatScore(game.score);
    if (game.score > best) {
      best = game.score;
      store.write('best', best);
    }
    byId('best').textContent = formatScore(best);
  }

  function updateSound() {
    const btn = byId('soundBtn');
    document.body.classList.toggle('sound-off', !sound);
    btn.setAttribute('aria-pressed', String(sound));
    btn.title = i18n.t(sound ? 'game.mute' : 'game.unmute');
    if (effectsGain) effectsGain.gain.value = sound ? 1 : 0;
    const label = byId('soundLabel');
    if (label) label.textContent = i18n.t(sound ? 'game.soundOn' : 'game.soundOff');
  }

  function status() {
    const paused = Boolean(modal) && !game.over;
    byId('statusText').textContent = i18n.t(game.over ? 'game.over' : paused ? 'game.paused' : warning ? 'game.warning' : 'game.playing');
    const pause = byId('pauseBtn');
    const pauseLabel = i18n.t(paused ? 'game.resume' : 'game.paused');
    pause.setAttribute('aria-label', pauseLabel);
    pause.setAttribute('aria-pressed', String(paused));
    pause.title = pauseLabel;
    pause.disabled = game.over || (Boolean(modal) && modal !== 'pause');
    byId('helpBtn').disabled = Boolean(modal) && modal !== 'help';
    byId('restartBtn').disabled = Boolean(modal) && modal !== 'over' && modal !== 'pause';
    cabinet.classList.toggle('paused', paused);
    cabinet.classList.toggle('danger', warning && !modal);
  }

  function renderDialog() {
    const prefix = 'dialog.' + modal + '.';
    byId('overlayTitle').textContent = i18n.t(prefix + 'title');
    byId('overlayText').textContent = i18n.t(prefix + 'body', {score: game.score.toLocaleString(i18n.lang)});
    primary.textContent = i18n.t(prefix + 'confirm');
    const hasSecondary = modal === 'pause' || modal === 'restart';
    secondary.textContent = hasSecondary ? i18n.t(prefix + 'cancel') : '';
    secondary.hidden = !hasSecondary;
  }

  function renderAnnouncement() {
    if (!announcementKey) return;
    byId('live').textContent = i18n.t(announcementKey, {
      level: knownLevel + 1, name: i18n.pieceName(knownLevel), score: game.score.toLocaleString(i18n.lang)
    });
  }

  function updateLanguage() {
    steps.forEach(({step, name}, index) => {
      name.textContent = i18n.pieceName(index);
      step.title = i18n.t('game.step', {level: index + 1, name: name.textContent});
      step.setAttribute('aria-label', step.title);
    });
    byId('nextName').textContent = i18n.pieceName(game.next);
    updateSound();
    status();
    if (modal) renderDialog();
    renderAnnouncement();
    needsPaint = true;
  }

  function showDialog(kind) {
    modal = kind;
    syncMusic();
    heldPointer = null;
    keys.clear();
    renderDialog();
    overlay.hidden = false;
    status();
    primary.focus({ preventScroll: true });
  }

  function closeDialog() {
    modal = '';
    prepareSound();
    returnModal = '';
    overlay.hidden = true;
    status();
    needsPaint = true;
    board.focus({ preventScroll: true });
  }

  function reset() {
    game.reset();
    if (bgm.currentTime > 0) bgm.currentTime = 0;
    aim = game.width / 2;
    effects.length = 0;
    hasPlayed = albumReached = warning = false;
    knownLevel = 0;
    scoreChanged();
    showNext();
    announcementKey = 'game.started';
    renderAnnouncement();
    closeDialog();
  }

  function returnToGame() {
    if (returnModal) {
      const target = returnModal;
      returnModal = '';
      showDialog(target);
    } else closeDialog();
  }

  primary.addEventListener('click', () => {
    if (modal === 'restart' || modal === 'over') reset();
    else if (modal === 'help') returnToGame();
    else closeDialog();
  });
  secondary.addEventListener('click', () => {
    if (modal === 'pause') {
      returnModal = 'pause';
      showDialog('restart');
    } else returnToGame();
  });
  byId('helpBtn').addEventListener('click', () => {
    if (modal === 'help') returnToGame();
    else { returnModal = modal; showDialog('help'); }
  });
  byId('pauseBtn').addEventListener('click', () => {
    if (modal === 'pause') closeDialog();
    else if (!modal) showDialog('pause');
  });
  byId('restartBtn').addEventListener('click', () => {
    if (game.over || !hasPlayed) reset();
    else if (!modal || modal === 'pause') { returnModal = modal; showDialog('restart'); }
  });
  byId('soundBtn').addEventListener('click', () => {
    sound = !sound;
    store.write('sound', sound ? 'on' : 'off');
    updateSound();
    prepareSound();
    if (audio && sound) audio.resume().then(() => playNotes([440, 659.25], 0.06)).catch(() => {});
  });

  function aimAt(clientX) {
    const rect = board.getBoundingClientRect();
    aim = game.clampX((clientX - rect.left) * game.width / rect.width);
    needsPaint = true;
  }

  function drop() {
    if (modal || !game.drop(aim)) return;
    hasPlayed = true;
    aim = game.clampX(aim);
    showNext();
    needsPaint = true;
  }

  board.addEventListener('pointerdown', e => {
    if (modal || heldPointer !== null || !e.isPrimary || e.button !== 0) return;
    heldPointer = e.pointerId;
    board.focus({ preventScroll: true });
    board.setPointerCapture(e.pointerId);
    aimAt(e.clientX);
    if (e.pointerType === 'mouse') prepareSound();
  });
  board.addEventListener('pointermove', e => {
    if (!modal && (heldPointer === e.pointerId || (heldPointer === null && e.pointerType === 'mouse'))) aimAt(e.clientX);
  });
  board.addEventListener('pointerup', e => {
    if (heldPointer !== e.pointerId) return;
    heldPointer = null;
    aimAt(e.clientX);
    prepareSound();
    drop();
  });
  board.addEventListener('lostpointercapture', () => { heldPointer = null; });
  board.addEventListener('pointercancel', () => { heldPointer = null; });

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (modal) {
      if (e.key === 'Escape' && modal !== 'over') {
        e.preventDefault();
        if (!e.repeat) returnToGame();
      } else if (e.key === 'Tab') {
        const other = secondary.hidden ? primary : secondary;
        if (e.shiftKey && document.activeElement === primary) { e.preventDefault(); other.focus(); }
        if (!e.shiftKey && document.activeElement === other) { e.preventDefault(); primary.focus(); }
      }
      return;
    }
    const inBoard = e.target === board || e.target === document.body || e.target === document.documentElement;
    if (!inBoard) return;
    if (e.key === 'Escape' || e.code === 'KeyP') {
      if (!e.repeat) showDialog('pause');
      e.preventDefault();
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
      if (!e.repeat) prepareSound();
      if (!keys.has(e.code)) aim = game.clampX(aim + (e.code === 'ArrowLeft' ? -6 : 6));
      keys.add(e.code);
      needsPaint = true;
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) { prepareSound(); drop(); }
    }
  });
  document.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); heldPointer = null; });
  window.addEventListener('pagehide', () => { bgm.pause(); });
  window.addEventListener('pageshow', syncMusic);
  document.addEventListener('visibilitychange', () => {
    previousTime = undefined;
    if (document.hidden && hasPlayed && !modal && !game.over) showDialog('pause');
    else syncMusic();
  });

  function handleEvents() {
    for (const event of game.drainEvents()) {
      if (event.type === 'drop') playNotes([174.61], 0.045);
      if (event.type === 'merge') {
        scoreChanged();
        const pitch = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047][event.level];
        playNotes([pitch * 0.75, pitch, pitch * 1.25], 0.065);
        effects.push({ x: event.x, y: event.y, level: event.level, points: event.points, time: 0 });
        if (event.level > knownLevel) {
          knownLevel = event.level;
          announcementKey = 'game.merged';
          renderAnnouncement();
        }
        if (event.level === lastStage && !albumReached) { albumReached = true; showDialog('album'); }
      }
      if (event.type === 'over') {
        returnModal = '';
        showDialog('over');
        playNotes([392, 330, 262], 0.055);
      }
    }
  }

  function drawGuide() {
    ctx.save();
    ctx.strokeStyle = warning ? '#b22e1d' : 'rgba(70,74,51,.49)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = warning ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, game.dangerY); ctx.lineTo(game.width, game.dangerY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = warning ? '#af331e' : '#485c50';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText(i18n.t('game.limit'), 9, game.dangerY - 5);
    ctx.restore();
    if (game.over || !game.canDrop) return;
    const r = game.radii[game.current];
    let landing = game.height - r;
    for (const b of game.bodies) {
      const dx = b.x - aim;
      const d = r + b.r;
      if (Math.abs(dx) < d) landing = Math.min(landing, b.y - Math.sqrt(d * d - dx * dx));
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(35,65,51,.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    if (landing > game.spawnY + r) {
      ctx.beginPath(); ctx.moveTo(aim, game.spawnY + r); ctx.lineTo(aim, landing); ctx.stroke();
    }
    ctx.restore();
    art.draw(ctx, game.current, aim, game.spawnY, r, 0);
    ctx.fillStyle = '#285246';
    ctx.beginPath();
    const pegY = Math.max(1, game.spawnY - r - 8);
    ctx.moveTo(aim - 4, pegY); ctx.lineTo(aim + 4, pegY); ctx.lineTo(aim, pegY + 4); ctx.fill();
  }

  function paint() {
    ctx.setTransform(board.width / game.width, 0, 0, board.height / game.height, 0, 0);
    ctx.clearRect(0, 0, game.width, game.height);
    drawGuide();
    for (const b of game.bodies) art.draw(ctx, b.level, b.x, b.y, b.r, b.angle);
    ctx.textAlign = 'center';
    for (const fx of effects) {
      const t = fx.time / 0.65;
      const radius = game.radii[fx.level];
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (!reducedMotion.matches) {
        ctx.lineWidth = 2.5 * (1 - t);
        ctx.strokeStyle = '#fff8ce';
        ctx.beginPath(); ctx.arc(fx.x, fx.y, radius * (0.9 + t * 0.55), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff9dc';
      ctx.fillStyle = '#244c3d';
      const y = Math.max(18, fx.y - radius - (reducedMotion.matches ? 5 : t * 19));
      ctx.strokeText('+' + fx.points, fx.x, y); ctx.fillText('+' + fx.points, fx.x, y);
      ctx.restore();
    }
    ctx.textAlign = 'start';
  }

  function resize() {
    const ratio = Math.min(2.5, window.devicePixelRatio || 1);
    const rect = board.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * ratio));
    const h = Math.max(1, Math.round(rect.height * ratio));
    if (board.width !== w || board.height !== h) { board.width = w; board.height = h; }
    needsPaint = true;
  }

  function frame(time) {
    const dt = previousTime === undefined ? 0 : Math.max(0, Math.min((time - previousTime) / 1000, 0.05));
    previousTime = time;
    if (!modal && !document.hidden) {
      const dir = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      if (dir) { aim = game.clampX(aim + dir * dt * 280); needsPaint = true; }
      if (hasPlayed) {
        game.step(dt);
        handleEvents();
        const nowWarning = game.danger > 0;
        if (nowWarning !== warning) { warning = nowWarning; status(); }
        needsPaint = true;
      }
      for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].time += dt;
        if (effects[i].time > 0.65) effects.splice(i, 1);
      }
    }
    if (needsPaint) { paint(); needsPaint = false; }
    requestAnimationFrame(frame);
  }

  scoreChanged();
  i18n.onChange(updateLanguage);
  updateLanguage();
  showNext();
  steps.forEach(({icon}, i) => paintIcon(icon, i));
  art.ready.then(() => {
    steps.forEach(({icon}, i) => paintIcon(icon, i));
    showNext();
    needsPaint = true;
  });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(board);
  resize();
  requestAnimationFrame(frame);
})();
