import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ZONES, MAX_DEPTH } from './data.js';
import { buildOcean, WORLD_DEPTH, yOf } from './world/ocean.js';
import { buildLife } from './world/life.js';
import { buildSub } from './world/sub.js';
import { buildPost } from './core/post.js';
import { AbyssAudio } from './core/audio.js';
import { HUD, buildJoystick } from './core/hud.js';

const canvas = document.getElementById('sea');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
let pixelRatio = Math.min(window.devicePixelRatio, 1.75);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
// (fill light added once the camera rig exists)
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 9000);
camera.position.set(0, 6, 26);
// cool cabin-side fill — keeps the NEREIS readable in the dark trenches
const camFill = new THREE.PointLight(0x86cfe2, 850, 70, 1.55);
camFill.position.set(0, 1.5, 3);
camera.add(camFill);
scene.add(camera);

// ── environment reflections (so the hull reads metal in the dark) ─────
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
}

// ── the descent course ────────────────────────────────────────────────
const _pv = new THREE.Vector3();
const FIELD = new THREE.Vector3(20, -WORLD_DEPTH + 10, 0);
function pathAt(p, out = _pv) {
  const p1 = 110 / MAX_DEPTH;
  const xz = new THREE.Vector3(34, 0, 40).lerp(new THREE.Vector3(FIELD.x, 0, FIELD.z), THREE.MathUtils.smoothstep(0, 1, (p - p1) / (1 - p1)));
  const bend = Math.sin(Math.PI * (p - p1) / (1 - p1)) * 26;           // graceful arc between poles
  out.set(
    xz.x + Math.sin(p * 9.2) * 14 + bend * 0.6,
    -Math.min(p * WORLD_DEPTH, WORLD_DEPTH - 14),
    xz.z + Math.cos(p * 7.1) * 14 + bend * 0.4,
  );
  return out;
}

// dock windows (± meters around each zone's dock depth)
const WINDOWS = [150, 340, 820, 1150, 1350];

const audio = new AbyssAudio();
let lifeApi, ocean, subApi, post, controls;
let started = false;
let freelook = false;

const hud = new HUD({
  onBegin() {
    // HUD + journey engage FIRST — audio must never be a single point of failure
    started = true;
    hud.liftVeil();
    try {
      audio.start();
      audio.setDepth(0);
    } catch (err) {
      console.warn('[ABYSS] audio unavailable — diving silent:', err && err.message);
    }
  },
  onAudio() { return audio.toggle(); },
  onRail(i) {
    const p = ZONES[i].depth / MAX_DEPTH;
    smoothScrollTo(p);
  },
  onFreelook(active) {
    freelook = active;
    if (controls) controls.enabled = active;
  },
});

// ── throttle stick: hold-forward drive, independent of scroll ────────
let throttleV = 0;      // -1 rise .. +1 dive
let throttleP = null;   // held position target while joystick is active
const joystickBegin = () => {
  if (started) return;
  // driving the stick counts as boarding the sub
  const ig = document.getElementById('ignition');
  ig.classList.add('hidden'); ig.dataset.lock = '1';
  document.getElementById('hud').classList.remove('hidden');
  started = true;
  hud.liftVeil();
  try { audio.start(); audio.setDepth(0); } catch (e) { console.warn('[ABYSS] silent dive:', e && e.message); }
};
const joyHandle = buildJoystick((v) => { throttleV = v; }, joystickBegin);

let oceanApi;
async function build() {
  const steps = [
    ['FLOODING THE WINDOWLESS DARK', () => { oceanApi = buildOcean(scene); }],
    ['WAKING THE CREATURES', () => { lifeApi = buildLife(scene); }],
    ['ASSEMBLING DSV NEREIS', () => { subApi = buildSub(scene); }],
    ['CHARGING FLOODLIGHTS', () => { post = buildPost(renderer, scene, camera); }],
    ['CALIBRATING SONAR', () => {
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 20;
      controls.maxDistance = 400;
      controls.enabled = false;
      controls.target.set(20, -WORLD_DEPTH + 10, 0);
    }],
    ['COMPILING PRESSURE SHADERS', () => { renderer.compile(scene, camera); }],
  ];
  for (let i = 0; i < steps.length; i++) {
    try {
      steps[i][1]();
    } catch (err) {
      console.error(`[ABYSS] build step "${steps[i][0]}" failed:`, err.stack || err);
      throw err;
    }
    hud.preloader((i + 1) / steps.length, i === steps.length - 1);
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 120));
  }
  window.__ABYSS.ready = true;
  loop(0);
}

// ── scroll physics ────────────────────────────────────────────────────
let pTarget = 0, pSmooth = 0, pPrev = 0;
let baseVH = innerHeight;
const trackVH = () => { baseVH = Math.max(baseVH, innerHeight, (window.visualViewport && visualViewport.height) || 0); };
trackVH();
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - baseVH);
addEventListener('scroll', () => { pTarget = maxScroll() > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll())) : 0; }, { passive: true });
function smoothScrollTo(p) {
  const max = maxScroll();
  const start = scrollY, delta = p * max - start;
  const t0 = performance.now(), dur = 1400;
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    scrollTo(0, start + delta * e);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
  audio.ping(0.12, 520);
}

