import { SHIRT_COORDS, TEMPLATE_WIDTH, TEMPLATE_HEIGHT, ShirtSliceRect } from './shirtTexture';

export type SampleShirtType = 'tuxedo';

/**
 * Generates authentic 585x559 classic Roblox Tuxedo
 * (User requested: keep ONLY the classic tuxedo, remove all other pre-made shirts)
 */
export function generateClassicRobloxShirt(_type: SampleShirtType = 'tuxedo'): string {
  const canvas = document.createElement('canvas');
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

  const fill = (r: ShirtSliceRect, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  };

  const arms = [SHIRT_COORDS.rightArm, SHIRT_COORDS.leftArm];

  // Classic Roblox Tuxedo
  fill(SHIRT_COORDS.torso.top, '#181818');
  fill(SHIRT_COORDS.torso.back, '#1a1a1a');
  fill(SHIRT_COORDS.torso.leftSide, '#1a1a1a');
  fill(SHIRT_COORDS.torso.rightSide, '#1a1a1a');
  fill(SHIRT_COORDS.torso.bottom, '#181818');

  const tf = SHIRT_COORDS.torso.front;
  fill(tf, '#1a1a1a');

  // White shirt triangle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(tf.x + tf.w * 0.25, tf.y);
  ctx.lineTo(tf.x + tf.w * 0.75, tf.y);
  ctx.lineTo(tf.x + tf.w * 0.5, tf.y + tf.h * 0.75);
  ctx.closePath();
  ctx.fill();

  // Red Bowtie
  ctx.fillStyle = '#dc2626';
  const bx = tf.x + tf.w * 0.5;
  const by = tf.y + 24;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - 14, by - 8);
  ctx.lineTo(bx - 14, by + 8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + 14, by - 8);
  ctx.lineTo(bx + 14, by + 8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx, by, 4, 0, Math.PI * 2);
  ctx.fill();

  // Buttons
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(bx, by + 28, 2.5, 0, Math.PI * 2);
  ctx.arc(bx, by + 48, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  arms.forEach((arm) => {
    fill(arm.top, '#181818');
    fill(arm.front, '#1a1a1a');
    fill(arm.back, '#1a1a1a');
    fill(arm.inner, '#1a1a1a');
    fill(arm.outer, '#1a1a1a');
    const cuffH = 16;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(arm.front.x, arm.front.y + arm.front.h - cuffH, arm.front.w, cuffH);
    ctx.fillRect(arm.back.x, arm.back.y + arm.back.h - cuffH, arm.back.w, cuffH);
    ctx.fillRect(arm.inner.x, arm.inner.y + arm.inner.h - cuffH, arm.inner.w, cuffH);
    ctx.fillRect(arm.outer.x, arm.outer.y + arm.outer.h - cuffH, arm.outer.w, cuffH);
    fill(arm.bottom, '#ffffff');
  });

  return canvas.toDataURL('image/png');
}
