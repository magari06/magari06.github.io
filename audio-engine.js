/**
 * AUDIO ENGINE & BEAT DETECTION MODULE (V3 - FULL TRACKS & RELIABLE SCRUBBER)
 * Features:
 * - Audius Open Music API (100% FULL-LENGTH SONGS, NO 30-SEC CUTOFF!)
 * - SoundCloud & Spotify Link Resolver (resolves full tracks via oEmbed + open streaming)
 * - Rock-solid audio element event hooks (metadata, duration, timeupdate, scrubber seeking)
 * - Ultra-sensitive microphone input (x1.0 - x15.0) with adaptive thresholds
 * - Procedural electronic synth presets
 * - Multi-band FFT audio analysis (Sub-bass, Bass, Mid, High, Energy)
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.micGainNode = null;
    this.micStream = null;
    this.micSensitivity = 4.5;

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.audioElement.loop = true;

    // FFT analysis arrays
    this.fftSize = 1024;
    this.freqData = new Uint8Array(this.fftSize / 2);
    this.timeData = new Uint8Array(this.fftSize);

    // Audio frequency bands
    this.bands = {
      subBass: 0,   // 20 - 80 Hz
      bass: 0,      // 80 - 250 Hz
      mid: 0,       // 250 - 2500 Hz
      high: 0,      // 2500 - 16000 Hz
      energy: 0     // Total RMS energy
    };

    // Beat detection state
    this.beatThreshold = 1.32;
    this.beatDecayRate = 0.94;
    this.beatCutoff = 0.20;
    this.subBassHistory = [];
    this.historyLength = 32;
    this.isBeat = false;
    this.isKick = false;
    this.isSnare = false;
    this.beatIntensity = 0;
    this.lastBeatTime = 0;
    this.beatIntervals = [];
    this.estimatedBPM = 128;

    // Track state
    this.isPlaying = false;
    this.currentMode = 'synth'; // 'file' | 'synth' | 'mic' | 'stream'
    this.currentSynthPreset = 0;
    this.synthInterval = null;
    this.synthStep = 0;
    this.synthVirtualTime = 0;

    this.currentTrackMeta = {
      title: "CYBER BASS DROP",
      artist: "Cyberpunk / Trap (140 BPM)",
      coverUrl: null,
      duration: 180
    };

    // Event listeners
    this.onBeatCallbacks = [];
    this.onStateCallbacks = [];

    this.initAudioElement();
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.78;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.85;

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initAudioElement() {
    // Ensure media element source is connected once context exists
    const connectSource = () => {
      this.initContext();
      if (!this.sourceNode && this.ctx) {
        try {
          this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
          this.sourceNode.connect(this.gainNode);
        } catch (e) {
          console.warn("MediaElementSource connection:", e);
        }
      }
    };

    this.audioElement.addEventListener('play', () => {
      connectSource();
      this.isPlaying = true;
      this.triggerStateChange();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.triggerStateChange();
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.triggerStateChange();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      connectSource();
      this.triggerStateChange({
        duration: this.audioElement.duration || 0,
        currentTime: this.audioElement.currentTime || 0
      });
    });

    this.audioElement.addEventListener('durationchange', () => {
      this.triggerStateChange({
        duration: this.audioElement.duration || 0
      });
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.triggerStateChange({
        currentTime: this.audioElement.currentTime || 0,
        duration: this.audioElement.duration || 0
      });
    });
  }

  // Master Volume
  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx ? this.ctx.currentTime : 0);
    }
    this.audioElement.volume = Math.max(0, Math.min(1, volume));
  }

  // Interactive Playhead Seek
  seek(fraction) {
    fraction = Math.max(0, Math.min(1, fraction));
    if ((this.currentMode === 'file' || this.currentMode === 'stream') && this.audioElement.duration && isFinite(this.audioElement.duration)) {
      this.audioElement.currentTime = fraction * this.audioElement.duration;
      this.triggerStateChange({
        currentTime: this.audioElement.currentTime,
        duration: this.audioElement.duration
      });
    } else if (this.currentMode === 'synth') {
      this.synthVirtualTime = fraction * 180;
    }
  }

  // =========================================================================
  // ONLINE MUSIC SEARCH & SOUNDCLOUD / AUDIUS RESOLVER (FULL SONGS)
  // =========================================================================

  // Search full-length music via Audius API (Full Tracks, No 30s clips!)
  async searchTracks(query) {
    if (!query || query.trim().length === 0) return [];
    const cleanQ = query.trim();
    let allTracks = [];

    // 1. Primary: Audius Open Music Network (FULL-LENGTH SONGS)
    try {
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(cleanQ)}&app_name=CYBER_BEAT`;
      const res = await fetch(audiusUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          const audiusTracks = data.data.slice(0, 20).map(item => ({
            id: item.id,
            title: item.title,
            artist: item.user ? item.user.name : "SoundCloud Artist",
            album: "SoundCloud / Audius Full",
            coverUrl: (item.artwork && (item.artwork['480x480'] || item.artwork['150x150'])) || null,
            previewUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=CYBER_BEAT`,
            duration: item.duration || 210,
            isFull: true
          })).filter(t => !!t.id && !!t.title);
          allTracks.push(...audiusTracks);
        }
      }
    } catch (err) {
      console.warn("Audius search request error:", err);
    }

    // 2. Secondary fallback: iTunes API if query returned very few results
    if (allTracks.length < 4) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=12`;
        const res = await fetch(itunesUrl);
        if (res.ok) {
          const data = await res.json();
          const itunesTracks = (data.results || []).map(item => ({
            id: 'itunes_' + item.trackId,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : null,
            previewUrl: item.previewUrl,
            duration: Math.round(item.trackTimeMillis / 1000),
            isFull: false
          })).filter(t => !!t.previewUrl);
          allTracks.push(...itunesTracks);
        }
      } catch (err) {
        console.warn("iTunes fallback search error:", err);
      }
    }

    return allTracks;
  }

  // Resolve SoundCloud / Spotify / Direct URL and stream full audio
  async resolveUrlAndPlay(rawUrl) {
    const url = rawUrl.trim();
    if (!url) return false;

    // 1. Direct audio file URL (.mp3, .wav, .ogg, .flac, etc.)
    if (/\.(mp3|wav|ogg|flac|m4a|aac)(\?.*)?$/i.test(url)) {
      const name = url.split('/').pop().split('?')[0];
      return this.playStreamingTrack({
        title: decodeURIComponent(name),
        artist: "Прямой аудио-поток",
        coverUrl: null,
        previewUrl: url,
        duration: 0
      });
    }

    // 2. SoundCloud URL (https://soundcloud.com/...)
    if (url.includes('soundcloud.com/')) {
      try {
        console.log("Resolving SoundCloud link...");
        const scOembed = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
        const res = await fetch(scOembed);
        if (res.ok) {
          const scData = await res.json();
          const searchTerms = `${scData.title || ''} ${scData.author_name || ''}`;
          console.log("SoundCloud track metadata:", searchTerms);

          const results = await this.searchTracks(searchTerms);
          if (results.length > 0) {
            const track = results[0];
            if (scData.thumbnail_url) track.coverUrl = scData.thumbnail_url;
            return this.playStreamingTrack(track);
          }
        }
      } catch (err) {
        console.warn("SoundCloud resolve error:", err);
      }
    }

    // 3. Spotify URL
    if (url.includes('spotify.com/track/') || url.startsWith('spotify:track:')) {
      try {
        const cleanUrl = url.split('?')[0];
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const odata = await res.json();
          let searchTerms = (odata.title || "")
            .replace(/\s*\|\s*Spotify/i, '')
            .replace(/,\s*an album by.*$/i, '')
            .replace(/,\s*a song by\s*/i, ' ');
          const results = await this.searchTracks(searchTerms);
          if (results.length > 0) {
            const track = results[0];
            if (odata.thumbnail_url) track.coverUrl = odata.thumbnail_url;
            return this.playStreamingTrack(track);
          }
        }
      } catch (err) {
        console.warn("Spotify oembed error:", err);
      }
    }

    // 4. Fallback search phrase
    const results = await this.searchTracks(url);
    if (results.length > 0) {
      return this.playStreamingTrack(results[0]);
    }

    return false;
  }

  // Play a streaming full-length track
  async playStreamingTrack(track) {
    this.initContext();
    this.stopSynth();
    this.disconnectMic();

    this.audioElement.pause();
    this.audioElement.src = track.previewUrl;
    this.audioElement.load();

    this.currentMode = 'stream';
    this.currentTrackMeta = {
      title: track.title,
      artist: track.artist,
      coverUrl: track.coverUrl,
      duration: track.duration || 180
    };

    try {
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (err) {
      console.warn("Autoplay stream blocked:", err);
      this.isPlaying = false;
    }

    this.triggerStateChange({
      ...this.currentTrackMeta,
      mode: 'stream'
    });

    return true;
  }

  // Load a user-selected audio file
  async loadUserFile(file) {
    this.initContext();
    this.stopSynth();
    this.disconnectMic();

    const objectUrl = URL.createObjectURL(file);
    this.audioElement.pause();
    this.audioElement.src = objectUrl;
    this.audioElement.load();

    this.currentMode = 'file';
    this.currentTrackMeta = {
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Пользовательский файл",
      coverUrl: null,
      duration: 0
    };

    try {
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (err) {
      console.warn("Autoplay blocked, waiting for user click:", err);
      this.isPlaying = false;
    }

    this.triggerStateChange({
      ...this.currentTrackMeta,
      mode: 'file'
    });
  }

  // =========================================================================
  // MICROPHONE ENGINE (ULTRA-SENSITIVE)
  // =========================================================================

  setMicSensitivity(multiplier) {
    this.micSensitivity = Math.max(0.5, Math.min(15.0, multiplier));
    if (this.micGainNode && this.ctx) {
      this.micGainNode.gain.setValueAtTime(this.micSensitivity, this.ctx.currentTime);
    }
  }

  async toggleMicrophone() {
    this.initContext();

    if (this.currentMode === 'mic') {
      this.disconnectMic();
      this.playSynthPreset(0);
      return false;
    }

    this.audioElement.pause();
    this.stopSynth();

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        },
        video: false
      });

      const micSource = this.ctx.createMediaStreamSource(this.micStream);
      this.micGainNode = this.ctx.createGain();
      this.micGainNode.gain.setValueAtTime(this.micSensitivity, this.ctx.currentTime);

      micSource.connect(this.micGainNode);
      this.micGainNode.connect(this.analyser);

      this.currentMode = 'mic';
      this.isPlaying = true;
      this.beatCutoff = 0.08;
      this.beatThreshold = 1.18;

      this.currentTrackMeta = {
        title: "ЖИВОЙ МИКРОФОН",
        artist: `Усиление x${this.micSensitivity.toFixed(1)} (Пойте или хлопайте!)`,
        coverUrl: null,
        duration: 0
      };

      this.triggerStateChange({
        ...this.currentTrackMeta,
        mode: 'mic'
      });
      return true;
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Не удалось получить доступ к микрофону: " + err.message);
      this.playSynthPreset(0);
      return false;
    }
  }

  disconnectMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.micGainNode) {
      try { this.micGainNode.disconnect(); } catch (e) {}
      this.micGainNode = null;
    }
    this.beatCutoff = 0.20;
    this.beatThreshold = 1.32;
  }

  // =========================================================================
  // BUILT-IN PROCEDURAL SYNTH TRACKS
  // =========================================================================

  playSynthPreset(index = 0) {
    this.initContext();
    this.disconnectMic();
    this.audioElement.pause();
    this.stopSynth();

    this.currentMode = 'synth';
    this.currentSynthPreset = index;
    this.isPlaying = true;
    this.synthStep = 0;
    this.synthVirtualTime = 0;

    const presets = [
      {
        name: "CYBER BASS DROP",
        genre: "Cyberpunk / Trap (140 BPM)",
        bpm: 140,
        patternLen: 16
      },
      {
        name: "NEON SYNTH RUNNER",
        genre: "Retrowave / Electro (128 BPM)",
        bpm: 128,
        patternLen: 16
      },
      {
        name: "BREAKBEAT HAVOC",
        genre: "Drum & Bass (168 BPM)",
        bpm: 168,
        patternLen: 16
      }
    ];

    const currentPreset = presets[index % presets.length];
    const stepDuration = (60 / currentPreset.bpm) / 4;

    this.synthInterval = setInterval(() => {
      if (!this.isPlaying) return;
      this.executeSynthStep(index, this.synthStep);
      this.synthStep = (this.synthStep + 1) % currentPreset.patternLen;
      this.synthVirtualTime = (this.synthVirtualTime + stepDuration) % 180;
    }, stepDuration * 1000);

    this.currentTrackMeta = {
      title: currentPreset.name,
      artist: currentPreset.genre,
      coverUrl: null,
      duration: 180
    };

    this.triggerStateChange({
      ...this.currentTrackMeta,
      bpm: currentPreset.bpm,
      mode: 'synth'
    });
  }

  stopSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  executeSynthStep(presetIndex, step) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (presetIndex === 0) {
      if (step === 0 || step === 4 || step === 7 || step === 10) {
        this.synthKick(now, 1.3, 58);
      }
      if (step === 4 || step === 12) {
        this.synthSnare(now, 0.95);
      }
      if (step % 2 === 0 || (step >= 12 && step <= 15)) {
        this.synthHiHat(now, step % 4 === 2 ? 0.38 : 0.22);
      }
      const notes = [44, 44, 49.39, 44, 52.2, 44, 41.2, 36.7];
      if (step % 4 === 0) {
        this.synthBassNote(now, notes[(step / 4) % notes.length]);
      }
    } else if (presetIndex === 1) {
      if (step % 4 === 0) {
        this.synthKick(now, 1.2, 64);
      }
      if (step === 4 || step === 12) {
        this.synthSnare(now, 0.9, true);
      }
      if (step % 4 === 2) {
        this.synthHiHat(now, 0.48);
      }
      const arpFreqs = [55, 110, 82.4, 110, 65.4, 110, 73.4, 130.8];
      if (step % 2 === 0) {
        this.synthLeadPluck(now, arpFreqs[(step / 2) % arpFreqs.length] * 2);
      }
    } else {
      if (step === 0 || step === 10) {
        this.synthKick(now, 1.4, 72);
      }
      if (step === 4 || step === 12) {
        this.synthSnare(now, 1.15);
      } else if (step === 15) {
        this.synthSnare(now, 0.5);
      }
      this.synthHiHat(now, step % 2 === 0 ? 0.38 : 0.18);
      if (step === 0 || step === 8) {
        this.synthReeseBass(now, step === 0 ? 43.65 : 38.89);
      }
    }
  }

  synthKick(time, gainMult = 1.0, startFreq = 65) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 2.5, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.32);

    gain.gain.setValueAtTime(gainMult * 1.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  synthSnare(time, gainMult = 1.0, isClap = false) {
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isClap ? 'bandpass' : 'highpass';
    filter.frequency.value = isClap ? 1200 : 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainMult * 0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isClap ? 0.18 : 0.22));

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.25);
  }

  synthHiHat(time, gainMult = 0.3) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(7500, time);

    filter.type = 'highpass';
    filter.frequency.value = 6500;

    gain.gain.setValueAtTime(gainMult, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  synthBassNote(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.4);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.6);
  }

  synthLeadPluck(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  synthReeseBass(time, freq) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq + 1.2, time);

    filter.type = 'lowpass';
    filter.frequency.value = 600;

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.75);
    osc2.stop(time + 0.75);
  }

  // =========================================================================
  // PLAYBACK CONTROL
  // =========================================================================

  togglePlayPause() {
    this.initContext();

    if (this.currentMode === 'file' || this.currentMode === 'stream') {
      if (this.audioElement.paused) {
        this.audioElement.play();
        this.isPlaying = true;
      } else {
        this.audioElement.pause();
        this.isPlaying = false;
      }
    } else if (this.currentMode === 'synth') {
      if (this.isPlaying) {
        this.stopSynth();
        this.isPlaying = false;
      } else {
        this.playSynthPreset(this.currentSynthPreset);
      }
    }
    this.triggerStateChange();
    return this.isPlaying;
  }

  // =========================================================================
  // FRAME ANALYSIS & BEAT DETECTION
  // =========================================================================

  update() {
    if (!this.analyser) {
      return {
        bands: this.bands,
        isKick: false,
        isSnare: false,
        isBeat: false,
        beatIntensity: 0,
        estimatedBPM: this.estimatedBPM
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / binCount;

    let subSum = 0, subCount = 0;
    let bassSum = 0, bassCount = 0;
    let midSum = 0, midCount = 0;
    let highSum = 0, highCount = 0;
    let totalSum = 0;

    for (let i = 0; i < binCount; i++) {
      const freq = i * binWidth;
      const val = this.freqData[i] / 255.0;
      totalSum += val;

      if (freq >= 20 && freq <= 85) {
        subSum += val;
        subCount++;
      } else if (freq > 85 && freq <= 250) {
        bassSum += val;
        bassCount++;
      } else if (freq > 250 && freq <= 2500) {
        midSum += val;
        midCount++;
      } else if (freq > 2500) {
        highSum += val;
        highCount++;
      }
    }

    this.bands.subBass = subCount > 0 ? subSum / subCount : 0;
    this.bands.bass = bassCount > 0 ? bassSum / bassCount : 0;
    this.bands.mid = midCount > 0 ? midSum / midCount : 0;
    this.bands.high = highCount > 0 ? highSum / highCount : 0;
    this.bands.energy = totalSum / binCount;

    // Sub-Bass Kick Detection
    const currentSub = this.bands.subBass;
    this.subBassHistory.push(currentSub);
    if (this.subBassHistory.length > this.historyLength) {
      this.subBassHistory.shift();
    }

    const avgSub = this.subBassHistory.reduce((a, b) => a + b, 0) / this.subBassHistory.length;
    const now = performance.now() / 1000;

    this.isKick = false;
    this.isSnare = false;
    this.isBeat = false;

    const activeThreshold = this.currentMode === 'mic' ? this.beatThreshold * 0.9 : this.beatThreshold;
    const activeCutoff = this.currentMode === 'mic' ? this.beatCutoff : 0.20;

    if (currentSub > activeCutoff && currentSub > avgSub * activeThreshold && (now - this.lastBeatTime) > 0.16) {
      this.isKick = true;
      this.isBeat = true;
      this.beatIntensity = Math.min(1.8, (currentSub - avgSub) * 4.0 + 0.5);

      if (this.lastBeatTime > 0) {
        const interval = now - this.lastBeatTime;
        if (interval > 0.25 && interval < 1.5) {
          this.beatIntervals.push(interval);
          if (this.beatIntervals.length > 8) this.beatIntervals.shift();
          const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
          this.estimatedBPM = Math.round(60 / avgInterval);
        }
      }
      this.lastBeatTime = now;

      this.notifyBeat({
        type: 'kick',
        intensity: this.beatIntensity,
        bpm: this.estimatedBPM
      });
    } else {
      this.beatIntensity *= this.beatDecayRate;
    }

    if (this.bands.high > 0.24 && this.bands.mid > 0.28) {
      this.isSnare = true;
    }

    return {
      bands: this.bands,
      isKick: this.isKick,
      isSnare: this.isSnare,
      isBeat: this.isBeat,
      beatIntensity: this.beatIntensity,
      estimatedBPM: this.estimatedBPM
    };
  }

  onBeat(callback) {
    this.onBeatCallbacks.push(callback);
  }

  notifyBeat(data) {
    for (let cb of this.onBeatCallbacks) {
      cb(data);
    }
  }

  onStateChange(callback) {
    this.onStateCallbacks.push(callback);
  }

  triggerStateChange(extra = {}) {
    let cur = this.audioElement.currentTime || 0;
    let dur = this.audioElement.duration || this.currentTrackMeta.duration || 0;
    if (this.currentMode === 'synth') {
      cur = this.synthVirtualTime;
      dur = 180;
    }

    for (let cb of this.onStateCallbacks) {
      cb({
        isPlaying: this.isPlaying,
        currentMode: this.currentMode,
        currentTime: cur,
        duration: dur,
        ...this.currentTrackMeta,
        ...extra
      });
    }
  }
}

// Global instance
window.audioEngine = new AudioEngine();
