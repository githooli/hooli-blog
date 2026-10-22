/**
 * hooli.cc 原生音乐播放器
 *
 * 为什么不用网易云 iframe：
 *   1. 网易云对手机 UA 返回空的外链页面（逼用户装 App）
 *   2. 播放接口 /api/song/enhance/player/url 屏蔽数据中心 IP
 * 所以改成自建播放器 + Worker 解析音频地址（302 到 CDN）。
 */
(() => {
  const API = 'https://auth.hooli.cc/music/audio';

  const fmt = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // 同一时间只播一首
  let currentCard = null;

  const stopOthers = (card) => {
    if (currentCard && currentCard !== card) {
      const audio = currentCard.querySelector('.mplayer__audio');
      const icon = currentCard.querySelector('.mplayer__icon');
      audio.pause();
      icon.textContent = '▶';
      currentCard.classList.remove('is-playing');
    }
    currentCard = card;
  };

  const initCard = (card) => {
    if (card.dataset.ready === '1') return;
    card.dataset.ready = '1';

    const id = card.dataset.id;
    const audio = card.querySelector('.mplayer__audio');
    const btn = card.querySelector('.mplayer__btn');
    const icon = card.querySelector('.mplayer__icon');
    const cur = card.querySelector('.mplayer__time--cur');
    const dur = card.querySelector('.mplayer__time--dur');
    const track = card.querySelector('.mplayer__track');
    const progress = card.querySelector('.mplayer__progress');

    // 只在第一次点击时才加载音频，避免页面加载就请求一堆
    const ensureSource = () => {
      if (!audio.src) {
        audio.src = `${API}/${id}`;
        audio.load();
      }
    };

    btn.addEventListener('click', () => {
      if (!audio.src) ensureSource();

      if (audio.paused) {
        stopOthers(card);
        audio.play().catch(() => {
          icon.textContent = '▶';
          card.classList.remove('is-playing');
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('playing', () => {
      icon.textContent = '❚❚';
      card.classList.add('is-playing');
    });

    audio.addEventListener('pause', () => {
      icon.textContent = '▶';
      card.classList.remove('is-playing');
    });

    audio.addEventListener('loadedmetadata', () => {
      dur.textContent = fmt(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      cur.textContent = fmt(audio.currentTime);
      if (audio.duration) {
        progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      }
    });

    audio.addEventListener('ended', () => {
      icon.textContent = '▶';
      card.classList.remove('is-playing');
      progress.style.width = '0%';
      cur.textContent = '0:00';
    });

    audio.addEventListener('error', () => {
      icon.textContent = '▶';
      card.classList.remove('is-playing');
      card.classList.add('is-error');
    });

    // 点击进度条跳转
    track.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      audio.currentTime = ratio * audio.duration;
    });

    // 全页只允许一首在播
    audio.addEventListener('play', () => stopOthers(card));
  };

  const boot = () => {
    document.querySelectorAll('.mplayer').forEach(initCard);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
