import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";
import toast from "react-hot-toast";
import { Gamepad2, Maximize2, ExternalLink, Sparkles, Trophy, Wifi, ClipboardList } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

const REHAB_GAMES_URL = import.meta.env.VITE_REHAB_GAMES_URL as string;

const GAME_OPTIONS = [
  "Trunk Control Challenge",
  "Shoulder Flexion Reach",
  "Balance Board",
  "Bilateral Coordination",
  "Hip Abduction Game",
  "Knee Extension Trainer",
  "Ankle ROM Game",
  "Upper Limb Coordination",
];

interface SessionLog {
  games: string[];
  duration_min: string;
  performance: string;
  notes: string;
}

export function RehabGames() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") ?? undefined;

  const [showLogModal, setShowLogModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState<SessionLog>({ games: [], duration_min: "", performance: "", notes: "" });

  const openFullscreen = () => {
    const f = document.getElementById("rehab-games-frame") as HTMLIFrameElement | null;
    if (f?.requestFullscreen) f.requestFullscreen();
  };

  const toggleGame = (g: string) => {
    setLog((l) => ({
      ...l,
      games: l.games.includes(g) ? l.games.filter((x) => x !== g) : [...l.games, g],
    }));
  };

  const handleOpenLog = () => {
    setLog({ games: [], duration_min: "", performance: "", notes: "" });
    setShowLogModal(true);
  };

  const handleProceedToSave = () => {
    if (log.games.length === 0) { toast.error("Select at least one game played"); return; }
    setShowLogModal(false);
    setShowSaveModal(true);
  };

  const handleFirebaseSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "rehab-game",
        data: {
          games: log.games,
          duration_min: log.duration_min ? Number(log.duration_min) : null,
          performance: log.performance.trim(),
          notes: log.notes.trim(),
        },
        createdAt: serverTimestamp(),
      });
      setShowSaveModal(false);
      toast.success("Session logged");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1.5 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Rehabilitation</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <Gamepad2 className="text-orange-500" size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Rehab Games</h1>
              <p className="text-xs text-text-muted mt-0.5">Gamified rehabilitation · pose-controlled</p>
            </div>
          </div>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-500">
              <Gamepad2 size={10} /> 8 Live Games
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-500">
              <Wifi size={10} /> Real-Time AI
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleOpenLog}>
            <ClipboardList size={14} className="mr-1.5" /> Log Session
          </Button>
          <Button variant="ghost" size="sm" onClick={openFullscreen}>
            <Maximize2 size={14} className="mr-1.5" /> Fullscreen
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(REHAB_GAMES_URL, "_blank")}>
            <ExternalLink size={14} className="mr-1.5" /> Open in tab
          </Button>
        </div>
      </div>

      {/* Live game console — primary interface */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3.5 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-text">Live Game Console</p>
            <p className="text-[10px] text-text-muted mt-0.5">Select a game inside · pose-controlled · MediaPipe AI</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
            <Trophy size={14} className="text-amber-500" />
          </div>
        </div>
        <iframe
          id="rehab-games-frame"
          src={REHAB_GAMES_URL}
          title="WBA99 Rehab Games"
          className="w-full border-0 bg-black block"
          style={{ height: "calc(100vh - 280px)", minHeight: "640px" }}
          allow="camera; microphone; fullscreen; autoplay; accelerometer; gyroscope"
          allowFullScreen
        />
      </Card>

      {/* Log session modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-lg font-black text-text">Log Rehab Session</h2>
              <p className="text-xs text-text-muted mt-0.5">Record which games were played and observations for the patient record.</p>
            </div>

            {/* Games played */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">Games Played</p>
              <div className="flex flex-wrap gap-2">
                {GAME_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGame(g)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                      log.games.includes(g)
                        ? "bg-orange-500/20 text-orange-500 border-orange-500/40"
                        : "bg-input text-text-muted border-border hover:border-orange-400/40"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Session Duration (minutes)</label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 20"
                value={log.duration_min}
                onChange={(e) => setLog((l) => ({ ...l, duration_min: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 transition shadow-sm"
              />
            </div>

            {/* Performance */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Performance Observations</label>
              <textarea
                rows={2}
                placeholder="e.g. Improved trunk control, 3 falls on balance board…"
                value={log.performance}
                onChange={(e) => setLog((l) => ({ ...l, performance: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 transition shadow-sm resize-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Clinical Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Patient reported reduced fatigue by end of session…"
                value={log.notes}
                onChange={(e) => setLog((l) => ({ ...l, notes: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 transition shadow-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" size="md" className="flex-1" onClick={() => setShowLogModal(false)}>Cancel</Button>
              <Button variant="primary" size="md" className="flex-1" onClick={handleProceedToSave}>Next: Select Patient</Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient select + save modal */}
      <PatientSelectSaveModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleFirebaseSave}
        saving={saving}
        preselectedPatientId={preselectedPatientId}
      />
    </div>
  );
}
