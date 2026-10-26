// Play, pause, slider and real/slow speed for a list of passes. Expects data-play, data-slider,
// data-lvl and data-speed buttons inside root.
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
    $("play").textContent = "pause";
    // The graph only reports the total time, so real speed splits it evenly.
    timer = setInterval(() => { if (++k >= n) return stop(); show(k); }, speed === "real" ? runMs / n : slowMs);
  };

  $("play").addEventListener("click", () => (timer ? stop() : play()));
  $("slider").addEventListener("input", () => { stop(); show(+$("slider").value - 1); });
  root.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => {
    speed = b.dataset.speed;
    root.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (n) { cur = -1; play(); }
  }));

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
