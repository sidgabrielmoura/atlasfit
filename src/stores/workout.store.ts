import { proxy, subscribe } from "valtio";

export interface WorkoutState {
  activeWorkout: any | null;
  currentStepIdx: number;
  totalTimer: number;
  isTotalTimerRunning: boolean;
  isMinimized: boolean;
  allWorkoutLoads: Record<string, string[]>;
  allWorkoutReps: Record<string, string[]>;
  allWorkoutRestTimes: Record<string, string[]>;
  allWorkoutSetsDone: Record<string, boolean[]>;
  executionSteps: any[];
  
  // Rest Timer
  restTimer: number;
  isRestTimerActive: boolean;
  isRestDrawerOpen: boolean;
  // When true, finishing/skipping rest auto-advances to next exercise
  isLastSetRest: boolean;
}

const storageKey = "atlasfit_workout_store";

const initialState: WorkoutState = {
  activeWorkout: null,
  currentStepIdx: 0,
  totalTimer: 0,
  isTotalTimerRunning: false,
  isMinimized: false,
  allWorkoutLoads: {},
  allWorkoutReps: {},
  allWorkoutRestTimes: {},
  allWorkoutSetsDone: {},
  executionSteps: [],
  
  restTimer: 0,
  isRestTimerActive: false,
  isRestDrawerOpen: false,
  isLastSetRest: false,
};

const getPersistedState = (): WorkoutState => {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error("Failed to parse persisted workout state:", err);
  }
  return initialState;
};

export const workoutStore = proxy<WorkoutState>(getPersistedState());

if (typeof window !== "undefined") {
  subscribe(workoutStore, () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...workoutStore }));
    } catch (err) {
      console.error("Failed to persist workout state:", err);
    }
  });
}

export const workoutActions = {
  startWorkout(workout: any, steps: any[], initialLoads: any, initialReps: any, initialRestTimes: any, initialDone: any) {
    workoutStore.activeWorkout = workout;
    workoutStore.executionSteps = steps;
    workoutStore.currentStepIdx = 0;
    workoutStore.totalTimer = 0;
    workoutStore.isTotalTimerRunning = true;
    workoutStore.isMinimized = false;
    workoutStore.allWorkoutLoads = initialLoads;
    workoutStore.allWorkoutReps = initialReps;
    workoutStore.allWorkoutRestTimes = initialRestTimes;
    workoutStore.allWorkoutSetsDone = initialDone;
    
    // reset rest
    workoutStore.restTimer = 0;
    workoutStore.isRestTimerActive = false;
    workoutStore.isRestDrawerOpen = false;
    workoutStore.isLastSetRest = false;
  },

  minimize() {
    workoutStore.isMinimized = true;
  },

  maximize() {
    workoutStore.isMinimized = false;
  },

  cancelWorkout() {
    workoutStore.activeWorkout = null;
    workoutStore.executionSteps = [];
    workoutStore.currentStepIdx = 0;
    workoutStore.totalTimer = 0;
    workoutStore.isTotalTimerRunning = false;
    workoutStore.isMinimized = false;
    workoutStore.allWorkoutLoads = {};
    workoutStore.allWorkoutReps = {};
    workoutStore.allWorkoutRestTimes = {};
    workoutStore.allWorkoutSetsDone = {};
    
    workoutStore.restTimer = 0;
    workoutStore.isRestTimerActive = false;
    workoutStore.isRestDrawerOpen = false;
    workoutStore.isLastSetRest = false;
  },

  updateStepIdx(idx: number) {
    workoutStore.currentStepIdx = idx;
  },

  updateLoads(loads: Record<string, string[]>) {
    workoutStore.allWorkoutLoads = loads;
  },

  updateReps(reps: Record<string, string[]>) {
    workoutStore.allWorkoutReps = reps;
  },

  updateRestTimes(restTimes: Record<string, string[]>) {
    workoutStore.allWorkoutRestTimes = restTimes;
  },

  updateSetsDone(setsDone: Record<string, boolean[]>) {
    workoutStore.allWorkoutSetsDone = setsDone;
  },

  incrementTotalTimer() {
    if (workoutStore.isTotalTimerRunning && workoutStore.activeWorkout) {
      workoutStore.totalTimer += 1;
    }
  },

  setTotalTimerRunning(running: boolean) {
    workoutStore.isTotalTimerRunning = running;
  },

  // Rest Timer Actions
  startRestTimer(seconds: number, exerciseId?: string, setIdx?: number, isLastSet?: boolean) {
    workoutStore.restTimer = seconds;
    workoutStore.isRestTimerActive = true;
    workoutStore.isRestDrawerOpen = true;
    workoutStore.isLastSetRest = isLastSet ?? false;
    (workoutStore as any).restExerciseId = exerciseId || null;
    (workoutStore as any).restSetIdx = setIdx !== undefined ? setIdx : null;
    (workoutStore as any).restElapsedSeconds = 0;
  },

  pauseRestTimer() {
    workoutStore.isRestTimerActive = false;
  },

  resumeRestTimer() {
    workoutStore.isRestTimerActive = true;
  },

  add10sToRestTimer() {
    workoutStore.restTimer += 10;
  },

  cancelRestTimer() {
    const exerciseId = (workoutStore as any).restExerciseId;
    const setIdx = (workoutStore as any).restSetIdx;
    let elapsed = (workoutStore as any).restElapsedSeconds || 0;

    if (workoutStore.restTimer <= 1 && workoutStore.isRestTimerActive) {
      elapsed += 1;
    }

    if (exerciseId && setIdx !== null && setIdx !== undefined) {
      const currentRestTimes = JSON.parse(JSON.stringify(workoutStore.allWorkoutRestTimes || {}));
      if (!currentRestTimes[exerciseId]) {
        currentRestTimes[exerciseId] = [];
      }
      while (currentRestTimes[exerciseId].length <= setIdx) {
        currentRestTimes[exerciseId].push("");
      }
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      currentRestTimes[exerciseId][setIdx] = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      workoutStore.allWorkoutRestTimes = currentRestTimes;
    }

    workoutStore.restTimer = 0;
    workoutStore.isRestTimerActive = false;
    workoutStore.isRestDrawerOpen = false;
    workoutStore.isLastSetRest = false;
    (workoutStore as any).restExerciseId = null;
    (workoutStore as any).restSetIdx = null;
    (workoutStore as any).restElapsedSeconds = 0;
  },

  // Advance to next step (called after last-set rest completes or is skipped)
  advanceToNextStep() {
    const nextIdx = workoutStore.currentStepIdx + 1;
    if (nextIdx < workoutStore.executionSteps.length) {
      workoutStore.currentStepIdx = nextIdx;
    }
    // If beyond last step, just cancel rest — the page handles the end-of-workout flow
  },

  decrementRestTimer() {
    if (workoutStore.isRestTimerActive && workoutStore.restTimer > 0) {
      workoutStore.restTimer -= 1;
      if (!(workoutStore as any).restElapsedSeconds) {
        (workoutStore as any).restElapsedSeconds = 0;
      }
      (workoutStore as any).restElapsedSeconds += 1;
    }
  },

  setIsRestDrawerOpen(open: boolean) {
    workoutStore.isRestDrawerOpen = open;
  }
};
