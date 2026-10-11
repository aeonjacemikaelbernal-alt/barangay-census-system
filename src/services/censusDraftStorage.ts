import type { CensusData, Family } from "../types/census";
import type { PendingFamilyLink } from "./censusStorage";

export type CensusLocalDraft = {
  version: 1;
  draftId: string;
  updatedAt: string;
  status?: "draft" | "pending-sync";
  pendingData?: CensusData;
  censusStep: "household" | "family" | "resident" | "review";
  householdNumber: string;
  houseNumber: string;
  street: string;
  purok: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  yearsInBarangay: string;
  previousAddress: string;
  families: Family[];
  activeFamilyIndex: number;
  activeMemberIndex: number;
  pendingFamilyLinks?: PendingFamilyLink[];
};

const STORAGE_KEY_PREFIX = "barangay-census:drafts:v3:";

function storageKey(ownerId: string): string {
  if (!ownerId) throw new Error("A signed-in account is required to access census drafts.");
  return `${STORAGE_KEY_PREFIX}${ownerId}`;
}

export function getCensusLocalDrafts(ownerId: string): CensusLocalDraft[] {
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CensusLocalDraft =>
      item?.version === 1 && Boolean(item.draftId) &&
      Boolean(item.householdNumber) && Array.isArray(item.families)
    );
  } catch (error) {
    console.error("FAILED TO LOAD LOCAL CENSUS DRAFTS:", error);
    return [];
  }
}

export function saveCensusLocalDraft(ownerId: string, draft: CensusLocalDraft): void {
  const drafts = getCensusLocalDrafts(ownerId);
  const index = drafts.findIndex((item) => item.draftId === draft.draftId);
  if (index >= 0) drafts[index] = draft;
  else drafts.unshift(draft);
  localStorage.setItem(storageKey(ownerId), JSON.stringify(drafts));
}

export function deleteCensusLocalDraft(ownerId: string, draftId: string): void {
  const drafts = getCensusLocalDrafts(ownerId).filter((item) => item.draftId !== draftId);
  localStorage.setItem(storageKey(ownerId), JSON.stringify(drafts));
}

export function markCensusDraftPendingSync(
  ownerId: string,
  draftId: string,
  data: CensusData
): void {
  const drafts = getCensusLocalDrafts(ownerId);
  const index = drafts.findIndex((item) => item.draftId === draftId);
  if (index < 0) throw new Error("Local census draft not found.");
  drafts[index] = {
    ...drafts[index],
    updatedAt: new Date().toISOString(),
    status: "pending-sync",
    pendingData: data,
    censusStep: "review",
  };
  localStorage.setItem(storageKey(ownerId), JSON.stringify(drafts));
}
