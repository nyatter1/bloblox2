import { TEMPLATE_WIDTH, TEMPLATE_HEIGHT, SHIRT_COORDS } from './shirtTexture';
import { PANTS_COORDS } from './pantsTexture';
import { generateShirt2DFrontPreview, generatePants2DFrontPreview } from './preview2D';
import { MarketplaceClothingItem } from '../types/marketplace';

/**
 * Creates a procedural 585x559 Roblox shirt template data URL
 */
function createProceduralShirtTemplate(
  baseColor: string,
  accentColor: string,
  style: 'tuxedo' | 'flame_hoodie' | 'striped' | 'cyber_jacket'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

  // Fill clothing zones
  const fillRect = (r: { x: number; y: number; w: number; h: number }, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  };

  // Base fill
  const shirtRegions = [
    SHIRT_COORDS.torso.top,
    SHIRT_COORDS.torso.front,
    SHIRT_COORDS.torso.back,
    SHIRT_COORDS.torso.leftSide,
    SHIRT_COORDS.torso.rightSide,
    SHIRT_COORDS.torso.bottom,
    SHIRT_COORDS.rightArm.top,
    SHIRT_COORDS.rightArm.front,
    SHIRT_COORDS.rightArm.back,
    SHIRT_COORDS.rightArm.outer,
    SHIRT_COORDS.rightArm.inner,
    SHIRT_COORDS.rightArm.bottom,
    SHIRT_COORDS.leftArm.top,
    SHIRT_COORDS.leftArm.front,
    SHIRT_COORDS.leftArm.back,
    SHIRT_COORDS.leftArm.outer,
    SHIRT_COORDS.leftArm.inner,
    SHIRT_COORDS.leftArm.bottom,
  ];

  shirtRegions.forEach((r) => fillRect(r, baseColor));

  const tf = SHIRT_COORDS.torso.front;

  if (style === 'tuxedo') {
    // White shirt V-neck
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tf.x + 32, tf.y);
    ctx.lineTo(tf.x + 96, tf.y);
    ctx.lineTo(tf.x + 64, tf.y + 70);
    ctx.closePath();
    ctx.fill();

    // Cyan Tie
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(tf.x + 58, tf.y + 12);
    ctx.lineTo(tf.x + 70, tf.y + 12);
    ctx.lineTo(tf.x + 74, tf.y + 75);
    ctx.lineTo(tf.x + 64, tf.y + 90);
    ctx.lineTo(tf.x + 54, tf.y + 75);
    ctx.closePath();
    ctx.fill();

    // Lapels
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tf.x + 30, tf.y);
    ctx.lineTo(tf.x + 52, tf.y + 70);
    ctx.lineTo(tf.x + 64, tf.y + 115);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tf.x + 98, tf.y);
    ctx.lineTo(tf.x + 76, tf.y + 70);
    ctx.lineTo(tf.x + 64, tf.y + 115);
    ctx.stroke();

    // Pocket square
    ctx.fillStyle = accentColor;
    ctx.fillRect(tf.x + 82, tf.y + 35, 18, 5);

    // Cuffs on arms
    fillRect({ x: SHIRT_COORDS.leftArm.front.x, y: SHIRT_COORDS.leftArm.front.y + 108, w: 64, h: 20 }, '#ffffff');
    fillRect({ x: SHIRT_COORDS.rightArm.front.x, y: SHIRT_COORDS.rightArm.front.y + 108, w: 64, h: 20 }, '#ffffff');
  } else if (style === 'flame_hoodie') {
    // Hoodie pocket
    ctx.fillStyle = '#1e1438';
    ctx.fillRect(tf.x + 20, tf.y + 76, 88, 38);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(tf.x + 20, tf.y + 76, 88, 38);

    // Flame graphic in center
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(tf.x + 64, tf.y + 20);
    ctx.quadraticCurveTo(tf.x + 85, tf.y + 40, tf.x + 76, tf.y + 65);
    ctx.quadraticCurveTo(tf.x + 68, tf.y + 50, tf.x + 64, tf.y + 65);
    ctx.quadraticCurveTo(tf.x + 60, tf.y + 50, tf.x + 52, tf.y + 65);
    ctx.quadraticCurveTo(tf.x + 43, tf.y + 40, tf.x + 64, tf.y + 20);
    ctx.closePath();
    ctx.fill();

    // Drawstrings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tf.x + 54, tf.y + 6);
    ctx.lineTo(tf.x + 54, tf.y + 40);
    ctx.moveTo(tf.x + 74, tf.y + 6);
    ctx.lineTo(tf.x + 74, tf.y + 40);
    ctx.stroke();
  } else if (style === 'striped') {
    // Horizontal stripes
    ctx.fillStyle = accentColor;
    for (let y = tf.y + 16; y < tf.y + 128; y += 24) {
      ctx.fillRect(tf.x, y, 128, 12);
      ctx.fillRect(SHIRT_COORDS.torso.back.x, y, 128, 12);
      ctx.fillRect(SHIRT_COORDS.torso.leftSide.x, y, 64, 12);
      ctx.fillRect(SHIRT_COORDS.torso.rightSide.x, y, 64, 12);
    }
    // Arm stripes
    for (let y = SHIRT_COORDS.leftArm.front.y + 16; y < SHIRT_COORDS.leftArm.front.y + 128; y += 24) {
      ctx.fillRect(SHIRT_COORDS.leftArm.front.x, y, 64, 12);
      ctx.fillRect(SHIRT_COORDS.leftArm.outer.x, y, 64, 12);
      ctx.fillRect(SHIRT_COORDS.rightArm.front.x, y, 64, 12);
      ctx.fillRect(SHIRT_COORDS.rightArm.outer.x, y, 64, 12);
    }
  } else if (style === 'cyber_jacket') {
    // Techwear collar and zipper
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tf.x + 44, tf.y, 40, 128);

    // Neon circuit lines
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tf.x + 64, tf.y);
    ctx.lineTo(tf.x + 64, tf.y + 128);
    // Angular branches
    ctx.moveTo(tf.x + 64, tf.y + 35);
    ctx.lineTo(tf.x + 95, tf.y + 48);
    ctx.lineTo(tf.x + 95, tf.y + 90);
    ctx.moveTo(tf.x + 64, tf.y + 60);
    ctx.lineTo(tf.x + 33, tf.y + 75);
    ctx.lineTo(tf.x + 33, tf.y + 105);
    ctx.stroke();

    // Arm cyber badges
    fillRect({ x: SHIRT_COORDS.leftArm.outer.x + 12, y: SHIRT_COORDS.leftArm.outer.y + 40, w: 40, h: 20 }, accentColor);
    fillRect({ x: SHIRT_COORDS.rightArm.outer.x + 12, y: SHIRT_COORDS.rightArm.outer.y + 40, w: 40, h: 20 }, accentColor);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Creates a procedural 585x559 Roblox pants template data URL
 */
