import * as THREE from 'three';

// =====================
// LOADING UI + ERROR UI
// =====================
const loadingEl = document.getElementById('loading');
const barEl = document.getElementById('bar');
const loadTextEl = document.getElementById('loadText');
const invClockEl = document.getElementById('invClock');
const coinsHudEl = document.getElementById('coinsHud');
const playerHealthBarEl = document.getElementById('playerHealthBar');
const playerHealthTextEl = document.getElementById('playerHealthText');
const shopHintEl = document.getElementById('shopHint');
const shopScreenEl = document.getElementById('shopScreen');
const shopCoinsEl = document.getElementById('shopCoins');
const sceneTransitionOverlayEl = document.getElementById('sceneTransitionOverlay');
const sceneTransitionTitleEl = document.getElementById('sceneTransitionTitle');
const respawnFadeOverlayEl = document.getElementById('respawnFadeOverlay');
const musicPopupEl = document.getElementById('musicPopup');
const musicPopupTitleEl = document.getElementById('musicPopupTitle');
const reloadHintEl = document.getElementById('reloadHint');
const hitMarkerEl = document.getElementById('hitMarker');
const deathStatsScreenEl = document.getElementById('deathStatsScreen');
const deathRespawnBtnEl = document.getElementById('deathRespawnBtn');
const deathKillsEl = document.getElementById('deathKills');
const deathCoinsEl = document.getElementById('deathCoins');
const deathDamageEl = document.getElementById('deathDamage');
const deathTimeEl = document.getElementById('deathTime');
const deathClimbEl = document.getElementById('deathClimb');
const deathWaveEl = document.getElementById('deathWave');
const bankedCoinsTextEl = document.getElementById('bankedCoinsText');
const progressionUpgradeListEl = document.getElementById('progressionUpgradeList');
const homeScreenEl = document.getElementById('homeScreen');
const pauseMenuEl = document.getElementById('pauseMenu');
const homePlayBtnEl = document.getElementById('homePlayBtn');
const homeSettingsBtnEl = document.getElementById('homeSettingsBtn');
const homeCreditsBtnEl = document.getElementById('homeCreditsBtn');
const pauseResumeBtnEl = document.getElementById('pauseResumeBtn');
const pauseSettingsBtnEl = document.getElementById('pauseSettingsBtn');
const pauseHomeBtnEl = document.getElementById('pauseHomeBtn');
const settingsPanelEl = document.getElementById('settingsPanel');
const settingsPanelPauseEl = document.getElementById('settingsPanelPause');
const masterVolumeSliderEl = document.getElementById('masterVolumeSlider');
const musicVolumeSliderEl = document.getElementById('musicVolumeSlider');
const sfxVolumeSliderEl = document.getElementById('sfxVolumeSlider');
const mouseSensitivitySliderEl = document.getElementById('mouseSensitivitySlider');
const mouseSensitivityValueEl = document.getElementById('mouseSensitivityValue');
const muteToggleEl = document.getElementById('muteToggle');
const infoEl = document.getElementById('info');
const clickPromptEl = document.getElementById('clickPrompt');
const crosshairEl = document.getElementById('crosshair');
if (sceneTransitionTitleEl) {
  const gameTitle = (document.title || 'Prototype').split(/\s+-\s+/)[0].trim() || 'Prototype';
  sceneTransitionTitleEl.textContent = gameTitle;
}

const GAME_STATE = {
  HOME: 'HOME',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED'
};
let gameState = GAME_STATE.HOME;
let combatEnemiesInitialized = false;
const PROGRESSION_STORAGE_KEY = 'exstrike_progression_v1';
const progressionUpgrades = {
  startingHealth: { name: '+Starting Health', desc: '+15 max HP per level.', baseCost: 60, max: 5 },
  movement: { name: 'Faster Movement', desc: '+6% walk/sprint speed per level.', baseCost: 75, max: 4 },
  startingGun: { name: 'Better Starting Gun', desc: 'Start with stronger weapons as it levels.', baseCost: 120, max: 3 },
  fireRate: { name: 'Weapon Handling', desc: 'Permanent fire-rate boost.', baseCost: 90, max: 4 },
  coinBonus: { name: 'Coin Magnetism', desc: '+15% coin rewards per level.', baseCost: 80, max: 4 }
};
const progressionState = {
  bankedCoins: 0,
  upgrades: {
    startingHealth: 0,
    movement: 0,
    startingGun: 0,
    fireRate: 0,
    coinBonus: 0
  }
};
const BACKGROUND_MUSIC_PLAYLIST = [
  { title: "Warrior's Echo", src: "./assets/audio/Warrior's Echo.mp3" },
  { title: 'Gladiator Spirit', src: './assets/audio/Gladiator Spirit.mp3' },
  { title: 'Stomp and Holler', src: './assets/audio/Stomp and Holler.mp3' },
  { title: 'Battle on the Rock', src: './assets/audio/Battle on the Rock (1).mp3' }
];
const audioSettings = {
  master: 1,
  music: 1,
  sfx: 1,
  muted: false
};
const inputSettings = {
  mouseSensitivity: 1
};
let backgroundMusicEl = null;
let backgroundMusicStarted = false;
let backgroundMusicShouldPlay = false;
let backgroundMusicPendingGesture = false;
let gameAudioCtx = null;
let backgroundMusicIndex = 0;
const shownMusicPopupTracks = new Set();
let musicPopupTimer = null;

function isGameplayRunning() {
  return gameState === GAME_STATE.PLAYING;
}

const manager = new THREE.LoadingManager();

manager.onProgress = (url, loaded, total) => {
  const pct = total ? Math.round((loaded/total)*100) : 0;
  barEl.style.width = pct + '%';
  loadTextEl.textContent = total ? `Loading: ${pct}%` : `Loading... (${loaded})`;
};

manager.onError = (url) => {
  console.error("LoadingManager failed:", url);
  loadTextEl.textContent = "FAILED: " + url;
  loadingEl.style.background = "rgba(120,0,0,0.92)";
};

manager.onLoad = () => {
  loadingEl.style.display = 'none';
};

function syncAudioSettingsFromUI() {
  if (masterVolumeSliderEl) audioSettings.master = (Number(masterVolumeSliderEl.value) || 0) / 100;
  if (musicVolumeSliderEl) audioSettings.music = (Number(musicVolumeSliderEl.value) || 0) / 100;
  if (sfxVolumeSliderEl) audioSettings.sfx = (Number(sfxVolumeSliderEl.value) || 0) / 100;
  if (muteToggleEl) audioSettings.muted = !!muteToggleEl.checked;
  if (mouseSensitivitySliderEl) inputSettings.mouseSensitivity = THREE.MathUtils.clamp((Number(mouseSensitivitySliderEl.value) || 100) / 100, 0.25, 2);
  updateMouseSensitivityText();
}

function applyAudioSettingsToUI() {
  if (masterVolumeSliderEl) masterVolumeSliderEl.value = String(Math.round(audioSettings.master * 100));
  if (musicVolumeSliderEl) musicVolumeSliderEl.value = String(Math.round(audioSettings.music * 100));
  if (sfxVolumeSliderEl) sfxVolumeSliderEl.value = String(Math.round(audioSettings.sfx * 100));
  if (muteToggleEl) muteToggleEl.checked = !!audioSettings.muted;
  if (mouseSensitivitySliderEl) mouseSensitivitySliderEl.value = String(Math.round(inputSettings.mouseSensitivity * 100));
  updateMouseSensitivityText();
  if (settingsPanelPauseEl) {
    const pMaster = settingsPanelPauseEl.querySelector('#pauseMasterVolumeSlider');
    const pMusic = settingsPanelPauseEl.querySelector('#pauseMusicVolumeSlider');
    const pSfx = settingsPanelPauseEl.querySelector('#pauseSfxVolumeSlider');
    const pMouse = settingsPanelPauseEl.querySelector('#pauseMouseSensitivitySlider');
    const pMute = settingsPanelPauseEl.querySelector('#pauseMuteToggle');
    if (pMaster) pMaster.value = String(Math.round(audioSettings.master * 100));
    if (pMusic) pMusic.value = String(Math.round(audioSettings.music * 100));
    if (pSfx) pSfx.value = String(Math.round(audioSettings.sfx * 100));
    if (pMouse) pMouse.value = String(Math.round(inputSettings.mouseSensitivity * 100));
    if (pMute) pMute.checked = !!audioSettings.muted;
    const pMouseValue = settingsPanelPauseEl.querySelector('#pauseMouseSensitivityValue');
    if (pMouseValue) pMouseValue.textContent = `Mouse Sensitivity: ${Math.round(inputSettings.mouseSensitivity * 100)}%`;
  }
}

function updateMouseSensitivityText() {
  if (mouseSensitivityValueEl) {
    mouseSensitivityValueEl.textContent = `Mouse Sensitivity: ${Math.round(inputSettings.mouseSensitivity * 100)}%`;
  }
}

function initBackgroundMusic() {
  if (!BACKGROUND_MUSIC_PLAYLIST.length || backgroundMusicEl) return;
  backgroundMusicEl = new Audio(BACKGROUND_MUSIC_PLAYLIST[backgroundMusicIndex].src);
  backgroundMusicEl.loop = false;
  backgroundMusicEl.preload = 'auto';
  backgroundMusicEl.playsInline = true;
  backgroundMusicEl.addEventListener('canplaythrough', () => {
    if (backgroundMusicShouldPlay) {
      attemptBackgroundMusicPlayback();
    }
  });
  backgroundMusicEl.addEventListener('ended', () => {
    playNextBackgroundTrack();
  });
  backgroundMusicEl.addEventListener('error', () => {
    console.error('Background music failed to load:', BACKGROUND_MUSIC_PLAYLIST[backgroundMusicIndex].src, backgroundMusicEl?.error);
    playNextBackgroundTrack();
  });
  backgroundMusicEl.load();
  applyAudioSettings();
}

function showMusicPopupForCurrentTrack() {
  if (!musicPopupEl || !musicPopupTitleEl) return;
  const track = BACKGROUND_MUSIC_PLAYLIST[backgroundMusicIndex];
  if (shownMusicPopupTracks.has(track.src)) return;
  musicPopupTitleEl.textContent = `Now Playing: ${track.title}`;
  musicPopupEl.classList.add('active');
  shownMusicPopupTracks.add(track.src);
  if (musicPopupTimer) clearTimeout(musicPopupTimer);
  musicPopupTimer = setTimeout(() => {
    musicPopupEl.classList.remove('active');
  }, 5200);
}

function playNextBackgroundTrack() {
  if (!BACKGROUND_MUSIC_PLAYLIST.length || !backgroundMusicEl) return;
  backgroundMusicIndex = (backgroundMusicIndex + 1) % BACKGROUND_MUSIC_PLAYLIST.length;
  backgroundMusicStarted = false;
  backgroundMusicEl.src = BACKGROUND_MUSIC_PLAYLIST[backgroundMusicIndex].src;
  backgroundMusicEl.load();
  applyAudioSettings();
  if (backgroundMusicShouldPlay) attemptBackgroundMusicPlayback();
}

function applyAudioSettings() {
  const volume = audioSettings.muted ? 0 : Math.max(0, Math.min(1, audioSettings.master * audioSettings.music));
  if (backgroundMusicEl) {
    backgroundMusicEl.volume = volume;
    backgroundMusicEl.muted = !!audioSettings.muted || volume <= 0;
  }
}

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  gameAudioCtx = gameAudioCtx || new AudioCtx();
  if (gameAudioCtx.state === 'suspended') gameAudioCtx.resume();
  return gameAudioCtx;
}

function getSfxVolume(mult = 1) {
  if (audioSettings.muted) return 0;
  return THREE.MathUtils.clamp(audioSettings.master * audioSettings.sfx * mult, 0, 1);
}

function playSfxTone({ freq = 440, endFreq = freq, type = 'square', duration = 0.12, volume = 0.35, attack = 0.005 }) {
  const ctx = getAudioContext();
  const vol = getSfxVolume(volume);
  if (!ctx || vol <= 0) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function playSfxNoise({ duration = 0.12, volume = 0.28, lowpass = 1800 } = {}) {
  const ctx = getAudioContext();
  const vol = getSfxVolume(volume);
  if (!ctx || vol <= 0) return;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

function playGameSfx(name) {
  if (name === 'shoot') {
    playSfxNoise({ duration: 0.08, volume: 0.42, lowpass: 2600 });
    playSfxTone({ freq: 130, endFreq: 70, type: 'sawtooth', duration: 0.11, volume: 0.22 });
  } else if (name === 'chest') {
    playSfxTone({ freq: 260, endFreq: 520, type: 'triangle', duration: 0.16, volume: 0.28 });
    setTimeout(() => playSfxTone({ freq: 390, endFreq: 780, type: 'triangle', duration: 0.12, volume: 0.2 }), 70);
  } else if (name === 'coin') {
    playSfxTone({ freq: 880, endFreq: 1320, type: 'sine', duration: 0.09, volume: 0.24 });
  } else if (name === 'hurt') {
    playSfxTone({ freq: 150, endFreq: 70, type: 'sawtooth', duration: 0.2, volume: 0.32 });
  } else if (name === 'enemyDeath') {
    playSfxNoise({ duration: 0.18, volume: 0.34, lowpass: 900 });
    playSfxTone({ freq: 120, endFreq: 45, type: 'sawtooth', duration: 0.28, volume: 0.28 });
  } else if (name === 'buy') {
    playSfxTone({ freq: 520, endFreq: 740, type: 'triangle', duration: 0.1, volume: 0.22 });
    setTimeout(() => playSfxTone({ freq: 740, endFreq: 980, type: 'triangle', duration: 0.1, volume: 0.18 }), 80);
  } else if (name === 'reload') {
    playSfxTone({ freq: 190, endFreq: 150, type: 'triangle', duration: 0.08, volume: 0.16 });
    setTimeout(() => playSfxTone({ freq: 320, endFreq: 410, type: 'triangle', duration: 0.11, volume: 0.18 }), 95);
  } else if (name === 'empty') {
    playSfxTone({ freq: 130, endFreq: 110, type: 'square', duration: 0.06, volume: 0.12 });
  }
}

function attemptBackgroundMusicPlayback() {
  if (!backgroundMusicEl || !backgroundMusicShouldPlay || gameState !== GAME_STATE.PLAYING) return;
  if (!backgroundMusicStarted) {
    backgroundMusicEl.currentTime = 0;
    showMusicPopupForCurrentTrack();
  }
  const playPromise = backgroundMusicEl.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise.then(() => {
      backgroundMusicStarted = true;
      backgroundMusicPendingGesture = false;
    }).catch((err) => {
      backgroundMusicPendingGesture = true;
      console.warn('Background music playback is waiting for another user gesture.', err);
    });
  } else {
    backgroundMusicStarted = true;
    backgroundMusicPendingGesture = false;
  }
}

function ensureBackgroundMusicPlayback() {
  if (gameState !== GAME_STATE.PLAYING) return;
  initBackgroundMusic();
  backgroundMusicShouldPlay = true;
  getAudioContext();
  attemptBackgroundMusicPlayback();
}

function ensureBackgroundMusicPlaybackAfterPlay() {
  if (gameState !== GAME_STATE.PLAYING) return;
  ensureBackgroundMusicPlayback();
}

function stopBackgroundMusicForMenus() {
  backgroundMusicShouldPlay = false;
  backgroundMusicPendingGesture = false;
  if (backgroundMusicEl) {
    backgroundMusicEl.pause();
  }
}

function setSettingsVisible(show, fromPause = false) {
  if (settingsPanelEl) settingsPanelEl.classList.toggle('active', !!show && !fromPause);
  if (settingsPanelPauseEl) settingsPanelPauseEl.classList.toggle('active', !!show && fromPause);
}

function setGameState(nextState) {
  gameState = nextState;
  const inHome = gameState === GAME_STATE.HOME;
  const inPause = gameState === GAME_STATE.PAUSED;
  const inPlay = gameState === GAME_STATE.PLAYING;

  if (homeScreenEl) homeScreenEl.classList.toggle('active', inHome);
  if (pauseMenuEl) pauseMenuEl.classList.toggle('active', inPause);
  if (infoEl) infoEl.style.display = inHome ? 'none' : 'block';
  if (clickPromptEl) clickPromptEl.style.opacity = inPlay && !isLocked ? '1' : '0';
  if (crosshairEl) crosshairEl.style.opacity = inPlay && isLocked ? '0.95' : '0';

  if (!inPlay) {
    rightMouseAutoFire = false;
    stopBackgroundMusicForMenus();
    if (isShopOpen()) closeShop();
    const inv = document.getElementById('inventoryScreen');
    if (inv && inv.style.display === 'flex') {
      inv.style.display = 'none';
      hoverSlotIndex = null;
      renderCursorStack();
    }
    document.exitPointerLock?.();
  }
}

function startGameFromHome() {
  if (!homeScreenEl || gameState !== GAME_STATE.HOME) return;
  homeScreenEl.classList.remove('active');
  setSettingsVisible(false, false);
  setTimeout(() => {
    setGameState(GAME_STATE.PLAYING);
    playerHealth = getPlayerMaxHp();
    refreshHealthHud();
    applyStartingLoadout();
    startWaveRun();
    ensureBackgroundMusicPlayback();
    requestPointerLockSafe();
  }, 520);
}

function pauseGame() {
  if (gameState !== GAME_STATE.PLAYING) return;
  setSettingsVisible(false, true);
  setGameState(GAME_STATE.PAUSED);
}

function resumeGame() {
  if (gameState !== GAME_STATE.PAUSED) return;
  setSettingsVisible(false, true);
  setGameState(GAME_STATE.PLAYING);
  ensureBackgroundMusicPlayback();
  requestPointerLockSafe();
}

function quitToHome() {
  setSettingsVisible(false, true);
  if (deathStatsScreenEl) deathStatsScreenEl.classList.remove('active');
  respawnState = 'idle';
  currentWorldZone = WORLD_ZONE.START;
  player.position.set(START_SPAWN.x, START_SPAWN.y, START_SPAWN.z);
  const spawnGroundY = sampleGroundHeight(player.position.x, player.position.z, player.position.y);
  player.position.y = spawnGroundY + RESPAWN_STANDING_OFFSET;
  vel.set(0, 0, 0);
  playerHealth = getPlayerMaxHp();
  refreshHealthHud();
  clearEnemyProjectiles();
  resetLifeStats();
  for (const k in keys) keys[k] = false;
  setGameState(GAME_STATE.HOME);
}

if (settingsPanelPauseEl) {
  settingsPanelPauseEl.innerHTML = `
    <div class="settingsRow"><span>Master Volume</span><input id="pauseMasterVolumeSlider" type="range" min="0" max="100" value="100"></div>
    <div class="settingsRow"><span>Music Volume</span><input id="pauseMusicVolumeSlider" type="range" min="0" max="100" value="100"></div>
    <div class="settingsRow"><span>SFX Volume</span><input id="pauseSfxVolumeSlider" type="range" min="0" max="100" value="100"></div>
    <div class="settingsRow"><span>Mouse Sensitivity</span><input id="pauseMouseSensitivitySlider" type="range" min="25" max="200" value="100"></div>
    <div class="settingsValue" id="pauseMouseSensitivityValue">Mouse Sensitivity: 100%</div>
    <div class="settingsRow"><span>Mute</span><input id="pauseMuteToggle" type="checkbox"></div>
    <div class="keybindHelp">
      WASD = Move | SHIFT = Sprint | SPACE = Jump<br>
      LEFT CLICK = Shoot / Open Chest | R = Reload | P = Return Home | E = Inventory | 1-9 / Scroll = Switch | TAB = 3rd Person
    </div>
  `;
}

function bindSettingsUI() {
  const onAnyChange = () => {
    syncAudioSettingsFromUI();
    applyAudioSettings();
    if (settingsPanelPauseEl) {
      const pMaster = settingsPanelPauseEl.querySelector('#pauseMasterVolumeSlider');
      const pMusic = settingsPanelPauseEl.querySelector('#pauseMusicVolumeSlider');
      const pSfx = settingsPanelPauseEl.querySelector('#pauseSfxVolumeSlider');
      const pMouse = settingsPanelPauseEl.querySelector('#pauseMouseSensitivitySlider');
      const pMute = settingsPanelPauseEl.querySelector('#pauseMuteToggle');
      if (pMaster) pMaster.value = masterVolumeSliderEl.value;
      if (pMusic) pMusic.value = musicVolumeSliderEl.value;
      if (pSfx) pSfx.value = sfxVolumeSliderEl.value;
      if (pMouse && mouseSensitivitySliderEl) pMouse.value = mouseSensitivitySliderEl.value;
      if (pMute) pMute.checked = muteToggleEl.checked;
      const pMouseValue = settingsPanelPauseEl.querySelector('#pauseMouseSensitivityValue');
      if (pMouseValue) pMouseValue.textContent = `Mouse Sensitivity: ${Math.round(inputSettings.mouseSensitivity * 100)}%`;
    }
  };
  if (masterVolumeSliderEl) masterVolumeSliderEl.addEventListener('input', onAnyChange);
  if (musicVolumeSliderEl) musicVolumeSliderEl.addEventListener('input', onAnyChange);
  if (sfxVolumeSliderEl) sfxVolumeSliderEl.addEventListener('input', onAnyChange);
  if (mouseSensitivitySliderEl) mouseSensitivitySliderEl.addEventListener('input', onAnyChange);
  if (muteToggleEl) muteToggleEl.addEventListener('change', onAnyChange);

  if (settingsPanelPauseEl) {
    const pMaster = settingsPanelPauseEl.querySelector('#pauseMasterVolumeSlider');
    const pMusic = settingsPanelPauseEl.querySelector('#pauseMusicVolumeSlider');
    const pSfx = settingsPanelPauseEl.querySelector('#pauseSfxVolumeSlider');
    const pMouse = settingsPanelPauseEl.querySelector('#pauseMouseSensitivitySlider');
    const pMute = settingsPanelPauseEl.querySelector('#pauseMuteToggle');
    const onPauseChange = () => {
      if (pMaster) audioSettings.master = (Number(pMaster.value) || 0) / 100;
      if (pMusic) audioSettings.music = (Number(pMusic.value) || 0) / 100;
      if (pSfx) audioSettings.sfx = (Number(pSfx.value) || 0) / 100;
      if (pMouse) inputSettings.mouseSensitivity = THREE.MathUtils.clamp((Number(pMouse.value) || 100) / 100, 0.25, 2);
      if (pMute) audioSettings.muted = !!pMute.checked;
      applyAudioSettingsToUI();
      applyAudioSettings();
    };
    if (pMaster) pMaster.addEventListener('input', onPauseChange);
    if (pMusic) pMusic.addEventListener('input', onPauseChange);
    if (pSfx) pSfx.addEventListener('input', onPauseChange);
    if (pMouse) pMouse.addEventListener('input', onPauseChange);
    if (pMute) pMute.addEventListener('change', onPauseChange);
  }
}

function showHomePage(page) {
  const selected = page || 'options';
  document.querySelectorAll('.homeTab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.homePage === selected);
  });
  document.querySelectorAll('[data-home-page-panel]').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.homePagePanel === selected);
  });
}

