import React, { useEffect, useRef, useState } from 'react';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { getFacePreviewUrl } from '../utils/faceTexture';
import { SHIRT_COORDS } from '../utils/shirtTexture';
import { PANTS_COORDS } from '../utils/pantsTexture';

interface AvatarProfileIconProps {
  colors?: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  shape?: 'circle' | 'rounded';
  border?: boolean;
  fullBody?: boolean;
  framing?: 'head' | 'bust' | 'face-and-lower-body' | 'fullBody';
}

// Preloaded images cache for snappy 0ms re-renders
const imageCache: Map<string, HTMLImageElement> = new Map();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function AvatarProfileIcon({
  colors = {
    head: DEFAULT_GREY,
    torso: DEFAULT_GREY,
    leftArm: DEFAULT_GREY,
    rightArm: DEFAULT_GREY,
    leftLeg: DEFAULT_GREY,
    rightLeg: DEFAULT_GREY,
  },
  selectedFaceId = 'classic-smile',
  shirtDataUrl = null,
  pantsDataUrl = null,
  selectedHairId = 'none',
  hairColor = '#4a2e1b',
  size = 'md',
  className = '',
  shape = 'circle',
  border = true,
  fullBody = false,
  framing = 'bust',
}: AvatarProfileIconProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 24
      : size === 'sm'
      ? 32
      : size === 'md'
      ? 44
      : size === 'lg'
      ? 64
      : size === 'xl'
      ? 80
      : size === '2xl'
      ? 120
      : 100;

  useEffect(() => {
    let isCancelled = false;

    async function drawAvatar() {
      const canvas = canvasRef.current || document.createElement('canvas');
      const RENDER_RES = 256;
      canvas.width = RENDER_RES;
      canvas.height = RENDER_RES;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.clearRect(0, 0, RENDER_RES, RENDER_RES);

      const isFull = fullBody || framing === 'fullBody';
      const isHeadOnly = framing === 'head';

      // Load face, shirt, pants images in parallel
      const faceUrl = getFacePreviewUrl(selectedFaceId || 'classic-smile');
      const [faceImg, shirtImg, pantsImg] = await Promise.all([
        loadImage(faceUrl),
        shirtDataUrl ? loadImage(shirtDataUrl) : Promise.resolve(null),
        pantsDataUrl ? loadImage(pantsDataUrl) : Promise.resolve(null),
      ]);

      if (isCancelled) return;

      ctx.save();

      if (isHeadOnly) {
        // --- 1. HEAD ONLY FRAMING ---
        const hx = 64;
        const hy = 40;
        const hw = 128;
        const hh = 150;

        // Head shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(128, 205, 55, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head Base
        ctx.fillStyle = colors.head || DEFAULT_GREY;
        ctx.beginPath();
        ctx.roundRect(hx, hy + 20, hw, hh - 35, 18);
        ctx.fill();

        // Top spherical cap
        ctx.beginPath();
        ctx.ellipse(hx + hw / 2, hy + 20, hw / 2, 28, 0, Math.PI, 0);
        ctx.fill();

        // Bottom spherical cap
        ctx.beginPath();
        ctx.ellipse(hx + hw / 2, hy + hh - 15, hw / 2, 20, 0, 0, Math.PI);
        ctx.fill();

        // Face Decal
        if (faceImg) {
          ctx.drawImage(faceImg, hx + 12, hy + 24, hw - 24, hw - 24);
        }

        // Hair Overlay
        if (selectedHairId && selectedHairId !== 'none') {
          drawHair2D(ctx, selectedHairId, hairColor, hx + hw / 2, hy + 20, 1.3);
        }
      } else if (isFull) {
        // --- 2. FULL BODY FRAMING ---
        // Torso
        const tx = 92;
        const ty = 85;
        const tw = 72;
        const th = 72;

        // Limbs
        const armW = 34;
        const armH = 72;
        const legW = 34;
        const legH = 76;

        // Left Leg
        ctx.fillStyle = colors.leftLeg || DEFAULT_GREY;
        ctx.fillRect(tx + tw / 2, ty + th, legW, legH);
        if (pantsImg) {
          const lLeg = PANTS_COORDS.leftLeg.front;
          ctx.drawImage(pantsImg, lLeg.x, lLeg.y, lLeg.w, lLeg.h, tx + tw / 2, ty + th, legW, legH);
        }

        // Right Leg
        ctx.fillStyle = colors.rightLeg || DEFAULT_GREY;
        ctx.fillRect(tx + 2, ty + th, legW, legH);
        if (pantsImg) {
          const rLeg = PANTS_COORDS.rightLeg.front;
          ctx.drawImage(pantsImg, rLeg.x, rLeg.y, rLeg.w, rLeg.h, tx + 2, ty + th, legW, legH);
        }

        // Leg divider
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx + tw / 2, ty + th);
        ctx.lineTo(tx + tw / 2, ty + th + legH);
        ctx.stroke();

        // Torso
        ctx.fillStyle = colors.torso || DEFAULT_GREY;
        ctx.fillRect(tx, ty, tw, th);
        if (shirtImg) {
          const torso = SHIRT_COORDS.torso.front;
          ctx.drawImage(shirtImg, torso.x, torso.y, torso.w, torso.h, tx, ty, tw, th);
        }

        // Left Arm
        ctx.fillStyle = colors.leftArm || DEFAULT_GREY;
        ctx.fillRect(tx + tw + 3, ty, armW, armH);
        if (shirtImg) {
          const lArm = SHIRT_COORDS.leftArm.front;
          ctx.drawImage(shirtImg, lArm.x, lArm.y, lArm.w, lArm.h, tx + tw + 3, ty, armW, armH);
        }

        // Right Arm
        ctx.fillStyle = colors.rightArm || DEFAULT_GREY;
        ctx.fillRect(tx - armW - 3, ty, armW, armH);
        if (shirtImg) {
          const rArm = SHIRT_COORDS.rightArm.front;
          ctx.drawImage(shirtImg, rArm.x, rArm.y, rArm.w, rArm.h, tx - armW - 3, ty, armW, armH);
        }

        // Head
        const hx = 100;
        const hy = 24;
        const hw = 56;
        const hh = 62;

        ctx.fillStyle = colors.head || DEFAULT_GREY;
        ctx.beginPath();
        ctx.roundRect(hx, hy + 8, hw, hh - 16, 8);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(hx + hw / 2, hy + 8, hw / 2, 12, 0, Math.PI, 0);
        ctx.fill();

        // Face
        if (faceImg) {
          ctx.drawImage(faceImg, hx + 4, hy + 10, hw - 8, hw - 8);
        }

        // Hair
        if (selectedHairId && selectedHairId !== 'none') {
          drawHair2D(ctx, selectedHairId, hairColor, hx + hw / 2, hy + 8, 0.65);
        }
      } else {
        // --- 3. BUST FRAMING (Roblox Standard Avatar Portrait) ---
        // Torso
        const tx = 76;
        const ty = 126;
        const tw = 104;
        const th = 110;

        // Arms
        const armW = 48;
        const armH = 110;

        // Right Arm
        ctx.fillStyle = colors.rightArm || DEFAULT_GREY;
        ctx.fillRect(tx - armW - 4, ty, armW, armH);
        if (shirtImg) {
          const rArm = SHIRT_COORDS.rightArm.front;
          ctx.drawImage(shirtImg, rArm.x, rArm.y, rArm.w, rArm.h, tx - armW - 4, ty, armW, armH);
        }

        // Left Arm
        ctx.fillStyle = colors.leftArm || DEFAULT_GREY;
        ctx.fillRect(tx + tw + 4, ty, armW, armH);
        if (shirtImg) {
          const lArm = SHIRT_COORDS.leftArm.front;
          ctx.drawImage(shirtImg, lArm.x, lArm.y, lArm.w, lArm.h, tx + tw + 4, ty, armW, armH);
        }

        // Torso
        ctx.fillStyle = colors.torso || DEFAULT_GREY;
        ctx.fillRect(tx, ty, tw, th);
        if (shirtImg) {
          const torso = SHIRT_COORDS.torso.front;
          ctx.drawImage(shirtImg, torso.x, torso.y, torso.w, torso.h, tx, ty, tw, th);
        }

        // Subtle arm separation lines
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx, ty, tw, th);
        ctx.strokeRect(tx - armW - 4, ty, armW, armH);
        ctx.strokeRect(tx + tw + 4, ty, armW, armH);

        // Head
        const hx = 84;
        const hy = 32;
        const hw = 88;
        const hh = 100;

        ctx.fillStyle = colors.head || DEFAULT_GREY;
        ctx.beginPath();
        ctx.roundRect(hx, hy + 14, hw, hh - 28, 14);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(hx + hw / 2, hy + 14, hw / 2, 20, 0, Math.PI, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(hx + hw / 2, hy + hh - 14, hw / 2, 14, 0, 0, Math.PI);
        ctx.fill();

        // Face
        if (faceImg) {
          ctx.drawImage(faceImg, hx + 8, hy + 16, hw - 16, hw - 16);
        }

        // Hair
        if (selectedHairId && selectedHairId !== 'none') {
          drawHair2D(ctx, selectedHairId, hairColor, hx + hw / 2, hy + 14, 0.95);
        }
      }

      ctx.restore();

      if (!isCancelled) {
        setDataUrl(canvas.toDataURL('image/png'));
      }
    }

    drawAvatar();

    return () => {
      isCancelled = true;
    };
  }, [colors, selectedFaceId, shirtDataUrl, pantsDataUrl, selectedHairId, hairColor, fullBody, framing]);

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={`relative shrink-0 overflow-hidden bg-gradient-to-b from-[#2e1f52] to-[#120b22] select-none flex items-center justify-center ${
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
      } ${
        border ? 'border border-purple-400/40 shadow-md shadow-purple-950/60' : ''
      } ${className}`}
      title="Avatar Portrait"
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Avatar"
          className="w-full h-full object-contain pointer-events-none"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Procedural 2D hair drawing matching Roblox classic hair models
 */