function createProceduralPantsTemplate(
  baseColor: string,
  accentColor: string,
  style: 'cargo' | 'slacks' | 'galaxy' | 'denim'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

  const fillRect = (r: { x: number; y: number; w: number; h: number }, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  };

  const PELVIS_COORDS = {
    front: { x: 231, y: 74, w: 128, h: 128 },
    back: { x: 427, y: 74, w: 128, h: 128 },
    leftSide: { x: 361, y: 74, w: 64, h: 128 },
    rightSide: { x: 165, y: 74, w: 64, h: 128 },
    bottom: { x: 231, y: 204, w: 128, h: 64 },
  };

  const pantsRegions = [
    PELVIS_COORDS.front,
    PELVIS_COORDS.back,
    PELVIS_COORDS.leftSide,
    PELVIS_COORDS.rightSide,
    PELVIS_COORDS.bottom,
    PANTS_COORDS.rightLeg.top,
    PANTS_COORDS.rightLeg.front,
    PANTS_COORDS.rightLeg.back,
    PANTS_COORDS.rightLeg.outer,
    PANTS_COORDS.rightLeg.inner,
    PANTS_COORDS.rightLeg.bottom,
    PANTS_COORDS.leftLeg.top,
    PANTS_COORDS.leftLeg.front,
    PANTS_COORDS.leftLeg.back,
    PANTS_COORDS.leftLeg.outer,
    PANTS_COORDS.leftLeg.inner,
    PANTS_COORDS.leftLeg.bottom,
  ];

  pantsRegions.forEach((r) => fillRect(r, baseColor));

  const pf = PELVIS_COORDS.front;
  const lf = PANTS_COORDS.leftLeg.front;
  const rf = PANTS_COORDS.rightLeg.front;

  if (style === 'cargo') {
    // Tactical belt
    fillRect({ x: pf.x, y: pf.y + 4, w: pf.w, h: 14 }, '#09090b');
    // Silver buckle
    fillRect({ x: pf.x + 54, y: pf.y + 2, w: 20, h: 18 }, '#a1a1aa');
    fillRect({ x: pf.x + 58, y: pf.y + 6, w: 12, h: 10 }, '#09090b');

    // Cargo pockets on outer thighs
    fillRect({ x: PANTS_COORDS.leftLeg.outer.x + 10, y: PANTS_COORDS.leftLeg.outer.y + 35, w: 44, h: 44 }, '#27272a');
    fillRect({ x: PANTS_COORDS.rightLeg.outer.x + 10, y: PANTS_COORDS.rightLeg.outer.y + 35, w: 44, h: 44 }, '#27272a');
    // Pocket flap
    fillRect({ x: PANTS_COORDS.leftLeg.outer.x + 8, y: PANTS_COORDS.leftLeg.outer.y + 30, w: 48, h: 10 }, accentColor);
    fillRect({ x: PANTS_COORDS.rightLeg.outer.x + 8, y: PANTS_COORDS.rightLeg.outer.y + 30, w: 48, h: 10 }, accentColor);
  } else if (style === 'slacks') {
    // Leather belt
    fillRect({ x: pf.x, y: pf.y + 4, w: pf.w, h: 14 }, '#582f0e');
    // Brass buckle
    fillRect({ x: pf.x + 54, y: pf.y + 2, w: 20, h: 18 }, '#eab308');

    // Crease lines down front of legs
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lf.x + 32, lf.y);
    ctx.lineTo(lf.x + 32, lf.y + 128);
    ctx.moveTo(rf.x + 32, rf.y);
    ctx.lineTo(rf.x + 32, rf.y + 128);
    ctx.stroke();

    // Dark shoes at bottom
    fillRect({ x: lf.x, y: lf.y + 104, w: lf.w, h: 24 }, '#1c1917');
    fillRect({ x: rf.x, y: rf.y + 104, w: rf.w, h: 24 }, '#1c1917');
  } else if (style === 'galaxy') {
    // Purple galaxy star speckles
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const rx = lf.x + Math.random() * lf.w;
      const ry = lf.y + Math.random() * lf.h;
      ctx.fillRect(rx, ry, 2, 2);
    }
    for (let i = 0; i < 40; i++) {
      const rx = rf.x + Math.random() * rf.w;
      const ry = rf.y + Math.random() * rf.h;
      ctx.fillRect(rx, ry, 2, 2);
    }
    // Neon purple belt
    fillRect({ x: pf.x, y: pf.y + 4, w: pf.w, h: 14 }, accentColor);
  } else if (style === 'denim') {
    // Denim waistband & pocket stitching
    fillRect({ x: pf.x, y: pf.y + 4, w: pf.w, h: 14 }, '#1e3a8a');
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pf.x + 1, pf.y + 4, pf.w - 2, 14);

    // Front pockets
    ctx.beginPath();
    ctx.arc(pf.x + 20, pf.y + 18, 16, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pf.x + pf.w - 20, pf.y + 18, 16, Math.PI / 2, Math.PI);
    ctx.stroke();

    // Distressed knee lines
    ctx.fillStyle = '#93c5fd';
    fillRect({ x: lf.x + 16, y: lf.y + 60, w: 32, h: 3 }, '#93c5fd');
    fillRect({ x: rf.x + 16, y: rf.y + 60, w: 32, h: 3 }, '#93c5fd');
  }

  return canvas.toDataURL('image/png');
}

