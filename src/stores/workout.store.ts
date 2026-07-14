import { proxy, subscribe } from "valtio";

export interface WorkoutState {
  activeWorkout: any | null;
  currentStepIdx: number;
  totalTimer: number;
  isTotalTimerRunning: boolean;
  isMinimized: boolean;
  allWorkoutLoads: Record<string, string[]>;
  allWorkoutReps: Record<string, string[]>;
  allWorkoutSetsDone: Record<string, boolean[]>;
  executionSteps: any[];
  
  // Rest Timer
  restTimer: number;
  isRestTimerActive: boolean;
  isRestDrawerOpen: boolean;
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
  allWorkoutSetsDone: {},
  executionSteps: [],
  
  restTimer: 0,
  isRestTimerActive: false,
  isRestDrawerOpen: false,
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
  startWorkout(workout: any, steps: any[], initialLoads: any, initialReps: any, initialDone: any) {
    workoutStore.activeWorkout = workout;
    workoutStore.executionSteps = steps;
    workoutStore.currentStepIdx = 0;
    workoutStore.totalTimer = 0;
    workoutStore.isTotalTimerRunning = true;
    workoutStore.isMinimized = false;
    workoutStore.allWorkoutLoads = initialLoads;
    workoutStore.allWorkoutReps = initialReps;
    workoutStore.allWorkoutSetsDone = initialDone;
    
    // reset rest
    workoutStore.restTimer = 0;
    workoutStore.isRestTimerActive = false;
    workoutStore.isRestDrawerOpen = false;
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
    workoutStore.allWorkoutSetsDone = {};
    
    workoutStore.restTimer = 0;
    workoutStore.isRestTimerActive = false;
    workoutStore.isRestDrawerOpen = false;
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
  startRestTimer(seconds: number) {
    workoutStore.restTimer = seconds;
    workoutStore.isRestTimerActive = true;
    workoutStore.isRestDrawerOpen = true;
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
    workoutStore.restTimer = 0;
    workoutStore.isRestTimerActive = false;
    workoutStore.isRestDrawerOpen = false;
  },

  decrementRestTimer() {
    if (workoutStore.isRestTimerActive && workoutStore.restTimer > 0) {
      workoutStore.restTimer -= 1;
    }
  },

  setIsRestDrawerOpen(open: boolean) {
    workoutStore.isRestDrawerOpen = open;
  }
};
