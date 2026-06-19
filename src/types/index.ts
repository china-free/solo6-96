export interface Particle {
  x: number;
  y: number;
  angle: number;
  speed: number;
  trailIntensity: number;
}

export interface Food {
  id: number;
  x: number;
  y: number;
  radius: number;
  energy: number;
  maxEnergy: number;
  emissionRate: number;
  pulsePhase: number;
}

export interface SimParams {
  particleCount: number;
  sensorAngle: number;
  sensorDistance: number;
  rotationSpeed: number;
  moveSpeed: number;
  trailWeight: number;
  diffusionRate: number;
  decayRate: number;
  pulseFrequency: number;
  explorationBias: number;
  attractantWeight: number;
}

export interface SimStats {
  foodCollected: number;
  activeParticles: number;
  trunkCount: number;
  avgPheromone: number;
}

export const DEFAULT_PARAMS: SimParams = {
  particleCount: 6000,
  sensorAngle: (22 * Math.PI) / 180,
  sensorDistance: 9,
  rotationSpeed: (45 * Math.PI) / 180,
  moveSpeed: 1.0,
  trailWeight: 1.0,
  diffusionRate: 0.6,
  decayRate: 0.995,
  pulseFrequency: 0.8,
  explorationBias: 0.3,
  attractantWeight: 2.0,
};
