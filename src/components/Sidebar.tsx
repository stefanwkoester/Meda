import { LayoutDashboard, FolderOpen, Camera, Upload, FileText, BrainCircuit, Settings, HelpCircle } from 'lucide-react';

const items = [
  [LayoutDashboard, 'Dashboard'], [FolderOpen, 'Case Log'], [Camera, 'Start Capture'], [Upload, 'Import Media'],
  [FileText, 'Documentation'], [BrainCircuit, 'AI Dx (Future)']
] as const;

export function Sidebar() {
  return <nav className="sidebar" aria-label="Primary navigation">
    <div className="brand"><img src="/assets/meda-logo.png" alt="Meda" /></div>
    <div className="sidebar-label">Workspace</div>
    <div className="sidebar-items">
      {items.map(([Icon, label], idx) => <button className={`nav-item ${idx === 1 ? 'active' : ''}`} key={label}><Icon size={18}/><span>{label}</span></button>)}
    </div>
    <div className="sidebar-spacer" />
    <button className="nav-item"><Settings size={18}/><span>Settings</span></button>
    <button className="nav-item"><HelpCircle size={18}/><span>Help & Support</span></button>
  </nav>;
}