// =====================
// SCENE SETUP
// =====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88bbff);
scene.fog = new THREE.FogExp2(0x88bbff, 0.00003);

const camera = new THREE.PerspectiveCamera(78, innerWidth/innerHeight, 0.1, 60000);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);
const hemiLight = new THREE.HemisphereLight(0x9ad6ff, 0x2a4a2a, 0.65);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(1400, 2200, 1100);
sun.castShadow = true;
sun.shadow.mapSize.width = sun.shadow.mapSize.height = 4096;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 5000;
sun.shadow.camera.left = -1600;
sun.shadow.camera.right = 1600;
sun.shadow.camera.top = 1600;
sun.shadow.camera.bottom = -1600;
scene.add(sun);
sun.target.position.set(0, 0, 0);
scene.add(sun.target);

const moonLight = new THREE.DirectionalLight(0x9fb8ff, 0.0);
moonLight.position.set(-1400, 2200, -1100);
scene.add(moonLight);
moonLight.target.position.set(0, 0, 0);
scene.add(moonLight.target);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(125, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd474 })
);
scene.add(sunMesh);

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(95, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xdde6ff })
);
scene.add(moonMesh);

const skyDay = new THREE.Color(0x88bbff);
const skySunset = new THREE.Color(0xf29a5b);
const skyNight = new THREE.Color(0x071326);
const _skyMixA = new THREE.Color();
const _skyMixB = new THREE.Color();

// Minecraft-style clock: 24000 ticks per day, 20 real minutes per full cycle.
const DAY_LENGTH_SECONDS = 1200;
let mcTicks = 0; // 0 ticks ~= 6:00 AM in Minecraft

function formatGameClockFromTicks(ticks) {
  const normTicks = ((ticks % 24000) + 24000) % 24000;
  const hour24f = ((normTicks / 1000) + 6) % 24;
  const totalMinutes = Math.floor(hour24f * 60);
  const h24 = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = String(min).padStart(2, '0');
  return `${String(h12).padStart(2, '0')}:${mm} ${suffix}`;
}

function updateInventoryClock() {
  if (!invClockEl) return;
  invClockEl.textContent = formatGameClockFromTicks(mcTicks);
}

function updateDayNight(delta) {
  mcTicks = (mcTicks + (24000 / DAY_LENGTH_SECONDS) * delta) % 24000;
  // 0 ticks = sunrise (6 AM), 6000 = noon, 12000 = sunset, 18000 = midnight.
  const cycle = (mcTicks / 24000) * Math.PI * 2;
  const sunElevation = Math.sin(cycle - Math.PI / 2);
  const sunAzimuth = cycle - Math.PI * 0.15;

  const skyRadius = 11000;
  const centerX = player.position.x;
  const centerZ = player.position.z;
  const sx = centerX + Math.cos(sunAzimuth) * skyRadius;
  const sy = 1000 + sunElevation * 6000;
  const sz = centerZ + Math.sin(sunAzimuth) * skyRadius;

  sun.position.set(sx, sy, sz);
  sun.target.position.set(centerX, 0, centerZ);
  sunMesh.position.set(sx, sy, sz);

  const mx = centerX - Math.cos(sunAzimuth) * skyRadius;
  const my = 1000 - sunElevation * 6000;
  const mz = centerZ - Math.sin(sunAzimuth) * skyRadius;
  moonLight.position.set(mx, my, mz);
  moonLight.target.position.set(centerX, 0, centerZ);
  moonMesh.position.set(mx, my, mz);

  const dayFactor = THREE.MathUtils.clamp((sunElevation + 0.18) / 1.18, 0, 1);
  const sunsetFactor = 1 - Math.abs(dayFactor * 2 - 1);

  // Brighter daylight so sun "shines" more like expected.
  sun.intensity = Math.max(0, sunElevation) * 3.0 + dayFactor * 0.55;
  moonLight.intensity = Math.max(0, -sunElevation) * 0.35;
  ambientLight.intensity = 0.09 + dayFactor * 0.33;
  hemiLight.intensity = 0.16 + dayFactor * 0.78;

  sunMesh.visible = sy > -200;
  moonMesh.visible = my > -200;

  _skyMixA.copy(skyNight).lerp(skySunset, sunsetFactor * 0.75);
  _skyMixB.copy(_skyMixA).lerp(skyDay, dayFactor);
  scene.background.copy(_skyMixB);
  scene.fog.color.copy(_skyMixB);
  scene.fog.density = THREE.MathUtils.lerp(0.000065, 0.000022, dayFactor);

  updateInventoryClock();
}

// =====================
// TEXTURES (GROUND)
// =====================
function makeGroundColorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');

  g.fillStyle = '#497f3a';
  g.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.4 + Math.random() * 1.5;
    const green = 105 + Math.floor(Math.random() * 80);
    g.fillStyle = `rgb(${20 + (green >> 2)},${green},${18 + (green >> 3)})`;
    g.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGroundNormalTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');

  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const nx = 128 + Math.floor((Math.random() - 0.5) * 22);
    const ny = 128 + Math.floor((Math.random() - 0.5) * 22);
    img.data[i + 0] = nx;
    img.data[i + 1] = ny;
    img.data[i + 2] = 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

const groundColor = makeGroundColorTexture();
const groundNormal = makeGroundNormalTexture();

groundColor.wrapS = groundColor.wrapT = THREE.RepeatWrapping;
groundColor.repeat.set(140, 140);
groundColor.colorSpace = THREE.SRGBColorSpace;

groundNormal.wrapS = groundNormal.wrapT = THREE.RepeatWrapping;
groundNormal.repeat.set(140, 140);

groundColor.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
groundNormal.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;

// No remote ground texture fetches now; unblock UI immediately.
loadingEl.style.display = 'none';

// FLOOR
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(32000, 32000),
  new THREE.MeshStandardMaterial({
    map: groundColor,
    normalMap: groundNormal,
    roughness: 1.0,
    metalness: 0.0
  })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

// =====================
// WORLD LAYOUT
// =====================
const MEGA_TOWER_RADIUS = 1700;
const MEGA_TOWER_WALL_HALF = 34;
const MEGA_TOWER_DOOR_WIDTH = 240;
const INTRO_CENTER_Z = 2800;
const START_AREA_CENTER_X = 0;
const START_AREA_CENTER_Z = 2850;
const spawnMountainColliders = []; // { x, z, radius }
const ENTRANCE_PATH_CLEAR_BOX = {
  xMin: -260,
  xMax: 260,
  zMin: 1700,
  zMax: START_AREA_CENTER_Z + 120
};

function intersectsEntrancePathClearBox(x, z, radius = 0) {
  return (
    x + radius >= ENTRANCE_PATH_CLEAR_BOX.xMin &&
    x - radius <= ENTRANCE_PATH_CLEAR_BOX.xMax &&
    z + radius >= ENTRANCE_PATH_CLEAR_BOX.zMin &&
    z - radius <= ENTRANCE_PATH_CLEAR_BOX.zMax
  );
}

function createMegaTowerShell() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6f7278, roughness: 0.96, metalness: 0.02 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4e5258, roughness: 0.95, metalness: 0.0 });
  const group = new THREE.Group();

  const height = 980;
  const wallSegments = 128;
  const arcLen = (Math.PI * 2 * MEGA_TOWER_RADIUS) / wallSegments;
  const gapHalfAngle = (MEGA_TOWER_DOOR_WIDTH / MEGA_TOWER_RADIUS) * 0.55;
  const doorwayAngle = Math.PI * 0.5; // +Z side

  for (let i = 0; i < wallSegments; i++) {
    const a = (i / wallSegments) * Math.PI * 2;
    let da = Math.abs(a - doorwayAngle);
    if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < gapHalfAngle) continue;

    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(arcLen * 0.98, height, MEGA_TOWER_WALL_HALF * 2),
      wallMat
    );
    seg.position.set(
      Math.cos(a) * MEGA_TOWER_RADIUS,
      height * 0.5,
      Math.sin(a) * MEGA_TOWER_RADIUS
    );
    seg.rotation.y = -a;
    seg.castShadow = true;
    seg.receiveShadow = true;
    group.add(seg);
  }

  // Door arch and a short outside stair/ramp toward the beginning scene.
  const arch = new THREE.Mesh(new THREE.BoxGeometry(MEGA_TOWER_DOOR_WIDTH + 70, 95, 52), trimMat);
  arch.position.set(0, 48, MEGA_TOWER_RADIUS - 10);
  arch.castShadow = true;
  arch.receiveShadow = true;
  group.add(arch);

  const approach = new THREE.Mesh(new THREE.BoxGeometry(220, 8, 340), trimMat);
  approach.position.set(0, 4, MEGA_TOWER_RADIUS + 170);
  approach.castShadow = true;
  approach.receiveShadow = true;
  group.add(approach);

  // Entrance markers: lit braziers and a stone path to make the doorway read clearly.
  const torchWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1f, roughness: 0.9, metalness: 0.0 });
  const torchMetalMat = new THREE.MeshStandardMaterial({ color: 0x3f454c, roughness: 0.75, metalness: 0.2 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffb35a,
    emissive: 0xff7a1f,
    emissiveIntensity: 1.9,
    roughness: 0.35,
    metalness: 0.0
  });
  const pathMatA = new THREE.MeshStandardMaterial({ color: 0x666a70, roughness: 0.95, metalness: 0.0 });
  const pathMatB = new THREE.MeshStandardMaterial({ color: 0x596067, roughness: 0.95, metalness: 0.0 });

  const torchOffsetX = (MEGA_TOWER_DOOR_WIDTH * 0.5) + 58;
  const torchZ = MEGA_TOWER_RADIUS + 26;
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 84, 10), torchWoodMat);
    pole.position.set(side * torchOffsetX, 42, torchZ);
    pole.castShadow = true;
    pole.receiveShadow = true;
    group.add(pole);

    const bracket = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 12), torchMetalMat);
    bracket.position.set(side * torchOffsetX, 74, torchZ - 2);
    bracket.castShadow = true;
    bracket.receiveShadow = true;
    group.add(bracket);

    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(12, 15, 12, 12), torchMetalMat);
    brazier.position.set(side * torchOffsetX, 81, torchZ - 6);
    brazier.castShadow = true;
    brazier.receiveShadow = true;
    group.add(brazier);

    const flame = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), flameMat);
    flame.position.set(side * torchOffsetX, 91, torchZ - 6);
    flame.castShadow = true;
    group.add(flame);

    const torchLight = new THREE.PointLight(0xffa24d, 2.2, 780, 2);
    torchLight.position.set(side * torchOffsetX, 94, torchZ - 6);
    group.add(torchLight);
  }

  for (let i = 0; i < 7; i++) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(186, 2.6, 72),
      i % 2 === 0 ? pathMatA : pathMatB
    );
    slab.position.set(0, 1.3, MEGA_TOWER_RADIUS + 240 + i * 108);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  }

  // Crown ring to make silhouette read like a huge enclosing tower.
  const crown = new THREE.Mesh(
    new THREE.TorusGeometry(MEGA_TOWER_RADIUS, 16, 14, 120),
    trimMat
  );
  crown.rotation.x = Math.PI * 0.5;
  crown.position.y = height - 12;
  crown.castShadow = true;
  crown.receiveShadow = true;
  group.add(crown);

  scene.add(group);
}

function createIntroMountains() {
  const matA = new THREE.MeshStandardMaterial({ color: 0x5b646b, roughness: 1.0, metalness: 0.0 });
  const matB = new THREE.MeshStandardMaterial({ color: 0x70787f, roughness: 1.0, metalness: 0.0 });

  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    // Leave a valley opening facing the big tower door (toward negative Z).
    let da = Math.abs(a - (-Math.PI * 0.5));
    if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < 0.36) continue;

    const r = 920 + Math.random() * 460;
    const h = 220 + Math.random() * 620;
    const rad = 120 + Math.random() * 170;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(rad, h, 10 + Math.floor(Math.random() * 8)),
      Math.random() < 0.5 ? matA : matB
    );
    mountain.position.set(
      Math.cos(a) * r,
      h * 0.5,
      INTRO_CENTER_Z + Math.sin(a) * r
    );
    mountain.rotation.y = Math.random() * Math.PI;
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    scene.add(mountain);
  }
}

function createSpawnMountainRing() {
  const ringCenterX = 0;
  const ringCenterZ = 2850;
  const ringRadius = 1000;
  const angleStepDeg = 4;
  const baseRadius = 350;
  const gapCenterAngle = -Math.PI * 0.5; // toward (0,0,0) from spawn
  const gapHalfAngle = THREE.MathUtils.degToRad(15); // 30 deg total opening

  spawnMountainColliders.length = 0;

  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x4f595f, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x5f6a6f, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x68746f, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x3f4f44, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x47574b, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x50614f, roughness: 1.0, metalness: 0.0 })
  ];

  for (let deg = 0; deg < 360; deg += angleStepDeg) {
    const angle = THREE.MathUtils.degToRad(deg);
    let delta = Math.abs(angle - gapCenterAngle);
    if (delta > Math.PI) delta = (Math.PI * 2) - delta;
    if (delta < gapHalfAngle) continue;

    const mountainHeight = 400 + Math.random() * 400; // 400..800
    const x = ringCenterX + Math.cos(angle) * ringRadius;
    const z = ringCenterZ + Math.sin(angle) * ringRadius;
    if (intersectsEntrancePathClearBox(x, z, baseRadius)) continue;

    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(baseRadius, mountainHeight, 14),
      materials[Math.floor(Math.random() * materials.length)]
    );
    mountain.position.set(x, mountainHeight * 0.5, z);
    mountain.rotation.y = Math.random() * Math.PI * 2;
    mountain.rotation.x = (Math.random() - 0.5) * 0.06;
    mountain.rotation.z = (Math.random() - 0.5) * 0.06;
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    scene.add(mountain);

    spawnMountainColliders.push({
      x,
      z,
      radius: baseRadius
    });
  }
}

function createSpawnGatePillarMountains() {
  const pillarMats = [
    new THREE.MeshStandardMaterial({ color: 0x34393f, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x3d4248, roughness: 1.0, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x464c53, roughness: 1.0, metalness: 0.0 })
  ];
  const pillars = [
    { x: -350, z: 2200 },
    { x: -500, z: 2050 },
    { x: -380, z: 1900 },
    { x: -520, z: 1750 },
    { x: 780, z: 2450 },
    { x: 640, z: 2200 },
    { x: 350, z: 2200 },
    { x: 500, z: 2050 },
    { x: 380, z: 1900 },
    { x: 520, z: 1750 }
  ];

  for (const p of pillars) {
    const pillarHeight = 500 + Math.random() * 250; // 500..750
    const pillarRadius = 180 + Math.random() * 70;  // 180..250
    if (intersectsEntrancePathClearBox(p.x, p.z, pillarRadius)) continue;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(pillarRadius, pillarHeight, 14),
      pillarMats[Math.floor(Math.random() * pillarMats.length)]
    );
    mountain.position.set(p.x, pillarHeight * 0.5, p.z);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    scene.add(mountain);

    spawnMountainColliders.push({
      x: p.x,
      z: p.z,
      radius: pillarRadius
    });
  }
}

createMegaTowerShell();
createIntroMountains();
createSpawnMountainRing();
createSpawnGatePillarMountains();

let merchant = null;
function createMerchantShopStand() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a482a, roughness: 0.88, metalness: 0.0 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xa5452b, roughness: 0.9, metalness: 0.0 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe1b18f, roughness: 0.92, metalness: 0.0 });
  const robe = new THREE.MeshStandardMaterial({ color: 0x2f3e6e, roughness: 0.9, metalness: 0.0 });

  const stand = new THREE.Group();
  const sx = 520;
  const sz = INTRO_CENTER_Z + 260; // open area, not entrance

  const table = new THREE.Mesh(new THREE.BoxGeometry(170, 10, 80), wood);
  table.position.set(sx, 55, sz);
  table.castShadow = true;
  table.receiveShadow = true;
  stand.add(table);

  const legPos = [[-70,-30], [70,-30], [-70,30], [70,30]];
  for (const [lx, lz] of legPos) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(10, 55, 10), wood);
    leg.position.set(sx + lx, 27.5, sz + lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    stand.add(leg);
  }

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(190, 10, 100), cloth);
  canopy.position.set(sx, 128, sz);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  stand.add(canopy);

  const npc = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(18, 42, 8, 12), robe);
  body.position.set(sx, 85, sz + 8);
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(14, 14, 12), skin);
  head.position.set(sx, 120, sz + 8);
  head.castShadow = true;
  npc.add(body, head);
  stand.add(npc);

  stand.userData = { type: 'merchant', shopX: sx, shopZ: sz };
  stand.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(stand);
  merchant = stand;
}

createMerchantShopStand();

// =====================
// PLAYER
// =====================
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Simple third-person avatar (shown only in third-person mode)
const avatar = new THREE.Group();
const avatarMat = new THREE.MeshStandardMaterial({ color: 0x4f6fa8, roughness: 0.85, metalness: 0.05 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2b79a, roughness: 0.9, metalness: 0.0 });

const avatarTorso = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 4), avatarMat);
avatarTorso.position.set(0, -16, 0);
avatarTorso.castShadow = true;

const avatarHead = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), skinMat);
avatarHead.position.set(0, -6, 0);
avatarHead.castShadow = true;

const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, metalness: 0.0 });
const avatarEyeL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.35), faceMat);
avatarEyeL.position.set(-1.2, -5.6, -3.15);
const avatarEyeR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.35), faceMat);
avatarEyeR.position.set(1.2, -5.6, -3.15);
const avatarMouth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.35), faceMat);
avatarMouth.position.set(0, -7.0, -3.15);

const avatarLegL = new THREE.Mesh(new THREE.BoxGeometry(2.8, 13, 2.8), avatarMat);
avatarLegL.position.set(-2, -30.5, 0);
avatarLegL.castShadow = true;

const avatarLegR = new THREE.Mesh(new THREE.BoxGeometry(2.8, 13, 2.8), avatarMat);
avatarLegR.position.set(2, -30.5, 0);
avatarLegR.castShadow = true;

const avatarArmL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 2.4), skinMat);
avatarArmL.position.set(-5.5, -15.5, 0);
avatarArmL.castShadow = true;

const avatarArmR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 2.4), skinMat);
avatarArmR.position.set(5.5, -15.5, 0);
avatarArmR.castShadow = true;

avatar.add(
  avatarTorso,
  avatarHead,
  avatarEyeL,
  avatarEyeR,
  avatarMouth,
  avatarLegL,
  avatarLegR,
  avatarArmL,
  avatarArmR
);
avatar.visible = false;
player.add(avatar);

// Base eye height / standing height
const BASE_GROUND_Y = 34;
const START_SPAWN = new THREE.Vector3(0, BASE_GROUND_Y, 2850);
player.position.set(0, BASE_GROUND_Y, 2850);

function updateMerchantHint() {
  if (!shopHintEl || !merchant) return;
  if (!isLocked || isShopOpen()) {
    shopHintEl.style.display = 'none';
    return;
  }
  const dx = player.position.x - merchant.userData.shopX;
  const dz = player.position.z - merchant.userData.shopZ;
  const d = Math.hypot(dx, dz);
  shopHintEl.style.display = d <= 320 ? 'block' : 'none';
}

// =====================
// THIRD PERSON TOGGLE (TAB)
// =====================
let thirdPerson = false;
const firstPersonOffset = new THREE.Vector3(0, 0, 0);
const thirdPersonDistance = 90;
const thirdPersonHeight = 18;
const _thirdOffset = new THREE.Vector3();
const _lookLocal = new THREE.Vector3(0, -10, 0);
const _lookWorld = new THREE.Vector3();

let yaw = 0;
let pitch = 0;

function updateCameraView(delta) {
  const lerpFast = Math.min(1, delta * 18);
  const lerpSlow = Math.min(1, delta * 10);

  if (!thirdPerson) {
    camera.position.lerp(firstPersonOffset, lerpFast);
    return;
  }

  const camPitch = THREE.MathUtils.clamp(pitch, -1.1, 0.8);
  const cp = Math.cos(camPitch);
  _thirdOffset.set(
    Math.sin(yaw) * thirdPersonDistance * cp,
    thirdPersonHeight + Math.sin(camPitch) * thirdPersonDistance,
    Math.cos(yaw) * thirdPersonDistance * cp
  );
  camera.position.lerp(_thirdOffset, lerpSlow);

  _lookWorld.copy(_lookLocal);
  player.localToWorld(_lookWorld);
  camera.lookAt(_lookWorld);
  camera.rotation.order = 'YXZ';
}

// =====================
// POINTER LOCK + LOOK
// =====================
let isLocked = false;
let rightMouseAutoFire = false;

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === renderer.domElement;
  if (clickPromptEl) clickPromptEl.style.opacity = isGameplayRunning() && !isLocked ? '1' : '0';
  if (crosshairEl) crosshairEl.style.opacity = isGameplayRunning() && isLocked ? '0.95' : '0';
  if (!isLocked) thirdPerson = false;
  if (!isLocked && gameState === GAME_STATE.PLAYING) {
    const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
    if (!invOpen && !isShopOpen() && !isSceneTransitionActive() && !isRespawningActive()) {
      pauseGame();
    }
  }
});

