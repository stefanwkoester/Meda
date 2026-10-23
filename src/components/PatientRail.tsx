import { Camera, Video, FileText, Scissors, FlaskConical, Plus } from 'lucide-react';

export function PatientRail({ patient }: { patient: any }) {
  return <div className="patient-rail">
    <div className="patient-card">
      <div className="avatar">EJ</div>
      <div><h1>{patient.displayName}</h1><p>{patient.age} y/o • {patient.sex}</p><p className="muted">ID: {patient.id}</p></div>
    </div>
    <div className="risk-card"><span>Skin Cancer Risk</span><b>{patient.risk}</b></div>
    <div className="risk-card"><span>Fitzpatrick</span><b>{patient.skinType}</b></div>

    <h3>Body Maps</h3>
    <div className="exam-list">
      {patient.exams.map((e:any, i:number)=><button className={`exam-card ${i===0?'selected':''}`} key={e.date}><b>{e.date}</b><span>{e.label}</span></button>)}
    </div>

    <div className="asset-list">
      <Asset icon={<Scissors size={16}/>} label="Lesions" count={patient.counts.lesions}/>
      <Asset icon={<FlaskConical size={16}/>} label="Biopsies" count={patient.counts.biopsies}/>
      <Asset icon={<Camera size={16}/>} label="Photos" count={patient.counts.photos}/>
      <Asset icon={<Video size={16}/>} label="Videos" count={patient.counts.videos}/>
      <Asset icon={<FileText size={16}/>} label="Notes" count={patient.counts.notes}/>
    </div>
    <button className="primary full"><Plus size={17}/> Add Media</button>
  </div>
}

function Asset({icon,label,count}:{icon:any,label:string,count:number}) {
  return <button className="asset-row"><span className="asset-name">{icon}{label}</span><span className="count">{count}</span></button>
}
