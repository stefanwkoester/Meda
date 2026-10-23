export type Finding = {
  id: string;
  label: string;
  category: 'nevus' | 'atypical' | 'malignant' | 'ak' | 'surgery' | 'biopsy' | 'inflammation';
  location: string;
  status: string;
  size?: string;
  x: number;
  y: number;
  view: 'anterior' | 'posterior';
};

export const patient = {
  id: 'EJ-052024-01',
  displayName: 'Emily Johnson',
  age: 34,
  sex: 'Female',
  skinType: 'Type II',
  risk: 'Moderate',
  counts: { lesions: 42, surgicalSites: 7, biopsies: 5, photos: 186, videos: 12, notes: 8 },
  exams: [
    { date: '2024-05-20', label: 'Full Body Exam' },
    { date: '2024-02-14', label: 'Follow Up' },
    { date: '2023-11-03', label: 'Initial Exam' }
  ],
  findings: [
    { id: 'A12', label: 'Atypical nevus', category: 'malignant', location: 'Left upper chest', status: 'Biopsied', size: '6.2 × 4.8 mm', x: 54, y: 22, view: 'anterior' },
    { id: 'B07', label: 'Monitored lesion', category: 'atypical', location: 'Right upper back', status: 'Monitoring', x: 53, y: 18, view: 'posterior' },
    { id: 'C04', label: 'Melanocytic nevus', category: 'nevus', location: 'Left thigh', status: 'Stable', x: 42, y: 61, view: 'anterior' },
    { id: 'S03', label: 'Surgical site', category: 'surgery', location: 'Upper back', status: 'Post-op', x: 48, y: 29, view: 'posterior' }
  ] as Finding[]
};
