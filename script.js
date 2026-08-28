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
     Tabs — Audio / Art
     ------------------------------------------------------------ */
  const showcase = document.querySelector('.showcase');
  const tabs = document.querySelectorAll('.tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      if (showcase.dataset.mode === mode) return;

      showcase.dataset.mode = mode;
      tabs.forEach(t => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
    });
  });

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
      // Only one project for now — controls stay disabled.
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  /* ------------------------------------------------------------
     Adaptive music fader
     Crossfades between N audio "state" layers using one slider,
     mimicking a Wwise-style blend container. All layers stay
     loaded and time-synced; only their volumes change.
     ------------------------------------------------------------ */
  const musicRoot = document.querySelector('.music');
  if (musicRoot) {
    const layers = Array.from(musicRoot.querySelectorAll('.music__layer'));
    const slider = document.getElementById('musicFader');
    const readout = document.getElementById('musicReadout');
    const playBtn = document.getElementById('musicPlay');
    let isPlaying = false;
    let syncTimer = null;

    const applyCrossfade = (value) => {
      if (!layers.length) return;
      const segments = layers.length - 1;
      if (segments <= 0) {
        layers[0].volume = 1;
        return;
      }
      const pos = (value / 100) * segments;
      const seg = Math.min(Math.floor(pos), segments - 1);
      const frac = pos - seg;

      layers.forEach((layer, i) => {
        if (i === seg) layer.volume = 1 - frac;
        else if (i === seg + 1) layer.volume = frac;
        else layer.volume = 0;
      });

      const dominantIndex = frac < 0.5 ? seg : Math.min(seg + 1, segments);
      const label = layers[dominantIndex].dataset.label || '—';
      readout.textContent = `${label.toUpperCase()} · ${Math.round(value)}%`;
    };

    applyCrossfade(Number(slider.value));

    slider.addEventListener('input', (e) => applyCrossfade(Number(e.target.value)));

    const setPlaying = (playing) => {
      isPlaying = playing;
      musicRoot.querySelector('.icon-play').hidden = playing;
      musicRoot.querySelector('.icon-pause').hidden = !playing;
      musicRoot.querySelector('.music__play-label').textContent = playing ? 'Pause theme' : 'Play theme';
    };

    playBtn.addEventListener('click', () => {
      if (!isPlaying) {
        layers.forEach(layer => { layer.currentTime = layers[0].currentTime || 0; });
        Promise.all(layers.map(layer => layer.play().catch(() => {}))).then(() => {
          setPlaying(true);
          // Periodically re-sync layers so long loops don't drift apart.
          syncTimer = window.setInterval(() => {
            const reference = layers[0].currentTime;
            layers.forEach(layer => {
              if (Math.abs(layer.currentTime - reference) > 0.15) {
                layer.currentTime = reference;
              }
            });
          }, 4000);
        });
      } else {
        layers.forEach(layer => layer.pause());
        setPlaying(false);
        if (syncTimer) window.clearInterval(syncTimer);
      }
    });
  }

  /* ------------------------------------------------------------
     SFX list — independent one-shot players
     ------------------------------------------------------------ */
  document.querySelectorAll('.sfx__item').forEach(item => {
    const btn = item.querySelector('.sfx__play');
    const audio = item.querySelector('audio');
    const playIcon = btn.querySelector('.icon-play');
    const pauseIcon = btn.querySelector('.icon-pause');

    const setPlaying = (playing) => {
      btn.classList.toggle('is-playing', playing);
      playIcon.hidden = playing;
      pauseIcon.hidden = !playing;
    };

    btn.addEventListener('click', () => {
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    audio.addEventListener('ended', () => setPlaying(false));
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

    const start = () => {
      timer = window.setInterval(advance, intervalMs);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
    };

    window.setTimeout(start, staggerMs);
    block.addEventListener('mouseenter', stop);
    block.addEventListener('mouseleave', start);
  });

});
