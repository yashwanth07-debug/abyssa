// ─────────────────────────────────────────────────────────────────────────────
//  ★ EDIT ME — everything ABYSSA says lives in this one file.
//  Swap in your name, story, skills, projects and links. The engine,
//  creatures and shaders don't need to be touched.
// ─────────────────────────────────────────────────────────────────────────────

export const PILOT = {
  name: 'Yashwanth K.',
  tag: 'DEEP-WEB EXPLORER · NO. 07',
  call: 'DSV NEREIS',
  github: 'https://github.com/yashwanth07-debug',
  heroTitle: ['ABYSSA'],
  heroSub: 'We mapped the sky. We charted the stars.<br>Now — we descend.',
  heroPrompt: 'SCROLL TO DIVE',
  heroStats: [
    ['TARGET', 'CHALLENGER DEEP'],
    ['DEPTH', "10,935 M"],
    ['HULL', 'TITANIUM-6AL'],
  ],
  outroTitle: 'CHALLENGER DEEP',
  outroSub: '10,935 metres — the floor of the tallest ocean.<br>You made it further down than Everest is tall. The signal from here is weak, but it always gets through.',
  outroNote: 'PRESS 「FREE LOOK」 TO SURVEY THE TRENCH',
  awards: ['3D WEBSITES HACKATHON', 'DESCENT NO. 07', 'MADE WITH THREE.JS · GLSL · WEBAUDIO'],
};

// The ocean is measured in five real zones. Each zone carries one chapter:
// depth ranges are the actual oceanography, meters are mapped 1:1 to scroll.
export const ZONES = [
  {
    id: 'sunlight',
    depth: 110, // dock depth in meters
    range: '0 – 200 M',
    name: 'SUNLIGHT ZONE',
    latin: 'EPIPELAGIC',
    title: 'ABOUT',
    body: `I'm Yashwanth — a developer who treats the browser as an ocean: mostly unexplored,
deeper than it looks, and gorgeous if you bring your own light. This page is my bathyscaphe.
Every metre you descend is a year, a skill, a launch — keep scrolling, the pressure only
makes things more interesting.`,
    chips: ['GLSL SHADERS', 'CREATIVE CODE', 'UI ENGINEERING', 'AUDIO SYNTHESIS'],
    factTitle: 'ZONE DATA',
    facts: [
      ['LIGHT', '90% of ocean life lives here'],
      ['PRESSURE', '11 × atmosphere'],
      ['TEMP', '≈ 20 °C'],
    ],
    color: '#6fd8ff',
  },
  {
    id: 'twilight',
    depth: 600,
    range: '200 – 1,000 M',
    name: 'TWILIGHT ZONE',
    latin: 'MESOPELAGIC',
    title: 'SKILLS',
    body: `Light thins to a blue whisper. This is where the work happens — systems tuned until
they glow on their own.`,
    skills: [
      ['THREE.JS / WEBGL', 0.94, 'scenes, materials, instancing'],
      ['GLSL', 0.9, 'custom shading & noise'],
      ['JAVASCRIPT / TS', 0.92, 'engine-grade architecture'],
      ['WEB AUDIO', 0.82, 'procedural engines & sonars'],
      ['UI / MOTION', 0.86, 'interfaces that feel alive'],
    ],
    factTitle: 'ZONE DATA',
    facts: [
      ['LIGHT', '0.5% of sunlight remains'],
      ['RESIDENT', 'jellyfish · hatchetfish'],
      ['SOUND', 'whale song travels 1,000s km'],
    ],
    color: '#7cd2ff',
  },
  {
    depth: 2200,
    id: 'midnight',
    range: '1,000 – 4,000 M',
    name: 'MIDNIGHT ZONE',
    latin: 'BATHYPELAGIC',
    title: 'WORK',
    body: `The last photon surrendered at 1,000 m. Below that, you navigate by signal.
Selected transmissions from the dark:`,
    projects: [
      { name: 'STARJET', desc: 'Interplanetary 3D portfolio — space-jet + five procedural GLSL planets', url: 'https://yashwanth07-debug.github.io/starjet-portfolio/' },
      { name: 'AURELIA', desc: 'Immersive 3D sky-archipelago voyage — floating worlds, airship chase-cam', url: 'https://yashwanth07-debug.github.io/aurelia-3d/' },
      { name: 'ABYSSA', desc: 'This descent — one scroll to the bottom of the ocean', url: 'https://github.com/yashwanth07-debug/abyssa' },
      { name: 'SIGNAL 04', desc: 'Your project could be docked here', url: '' },
    ],
    factTitle: 'ZONE DATA',
    facts: [
      ['LIGHT', '0% — bioluminescence only'],
      ['PRESSURE', '220 × atmosphere'],
      ['ANGER', 'anglerfish, obviously'],
    ],
    color: '#7fa8ff',
  },
  {
    id: 'abyssal',
    depth: 5000,
    range: '4,000 – 6,000 M',
    name: 'THE ABYSS',
    latin: 'ABYSSOPELAGIC',
    title: 'JOURNEY',
    body: `The abyssal plain — three-quarters of the ocean floor, and a good metaphor for a
career: long, dark, and absolutely worth crossing slowly.`,
    milestones: [
      ['0 M', 'Started building websites — fell in love with the medium'],
      ['200 M', 'First WebGL shader compiled. Nothing has been flat since'],
      ['1,000 M', 'Shipped my first immersive site; learned perf the hard way'],
      ['4,000 M', 'Full-scene pipelines: GLSL, WebAudio, instancing, chase cams'],
      ['6,000 M+', 'Deeper: toward WebGPU, raymarching, bigger oceans'],
    ],
    factTitle: 'ZONE DATA',
    facts: [
      ['TEMP', '≈ 2 °C'],
      ['FLOOR', 'abyssal clay, meters thick'],
      ['SNOW', 'marine snow — the only weather'],
    ],
    color: '#a18cff',
  },
  {
    id: 'hadal',
    depth: 8200,
    range: '6,000 – 10,935 M',
    name: 'HADAL ZONE',
    latin: 'THE TRENCHES',
    title: 'CONTACT',
    body: `Named after Hades. Vent chimneys breathe below — if you can hold a signal down
here, you can hold one anywhere. Open a channel:`,
    links: [
      ['GITHUB', 'yashwanth07-debug', 'https://github.com/yashwanth07-debug'],
      ['EMAIL', 'open a channel →', 'mailto:yashwanth@proton.me'],
      ['ABYSSA REPO', 'fork the descent', 'https://github.com/yashwanth07-debug/abyssa'],
    ],
    factTitle: 'ZONE DATA',
    facts: [
      ['PRESSURE', '≈ 800 × atmosphere'],
      ['VENTS', 'chimneys up to 60 m tall'],
      ['LIFE?', 'snailfish at 8,336 m — the record'],
    ],
    color: '#6ff2ff',
  },
];

// Depth milestones that deserve a sonar toast.
export const MILESTONES = [
  [200, 'TWILIGHT BEGINS', 'the last strong photons'],
  [1000, 'SUNLIGHT ZERO', 'welcome to permanent midnight'],
  [4000, 'THE ABYSS', 'bottom of the map begins'],
  [6000, 'HADAL ZONE', 'trench pressure — hull holding'],
  [10935, 'TOUCHDOWN', 'challenger deep · 10,935 m'],
];

export const MAX_DEPTH = 10935;
