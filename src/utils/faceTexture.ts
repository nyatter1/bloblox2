import * as THREE from 'three';

export interface RobloxFace {
  id: string;
  name: string;
  url: string;
  previewUrl: string;
}

export const ROBLOX_FACES: RobloxFace[] = [
  {
    id: 'classic-smile',
    name: 'Classic Smile',
    url: '',
    previewUrl: '',
  },
  {
    id: 'man-face',
    name: 'Man Face',
    url: '',
    previewUrl: '',
  },
  {
    id: 'winning-smile',
    name: 'Winning Smile',
    url: '',
    previewUrl: '',
  },
  {
    id: 'chill-face',
    name: 'Chill Face',
    url: '',
    previewUrl: '',
  },
  {
    id: 'know-it-all-grin',
    name: 'Know-It-All Grin',
    url: '',
    previewUrl: '',
  },
  {
    id: 'shiny-face',
    name: 'Shiny Face',
    url: '',
    previewUrl: '',
  },
  {
    id: 'check-it',
    name: 'Check It',
    url: '',
    previewUrl: '',
  },
  {
    id: 'super-happy-face',
    name: 'Super Super Happy Face',
    url: '',
    previewUrl: '',
  },
  {
    id: 'woman-face',
    name: 'Woman Face',
    url: '',
    previewUrl: '',
  },
  {
    id: 'tongue-out',
    name: 'Silly Fun',
    url: '',
    previewUrl: '',
  },
  {
    id: 'err-face',
    name: 'Err...',
    url: '',
    previewUrl: '',
  },
  {
    id: '8-bit-heart',
    name: '8-Bit Heart Face',
    url: '',
    previewUrl: '',
  },
  {
    id: 'absolutely-shocked',
    name: 'Absolutely Shocked',
    url: '',
    previewUrl: '',
  },
  {
    id: 'aghast',
    name: 'Aghast',
    url: '',
    previewUrl: '',
  },
  {
    id: 'angelic',
    name: 'Angelic',
    url: '',
    previewUrl: '',
  },
  {
    id: 'anime-surprise',
    name: 'Anime Surprise',
    url: '',
    previewUrl: '',
  },
  {
    id: 'awkward-grin',
    name: 'Awkward Grin',
    url: '',
    previewUrl: '',
  },
];

const faceCanvasDataUrls: { [key: string]: string } = {};
const textureCache: { [key: string]: THREE.CanvasTexture } = {};

function getFreshCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  return { canvas, ctx };
}