function drawHair2D(
  ctx: CanvasRenderingContext2D,
  hairId: string,
  hairColor: string,
  centerX: number,
  topY: number,
  scale: number
) {
  ctx.save();
  ctx.translate(centerX, topY);
  ctx.scale(scale, scale);
  ctx.fillStyle = hairColor || '#4a2e1b';
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;

  if (hairId.includes('bacon') || hairId === 'bacon-hair') {
    // Pal Hair / Bacon Hair: Top volume + side wavy strands
    ctx.beginPath();
    ctx.ellipse(0, -6, 52, 28, 0, Math.PI, 0);
    ctx.fill();
    // Side bangs
    ctx.beginPath();
    ctx.roundRect(-52, -6, 22, 54, 8);
    ctx.roundRect(30, -6, 22, 54, 8);
    ctx.fill();
    // Front fringe
    ctx.beginPath();
    ctx.moveTo(-45, -6);
    ctx.quadraticCurveTo(0, 16, 45, -6);
    ctx.quadraticCurveTo(20, -14, -45, -6);
    ctx.fill();
  } else if (hairId.includes('horns') || hairId.includes('messy')) {
    // Messy hair with horns
    ctx.beginPath();
    ctx.ellipse(0, -8, 54, 32, 0, Math.PI, 0);
    ctx.fill();
    // Spikes
    for (let i = -40; i <= 40; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i - 10, -12);
      ctx.lineTo(i, -36);
      ctx.lineTo(i + 10, -12);
      ctx.fill();
    }
    // Horns
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(-34, -20);
    ctx.quadraticCurveTo(-54, -46, -42, -56);
    ctx.quadraticCurveTo(-38, -42, -26, -24);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(34, -20);
    ctx.quadraticCurveTo(54, -46, 42, -56);
    ctx.quadraticCurveTo(38, -42, 26, -24);
    ctx.fill();
  } else if (hairId.includes('blue') || hairId.includes('shaggy')) {
    // Shaggy blue hair
    ctx.beginPath();
    ctx.ellipse(0, -6, 54, 30, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-54, -4, 24, 60, 10);
    ctx.roundRect(30, -4, 24, 60, 10);
    ctx.fill();
  } else {
    // Generic classic Roblox hair dome & fringe
    ctx.beginPath();
    ctx.ellipse(0, -6, 50, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-50, -4, 18, 42, 8);
    ctx.roundRect(32, -4, 18, 42, 8);
    ctx.fill();
  }

  ctx.restore();
}
