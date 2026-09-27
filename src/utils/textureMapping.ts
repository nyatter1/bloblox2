import * as THREE from 'three';
import { TextureMappingMode, TextureProperties } from '../types/experience';

/**
 * Configure Three.js Texture wrap and repeat according to texture properties.
 */
export function applyTextureProperties(
  tex: THREE.Texture,
  props?: TextureProperties
) {
  tex.colorSpace = THREE.SRGBColorSpace;
  const mode: TextureMappingMode = props?.mode || 'stretch';
  const repeatX = Math.max(0.01, props?.repeatX ?? 1);
  const repeatY = Math.max(0.01, props?.repeatY ?? 1);

  if (mode === 'tile') {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.offset.set(0, 0);
  } else if (mode === 'fit') {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(repeatX, repeatY);
    // Center the fitted texture
    tex.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);
  } else {
    // 'stretch' (default)
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  }

  tex.needsUpdate = true;
}

/**
 * Generates built-in procedural textures for quick testing and authentic building.
 */
export function generatePresetTexture(type: 'studs' | 'checker' | 'brick' | 'wood' | 'caution' | 'grid'): string {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (type === 'studs') {
    // Classic Roblox Studs
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, size, size);
    const studSpacing = 64;
    for (let x = studSpacing / 2; x < size; x += studSpacing) {
      for (let y = studSpacing / 2; y < size; y += studSpacing) {
        // Outer dark bevel
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, 16, 0, Math.PI * 2);
        ctx.fill();
        // Inner circle
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        // Top highlight
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === 'checker') {
    // High-contrast check pattern
    const cells = 8;
    const cellSize = size / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#1e1b4b';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  } else if (type === 'brick') {
    // Red Roblox style brick pattern
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    const rowH = 32;
    const colW = 64;
    for (let y = 0; y <= size; y += rowH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      const offset = (Math.floor(y / rowH) % 2) * (colW / 2);
      for (let x = offset; x <= size; x += colW) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }
  } else if (type === 'wood') {
    // Wood grain plank texture
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y + (Math.sin(y * 0.1) * 3));
      ctx.lineTo(size, y + (Math.cos(y * 0.08) * 4));
      ctx.stroke();
    }
    // Planks divider lines
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    for (let y = 0; y <= size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (type === 'caution') {
    // Black and yellow diagonal hazard stripes
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#18181b';
    const stripeW = 32;
    for (let x = -size; x < size * 2; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW - size, size);
      ctx.lineTo(x - size, size);
      ctx.closePath();
      ctx.fill();
    }
  } else if (type === 'grid') {
    // Cyber/Sci-Fi glowing grid
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    const gridSpacing = 32;
    for (let p = 0; p <= size; p += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/png');
}

export const PRESET_TEXTURES = [
  { id: 'studs', name: 'Classic Studs', gen: () => generatePresetTexture('studs') },
  { id: 'brick', name: 'Brick Wall', gen: () => generatePresetTexture('brick') },
  { id: 'checker', name: 'Checkerboard', gen: () => generatePresetTexture('checker') },
  { id: 'wood', name: 'Wood Planks', gen: () => generatePresetTexture('wood') },
  { id: 'caution', name: 'Hazard Stripes', gen: () => generatePresetTexture('caution') },
  { id: 'grid', name: 'Cyber Grid', gen: () => generatePresetTexture('grid') },
] as const;
