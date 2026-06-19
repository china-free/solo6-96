import { useEffect, useRef, useCallback } from "react";
import { PhysarumEngine } from "@/engine/PhysarumEngine";
import { useSimStore, createFood } from "@/store/simStore";

const COLORS = {
  bg: [10, 10, 15],
  dishRim: [76, 201, 240, 0.35],
  slimeLow: [40, 120, 20],
  slimeMid: [140, 230, 60],
  slimeHigh: [200, 255, 120],
  attractant: [157, 78, 221],
  foodCore: [255, 180, 80],
  foodGlow: [255, 107, 53],
};

function mixColor(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export default function PhysarumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysarumEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());
  const particleDotsRef = useRef<{ x: number; y: number; angle: number; life: number }[]>([]);

  const params = useSimStore((s) => s.params);
  const isPaused = useSimStore((s) => s.isPaused);
  const showTrails = useSimStore((s) => s.showTrails);
  const showAttractant = useSimStore((s) => s.showAttractant);
  const setStats = useSimStore((s) => s.setStats);
  const addFood = useSimStore((s) => s.addFood);
  const setFoods = useSimStore((s) => s.setFoods);
  const foods = useSimStore((s) => s.foods);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = Math.min(window.innerWidth - 80, window.innerHeight - 120, 720);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (engineRef.current) {
      engineRef.current.resize(size, size);
    } else {
      engineRef.current = new PhysarumEngine(size, size);
      engineRef.current.initializeParticles(params.particleCount);
    }
  }, [params.particleCount]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (engineRef.current && foods.length > 0) {
      engineRef.current.setFoods(foods);
    }
  }, [foods]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.initializeParticles(params.particleCount);
    }
  }, [params.particleCount]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (engine.inDish(x, y)) {
        const food = createFood(x, y);
        addFood(food);
        if (engineRef.current) engineRef.current.addFood(food);
      }
    },
    [addFood]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const render = () => {
      const engine = engineRef.current;
      if (!engine) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const time = (performance.now() - startTimeRef.current) / 1000;

      if (!isPaused) {
        for (let i = 0; i < 2; i++) {
          const stats = engine.step(params, time + i * 0.016);
          if (i === 1) {
            setStats(stats);
            setFoods([...engine.foods]);
          }
        }
      }

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const cx = engine.dishCenterX;
      const cy = engine.dishCenterY;
      const r = engine.dishRadius;

      const dishGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
      dishGrad.addColorStop(0, "rgba(15, 20, 28, 1)");
      dishGrad.addColorStop(0.7, "rgba(10, 14, 20, 1)");
      dishGrad.addColorStop(1, "rgba(6, 8, 12, 1)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = dishGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.strokeStyle = "rgba(76, 201, 240, 0.5)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(76, 201, 240, 0.6)";
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.clip();

      const trailField = engine.getTrailField();
      const attractantField = engine.getAttractantField();
      const w = engine.width;
      const h = engine.height;

      const imgData = ctx.getImageData(0, 0, cssWidth, cssHeight);
      const data = imgData.data;

      const scaleX = w / cssWidth;
      const scaleY = h / cssHeight;

      const pulseGlobal = Math.sin(time * params.pulseFrequency * Math.PI * 2) * 0.15 + 0.85;

      for (let py = 0; py < cssHeight; py++) {
        for (let px = 0; px < cssWidth; px++) {
          const sx = Math.floor(px * scaleX);
          const sy = Math.floor(py * scaleY);
          if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
          const idx = sy * w + sx;
          const pixelIdx = (py * cssWidth + px) * 4;

          let trail = trailField[idx];
          let att = showAttractant ? attractantField[idx] : 0;

          if (showTrails) {
            trail = Math.pow(Math.min(1, trail / 4), 0.7) * pulseGlobal;
          } else {
            trail = 0;
          }
          att = Math.pow(Math.min(1, att / 3), 0.8);

          let rC = COLORS.bg[0];
          let gC = COLORS.bg[1];
          let bC = COLORS.bg[2];

          if (trail > 0) {
            let slimeColor: number[];
            if (trail < 0.33) {
              slimeColor = mixColor(COLORS.slimeLow, COLORS.slimeMid, trail / 0.33);
            } else {
              slimeColor = mixColor(COLORS.slimeMid, COLORS.slimeHigh, (trail - 0.33) / 0.67);
            }
            const intensity = Math.min(1, trail * 1.8);
            rC = rC * (1 - intensity) + slimeColor[0] * intensity;
            gC = gC * (1 - intensity) + slimeColor[1] * intensity;
            bC = bC * (1 - intensity) + slimeColor[2] * intensity;
          }

          if (att > 0) {
            const aI = Math.min(1, att * 1.5);
            rC = rC * (1 - aI * 0.6) + COLORS.attractant[0] * aI * 0.6;
            gC = gC * (1 - aI * 0.6) + COLORS.attractant[1] * aI * 0.6;
            bC = bC * (1 - aI * 0.6) + COLORS.attractant[2] * aI * 0.6;
          }

          data[pixelIdx] = rC;
          data[pixelIdx + 1] = gC;
          data[pixelIdx + 2] = bC;
          data[pixelIdx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      if (showTrails) {
        ctx.globalCompositeOperation = "screen";
        const dotPulse = Math.sin(time * params.pulseFrequency * Math.PI * 2 * 2) * 0.3 + 0.7;
        for (const p of engine.particles) {
          const localT = trailField[Math.floor(p.y) * w + Math.floor(p.x)];
          if (localT > 0.5) {
            const alpha = Math.min(0.7, localT * 0.15) * dotPulse;
            ctx.fillStyle = `rgba(220, 255, 160, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }

      for (const food of engine.foods) {
        const energyRatio = food.energy / food.maxEnergy;
        const pulse = Math.sin(time * 1.5 + food.pulsePhase) * 0.15 + 0.85;
        const size = food.radius * (0.5 + energyRatio * 0.5) * pulse;

        const glowGrad = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, size * 4);
        glowGrad.addColorStop(0, `rgba(255, 107, 53, ${0.35 * energyRatio})`);
        glowGrad.addColorStop(0.4, `rgba(255, 107, 53, ${0.12 * energyRatio})`);
        glowGrad.addColorStop(1, "rgba(255, 107, 53, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(food.x, food.y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(food.x - size * 0.3, food.y - size * 0.3, 0, food.x, food.y, size);
        coreGrad.addColorStop(0, `rgba(255, 220, 150, ${energyRatio})`);
        coreGrad.addColorStop(0.5, `rgba(255, 140, 70, ${energyRatio * 0.95})`);
        coreGrad.addColorStop(1, `rgba(200, 60, 20, ${energyRatio * 0.8})`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(food.x, food.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 200, 100, ${0.4 * energyRatio})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(food.x, food.y, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [params, isPaused, showTrails, showAttractant, setStats, setFoods]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="cursor-crosshair rounded-full"
      style={{
        filter: "saturate(1.15) contrast(1.05)",
      }}
    />
  );
}
