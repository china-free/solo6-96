import { Particle, Food, SimParams, SimStats } from "@/types";

export class PhysarumEngine {
  width: number;
  height: number;
  dishRadius: number;
  dishCenterX: number;
  dishCenterY: number;

  particles: Particle[] = [];
  trailFieldA: Float32Array;
  trailFieldB: Float32Array;
  attractantFieldA: Float32Array;
  attractantFieldB: Float32Array;
  useTrailA = true;
  useAttractantA = true;

  foods: Food[] = [];
  foodConsumedThisFrame: Set<number> = new Set();
  totalFoodCollected = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dishRadius = Math.min(width, height) * 0.47;
    this.dishCenterX = width / 2;
    this.dishCenterY = height / 2;

    const size = width * height;
    this.trailFieldA = new Float32Array(size);
    this.trailFieldB = new Float32Array(size);
    this.attractantFieldA = new Float32Array(size);
    this.attractantFieldB = new Float32Array(size);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dishRadius = Math.min(width, height) * 0.47;
    this.dishCenterX = width / 2;
    this.dishCenterY = height / 2;

    const size = width * height;
    this.trailFieldA = new Float32Array(size);
    this.trailFieldB = new Float32Array(size);
    this.attractantFieldA = new Float32Array(size);
    this.attractantFieldB = new Float32Array(size);
    this.initializeParticles(this.particles.length || 6000);
  }

  initializeParticles(count: number) {
    this.particles = [];
    const cx = this.dishCenterX;
    const cy = this.dishCenterY;
    const startRadius = Math.min(this.dishRadius * 0.12, 40);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * startRadius;
      this.particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        angle: Math.random() * Math.PI * 2,
        speed: 1,
        trailIntensity: 0.8 + Math.random() * 0.4,
      });
    }
  }

  setFoods(foods: Food[]) {
    this.foods = foods.map((f) => ({ ...f }));
    this.totalFoodCollected = 0;
  }

  addFood(food: Food) {
    this.foods.push({ ...food });
  }

  inDish(x: number, y: number): boolean {
    const dx = x - this.dishCenterX;
    const dy = y - this.dishCenterY;
    return dx * dx + dy * dy < this.dishRadius * this.dishRadius;
  }

  private sampleField(field: Float32Array, x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return 0;
    return field[iy * this.width + ix];
  }

  private depositTrail(x: number, y: number, amount: number) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    const field = this.useTrailA ? this.trailFieldA : this.trailFieldB;
    const idx = iy * this.width + ix;
    field[idx] = Math.min(10, field[idx] + amount);
  }

  private emitAttractant() {
    const target = this.useAttractantA ? this.attractantFieldB : this.attractantFieldA;
    const source = this.useAttractantA ? this.attractantFieldA : this.attractantFieldB;
    const w = this.width;
    const h = this.height;

    for (let i = 0; i < target.length; i++) {
      target[i] = source[i] * 0.98;
    }

    for (const food of this.foods) {
      if (food.energy <= 0) continue;
      const radius = food.radius * 4;
      const emission = food.emissionRate * (food.energy / food.maxEnergy);
      const minX = Math.max(0, Math.floor(food.x - radius));
      const maxX = Math.min(w - 1, Math.ceil(food.x + radius));
      const minY = Math.max(0, Math.floor(food.y - radius));
      const maxY = Math.min(h - 1, Math.ceil(food.y + radius));
      const r2 = radius * radius;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - food.x;
          const dy = y - food.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < r2) {
            const falloff = 1 - Math.sqrt(dist2) / radius;
            const val = emission * falloff * falloff;
            const idx = y * w + x;
            target[idx] = Math.min(10, target[idx] + val);
          }
        }
      }
    }
    this.useAttractantA = !this.useAttractantA;
  }

  private diffuseAndDecayTrail() {
    const source = this.useTrailA ? this.trailFieldA : this.trailFieldB;
    const target = this.useTrailA ? this.trailFieldB : this.trailFieldA;
    const w = this.width;
    const h = this.height;
    const d = 0.07;
    const center = 1 - d * 4;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const val =
          source[idx] * center +
          source[idx - 1] * d +
          source[idx + 1] * d +
          source[idx - w] * d +
          source[idx + w] * d;
        target[idx] = val * 0.995;
      }
    }
    this.useTrailA = !this.useTrailA;
  }

  step(params: SimParams, time: number): SimStats {
    this.emitAttractant();

    const trailField = this.useTrailA ? this.trailFieldA : this.trailFieldB;
    const attractantField = this.useAttractantA ? this.attractantFieldA : this.attractantFieldB;
    const sa = params.sensorAngle;
    const sd = params.sensorDistance;
    const rs = params.rotationSpeed;
    const ms = params.moveSpeed;
    const tw = params.trailWeight;
    const aw = params.attractantWeight;
    const eb = params.explorationBias;
    const pulse = Math.sin(time * params.pulseFrequency * Math.PI * 2) * 0.3 + 1;

    this.foodConsumedThisFrame.clear();
    let activeCount = 0;
    let trunkSum = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const fwdX = p.x + Math.cos(p.angle) * sd;
      const fwdY = p.y + Math.sin(p.angle) * sd;
      const leftX = p.x + Math.cos(p.angle - sa) * sd;
      const leftY = p.y + Math.sin(p.angle - sa) * sd;
      const rightX = p.x + Math.cos(p.angle + sa) * sd;
      const rightY = p.y + Math.sin(p.angle + sa) * sd;

      const fwdT = this.sampleField(trailField, fwdX, fwdY);
      const leftT = this.sampleField(trailField, leftX, leftY);
      const rightT = this.sampleField(trailField, rightX, rightY);
      const fwdA = this.sampleField(attractantField, fwdX, fwdY);
      const leftA = this.sampleField(attractantField, leftX, leftY);
      const rightA = this.sampleField(attractantField, rightX, rightY);

      const fwd = fwdT + fwdA * aw;
      const left = leftT + leftA * aw;
      const right = rightT + rightA * aw;

      const randomTurn = (Math.random() - 0.5) * rs * eb * 2;

      if (fwd > left && fwd > right) {
        p.angle += randomTurn;
      } else if (left > right) {
        p.angle -= rs + randomTurn * 0.3;
      } else if (right > left) {
        p.angle += rs + randomTurn * 0.3;
      } else {
        p.angle += randomTurn;
      }

      const speedMs = ms * pulse;
      let nx = p.x + Math.cos(p.angle) * speedMs;
      let ny = p.y + Math.sin(p.angle) * speedMs;

      const dx = nx - this.dishCenterX;
      const dy = ny - this.dishCenterY;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > this.dishRadius * this.dishRadius) {
        const dist = Math.sqrt(dist2);
        const nx1 = dx / dist;
        const ny1 = dy / dist;
        const vx = Math.cos(p.angle);
        const vy = Math.sin(p.angle);
        const dot = vx * nx1 + vy * ny1;
        const rx = vx - 2 * dot * nx1;
        const ry = vy - 2 * dot * ny1;
        p.angle = Math.atan2(ry, rx);
        nx = this.dishCenterX + nx1 * (this.dishRadius - 1);
        ny = this.dishCenterY + ny1 * (this.dishRadius - 1);
      }

      p.x = nx;
      p.y = ny;

      for (const food of this.foods) {
        if (food.energy <= 0) continue;
        const fdx = p.x - food.x;
        const fdy = p.y - food.y;
        if (fdx * fdx + fdy * fdy < food.radius * food.radius) {
          food.energy = Math.max(0, food.energy - 0.15);
          this.foodConsumedThisFrame.add(food.id);
          break;
        }
      }

      this.depositTrail(p.x, p.y, tw * p.trailIntensity * pulse);

      const localTrail = this.sampleField(trailField, p.x, p.y);
      if (localTrail > 0.05) activeCount++;
      if (localTrail > 2.0) trunkSum++;
    }

    this.foods = this.foods.filter((f) => f.energy > 0.5);
    this.totalFoodCollected += this.foodConsumedThisFrame.size;

    this.diffuseAndDecayTrail();

    let pheromoneSum = 0;
    for (let i = 0; i < trailField.length; i++) {
      pheromoneSum += trailField[i];
    }

    return {
      foodCollected: this.totalFoodCollected,
      activeParticles: activeCount,
      trunkCount: Math.floor(trunkSum / 50),
      avgPheromone: pheromoneSum / trailField.length,
    };
  }

  getTrailField(): Float32Array {
    return this.useTrailA ? this.trailFieldA : this.trailFieldB;
  }

  getAttractantField(): Float32Array {
    return this.useAttractantA ? this.attractantFieldA : this.attractantFieldB;
  }
}
