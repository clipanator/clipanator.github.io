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
     Eased scrolling helper — used by the scroll cue instead of
     relying on the browser's native smooth-scroll, which can feel
     abrupt. This eases in and out over a fixed duration.
     ------------------------------------------------------------ */
  function smoothScrollTo(targetY, duration = 1000) {
    const startY = window.scrollY;
    const diff = targetY - startY;
    if (prefersReducedMotion) {
      window.scrollTo(0, targetY);
      return;
    }
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
     Hero scroll cue — click to scroll, or auto-scroll after 5s
     of inactivity (cancelled the moment the person scrolls or
     clicks on their own).
     ------------------------------------------------------------ */
  const scrollCue = document.getElementById('scrollCue');
  const workSection = document.getElementById('work');

  if (scrollCue && workSection) {
    const scrollToWork = () => {
      const targetY = workSection.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(targetY, 1000);
    };

    scrollCue.addEventListener('click', () => {
      cancelAutoScroll();
      scrollToWork();
    });

    let autoScrollTimer = window.setTimeout(() => {
      scrollToWork();
    }, 5000);

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
     Hero parallax — the background video scrolls slower than the page
     ------------------------------------------------------------ */
  const heroWrap = document.getElementById('heroVideoWrap');
  if (heroWrap && !prefersReducedMotion) {
    const speed = 0.4; // < 1 means the video moves slower than the page
    let ticking = false;

    const updateParallax = () => {
      const offset = window.scrollY * speed;
      heroWrap.style.transform = `translate3d(0, ${offset}px, 0)`;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     Text scramble — unjumbles a string from random characters.
     Used for the hero role label on load and whenever it changes.
     ------------------------------------------------------------ */
  function scrambleText(el, target, duration = 900) {
    if (!el) return;
    if (prefersReducedMotion) {
      el.textContent = target;
      return;
    }
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_/[]{}=+*^?#';
    if (el._scrambleFrame) cancelAnimationFrame(el._scrambleFrame);
    const start = performance.now();
    const length = target.length;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const revealCount = Math.floor(progress * length);
      let out = '';
      for (let i = 0; i < length; i++) {
        if (i < revealCount || target[i] === ' ') {
          out += target[i];
        } else {
          out += charset[Math.floor(Math.random() * charset.length)];
        }
      }
      el.textContent = out;
      if (progress < 1) {
        el._scrambleFrame = requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }
    el._scrambleFrame = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------
     Mode switching — Audio / Art tabs drive the background color,
     the hero role label, the about-section role word, and a soft
     scale animation on the console so content changes don't snap.
     ------------------------------------------------------------ */
  const showcase = document.querySelector('.showcase');
  const tabs = document.querySelectorAll('.tab');
  const heroRole = document.getElementById('heroRole');
  const aboutRoleWord = document.getElementById('aboutRoleWord');
  const consoleEl = document.querySelector('.console');

  const MODE_COPY = {
    audio: { hero: 'Audio Designer', about: 'Sound Designer' },
    art:   { hero: '3D Artist',      about: 'Game Artist' }
  };

  function setMode(mode) {
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
      if (consoleEl) {
        requestAnimationFrame(() => consoleEl.classList.remove('is-switching'));
      }
    };

    if (consoleEl && !prefersReducedMotion) {
      consoleEl.classList.add('is-switching');
      window.setTimeout(applyChange, 220);
    } else {
      applyChange();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  // Entrance scramble for the hero role label on load.
  scrambleText(heroRole, MODE_COPY.audio.hero, 1100);

  /* ------------------------------------------------------------
     Carousel — supports multiple slides, currently greyed out
     because there is only one project. Add more <article class="slide">
     blocks in index.html and this will enable itself automatically.
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
     Adaptive music — five named states, snap-switched with a
     short crossfade, driven by a stepped slider. Auto-advances
     to the next state after 10s of no interaction.
     ------------------------------------------------------------ */
  const musicRoot = document.querySelector('.music');
  if (musicRoot) {
    const MUSIC_STATES = [
      { label: 'Main',      src: 'assets/audio/music/layer_1.mp3' },
      { label: 'Shop',      src: 'assets/audio/music/layer_2.mp3' },
      { label: 'Boss',      src: 'assets/audio/music/layer_3.mp3' },
      { label: 'Loading',   src: 'assets/audio/music/layer_4.mp3' },
      // Only 4 files were provided for 5 states — Game Over reuses
      // Loading's track for now. Point this at a real layer_5.mp3
      // once you have one and it'll pick it up automatically.
      { label: 'Game Over', src: 'assets/audio/music/layer_4.mp3' }
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
    const IDLE_MS = 10000;
    const FADE_MS = 400;

    const resetIdleTimer = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        switchState((activeIndex + 1) % MUSIC_STATES.length);
      }, IDLE_MS);
    };

    function switchState(newIndex) {
      if (newIndex === activeIndex) return;
      const oldAudio = stateAudios[activeIndex];
      const newAudio = stateAudios[newIndex];
      activeIndex = newIndex;
      slider.value = String(newIndex);
      readout.textContent = MUSIC_STATES[newIndex].label.toUpperCase();

      if (isPlaying) {
        newAudio.currentTime = 0;
        newAudio.play().catch(() => {});
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / FADE_MS, 1);
          oldAudio.volume = 1 - t;
          newAudio.volume = t;
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            oldAudio.pause();
            oldAudio.currentTime = 0;
            oldAudio.volume = 0;
          }
        };
        requestAnimationFrame(tick);
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
        const active = stateAudios[activeIndex];
        active.currentTime = 0;
        active.volume = 1;
        active.play().catch(() => {});
        isPlaying = true;
        setPlayingUI(true);
      } else {
        stateAudios.forEach(a => a.pause());
        isPlaying = false;
        setPlayingUI(false);
      }
      resetIdleTimer();
    });

    readout.textContent = MUSIC_STATES[0].label.toUpperCase();
    resetIdleTimer();
  }

  /* ------------------------------------------------------------
     SFX list — independent one-shot players with a real,
     decoded-audio waveform and a playback progress overlay.
     ------------------------------------------------------------ */
  function buildFallbackHeights(count, seed) {
    return Array.from({ length: count }, (_, i) =>
      0.18 + 0.75 * Math.abs(Math.sin(i * 12.9898 + seed * 78.233))
    );
  }

  function applyHeights(barGroups, heights) {
    barGroups.forEach(bars => {
      bars.forEach((bar, i) => bar.style.setProperty('--h', heights[i].toFixed(3)));
    });
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
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(raw[offset + j] || 0);
        }
        peaks.push(sum / blockSize);
      }
      const max = Math.max(...peaks) || 1;
      const normalized = peaks.map(p => 0.12 + 0.88 * (p / max));
      applyHeights(groups, normalized);
      ctx.close();
    } catch (err) {
      // Real audio not available yet — the fallback shape stays in place.
    }
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
        // Stop any other SFX so only one plays at a time.
        document.querySelectorAll('.sfx__item audio').forEach(other => {
          if (other !== audio && !other.paused) other.pause();
        });
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setPlaying(true);
        requestAnimationFrame(updateProgress);
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    audio.addEventListener('ended', () => {
      setPlaying(false);
      progress.style.clipPath = 'inset(0 100% 0 0)';
    });
    audio.addEventListener('pause', () => setPlaying(false));
  });

  /* ------------------------------------------------------------
     Art grid — each block auto-carousels its images on a timer,
     and pauses while hovered so the description stays readable.
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
