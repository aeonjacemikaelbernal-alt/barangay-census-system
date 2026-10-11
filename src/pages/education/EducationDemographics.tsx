import { useMemo } from "react";
import { BookOpen, Building2, GraduationCap, School, Users } from "lucide-react";
import { toFormalText, type EducationResident } from "./educationUtils";

type Props = { residents: EducationResident[] };

type CountItem = { label: string; count: number };

function counts(values: string[]): CountItem[] {
  const map = new Map<string, number>();
  values.forEach(raw => {
    const value = toFormalText(raw) || "Not Specified";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label));
}

function BarList({items}:{items:CountItem[]}) {
  const max = Math.max(1,...items.map(x=>x.count));
  return <div className="edx-bars">{items.map(item=><div className="edx-bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.count}</strong></div><div className="edx-track"><i style={{width:`${(item.count/max)*100}%`}}/></div></div>)}</div>;
}

function Donut({items,total}:{items:CountItem[];total:number}) {
  const first = items[0]?.count || 0;
  const pct = total ? Math.round(first/total*100) : 0;
  return <div className="edx-donut-wrap"><div className="edx-donut" style={{"--pct":`${pct}%`} as React.CSSProperties}><div><strong>{total}</strong><span>Residents</span></div></div><div className="edx-legend">{items.slice(0,6).map(x=><div key={x.label}><span>{x.label}</span><strong>{x.count}</strong></div>)}</div></div>;
}

export default function EducationDemographics({residents}:Props) {
  const data = useMemo(()=>{
    const statuses=counts(residents.map(r=>String(r.schoolStatus||"Not Specified")));
    const levels=counts(residents.filter(r=>r.schoolStatus==="Currently Studying").map(r=>String(r.schoolLevel||"Not Specified")));
    const attainment=counts(residents.map(r=>String(r.education||"Not Specified")));
    const schools=counts(residents.flatMap(r=>[
      r.elementarySchool,r.juniorHighSchool,
      r.seniorHighSchool === "Not Applicable - Pre-K-12 Curriculum" || r.seniorHighSchool === "__SHS_APPLICABLE__" ? "" : r.seniorHighSchool,
      r.collegeUniversity,r.postgraduateSchool
    ].map(x=>String(x||"").trim()).filter(Boolean)));
    const puroks=counts(residents.map(r=>String(r.purok||"Not Specified")));
    const current=residents.filter(r=>r.schoolStatus==="Currently Studying").length;
    const preK12=residents.filter(r=>r.seniorHighSchool==="Not Applicable - Pre-K-12 Curriculum").length;
    const withInfo=residents.filter(r=>r.education || r.schoolStatus).length;
    return {statuses,levels,attainment,schools,puroks,current,preK12,withInfo};
  },[residents]);

  return <section className="education-demographics">
    <div className="edx-intro"><div><span>EDUCATION ANALYTICS</span><h2>Barangay Education Demographics</h2><p>Live summary based on the education information recorded in the census.</p></div></div>
    <div className="edx-summary">
      <article><Users size={20}/><div><span>Total Residents</span><strong>{residents.length}</strong></div></article>
      <article><School size={20}/><div><span>Currently Studying</span><strong>{data.current}</strong></div></article>
      <article><BookOpen size={20}/><div><span>With Education Info</span><strong>{data.withInfo}</strong></div></article>
      <article><GraduationCap size={20}/><div><span>Pre-K-12 / Old Curriculum</span><strong>{data.preK12}</strong></div></article>
    </div>
    <div className="edx-grid">
      <article className="edx-panel"><div className="edx-panel-title"><div><span>SCHOOL PARTICIPATION</span><h3>School Status</h3></div><School size={19}/></div><Donut items={data.statuses} total={residents.length}/></article>
      <article className="edx-panel"><div className="edx-panel-title"><div><span>CURRENT STUDENTS</span><h3>Current School Level</h3></div><GraduationCap size={19}/></div>{data.levels.length?<BarList items={data.levels}/>:<p className="edx-none">No current school-level data recorded.</p>}</article>
      <article className="edx-panel edx-wide"><div className="edx-panel-title"><div><span>EDUCATIONAL PROFILE</span><h3>Educational Attainment</h3></div><BookOpen size={19}/></div><BarList items={data.attainment}/></article>
      <article className="edx-panel edx-wide"><div className="edx-panel-title"><div><span>SCHOOL HISTORY</span><h3>Schools / Institutions Recorded</h3><p>A resident can appear under multiple schools when records exist for different education levels.</p></div><Building2 size={19}/></div>{data.schools.length?<BarList items={data.schools}/>:<p className="edx-none">No school names recorded.</p>}</article>
    </div>
    <div className="edx-table-panel"><div className="edx-panel-title"><div><span>AREA SUMMARY</span><h3>Education Records by Purok</h3></div></div><div className="edx-table-wrap"><table><thead><tr><th>Purok</th><th>Residents</th><th>Share of Population</th></tr></thead><tbody>{data.puroks.map(x=><tr key={x.label}><td>{x.label}</td><td>{x.count}</td><td>{residents.length?`${((x.count/residents.length)*100).toFixed(1)}%`:"0%"}</td></tr>)}</tbody></table></div></div>
    <p className="edx-note"><strong>Reading the data:</strong> “Schools / Institutions Recorded” represents school history stored in census records. It should not be interpreted as current enrollment unless the resident is marked “Currently Studying” and has a matching current school level.</p>
  </section>;
}


