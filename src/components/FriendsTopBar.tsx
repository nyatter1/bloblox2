import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Check,
  X,
  Play,
  Bell,
  Clock,
  ExternalLink
} from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isVerifiedUser } from './VerifiedBadge';
import {
  UserProfile,
  subscribeFriendsList,
  searchUsers,
  acceptFriendRequest,
  declineFriendRequest
} from '../services/firebase';

interface FriendsTopBarProps {
  currentUser: UserProfile;
  onOpenProfile: (userId: string) => void;
  onJoinGame: (experienceId: string) => void;
}

export default function FriendsTopBar({
  currentUser,
  onOpenProfile,
  onJoinGame,
}: FriendsTopBarProps) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Subscribe to friends list in real time
  useEffect(() => {
    if (!currentUser.friends || currentUser.friends.length === 0) {
      setFriends([]);
      return;
    }
    const unsub = subscribeFriendsList(currentUser.friends, (list) => {
      setFriends(list);
    });
    return () => unsub?.();
  }, [currentUser.friends]);

  // Live user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        // Exclude current user from results
        setSearchResults(results.filter((u) => u.id !== currentUser.id));
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  const pendingRequests = currentUser.friendRequests || [];

  return (
    <div className="w-full bg-[#130d24]/90 backdrop-blur-md border-b border-purple-500/15 px-4 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Friends Header & Friend Requests Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Friends ({friends.length})</span>
          </div>

          {/* Pending Friend Requests notification button */}
          {pendingRequests.length > 0 && (
            <button
              onClick={() => setShowRequestsModal(true)}
              className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
              title="View Friend Requests"
            >
              <Bell className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{pendingRequests.length} New Request{pendingRequests.length > 1 ? 's' : ''}</span>
            </button>
          )}
        </div>

        {/* Center / Right: Quick User Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users to add friends..."
            className="w-full h-8 pl-8 pr-8 rounded-lg bg-[#1a1233] border border-purple-500/20 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* User Search Results Dropdown */}
          {searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#17102e] border border-purple-500/30 rounded-xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto space-y-1 animate-fadeIn">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-purple-300/70">Searching users...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-purple-400/60">No players found matching "{searchQuery}"</div>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSearchQuery('');
                      onOpenProfile(user.id);
                    }}
                    className="p-2 rounded-lg hover:bg-purple-900/40 flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarProfileIcon
                        colors={user.avatarColors}
                        selectedFaceId={user.selectedFaceId}
                        shirtDataUrl={user.shirtDataUrl}
                        pantsDataUrl={user.pantsDataUrl}
                        size={28}
                        shape="circle"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate flex items-center gap-1">
                          <span>{user.displayName || user.username}</span>
                          {isVerifiedUser(user.username) && <VerifiedBadge username={user.username} size="sm" />}
                        </p>
                        <p className="text-[10px] text-purple-400/60 font-mono">@{user.username}</p>
                      </div>
                    </div>

                    <span className="text-[10px] text-purple-300 px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/20">
                      View Profile
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Friends Horizontal Scroll Row */}
      {friends.length === 0 ? (
        <div className="py-2 text-[11px] text-purple-400/60 flex items-center gap-2">
          <span>No friends added yet. Use the search box to find players or click usernames in-game to add friends!</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
          {friends.map((friend) => {
            const isInGame = Boolean(friend.currentExperienceId);
            const isOnline = Date.now() - (friend.lastActive || 0) < 60000 || isInGame;

            return (
              <div
                key={friend.id}
                onClick={() => onOpenProfile(friend.id)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#181130] hover:bg-[#221644] border border-purple-500/20 hover:border-purple-400/40 transition-all cursor-pointer shrink-0 group shadow-sm"
                title={`View ${friend.username}'s profile`}
              >
                <div className="relative">
                  <AvatarProfileIcon
                    colors={friend.avatarColors}
                    selectedFaceId={friend.selectedFaceId}
                    shirtDataUrl={friend.shirtDataUrl}
                    pantsDataUrl={friend.pantsDataUrl}
                    size={32}
                    shape="circle"
                    border={false}
                  />
                  {isInGame ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#181130] absolute -bottom-0.5 -right-0.5 animate-pulse" />
                  ) : isOnline ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#181130] absolute -bottom-0.5 -right-0.5" />
                  ) : null}
                </div>

                <div className="text-left min-w-[70px] max-w-[120px]">
                  <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate flex items-center gap-1">
                    <span>{friend.username}</span>
                    {isVerifiedUser(friend.username) && <VerifiedBadge username={friend.username} size="sm" />}
                  </p>
                  {isInGame ? (
                    <p className="text-[10px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                      <span>In Game</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-purple-400/60 truncate">
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  )}
                </div>

                {/* Direct Join Button if in Game */}
                {isInGame && friend.currentExperienceId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJoinGame(friend.currentExperienceId!);
                    }}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer ml-1"
                    title={`Join ${friend.username}'s game`}
                  >
                    <Play className="w-3 h-3 fill-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Friend Requests Modal */}
      {showRequestsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowRequestsModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#160f2e] border border-purple-500/30 rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-sm">Friend Requests</h3>
              </div>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="p-1 rounded-lg text-purple-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-purple-400/60">
                No pending friend requests.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {pendingRequests.map((req) => (
                  <div
                    key={req.fromUid}
                    className="p-3 rounded-xl bg-[#1e153d] border border-purple-500/20 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => {
                        setShowRequestsModal(false);
                        onOpenProfile(req.fromUid);
                      }}
                      className="cursor-pointer group flex-1 truncate"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {req.fromUsername}
                      </p>
                      <p className="text-[10px] text-purple-400/60">wants to be your friend</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          await acceptFriendRequest(currentUser.id, req.fromUid);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={async () => {
                          await declineFriendRequest(currentUser.id, req.fromUid);
                        }}
                        className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-red-900/40 text-purple-400 hover:text-red-300 border border-purple-500/20 transition-colors cursor-pointer"
                        title="Decline"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
