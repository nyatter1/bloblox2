import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

/**
 * Verified checkmark badge for BoBlox owner / administrator accounts.
 */
export default function VerifiedBadge({
  size = 'md',
  className = '',
  showTooltip = true,
}: VerifiedBadgeProps) {
  const pixel = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const iconPixel = size === 'sm' ? 9 : size === 'lg' ? 13 : 10;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      title={showTooltip ? 'Verified BoBlox Owner' : undefined}
    >
      <span
        style={{ width: pixel, height: pixel }}
        className="rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-500 p-[1.5px] shadow-sm flex items-center justify-center"
      >
        <span className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center">
          <Check
            style={{ width: iconPixel, height: iconPixel }}
            className="text-white stroke-[3.5]"
          />
        </span>
      </span>
    </span>
  );
}

/**
 * Returns true if the username is the verified BoBlox owner (case-insensitive).
 */
export function isOwnerUser(username?: string | null): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === 'boblox';
}
