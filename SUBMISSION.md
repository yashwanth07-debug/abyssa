# ABYSSA — Hackathon Submission

**3D Websites Hackathon** · solo entry · **Yashwanth K.** (@yashwanth07-debug)

---

## 1 · Website link

**https://yashwanth07-debug.github.io/abyssa/**

Publicly accessible, hosted on GitHub Pages from this repository
(`gh-pages` branch; built with `npm run build`).

## 2 · Project description

**ABYSSA is a portfolio disguised as a crewed deep-sea submersible dive.**

You board the DSV NEREIS at the surface and scroll down. Scrolling *is* the dive:
10,935 metres to Challenger Deep, through the ocean's five real zones. Each zone
is a section of the portfolio — About at a shimmering bait ball, Skills in a
jellyfish garden, Work at anglerfish depth, Journey beside a siphonophore, Contact
at a hydrothermal vent ridge — until you touch down on the seafloor at the
Challenger Deep outro screen.

The HUD is real telemetry: depth in metres, pressure in PSI (+= 14.5 per 10 m,
recomputed per frame), zone name, and a sonar toggle that pings the water column
and reveals nearby creatures. Sound on is recommended — sonar pings, whale song,
and hull groans are synthesized live in WebAudio.

**Inspiration.** I build scroll-driven 3D journeys, and I wanted to take the medium
somewhere nobody scrolls: *down*, into the one environment on Earth that feels like
another planet. Real oceanography anchors the design — the pelagic zones, the
10,935 m floor, the snailfish depth record (8,336 m), marine snow, black smokers,
and whale-song propagation all made it into the world and its copy — dressed with
the pacing and dread of submarine cinema (*The Abyss*, *Das Boot*). The interface
pays homage to the Awwwards-era full-scene sites (the sebastien-lempens school of
scroll-cinematics), but with a navigation metaphor that is itself the content.

## 3 · Screenshots

In [`screenshots/`](screenshots/):

1. `01-sunlight-zone.jpg` — descent through the sunlit zone, god rays past the hull
2. `02-about-bait-ball.jpg` — docked beside a 220-fish bait ball at 110 m
3. `03-skills-jellies.jpg` — Skills panel in the twilight jellyfish garden at 600 m
4. `04-hadal-contact.jpg` — the trench station at 8,200 m with vent glow below
5. `05-challenger-deep.jpg` — touchdown: the headlight pool on the seafloor, outro

## 4 · Demo video

[`demo/abyssa_demo.mp4`](demo/abyssa_demo.mp4) — ~50 s screen capture of the full
descent (all zones, all five docked stations, Challenger Deep finale), or watch
the live site for the interactive version.

## 5 · Technologies & tools

| Tool | Use |
|---|---|
| **Three.js 0.166** (WebGL2) | entire 3D world |
| **Custom GLSL** | water dome, bait-ball shimmer, whale skinning, jellies, vent smoke |
| **Vite 5** | build/dev |
| **WebAudio API** | procedural sonar, whale song, hull groans |
| **CSS 3D transforms** | HUD, depth-rail nav, tilted info panels |
| GSAP-free | all motion is hand-rolled (scroll damp, camera chase, dock easing) |
| AI coding assistance | permitted per rules; used for shader ideation & debugging loops |

Fonts (Sora + IBM Plex Mono) via system stack with graceful fallbacks. **Zero
external assets, textures, or models** — the ocean is 100 % procedural.

## 6 · Source code

This repository. Key files:

```
index.html            preloader, ignition card, HUD, panels
src/main.js           renderer, scroll→depth solver, camera chase/dock, debug API
src/data.js           all copy: zones, panels, projects, telemetry
src/world/ocean.js    water dome, fog, snow/plankton, seafloor, lighting
src/world/life.js     bait ball, jellies, whale, anglers, siphonophore, vents
src/world/sub.js      DSV NEREIS, headlight cone, thruster wash
src/core/hud.js       depth/PSI telemetry, zone rail, panel state machine
src/core/audio.js     sonar + whale-song + rumble synthesis
src/core/post.js      post chain (bloom, chromatic, CRT, vignette)
src/util/noise.js     GLSL noise library
```

---

### Eligibility checklist

- [x] Original 3D website concept
- [x] Live public URL (GitHub Pages)
- [x] Runs in a modern browser, no plugins
- [x] Description + inspiration (above)
- [x] ≥ 3 screenshots (5 included)
- [x] Demo video included
- [x] Technologies listed
- [x] Source code in this repo
- [x] Appropriate for all audiences
