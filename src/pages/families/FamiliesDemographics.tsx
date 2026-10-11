import { UsersRound, Users, MapPinned, Home, PieChart, BarChart3 } from "lucide-react";
import type { CensusData } from "../../types/census";

type Props = { censusRecords: CensusData[] };

function proper(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function FamiliesDemographics({ censusRecords }: Props) {
  const records = Array.isArray(censusRecords) ? censusRecords : [];
  const families = records.flatMap(record =>
    (Array.isArray(record.families) ? record.families : []).map(family => ({
      ...family,
      household: record.household,
    }))
  );

  const totalFamilies = families.length;
  const totalMembers = families.reduce((s, f) => s + (Array.isArray(f.members) ? f.members.length : 0), 0);
  const avgSize = totalFamilies ? totalMembers / totalFamilies : 0;
  const householdsWithFamilies = records.filter(r => Array.isArray(r.families) && r.families.length > 0).length;

  const purokMap = new Map<string, number>();
  families.forEach(f => {
    const p = proper(f.household?.purok || "Unspecified");
    purokMap.set(p, (purokMap.get(p) || 0) + 1);
  });
  const puroks = [...purokMap.entries()].sort((a,b) => b[1]-a[1]);

  const sizes = [
    {label:"1 Member", value:0},
    {label:"2–3 Members", value:0},
    {label:"4–5 Members", value:0},
    {label:"6+ Members", value:0},
  ];
  families.forEach(f => {
    const n = Array.isArray(f.members) ? f.members.length : 0;
    if(n <= 1) sizes[0].value++;
    else if(n <= 3) sizes[1].value++;
    else if(n <= 5) sizes[2].value++;
    else sizes[3].value++;
  });
  const maxSize = Math.max(...sizes.map(x=>x.value),1);

  const relationshipMap = new Map<string, number>();
  families.forEach(f => (Array.isArray(f.members) ? f.members : []).forEach(m => {
    const rel = proper(m.familyRelationship || "Family Member");
    relationshipMap.set(rel,(relationshipMap.get(rel)||0)+1);
  }));
  const relationships = [...relationshipMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxRel = Math.max(...relationships.map(x=>x[1]),1);

  const palette=["#2f6fb3","#35a18b","#7868b5","#d08a4c","#cc6677","#6f8ca8"];
  const stops=puroks.reduce<{ ranges: string[]; angle: number }>((acc,[,v],i)=>{ const next=acc.angle+(totalFamilies ? v/totalFamilies*360:0); acc.ranges.push(`${palette[i%palette.length]} ${acc.angle}deg ${next}deg`); return { ranges: acc.ranges, angle: next }; },{ranges:[],angle:0}).ranges;
  const donut=stops.length?`conic-gradient(${stops.join(",")})`:"conic-gradient(#e8eef5 0 360deg)";

  return <section className="fdx-shell">
    <div className="fdx-intro">
      <div><span>FAMILY ANALYTICS</span><h2>Family Demographics</h2><p>Live overview based on family membership and household location in current census records.</p></div>
      <b><i/> Current Census Data</b>
    </div>

    <div className="fdx-stats">
      <article><UsersRound/><div><span>Total Families</span><strong>{totalFamilies}</strong><small>Registered family groups</small></div></article>
      <article><Users/><div><span>Total Family Members</span><strong>{totalMembers}</strong><small>Residents assigned to families</small></div></article>
      <article><BarChart3/><div><span>Average Family Size</span><strong>{avgSize.toFixed(1)}</strong><small>Members per family</small></div></article>
      <article><Home/><div><span>Households with Families</span><strong>{householdsWithFamilies}</strong><small>Current household records</small></div></article>
    </div>

    <div className="fdx-grid">
      <article className="fdx-card fdx-purok">
        <header><div><span>LOCATION DISTRIBUTION</span><h3>Families by Purok</h3></div><PieChart size={18}/></header>
        <div className="fdx-donut-layout">
          <div className="fdx-donut" style={{background:donut}}><div><strong>{totalFamilies}</strong><span>Families</span></div></div>
          <div className="fdx-legend">{puroks.map(([p,v],i)=><div key={p}><i style={{background:palette[i%palette.length]}}/><b>{p}</b><strong>{v}</strong><small>{totalFamilies?((v/totalFamilies)*100).toFixed(1):"0.0"}%</small></div>)}</div>
        </div>
      </article>

      <article className="fdx-card">
        <header><div><span>FAMILY COMPOSITION</span><h3>Family Size Distribution</h3></div><BarChart3 size={18}/></header>
        <div className="fdx-bars">{sizes.map((x,i)=><div className="fdx-bar-item" key={x.label}><strong>{x.value}</strong><div><i className={`c${i+1}`} style={{height:`${Math.max(x.value/maxSize*100,x.value?10:0)}%`}}/></div><span>{x.label}</span></div>)}</div>
      </article>

      <article className="fdx-card">
        <header><div><span>MEMBER PROFILE</span><h3>Family Relationships</h3></div><Users size={18}/></header>
        <div className="fdx-rel">{relationships.map(([r,v])=><div key={r}><div><span>{r}</span><b>{v}</b></div><div className="track"><i style={{width:`${v/maxRel*100}%`}}/></div></div>)}</div>
      </article>
    </div>

    <article className="fdx-card">
      <header><div><span>BREAKDOWN TABLE</span><h3>Purok Family Summary</h3></div><MapPinned size={18}/></header>
      <div className="fdx-table-wrap"><table><thead><tr><th>Purok</th><th>Families</th><th>Share of Families</th></tr></thead><tbody>
        {puroks.map(([p,v])=><tr key={p}><td><b>{p}</b></td><td>{v}</td><td><div className="fdx-share"><span>{totalFamilies?((v/totalFamilies)*100).toFixed(1):"0.0"}%</span><div><i style={{width:`${totalFamilies?v/totalFamilies*100:0}%`}}/></div></div></td></tr>)}
      </tbody></table></div>
    </article>
  </section>;
}

