// Brok in 3D. The logo is extruded into a glossy solid with rounded edges,
// lit like a studio product shot. It has the same moods as the drawn Brok:
// looks at your cursor, blinks, squints, thinks, and celebrates with real 3D
// spins and sparkles. Loaded only when you pick 3D in Settings.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const BODY = [
  [5, 3], [27, 3], [27, 17.2], [25.5, 19.8], [17.5, 24.4], [14.5, 24.4], [6.5, 19.8], [5, 17.2],
];
const EYES = [
  [19.5, 12.8],
  [24.5, 10],
];
const CENTER = [16, 14];
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

// Logo coordinates are y down; three is y up. Center on the body.
const toWorld = (x, y) => [x - CENTER[0], -(y - CENTER[1])];

function bodyShape() {
  const shape = new THREE.Shape();
  const p = BODY.map(([x, y]) => toWorld(x, y));
  shape.moveTo(...p[0]);
  shape.lineTo(...p[1]);
  shape.lineTo(...p[2]);
  shape.quadraticCurveTo(...toWorld(27, 19.2), ...p[3]);
  shape.lineTo(...p[4]);
  shape.quadraticCurveTo(...toWorld(16, 25.4), ...p[5]);
  shape.lineTo(...p[6]);
  shape.quadraticCurveTo(...toWorld(5, 19.2), ...p[7]);
  shape.lineTo(...p[0]);
  return shape;
}

function pillShape(w, h) {
  const r = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -r);
  shape.lineTo(w / 2 - r, -r);
  shape.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-w / 2 + r, r);
  shape.absarc(-w / 2 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  return shape;
}

function accent() {
  return getComputedStyle(document.documentElement).getPropertyValue("--indigo").trim() || "#d9611c";
}

