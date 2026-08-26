export type Resident = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;

  birthDate: string;
  height?: string;
  weight?: string;
  birthPlace: string;
  sex: string;
  civilStatus: string;

  contactNumber: string;
  email: string;

  education: string;
  schoolStatus: string;
  schoolLevel: string;

  elementarySchool: string;
  juniorHighSchool: string;
  seniorHighSchool: string;
  collegeUniversity: string;
  postgraduateSchool: string;

  shsStrand: string;
  course: string;
  specialization: string;
  osyReason: string;
  osyOtherReason: string;

  primaryOccupation: string;
  secondaryOccupations: string[];
  employmentStatus: string;
  employer: string;
  monthlyIncome: string;

  skills: string;

  voterStatus: string;
  nationality: string;
  religion: string;
  fourPsMember: string;
  disability: string;
  seniorCitizen: string;

  hasOwnFamily: string;

  familyMemberName: string;
  familyRelationship: string;
  familyMemberStatus: string;
};

export type Family = {
  id: number;
  familyName: string;
  linkedResidentKey: string | null;
  members: Resident[];
};

export type Household = {
  houseNumber: string;

  region: string;
  province: string;
  municipality: string;
  barangay: string;

  purok: string;
  street: string;

  currentAddress: string;
  previousAddress: string;
  yearsInBarangay: string;
};

export type CensusData = {
  householdNumber: string;
  household: Household;
  families: Family[];
};

export type CensusRecord = {
  id: string;
  data: CensusData;
  createdAt: string;
};