import * as THREE from 'three';
import { RNG } from '../util/noise.js';
import { WORLD_DEPTH, glowTexture, yOf } from './ocean.js';

const V3 = () => new THREE.Vector3();

// depth (m) → world Y

// ─────────────────────────── sardine school (SUNLIGHT) ───────────────
function buildSchool(center, rng) {
  const group = new THREE.Group();
  // dense shimmering shell — squashed ball of "fish mass"
  const geo = new THREE.SphereGeometry(14, 40, 26);
  geo.scale(1.15, 0.78, 1.15);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uT;
      varying float vSh; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        vec3 p = position;
        p.x += sin(p.y * 0.5 + uT * 1.4) * 0.9;
        p.y += cos(p.x * 0.4 + uT * 1.1) * 0.7;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vSh = 0.5 + 0.5 * sin(uT * 1.3 + position.x * 0.55 + position.y * 0.7 + position.z * 0.4);
        vP = position;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      varying float vSh; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        // sun-silver scales on top, abyssal teal below
        float topLight = clamp(vP.y * 0.06 + 0.45, 0.0, 1.0);
        vec3 base = mix(vec3(0.10, 0.24, 0.30), vec3(0.62, 0.78, 0.84), topLight * (0.35 + 0.65 * vSh));
        float sheen = pow(1.0 - abs(dot(vN, vV)), 2.0);
        vec3 col = base + vec3(0.35, 0.5, 0.55) * sheen * vSh;
        float a = (0.45 + 0.4 * vSh) * (1.0 - sheen * 0.35);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const ball = new THREE.Mesh(geo, mat);
  ball.frustumCulled = false;
  group.add(ball);
  // minnow veil — instanced fish orbiting through the ball
  const N = 220;
  const fgeo = new THREE.ConeGeometry(0.16, 1.0, 5);
  fgeo.rotateX(Math.PI / 2);
  const fmat = new THREE.MeshStandardMaterial({ color: 0xd8ecf2, roughness: 0.35, metalness: 0.75, emissive: 0x36474e, emissiveIntensity: 0.8 });
  const fish = new THREE.InstancedMesh(fgeo, fmat, N);
  fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const fdata = [];
  for (let i = 0; i < N; i++) {
    fdata.push({
      r: 4 + rng() * 12,
      sp: 0.3 + rng() * 0.7,
      ph: rng() * Math.PI * 2,
      tilt: (rng() - 0.5) * 0.8,
      y: (rng() - 0.5) * 9,
    });
  }
  group.add(fish);
  group.position.copy(center);
  group.userData = { mat, fdata, fish };
  return group;
}

// ─────────────────────────── jellyfish ───────────────────────────────
const JELLY_VERT = /* glsl */ `
  uniform float uT, uPhase;
  varying vec3 vN; varying vec3 vV; varying float vPulse;
  void main(){
    vPulse = sin(uT * 1.5 + uPhase) * 0.5 + 0.5;
    vec3 p = position;
    float swell = 1.0 + 0.16 * sin(uT * 1.5 + uPhase);
    p.xz *= swell;
    p.y *= 1.0 - 0.10 * sin(uT * 1.5 + uPhase);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const JELLY_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  varying vec3 vN; varying vec3 vV; varying float vPulse;
  void main(){
    float fres = pow(1.0 - abs(dot(vN, vV)), 2.2);
    float guts = pow(max(dot(vN, vV), 0.0), 3.0);
    vec3 col = uColor * (0.28 + 0.5 * vPulse) * guts
             + uColor * fres * (1.1 + 0.5 * vPulse)
             + vec3(0.9, 0.97, 1.0) * fres * 0.18;
    float a = clamp(guts * 0.35 + fres * 0.85, 0.0, 1.0) * uFade;
    gl_FragColor = vec4(col, a);
  }`;
const TENT_VERT = /* glsl */ `
  uniform float uT, uPhase;
  varying float vAlong;
  attribute float along;
  void main(){
    vAlong = along;
    vec3 p = position;
    float sway = sin(uT * 1.6 + uPhase + along * 5.0) * (0.25 + along * 1.5);
    p.x += sway * 0.55;
    p.z += cos(uT * 1.3 + uPhase * 2.0 + along * 4.0) * (0.25 + along * 1.2) * 0.45;
    p.y += sin(uT * 1.5 + uPhase) * 0.3 * along;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const TENT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  varying float vAlong;
  void main(){
    gl_FragColor = vec4(uColor * (1.0 - vAlong * 0.5), (1.0 - vAlong * 0.8) * 0.65 * uFade);
  }`;