function finalizeTexture(id: string, canvas: HTMLCanvasElement): THREE.CanvasTexture {
  try {
    faceCanvasDataUrls[id] = canvas.toDataURL('image/png');
  } catch {
    // ignore
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache[id] = texture;
  return texture;
}

/**
 * 1. Classic Roblox Smile
 */
export function createRobloxSmileTexture(): THREE.CanvasTexture {
  if (textureCache['classic-smile']) return textureCache['classic-smile'];
  const { canvas, ctx } = getFreshCanvas();

  // Left Eye
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(164, 190, 24, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.ellipse(348, 190, 24, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bold Smile
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 230, 104, Math.PI * 0.15, Math.PI * 0.85, false);
  ctx.stroke();

  // Smile Corner Ticks
  ctx.beginPath();
  ctx.moveTo(152, 284);
  ctx.lineTo(140, 268);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(360, 284);
  ctx.lineTo(372, 268);
  ctx.stroke();

  return finalizeTexture('classic-smile', canvas);
}

/**
 * 2. Legendary Roblox Man Face
 */
export function createManFaceTexture(): THREE.CanvasTexture {
  if (textureCache['man-face']) return textureCache['man-face'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#111111';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left Eyebrow (strong confident arch)
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(125, 155);
  ctx.quadraticCurveTo(168, 128, 215, 142);
  ctx.stroke();

  // Right Eyebrow
  ctx.beginPath();
  ctx.moveTo(297, 142);
  ctx.quadraticCurveTo(344, 128, 387, 155);
  ctx.stroke();

  // Left Upper Eyelid & Eye
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(130, 195);
  ctx.quadraticCurveTo(170, 182, 210, 195);
  ctx.stroke();

  // Left Pupil half circle
  ctx.beginPath();
  ctx.arc(170, 195, 18, 0, Math.PI, false);
  ctx.fill();

  // Right Upper Eyelid & Eye
  ctx.beginPath();
  ctx.moveTo(302, 195);
  ctx.quadraticCurveTo(342, 182, 382, 195);
  ctx.stroke();

  // Right Pupil half circle
  ctx.beginPath();
  ctx.arc(342, 195, 18, 0, Math.PI, false);
  ctx.fill();

  // Smug / Chad confident smile
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(155, 290);
  ctx.quadraticCurveTo(256, 335, 360, 275);
  ctx.stroke();

  // Right corner smirk tick
  ctx.beginPath();
  ctx.moveTo(355, 278);
  ctx.lineTo(372, 262);
  ctx.stroke();

  // Chin crease
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 370, 16, Math.PI * 0.2, Math.PI * 0.8, false);
  ctx.stroke();

  return finalizeTexture('man-face', canvas);
}

/**
 * 3. Winning Smile
 */
export function createWinningSmileTexture(): THREE.CanvasTexture {
  if (textureCache['winning-smile']) return textureCache['winning-smile'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#111111';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';

  // Cheerful upward curved eyes
  ctx.beginPath();
  ctx.arc(165, 190, 36, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(347, 190, 36, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Big Winning Open Smile Cavity
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(140, 260);
  ctx.quadraticCurveTo(256, 280, 372, 260);
  ctx.quadraticCurveTo(256, 400, 140, 260);
  ctx.closePath();
  ctx.fill();

  // Upper white teeth strip
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(155, 264);
  ctx.quadraticCurveTo(256, 282, 357, 264);
  ctx.quadraticCurveTo(256, 310, 155, 264);
  ctx.closePath();
  ctx.fill();

  // Cheerful pink tongue in bottom
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(256, 365, 36, Math.PI, 0, false);
  ctx.fill();

  return finalizeTexture('winning-smile', canvas);
}

/**
 * 4. Chill Face
 */
export function createChillFaceTexture(): THREE.CanvasTexture {
  if (textureCache['chill-face']) return textureCache['chill-face'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#111111';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';

  // Left Eye heavy relaxed eyelid curve
  ctx.beginPath();
  ctx.arc(160, 195, 44, Math.PI * 1.1, Math.PI * 1.9, false);
  ctx.stroke();

  // Left Pupil half-circle under eyelid
  ctx.beginPath();
  ctx.arc(160, 192, 18, 0, Math.PI, false);
  ctx.fill();

  // Right Eye heavy relaxed eyelid curve
  ctx.beginPath();
  ctx.arc(352, 195, 44, Math.PI * 1.1, Math.PI * 1.9, false);
  ctx.stroke();

  // Right Pupil half-circle
  ctx.beginPath();
  ctx.arc(352, 192, 18, 0, Math.PI, false);
  ctx.fill();

  // Chill smooth smirk
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(256, 252, 84, Math.PI * 0.18, Math.PI * 0.82, false);
  ctx.stroke();

  // Right smirk tick
  ctx.beginPath();
  ctx.moveTo(336, 300);
  ctx.lineTo(352, 284);
  ctx.stroke();

  return finalizeTexture('chill-face', canvas);
}

/**
 * 5. Know-It-All Grin
 */
export function createKnowItAllGrinTexture(): THREE.CanvasTexture {
  if (textureCache['know-it-all-grin']) return textureCache['know-it-all-grin'];
  const { canvas, ctx } = getFreshCanvas();

  // Left Eyebrow (arched high)
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(160, 144, 44, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Right Eyebrow (cocked smirk)
  ctx.beginPath();
  ctx.arc(352, 152, 36, Math.PI * 1.25, Math.PI * 1.95, false);
  ctx.stroke();

  // Left Eye (squinted mischievous)
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(160, 192, 20, 28, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.ellipse(352, 192, 24, 30, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Broad confident toothy smirk
  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(136, 256);
  ctx.quadraticCurveTo(256, 360, 384, 268);
  ctx.quadraticCurveTo(256, 272, 136, 256);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White teeth strip
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(152, 264);
  ctx.quadraticCurveTo(256, 304, 368, 274);
  ctx.lineTo(360, 284);
  ctx.quadraticCurveTo(256, 316, 160, 276);
  ctx.closePath();
  ctx.fill();

  return finalizeTexture('know-it-all-grin', canvas);
}

/**
 * 6. Shiny Face
 */
export function createShinyFaceTexture(): THREE.CanvasTexture {
  if (textureCache['shiny-face']) return textureCache['shiny-face'];
  const { canvas, ctx } = getFreshCanvas();

  // Big Shiny Left Eye
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(160, 184, 36, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left Eye Glints
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(150, 168, 12, 16, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(172, 204, 7, 0, Math.PI * 2);
  ctx.fill();

  // Big Shiny Right Eye
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(352, 184, 36, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye Glints
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(342, 168, 12, 16, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(364, 204, 7, 0, Math.PI * 2);
  ctx.fill();

  // Cheerful open smile
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(256, 252, 88, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();

  // Tongue/pink interior
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(256, 300, 48, Math.PI, 0, true);
  ctx.fill();

  // Blush on cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
  ctx.beginPath();
  ctx.ellipse(108, 240, 24, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(404, 240, 24, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture('shiny-face', canvas);
}

/**
 * 7. Check It Face
 */
export function createCheckItTexture(): THREE.CanvasTexture {
  if (textureCache['check-it']) return textureCache['check-it'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#111111';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';

  // Left Eye: Bold wink curve
  ctx.beginPath();
  ctx.arc(160, 195, 36, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Right Eye: Open confident oval eye with gleam
  ctx.beginPath();
  ctx.ellipse(352, 190, 26, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(344, 180, 8, 0, Math.PI * 2);
  ctx.fill();

  // Confident Smirk
  ctx.strokeStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(160, 275);
  ctx.quadraticCurveTo(256, 335, 360, 265);
  ctx.stroke();

  // Corner tick
  ctx.beginPath();
  ctx.moveTo(355, 268);
  ctx.lineTo(370, 252);
  ctx.stroke();

  return finalizeTexture('check-it', canvas);
}

/**
 * 8. Super Super Happy Face
 */
export function createSuperHappyFaceTexture(): THREE.CanvasTexture {
  if (textureCache['super-happy-face']) return textureCache['super-happy-face'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';

  // Closed laughing crescent eyes (^ ^)
  ctx.beginPath();
  ctx.arc(160, 200, 42, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(352, 200, 42, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Big Happy Smile Cavity
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(256, 250, 96, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();

  // Soft Pink Tongue
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(256, 305, 52, Math.PI, 0, true);
  ctx.fill();

  // Cute Rosy Blush
  ctx.fillStyle = 'rgba(251, 113, 133, 0.5)';
  ctx.beginPath();
  ctx.ellipse(105, 245, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(407, 245, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture('super-happy-face', canvas);
}

/**
 * 9. Woman Face
 */
export function createWomanFaceTexture(): THREE.CanvasTexture {
  if (textureCache['woman-face']) return textureCache['woman-face'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#111111';
  ctx.lineCap = 'round';

  // Soft Arched Eyebrows
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(160, 155, 40, Math.PI * 1.2, Math.PI * 1.8, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(352, 155, 40, Math.PI * 1.2, Math.PI * 1.8, false);
  ctx.stroke();

  // Left Eye with Winged Lashes
  ctx.beginPath();
  ctx.ellipse(160, 192, 22, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Winged Eyelashes
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(138, 180);
  ctx.lineTo(120, 168);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(144, 172);
  ctx.lineTo(132, 156);
  ctx.stroke();

  // Right Eye with Winged Lashes
  ctx.beginPath();
  ctx.ellipse(352, 192, 22, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(374, 180);
  ctx.lineTo(392, 168);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(368, 172);
  ctx.lineTo(380, 156);
  ctx.stroke();

  // Sweet Smile
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 250, 72, Math.PI * 0.18, Math.PI * 0.82, false);
  ctx.stroke();

  // Subtle Blush
  ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
  ctx.beginPath();
  ctx.ellipse(115, 235, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(397, 235, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture('woman-face', canvas);
}

/**
 * 10. Silly Fun (Tongue Out)
 */
export function createTongueOutTexture(): THREE.CanvasTexture {
  if (textureCache['tongue-out']) return textureCache['tongue-out'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';

  // Eyes
  ctx.beginPath();
  ctx.ellipse(160, 185, 24, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(352, 185, 24, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Open Smile
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 235, 86, Math.PI * 0.1, Math.PI * 0.9, false);
  ctx.stroke();

  // Sticking Out Tongue
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(256, 310, 32, 0, Math.PI, false);
  ctx.lineTo(224, 280);
  ctx.lineTo(288, 280);
  ctx.closePath();
  ctx.fill();

  // Center Tongue crease
  ctx.strokeStyle = '#be123c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 280);
  ctx.lineTo(256, 326);
  ctx.stroke();

  return finalizeTexture('tongue-out', canvas);
}

/**
 * 11. Err... Face
 */
export function createErrFaceTexture(): THREE.CanvasTexture {
  if (textureCache['err-face']) return textureCache['err-face'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';

  // Big nervous left eye
  ctx.beginPath();
  ctx.arc(160, 185, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(160, 185, 14, 0, Math.PI * 2);
  ctx.fill();

  // Small dot right eye
  ctx.beginPath();
  ctx.arc(352, 185, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(352, 185, 8, 0, Math.PI * 2);
  ctx.fill();

  // Wavy squiggly mouth
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(160, 290);
  ctx.quadraticCurveTo(208, 260, 256, 290);
  ctx.quadraticCurveTo(304, 320, 352, 290);
  ctx.stroke();

  return finalizeTexture('err-face', canvas);
}

/**
 * 12. 8-Bit Heart Face
 */
export function create8BitHeartTexture(): THREE.CanvasTexture {
  if (textureCache['8-bit-heart']) return textureCache['8-bit-heart'];
  const { canvas, ctx } = getFreshCanvas();

  const drawPixelHeart = (cx: number, cy: number, p: number) => {
    ctx.fillStyle = '#ef4444';
    // 7x6 pixel heart pattern
    const map = [
      [0, 1, 1, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
    ];
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        if (map[r][c] === 1) {
          ctx.fillRect(cx + (c - 3.5) * p, cy + (r - 3) * p, p, p);
        }
      }
    }
  };

  drawPixelHeart(160, 185, 12);
  drawPixelHeart(352, 185, 12);

  // Pixel Smile
  ctx.fillStyle = '#111111';
  const p = 14;
  ctx.fillRect(160, 290, p * 2, p);
  ctx.fillRect(160 + p * 2, 304, p * 8, p);
  ctx.fillRect(160 + p * 10, 290, p * 2, p);

  return finalizeTexture('8-bit-heart', canvas);
}

/**
 * 13. Absolutely Shocked
 */
export function createAbsolutelyShockedTexture(): THREE.CanvasTexture {
  if (textureCache['absolutely-shocked']) return textureCache['absolutely-shocked'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#111111';
  ctx.lineWidth = 14;

  // Huge round shocked eyes
  ctx.beginPath();
  ctx.arc(160, 175, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(160, 175, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(352, 175, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(352, 175, 12, 0, Math.PI * 2);
  ctx.fill();

  // Big Shocked O-Mouth
  ctx.beginPath();
  ctx.ellipse(256, 310, 36, 52, 0, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture('absolutely-shocked', canvas);
}

/**
 * 14. Aghast
 */
export function createAghastTexture(): THREE.CanvasTexture {
  if (textureCache['aghast']) return textureCache['aghast'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';

  // Small horrified pupils
  ctx.beginPath();
  ctx.arc(165, 185, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(347, 185, 14, 0, Math.PI * 2);
  ctx.fill();

  // Sweat Drop
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(395, 130);
  ctx.quadraticCurveTo(410, 155, 395, 170);
  ctx.quadraticCurveTo(380, 155, 395, 130);
  ctx.fill();

  // Jagged trembling mouth
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(150, 290);
  ctx.lineTo(185, 275);
  ctx.lineTo(220, 305);
  ctx.lineTo(256, 280);
  ctx.lineTo(292, 305);
  ctx.lineTo(328, 275);
  ctx.lineTo(362, 290);
  ctx.stroke();

  return finalizeTexture('aghast', canvas);
}

/**
 * 15. Angelic
 */
export function createAngelicTexture(): THREE.CanvasTexture {
  if (textureCache['angelic']) return textureCache['angelic'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';
  ctx.lineCap = 'round';

  // Serene peaceful eyes
  ctx.beginPath();
  ctx.ellipse(160, 188, 22, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(352, 188, 22, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles in eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(152, 178, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(344, 178, 8, 0, Math.PI * 2);
  ctx.fill();

  // Sweet peaceful smile
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 245, 68, Math.PI * 0.18, Math.PI * 0.82, false);
  ctx.stroke();

  // Cute golden star sparkles
  ctx.fillStyle = '#fbbf24';
  const drawSparkle = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  };
  drawSparkle(105, 160, 12);
  drawSparkle(407, 160, 12);

  return finalizeTexture('angelic', canvas);
}

/**
 * 16. Anime Surprise
 */
export function createAnimeSurpriseTexture(): THREE.CanvasTexture {
  if (textureCache['anime-surprise']) return textureCache['anime-surprise'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';

  // Big dramatic eyes
  ctx.beginPath();
  ctx.ellipse(160, 180, 32, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(352, 180, 32, 44, 0, 0, Math.PI * 2);
  ctx.fill();

  // Big top shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(152, 165, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(344, 165, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gasp open mouth
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(256, 280, 24, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture('anime-surprise', canvas);
}

/**
 * 17. Awkward Grin
 */
export function createAwkwardGrinTexture(): THREE.CanvasTexture {
  if (textureCache['awkward-grin']) return textureCache['awkward-grin'];
  const { canvas, ctx } = getFreshCanvas();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#111111';

  // Nervous Eyes
  ctx.beginPath();
  ctx.ellipse(160, 185, 20, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(352, 185, 20, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sweat Drop on temple
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(395, 135);
  ctx.quadraticCurveTo(410, 160, 395, 175);
  ctx.quadraticCurveTo(380, 160, 395, 135);
  ctx.fill();

  // Horizontal Grid Teeth Grimace
  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(140, 260, 232, 60, 16);
  else ctx.rect(140, 260, 232, 60);
  ctx.fill();
  ctx.stroke();

  // Teeth dividers
  ctx.lineWidth = 6;
  for (let x = 180; x < 370; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 260);
    ctx.lineTo(x, 320);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(140, 290);
  ctx.lineTo(372, 290);
  ctx.stroke();

  return finalizeTexture('awkward-grin', canvas);
}

export function getClassicSmilePreviewUrl(): string {
  if (faceCanvasDataUrls['classic-smile']) return faceCanvasDataUrls['classic-smile'];
  createRobloxSmileTexture();
  return faceCanvasDataUrls['classic-smile'] || '';
}

export function getFacePreviewUrl(faceId: string): string {
  if (faceCanvasDataUrls[faceId]) return faceCanvasDataUrls[faceId];

  switch (faceId) {
    case 'man-face':
      createManFaceTexture();
      break;
    case 'winning-smile':
      createWinningSmileTexture();
      break;
    case 'chill-face':
      createChillFaceTexture();
      break;
    case 'know-it-all-grin':
      createKnowItAllGrinTexture();
      break;
    case 'shiny-face':
      createShinyFaceTexture();
      break;
    case 'check-it':
      createCheckItTexture();
      break;
    case 'super-happy-face':
      createSuperHappyFaceTexture();
      break;
    case 'woman-face':
      createWomanFaceTexture();
      break;
    case 'tongue-out':
      createTongueOutTexture();
      break;
    case 'err-face':
      createErrFaceTexture();
      break;
    case '8-bit-heart':
      create8BitHeartTexture();
      break;
    case 'absolutely-shocked':
      createAbsolutelyShockedTexture();
      break;
    case 'aghast':
      createAghastTexture();
      break;
    case 'angelic':
      createAngelicTexture();
      break;
    case 'anime-surprise':
      createAnimeSurpriseTexture();
      break;
    case 'awkward-grin':
      createAwkwardGrinTexture();
      break;
    case 'classic-smile':
    default:
      createRobloxSmileTexture();
      break;
  }

  return faceCanvasDataUrls[faceId] || getClassicSmilePreviewUrl();
}

/**
 * Returns a Three.js Texture for the specified face ID
 */
export function getFaceTexture(faceId: string): THREE.Texture {
  if (textureCache[faceId]) {
    return textureCache[faceId];
  }

  switch (faceId) {
    case 'man-face':
      return createManFaceTexture();
    case 'winning-smile':
      return createWinningSmileTexture();
    case 'chill-face':
      return createChillFaceTexture();
    case 'know-it-all-grin':
      return createKnowItAllGrinTexture();
    case 'shiny-face':
      return createShinyFaceTexture();
    case 'check-it':
      return createCheckItTexture();
    case 'super-happy-face':
      return createSuperHappyFaceTexture();
    case 'woman-face':
      return createWomanFaceTexture();
    case 'tongue-out':
      return createTongueOutTexture();
    case 'err-face':
      return createErrFaceTexture();
    case '8-bit-heart':
      return create8BitHeartTexture();
    case 'absolutely-shocked':
      return createAbsolutelyShockedTexture();
    case 'aghast':
      return createAghastTexture();
    case 'angelic':
      return createAngelicTexture();
    case 'anime-surprise':
      return createAnimeSurpriseTexture();
    case 'awkward-grin':
      return createAwkwardGrinTexture();
    case 'classic-smile':
    default:
      return createRobloxSmileTexture();
  }
}

/**
 * Creates a curved cylinder decal mesh seamlessly conformed to the head cylinder front.
 */
export function createFaceMesh(faceId: string = 'classic-smile'): THREE.Mesh {
  const thetaLength = Math.PI * 0.54;
  const thetaStart = -thetaLength / 2;
  const faceGeo = new THREE.CylinderGeometry(
    0.628,
    0.628,
    0.95,
    32,
    1,
    true,
    thetaStart,
    thetaLength
  );

  const faceMat = new THREE.MeshBasicMaterial({
    map: getFaceTexture(faceId),
    transparent: true,
    opacity: 0.99,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, 0, 0);
  return faceMesh;
}

/**
 * Updates an existing face mesh material with a new face texture
 */
export function updateFaceMeshTexture(mesh: THREE.Mesh | undefined, faceId: string) {
  if (!mesh) return;
  if (mesh.material && mesh.material instanceof THREE.MeshBasicMaterial) {
    mesh.material.map = getFaceTexture(faceId);
    mesh.material.needsUpdate = true;
  }
}
