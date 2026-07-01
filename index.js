document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const state = {
    currentStep: 0,
    name: 'ANÓNIMO',
    colorHue: 220,
    colorHex: '#0055ff',
    frequency: null,
    style: null,
    canvasInjected: false,
    hasInteractedAudio: false
  };

  const zoneViews = Array.from(document.querySelectorAll('.zone-view'));
  const stepDots = Array.from(document.querySelectorAll('.step-dot'));
  const progressLine = document.getElementById('progress-line');
  const userStatusText = document.getElementById('user-status-text');
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderStatus = document.getElementById('preloader-status');
  const audioToggle = document.getElementById('btn-toggle-audio');
  const audioBtnText = document.getElementById('audio-btn-text');

  const AmbientSynth = {
    ctx: null,
    gain: null,
    oscillator: null,
    playing: false,

    ensure() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.025;
      this.oscillator = this.ctx.createOscillator();
      this.oscillator.type = 'sine';
      this.oscillator.frequency.value = 72;
      this.oscillator.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.oscillator.start();
    },

    play() {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      this.playing = true;
      if (audioToggle) audioToggle.classList.add('playing');
      if (audioBtnText) audioBtnText.textContent = 'ON';
    },

    toggle() {
      this.ensure();
      if (!this.ctx) return;
      if (this.playing) {
        this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
        this.playing = false;
        if (audioToggle) audioToggle.classList.remove('playing');
        if (audioBtnText) audioBtnText.textContent = 'MUTED';
      } else {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.gain.gain.setTargetAtTime(0.025, this.ctx.currentTime, 0.08);
        this.playing = true;
        if (audioToggle) audioToggle.classList.add('playing');
        if (audioBtnText) audioBtnText.textContent = 'ON';
      }
    },

    updateTheme(stepIndex) {
      if (!this.oscillator || !this.ctx) return;
      const frequencies = [72, 84, 96, 60, 108, 48];
      this.oscillator.frequency.setTargetAtTime(frequencies[stepIndex] || 72, this.ctx.currentTime, 0.25);
    }
  };

  if (audioToggle) {
    audioToggle.addEventListener('click', () => AmbientSynth.toggle());
  }

  function hidePreloader() {
    if (!preloader || preloader.classList.contains('fade-out')) return;
    if (preloaderBar) preloaderBar.style.width = '100%';
    if (preloaderStatus) preloaderStatus.textContent = 'NUCLEO LISTO';
    setTimeout(() => preloader.classList.add('fade-out'), 250);
  }

  function runPreloader() {
    if (!preloader) return;
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(progress + Math.random() * 18 + 8, 96);
      if (preloaderBar) preloaderBar.style.width = `${progress}%`;
      if (progress >= 96) clearInterval(timer);
    }, 140);

    window.addEventListener('load', () => {
      clearInterval(timer);
      hidePreloader();
    }, { once: true });

    setTimeout(() => {
      clearInterval(timer);
      hidePreloader();
    }, 2200);
  }

  runPreloader();

  function navigateToStep(stepIndex) {
    const clampedStep = Math.max(0, Math.min(stepIndex, zoneViews.length - 1));
    state.currentStep = clampedStep;

    zoneViews.forEach((zone, idx) => {
      zone.classList.toggle('active', idx === clampedStep);
      if (idx === clampedStep) zone.scrollTop = 0;
    });

    stepDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === clampedStep);
      dot.classList.toggle('completed', idx < clampedStep);
    });

    if (progressLine) {
      const maxIndex = Math.max(stepDots.length - 1, 1);
      progressLine.style.width = `${(clampedStep / maxIndex) * 100}%`;
    }

    onEnterZone(clampedStep);
    AmbientSynth.updateTheme(stepIndex);
  }

  // Bind step dots click
  stepDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      if (idx <= state.currentStep || isStepUnlocked(idx)) {
        navigateToStep(idx);
      }
    });
  });

  // Home logo click resets or goes back to start
  const headerLogoHome = document.getElementById('header-logo-home');
  if (headerLogoHome) {
    headerLogoHome.addEventListener('click', () => {
      navigateToStep(0);
    });
  }

  function isStepUnlocked(stepIndex) {
    if (stepIndex === 0) return true;
    if (stepIndex === 1) return true;
    if (stepIndex === 2) return state.name !== 'ANÓNIMO' && state.name.trim() !== '';
    if (stepIndex === 3) return state.canvasInjected;
    if (stepIndex === 4) return state.frequency !== null;
    if (stepIndex === 5) return state.style !== null;
    return false;
  }

  function onEnterZone(stepIndex) {
    document.documentElement.style.setProperty('--active-color-hue', state.colorHue);

    if (stepIndex === 0) {
      initManifestoCanvas();
    } else if (stepIndex === 1) {
      initTabletNoise();
      drawPlaceholderQR();
    } else if (stepIndex === 2) {
      initColorPigmentCanvas();
    } else if (stepIndex === 3) {
      initOscilloscope();
      initMiniFreqCanvases();
    } else if (stepIndex === 4) {
      initWebcam();
    } else if (stepIndex === 5) {
      syncNucleusDashboard();
    }
  }

  // Navigation Buttons
  const btnStartRegistration = document.getElementById('btn-start-registration');
  if (btnStartRegistration) {
    btnStartRegistration.addEventListener('click', () => {
      AmbientSynth.play(); // Initial trigger for audio drone synthesis
      navigateToStep(1);
    });
  }

  // Name Input & Card Validation
  const aliasInput = document.getElementById('alias-input');
  const cardAliasDisplay = document.getElementById('card-alias-display');
  const cardStatusDisplay = document.getElementById('card-status-display');
  const btnToZoneColor = document.getElementById('btn-to-zone-color');
  const hudAlias = document.getElementById('hud-alias');

  if (aliasInput) {
    aliasInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toUpperCase();
      if (val.length > 0) {
        state.name = val;
        cardAliasDisplay.textContent = val;
        cardStatusDisplay.textContent = 'REGISTRADO';
        cardStatusDisplay.classList.remove('cyan-text');
        cardStatusDisplay.style.color = 'var(--active-color)';
        userStatusText.textContent = `REGISTRO: ${val}`;
        if (hudAlias) hudAlias.textContent = `ALIAS: ${val}`;
        btnToZoneColor.classList.remove('disabled');
        btnToZoneColor.removeAttribute('disabled');
      } else {
        state.name = 'ANÓNIMO';
        cardAliasDisplay.textContent = 'ANÓNIMO';
        cardStatusDisplay.textContent = 'SIN EXPRESAR';
        cardStatusDisplay.style.color = '';
        cardStatusDisplay.classList.add('cyan-text');
        userStatusText.textContent = 'REGISTRO: ANÓNIMO';
        if (hudAlias) hudAlias.textContent = 'ALIAS: ANÓNIMO';
        btnToZoneColor.classList.add('disabled');
        btnToZoneColor.setAttribute('disabled', 'true');
      }
      drawPlaceholderQR();
    });
  }

  btnToZoneColor.addEventListener('click', () => {
    navigateToStep(2);
  });


  // ==========================================================================
  // 2. 3D CARD PARALLAX EFFECT
  // ==========================================================================
  
  const physicalCard = document.getElementById('physical-card');
  const cardPerspective = document.querySelector('.card-perspective');

  if (cardPerspective && physicalCard) {
    cardPerspective.addEventListener('mousemove', (e) => {
      const rect = cardPerspective.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      const angleX = (yc - y) / 10;
      const angleY = (x - xc) / 10;
      
      physicalCard.style.transform = `rotateY(${angleY}deg) rotateX(${angleX}deg)`;
      physicalCard.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
      physicalCard.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
    });

    cardPerspective.addEventListener('mouseleave', () => {
      physicalCard.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
    
    physicalCard.addEventListener('click', () => {
      physicalCard.classList.toggle('flipped');
    });
  }


  // ==========================================================================
  // 3. CANVAS SYSTEM - MANIFESTO GRID BACKGROUND
  // ==========================================================================
  
  let manifestoCanvasId = null;
  function initManifestoCanvas() {
    const canvas = document.getElementById('manifesto-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resize() {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }
    resize();

    const points = [];
    const numPoints = 55;

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1
      });
    }

    let mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e) => {
      if (state.currentStep === 0) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
    });

    function animate() {
      if (state.currentStep !== 0) {
        cancelAnimationFrame(manifestoCanvasId);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(255, 94, 0, 0.04)';

      points.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist < 110) {
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.07 * (1 - dist/110)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      if (mouse.x !== null) {
        points.forEach(p => {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 180) {
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.04 * (1 - dist/180)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        });
      }

      manifestoCanvasId = requestAnimationFrame(animate);
    }
    animate();
  }

  // Run initially
  initManifestoCanvas();


  // ==========================================================================
  // 4. ZONA 0: TABLET NOISE & QR CARDS
  // ==========================================================================
  
  let tabletNoiseId = null;
  function initTabletNoise() {
    const canvas = document.getElementById('tablet-noise-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    function animate() {
      if (state.currentStep !== 1) {
        cancelAnimationFrame(tabletNoiseId);
        return;
      }
      
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const val = Math.floor(Math.random() * 255);
        data[i] = val;
        data[i+1] = val;
        data[i+2] = val;
        data[i+3] = 16;
      }
      ctx.putImageData(imgData, 0, 0);

      // Scanning bar
      ctx.fillStyle = 'rgba(0, 240, 255, 0.02)';
      const barY = (Date.now() / 15) % height;
      ctx.fillRect(0, barY, width, 12);

      tabletNoiseId = requestAnimationFrame(animate);
    }
    animate();
  }

  function drawPlaceholderQR() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const size = canvas.width = 120;
    canvas.height = 120;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#000000';
    
    // Corners
    function drawCorner(x, y) {
      ctx.fillRect(x, y, 28, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 4, 20, 20);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 8, y + 8, 12, 12);
    }
    
    drawCorner(4, 4);
    drawCorner(size - 32, 4);
    drawCorner(4, size - 32);

    // Alignment marker
    ctx.fillRect(size - 20, size - 20, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size - 18, size - 18, 6, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(size - 16, size - 16, 2, 2);

    let seed = 0;
    for (let char of state.name) {
      seed += char.charCodeAt(0);
    }

    const cellSize = 4;
    const offset = 4;
    const gridLimit = (size / cellSize) - 2;

    for (let col = offset; col < gridLimit; col++) {
      for (let row = offset; row < gridLimit; row++) {
        if (col < 9 && row < 9) continue;
        if (col > gridLimit - 10 && row < 9) continue;
        if (col < 9 && row > gridLimit - 10) continue;

        const val = Math.sin(col * 12.9898 + row * 78.233 + seed) * 43758.5453;
        const rand = val - Math.floor(val);
        if (rand > 0.48) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }


  // ==========================================================================
  // 5. ZONA 1: COLOR MOLECULAR SANDBOX
  // ==========================================================================
  
  const colorHueSlider = document.getElementById('color-hue-slider');
  const colorHexDisplay = document.getElementById('color-hex-display');
  const btnToZoneSound = document.getElementById('btn-to-zone-sound');
  const blendingMessage = document.getElementById('blending-message');
  const strangerInfoTag = document.getElementById('stranger-info-tag');

  if (colorHueSlider) {
    colorHueSlider.addEventListener('input', (e) => {
      state.colorHue = parseInt(e.target.value);
      state.colorHex = hslToHex(state.colorHue, 100, 50);
      
      if (colorHexDisplay) {
        colorHexDisplay.textContent = state.colorHex.toUpperCase();
        colorHexDisplay.style.backgroundColor = `hsl(${state.colorHue}, 100%, 50%)`;
      }
      
      document.documentElement.style.setProperty('--active-color-hue', state.colorHue);
    });
  }

  let pigmentCanvasId = null;
  function initColorPigmentCanvas() {
    const canvas = document.getElementById('color-pigment-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const sizeWidth = canvas.parentElement.clientWidth;
    const sizeHeight = canvas.parentElement.clientHeight;
    canvas.width = sizeWidth;
    canvas.height = sizeHeight;

    const particles = [];
    let isDrawing = false;
    let dragPointsCount = 0;
    let blendingTriggered = false;

    class Particle {
      constructor(x, y, hue, velocityMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.hue = hue;
        this.radius = Math.random() * 18 + 6;
        this.vx = (Math.random() - 0.5) * 1.8 * velocityMultiplier;
        this.vy = (Math.random() - 0.5) * 1.8 * velocityMultiplier;
        this.alpha = 0.85;
        this.decay = Math.random() * 0.012 + 0.006;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.radius > 1) this.radius -= 0.1;
      }

      draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsla(${this.hue}, 100%, 55%, ${this.alpha})`);
        grad.addColorStop(1, `hsla(${this.hue}, 100%, 55%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function getPointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDraw(e) {
      isDrawing = true;
      inject(e);
    }

    function inject(e) {
      if (!isDrawing) return;
      const pos = getPointerPos(e);
      for (let i = 0; i < 3; i++) {
        particles.push(new Particle(pos.x, pos.y, state.colorHue));
      }
      dragPointsCount++;
      if (dragPointsCount > 25 && !blendingTriggered) {
        triggerStrangerBlending();
      }
    }

    function stopDraw() {
      isDrawing = false;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', inject);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: true });
    canvas.addEventListener('touchmove', inject, { passive: true });
    window.addEventListener('touchend', stopDraw);

    function triggerStrangerBlending() {
      blendingTriggered = true;
      if (strangerInfoTag) strangerInfoTag.style.display = 'flex';
      if (blendingMessage) blendingMessage.textContent = 'FUSIONANDO COLOR DEL PARTICIPANTE...';
      
      let spawnCount = 0;
      const strangerHue = (state.colorHue + 145) % 360;

      const interval = setInterval(() => {
        if (state.currentStep !== 2) {
          clearInterval(interval);
          return;
        }

        const sx = canvas.width - (spawnCount * 8) % canvas.width;
        const sy = Math.cos(spawnCount * 0.15) * 50 + canvas.height / 2;

        for (let i = 0; i < 2; i++) {
          particles.push(new Particle(sx, sy, strangerHue, 1.3));
        }

        spawnCount++;
        if (spawnCount > 50) {
          clearInterval(interval);
          finalizeFusion();
        }
      }, 55);
    }

    function finalizeFusion() {
      if (blendingMessage) {
        blendingMessage.textContent = 'FUSIÓN COMPLETA: HUELLA MUTUA REGISTRADA';
        blendingMessage.style.color = '#22c55e';
        blendingMessage.style.borderColor = '#22c55e';
      }
      state.canvasInjected = true;
      btnToZoneSound.classList.remove('disabled');
      btnToZoneSound.removeAttribute('disabled');
    }

    function animate() {
      if (state.currentStep !== 2) {
        cancelAnimationFrame(pigmentCanvasId);
        return;
      }

      ctx.fillStyle = 'rgba(2, 4, 10, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0 || p.radius <= 0) {
          particles.splice(i, 1);
        } else {
          p.draw();
        }
      }

      pigmentCanvasId = requestAnimationFrame(animate);
    }
    
    ctx.fillStyle = '#020409';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    animate();
  }

  btnToZoneSound.addEventListener('click', () => {
    navigateToStep(3);
  });


  // ==========================================================================
  // 6. ZONA 2: TONE GENERATOR & OSCILLOSCOPE
  // ==========================================================================
  
  const frequencyCards = document.querySelectorAll('.frequency-card');
  const btnToZoneStyle = document.getElementById('btn-to-zone-style');
  const audioPromptOverlay = document.getElementById('audio-prompt-overlay');
  const oscFrequencyDisplay = document.getElementById('oscilloscope-frequency-display');

  let audioCtx = null;
  let oscillator = null;
  let gainNode = null;
  let lfoNode = null;
  let filterNode = null;
  let playInterval = null;
  let analyser = null;

  function initAudioEngine() {
    if (audioCtx) return;
    
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(350, audioCtx.currentTime);

    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    filterNode.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    state.hasInteractedAudio = true;
    if (audioPromptOverlay) audioPromptOverlay.classList.add('hidden');
  }

  function playSynth(type) {
    if (!audioCtx) initAudioEngine();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    stopSynth();

    oscillator = audioCtx.createOscillator();
    const now = audioCtx.currentTime;

    if (type === 'calma') {
      if (oscFrequencyDisplay) oscFrequencyDisplay.textContent = 'FREQ: 54.2 Hz';
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(54.2, now);
      filterNode.frequency.setValueAtTime(150, now);

      lfoNode = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfoNode.frequency.setValueAtTime(0.2, now);
      lfoGain.gain.setValueAtTime(0.08, now);
      lfoNode.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfoNode.start(now);

      gainNode.gain.setValueAtTime(0.04, now);

    } else if (type === 'energia') {
      if (oscFrequencyDisplay) oscFrequencyDisplay.textContent = 'FREQ: 110.0 Hz';
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(110, now);
      filterNode.frequency.setValueAtTime(300, now);
      gainNode.gain.setValueAtTime(0, now);
      
      let step = 0;
      playInterval = setInterval(() => {
        if (state.currentStep !== 3 || state.frequency !== 'energia') {
          clearInterval(playInterval);
          return;
        }
        const time = audioCtx.currentTime;
        const vol = (step % 2 === 0) ? 0.22 : 0.05;
        gainNode.gain.cancelScheduledValues(time);
        gainNode.gain.linearRampToValueAtTime(vol, time + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.02, time + 0.35);
        step++;
      }, 450);

    } else if (type === 'exploracion') {
      if (oscFrequencyDisplay) oscFrequencyDisplay.textContent = 'FREQ: 78.3 Hz';
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(78.3, now);
      filterNode.frequency.setValueAtTime(250, now);

      oscillator.frequency.linearRampToValueAtTime(95, now + 4);
      oscillator.frequency.linearRampToValueAtTime(65, now + 8);
      
      let direction = true;
      playInterval = setInterval(() => {
        if (state.currentStep !== 3 || state.frequency !== 'exploracion') {
          clearInterval(playInterval);
          return;
        }
        const time = audioCtx.currentTime;
        const targetFreq = direction ? 65 : 95;
        oscillator.frequency.cancelScheduledValues(time);
        oscillator.frequency.linearRampToValueAtTime(targetFreq, time + 4);
        direction = !direction;
      }, 4000);

      gainNode.gain.setValueAtTime(0.18, now);

    } else if (type === 'intensidad') {
      if (oscFrequencyDisplay) oscFrequencyDisplay.textContent = 'FREQ: 150.0 Hz';
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, now);
      filterNode.frequency.setValueAtTime(180, now);
      filterNode.Q.setValueAtTime(6, now);

      lfoNode = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfoNode.frequency.setValueAtTime(6.5, now);
      lfoGain.gain.setValueAtTime(3, now);
      lfoNode.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      lfoNode.start(now);

      gainNode.gain.setValueAtTime(0.08, now);
    }

    oscillator.connect(filterNode);
    oscillator.start(now);
  }

  function stopSynth() {
    if (oscillator) {
      try { oscillator.stop(); } catch(e) {}
      oscillator.disconnect();
      oscillator = null;
    }
    if (lfoNode) {
      try { lfoNode.stop(); } catch(e) {}
      lfoNode.disconnect();
      lfoNode = null;
    }
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    if (gainNode) {
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    }
  }

  frequencyCards.forEach(card => {
    card.addEventListener('click', () => {
      frequencyCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      const freq = card.getAttribute('data-freq');
      state.frequency = freq;

      playSynth(freq);
      
      btnToZoneStyle.classList.remove('disabled');
      btnToZoneStyle.removeAttribute('disabled');
    });
  });

  let oscCanvasId = null;
  function initOscilloscope() {
    const canvas = document.getElementById('sound-oscilloscope-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (state.currentStep !== 3) {
        cancelAnimationFrame(oscCanvasId);
        stopSynth();
        return;
      }

      oscCanvasId = requestAnimationFrame(draw);

      ctx.fillStyle = '#020409';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (analyser && state.hasInteractedAudio) {
        analyser.getByteTimeDomainData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 128;
        }
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = state.colorHex;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `hsla(${state.colorHue}, 100%, 55%, 0.6)`;

      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    draw();
  }

  let miniCanvasesAnimId = null;
  function initMiniFreqCanvases() {
    const canvases = document.querySelectorAll('.mini-freq-canvas');
    if (canvases.length === 0) return;

    const canvasData = [];
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      canvas.width = 120;
      canvas.height = 60;
      const type = canvas.getAttribute('data-type');
      canvasData.push({ canvas, ctx, type });
    });

    let time = 0;
    function animate() {
      if (state.currentStep !== 3) {
        cancelAnimationFrame(miniCanvasesAnimId);
        return;
      }

      miniCanvasesAnimId = requestAnimationFrame(animate);
      time++;

      canvasData.forEach(({ canvas, ctx, type }) => {
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, w, h);

        ctx.lineWidth = 2;
        const isSelected = canvas.closest('.frequency-card').classList.contains('selected');
        ctx.strokeStyle = isSelected ? state.colorHex : 'rgba(0, 240, 255, 0.22)';
        
        if (isSelected) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `hsla(${state.colorHue}, 100%, 55%, 0.5)`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(0, h / 2);

        for (let x = 0; x < w; x++) {
          let y = h / 2;

          if (type === 'calma') {
            y = Math.sin(x * 0.08 - time * 0.03) * 10 + h / 2;
          } else if (type === 'energia') {
            const period = 20;
            const posInPeriod = (x + time * 1.5) % period;
            const pulse = (posInPeriod < 4) ? 1 : 0;
            y = pulse * -14 + h / 2 + 5;
          } else if (type === 'exploracion') {
            const freqMod = Math.sin(time * 0.02) * 0.04 + 0.1;
            y = Math.sin(x * freqMod - time * 0.05) * 12 + h / 2;
          } else if (type === 'intensidad') {
            const val = ((x * 0.45 + time * 0.4) % 12) / 12;
            y = (val - 0.5) * 18 + h / 2;
          }

          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    }

    animate();
  }

  btnToZoneStyle.addEventListener('click', () => {
    navigateToStep(4);
  });


  // ==========================================================================
  // 7. ZONA 3: WEBCAM FILTERS
  // ==========================================================================
  
  const styleCards = document.querySelectorAll('.style-option-card');
  const btnToZoneNucleus = document.getElementById('btn-to-zone-nucleus');
  const activeStyleBadge = document.getElementById('active-style-badge');
  const cameraContainer = document.getElementById('camera-container');
  const vrGogglesTrigger = document.getElementById('vr-goggles-trigger');
  const hudVrBtnRemove = document.getElementById('hud-vr-btn-remove');

  function initWebcam() {
    // Kept for navigation trigger support without breaking step bindings
  }

  if (vrGogglesTrigger) {
    vrGogglesTrigger.addEventListener('click', () => {
      if (cameraContainer) {
        cameraContainer.classList.add('vr-active');
      }
    });
  }

  if (hudVrBtnRemove) {
    hudVrBtnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      if (cameraContainer) {
        cameraContainer.classList.remove('vr-active');
      }
    });
  }

  styleCards.forEach(card => {
    card.addEventListener('click', () => {
      styleCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      const style = card.getAttribute('data-style');
      state.style = style;

      if (activeStyleBadge) {
        activeStyleBadge.className = `badge ${style}`;
        activeStyleBadge.textContent = style.toUpperCase();
      }

      if (cameraContainer) {
        cameraContainer.classList.remove('filter-comic', 'filter-retro', 'filter-sci-fi');
        cameraContainer.classList.add(`filter-${style}`);
        cameraContainer.classList.add('vr-active');
      }

      btnToZoneNucleus.classList.remove('disabled');
      btnToZoneNucleus.removeAttribute('disabled');
    });
  });

  btnToZoneNucleus.addEventListener('click', () => {
    navigateToStep(5);
  });


  // ==========================================================================
  // 8. ZONA 4: THE NUCLEUS FINAL
  // ==========================================================================
  
  const interactiveCube = document.getElementById('interactive-cube');
  const nucleusColorVal = document.getElementById('nucleus-color-val');
  const nucleusSoundVal = document.getElementById('nucleus-sound-val');
  const nucleusStyleVal = document.getElementById('nucleus-style-val');

  function syncNucleusDashboard() {
    if (nucleusColorVal) nucleusColorVal.textContent = state.colorHex.toUpperCase();
    if (nucleusSoundVal) nucleusSoundVal.textContent = state.frequency.toUpperCase();
    if (nucleusStyleVal) nucleusStyleVal.textContent = state.style.toUpperCase();

    const mergeMine = document.getElementById('merge-mine');
    const mergeCombo = document.getElementById('merge-combo');

    if (mergeMine) mergeMine.style.backgroundColor = state.colorHex;
    if (mergeCombo) {
      const mixedHue = Math.round((state.colorHue + 270) / 2);
      mergeCombo.style.background = `linear-gradient(90deg, ${state.colorHex} 0%, #a855f7 100%)`;
    }

    let speed = '18s';
    if (state.frequency === 'calma') speed = '32s';
    else if (state.frequency === 'energia') speed = '10s';
    else if (state.frequency === 'exploracion') speed = '18s';
    else if (state.frequency === 'intensidad') speed = '5s';

    if (interactiveCube) interactiveCube.style.animationDuration = speed;

    const sides = document.querySelectorAll('.cube-side');
    sides.forEach(side => {
      if (state.style === 'comic') {
        side.style.borderStyle = 'dashed';
        side.style.borderWidth = '4px';
      } else if (state.style === 'retro') {
        side.style.borderStyle = 'double';
        side.style.borderWidth = '6px';
      } else {
        side.style.borderStyle = 'solid';
        side.style.borderWidth = '2px';
      }
    });
  }

  if (interactiveCube) {
    interactiveCube.addEventListener('click', () => {
      const prevDur = interactiveCube.style.animationDuration;
      interactiveCube.style.animationDuration = '1.2s';
      interactiveCube.style.transform = 'scale(1.2) rotateX(45deg) rotateY(45deg)';
      
      setTimeout(() => {
        interactiveCube.style.animationDuration = prevDur;
        interactiveCube.style.transform = '';
      }, 1200);
    });
  }


  // ==========================================================================
  // 9. PRE-ACCREDITATION TICKET EXPORT (Canvas Drawing)
  // ==========================================================================
  
  const btnDownloadTicket = document.getElementById('btn-download-ticket');
  const btnResetExperience = document.getElementById('btn-reset-experience');

  if (btnDownloadTicket) {
    btnDownloadTicket.addEventListener('click', () => {
      renderAndDownloadTicket();
    });
  }

  if (btnResetExperience) {
    btnResetExperience.addEventListener('click', () => {
      state.name = 'ANÓNIMO';
      state.colorHue = 220;
      state.colorHex = '#0055ff';
      state.frequency = null;
      state.style = null;
      state.canvasInjected = false;

      if (aliasInput) aliasInput.value = '';
      cardAliasDisplay.textContent = 'ANÓNIMO';
      cardStatusDisplay.textContent = 'SIN EXPRESAR';
      cardStatusDisplay.className = 'value cyan-text';
      cardStatusDisplay.style.color = '';
      btnToZoneColor.classList.add('disabled');
      btnToZoneColor.setAttribute('disabled', 'true');

      frequencyCards.forEach(c => c.classList.remove('selected'));
      btnToZoneStyle.classList.add('disabled');
      btnToZoneStyle.setAttribute('disabled', 'true');

      styleCards.forEach(c => c.classList.remove('selected'));
      btnToZoneNucleus.classList.add('disabled');
      btnToZoneNucleus.setAttribute('disabled', 'true');
      if (activeStyleBadge) {
        activeStyleBadge.className = 'badge';
        activeStyleBadge.textContent = 'NINGUNO';
      }
      if (cameraContainer) cameraContainer.className = 'camera-simulation-container';

      if (audioPromptOverlay) audioPromptOverlay.classList.remove('hidden');
      if (oscFrequencyDisplay) oscFrequencyDisplay.textContent = 'FREQ: ---';

      navigateToStep(0);
    });
  }

  function renderAndDownloadTicket() {
    const canvas = document.getElementById('final-ticket-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#04060b');
    bgGrad.addColorStop(0.5, '#0b0f19');
    bgGrad.addColorStop(1, '#020306');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Matrix lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Outer glow board border
    ctx.strokeStyle = state.colorHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Corners
    ctx.fillStyle = state.colorHex;
    const cw = 40;
    ctx.fillRect(15, 15, cw, 6);
    ctx.fillRect(15, 15, 6, cw);
    ctx.fillRect(w - 15 - cw, 15, cw, 6);
    ctx.fillRect(w - 21, 15, 6, cw);
    ctx.fillRect(15, h - 21, cw, 6);
    ctx.fillRect(15, h - 15 - cw, 6, cw);
    ctx.fillRect(w - 15 - cw, h - 21, cw, 6);
    ctx.fillRect(w - 21, h - 15 - cw, 6, cw);

    // LOGO
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('C O R E', w / 2, 90);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '700 11px Outfit, monospace';
    ctx.fillText('NUESTRA FORMA, SIN EXCEPCIONES.', w / 2, 115);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(50, 150); ctx.lineTo(w - 50, 150); ctx.stroke();

    // info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CREDENCIA DE ACCESO:', 60, 200);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px Outfit, sans-serif';
    ctx.fillText(state.name, 60, 235);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '500 11px monospace';
    ctx.fillText(`PRE-ACC: #108-${state.name.substring(0,3)}-2026`, 60, 260);

    // Color Swatch
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillText('A. MATERIA PRIMA (COLOR)', 60, 310);
    
    ctx.fillStyle = state.colorHex;
    ctx.fillRect(60, 330, w - 120, 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillText(`HEX: ${state.colorHex.toUpperCase()} — HUE: ${state.colorHue}°`, 80, 352);

    // Frequency
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillText('B. PULSO AUDIBLE SELECCIONADO', 60, 410);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(60, 430, w - 120, 60);

    let freqHz = '78.3 Hz';
    let freqDesc = 'Frecuencias expansivas en busca de formas.';
    if (state.frequency === 'calma') { freqHz = '54.2 Hz'; freqDesc = 'Mente calmada, ritmo de respiración lento.'; }
    else if (state.frequency === 'energia') { freqHz = '110.0 Hz'; freqDesc = 'Pulso rítmico propulsivo de energía.'; }
    else if (state.frequency === 'intensidad') { freqHz = '150.0 Hz'; freqDesc = 'Oscilación densa y resonancia profunda.'; }

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px Outfit, sans-serif';
    ctx.fillText(`MODO: ${state.frequency.toUpperCase()} (${freqHz})`, 80, 456);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(freqDesc, 80, 475);

    // Style
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillText('C. LENTE DE REALIDAD PREFERIDO', 60, 520);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(60, 540, w - 120, 60);

    let styleDesc = 'Estructura rígida de neón cibernético.';
    if (state.style === 'comic') styleDesc = 'Caos vibrante y trama de puntos de medio tono.';
    else if (state.style === 'retro') styleDesc = 'Nostalgia fragmentada y scanlines analógicas.';

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px Outfit, sans-serif';
    ctx.fillText(`LENTE: ${state.style.toUpperCase()}`, 80, 566);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(styleDesc, 80, 585);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(50, 630); ctx.lineTo(w - 50, 630); ctx.stroke();

    // QR
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillText('QR REGISTRO DE PARTICIPANTE', w / 2, 665);

    const qrSize = 130;
    const qrx = (w - qrSize) / 2;
    const qry = 690;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrx - 10, qry - 10, qrSize + 20, qrSize + 20);

    ctx.fillStyle = '#000000';
    function drawAnchor(ax, ay) {
      ctx.fillRect(qrx + ax, qry + ay, 30, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrx + ax + 4, qry + ay + 4, 22, 22);
      ctx.fillStyle = '#000000';
      ctx.fillRect(qrx + ax + 8, qry + ay + 8, 14, 14);
    }
    
    drawAnchor(4, 4);
    drawAnchor(qrSize - 34, 4);
    drawAnchor(4, qrSize - 34);

    ctx.fillRect(qrx + qrSize - 22, qry + qrSize - 22, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrx + qrSize - 20, qry + qrSize - 20, 6, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(qrx + qrSize - 18, qry + qrSize - 18, 2, 2);

    let seed = 0;
    for (let char of state.name) {
      seed += char.charCodeAt(0);
    }

    const cSize = 5;
    const oLimit = (qrSize / cSize) - 1;
    for (let col = 1; col < oLimit; col++) {
      for (let row = 1; row < oLimit; row++) {
        if (col < 7 && row < 7) continue;
        if (col > oLimit - 8 && row < 7) continue;
        if (col < 7 && row > oLimit - 8) continue;

        const val = Math.sin(col * 12.9898 + row * 78.233 + seed) * 43758.5453;
        const rand = val - Math.floor(val);
        if (rand > 0.48) {
          ctx.fillRect(qrx + col * cSize, qry + row * cSize, cSize, cSize);
        }
      }
    }

    // Credits
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DISEÑADO POR SMULEVER, KANTOR, LOMBARDI Y VALENZI', w / 2, 850);
    ctx.fillText('CORE EXPERIENCIA DIGITAL © 2026', w / 2, 865);

    // Save
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `CORE_Preacreditacion_${state.name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }


  // ==========================================================================
  // 10. UTILS
  // ==========================================================================
  
  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }


  // ==========================================================================
  // AUDIO GUIDE PLAYERS
  // ==========================================================================
  const guideAudioFiles = {
    0: 'assets/audio_zone0.wav',
    1: 'assets/audio_zone1.mp3',
    2: 'assets/audio_zone2.mp3',
    3: 'assets/audio_zone3.mp3',
    4: 'assets/audio_zone4.mp3'
  };

  let activeGuideAudio = null;
  let activeGuideButton = null;

  function resetGuideButton(button) {
    if (!button) return;
    button.classList.remove('playing');
    const text = button.querySelector('.guide-audio-btn-text');
    const icon = button.querySelector('.guide-audio-play-icon');
    if (text) text.textContent = 'REPRODUCIR RELATO';
    if (icon) icon.textContent = '▶';
  }

  function setGuideButtonPlaying(button) {
    if (!button) return;
    button.classList.add('playing');
    const text = button.querySelector('.guide-audio-btn-text');
    const icon = button.querySelector('.guide-audio-play-icon');
    if (text) text.textContent = 'PAUSAR RELATO';
    if (icon) icon.textContent = '❚❚';
  }

  document.querySelectorAll('.btn-audio-guide-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const zone = button.getAttribute('data-zone-audio');
      const src = guideAudioFiles[zone];
      if (!src) return;

      if (activeGuideAudio && activeGuideButton === button && !activeGuideAudio.paused) {
        activeGuideAudio.pause();
        resetGuideButton(button);
        return;
      }

      if (activeGuideAudio) {
        activeGuideAudio.pause();
        activeGuideAudio.currentTime = 0;
        resetGuideButton(activeGuideButton);
      }

      activeGuideAudio = new Audio(src);
      activeGuideButton = button;
      activeGuideAudio.addEventListener('ended', () => resetGuideButton(button), { once: true });
      activeGuideAudio.addEventListener('error', () => {
        resetGuideButton(button);
        const text = button.querySelector('.guide-audio-btn-text');
        if (text) text.textContent = 'AUDIO NO DISPONIBLE';
      }, { once: true });

      activeGuideAudio.play()
        .then(() => setGuideButtonPlaying(button))
        .catch(() => resetGuideButton(button));
    });
  });

  // ==========================================================================
  // CUSTOM PRO CURSOR ENGINE
  // ==========================================================================
  const cursorDot = document.getElementById('custom-cursor-dot');
  const cursorRing = document.getElementById('custom-cursor-ring');

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile && cursorDot && cursorRing) {
    cursorDot.style.display = 'none';
    cursorRing.style.display = 'none';
    document.body.style.cursor = 'default';
  } else {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const updateCursor = () => {
      if (cursorDot) {
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
      }
      
      const ease = 0.15;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;
      
      if (cursorRing) {
        cursorRing.style.left = `${ringX}px`;
        cursorRing.style.top = `${ringY}px`;
      }
      requestAnimationFrame(updateCursor);
    };
    requestAnimationFrame(updateCursor);

    const bindCursorHoverElements = () => {
      const interactives = document.querySelectorAll('a, button, input, select, textarea, .frequency-card, .style-card, .btn-audio-guide-toggle, .progress-steps span, #header-logo-home');
      interactives.forEach(el => {
        if (el.dataset.cursorBound) return;
        el.dataset.cursorBound = 'true';

        el.addEventListener('mouseenter', () => {
          if (cursorRing && cursorDot) {
            cursorRing.style.width = '55px';
            cursorRing.style.height = '55px';
            cursorRing.style.borderColor = 'var(--active-color)';
            cursorRing.style.backgroundColor = 'rgba(255, 94, 0, 0.04)';
            cursorDot.style.transform = 'translate(-50%, -50%) scale(0)';
          }
        });

        el.addEventListener('mouseleave', () => {
          if (cursorRing && cursorDot) {
            cursorRing.style.width = '36px';
            cursorRing.style.height = '36px';
            cursorRing.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            cursorRing.style.backgroundColor = 'transparent';
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
          }
        });
      });
    };

    bindCursorHoverElements();

    const cursorObserver = new MutationObserver(() => {
      bindCursorHoverElements();
    });
    cursorObserver.observe(document.body, { childList: true, subtree: true });
  }

});
