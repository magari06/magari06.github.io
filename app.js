/**
 * CYBER BEAT CRASH - MAIN APPLICATION ENTRY POINT (V3 - STABLE & COMPLETE)
 * Features:
 * - Central 3D Audio-Reactive Hologram Artifact (No physics bugs or wall collisions!)
 * - Full-length SoundCloud & open music streaming
 * - Rock-solid 60 FPS interactive & draggable playback scrubber
 * - Music-driven 3D cube floor and 4-wall volumetric equalizers
 * - 3D volumetric particles distributed throughout the entire cube volume
 */

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Scene & Entity State
    this.artifact = null;
    this.effects = null;
    this.currentColorTheme = 'cyan';
    this.cameraMode = 'orbit';

    // Scrubber interaction state
    this.isScrubbing = false;

    // Beat-cam state
    this.beatCamAngle = 0;
    this.beatCamDistance = 46;

    this.init();
  }

  init() {
    this.initThree();
    this.initEffects();
    this.initArtifact();
    this.bindEvents();
    this.bindUI();
    this.bindScrubber();

    // Start render loop
    this.animate();

    console.log("Cyber Beat Crash V3 initialized successfully.");
  }

  // =========================================================================
  // THREE.JS INITIALIZATION
  // =========================================================================
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070913);
    this.scene.fog = new THREE.FogExp2(0x070913, 0.012);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 12, 48);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 85;
      this.controls.minDistance = 8;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
      this.controls.target.set(0, 4, 0);
    } else {
      this.initFallbackControls();
    }

    const ambientLight = new THREE.AmbientLight(0x1a243b, 1.8);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight1.position.set(20, 40, 30);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 1.1);
    dirLight2.position.set(-25, 20, -20);
    this.scene.add(dirLight2);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initFallbackControls() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let theta = 0, phi = Math.PI / 4, radius = 50;

    const updateCam = () => {
      this.camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      this.camera.position.y = radius * Math.cos(phi) + 4;
      this.camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      this.camera.lookAt(0, 4, 0);
    };

    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'CANVAS') {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      theta -= dx * 0.006;
      phi = Math.max(0.1, Math.min(Math.PI / 2 + 0.1, phi - dy * 0.006));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCam();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('wheel', (e) => {
      radius = Math.max(10, Math.min(80, radius + e.deltaY * 0.05));
      updateCam();
    }, { passive: true });

    updateCam();
  }

  initEffects() {
    this.effects = new window.EffectsManager(this.scene, this.camera);
  }

  initArtifact() {
    this.artifact = new window.CoreArtifact(this.scene);
  }

  // =========================================================================
  // EVENT WIRING & AUDIO HOOKS
  // =========================================================================
  bindEvents() {
    window.audioEngine.onBeat((beat) => {
      this.pulseBeatUI(beat);

      if (this.cameraMode === 'beatcam' && beat.intensity > 0.8) {
        this.beatCamAngle += (Math.PI / 4) * (Math.random() > 0.5 ? 1 : -1);
      }
    });

    window.audioEngine.onStateChange((state) => {
      this.updatePlayerUI(state);
    });
  }

  showImpactToast(msg) {
    const toast = document.getElementById('impact-toast');
    if (!toast) return;

    toast.innerText = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  pulseBeatUI(beat) {
    const beatRing = document.getElementById('beat-ring');
    const beatBpm = document.getElementById('beat-bpm-val');
    if (beatRing) {
      beatRing.classList.add('pulse');
      setTimeout(() => beatRing.classList.remove('pulse'), 90);
    }
    if (beatBpm && beat.bpm) {
      beatBpm.innerText = beat.bpm;
    }
  }

  // =========================================================================
  // FULLY INTERACTIVE & DRAGGABLE PLAYBACK SCRUBBER
  // =========================================================================
  bindScrubber() {
    const scrubberTrack = document.getElementById('scrubber-track');

    const handleSeekAtEvent = (e) => {
      const rect = scrubberTrack.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      document.getElementById('scrubber-fill').style.width = `${fraction * 100}%`;

      const audioEl = window.audioEngine.audioElement;
      let dur = 180;
      if (audioEl && isFinite(audioEl.duration) && audioEl.duration > 0) {
        dur = audioEl.duration;
      }
      document.getElementById('time-current').innerText = this.formatTime(fraction * dur);
      window.audioEngine.seek(fraction);
    };

    scrubberTrack.addEventListener('mousedown', (e) => {
      this.isScrubbing = true;
      handleSeekAtEvent(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isScrubbing) {
        handleSeekAtEvent(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isScrubbing = false;
    });
  }

  // =========================================================================
  // UI BINDINGS & USER INTERACTION
  // =========================================================================
  bindUI() {
    const playPauseBtn = document.getElementById('btn-play-pause');
    const playIcon = document.getElementById('icon-play');
    const pauseIcon = document.getElementById('icon-pause');

    // 1. Play / Pause
    playPauseBtn.addEventListener('click', () => {
      const isPlaying = window.audioEngine.togglePlayPause();
      if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    });

    // 2. Track Presets Select
    const presetSelect = document.getElementById('select-preset');
    presetSelect.addEventListener('change', (e) => {
      const index = parseInt(e.target.value, 10);
      window.audioEngine.playSynthPreset(index);
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    });

    // 3. Audio File Upload Button & Drag-and-drop
    const fileInput = document.getElementById('audio-file-input');
    const btnUpload = document.getElementById('btn-upload-file');
    const dropZone = document.getElementById('drag-drop-zone');

    btnUpload.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        window.audioEngine.loadUserFile(e.target.files[0]);
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      }
    });

    // Drag-and-drop handler for files AND SoundCloud/Spotify links
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.clientX <= 0 || e.clientY <= 0) {
        dropZone.classList.remove('active');
      }
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        window.audioEngine.loadUserFile(file);
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        return;
      }

      const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
      if (text && text.trim().length > 0) {
        this.showImpactToast("🔍 Распознаем трек из SoundCloud / ссылки...");
        const ok = await window.audioEngine.resolveUrlAndPlay(text.trim());
        if (ok) {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
        } else {
          alert("Не удалось загрузить аудио по ссылке. Попробуйте поиск через кнопку «Поиск музыки»!");
        }
      }
    });

    // Clipboard Paste (Ctrl+V) listener
    window.addEventListener('paste', async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (text && text.trim().length > 0) {
        this.showImpactToast("🔍 Загружаем песню из буфера обмена...");
        const ok = await window.audioEngine.resolveUrlAndPlay(text.trim());
        if (ok) {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
        }
      }
    });

    // 4. Online Music Search Modal (SoundCloud & Full Tracks)
    const btnSearchMusic = document.getElementById('btn-search-music');
    const modalSearch = document.getElementById('modal-search');
    const closeSearch = document.getElementById('close-search');
    const searchInput = document.getElementById('search-query-input');
    const btnDoSearch = document.getElementById('btn-do-search');
    const searchResultsList = document.getElementById('search-results-list');

    const openSearchModal = () => {
      modalSearch.classList.add('open');
      setTimeout(() => searchInput.focus(), 100);
      if (searchResultsList.children.length <= 1) {
        this.executeSearch("Phonk");
      }
    };

    btnSearchMusic.addEventListener('click', openSearchModal);
    closeSearch.addEventListener('click', () => modalSearch.classList.remove('open'));
    modalSearch.addEventListener('click', (e) => {
      if (e.target === modalSearch) modalSearch.classList.remove('open');
    });

    const runSearchFn = () => {
      const q = searchInput.value.trim();
      if (q) this.executeSearch(q);
    };

    btnDoSearch.addEventListener('click', runSearchFn);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSearchFn();
    });

    document.querySelectorAll('.search-tag').forEach(tagBtn => {
      tagBtn.addEventListener('click', () => {
        const tag = tagBtn.dataset.tag;
        searchInput.value = tag;
        this.executeSearch(tag);
      });
    });

    // 5. Microphone Input Toggle & Sensitivity Slider
    const btnMic = document.getElementById('btn-toggle-mic');
    btnMic.addEventListener('click', async () => {
      const isActive = await window.audioEngine.toggleMicrophone();
      btnMic.classList.toggle('active', isActive);
    });

    const sliderMicSens = document.getElementById('slider-mic-sens');
    const valMicSens = document.getElementById('val-mic-sens');
    sliderMicSens.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.audioEngine.setMicSensitivity(val);
      valMicSens.innerText = `x${val.toFixed(1)}`;
    });

    // 6. Floor & Wall Audio Reactivity Sensitivity Slider
    const sliderFloorReact = document.getElementById('slider-floor-react');
    const valFloorReact = document.getElementById('val-floor-react');
    sliderFloorReact.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.effects.floorReactivity = val;
      valFloorReact.innerText = `${val.toFixed(1)}x`;
    });

    // 7. Volume Slider
    const volumeSlider = document.getElementById('slider-volume');
    volumeSlider.addEventListener('input', (e) => {
      window.audioEngine.setVolume(parseFloat(e.target.value));
    });

    // 8. Side Panel Controls & Toggles
    const sidePanel = document.getElementById('side-panel');
    const toggleSidePanel = document.getElementById('toggle-side-panel');
    const closeSidePanel = document.getElementById('close-side-panel');

    const togglePanelFn = () => sidePanel.classList.toggle('collapsed');
    toggleSidePanel.addEventListener('click', togglePanelFn);
    closeSidePanel.addEventListener('click', togglePanelFn);

    // 9. Beat Blast Trigger Button
    const btnSuperSmash = document.getElementById('btn-super-smash');
    btnSuperSmash.addEventListener('click', () => {
      this.effects.triggerCameraShake(1.2);
      this.effects.spawnFloorRipple(2.5);
      this.showImpactToast("⚡ СВЕТОВАЯ ВОЛНА РИТМА!");
    });

    // 10. Center Artifact Style Selector
    const artifactBtns = document.querySelectorAll('[data-artifact]');
    artifactBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        artifactBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.artifact.setStyle(btn.dataset.artifact);
      });
    });

    // 11. Volumetric Particles Density Selector
    const particleBtns = document.querySelectorAll('[data-particles]');
    particleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        particleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const count = parseInt(btn.dataset.particles, 10);
        this.effects.initVolumetricParticles(count);
      });
    });

    // 12. Theme Palette Selector
    const selectTheme = document.getElementById('select-theme');
    selectTheme.addEventListener('change', (e) => {
      const theme = e.target.value;
      this.currentColorTheme = theme;
      document.body.setAttribute('data-theme', theme);
      this.effects.setTheme(theme);
      this.artifact.setTheme(theme);
    });

    // 13. Camera Mode Selector
    const cameraBtns = document.querySelectorAll('[data-cam]');
    cameraBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        cameraBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cameraMode = btn.dataset.cam;
        if (this.controls) {
          this.controls.enabled = (this.cameraMode === 'orbit');
        }
      });
    });

    // 14. Fullscreen Button
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    // 15. Shortcuts Modal
    const btnHelp = document.getElementById('btn-help');
    const modalHelp = document.getElementById('modal-help');
    const closeHelp = document.getElementById('close-help');

    btnHelp.addEventListener('click', () => modalHelp.classList.add('open'));
    closeHelp.addEventListener('click', () => modalHelp.classList.remove('open'));
    modalHelp.addEventListener('click', (e) => {
      if (e.target === modalHelp) modalHelp.classList.remove('open');
    });

    // 16. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playPauseBtn.click();
          break;
        case 'KeyS':
          openSearchModal();
          break;
        case 'KeyB':
          btnSuperSmash.click();
          break;
        case 'KeyM':
          btnMic.click();
          break;
        case 'KeyH':
          document.getElementById('hud-overlay').classList.toggle('hidden');
          break;
        case 'KeyF':
          btnFullscreen.click();
          break;
        case 'Digit1':
          document.querySelector('[data-artifact="pulsar"]').click();
          break;
        case 'Digit2':
          document.querySelector('[data-artifact="monolith"]').click();
          break;
        case 'Digit3':
          document.querySelector('[data-artifact="reactor"]').click();
          break;
        case 'Digit4':
          document.querySelector('[data-artifact="vortex"]').click();
          break;
      }
    });
  }

  // =========================================================================
  // ONLINE MUSIC SEARCH (SOUNDCLOUD & FULL TRACKS)
  // =========================================================================
  async executeSearch(query) {
    const container = document.getElementById('search-results-list');
    container.innerHTML = `<div class="search-placeholder-msg">🔍 Поиск полных треков: «${query}»...</div>`;

    if (query.startsWith('http://') || query.startsWith('https://') || query.startsWith('soundcloud:')) {
      container.innerHTML = `<div class="search-placeholder-msg">⏳ Распознаем ссылку SoundCloud / трек...</div>`;
      const ok = await window.audioEngine.resolveUrlAndPlay(query);
      if (ok) {
        document.getElementById('modal-search').classList.remove('open');
        document.getElementById('icon-play').style.display = 'none';
        document.getElementById('icon-pause').style.display = 'block';
        return;
      }
    }

    const tracks = await window.audioEngine.searchTracks(query);
    if (!tracks || tracks.length === 0) {
      container.innerHTML = `<div class="search-placeholder-msg">Ничего не найдено по запросу «${query}». Попробуйте ввести другого исполнителя или песню!</div>`;
      return;
    }

    container.innerHTML = '';
    tracks.forEach(track => {
      const card = document.createElement('div');
      card.className = 'track-result-card';
      const durStr = this.formatTime(track.duration || 180);
      const badge = track.isFull ? `<span style="font-size:0.65rem; background:rgba(0,255,102,0.15); color:#00ff66; padding:2px 6px; border-radius:4px; border:1px solid rgba(0,255,102,0.3); margin-left:6px;">Полный трек (${durStr})</span>` : `<span style="font-size:0.65rem; color:#8899b7; margin-left:6px;">(${durStr})</span>`;

      card.innerHTML = `
        <div class="track-result-left">
          <img class="track-cover-thumb" src="${track.coverUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎵</text></svg>'}" alt="Art">
          <div class="track-result-info">
            <div class="track-result-title">${track.title} ${badge}</div>
            <div class="track-result-artist">${track.artist}</div>
          </div>
        </div>
        <button class="track-result-play-btn">
          <span>▶</span> Включить
        </button>
      `;

      card.querySelector('.track-result-play-btn').addEventListener('click', () => {
        window.audioEngine.playStreamingTrack(track);
        document.getElementById('modal-search').classList.remove('open');
        document.getElementById('icon-play').style.display = 'none';
        document.getElementById('icon-pause').style.display = 'block';
        this.showImpactToast(`▶ ${track.title} (${track.artist})`);
      });

      container.appendChild(card);
    });
  }

  // Update UI Player Details
  updatePlayerUI(state) {
    if (state.title) {
      document.getElementById('track-title').innerText = state.title;
    }
    if (state.artist) {
      document.getElementById('track-artist').innerText = state.artist;
    }

    const coverImg = document.getElementById('track-cover-img');
    const artIcon = document.getElementById('track-art-icon');
    if (state.coverUrl) {
      coverImg.src = state.coverUrl;
      coverImg.style.display = 'block';
      artIcon.style.display = 'none';
    } else {
      coverImg.style.display = 'none';
      artIcon.style.display = 'inline';
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // =========================================================================
  // MAIN ANIMATION & RENDER LOOP (60 FPS SCRUBBER & DYNAMICS)
  // =========================================================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // 1. Audio analysis
    const audioData = window.audioEngine.update();

    // 2. Continuous 60 FPS Scrubber Update
    if (!this.isScrubbing) {
      const audioEl = window.audioEngine.audioElement;
      let cur = 0, dur = 0;

      if (window.audioEngine.currentMode === 'synth') {
        cur = window.audioEngine.synthVirtualTime;
        dur = 180;
      } else if (audioEl && isFinite(audioEl.duration) && audioEl.duration > 0) {
        cur = audioEl.currentTime || 0;
        dur = audioEl.duration;
      }

      if (dur > 0) {
        const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
        document.getElementById('scrubber-fill').style.width = `${pct}%`;
        document.getElementById('time-current').innerText = this.formatTime(cur);
        document.getElementById('time-total').innerText = this.formatTime(dur);
      }
    }

    // 3. Update Central Hologram Artifact
    if (this.artifact) {
      this.artifact.update(delta, audioData);
    }

    // 4. Update 3D Music-Driven Cube Floor & Volumetric Equalizers
    if (this.effects) {
      this.effects.update(delta, audioData);
    }

    // 5. Update Camera
    this.updateCamera(delta);

    // 6. Update HUD Energy bar
    const energyBar = document.getElementById('energy-bar-fill');
    if (energyBar) {
      const pct = Math.min(100, Math.round(audioData.bands.energy * 180));
      energyBar.style.width = `${pct}%`;
    }

    // 7. Render scene
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(delta) {
    if (this.cameraMode === 'orbit') {
      if (this.controls) this.controls.update();
    } else if (this.cameraMode === 'beatcam') {
      this.beatCamAngle += delta * 0.45;
      const x = Math.sin(this.beatCamAngle) * this.beatCamDistance;
      const z = Math.cos(this.beatCamAngle) * this.beatCamDistance;
      const y = 14 + Math.sin(performance.now() * 0.001) * 6;

      this.camera.position.lerp(new THREE.Vector3(x, y, z), 4 * delta);
      this.camera.lookAt(0, 4, 0);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
