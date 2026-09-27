export type PartShape = 'block' | 'sphere' | 'cylinder' | 'wedge';

export type PartMaterial = 'SmoothPlastic' | 'Neon' | 'Wood' | 'Metal' | 'Brick' | 'Glass';

export type PartFaceName = 'all' | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

export type TextureMappingMode = 'stretch' | 'tile' | 'fit';

export interface TextureProperties {
  mode?: TextureMappingMode;
  repeatX?: number;
  repeatY?: number;
  transparency?: number;
}

export interface PartFaceTextures {
  all?: string;
  front?: string;
  back?: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export interface StudioScript {
  id: string;
  name: string;
  parentId: string; // 'serverscriptservice', 'workspace', or part ID
  code: string;
  enabled: boolean;
  createdAt: number;
}

export interface StudioPart {
  id: string;
  name: string;
  shape: PartShape;
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number]; // Euler angles in degrees
  color: string;
  material: PartMaterial;
  transparency: number;
  reflectance: number;
  anchored: boolean; // if false, falls with physics
  canCollide: boolean; // if false, player walks through
  textures?: PartFaceTextures;
  textureProperties?: TextureProperties;
  scripts?: StudioScript[];
}

export interface ExperienceData {
  id: string;
  name: string;
  description: string;
  creatorId?: string;
  creatorUsername?: string;
  createdAt: number;
  lastUpdated: number;
  published: boolean;
  visits: number;
  likes: number;
  dislikes: number;
  favorites: number;
  userLiked?: 'like' | 'dislike' | null;
  userFavorited?: boolean;
  parts: StudioPart[];
  scripts?: StudioScript[];
  baseplateEnabled?: boolean;
  baseplateColor?: string;
  baseplateSize?: [number, number];
}

export const EXPERIENCES_STORAGE_KEY = 'boblox_experiences_v5_user_only';

export const INITIAL_DEFAULT_EXPERIENCES: ExperienceData[] = [];

export function getSavedExperiences(): ExperienceData[] {
  try {
    // Clear all legacy storage keys with mock places
    localStorage.removeItem('boblox_experiences_v1');
    localStorage.removeItem('boblox_experiences_v2');
    localStorage.removeItem('boblox_experiences_v3');
    localStorage.removeItem('boblox_experiences_v4_clean');
    const raw = localStorage.getItem(EXPERIENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any lingering fake default places
        return parsed.filter((exp: any) => exp.id !== 'exp-default-1');
      }
    }
  } catch (e) {
    console.error('Failed to load experiences:', e);
  }
  return [];
}

export function resetAllSavedExperiences(): ExperienceData[] {
  try {
    localStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to reset experiences:', e);
  }
  return [];
}

export function saveExperiences(experiences: ExperienceData[]) {
  try {
    localStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify(experiences));
  } catch (e) {
    console.error('Failed to save experiences:', e);
  }
}

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
