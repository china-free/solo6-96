import { useEffect, useRef, useCallback } from "react";
import { PhysarumEngine } from "@/engine/PhysarumEngine";
import { useSimStore, createFood } from "@/store/simStore";

const LUT_SIZE = 256;
function buildLUT(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(LUT_SIZE * 3);
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    let r: number, g: number, b: number;
    if (t < 0.4) {
      const k = t / 0.4;
      r = 20 + (140 - 20) * k;
      g = 60 + (230 - 60) * k;
      b = 15 + (60 - 15) * k;
    } else {
      const k = (t - 0.4) / 0.6;
      r = 140 + (220 - 140) * k;
      g = 230 + (255 - 230) * k;
      b = 60 + (150 - 60) * k;
    }
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}

const TRAIL_LUT = buildLUT();

export default function PhysarumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenImgDataRef = useRef<ImageData | null>(null);
  const engineRef = useRef<PhysarumEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());
  const lastStatsUpdateRef = useRef<number>(0);

  const params = useSimStore((s) => s.params);
  const isPaused = useSimStore((s) => s.isPaused);
  const showTrails = useSimStore((s) => s.showTrails);
  const showAttractant = useSimStore((s) => s.showAttractant);
  const resetId = useSimStore((s) => s.resetId);
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

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }

    if (engineRef.current) {
      engineRef.current.resize(size, size);
    } else {
      engineRef.current = new PhysarumEngine(size, size);
      engineRef.current.initializeParticles(params.particleCount);
    }

    const simW = engineRef.current.simWidth;
    const simH = engineRef.current.simHeight;
    offscreenCanvasRef.current.width = simW;
    offscreenCanvasRef.current.height = simH;
    const offCtx = offscreenCanvasRef.current.getContext("2d", { alpha: false });
    if (offCtx) {
      offscreenImgDataRef.current = offCtx.createImageData(simW, simH);
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

  useEffect(() => {
    if (engineRef.current && resetId > 0) {
      engineRef.current.reset(params.particleCount);
    }
  }, [resetId]);

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
      }
    },
    [addFood]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const offCanvas = offscreenCanvasRef.current;
    if (!canvas || !offCanvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const offCtx = offCanvas.getContext("2d", { alpha: false });
    if (!ctx || !offCtx) return;

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
        const stats = engine.step(params, time);
        const now = performance.now();
        if (now - lastStatsUpdateRef.current > 250) {
          setStats(stats);
          lastStatsUpdateRef.current = now;
        }
      }

      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const cx = engine.dishCenterX;
      const cy = engine.dishCenterY;
      const r = engine.dishRadius;

      const dishGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      dishGrad.addColorStop(0, "rgba(18, 24, 32, 1)");
      dishGrad.addColorStop(0.65, "rgba(10, 14, 20, 1)");
      dishGrad.addColorStop(1, "rgba(5, 7, 12, 1)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = dishGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.strokeStyle = "rgba(76, 201, 240, 0.55)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(76, 201, 240, 0.7)";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.clip();

      const simW = engine.simWidth;
      const simH = engine.simHeight;
      const scaleX = cssWidth / simW;
      const scaleY = cssHeight / simH;
      const pulseGlobal = Math.sin(time * params.pulseFrequency * Math.PI * 2) * 0.12 + 0.88;

      if (showTrails || showAttractant) {
        const trailField = engine.getTrailField();
        const attractantField = engine.getAttractantField();

        const imgData = offCtx.createImageData(simW, simH);
        const data = imgData.data;
        const len = simW * simH;

        if (showTrails && showAttractant) {
          for (let i = 0; i < len; i++) {
            const pi = i * 4;
            let t = trailField[i] * 0.3 * pulseGlobal;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            let a = attractantField[i] * 0.4;
            a = a < 0 ? 0 : a > 1 ? 1 : a;

            let rC: number, gC: number, bC: number;
            if (t < 0.4) {
              const k = t / 0.4;
              rC = 20 + (140 - 20) * k;
              gC = 60 + (230 - 60) * k;
              bC = 15 + (60 - 15) * k;
            } else {
              const k = (t - 0.4) / 0.6;
              rC = 140 + (220 - 140) * k;
              gC = 230 + (255 - 230) * k;
              bC = 60 + (150 - 60) * k;
            }

            rC = rC * (1 - a * 0.5) + 157 * a * 0.5;
            gC = gC * (1 - a * 0.5) + 78 * a * 0.5;
            bC = bC * (1 - a * 0.5) + 221 * a * 0.5;

            const intensity = Math.min(1, t * 1.5 + a * 0.8);
            const bgR = 10, bgG = 12, bgB = 18;
            data[pi] = bgR * (1 - intensity) + rC * intensity;
            data[pi + 1] = bgG * (1 - intensity) + gC * intensity;
            data[pi + 2] = bgB * (1 - intensity) + bC * intensity;
            data[pi + 3] = 255;
          }
        } else if (showTrails) {
          for (let i = 0; i < len; i++) {
            const pi = i * 4;
            let t = trailField[i] * 0.3 * pulseGlobal;
            t = t < 0 ? 0 : t > 1 ? 1 : t;

            let rC: number, gC: number, bC: number;
            if (t < 0.4) {
              const k = t / 0.4;
              rC = 20 + (140 - 20) * k;
              gC = 60 + (230 - 60) * k;
              bC = 15 + (60 - 15) * k;
            } else {
              const k = (t - 0.4) / 0.6;
              rC = 140 + (220 - 140) * k;
              gC = 230 + (255 - 230) * k;
              bC = 60 + (150 - 60) * k;
            }

            const intensity = Math.min(1, t * 1.6);
            const bgR = 10, bgG = 12, bgB = 18;
            data[pi] = bgR * (1 - intensity) + rC * intensity;
            data[pi + 1] = bgG * (1 - intensity) + gC * intensity;
            data[pi + 2] = bgB * (1 - intensity) + bC * intensity;
            data[pi + 3] = 255;
          }
        } else {
          for (let i = 0; i < len; i++) {
            const pi = i * 4;
            let a = attractantField[i] * 0.45;
            a = a < 0 ? 0 : a > 1 ? 1 : a;
            const bgR = 10, bgG = 12, bgB = 18;
            const intensity = Math.min(1, a * 1.8);
            data[pi] = bgR * (1 - intensity) + 157 * intensity;
            data[pi + 1] = bgG * (1 - intensity) + 78 * intensity;
            data[pi + 2] = bgB * (1 - intensity) + 221 * intensity;
            data[pi + 3] = 255;
          }
        }

        offCtx.putImageData(imgData, 0, 0);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.filter = "blur(1.2px) saturate(1.2)";
        ctx.drawImage(offCanvas, 0, 0, simW, simH, 0, 0, cssWidth, cssHeight);
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.5;
        ctx.filter = "blur(4px) saturate(1.5)";
        ctx.drawImage(offCanvas, 0, 0, simW, simH, 0, 0, cssWidth, cssHeight);
        ctx.restore();
      }

      const displayFoods = engine.getDisplayFoods();
      for (let i = 0; i < displayFoods.length; i++) {
        const food = displayFoods[i];
        if (!food || !isFinite(food.x) || !isFinite(food.y)) continue;
        const energyRatio = Math.max(0, Math.min(1, food.energy / food.maxEnergy));
        const pulse = Math.sin(time * 1.5 + food.pulsePhase) * 0.15 + 0.85;
        const size = Math.max(0.5, food.radius * (0.5 + energyRatio * 0.5) * pulse);
        const glowSize = Math.max(1, size * 5);

        const glowGrad = ctx.createRadialGradient(food.x, food.y, 0.5, food.x, food.y, glowSize);
        glowGrad.addColorStop(0, `rgba(255, 130, 60, ${0.3 * energyRatio})`);
        glowGrad.addColorStop(0.35, `rgba(255, 100, 40, ${0.12 * energyRatio})`);
        glowGrad.addColorStop(1, "rgba(255, 80, 20, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(food.x, food.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(
          food.x - size * 0.3,
          food.y - size * 0.3,
          0.5,
          food.x,
          food.y,
          size
        );
        coreGrad.addColorStop(0, `rgba(255, 230, 170, ${energyRatio})`);
        coreGrad.addColorStop(0.5, `rgba(255, 150, 80, ${energyRatio * 0.95})`);
        coreGrad.addColorStop(1, `rgba(210, 70, 30, ${energyRatio * 0.8})`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(food.x, food.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 210, 130, ${0.35 * energyRatio})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(food.x, food.y, size * 0.55, 0, Math.PI * 2);
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
      className="cursor-crosshair"
      style={{
        filter: "saturate(1.1) contrast(1.08)",
        borderRadius: "50%",
      }}
    />
  );
}
