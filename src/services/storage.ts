import { RiskLevel, type Household, type VisitRecord, type CreditRecord, type Note } from '../types';
import { parseISO, differenceInDays } from 'date-fns';

const KEYS = {
  HOUSEHOLDS: 'cmb_households',
  VISITS: 'cmb_visits',
  CREDITS: 'cmb_credits',
  NOTES: 'cmb_notes',
  SETTINGS: 'cmb_settings'
};

// Helper to get/set from localStorage
const get = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const set = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const normalizeRiskLevel = (level: any): RiskLevel => {
  const s = String(level || "").toUpperCase().trim();
  if (s === 'RED') return RiskLevel.RED;
  if (s === 'YELLOW') return RiskLevel.YELLOW;
  return RiskLevel.GREEN;
};

/**
 * CMB Storage Service v1.0.2 - Robust Edition
 */
export const storage = {
  // Households
  getHouseholds: (): Household[] => {
    try {
      const rawData = get(KEYS.HOUSEHOLDS);
      const data = Array.isArray(rawData) ? rawData : [];
      
      // Normalize on read to handle any legacy malformed data
      return data.filter(h => h && typeof h === 'object').map((h: any) => ({
        ...h,
        id: String(h.id || Math.random().toString(36).substr(2, 9)),
        name: String(h.name || "未命名"),
        phone: String(h.phone || ""),
        address: String(h.address || ""),
        riskLevel: normalizeRiskLevel(h.riskLevel),
        riskReason: String(h.riskReason || ""),
        notes: String(h.notes || ""),
        members: String(h.members || ""),
        lastVisitedAt: h.lastVisitedAt || null,
        skills: typeof h.skills === 'string' 
          ? h.skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
          : (Array.isArray(h.skills) ? h.skills : [])
      }));
    } catch (e) {
      console.error("getHouseholds failed:", e);
      return [];
    }
  },
  saveHouseholds: (data: any[]) => {
    if (!Array.isArray(data)) return;
    
    const normalized = data.filter(Boolean).map(h => ({
      ...h,
      id: String(h.id || Math.random().toString(36).substr(2, 9)),
      name: String(h.name || "未命名"),
      phone: String(h.phone || ""),
      address: String(h.address || ""),
      riskLevel: normalizeRiskLevel(h.riskLevel),
      riskReason: String(h.riskReason || ""),
      notes: String(h.notes || ""),
      members: String(h.members || ""),
      lastVisitedAt: h.lastVisitedAt || null,
      skills: typeof h.skills === 'string' 
        ? h.skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
        : (Array.isArray(h.skills) ? h.skills : [])
    }));
    set(KEYS.HOUSEHOLDS, normalized);
  },
  
  // Settings
  getSettings: () => get(KEYS.SETTINGS) || { village_name: '科右前旗-红峰村', user_name: '李姐', last_export_at: '1970-01-01T00:00:00.000Z' },
  saveSetting: (key: string, value: string) => {
    const settings = storage.getSettings();
    settings[key] = value;
    set(KEYS.SETTINGS, settings);
  },

  // Todo Logic (Ported from server.ts)
  getTodo: (): Household[] => {
    const households = storage.getHouseholds();
    const today = new Date();
    return households.filter(h => {
      if (h.riskLevel === RiskLevel.GREEN) return false;
      if (!h.lastVisitedAt) return true;
      
      const lastVisit = parseISO(h.lastVisitedAt);
      const daysSinceLastVisit = differenceInDays(today, lastVisit);
      
      if (h.riskLevel === RiskLevel.RED) return daysSinceLastVisit >= 14;
      if (h.riskLevel === RiskLevel.YELLOW) return daysSinceLastVisit >= 30;
      return false;
    });
  },

  // Visits
  getVisits: (): VisitRecord[] => {
    const raw = get(KEYS.VISITS) || [];
    const households = storage.getHouseholds();
    return raw.map((v: any) => ({
      ...v,
      householdName: v.householdName || (households.find(h => String(h.id) === String(v.householdId))?.name || "未知村民")
    }));
  },
  addVisit: (visit: any) => {
    const visits = storage.getVisits();
    visits.push(visit);
    set(KEYS.VISITS, visits);
    
    // Update household lastVisitedAt
    const households = storage.getHouseholds();
    const idx = households.findIndex(h => h.id === visit.householdId);
    if (idx !== -1) {
      households[idx].lastVisitedAt = visit.visitedAt;
      storage.saveHouseholds(households);
    }
  },

  // Credits
  getCreditsHistory: (): CreditRecord[] => {
    const raw = get(KEYS.CREDITS) || [];
    const households = storage.getHouseholds();
    return raw.map((c: any) => ({
      ...c,
      householdName: c.householdName || (households.find(h => String(h.id) === String(c.householdId))?.name || "未知村民")
    }));
  },
  addCredit: (record: CreditRecord) => {
    const history = storage.getCreditsHistory();
    history.push(record);
    set(KEYS.CREDITS, history);
  },
  getCreditsSummary: () => {
    const households = storage.getHouseholds();
    const history = storage.getCreditsHistory();
    return households.map(h => {
      const points = history
        .filter((c: any) => c.householdId === h.id)
        .reduce((acc: number, curr: any) => acc + (curr.type === 'EARN' ? curr.points : -curr.points), 0);
      return { name: h.name, totalPoints: points };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  },

  // Notes
  getNotes: (): Note[] => get(KEYS.NOTES) || [],
  addNote: (note: Note) => {
    const notes = storage.getNotes();
    notes.unshift(note);
    set(KEYS.NOTES, notes);
  },
  updateNote: (id: string, content: string) => {
    const notes = storage.getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      notes[idx].content = content;
      notes[idx].createdAt = new Date().toISOString();
      set(KEYS.NOTES, notes);
    }
  },
  deleteNote: (id: string) => {
    const notes = storage.getNotes();
    set(KEYS.NOTES, notes.filter(n => n.id !== id));
  }
};
