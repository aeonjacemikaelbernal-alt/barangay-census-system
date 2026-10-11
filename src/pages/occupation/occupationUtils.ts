import type { Resident } from "../../types/census";
import { formatResidentRecordName, toProperNameCase } from "../../utils/nameFormatter";

export type OccupationResident = Resident & {
  householdNumber: string;
  familyName: string;
  purok: string;
};

export const toProperCase = toProperNameCase;

export function formatResidentName(resident: OccupationResident): string {
  return formatResidentRecordName(resident);
}

export function getResidentOccupations(resident: OccupationResident): string[] {
  return Array.from(new Set([
    resident.primaryOccupation,
    ...(Array.isArray(resident.secondaryOccupations) ? resident.secondaryOccupations : []),
  ].map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => value.toLowerCase() !== "not applicable")));
}
