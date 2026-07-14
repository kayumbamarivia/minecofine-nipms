const STORAGE_KEYS = {
  PIPELINE: 'nipms_rw_pipeline',
  ACTIVITIES: 'nipms_rw_activities',
  DOCUMENTS: 'nipms_rw_documents',
  INITIALIZED: 'nipms_rw_initialized',
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

export const localStorageAPI = {
  getPipeline: async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { success: true, data: getFromStorage(STORAGE_KEYS.PIPELINE, []) };
  },
  updatePipelineItem: async (id: string, updates: Record<string, unknown>) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const pipeline = getFromStorage<Record<string, unknown>[]>(STORAGE_KEYS.PIPELINE, []);
    const updated = pipeline.map((item) => (item.id === id ? { ...item, ...updates } : item));
    saveToStorage(STORAGE_KEYS.PIPELINE, updated);
    return { success: true, data: updated.find((item) => item.id === id) };
  },
  getActivities: async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { success: true, data: getFromStorage(STORAGE_KEYS.ACTIVITIES, []) };
  },
  updateActivity: async (id: string, updates: Record<string, unknown>) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const activities = getFromStorage<Record<string, unknown>[]>(STORAGE_KEYS.ACTIVITIES, []);
    const updated = activities.map((item) => (item.id === id ? { ...item, ...updates } : item));
    saveToStorage(STORAGE_KEYS.ACTIVITIES, updated);
    return { success: true, data: updated.find((item) => item.id === id) };
  },
  getDocuments: async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { success: true, data: getFromStorage(STORAGE_KEYS.DOCUMENTS, []) };
  },
  initialize: async (data: { pipeline?: unknown[]; activities?: unknown[]; documents?: unknown[] }) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    if (data.pipeline) saveToStorage(STORAGE_KEYS.PIPELINE, data.pipeline);
    if (data.activities) saveToStorage(STORAGE_KEYS.ACTIVITIES, data.activities);
    if (data.documents) saveToStorage(STORAGE_KEYS.DOCUMENTS, data.documents);
    saveToStorage(STORAGE_KEYS.INITIALIZED, true);
    return { success: true };
  },
  reset: async () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    return { success: true };
  },
};
