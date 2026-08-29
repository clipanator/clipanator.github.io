/* ==========================================================================
   Matt Warner — portfolio interactions
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     Footer year
     ------------------------------------------------------------ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ==============================================================
     SITE AUDIO BUS — a master volume, plus ducking so the ambient
     loop drops out whenever any other sound on the page is active.
     ============================================================== */
  const MASTER = { volume: 0.6 };
  const MANAGED = [];       // { el, base } — anything whose volume should rescale with MASTER
  const activeForeground = new Set();
  const BASE_AMBIENT = 0.3;
  let ambientAudio = null;

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  function manage(el, base) {
    el._base = base;
    if (!MANAGED.includes(el)) MANAGED.push(el);
    el.volume = clamp01(base * MASTER.volume);
  }

  function unmanage(el) {
    const i = MANAGED.indexOf(el);
    if (i > -1) MANAGED.splice(i, 1);
  }

  function rescaleAll() {
    MANAGED.forEach(el => {
      if (typeof el._base === 'number') el.volume = clamp01(el._base * MASTER.volume);
    });
  }

  function fadeTo(el, targetBase, duration = 350) {
    el._base = targetBase;
    if (!MANAGED.includes(el)) MANAGED.push(el);
    const startVol = el.volume;
    const endVol = clamp01(targetBase * MASTER.volume);
    const t0 = performance.now();
    function tick(now) {
      const t = Math.min((now - t0) / duration, 1);
      el.volume = startVol + (endVol - startVol) * t;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function duckAmbient() {
    if (!ambientAudio) return;
    fadeTo(ambientAudio, activeForeground.size > 0 ? 0 : BASE_AMBIENT, 350);
  }

  // Persistent elements (music layers, SFX previews) toggle foreground via play/pause.
  function markForeground(el) {
    el.addEventListener('play', () => { activeForeground.add(el); duckAmbient(); });
    el.addEventListener('pause', () => { activeForeground.delete(el); duckAmbient(); });
    el.addEventListener('ended', () => { activeForeground.delete(el); duckAmbient(); });
  }

  // Short one-shot UI sounds get cloned so overlapping clicks don't cut each other off.
  function playOneShot(templateEl, base = 0.8) {
    if (!templateEl) return;
    const clone = templateEl.cloneNode(true);
    manage(clone, base);
    activeForeground.add(clone);
    duckAmbient();
    const cleanup = () => { activeForeground.delete(clone); unmanage(clone); duckAmbient(); };
    clone.addEventListener('ended', cleanup, { once: true });
    clone.play().catch(cleanup);
  }

  // Ambient loop needs a user gesture before browsers allow playback.
  ambientAudio = new Audio('assets/audio/ui/ambient-loop.mp3');
  ambientAudio.loop = true;
  ambientAudio.preload = 'auto';
  manage(ambientAudio, 0);
  let ambientStarted = false;
  document.addEventListener('click', function startAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;
    ambientAudio.play().then(() => duckAmbient()).catch(() => { ambientStarted = false; });
  });

  // Global click sounds — one for interactive elements, one for empty space.
  const sndClickInteractive = document.getElementById('sndClickInteractive');
  const sndClickEmpty = document.getElementById('sndClickEmpty');
  const sndScroll = document.getElementById('sndScroll');

  document.addEventListener('click', (e) => {
    const isInteractive = e.target.closest('button, a, [role="tab"]');
    playOneShot(isInteractive ? sndClickInteractive : sndClickEmpty, 0.7);
  });

  let scrollSoundCooling = false;
  let scrollSoundTimer = null;
  window.addEventListener('scroll', () => {
    if (!scrollSoundCooling) {
      playOneShot(sndScroll, 0.5);
      scrollSoundCooling = true;
    }
    window.clearTimeout(scrollSoundTimer);
    scrollSoundTimer = window.setTimeout(() => { scrollSoundCooling = false; }, 500);
  }, { passive: true });

  // Master volume slider — rescales every managed audio element live.
  const masterVolumeInput = document.getElementById('masterVolume');
  if (masterVolumeInput) {
    masterVolumeInput.value = String(Math.round(MASTER.volume * 100));
    masterVolumeInput.addEventListener('input', (e) => {
      MASTER.volume = Number(e.target.value) / 100;
      rescaleAll();
    });
  }

  /* ------------------------------------------------------------
     Eased scrolling helper
     ------------------------------------------------------------ */
  function smoothScrollTo(targetY, duration = 1000) {
    const startY = window.scrollY;
    const diff = targetY - startY;
    if (prefersReducedMotion) { window.scrollTo(0, targetY); return; }
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, startY + diff * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------
     Hero scroll cue
     ------------------------------------------------------------ */
  const scrollCue = document.getElementById('scrollCue');
  const workSection = document.getElementById('work');

  if (scrollCue && workSection) {
    const scrollToWork = () => {
      const targetY = workSection.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(targetY, 1000);
    };

    let autoScrollTimer = window.setTimeout(scrollToWork, 5000);

    function cancelAutoScroll() {
      if (autoScrollTimer) {
        window.clearTimeout(autoScrollTimer);
        autoScrollTimer = null;
        window.removeEventListener('scroll', onEarlyScroll);
        window.removeEventListener('wheel', onEarlyScroll);
        window.removeEventListener('touchstart', onEarlyScroll);
      }
    }
    function onEarlyScroll() { cancelAutoScroll(); }

    scrollCue.addEventListener('click', () => { cancelAutoScroll(); scrollToWork(); });
    window.addEventListener('scroll', onEarlyScroll, { passive: true });
    window.addEventListener('wheel', onEarlyScroll, { passive: true });
    window.addEventListener('touchstart', onEarlyScroll, { passive: true });
  }

  /* ------------------------------------------------------------
     Hero parallax
     ------------------------------------------------------------ */
  const heroWrap = document.getElementById('heroVideoWrap');
  if (heroWrap && !prefersReducedMotion) {
    const speed = 0.4;
    let ticking = false;
    const updateParallax = () => {
      heroWrap.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { window.requestAnimationFrame(updateParallax); ticking = true; }
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     Text scramble
     ------------------------------------------------------------ */
  function scrambleText(el, target, duration = 900) {
    if (!el) return;
    if (prefersReducedMotion) { el.textContent = target; return; }
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_/[]{}=+*^?#';
    if (el._scrambleFrame) cancelAnimationFrame(el._scrambleFrame);
    const start = performance.now();
    const length = target.length;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const revealCount = Math.floor(progress * length);
      let out = '';
      for (let i = 0; i < length; i++) {
        out += (i < revealCount || target[i] === ' ') ? target[i] : charset[Math.floor(Math.random() * charset.length)];
      }
      el.textContent = out;
      if (progress < 1) el._scrambleFrame = requestAnimationFrame(tick);
      else el.textContent = target;
    }
    el._scrambleFrame = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------
     Mode switching (Audio / Art) — background, hero role, about
     role word, console scale animation, and a shareable #hash.
     ------------------------------------------------------------ */
  const showcase = document.querySelector('.showcase');
  const tabs = document.querySelectorAll('.tab');
  const heroRole = document.getElementById('heroRole');
  const aboutRoleWord = document.getElementById('aboutRoleWord');
  const consoleEl = document.querySelector('.console');

  const MODE_COPY = {
    audio: { hero: 'Audio Designer', about: 'Sound Designer' },
    art:   { hero: 'Game Artist',    about: 'Game Artist' }
  };

  function setMode(mode, { animate = true, updateHash = true } = {}) {
    if (!showcase || showcase.dataset.mode === mode) return;

    const applyChange = () => {
      showcase.dataset.mode = mode;
      tabs.forEach(t => {
        const active = t.dataset.mode === mode;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      scrambleText(heroRole, MODE_COPY[mode].hero);
      if (aboutRoleWord) aboutRoleWord.textContent = MODE_COPY[mode].about;
      if (consoleEl) requestAnimationFrame(() => consoleEl.classList.remove('is-switching'));
      if (updateHash) history.replaceState(null, '', '#' + mode);
    };

    if (consoleEl && animate && !prefersReducedMotion) {
      consoleEl.classList.add('is-switching');
      window.setTimeout(applyChange, 220);
    } else {
      applyChange();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  // Support a shareable ?#audio / #art link.
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash === 'art' || initialHash === 'audio') {
    setMode(initialHash, { animate: false, updateHash: false });
  }

  scrambleText(heroRole, MODE_COPY[showcase ? showcase.dataset.mode : 'audio'].hero, 1100);

  /* ------------------------------------------------------------
     Carousel
     ------------------------------------------------------------ */
  const track = document.getElementById('carouselTrack');
  const dotsWrap = document.getElementById('carouselDots');
  const prevBtn = document.querySelector('.carousel__arrow--prev');
  const nextBtn = document.querySelector('.carousel__arrow--next');

  if (track) {
    const slides = Array.from(track.children);
    let current = 0;

    const renderDots = () => {
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'dot' + (i === current ? ' is-active' : '');
        dotsWrap.appendChild(dot);
      });
    };

    const goTo = (index) => {
      current = Math.max(0, Math.min(index, slides.length - 1));
      track.style.transform = `translateX(-${current * 100}%)`;
      renderDots();
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === slides.length - 1;
    };

    renderDots();

    if (slides.length > 1) {
      prevBtn.addEventListener('click', () => goTo(current - 1));
      nextBtn.addEventListener('click', () => goTo(current + 1));
      goTo(0);
    } else {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  /* ------------------------------------------------------------
     Adaptive music — 5 states play simultaneously in sync; the
     slider mutes/unmutes the right one. Dragging tracks the
     cursor directly; programmatic changes (idle auto-advance)
     ease into place with a soft, jelly-like overshoot.
     ------------------------------------------------------------ */
  const musicRoot = document.querySelector('.music');
  if (musicRoot) {
    const MUSIC_STATES = [
      { label: 'Main',      src: 'assets/audio/music/layer_1.mp3' },
      { label: 'Shop',      src: 'assets/audio/music/layer_2.mp3' },
      { label: 'Boss',      src: 'assets/audio/music/layer_3.mp3' },
      { label: 'Loading',   src: 'assets/audio/music/layer_4.mp3' },
      { label: 'Game Over', src: 'assets/audio/music/layer_5.mp3' }
    ];

    const stateAudios = MUSIC_STATES.map(state => {
      const audio = new Audio(state.src);
      audio.loop = true;
      audio.preload = 'auto';
      manage(audio, 0);
      markForeground(audio);
      return audio;
    });

    const slider = document.getElementById('musicFader');
    const readout = document.getElementById('musicReadout');
    const playBtn = document.getElementById('musicPlay');
    const fill = document.getElementById('faderFill');
    const thumb = document.getElementById('faderThumb');

    slider.max = String(MUSIC_STATES.length - 1);

    let activeIndex = 0;
    let isPlaying = false;
    let idleTimer = null;
    let syncTimer = null;
    const IDLE_MS = 10000;
    const FADE_MS = 400;

    const updateSliderVisual = (index) => {
      const pct = (index / (MUSIC_STATES.length - 1)) * 100;
      fill.style.width = pct + '%';
      thumb.style.left = pct + '%';
    };

    ['pointerdown', 'touchstart'].forEach(evt => slider.addEventListener(evt, () => {
      fill.classList.add('no-anim');
      thumb.classList.add('no-anim');
    }));
    ['pointerup', 'touchend', 'mouseup'].forEach(evt => window.addEventListener(evt, () => {
      fill.classList.remove('no-anim');
      thumb.classList.remove('no-anim');
    }));

    // Set the initial position without animating in.
    fill.classList.add('no-anim'); thumb.classList.add('no-anim');
    updateSliderVisual(0);
    requestAnimationFrame(() => { fill.classList.remove('no-anim'); thumb.classList.remove('no-anim'); });

    const resetIdleTimer = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        switchState((activeIndex + 1) % MUSIC_STATES.length);
      }, IDLE_MS);
    };

    function switchState(newIndex) {
      if (newIndex === activeIndex) return;
      activeIndex = newIndex;
      slider.value = String(newIndex);
      updateSliderVisual(newIndex);
      readout.textContent = MUSIC_STATES[newIndex].label.toUpperCase();
      if (isPlaying) {
        stateAudios.forEach((audio, i) => fadeTo(audio, i === newIndex ? 1 : 0, FADE_MS));
      }
      resetIdleTimer();
    }

    slider.addEventListener('input', (e) => switchState(Number(e.target.value)));

    const setPlayingUI = (playing) => {
      musicRoot.querySelector('.icon-play').hidden = playing;
      musicRoot.querySelector('.icon-pause').hidden = !playing;
      musicRoot.querySelector('.music__play-label').textContent = playing ? 'Pause theme' : 'Play theme';
    };

    playBtn.addEventListener('click', () => {
      if (!isPlaying) {
        stateAudios.forEach(a => { a.currentTime = 0; });
        Promise.all(stateAudios.map(a => a.play().catch(() => {}))).then(() => {
          stateAudios.forEach((a, i) => manage(a, i === activeIndex ? 1 : 0));
          isPlaying = true;
          setPlayingUI(true);
          syncTimer = window.setInterval(() => {
            const reference = stateAudios[0].currentTime;
            stateAudios.forEach(a => { if (Math.abs(a.currentTime - reference) > 0.15) a.currentTime = reference; });
          }, 4000);
        });
      } else {
        stateAudios.forEach(a => a.pause());
        isPlaying = false;
        setPlayingUI(false);
        if (syncTimer) window.clearInterval(syncTimer);
      }
      resetIdleTimer();
    });

    readout.textContent = MUSIC_STATES[0].label.toUpperCase();
    resetIdleTimer();
  }

  /* ------------------------------------------------------------
     SFX list — waveform + progress, one at a time
     ------------------------------------------------------------ */
  function buildFallbackHeights(count, seed) {
    return Array.from({ length: count }, (_, i) => 0.18 + 0.75 * Math.abs(Math.sin(i * 12.9898 + seed * 78.233)));
  }
  function applyHeights(barGroups, heights) {
    barGroups.forEach(bars => bars.forEach((bar, i) => bar.style.setProperty('--h', heights[i].toFixed(3))));
  }

  async function buildWaveform(waveformEl, audioEl, seed) {
    const BAR_COUNT = 28;
    const groups = Array.from(waveformEl.querySelectorAll('.waveform__bars')).map(container => {
      container.innerHTML = '';
      const bars = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = document.createElement('span');
        bar.className = 'waveform__bar';
        container.appendChild(bar);
        bars.push(bar);
      }
      return bars;
    });
    applyHeights(groups, buildFallbackHeights(BAR_COUNT, seed));
    try {
      const src = audioEl.getAttribute('src');
      if (!src) return;
      const response = await fetch(src);
      if (!response.ok) throw new Error('audio file not found');
      const arrayBuffer = await response.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const raw = decoded.getChannelData(0);
      const blockSize = Math.max(1, Math.floor(raw.length / BAR_COUNT));
      const peaks = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        const offset = i * blockSize;
        for (let j = 0; j < blockSize; j++) sum += Math.abs(raw[offset + j] || 0);
        peaks.push(sum / blockSize);
      }
      const max = Math.max(...peaks) || 1;
      applyHeights(groups, peaks.map(p => 0.12 + 0.88 * (p / max)));
      ctx.close();
    } catch (err) { /* keep fallback shape */ }
  }

  const sfxObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const { waveform, audio, seed } = entry.target._sfxData;
            buildWaveform(waveform, audio, seed);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' })
    : null;

  document.querySelectorAll('.sfx__item').forEach((item, index) => {
    const btn = item.querySelector('.sfx__play');
    const audio = item.querySelector('audio');
    const waveform = item.querySelector('.waveform');
    const progress = item.querySelector('.waveform__progress');
    const playIcon = btn.querySelector('.icon-play');
    const pauseIcon = btn.querySelector('.icon-pause');

    markForeground(audio);

    if (sfxObserver) {
      item._sfxData = { waveform, audio, seed: index + 1 };
      sfxObserver.observe(item);
    } else {
      buildWaveform(waveform, audio, index + 1);
    }

    const setPlaying = (playing) => {
      btn.classList.toggle('is-playing', playing);
      playIcon.hidden = playing;
      pauseIcon.hidden = !playing;
    };

    const updateProgress = () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      progress.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      if (!audio.paused) requestAnimationFrame(updateProgress);
    };

    btn.addEventListener('click', () => {
      if (audio.paused) {
        document.querySelectorAll('.sfx__item audio').forEach(other => {
          if (other !== audio && !other.paused) other.pause();
        });
        manage(audio, 1);
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setPlaying(true);
        requestAnimationFrame(updateProgress);
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    audio.addEventListener('ended', () => { setPlaying(false); progress.style.clipPath = 'inset(0 100% 0 0)'; });
    audio.addEventListener('pause', () => setPlaying(false));
  });

  /* ------------------------------------------------------------
     Art grid
     ------------------------------------------------------------ */
  document.querySelectorAll('.art-block').forEach((block, blockIndex) => {
    const images = Array.from(block.querySelectorAll('.art-block__img'));
    if (images.length < 2 || prefersReducedMotion) return;
    let index = 0;
    let timer = null;
    const intervalMs = 3800;
    const staggerMs = blockIndex * 260;
    const advance = () => {
      images[index].classList.remove('is-active');
      index = (index + 1) % images.length;
      images[index].classList.add('is-active');
    };
    const start = () => { timer = window.setInterval(advance, intervalMs); };
    const stop = () => { if (timer) window.clearInterval(timer); };
    window.setTimeout(start, staggerMs);
    block.addEventListener('mouseenter', stop);
    block.addEventListener('mouseleave', start);
  });

});
