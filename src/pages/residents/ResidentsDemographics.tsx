import { Users, Mars, Venus, Accessibility, MapPin, HeartHandshake } from "lucide-react";

export type ResidentDemographicRow = {
  resident_id: string;
  purok: string | null;
  sex: string | null;
  birth_date: string | null;
  civil_status: string | null;
  relationship: string | null;
  resident_type: string | null;
  nationality: string | null;
  religion: string | null;
  disability: string | null;
  senior_citizen: string | null;
};

type Props = { residents: ResidentDemographicRow[] };
type Item = { label: string; count: number };

const clean = (v: string | null | undefined) => String(v || "").trim();

function ageOf(date: string | null) {
  if (!date) return null;
  const birth = new Date(`${date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function breakdown(values: Array<string | null | undefined>): Item[] {
  const map = new Map<string, number>();
  values.forEach(v => {
    const label = clean(v) || "Not Specified";
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function HorizontalBars({ items }: { items: Item[] }) {
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <div className="rd-bars">
      {items.map(item => (
        <div className="rd-bar-row" key={item.label}>
          <div className="rd-bar-label"><span>{item.label}</span><strong>{item.count}</strong></div>
          <div className="rd-bar-track">
            <div className="rd-bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({
  items,
  total,
  centerLabel,
}: {
  items: Item[];
  total: number;
  centerLabel: string;
}) {
  const palette = ["#3b82f6", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#64748b"];
  let current = 0;
  const gradient = items.length && total
    ? `conic-gradient(${items.map((item, i) => {
        const start = current;
        current += (item.count / total) * 100;
        return `${palette[i % palette.length]} ${start}% ${current}%`;
      }).join(",")})`
    : "#e8eef5";

  return (
    <div className="rd-donut-layout">
      <div className="rd-donut" style={{ background: gradient }}>
        <div className="rd-donut-hole">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="rd-legend">
        {items.map((item, i) => (
          <div className="rd-legend-row" key={item.label}>
            <i style={{ background: palette[i % palette.length] }} />
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResidentsDemographics({ residents }: Props) {
  const total = residents.length;
  const male = residents.filter(r => clean(r.sex).toLowerCase() === "male").length;
  const female = residents.filter(r => clean(r.sex).toLowerCase() === "female").length;
  const ages = residents.map(r => ageOf(r.birth_date));
  const senior = residents.filter((r, i) => {
    const stored = clean(r.senior_citizen).toLowerCase();
    return stored === "yes" || stored === "true" || (ages[i] !== null && (ages[i] as number) >= 60);
  }).length;

  const ageGroups: Item[] = [
    { label: "0–5", count: ages.filter(a => a !== null && a <= 5).length },
    { label: "6–12", count: ages.filter(a => a !== null && a >= 6 && a <= 12).length },
    { label: "13–17", count: ages.filter(a => a !== null && a >= 13 && a <= 17).length },
    { label: "18–30", count: ages.filter(a => a !== null && a >= 18 && a <= 30).length },
    { label: "31–59", count: ages.filter(a => a !== null && a >= 31 && a <= 59).length },
    { label: "60+", count: ages.filter(a => a !== null && a >= 60).length },
  ];
  const ageMax = Math.max(1, ...ageGroups.map(x => x.count));

  const sex = breakdown(residents.map(r => r.sex));
  const civil = breakdown(residents.map(r => r.civil_status));
  const purok = breakdown(residents.map(r => r.purok));
  const nationality = breakdown(residents.map(r => r.nationality));
  const religion = breakdown(residents.map(r => r.religion));
  const family = breakdown(residents.map(r => r.relationship || r.resident_type));

  const hasDisability = residents.filter(r => {
    const v = clean(r.disability).toLowerCase();
    return v !== "" && v !== "none" && v !== "no" && v !== "n/a" && v !== "not applicable";
  }).length;
  const disabilityItems: Item[] = [
    { label: "With Disability", count: hasDisability },
    { label: "Without / None", count: Math.max(0, total - hasDisability) },
  ];

  return (
    <div className="rd-page">
      <div className="rd-summary">
        <div className="rd-summary-card"><div className="rd-icon rd-blue"><Users size={21}/></div><div><span>TOTAL RESIDENTS</span><strong>{total}</strong><small>Registered population</small></div></div>
        <div className="rd-summary-card"><div className="rd-icon rd-indigo"><Mars size={21}/></div><div><span>MALE</span><strong>{male}</strong><small>{total ? `${((male/total)*100).toFixed(1)}% of population` : "0% of population"}</small></div></div>
        <div className="rd-summary-card"><div className="rd-icon rd-pink"><Venus size={21}/></div><div><span>FEMALE</span><strong>{female}</strong><small>{total ? `${((female/total)*100).toFixed(1)}% of population` : "0% of population"}</small></div></div>
        <div className="rd-summary-card"><div className="rd-icon rd-amber"><Accessibility size={21}/></div><div><span>SENIOR CITIZENS</span><strong>{senior}</strong><small>60 years old and above</small></div></div>
      </div>

      <div className="rd-grid rd-grid-main">
        <section className="rd-card">
          <div className="rd-card-head"><div><span>POPULATION PROFILE</span><h3>Sex Distribution</h3></div><Users size={18}/></div>
          <Donut items={sex} total={total} centerLabel="Residents" />
        </section>

        <section className="rd-card">
          <div className="rd-card-head"><div><span>AGE PROFILE</span><h3>Age Distribution</h3></div></div>
          <div className="rd-columns">
            {ageGroups.map(item => (
              <div className="rd-column-item" key={item.label}>
                <strong>{item.count}</strong>
                <div className="rd-column-track">
                  <div className="rd-column-fill" style={{ height: `${Math.max(item.count ? 10 : 0, (item.count / ageMax) * 100)}%` }} />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="rd-axis-caption">AGE GROUP (YEARS)</div>
        </section>
      </div>

      <div className="rd-grid rd-grid-main">
        <section className="rd-card">
          <div className="rd-card-head"><div><span>GEOGRAPHIC PROFILE</span><h3>Residents by Purok</h3></div><MapPin size={18}/></div>
          <HorizontalBars items={purok} />
        </section>

        <section className="rd-card">
          <div className="rd-card-head"><div><span>CIVIL PROFILE</span><h3>Civil Status</h3></div><HeartHandshake size={18}/></div>
          <Donut items={civil} total={total} centerLabel="Residents" />
        </section>
      </div>

      <div className="rd-grid rd-grid-small">
        <section className="rd-card rd-compact">
          <div className="rd-card-head"><div><span>CITIZENSHIP</span><h3>Nationality</h3></div></div>
          <div className="rd-ranked">
            {nationality.slice(0, 6).map((item, i) => (
              <div className="rd-ranked-row" key={item.label}><b>{i+1}</b><span>{item.label}</span><strong>{item.count}</strong></div>
            ))}
          </div>
        </section>

        <section className="rd-card rd-compact">
          <div className="rd-card-head"><div><span>ACCESSIBILITY</span><h3>Disability</h3></div></div>
          <Donut items={disabilityItems} total={total} centerLabel="Residents" />
        </section>

        <section className="rd-card rd-compact">
          <div className="rd-card-head"><div><span>FAMILY PROFILE</span><h3>Family Position</h3></div></div>
          <div className="rd-family-list">
            {family.slice(0, 6).map(item => (
              <div className="rd-family-row" key={item.label}>
                <div><span>{item.label}</span><small>{total ? `${((item.count/total)*100).toFixed(1)}%` : "0%"}</small></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rd-card rd-wide">
        <div className="rd-card-head"><div><span>COMMUNITY PROFILE</span><h3>Religion Distribution</h3></div></div>
        <HorizontalBars items={religion} />
      </section>
    </div>
  );
}

export default ResidentsDemographics;
