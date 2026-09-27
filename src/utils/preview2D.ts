import { SHIRT_COORDS } from './shirtTexture';
import { PANTS_COORDS } from './pantsTexture';

/**
 * Generates an accurate 2D front view rendering of a Roblox classic shirt (Torso + Left Arm + Right Arm).
 */
export function generateShirt2DFrontPreview(shirtDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Transparent / subtle dark card background
      ctx.clearRect(0, 0, 128, 128);

      // Default neutral mannequin skin fill under any transparent shirt areas
      ctx.fillStyle = '#8A929E';
      ctx.fillRect(0, 16, 32, 64);   // Right arm (viewer left)
      ctx.fillRect(32, 16, 64, 64);  // Torso
      ctx.fillRect(96, 16, 32, 64);  // Left arm (viewer right)

      // 1. Right Arm Front (viewer's left side)
      const rArm = SHIRT_COORDS.rightArm.front;
      ctx.drawImage(img, rArm.x, rArm.y, rArm.w, rArm.h, 0, 16, 32, 64);

      // 2. Torso Front (middle)
      const torso = SHIRT_COORDS.torso.front;
      ctx.drawImage(img, torso.x, torso.y, torso.w, torso.h, 32, 16, 64, 64);

      // 3. Left Arm Front (viewer's right side)
      const lArm = SHIRT_COORDS.leftArm.front;
      ctx.drawImage(img, lArm.x, lArm.y, lArm.w, lArm.h, 96, 16, 32, 64);

      // Add subtle seam separation lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(32, 16, 64, 64);
      ctx.strokeRect(0, 16, 32, 64);
      ctx.strokeRect(96, 16, 32, 64);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve('');
    };
    img.src = shirtDataUrl;
  });
}

/**
 * Generates an accurate 2D front view rendering of Roblox classic pants (Pelvis waistband + Left & Right Legs).
 */
export function generatePants2DFrontPreview(pantsDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, 128, 128);

      // Default neutral mannequin skin fill under any transparent pants areas
      ctx.fillStyle = '#8A929E';
      ctx.fillRect(32, 12, 64, 20);  // Pelvis waistband
      ctx.fillRect(32, 32, 32, 64);  // Right leg
      ctx.fillRect(64, 32, 32, 64);  // Left leg

      // 1. Pelvis Front (Waistband / Belt / Fly)
      // Check if template has content at y: 204 or in torso front lower half
      ctx.drawImage(img, 231, 154, 128, 48, 32, 12, 64, 20);

      // 2. Right Leg Front (viewer left)
      const rLeg = PANTS_COORDS.rightLeg.front;
      ctx.drawImage(img, rLeg.x, rLeg.y, rLeg.w, rLeg.h, 32, 32, 32, 64);

      // 3. Left Leg Front (viewer right)
      const lLeg = PANTS_COORDS.leftLeg.front;
      ctx.drawImage(img, lLeg.x, lLeg.y, lLeg.w, lLeg.h, 64, 32, 32, 64);

      // Add subtle seam separation lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(32, 12, 64, 20);
      ctx.strokeRect(32, 32, 32, 64);
      ctx.strokeRect(64, 32, 32, 64);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve('');
    };
    img.src = pantsDataUrl;
  });
}
