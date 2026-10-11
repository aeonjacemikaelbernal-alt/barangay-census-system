type PersonNameLike = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;

  // Also supports normalized/database row naming.
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
};

export function toProperNameCase(value?: string | null): string {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s.'’-])([a-zà-ÿ])/g, (_match, separator, letter) =>
      `${separator}${letter.toUpperCase()}`
    );
}

export function formatNameSuffix(value?: string | null): string {
  const suffix = value?.trim();
  if (!suffix) return "";

  const normalized = suffix.replace(/\./g, "").toLowerCase();

  const knownSuffixes: Record<string, string> = {
    jr: "Jr.",
    sr: "Sr.",
    ii: "II",
    iii: "III",
    iv: "IV",
    v: "V",
  };

  return knownSuffixes[normalized] ?? toProperNameCase(suffix);
}

function getFirstName(person: PersonNameLike): string {
  return toProperNameCase(person.firstName ?? person.first_name);
}

function getMiddleName(person: PersonNameLike): string {
  return toProperNameCase(person.middleName ?? person.middle_name);
}

function getLastName(person: PersonNameLike): string {
  return toProperNameCase(person.lastName ?? person.last_name);
}

/**
 * Formal RECORD/LIST display:
 * Last Name, First Name Middle Name Suffix
 *
 * Example:
 * Bernal, Merjun Villanueva
 */
export function formatResidentRecordName(
  person?: PersonNameLike | null
): string {
  if (!person) return "";

  const lastName = getLastName(person);
  const givenNames = [
    getFirstName(person),
    getMiddleName(person),
    formatNameSuffix(person.suffix),
  ]
    .filter(Boolean)
    .join(" ");

  if (lastName && givenNames) return `${lastName}, ${givenNames}`;
  return lastName || givenNames;
}

/**
 * Natural name order for certificate sentences/body text:
 * First Name Middle Name Last Name Suffix
 */
export function formatResidentNaturalName(
  person?: PersonNameLike | null
): string {
  if (!person) return "";

  return [
    getFirstName(person),
    getMiddleName(person),
    getLastName(person),
    formatNameSuffix(person.suffix),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Formal sorting:
 * 1. Last Name
 * 2. First Name
 * 3. Middle Name
 * 4. Suffix
 */
export function compareResidentNames(
  a: PersonNameLike,
  b: PersonNameLike
): number {
  const aParts = [
    getLastName(a),
    getFirstName(a),
    getMiddleName(a),
    formatNameSuffix(a.suffix),
  ];

  const bParts = [
    getLastName(b),
    getFirstName(b),
    getMiddleName(b),
    formatNameSuffix(b.suffix),
  ];

  for (let i = 0; i < aParts.length; i += 1) {
    const comparison = aParts[i].localeCompare(bParts[i], "en", {
      sensitivity: "base",
    });

    if (comparison !== 0) return comparison;
  }

  return 0;
}

