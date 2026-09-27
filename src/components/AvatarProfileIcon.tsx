import React, { useEffect, useState } from 'react';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { getAvatar3DSnapshot, AvatarFraming } from '../utils/avatar3DSnapshot';

interface AvatarProfileIconProps {
  colors?: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  selectedAccessoryId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  shape?: 'circle' | 'rounded';
  border?: boolean;
  fullBody?: boolean;
  framing?: AvatarFraming;
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
  customHairObj = null,
  selectedAccessoryId = 'none',
  size = 'md',
  className = '',
  shape = 'circle',
  border = true,
  fullBody = false,
  framing = 'bust',
}: AvatarProfileIconProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const effectiveFraming: AvatarFraming = fullBody ? 'fullBody' : framing;

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

    getAvatar3DSnapshot({
      colors,
      selectedFaceId,
      shirtDataUrl,
      pantsDataUrl,
      selectedHairId,
      hairColor,
      customHairObj,
      selectedAccessoryId,
      framing: effectiveFraming,
    })
      .then((url) => {
        if (!isCancelled) {
          setDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Failed to generate 3D avatar snapshot:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    colors,
    selectedFaceId,
    shirtDataUrl,
    pantsDataUrl,
    selectedHairId,
    hairColor,
    customHairObj,
    selectedAccessoryId,
    effectiveFraming,
  ]);

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
          className="w-full h-full object-contain pointer-events-none drop-shadow-md"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
