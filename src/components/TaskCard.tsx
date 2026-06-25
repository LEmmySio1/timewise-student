import { CATEGORY_META, formatDuration, formatTimer, useStore, type Task } from "@/lib/store";
import { Check, Pause, Play, Square, Trash2 } from "lucide-react";

export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { timer, currentElapsed, startTimer, pauseTimer, resumeTimer, stopTimer, toggleComplete, deleteTask } = useStore();
  const isActive = timer.taskId === task.id;
  const liveSeconds = isActive ? task.actualSeconds + currentElapsed : task.actualSeconds;
  const plannedSec = task.plannedMinutes * 60;
  const progress = Math.min(100, Math.round((liveSeconds / plannedSec) * 100));
  const meta = CATEGORY_META[task.category];
  const isCompleted = task.status === "completed";

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card border border-border/60 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `var(--cat-${task.category})` }} />
      <div className="flex items-start gap-3 pl-2">
        <button
          onClick={() => toggleComplete(task.id)}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          className={`mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            isCompleted ? "bg-success border-success text-success-foreground" : "border-border hover:border-primary"
          }`}
        >
          {isCompleted && <Check className="h-3.5 w-3.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `color-mix(in oklab, var(--cat-${task.category}) 18%, white)`, color: `var(--cat-${task.category})` }}>{meta.label}</span>
            {task.priority === "high" && <span className="text-[10px] font-semibold text-destructive uppercase">High</span>}
          </div>
          <h3 className={`mt-1 font-semibold text-foreground leading-snug ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{task.title}</h3>
          {!compact && task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Planned: <span className="font-medium text-foreground">{formatDuration(plannedSec)}</span></span>
              <span>Actual: <span className={`font-medium ${liveSeconds > plannedSec ? "text-destructive" : "text-foreground"}`}>{formatDuration(liveSeconds)}</span></span>
            </div>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: liveSeconds > plannedSec ? "var(--destructive)" : `var(--cat-${task.category})` }} />
            </div>
          </div>

          {!isCompleted && (
            <div className="mt-3 flex items-center gap-2">
              {isActive ? (
                <>
                  <div className="px-3 py-1.5 rounded-full bg-secondary text-sm font-mono font-semibold text-primary tabular-nums">{formatTimer(currentElapsed)}</div>
                  {timer.running ? (
                    <button onClick={pauseTimer} className="h-9 w-9 rounded-full bg-warning text-warning-foreground flex items-center justify-center"><Pause className="h-4 w-4" /></button>
                  ) : (
                    <button onClick={resumeTimer} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Play className="h-4 w-4" /></button>
                  )}
                  <button onClick={stopTimer} className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><Square className="h-4 w-4" /></button>
                </>
              ) : (
                <button onClick={() => startTimer(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-soft">
                  <Play className="h-3.5 w-3.5" /> Start
                </button>
              )}
              <button onClick={() => deleteTask(task.id)} aria-label="Delete" className="ml-auto h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
