import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ContactRound,
  House,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { CensusRecord, Resident } from "../../types/census";
import {
  updateResidentAnnualRecord,
  type ResidentUpdateFields,
} from "../../services/encoderUpdateService";
import { formatResidentRecordName } from "../../utils/nameFormatter";
import "./encoderUpdates.css";

type EncoderUpdatesProps = {
  censusRecords: CensusRecord[];
  onBackToDashboard: () => void;
  onUpdated: (record: CensusRecord) => Promise<void>;
};

type Candidate = {
  censusRecordId: string;
  householdNumber: string;
  familyId: number;
  familyIndex: number;
  memberIndex: number;
  familyName: string;
  residentId: string;
  resident: Resident;
  purok: string;
  street: string;
  houseNumber: string;
};

const fieldLabels: { key: keyof ResidentUpdateFields; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "middleName", label: "Middle name" },
  { key: "lastName", label: "Last name" },
  { key: "suffix", label: "Suffix" },
  { key: "birthDate", label: "Birth date" },
  { key: "sex", label: "Sex" },
  { key: "civilStatus", label: "Civil status" },
  { key: "contactNumber", label: "Contact number" },
  { key: "email", label: "Email address" },
  { key: "nationality", label: "Nationality" },
  { key: "religion", label: "Religion" },
  { key: "voterStatus", label: "Voter status" },
  { key: "fourPsMember", label: "4Ps membership" },
  { key: "disability", label: "Disability information" },
  { key: "seniorCitizen", label: "Senior citizen status (based on age)" },
];

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age < 0 ? null : age;
}

const seniorCitizenStatus = (birthDate: string) => {
  const age = calculateAge(birthDate);
  return age === null ? "" : age >= 60 ? "Yes" : "No";
};

const toFields = (resident: Resident): ResidentUpdateFields => ({
  firstName: resident.firstName || "",
  middleName: resident.middleName || "",
  lastName: resident.lastName || "",
  suffix: resident.suffix || "",
  birthDate: resident.birthDate || "",
  sex: resident.sex || "",
  civilStatus: resident.civilStatus || "",
  contactNumber: resident.contactNumber || "",
  email: resident.email || "",
  nationality: resident.nationality || "",
  religion: resident.religion || "",
  voterStatus: resident.voterStatus || "",
  fourPsMember: resident.fourPsMember || "",
  disability: resident.disability || "",
  seniorCitizen: seniorCitizenStatus(resident.birthDate || ""),
});

function optionsWithCurrent(current: string, options: string[]) {
  const values = [...options];
  if (current && !values.includes(current)) values.unshift(current);
  return values;
}

