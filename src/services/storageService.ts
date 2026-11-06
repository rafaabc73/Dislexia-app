import {
  StudyDocument,
  GeneratedArtifact,
  BoardCopyItem,
  AgendaItem,
  StudyPlan,
  ExamCorrection,
  AppSettings,
} from '../types';
import {
  INITIAL_DOCUMENTS,
  INITIAL_AGENDA,
  INITIAL_BOARD_COPIES,
} from '../constants/curriculum';

const DB_NAME = 'DislexiaAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const SETTINGS_KEY = 'dislexia_app_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  currentSchoolYear: '2026 - 7º Ano',
  fontFamily: 'Lexend',
  fontSize: 16,
  lineHeight: 1.75,
  letterSpacing: 0.02,
  readingRulerEnabled: false,
  speechRate: 1.0,
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToStorage<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(`dislexia_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage fallback warning:', e);
    }
  }
}

export async function loadFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    const result = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
    if (result !== undefined) return result;
  } catch {
    // Fallback to localStorage
  }
  try {
    const raw = localStorage.getItem(`dislexia_${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Ignore parse error
  }
  return defaultValue;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

export interface FullBackupData {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  documents: StudyDocument[];
  artifacts: GeneratedArtifact[];
  boardCopies: BoardCopyItem[];
  agenda: AgendaItem[];
  plans: StudyPlan[];
  corrections: ExamCorrection[];
}

export async function exportFullBackup(): Promise<string> {
  const settings = loadSettings();
  const documents = await loadFromStorage<StudyDocument[]>('documents_v2', INITIAL_DOCUMENTS);
  const artifacts = await loadFromStorage<GeneratedArtifact[]>('artifacts_v2', []);
  const boardCopies = await loadFromStorage<BoardCopyItem[]>('boardCopies_v2', INITIAL_BOARD_COPIES);
  const agenda = await loadFromStorage<AgendaItem[]>('agenda_v2', INITIAL_AGENDA);
  const plans = await loadFromStorage<StudyPlan[]>('plans_v2', []);
  const corrections = await loadFromStorage<ExamCorrection[]>('corrections_v2', []);

  const payload: FullBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { ...settings, geminiApiKey: '' }, // Do not export secret API key by default
    documents,
    artifacts,
    boardCopies,
    agenda,
    plans,
    corrections,
  };
  return JSON.stringify(payload, null, 2);
}

