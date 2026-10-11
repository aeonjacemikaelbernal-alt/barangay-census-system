import type { Resident } from "../../types/census";

export type EducationResident = Resident & {
  householdNumber: string;
  familyName: string;
  purok: string;
};

const EDUCATION_ACRONYMS: Record<string, string> = {
  aclc: "ACLC", als: "ALS", bsit: "BSIT", ict: "ICT", tvl: "TVL",
  stem: "STEM", abm: "ABM", humss: "HUMSS", tesda: "TESDA",
  nc: "NC", ii: "II", iii: "III", iv: "IV",
};

export function toFormalText(value?: string | null): string {
  if (!value) return "";
  return value.trim().split(/\s+/).map((word) => {
    const clean = word.toLowerCase();
    if (EDUCATION_ACRONYMS[clean]) return EDUCATION_ACRONYMS[clean];
    return clean.replace(/(^|[-'’])(\p{L})/gu, (_, separator, letter) =>
      `${separator}${letter.toLocaleUpperCase()}`
    );
  }).join(" ");
}
