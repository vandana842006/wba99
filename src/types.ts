export type UserRole = "physio" | "research";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  orgId?: string;
  createdAt: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  suspended?: boolean;
}

export interface Patient {
  id: string;
  physioId: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  condition: string;
  phone?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  occupation?: string;
  activityLevel?: "Sedentary" | "Light" | "Moderate" | "Active" | "Athlete";
  sport?: string;
  medicalHistory?: string;
  medications?: string;
  createdAt: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  physioId: string;
  toolType: "fms" | "rom" | "msk" | "posture" | "gait" | "gait_clinical" | "prescription" | "inclinometer" | "facial_stress" | "spinal";
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Report {
  id: string;
  patientId: string;
  physioId: string;
  assessmentId: string;
  summary: string;
  createdAt: string;
}

export interface Organisation {
  id: string;
  name: string;
  type: "research";
  adminUid: string;
}
