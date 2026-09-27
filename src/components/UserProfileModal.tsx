import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Users,
  UserPlus,
  UserCheck,
  Play,
  Shirt,
  Boxes,
  Calendar,
  Sparkles,
  Heart,
  Share2,
  ExternalLink,
  Check
} from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isOwnerUser, isCoOwnerUser, isVerifiedUser } from './VerifiedBadge';
import {
  UserProfile,
  sendFriendRequest,
  toggleFollowUser,
  subscribeUserProfile
} from '../services/firebase';
import { ExperienceData } from '../types/experience';
import { CustomClothingItem } from '../types/avatarInventory';

import { getSavedShirtsInventory, getSavedPantsInventory } from '../types/avatarInventory';

interface UserProfileModalProps {
  userId: string;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onOpenAvatarEditor?: () => void;
  onJoinExperience?: (experienceId: string) => void;
  allExperiences?: ExperienceData[];
}

export default function UserProfileModal({
  userId,
  currentUserId,
  currentUserProfile,
  onClose,
  onOpenAvatarEditor,
  onJoinExperience,
  allExperiences = [],
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'experiences' | 'clothing' | 'friends'>('experiences');
  const [requestSent, setRequestSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isSelf = userId === currentUserId;

  // Real-time subscribe to target user profile
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUserProfile(userId, (data) => {
      setProfile(data);
      if (data?.username) {
        document.title = `BoBlox | ${data.username}`;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (profile?.username) {
      document.title = `BoBlox | ${profile.username}`;
    }
  }, [profile?.username]);

  if (loading || !profile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-lg bg-[#150f28] border border-purple-500/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <p className="text-sm text-purple-200">Loading BoBlox Profile...</p>
        </div>
      </div>
    );
  }

  const isFriend = currentUserProfile?.friends?.includes(profile.id) || profile.friends?.includes(currentUserId);
  const hasSentRequest = profile.friendRequests?.some((r) => r.fromUid === currentUserId) || requestSent;
  const isFollowing = currentUserProfile?.following?.includes(profile.id);

  // User's experiences
  const userExperiences = allExperiences.filter(
    (exp) => exp.creatorId === profile.id || exp.creatorUsername === profile.username
  );

  // User's clothing (ONLY things made by this user show on their profile)
  const userClothing: { type: 'shirt' | 'pants'; name: string; url: string }[] = [];
  const savedShirts = getSavedShirtsInventory();
  const savedPants = getSavedPantsInventory();

  savedShirts.forEach((s) => {
    if (
      s.isCreator &&
      (s.creatorId === profile.id || (s.creatorUsername && s.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
    ) {
      userClothing.push({
        type: 'shirt',
        name: s.name,
        url: s.dataUrl,
      });
    }
  });

  savedPants.forEach((p) => {
    if (
      p.isCreator &&
      (p.creatorId === profile.id || (p.creatorUsername && p.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
    ) {
      userClothing.push({
        type: 'pants',
        name: p.name,
        url: p.dataUrl,
      });
    }
  });

  const handleSendFriendReq = async () => {
    if (!currentUserProfile) return;
    setRequestSent(true);
    await sendFriendRequest(currentUserProfile, profile.id);
  };

  const handleFollowToggle = async () => {
    if (!currentUserProfile) return;
    await toggleFollowUser(currentUserId, profile.id);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#130d24] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-32 sm:h-36 bg-gradient-to-r from-[#221344] via-[#160c2e] to-[#0f0820] relative overflow-hidden flex items-center justify-between px-6 border-b border-purple-500/20">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10">
            <span className="text-xs font-mono tracking-wider uppercase text-purple-300/80 font-bold">
              Player Profile
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/50 hover:bg-black/80 text-purple-300 hover:text-white transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="px-6 pb-6 relative">
          {/* Avatar Icon (Showing face and lower body framing, overlapping banner) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 sm:-mt-12 mb-4 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="p-1 rounded-2xl bg-[#130d24] shadow-2xl ring-2 ring-purple-500/30">
                <AvatarProfileIcon
                  colors={profile.avatarColors}
                  selectedFaceId={profile.selectedFaceId}
                  shirtDataUrl={profile.shirtDataUrl}
                  pantsDataUrl={profile.pantsDataUrl}
                  selectedHairId={profile.selectedHairId}
                  hairColor={profile.hairColor}
                  size={100}
                  shape="rounded"
                  border={false}
                  framing="face-and-lower-body"
                />
              </div>

              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-1.5">
                    <span>{profile.displayName || profile.username}</span>
                    {isVerifiedUser(profile.username) && <VerifiedBadge username={profile.username} size="md" />}
                  </h2>
                  {profile.currentExperienceId ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      In Game
                    </span>
                  ) : Date.now() - (profile.lastActive || 0) < 60000 ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Online
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-400/50">Offline</span>
                  )}
                </div>

                <p className="text-xs text-purple-300 font-mono flex items-center justify-center sm:justify-start gap-1">
                  <span>@{profile.username}</span>
                  {isOwnerUser(profile.username) && (
                    <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Owner
                    </span>
                  )}
                  {isCoOwnerUser(profile.username) && (
                    <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      Co-Owner
                    </span>
                  )}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] text-purple-400/60 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{profile.joinedDate || 'Joined BoBlox'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {isSelf ? (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAvatarEditor?.();
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Shirt className="w-4 h-4" />
                    <span>Edit Avatar</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 text-purple-300 transition-colors cursor-pointer"
                    title="Share Profile"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <>
                  {/* Friend Button */}
                  {isFriend ? (
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>Friends</span>
                    </div>
                  ) : hasSentRequest ? (
                    <button
                      disabled
                      className="px-3.5 py-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-purple-300/70 text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Request Sent</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSendFriendReq}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </button>
                  )}

                  {/* Follow Button */}
                  <button
                    onClick={handleFollowToggle}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isFollowing
                        ? 'bg-purple-950/60 border-purple-400/40 text-purple-200'
                        : 'bg-purple-900/40 border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-800/50'
                    }`}
                  >
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                  </button>

                  {/* Join Game Button (if currently in game) */}
                  {profile.currentExperienceId && (
                    <button
                      onClick={() => {
                        onClose();
                        onJoinExperience?.(profile.currentExperienceId!);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Join Game</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Social Stats Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 rounded-xl bg-[#191130] border border-purple-500/20 text-center mb-6">
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black text-white">
                {profile.friends?.length || 0}
              </span>
              <span className="text-[11px] text-purple-300/70 uppercase tracking-wider font-semibold">
                Friends
              </span>
            </div>
            <div className="flex flex-col border-x border-purple-500/20">
              <span className="text-lg sm:text-xl font-black text-white">
                {profile.followers?.length || 0}
              </span>
              <span className="text-[11px] text-purple-300/70 uppercase tracking-wider font-semibold">
                Followers
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black text-white">
                {profile.following?.length || 0}
              </span>
              <span className="text-[11px] text-purple-300/70 uppercase tracking-wider font-semibold">
                Following
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 mb-4">
            <button
              onClick={() => setActiveTab('experiences')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'experiences'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Experiences Made ({userExperiences.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('clothing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'clothing'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>Clothing Made ({userClothing.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[180px]">
            {activeTab === 'experiences' && (
              <div>
                {userExperiences.length === 0 ? (
                  <div className="py-12 text-center text-purple-400/60 flex flex-col items-center justify-center gap-2">
                    <Boxes className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No public experiences published yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userExperiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-3 rounded-xl bg-[#1b1236] border border-purple-500/20 flex items-center justify-between gap-3 group hover:border-purple-400/40 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                            {exp.name}
                          </h4>
                          <p className="text-[11px] text-purple-300/60 truncate">
                            {exp.description || 'Custom BoBlox Sandbox'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-purple-400/60 mt-1">
                            <span>{exp.parts?.length || 0} Parts</span>
                            <span>•</span>
                            <span>{exp.visits || 0} Visits</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onClose();
                            onJoinExperience?.(exp.id);
                          }}
                          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer shrink-0"
                          title="Play Experience"
                        >
                          <Play className="w-4 h-4 fill-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'clothing' && (
              <div>
                {userClothing.length === 0 ? (
                  <div className="py-12 text-center text-purple-400/60 flex flex-col items-center justify-center gap-2">
                    <Shirt className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No custom shirts or pants made yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {userClothing.map((cloth, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#1b1236] border border-purple-500/20 flex flex-col items-center text-center gap-2 group hover:border-purple-400/40 transition-all"
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/40 border border-purple-500/20 flex items-center justify-center p-1">
                          <img
                            src={cloth.url}
                            alt={cloth.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-xs font-bold text-white truncate max-w-full">
                          {cloth.name}
                        </span>
                        <span className="text-[10px] text-purple-300/60 capitalize">
                          {cloth.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
