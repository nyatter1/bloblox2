import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  username?: string | null;
}

/**
 * Verified checkmark badge for BoBlox Owner (boblox) & Co-Owner (behave0121).
 */
export default function VerifiedBadge({
  size = 'md',
  className = '',
  showTooltip = true,
  username,
}: VerifiedBadgeProps) {
  const pixel = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const iconPixel = size === 'sm' ? 9 : size === 'lg' ? 13 : 10;

  const roleTitle = username ? getUserRoleTitle(username) : 'Verified BoBlox Staff';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      title={showTooltip ? roleTitle : undefined}
    >
      <span
        style={{ width: pixel, height: pixel }}
        className="rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-500 p-[1.5px] shadow-sm flex items-center justify-center"
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
 * Returns true if the username is the BoBlox Owner (boblox).
 */
export function isOwnerUser(username?: string | null): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === 'boblox';
}

/**
 * Returns true if the username is the BoBlox Co-Owner (behave0121).
 */
export function isCoOwnerUser(username?: string | null): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === 'behave0121';
}

/**
 * Returns true if the user is verified staff (Owner or Co-Owner).
 */
export function isVerifiedUser(username?: string | null): boolean {
  if (!username) return false;
  const u = username.trim().toLowerCase();
  return u === 'boblox' || u === 'behave0121';
}

export function isStaffUser(username?: string | null): boolean {
  return isVerifiedUser(username);
}

export function getUserRole(username?: string | null): 'owner' | 'co-owner' | 'player' {
  if (!username) return 'player';
  const u = username.trim().toLowerCase();
  if (u === 'boblox') return 'owner';
  if (u === 'behave0121') return 'co-owner';
  return 'player';
}

export function getUserRoleTitle(username?: string | null): string {
  if (!username) return 'Player';
  const u = username.trim().toLowerCase();
  if (u === 'boblox') return 'Verified BoBlox Owner';
  if (u === 'behave0121') return 'Verified BoBlox Co-Owner';
  return 'Player';
}
