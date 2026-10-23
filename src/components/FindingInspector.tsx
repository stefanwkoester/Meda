import type { Finding } from '../data/mockPatients';
import { Play, ExternalLink, Image as ImageIcon } from 'lucide-react';

export function FindingInspector({finding}:{finding:Finding}) {
  return <div className="inspector">
    <div className="inspector-heading"><div><p className="eyebrow">SELECTED FINDING</p><h2>Lesion #{finding.id}</h2></div><span className="status-pill">{finding.status}</span></div>
    <div className="clinical-photo lesion-photo"><div className="synthetic-lesion"/></div>
    <div className="thumb-strip"><button className="thumb active"><div className="synthetic-lesion small"/></button><button className="thumb"><div className="measurement"></div></button><button className="thumb"><div className="postop"></div></button></div>

    <dl className="metadata">
      <Row k="Location" v={finding.location}/><Row k="Size" v={finding.size ?? '—'}/><Row k="Diagnosis" v={finding.label}/><Row k="Procedure" v="Shave biopsy"/><Row k="Date" v="05/20/2024"/><Row k="Pathology" v="Compound melanocytic nevus"/>
    </dl>

    <div className="notes"><h3>Notes</h3><p>Irregular borders with color variation. Patient elected for shave biopsy.</p></div>

    <section className="timeline-card"><h3>Timeline</h3><div className="timeline-images"><Time date="11/03/2023" size="4.1 mm"/><span>→</span><Time date="02/14/2024" size="5.2 mm"/><span>→</span><Time date="05/20/2024" size="6.2 mm" active/></div></section>

    <section className="procedure-card"><div className="section-title"><h3>Surgical Site • Video</h3><button className="text-button">Open <ExternalLink size={13}/></button></div><div className="video-preview"><div className="play"><Play size={18} fill="currentColor"/></div><ImageIcon size={28}/><span>Excision — Upper Back</span><small>05/18/2024 • 2:34</small></div></section>
  </div>
}

function Row({k,v}:{k:string,v:string}) { return <div className="metadata-row"><dt>{k}</dt><dd>{v}</dd></div> }
function Time({date,size,active}:{date:string,size:string,active?:boolean}) { return <button className={`timepoint ${active?'active':''}`}><div className="synthetic-lesion small"/><b>{date}</b><span>{size}</span></button> }
