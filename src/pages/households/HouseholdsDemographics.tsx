import {
  Building2,
  Users,
  House,
  MapPinned,
  Clock3,
  Layers3,
  PieChart,
  BarChart3,
} from "lucide-react";
import type { CensusData } from "../../types/census";

type Props = {
  records: CensusData[];
};

type PurokSummary = {
  purok: string;
  households: number;
  families: number;
  residents: number;
};

function proper(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HouseholdsDemographics({ records }: Props) {
  const safeRecords = Array.isArray(records) ? records : [];

  const totalHouseholds = safeRecords.length;
  const totalFamilies = safeRecords.reduce(
    (sum, record) => sum + (Array.isArray(record.families) ? record.families.length : 0),
    0
  );
  const totalResidents = safeRecords.reduce(
    (sum, record) =>
      sum +
      (Array.isArray(record.families)
        ? record.families.reduce(
            (familySum, family) =>
              familySum + (Array.isArray(family.members) ? family.members.length : 0),
            0
          )
        : 0),
    0
  );

  const averageHouseholdSize =
    totalHouseholds > 0 ? totalResidents / totalHouseholds : 0;

  const purokMap = new Map<string, PurokSummary>();
  const householdSizes = [
    { label: "1 Resident", value: 0 },
    { label: "2–3 Residents", value: 0 },
    { label: "4–5 Residents", value: 0 },
    { label: "6+ Residents", value: 0 },
  ];
  const familySizes = [
    { label: "1 Family", value: 0 },
    { label: "2 Families", value: 0 },
    { label: "3+ Families", value: 0 },
  ];

  const validYears: number[] = [];

  safeRecords.forEach((record) => {
    const families = Array.isArray(record.families) ? record.families : [];
    const residentCount = families.reduce(
      (sum, family) => sum + (Array.isArray(family.members) ? family.members.length : 0),
      0
    );
    const familyCount = families.length;
    const purok = proper(record.household?.purok || "Unspecified");

    const current = purokMap.get(purok) || {
      purok,
      households: 0,
      families: 0,
      residents: 0,
    };
    current.households += 1;
    current.families += familyCount;
    current.residents += residentCount;
    purokMap.set(purok, current);

    if (residentCount <= 1) householdSizes[0].value += 1;
    else if (residentCount <= 3) householdSizes[1].value += 1;
    else if (residentCount <= 5) householdSizes[2].value += 1;
    else householdSizes[3].value += 1;

    if (familyCount <= 1) familySizes[0].value += 1;
    else if (familyCount === 2) familySizes[1].value += 1;
    else familySizes[2].value += 1;

    const years = Number(record.household?.yearsInBarangay);
    if (Number.isFinite(years) && years >= 0) validYears.push(years);
  });

  const puroks = Array.from(purokMap.values()).sort(
    (a, b) => b.households - a.households || a.purok.localeCompare(b.purok)
  );

  const averageYears =
    validYears.length > 0
      ? validYears.reduce((sum, value) => sum + value, 0) / validYears.length
      : 0;

  const donutPalette = ["#2f6fb3", "#35a18b", "#7868b5", "#d08a4c", "#cc6677", "#6f8ca8"];
  const donutStops = puroks.reduce<{ ranges: string[]; angle: number }>((acc, item, index) => {
    const next = acc.angle + (totalHouseholds ? (item.households / totalHouseholds) * 360 : 0);
    acc.ranges.push(`${donutPalette[index % donutPalette.length]} ${acc.angle}deg ${next}deg`);
    return { ranges: acc.ranges, angle: next };
  }, { ranges: [], angle: 0 }).ranges;

  const donutBackground =
    donutStops.length > 0
      ? `conic-gradient(${donutStops.join(",")})`
      : "conic-gradient(#e8eef5 0deg 360deg)";

  const maxHouseholdSize = Math.max(...householdSizes.map((x) => x.value), 1);
  const maxFamilySize = Math.max(...familySizes.map((x) => x.value), 1);

  return (
    <section className="hhx-shell">
      <div className="hhx-intro">
        <div>
          <span className="hhx-eyebrow">HOUSEHOLD ANALYTICS</span>
          <h2>Household Demographics</h2>
          <p>
            Live household overview based on the current census records.
          </p>
        </div>
        <span className="hhx-live"><i /> Current Census Data</span>
      </div>

      <div className="hhx-summary-grid">
        <article className="hhx-stat">
          <div className="hhx-stat-icon"><Building2 size={18} /></div>
          <div><span>Total Households</span><strong>{totalHouseholds}</strong><small>Registered household records</small></div>
        </article>
        <article className="hhx-stat">
          <div className="hhx-stat-icon"><Users size={18} /></div>
          <div><span>Total Residents</span><strong>{totalResidents}</strong><small>Residents within households</small></div>
        </article>
        <article className="hhx-stat">
          <div className="hhx-stat-icon"><Layers3 size={18} /></div>
          <div><span>Total Families</span><strong>{totalFamilies}</strong><small>Families recorded</small></div>
        </article>
        <article className="hhx-stat">
          <div className="hhx-stat-icon"><House size={18} /></div>
          <div><span>Average Household Size</span><strong>{averageHouseholdSize.toFixed(1)}</strong><small>Residents per household</small></div>
        </article>
      </div>

      <div className="hhx-analytics-grid">
        <article className="hhx-card hhx-purok-card">
          <div className="hhx-card-heading">
            <div><span>LOCATION DISTRIBUTION</span><h3>Households by Purok</h3></div>
            <PieChart size={18} />
          </div>

          <div className="hhx-donut-layout">
            <div className="hhx-donut" style={{ background: donutBackground }}>
              <div className="hhx-donut-center">
                <strong>{totalHouseholds}</strong>
                <span>Households</span>
              </div>
            </div>
            <div className="hhx-legend">
              {puroks.map((item, index) => (
                <div className="hhx-legend-row" key={item.purok}>
                  <span
                    className="hhx-dot"
                    style={{ background: donutPalette[index % donutPalette.length] }}
                  />
                  <span className="hhx-legend-name">{item.purok}</span>
                  <strong>{item.households}</strong>
                  <small>
                    {totalHouseholds
                      ? `${((item.households / totalHouseholds) * 100).toFixed(1)}%`
                      : "0%"}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="hhx-card">
          <div className="hhx-card-heading">
            <div><span>HOUSEHOLD COMPOSITION</span><h3>Household Size</h3></div>
            <BarChart3 size={18} />
          </div>
          <div className="hhx-column-chart">
            {householdSizes.map((item) => (
              <div className="hhx-column-item" key={item.label}>
                <div className="hhx-column-value">{item.value}</div>
                <div className="hhx-column-track">
                  <div
                    className="hhx-column-fill"
                    style={{ height: `${Math.max((item.value / maxHouseholdSize) * 100, item.value ? 10 : 0)}%` }}
                  />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="hhx-card">
          <div className="hhx-card-heading">
            <div><span>FAMILY COMPOSITION</span><h3>Families per Household</h3></div>
            <Users size={18} />
          </div>
          <div className="hhx-family-grid">
            {familySizes.map((item, index) => (
              <div className="hhx-family-box" key={item.label}>
                <span className={`hhx-family-symbol tone-${index + 1}`}>
                  <Users size={17} />
                </span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <div className="hhx-mini-track">
                  <i style={{ width: `${(item.value / maxFamilySize) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="hhx-card hhx-residency-card">
          <div className="hhx-card-heading">
            <div><span>RESIDENCY PROFILE</span><h3>Barangay Residency</h3></div>
            <Clock3 size={18} />
          </div>
          <div className="hhx-residency">
            <div className="hhx-residency-ring">
              <strong>{averageYears.toFixed(1)}</strong>
              <span>YEARS</span>
            </div>
            <div className="hhx-residency-copy">
              <strong>Average Years in Barangay</strong>
              <p>
                Calculated from {validYears.length} household record
                {validYears.length !== 1 ? "s" : ""} with a valid residency value.
              </p>
            </div>
          </div>
        </article>
      </div>

      <article className="hhx-card hhx-table-card">
        <div className="hhx-card-heading">
          <div><span>BREAKDOWN TABLE</span><h3>Purok Household Summary</h3></div>
          <MapPinned size={18} />
        </div>
        <div className="hhx-table-wrap">
          <table className="hhx-table">
            <thead>
              <tr>
                <th>Purok</th>
                <th>Households</th>
                <th>Families</th>
                <th>Residents</th>
                <th>Avg. Household Size</th>
                <th>Share of Barangay</th>
              </tr>
            </thead>
            <tbody>
              {puroks.map((item) => (
                <tr key={item.purok}>
                  <td><strong>{item.purok}</strong></td>
                  <td>{item.households}</td>
                  <td>{item.families}</td>
                  <td>{item.residents}</td>
                  <td>{item.households ? (item.residents / item.households).toFixed(1) : "0.0"}</td>
                  <td>
                    <div className="hhx-share">
                      <span>{totalHouseholds ? ((item.households / totalHouseholds) * 100).toFixed(1) : "0.0"}%</span>
                      <div><i style={{ width: `${totalHouseholds ? (item.households / totalHouseholds) * 100 : 0}%` }} /></div>
                    </div>
                  </td>
                </tr>
              ))}
              {puroks.length === 0 && (
                <tr><td colSpan={6} className="hhx-empty">No household data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}


