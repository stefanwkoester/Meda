import { Plus, GitCompareArrows, Maximize2 } from 'lucide-react';
import type { Finding } from '../data/mockPatients';

export function BodyMapWorkspace({ patient, selectedFindingId, onSelectFinding }:{patient:any, selectedFindingId:string, onSelectFinding:(id:string)=>void}) {
  return <div className="workspace">
    <header className="workspace-header">
      <div><p className="eyebrow">FULL BODY EXAM</p><h2>Skin Map</h2><p className="muted">Captured May 20, 2024</p></div>
      <div className="actions"><button className="secondary"><GitCompareArrows size={17}/> Compare</button><button className="primary"><Plus size={17}/> New Exam</button></div>
    </header>

    <div className="body-map-stage">
      <BodyCard title="Anterior View" view="anterior" findings={patient.findings} selectedFindingId={selectedFindingId} onSelectFinding={onSelectFinding}/>
      <BodyCard title="Posterior View" view="posterior" findings={patient.findings} selectedFindingId={selectedFindingId} onSelectFinding={onSelectFinding}/>
      <div className="legend">
        <Legend c="blue" t="Melanocytic Nevus"/><Legend c="yellow" t="Atypical / Monitored"/><Legend c="red" t="Biopsy / High Concern"/><Legend c="purple" t="Actinic Keratosis"/><Legend c="white" t="Surgical Site"/><Legend c="teal" t="Rash / Inflammation"/>
      </div>
    </div>

    <section className="additional">
      <div className="section-title"><h3>Additional Views</h3><button className="text-button">View all</button></div>
      <div className="view-grid">
        {['Left lateral','Right lateral','Scalp','Hands','Feet'].map((v,i)=><button className="view-card" key={v}><div className={`mini-body mini-${i}`}></div><span>{v}</span></button>)}
      </div>
    </section>
  </div>
}

function BodyCard({title,view,findings,selectedFindingId,onSelectFinding}:{title:string,view:'anterior'|'posterior',findings:Finding[],selectedFindingId:string,onSelectFinding:(id:string)=>void}) {
  return <section className="body-card">
    <div className="body-title"><h3>{title}</h3><button aria-label={`Expand ${title}`}><Maximize2 size={15}/></button></div>
    <div className={`body-silhouette ${view}`} aria-label={`${title} body map`}>
      <div className="head-shape"/><div className="torso-shape"/><div className="arm arm-l"/><div className="arm arm-r"/><div className="leg leg-l"/><div className="leg leg-r"/>
      {findings.filter(f=>f.view===view).map(f=><button key={f.id} aria-label={`${f.id}, ${f.label}, ${f.location}, ${f.status}`} title={`${f.id}: ${f.label} — ${f.location}`} onClick={()=>onSelectFinding(f.id)} className={`marker marker-${f.category} ${selectedFindingId===f.id?'selected':''}`} style={{left:`${f.x}%`,top:`${f.y}%`}}><span className="sr-only">{f.id}</span></button>)}
    </div>
  </section>
}

function Legend({c,t}:{c:string,t:string}) { return <div className="legend-row"><span className={`legend-dot ${c}`}/><span>{t}</span></div> }
