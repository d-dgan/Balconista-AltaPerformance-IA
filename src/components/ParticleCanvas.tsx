import { useRef, useEffect, useCallback } from 'react';

/**
 * Interactive Particle Mesh Animation
 * – Floating particles with gentle drift
 * – Dynamic mesh lines between nearby particles
 * – Mouse-reactive: particles repel from cursor, bright accent lines connect cursor to nearby particles
 */

const PARTICLE_COUNT = 180;
const LINE_DISTANCE = 110;       // max px between particles to draw a line
const MOUSE_RADIUS = 160;        // mouse influence radius
const MOUSE_LINE_RADIUS = 200;   // radius to draw cursor → particle accent lines
const PARTICLE_MIN_R = 1;
const PARTICLE_MAX_R = 2.8;
const BASE_SPEED = 0.3;

interface Color {
    r: number;
    g: number;
    b: number;
}

const PALETTE: Color[] = [
    { r: 99, g: 102, b: 241 },   // Indigo
    { r: 139, g: 92, b: 246 },   // Violet
    { r: 236, g: 72, b: 153 },   // Pink
    { r: 6, g: 182, b: 212 },    // Cyan
    { r: 16, g: 185, b: 129 }    // Emerald
];

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    opacity: number;
    color: Color;
}

function createParticle(w: number, h: number): Particle {
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * BASE_SPEED * 2,
        vy: (Math.random() - 0.5) * BASE_SPEED * 2,
        r: PARTICLE_MIN_R + Math.random() * (PARTICLE_MAX_R - PARTICLE_MIN_R),
        opacity: 0.25 + Math.random() * 0.45,
        color
    };
}

export default function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: -9999, y: -9999, active: false });
    const animRef = useRef<number | null>(null);

    const init = useCallback((w: number, h: number) => {
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle(w, h));
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width: number, height: number;

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = width * devicePixelRatio;
            canvas.height = height * devicePixelRatio;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

            // reinit if first time or size changed a lot
            if (particlesRef.current.length === 0) {
                init(width, height);
            }
        };

        resize();
        window.addEventListener('resize', resize);

        // Listen on parent container so mouse events aren't blocked by overlapping content (z-index)
        const parentEl = canvas.parentElement;
        if (!parentEl) return;

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
            mouseRef.current.active = true;
        };
        const onMouseLeave = () => {
            mouseRef.current.active = false;
        };

        parentEl.addEventListener('mousemove', onMouseMove);
        parentEl.addEventListener('mouseleave', onMouseLeave);

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            // Update positions
            for (const p of particles) {
                // Mouse repulsion
                if (mouse.active) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MOUSE_RADIUS && dist > 0) {
                        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
                        const ax = (dx / dist) * force * 1.2;
                        const ay = (dy / dist) * force * 1.2;
                        p.vx += ax * 0.08;
                        p.vy += ay * 0.08;
                    }
                }

                p.x += p.vx;
                p.y += p.vy;

                // Damping
                p.vx *= 0.995;
                p.vy *= 0.995;

                // Gentle drift restore (prevent particles from stopping completely)
                if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.1;
                if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.1;

                // Speed limit
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > 2) {
                    p.vx = (p.vx / speed) * 2;
                    p.vy = (p.vy / speed) * 2;
                }

                // Bounce at edges
                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > width) { p.x = width; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.y > height) { p.y = height; p.vy *= -1; }
            }

            // Draw mesh lines between particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LINE_DISTANCE) {
                        const alpha = (1 - dist / LINE_DISTANCE) * 0.18;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        // Mix the two colors or just use i's color
                        const c = particles[i].color;
                        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            // Draw mouse → particle accent lines
            if (mouse.active) {
                for (const p of particles) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MOUSE_LINE_RADIUS) {
                        const alpha = (1 - dist / MOUSE_LINE_RADIUS) * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(mouse.x, mouse.y);
                        ctx.lineTo(p.x, p.y);
                        ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
                ctx.fill();

                // Subtle glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.5, p.x, p.y, p.r * 3);
                grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * 0.3})`);
                grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
            parentEl.removeEventListener('mousemove', onMouseMove);
            parentEl.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [init]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'auto',
                zIndex: 1,
            }}
        />
    );
}
