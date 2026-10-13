// Main UI flow + input + bootstrap

(function () {
  const $ = id => document.getElementById(id);

  // Screens
  const loading = $('loading-screen');
  const menu = $('main-menu');
  const lobby = $('lobby-screen');
  const hud = $('game-hud');
  const gameOver = $('game-over');
  const settingsModal = $('settings-modal');

  function show(el) {
    [loading, menu, lobby, hud, gameOver].forEach(s => s.classList.add('hidden'));
    el.classList.remove('hidden');
  }

  // Init audio on first interaction
  function unlockAudio() {
    Audio.init();
    Audio.resume();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  }
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);

  // Loading
  setTimeout(() => {
    loading.classList.add('hidden');
    show(menu);
    game.initRenderer();
  }, 1400);

  // Magic grid
  function buildMagicGrid() {
    const grid = $('magic-grid');
    grid.innerHTML = '';
    MAGIC_LIST.forEach(m => {
      const card = document.createElement('div');
      card.className = 'magic-card';
      card.dataset.id = m.id;
      card.innerHTML = `<div class="icon">${m.icon}</div><div>${m.name}</div>`;
      card.title = m.description;
      card.addEventListener('click', () => {
        document.querySelectorAll('.magic-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        Audio.click();
      });
      grid.appendChild(card);
    });
  }

  // Menu buttons
  $('btn-host').addEventListener('click', () => {
    Audio.click();
    const code = Net.host();
    $('room-code').textContent = code;
    $('host-status').textContent = 'You are the Host – share this code';
    $('btn-start').classList.remove('hidden');
    if (!$('btn-add-ai')) {
      const b = document.createElement('button');
      b.id = 'btn-add-ai';
      b.className = 'btn secondary';
      b.textContent = 'ADD AI TEAMMATE';
      b.style.marginTop = '0.5rem';
      $('btn-start').parentNode.appendChild(b);
      b.addEventListener('click', () => {
        const free = MAGIC_LIST.find(m => !Net.players.some(p => p.magic === m.id));
        if (!free) { alert('All magics taken'); return; }
        Net.addDummyPlayer('Ally-' + free.name, free.id);
        Audio.click();
        updatePlayerList();
      });
    }
    $('join-panel').classList.add('hidden');
    buildMagicGrid();
    show(lobby);
    updatePlayerList();
  });

  $('btn-join').addEventListener('click', () => {
    Audio.click();
    Net.isHost = false;
    $('room-code').textContent = '-----';
    $('host-status').textContent = 'Enter host room code';
    $('btn-start').classList.add('hidden');
    $('join-panel').classList.remove('hidden');
    buildMagicGrid();
    show(lobby);
  });

  $('btn-join-confirm').addEventListener('click', () => {
    const code = $('join-code').value.trim().toUpperCase();
    if (code.length < 4) return;
    Net.join(code);
    $('room-code').textContent = code;
    $('host-status').textContent = 'Joined (prototype – same device / future P2P)';
    Audio.click();
    updatePlayerList();
  });

  $('btn-solo').addEventListener('click', () => {
    Audio.click();
    Net.host();
    $('room-code').textContent = 'SOLO';
    $('host-status').textContent = 'Solo practice – Ryo will assist';
    $('btn-start').classList.remove('hidden');
    if (!$('btn-add-ai')) {
      const b = document.createElement('button');
      b.id = 'btn-add-ai';
      b.className = 'btn secondary';
      b.textContent = 'ADD AI TEAMMATE';
      b.style.marginTop = '0.5rem';
      $('btn-start').parentNode.appendChild(b);
      b.addEventListener('click', () => {
        const free = MAGIC_LIST.find(m => !Net.players.some(p => p.magic === m.id));
        if (!free) { alert('All magics taken'); return; }
        Net.addDummyPlayer('Ally-' + free.name, free.id);
        Audio.click();
        updatePlayerList();
      });
    }
    $('join-panel').classList.add('hidden');
    buildMagicGrid();
    show(lobby);
    updatePlayerList();
  });

  $('btn-settings').addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });
  $('btn-close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    const master = parseFloat($('vol-master').value);
    const sfx = parseFloat($('vol-sfx').value);
    const voice = parseFloat($('vol-voice').value);
    Audio.setVolumes(master, sfx, voice);
    const pref = $('pref-cam').value;
    game.setCameraMode(pref);
  });

  $('btn-leave').addEventListener('click', () => {
    show(menu);
  });

  $('btn-ready').addEventListener('click', () => {
    const selected = document.querySelector('.magic-card.selected');
    if (!selected) {
      alert('Choose a magic attribute first');
      return;
    }
    const magicId = selected.dataset.id;
    const name = $('player-name').value.trim() || 'Knight';
    const isHealer = $('is-healer').checked;
    Net.setLocalInfo(name, magicId, isHealer);
    Net.setReady(true);
    Audio.click();
    updatePlayerList();
  });

  $('btn-start').addEventListener('click', () => {
    if (!Net.allReady()) {
      // For prototype allow start if host is ready
      const local = Net.players.find(p => p.id === Net.localId);
      if (!local || !local.magic) {
        alert('Select magic and press READY');
        return;
      }
    }
    Audio.fanfare();
    const playersData = Net.players.filter(p => p.magic).map(p => ({
      id: p.id,
      name: p.name,
      magic: p.magic,
      isHealer: p.isHealer
    }));
    if (playersData.length === 0) return;

    show(hud);
    lobby.classList.add('hidden');
    game.start(playersData, 1);
  });

  function updatePlayerList() {
    const list = $('player-list');
    list.innerHTML = '';
    Net.players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'player-chip' + (p.id === Net.localId ? ' host' : '') + (p.ready ? ' ready' : '');
      chip.textContent = `${p.name}${p.magic ? ' • ' + getMagic(p.magic).name : ''}${p.isHealer ? ' 💉' : ''}`;
      list.appendChild(chip);
    });
  }

  Net.onPlayerUpdate = updatePlayerList;

  // Camera toggle
  $('btn-cam-iso').addEventListener('click', () => {
    game.setCameraMode('iso');
    Audio.click();
  });
  $('btn-cam-third').addEventListener('click', () => {
    game.setCameraMode('third');
    Audio.click();
  });

  // Game over
  $('btn-retry').addEventListener('click', () => {
    gameOver.classList.add('hidden');
    show(lobby);
  });
  $('btn-menu').addEventListener('click', () => {
    gameOver.classList.add('hidden');
    show(menu);
  });

  // Keyboard input
  const keyMap = {
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'
  };
  window.addEventListener('keydown', e => {
    if (keyMap[e.code]) {
      game.input[keyMap[e.code]] = true;
      e.preventDefault();
    }
    // Abilities 1-4
    if (e.code === 'Digit1' || e.code === 'Numpad1') tryAbility(0);
    if (e.code === 'Digit2' || e.code === 'Numpad2') tryAbility(1);
    if (e.code === 'Digit3' || e.code === 'Numpad3') tryAbility(2);
    if (e.code === 'Digit4' || e.code === 'Numpad4') tryAbility(3);
    if (e.code === 'Space') tryAbility(0);
    if (e.code === 'KeyE') tryAbility(1);
    if (e.code === 'KeyQ') tryAbility(2);
    if (e.code === 'KeyR') tryAbility(3);
  });
  window.addEventListener('keyup', e => {
    if (keyMap[e.code]) game.input[keyMap[e.code]] = false;
  });

  function tryAbility(slot) {
    const local = game.world?.getLocalPlayer();
    if (local && local.alive) local.tryAbility(slot, game.world);
  }

  // Skill buttons mobile
  document.querySelectorAll('.skill-btn').forEach(btn => {
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      tryAbility(parseInt(btn.dataset.skill));
    });
    btn.addEventListener('click', () => tryAbility(parseInt(btn.dataset.skill)));
  });

  // Simple virtual joysticks
  function setupJoystick(el, isLeft) {
    let active = false;
    let startX = 0, startY = 0;
    const max = 40;

    function onStart(e) {
      active = true;
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
    }
    function onMove(e) {
      if (!active) return;
      const t = e.touches ? e.touches[0] : e;
      let dx = t.clientX - startX;
      let dy = t.clientY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      if (isLeft) {
        game.input.joyX = dx / max;
        game.input.joyY = dy / max;
      }
      // right stick could be used for aiming later
    }
    function onEnd() {
      active = false;
      if (isLeft) {
        game.input.joyX = 0;
        game.input.joyY = 0;
      }
    }
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }
  setupJoystick($('joystick-left'), true);
  setupJoystick($('joystick-right'), false);

  // PWA install prompt handling (optional)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Service worker
  
  // ===== Real multi-device WebRTC connect =====
  async function prepareHostOffer() {
    const offer = await Net.createOfferForClient();
    if (offer) {
      const panel = document.getElementById('host-offer-panel');
      if (panel) panel.classList.remove('hidden');
      const out = document.getElementById('offer-output');
      if (out) out.value = offer;
    }
  }

  document.getElementById('btn-copy-offer')?.addEventListener('click', () => {
    const out = document.getElementById('offer-output');
    if (out) {
      out.select();
      navigator.clipboard.writeText(out.value).then(() => alert('Offer copied! Send to friend.'));
    }
  });

  document.getElementById('btn-accept-answer')?.addEventListener('click', async () => {
    const ans = document.getElementById('answer-input')?.value.trim();
    if (!ans) return;
    const id = await Net.acceptAnswer(ans);
    if (id) {
      Audio.click();
      alert('Friend connected!');
      updatePlayerList();
    } else {
      alert('Failed to accept answer. Try again.');
    }
  });

  document.getElementById('btn-join-confirm')?.addEventListener('click', async () => {
    const offer = document.getElementById('offer-input')?.value.trim();
    if (!offer) {
      // fallback old room code
      const code = document.getElementById('join-code')?.value.trim().toUpperCase();
      if (code) {
        Net.join(code);
        document.getElementById('room-code').textContent = code;
        document.getElementById('host-status').textContent = 'Joined (local/test mode)';
        Audio.click();
        updatePlayerList();
      }
      return;
    }
    const answer = await Net.joinWithOffer(offer);
    if (answer) {
      const box = document.getElementById('answer-box');
      if (box) box.classList.remove('hidden');
      const out = document.getElementById('answer-output');
      if (out) out.value = answer;
      Audio.click();
      alert('Answer created! Copy it and send back to the Host.');
    } else {
      alert('Invalid offer. Ask host to create a new one.');
    }
  });

  document.getElementById('btn-copy-answer')?.addEventListener('click', () => {
    const out = document.getElementById('answer-output');
    if (out) {
      out.select();
      navigator.clipboard.writeText(out.value).then(() => alert('Answer copied! Send to host.'));
    }
  });

  // When hosting, also prepare an offer
  const origHost = document.getElementById('btn-host');
  if (origHost) {
    origHost.addEventListener('click', () => {
      setTimeout(prepareHostOffer, 300);
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
