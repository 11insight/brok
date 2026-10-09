# Brok in Rive: brief for the animator

Brok is the logo of [Brok](https://brok-olive.vercel.app), a browser powered by
Grok: an orange shield shape with two slanted pill eyes. Today it is animated in
code (Settings, Brok, Drawn or 3D). This brief is for a hand-made version.

## Deliver

- One file, `brok.riv`, dropped into `public/`. Brok finds it on its own and adds
  **Animated** to Settings.
- Artboard 512 x 512, transparent, Brok about 230 px wide in the middle with room
  above and around for jumps, spins and sparkles.
- One state machine named exactly **`Brok`**.
- Body in the orange `#d9611c`. If you can, expose a color so the blue theme
  (`#3fb5fc`) works too; otherwise ship orange and we will add blue later.
- No fully round shapes anywhere (house style): sparkles and confetti are stars,
  diamonds and rounded rectangles.

## Inputs (names must match)

| Input | Type | What Brok does |
|---|---|---|
| `lookX` | number, -100 to 100 | Eyes and a slight lean toward where the person is typing. Left is negative. The eyes sit near the right edge, so they travel further left than right. |
| `lookY` | number, -100 to 100 | Eyes up (negative) or down. |
| `squint` | boolean | Eyes half closed, thinking it over. |
| `think` | boolean | Squint, a small tilt, and three square dots pulsing over the head while results load. |
| `win` | trigger | Celebrate. Make 3 or 4 different ones and pick at random (crouch, jump, spin or flip in the air, squash on landing, happy arc eyes, sparkles). |
| `wiggle` | trigger | A small reaction. 3 or 4 kinds: jelly squash, head shake, surprised hop with wide eyes, shiver. |

## Always on

- Idle: slow breathing, a blink every few seconds, a wink now and then, glancing around.
- After about 25 seconds with no input: sleepy, droopy eyes, slower breathing. Any input wakes it with a little surprise.

## Feel

Soft and squishy, like a rubber toy: anticipation before every jump, overshoot
and settle after. Friendly, never frantic. Keep every move under about 1.5 seconds.

## Test it

Put `brok.riv` in `public/`, run `npm start`, open Settings, pick **Animated**.
Type in the search box to drive `lookX` and `lookY`, press Enter for `think`
then `win`, tap Brok for `wiggle`.
