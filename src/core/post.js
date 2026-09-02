import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDepth: { value: 0 }, // 0 surface → 1 floor: vignette tightens, blues sink
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uDepth;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      // pressure vignette — the dark closes in as you descend
      float vig = smoothstep(0.92, 0.30 - uDepth * 0.10, d);
      c.rgb *= mix(0.42, 1.0, vig);
      // gentle teal wash at depth
      c.rgb = mix(c.rgb, c.rgb * vec3(0.75, 0.92, 1.06), uDepth * 0.35);
      // slight chroma on the edges for water optics
      float ca = smoothstep(0.3, 0.9, d) * 0.0035;
      c.r = texture2D(tDiffuse, vUv + vec2(ca, 0.0)).r;
      c.b = texture2D(tDiffuse, vUv - vec2(ca, 0.0)).b;
      gl_FragColor = c;
    }`,
};

export function buildPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.62, // strength — bioluminescence wants to bloom
    0.7,  // radius
    0.5,  // threshold
  );
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, grade,
    setDepth(d) { grade.uniforms.uDepth.value = d; },
    setSize(w, h) { composer.setSize(w, h); composer.setPixelRatio(renderer.getPixelRatio()); },
  };
}
