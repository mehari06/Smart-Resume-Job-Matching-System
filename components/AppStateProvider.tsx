"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Role } from "../types";

type AppState = {
  role: Role;
  uploadedResumeName: string | null;
};

type AppAction =
  | { type: "SET_ROLE"; payload: Role }
  | { type: "SET_UPLOADED_RESUME"; payload: string | null }
  | { type: "HYDRATE"; payload: AppState };

type AppContextValue = {
  state: AppState;
  setRole: (role: Role) => void;
  setUploadedResumeName: (fileName: string | null) => void;
};

const defaultState: AppState = {
  role: "jobSeeker",
  uploadedResumeName: null,
};

const STORAGE_KEY = "smartresume-app-state";

const AppStateContext = createContext<AppContextValue | null>(null);

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, role: action.payload };
    case "SET_UPLOADED_RESUME":
      return { ...state, uploadedResumeName: action.payload };
    case "HYDRATE":
      return action.payload;
    default:
      return state;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AppState;
      if (!parsed?.role) return;
      dispatch({ type: "HYDRATE", payload: parsed });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      setRole: (role) => dispatch({ type: "SET_ROLE", payload: role }),
      setUploadedResumeName: (fileName) =>
        dispatch({ type: "SET_UPLOADED_RESUME", payload: fileName }),
    }),
    [state]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
