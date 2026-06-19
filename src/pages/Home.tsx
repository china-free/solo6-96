import PhysarumCanvas from "@/components/PhysarumCanvas";
import HUD from "@/components/HUD";
import ControlPanel from "@/components/ControlPanel";

export default function Home() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05060a]">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(76, 201, 240, 0.8) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(184, 255, 61, 0.04) 0%, rgba(10, 10, 15, 0) 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1/3"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 100%, rgba(157, 78, 221, 0.05) 0%, rgba(10, 10, 15, 0) 60%)",
          }}
        />
      </div>

      <HUD />
      <ControlPanel />

      <div className="absolute inset-0 flex items-center justify-center">
        <PhysarumCanvas />
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-6 pointer-events-none z-10">
        <div className="px-6 py-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/5">
          <p className="text-[11px] font-mono text-white/40 tracking-wide text-center">
            <span className="text-cyan-300/70">Physarum polycephalum</span> — Multi-agent slime mold simulator · Click the dish to deposit food sources · Emergent shortest-path intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
