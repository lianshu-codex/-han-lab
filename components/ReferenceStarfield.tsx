'use client';

import { useEffect, useRef } from 'react';

// Adapted from ahnafnafee/ahnafnafee.dev's StarfieldBackground.tsx (MIT).
export function ReferenceStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stopped = false;
    let frameId = 0;
    void import('three').then((THREE) => {
      if (stopped) return;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(72, 1, 1, 4000);
      camera.position.z = 60;
      const count = window.matchMedia('(max-width: 640px)').matches ? 1800 : 4200;
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      for (let index = 0; index < count; index += 1) {
        const offset = index * 3;
        positions[offset] = (Math.random() * 2 - 1) * 1100;
        positions[offset + 1] = (Math.random() * 2 - 1) * 1100;
        positions[offset + 2] = -Math.random() * 1600;
        sizes[index] = Math.random() < .05 ? 3 + Math.random() * 3 : .5 + Math.random() * 1.2;
        phases[index] = Math.random() * Math.PI * 2;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      const material = new THREE.ShaderMaterial({
        transparent:true, depthWrite:false,
        uniforms:{ time:{ value:0 }, pixelRatio:{ value:1 } },
        vertexShader:`attribute float aSize; attribute float aPhase; uniform float time; uniform float pixelRatio; varying float alpha; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); float d=-mv.z; gl_PointSize=aSize*pixelRatio*(420.0/max(d,1.0))*(.72+.28*sin(time*1.4+aPhase)); alpha=clamp(1.0-d/1700.0,0.0,1.0); gl_Position=projectionMatrix*mv; }`,
        fragmentShader:`varying float alpha; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.0,d)*alpha*.45; gl_FragColor=vec4(.06,.08,.16,a); }`,
      });
      const stars = new THREE.Points(geometry, material); stars.frustumCulled = false; scene.add(stars);
      const resize = () => { const width=window.innerWidth; const height=window.innerHeight; const dpr=Math.min(window.devicePixelRatio||1,1.5); renderer.setPixelRatio(dpr); renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix(); material.uniforms.pixelRatio.value=dpr; };
      const startedAt = performance.now();
      const draw = () => { if (stopped) return; const points=geometry.attributes.position.array as Float32Array; for(let index=2; index<points.length; index+=3){ points[index]+=.45; if(points[index]>70) points[index]-=1600; } geometry.attributes.position.needsUpdate=true; material.uniforms.time.value=(performance.now()-startedAt)/1000; renderer.render(scene,camera); frameId=requestAnimationFrame(draw); };
      resize(); window.addEventListener('resize',resize); draw();
      const dispose = () => { window.removeEventListener('resize',resize); cancelAnimationFrame(frameId); geometry.dispose(); material.dispose(); renderer.dispose(); };
      if (stopped) dispose(); else (canvas as HTMLCanvasElement & { disposeStarfield?: () => void }).disposeStarfield = dispose;
    });
    return () => { stopped=true; cancelAnimationFrame(frameId); (canvas as HTMLCanvasElement & { disposeStarfield?: () => void }).disposeStarfield?.(); };
  }, []);
  return <canvas ref={canvasRef} className="reference-starfield" aria-hidden="true" />;
}