/**
 * Initializes community marketplace items with authentic 2D previews
 */
export async function getSeedMarketplaceItems(): Promise<MarketplaceClothingItem[]> {
  const shirt1Url = createProceduralShirtTemplate('#18181b', '#06b6d4', 'tuxedo');
  const shirt2Url = createProceduralShirtTemplate('#2e1065', '#a855f7', 'flame_hoodie');
  const shirt3Url = createProceduralShirtTemplate('#7f1d1d', '#18181b', 'striped');
  const shirt4Url = createProceduralShirtTemplate('#0f172a', '#22d3ee', 'cyber_jacket');

  const pants1Url = createProceduralPantsTemplate('#18181b', '#a855f7', 'cargo');
  const pants2Url = createProceduralPantsTemplate('#d6d3d1', '#78350f', 'slacks');
  const pants3Url = createProceduralPantsTemplate('#1e1b4b', '#c084fc', 'galaxy');
  const pants4Url = createProceduralPantsTemplate('#1d4ed8', '#f59e0b', 'denim');

  const [s1Prev, s2Prev, s3Prev, s4Prev, p1Prev, p2Prev, p3Prev, p4Prev] = await Promise.all([
    generateShirt2DFrontPreview(shirt1Url),
    generateShirt2DFrontPreview(shirt2Url),
    generateShirt2DFrontPreview(shirt3Url),
    generateShirt2DFrontPreview(shirt4Url),
    generatePants2DFrontPreview(pants1Url),
    generatePants2DFrontPreview(pants2Url),
    generatePants2DFrontPreview(pants3Url),
    generatePants2DFrontPreview(pants4Url),
  ]);

  return [
    {
      id: 'market-shirt-1',
      name: 'BoBlox Classic Cyan Tuxedo',
      type: 'shirt',
      dataUrl: shirt1Url,
      previewUrl: s1Prev,
      creatorId: 'user-boblox-owner',
      creatorUsername: 'BoBlox',
      price: 0,
      boughtCount: 542,
      onSale: true,
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'market-shirt-2',
      name: 'Bloxian Purple Flame Hoodie',
      type: 'shirt',
      dataUrl: shirt2Url,
      previewUrl: s2Prev,
      creatorId: 'user-boblox-owner',
      creatorUsername: 'BoBlox',
      price: 0,
      boughtCount: 689,
      onSale: true,
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'market-pants-1',
      name: 'Midnight Black Cargo Pants',
      type: 'pants',
      dataUrl: pants1Url,
      previewUrl: p1Prev,
      creatorId: 'user-boblox-owner',
      creatorUsername: 'BoBlox',
      price: 0,
      boughtCount: 418,
      onSale: true,
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'market-pants-3',
      name: 'Galaxy Cosmic Star Pants',
      type: 'pants',
      dataUrl: pants3Url,
      previewUrl: p3Prev,
      creatorId: 'user-boblox-owner',
      creatorUsername: 'BoBlox',
      price: 0,
      boughtCount: 520,
      onSale: true,
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'market-shirt-3',
      name: 'Retro Crimson Striped Shirt',
      type: 'shirt',
      dataUrl: shirt3Url,
      previewUrl: s3Prev,
      creatorId: 'creator-retro-1',
      creatorUsername: 'NovaBuilder',
      price: 0,
      boughtCount: 231,
      onSale: true,
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'market-shirt-4',
      name: 'Cyber Neon Techwear Jacket',
      type: 'shirt',
      dataUrl: shirt4Url,
      previewUrl: s4Prev,
      creatorId: 'creator-cyber-2',
      creatorUsername: 'PixelMaster',
      price: 0,
      boughtCount: 375,
      onSale: true,
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'market-pants-2',
      name: 'Classic Creased Khaki Slacks',
      type: 'pants',
      dataUrl: pants2Url,
      previewUrl: p2Prev,
      creatorId: 'creator-tailor-3',
      creatorUsername: 'StyleCrafter',
      price: 0,
      boughtCount: 194,
      onSale: true,
      createdAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'market-pants-4',
      name: 'Distressed Vintage Denim Jeans',
      type: 'pants',
      dataUrl: pants4Url,
      previewUrl: p4Prev,
      creatorId: 'creator-denim-4',
      creatorUsername: 'StreetVibes',
      price: 0,
      boughtCount: 312,
      onSale: true,
      createdAt: Date.now() - 86400000 * 1,
    },
  ];
}
