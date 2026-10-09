// Brok's moods. It looks around and winks when idle, watches what you type,
// squints while it thinks, and spins or wiggles when something works. Every
// move is skipped for people who ask their device to reduce motion.

const EASE = "cubic-bezier(.2,.9,.25,1)";
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Four spins for a win. Each runs on the whole character.
const SPINS = [
  { keys: [{ transform: "perspective(400px) rotateY(0)" }, { transform: "perspective(400px) rotateY(360deg)" }], ms: 700, easing: "ease-in-out" },
  { keys: [{ transform: "rotate(0)" }, { transform: "rotate(385deg)", offset: 0.75 }, { transform: "rotate(360deg)" }], ms: 850, easing: EASE },
  { keys: [{ transform: "rotate(0)" }, { transform: "rotate(720deg)" }], ms: 900, easing: "cubic-bezier(.3,.1,.2,1)" },
  {
    keys: [
      { transform: "translateY(0) rotate(0)" },
      { transform: "translateY(-22%) rotate(180deg)", offset: 0.5 },
      { transform: "translateY(0) rotate(360deg)" },
    ],
    ms: 800,
    easing: "ease-in-out",
  },
];

// Four wiggles for small moments.
const WIGGLES = [
  { keys: ["scale(1,1)", "scale(1.15,.85)", "scale(.9,1.1)", "scale(1.05,.95)", "scale(1,1)"], ms: 600 },
  { keys: ["rotate(0)", "rotate(-12deg)", "rotate(10deg)", "rotate(-6deg)", "rotate(3deg)", "rotate(0)"], ms: 600 },
  { keys: ["translateY(0)", "translateY(-14%)", "translateY(0)", "translateY(-6%)", "translateY(0)"], ms: 600 },
  { keys: ["translateX(0)", "translateX(-4%)", "translateX(4%)", "translateX(-4%)", "translateX(3%)", "translateX(-2%)", "translateX(0)"], ms: 420 },
];

// The eyes sit near the right edge, so they can travel further left than right.
const LOOK_LEFT = 4;
const LOOK_RIGHT = 1;
const LOOK_Y = 1.6;

export function createCharacter(svg) {
  const eyes = svg.querySelector(".char-eyes");
  const lids = [...svg.querySelectorAll(".eye-lid")];
  let squinting = false;
  let busy = null;
  let timer = 0;
  let quietUntil = 0;

  const alive = () => svg.isConnected;

  function look(x = 0, y = 0) {
    eyes.style.transform = `translate(${x * (x < 0 ? LOOK_LEFT : LOOK_RIGHT)}px, ${y * LOOK_Y}px)`;
  }

  function lidsTo(scale) {
    lids.forEach((lid) => {
      lid.style.transform = `scaleY(${scale})`;
    });
  }

  function blink(which = "both") {
    if (reduced() || squinting) return;
    const targets = which === "left" ? [lids[0]] : which === "right" ? [lids[1]] : lids;
    targets.forEach((lid) =>
      lid.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.12)" }, { transform: "scaleY(1)" }], { duration: 220, easing: "ease-in-out" }),
    );
  }

  function play(move) {
    if (reduced() || !alive()) return;
    busy?.cancel();
    busy = svg.animate(move.keys.map((transform) => (typeof transform === "string" ? { transform } : transform)), {
      duration: move.ms,
      easing: move.easing || "ease-in-out",
    });
  }

  function idle() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!alive()) return;
      if (!document.hidden && Date.now() > quietUntil && !squinting && !reduced()) {
        const roll = Math.random();
        if (roll < 0.55) {
          look(Math.random() * 2 - 1, Math.random() * 2 - 1);
          window.setTimeout(() => alive() && Date.now() > quietUntil && look(0, 0), 900 + Math.random() * 900);
        } else if (roll < 0.8) {
          blink(Math.random() < 0.5 ? "left" : "right");
        } else {
          blink();
        }
      }
      idle();
    }, 2600 + Math.random() * 3200);
  }

  idle();

  return {
    look,
    // Eyes toward a point on the screen, like the cursor you are typing at.
    lookAt(clientX, clientY) {
      quietUntil = Date.now() + 2500;
      const box = svg.getBoundingClientRect();
      const dx = clientX - (box.left + box.width / 2);
      const dy = clientY - (box.top + box.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      look(Math.max(-1, Math.min(1, dx / 320)), Math.max(-1, Math.min(1, dy / Math.max(len, 160))));
    },
    rest() {
      quietUntil = 0;
      look(0, 0);
    },
    wink: () => blink(Math.random() < 0.5 ? "left" : "right"),
    squint(on) {
      squinting = on;
      lidsTo(on ? 0.45 : 1);
    },
    spin() {
      this.squint(false);
      play(pick(SPINS));
    },
    wiggle() {
      play(pick(WIGGLES));
    },
    stop() {
      window.clearTimeout(timer);
    },
  };
}
