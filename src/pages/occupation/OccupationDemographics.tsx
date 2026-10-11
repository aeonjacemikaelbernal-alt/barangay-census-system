import {
  BriefcaseBusiness,
  Building2,
  Layers3,
  Users,
} from "lucide-react";
type Props = {
  residents: OccupationResident[];
};

type CountItem = { label: string; count: number };

function countValues(values: string[]): CountItem[] {
  const map = new Map<string, number>();
  values.forEach((raw) => {
    const label = toProperCase(raw) || "Not Specified";
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}

function Bars({ items }: { items: CountItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (!items.length) return <p className="ocx-none">No recorded data yet.</p>;

  return (
    <div className="ocx-bars">
      {items.map((item) => (
        <div className="ocx-bar-row" key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
          <div className="ocx-track">
            <i style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OccupationDemographics({ residents }: Props) {
  const occupationAssignments = residents.flatMap((resident) =>
    getResidentOccupations(resident).map(toProperCase)
  );

  const residentsWithOccupation = residents.filter(
    (resident) => getResidentOccupations(resident).length > 0
  ).length;

  const multipleOccupations = residents.filter(
    (resident) => getResidentOccupations(resident).length > 1
  ).length;

  const occupationCounts = countValues(occupationAssignments);
  const employmentCounts = countValues(
    residents.map((resident) => resident.employmentStatus || "Not Specified")
  );
  const employerCounts = countValues(
    residents
      .map((resident) => resident.employer)
      .filter((value) => value && value.trim() && value !== "Not Applicable")
  );
  const purokCounts = countValues(
    residents.map((resident) => resident.purok || "Not Specified")
  );

  return (
    <section className="occupation-demographics">
      <div className="ocx-intro">
        <span>OCCUPATION ANALYTICS</span>
        <h2>Barangay Occupation Demographics</h2>
        <p>Live summary based on occupation and employment information recorded in the census.</p>
      </div>

      <div className="ocx-summary">
        <article>
          <Users size={20} />
          <div><span>Total Residents</span><strong>{residents.length}</strong></div>
        </article>
        <article>
          <BriefcaseBusiness size={20} />
          <div><span>With Occupation</span><strong>{residentsWithOccupation}</strong></div>
        </article>
        <article>
          <Layers3 size={20} />
          <div><span>Multiple Occupations</span><strong>{multipleOccupations}</strong></div>
        </article>
        <article>
          <Building2 size={20} />
          <div><span>Recorded Employers</span><strong>{employerCounts.length}</strong></div>
        </article>
      </div>

      <div className="ocx-grid">
        <article className="ocx-panel">
          <div className="ocx-panel-title">
            <div>
              <span>LIVELIHOOD PROFILE</span>
              <h3>Occupation Distribution</h3>
              <p>Primary and secondary occupations are both counted.</p>
            </div>
            <BriefcaseBusiness size={18} />
          </div>
          <Bars items={occupationCounts} />
        </article>

        <article className="ocx-panel">
          <div className="ocx-panel-title">
            <div>
              <span>EMPLOYMENT PROFILE</span>
              <h3>Employment Status</h3>
              <p>Distribution of residents by recorded employment status.</p>
            </div>
            <Users size={18} />
          </div>
          <Bars items={employmentCounts} />
        </article>

        <article className="ocx-panel">
          <div className="ocx-panel-title">
            <div>
              <span>WORKPLACES</span>
              <h3>Recorded Employers</h3>
              <p>Employers or workplaces appearing in resident records.</p>
            </div>
            <Building2 size={18} />
          </div>
          <Bars items={employerCounts.slice(0, 12)} />
        </article>

        <article className="ocx-panel">
          <div className="ocx-panel-title">
            <div>
              <span>AREA PROFILE</span>
              <h3>Residents by Purok</h3>
              <p>Occupation records grouped by household purok.</p>
            </div>
            <Users size={18} />
          </div>
          <Bars items={purokCounts} />
        </article>
      </div>

      <div className="ocx-note">
        A resident with more than one occupation may appear in more than one occupation
        category. This keeps primary and secondary livelihood records visible instead of
        forcing each resident into only one occupation.
      </div>
    </section>
  );
}
import { getResidentOccupations, toProperCase, type OccupationResident } from "./occupationUtils";