export default function EncoderUpdates({
  censusRecords,
  onBackToDashboard,
  onUpdated,
}: EncoderUpdatesProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [fields, setFields] = useState<ResidentUpdateFields | null>(null);
  const [step, setStep] = useState<"search" | "edit" | "review" | "complete">("search");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const all: Candidate[] = [];
    const seenResidents = new Set<string>();
    const newestFirst = [...censusRecords].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    newestFirst.forEach((record) => {
      (record.data.families || []).forEach((family, familyIndex) => {
        (family.members || []).forEach((resident, memberIndex) => {
          const residentKey = resident.residentId
            ? `resident:${resident.residentId}`
            : `legacy:${record.data.householdNumber}:${family.id}:${memberIndex}:${resident.firstName}:${resident.middleName}:${resident.lastName}:${resident.birthDate}`.toLowerCase();
          if (seenResidents.has(residentKey)) return;
          seenResidents.add(residentKey);
          all.push({
            censusRecordId: record.id,
            householdNumber: record.data.householdNumber || "",
            familyId: family.id,
            familyIndex,
            memberIndex,
            familyName: family.familyName || "Family",
            residentId: resident.residentId || "",
            resident,
            purok: record.data.household?.purok || "",
            street: record.data.household?.street || "",
            houseNumber: record.data.household?.houseNumber || "",
          });
        });
      });
    });
    return all;
  }, [censusRecords]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return candidates.filter((candidate) => {
      const residentName = formatResidentRecordName(candidate.resident).toLowerCase();
      return [
        residentName,
        candidate.residentId,
        candidate.householdNumber,
        candidate.familyName,
        candidate.purok,
        candidate.street,
      ].some((value) => value.toLowerCase().includes(term));
    }).slice(0, 8);
  }, [candidates, query]);

  const changes = useMemo(() => {
    if (!selected || !fields) return [];
    const before = toFields(selected.resident);
    return fieldLabels.filter(({ key }) => before[key] !== fields[key]);
  }, [fields, selected]);

  const chooseResident = (candidate: Candidate) => {
    setSelected(candidate);
    setFields(toFields(candidate.resident));
    setError("");
    setStep("edit");
  };

  const setField = <K extends keyof ResidentUpdateFields>(key: K, value: ResidentUpdateFields[K]) => {
    setFields((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      if (key === "birthDate") next.seniorCitizen = seniorCitizenStatus(String(value));
      return next;
    });
  };

  const submitUpdate = async () => {
    if (!selected || !fields) return;
    setSaving(true);
    setError("");
    try {
      const updatedRecord = await updateResidentAnnualRecord({
        target: {
          censusRecordId: selected.censusRecordId,
          householdNumber: selected.householdNumber,
          familyId: selected.familyId,
          memberIndex: selected.memberIndex,
          residentId: selected.residentId,
        },
        fields,
        updateYear: new Date().getFullYear(),
      });
      await onUpdated(updatedRecord);
      setStep("complete");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Hindi naisumite ang update. Subukan muli.");
    } finally {
      setSaving(false);
    }
  };

  const startAnother = () => {
    setSelected(null);
    setFields(null);
    setQuery("");
    setError("");
    setStep("search");
  };

  return (
    <main className="records-page-shell encoder-updates-page">
      <header className="records-page-header encoder-updates-header">
        <div>
          <p className="records-page-eyebrow">ENCODER WORKSPACE · {new Date().getFullYear()} CENSUS</p>
          <h1>Household Updates</h1>
          <p>Hanapin ang resident, i-review ang kasalukuyang impormasyon, at itala lamang ang mga pagbabago.</p>
        </div>
        <button type="button" onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Dashboard
        </button>
      </header>

      <div className="eu-stepper" aria-label="Update progress">
        {[
          ["search", "Find resident"],
          ["edit", "Update details"],
          ["review", "Review changes"],
        ].map(([key, label], index) => {
          const order = ["search", "edit", "review"];
          const currentIndex = order.indexOf(step === "complete" ? "review" : step);
          const itemIndex = order.indexOf(key);
          return (
            <div className={`eu-step ${itemIndex === currentIndex ? "active" : itemIndex < currentIndex || step === "complete" ? "complete" : ""}`} key={key}>
              <span>{itemIndex < currentIndex || step === "complete" ? <Check size={14} /> : index + 1}</span>
              <strong>{label}</strong>
              {index < 2 && <i />}
            </div>
          );
        })}
      </div>

      {step === "search" && (
        <section className="eu-panel">
          <div className="eu-panel-heading">
            <div className="eu-heading-icon"><Search size={19} /></div>
            <div><span>STEP 1 · RESIDENT LOOKUP</span><h2>Aling record ang kailangang i-update?</h2><p>Maghanap gamit ang pangalan, Resident ID, household number, purok, o street.</p></div>
          </div>
          <label className="eu-search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hal. Juan Dela Cruz, R-00021, o household number" autoComplete="off" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </label>
          <div className="eu-search-meta">{query.trim() ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}` : `${candidates.length} resident records available`}</div>
          {query.trim() ? (
            searchResults.length ? (
              <div className="eu-results">
                {searchResults.map((candidate, index) => (
                  <button type="button" className="eu-result" key={`${candidate.censusRecordId}-${candidate.familyId}-${candidate.memberIndex}-${index}`} onClick={() => chooseResident(candidate)}>
                    <span className="eu-result-avatar"><UserRound size={19} /></span>
                    <span className="eu-result-main"><strong>{formatResidentRecordName(candidate.resident) || "Unnamed resident"}</strong><small>{candidate.residentId || "Resident ID unavailable"} · {candidate.familyName}</small></span>
                    <span className="eu-result-house"><House size={14} /> {candidate.householdNumber || "No household no."}<small>{[candidate.houseNumber, candidate.street, candidate.purok].filter(Boolean).join(" · ") || "Address not recorded"}</small></span>
                    <ArrowRight size={17} className="eu-result-arrow" />
                  </button>
                ))}
              </div>
            ) : <div className="eu-empty"><UsersRound size={24} /><strong>Walang nahanap na resident</strong><span>Subukan ang ibang pangalan, ID, o household number.</span></div>
          ) : <div className="eu-search-hint"><ShieldCheck size={17} /><span>Siguraduhing tama ang napiling household bago magsimula. Pinananatili ang Resident ID para maiwasan ang dobleng record.</span></div>}
        </section>
      )}

      {step === "edit" && selected && fields && (
        <section className="eu-panel">
          <div className="eu-selected-banner">
            <div className="eu-result-avatar"><UserRound size={20} /></div>
            <div><span>SELECTED RESIDENT</span><strong>{formatResidentRecordName(selected.resident)}</strong><small>Resident ID: {selected.residentId || "Unavailable"} · Household {selected.householdNumber || "—"} · {selected.familyName}</small></div>
            <button type="button" onClick={() => setStep("search")}><Search size={15} /> Change</button>
          </div>
          {!selected.residentId && <div className="eu-error eu-id-warning"><AlertCircle size={17} /><span>Kulang ang stable Resident ID ng record na ito. Hindi ito maisu-synchronize nang ligtas; ipasuri muna sa Secretary bago mag-update.</span></div>}

          <div className="eu-panel-heading">
            <div className="eu-heading-icon"><ContactRound size={19} /></div>
            <div><span>STEP 2 · UPDATE DETAILS</span><h2>Impormasyon ng resident</h2><p>Naka-prefill ang kasalukuyang record. Baguhin lamang ang impormasyong kailangang itama o i-update.</p></div>
          </div>

          <div className="eu-form-section">
            <div className="eu-section-title"><UserRound size={16} /><div><strong>Personal information</strong><span>Pagkakakilanlan at civil details</span></div></div>
            <div className="eu-form-grid">
              <Field label="First name" required value={fields.firstName} onChange={(value) => setField("firstName", value)} />
              <Field label="Middle name" value={fields.middleName} onChange={(value) => setField("middleName", value)} />
              <Field label="Last name" required value={fields.lastName} onChange={(value) => setField("lastName", value)} />
              <Field label="Suffix" value={fields.suffix} onChange={(value) => setField("suffix", value)} />
              <Field label="Date of birth" type="date" required value={fields.birthDate} onChange={(value) => setField("birthDate", value)} />
              <SelectField label="Sex" value={fields.sex} options={optionsWithCurrent(fields.sex, ["Male", "Female"])} onChange={(value) => setField("sex", value)} />
              <SelectField label="Civil status" value={fields.civilStatus} options={optionsWithCurrent(fields.civilStatus, ["Single", "Married", "Widowed", "Separated", "Annulled"])} onChange={(value) => setField("civilStatus", value)} />
              <Field label="Nationality" value={fields.nationality} onChange={(value) => setField("nationality", value)} />
            </div>
          </div>

          <div className="eu-form-section">
            <div className="eu-section-title"><ContactRound size={16} /><div><strong>Contact information</strong><span>Paraan para makontak ang resident</span></div></div>
            <div className="eu-form-grid eu-form-grid-two">
              <Field label="Mobile number" type="tel" value={fields.contactNumber} onChange={(value) => setField("contactNumber", value)} placeholder="09XX XXX XXXX" />
              <Field label="Email address" type="email" value={fields.email} onChange={(value) => setField("email", value)} placeholder="name@example.com" />
            </div>
          </div>

          <div className="eu-form-section">
            <div className="eu-section-title"><BriefcaseBusiness size={16} /><div><strong>Community information</strong><span>Mga status na ginagamit sa barangay records</span></div></div>
            <div className="eu-form-grid eu-form-grid-two">
              <Field label="Religion" value={fields.religion} onChange={(value) => setField("religion", value)} />
              <SelectField label="Voter registration" value={fields.voterStatus} options={optionsWithCurrent(fields.voterStatus, ["Registered", "Not Registered"])} onChange={(value) => setField("voterStatus", value)} />
              <SelectField label="4Ps member" value={fields.fourPsMember} options={optionsWithCurrent(fields.fourPsMember, ["Yes", "No"])} onChange={(value) => setField("fourPsMember", value)} />
              <Field label="Disability information" value={fields.disability} onChange={(value) => setField("disability", value)} placeholder="None / specify" />
              <div className="eu-field eu-derived-status" aria-live="polite">
                <span>Senior citizen status</span>
                <div className="eu-derived-status-value" aria-readonly="true">
                  {calculateAge(fields.birthDate) === null
                    ? "Enter a valid date of birth"
                    : `${fields.seniorCitizen} · ${calculateAge(fields.birthDate)} years old`}
                </div>
                <small>Automatically calculated from date of birth (60+ years).</small>
              </div>
            </div>
          </div>

          {error && <div className="eu-error"><AlertCircle size={17} />{error}</div>}
          <div className="eu-form-footer">
            <span><CalendarDays size={15} /> Update cycle: {new Date().getFullYear()}</span>
            <div><button type="button" className="eu-secondary-button" onClick={() => setStep("search")}><ArrowLeft size={15} /> Back</button><button type="button" className="eu-primary-button" disabled={!selected.residentId} onClick={() => { setError(""); setStep("review"); }}><span>Review changes</span><ArrowRight size={16} /></button></div>
          </div>
        </section>
      )}

      {step === "review" && selected && fields && (
        <section className="eu-panel">
          <div className="eu-panel-heading">
            <div className="eu-heading-icon eu-heading-icon-success"><ClipboardCheck size={19} /></div>
            <div><span>STEP 3 · FINAL CHECK</span><h2>I-review bago isumite</h2><p>Kumpirmahin ang mga pagbabagong ilalagay sa kasalukuyang resident record.</p></div>
          </div>
          <div className="eu-review-identity"><UserRound size={18} /><div><strong>{formatResidentRecordName(fields as Resident)}</strong><span>Resident ID {selected.residentId || "—"} · Household {selected.householdNumber || "—"} · {selected.familyName}</span></div><span className="eu-year-pill">{new Date().getFullYear()} update</span></div>
          {changes.length ? (
            <div className="eu-change-list">
              <div className="eu-change-header"><span>FIELD</span><span>PREVIOUS INFORMATION</span><span>UPDATED INFORMATION</span></div>
              {changes.map(({ key, label }) => {
                const previous = toFields(selected.resident)[key] || "Not provided";
                const next = fields[key] || "Not provided";
                return <div className="eu-change-row" key={key}><strong>{label}</strong><span>{String(previous)}</span><span>{String(next)}</span></div>;
              })}
            </div>
          ) : <div className="eu-no-changes"><CheckCircle2 size={20} /><span>Walang nabagong field. Bumalik sa form kung may kailangang i-update.</span></div>}
          <div className="eu-audit-note"><ShieldCheck size={17} /><span>Itatala ang account, petsa, household, at before-and-after values sa audit history. Mananatili ang Resident ID.</span></div>
          {error && <div className="eu-error"><AlertCircle size={17} />{error}</div>}
          <div className="eu-form-footer">
            <button type="button" className="eu-secondary-button" onClick={() => setStep("edit")}><ArrowLeft size={15} /> Back to form</button>
            <button type="button" className="eu-primary-button" onClick={() => void submitUpdate()} disabled={!changes.length || saving || calculateAge(fields.birthDate) === null}>{saving ? "Saving update…" : <><Check size={16} /> Save resident update</>}</button>
          </div>
        </section>
      )}

      {step === "complete" && selected && fields && (
        <section className="eu-panel eu-complete-panel">
          <div className="eu-complete-icon"><CheckCircle2 size={30} /></div>
          <span>UPDATE SAVED</span>
          <h2>Na-update ang resident record</h2>
          <p>{formatResidentRecordName(fields as Resident)} · Household {selected.householdNumber} · {new Date().getFullYear()} census</p>
          <div className="eu-complete-summary"><strong>{changes.length}</strong><span>{changes.length === 1 ? "field was updated" : "fields were updated"} and recorded in the audit history.</span></div>
          <div className="eu-complete-actions"><button type="button" className="eu-secondary-button" onClick={onBackToDashboard}>Back to dashboard</button><button type="button" className="eu-primary-button" onClick={startAnother}><UsersRound size={16} /> Update another resident</button></div>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return <label className="eu-field"><span>{label}{required && <i> *</i>}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return <label className="eu-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select…</option>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>;
}