export function createCharacter3D(host) {
  const size = host.clientWidth || 128;
  const pad = 2.2; // the canvas is bigger than Brok so spins and hops never clip
  const canvas = document.createElement("canvas");
  canvas.className = "brok-3d-canvas";
  canvas.style.width = canvas.style.height = `${size * pad}px`;
  host.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(size * pad, size * pad, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  camera.position.set(0, 1.5, 96);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(-30, 40, 60);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

  // The body, extruded with soft beveled edges.
  const depth = 3.2;
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape(), {
    depth,
    bevelEnabled: true,
    bevelThickness: 1.1,
    bevelSize: 0.9,
    bevelSegments: 8,
    curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -depth / 2);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: accent(), roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  // Eyes sit on the front face. Each has an open pill and a happy arc.
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0d, roughness: 0.15, clearcoat: 1 });
  const pillGeo = new THREE.ExtrudeGeometry(pillShape(4.4, 2.5), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 3 });
  const arcGeo = new THREE.TorusGeometry(1.5, 0.42, 10, 24, Math.PI);
  const front = depth / 2 + 1.1;
  const eyes = new THREE.Group();
  const eyeParts = EYES.map(([x, y]) => {
    const slot = new THREE.Group();
    const [wx, wy] = toWorld(x, y);
    slot.position.set(wx, wy, front - 0.15);
    slot.rotation.z = (30 * Math.PI) / 180;
    const open = new THREE.Mesh(pillGeo, eyeMat);
    const happy = new THREE.Mesh(arcGeo, eyeMat);
    happy.position.y = -0.6;
    slot.add(open, happy);
    eyes.add(slot);
    return { slot, open, happy };
  });

  // Three dots that pulse over its head while it thinks.
  const dotGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3, transparent: true });
  const dots = [0, 1, 2].map((i) => {
    const dot = new THREE.Mesh(dotGeo, dotMat.clone());
    dot.position.set(6 + i * 2.6, 13 + i * 1.1, 0);
    return dot;
  });

  const rig = new THREE.Group(); // hop and spins
  const squash = new THREE.Group(); // squash and stretch from the feet
  squash.position.y = -10.8;
  const inner = new THREE.Group();
  inner.position.y = 10.8;
  inner.add(body, eyes, ...dots);
  squash.add(inner);
  rig.add(squash);
  scene.add(rig);

  // A soft shadow on the floor.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const g = shadowCanvas.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(0,0,0,.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadow.position.set(0, -12.4, 0);
  shadow.rotation.x = -Math.PI / 2.4;
  scene.add(shadow);

  // Sparkles: small glossy diamonds and bits that burst and fall.
  const sparkGeo = new THREE.OctahedronGeometry(0.9);
  const sparkMats = [new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, transparent: true }), null];
  const sparks = [];
  function burst(count, { y = 0, speed = 34, up = 22 } = {}) {
    if (reduced()) return;
    sparkMats[1] = sparkMats[1] || new THREE.MeshStandardMaterial({ color: accent(), emissive: accent(), emissiveIntensity: 0.4, transparent: true });
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(sparkGeo, (Math.random() < 0.5 ? sparkMats[0] : sparkMats[1]).clone());
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI * 0.6;
      const v = speed * (0.5 + Math.random() * 0.7);
      mesh.position.set(0, y, 2);
      mesh.scale.setScalar(0.5 + Math.random() * 0.8);
      scene.add(mesh);
      sparks.push({ mesh, vx: Math.cos(a) * v, vy: Math.sin(a) * v + up, vz: Math.sin(b) * v, life: 0, max: 0.9 + Math.random() * 0.6 });
    }
  }

  const s = {
    sy: spring(1, 220, 12),
    yaw: spring(0, 90, 12),
    pitch: spring(0, 90, 12),
    roll: spring(0, 90, 11),
    spinY: spring(0, 70, 10),
    spinX: spring(0, 60, 10),
    lx: spring(0, 160, 18),
    ly: spring(0, 160, 18),
    open: spring(1, 400, 26),
    wide: spring(1, 200, 14),
    happy: spring(0, 120, 16),
    think: spring(0, 90, 16),
  };
  const hop = { y: 0, v: 0, air: false };
  let shake = 0;
  let squinting = false;
  let thinking = false;
  let sleepy = false;
  let busy = false;
  let onLand = null;
  let lastActive = performance.now();
  let blinkAt = performance.now() + 2500;
  let lookAt = performance.now() + 3000;
  let quietUntil = 0;
  let shutUntil = 0;
  let shutEye = -1;
  let raf = 0;
  let last = performance.now();
  let colorAt = 0;
  let color = accent();

  function jump(v, then) {
    hop.v = v;
    hop.air = true;
    s.sy.v += 4;
    onLand = then || null;
  }

  function crouchThen(fn) {
    busy = true;
    s.sy.to = 0.72;
    window.setTimeout(() => {
      busy = false;
      fn();
    }, 150);
  }

  function happyFor(ms) {
    s.happy.to = 1;
    window.setTimeout(() => (s.happy.to = 0), ms);
  }

  const WINS = [
    function spinJump() {
      happyFor(1600);
      crouchThen(() => {
        jump(40, () => burst(18, { y: -8 }));
        s.spinY.to += 360;
      });
    },
    function frontFlip() {
      happyFor(1600);
      crouchThen(() => {
        jump(44, () => burst(14, { y: -8 }));
        s.spinX.to -= 360;
      });
    },
    function barrelRoll() {
      happyFor(1500);
      crouchThen(() => {
        jump(34, () => burst(12, { y: -8 }));
        s.roll.to += 360;
      });
    },
    function doubleSpin() {
      happyFor(1800);
      s.spinY.k = 40;
      s.spinY.to += 720;
      burst(20, { y: 4, up: 10 });
      window.setTimeout(() => (s.spinY.k = 70), 1800);
    },
  ];

  const WIGGLES = [
    () => (s.sy.v += 7),
    () => [0.9, -1.1, 0.8, -0.5].forEach((v, i) => window.setTimeout(() => (s.yaw.v += v * 9), i * 110)),
    () => {
      s.wide.to = 1.35;
      if (!hop.air) jump(18);
      window.setTimeout(() => (s.wide.to = 1), 700);
    },
    () => (shake = 1),
  ];

  function idle(now) {
    if (now - lastActive > 25000 && !sleepy && !thinking) {
      sleepy = true;
      s.open.to = 0.35;
    }
    const breathe = sleepy ? 0.03 * Math.sin(now / 900) : 0.016 * Math.sin(now / 520);
    if (!hop.air && !busy) s.sy.to = 1 + breathe;
    if (now > blinkAt && !squinting && !sleepy) {
      shutEye = Math.random() < 0.3 ? Math.floor(Math.random() * 2) : -1;
      shutUntil = now + 130;
      blinkAt = now + 2500 + Math.random() * 4500;
    }
    if (now > lookAt && now > quietUntil && !thinking && !sleepy) {
      if (Math.random() < 0.6) {
        s.lx.to = Math.random() * 2 - 1;
        s.ly.to = Math.random() * 2 - 1;
      } else {
        s.lx.to = 0;
        s.ly.to = 0;
      }
      s.yaw.to = s.lx.to * 0.35;
      s.pitch.to = -s.ly.to * 0.2;
      lookAt = now + 1800 + Math.random() * 2600;
    }
  }

  function draw(now) {
    const sy = s.sy.x;
    squash.scale.set(1 / Math.sqrt(Math.max(0.4, sy)), sy, 1 / Math.sqrt(Math.max(0.4, sy)));
    rig.position.set(shake * 0.8, hop.y, 0);
    rig.rotation.set(
      s.pitch.x + (s.spinX.x * Math.PI) / 180,
      s.yaw.x + (s.spinY.x * Math.PI) / 180 + shake * 0.08,
      (-s.roll.x * Math.PI) / 180 - (thinking ? 0.12 * s.think.x : 0),
    );
    eyes.position.set(s.lx.x * (s.lx.x < 0 ? 3.5 : 0.9), s.ly.x * -1.4, 0);
    const shut = now < shutUntil;
    eyeParts.forEach((eye, i) => {
      const closed = shut && (shutEye === -1 || shutEye === i);
      const open = closed ? 0.08 : Math.max(0.06, s.open.x);
      eye.open.scale.set(s.wide.x, open * s.wide.x, 1);
      eye.open.visible = s.happy.x < 0.5;
      eye.happy.visible = s.happy.x >= 0.5;
      eye.happy.scale.setScalar(0.6 + 0.4 * s.happy.x);
    });
    dots.forEach((dot, i) => {
      dot.visible = s.think.x > 0.02;
      dot.material.opacity = s.think.x * (0.35 + 0.65 * Math.max(0, Math.sin(now / 260 - i * 0.9)));
      dot.rotation.set(now / 900, now / 700, 0);
    });
    const air = Math.min(1, hop.y / 14);
    shadow.scale.set((1 - air * 0.55) / Math.sqrt(sy), 1, 1);
    shadow.material.opacity = 1 - air * 0.6;
    renderer.render(scene, camera);
  }

  function frame(now) {
    if (!host.isConnected) return stop();
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    if (now > colorAt) {
      const next = accent();
      if (next !== color) {
        color = next;
        bodyMat.color.set(color);
        if (sparkMats[1]) sparkMats[1] = null;
      }
      colorAt = now + 500;
    }
    idle(now);
    Object.values(s).forEach((sp) => step(sp, dt));
    if (hop.air) {
      hop.v -= GRAVITY * dt;
      hop.y += hop.v * dt;
      if (hop.y <= 0) {
        hop.y = 0;
        hop.air = false;
        s.sy.v -= Math.min(9, -hop.v * 0.12);
        const done = onLand;
        onLand = null;
        done?.();
      }
    }
    shake *= Math.pow(0.02, dt);
    if (Math.abs(shake) > 0.02) shake = -shake;
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const p = sparks[i];
      p.life += dt;
      p.vy -= GRAVITY * 0.35 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 4;
      p.mesh.material.opacity = Math.max(0, 1 - p.life / p.max);
      if (p.life >= p.max) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        sparks.splice(i, 1);
      }
    }
    for (const key of ["spinY", "spinX", "roll"]) {
      const sp = s[key];
      const turns = Math.round(sp.to / 360) * 360;
      if (turns && Math.abs(sp.x - sp.to) < 0.5 && Math.abs(sp.v) < 1) {
        sp.x -= turns;
        sp.to -= turns;
      }
    }
    draw(now);
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

  function still() {
    if (reduced()) draw(performance.now());
  }

  function stop() {
    cancelAnimationFrame(raf);
    renderer.dispose();
    pmrem.dispose();
    [bodyGeo, pillGeo, arcGeo, dotGeo, sparkGeo].forEach((geo) => geo.dispose());
  }

  if (reduced()) draw(performance.now());
  else raf = requestAnimationFrame(frame);

  if (import.meta.env?.DEV) host.__brok = { win: (i) => WINS[i](), wiggle: (i) => WIGGLES[i]() };

  return {
    lookAt(clientX, clientY) {
      wake();
      quietUntil = performance.now() + 2500;
      const box = host.getBoundingClientRect();
      const dx = clientX - (box.left + box.width / 2);
      const dy = clientY - (box.top + box.height / 2);
      s.lx.to = Math.max(-1, Math.min(1, dx / 320));
      s.ly.to = Math.max(-1, Math.min(1, dy / Math.max(Math.hypot(dx, dy), 160)));
      s.yaw.to = s.lx.to * 0.45;
      s.pitch.to = s.ly.to * 0.3;
      still();
    },
    rest() {
      quietUntil = 0;
      s.lx.to = s.ly.to = s.yaw.to = s.pitch.to = 0;
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
      if (reduced()) return still();
      pick(WINS)();
    },
    wiggle() {
      wake();
      if (!reduced()) pick(WIGGLES)();
    },
    stop,
  };
}
