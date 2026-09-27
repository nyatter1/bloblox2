export interface SkinToneItem {
  id: string;
  name: string;
  hex: string;
  category: 'natural' | 'classic' | 'fantasy';
}

export const COMPREHENSIVE_SKIN_TONES: SkinToneItem[] = [
  // --- Natural Skin Tones (Fair to Deep) ---
  { id: 'porcelain', name: 'Porcelain Fair', hex: '#FFF2E8', category: 'natural' },
  { id: 'alabaster', name: 'Alabaster', hex: '#FEE5D5', category: 'natural' },
  { id: 'ivory', name: 'Warm Ivory', hex: '#FCD8C1', category: 'natural' },
  { id: 'fair-peach', name: 'Fair Peach', hex: '#FBCFB2', category: 'natural' },
  { id: 'soft-bisque', name: 'Soft Bisque', hex: '#F7C4A5', category: 'natural' },
  { id: 'light-beige', name: 'Light Beige', hex: '#F1BA98', category: 'natural' },
  { id: 'golden-ivory', name: 'Golden Ivory', hex: '#EFC18C', category: 'natural' },
  { id: 'warm-sand', name: 'Warm Sand', hex: '#E7B488', category: 'natural' },
  { id: 'apricot', name: 'Sunlit Apricot', hex: '#E8A77E', category: 'natural' },
  { id: 'warm-peach', name: 'Warm Peach', hex: '#DF9B78', category: 'natural' },
  { id: 'golden-tan', name: 'Golden Tan', hex: '#D79667', category: 'natural' },
  { id: 'honey', name: 'Warm Honey', hex: '#CC8A56', category: 'natural' },
  { id: 'olive-beige', name: 'Olive Beige', hex: '#C2895B', category: 'natural' },
  { id: 'natural-tan', name: 'Natural Tan', hex: '#BA7A48', category: 'natural' },
  { id: 'sun-bronze', name: 'Sun Bronze', hex: '#AD6D3B', category: 'natural' },
  { id: 'caramel', name: 'Rich Caramel', hex: '#9E5D2E', category: 'natural' },
  { id: 'cinnamon', name: 'Cinnamon Spice', hex: '#8F5025', category: 'natural' },
  { id: 'chestnut', name: 'Golden Chestnut', hex: '#7F431C', category: 'natural' },
  { id: 'mocha', name: 'Rich Mocha', hex: '#6E3814', category: 'natural' },
  { id: 'deep-amber', name: 'Deep Amber', hex: '#5D2E0E', category: 'natural' },
  { id: 'espresso', name: 'Dark Espresso', hex: '#4D2409', category: 'natural' },
  { id: 'dark-cocoa', name: 'Dark Cocoa', hex: '#3E1C07', category: 'natural' },
  { id: 'deep-ebony', name: 'Deep Ebony', hex: '#2E1404', category: 'natural' },
  { id: 'obsidian-rich', name: 'Obsidian Brown', hex: '#1F0C02', category: 'natural' },

  // --- Classic Roblox Tones ---
  { id: 'bright-yellow', name: 'Bright Yellow (Classic Noob)', hex: '#F5CD2F', category: 'classic' },
  { id: 'cool-yellow', name: 'Cool Yellow', hex: '#FEE685', category: 'classic' },
  { id: 'pastel-yellow', name: 'Pastel Light Yellow', hex: '#FFF4B8', category: 'classic' },
  { id: 'classic-nougat', name: 'Classic Nougat', hex: '#A05F34', category: 'classic' },
  { id: 'light-nougat', name: 'Light Nougat', hex: '#D7C59A', category: 'classic' },
  { id: 'classic-brown', name: 'Classic Dark Brown', hex: '#694027', category: 'classic' },
  { id: 'med-stone-grey', name: 'Medium Stone Grey', hex: '#8A929E', category: 'classic' },
  { id: 'dark-stone-grey', name: 'Dark Stone Grey', hex: '#63676C', category: 'classic' },
  { id: 'ghost-white', name: 'Ghost White', hex: '#F8F8F8', category: 'classic' },
  { id: 'dark-stone', name: 'Dark Stone Charcoal', hex: '#28251E', category: 'classic' },
  { id: 'bright-blue', name: 'Bright Blue (Torso)', hex: '#0D69AC', category: 'classic' },
  { id: 'br-yellowish-green', name: 'Br. Yellowish Green (Legs)', hex: '#A1C48C', category: 'classic' },

  // --- Fantasy & Creative Tones ---
  { id: 'demon-crimson', name: 'Demon Crimson', hex: '#C4281C', category: 'fantasy' },
  { id: 'deep-orange', name: 'Sun Orange', hex: '#E8AB2E', category: 'fantasy' },
  { id: 'zombie-green', name: 'Zombie Moss', hex: '#759C51', category: 'fantasy' },
  { id: 'alien-lime', name: 'Alien Lime', hex: '#44B846', category: 'fantasy' },
  { id: 'frost-cyan', name: 'Frostbite Cyan', hex: '#27B0B0', category: 'fantasy' },
  { id: 'pastel-blue', name: 'Pastel Sky', hex: '#B4D2E4', category: 'fantasy' },
  { id: 'neon-violet', name: 'Neon Purple', hex: '#AA55B4', category: 'fantasy' },
  { id: 'cotton-candy', name: 'Cotton Candy Pink', hex: '#EA5492', category: 'fantasy' },
  { id: 'coral-blush', name: 'Coral Blush', hex: '#DA867A', category: 'fantasy' },
  { id: 'lavender-mist', name: 'Lavender Mist', hex: '#C4B5FD', category: 'fantasy' },
];