function buildJelly(rng, color) {
  const g = new THREE.Group();
  const phase = rng() * Math.PI * 2;
  const bellMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uPhase: { value: phase }, uColor: { value: new THREE.Color(color) }, uFade: { value: 1 } },
    vertexShader: JELLY_VERT, fragmentShader: JELLY_FRAG,
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), bellMat);
  bell.scale.set(1, 0.82, 1);
  g.add(bell);
  // tentacles: 7 strands of 8 segments
  const segs = 8, strands = 7;
  const pos = new Float32Array(strands * segs * 2 * 3);
  const along = new Float32Array(strands * segs * 2);
  let vi = 0, ai = 0;
  for (let s = 0; s < strands; s++) {
    const a = (s / strands) * Math.PI * 2;
    const r0 = 1.15;
    for (let k = 0; k < segs; k++) {
      for (const t of [k / segs, (k + 1) / segs]) {
        pos[vi++] = Math.cos(a) * r0 * (1 - t * 0.35);
        pos[vi++] = -0.4 - t * 6.2;
        pos[vi++] = Math.sin(a) * r0 * (1 - t * 0.35);
        along[ai++] = t;
      }
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tg.setAttribute('along', new THREE.BufferAttribute(along, 1));
  const tentMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPhase: { value: phase }, uColor: { value: new THREE.Color(color) }, uFade: { value: 1 } },
    vertexShader: TENT_VERT, fragmentShader: TENT_FRAG,
  });
  g.add(new THREE.LineSegments(tg, tentMat));
  g.userData = { phase, bellMat, tentMat, baseScale: 0.7 + rng() * 1.3, drift: rng() * 0.4 + 0.1, bobA: 2 + rng() * 5 };
  g.scale.setScalar(g.userData.baseScale);
  return g;
}

// ─────────────────────────── the whale (TWILIGHT) ────────────────────
function buildWhale() {
  const g = new THREE.Group();
  // long body profile: 26 units, nose at +z, tail at -z
  const prof = [
    [0.00, 13.0],
    [0.85, 12.6],
    [1.55, 11.4],
    [1.95, 9.6],
    [2.10, 6.8],
    [2.00, 3.2],
    [1.75, -1.0],
    [1.35, -5.2],
    [0.85, -8.8],
    [0.42, -11.6],
    [0.16, -13.0],
  ];
  const geo = new THREE.BufferGeometry();
  const pos = [], idx = [];
  for (let i = 0; i < prof.length; i++) {
    const [w, z0] = prof[i];
    const l = 0, r = 1, t2 = 2, b = 3; // left right top bottom (diamond)
    const ySquash = 0.62;
    pos.push(-w, z0, l * 0,  w, 0 * 0, z0); // placeholder — rebuilt below
  }
  // build a proper ring seam: 4 points per station → quads
  const ringPos = [];
  for (let i = 0; i < prof.length; i++) {
    const [w, z0] = prof[i];
    const h = w * 0.62;
    ringPos.push(
      [-w, 0, z0],   // port
      [0, h, z0],    // top
      [w, 0, z0],    // starboard
      [0, -h, z0],   // bottom
    );
  }
  const vtx = [];
  ringPos.forEach(p => vtx.push(p[0], p[1], p[2]));
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vtx, 3));
  const ind = [];
  const R = 4;
  for (let i = 0; i < prof.length - 1; i++) {
    for (let k = 0; k < R; k++) {
      const a = i * R + k, b = i * R + (k + 1) % R;
      const c = (i + 1) * R + k, d = (i + 1) * R + (k + 1) % R;
      ind.push(a, c, b, b, c, d);
    }
  }
  // nose cap + tail cap
  const noseC = vtx.length / 3;
  vtx.push(0, 0.1, 13.6);
  for (let k = 0; k < R; k++) ind.push(noseC, (k + 1) % R, k);
  const tailC = vtx.length / 3;
  vtx.push(0, 0.1, -13.4);
  const lastRing = (prof.length - 1) * R;
  for (let k = 0; k < R; k++) ind.push(tailC, lastRing + k, lastRing + (k + 1) % R);
  geo.setIndex(ind);
  geo.deleteAttribute('position');
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vtx, 3));
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uT;
      varying vec3 vN; varying vec3 vWp;
      void main(){
        vec3 p = position;
        // tail beat — whips harder toward the fluke (−z)
        p.x += sin(uT * 1.05 - p.z * 0.10) * (0.3 + 5.0 * smoothstep(4.0, 13.0, -p.z));
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWp = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN; varying vec3 vWp;
      void main(){
        vec3 up = vec3(0.0, -1.0, 0.0);
        float lit = pow(clamp(vN.y * 0.75 + 0.42, 0.0, 1.0), 1.5);
        vec3 deep = vec3(0.015, 0.04, 0.06);
        vec3 top  = vec3(0.24, 0.44, 0.56);
        vec3 col = mix(deep, top, lit);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const body = new THREE.Mesh(geo, mat);
  g.add(body);
  // fluke
  const flukeGeo = new THREE.PlaneGeometry(16, 6, 8, 1);
  const fp = flukeGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, -Math.abs(fp.getX(i)) * 0.28);
  const fluke = new THREE.Mesh(flukeGeo, mat);
  fluke.position.set(0, 0.3, -13.0);
  fluke.rotation.x = Math.PI / 2 - 0.25;
  g.add(fluke);
  g.userData = { mat };
  g.scale.setScalar(2.0);
  return g;
}

