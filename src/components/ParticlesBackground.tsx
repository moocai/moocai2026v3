import { useEffect, useRef, useMemo } from 'react';
import { useTheme } from '@mui/material';

const MAX_PARTICLES = 400;
const CONNECT_DIST = 180;
const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST;
const DENSITY_FACTOR = 5500;
const RESTORE_SPEED = 20;
const LINE_WIDTH = 0.8;

interface Mouse {
  x: number;
  y: number;
  radius: number;
}

class Particle {
  x: number;
  y: number;
  size: number;
  baseX: number;
  baseY: number;
  density: number;
  vx: number;
  vy: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.density = (Math.random() * 30) + 1;
    this.size = (Math.random() * 2.5) + 1.2;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  update(mouse: Mouse, canvasWidth: number, canvasHeight: number, mouseRadiusSq: number) {
    this.baseX += this.vx;
    this.baseY += this.vy;

    if (this.baseX < 0 || this.baseX > canvasWidth) this.vx *= -1;
    if (this.baseY < 0 || this.baseY > canvasHeight) this.vy *= -1;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < mouseRadiusSq) {
      const distance = Math.sqrt(distSq);
      const force = (mouse.radius - distance) / mouse.radius;
      this.x -= (dx / distance) * force * this.density;
      this.y -= (dy / distance) * force * this.density;
    } else {
      if (this.x !== this.baseX) {
        this.x -= (this.x - this.baseX) / RESTORE_SPEED;
      }
      if (this.y !== this.baseY) {
        this.y -= (this.y - this.baseY) / RESTORE_SPEED;
      }
    }
  }
}

export default function ParticlesBackground({ opacityMultiplier = 1 }: { opacityMultiplier?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const colors = useMemo(() => {
    const particleAlpha = Math.min(0.85 * opacityMultiplier, 1);
    return {
      bg: isDark ? '#0a0a0a' : '#f5f5f5',
      particle: isDark ? `rgba(255, 255, 255, ${particleAlpha})` : `rgba(0, 0, 0, ${particleAlpha})`,
      line: isDark ? '#ffffff' : '#000000',
      lineAlpha: Math.min(0.4 * opacityMultiplier, 1),
    };
  }, [isDark, opacityMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const mouse: Mouse = { x: -1000, y: -1000, radius: 0 };

    const init = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      const count = Math.min(Math.round((w * h) / DENSITY_FACTOR), MAX_PARTICLES);

      particlesArray = [];
      for (let i = 0; i < count; i++) {
        particlesArray.push(new Particle(Math.random() * w, Math.random() * h));
      }
    };

    const connect = (context: CanvasRenderingContext2D) => {
      context.lineWidth = LINE_WIDTH;
      context.strokeStyle = colors.line;
      const len = particlesArray.length;

      for (let a = 0; a < len; a++) {
        const ax = particlesArray[a].x;
        const ay = particlesArray[a].y;
        for (let b = a + 1; b < len; b++) {
          const dx = ax - particlesArray[b].x;
          const dy = ay - particlesArray[b].y;
          if (dx > CONNECT_DIST || dy > CONNECT_DIST || dx < -CONNECT_DIST || dy < -CONNECT_DIST) continue;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONNECT_DIST_SQ) {
            const distance = Math.sqrt(distSq);
            context.globalAlpha = (1 - distance / CONNECT_DIST) * colors.lineAlpha;
            context.beginPath();
            context.moveTo(ax, ay);
            context.lineTo(particlesArray[b].x, particlesArray[b].y);
            context.stroke();
          }
        }
      }
      context.globalAlpha = 1;
    };

    const animate = () => {
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const len = particlesArray.length;
      const w = canvas.width;
      const h = canvas.height;
      const radiusSq = mouse.radius * mouse.radius;

      ctx.fillStyle = colors.particle;

      for (let i = 0; i < len; i++) {
        particlesArray[i].update(mouse, w, h, radiusSq);
        particlesArray[i].draw(ctx);
      }

      connect(ctx);

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(init, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        backgroundColor: colors.bg,
      }}
    />
  );
}