// temp vectors
const subPos = new THREE.Vector3(), fwd = new THREE.Vector3(), f2 = new THREE.Vector3();
const lookPt = new THREE.Vector3(), camPt = new THREE.Vector3(), tuned = new THREE.Vector3();
const stDir = new THREE.Vector3(), side = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const camLookCur = new THREE.Vector3(0, 0, -1);
const spotWorld = new THREE.Vector3(), spotDir = new THREE.Vector3(), floorHit = new THREE.Vector3();
let dockIdx = -1, dockK = 0, lastDockIdx = -1, pingArmed = true;
let whaleCooldown = 0;
let fpsAcc = 0, fpsN = 0, fpsTimer = 0;

const clock = new THREE.Clock();
let timeScale = 1; let tSim = 0;
let framesPainted = 0;
function loop() {
  requestAnimationFrame(loop);
  const dtRaw = Math.min(clock.getDelta(), 0.066);
  const dt = dtRaw * timeScale;
  tSim += dt;
  const t = tSim;

  // throttle stick drive — direct progress control, independent of document scroll
  if (throttleV !== 0) {
    throttleP = throttleP === null ? pTarget : throttleP;
    throttleP = THREE.MathUtils.clamp(throttleP + throttleV * dt * 0.05, 0, 1);
    pTarget = throttleP;
  } else if (throttleP !== null) {
    // released: sync the native scroll position to where the stick parked us
    throttleP = null;
    scrollTo(0, pTarget * maxScroll());
  }

  // scroll smoothing — momentum descent
  pSmooth += (pTarget - pSmooth) * (1 - Math.pow(0.0001, dt));
  const velocity = (pSmooth - pPrev) / Math.max(dt, 1e-4);
  pPrev = pSmooth;
  const speed = Math.min(1, Math.abs(velocity) * 14);

  const depthM = pSmooth * MAX_DEPTH;
  const depthK = depthM / MAX_DEPTH;

  // sub pose
  pathAt(pSmooth, subPos);
  pathAt(Math.min(1, pSmooth + 0.0015), fwd).sub(pathAt(Math.max(0, pSmooth - 0.0015), f2)).normalize();

  // docking — strongest zone window wins
  let bestK = 0, bestIdx = -1;
  for (let i = 0; i < ZONES.length; i++) {
    const k = 1 - Math.abs(depthM - ZONES[i].depth) / WINDOWS[i];
    if (k > bestK) { bestK = k; bestIdx = i; }
  }
  dockK += ((bestK > 0.35 ? THREE.MathUtils.smoothstep(bestK, 0.35, 0.95) : 0) - dockK) * Math.min(1, dt * 3.2);
  dockIdx = dockK > 0.04 ? bestIdx : -1;

  // sub orientation: base forward, blended toward the station when docked
  tuned.copy(fwd);
  if (dockIdx >= 0) {
    stDir.copy(lifeApi.stations[dockIdx]).sub(subPos).normalize();
    tuned.lerp(stDir, dockK * 0.85).normalize();
  }
  const yawTarget = Math.atan2(tuned.x, tuned.z);
  const pitchTarget = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(tuned.y, -1, 1)), -1.1, 1.1);
  const roll = THREE.MathUtils.clamp(-velocity * 30 * (fwd.x), -0.4, 0.4);
  subApi.group.position.copy(subPos);
  subApi.group.rotation.order = 'YXZ';
  subApi.group.rotation.y += shortest(subApi.group.rotation.y, yawTarget) * Math.min(1, dt * (2 + dockK * 4));
  subApi.group.rotation.x += (pitchTarget * -1 - subApi.group.rotation.x) * Math.min(1, dt * 2.4);
  subApi.group.rotation.z += (roll - subApi.group.rotation.z) * Math.min(1, dt * 3);
  // gentle hover bob while docked
  subApi.group.position.y += Math.sin(t * 0.7) * 0.7 * dockK;

  // ── camera ──
  if (!freelook) {
    if (pSmooth > 0.963) {
      // touchdown orbit near the vent field
      const a = t * 0.05;
      camPt.set(20 + Math.cos(a) * 95, -WORLD_DEPTH + 42 + Math.sin(t * 0.1) * 6, Math.sin(a) * 95);
      lookPt.set(20, -WORLD_DEPTH + 12, 0);
      camera.position.lerp(camPt, Math.min(1, dt * 1.4));
    } else {
      // chase cam — above and behind the hull
      camPt.copy(subPos).addScaledVector(fwd, -15).addScaledVector(UP, 6.5);
      if (dockIdx >= 0) {
        // true horizontal stand-off, perpendicular to the line of sight:
        // station holds frame center, the NEREIS rides the edge
        side.crossVectors(UP, stDir);
        side.y = 0;
        if (side.lengthSq() < 0.05) side.set(1, 0, 0);
        side.normalize();
        tuned.copy(subPos).addScaledVector(side, 22).addScaledVector(UP, 8);
        camPt.lerp(tuned, dockK * 0.9);
        lookPt.copy(lifeApi.stations[dockIdx]);
      } else {
        lookPt.copy(subPos).addScaledVector(fwd, 14).addScaledVector(UP, -2.5);
      }
      camera.position.lerp(camPt, Math.min(1, dt * (2.2 + dockK)));
      // buoy bob
      camera.position.y += Math.sin(t * 0.55) * 0.35 * (1 - dockK);
    }
    camLookCur.lerp(lookPt, Math.min(1, dt * 3.2));
    camera.lookAt(camLookCur);
  } else if (controls) {
    controls.update();
  }

  // ── systems ──
  subApi.update(t, speed);
  subApi.setLight(THREE.MathUtils.smoothstep(depthK, 0.02, 0.35));

  // spotlight world ray → floor shader pool
  spotDir.copy(tuned);
  spotWorld.copy(subPos).addScaledVector(spotDir, 60);
  const denom = spotDir.y - 0.35;
  if (denom < -0.05) {
    const s = (-WORLD_DEPTH + 1.2 - subPos.y) / denom;
    if (s > 0 && s < 400) floorHit.copy(subPos).addScaledVector(spotDir, s);
    else floorHit.copy(spotWorld);
  } else floorHit.copy(spotWorld);
  oceanApi.update(
    t, camera.position.y, subPos, floorHit, spotDir,
    lifeApi.floorVents[0], lifeApi.floorVents[1],
  );
  lifeApi.update(t, dt, subPos);
  post.setDepth(depthK);

  // ── audio + HUD ──
  if (started) {
    const now = performance.now();
    audio.setDepth(depthK);
    audio.bubbles(speed, now);
    audio.creak(depthM, now);
    const msToast = hud.updateDepth(depthM, velocity * MAX_DEPTH * 100);
    if (msToast) audio.ping(0.22, 540);
    // whale song in the twilight
    if (depthM > 430 && depthM < 1000 && now > whaleCooldown) {
      whaleCooldown = now + 52000;
      audio.whale();
    }
    // dock ping (rising edge)
    if (dockIdx !== lastDockIdx) {
      lastDockIdx = dockIdx;
      if (dockIdx >= 0) { audio.ping(0.32, 660); hud.dockPulse(); }
    }
    // panels
    if (pSmooth < 0.0052) hud.show(-1);
    else if (pSmooth > 0.963) hud.show(9);
    else if (dockK > 0.3 && dockIdx >= 0) hud.show(dockIdx);
    else hud.show(-2);
  }

  post.composer.render();
  if (framesPainted < 3) {
    framesPainted++;
    if (framesPainted === 3) {
      canvas.classList.add('live');
      document.getElementById('veil').classList.add('up');
    }
  }

  // adaptive resolution — hold 45+ fps
  fpsAcc += dt; fpsN++; fpsTimer += dt;
  if (fpsTimer > 3 && started) {
    const avg = fpsAcc / fpsN;
    if (avg > 1 / 42 && pixelRatio > 0.85) {
      pixelRatio = Math.max(0.85, pixelRatio - 0.25);
      applySize();
    }
    fpsAcc = fpsN = fpsTimer = 0;
  }
}
function normAngle(a) { return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
function shortest(from, to) { return normAngle(to - from); }

function applySize() {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  post && post.setSize(innerWidth, innerHeight);
  oceanApi && oceanApi.setPixelRatio(pixelRatio);
  lifeApi && lifeApi.setPixelRatio(pixelRatio);
  subApi && subApi.setPixelRatio(pixelRatio);
}
let resizeTick = 0;
addEventListener('resize', () => {
  if (resizeTick) return;
  resizeTick = requestAnimationFrame(() => {
    resizeTick = 0;
    const w = innerWidth, h = innerHeight;
    const s = renderer.getSize(new THREE.Vector2());
    if (Math.abs(s.x - w) < 1 && Math.abs(s.y - h) < 1) { trackVH(); return; }
    applySize();
    if (window.__ABYSS && window.__ABYSS.ready) post.composer.render();
    trackVH();
  });
});

// ── debug / rig interface ─────────────────────────────────────────────
window.__ABYSS = {
  ready: false,
  _scene: scene, _THREE: THREE, slowmo(x) { timeScale = x; },
  _refs: () => ({ life: lifeApi, sub: subApi, ocean: oceanApi }),
  anchors: ZONES.map(z => z.depth / MAX_DEPTH),
  jump(p) {
    scrollTo(0, p * maxScroll());
    pTarget = pSmooth = pPrev = p;
    if (!started) {
      started = true;
      document.getElementById('ignition').classList.add('hidden');
      document.getElementById('ignition').dataset.lock = '1';
      document.getElementById('hud').classList.remove('hidden');
      hud.liftVeil();
    }
  },
  state() { return { p: pSmooth, depth: pSmooth * MAX_DEPTH, dockIdx, dockK }; },
};

build();