// ─────────────────────────── anglerfish (MIDNIGHT) ───────────────────
function buildAngler(rng) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x1d2731, roughness: 0.85, metalness: 0.1, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), skin);
  body.scale.set(1.05, 0.85, 1.35);
  g.add(body);
  // jaw — wide open lower mouth
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.2, 7, 1, true), skin.clone());
  jaw.material.side = THREE.DoubleSide;
  jaw.rotation.x = Math.PI * 0.64;
  jaw.position.set(0, -1.7, 2.6);
  g.add(jaw);
  // fangs
  const fangMat = new THREE.MeshBasicMaterial({ color: 0xcfe8ee });
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 4), fangMat);
    const a = -0.8 + i * 0.32;
    f.position.set(Math.sin(a) * 1.9, -0.4, 3.4 + Math.cos(a) * 0.6);
    f.rotation.x = Math.PI - 0.3;
    g.add(f);
  }
  // eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x9adfe8 }));
  eye.position.set(2.2, 1.1, 1.8);
  g.add(eye);
  const eye2 = eye.clone(); eye2.position.x = -2.2; g.add(eye2);
  // esca stalk + lantern
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.4, 5), skin);
  stalk.position.set(0, 3.1, 1.6);
  stalk.rotation.x = 0.5;
  g.add(stalk);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xbdf6ff }));
  lantern.position.set(0, 4.4, 2.6);
  g.add(lantern);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(190,245,255,1)', 'rgba(120,220,255,0.5)'),
    color: 0x9feaff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.setScalar(7);
  halo.position.copy(lantern.position);
  g.add(halo);
  const light = new THREE.PointLight(0x59d9ff, 26, 60, 1.8);
  light.position.copy(lantern.position);
  g.add(light);
  g.userData = { phase: rng() * 6.28, lantern, halo, light };
  return g;
}

// ─────────────────────────── siphonophore (ABYSSAL) ──────────────────
function buildSiphonophore() {
  const g = new THREE.Group();
  const N = 42;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3 + 1] = -i * 3.2; seed[i] = i / N; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPix: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uT, uPix;
      attribute float aSeed;
      varying float vSeed;
      void main(){
        vSeed = aSeed;
        vec3 p = position;
        float w = sin(aSeed * 12.0 - uT * 0.7);
        p.x += w * 6.0 * aSeed;
        p.z += cos(aSeed * 9.0 - uT * 0.55) * 5.0 * aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float pulse = 0.6 + 0.4 * sin(uT * 2.2 - aSeed * 14.0);
        gl_PointSize = (2.2 + 5.5 * pulse) * uPix * (160.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vSeed;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.05, length(q));
        vec3 col = mix(vec3(0.4, 0.95, 1.0), vec3(0.75, 0.55, 1.0), vSeed);
        gl_FragColor = vec4(col, a * 0.9);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  g.add(pts);
  // swim bell
  const bellMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uPhase: { value: 0 }, uColor: { value: new THREE.Color('#7fe8ff') }, uFade: { value: 1 } },
    vertexShader: JELLY_VERT, fragmentShader: JELLY_FRAG,
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), bellMat);
  g.add(bell);
  g.userData = { mat, bellMat };
  g.scale.setScalar(0.6);
  return g;
}

