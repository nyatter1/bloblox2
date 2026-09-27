import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  User,
  Users,
  UserPlus,
  UserCheck,
  Play,
  Shirt,
  Boxes,
  Calendar,
  Sparkles,
  Share2,
  Check,
  ExternalLink,
  Edit3,
  Save,
  RotateCcw,
  Tag,
  ShieldCheck,
  Trophy,
  Award,
  Flame,
  Clock,
  ArrowRight
} from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isOwnerUser, isCoOwnerUser, isVerifiedUser } from './VerifiedBadge';
import {
  UserProfile,
  sendFriendRequest,
  toggleFollowUser,
  subscribeUserProfile,
  updateUserBio
} from '../services/firebase';
import { ExperienceData, formatTimeAgo } from '../types/experience';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { getSavedShirtsInventory, getSavedPantsInventory, CustomClothingItem } from '../types/avatarInventory';
import { getFaceTexture, createFaceMesh } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh } from '../utils/hairMesh';

interface ProfilePageProps {
  userId: string;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onOpenAvatarEditor: () => void;
  onOpenStudio: () => void;
  onOpenMarketplace: () => void;
  onPlayExperience: (exp: ExperienceData) => void;
  allExperiences: ExperienceData[];
  onEquipShirt: (url: string | null) => void;
  onEquipPants: (url: string | null) => void;
  onNavigateToUser?: (uid: string) => void;
}

