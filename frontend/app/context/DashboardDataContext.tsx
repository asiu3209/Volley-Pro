"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  ANALYSIS_KEY,
  TRAINING_KEY,
  loadAnalysisHistory,
  loadTrainingHistory,
  saveAnalysisHistory,
  saveTrainingHistory,
} from "@/app/lib/volleyStorage";
import type { AnalysisRecord, TrainingSessionRecord } from "@/app/types/volley";

/** Stable empty snapshots — required by React useSyncExternalStore (server + cache hits). */
const EMPTY_ANALYSIS: AnalysisRecord[] = [];
const EMPTY_TRAINING: TrainingSessionRecord[] = [];

let analysisVersion = 0;
let trainingVersion = 0;
const analysisListeners = new Set<() => void>();
const trainingListeners = new Set<() => void>();

let cachedAnalysisList: AnalysisRecord[] = EMPTY_ANALYSIS;
let cachedAnalysisVersion = -1;
let cachedTrainingList: TrainingSessionRecord[] = EMPTY_TRAINING;
let cachedTrainingVersion = -1;

function bumpAnalysis() {
  analysisVersion += 1;
  analysisListeners.forEach((l) => l());
}

function bumpTraining() {
  trainingVersion += 1;
  trainingListeners.forEach((l) => l());
}

function subscribeAnalysis(onChange: () => void) {
  analysisListeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === ANALYSIS_KEY || e.key === null) {
      bumpAnalysis();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    analysisListeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function subscribeTraining(onChange: () => void) {
  trainingListeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TRAINING_KEY || e.key === null) {
      bumpTraining();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    trainingListeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function snapshotAnalysis(): AnalysisRecord[] {
  if (cachedAnalysisVersion !== analysisVersion) {
    cachedAnalysisVersion = analysisVersion;
    const data = loadAnalysisHistory();
    cachedAnalysisList = data.length === 0 ? EMPTY_ANALYSIS : data;
  }
  return cachedAnalysisList;
}

function snapshotTraining(): TrainingSessionRecord[] {
  if (cachedTrainingVersion !== trainingVersion) {
    cachedTrainingVersion = trainingVersion;
    const data = loadTrainingHistory();
    cachedTrainingList = data.length === 0 ? EMPTY_TRAINING : data;
  }
  return cachedTrainingList;
}

function serverSnapshotAnalysis(): AnalysisRecord[] {
  return EMPTY_ANALYSIS;
}

function serverSnapshotTraining(): TrainingSessionRecord[] {
  return EMPTY_TRAINING;
}

type DashboardDataContextValue = {
  analysisHistory: AnalysisRecord[];
  trainingHistory: TrainingSessionRecord[];
  addAnalysisRecord: (record: AnalysisRecord) => void;
  addTrainingSession: (session: TrainingSessionRecord) => void;
  clearAnalysisHistory: () => void;
  clearTrainingHistory: () => void;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(
  null,
);

export function DashboardDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const analysisHistory = useSyncExternalStore(
    subscribeAnalysis,
    snapshotAnalysis,
    serverSnapshotAnalysis,
  );
  const trainingHistory = useSyncExternalStore(
    subscribeTraining,
    snapshotTraining,
    serverSnapshotTraining,
  );

  const addAnalysisRecord = useCallback((record: AnalysisRecord) => {
    const next = [record, ...loadAnalysisHistory()];
    saveAnalysisHistory(next);
    bumpAnalysis();
  }, []);

  const addTrainingSession = useCallback((session: TrainingSessionRecord) => {
    const next = [session, ...loadTrainingHistory()];
    saveTrainingHistory(next);
    bumpTraining();
  }, []);

  const clearAnalysisHistory = useCallback(() => {
    saveAnalysisHistory([]);
    bumpAnalysis();
  }, []);

  const clearTrainingHistory = useCallback(() => {
    saveTrainingHistory([]);
    bumpTraining();
  }, []);

  const value = useMemo(
    () => ({
      analysisHistory,
      trainingHistory,
      addAnalysisRecord,
      addTrainingSession,
      clearAnalysisHistory,
      clearTrainingHistory,
    }),
    [
      analysisHistory,
      trainingHistory,
      addAnalysisRecord,
      addTrainingSession,
      clearAnalysisHistory,
      clearTrainingHistory,
    ],
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error(
      "useDashboardData must be used within DashboardDataProvider",
    );
  }
  return ctx;
}
