import { collection, doc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { getSeedMarketplaceItems } from '../utils/marketplaceClothingSeeds';
import {
  saveShirtToInventory,
  savePantsToInventory,
  getSavedShirtsInventory,
  getSavedPantsInventory,
} from './avatarInventory';

export interface MarketplaceClothingItem {
  id: string;
  name: string;
  type: 'shirt' | 'pants';
  dataUrl: string; // The 585x559 texture template
  previewUrl?: string; // 2D front preview
  creatorId: string;
  creatorUsername: string;
  price: number; // 0 for free
  boughtCount: number; // number of times acquired
  onSale: boolean;
  createdAt: number;
}

export const MARKETPLACE_STORAGE_KEY = 'boblox_marketplace_items_v3';

let memoryCache: MarketplaceClothingItem[] | null = null;

export async function getSavedMarketplaceItems(): Promise<MarketplaceClothingItem[]> {
  if (memoryCache && memoryCache.length > 0) return memoryCache;

  try {
    const raw = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load local marketplace:', e);
  }

  // Seed default community items
  const seeds = await getSeedMarketplaceItems();
  memoryCache = seeds;
  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(seeds));
  } catch (e) {
    // ignore
  }
  return seeds;
}

export function saveLocalMarketplaceItems(items: MarketplaceClothingItem[]) {
  memoryCache = items;
  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to cache marketplace items:', e);
  }
}

/**
 * Publish clothing item into marketplace
 */
export async function publishItemToMarketplace(item: MarketplaceClothingItem) {
  try {
    const current = await getSavedMarketplaceItems();
    const updated = [item, ...current.filter((i) => i.id !== item.id)];
    saveLocalMarketplaceItems(updated);

    // Sync to Firestore
    const itemRef = doc(db, 'marketplace_items', item.id);
    await setDoc(itemRef, item, { merge: true });
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `marketplace_items/${item.id}`);
    return [];
  }
}

/**
 * Buy/Get a marketplace item (Free).
 * Saves to user inventory and increments the bought count.
 */
export async function buyMarketplaceItem(
  item: MarketplaceClothingItem
): Promise<MarketplaceClothingItem> {
  // 1. Add permanently to user inventory
  if (item.type === 'shirt') {
    saveShirtToInventory({
      id: item.id,
      name: item.name,
      type: 'shirt',
      dataUrl: item.dataUrl,
      previewUrl: item.previewUrl,
      createdAt: Date.now(),
      creatorId: item.creatorId,
      creatorUsername: item.creatorUsername,
      isCreator: false,
    });
  } else {
    savePantsToInventory({
      id: item.id,
      name: item.name,
      type: 'pants',
      dataUrl: item.dataUrl,
      previewUrl: item.previewUrl,
      createdAt: Date.now(),
      creatorId: item.creatorId,
      creatorUsername: item.creatorUsername,
      isCreator: false,
    });
  }

  // 2. Increment bought counter
  const updatedItem: MarketplaceClothingItem = {
    ...item,
    boughtCount: (item.boughtCount || 0) + 1,
  };

  const current = await getSavedMarketplaceItems();
  const updatedList = current.map((i) => (i.id === item.id ? updatedItem : i));
  saveLocalMarketplaceItems(updatedList);

  // Firestore increment
  try {
    const itemRef = doc(db, 'marketplace_items', item.id);
    await updateDoc(itemRef, {
      boughtCount: increment(1),
    });
  } catch {
    // offline or local
  }

  return updatedItem;
}

/**
 * Check if the user already owns this marketplace item in their inventory
 */
export function isItemInInventory(item: MarketplaceClothingItem): boolean {
  if (item.type === 'shirt') {
    const shirts = getSavedShirtsInventory();
    return shirts.some((s) => s.id === item.id || s.dataUrl === item.dataUrl);
  } else {
    const pants = getSavedPantsInventory();
    return pants.some((p) => p.id === item.id || p.dataUrl === item.dataUrl);
  }
}

/**
 * Real-time subscription to marketplace items from Firestore
 */
export function subscribeMarketplaceFromFirestore(
  callback: (items: MarketplaceClothingItem[]) => void
) {
  return onSnapshot(
    collection(db, 'marketplace_items'),
    (snap) => {
      if (snap.empty) return;
      const remote = snap.docs.map((d) => d.data() as MarketplaceClothingItem);
      if (remote.length > 0) {
        callback(remote);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'marketplace_items');
    }
  );
}