// ─────────────────────────── vents (HADAL + FLOOR) ───────────────────
function buildChimney(rng, h, r) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.95, flatShading: true, emissive: 0xff5a14, emissiveIntensity: 0 });
  const segs = 3 + Math.floor(rng() * 3);
  let y = 0, rad = r;
  for (let i = 0; i < segs; i++) {
    const hh = (h / segs) * (0.7 + rng() * 0.6);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rad * (0.62 + rng() * 0.25), rad, hh, 7), mat);
    c.position.set((rng() - 0.5) * r * 0.5, y + hh / 2, (rng() - 0.5) * r * 0.5);
    c.rotation.set((rng() - 0.5) * 0.14, rng() * 3, (rng() - 0.5) * 0.14);
    group.add(c);
    y += hh * (0.75 + rng() * 0.2);
    rad *= 0.72 + rng() * 0.14;
  }
  group.userData = { topY: y, mat };
  return group;
}

function buildSmoke(h, rng) {
  const N = 56;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { seed[i] = rng(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uPix: { value: 1 }, uH: { value: h * 1.9 } },
    vertexShader: /* glsl */ `
      uniform float uT, uPix, uH;
      attribute float aSeed;
      varying float vAge;
      void main(){
        float age = fract(uT * 0.09 * (0.5 + aSeed) + aSeed * 7.31);
        vAge = age;
        vec3 p = vec3(0.0);
        p.y = age * uH;
        float sw = age * age * 14.0;
        p.x = sin(aSeed * 40.0 + uT * 0.4 + age * 6.0) * sw;
        p.z = cos(aSeed * 31.0 + uT * 0.35 + age * 5.0) * sw;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = mix(10.0, 90.0, age) * uPix * (30.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAge;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.1, length(q));
        vec3 col = mix(vec3(1.0, 0.45, 0.13), vec3(0.012, 0.012, 0.015), smoothstep(0.0, 0.26, vAge));
        float a = m * (1.0 - vAge) * smoothstep(0.0, 0.12, vAge) * 0.7;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

function buildWorms(rng, count, spread) {
  const group = new THREE.Group();
  const tubeGeo = new THREE.CylinderGeometry(0.09, 0.14, 1, 5);
  tubeGeo.translate(0, 0.5, 0);
  const tipGeo = new THREE.SphereGeometry(0.16, 6, 5);
  tipGeo.translate(0, 1.0, 0);
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.7 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xc2261c, roughness: 0.5, emissive: 0x651008, emissiveIntensity: 0.4 });
  const tubes = new THREE.InstancedMesh(tubeGeo, tubeMat, count);
  const tips = new THREE.InstancedMesh(tipGeo, tipMat, count);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * spread;
    P.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    const h = 1.5 + rng() * 2.6;
    S.set(1, h, 1);
    Q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.5, rng() * 3, (rng() - 0.5) * 0.5));
    M.compose(P, Q, S);
    tubes.setMatrixAt(i, M);
    tips.setMatrixAt(i, M);
  }
  group.add(tubes, tips);
  return group;
}

// ─────────────────────────── module entry ────────────────────────────
export function buildLife(scene) {
  const rng = RNG(77);
  const stations = [];
  const dyn = [];

  // STATION 0 · SUNLIGHT (110 m) — sardine school
  const schoolCenter = new THREE.Vector3(66, yOf(110) - 14, 8);
  const school = buildSchool(schoolCenter, rng);
  scene.add(school);
  stations.push(new THREE.Vector3(50, yOf(110) - 8, 18)); // the ball's near shoulder

  // jellyfield belt (covers twilight + some midnight)
  const jellies = [];
  const JCOLS = ['#6fe3ff', '#8fd0ff', '#b08cff', '#66e8e0'];
  for (let i = 0; i < 34; i++) {
    const j = buildJelly(rng, JCOLS[i % JCOLS.length]);
    const depthM = 300 + rng() * 3400;
    // half of them cluster toward the twilight station
    const nearStation = i < 18;
    const r = nearStation ? 25 + rng() * 60 : 45 + rng() * 170;
    const a = rng() * Math.PI * 2;
    j.position.set(
      (nearStation ? 30 : 0) + Math.cos(a) * r,
      yOf(depthM),
      (nearStation ? 26 : 0) + Math.sin(a) * r,
    );
    j.userData.homeY = j.position.y;
    scene.add(j);
    jellies.push(j);
  }

  // STATION 1 · TWILIGHT (600 m) — whale corridor
  stations.push(new THREE.Vector3(28, yOf(600) - 5, 35));
  const whale = buildWhale();
  whale.position.set(-80, yOf(520), 200);
  scene.add(whale);

  // STATION 2 · MIDNIGHT (2,200 m) — angler trio
  const anglers = [];
  const anglerAnchor = new THREE.Vector3(22, yOf(2200) - 6, 30);
  stations[2] = anglerAnchor.clone(); // exact dock point
  
  for (let i = 0; i < 3; i++) {
    const an = buildAngler(rng);
    an.position.copy(anglerAnchor).add(new THREE.Vector3(-10 - i * 9, (rng() - 0.5) * 14, (rng() - 0.5) * 18));
    an.userData.home = an.position.clone();
    const s = 0.9 + rng() * 0.9;
    an.scale.setScalar(s);
    scene.add(an);
    anglers.push(an);
  }

  // STATION 3 · ABYSSAL (5,000 m) — siphonophore drift
  const siph = buildSiphonophore();
  const siphAnchor = new THREE.Vector3(16, yOf(5000), 25);
  siph.position.copy(siphAnchor).add(new THREE.Vector3(-24, 18, -10));
  siph.rotation.z = 0.32;
  scene.add(siph);
  const siph2 = buildSiphonophore();
  siph2.scale.setScalar(0.33);
  siph2.rotation.z = -0.55;
  const siph2Base = new THREE.Vector3(16, yOf(5000) - 16, 25).add(new THREE.Vector3(22, 0, 18));
  siph2.position.copy(siph2Base);
  scene.add(siph2);
  stations[3] = new THREE.Vector3(16, yOf(5000) - 7, 25);

  // STATION 4 · HADAL (8,200 m) — ridge chimneys + worms
  const ridge = new THREE.Group();
  const ridgeY = yOf(8260);
  const ridgeBase = new THREE.Mesh(
    new THREE.IcosahedronGeometry(26, 2),
    new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 1, flatShading: true }),
  );
  ridgeBase.scale.set(1.6, 0.52, 1.1);
  ridgeBase.position.y = -12;
  ridge.add(ridgeBase);
  const vents = [];
  for (let i = 0; i < 3; i++) {
    const h = 16 + rng() * 14;
    const ch = buildChimney(rng, h, 3.2 + rng() * 1.6);
    ch.position.set(-14 + i * 12 + rng() * 4, -2, (rng() - 0.5) * 14);
    ridge.add(ch);
    const smoke = buildSmoke(h, rng);
    smoke.position.set(ch.position.x, ch.position.y + ch.userData.topY, ch.position.z);
    ridge.add(smoke);
    vents.push({ ch, smoke });
  }
  const wormsR = buildWorms(rng, 90, 30);
  wormsR.position.y = -1;
  ridge.add(wormsR);
  const ventGlow = new THREE.PointLight(0xd8591f, 46, 100, 1.7);
  ventGlow.position.set(0, 10, 0);
  ridge.add(ventGlow);
  ridge.position.set(10, ridgeY, 20);
  ridge.rotation.y = 0.7;
  scene.add(ridge);
  stations[4] = new THREE.Vector3(10, ridgeY + 15, 20);

  // FLOOR vent field (outro centerpiece)
  const field = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const h = 22 + rng() * 30;
    const ch = buildChimney(rng, h, 4 + rng() * 3.5);
    const a = rng() * Math.PI * 2, r = 30 + rng() * 130;
    ch.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
    field.add(ch);
    const smoke = buildSmoke(h, rng);
    smoke.position.set(ch.position.x, ch.position.y + ch.userData.topY, ch.position.z);
    field.add(smoke);
    vents.push({ ch, smoke });
  }
  const wormsF = buildWorms(rng, 160, 120);
  field.add(wormsF);
  const glowA = new THREE.PointLight(0xff6a1a, 160, 260, 1.6);
  glowA.position.set(30, 24, 20);
  field.add(glowA);
  const glowB = new THREE.PointLight(0xff8a3c, 90, 200, 1.7);
  glowB.position.set(-70, 16, -50);
  field.add(glowB);
  field.position.set(20, -WORLD_DEPTH, 0);
  scene.add(field);

  // camera-facing temp objects
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3(1, 1, 1);
  const eul = new THREE.Euler();
  const UPv = new THREE.Vector3(0, 1, 0);

  const named = { whale, school, jellies, anglers, siph, ridge, field };
  return {
    stations,
    named,
    floorVents: [new THREE.Vector3(50, -WORLD_DEPTH + 10, 20), new THREE.Vector3(-50, -WORLD_DEPTH + 10, -50)],
    setPixelRatio(pr) {
      for (const v of vents) v.smoke.material.uniforms.uPix.value = pr;
      siph.userData.mat.uniforms.uPix.value = pr;
      siph2.userData.mat.uniforms.uPix.value = pr;
    },
    update(t, dt, subPos, shipQ) {
      // bait ball — the mass breathes, minnows orbit through it
      {
        const u = school.userData;
        u.mat.uniforms.uT.value = t;
        const breathe = 1 + Math.sin(t * 0.9) * 0.04;
        school.scale.set(breathe, 1 / breathe, breathe);
        school.rotation.y = t * 0.03;
        for (let i = 0; i < u.fdata.length; i++) {
          const f = u.fdata[i];
          const a = t * f.sp + f.ph;
          tmpP.set(Math.cos(a) * f.r, f.y + Math.sin(a * 2) * 1.5, Math.sin(a) * f.r);
          tmpP.applyAxisAngle(UPv, f.tilt);
          tmpQ.setFromEuler(eul.set(0, -a - Math.PI / 2, Math.sin(a * 3) * 0.15));
          tmpM.compose(tmpP, tmpQ, tmpS);
          u.fish.setMatrixAt(i, tmpM);
        }
        u.fish.instanceMatrix.needsUpdate = true;
      }
      // jellies: pulse + rise/drift + fade with camera distance
      for (const j of jellies) {
        const u = j.userData;
        u.bellMat.uniforms.uT.value = t;
        u.tentMat.uniforms.uT.value = t;
        j.position.y = u.homeY + Math.sin(t * 0.16 + u.phase) * (10 + u.bobA)
          + ((t * u.drift * 2.0 + u.phase * 20.0) % 120) - 60 + u.bobA * 0; // slow rise cycle
        j.position.x += Math.sin(t * 0.1 + u.phase) * 0.008;
        const dCam = j.position.distanceTo(subPos);
        const fade = THREE.MathUtils.clamp(1.6 - dCam / 260, 0, 1);
        u.bellMat.uniforms.uFade.value = fade;
        u.tentMat.uniforms.uFade.value = fade;
        const puls = 1 + 0.05 * Math.sin(t * 1.5 + u.phase);
        j.scale.setScalar(u.baseScale * puls);
      }
      // whale path — a long slow crossing, loops
      const wu = whale.userData;
      wu.mat.uniforms.uT.value = t;
      // the colossus keeps to the far side — a slow silhouette on the horizon
      whale.position.set(
        -260 + Math.sin(t * 0.05) * 18,
        yOf(520) - 34 + Math.sin(t * 0.11) * 8,
        -200 + Math.sin(t * 0.02) * 60,
      );
      whale.rotation.y = Math.PI * 0.52 + Math.sin(t * 0.05) * 0.1;
      whale.rotation.z = Math.sin(t * 0.4) * 0.02;
      // anglers bob and eye the sub
      for (const an of anglers) {
        const u = an.userData;
        an.position.y = u.home.y + Math.sin(t * 0.32 + u.phase) * 4;
        an.position.x = u.home.x + Math.sin(t * 0.11 + u.phase) * 6;
        const flicker = 0.75 + 0.25 * Math.sin(t * 7 + u.phase) * Math.sin(t * 3.3 + u.phase * 2.0);
        u.light.intensity = 22 * flicker;
        u.halo.material.opacity = 0.7 * flicker;
        an.lookAt(subPos.x + Math.sin(u.phase) * 8, subPos.y, subPos.z);
      }
      // siphonophore lazily turns
      for (const s2 of [siph, siph2]) {
        s2.userData.mat.uniforms.uT.value = t;
        s2.userData.bellMat.uniforms.uT.value = t;
      }
      siph.rotation.y = t * 0.05;
      siph.position.y = siphAnchor.y + 18 + Math.sin(t * 0.09) * 10;
      siph2.rotation.y = -t * 0.07;
      siph2.position.y = siph2Base.y + Math.sin(t * 0.13 + 2.0) * 7;
      // smokers
      for (const v of vents) v.smoke.material.uniforms.uT.value = t;
ventGlow.intensity = 44 + 12 * Math.sin(t * 5.3);
      glowA.intensity = 140 + 30 * Math.sin(t * 4.1 + 1.7);
      glowB.intensity = 80 + 20 * Math.sin(t * 6.2 + 4.0);
    },
  };
}
