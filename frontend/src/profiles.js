// Static ASHA Worker and Manager Profiles
export const STATIC_PROFILES = [
  {
    id: 'asha1',
    username: 'asha1',
    password: 'password123',
    name: 'Asha Devi',
    role: 'asha_worker',
    worker_label: 'ASHA Worker 1',
    worker_id: 'ASHA-101',
    village: 'Palani',
    phc: 'PHC Nandipuram',
    phone: '+91 98765 43210',
    experience: '4 years',
    monthly_target_visits: 35,
    avatar: '👩🏽‍⚕️',
    badgeColor: '#0D5C55',
    bio: 'Senior frontline ASHA worker for Palani village cluster. Specializes in maternal & child health, ANC checkups, and early malnutrition detection.',
  },
  {
    id: 'asha2',
    username: 'asha2',
    password: 'password123',
    name: 'Lakshmi R',
    role: 'asha_worker',
    worker_label: 'ASHA Worker 2',
    worker_id: 'ASHA-102',
    village: 'Vadapalani',
    phc: 'PHC Velachery',
    phone: '+91 98765 43211',
    experience: '3 years',
    monthly_target_visits: 35,
    avatar: '👩🏾‍⚕️',
    badgeColor: '#12726A',
    bio: 'Frontline health worker serving Vadapalani. Focuses on adolescent nutrition, high-risk pregnancy screening, and door-to-door NCD vitals monitoring.',
  },
  {
    id: 'asha3',
    username: 'asha3',
    password: 'password123',
    name: 'Meena Kumari',
    role: 'asha_worker',
    worker_label: 'ASHA Worker 3',
    worker_id: 'ASHA-103',
    village: 'Kancheepuram',
    phc: 'Government Hospital Kancheepuram',
    phone: '+91 98765 43212',
    experience: '5 years',
    monthly_target_visits: 30,
    avatar: '👩🏻‍⚕️',
    badgeColor: '#094840',
    bio: 'Dedicated community health volunteer covering Kancheepuram hamlets. Experienced in immunization campaigns and maternal danger sign triaging.',
  },
  {
    id: 'manager',
    username: 'manager',
    password: 'admin123',
    name: 'Dr. Rajesh Sharma',
    role: 'manager',
    worker_label: 'PHC Medical Officer & Health Supervisor',
    worker_id: 'MOIC-501',
    village: 'All Block Villages (HQ)',
    phc: 'Block Primary Health Centre (HQ)',
    phone: '+91 98765 40001',
    email: 'dr.rajesh.phc@health.gov.in',
    experience: '12 years',
    designation: 'Medical Officer In-Charge (MOIC)',
    monthly_target_visits: 0,
    avatar: '👨🏽‍⚕️',
    badgeColor: '#1e3a8a', // navy blue for medical officer
    bio: 'Oversees frontline healthcare operations across 8 village sub-centers. Reviews real-time patient entries, evaluates ASHA worker efficiency, and audits clinical escalations.',
  },
];

const USER_STORAGE_KEY = 'asha_copilot_user';

export function getStoredUser() {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const match = STATIC_PROFILES.find(p => p.id === parsed.id || p.username === parsed.username);
      if (match) return match;
    }
  } catch (e) {
    console.error('Error reading stored user:', e);
  }
  // Default to ASHA Worker 1
  return STATIC_PROFILES[0];
}

export function saveStoredUser(user) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error storing user:', e);
  }
}

export function authenticateUser(username, password) {
  const cleanU = (username || '').trim().toLowerCase();
  const cleanP = (password || '').trim();
  const found = STATIC_PROFILES.find(
    p => p.username.toLowerCase() === cleanU && p.password === cleanP
  );
  return found || null;
}
