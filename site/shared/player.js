// Play, pause, slider, real/slow speed and an optional blip per pass. Expects data-play, data-slider,
// data-lvl, data-speed and data-sound inside root.
let audio = null;
let sound = (() => { try { return localStorage.getItem("ncm-sound") === "on"; } catch { return false; } })();

// A relay-like click plus a short square beep, both rising per pass; the last pass double-clicks.
function blip(k, n) {
  if (!sound) return;
  audio ??= new AudioContext();
  const t = audio.currentTime, last = k === n - 1;
  noise(t, 0.012, 1800 + k * 120);
  tone(t, 220 * 2 ** (k / 12), last ? 0.12 : 0.03);
  if (last) noise(t + 0.07, 0.012, 3200);
}

function tone(t, hz, len) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = "square";
  o.frequency.value = hz;
  g.gain.setValueAtTime(0.025, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + len + 0.02);
}

function noise(t, len, hz) {
  const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * len), audio.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  src.buffer = buf;
  f.type = "bandpass";
  f.frequency.value = hz;
  f.Q.value = 4;
  g.gain.value = 0.5;
  src.connect(f).connect(g).connect(audio.destination);
  src.start(t);
}

export function player(root, draw, slowMs = 420) {
  const $ = (s) => root.querySelector(`[data-${s}]`);
  let n = 0, cur = -1, runMs = 0, speed = "real", timer = null;

  const show = (k) => {
    cur = k;
    $("slider").value = String(k + 1);
    $("lvl").textContent = `pass ${k + 1} of ${n}`;
    draw(k);
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
    $("play").textContent = "play";
  };
  const play = () => {
    stop();
    let k = cur < 0 || cur >= n - 1 ? 0 : cur;
    show(k);
    blip(k, n);
    $("play").textContent = "pause";
    // The graph only reports the total time, so real speed splits it evenly.
    timer = setInterval(() => { if (++k >= n) return stop(); show(k); blip(k, n); }, speed === "real" ? runMs / n : slowMs);
  };
  const label = () => {
    $("sound").textContent = sound ? "sound on" : "sound off";
    $("sound").setAttribute("aria-pressed", String(sound));
  };

  $("play").addEventListener("click", () => (timer ? stop() : play()));
  $("slider").addEventListener("input", () => { stop(); show(+$("slider").value - 1); });
  $("sound").addEventListener("click", () => {
    sound = !sound;
    try { localStorage.setItem("ncm-sound", sound ? "on" : "off"); } catch {}
    label();
    blip(11, 12);
  });
  root.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => {
    speed = b.dataset.speed;
    root.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (n) { cur = -1; play(); }
  }));
  label();

  return {
    start(count, ms) {
      n = count;
      runMs = ms;
      cur = -1;
      $("slider").max = String(n);
      $("slider").disabled = $("play").disabled = false;
      play();
    },
  };
}
