import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  HeartHandshake,
  MapPin,
  Users,
  Vote,
  Wrench,
} from "lucide-react";
import type { Resident } from "../types/census";
import "./residentCategoryDemographics.css";

export type ResidentCategoryKey = "skills" | "income" | "voters" | "fourps";

type CategoryResident = Resident & {
  purok?: string;
};

type CountItem = {
  label: string;
  count: number;
};

type StatItem = {
  label: string;
  value: string;
  note: string;
};

type Props = {
  category: ResidentCategoryKey;
  residents: CategoryResident[];
};

const PALETTE = ["#3478d4", "#16a085", "#f59e0b", "#8b5cf6", "#e4547a", "#0891b2"];

function countValues(values: string[]): CountItem[] {
  const counts = new Map<string, CountItem>();
  values.forEach((raw) => {
    const label = raw.trim() || "Not Specified";
    const key = label.toLocaleLowerCase();
    const current = counts.get(key);
    counts.set(key, current ? { ...current, count: current.count + 1 } : { label, count: 1 });
  });

  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}

function getSkills(resident: CategoryResident): string[] {
  return String(resident.skills || "")
    .split(/[,;]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function getIncome(resident: CategoryResident): number {
  const normalized = String(resident.monthlyIncome || "").replace(/[^\d.-]/g, "");
  const income = Number(normalized);
  return Number.isFinite(income) && income > 0 ? income : 0;
}

function getIncomeBand(income: number): string {
  if (income <= 0) return "No Income Data";
  if (income < 10000) return "Below PHP 10,000";
  if (income < 20000) return "PHP 10,000-19,999";
  if (income < 30000) return "PHP 20,000-29,999";
  if (income < 50000) return "PHP 30,000-49,999";
  return "PHP 50,000 and above";
}

function isRegistered(resident: CategoryResident): boolean {
  const value = String(resident.voterStatus || "").trim().toLowerCase();
  return value === "registered" || value === "registered voter";
}

function isFourPsMember(resident: CategoryResident): boolean {
  const value = String(resident.fourPsMember || "").trim().toLowerCase();
  return value === "yes" || value === "member" || value === "4ps" || value === "4ps member";
}

function formatPHP(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function BarList({ items }: { items: CountItem[] }) {
  if (!items.length) return <p className="rcd-empty">No recorded data yet.</p>;

  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="rcd-bars">
      {items.map((item) => (
        <div className="rcd-bar-row" key={item.label}>
          <div className="rcd-bar-label">
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
          <div className="rcd-track">
            <i style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ items, total }: { items: CountItem[]; total: number }) {
  let current = 0;
  const countedTotal = items.reduce((sum, item) => sum + item.count, 0);
  const gradient = countedTotal
    ? `conic-gradient(${items
        .map((item, index) => {
          const start = current;
          current += (item.count / countedTotal) * 100;
          return `${PALETTE[index % PALETTE.length]} ${start}% ${current}%`;
        })
        .join(",")})`
    : "conic-gradient(#e8eef5 0% 100%)";

  return (
    <div className="rcd-donut-layout">
      <div className="rcd-donut" style={{ background: gradient }}>
        <div className="rcd-donut-hole">
          <strong>{total}</strong>
          <span>Residents</span>
        </div>
      </div>
      <div className="rcd-legend">
        {items.map((item, index) => (
          <div className="rcd-legend-row" key={item.label}>
            <i style={{ background: PALETTE[index % PALETTE.length] }} />
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <small>{countedTotal ? `${((item.count / countedTotal) * 100).toFixed(1)}%` : "0%"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResidentCategoryDemographics({ category, residents }: Props) {
  const total = residents.length;
  const skills = residents.flatMap(getSkills);
  const incomes = residents.map(getIncome).filter((income) => income > 0);
  const registered = residents.filter(isRegistered);
  const fourPsMembers = residents.filter(isFourPsMember);

  const skillCountDistribution = countValues(
    residents.map((resident) => {
      const count = getSkills(resident).length;
      if (count === 0) return "No Skills Recorded";
      if (count === 1) return "1 Skill";
      if (count === 2) return "2 Skills";
      return "3 or More Skills";
    })
  );

  const incomeDistribution = countValues(
    residents.map((resident) => getIncomeBand(getIncome(resident)))
  );

  const voterDistribution = countValues(
    residents.map((resident) =>
      isRegistered(resident) ? "Registered Voter" : "Not Registered"
    )
  );

  const fourPsDistribution = countValues(
    residents.map((resident) =>
      isFourPsMember(resident) ? "4Ps Member" : "Not a 4Ps Member"
    )
  );

  const purokDistribution = countValues(
    residents.map((resident) => resident.purok || "Not Specified")
  );

  const genderCounts = (group: CategoryResident[]) =>
    countValues(group.map((resident) => resident.sex || "Not Specified"));

  const categoryConfig = {
    skills: {
      title: "Skills Demographics",
      description: "Resident skill coverage, common specialties, and distribution by purok.",
      distributionTitle: "Residents by Number of Skills",
      secondaryTitle: "Most Common Skills",
      secondaryItems: countValues(skills).slice(0, 10),
      distribution: skillCountDistribution,
      stats: [
        { label: "Total Residents", value: String(total), note: "Registered population" },
        { label: "Residents with Skills", value: String(residents.filter((r) => getSkills(r).length > 0).length), note: "At least one skill recorded" },
        { label: "Unique Skills", value: String(new Set(skills.map((skill) => skill.toLowerCase())).size), note: "Distinct specialties" },
        { label: "Skill Entries", value: String(skills.length), note: "Recorded skill assignments" },
      ],
    },
    income: {
      title: "Income Demographics",
      description: "Monthly income ranges, employment status, and income coverage across residents.",
      distributionTitle: "Monthly Income Range",
      secondaryTitle: "Employment Status",
      secondaryItems: countValues(residents.map((resident) => resident.employmentStatus || "Not Specified")),
      distribution: incomeDistribution,
      stats: [
        { label: "Total Residents", value: String(total), note: "Registered population" },
        { label: "Income Records", value: String(incomes.length), note: "Monthly income is recorded" },
        { label: "Average Monthly Income", value: incomes.length ? formatPHP(incomes.reduce((sum, income) => sum + income, 0) / incomes.length) : formatPHP(0), note: "Among residents with income" },
        { label: "Income Coverage", value: total ? `${((incomes.length / total) * 100).toFixed(1)}%` : "0%", note: "Of registered residents" },
      ],
    },
    voters: {
      title: "Voter Demographics",
      description: "Voter registration status and the profile of registered voters.",
      distributionTitle: "Voter Registration Status",
      secondaryTitle: "Registered Voters by Sex",
      secondaryItems: genderCounts(registered),
      distribution: voterDistribution,
      stats: [
        { label: "Total Residents", value: String(total), note: "Registered population" },
        { label: "Registered Voters", value: String(registered.length), note: "Marked as registered" },
        { label: "Not Registered", value: String(total - registered.length), note: "Other voter statuses" },
        { label: "Registration Rate", value: total ? `${((registered.length / total) * 100).toFixed(1)}%` : "0%", note: "Of registered residents" },
      ],
    },
    fourps: {
      title: "4Ps Demographics",
      description: "4Ps membership coverage and member profile across the barangay.",
      distributionTitle: "4Ps Membership Status",
      secondaryTitle: "4Ps Members by Sex",
      secondaryItems: genderCounts(fourPsMembers),
      distribution: fourPsDistribution,
      stats: [
        { label: "Total Residents", value: String(total), note: "Registered population" },
        { label: "4Ps Members", value: String(fourPsMembers.length), note: "Marked as a member" },
        { label: "Not 4Ps Members", value: String(total - fourPsMembers.length), note: "Other membership status" },
        { label: "Membership Rate", value: total ? `${((fourPsMembers.length / total) * 100).toFixed(1)}%` : "0%", note: "Of registered residents" },
      ],
    },
  } satisfies Record<ResidentCategoryKey, {
    title: string;
    description: string;
    distributionTitle: string;
    secondaryTitle: string;
    secondaryItems: CountItem[];
    distribution: CountItem[];
    stats: StatItem[];
  }>;

  const config = categoryConfig[category];
  const categoryIcon = {
    skills: <Wrench size={19} />,
    income: <Banknote size={19} />,
    voters: <Vote size={19} />,
    fourps: <HeartHandshake size={19} />,
  }[category];

  return (
    <section className="rcd-shell" data-category={category}>
      <div className="rcd-intro">
        <div>
          <span>{category.toUpperCase()} ANALYTICS</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <div className="rcd-live"><i /> Current Census Data</div>
      </div>

      <div className="rcd-stats">
        {config.stats.map((item, index) => (
          <article className="rcd-stat-card" key={item.label}>
            <div className={`rcd-stat-icon rcd-tone-${index + 1}`}>{categoryIcon}</div>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="rcd-grid">
        <article className="rcd-panel">
          <header className="rcd-panel-heading">
            <div><span>POPULATION PROFILE</span><h3>{config.distributionTitle}</h3></div>
            <BarChart3 size={19} />
          </header>
          <Donut items={config.distribution} total={total} />
        </article>

        <article className="rcd-panel">
          <header className="rcd-panel-heading">
            <div><span>RECORD BREAKDOWN</span><h3>{config.secondaryTitle}</h3></div>
            {category === "income" ? <BriefcaseBusiness size={19} /> : <Users size={19} />}
          </header>
          <BarList items={config.secondaryItems} />
        </article>

        <article className="rcd-panel rcd-panel-wide">
          <header className="rcd-panel-heading">
            <div><span>GEOGRAPHIC PROFILE</span><h3>Residents by Purok</h3></div>
            <MapPin size={19} />
          </header>
          <BarList items={purokDistribution} />
        </article>
      </div>

      {total === 0 && <p className="rcd-note">No census residents are available for this demographic summary.</p>}
    </section>
  );
}
