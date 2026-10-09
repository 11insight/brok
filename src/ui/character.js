// Brok, animated by hand in code. The body is a soft shape that squashes,
// stretches and leans; it crouches before a jump, falls with gravity and
// settles on springs after it lands. The eyes change shape: open, squinting,
// happy arcs, wide, sleepy. Wins throw sparkles. Nothing moves for people who
// ask their device to reduce motion.

const SVGNS = "http://www.w3.org/2000/svg";
const A = 24.8; // bottom tip, the point Brok stands on
const TOP = 3;
const MID = 16;
const EYES = [
  [19.5, 12.8],
  [24.5, 10],
];
const GRAVITY = 150;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function spring(value, k = 170, c = 14) {
  return { x: value, v: 0, to: value, k, c };
}

function step(s, dt) {
  s.v += (-s.k * (s.x - s.to) - s.c * s.v) * dt;
  s.x += s.v * dt;
}

export function createCharacter(svg, { scale = 1 } = {}) {
  const rig = svg.querySelector(".char-rig");
  const body = svg.querySelector(".char-body");
  const clip = svg.querySelector(".char-clip");
  const slots = [...svg.querySelectorAll(".eye-slot")];
  const think = svg.querySelector(".char-think");
  const thinkDots = [...think.querySelectorAll("rect")];
  const shadow = svg.querySelector(".char-shadow");
  const fx = svg.querySelector(".char-fx");

  const s = {
    sy: spring(1, 220, 12), // squash and stretch
    lean: spring(0, 120, 12), // top of the body leans this far
    rot: spring(0, 90, 11), // spins
    flip: spring(0, 60, 10), // coin flip, in degrees
    lx: spring(0, 160, 18), // eyes look
    ly: spring(0, 160, 18),
    open: spring(1, 400, 26), // eyelids
    wide: spring(1, 200, 14),
    happy: spring(0, 120, 16),
    think: spring(0, 90, 16),
  };
  const hop = { y: 0, v: 0, air: false };
  let shake = 0;
  let squinting = false;
  let thinking = false;
  let sleepy = false;
  let lastActive = performance.now();
  let blinkAt = performance.now() + 2500;
  let lookAt = performance.now() + 3000;
  let quietUntil = 0;
  let onLand = null;
  let raf = 0;
  let last = performance.now();
  const sparks = [];

  // Where a point of the resting shape goes once the body bends.
  function deform(x, y) {
    const sy = s.sy.x;
    const t = (A - y) / (A - TOP);
    const width = (1 / Math.sqrt(Math.max(0.4, sy))) * Math.cos((s.flip.x * Math.PI) / 180);
    return [MID + (x - MID) * width + s.lean.x * t, A - (A - y) * sy];
  }

  function bodyPath() {
    const sy = s.sy.x;
    const w = Math.abs(Math.cos((s.flip.x * Math.PI) / 180)) / Math.sqrt(Math.max(0.4, sy));
    const rx = Math.max(0.01, 3 * w);
    const ry = Math.max(0.01, 3 * sy);
    const p = [
      [5, 3], [27, 3], [27, 17.2], [25.5, 19.8], [17.5, 24.4], [14.5, 24.4], [6.5, 19.8], [5, 17.2],
    ].map(([x, y]) => deform(x, y).map((n) => n.toFixed(2)));
    const sweep = Math.cos((s.flip.x * Math.PI) / 180) < 0 ? 0 : 1;
    return `M${p[0]}L${p[1]}L${p[2]}A${rx} ${ry} 0 0 ${sweep} ${p[3]}L${p[4]}A${rx} ${ry} 0 0 ${sweep} ${p[5]}L${p[6]}A${rx} ${ry} 0 0 ${sweep} ${p[7]}Z`;
  }

  function render(now) {
    const d = bodyPath();
    body.setAttribute("d", d);
    clip.setAttribute("d", d);
    const facing = Math.cos((s.flip.x * Math.PI) / 180);
    const open = Math.max(0.06, s.open.x);
    const wide = s.wide.x;
    slots.forEach((slot, i) => {
      const [x, y] = deform(EYES[i][0], EYES[i][1]);
      const lx = s.lx.x * (s.lx.x < 0 ? 3.5 : 0.9);
      const ly = s.ly.x * 1.4;
      slot.setAttribute(
        "transform",
        `translate(${(x + lx * facing).toFixed(2)} ${(y + ly).toFixed(2)}) rotate(${(-30 + s.lean.x * 3).toFixed(1)}) scale(${(facing * wide).toFixed(3)} ${wide.toFixed(3)})`,
      );
      slot.style.opacity = facing < 0.15 ? "0" : "1";
      const rect = slot.querySelector(".eye-open");
      const h = 2.5 * open;
      rect.setAttribute("height", h.toFixed(2));
      rect.setAttribute("y", (-h / 2 + (sleepy ? 0.5 * (1 - open) : 0)).toFixed(2));
      rect.setAttribute("rx", Math.min(1.25, h / 2).toFixed(2));
      rect.style.opacity = String(1 - s.happy.x);
      slot.querySelector(".eye-happy").style.opacity = String(s.happy.x);
    });
    const tilt = s.rot.x + shake * 4;
    rig.setAttribute("transform", `translate(${(shake * 0.8).toFixed(2)} ${hop.y.toFixed(2)}) rotate(${tilt.toFixed(1)} ${MID} 14)`);
    const air = Math.min(1, -hop.y / 10);
    shadow.setAttribute("transform", `translate(${MID} 26) scale(${(1 - air * 0.55) * (1 / Math.sqrt(s.sy.x))} 1) translate(${-MID} -26)`);
    shadow.style.opacity = String(0.35 * (1 - air * 0.6));
    think.setAttribute("opacity", s.think.x.toFixed(2));
    thinkDots.forEach((dot, i) => {
      const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(now / 260 - i * 0.9));
      dot.style.opacity = pulse.toFixed(2);
    });
  }

  function burst(count, { x = MID, y = 14, speed = 26, up = 18 } = {}) {
    if (reduced()) return;
    for (let i = 0; i < count; i += 1) {
      const star = Math.random() < 0.55;
      const node = document.createElementNS(SVGNS, star ? "path" : "rect");
      const size = 0.5 + Math.random() * 0.9;
      if (star) {
        node.setAttribute("d", `M0 ${-size * 1.6}L${size * 0.4} ${-size * 0.4}L${size * 1.6} 0L${size * 0.4} ${size * 0.4}L0 ${size * 1.6}L${-size * 0.4} ${size * 0.4}L${-size * 1.6} 0L${-size * 0.4} ${-size * 0.4}Z`);
      } else {
        node.setAttribute("x", String(-size / 2));
        node.setAttribute("y", String(-size));
        node.setAttribute("width", String(size));
        node.setAttribute("height", String(size * 2));
        node.setAttribute("rx", String(size * 0.3));
      }
      node.setAttribute("class", Math.random() < 0.6 ? "spark" : "spark spark-light");
      fx.append(node);
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.5 + Math.random() * 0.7);
      sparks.push({ node, x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - up, r: Math.random() * 360, vr: (Math.random() - 0.5) * 720, life: 0, max: 0.8 + Math.random() * 0.6 });
    }
  }

  function stepSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const p = sparks[i];
      p.life += dt;
      p.vy += GRAVITY * 0.35 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      const fade = Math.max(0, 1 - p.life / p.max);
      p.node.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.r.toFixed(0)}) scale(${(0.4 + fade * 0.6).toFixed(2)})`);
      p.node.style.opacity = fade.toFixed(2);
      if (p.life >= p.max) {
        p.node.remove();
        sparks.splice(i, 1);
      }
    }
  }

  function jump(v, then) {
    hop.v = -v;
    hop.air = true;
    s.sy.to = 1;
    s.sy.v += 4;
    onLand = then || null;
  }

  function idle(now) {
    if (now - lastActive > 25000 && !sleepy && !thinking) {
      sleepy = true;
      s.open.to = 0.35;
    }
    const breathe = sleepy ? 0.03 * Math.sin(now / 900) : 0.016 * Math.sin(now / 520);
    if (!hop.air && !busy) s.sy.to = 1 + breathe;
    if (now > blinkAt && !squinting && !sleepy) {
      const one = Math.random() < 0.3 ? Math.floor(Math.random() * 2) : -1;
      blink(one);
      blinkAt = now + 2500 + Math.random() * 4500;
    }
    if (now > lookAt && now > quietUntil && !thinking && !sleepy) {
      if (Math.random() < 0.6) {
        s.lx.to = Math.random() * 2 - 1;
        s.ly.to = Math.random() * 2 - 1;
        s.lean.to = s.lx.to * 0.5;
      } else {
        s.lx.to = 0;
        s.ly.to = 0;
        s.lean.to = 0;
      }
      lookAt = now + 1800 + Math.random() * 2600;
    }
  }

  // One eye or both close and open. A wink is one eye.
  let winking = -1;
  let winkUntil = 0;
  function blink(which = -1) {
    winking = which;
    winkUntil = performance.now() + 130;
  }

  let busy = false;
  function frame(now) {
    if (!svg.isConnected) return;
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    idle(now);
    Object.values(s).forEach((sp) => step(sp, dt));
    if (hop.air) {
      hop.v += GRAVITY * dt;
      hop.y += hop.v * dt;
      if (hop.y >= 0) {
        hop.y = 0;
        hop.air = false;
        s.sy.v -= Math.min(9, hop.v * 0.12);
        const done = onLand;
        onLand = null;
        done?.();
      }
    }
    shake *= Math.pow(0.02, dt);
    if (Math.abs(shake) > 0.02) shake = -shake;
    // Per eye blink without fighting the open spring.
    const closing = now < winkUntil;
    slots.forEach((slot, i) => slot.classList.toggle("is-shut", closing && (winking === -1 || winking === i)));
    stepSparks(dt);
    render(now);
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    lastActive = performance.now();
    if (sleepy) {
      sleepy = false;
      s.open.to = squinting ? 0.45 : 1;
      s.wide.v += 3;
    }
  }

  function happyFor(ms) {
    s.happy.to = 1;
    window.setTimeout(() => {
      s.happy.to = 0;
    }, ms);
  }

  function crouchThen(fn) {
    busy = true;
    s.sy.to = 0.74;
    window.setTimeout(() => {
      busy = false;
      fn();
    }, 150);
  }

  // Four ways to celebrate.
  const WINS = [
    function hopSpin() {
      happyFor(1500);
      crouchThen(() => {
        jump(36, () => burst(14, { y: 22, up: 12 }));
        s.rot.to += 360;
      });
    },
    function coinFlip() {
      happyFor(1500);
      crouchThen(() => {
        jump(32, () => burst(10, { y: 22, up: 10 }));
        s.flip.to += 360;
      });
    },
    function bounces() {
      happyFor(2000);
      crouchThen(() =>
        jump(26, () => {
          burst(5, { y: 23, speed: 16, up: 8 });
          jump(17, () => {
            burst(4, { y: 23, speed: 12, up: 6 });
            jump(10, () => burst(8, { y: 18, speed: 22 }));
          });
        }),
      );
    },
    function twirl() {
      happyFor(1600);
      s.rot.k = 50;
      s.rot.to += 720;
      s.lean.v += 25;
      burst(16, { y: 12, speed: 30, up: 6 });
      window.setTimeout(() => {
        s.rot.k = 90;
      }, 1600);
    },
  ];

  // Four smaller moves.
  const WIGGLES = [
    function jelly() {
      s.sy.v += 7;
    },
    function headShake() {
      [26, -30, 24, -16].forEach((v, i) => window.setTimeout(() => (s.lean.v += v), i * 110));
    },
    function surprised() {
      s.wide.to = 1.35;
      if (!hop.air) jump(14);
      window.setTimeout(() => (s.wide.to = 1), 700);
    },
    function shiver() {
      shake = 1;
    },
  ];

  if (reduced()) {
    render(performance.now());
  } else {
    raf = requestAnimationFrame(frame);
  }

  function normalize() {
    // Keep angles small after full turns so springs never unwind backwards.
    for (const key of ["rot", "flip"]) {
      const sp = s[key];
      const turns = Math.round(sp.to / 360) * 360;
      if (Math.abs(sp.x - sp.to) < 1 && turns) {
        sp.x -= turns;
        sp.to -= turns;
      }
    }
  }
  const normalizer = window.setInterval(normalize, 1000);

  function still() {
    if (reduced()) render(performance.now());
  }

  // Dev only: lets a test play one move by number. Not in the live build.
  if (import.meta.env?.DEV) svg.__brok = { win: (i) => WINS[i](), wiggle: (i) => WIGGLES[i](), sleep: () => (lastActive = 0) };

  return {
    lookAt(clientX, clientY) {
      wake();
      quietUntil = performance.now() + 2500;
      const box = svg.getBoundingClientRect();
      const dx = clientX - (box.left + box.width / 2);
      const dy = clientY - (box.top + box.height / 2);
      s.lx.to = Math.max(-1, Math.min(1, dx / 320));
      s.ly.to = Math.max(-1, Math.min(1, dy / Math.max(Math.hypot(dx, dy), 160)));
      s.lean.to = s.lx.to * 0.6;
      still();
    },
    rest() {
      quietUntil = 0;
      s.lx.to = 0;
      s.ly.to = 0;
      s.lean.to = 0;
      still();
    },
    squint(on) {
      wake();
      squinting = on;
      s.open.to = on ? 0.45 : 1;
      if (reduced()) s.open.x = s.open.to;
      still();
    },
    think(on) {
      wake();
      thinking = on;
      s.think.to = on ? 1 : 0;
      s.rot.to = Math.round(s.rot.to / 360) * 360 + (on ? 7 : 0);
      this.squint(on);
      if (reduced()) s.think.x = s.think.to;
      still();
    },
    spin() {
      wake();
      thinking = false;
      s.think.to = 0;
      squinting = false;
      s.open.to = 1;
      s.rot.to = Math.round(s.rot.to / 360) * 360;
      if (reduced()) return still();
      pick(WINS)();
    },
    wiggle() {
      wake();
      if (reduced()) return;
      pick(WIGGLES)();
    },
    stop() {
      cancelAnimationFrame(raf);
      window.clearInterval(normalizer);
    },
  };
}
