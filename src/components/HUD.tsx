import { useSimStore } from "@/store/simStore";
import { Play, Pause, RotateCcw, Sparkles } from "lucide-react";

export default function HUD() {
  const stats = useSimStore((s) => s.stats);
  const isPaused = useSimStore((s) => s.isPaused);
  const foods = useSimStore((s) => s.foods);
  const togglePause = useSimStore((s) => s.togglePause);
  const resetSimulation = useSimStore((s) => s.resetSimulation);
  const showTrails = useSimStore((s) => s.showTrails);
  const toggleTrails = useSimStore((s) => s.toggleTrails);
  const showAttractant = useSimStore((s) => s.showAttractant);
  const toggleAttractant = useSimStore((s) => s.toggleAttractant);

  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-cyan-400/20">
          <Sparkles className="w-4 h-4 text-lime-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-cyan-300/70 font-mono uppercase tracking-wider">Slime Mold</span>
            <span className="text-sm text-lime-300 font-mono font-bold">PHYSARUM</span>
          </div>
        </div>

        <div className="px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-orange-400/20">
          <div className="text-[10px] text-orange-300/70 font-mono uppercase tracking-wider">Food Collected</div>
          <div className="text-lg text-orange-400 font-mono font-bold">{stats.foodCollected}</div>
        </div>

        <div className="px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-lime-400/20">
          <div className="text-[10px] text-lime-300/70 font-mono uppercase tracking-wider">Active</div>
          <div className="text-lg text-lime-400 font-mono font-bold">{stats.activeParticles.toLocaleString()}</div>
        </div>

        <div className="px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-purple-400/20">
          <div className="text-[10px] text-purple-300/70 font-mono uppercase tracking-wider">Trunks</div>
          <div className="text-lg text-purple-400 font-mono font-bold">{stats.trunkCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={toggleTrails}
          className={`px-3 py-2 rounded-lg font-mono text-xs transition-all border ${
            showTrails
              ? "bg-lime-500/20 border-lime-400/50 text-lime-300"
              : "bg-black/40 border-white/10 text-white/50 hover:bg-white/5"
          }`}
        >
          Trails
        </button>
        <button
          onClick={toggleAttractant}
          className={`px-3 py-2 rounded-lg font-mono text-xs transition-all border ${
            showAttractant
              ? "bg-purple-500/20 border-purple-400/50 text-purple-300"
              : "bg-black/40 border-white/10 text-white/50 hover:bg-white/5"
          }`}
        >
          Attractant
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button
          onClick={togglePause}
          className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span className="font-mono text-xs">{isPaused ? "Resume" : "Pause"}</span>
        </button>
        <button
          onClick={resetSimulation}
          className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/30 text-red-300 hover:bg-red-500/20 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="font-mono text-xs">Reset</span>
        </button>
      </div>
    </div>
  );
}
