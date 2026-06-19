import { Particle, Food, SimParams, SimStats } from "@/types";

const SIM_SCALE = 0.45;

export class PhysarumEngine {
  displayWidth: number;
  displayHeight: number;
  simWidth: number;
  simHeight: number;
  dishRadius: number;
  dishCenterX: number;
  dishCenterY: number;
  simDishRadius: number;
  simDishCenterX: number;
  simDishCenterY: number;

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

  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private readonly TABLE_SIZE = 2048;

  constructor(displayWidth: number, displayHeight: number) {
    this.displayWidth = displayWidth;
    this.displayHeight = displayHeight;
    this.simWidth = Math.floor(displayWidth * SIM_SCALE);
    this.simHeight = Math.floor(displayHeight * SIM_SCALE);

    this.dishRadius = Math.min(displayWidth, displayHeight) * 0.47;
    this.dishCenterX = displayWidth / 2;
    this.dishCenterY = displayHeight / 2;

    this.simDishRadius = this.dishRadius * SIM_SCALE;
    this.simDishCenterX = this.simWidth / 2;
    this.simDishCenterY = this.simHeight / 2;

    const size = this.simWidth * this.simHeight;
    this.trailFieldA = new Float32Array(size);
    this.trailFieldB = new Float32Array(size);
    this.attractantFieldA = new Float32Array(size);
    this.attractantFieldB = new Float32Array(size);

    this.cosTable = new Float32Array(this.TABLE_SIZE);
    this.sinTable = new Float32Array(this.TABLE_SIZE);
    for (let i = 0; i < this.TABLE_SIZE; i++) {
      const angle = (i / this.TABLE_SIZE) * Math.PI * 2;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  private fastCos(angle: number): number {
    let idx = Math.floor(((angle / (Math.PI * 2)) % 1 + 1) % 1 * this.TABLE_SIZE);
    return this.cosTable[idx];
  }

  private fastSin(angle: number): number {
    let idx = Math.floor(((angle / (Math.PI * 2)) % 1 + 1) % 1 * this.TABLE_SIZE);
    return this.sinTable[idx];
  }

  resize(displayWidth: number, displayHeight: number) {
    this.displayWidth = displayWidth;
    this.displayHeight = displayHeight;
    this.simWidth = Math.floor(displayWidth * SIM_SCALE);
    this.simHeight = Math.floor(displayHeight * SIM_SCALE);

    this.dishRadius = Math.min(displayWidth, displayHeight) * 0.47;
    this.dishCenterX = displayWidth / 2;
    this.dishCenterY = displayHeight / 2;

    this.simDishRadius = this.dishRadius * SIM_SCALE;
    this.simDishCenterX = this.simWidth / 2;
    this.simDishCenterY = this.simHeight / 2;

    const size = this.simWidth * this.simHeight;
    this.trailFieldA = new Float32Array(size);
    this.trailFieldB = new Float32Array(size);
    this.attractantFieldA = new Float32Array(size);
    this.attractantFieldB = new Float32Array(size);
    this.initializeParticles(this.particles.length || 6000);
  }

  initializeParticles(count: number) {
    this.particles = [];
    const cx = this.simDishCenterX;
    const cy = this.simDishCenterY;
    const startRadius = Math.min(this.simDishRadius * 0.15, 25);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * startRadius;
      this.particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        angle: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.4,
        trailIntensity: 0.8 + Math.random() * 0.4,
      });
    }
  }

  setFoods(foods: Food[]) {
    this.foods = foods.map((f) => ({
      ...f,
      x: f.x * SIM_SCALE,
      y: f.y * SIM_SCALE,
      radius: f.radius * SIM_SCALE,
    }));
  }

  reset(particleCount: number) {
    this.foods = [];
    this.totalFoodCollected = 0;
    this.foodConsumedThisFrame.clear();
    this.trailFieldA.fill(0);
    this.trailFieldB.fill(0);
    this.attractantFieldA.fill(0);
    this.attractantFieldB.fill(0);
    this.useTrailA = true;
    this.useAttractantA = true;
    this.initializeParticles(particleCount);
  }

  addFood(food: Food) {
    this.foods.push({
      ...food,
      x: food.x * SIM_SCALE,
      y: food.y * SIM_SCALE,
      radius: food.radius * SIM_SCALE,
    });
  }

  inDish(x: number, y: number): boolean {
    const dx = x - this.dishCenterX;
    const dy = y - this.dishCenterY;
    return dx * dx + dy * dy < this.dishRadius * this.dishRadius;
  }

  private sampleField(field: Float32Array, x: number, y: number): number {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= this.simWidth || iy < 0 || iy >= this.simHeight) return 0;
    return field[iy * this.simWidth + ix];
  }

  private depositTrail(x: number, y: number, amount: number) {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= this.simWidth || iy < 0 || iy >= this.simHeight) return;
    const field = this.useTrailA ? this.trailFieldA : this.trailFieldB;
    const idx = iy * this.simWidth + ix;
    const val = field[idx] + amount;
    field[idx] = val > 8 ? 8 : val;
  }

  private emitAttractant() {
    const source = this.useAttractantA ? this.attractantFieldA : this.attractantFieldB;
    const target = this.useAttractantA ? this.attractantFieldB : this.attractantFieldA;
    const w = this.simWidth;
    const h = this.simHeight;

    const d = 0.09;
    const center = 1 - d * 4;
    const decay = 0.992;

    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      const prevRow = row - w;
      const nextRow = row + w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        target[idx] =
          (source[idx] * center +
            source[idx - 1] * d +
            source[idx + 1] * d +
            source[prevRow + x] * d +
            source[nextRow + x] * d) *
          decay;
      }
    }

    for (const food of this.foods) {
      if (food.energy <= 0) continue;
      const radius = food.radius * 8;
      const emission = food.emissionRate * (food.energy / food.maxEnergy) * 2.5;
      const minX = Math.max(1, (food.x - radius) | 0);
      const maxX = Math.min(w - 2, (food.x + radius) | 0);
      const minY = Math.max(1, (food.y - radius) | 0);
      const maxY = Math.min(h - 2, (food.y + radius) | 0);
      const r2 = radius * radius;
      const fx = food.x;
      const fy = food.y;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - fx;
          const dy = y - fy;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < r2) {
            const dist = Math.sqrt(dist2);
            const falloff = 1 - dist / radius;
            const val = emission * falloff;
            const idx = y * w + x;
            const nv = target[idx] + val;
            target[idx] = nv > 8 ? 8 : nv;
          }
        }
      }
    }
    this.useAttractantA = !this.useAttractantA;
  }

  private diffuseAndDecayTrail() {
    const source = this.useTrailA ? this.trailFieldA : this.trailFieldB;
    const target = this.useTrailA ? this.trailFieldB : this.trailFieldA;
    const w = this.simWidth;
    const h = this.simHeight;
    const decay = 0.993;
    const d = 0.08;
    const center = 1 - d * 4;

    for (let y = 1; y < h - 1; y++) {
      let row = y * w;
      const prevRow = row - w;
      const nextRow = row + w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        target[idx] =
          (source[idx] * center +
            source[idx - 1] * d +
            source[idx + 1] * d +
            source[prevRow + x] * d +
            source[nextRow + x] * d) *
          decay;
      }
    }
    this.useTrailA = !this.useTrailA;
  }

  step(params: SimParams, time: number): SimStats {
    this.emitAttractant();

    const trailField = this.useTrailA ? this.trailFieldA : this.trailFieldB;
    const attractantField = this.useAttractantA ? this.attractantFieldA : this.attractantFieldB;
    const sa = params.sensorAngle;
    const sd = params.sensorDistance * SIM_SCALE;
    const rs = params.rotationSpeed;
    const ms = params.moveSpeed * SIM_SCALE;
    const tw = params.trailWeight;
    const aw = params.attractantWeight;
    const eb = params.explorationBias;
    const pulse = Math.sin(time * params.pulseFrequency * Math.PI * 2) * 0.3 + 1;

    const simCx = this.simDishCenterX;
    const simCy = this.simDishCenterY;
    const simR2 = this.simDishRadius * this.simDishRadius;

    this.foodConsumedThisFrame.clear();
    let activeCount = 0;
    let trunkSum = 0;

    const particles = this.particles;
    const particleCount = particles.length;
    const foods = this.foods;

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      const ang = p.angle;

      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const cosL = Math.cos(ang - sa);
      const sinL = Math.sin(ang - sa);
      const cosR = Math.cos(ang + sa);
      const sinR = Math.sin(ang + sa);

      const fwdX = p.x + cosA * sd;
      const fwdY = p.y + sinA * sd;
      const leftX = p.x + cosL * sd;
      const leftY = p.y + sinL * sd;
      const rightX = p.x + cosR * sd;
      const rightY = p.y + sinR * sd;

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

      const speedMs = ms * pulse * p.speed;
      const nx = p.x + Math.cos(p.angle) * speedMs;
      const ny = p.y + Math.sin(p.angle) * speedMs;

      const dx = nx - simCx;
      const dy = ny - simCy;
      const dist2 = dx * dx + dy * dy;

      if (dist2 > simR2) {
        const dist = Math.sqrt(dist2);
        const nx1 = dx / dist;
        const ny1 = dy / dist;
        const vx = Math.cos(p.angle);
        const vy = Math.sin(p.angle);
        const dot = vx * nx1 + vy * ny1;
        const rx = vx - 2 * dot * nx1;
        const ry = vy - 2 * dot * ny1;
        p.angle = Math.atan2(ry, rx);
        p.x = simCx + nx1 * (this.simDishRadius - 1);
        p.y = simCy + ny1 * (this.simDishRadius - 1);
      } else {
        p.x = nx;
        p.y = ny;
      }

      for (let f = 0; f < foods.length; f++) {
        const food = foods[f];
        if (food.energy <= 0) continue;
        const fdx = p.x - food.x;
        const fdy = p.y - food.y;
        if (fdx * fdx + fdy * fdy < food.radius * food.radius) {
          food.energy = Math.max(0, food.energy - 0.1);
          this.foodConsumedThisFrame.add(food.id);
          break;
        }
      }

      this.depositTrail(p.x, p.y, tw * p.trailIntensity * pulse);

      const localT = trailField[(p.y | 0) * this.simWidth + (p.x | 0)] || 0;
      if (localT > 0.05) activeCount++;
      if (localT > 1.5) trunkSum++;
    }

    this.foods = foods.filter((f) => f.energy > 0.5);
    this.totalFoodCollected += this.foodConsumedThisFrame.size;

    this.diffuseAndDecayTrail();

    let pheromoneSum = 0;
    const sampleStep = 16;
    let sampleCount = 0;
    for (let i = 0; i < trailField.length; i += sampleStep) {
      pheromoneSum += trailField[i];
      sampleCount++;
    }

    return {
      foodCollected: this.totalFoodCollected,
      activeParticles: activeCount,
      trunkCount: Math.floor(trunkSum / 30),
      avgPheromone: pheromoneSum / sampleCount,
    };
  }

  getTrailField(): Float32Array {
    return this.useTrailA ? this.trailFieldA : this.trailFieldB;
  }

  getAttractantField(): Float32Array {
    return this.useAttractantA ? this.attractantFieldA : this.attractantFieldB;
  }

  getSimScale(): number {
    return SIM_SCALE;
  }

  getDisplayFoods(): Food[] {
    return this.foods.map((f) => ({
      ...f,
      x: f.x / SIM_SCALE,
      y: f.y / SIM_SCALE,
      radius: f.radius / SIM_SCALE,
    }));
  }
}
