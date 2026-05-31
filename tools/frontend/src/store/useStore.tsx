import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'physio' | 'patient' | 'org_head';
export type AssessmentType = 'posture' | 'walking' | 'running' | 'msk';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  physio_id?: string;
  organization_id?: string;
  created_at?: string;
  credits?: number;
  account_activated?: boolean;
}

export interface Assessment {
  id: string;
  patient_id: string;
  patient_name?: string;
  physio_id?: string;
  physio_name?: string;
  assessment_type: AssessmentType;
  data: Record<string, number | string>;
  total_score: number;
  max_score: number;
  percentage: number;
  status: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string[];
  duration_minutes: number;
  created_at: string;
  sets?: number;
  reps?: number;
  hold_seconds?: number;
  rest_seconds?: number;
  frequency_per_day?: number;
  frequency_per_week?: number;
  intensity?: string;
}

export interface AssignedExercise {
  id: string;
  patient_id: string;
  patient_name?: string;
  exercise_id: string;
  exercise_name?: string;
  physio_id: string;
  physio_name?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  notes?: string;
  created_at: string;
}

interface AppState {
  currentUser: User | null;
  isLoggedIn: boolean;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

// Storage key
const STORAGE_KEY = 'wba99-storage';

// Create context with default values
const StoreContext = createContext<AppState>({
  currentUser: null,
  isLoggedIn: false,
  setCurrentUser: () => {},
  logout: () => {},
});

// Provider component
export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        if (Platform.OS === 'web') {
          // Web: use localStorage
          if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              setCurrentUserState(parsed.currentUser);
              setIsLoggedIn(parsed.isLoggedIn);
            }
          }
        } else {
          // Mobile: use AsyncStorage
          const saved = await AsyncStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setCurrentUserState(parsed.currentUser);
            setIsLoggedIn(parsed.isLoggedIn);
          }
        }
      } catch (e) {
        console.warn('Error loading stored state:', e);
      }
    };
    
    loadState();
  }, []);

  const saveState = async (user: User | null, loggedIn: boolean) => {
    try {
      const data = JSON.stringify({ currentUser: user, isLoggedIn: loggedIn });
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, data);
        }
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, data);
      }
    } catch (e) {
      console.warn('Error saving state:', e);
    }
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    setIsLoggedIn(!!user);
    saveState(user, !!user);
  };

  const logout = () => {
    setCurrentUserState(null);
    setIsLoggedIn(false);
    saveState(null, false);
  };

  return (
    <StoreContext.Provider value={{ currentUser, isLoggedIn, setCurrentUser, logout }}>
      {children}
    </StoreContext.Provider>
  );
}

// Hook to use the store
export function useStore(): AppState {
  return useContext(StoreContext);
}

// Hook to check if store is hydrated (always true for simplicity)
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  return hydrated;
}
