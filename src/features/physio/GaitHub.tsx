import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Footprints, Stethoscope } from "lucide-react";
import { Button } from "../../components/ui/Button";

export function GaitHub() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const patientId = params.get("patientId") ?? "";
  const q = patientId ? `?patientId=${patientId}` : "";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-sky-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              Gait Analysis
            </span>
          </div>
          <h1 className="text-2xl font-black text-text">Choose Analysis Type</h1>
          <p className="text-text-muted text-sm mt-1">
            Select the assessment method that fits your clinical need.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Gait Score */}
        <button
          onClick={() => navigate(`/physio/tools/gait/score${q}`)}
          className="group bg-input border border-border rounded-2xl p-6 hover:border-sky-500/40 hover:bg-surface active:scale-[0.98] transition-all duration-300 text-left shadow-sm hover:shadow-lg"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20 transition mb-4">
            <Footprints className="w-6 h-6 text-sky-500" />
          </div>
          <div className="flex items-start justify-between mb-2">
            <p className="font-black text-text text-lg">Gait Score</p>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              Quick
            </span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            5-parameter functional walking assessment — cadence, stride length, symmetry, foot
            clearance, and trunk stability. Scored out of 15.
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-text-muted">Max score: 15</span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">~3–5 min →</span>
          </div>
        </button>

        {/* Clinical Gait Analysis */}
        <button
          onClick={() => navigate(`/physio/tools/gait/clinical${q}`)}
          className="group bg-input border border-border rounded-2xl p-6 hover:border-teal-500/40 hover:bg-surface active:scale-[0.98] transition-all duration-300 text-left shadow-sm hover:shadow-lg"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition mb-4">
            <Stethoscope className="w-6 h-6 text-teal-500" />
          </div>
          <div className="flex items-start justify-between mb-2">
            <p className="font-black text-text text-lg">Clinical Gait Analysis</p>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              Advanced
            </span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Full 8-phase biomechanical analysis (IC → LR → MS → TS → PS → IS → MSw → TSw).
            Phase-by-phase deviations, joint angles, and rehab protocol. Scored out of 24.
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-text-muted">Max score: 24</span>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">~10–15 min →</span>
          </div>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Stance Phase (60% of cycle)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          Swing Phase (40% of cycle)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          Lateral (sagittal plane) view
        </div>
      </div>
    </div>
  );
}
