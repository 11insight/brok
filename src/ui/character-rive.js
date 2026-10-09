// Brok drawn by an animator in Rive. Brok switches to this only when
// public/brok.riv exists. The file needs a state machine named "Brok" with the
// inputs listed in docs/brok-rive-brief.md. The Rive engine is served from
// Brok itself, never from a CDN.

import { Rive, RuntimeLoader } from "@rive-app/canvas";
import wasmUrl from "@rive-app/canvas/rive.wasm?url";

RuntimeLoader.setWasmUrl(wasmUrl);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function riveAvailable() {
  try {
    const res = await fetch("/brok.riv", { method: "HEAD" });
    return res.ok && !/text\/html/.test(res.headers.get("content-type") || "");
  } catch {
    return false;
  }
}

export function createCharacterRive(host) {
  const size = host.clientWidth || 128;
  const canvas = document.createElement("canvas");
  canvas.className = "brok-3d-canvas";
  canvas.style.width = canvas.style.height = `${size * 2.2}px`;
  canvas.width = canvas.height = Math.round(size * 2.2 * Math.min(2, window.devicePixelRatio || 1));
  host.append(canvas);

  let inputs = {};
  return new Promise((resolve, reject) => {
    const rive = new Rive({
      src: "/brok.riv",
      canvas,
      stateMachines: "Brok",
      autoplay: !reduced(),
      onLoad() {
        rive.resizeDrawingSurfaceToCanvas();
        for (const input of rive.stateMachineInputs("Brok") || []) inputs[input.name] = input;
        const set = (name, value) => {
          if (inputs[name] && "value" in inputs[name]) inputs[name].value = value;
        };
        const fire = (name) => inputs[name]?.fire?.();
        resolve({
          lookAt(clientX, clientY) {
            const box = host.getBoundingClientRect();
            set("lookX", Math.max(-100, Math.min(100, ((clientX - (box.left + box.width / 2)) / 320) * 100)));
            set("lookY", Math.max(-100, Math.min(100, ((clientY - (box.top + box.height / 2)) / 160) * 100)));
          },
          rest() {
            set("lookX", 0);
            set("lookY", 0);
          },
          squint: (on) => set("squint", on),
          think: (on) => set("think", on),
          spin: () => fire("win"),
          wiggle: () => fire("wiggle"),
          stop() {
            rive.cleanup();
          },
        });
      },
      onLoadError: () => reject(new Error("brok.riv did not load")),
    });
  });
}
