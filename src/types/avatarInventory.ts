export interface CustomClothingItem {
  id: string;
  name: string;
  type: 'shirt' | 'pants';
  dataUrl: string;
  previewUrl?: string;
  createdAt: number;
  creatorId?: string;
  creatorUsername?: string;
  isCreator?: boolean;
}

export const SHIRTS_INVENTORY_KEY = 'boblox_custom_shirts_v2';
export const PANTS_INVENTORY_KEY = 'boblox_custom_pants_v2';

export function getSavedShirtsInventory(): CustomClothingItem[] {
  try {
    const raw = localStorage.getItem(SHIRTS_INVENTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load shirts inventory:', e);
  }
  return [];
}

export function saveShirtToInventory(item: CustomClothingItem) {
  try {
    const current = getSavedShirtsInventory();
    const updated = [item, ...current.filter((i) => i.id !== item.id)];
    localStorage.setItem(SHIRTS_INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save shirt to inventory:', e);
    return [];
  }
}

export function getSavedPantsInventory(): CustomClothingItem[] {
  try {
    const raw = localStorage.getItem(PANTS_INVENTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load pants inventory:', e);
  }
  return [];
}

export function savePantsToInventory(item: CustomClothingItem) {
  try {
    const current = getSavedPantsInventory();
    const updated = [item, ...current.filter((i) => i.id !== item.id)];
    localStorage.setItem(PANTS_INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save pants to inventory:', e);
    return [];
  }
}