document.addEventListener('mousemove', (e) => {
  const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
  if (!isGameplayRunning()) return;
  if (!isLocked) return;
  if (invOpen) return;
  if (isShopOpen()) return;
  if (isRespawningActive()) return;

  const lookSpeed = 0.005 * inputSettings.mouseSensitivity;
  yaw -= e.movementX * lookSpeed;
  pitch -= e.movementY * lookSpeed;
  pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
  camera.rotation.order = 'YXZ';
});

async function requestPointerLockSafe() {
  try {
    const maybePromise = renderer.domElement.requestPointerLock?.();
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise;
    }
  } catch (err) {
    console.warn('Pointer lock request failed:', err);
  }
}

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0 && e.button !== 2) return;
  if (!isGameplayRunning()) return;
  const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
  if (invOpen) return;
  if (isShopOpen()) return;
  if (isSceneTransitionActive()) return;
  if (isRespawningActive()) return;

  if (!isLocked) {
    requestPointerLockSafe();
    return;
  }
  if (e.button === 2) {
    rightMouseAutoFire = true;
    tryShootHeldWeapon();
    return;
  }
  tryShootOrOpenChest();
});

renderer.domElement.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) rightMouseAutoFire = false;
});

window.addEventListener('blur', () => {
  rightMouseAutoFire = false;
});

// =====================
// GRASS (alpha billboards)  -  SHORTER
// =====================
function makeGrassAlphaTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);

  // fewer + shorter blades
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * c.width;
    const y = c.height - (Math.random() ** 1.7) * c.height;
    const h = 18 + Math.random() * 70;   // SHORTER
    const w = 1 + Math.random() * 2.0;
    const sway = (Math.random() * 12 - 6);
    const a = 0.22 + Math.random() * 0.45;

    g.strokeStyle = `rgba(255,255,255,${a})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + sway, y - h*0.55, x + sway*0.4, y - h);
    g.stroke();
  }

  g.globalCompositeOperation = 'source-in';
  const grad = g.createLinearGradient(0,0,0,c.height);
  grad.addColorStop(0, "rgba(255,255,255,0.0)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,1.0)");
  g.fillStyle = grad;
  g.fillRect(0,0,c.width,c.height);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
  tex.needsUpdate = true;
  return tex;
}
const grassAlpha = makeGrassAlphaTexture();

function buildGrassLayer(instanceCount, area, minH, maxH, y) {
  // shorter grass geometry
  const geo = new THREE.PlaneGeometry(10, 22);
  geo.translate(0, 11, 0);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x2d7a2d,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    alphaMap: grassAlpha,
    alphaTest: 0.12,
    depthWrite: true
  });

  const mesh = new THREE.InstancedMesh(geo, mat, instanceCount);
  mesh.frustumCulled = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < instanceCount; i++) {
    const x = (Math.random()-0.5) * area;
    const z = (Math.random()-0.5) * area;
    const h = minH + Math.random() * (maxH - minH);
    const s = 0.7 + Math.random() * 1.25;

    dummy.position.set(x, y, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(1.0*s, (h/22)*s, 1.0*s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return mesh;
}

// Area matches your original big grass patch.
// We'll use this same size for the "invisible wall".
const GRASS_AREA = 30000;
scene.add(buildGrassLayer(120000, 12000, 10, 18, 0.5));
scene.add(buildGrassLayer(90000,  GRASS_AREA, 8,  14, 0.5));

// =====================
// ARMS  -  hair alpha
// =====================
function makeArmHairAlphaTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0,0,256,256);

  const img = g.getImageData(0,0,256,256);
  for (let i = 0; i < img.data.length; i += 4) {
    const a = Math.random() * 25;
    img.data[i+0] = 255;
    img.data[i+1] = 255;
    img.data[i+2] = 255;
    img.data[i+3] = a;
  }
  g.putImageData(img,0,0);

  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 3 + Math.random() * 10;
    const ang = (Math.random()*0.9 - 0.45) + Math.PI*0.5;
    const a = 0.20 + Math.random() * 0.35;

    g.strokeStyle = `rgba(0,0,0,${a})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang)*len, y + Math.sin(ang)*len);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.0, 2.0);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
  tex.needsUpdate = true;
  return tex;
}

const armHairAlpha = makeArmHairAlphaTexture();
const armMat = new THREE.MeshStandardMaterial({
  color: 0xffc9a6,
  roughness: 0.75,
  metalness: 0.0,
  transparent: true,
  alphaMap: armHairAlpha,
  alphaTest: 0.08
});

const palmMat = new THREE.MeshStandardMaterial({ color: 0xf0b894, roughness: 0.82, metalness: 0.0 });
const nailMat = new THREE.MeshStandardMaterial({ color: 0xffdccf, roughness: 0.68, metalness: 0.0 });
const knuckleMat = new THREE.MeshStandardMaterial({ color: 0xd99a7b, roughness: 0.9, metalness: 0.0 });

function createFirstPersonArm(side) {
  const g = new THREE.Group();
  const s = side === 'left' ? -1 : 1;

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 1.18, 12, 20), armMat);
  forearm.rotation.x = Math.PI * 0.5;
  forearm.rotation.z = s * 0.05;
  forearm.position.set(s * 0.03, 0.02, -0.58);

  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), armMat);
  elbow.position.set(s * 0.04, 0.02, 0.08);

  const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.092, 0.28, 8, 14), armMat);
  wrist.rotation.x = Math.PI * 0.5;
  wrist.position.set(s * 0.02, -0.03, -1.23);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), palmMat);
  hand.scale.set(1.18, 0.62, 0.96);
  hand.position.set(s * 0.03, -0.05, -1.42);
  hand.rotation.set(side === 'left' ? 0.32 : 0.12, s * 0.12, s * 0.08);

  const handDetails = [];
  for (let i = 0; i < 4; i++) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), knuckleMat);
    bump.position.set(s * (-0.092 + i * 0.06), 0.055, -1.56);
    bump.scale.set(1.1, 0.55, 0.75);
    handDetails.push(bump);
  }

  const thumbBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.14, 8, 12), palmMat);
  thumbBase.position.set(s * 0.19, -0.02, -1.36);
  thumbBase.rotation.set(0.9, s * 0.45, s * 0.58);
  const thumbTip = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.1, 8, 12), palmMat);
  thumbTip.position.set(s * 0.24, -0.07, -1.48);
  thumbTip.rotation.set(1.05, s * 0.5, s * 0.74);
  const thumbNail = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), nailMat);
  thumbNail.scale.set(1.05, 0.22, 0.72);
  thumbNail.position.set(s * 0.27, -0.035, -1.55);
  thumbNail.rotation.copy(thumbTip.rotation);
  handDetails.push(thumbBase, thumbTip, thumbNail);

  const fingerX = [-0.092, -0.032, 0.03, 0.086];
  const fingerLen = [0.18, 0.21, 0.2, 0.16];
  const curl = side === 'left' ? 0.44 : 0.78;
  for (let i = 0; i < 4; i++) {
    const baseX = s * fingerX[i];
    for (let j = 0; j < 3; j++) {
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, fingerLen[i] * (j === 0 ? 0.45 : 0.32), 8, 12), palmMat);
      seg.position.set(baseX, -0.105 - j * 0.014, -1.53 - j * 0.075);
      seg.rotation.set(curl + j * 0.22, s * 0.04, s * (i - 1.5) * 0.025);
      handDetails.push(seg);
    }
    const nail = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), nailMat);
    nail.scale.set(0.95, 0.18, 0.72);
    nail.position.set(baseX, -0.135, -1.74);
    nail.rotation.set(curl + 0.48, s * 0.04, s * (i - 1.5) * 0.025);
    handDetails.push(nail);
  }

  g.add(elbow, forearm, wrist, hand, ...handDetails);
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

const leftArm = createFirstPersonArm('left');
leftArm.position.set(-0.22, -1.12, -0.24);
leftArm.rotation.set(-0.08, 0.22, -0.06);
leftArm.visible = false;
camera.add(leftArm);

const rightArm = createFirstPersonArm('right');
rightArm.position.set(0.78, -1.1, -0.24);
rightArm.rotation.set(-0.1, -0.24, 0.1);
rightArm.visible = false;
camera.add(rightArm);
const leftArmBasePos = new THREE.Vector3(-0.22, -1.12, -0.24);
const rightArmBasePos = new THREE.Vector3(0.78, -1.1, -0.24);
const leftArmBaseRot = new THREE.Euler(-0.08, 0.22, -0.06);
const rightArmBaseRot = new THREE.Euler(-0.1, -0.24, 0.1);

// =====================
// INVENTORY + AMMO (STACKS)
// =====================
const MAX_AMMO = 10;
const STACK_MAX = 64;
let coins = 0;
const PLAYER_MAX_HP = 100;
let playerHealth = PLAYER_MAX_HP;
let lifeKills = 0;
let lifeDamageDealt = 0;
let lifeCoinsEarned = 0;
let lifeTimeSurvived = 0;
let lifeDistanceClimbed = 0;
let lifeHighestWave = 1;
let lastResultReason = 'Death';
let runCoinsBanked = false;
let reloadHintTimer = null;
let hitMarkerTimer = null;
const gunUpgrades = {
  fireRateLevel: 0,
  magLevel: 0
};

function getMagCapacity() {
  return MAX_AMMO + gunUpgrades.magLevel * 5;
}

function getPlayerMaxHp() {
  return PLAYER_MAX_HP + progressionState.upgrades.startingHealth * 15;
}

function getMovementMultiplier() {
  return 1 + progressionState.upgrades.movement * 0.06;
}

function getPermanentFireRateMultiplier() {
  return Math.max(0.68, 1 - progressionState.upgrades.fireRate * 0.07);
}

function getCoinRewardMultiplier() {
  return 1 + progressionState.upgrades.coinBonus * 0.15;
}

function getShotCooldown() {
  const base = 0.12;
  const mult = Math.max(0.45, 1 - gunUpgrades.fireRateLevel * 0.12);
  return base * mult * getPermanentFireRateMultiplier();
}

function refreshCoinHud() {
  const text = `COINS: ${coins}`;
  if (coinsHudEl) coinsHudEl.textContent = text;
  if (shopCoinsEl) shopCoinsEl.textContent = text;
}

function refreshHealthHud() {
  const maxHp = getPlayerMaxHp();
  const hp = THREE.MathUtils.clamp(playerHealth, 0, maxHp);
  const pct = (hp / maxHp) * 100;
  if (playerHealthBarEl) playerHealthBarEl.style.width = `${pct}%`;
  if (playerHealthTextEl) playerHealthTextEl.textContent = `HP: ${hp} / ${maxHp}`;
}

function showReloadHint(text) {
  if (!reloadHintEl) return;
  reloadHintEl.textContent = text;
  reloadHintEl.classList.add('active');
  if (reloadHintTimer) clearTimeout(reloadHintTimer);
  reloadHintTimer = setTimeout(() => reloadHintEl.classList.remove('active'), 900);
}

function showHitMarker() {
  if (!hitMarkerEl) return;
  hitMarkerEl.classList.remove('active');
  void hitMarkerEl.offsetWidth;
  hitMarkerEl.classList.add('active');
  if (hitMarkerTimer) clearTimeout(hitMarkerTimer);
  hitMarkerTimer = setTimeout(() => hitMarkerEl.classList.remove('active'), 95);
}

function addScreenShake(strength = 4, duration = 0.12) {
  screenShakeStrength = Math.max(screenShakeStrength, strength);
  screenShakeTime = Math.max(screenShakeTime, duration);
}

function getProgressionUpgradeCost(key) {
  const def = progressionUpgrades[key];
  const level = progressionState.upgrades[key] || 0;
  return Math.floor(def.baseCost * Math.pow(1.55, level));
}

function loadProgression() {
  try {
    const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    progressionState.bankedCoins = Math.max(0, Number(saved.bankedCoins) || 0);
    for (const key of Object.keys(progressionState.upgrades)) {
      progressionState.upgrades[key] = THREE.MathUtils.clamp(Number(saved.upgrades?.[key]) || 0, 0, progressionUpgrades[key].max);
    }
  } catch (_) {}
}

function saveProgression() {
  try {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(progressionState));
  } catch (_) {}
}

function renderProgressionShop() {
  if (bankedCoinsTextEl) bankedCoinsTextEl.textContent = `Banked Coins: ${progressionState.bankedCoins}`;
  if (!progressionUpgradeListEl) return;
  progressionUpgradeListEl.innerHTML = '';
  for (const [key, def] of Object.entries(progressionUpgrades)) {
    const level = progressionState.upgrades[key] || 0;
    const maxed = level >= def.max;
    const cost = maxed ? 0 : getProgressionUpgradeCost(key);
    const btn = document.createElement('button');
    btn.className = 'progressionUpgradeBtn';
    btn.disabled = maxed || progressionState.bankedCoins < cost;
    btn.innerHTML = `${def.name} Lv.${level}/${def.max}${maxed ? ' - MAX' : ` - ${cost} coins`}<small>${def.desc}</small>`;
    btn.addEventListener('click', () => buyProgressionUpgrade(key));
    progressionUpgradeListEl.appendChild(btn);
  }
}

function buyProgressionUpgrade(key) {
  const def = progressionUpgrades[key];
  if (!def) return;
  const level = progressionState.upgrades[key] || 0;
  if (level >= def.max) return;
  const cost = getProgressionUpgradeCost(key);
  if (progressionState.bankedCoins < cost) return;
  progressionState.bankedCoins -= cost;
  progressionState.upgrades[key] = level + 1;
  saveProgression();
  renderProgressionShop();
  refreshHealthHud();
}

function bankRunCoinsOnce() {
  if (runCoinsBanked) return;
    const earned = Math.ceil(lifeCoinsEarned * getCoinRewardMultiplier());
  progressionState.bankedCoins += earned;
  runCoinsBanked = true;
  saveProgression();
}

function resetLifeStats() {
  lifeKills = 0;
  lifeDamageDealt = 0;
  lifeCoinsEarned = 0;
  lifeTimeSurvived = 0;
  lifeDistanceClimbed = 0;
  lifeHighestWave = 1;
  runCoinsBanked = false;
  lastResultReason = 'Death';
}

function formatSurvivalTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}m ${rest}s` : `${rest}s`;
}

function updateDeathStatsScreen() {
  bankRunCoinsOnce();
  if (deathKillsEl) deathKillsEl.textContent = String(lifeKills);
  if (deathCoinsEl) deathCoinsEl.textContent = String(lifeCoinsEarned);
  if (deathDamageEl) deathDamageEl.textContent = String(lifeDamageDealt);
  if (deathTimeEl) deathTimeEl.textContent = formatSurvivalTime(lifeTimeSurvived);
  if (deathClimbEl) deathClimbEl.textContent = `${Math.floor(lifeDistanceClimbed)} units`;
  if (deathWaveEl) deathWaveEl.textContent = String(lifeHighestWave);
  const title = deathStatsScreenEl?.querySelector('h2');
  if (title) title.textContent = lastResultReason === 'Wave Clear' ? 'WAVE CLEAR' : 'RUN RESULTS';
  renderProgressionShop();
}

function damagePlayer(amount = 1) {
  if (amount <= 0) return;
  playerHealth = Math.max(0, playerHealth - amount);
  refreshHealthHud();
  addScreenShake(5.5, 0.16);
  playGameSfx('hurt');
}

function refreshShopButtons() {
  const fireBtn = document.getElementById('buyFireRate');
  const magBtn = document.getElementById('buyMag');
  if (fireBtn) fireBtn.textContent = `Fire Rate ${gunUpgrades.fireRateLevel + 1} - ${20 + gunUpgrades.fireRateLevel * 12} coins`;
  if (magBtn) magBtn.textContent = `Magazine +5 - ${25 + gunUpgrades.magLevel * 15} coins`;
}

function openShop() {
  if (!shopScreenEl) return;
  const inv = document.getElementById('inventoryScreen');
  if (inv && inv.style.display === 'flex') inv.style.display = 'none';
  shopScreenEl.style.display = 'flex';
  document.exitPointerLock?.();
  refreshCoinHud();
  refreshShopButtons();
}

function closeShop() {
  if (!shopScreenEl) return;
  if (shopScreenEl.style.display !== 'flex') return;
  shopScreenEl.style.display = 'none';
  requestPointerLockSafe();
}

function isShopOpen() {
  return !!shopScreenEl && shopScreenEl.style.display === 'flex';
}

function buyUpgrade(kind) {
  let cost = 0;
  if (kind === 'fireRate') cost = 20 + gunUpgrades.fireRateLevel * 12;
  if (kind === 'mag') cost = 25 + gunUpgrades.magLevel * 15;
  if (cost <= 0 || coins < cost) return;

  coins -= cost;
  playGameSfx('buy');
  if (kind === 'fireRate') gunUpgrades.fireRateLevel += 1;
  if (kind === 'mag') {
    gunUpgrades.magLevel += 1;
    // Top off current gun to new cap if needed.
    const gun = inventory[selectedSlot];
    if (gun?.id && itemTypes[gun.id]?.isGun) {
      gun.ammo = Math.min(gun.ammo, getMagCapacity());
    }
    refreshUIAll();
  }
  refreshCoinHud();

  refreshShopButtons();
}

const inventory = Array(36).fill().map(() => ({ id: null, count: 0, ammo: 0 }));

const itemTypes = {
  pistol:  { name:'PISTOL',  icon:null, stackMax: 1, isGun:true },
  rifle:   { name:'RIFLE',   icon:null, stackMax: 1, isGun:true },
  shotgun: { name:'SHOTGUN', icon:null, stackMax: 1, isGun:true },
  sniper:  { name:'SNIPER',  icon:null, stackMax: 1, isGun:true },
  scout_sniper: { name:'SCOUT SNIPER', icon:null, stackMax: 1, isGun:true },
  heavy_sniper: { name:'HEAVY SNIPER', icon:null, stackMax: 1, isGun:true },
  marksman_sniper: { name:'MARKSMAN SNIPER', icon:null, stackMax: 1, isGun:true },
  smg:     { name:'SMG',     icon:null, stackMax: 1, isGun:true },
  ammo:    { name:'AMMO',    icon:null, stackMax: STACK_MAX, isGun:false }
};

const ammoIconCache = {};
function makeAmmoIcon(ammoType = null) {
  const label = ammoType ? (itemTypes[ammoType]?.name || ammoType).replace(/\s+/g, '').slice(0, 3).toUpperCase() : 'AMM';
  const hueMap = {
    pistol: '#d9b24c',
    rifle: '#7fb34d',
    shotgun: '#c45c4f',
    sniper: '#5da4d8',
    scout_sniper: '#72c6a0',
    heavy_sniper: '#d88436',
    marksman_sniper: '#a98de0',
    smg: '#d6d66a'
  };
  const main = hueMap[ammoType] || '#c9aa2e';
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1b1b'; g.fillRect(0,0,64,64);
  g.fillStyle = main; g.fillRect(18,10,28,40);
  g.fillStyle = '#f2d86a'; g.fillRect(18,10,28,10);
  g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(18,10,28,40);
  g.fillStyle = '#fff';
  g.font = '900 11px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 32, 56);
  return c.toDataURL('image/png');
}
itemTypes.ammo.icon = makeAmmoIcon();

function getAmmoTypeName(ammoType) {
  return ammoType && itemTypes[ammoType]?.name ? `${itemTypes[ammoType].name} AMMO` : 'AMMO';
}

function getItemDisplayName(stack) {
  if (stack?.id === 'ammo') return getAmmoTypeName(stack.ammoType);
  return itemTypes[stack?.id]?.name || '';
}

function getItemIcon(stack) {
  if (stack?.id === 'ammo') {
    const key = stack.ammoType || 'generic';
    ammoIconCache[key] = ammoIconCache[key] || makeAmmoIcon(stack.ammoType);
    return ammoIconCache[key];
  }
  return itemTypes[stack?.id]?.icon;
}

function makeGunIcon(type) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0,0,64,64);

  const px = (x,y,w,h,fill,stroke='#000') => {
    g.fillStyle = fill;
    g.fillRect(x,y,w,h);
    g.strokeStyle = stroke;
    g.lineWidth = 2;
    g.strokeRect(x,y,w,h);
  };

  const metal = '#2b2b2b';
  const metal2 = '#141414';
  const wood = '#6b4423';
  const wood2 = '#4d2f18';
  const accent = '#3a3a3a';

  if (type === 'pistol') {
    px(14, 24, 34, 10, metal);
    px(44, 26, 8, 6, metal2);
    px(26, 34, 12, 18, wood);
    px(28, 36, 8, 14, wood2);
    px(22, 34, 4, 8, accent);
  }
  if (type === 'smg') {
    px(10, 22, 44, 10, metal);
    px(54, 24, 6, 6, metal2);
    px(24, 32, 10, 20, wood);
    px(26, 34, 6, 16, wood2);
    px(34, 34, 7, 18, metal2);
    px(6, 24, 6, 6, accent);
  }
  if (type === 'shotgun') {
    px(10, 24, 48, 10, metal);
    px(56, 26, 6, 6, metal2);
    px(28, 34, 18, 10, wood);
    px(30, 36, 14, 6, wood2);
    px(6, 30, 16, 10, wood);
    px(8, 32, 12, 6, wood2);
  }
  if (type === 'rifle') {
    px(10, 26, 50, 8, metal);
    px(56, 27, 6, 6, metal2);
    px(8, 32, 22, 10, wood);
    px(10, 34, 18, 6, wood2);
    px(26, 32, 18, 10, metal2);
    px(34, 42, 8, 16, metal2);
    px(28, 18, 18, 6, metal);
    px(46, 18, 6, 6, metal2);
  }
  if (type === 'sniper') {
    px(6, 26, 56, 8, metal);
    px(58, 27, 6, 6, metal2);
    px(6, 32, 24, 10, wood);
    px(8, 34, 20, 6, wood2);
    px(28, 32, 18, 10, metal2);
    px(44, 36, 4, 10, accent);
    px(52, 36, 4, 10, accent);
    px(26, 16, 26, 8, metal);
    px(52, 16, 8, 8, metal2);
  }
  if (type === 'scout_sniper') {
    px(8, 27, 48, 7, '#252a2e');
    px(56, 28, 7, 5, '#0d0f11');
    px(5, 33, 20, 9, '#4e5a46');
    px(8, 35, 15, 5, '#2d362b');
    px(27, 34, 13, 8, '#1a1f22');
    px(35, 41, 5, 13, '#202528');
    px(24, 18, 24, 7, '#15191c');
    px(48, 17, 8, 9, '#050607');
    px(56, 19, 3, 5, '#76a1b7');
    px(16, 23, 8, 2, '#6f7c68');
  }
  if (type === 'heavy_sniper') {
    px(3, 25, 60, 10, '#17191a');
    px(60, 27, 4, 6, '#050505');
    px(4, 35, 27, 12, '#334135');
    px(8, 38, 18, 6, '#1e291f');
    px(28, 35, 20, 10, '#0d0f10');
    px(42, 45, 4, 13, '#0d0f10');
    px(50, 45, 4, 13, '#0d0f10');
    px(23, 14, 31, 9, '#101214');
    px(54, 13, 9, 11, '#050505');
    px(55, 16, 5, 5, '#9bbbd0');
    px(6, 21, 9, 3, '#454b4d');
  }
  if (type === 'marksman_sniper') {
    px(7, 26, 53, 8, '#202326');
    px(58, 27, 5, 6, '#08090a');
    px(7, 33, 25, 10, '#5b3a22');
    px(9, 36, 19, 5, '#3d2415');
    px(30, 34, 18, 9, '#141719');
    px(35, 43, 7, 13, '#141719');
    px(24, 17, 28, 8, '#16191b');
    px(52, 16, 8, 10, '#050607');
    px(53, 19, 4, 4, '#80b6d6');
    px(13, 23, 12, 2, '#6b4423');
  }

  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(0,0,64,8);

  return c.toDataURL('image/png');
}

for (const k of Object.keys(itemTypes)) {
  if (k === 'ammo') continue;
  itemTypes[k].icon = makeGunIcon(k);
}

function addItem(id, count = 1, ammoInGun = 0, ammoType = null) {
  const def = itemTypes[id];
  if (!def) return;

  if (def.stackMax > 1) {
    for (let i = 0; i < 36 && count > 0; i++) {
      const s = inventory[i];
      if (s.id === id && s.count < def.stackMax && (id !== 'ammo' || s.ammoType === ammoType)) {
        const space = def.stackMax - s.count;
        const take = Math.min(space, count);
        s.count += take;
        count -= take;
      }
    }
  }

  for (let i = 0; i < 36 && count > 0; i++) {
    const s = inventory[i];
    if (!s.id) {
      s.id = id;
      if (def.stackMax > 1) {
        const take = Math.min(def.stackMax, count);
        s.count = take;
        s.ammo = 0;
        s.ammoType = id === 'ammo' ? ammoType : null;
        count -= take;
      } else {
        s.count = 1;
        s.ammo = ammoInGun;
        s.ammoType = null;
        count -= 1;
      }
    }
  }
}

function giveChestLoot(gunId) {
  const cap = getMagCapacity();
  addItem(gunId, 1, cap);
  addItem('ammo', cap, 0, gunId);
  coins += 10 + Math.floor(Math.random() * 9);
  refreshCoinHud();
  refreshUIAll();
}

function applyStartingLoadout() {
  const level = progressionState.upgrades.startingGun || 0;
  const desiredGun = level >= 3 ? 'rifle' : level >= 2 ? 'smg' : level >= 1 ? 'pistol' : null;
  if (!desiredGun) return;
  const alreadyHasGun = inventory.some(s => s.id && itemTypes[s.id]?.isGun);
  if (alreadyHasGun) return;
  const cap = getMagCapacity();
  addItem(desiredGun, 1, cap);
  addItem('ammo', cap * (1 + level), 0, desiredGun);
  refreshUIAll();
}

// =====================
// 3D gun models
// =====================
const weaponModels = {};
function createWeaponModels() {
  const metal = new THREE.MeshStandardMaterial({ color:0x1a1a1a, metalness:0.9, roughness:0.3 });
  const wood  = new THREE.MeshStandardMaterial({ color:0x6b4423, roughness:0.7 });
  const darkMetal = new THREE.MeshStandardMaterial({ color:0x0f1214, metalness:0.92, roughness:0.26 });
  const gunBlack = new THREE.MeshStandardMaterial({ color:0x08090a, metalness:0.78, roughness:0.36 });
  const camoGreen = new THREE.MeshStandardMaterial({ color:0x344432, roughness:0.82, metalness:0.08 });
  const lensBlue = new THREE.MeshStandardMaterial({ color:0x78b7d9, emissive:0x14384c, emissiveIntensity:0.22, metalness:0.15, roughness:0.12 });

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  function cylinder(r1, r2, len, mat, x, y, z, sides = 12) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, sides), mat);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    return m;
  }

  function createDetailedSniperModel(opts) {
    const g = new THREE.Group();
    const bodyMat = opts.bodyMat ?? darkMetal;
    const stockMat = opts.stockMat ?? wood;
    const barrelMat = opts.barrelMat ?? gunBlack;
    const barrelLen = opts.barrelLen ?? 3.1;
    const scale = opts.scale ?? 1;

    g.add(
      cylinder(opts.barrelRadius ?? 0.07, opts.barrelRadius ?? 0.055, barrelLen, barrelMat, 0.72, 0.02, 0, 14),
      cylinder((opts.barrelRadius ?? 0.07) * 1.35, (opts.barrelRadius ?? 0.055) * 1.25, 0.26, barrelMat, 0.72 + barrelLen * 0.5, 0.02, 0, 10),
      box(1.0, 0.28, 0.34, bodyMat, -0.55, -0.03, 0),
      box(1.05, 0.24, 0.46, stockMat, -1.35, -0.12, 0),
      box(0.42, 0.5, 0.2, bodyMat, -0.35, -0.42, 0),
      box(0.64, 0.08, 0.18, bodyMat, -0.35, 0.18, 0),
      box(1.2, 0.06, 0.12, barrelMat, 0.28, 0.21, 0),
      cylinder(0.12, 0.12, 0.78, barrelMat, -0.05, 0.43, 0, 12),
      cylinder(0.14, 0.14, 0.16, lensBlue, 0.42, 0.43, 0, 12),
      cylinder(0.14, 0.14, 0.16, lensBlue, -0.52, 0.43, 0, 12),
      box(0.08, 0.54, 0.08, barrelMat, 0.64, -0.38, -0.22),
      box(0.08, 0.54, 0.08, barrelMat, 0.64, -0.38, 0.22),
      box(0.46, 0.05, 0.09, barrelMat, 0.64, -0.66, -0.31),
      box(0.46, 0.05, 0.09, barrelMat, 0.64, -0.66, 0.31),
      box(0.16, 0.08, 0.26, bodyMat, 0.05, -0.22, 0),
      box(0.1, 0.16, 0.12, barrelMat, -0.78, 0.06, 0.28)
    );

    if (opts.heavy) {
      g.add(
        box(0.86, 0.16, 0.54, bodyMat, 0.05, -0.16, 0),
        box(0.14, 0.34, 0.18, barrelMat, 1.85, 0.02, -0.18),
        box(0.14, 0.34, 0.18, barrelMat, 1.85, 0.02, 0.18)
      );
    }

    g.scale.setScalar(scale);
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  weaponModels.pistol = new THREE.Group();
  const pBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), metal);
  pBarrel.rotation.z = Math.PI/2;
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.4), wood);
  pGrip.position.set(0, -0.2, 0);
  weaponModels.pistol.add(pBarrel, pGrip);

  weaponModels.rifle = new THREE.Group();
  const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 2.4, 12), metal);
  rBarrel.rotation.z = Math.PI/2;
  const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 1.0), wood);
  rStock.position.set(-1.1, -0.1, 0);
  const rScope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), metal);
  rScope.position.set(0.2, 0.4, 0);
  rScope.rotation.z = Math.PI/2;
  const rReceiver = box(0.92, 0.28, 0.42, darkMetal, -0.3, -0.02, 0);
  const rForegrip = box(0.23, 0.72, 0.22, gunBlack, 0.7, -0.48, 0);
  const rMagazine = box(0.24, 0.62, 0.32, gunBlack, -0.26, -0.48, 0);
  const rTriggerGuard = box(0.28, 0.08, 0.22, gunBlack, -0.54, -0.28, 0);
  weaponModels.rifle.add(rBarrel, rStock, rScope, rReceiver, rForegrip, rMagazine, rTriggerGuard);

  weaponModels.shotgun = new THREE.Group();
  const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 12), metal);
  sBarrel.rotation.z = Math.PI/2;
  const sStock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 1.3), wood);
  sStock.position.set(-1.0, -0.05, 0);
  const sPump = box(0.72, 0.24, 0.48, wood, 0.28, -0.24, 0);
  const sReceiver = box(0.62, 0.32, 0.5, darkMetal, -0.42, -0.04, 0);
  const sGrip = box(0.26, 0.56, 0.28, wood, -0.54, -0.46, 0);
  weaponModels.shotgun.add(sBarrel, sStock, sPump, sReceiver, sGrip);

  weaponModels.sniper = new THREE.Group();
  const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 3.0, 12), metal);
  snBarrel.rotation.z = Math.PI/2;
  const snStock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.2), wood);
  snStock.position.set(-1.3, -0.1, 0);
  const snScope = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8), metal);
  snScope.position.set(0.3, 0.45, 0);
  snScope.rotation.z = Math.PI/2;
  weaponModels.sniper.add(snBarrel, snStock, snScope);

  weaponModels.scout_sniper = createDetailedSniperModel({
    bodyMat: darkMetal,
    stockMat: camoGreen,
    barrelMat: gunBlack,
    barrelLen: 2.65,
    barrelRadius: 0.065,
    scale: 0.9
  });

  weaponModels.heavy_sniper = createDetailedSniperModel({
    bodyMat: darkMetal,
    stockMat: camoGreen,
    barrelMat: gunBlack,
    barrelLen: 3.45,
    barrelRadius: 0.105,
    scale: 1.08,
    heavy: true
  });

  weaponModels.marksman_sniper = createDetailedSniperModel({
    bodyMat: metal,
    stockMat: wood,
    barrelMat: darkMetal,
    barrelLen: 3.05,
    barrelRadius: 0.075,
    scale: 0.98
  });

  weaponModels.smg = new THREE.Group();
  const smBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 8), metal);
  smBarrel.rotation.z = Math.PI/2;
  const smGrip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.4), wood);
  smGrip.position.y = -0.15;
  const smReceiver = box(0.78, 0.3, 0.42, darkMetal, -0.25, 0, 0);
  const smMagazine = box(0.18, 0.72, 0.28, gunBlack, -0.02, -0.48, 0);
  const smForegrip = box(0.16, 0.5, 0.18, gunBlack, 0.46, -0.38, 0);
  const smStock = box(0.56, 0.12, 0.24, gunBlack, -0.9, 0.05, 0);
  weaponModels.smg.add(smBarrel, smGrip, smReceiver, smMagazine, smForegrip, smStock);
}
createWeaponModels();

let heldWeapon = null;
let selectedSlot = 0;
const heldWeaponBasePos = new THREE.Vector3(1.25, -1.08, -2.28);
const heldWeaponBaseRot = new THREE.Euler(0.08, Math.PI / 2, -0.035);

function updateHeldWeapon() {
  if (heldWeapon) camera.remove(heldWeapon);
  const item = inventory[selectedSlot];
  if (item?.id && itemTypes[item.id]?.isGun && weaponModels[item.id]) {
    heldWeapon = weaponModels[item.id].clone();
    heldWeapon.position.copy(heldWeaponBasePos);
    heldWeapon.rotation.copy(heldWeaponBaseRot);
    camera.add(heldWeapon);
  } else {
    heldWeapon = null;
  }
}

// =====================
// HOTBAR + INVENTORY UI RENDER
// =====================
function slotCountText(s) {
  if (!s.id) return '';
  if (s.id === 'ammo') return s.count;
  if (itemTypes[s.id].isGun) return s.ammo;
  return s.count;
}

function createHotbarUI() {
  const hb = document.getElementById('hotbar');
  hb.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;

    slot.addEventListener('mouseenter', () => hoverSlotIndex = i);
    slot.addEventListener('mouseleave', () => { if (hoverSlotIndex === i) hoverSlotIndex = null; });

    slot.addEventListener('contextmenu', (e) => e.preventDefault());
    slot.addEventListener('mousedown', (e) => {
      const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
      if (!invOpen) {
        if (e.button === 0) {
          selectedSlot = i;
          updateHotbar();
          showGunPopupIfAny();
        }
        return;
      }

      if (e.shiftKey && e.button === 0) { quickMove(i); return; }
      if (e.button === 0) leftClickSlot(i);
      if (e.button === 2) rightClickSlot(i);
    });

    hb.appendChild(slot);
  }
  updateHotbar();
}

function updateHotbar() {
  const slots = document.querySelectorAll('#hotbar .slot');
  slots.forEach((slot, i) => {
    const item = inventory[i];
    if (item.id) {
      slot.innerHTML = `
        <img src="${getItemIcon(item)}" alt="${getItemDisplayName(item)}" />
        <small>${getItemDisplayName(item)}</small>
        <div class="count">${slotCountText(item)}</div>
      `;
    } else slot.innerHTML = '';
    slot.classList.toggle('selected', i === selectedSlot);
  });

  updateHeldWeapon();

  const vis = !thirdPerson;
  const weaponPoseVisible = vis && !!heldWeapon;
  leftArm.visible = weaponPoseVisible;
  rightArm.visible = weaponPoseVisible;
  avatar.visible = !vis;
  if (heldWeapon) heldWeapon.visible = vis;

  renderCursorStack();
}

function updateFullInventory() {
  const grid = document.getElementById('invGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const slot = document.createElement('div');
    slot.className = 'invSlot';

    slot.addEventListener('mouseenter', () => hoverSlotIndex = i);
    slot.addEventListener('mouseleave', () => { if (hoverSlotIndex === i) hoverSlotIndex = null; });

    slot.addEventListener('contextmenu', (e) => e.preventDefault());
    slot.addEventListener('mousedown', (e) => {
      if (e.shiftKey && e.button === 0) { quickMove(i); return; }
      if (e.button === 0) leftClickSlot(i);
      if (e.button === 2) rightClickSlot(i);
    });

    const item = inventory[i];
    if (item.id) {
      slot.innerHTML = `
        <img src="${getItemIcon(item)}" alt="${getItemDisplayName(item)}" />
        <small>${getItemDisplayName(item)}</small>
        <div class="count">${slotCountText(item)}</div>
      `;
    }
    grid.appendChild(slot);
  }

  renderCursorStack();
}

// =====================
// MINECRAFT-STYLE INVENTORY INTERACTION
// =====================
let cursorStack = { id: null, count: 0, ammo: 0, ammoType: null };
let hoverSlotIndex = null;

function isEmpty(s) { return !s.id || s.count <= 0; }
function clearSlot(s) { s.id = null; s.count = 0; s.ammo = 0; s.ammoType = null; }
function copyStack(s) { return { id: s.id, count: s.count, ammo: s.ammo, ammoType: s.ammoType ?? null }; }
function sameItem(a,b) {
  if (!a.id || !b.id || a.id !== b.id) return false;
  if (a.id === 'ammo') return (a.ammoType || null) === (b.ammoType || null);
  return true;
}
function stackMax(id) { return itemTypes[id]?.stackMax ?? 1; }
function isGunStack(s) { return !!(s?.id && itemTypes[s.id]?.isGun); }
function isAmmoStack(s) { return s?.id === 'ammo' && s.count > 0; }
function ammoMatchesGun(gunStack, ammoStack) {
  return isGunStack(gunStack) && isAmmoStack(ammoStack) && ammoStack.ammoType === gunStack.id;
}

function transferAmmoToGun(gunStack, ammoStack) {
  if (!isGunStack(gunStack) || !isAmmoStack(ammoStack)) return 0;
  if (!ammoMatchesGun(gunStack, ammoStack)) return 0;
  const need = Math.max(0, getMagCapacity() - (gunStack.ammo || 0));
  if (need <= 0) return 0;
  const take = Math.min(need, ammoStack.count);
  gunStack.ammo = (gunStack.ammo || 0) + take;
  ammoStack.count -= take;
  if (ammoStack.count <= 0) clearSlot(ammoStack);
  return take;
}

function findAmmoStackForReload(gunId) {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i]?.id === 'ammo' && inventory[i].count > 0 && inventory[i].ammoType === gunId) return inventory[i];
  }
  return null;
}

function reloadSelectedGun() {
  if (!isGameplayRunning()) return false;
  if (isSceneTransitionActive() || isRespawningActive()) return false;
  const inv = document.getElementById('inventoryScreen');
  if (inv && inv.style.display === 'flex') return false;
  if (isShopOpen()) return false;

  const gun = inventory[selectedSlot];
  if (!isGunStack(gun)) {
    showReloadHint('No gun selected');
    playGameSfx('empty');
    return false;
  }
  const need = getMagCapacity() - (gun.ammo || 0);
  if (need <= 0) {
    showReloadHint('Magazine full');
    return false;
  }
  const ammoStack = findAmmoStackForReload(gun.id);
  if (!ammoStack) {
    showReloadHint(`No ${itemTypes[gun.id].name} ammo`);
    playGameSfx('empty');
    return false;
  }
  const loaded = transferAmmoToGun(gun, ammoStack);
  if (loaded <= 0) return false;
  playGameSfx('reload');
  showReloadHint(`Reloaded +${loaded}`);
  refreshUIAll();
  return true;
}

function tryMergeInto(target, from) {
  if (isEmpty(from) || isEmpty(target)) return 0;
  if (!sameItem(target, from)) return 0;

  const max = stackMax(target.id);
  if (max <= 1) return 0;

  const space = max - target.count;
  const take = Math.min(space, from.count);
  target.count += take;
  from.count -= take;
  if (from.count <= 0) clearSlot(from);
  return take;
}

function refreshUIAll() {
  updateHotbar();
  if (document.getElementById('inventoryScreen').style.display === 'flex') updateFullInventory();
  renderCursorStack();
  updateTrashState();
}

// Cursor stack UI
let cursorEl = null;
function updateTrashState() {
  const trash = document.getElementById('trashSlot');
  if (!trash) return;
  trash.classList.toggle('active', !isEmpty(cursorStack));
}

function initTrashSlot() {
  const trash = document.getElementById('trashSlot');
  if (!trash || trash.dataset.bound === '1') return;
  trash.dataset.bound = '1';
  trash.addEventListener('contextmenu', (e) => e.preventDefault());
  trash.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.button !== 0) return;
    if (isEmpty(cursorStack)) return;
    clearSlot(cursorStack);
    refreshUIAll();
  });
}

function renderCursorStack() {
  const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
  if (!invOpen) {
    if (cursorEl) cursorEl.style.display = 'none';
    return;
  }

  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.style.position = 'fixed';
    cursorEl.style.pointerEvents = 'none';
    cursorEl.style.zIndex = '99999';
    cursorEl.style.transform = 'translate(10px, 10px)';
    cursorEl.style.display = 'none';
    document.body.appendChild(cursorEl);
  }

  if (isEmpty(cursorStack)) {
    cursorEl.style.display = 'none';
    cursorEl.innerHTML = '';
    return;
  }

  const it = itemTypes[cursorStack.id];
  cursorEl.style.display = 'block';
  cursorEl.innerHTML = `
    <div style="position:relative;width:52px;height:52px;">
      <img src="${getItemIcon(cursorStack)}" alt="${getItemDisplayName(cursorStack)}" style="width:52px;height:52px;display:block;">
      <div style="position:absolute;right:-2px;bottom:-6px;font-weight:900;color:#fff;text-shadow:0 0 6px #000;">
        ${it.isGun ? cursorStack.ammo : cursorStack.count}
      </div>
    </div>
  `;
}

document.addEventListener('mousemove', (e) => {
  if (!cursorEl) return;
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top  = e.clientY + 'px';
});

function leftClickSlot(i) {
  const slot = inventory[i];

  if (isEmpty(cursorStack)) {
    if (isEmpty(slot)) return;
    cursorStack = copyStack(slot);
    clearSlot(slot);
    refreshUIAll();
    return;
  }

  if (isEmpty(slot)) {
    inventory[i] = copyStack(cursorStack);
    clearSlot(cursorStack);
    refreshUIAll();
    return;
  }

  // Reload by placing ammo onto a gun.
  if (isAmmoStack(cursorStack) && isGunStack(slot)) {
    const loaded = transferAmmoToGun(slot, cursorStack);
    if (loaded <= 0) showReloadHint(`Needs ${itemTypes[slot.id].name} ammo`);
    refreshUIAll();
    return;
  }

  // Reload held gun on cursor from ammo already in slot.
  if (isGunStack(cursorStack) && isAmmoStack(slot)) {
    const loaded = transferAmmoToGun(cursorStack, slot);
    if (loaded <= 0) showReloadHint(`Needs ${itemTypes[cursorStack.id].name} ammo`);
    refreshUIAll();
    return;
  }

  if (sameItem(slot, cursorStack) && stackMax(slot.id) > 1) {
    tryMergeInto(slot, cursorStack);
    refreshUIAll();
    return;
  }

  const tmp = copyStack(slot);
  inventory[i] = copyStack(cursorStack);
  cursorStack = tmp;
  refreshUIAll();
}

function rightClickSlot(i) {
  const slot = inventory[i];

  if (isEmpty(cursorStack)) {
    if (isEmpty(slot)) return;

    const max = stackMax(slot.id);
    if (max > 1) {
      const half = Math.ceil(slot.count / 2);
      cursorStack = { id: slot.id, count: half, ammo: 0, ammoType: slot.ammoType ?? null };
      slot.count -= half;
      if (slot.count <= 0) clearSlot(slot);
    } else {
      cursorStack = copyStack(slot);
      clearSlot(slot);
    }
    refreshUIAll();
    return;
  }

  if (isEmpty(slot)) {
    const max = stackMax(cursorStack.id);
    if (max > 1) {
      inventory[i] = { id: cursorStack.id, count: 1, ammo: 0, ammoType: cursorStack.ammoType ?? null };
      cursorStack.count -= 1;
      if (cursorStack.count <= 0) clearSlot(cursorStack);
    } else {
      inventory[i] = copyStack(cursorStack);
      clearSlot(cursorStack);
    }
    refreshUIAll();
    return;
  }

  if (sameItem(slot, cursorStack) && stackMax(slot.id) > 1 && slot.count < stackMax(slot.id)) {
    slot.count += 1;
    cursorStack.count -= 1;
    if (cursorStack.count <= 0) clearSlot(cursorStack);
    refreshUIAll();
  }
}

function isHotbar(i) { return i >= 0 && i < 9; }
function quickMove(i) {
  const from = inventory[i];
  if (isEmpty(from)) return;

  const targetRange = isHotbar(i) ? [9, 35] : [0, 8];

  for (let j = targetRange[0]; j <= targetRange[1]; j++) {
    if (isEmpty(from)) break;
    const to = inventory[j];
    if (!isEmpty(to) && sameItem(to, from) && stackMax(to.id) > 1) {
      tryMergeInto(to, from);
    }
  }

  for (let j = targetRange[0]; j <= targetRange[1]; j++) {
    if (isEmpty(from)) break;
    const to = inventory[j];
    if (isEmpty(to)) {
      inventory[j] = copyStack(from);
      clearSlot(from);
      break;
    }
  }

  refreshUIAll();
}

function swapWithHotbar(hotbarIndex) {
  if (hoverSlotIndex === null) return;
  const a = inventory[hoverSlotIndex];
  const b = inventory[hotbarIndex];
  inventory[hoverSlotIndex] = copyStack(b);
  inventory[hotbarIndex] = copyStack(a);
  refreshUIAll();
}

// =====================
// CHESTS
// =====================
const chests = [];
function addChest(x, z) {
  const chest = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color:0x6b4423, roughness:0.85 });
  const metal = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.35, metalness:0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(25, 25, 30), wood);
  body.position.y = 12.5;

  const lid = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 31), wood);
  lid.position.y = 25.5;

  const latch = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 1.8), metal);
  latch.position.set(0, 16, 15.2);

  chest.add(body, lid, latch);
  chest.position.set(x, 0, z);
  chest.userData = {
    type: 'chest',
    contains: ['pistol','rifle','shotgun','sniper','scout_sniper','heavy_sniper','marksman_sniper','smg'][Math.floor(Math.random()*8)],
    opened: false
  };
  chest.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(chest);
  chests.push(chest);
}
for (let i = 0; i < 80; i++) addChest((Math.random()-0.5)*2400, (Math.random()-0.5)*2400 + 120);

// =====================
// EXPLOSION EFFECT
// =====================
const lootFlash = new THREE.PointLight(0xffee88, 0, 900, 2);
scene.add(lootFlash);

const activeExplosions = [];
function explodeAt(pos, opts = {}) {
  const { particleCount = 220, power = 1.25, life = 0.65 } = opts;

  lootFlash.position.copy(pos).add(new THREE.Vector3(0, 30, 0));
  lootFlash.intensity = 8 * power;

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    positions[i3+0] = pos.x + (Math.random()-0.5) * 10;
    positions[i3+1] = pos.y + 18 + (Math.random()-0.5) * 10;
    positions[i3+2] = pos.z + (Math.random()-0.5) * 10;

    const dir = new THREE.Vector3(
      (Math.random()-0.5),
      Math.random() * 1.2,
      (Math.random()-0.5)
    ).normalize();

    const speed = (180 + Math.random()*340) * power;
    velocities[i3+0] = dir.x * speed;
    velocities[i3+1] = dir.y * speed;
    velocities[i3+2] = dir.z * speed;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffcc55,
    size: 16,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  activeExplosions.push({ points, velocities, t: 0, life });
}

function stepExplosions(delta) {
  lootFlash.intensity = Math.max(0, lootFlash.intensity - delta * 22);

  for (let i = activeExplosions.length - 1; i >= 0; i--) {
    const ex = activeExplosions[i];
    ex.t += delta;

    const pAttr = ex.points.geometry.getAttribute('position');
    const p = pAttr.array;
    const v = ex.velocities;

    for (let j = 0; j < p.length; j += 3) {
      v[j+0] *= Math.pow(0.12, delta);
      v[j+2] *= Math.pow(0.12, delta);
      v[j+1] -= 980 * delta;

      p[j+0] += v[j+0] * delta;
      p[j+1] += v[j+1] * delta;
      p[j+2] += v[j+2] * delta;

      if (p[j+1] < 12) {
        p[j+1] = 12;
        v[j+1] *= -0.35;
      }
    }

    pAttr.needsUpdate = true;

    const k = 1 - (ex.t / ex.life);
    ex.points.material.opacity = Math.max(0, k);

    if (ex.t >= ex.life) {
      scene.remove(ex.points);
      ex.points.geometry.dispose();
      ex.points.material.dispose();
      activeExplosions.splice(i, 1);
    }
  }
}

// =====================
// TOWERS + STAIRS (CLIMBABLE)
// We implement "collision" by sampling a ground height based on stair step boxes.
// =====================
const towers = []; // { x,z, steps:[AABB], topDeck:AABB }

function addTower(x, z, opts = {}) {
  const height = opts.height ?? 340;
  const radius = opts.radius ?? 80;
  const stepCount = opts.steps ?? 26;

  const tower = new THREE.Group();

  const stone = new THREE.MeshStandardMaterial({ color:0x8a8a8a, roughness:0.95, metalness:0.0 });
  const darker = new THREE.MeshStandardMaterial({ color:0x5f5f5f, roughness:0.95, metalness:0.0 });
  const wood = new THREE.MeshStandardMaterial({ color:0x6f4a2a, roughness:0.85, metalness:0.0 });

  // Main body: segmented wall with doorway gap (stylized medieval tower).
  const wallSegments = 28;
  const wallThickness = 8;
  const doorwayStart = 0;
  const doorwayWidthSegments = 3;
  const segArcLen = (Math.PI * 2 * radius) / wallSegments;

  // Stone base ring.
  const baseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.08, radius * 1.12, 16, 28),
    darker
  );
  baseRing.position.set(x, 8, z);
  baseRing.castShadow = true;
  baseRing.receiveShadow = true;
  tower.add(baseRing);

  // Main cylindrical shell.
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.98, radius * 1.02, height, 28, 1, true),
    stone
  );
  core.position.set(x, height / 2, z);
  core.castShadow = true;
  core.receiveShadow = true;
  tower.add(core);

  for (let i = 0; i < wallSegments; i++) {
    const inDoorway =
      i >= doorwayStart &&
      i < (doorwayStart + doorwayWidthSegments);
    if (inDoorway) continue;

    const ang = (i / wallSegments) * Math.PI * 2;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(segArcLen * 0.92, height, wallThickness),
      stone
    );
    wall.position.set(
      x + Math.cos(ang) * (radius - wallThickness * 0.5),
      height / 2,
      z + Math.sin(ang) * (radius - wallThickness * 0.5)
    );
    wall.rotation.y = -ang;
    wall.castShadow = true;
    wall.receiveShadow = true;
    tower.add(wall);
  }

  // Door frame accent.
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(42, 52, 10), darker);
  doorFrame.position.set(x + radius - 5, 26, z);
  doorFrame.castShadow = true;
  doorFrame.receiveShadow = true;
  tower.add(doorFrame);

  // Small windows near top.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.38;
    const w = new THREE.Mesh(new THREE.BoxGeometry(9, 18, 6), darker);
    w.position.set(
      x + Math.cos(a) * (radius - 2),
      height * 0.72,
      z + Math.sin(a) * (radius - 2)
    );
    w.rotation.y = -a;
    w.castShadow = true;
    w.receiveShadow = true;
    tower.add(w);
  }

  // Single spiral staircase INSIDE the tower
  const steps = [];
  const stepRise = height / stepCount;
  const stepD = 20;
  const stepLen = Math.max(32, radius * 0.56);
  const stairRadius = Math.max(16, radius * 0.42);

  for (let i = 0; i < stepCount; i++) {
    const t = i / stepCount;
    const ang = t * Math.PI * 2 * 1.25; // tighter spiral climb
    const yTop = (i+1) * stepRise;

    const step = new THREE.Mesh(new THREE.BoxGeometry(stepLen, stepRise, stepD), wood);
    const r = stairRadius;
    step.position.set(
      x + Math.cos(ang) * r,
      yTop - stepRise/2,
      z + Math.sin(ang) * r
    );
    step.rotation.y = -ang;
    step.castShadow = true;
    step.receiveShadow = true;
    tower.add(step);

    // record AABB for height sampling
    const halfL = stepLen/2;
    const halfD = stepD/2;

    // approximate AABB by using an axis-aligned box in world space (cheap + good enough)
    // We'll expand it a bit so you can climb easily.
    const pad = 2;
    steps.push({
      x1: step.position.x - halfL - pad,
      x2: step.position.x + halfL + pad,
      z1: step.position.z - halfD - pad,
      z2: step.position.z + halfD + pad,
      topY: BASE_GROUND_Y + yTop
    });

  }

  // Rooftop deck and parapet (the "tower top" look).
  const deckH = 8;
  const deckR = radius * 0.9;
  const deckTopY = BASE_GROUND_Y + height + deckH;

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(deckR, deckR, deckH, 28),
    wood
  );
  deck.position.set(x, BASE_GROUND_Y + height + deckH / 2, z);
  deck.castShadow = true;
  deck.receiveShadow = true;
  tower.add(deck);

  const parapetR = radius * 1.02;
  const battlementCount = 16;
  for (let i = 0; i < battlementCount; i++) {
    if (i % 2 === 1) continue;
    const a = (i / battlementCount) * Math.PI * 2;
    const crenel = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 10), darker);
    crenel.position.set(
      x + Math.cos(a) * parapetR,
      BASE_GROUND_Y + height + 13,
      z + Math.sin(a) * parapetR
    );
    crenel.rotation.y = -a;
    crenel.castShadow = true;
    crenel.receiveShadow = true;
    tower.add(crenel);
  }

  tower.position.set(0, 0, 0);
  scene.add(tower);

  towers.push({
    x, z,
    steps,
    topDeck: {
      x1: x - deckR,
      x2: x + deckR,
      z1: z - deckR,
      z2: z + deckR,
      topY: deckTopY
    }
  });
}

// Place a few towers
addTower(400,  280, { height: 360, radius: 86, steps: 28 });
addTower(-600, 500, { height: 320, radius: 78, steps: 24 });
addTower(900,  -520, { height: 420, radius: 92, steps: 32 });

// Ground height sampler (stairs + tower top; otherwise base ground)
function sampleGroundHeight(x, z, currentY = BASE_GROUND_Y) {
  const candidates = [BASE_GROUND_Y];

  // Check towers' steps and top deck.
  for (const t of towers) {
    for (const s of t.steps) {
      if (x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2) {
        candidates.push(s.topY);
      }
    }
    const td = t.topDeck;
    if (td && x >= td.x1 && x <= td.x2 && z >= td.z1 && z <= td.z2) {
      candidates.push(td.topY);
    }
  }

  // Prevent instant teleport to high steps: only allow stepping up a limited amount.
  const MAX_STEP_UP = 18;
  let y = BASE_GROUND_Y;
  for (const h of candidates) {
    if (h <= currentY + MAX_STEP_UP && h > y) y = h;
  }
  return y;
}

// =====================
// INPUT
// =====================
const keys = {};

function showGunPopupIfAny() {
  const item = inventory[selectedSlot];
  if (item?.id && itemTypes[item.id]?.isGun) {
    document.getElementById('gunNamePopup').textContent = itemTypes[item.id].name;
    document.getElementById('gunNamePopup').style.opacity = '1';
    setTimeout(() => document.getElementById('gunNamePopup').style.opacity = '0', 1400);
  }
}

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape') {
    if (isRespawningActive()) return;
    if (gameState === GAME_STATE.PLAYING) {
      if (isShopOpen()) {
        closeShop();
      } else {
        const inv = document.getElementById('inventoryScreen');
        if (inv.style.display === 'flex') {
          inv.style.display = 'none';
          hoverSlotIndex = null;
          renderCursorStack();
        }
        pauseGame();
      }
      return;
    }
    if (gameState === GAME_STATE.PAUSED) {
      resumeGame();
      return;
    }
  }
  if (!isGameplayRunning()) return;
  if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    setEnemyDebugVisible(!enemyDebugVisible);
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    reloadSelectedGun();
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    returnToStartArea();
    return;
  }
  if (isSceneTransitionActive()) return;
  if (isRespawningActive()) return;

  if (e.key === 'Tab') {
    e.preventDefault();
    if (isLocked) {
      thirdPerson = !thirdPerson;
      if (!thirdPerson) {
        // Always return to straight-forward first-person view.
        yaw = 0;
        pitch = 0;
        player.rotation.y = yaw;
        camera.rotation.set(0, 0, 0);
        camera.position.copy(firstPersonOffset);
      }
      updateHotbar();
    }
    return;
  }

  if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    if (isShopOpen()) {
      closeShop();
      return;
    }
    const inv = document.getElementById('inventoryScreen');
    const invOpenNow = inv.style.display === 'flex';

    if (invOpenNow) {
      // Close inventory and re-lock cursor/look controls.
      inv.style.display = 'none';
      hoverSlotIndex = null;
      renderCursorStack();
      requestPointerLockSafe();
    } else if (isLocked) {
      // Only open inventory while in gameplay lock mode.
      inv.style.display = 'flex';
      document.exitPointerLock?.();
      updateFullInventory();
      renderCursorStack();
    }
    return;
  }

  const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
  if (invOpen && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    swapWithHotbar(parseInt(e.key) - 1);
    return;
  }

  if (!invOpen && e.key >= '1' && e.key <= '9') {
    selectedSlot = parseInt(e.key) - 1;
    updateHotbar();
    showGunPopupIfAny();
  }

});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

document.addEventListener('wheel', (e) => {
  if (!isGameplayRunning()) return;
  if (isSceneTransitionActive()) return;
  if (isRespawningActive()) return;
  const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
  if (invOpen) return;
  if (isShopOpen()) return;
  selectedSlot = (selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
  updateHotbar();
  showGunPopupIfAny();
});

// =====================
// SHOOT / OPEN CHEST
// (DUMMIES REMOVED)
// =====================
let shootCooldown = 0;
let recoilVisual = 0;
let recoilPitchOffset = 0;
let recoilYawOffset = 0;
let screenShakeTime = 0;
let screenShakeStrength = 0;
let waveNumber = 1;
let waveTimer = 0;
let waveDuration = 45;
let waveRunning = false;
let waveSpawnSerial = 0;

const COMBAT_SPAWN_POINT = new THREE.Vector3(-8600, BASE_GROUND_Y, -8200);
const WORLD_ZONE = {
  START: 'START',
  COMBAT: 'COMBAT'
};
let currentWorldZone = WORLD_ZONE.START;
const ROOFTOP_WAIT_BEFORE_FADE = 2.0;
const FADE_TO_BLACK_TIME = 1.35;
const BLACK_SCREEN_HOLD = 3.0;
const FADE_FROM_BLACK_TIME = 1.45;
const RESPAWN_FADE_OUT_TIME = 0.4;
const RESPAWN_FADE_IN_TIME = 0.6;
const RESPAWN_STANDING_OFFSET = 0;

let rooftopStandTimer = 0;
let sceneTransitionState = 'idle'; // idle | fadingOut | blackHold | fadingIn
let sceneTransitionTimer = 0;
let sceneTransitionCooldown = 0;
const SCENE_TRANSITION_COOLDOWN = 2.5;
let respawnState = 'idle'; // idle | fadingOut | deathScreen | fadingIn
let respawnTimer = 0;

function isOnAnyTowerRooftopDeck() {
  if (currentWorldZone !== WORLD_ZONE.START) return false;
  const px = player.position.x;
  const py = player.position.y;
  const pz = player.position.z;
  for (const t of towers) {
    const td = t.topDeck;
    if (!td) continue;
    if (px < td.x1 || px > td.x2 || pz < td.z1 || pz > td.z2) continue;
    if (Math.abs(py - td.topY) <= 3.5) return true;
  }
  return false;
}

function isSceneTransitionActive() {
  return sceneTransitionState !== 'idle';
}

function isRespawningActive() {
  return respawnState !== 'idle';
}

function beginRespawnSequence() {
  if (!respawnFadeOverlayEl) return;
  if (isRespawningActive()) return;

  waveRunning = false;
  rightMouseAutoFire = false;
  document.exitPointerLock?.();
  if (isShopOpen()) closeShop();
  const inv = document.getElementById('inventoryScreen');
  if (inv && inv.style.display === 'flex') {
    inv.style.display = 'none';
    hoverSlotIndex = null;
    renderCursorStack();
  }

  respawnState = 'fadingOut';
  respawnTimer = 0;
  for (const k in keys) keys[k] = false;
  vel.set(0, 0, 0);
  shootCooldown = Math.max(shootCooldown, 0.12);
  clearEnemyProjectiles();
  updateDeathStatsScreen();
  if (deathStatsScreenEl) deathStatsScreenEl.classList.remove('active');
  respawnFadeOverlayEl.classList.add('active');
  respawnFadeOverlayEl.style.opacity = '0';
}

function completeRespawnAtStart() {
  if (deathStatsScreenEl) deathStatsScreenEl.classList.remove('active');
  currentWorldZone = WORLD_ZONE.START;
  player.position.set(START_SPAWN.x, START_SPAWN.y, START_SPAWN.z);
  const spawnGroundY = sampleGroundHeight(player.position.x, player.position.z, player.position.y);
  player.position.y = spawnGroundY + RESPAWN_STANDING_OFFSET;
  vel.set(0, 0, 0);
  playerHealth = getPlayerMaxHp();
  refreshHealthHud();
  clearEnemyProjectiles();
  resetLifeStats();
  startWaveRun();
  applyStartingLoadout();
}

function returnToStartArea() {
  if (!isGameplayRunning()) return;
  if (isSceneTransitionActive() || isRespawningActive()) return;
  if (currentWorldZone !== WORLD_ZONE.COMBAT) {
    showReloadHint('Already at the beginning');
    return;
  }
  currentWorldZone = WORLD_ZONE.START;
  rightMouseAutoFire = false;
  for (const k in keys) keys[k] = false;
  player.position.set(START_SPAWN.x, START_SPAWN.y, START_SPAWN.z);
  const spawnGroundY = sampleGroundHeight(player.position.x, player.position.z, player.position.y);
  player.position.y = spawnGroundY + RESPAWN_STANDING_OFFSET;
  vel.set(0, 0, 0);
  clearEnemyProjectiles();
  sceneTransitionCooldown = SCENE_TRANSITION_COOLDOWN;
  rooftopStandTimer = 0;
  showReloadHint('Returned to the beginning');
}

function continueRespawnFromDeathScreen() {
  if (respawnState !== 'deathScreen') return;
  completeRespawnAtStart();
  respawnState = 'fadingIn';
  respawnTimer = 0;
}

function updateRespawn(delta) {
  if (!respawnFadeOverlayEl) return;
  if (respawnState === 'idle') return;

  respawnTimer += delta;

  if (respawnState === 'fadingOut') {
    const t = Math.min(1, respawnTimer / RESPAWN_FADE_OUT_TIME);
    respawnFadeOverlayEl.style.opacity = String(t);
    if (t >= 1) {
      updateDeathStatsScreen();
      if (deathStatsScreenEl) {
        deathStatsScreenEl.classList.add('active');
        respawnState = 'deathScreen';
      } else {
        completeRespawnAtStart();
        respawnState = 'fadingIn';
      }
      respawnTimer = 0;
    }
    return;
  }

  if (respawnState === 'deathScreen') {
    respawnFadeOverlayEl.style.opacity = '1';
    return;
  }

  if (respawnState === 'fadingIn') {
    const t = Math.min(1, respawnTimer / RESPAWN_FADE_IN_TIME);
    respawnFadeOverlayEl.style.opacity = String(1 - t);
    if (t >= 1) {
      respawnState = 'idle';
      respawnFadeOverlayEl.classList.remove('active');
      respawnFadeOverlayEl.style.opacity = '0';
      requestPointerLockSafe();
    }
  }
}

function beginSceneTransition() {
  if (!sceneTransitionOverlayEl) return;
  if (sceneTransitionState !== 'idle') return;

  rooftopStandTimer = 0;
  sceneTransitionState = 'fadingOut';
  sceneTransitionTimer = 0;

  if (isShopOpen()) closeShop();
  const inv = document.getElementById('inventoryScreen');
  if (inv.style.display === 'flex') {
    inv.style.display = 'none';
    hoverSlotIndex = null;
    renderCursorStack();
  }

  for (const k in keys) keys[k] = false;
  vel.set(0, 0, 0);
  sceneTransitionOverlayEl.classList.add('active');
  sceneTransitionOverlayEl.classList.remove('showText');
  sceneTransitionOverlayEl.style.opacity = '0';
}

function teleportToCombatArea() {
  currentWorldZone = WORLD_ZONE.COMBAT;
  player.position.set(COMBAT_SPAWN_POINT.x, COMBAT_SPAWN_POINT.y, COMBAT_SPAWN_POINT.z);
  vel.set(0, 0, 0);
  const spawnGroundY = sampleGroundHeight(player.position.x, player.position.z, player.position.y);
  player.position.y = spawnGroundY;
  ensureCombatEnemiesSpawned();
}

function updateSceneTransition(delta) {
  if (!sceneTransitionOverlayEl) return;
  sceneTransitionCooldown = Math.max(0, sceneTransitionCooldown - delta);

  if (sceneTransitionState === 'idle') {
    if (sceneTransitionCooldown > 0) {
      rooftopStandTimer = 0;
      return;
    }
    if (isOnAnyTowerRooftopDeck()) {
      rooftopStandTimer += delta;
      if (rooftopStandTimer >= ROOFTOP_WAIT_BEFORE_FADE) {
        beginSceneTransition();
      }
    } else {
      rooftopStandTimer = 0;
    }
    return;
  }

  sceneTransitionTimer += delta;

  if (sceneTransitionState === 'fadingOut') {
    const t = Math.min(1, sceneTransitionTimer / FADE_TO_BLACK_TIME);
    sceneTransitionOverlayEl.style.opacity = String(t);
    if (t >= 1) {
      sceneTransitionState = 'blackHold';
      sceneTransitionTimer = 0;
      sceneTransitionOverlayEl.classList.add('showText');
    }
    return;
  }

  if (sceneTransitionState === 'blackHold') {
    sceneTransitionOverlayEl.style.opacity = '1';
    if (sceneTransitionTimer >= BLACK_SCREEN_HOLD) {
      teleportToCombatArea();
      sceneTransitionState = 'fadingIn';
      sceneTransitionTimer = 0;
      sceneTransitionOverlayEl.classList.remove('showText');
    }
    return;
  }

  if (sceneTransitionState === 'fadingIn') {
    const t = Math.min(1, sceneTransitionTimer / FADE_FROM_BLACK_TIME);
    sceneTransitionOverlayEl.style.opacity = String(1 - t);
    if (t >= 1) {
      sceneTransitionState = 'idle';
      sceneTransitionCooldown = SCENE_TRANSITION_COOLDOWN;
      rooftopStandTimer = 0;
      sceneTransitionOverlayEl.classList.remove('showText');
      sceneTransitionOverlayEl.classList.remove('active');
      sceneTransitionOverlayEl.style.opacity = '0';
    }
  }
}

const gunBallistics = {
  pistol: {
    muzzleVelocity: 980,
    gravity: 58,
    drag: 0.022,
    spread: 0.0032,
    life: 2.3,
    pellets: 1,
    hitRadius: 1.2,
    recoilPitch: 0.018,
    recoilYaw: 0.011,
    weaponKick: 0.09,
    cooldownMul: 1.0,
    muzzleOffsetX: 0.47,
    muzzleOffsetY: -0.24,
    muzzleOffsetZ: 1.6,
    muzzleFlashSize: 2.4,
    muzzleFlashLife: 0.048,
    muzzleFlashLight: 5.8,
    smokeCount: 8,
    smokeSize: 6.5,
    smokeLife: 0.5,
    shellCount: 1
  },
  smg: {
    muzzleVelocity: 900,
    gravity: 60,
    drag: 0.032,
    spread: 0.0078,
    life: 1.7,
    pellets: 1,
    hitRadius: 1.0,
    recoilPitch: 0.014,
    recoilYaw: 0.02,
    weaponKick: 0.065,
    cooldownMul: 0.72,
    muzzleOffsetX: 0.49,
    muzzleOffsetY: -0.24,
    muzzleOffsetZ: 1.65,
    muzzleFlashSize: 2.2,
    muzzleFlashLife: 0.045,
    muzzleFlashLight: 5.0,
    smokeCount: 7,
    smokeSize: 6.0,
    smokeLife: 0.46,
    shellCount: 1
  },
  rifle: {
    muzzleVelocity: 1220,
    gravity: 55,
    drag: 0.018,
    spread: 0.0025,
    life: 2.6,
    pellets: 1,
    hitRadius: 1.3,
    recoilPitch: 0.027,
    recoilYaw: 0.013,
    weaponKick: 0.12,
    cooldownMul: 0.95,
    muzzleOffsetX: 0.5,
    muzzleOffsetY: -0.23,
    muzzleOffsetZ: 1.85,
    muzzleFlashSize: 2.7,
    muzzleFlashLife: 0.05,
    muzzleFlashLight: 6.4,
    smokeCount: 10,
    smokeSize: 6.7,
    smokeLife: 0.54,
    shellCount: 1
  },
  shotgun: {
    muzzleVelocity: 760,
    gravity: 67,
    drag: 0.055,
    spread: 0.037,
    life: 1.1,
    pellets: 8,
    hitRadius: 1.4,
    recoilPitch: 0.055,
    recoilYaw: 0.024,
    weaponKick: 0.22,
    cooldownMul: 1.4,
    muzzleOffsetX: 0.5,
    muzzleOffsetY: -0.24,
    muzzleOffsetZ: 1.72,
    muzzleFlashSize: 3.2,
    muzzleFlashLife: 0.058,
    muzzleFlashLight: 8.4,
    smokeCount: 14,
    smokeSize: 8.0,
    smokeLife: 0.62,
    shellCount: 2
  },
  sniper: {
    muzzleVelocity: 1850,
    gravity: 49,
    drag: 0.011,
    spread: 0.00075,
    life: 3.4,
    pellets: 1,
    hitRadius: 1.4,
    recoilPitch: 0.095,
    recoilYaw: 0.03,
    weaponKick: 0.34,
    cooldownMul: 2.0,
    muzzleOffsetX: 0.53,
    muzzleOffsetY: -0.22,
    muzzleOffsetZ: 2.0,
    muzzleFlashSize: 3.6,
    muzzleFlashLife: 0.062,
    muzzleFlashLight: 9.6,
    smokeCount: 18,
    smokeSize: 9.2,
    smokeLife: 0.7,
    shellCount: 1
  },
  scout_sniper: {
    muzzleVelocity: 1680,
    gravity: 50,
    drag: 0.013,
    spread: 0.0011,
    life: 3.0,
    pellets: 1,
    hitRadius: 1.25,
    recoilPitch: 0.064,
    recoilYaw: 0.022,
    weaponKick: 0.24,
    cooldownMul: 1.45,
    muzzleOffsetX: 0.52,
    muzzleOffsetY: -0.22,
    muzzleOffsetZ: 1.9,
    muzzleFlashSize: 3.1,
    muzzleFlashLife: 0.056,
    muzzleFlashLight: 8.1,
    smokeCount: 13,
    smokeSize: 8.0,
    smokeLife: 0.62,
    shellCount: 1
  },
  heavy_sniper: {
    muzzleVelocity: 2150,
    gravity: 45,
    drag: 0.008,
    spread: 0.00045,
    life: 4.2,
    pellets: 1,
    hitRadius: 1.65,
    recoilPitch: 0.13,
    recoilYaw: 0.038,
    weaponKick: 0.46,
    cooldownMul: 2.65,
    muzzleOffsetX: 0.55,
    muzzleOffsetY: -0.2,
    muzzleOffsetZ: 2.18,
    muzzleFlashSize: 4.4,
    muzzleFlashLife: 0.07,
    muzzleFlashLight: 12.0,
    smokeCount: 24,
    smokeSize: 10.5,
    smokeLife: 0.82,
    shellCount: 1
  },
  marksman_sniper: {
    muzzleVelocity: 1760,
    gravity: 48,
    drag: 0.012,
    spread: 0.0009,
    life: 3.3,
    pellets: 1,
    hitRadius: 1.35,
    recoilPitch: 0.078,
    recoilYaw: 0.026,
    weaponKick: 0.29,
    cooldownMul: 1.72,
    muzzleOffsetX: 0.53,
    muzzleOffsetY: -0.22,
    muzzleOffsetZ: 2.02,
    muzzleFlashSize: 3.35,
    muzzleFlashLife: 0.06,
    muzzleFlashLight: 8.8,
    smokeCount: 16,
    smokeSize: 8.6,
    smokeLife: 0.67,
    shellCount: 1
  }
};

const activeProjectiles = [];
const activeMuzzleFlashes = [];
const activeSmokeBursts = [];
const activeImpactBursts = [];
const activeShells = [];

const projectileGeometry = new THREE.SphereGeometry(0.55, 8, 8);
const projectileMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd796,
  emissive: 0x6a4216,
  emissiveIntensity: 0.55,
  roughness: 0.42,
  metalness: 0.22
});

const muzzleFlashGeometry = new THREE.SphereGeometry(1, 10, 10);
const shellGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.34, 8);
const shellMaterial = new THREE.MeshStandardMaterial({
  color: 0xc6993b,
  metalness: 0.88,
  roughness: 0.35
});

function makeSoftParticleTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.38, 'rgba(255,255,255,0.78)');
  grad.addColorStop(1, 'rgba(255,255,255,0.0)');
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(32, 32, 30, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
const softParticleTex = makeSoftParticleTexture();

const _shotQuat = new THREE.Quaternion();
const _shotOrigin = new THREE.Vector3();
const _shotDir = new THREE.Vector3();
const _shotRight = new THREE.Vector3();
const _shotUp = new THREE.Vector3();
const _spreadDir = new THREE.Vector3();
const _tmpV0 = new THREE.Vector3();
const _tmpV1 = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();
const _chestCenter = new THREE.Vector3();

function dampScalar(current, target, lambda, delta) {
  const t = 1 - Math.exp(-lambda * delta);
  return current + (target - current) * t;
}

function openChestReward(chestObj) {
  if (!chestObj || chestObj.userData.opened) return false;
  chestObj.userData.opened = true;
  playGameSfx('chest');
  giveChestLoot(chestObj.userData.contains);
  explodeAt(chestObj.position, { particleCount: 220, power: 1.25, life: 0.65 });
  scene.remove(chestObj);
  const idx = chests.indexOf(chestObj);
  if (idx !== -1) chests.splice(idx, 1);
  return true;
}

function pointToSegmentDistanceSq(point, a, b) {
  _tmpV0.copy(b).sub(a);
  const lenSq = _tmpV0.lengthSq();
  if (lenSq <= 1e-8) return point.distanceToSquared(a);
  _tmpV1.copy(point).sub(a);
  const t = THREE.MathUtils.clamp(_tmpV1.dot(_tmpV0) / lenSq, 0, 1);
  _tmpV2.copy(a).addScaledVector(_tmpV0, t);
  return point.distanceToSquared(_tmpV2);
}

function findChestHitOnSegment(a, b, projectileRadius) {
  const hitR = 18 + projectileRadius;
  const hitRSq = hitR * hitR;
  for (const chest of chests) {
    if (!chest || chest.userData.opened) continue;
    _chestCenter.set(chest.position.x, 14, chest.position.z);
    if (pointToSegmentDistanceSq(_chestCenter, a, b) <= hitRSq) return chest;
  }
  return null;
}

const combatEnemies = [];
const enemyProjectiles = [];
const coinDrops = [];
const deadEnemyIds = new Set();
const DEAD_ENEMIES_STORAGE_KEY = 'exstrike_dead_enemy_ids';

const ENEMY_PATROL_RADIUS = 400;
const ENEMY_AGGRO_RANGE = 500;
const ENEMY_ATTACK_RANGE = 200;
const ENEMY_LEASH_RANGE = 800;
const ENEMY_FIRE_INTERVAL = 1.5;
const COMBAT_ENEMY_AREA_HALF = 1000; // 2000x2000 area around combat spawn
const PLAYER_HITBOX_RADIUS = 18;
const PLAYER_HITBOX_Y_OFFSET = 16;
const ENEMY_PROJECTILE_RADIUS = 6;
const WAVE_MIN_TIME = 30;
const WAVE_MAX_TIME = 60;

const enemyTypeDefs = {
  soldier: { maxHp: 3, patrolSpeed: 85, chaseSpeed: 145, hitRadius: 24, eyeY: 34 },
  monster: { maxHp: 5, patrolSpeed: 68, chaseSpeed: 122, hitRadius: 30, eyeY: 40 },
  robot: { maxHp: 4, patrolSpeed: 76, chaseSpeed: 132, hitRadius: 26, eyeY: 30 },
  boss: { maxHp: 18, patrolSpeed: 54, chaseSpeed: 104, hitRadius: 54, eyeY: 78, fireInterval: 1.05, projectileSpeed: 410, projectileRadius: 10 }
};

const enemyProjectileGeometry = new THREE.SphereGeometry(3.1, 10, 10);
const enemyProjectileMaterial = new THREE.MeshStandardMaterial({
  color: 0xff6a63,
  emissive: 0x8a1e1a,
  emissiveIntensity: 0.75,
  roughness: 0.35,
  metalness: 0.05
});
const enemyDebugWireMaterial = new THREE.MeshBasicMaterial({
  color: 0x57d6ff,
  wireframe: true,
  transparent: true,
  opacity: 0.55
});
const enemyProjectileDebugGeometry = new THREE.SphereGeometry(1, 10, 10);
const playerHitboxDebugMesh = new THREE.Mesh(
  new THREE.SphereGeometry(PLAYER_HITBOX_RADIUS, 12, 10),
  enemyDebugWireMaterial
);
let enemyDebugVisible = false;
playerHitboxDebugMesh.visible = false;
scene.add(playerHitboxDebugMesh);
const coinDropGeometry = new THREE.CylinderGeometry(4.2, 4.2, 1.6, 14);
const coinDropMaterial = new THREE.MeshStandardMaterial({
  color: 0xf1c452,
  emissive: 0x7a5a16,
  emissiveIntensity: 0.35,
  roughness: 0.32,
  metalness: 0.62
});
const enemyHealthBackMaterial = new THREE.MeshBasicMaterial({
  color: 0x260000,
  transparent: true,
  opacity: 0.78,
  depthTest: false
});
const enemyHealthFillMaterial = new THREE.MeshBasicMaterial({
  color: 0x21d34b,
  transparent: true,
  opacity: 0.92,
  depthTest: false
});

const _enemyTargetPos = new THREE.Vector3();
const _enemyAimDir = new THREE.Vector3();
const _enemyHitCenter = new THREE.Vector3();
const _playerHitCenter = new THREE.Vector3();
const _enemyProjOrigin = new THREE.Vector3();
const _enemyBounds = new THREE.Box3();
const _enemyHealthParentQuat = new THREE.Quaternion();
const _combatEnemySpawnPlan = [];
const _starterEnemySpawnPlan = [];

function setEnemyDebugVisible(v) {
  enemyDebugVisible = !!v;
  playerHitboxDebugMesh.visible = enemyDebugVisible;
  for (const p of enemyProjectiles) {
    if (p.debugMesh) p.debugMesh.visible = enemyDebugVisible;
  }
}

function getGroundHeightAt(x, z, currentY = BASE_GROUND_Y) {
  return Math.max(BASE_GROUND_Y, sampleGroundHeight(x, z, currentY));
}

function saveDeadEnemyIds() {
  try {
    localStorage.setItem(DEAD_ENEMIES_STORAGE_KEY, JSON.stringify(Array.from(deadEnemyIds)));
  } catch (_) {}
}

function loadDeadEnemyIds() {
  deadEnemyIds.clear();
  try {
    const raw = localStorage.getItem(DEAD_ENEMIES_STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    for (const id of arr) {
      if (typeof id === 'string') deadEnemyIds.add(id);
    }
  } catch (_) {}
}

function ensureCombatEnemySpawnPlan() {
  if (_combatEnemySpawnPlan.length > 0) return;
  const types = ['soldier', 'monster', 'robot'];
  const visibleOffsets = [
    [-85, -95], [85, -95], [0, -150],
    [-140, -30], [140, -30], [0, 135],
    [-180, 85], [180, 85], [-225, -145], [225, -145],
    [-250, 0], [250, 0], [-205, 215], [205, 215], [0, 285]
  ];
  for (let i = 0; i < 15; i++) {
    const type = types[i % types.length];
    const id = `combat_spawn_${i}`;
    const [ox, oz] = visibleOffsets[i];
    const x = COMBAT_SPAWN_POINT.x + ox;
    const z = COMBAT_SPAWN_POINT.z + oz;
    _combatEnemySpawnPlan.push({ id, type, x, z });
  }
  _combatEnemySpawnPlan.push({
    id: 'combat_boss_0',
    type: 'boss',
    x: COMBAT_SPAWN_POINT.x,
    z: COMBAT_SPAWN_POINT.z - 360
  });
}

function ensureStarterEnemySpawnPlan() {
  if (_starterEnemySpawnPlan.length > 0) return;
  const types = ['soldier', 'monster', 'robot', 'soldier', 'monster', 'robot', 'soldier', 'monster'];
  const offsets = [
    [-190, -260], [190, -250], [0, -330], [-310, -80],
    [310, -80], [-240, 210], [240, 210], [0, 360]
  ];
  for (let i = 0; i < offsets.length; i++) {
    const [ox, oz] = offsets[i];
    _starterEnemySpawnPlan.push({
      id: `starter_enemy_${i}`,
      type: types[i % types.length],
      x: START_SPAWN.x + ox,
      z: START_SPAWN.z + oz
    });
  }
}

function createSoldierEnemyMesh() {
  const g = new THREE.Group();
  const camoA = new THREE.MeshStandardMaterial({ color: 0x4d6f43, roughness: 0.9, metalness: 0.02 });
  const camoB = new THREE.MeshStandardMaterial({ color: 0x3d5638, roughness: 0.9, metalness: 0.02 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb78f75, roughness: 0.95, metalness: 0.0 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(18, 24, 10), camoA);
  torso.position.y = 33;
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(5.2, 2.8, 6, 10), skin);
  head.position.y = 51;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(6, 18, 6), camoB);
  legL.position.set(-4.2, 12, 0);
  const legR = legL.clone();
  legR.position.x = 4.2;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(5, 16, 5), camoA);
  armL.position.set(-11.5, 34, 0);
  const armR = armL.clone();
  armR.position.x = 11.5;
  g.add(torso, head, legL, legR, armL, armR);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function createMonsterEnemyMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4b1f42, roughness: 0.88, metalness: 0.02 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x311329, roughness: 0.92, metalness: 0.0 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x7e242b, roughness: 0.85, metalness: 0.0 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(14, 26, 8, 14), bodyMat);
  torso.position.set(0, 34, 0);
  torso.rotation.z = 0.28;
  const hump = new THREE.Mesh(new THREE.SphereGeometry(10, 10, 10), darkMat);
  hump.position.set(-7, 45, -2);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(4.8, 20, 6, 10), darkMat);
  armL.position.set(-14, 29, 2);
  armL.rotation.z = 0.52;
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(4.8, 20, 6, 10), darkMat);
  armR.position.set(11, 28, -1);
  armR.rotation.z = -0.42;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 8), accentMat);
  eye.position.set(4, 45, 7);
  g.add(torso, hump, armL, armR, eye);
  g.scale.setScalar(1.22);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function createRobotEnemyMesh() {
  const g = new THREE.Group();
  const metalA = new THREE.MeshStandardMaterial({ color: 0x7a8289, roughness: 0.5, metalness: 0.72 });
  const metalB = new THREE.MeshStandardMaterial({ color: 0x5d656d, roughness: 0.48, metalness: 0.74 });
  const core = new THREE.MeshStandardMaterial({ color: 0x9ca5ad, roughness: 0.4, metalness: 0.78 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(24, 26, 14), metalA);
  torso.position.y = 31;
  const head = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 12), metalB);
  head.position.y = 52;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 1), core);
  eye.position.set(0, 52, 6.5);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(7, 18, 7), metalB);
  legL.position.set(-5, 11, 0);
  const legR = legL.clone();
  legR.position.x = 5;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(6, 15, 6), metalA);
  armL.position.set(-15, 32, 0);
  const armR = armL.clone();
  armR.position.x = 15;
  g.add(torso, head, eye, legL, legR, armL, armR);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function createBossEnemyMesh() {
  const g = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.58, metalness: 0.55 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8b1515, emissive: 0x3f0505, emissiveIntensity: 0.5, roughness: 0.72, metalness: 0.15 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xb7a890, roughness: 0.84, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(48, 62, 32), armor);
  body.position.y = 54;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(34, 20, 34), red);
  chest.position.set(0, 58, 2);
  const head = new THREE.Mesh(new THREE.BoxGeometry(32, 28, 26), armor);
  head.position.y = 104;
  const hornL = new THREE.Mesh(new THREE.ConeGeometry(5, 24, 8), bone);
  hornL.position.set(-18, 120, 0);
  hornL.rotation.z = 0.62;
  const hornR = hornL.clone();
  hornR.position.x = 18;
  hornR.rotation.z = -0.62;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(15, 38, 15), armor);
  legL.position.set(-13, 19, 0);
  const legR = legL.clone();
  legR.position.x = 13;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(13, 52, 13), armor);
  armL.position.set(-36, 54, 0);
  armL.rotation.z = 0.2;
  const armR = armL.clone();
  armR.position.x = 36;
  armR.rotation.z = -0.2;
  g.add(body, chest, head, hornL, hornR, legL, legR, armL, armR);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

const enemyMeshFactory = {
  soldier: createSoldierEnemyMesh,
  monster: createMonsterEnemyMesh,
  robot: createRobotEnemyMesh,
  boss: createBossEnemyMesh
};

function assignEnemyPatrolTarget(enemy) {
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * ENEMY_PATROL_RADIUS;
  enemy.patrolTarget.set(
    enemy.spawn.x + Math.cos(ang) * r,
    enemy.spawn.y + Math.sin(ang) * r
  );
}

function createEnemyHealthBar(enemy) {
  const width = enemy.type === 'boss' ? 82 : 42;
  const height = enemy.type === 'boss' ? 7 : 4.5;
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), enemyHealthBackMaterial.clone());
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, height), enemyHealthFillMaterial.clone());
  fill.position.set(0, 0, 0.01);
  group.add(back, fill);
  group.position.set(0, enemy.eyeY + (enemy.type === 'boss' ? 34 : 20), 0);
  group.renderOrder = 20;
  group.userData.fill = fill;
  group.userData.fullWidth = width;
  enemy.mesh.add(group);
  enemy.healthBar = group;
  updateEnemyHealthBar(enemy);
}

function updateEnemyHealthBar(enemy) {
  if (!enemy?.healthBar) return;
  const fill = enemy.healthBar.userData.fill;
  const width = enemy.healthBar.userData.fullWidth;
  const pct = THREE.MathUtils.clamp(enemy.hp / enemy.maxHp, 0, 1);
  fill.scale.x = Math.max(0.001, pct);
  fill.position.x = -width * (1 - pct) * 0.5;
  const mat = fill.material;
  if (pct <= 0.32) mat.color.setHex(0xff3333);
  else if (pct <= 0.62) mat.color.setHex(0xffc247);
  else mat.color.setHex(0x21d34b);
}

function orientEnemyHealthBars() {
  for (const enemy of combatEnemies) {
    if (!enemy.healthBar) continue;
    enemy.mesh.getWorldQuaternion(_enemyHealthParentQuat).invert();
    enemy.healthBar.quaternion.copy(camera.quaternion).premultiply(_enemyHealthParentQuat);
  }
}

function spawnEnemy(type, x, z, id) {
  const def = enemyTypeDefs[type];
  if (!def || !enemyMeshFactory[type]) return;

  const mesh = enemyMeshFactory[type]();
  mesh.position.set(0, 0, 0);
  mesh.updateMatrixWorld(true);
  _enemyBounds.setFromObject(mesh);
  const groundOffset = -_enemyBounds.min.y;
  mesh.position.set(x, getGroundHeightAt(x, z, BASE_GROUND_Y) + groundOffset, z);
  scene.add(mesh);

  const enemy = {
    id,
    type,
    mesh,
    hp: Math.ceil(def.maxHp * (1 + (waveNumber - 1) * 0.18)),
    maxHp: Math.ceil(def.maxHp * (1 + (waveNumber - 1) * 0.18)),
    patrolSpeed: def.patrolSpeed * (1 + (waveNumber - 1) * 0.045),
    chaseSpeed: def.chaseSpeed * (1 + (waveNumber - 1) * 0.055),
    hitRadius: def.hitRadius,
    eyeY: def.eyeY,
    fireInterval: def.fireInterval ?? ENEMY_FIRE_INTERVAL,
    projectileSpeed: def.projectileSpeed ?? 320,
    projectileRadius: def.projectileRadius ?? ENEMY_PROJECTILE_RADIUS,
    groundOffset,
    spawn: new THREE.Vector2(x, z),
    patrolTarget: new THREE.Vector2(x, z),
    waitTimer: Math.random() * 1.2,
    shotCooldown: Math.random() * (def.fireInterval ?? ENEMY_FIRE_INTERVAL),
    touchCooldown: 0
  };
  createEnemyHealthBar(enemy);
  assignEnemyPatrolTarget(enemy);
  combatEnemies.push(enemy);
}

function spawnCombatEnemies() {
  if (combatEnemies.length > 0) return;
  ensureCombatEnemySpawnPlan();
  let spawned = 0;
  for (const spec of _combatEnemySpawnPlan) {
    if (deadEnemyIds.has(spec.id)) continue;
    spawnEnemy(spec.type, spec.x, spec.z, spec.id);
    spawned += 1;
  }
  if (spawned === 0 && _combatEnemySpawnPlan.length > 0) {
    console.info('Combat enemy save had every enemy marked dead. Resetting the combat wave so enemies appear near spawn.');
    deadEnemyIds.clear();
    saveDeadEnemyIds();
    for (const spec of _combatEnemySpawnPlan) {
      spawnEnemy(spec.type, spec.x, spec.z, spec.id);
      spawned += 1;
    }
  }
  console.info(`Spawned ${combatEnemies.length} combat enemies near teleport spawn.`);
}

function spawnStarterEnemies() {
  ensureStarterEnemySpawnPlan();
  let aliveStarterCount = 0;
  for (const enemy of combatEnemies) {
    if (enemy.id?.startsWith('starter_enemy_')) aliveStarterCount += 1;
  }
  if (aliveStarterCount > 0) return;

  for (const spec of _starterEnemySpawnPlan) {
    if (deadEnemyIds.has(spec.id)) continue;
    spawnEnemy(spec.type, spec.x, spec.z, spec.id);
    aliveStarterCount += 1;
  }

  if (aliveStarterCount === 0) {
    for (const spec of _starterEnemySpawnPlan) deadEnemyIds.delete(spec.id);
    saveDeadEnemyIds();
    for (const spec of _starterEnemySpawnPlan) {
      spawnEnemy(spec.type, spec.x, spec.z, spec.id);
      aliveStarterCount += 1;
    }
  }
  console.info(`Spawned ${aliveStarterCount} starter enemies near the beginning spawn.`);
}

function startWaveRun() {
  waveNumber = 1;
  waveTimer = 0;
  waveDuration = 30 + Math.random() * 30;
  waveRunning = true;
  lifeHighestWave = 1;
  spawnWaveEnemies(waveNumber);
}

function spawnWaveEnemies(wave) {
  const types = ['soldier', 'monster', 'robot'];
  const count = Math.min(10, 5 + Math.floor(wave * 1.25));
  const radius = 330 + Math.min(300, wave * 28);
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.35;
    const r = radius + Math.random() * 110;
    const x = player.position.x + Math.cos(ang) * r;
    const z = player.position.z + Math.sin(ang) * r;
    spawnEnemy(types[(i + wave) % types.length], x, z, `wave_${wave}_${waveSpawnSerial++}`);
  }
  showReloadHint(`Wave ${wave}`);
}

function getAliveWaveEnemyCount() {
  let count = 0;
  for (const enemy of combatEnemies) {
    if (enemy.id?.startsWith('wave_')) count += 1;
  }
  return count;
}

function stepWaveSystem(delta) {
  if (!waveRunning || isRespawningActive()) return;
  lifeHighestWave = Math.max(lifeHighestWave, waveNumber);
  waveTimer += delta;

  if (getAliveWaveEnemyCount() === 0 && waveTimer > 6) {
    showRunResults('Wave Clear');
    return;
  }

  if (waveTimer >= waveDuration) {
    waveNumber += 1;
    lifeHighestWave = Math.max(lifeHighestWave, waveNumber);
    waveTimer = 0;
    waveDuration = THREE.MathUtils.clamp(WAVE_MAX_TIME - waveNumber * 2.2, WAVE_MIN_TIME, WAVE_MAX_TIME);
    spawnWaveEnemies(waveNumber);
  }
}

function updateClimbStats() {
  const climbed = Math.max(0, player.position.y - START_SPAWN.y);
  lifeDistanceClimbed = Math.max(lifeDistanceClimbed, climbed);
}

function showRunResults(reason = 'Death') {
  if (isRespawningActive()) return;
  waveRunning = false;
  lastResultReason = reason;
  beginRespawnSequence();
}

function ensureCombatEnemiesSpawned() {
  spawnCombatEnemies();
  if (combatEnemies.length === 0) {
    console.warn('Combat enemies failed to spawn near the teleport point.');
  }
  combatEnemiesInitialized = true;
}

function moveEnemyToward(enemy, tx, tz, speed, delta) {
  const dx = tx - enemy.mesh.position.x;
  const dz = tz - enemy.mesh.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.0001) return true;
  const step = Math.min(dist, speed * delta);
  enemy.mesh.position.x += (dx / dist) * step;
  enemy.mesh.position.z += (dz / dist) * step;
  enemy.mesh.position.y = getGroundHeightAt(enemy.mesh.position.x, enemy.mesh.position.z, enemy.mesh.position.y) + enemy.groundOffset;
  enemy.mesh.rotation.y = Math.atan2(dx, dz);
  return (dist - step) <= 1.2;
}

function spawnEnemyProjectile(enemy) {
  _enemyTargetPos.set(player.position.x, player.position.y + 18, player.position.z);
  _enemyProjOrigin.set(enemy.mesh.position.x, enemy.mesh.position.y + enemy.eyeY, enemy.mesh.position.z);
  _enemyAimDir.copy(_enemyTargetPos).sub(_enemyProjOrigin);
  const len = _enemyAimDir.length();
  if (len <= 1e-5) return;
  _enemyAimDir.multiplyScalar(1 / len);

  const mesh = new THREE.Mesh(enemyProjectileGeometry, enemyProjectileMaterial);
  mesh.position.copy(_enemyProjOrigin);
  scene.add(mesh);
  const debugMesh = new THREE.Mesh(enemyProjectileDebugGeometry, enemyDebugWireMaterial);
  debugMesh.scale.setScalar(ENEMY_PROJECTILE_RADIUS);
  debugMesh.visible = enemyDebugVisible;
  debugMesh.position.copy(_enemyProjOrigin);
  scene.add(debugMesh);

  const speed = enemy.projectileSpeed ?? enemyTypeDefs[enemy.type]?.projectileSpeed ?? 320;
  enemyProjectiles.push({
    mesh,
    debugMesh,
    pos: mesh.position.clone(),
    prevPos: mesh.position.clone(),
    vel: _enemyAimDir.clone().multiplyScalar(speed),
    collisionRadius: enemy.projectileRadius ?? enemyTypeDefs[enemy.type]?.projectileRadius ?? ENEMY_PROJECTILE_RADIUS,
    age: 0,
    life: 4.0
  });
  if (debugMesh) debugMesh.scale.setScalar(enemy.projectileRadius ?? enemyTypeDefs[enemy.type]?.projectileRadius ?? ENEMY_PROJECTILE_RADIUS);
}

function spawnEnemyCoinDrop(position, amount) {
  const mesh = new THREE.Mesh(coinDropGeometry, coinDropMaterial);
  mesh.position.set(position.x + (Math.random() - 0.5) * 12, position.y + 8, position.z + (Math.random() - 0.5) * 12);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  coinDrops.push({
    mesh,
    amount,
    baseY: mesh.position.y,
    age: 0
  });
}

function killEnemyAt(index) {
  const enemy = combatEnemies[index];
  if (!enemy) return;
  if (enemy.id) {
    deadEnemyIds.add(enemy.id);
    saveDeadEnemyIds();
  }
  lifeKills += 1;
  playGameSfx('enemyDeath');
  explodeAt(enemy.mesh.position, {
    particleCount: enemy.type === 'boss' ? 170 : 95,
    power: enemy.type === 'boss' ? 1.05 : 0.72,
    life: enemy.type === 'boss' ? 0.62 : 0.42
  });
  const dropAmount = enemy.type === 'boss'
    ? 35 + Math.floor(Math.random() * 26)
    : 5 + Math.floor(Math.random() * 11); // 5..15, boss 35..60
  spawnEnemyCoinDrop(enemy.mesh.position, dropAmount);
  scene.remove(enemy.mesh);
  combatEnemies.splice(index, 1);
}

function damageEnemyAt(index, amount = 1) {
  const enemy = combatEnemies[index];
  if (!enemy) return;
  const before = Math.max(0, enemy.hp);
  enemy.hp -= amount;
  lifeDamageDealt += Math.min(amount, before);
  showHitMarker();
  addScreenShake(enemy.type === 'boss' ? 5 : 2.8, 0.1);
  updateEnemyHealthBar(enemy);
  if (enemy.hp <= 0) {
    killEnemyAt(index);
  }
}

function findEnemyHitOnSegment(a, b, projectileRadius) {
  for (let i = combatEnemies.length - 1; i >= 0; i--) {
    const e = combatEnemies[i];
    _enemyHitCenter.set(e.mesh.position.x, e.mesh.position.y + e.eyeY * 0.55, e.mesh.position.z);
    const hitR = e.hitRadius + projectileRadius;
    if (pointToSegmentDistanceSq(_enemyHitCenter, a, b) <= hitR * hitR) {
      return i;
    }
  }
  return -1;
}

function stepEnemies(delta) {
  if (combatEnemies.length === 0) return;
  for (const enemy of combatEnemies) {
    enemy.mesh.position.y = getGroundHeightAt(enemy.mesh.position.x, enemy.mesh.position.z, enemy.mesh.position.y) + enemy.groundOffset;
    enemy.touchCooldown = Math.max(0, (enemy.touchCooldown ?? 0) - delta);
    const dx = player.position.x - enemy.mesh.position.x;
    const dz = player.position.z - enemy.mesh.position.z;
    const d = Math.hypot(dx, dz);
    const touchRange = enemy.hitRadius + PLAYER_HITBOX_RADIUS + 4;
    if (d <= touchRange && enemy.touchCooldown <= 0) {
      damagePlayer(enemy.type === 'boss' ? 18 : 7);
      enemy.touchCooldown = enemy.type === 'boss' ? 0.8 : 0.65;
    }

    if (d <= ENEMY_AGGRO_RANGE) {
      if (d > ENEMY_ATTACK_RANGE) {
        moveEnemyToward(enemy, player.position.x, player.position.z, enemy.chaseSpeed, delta);
      } else {
        enemy.mesh.rotation.y = Math.atan2(dx, dz);
      }
      enemy.shotCooldown -= delta;
      if (d <= ENEMY_ATTACK_RANGE && enemy.shotCooldown <= 0) {
        spawnEnemyProjectile(enemy);
        enemy.shotCooldown = enemy.fireInterval ?? ENEMY_FIRE_INTERVAL;
      }
      continue;
    }

    if (d >= ENEMY_LEASH_RANGE) {
      enemy.waitTimer = Math.min(enemy.waitTimer, 0.3);
    }

    if (enemy.waitTimer > 0) {
      enemy.waitTimer -= delta;
      if (enemy.waitTimer <= 0) assignEnemyPatrolTarget(enemy);
      continue;
    }

    const reached = moveEnemyToward(enemy, enemy.patrolTarget.x, enemy.patrolTarget.y, enemy.patrolSpeed, delta);
    if (reached) {
      enemy.waitTimer = 0.45 + Math.random() * 1.2;
      assignEnemyPatrolTarget(enemy);
    }
  }
}

function clearEnemyProjectiles() {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    scene.remove(p.mesh);
    if (p.debugMesh) scene.remove(p.debugMesh);
    enemyProjectiles.splice(i, 1);
  }
}

function stepEnemyProjectiles(delta) {
  _playerHitCenter.set(player.position.x, player.position.y + PLAYER_HITBOX_Y_OFFSET, player.position.z);
  if (enemyDebugVisible) playerHitboxDebugMesh.position.copy(_playerHitCenter);

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.age += delta;
    if (p.age >= p.life) {
      scene.remove(p.mesh);
      if (p.debugMesh) scene.remove(p.debugMesh);
      enemyProjectiles.splice(i, 1);
      continue;
    }

    p.prevPos.copy(p.pos);
    p.vel.y -= 30 * delta;
    p.pos.addScaledVector(p.vel, delta);
    p.mesh.position.copy(p.pos);
    if (p.debugMesh) p.debugMesh.position.copy(p.pos);

    const groundY = getGroundHeightAt(p.pos.x, p.pos.z, p.pos.y);
    if (p.pos.y <= groundY + p.collisionRadius) {
      scene.remove(p.mesh);
      if (p.debugMesh) scene.remove(p.debugMesh);
      enemyProjectiles.splice(i, 1);
      continue;
    }

    const hitR = PLAYER_HITBOX_RADIUS + p.collisionRadius;
    if (pointToSegmentDistanceSq(_playerHitCenter, p.prevPos, p.pos) <= hitR * hitR) {
      console.log('Enemy hit player for 1 damage');
      damagePlayer(1);
      scene.remove(p.mesh);
      if (p.debugMesh) scene.remove(p.debugMesh);
      enemyProjectiles.splice(i, 1);
      continue;
    }
  }
}

function stepCoinDrops(delta) {
  for (let i = coinDrops.length - 1; i >= 0; i--) {
    const drop = coinDrops[i];
    drop.age += delta;
    drop.mesh.rotation.y += delta * 3.6;
    drop.mesh.position.y = drop.baseY + Math.sin(drop.age * 3.1) * 2.2;

    const dx = player.position.x - drop.mesh.position.x;
    const dz = player.position.z - drop.mesh.position.z;
    if ((dx * dx + dz * dz) <= 85 * 85) {
      coins += drop.amount;
      lifeCoinsEarned += drop.amount;
      playGameSfx('coin');
      refreshCoinHud();
      scene.remove(drop.mesh);
      coinDrops.splice(i, 1);
    }
  }
}

function spawnProjectile(origin, dir, profile) {
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
  mesh.position.copy(origin);
  mesh.scale.setScalar(profile.hitRadius);
  scene.add(mesh);

  const speed = profile.muzzleVelocity * (0.97 + Math.random() * 0.06);
  activeProjectiles.push({
    mesh,
    pos: origin.clone(),
    prevPos: origin.clone(),
    vel: dir.clone().multiplyScalar(speed),
    drag: profile.drag,
    gravity: profile.gravity,
    life: profile.life,
    age: 0,
    hitRadius: profile.hitRadius
  });
}

function spawnMuzzleFlash(origin, dir, profile) {
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffdfa4,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const flash = new THREE.Mesh(muzzleFlashGeometry, flashMat);
  flash.position.copy(origin).addScaledVector(dir, profile.muzzleFlashSize * 0.55);
  flash.scale.setScalar(profile.muzzleFlashSize);
  scene.add(flash);

  const light = new THREE.PointLight(0xffd79c, profile.muzzleFlashLight, 190, 2);
  light.position.copy(flash.position);
  scene.add(light);

  activeMuzzleFlashes.push({
    mesh: flash,
    light,
    age: 0,
    life: profile.muzzleFlashLife,
    baseScale: profile.muzzleFlashSize,
    baseLight: profile.muzzleFlashLight
  });
}

function spawnSmokeBurst(origin, dir, opts = {}) {
  const count = opts.count ?? 8;
  const life = opts.life ?? 0.5;
  const size = opts.size ?? 7;
  const speed = opts.speed ?? 18;
  const spread = opts.spread ?? 10;
  const color = opts.color ?? 0x7a848d;
  const opacity = opts.opacity ?? 0.55;
  const drag = opts.drag ?? 2.9;
  const rise = opts.rise ?? 16;
  const forwardOffset = opts.forwardOffset ?? 0.7;

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const ox = origin.x + dir.x * forwardOffset;
  const oy = origin.y + dir.y * forwardOffset;
  const oz = origin.z + dir.z * forwardOffset;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3 + 0] = ox + (Math.random() - 0.5) * 0.9;
    positions[i3 + 1] = oy + (Math.random() - 0.5) * 0.9;
    positions[i3 + 2] = oz + (Math.random() - 0.5) * 0.9;
    velocities[i3 + 0] = dir.x * speed + (Math.random() - 0.5) * spread;
    velocities[i3 + 1] = dir.y * speed * 0.5 + Math.random() * spread * 0.8;
    velocities[i3 + 2] = dir.z * speed + (Math.random() - 0.5) * spread;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: softParticleTex,
    transparent: true,
    opacity,
    depthWrite: false,
    alphaTest: 0.03,
    sizeAttenuation: false
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  activeSmokeBursts.push({
    points,
    velocities,
    age: 0,
    life,
    drag,
    rise,
    baseSize: size,
    baseOpacity: opacity
  });
}

function spawnImpactBurst(position, strength = 1) {
  const count = Math.floor(8 + strength * 9);
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3 + 0] = position.x + (Math.random() - 0.5) * 0.9;
    positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.9;
    positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.9;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5),
      Math.random() * 1.4,
      (Math.random() - 0.5)
    ).normalize();
    const speed = 36 + Math.random() * 42 * strength;
    velocities[i3 + 0] = dir.x * speed;
    velocities[i3 + 1] = dir.y * speed;
    velocities[i3 + 2] = dir.z * speed;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffc476,
    size: 4.2 + strength * 1.3,
    map: softParticleTex,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.03,
    sizeAttenuation: false
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  activeImpactBursts.push({
    points,
    velocities,
    age: 0,
    life: 0.22 + strength * 0.15,
    drag: 6.4,
    gravity: 110,
    baseOpacity: 1
  });

  spawnSmokeBurst(position, _tmpV0.set(0, 1, 0), {
    count: 4 + Math.floor(strength * 5),
    life: 0.35 + strength * 0.2,
    size: 6 + strength * 1.4,
    speed: 10 + strength * 6,
    spread: 8 + strength * 4,
    opacity: 0.45
  });
}

function spawnShellEjection(origin, right, up, forward, profile) {
  const shellCount = profile.shellCount ?? 1;
  for (let i = 0; i < shellCount; i++) {
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.scale.setScalar(0.9 + Math.random() * 0.25);
    shell.castShadow = true;
    shell.receiveShadow = true;
    shell.position.copy(origin)
      .addScaledVector(right, 1.2 + Math.random() * 0.35)
      .addScaledVector(up, -0.14 + Math.random() * 0.2)
      .addScaledVector(forward, -0.2 + (Math.random() - 0.5) * 0.1);
    shell.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(shell);

    const vx = right.x * (34 + Math.random() * 26) + up.x * (18 + Math.random() * 16) + forward.x * ((Math.random() - 0.5) * 5);
    const vy = right.y * (34 + Math.random() * 26) + up.y * (18 + Math.random() * 16) + forward.y * ((Math.random() - 0.5) * 5);
    const vz = right.z * (34 + Math.random() * 26) + up.z * (18 + Math.random() * 16) + forward.z * ((Math.random() - 0.5) * 5);

    activeShells.push({
      mesh: shell,
      vel: new THREE.Vector3(vx, vy, vz),
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 20
      ),
      age: 0,
      life: 1.4 + Math.random() * 1.1
    });
  }
}

function applyShotRecoil(profile) {
  recoilPitchOffset = Math.max(-0.55, recoilPitchOffset - profile.recoilPitch * (0.9 + Math.random() * 0.25));
  recoilYawOffset += (Math.random() - 0.5) * profile.recoilYaw;
  recoilVisual = Math.min(0.75, recoilVisual + profile.weaponKick);
}

function fireBallisticShot(gunId) {
  const profile = gunBallistics[gunId] ?? gunBallistics.pistol;

  camera.getWorldQuaternion(_shotQuat);
  camera.getWorldDirection(_shotDir).normalize();
  _shotRight.set(1, 0, 0).applyQuaternion(_shotQuat).normalize();
  _shotUp.set(0, 1, 0).applyQuaternion(_shotQuat).normalize();
  camera.getWorldPosition(_shotOrigin);
  _shotOrigin
    .addScaledVector(_shotRight, profile.muzzleOffsetX)
    .addScaledVector(_shotUp, profile.muzzleOffsetY)
    .addScaledVector(_shotDir, profile.muzzleOffsetZ);

  for (let i = 0; i < (profile.pellets ?? 1); i++) {
    const sx = (Math.random() * 2 - 1) * profile.spread;
    const sy = (Math.random() * 2 - 1) * profile.spread;
    _spreadDir.copy(_shotDir)
      .addScaledVector(_shotRight, sx)
      .addScaledVector(_shotUp, sy)
      .normalize();
    spawnProjectile(_shotOrigin, _spreadDir, profile);
  }

  spawnMuzzleFlash(_shotOrigin, _shotDir, profile);
  spawnSmokeBurst(_shotOrigin, _shotDir, {
    count: profile.smokeCount,
    size: profile.smokeSize,
    life: profile.smokeLife,
    speed: 14,
    spread: 8
  });
  spawnShellEjection(_shotOrigin, _shotRight, _shotUp, _shotDir, profile);
  applyShotRecoil(profile);
}

function stepProjectiles(delta) {
  const innerR = MEGA_TOWER_RADIUS - MEGA_TOWER_WALL_HALF - 6;
  const outerR = MEGA_TOWER_RADIUS + MEGA_TOWER_WALL_HALF + 6;

  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i];
    p.age += delta;
    if (p.age >= p.life) {
      scene.remove(p.mesh);
      activeProjectiles.splice(i, 1);
      continue;
    }

    p.prevPos.copy(p.pos);
    p.vel.multiplyScalar(Math.exp(-p.drag * delta));
    p.vel.y -= p.gravity * delta;
    p.pos.addScaledVector(p.vel, delta);
    p.mesh.position.copy(p.pos);

    const chestHit = findChestHitOnSegment(p.prevPos, p.pos, p.hitRadius);
    if (chestHit) {
      openChestReward(chestHit);
      spawnImpactBurst(p.pos, 1.05);
      scene.remove(p.mesh);
      activeProjectiles.splice(i, 1);
      continue;
    }

    const enemyHitIndex = findEnemyHitOnSegment(p.prevPos, p.pos, p.hitRadius);
    if (enemyHitIndex >= 0) {
      damageEnemyAt(enemyHitIndex, 1);
      spawnImpactBurst(p.pos, 1.0);
      scene.remove(p.mesh);
      activeProjectiles.splice(i, 1);
      continue;
    }

    const inDoorGap = Math.abs(p.pos.x) <= (MEGA_TOWER_DOOR_WIDTH * 0.5) && p.pos.z > (MEGA_TOWER_RADIUS - 120);
    const r = Math.hypot(p.pos.x, p.pos.z);
    if (r > innerR && r < outerR && !inDoorGap) {
      spawnImpactBurst(p.pos, 0.95);
      scene.remove(p.mesh);
      activeProjectiles.splice(i, 1);
      continue;
    }

    const groundY = sampleGroundHeight(p.pos.x, p.pos.z, p.pos.y);
    if (p.pos.y <= groundY + 0.2) {
      _tmpV0.copy(p.pos);
      _tmpV0.y = groundY + 0.2;
      spawnImpactBurst(_tmpV0, 0.85);
      scene.remove(p.mesh);
      activeProjectiles.splice(i, 1);
      continue;
    }

    if (Math.abs(p.pos.x) > WORLD_LIMIT + 260 || Math.abs(p.pos.z) > WORLD_LIMIT + 260 || p.pos.y < -150 || p.pos.y > 8000) {
      scene.remove(p.mesh);
      activeProjectiles.splice(i, 1);
    }
  }
}

function stepMuzzleFlashes(delta) {
  for (let i = activeMuzzleFlashes.length - 1; i >= 0; i--) {
    const fx = activeMuzzleFlashes[i];
    fx.age += delta;
    const k = 1 - (fx.age / fx.life);
    if (k <= 0) {
      scene.remove(fx.mesh);
      fx.mesh.material.dispose();
      scene.remove(fx.light);
      activeMuzzleFlashes.splice(i, 1);
      continue;
    }
    fx.mesh.material.opacity = 0.92 * k;
    fx.mesh.scale.setScalar(fx.baseScale * (0.75 + 0.45 * k));
    fx.light.intensity = fx.baseLight * k;
  }
}

function stepSmokeBursts(delta) {
  for (let i = activeSmokeBursts.length - 1; i >= 0; i--) {
    const sm = activeSmokeBursts[i];
    sm.age += delta;
    const pAttr = sm.points.geometry.getAttribute('position');
    const p = pAttr.array;
    const v = sm.velocities;
    const dragMul = Math.exp(-sm.drag * delta);
    for (let j = 0; j < p.length; j += 3) {
      v[j + 0] *= dragMul;
      v[j + 1] = v[j + 1] * dragMul + sm.rise * delta;
      v[j + 2] *= dragMul;
      p[j + 0] += v[j + 0] * delta;
      p[j + 1] += v[j + 1] * delta;
      p[j + 2] += v[j + 2] * delta;
    }
    pAttr.needsUpdate = true;
    const k = 1 - (sm.age / sm.life);
    sm.points.material.opacity = Math.max(0, sm.baseOpacity * k);
    sm.points.material.size = sm.baseSize * (1 + (1 - k) * 1.2);
    if (sm.age >= sm.life) {
      scene.remove(sm.points);
      sm.points.geometry.dispose();
      sm.points.material.dispose();
      activeSmokeBursts.splice(i, 1);
    }
  }
}

function stepImpactBursts(delta) {
  for (let i = activeImpactBursts.length - 1; i >= 0; i--) {
    const burst = activeImpactBursts[i];
    burst.age += delta;
    const pAttr = burst.points.geometry.getAttribute('position');
    const p = pAttr.array;
    const v = burst.velocities;
    const dragMul = Math.exp(-burst.drag * delta);
    for (let j = 0; j < p.length; j += 3) {
      v[j + 0] *= dragMul;
      v[j + 1] = v[j + 1] * dragMul - burst.gravity * delta;
      v[j + 2] *= dragMul;
      p[j + 0] += v[j + 0] * delta;
      p[j + 1] += v[j + 1] * delta;
      p[j + 2] += v[j + 2] * delta;
    }
    pAttr.needsUpdate = true;
    const k = 1 - (burst.age / burst.life);
    burst.points.material.opacity = Math.max(0, burst.baseOpacity * k);
    if (burst.age >= burst.life) {
      scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
      activeImpactBursts.splice(i, 1);
    }
  }
}

function stepShells(delta) {
  for (let i = activeShells.length - 1; i >= 0; i--) {
    const shell = activeShells[i];
    shell.age += delta;
    shell.vel.y -= 76 * delta;
    shell.vel.multiplyScalar(Math.exp(-1.7 * delta));
    shell.mesh.position.addScaledVector(shell.vel, delta);
    shell.mesh.rotation.x += shell.spin.x * delta;
    shell.mesh.rotation.y += shell.spin.y * delta;
    shell.mesh.rotation.z += shell.spin.z * delta;
    shell.spin.multiplyScalar(Math.exp(-2.4 * delta));

    const groundY = sampleGroundHeight(shell.mesh.position.x, shell.mesh.position.z, shell.mesh.position.y);
    if (shell.mesh.position.y < groundY + 0.18) {
      shell.mesh.position.y = groundY + 0.18;
      if (Math.abs(shell.vel.y) > 1.8) {
        shell.vel.y *= -0.32;
        shell.vel.x *= 0.7;
        shell.vel.z *= 0.7;
      } else {
        shell.vel.set(0, 0, 0);
      }
    }

    if (shell.age >= shell.life) {
      scene.remove(shell.mesh);
      activeShells.splice(i, 1);
    }
  }
}

function stepViewRecoil(delta) {
  recoilVisual = dampScalar(recoilVisual, 0, 18, delta);
  recoilPitchOffset = dampScalar(recoilPitchOffset, 0, 12, delta);
  recoilYawOffset = dampScalar(recoilYawOffset, 0, 10, delta);

  const backKick = recoilVisual;
  const liftKick = recoilVisual * 0.26;
  leftArm.position.set(leftArmBasePos.x, leftArmBasePos.y + liftKick * 0.45, leftArmBasePos.z + backKick * 0.52);
  rightArm.position.set(rightArmBasePos.x, rightArmBasePos.y + liftKick * 0.45, rightArmBasePos.z + backKick * 0.52);
  leftArm.rotation.set(leftArmBaseRot.x + backKick * 0.2, leftArmBaseRot.y, leftArmBaseRot.z + backKick * 0.24);
  rightArm.rotation.set(rightArmBaseRot.x + backKick * 0.2, rightArmBaseRot.y, rightArmBaseRot.z - backKick * 0.24);

  if (heldWeapon) {
    heldWeapon.position.set(
      heldWeaponBasePos.x,
      heldWeaponBasePos.y + liftKick * 0.3,
      heldWeaponBasePos.z + backKick * 0.95
    );
    heldWeapon.rotation.set(
      heldWeaponBaseRot.x - backKick * 0.42,
      heldWeaponBaseRot.y + recoilYawOffset * 0.45,
      heldWeaponBaseRot.z
    );
  }

  if (!thirdPerson) {
    camera.rotation.order = 'YXZ';
    camera.rotation.x = THREE.MathUtils.clamp(pitch + recoilPitchOffset, -Math.PI / 2.3, Math.PI / 2.3);
    camera.rotation.y = recoilYawOffset;
  }
}

function stepScreenShake(delta) {
  if (screenShakeTime <= 0) {
    renderer.domElement.style.transform = '';
    return;
  }
  screenShakeTime = Math.max(0, screenShakeTime - delta);
  const fade = screenShakeTime / 0.16;
  const amount = screenShakeStrength * Math.max(0, Math.min(1, fade));
  const x = (Math.random() * 2 - 1) * amount;
  const y = (Math.random() * 2 - 1) * amount;
  renderer.domElement.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
  if (screenShakeTime <= 0) {
    screenShakeStrength = 0;
    renderer.domElement.style.transform = '';
  }
}

function tryShootOrOpenChest() {
  if (!isGameplayRunning()) return;
  if (isShopOpen()) return;
  if (isRespawningActive()) return;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  // chest first
  for (let hit of intersects) {
    let obj = hit.object;
    while (obj && !obj.userData.type) obj = obj.parent;
    if (!obj) continue;

    if (obj.userData.type === 'merchant') {
      if (hit.distance <= 260) {
        openShop();
        return;
      }
    }

    if (obj.userData.type === 'chest' && !obj.userData.opened) {
      openChestReward(obj);
      return;
    }
    break;
  }

  tryShootHeldWeapon();
}

function tryShootHeldWeapon() {
  if (!isGameplayRunning()) return;
  if (!isLocked) return;
  if (isShopOpen()) return;
  if (isSceneTransitionActive()) return;
  if (isRespawningActive()) return;
  if (shootCooldown > 0) return;

  const gun = inventory[selectedSlot];
  if (!gun.id || !itemTypes[gun.id]?.isGun) return;
  if (gun.ammo <= 0) {
    showReloadHint('Press R to reload');
    playGameSfx('empty');
    shootCooldown = 0.12;
    return;
  }

  const profile = gunBallistics[gun.id] ?? gunBallistics.pistol;
  shootCooldown = getShotCooldown() * profile.cooldownMul;
  gun.ammo -= 1;
  playGameSfx('shoot');
  fireBallisticShot(gun.id);
  updateHotbar();
}

// =====================
// MOVEMENT + INVISIBLE WALL + STAIR CLIMB
// =====================
const clock = new THREE.Clock();
const vel = new THREE.Vector3();

// Invisible wall at edge of grass (HARD STOP version you asked for)
const WORLD_LIMIT = (GRASS_AREA * 0.5) - 140;

// physics tuning
const GRAVITY = 60;
const JUMP_V = 22;
const WALK_SPEED = 200;
const SPRINT_SPEED = 520;
const GROUND_ACCEL = 820;
const AIR_ACCEL = 260;
const GROUND_FRICTION = 9.5;
const AIR_FRICTION = 1.25;
const SPRINT_BLEND_RATE = 6.5;
const JUMP_HOLD_TIME = 0.2;
const JUMP_HOLD_ACCEL = 50;
const JUMP_RELEASE_CUT = 0.5;
let sprintBlend = 0;
let jumpHoldTimer = 0;
let jumpHeldLastFrame = false;

function accelerateHorizontal(targetX, targetZ, accel, delta) {
  const dx = targetX - vel.x;
  const dz = targetZ - vel.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 1e-6) return;
  const maxStep = accel * delta;
  const t = Math.min(1, maxStep / dist);
  vel.x += dx * t;
  vel.z += dz * t;
}

function applyHorizontalFriction(friction, delta) {
  const decay = Math.exp(-friction * delta);
  vel.x *= decay;
  vel.z *= decay;
  if (Math.abs(vel.x) < 0.005) vel.x = 0;
  if (Math.abs(vel.z) < 0.005) vel.z = 0;
}

const PLAYER_MOUNTAIN_COLLIDER_RADIUS = 18;
function resolveSpawnMountainCollision() {
  if (spawnMountainColliders.length === 0) return;

  let collided = false;
  for (let pass = 0; pass < 3; pass++) {
    let adjusted = false;
    for (const c of spawnMountainColliders) {
      const minDist = c.radius + PLAYER_MOUNTAIN_COLLIDER_RADIUS;
      const dx = player.position.x - c.x;
      const dz = player.position.z - c.z;
      const distSq = dx * dx + dz * dz;
      if (distSq >= minDist * minDist) continue;

      const dist = Math.sqrt(distSq);
      let nx = 1;
      let nz = 0;
      if (dist > 1e-5) {
        nx = dx / dist;
        nz = dz / dist;
      } else {
        const fx = player.position.x - START_AREA_CENTER_X;
        const fz = player.position.z - START_AREA_CENTER_Z;
        const fl = Math.hypot(fx, fz);
        if (fl > 1e-5) {
          nx = fx / fl;
          nz = fz / fl;
        }
      }

      player.position.x = c.x + nx * minDist;
      player.position.z = c.z + nz * minDist;
      adjusted = true;
      collided = true;
    }
    if (!adjusted) break;
  }

  if (collided) {
    vel.x = 0;
    vel.z = 0;
  }
}

function stepMovement(delta) {
  const prevX = player.position.x;
  const prevZ = player.position.z;
  const jumpHeld = !!keys[' '];

  // Ground state before horizontal integration: used for traction/friction and jump start.
  const startGroundY = sampleGroundHeight(player.position.x, player.position.z, player.position.y);
  const groundedAtStart = player.position.y <= startGroundY + 0.05 && vel.y <= 0;
  if (groundedAtStart) {
    player.position.y = startGroundY;
    vel.y = 0;
  }

  let ix = 0, iz = 0;
  if (keys['a']) ix -= 1;
  if (keys['d']) ix += 1;
  if (keys['w']) iz += 1;
  if (keys['s']) iz -= 1;

  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  const fwdX = -sinYaw, fwdZ = -cosYaw;
  const rightX = cosYaw, rightZ = -sinYaw;
  let dirX = rightX * ix + fwdX * iz;
  let dirZ = rightZ * ix + fwdZ * iz;
  const dirLen = Math.hypot(dirX, dirZ);
  if (dirLen > 0) {
    dirX /= dirLen;
    dirZ /= dirLen;
  }

  const sprintTarget = (keys['shift'] && dirLen > 0) ? 1 : 0;
  const sprintAlpha = 1 - Math.exp(-SPRINT_BLEND_RATE * delta);
  sprintBlend += (sprintTarget - sprintBlend) * sprintAlpha;
  const speed = THREE.MathUtils.lerp(WALK_SPEED, SPRINT_SPEED, sprintBlend) * getMovementMultiplier();

  if (dirLen > 0) {
    const accel = groundedAtStart ? GROUND_ACCEL : AIR_ACCEL;
    accelerateHorizontal(dirX * speed, dirZ * speed, accel, delta);
  } else {
    applyHorizontalFriction(groundedAtStart ? GROUND_FRICTION : AIR_FRICTION, delta);
  }

  if (groundedAtStart && jumpHeld && !jumpHeldLastFrame) {
    vel.y = JUMP_V;
    jumpHoldTimer = JUMP_HOLD_TIME;
  }
  if (!jumpHeld && jumpHeldLastFrame && vel.y > 0) {
    vel.y *= JUMP_RELEASE_CUT;
    jumpHoldTimer = 0;
  }
  if (!groundedAtStart && jumpHeld && jumpHoldTimer > 0 && vel.y > 0) {
    vel.y += JUMP_HOLD_ACCEL * delta;
    jumpHoldTimer = Math.max(0, jumpHoldTimer - delta);
  }

  // move X/Z
  player.position.x += vel.x * delta;
  player.position.z += vel.z * delta;

  // HARD STOP invisible wall
  if (player.position.x > WORLD_LIMIT) { player.position.x = WORLD_LIMIT; vel.x = 0; }
  if (player.position.x < -WORLD_LIMIT) { player.position.x = -WORLD_LIMIT; vel.x = 0; }
  if (player.position.z > WORLD_LIMIT) { player.position.z = WORLD_LIMIT; vel.z = 0; }
  if (player.position.z < -WORLD_LIMIT) { player.position.z = -WORLD_LIMIT; vel.z = 0; }

  // Keep tower shell solid, with an opening at the front doorway.
  const inDoorGap = (x, z) => Math.abs(x) <= (MEGA_TOWER_DOOR_WIDTH * 0.5) && z > (MEGA_TOWER_RADIUS - 120);
  const innerR = MEGA_TOWER_RADIUS - MEGA_TOWER_WALL_HALF - 6;
  const outerR = MEGA_TOWER_RADIUS + MEGA_TOWER_WALL_HALF + 6;
  const currR = Math.hypot(player.position.x, player.position.z);
  const prevR = Math.hypot(prevX, prevZ);
  const inWallBand = currR > innerR && currR < outerR;
  if (inWallBand && !inDoorGap(player.position.x, player.position.z)) {
    const targetR = prevR <= MEGA_TOWER_RADIUS ? innerR : outerR;
    if (currR > 0.001) {
      const s = targetR / currR;
      player.position.x *= s;
      player.position.z *= s;
    }
  }
  resolveSpawnMountainCollision();

  // gravity
  vel.y -= GRAVITY * delta;
  player.position.y += vel.y * delta;

  // dynamic ground (stairs/platforms)
  const groundY = sampleGroundHeight(player.position.x, player.position.z, player.position.y);

  // snap to ground when falling
  if (player.position.y < groundY) {
    player.position.y = groundY;
    vel.y = 0;
  }
  jumpHeldLastFrame = jumpHeld;
}

// =====================
// MAIN LOOP
// =====================
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  const invOpen = document.getElementById('inventoryScreen').style.display === 'flex';
  const shopOpen = isShopOpen();
  const sceneTransitionActive = isSceneTransitionActive();
  const respawningActive = isRespawningActive();

  if (isGameplayRunning()) {
    if (playerHealth <= 0 && !respawningActive) beginRespawnSequence();
    updateRespawn(delta);

    if (!isRespawningActive()) lifeTimeSurvived += delta;
    if (!isRespawningActive()) updateClimbStats();
    stepWaveSystem(delta);
    if (isLocked && !invOpen && !shopOpen && !sceneTransitionActive && !isRespawningActive()) stepMovement(delta);
    shootCooldown -= delta;
    if (rightMouseAutoFire && isLocked && !invOpen && !shopOpen && !sceneTransitionActive && !isRespawningActive()) {
      tryShootHeldWeapon();
    }

    updateSceneTransition(delta);
    if (!isRespawningActive()) {
      stepEnemies(delta);
      stepEnemyProjectiles(delta);
    }
    orientEnemyHealthBars();
    stepCoinDrops(delta);
    stepExplosions(delta);
    stepProjectiles(delta);
    stepMuzzleFlashes(delta);
    stepSmokeBursts(delta);
    stepImpactBursts(delta);
    stepShells(delta);
    updateDayNight(delta);
    updateMerchantHint();
    updateCameraView(delta);
    stepViewRecoil(delta);
    stepScreenShake(delta);
  }

  const vis = !thirdPerson;
  leftArm.visible = vis;
  rightArm.visible = vis;
  avatar.visible = !vis;
  if (heldWeapon) heldWeapon.visible = vis;

  renderer.render(scene, camera);
}
animate();

// START UI
createHotbarUI();
updateHeldWeapon();
initTrashSlot();
updateDayNight(0);
refreshCoinHud();
refreshHealthHud();
loadDeadEnemyIds();
loadProgression();
bindSettingsUI();
initBackgroundMusic();
applyAudioSettingsToUI();
applyAudioSettings();
showHomePage('options');
setGameState(GAME_STATE.HOME);

const fireBtnEl = document.getElementById('buyFireRate');
const magBtnEl = document.getElementById('buyMag');
const closeBtnEl = document.getElementById('shopCloseBtn');
if (fireBtnEl) fireBtnEl.addEventListener('click', () => buyUpgrade('fireRate'));
if (magBtnEl) magBtnEl.addEventListener('click', () => buyUpgrade('mag'));
if (closeBtnEl) closeBtnEl.addEventListener('click', () => closeShop());
if (homePlayBtnEl) homePlayBtnEl.addEventListener('click', () => startGameFromHome());
document.addEventListener('click', ensureBackgroundMusicPlaybackAfterPlay, { passive: true });
document.addEventListener('pointerdown', ensureBackgroundMusicPlaybackAfterPlay, { passive: true });
document.addEventListener('touchstart', ensureBackgroundMusicPlaybackAfterPlay, { passive: true });
document.addEventListener('keydown', ensureBackgroundMusicPlaybackAfterPlay);
document.querySelectorAll('.homeTab').forEach(btn => {
  btn.addEventListener('click', () => showHomePage(btn.dataset.homePage));
});
if (pauseResumeBtnEl) pauseResumeBtnEl.addEventListener('click', () => resumeGame());
if (pauseSettingsBtnEl) pauseSettingsBtnEl.addEventListener('click', () => {
  const next = !(settingsPanelPauseEl && settingsPanelPauseEl.classList.contains('active'));
  setSettingsVisible(next, true);
});
if (pauseHomeBtnEl) pauseHomeBtnEl.addEventListener('click', () => quitToHome());
if (deathRespawnBtnEl) deathRespawnBtnEl.addEventListener('click', () => continueRespawnFromDeathScreen());

renderCursorStack();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
});
window.addEventListener('focus', () => {
  if (gameState === GAME_STATE.PLAYING && (backgroundMusicShouldPlay || backgroundMusicPendingGesture)) {
    ensureBackgroundMusicPlayback();
  }
});

