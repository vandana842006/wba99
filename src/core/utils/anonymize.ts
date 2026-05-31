import type { Patient } from "../../types";

export interface AnonymizedPatient {
  pseudoId: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  condition: string;
  createdAt: string;
}

/**
 * Strips PII from a patient record for research consumption.
 * Removes: name, phone, physioId
 * Keeps: age, gender, condition, createdAt
 */
export function anonymizePatient(patient: Patient): AnonymizedPatient {
  return {
    pseudoId: "PAT-" + patient.id.slice(-4).toUpperCase(),
    age: patient.age,
    gender: patient.gender,
    condition: patient.condition,
    createdAt: patient.createdAt,
  };
}
