import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colorBase: string;
  opacity: number;
  density: number;
}

const COLORS = ['255, 255, 255', '0, 243, 255', '188, 19, 254'];

function makeParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    size: Math.random() * 2 + 1,
    colorBase: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: Math.random() * 0.8 + 0.2,
    density: Math.random() * 30 + 1,
  };
}

/** Fundo animado de partículas em canvas — portado do script.js / chat-script.js original. */
export default function ParticleBackground({ count = 120 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mouse = { x: undefined as number | undefined, y: undefined as number | undefined, radius: 150 };
    let particles: Particle[] = [];
    let frameId = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    function onMouseMove(e: MouseEvent) {
      mouse.x = e.x;
      mouse.y = e.y;
    }
    function onMouseOut() {
      mouse.x = undefined;
      mouse.y = undefined;
    }

    resize();
    particles = Array.from({ length: count }, () => makeParticle(canvas.width, canvas.height));

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseOut);

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            p.x -= (dx / distance) * force * p.density;
            p.y -= (dy / distance) * force * p.density;
          }
        }

        if (p.x < 0 || p.x > canvas.width) p.vx = -p.vx;
        if (p.y < 0 || p.y > canvas.height) p.vy = -p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.colorBase}, ${p.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${p.colorBase}, 1)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 - distance / 1000})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = particles[a].x - mouse.x;
          const dy = particles[a].y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(188, 19, 254, 0.2)';
            ctx.lineWidth = 1;
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseOut);
    };
  }, [count]);

  return <canvas id="particleCanvas" ref={canvasRef} />;
}
