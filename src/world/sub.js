import * as THREE from 'three';
import { RNG } from '../util/noise.js';
import { glowTexture } from './ocean.js';

// DSV NEREIS — a bathyscaphe built from primitives. Local axes: forward = +Z.
export function buildSub(scene) {
  const rng = RNG(101);
  const sub = new THREE.Group();

  const navy = new THREE.MeshStandardMaterial({ color: 0x2e4d5c, roughness: 0.5, metalness: 0.6 });
  const navyDark = new THREE.MeshStandardMaterial({ color: 0x1d313d, roughness: 0.55, metalness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb78a4a, roughness: 0.35, metalness: 0.95 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xa8621e, roughness: 0.62, metalness: 0.3 });

  // pressure sphere + aft hull
  const hull = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 18), navy);
  hull.scale.set(1, 1, 1.25);
  sub.add(hull);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.35, 20, 16), navyDark);
  sphere.position.set(0, 0.35, 3.4);
  sub.add(sphere);
  // viewport — glass dome with a warm life inside
  const view = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshPhysicalMaterial({
      color: 0x9fd4dd, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.38,
      emissive: 0xffb162, emissiveIntensity: 0.18, side: THREE.DoubleSide,
    }),
  );
  view.rotation.x = -Math.PI / 2 + 0.28;
  view.position.set(0, 0.5, 5.4);
  sub.add(view);
  const viewRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 10, 22), brass);
  viewRing.position.copy(view.position);
  viewRing.rotation.x = Math.PI / 2 - 0.28;
  sub.add(viewRing);
  // cabin warmth
  const cabin = new THREE.PointLight(0xffc98a, 14, 18, 1.6);
  cabin.position.set(0, 0.8, 4.2);
  sub.add(cabin);
  // tiny pilot silhouette inside the glow
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), navyDark);
  pilot.position.set(0, 0.55, 4.3);
  sub.add(pilot);

  // sail / fairing
  const sail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 3.6), navy);
  sail.position.set(0, 3.3, 1.2);
  sub.add(sail);
  const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 8), brass);
  periscope.position.set(0, 4.4, 1.2);
  sub.add(periscope);

  // aft taper + thruster shroud + fins (paint orange accents)
  const taper = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.55, 3.4, 12), navyDark);
  taper.rotation.x = Math.PI / 2;
  taper.position.z = -4.6;
  sub.add(taper);
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.28, 10, 20), paint);
  shroud.position.z = -6.2;
  sub.add(shroud);
  const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.0, 6), brass);
  prop.rotation.z = Math.PI / 2;
  prop.position.z = -6.2;
  sub.add(prop);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 1.7), paint);
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    fin.position.set(Math.cos(a) * 2.15, Math.sin(a) * 2.15, -4.3);
    fin.rotation.z = a;
    sub.add(fin);
  }
  // side ballast pods + skids
  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 3.6, 6, 12), navy);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(s * 3.35, -0.9, -0.6);
    sub.add(pod);
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 5.2), brass);
    skid.position.set(s * 2.4, -3.1, 0.4);
    sub.add(skid);
    const strut1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.25), brass);
    strut1.position.set(s * 2.4, -2.6, 1.6);
    sub.add(strut1);
    const strut2 = strut1.clone(); strut2.position.z = -1.0; sub.add(strut2);
    // pod strobe
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff4444 : 0x4dffa6 }));
    strobe.position.set(s * 4.25, -0.35, -1.6);
    sub.add(strobe);
    if (!sub.userData.strobes) sub.userData.strobes = [];
    sub.userData.strobes.push(strobe);
  }

  // ── headlight: real spotlight + fake volumetric cone ───────────────
  const spot = new THREE.SpotLight(0xbfeaff, 60, 320, 0.42, 0.55, 1.4);
  spot.position.set(0, 0.6, 5.2);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -1, 40);
  sub.add(spotTarget);
  spot.target = spotTarget;
  sub.add(spot);

  const coneLen = 46;
  const coneGeo = new THREE.ConeGeometry(6.5, coneLen, 18, 6, true);
  coneGeo.translate(0, -coneLen / 2, 0);
  coneGeo.rotateX(-Math.PI / 2);
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uFade: { value: 0.4 } },
    vertexShader: /* glsl */ `
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main(){
        vAlong = position.z / ${coneLen.toFixed(1)};
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      uniform float uFade;
      void main(){
        float rim = abs(dot(normalize(vN), normalize(vV)));
        float body = pow(rim, 1.6);
        float a = (1.0 - vAlong);
        a = pow(a, 1.7) * body * 0.34 * uFade;
        gl_FragColor = vec4(vec3(0.62, 0.85, 0.95), a);
      }`,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, 0.6, 6.4);
  sub.add(cone);
  // lens glow at the lamp
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(220,245,255,1)', 'rgba(150,220,255,0.45)'),
    color: 0xd9f2ff, transparent: true, depthWrite: false, opacity: 0.9, blending: THREE.AdditiveBlending,
  }));
  lampGlow.scale.setScalar(4.5);
  lampGlow.position.set(0, 0.6, 6.3);
  sub.add(lampGlow);

  // ── bubble engine (rear) ───────────────────────────────────────────
  const BN = 140;
  const bPos = new Float32Array(BN * 3);
  const bSeed = new Float32Array(BN);
  for (let i = 0; i < BN; i++) bSeed[i] = rng();
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  bGeo.setAttribute('aSeed', new THREE.BufferAttribute(bSeed, 1));
  const bMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uSpeed: { value: 0 }, uPix: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uT, uSpeed, uPix;
      attribute float aSeed;
      varying float vAge;
      void main(){
        float lane = fract(aSeed * 13.7);
        float age = fract(uT * (0.5 + aSeed * 0.8) + aSeed * 9.1);
        vAge = age;
        vec3 p;
        p.z = -6.6 - age * (10.0 + uSpeed * 26.0);
        p.y = 0.3 + age * age * (6.0 + aSeed * 4.0) ;
        p.x = (lane - 0.5) * (1.5 + age * 5.0) + sin(age * 20.0 + aSeed * 40.0) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.0 + age * 3.0) * uPix * (60.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSpeed;
      varying float vAge;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float r = length(q);
        float ring = smoothstep(0.5, 0.42, r) - smoothstep(0.30, 0.06, r);
        float a = ring * (1.0 - vAge) * clamp(uSpeed * 2.2, 0.0, 1.0) * 0.8;
        gl_FragColor = vec4(vec3(0.75, 0.92, 1.0), a);
      }`,
  });
  const bubbles = new THREE.Points(bGeo, bMat);
  bubbles.frustumCulled = false;
  sub.add(bubbles);

  scene.add(sub);

  return {
    group: sub,
    spot, spotTarget, coneMat, lampGlow, cabin,
    setPixelRatio(pr) { bMat.uniforms.uPix.value = pr; },
    update(t, speed) {
      bMat.uniforms.uT.value = t;
      bMat.uniforms.uSpeed.value = speed;
      // strobes blink alternately
      const s = sub.userData.strobes;
      if (s) {
        s[0].visible = Math.sin(t * 3.2) > 0.55;
        s[1].visible = Math.sin(t * 3.2 + Math.PI) > 0.55;
      }
      // cabin breathes faintly — someone is home
      cabin.intensity = 12 + 2.6 * Math.sin(t * 0.9);
      lampGlow.material.opacity = 0.75 + 0.2 * Math.sin(t * 7.7);
    },
    setLight(state) {
      // state 0..1 how much the headlight matters (grows with darkness)
      spot.intensity = 30 + 160 * state;
      spot.distance = 150 + 260 * state;
      coneMat.uniforms.uFade.value = 0.16 + 0.55 * state;
      lampGlow.material.opacity = 0.35 + 0.55 * state;
      lampGlow.scale.setScalar(3 + 2.5 * state);
    },
  };
}
