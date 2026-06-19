import { useState } from "react";
import { useSimStore } from "@/store/simStore";
import { DEFAULT_PARAMS } from "@/types";
import { Settings, ChevronLeft, ChevronRight, RotateCcw, Gauge } from "lucide-react";

interface SliderConfig {
  key: keyof typeof DEFAULT_PARAMS;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  accent: string;
}

const SLIDERS: SliderConfig[] = [
  { key: "particleCount", label: "Particle Count", min: 1000, max: 15000, step: 500, format: (v) => v.toFixed(0), accent: "cyan" },
  { key: "sensorAngle", label: "Sensor Angle", min: 0.05, max: 1.2, step: 0.01, format: (v) => ((v * 180) / Math.PI).toFixed(0) + "°", accent: "lime" },
  { key: "sensorDistance", label: "Sensor Distance", min: 2, max: 24, step: 1, format: (v) => v.toFixed(0) + "px", accent: "lime" },
  { key: "rotationSpeed", label: "Rotation Speed", min: 0.05, max: 1.5, step: 0.02, format: (v) => ((v * 180) / Math.PI).toFixed(0) + "°/f", accent: "lime" },
  { key: "moveSpeed", label: "Move Speed", min: 0.3, max: 3.0, step: 0.1, format: (v) => v.toFixed(1), accent: "cyan" },
  { key: "trailWeight", label: "Trail Deposit", min: 0.2, max: 3.0, step: 0.1, format: (v) => v.toFixed(1), accent: "green" },
  { key: "decayRate", label: "Decay Rate", min: 0.97, max: 1.0, step: 0.001, format: (v) => v.toFixed(3), accent: "orange" },
  { key: "pulseFrequency", label: "Pulse Frequency", min: 0.2, max: 3.0, step: 0.1, format: (v) => v.toFixed(1) + "Hz", accent: "fuchsia" },
  { key: "explorationBias", label: "Exploration Bias", min: 0, max: 1.0, step: 0.02, format: (v) => (v * 100).toFixed(0) + "%", accent: "purple" },
  { key: "attractantWeight", label: "Attractant Sensitivity", min: 0.5, max: 5.0, step: 0.1, format: (v) => v.toFixed(1) + "x", accent: "purple" },
];

const ACCENT_COLORS: Record<string, { track: string; thumb: string; text: string; border: string }> = {
  cyan: { track: "accent-cyan-400", thumb: "bg-cyan-400", text: "text-cyan-300", border: "border-cyan-400/30" },
  lime: { track: "accent-lime-400", thumb: "bg-lime-400", text: "text-lime-300", border: "border-lime-400/30" },
  green: { track: "accent-green-400", thumb: "bg-green-400", text: "text-green-300", border: "border-green-400/30" },
  orange: { track: "accent-orange-400", thumb: "bg-orange-400", text: "text-orange-300", border: "border-orange-400/30" },
  fuchsia: { track: "accent-fuchsia-400", thumb: "bg-fuchsia-400", text: "text-fuchsia-300", border: "border-fuchsia-400/30" },
  purple: { track: "accent-purple-400", thumb: "bg-purple-400", text: "text-purple-300", border: "border-purple-400/30" },
};

export default function ControlPanel() {
  const [open, setOpen] = useState(true);
  const params = useSimStore((s) => s.params);
  const setParam = useSimStore((s) => s.setParam);
  const resetParams = useSimStore((s) => s.resetParams);

  return (
    <div
      className={`absolute left-0 top-0 bottom-0 flex z-20 transition-transform duration-500 ${
        open ? "translate-x-0" : "-translate-x-[calc(100%-48px)]"
      }`}
    >
      <div className="w-[300px] h-full bg-black/70 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-sm text-white/90 tracking-wide uppercase">Parameters</span>
          </div>
          <button
            onClick={resetParams}
            className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
          <div className="pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300/80">
                Exploration vs Consolidation
              </span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed font-mono">
              High exploration bias → random wandering → discover new paths.
              Low bias → follow trails → reinforce existing trunks.
            </p>
          </div>

          {SLIDERS.map((cfg) => {
            const colors = ACCENT_COLORS[cfg.accent];
            const value = params[cfg.key];
            const pct = ((value - cfg.min) / (cfg.max - cfg.min)) * 100;
            return (
              <div key={cfg.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-mono ${colors.text} tracking-wide`}>{cfg.label}</span>
                  <span className="text-[11px] font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {cfg.format(value)}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 bottom-0 ${colors.thumb.replace("bg-", "bg-").replace("400", "400/50")} rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={value}
                  onChange={(e) => setParam(cfg.key as keyof typeof params, parseFloat(e.target.value))}
                  className={`w-full h-2 -mt-2 appearance-none bg-transparent cursor-pointer slider-thumb ${colors.track}`}
                />
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-white/10">
          <div className="text-[10px] text-white/40 font-mono leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Click dish to place food
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
              Slime auto-routes to strongest signal
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Emergent shortest-path networks
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-full bg-black/60 backdrop-blur-md border-r border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors group"
      >
        {open ? (
          <ChevronLeft className="w-5 h-5 text-white/50 group-hover:text-white/90 transition-colors" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white/90 transition-colors" />
        )}
      </button>
    </div>
  );
}
