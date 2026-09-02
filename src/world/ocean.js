import * as THREE from 'three';
import { RNG, NOISE_GLSL } from '../util/noise.js';

export const WORLD_DEPTH = 2300;           // world units for MAX_DEPTH (10,935 m)

const C = (hex) => new THREE.Color(hex);

// depth (m) → world Y
export const yOf = (m) => -(m / 10935) * WORLD_DEPTH;

// ── shared soft-sprite texture (radial glow) ───────────────────────────
export function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.4)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.25, mid);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// ── vertical water-gradient dome ───────────────────────────────────────
function buildDome() {
  const geo = new THREE.SphereGeometry(4200, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCamY: { value: 0 }, // camera world y (0 → -WORLD_DEPTH)
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform float uTime, uCamY;
      ${NOISE_GLSL}
      void main(){
        float d = clamp(-uCamY / ${WORLD_DEPTH.toFixed(1)}, 0.0, 1.0); // 0..1 descent
        // five-stop water column
        vec3 c0 = vec3(0.20, 0.50, 0.64);  // sunlit teal
        vec3 c1 = vec3(0.035, 0.17, 0.30);  // twilight
        vec3 c2 = vec3(0.02, 0.08, 0.17);  // midnight
        vec3 c3 = vec3(0.004, 0.014, 0.035); // abyssal
        vec3 c4 = vec3(0.0, 0.004, 0.010); // hadal
        vec3 col = mix(c0, c1, smoothstep(0.0, 0.12, d));
        col = mix(col, c2, smoothstep(0.09, 0.32, d));
        col = mix(col, c3, smoothstep(0.28, 0.62, d));
        col = mix(col, c4, smoothstep(0.55, 0.9, d));
        // looking up: bright water surface while shallow
        float up = clamp(vDir.y, 0.0, 1.0);
        float surfaceLight = (1.0 - smoothstep(0.0, 0.030, d));
        col += vec3(0.5, 0.75, 0.8) * pow(up, 3.4) * surfaceLight * 0.42;
        // caustic shimmer on the ceiling while shallow
        float ca = vnoise(vDir.xz * 14.0 / max(vDir.y, 0.08) + uTime * 0.22);
        ca = smoothstep(0.55, 0.95, ca);
        col += vec3(0.4, 0.8, 0.9) * ca * pow(up, 3.6) * surfaceLight * 0.18;
        col += c0 * (1.0 - d) * 0.14;
        // looking down: warm vent glow near the floor
        float down = clamp(-vDir.y, 0.0, 1.0);
        float floorGlow = smoothstep(0.86, 1.0, d);
        col += vec3(0.45, 0.16, 0.03) * pow(down, 2.0) * floorGlow * 0.5;
        // subtle swarm of distant biolum specks below midnight
        float n = hash21(floor(vDir.xz / max(abs(vDir.y) + 0.4, 0.25) * 90.0));
        float speck = step(0.9975, n) * smoothstep(0.25, 0.5, d);
        col += vec3(0.2, 0.7, 0.9) * speck * (0.4 + 0.6 * sin(uTime * 2.0 + n * 40.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// ── god-ray shafts (surface) ───────────────────────────────────────────
function buildGodRays() {
  const group = new THREE.Group();
  const rng = RNG(11);
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vR;
      uniform float uTime;
      void main(){
        vUv = uv;
        vec3 p = position;
        vR = 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime, uFade;
      void main(){
        float edge = sin(vUv.x * 3.14159);
        float len = 1.0 - vUv.y;            // fades deeper
        float a = pow(edge, 2.4) * pow(len, 1.7) * 0.13 * uFade;
        vec3 col = vec3(0.55, 0.9, 0.95);
        gl_FragColor = vec4(col, a);
      }`,
  });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(geo, mat);
    const w = 14 + rng() * 34;
    m.scale.set(w, 700 + rng() * 500, 1);
    m.position.set((rng() - 0.5) * 420, -260, (rng() - 0.5) * 420);
    const tilt = 0.12 + rng() * 0.22;
    m.rotation.set(0, rng() * Math.PI, tilt);
    m.userData.sway = { ph: rng() * 6.28, amp: 0.03 + rng() * 0.05, rz: tilt };
    group.add(m);
  }
  group.userData.mat = mat;
  return group;
}

// ── marine snow (two point shells, wrapped around the camera) ──────────
function pointsMaterial({ color, size, opacity, glow = 0 }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uSub: { value: new THREE.Vector3() },
      uColor: { value: color },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uGlow: { value: glow },
      uPix: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uSize, uPix, uGlow;
      uniform vec3 uSub;
      varying float vA; varying float vGlow;
      attribute float aSeed;
      void main(){
        vec3 box = vec3(340.0, 420.0, 340.0);
        // wrap the snow volume around the sub
        vec3 p = position;
        p.y += uTime * (1.2 + aSeed * 2.2);       // gentle rise+fall drift
        p = mod(p - uSub + box * 0.5, box) - box * 0.5 + uSub;
        // lateral sway
        p.x += sin(uTime * 0.35 + aSeed * 31.0) * 3.0;
        p.z += cos(uTime * 0.27 + aSeed * 47.0) * 3.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vA = smoothstep(320.0, 60.0, dist);
        vGlow = uGlow * smoothstep(60.0, 8.0, distance(p, uSub)); // flare near sub
        gl_PointSize = max(uSize * (1.0 + vGlow * 1.6) * uPix * (140.0 / dist), 2.3 * uPix);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity, uTime;
      varying float vA; varying float vGlow;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float r = length(q);
        float a = smoothstep(0.5, 0.08, r) * vA * (uOpacity + vGlow);
        vec3 col = uColor + vec3(0.35, 0.8, 1.0) * vGlow;
        gl_FragColor = vec4(col, a);
      }`,
  });
}

function makeSnow(count, rng, color, size, opacity, glow) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (rng() - 0.5) * 340;
    pos[i * 3 + 1] = (rng() - 0.5) * 420;
    pos[i * 3 + 2] = (rng() - 0.5) * 340;
    seed[i] = rng();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const pts = new THREE.Points(geo, pointsMaterial({ color: C(color), size, opacity, glow }));
  pts.frustumCulled = false;
  return pts;
}

// ── seafloor: dunes + rocks ────────────────────────────────────────────
function buildFloor() {
  const group = new THREE.Group();
  const rng = RNG(23);
  const seg = 110;
  const geo = new THREE.PlaneGeometry(1900, 1900, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const posA = geo.attributes.position;
  for (let i = 0; i < posA.count; i++) {
    const x = posA.getX(i), z = posA.getZ(i);
    const d = Math.hypot(x, z);
    const dune = Math.sin(x * 0.016 + Math.sin(z * 0.011) * 2.0) * 4.5
      + Math.sin(z * 0.021 + x * 0.007) * 3.2
      + Math.sin(d * 0.05) * 1.5;
    const rim = Math.max(0, (d - 340) / 400);   // trench walls rise at the edges
    posA.setY(i, dune - 2 + Math.min(rim * rim * 120, 95));
  }
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpot: { value: new THREE.Vector3() },      // sub headlight hit point
      uSpotDir: { value: new THREE.Vector3(0, -1, 0) },
      uVent1: { value: new THREE.Vector3() },
      uVent2: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN;
      void main(){
        vW = (modelMatrix * vec4(position,1.0)).xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN;
      uniform vec3 uSpot, uSpotDir, uVent1, uVent2;
      uniform float uTime;
      ${NOISE_GLSL}
      void main(){
        vec3 base = vec3(0.028, 0.035, 0.042);                     // abyssal sediment
        float sed = fbm(vW.xz * 0.02);
        base = mix(base, vec3(0.05, 0.055, 0.06), sed);
        // sub headlight pool
        vec3 toF = vW - uSpot;
        float dist = length(toF);
        vec3 spotDir = normalize(uSpotDir);
        float cone = smoothstep(0.86, 0.985, dot(normalize(toF), -spotDir));
        float spot = cone * smoothstep(420.0, 30.0, dist);
        float ndl = max(dot(vN, normalize(uSpot - vW)), 0.0);
        vec3 col = base + vec3(0.75, 0.85, 0.9) * spot * ndl * 1.6;
        // vent warmth
        float v1 = smoothstep(120.0, 8.0, distance(vW, uVent1));
        float v2 = smoothstep(120.0, 8.0, distance(vW, uVent2));
        float warmth = max(v1, v2) * (0.75 + 0.25 * sin(uTime * 6.0 + vW.x * 0.3));
        col += vec3(0.9, 0.35, 0.08) * warmth * (0.25 + 0.75 * sed);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.position.y = -WORLD_DEPTH;
  group.add(floor);
  // scattered rocks
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a3640, roughness: 0.95, metalness: 0.05, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 70);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = 30 + rng() * 620;
    P.set(Math.cos(a) * r, -WORLD_DEPTH + 1.5, Math.sin(a) * r);
    S.setScalar(2 + rng() * rng() * 14);
    S.y *= 0.55 + rng() * 0.5;
    Q.setFromEuler(new THREE.Euler(rng() * 0.4, rng() * Math.PI, rng() * 0.4));
    M.compose(P, Q, S);
    rocks.setMatrixAt(i, M);
  }
  group.add(rocks);
  group.userData = { floorMat: mat };
  return group;
}

// ── module entry ───────────────────────────────────────────────────────
export function buildOcean(scene) {
  const dome = buildDome();
  const rays = buildGodRays();
  const rngN = RNG(31), rngF = RNG(47), rngB = RNG(59);
  const snowNear = makeSnow(900, rngN, '#cfe9f2', 1.5, 0.5, 0);
  const snowFar = makeSnow(1500, rngF, '#9fc4d4', 2.4, 0.3, 0);
  const plankton = makeSnow(650, rngB, '#59d9ff', 1.8, 0.12, 1); // flares near the sub
  const floor = buildFloor();
  scene.add(dome, rays, snowNear, snowFar, plankton, floor);

  scene.fog = new THREE.FogExp2(0x0a3046, 0.0028);

  const fogCol0 = C('#123f57'), fogCol1 = C('#000308');
  const hemi = new THREE.HemisphereLight(0xa8e0f0, 0x1d3f4d, 2.3);
  scene.add(hemi);

  const tempC = new THREE.Color();
  return {
    floorUserData: floor.userData,
    update(t, camY, subPos, spotPoint, spotDir, ventA, ventB) {
      const d = THREE.MathUtils.clamp(-camY / WORLD_DEPTH, 0, 1);
      // seafloor + trench walls only exist for the hadal finale
      floor.visible = d > 0.62;
      dome.position.copy(subPos); // keep dome centered on the dive
      const dm = dome.material.uniforms;
      dm.uTime.value = t;
      dm.uCamY.value = camY;
      // fog: denser + darker with depth
      scene.fog.density = 0.00035 + d * d * 0.0125;
      tempC.copy(fogCol0).lerp(fogCol1, Math.min(1, d * 1.9));
      scene.fog.color.copy(tempC);
      scene.background = tempC.clone().multiplyScalar(0.9);
      // ambient dies with depth
      hemi.intensity = 2.3 * (1 - Math.min(1, d * 1.6)) + 0.2;
      hemi.color.setHSL(0.52, 0.55, 0.75 - d * 0.3);
      // rays only near the top
      rays.visible = d < 0.16;
      rays.rotation.y = t * 0.008;
      rays.userData.mat.uniforms.uTime.value = t;
      rays.userData.mat.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(d, 0.008, 0.055);
      rays.position.set(subPos.x, 0, subPos.z);
      // particle shells ride the sub
      for (const s of [snowNear, snowFar, plankton]) {
        s.material.uniforms.uTime.value = t;
        s.material.uniforms.uSub.value.copy(subPos);
      }
      // front particle layers lead the fall slightly
      snowNear.position.y = -12;
      // floor spot tracking
      const fm = floor.userData.floorMat.uniforms;
      fm.uTime.value = t;
      fm.uSpot.value.copy(spotPoint);
      fm.uSpotDir.value.copy(spotDir);
      fm.uVent1.value.copy(ventA);
      fm.uVent2.value.copy(ventB);
    },
    setPixelRatio(pr) {
      for (const s of [snowNear, snowFar, plankton]) s.material.uniforms.uPix.value = pr;
    },
  };
}
