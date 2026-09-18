'use client';

import { useEffect, useRef } from 'react';

// Adapted from ahnafnafee/ahnafnafee.dev's StarfieldBackground.tsx (MIT).
// It retains its Three.js starfield, forward warp and cursor gravity, tuned for hand lab.
const STAR_COUNT = 5200;
const DEPTH = 1600;
const SPREAD = 1100;
const VISIBLE_PARTICLE_COUNT = 60;
const PARTICLE_COLORS = ['blue', 'pink', 'cyan', 'orange', 'violet'];

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fallbackRef.current;
    if (!field || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = Array.from(field.querySelectorAll<HTMLElement>('.visible-particle'));
    const hero = document.querySelector<HTMLElement>('.hero');
    const header = document.querySelector<HTMLElement>('.site-header');
    let animationFrame = 0;
    let lastTime = performance.now();
    const pointer = { x: -9999, y: -9999 };
    type Particle = { element: HTMLElement; x: number; y: number; vx: number; vy: number; age: number; duration: number; size: number };
    const particles: Particle[] = elements.map((element) => ({ element, x: 0, y: 0, vx: 0, vy: 0, age: 0, duration: 1, size: 4 }));

    const getSpawnBounds = () => {
      const heroBox = hero?.getBoundingClientRect();
      const headerBox = header?.getBoundingClientRect();
      return { left: heroBox?.left ?? window.innerWidth * 0.18, right: heroBox?.right ?? window.innerWidth * 0.82, top: Math.max(90, (headerBox?.bottom ?? 70) + 28), bottom: Math.min(window.innerHeight - 24, heroBox?.bottom ?? window.innerHeight * 0.72) };
    };
    const spawn = (particle: Particle, randomizeAge = false) => {
      const spawnBounds = getSpawnBounds();
      // Birth stays inside the highlighted hero area; flight targets the real viewport boundary.
      const bounds = { left: -32, right: window.innerWidth + 32, top: -32, bottom: window.innerHeight + 32 };
      particle.x = spawnBounds.left + 20 + Math.random() * Math.max(1, spawnBounds.right - spawnBounds.left - 40);
      particle.y = spawnBounds.top + 20 + Math.random() * Math.max(1, spawnBounds.bottom - spawnBounds.top - 40);
      let targetX = particle.x; let targetY = particle.y;
      const route = Math.random();
      if (route < 0.72) {
        targetX = Math.random() < 0.5 ? bounds.left - 28 : bounds.right + 28;
        // Some side-bound particles also lean into the nearest top/bottom corner.
        if (Math.random() < 0.36) targetY = particle.y < window.innerHeight / 2 ? bounds.top - 28 : bounds.bottom + 28;
      } else if (route < 0.9) targetY = bounds.top - 28;
      else targetY = bounds.bottom + 28;
      targetX += (Math.random() - 0.5) * 64; targetY += (Math.random() - 0.5) * 64;
      particle.duration = 2.75 + Math.random() * 2.25;
      particle.vx = (targetX - particle.x) / particle.duration; particle.vy = (targetY - particle.y) / particle.duration;
      particle.age = randomizeAge ? Math.random() * particle.duration : 0;
      particle.size = (4 + Math.random() * 7) * 0.6;
      particle.element.style.width = `${particle.size}px`; particle.element.style.height = `${particle.size}px`;
    };
    particles.forEach((particle) => spawn(particle, true));
    const onPointerMove = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; };
    const animate = (now: number) => {
      const delta = Math.min(0.04, (now - lastTime) / 1000); lastTime = now;
      particles.forEach((particle) => {
        particle.age += delta;
        if (particle.age >= particle.duration) spawn(particle);
        particle.x += particle.vx * delta; particle.y += particle.vy * delta;
        const progress = particle.age / particle.duration;
        const dx = particle.x - pointer.x; const dy = particle.y - pointer.y; const distance = Math.hypot(dx, dy);
        const push = Math.max(0, 1 - distance / 170) ** 2 * 22;
        const pushX = distance ? (dx / distance) * push : 0; const pushY = distance ? (dy / distance) * push : 0;
        const scale = 0.32 + progress * 0.68; const opacity = Math.min(0.78, progress * 2.8, (1 - progress) * 7);
        particle.element.style.transform = `translate3d(${particle.x + pushX}px, ${particle.y + pushY}px, 0) scale(${scale + push / 100})`;
        particle.element.style.opacity = `${opacity}`;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    animationFrame = requestAnimationFrame(animate);
    return () => { window.removeEventListener('pointermove', onPointerMove); cancelAnimationFrame(animationFrame); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let frameId = 0;
    let cleanup = () => {};

    void import('three').then((THREE) => {
      if (disposed) return;
      let width = window.innerWidth;
      let height = window.innerHeight;
      let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      renderer.setClearColor(0xf8f9fb, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(72, width / height, 1, 4000);
      camera.position.set(0, 0, 60);
      const positions = new Float32Array(STAR_COUNT * 3);
      const sizes = new Float32Array(STAR_COUNT);
      const phases = new Float32Array(STAR_COUNT);
      const colors = new Float32Array(STAR_COUNT * 3);
      const palette = ['#1768ff', '#8a5cff', '#00bfc8', '#ff9947', '#ef61d7'].map((color) => new THREE.Color(color));

      for (let index = 0; index < STAR_COUNT; index += 1) {
        const point = index * 3;
        positions[point] = (Math.random() * 2 - 1) * SPREAD;
        positions[point + 1] = (Math.random() * 2 - 1) * SPREAD;
        positions[point + 2] = -Math.random() * DEPTH;
        sizes[index] = Math.random() < 0.06 ? 3.8 + Math.random() * 4.5 : 0.7 + Math.random() * 2.1;
        phases[index] = Math.random() * Math.PI * 2;
        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[point] = color.r;
        colors[point + 1] = color.g;
        colors[point + 2] = color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uPixelRatio: { value: pixelRatio },
          uMouse: { value: new THREE.Vector2(0, 0) }, uAspect: { value: width / height }, uForce: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        vertexShader: `
          attribute float aSize; attribute float aPhase;
          uniform float uTime; uniform float uPixelRatio; uniform vec2 uMouse; uniform float uAspect; uniform float uForce;
          varying vec3 vColor; varying float vAlpha;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vec4 clip = projectionMatrix * viewPosition;
            vec2 delta = clip.xy / clip.w - uMouse; delta.x *= uAspect;
            float radius = length(delta); float pull = smoothstep(0.52, 0.0, radius);
            if (pull > 0.001) {
              vec2 direction = radius > 0.0001 ? delta / radius : vec2(0.0);
              vec2 swirl = vec2(-direction.y, direction.x);
              vec2 displacement = (-direction * 0.75 + swirl * 1.1) * pull * pull * uForce * 0.25;
              displacement.x /= uAspect; clip.xy += displacement * clip.w;
            }
            float distanceToCamera = -viewPosition.z;
            float twinkle = 0.7 + 0.3 * sin(uTime * 1.7 + aPhase);
            gl_PointSize = aSize * uPixelRatio * (390.0 / max(distanceToCamera, 1.0)) * twinkle * (1.0 + pull);
            gl_Position = clip; vColor = color;
            vAlpha = clamp(1.0 - distanceToCamera / 1750.0, 0.0, 1.0) * (0.36 + pull * 0.45);
          }
        `,
        fragmentShader: `
          varying vec3 vColor; varying float vAlpha;
          void main() {
            float softness = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(vColor, softness * vAlpha);
          }
        `,
      });
      const stars = new THREE.Points(geometry, material);
      stars.frustumCulled = false;
      scene.add(stars);

      const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
      const startedAt = performance.now();
      const onPointerMove = (event: PointerEvent) => {
        mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = (event.clientY / window.innerHeight) * 2 - 1;
        mouse.active = true;
      };
      const onResize = () => {
        width = window.innerWidth; height = window.innerHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
        renderer.setPixelRatio(pixelRatio); renderer.setSize(width, height, false);
        camera.aspect = width / height; camera.updateProjectionMatrix();
        material.uniforms.uPixelRatio.value = pixelRatio; material.uniforms.uAspect.value = width / height;
      };
      const draw = () => {
        if (disposed) return;
        const time = (performance.now() - startedAt) / 1000;
        mouse.x += (mouse.targetX - mouse.x) * 0.05; mouse.y += (mouse.targetY - mouse.y) * 0.05;
        const points = geometry.attributes.position.array as Float32Array;
        for (let offset = 2; offset < points.length; offset += 3) {
          points[offset] += 1.15;
          if (points[offset] > 70) points[offset] -= DEPTH;
        }
        geometry.attributes.position.needsUpdate = true;
        stars.rotation.z = time * 0.014;
        camera.position.x += (mouse.x * 9 - camera.position.x) * 0.035;
        camera.position.y += (-mouse.y * 9 - camera.position.y) * 0.035;
        camera.lookAt(0, 0, -300);
        material.uniforms.uTime.value = time;
        material.uniforms.uMouse.value.set(mouse.x, -mouse.y);
        material.uniforms.uForce.value += ((mouse.active ? 0.9 : 0) - material.uniforms.uForce.value) * 0.05;
        renderer.render(scene, camera);
        if (!reducedMotion) frameId = requestAnimationFrame(draw);
      };
      window.addEventListener('resize', onResize);
      if (!reducedMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });
      draw();
      cleanup = () => {
        window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onPointerMove);
        cancelAnimationFrame(frameId); geometry.dispose(); material.dispose(); renderer.dispose();
      };
    });

    return () => { disposed = true; cleanup(); };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="starfield-background" />
      <div className="starfield-fallback" aria-hidden="true" ref={fallbackRef}>
        {Array.from({ length: VISIBLE_PARTICLE_COUNT }, (_, index) => (
          <i className={`visible-particle particle-${PARTICLE_COLORS[index % PARTICLE_COLORS.length]}`} key={index} />
        ))}
      </div>
    </>
  );
}