export default function ProfilePage({
  userId,
  currentUserId,
  currentUserProfile,
  onOpenAvatarEditor,
  onOpenStudio,
  onOpenMarketplace,
  onPlayExperience,
  allExperiences = [],
  onEquipShirt,
  onEquipPants,
  onNavigateToUser
}: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'creations' | 'inventory' | 'friends'>('about');
  const [requestSent, setRequestSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bio Editing State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // Creations tab sub-filter
  const [creationsFilter, setCreationsFilter] = useState<'experiences' | 'clothing'>('experiences');

  // Inventory tab filter
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'shirts' | 'pants'>('all');

  const isSelf = userId === currentUserId;

  // Real-time profile subscription
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUserProfile(userId, (data) => {
      setProfile(data);
      if (data) {
        setBioText(data.bio || '');
        document.title = `BoBlox | ${data.username}'s Profile`;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const isFriend = currentUserProfile?.friends?.includes(profile?.id || '') || profile?.friends?.includes(currentUserId);
  const hasSentRequest = profile?.friendRequests?.some((r) => r.fromUid === currentUserId) || requestSent;
  const isFollowing = currentUserProfile?.following?.includes(profile?.id || '');

  // User's experiences (ONLY created by this user)
  const userExperiences = allExperiences.filter(
    (exp) => exp.creatorId === profile?.id || exp.creatorUsername === profile?.username
  );

  // User's created clothing ONLY (ONLY items made by this user)
  const allShirts = getSavedShirtsInventory();
  const allPants = getSavedPantsInventory();
  const userCreatedShirts = allShirts.filter(
    (s) => s.isCreator && (s.creatorId === profile?.id || (s.creatorUsername && s.creatorUsername.toLowerCase() === profile?.username.toLowerCase()))
  );
  const userCreatedPants = allPants.filter(
    (p) => p.isCreator && (p.creatorId === profile?.id || (p.creatorUsername && p.creatorUsername.toLowerCase() === profile?.username.toLowerCase()))
  );
  const totalUserCreations = userExperiences.length + userCreatedShirts.length + userCreatedPants.length;

  // User's inventory (if self, read real saved inventory)
  const ownedShirts = isSelf ? allShirts : [];
  const ownedPants = isSelf ? allPants : [];

  const handleSendFriendReq = async () => {
    if (!currentUserProfile || !profile) return;
    setRequestSent(true);
    await sendFriendRequest(currentUserProfile, profile.id);
  };

  const handleFollowToggle = async () => {
    if (!currentUserProfile || !profile) return;
    await toggleFollowUser(currentUserId, profile.id);
  };

  const handleSaveBio = async () => {
    if (!currentUserProfile || !profile) return;
    setSavingBio(true);
    await updateUserBio(profile.id, bioText);
    setSavingBio(false);
    setIsEditingBio(false);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  if (loading || !profile) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        <p className="text-sm text-purple-200">Loading BoBlox Profile...</p>
      </div>
    );
  }

  const isOwner = isOwnerUser(profile.username);
  const isCoOwner = isCoOwnerUser(profile.username);
  const isVerified = isVerifiedUser(profile.username);

  return (
    <div className="space-y-6 pb-20 animate-fadeIn max-w-7xl mx-auto">
      {/* ================= 1. PROFILE BANNER ================= */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/25 bg-gradient-to-r from-[#211244] via-[#160c2e] to-[#0f0820] shadow-2xl">
        {/* Ambient Glow & Grid Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(168,85,247,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

        {/* Static Profile Hero Banner with Clean Studio Aesthetics */}
        <div className="h-44 sm:h-52 relative overflow-hidden flex items-center justify-between px-6 sm:px-10">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-wider uppercase text-purple-300/80 font-bold">
                  BoBlox Player Card
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-[11px] font-medium text-white/50">R6 Avatar Rig</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-white/90 drop-shadow">
                {profile.username}&apos;s Official BoBlox Profile
              </p>
            </div>
          </div>

          {/* Static Avatar Showcase in Banner */}
          <div className="hidden sm:flex items-center gap-4 relative z-10 mr-12">
            <div className="p-1 rounded-2xl bg-gradient-to-b from-purple-500/30 to-purple-900/30 border border-purple-400/30 shadow-xl backdrop-blur-md">
              <AvatarProfileIcon
                colors={profile.avatarColors}
                selectedFaceId={profile.selectedFaceId}
                shirtDataUrl={profile.shirtDataUrl}
                pantsDataUrl={profile.pantsDataUrl}
                selectedHairId={profile.selectedHairId}
                hairColor={profile.hairColor}
                customHairObj={profile.customHairObj}
                selectedAccessoryId={profile.selectedAccessoryId}
                size={96}
                shape="rounded"
                border={false}
                fullBody={true}
              />
            </div>
          </div>

          {/* Quick Share Button */}
          <button
            onClick={handleShare}
            className="relative z-20 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-purple-500/30 text-xs font-semibold text-purple-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
            title="Share Profile Link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>

        {/* Header Profile Info Overlay */}
        <div className="p-6 sm:p-8 bg-[#130d25]/95 backdrop-blur-md border-t border-purple-500/20 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar Bust Icon (Head, Chest, Left Arm, Right Arm) */}
            <div className="relative -mt-16 sm:-mt-20 group shrink-0">
              <div className="p-1 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-800 shadow-2xl shadow-purple-950/80">
                <div className="rounded-xl overflow-hidden bg-[#0d081a] border-2 border-purple-400/50">
                  <AvatarProfileIcon
                    colors={profile.avatarColors}
                    selectedFaceId={profile.selectedFaceId}
                    shirtDataUrl={profile.shirtDataUrl}
                    pantsDataUrl={profile.pantsDataUrl}
                    selectedHairId={profile.selectedHairId}
                    hairColor={profile.hairColor}
                    customHairObj={profile.customHairObj}
                    selectedAccessoryId={profile.selectedAccessoryId}
                    size={112}
                    shape="rounded"
                    border={false}
                    framing="bust"
                  />
                </div>
              </div>

              {/* Online Status Dot */}
              <div
                className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-lg"
                title="Active in BoBlox"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Username & Status */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                  {profile.username}
                </h1>
                {isVerified && <VerifiedBadge username={profile.username} size="md" />}
                {isOwner && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-600/30 border border-purple-400/40 text-[11px] font-extrabold text-purple-300">
                    OWNER
                  </span>
                )}
                {isCoOwner && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-600/30 border border-cyan-400/40 text-[11px] font-extrabold text-cyan-300">
                    CO-OWNER
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-purple-300/80 font-mono">
                <span>@{profile.username.toLowerCase()}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Joined Sep 2026</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isSelf ? (
              <>
                <button
                  onClick={onOpenAvatarEditor}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                >
                  <Shirt className="w-4 h-4" />
                  <span>Customize Avatar</span>
                </button>
                <button
                  onClick={onOpenStudio}
                  className="px-4 py-2.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 text-purple-200 hover:text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Boxes className="w-4 h-4 text-purple-400" />
                  <span>BoBlox Studio</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSendFriendReq}
                  disabled={isFriend || hasSentRequest}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    isFriend
                      ? 'bg-purple-950/70 border border-purple-500/30 text-purple-300 cursor-default'
                      : hasSentRequest
                      ? 'bg-purple-900/40 border border-purple-500/20 text-purple-300 cursor-default'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
                  }`}
                >
                  {isFriend ? (
                    <>
                      <UserCheck className="w-4 h-4 text-purple-400" />
                      <span>Friends</span>
                    </>
                  ) : hasSentRequest ? (
                    <>
                      <Check className="w-4 h-4 text-purple-400" />
                      <span>Request Sent</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleFollowToggle}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                    isFollowing
                      ? 'bg-purple-950/60 border-purple-500/30 text-purple-200'
                      : 'bg-[#181132] border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/40'
                  }`}
                >
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Counters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-purple-500/15 bg-[#0e091b]/90 text-center text-xs divide-x divide-purple-500/15">
          <div className="p-3.5">
            <div className="text-base font-extrabold text-white font-mono">
              {profile.friends?.length || 0}
            </div>
            <div className="text-[11px] text-purple-400/80 uppercase font-bold">Friends</div>
          </div>
          <div className="p-3.5">
            <div className="text-base font-extrabold text-white font-mono">
              {profile.followers?.length || 0}
            </div>
            <div className="text-[11px] text-purple-400/80 uppercase font-bold">Followers</div>
          </div>
          <div className="p-3.5">
            <div className="text-base font-extrabold text-white font-mono">
              {profile.following?.length || 0}
            </div>
            <div className="text-[11px] text-purple-400/80 uppercase font-bold">Following</div>
          </div>
          <div className="p-3.5">
            <div className="text-base font-extrabold text-white font-mono">
              {totalUserCreations}
            </div>
            <div className="text-[11px] text-purple-400/80 uppercase font-bold">Creations</div>
          </div>
          <div className="p-3.5 col-span-2 sm:col-span-1">
            <div className="text-base font-extrabold text-white font-mono">
              {userExperiences.reduce((sum, e) => sum + (e.visits || 0), 0)}
            </div>
            <div className="text-[11px] text-purple-400/80 uppercase font-bold">Place Visits</div>
          </div>
        </div>
      </div>

      {/* ================= 2. PROFILE TAB NAVIGATION ================= */}
      <div className="flex items-center gap-2 border-b border-purple-500/20 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('about')}
          className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'about'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <User className="w-4 h-4" />
          <span>About</span>
        </button>

        <button
          onClick={() => setActiveTab('creations')}
          className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'creations'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Creations ({totalUserCreations})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <Shirt className="w-4 h-4" />
          <span>Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Friends ({profile.friends?.length || 0})</span>
        </button>
      </div>

      {/* ================= 3. TAB CONTENT ================= */}

      {/* TAB 1: ABOUT & CHARACTER EQUIPMENT */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Currently Wearing Card & Quick Links (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Currently Wearing Card */}
            <div className="rounded-2xl bg-[#140e29] border border-purple-500/20 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-purple-500/15 pb-3">
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-purple-400" />
                  <span>Currently Wearing</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 font-mono">
                  R6 Rig
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Shirt item */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Shirt</span>
                    <p className="font-bold text-white line-clamp-1 mt-0.5">
                      {profile.shirtDataUrl ? 'Custom Shirt' : 'Default Grey'}
                    </p>
                  </div>
                  <button
                    onClick={onOpenMarketplace}
                    className="mt-3 text-[11px] text-purple-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Browse Shirts</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Pants item */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Pants</span>
                    <p className="font-bold text-white line-clamp-1 mt-0.5">
                      {profile.pantsDataUrl ? 'Custom Pants' : 'Default Jeans'}
                    </p>
                  </div>
                  <button
                    onClick={onOpenMarketplace}
                    className="mt-3 text-[11px] text-purple-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Browse Pants</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Face item */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Face</span>
                    <p className="font-bold text-white line-clamp-1 mt-0.5 capitalize">
                      {(profile.selectedFaceId || 'classic-smile').replace('-', ' ')}
                    </p>
                  </div>
                  <button
                    onClick={onOpenAvatarEditor}
                    className="mt-3 text-[11px] text-purple-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Change Face</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Hair item */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Hairstyle</span>
                    <p className="font-bold text-white line-clamp-1 mt-0.5 capitalize">
                      {profile.selectedHairId && profile.selectedHairId !== 'none'
                        ? profile.selectedHairId.replace('-', ' ')
                        : 'Default Hair'}
                    </p>
                  </div>
                  <button
                    onClick={onOpenAvatarEditor}
                    className="mt-3 text-[11px] text-purple-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Change Hair</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Badges Showcase (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-5">
            {/* About / Bio Card */}
            <div className="rounded-2xl bg-[#140e29] border border-purple-500/20 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>About</span>
                </h3>

                {isSelf && !isEditingBio && (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="text-xs font-semibold text-purple-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Edit Bio</span>
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <div className="space-y-3">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Tell the BoBlox community about yourself, your favorite worlds, or building skills..."
                    rows={4}
                    maxLength={500}
                    className="w-full p-3 rounded-xl bg-[#1a1236] border border-purple-500/30 text-white text-xs placeholder-purple-400/40 focus:outline-none focus:border-purple-400 leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400/60">{bioText.length}/500</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setBioText(profile.bio || '');
                          setIsEditingBio(false);
                        }}
                        className="px-3 py-1.5 rounded-lg text-purple-300 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingBio ? 'Saving...' : 'Save Bio'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed whitespace-pre-wrap">
                  {profile.bio ||
                    (isSelf
                      ? 'Welcome to my BoBlox profile! Click "Edit Bio" to share your builder status, favorites, and stories with everyone.'
                      : 'This player has not written an about section yet.')}
                </p>
              )}
            </div>

            {/* Badges Collection Showcase */}
            <div className="rounded-2xl bg-[#140e29] border border-purple-500/20 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Badges & Achievements</span>
                </h3>
                <span className="text-xs font-mono text-purple-400">4 Unlocked</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center mx-auto text-purple-300">
                    <Sparkles className="w-5 h-5 text-purple-300" />
                  </div>
                  <h4 className="font-bold text-xs text-white">BoBlox Pioneer</h4>
                  <p className="text-[10px] text-purple-300/70">Joined early platform sandbox</p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-300">
                    <Boxes className="w-5 h-5 text-emerald-300" />
                  </div>
                  <h4 className="font-bold text-xs text-white">World Builder</h4>
                  <p className="text-[10px] text-purple-300/70">Built 3D sandbox experiences</p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center mx-auto text-indigo-300">
                    <Shirt className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Fashionista</h4>
                  <p className="text-[10px] text-purple-300/70">Created & wore custom clothing</p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-600/30 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-300">
                    <Trophy className="w-5 h-5 text-amber-300" />
                  </div>
                  <h4 className="font-bold text-xs text-white">Connected</h4>
                  <p className="text-[10px] text-purple-300/70">Formed friendship networks</p>
                </div>
              </div>
            </div>

            {/* Quick Experiences Showcase */}
            {userExperiences.length > 0 && (
              <div className="rounded-2xl bg-[#140e29] border border-purple-500/20 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-purple-400" />
                    <span>Featured Experience</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('creations')}
                    className="text-xs font-semibold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all ({userExperiences.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/50 to-indigo-950/50 border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-display font-black text-white text-base">
                      {userExperiences[0].name}
                    </h4>
                    <p className="text-xs text-purple-200/80 line-clamp-1">
                      {userExperiences[0].description || 'Custom 3D Sandbox World'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-purple-300/60 font-mono pt-1">
                      <span>{userExperiences[0].parts?.length || 0} Parts</span>
                      <span>&bull;</span>
                      <span>{userExperiences[0].likes || 0} Likes</span>
                      <span>&bull;</span>
                      <span>{userExperiences[0].visits || 0} Visits</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onPlayExperience(userExperiences[0])}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Play World</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATIONS (EXPERIENCES & USER-CREATED CLOTHING) */}
      {activeTab === 'creations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreationsFilter('experiences')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  creationsFilter === 'experiences'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-purple-950/40 text-purple-300 hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Experiences ({userExperiences.length})</span>
              </button>
              <button
                onClick={() => setCreationsFilter('clothing')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  creationsFilter === 'clothing'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-purple-950/40 text-purple-300 hover:text-white'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Clothing Created ({userCreatedShirts.length + userCreatedPants.length})</span>
              </button>
            </div>

            {isSelf && (
              <button
                onClick={onOpenStudio}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Boxes className="w-4 h-4" />
                <span>Create in Studio</span>
              </button>
            )}
          </div>

          {creationsFilter === 'experiences' && (
            <div>
              {userExperiences.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#140e29] border border-purple-500/20 text-center space-y-3">
                  <Boxes className="w-10 h-10 text-purple-400/40 mx-auto" />
                  <h4 className="font-display font-bold text-white text-base">No experiences published yet</h4>
                  <p className="text-xs text-purple-300/70 max-w-sm mx-auto">
                    {isSelf
                      ? 'Head to BoBlox Studio to build and publish your first custom 3D sandbox place!'
                      : `${profile.username} has not published any experiences yet.`}
                  </p>
                  {isSelf && (
                    <button
                      onClick={onOpenStudio}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                    >
                      Open BoBlox Studio
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {userExperiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="group rounded-2xl bg-[#150e2b] border border-purple-500/20 hover:border-purple-400/40 overflow-hidden shadow-lg hover:shadow-purple-950/60 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Visual Card Banner */}
                        <div className="aspect-[16/9] w-full bg-gradient-to-br from-[#2a1b4d] via-[#1a1133] to-[#0e081e] flex flex-col items-center justify-center p-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                          <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-200 mb-2">
                            <Boxes className="w-6 h-6" />
                          </div>
                          <span className="font-display font-bold text-white text-sm text-center line-clamp-1">
                            {exp.name}
                          </span>
                        </div>

                        <div className="p-4 space-y-2">
                          <h4 className="font-display font-bold text-white text-sm group-hover:text-purple-200 transition-colors">
                            {exp.name}
                          </h4>
                          <p className="text-xs text-purple-300/70 line-clamp-2">
                            {exp.description || 'Custom 3D sandbox experience.'}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-purple-400/70 pt-1 font-mono">
                            <span>{exp.parts?.length || 0} Parts</span>
                            <span>{exp.likes || 0} Likes</span>
                            <span>{exp.visits || 0} Visits</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <button
                          onClick={() => onPlayExperience(exp)}
                          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Play Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {creationsFilter === 'clothing' && (
            <div>
              {userCreatedShirts.length === 0 && userCreatedPants.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#140e29] border border-purple-500/20 text-center space-y-3">
                  <Shirt className="w-10 h-10 text-purple-400/40 mx-auto" />
                  <h4 className="font-display font-bold text-white text-base">No clothing creations yet</h4>
                  <p className="text-xs text-purple-300/70 max-w-sm mx-auto">
                    {isSelf
                      ? 'Create and upload your own custom shirts or pants in BoBlox Studio to show them off here!'
                      : `${profile.username} has not created any custom clothing items yet.`}
                  </p>
                  {isSelf && (
                    <button
                      onClick={onOpenStudio}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                    >
                      Create Clothing in Studio
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {[...userCreatedShirts, ...userCreatedPants].map((cloth) => (
                    <div
                      key={cloth.id}
                      className="p-3.5 rounded-2xl bg-[#150e2b] border border-purple-500/20 flex flex-col justify-between group hover:border-purple-400/50 transition-all"
                    >
                      <div className="aspect-square w-full rounded-xl bg-[#0e091b] p-2 flex items-center justify-center mb-2 overflow-hidden">
                        {cloth.previewUrl ? (
                          <img
                            src={cloth.previewUrl}
                            alt={cloth.name}
                            className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Shirt className="w-8 h-8 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-purple-400">
                          {cloth.type}
                        </span>
                        <h4 className="font-bold text-white text-xs truncate">{cloth.name}</h4>
                        <p className="text-[10px] text-purple-300/60 mt-0.5">By {profile.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInventoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  inventoryFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-950/40 text-purple-300 hover:text-white'
                }`}
              >
                All Wardrobe
              </button>
              <button
                onClick={() => setInventoryFilter('shirts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  inventoryFilter === 'shirts'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-950/40 text-purple-300 hover:text-white'
                }`}
              >
                Shirts ({isSelf ? ownedShirts.length : profile.shirtDataUrl ? 1 : 0})
              </button>
              <button
                onClick={() => setInventoryFilter('pants')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  inventoryFilter === 'pants'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-950/40 text-purple-300 hover:text-white'
                }`}
              >
                Pants ({isSelf ? ownedPants.length : profile.pantsDataUrl ? 1 : 0})
              </button>
            </div>

            <button
              onClick={onOpenMarketplace}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Tag className="w-4 h-4" />
              <span>Get More in Marketplace (FREE)</span>
            </button>
          </div>

          {/* If viewing self, show real items from inventory */}
          {isSelf ? (
            <div className="space-y-6">
              {(inventoryFilter === 'all' || inventoryFilter === 'shirts') && (
                <div>
                  <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-purple-400" />
                    <span>Owned Shirts ({ownedShirts.length})</span>
                  </h4>
                  {ownedShirts.length === 0 ? (
                    <div className="p-8 rounded-xl bg-purple-950/20 border border-purple-500/20 text-center text-xs text-purple-300/60">
                      No custom shirts owned yet. Visit the Marketplace to claim free community clothing!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {ownedShirts.map((s) => {
                        const isEquipped = profile.shirtDataUrl === s.dataUrl;
                        return (
                          <div
                            key={s.id}
                            className="p-3 rounded-xl bg-[#150e2b] border border-purple-500/20 flex flex-col justify-between"
                          >
                            <div className="aspect-square w-full rounded-lg bg-[#0e091b] p-2 flex items-center justify-center mb-2">
                              {s.previewUrl ? (
                                <img src={s.previewUrl} alt={s.name} className="w-full h-full object-contain" />
                              ) : (
                                <Shirt className="w-8 h-8 text-purple-400" />
                              )}
                            </div>
                            <p className="font-bold text-white text-xs truncate mb-2">{s.name}</p>
                            <button
                              onClick={() => onEquipShirt(s.dataUrl)}
                              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isEquipped
                                  ? 'bg-purple-600/30 border border-purple-400 text-purple-200'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                              }`}
                            >
                              {isEquipped ? 'Worn ✓' : 'Wear'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(inventoryFilter === 'all' || inventoryFilter === 'pants') && (
                <div>
                  <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-400" />
                    <span>Owned Pants ({ownedPants.length})</span>
                  </h4>
                  {ownedPants.length === 0 ? (
                    <div className="p-8 rounded-xl bg-purple-950/20 border border-purple-500/20 text-center text-xs text-purple-300/60">
                      No custom pants owned yet. Visit the Marketplace to claim free community clothing!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {ownedPants.map((p) => {
                        const isEquipped = profile.pantsDataUrl === p.dataUrl;
                        return (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-[#150e2b] border border-purple-500/20 flex flex-col justify-between"
                          >
                            <div className="aspect-square w-full rounded-lg bg-[#0e091b] p-2 flex items-center justify-center mb-2">
                              {p.previewUrl ? (
                                <img src={p.previewUrl} alt={p.name} className="w-full h-full object-contain" />
                              ) : (
                                <Tag className="w-8 h-8 text-purple-400" />
                              )}
                            </div>
                            <p className="font-bold text-white text-xs truncate mb-2">{p.name}</p>
                            <button
                              onClick={() => onEquipPants(p.dataUrl)}
                              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isEquipped
                                  ? 'bg-purple-600/30 border border-purple-400 text-purple-200'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                              }`}
                            >
                              {isEquipped ? 'Worn ✓' : 'Wear'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* If viewing another user, showcase their equipped clothing */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#150e2b] border border-purple-500/20 space-y-3">
                <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Equipped Shirt</span>
                <p className="font-bold text-white text-sm">
                  {profile.shirtDataUrl ? `${profile.username}'s Shirt` : 'Default Grey Avatar Shirt'}
                </p>
                <button
                  onClick={onOpenMarketplace}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Explore Marketplace
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#150e2b] border border-purple-500/20 space-y-3">
                <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">Equipped Pants</span>
                <p className="font-bold text-white text-sm">
                  {profile.pantsDataUrl ? `${profile.username}'s Pants` : 'Default Avatar Pants'}
                </p>
                <button
                  onClick={onOpenMarketplace}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Explore Marketplace
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FRIENDS & CONNECTIONS */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Friends ({profile.friends?.length || 0})</span>
          </h3>

          {(!profile.friends || profile.friends.length === 0) ? (
            <div className="p-12 rounded-2xl bg-[#140e29] border border-purple-500/20 text-center space-y-2">
              <Users className="w-10 h-10 text-purple-400/40 mx-auto" />
              <h4 className="font-bold text-white text-sm">No friends added yet</h4>
              <p className="text-xs text-purple-300/70">
                Use the search bar at the top or play multiplayer experiences to connect with players!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {profile.friends.map((friendId) => (
                <div
                  key={friendId}
                  onClick={() => onNavigateToUser?.(friendId)}
                  className="p-3.5 rounded-xl bg-[#150e2b] border border-purple-500/20 hover:border-purple-400/40 flex items-center gap-3 transition-all cursor-pointer group shadow-sm hover:shadow-purple-950/50"
                >
                  <AvatarProfileIcon
                    size={44}
                    shape="circle"
                    framing="bust"
                  />
                  <div className="truncate">
                    <p className="font-bold text-white text-xs truncate group-hover:text-purple-200 transition-colors">
                      Friend #{friendId.slice(0, 6)}
                    </p>
                    <span className="text-[10px] text-emerald-400 font-bold">Online</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
