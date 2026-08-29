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
     Hero scroll cue — click to scroll, or auto-scroll after 5s idle
     ------------------------------------------------------------ */
  const scrollCue = document.getElementById('scrollCue');
  const workSection = document.getElementById('work');

  if (scrollCue && workSection) {
    const scrollToWork = () => {
      const targetY = workSection.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(targetY, 1000);
    };
    scrollCue.addEventListener('click', () => { cancelAutoScroll(); scrollToWork(); });

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
     Mode switching (Audio / Art) — background color, hero role,
     about role word, console scale animation, URL hash, and the
     scroll-cue seam color all stay in sync.
     ------------------------------------------------------------ */
  const showcase = document.querySelector('.showcase');
  const cueWindow = document.getElementById('cueWindow');
  const tabs = document.querySelectorAll('.tab');
  const heroRole = document.getElementById('heroRole');
  const aboutRoleWord = document.getElementById('aboutRoleWord');
  const consoleEl = document.querySelector('.console');

  const MODE_COPY = {
    audio: { hero: 'Audio Designer', about: 'Sound Designer' },
    art:   { hero: '3D Artist',      about: 'Game Artist' }
  };

  function getModeFromHash() {
    const h = window.location.hash.replace('#', '');
    return (h === 'audio' || h === 'art') ? h : null;
  }

  function applyModeState(mode) {
    showcase.dataset.mode = mode;
    if (cueWindow) cueWindow.dataset.mode = mode;
    tabs.forEach(t => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    if (aboutRoleWord) aboutRoleWord.textContent = MODE_COPY[mode].about;
  }

  function setMode(mode, { updateHash = true } = {}) {
    if (!showcase || showcase.dataset.mode === mode) return;

    const finish = () => {
      applyModeState(mode);
      scrambleText(heroRole, MODE_COPY[mode].hero);
      if (updateHash) history.replaceState(null, '', '#' + mode);
      if (consoleEl) requestAnimationFrame(() => consoleEl.classList.remove('is-switching'));
    };

    if (consoleEl && !prefersReducedMotion) {
      consoleEl.classList.add('is-switching');
      window.setTimeout(finish, 220);
    } else {
      finish();
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

  // Initial mode: URL hash (#audio / #art) can pre-select a mode for sharing.
  const initialMode = getModeFromHash() || 'audio';
  if (initialMode !== 'audio') applyModeState(initialMode);
  scrambleText(heroRole, MODE_COPY[initialMode].hero, 1100);

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
     Adaptive music — 5 states, all tracks loaded and played in
     sync; the slider sets the active track to full volume and
     everything else to 0. The slider itself animates smoothly to
     a new position when advanced automatically or on idle.
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
      audio.volume = 0;
      return audio;
    });

    const slider = document.getElementById('musicFader');
    const readout = document.getElementById('musicReadout');
    const playBtn = document.getElementById('musicPlay');
    slider.max = String(MUSIC_STATES.length - 1);

    let activeIndex = 0;
    let isPlaying = false;
    let idleTimer = null;
    let syncTimer = null;
    const IDLE_MS = 10000;

    const resetIdleTimer = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        animateSliderTo((activeIndex + 1) % MUSIC_STATES.length);
      }, IDLE_MS);
    };

    function rampVolumes(duration = 120) {
      const start = performance.now();
      const startVolumes = stateAudios.map(a => a.volume);
      const targets = stateAudios.map((_, i) => (i === activeIndex ? 1 : 0));
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        stateAudios.forEach((a, i) => { a.volume = startVolumes[i] + (targets[i] - startVolumes[i]) * t; });
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function setActiveIndex(newIndex) {
      if (newIndex === activeIndex) return;
      activeIndex = newIndex;
      readout.textContent = MUSIC_STATES[newIndex].label.toUpperCase();
      if (isPlaying) rampVolumes();
      resetIdleTimer();
    }

    // Smoothly animates the slider's visual position to a new index,
    // then applies the state change once it arrives (used for the
    // idle auto-advance so it doesn't just snap).
    function animateSliderTo(newIndex, duration = 500) {
      const startVal = Number(slider.value);
      if (startVal === newIndex) return;
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        slider.value = String(startVal + (newIndex - startVal) * eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          slider.value = String(newIndex);
          setActiveIndex(newIndex);
        }
      }
      requestAnimationFrame(tick);
    }

    slider.addEventListener('input', (e) => setActiveIndex(Number(e.target.value)));

    const setPlayingUI = (playing) => {
      musicRoot.querySelector('.icon-play').hidden = playing;
      musicRoot.querySelector('.icon-pause').hidden = !playing;
      musicRoot.querySelector('.music__play-label').textContent = playing ? 'Pause theme' : 'Play theme';
    };

    playBtn.addEventListener('click', () => {
      if (!isPlaying) {
        stateAudios.forEach((a, i) => {
          a.currentTime = 0;
          a.volume = i === activeIndex ? 1 : 0;
          a.play().catch(() => {});
        });
        isPlaying = true;
        setPlayingUI(true);
        syncTimer = window.setInterval(() => {
          const ref = stateAudios[activeIndex].currentTime;
          stateAudios.forEach(a => { if (Math.abs(a.currentTime - ref) > 0.15) a.currentTime = ref; });
        }, 4000);
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
     SFX list — waveform progress players
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
    } catch (err) { /* fallback shape stays in place */ }
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

    if (sfxObserver) { item._sfxData = { waveform, audio, seed: index + 1 }; sfxObserver.observe(item); }
    else buildWaveform(waveform, audio, index + 1);

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
        document.querySelectorAll('.sfx__item audio').forEach(other => { if (other !== audio && !other.paused) other.pause(); });
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
     Art grid auto-carousel
     ------------------------------------------------------------ */
  document.querySelectorAll('.art-block').forEach((block, blockIndex) => {
    const images = Array.from(block.querySelectorAll('.art-block__img'));
    if (images.length < 2 || prefersReducedMotion) return;
    let index = 0, timer = null;
    const intervalMs = 3800, staggerMs = blockIndex * 260;
    const advance = () => { images[index].classList.remove('is-active'); index = (index + 1) % images.length; images[index].classList.add('is-active'); };
    const start = () => { timer = window.setInterval(advance, intervalMs); };
    const stop = () => { if (timer) window.clearInterval(timer); };
    window.setTimeout(start, staggerMs);
    block.addEventListener('mouseenter', stop);
    block.addEventListener('mouseleave', start);
  });

  /* ------------------------------------------------------------
     Site sound — a looping background bed that ducks to 0 whenever
     a click or scroll sound plays, plus a mute toggle. The bed only
     starts after the first user interaction (browser autoplay
     policy — sound can't start on its own before that).
     ------------------------------------------------------------ */
  const SOUND_PATHS = {
    click: 'assets/audio/ui/click.mp3',
    clickEmpty: 'assets/audio/ui/click-empty.mp3',
    scroll: 'assets/audio/ui/scroll.mp3'
  };
  const BG_VOLUME = 0.32;
  const bgAudio = new Audio('assets/audio/ui/bg-ambient.mp3');
  bgAudio.loop = true;
  bgAudio.volume = 0;

  let soundEnabled = true;
  let soundUnlocked = false;
  let duckTimer = null;

  function rampBg(target, duration = 350) {
    const start = performance.now();
    const startVol = bgAudio.volume;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      bgAudio.volume = startVol + (target - startVol) * t;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function duckBackground() {
    bgAudio.volume = 0;
    if (duckTimer) window.clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => rampBg(BG_VOLUME, 400), 350);
  }

  function playOneShot(src) {
    if (!soundEnabled) return;
    const a = new Audio(src);
    a.volume = 0.55;
    a.play().catch(() => {});
    duckBackground();
  }

  function unlockSound() {
    if (soundUnlocked || !soundEnabled) return;
    soundUnlocked = true;
    bgAudio.play().then(() => rampBg(BG_VOLUME, 600)).catch(() => {});
  }
  document.addEventListener('pointerdown', unlockSound, { once: true });

  document.addEventListener('click', (e) => {
    const isInteractive = e.target.closest('button, a, input, .tab, .art-block, .dot');
    playOneShot(isInteractive ? SOUND_PATHS.click : SOUND_PATHS.clickEmpty);
  });

  let lastScrollSound = 0;
  window.addEventListener('scroll', () => {
    const now = performance.now();
    if (now - lastScrollSound > 700) {
      lastScrollSound = now;
      playOneShot(SOUND_PATHS.scroll);
    }
  }, { passive: true });

  const muteBtn = document.getElementById('soundToggle');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      muteBtn.classList.toggle('is-muted', !soundEnabled);
      muteBtn.setAttribute('aria-pressed', String(!soundEnabled));
      if (!soundEnabled) {
        bgAudio.pause();
      } else if (soundUnlocked) {
        bgAudio.play().catch(() => {});
        rampBg(BG_VOLUME, 300);
      }
    });
  }

});