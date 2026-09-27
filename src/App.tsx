import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Settings,
  Home as HomeIcon,
  User as UserIcon,
  Play,
  Star,
  ThumbsUp,
  ThumbsDown,
  X,
  LogOut,
  Boxes,
  Sparkles,
  Plus,
  SlidersHorizontal,
  Clock,
  Globe,
  Lock,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import logoImg from './assets/logo.png';
import AvatarViewer, { AvatarColors, DEFAULT_GREY } from './components/AvatarViewer';
import BaseplateGame from './components/BaseplateGame';
import AuthScreen from './components/AuthScreen';
import AvatarProfileIcon from './components/AvatarProfileIcon';
import BoBloxStudio from './components/BoBloxStudio';
import BoBloxStudio3D from './components/BoBloxStudio3D';
import FriendsTopBar from './components/FriendsTopBar';
import UserProfileModal from './components/UserProfileModal';
import Marketplace from './components/Marketplace';
import ProfilePage from './components/ProfilePage';
import VerifiedBadge, { isOwnerUser, isVerifiedUser, isStaffUser } from './components/VerifiedBadge';
import {
  UserProfile,
  subscribeUserProfile,
  saveUserAvatarToFirestore,
  logoutFirebaseUser,
  subscribeExperiencesFromFirestore,
  saveExperienceToFirestore,
  deleteExperienceFromFirestore,
  deleteAllExperiencesFromFirestore
} from './services/firebase';
import {
  ExperienceData,
  getSavedExperiences,
  saveExperiences,
  resetAllSavedExperiences,
  formatTimeAgo
} from './types/experience';

const STORAGE_KEY = 'boblox_saved_avatar_colors_v1';
const FACE_STORAGE_KEY = 'boblox_saved_face_id_v1';
const SHIRT_STORAGE_KEY = 'boblox_saved_shirt_template_v1';
const PANTS_STORAGE_KEY = 'boblox_saved_pants_template_v1';
const ACCESSORY_STORAGE_KEY = 'boblox_saved_accessory_id_v1';
const HAIR_STORAGE_KEY = 'boblox_saved_hair_id_v1';
const HAIR_COLOR_STORAGE_KEY = 'boblox_saved_hair_color_v1';
const HAIR_OBJ_STORAGE_KEY = 'boblox_saved_hair_obj_v1';
const AUTH_STORAGE_KEY = 'boblox_auth_user_v1';

const getInitialAuthUser = (): UserProfile | null => {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // ignore
  }
  return null;
};

const getInitialAvatarColors = (): AvatarColors => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }
  return {
    head: DEFAULT_GREY,
    torso: DEFAULT_GREY,
    leftArm: DEFAULT_GREY,
    rightArm: DEFAULT_GREY,
    leftLeg: DEFAULT_GREY,
    rightLeg: DEFAULT_GREY,
  };
};

const getInitialFaceId = (): string => {
  try {
    const saved = localStorage.getItem(FACE_STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {
    // ignore
  }
  return 'classic-smile';
};

const getInitialAccessoryId = (): string => {
  try {
    const saved = localStorage.getItem(ACCESSORY_STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {
    // ignore
  }
  return 'none';
};

const getInitialHairId = (): string => {
  try {
    const saved = localStorage.getItem(HAIR_STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {
    // ignore
  }
  return 'none';
};

const getInitialHairColor = (): string => {
  try {
    const saved = localStorage.getItem(HAIR_COLOR_STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {
    // ignore
  }
  return '#4a2e1b';
};

const getInitialCustomHairObj = (): string | null => {
  try {
    return localStorage.getItem(HAIR_OBJ_STORAGE_KEY);
  } catch (e) {
    return null;
  }
};

const getInitialShirtDataUrl = (): string | null => {
  try {
    return localStorage.getItem(SHIRT_STORAGE_KEY);
  } catch (e) {
    return null;
  }
};

const getInitialPantsDataUrl = (): string | null => {
  try {
    return localStorage.getItem(PANTS_STORAGE_KEY);
  } catch (e) {
    return null;
  }
};

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getInitialAuthUser);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'home' | 'game' | 'avatar' | 'playing' | 'studio' | 'studio3d' | 'marketplace' | 'profile'>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

  // Real Experiences (loaded from localStorage, NO fake placeholder games)
  const [experiences, setExperiences] = useState<ExperienceData[]>(getSavedExperiences);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceData | null>(null);
  const [editingExperience, setEditingExperience] = useState<ExperienceData | null>(null);

  // Avatar skin colors (persisted in localStorage)
  const [avatarColors, setAvatarColors] = useState<AvatarColors>(getInitialAvatarColors);

  // Selected Face ID (persisted in localStorage)
  const [selectedFaceId, setSelectedFaceId] = useState<string>(getInitialFaceId);

  // Selected Head Accessory ID (persisted in localStorage)
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string>(getInitialAccessoryId);

  // Selected Hair ID (persisted in localStorage)
  const [selectedHairId, setSelectedHairId] = useState<string>(getInitialHairId);

  // Hair Color (persisted in localStorage)
  const [hairColor, setHairColor] = useState<string>(getInitialHairColor);

  // Custom .OBJ Hair data (persisted in localStorage)
  const [customHairObj, setCustomHairObj] = useState<string | null>(getInitialCustomHairObj);

  // Equipped Shirt Data URL (persisted in localStorage)
  const [shirtDataUrl, setShirtDataUrl] = useState<string | null>(getInitialShirtDataUrl);

  // Equipped Pants Data URL (persisted in localStorage)
  const [pantsDataUrl, setPantsDataUrl] = useState<string | null>(getInitialPantsDataUrl);

  // Guarantee that logged-in user is saved to localStorage so reload always logs in straight away
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      } catch (e) {
        // ignore
      }
    }
  }, [currentUser]);

  // Real-time live profile synchronization with Firebase (optimized to prevent wasteful re-renders)
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeUserProfile(currentUser.id, (liveProfile) => {
      if (liveProfile) {
        setCurrentUser((prev) => {
          if (!prev) return liveProfile;
          // Check if functional fields changed (ignoring lastActive/ping timestamp)
          const friendsChanged = (prev.friends || []).join(',') !== (liveProfile.friends || []).join(',');
          const friendReqChanged = (prev.friendRequests || []).length !== (liveProfile.friendRequests || []).length;
          const followersChanged = (prev.followers || []).length !== (liveProfile.followers || []).length;
          const followingChanged = (prev.following || []).length !== (liveProfile.following || []).length;
          const expChanged = prev.currentExperienceId !== liveProfile.currentExperienceId;
          const avatarColorsChanged = JSON.stringify(prev.avatarColors) !== JSON.stringify(liveProfile.avatarColors);
          const faceChanged = prev.selectedFaceId !== liveProfile.selectedFaceId;
          const shirtChanged = prev.shirtDataUrl !== liveProfile.shirtDataUrl;
          const pantsChanged = prev.pantsDataUrl !== liveProfile.pantsDataUrl;
          const hairChanged = prev.selectedHairId !== liveProfile.selectedHairId || prev.hairColor !== liveProfile.hairColor;

          if (
            !friendsChanged &&
            !friendReqChanged &&
            !followersChanged &&
            !followingChanged &&
            !expChanged &&
            !avatarColorsChanged &&
            !faceChanged &&
            !shirtChanged &&
            !pantsChanged &&
            !hairChanged
          ) {
            return prev;
          }

          if (avatarColorsChanged && liveProfile.avatarColors) setAvatarColors(liveProfile.avatarColors);
          if (faceChanged && liveProfile.selectedFaceId) setSelectedFaceId(liveProfile.selectedFaceId);
          if (shirtChanged && liveProfile.shirtDataUrl !== undefined) setShirtDataUrl(liveProfile.shirtDataUrl);
          if (pantsChanged && liveProfile.pantsDataUrl !== undefined) setPantsDataUrl(liveProfile.pantsDataUrl);
          if (hairChanged && liveProfile.selectedHairId) setSelectedHairId(liveProfile.selectedHairId);
          if (hairChanged && liveProfile.hairColor) setHairColor(liveProfile.hairColor);

          return liveProfile;
        });
      }
    });
    return () => unsub?.();
  }, [currentUser?.id]);

  // Dynamic Browser Tab Title Management
  useEffect(() => {
    if (viewingProfileUserId) {
      if (currentUser && viewingProfileUserId === currentUser.id) {
        document.title = `BoBlox | ${currentUser.username}`;
        return;
      }
      return;
    }

    if (currentView === 'playing') {
      document.title = 'BoBlox | In Game';
    } else if (currentView === 'game') {
      document.title = selectedExperience?.name ? `BoBlox | ${selectedExperience.name}` : 'BoBlox | Game';
    } else if (currentView === 'avatar') {
      document.title = 'BoBlox | Avatar';
    } else if (currentView === 'marketplace') {
      document.title = 'BoBlox | Marketplace';
    } else if (currentView === 'profile') {
      document.title = 'BoBlox | Profile';
    } else if (currentView === 'studio' || currentView === 'studio3d') {
      document.title = 'BoBlox | In Studio';
    } else {
      document.title = 'BoBlox';
    }
  }, [currentView, selectedExperience?.name, viewingProfileUserId, currentUser?.username, currentUser?.id]);

  // Tab visibility detection & tab close handler:
  // Detects if not in the tab or tab closed: leaves in-game session and marks offline
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is hidden or user switched away
        setCurrentView((prev) => (prev === 'playing' ? (selectedExperience ? 'game' : 'home') : prev));
        saveUserAvatarToFirestore(currentUser.id, {
          currentExperienceId: null,
          currentExperienceName: null,
          lastActive: 0, // marks offline
        });
      } else if (document.visibilityState === 'visible') {
        // Returned to tab: mark online
        saveUserAvatarToFirestore(currentUser.id, {
          lastActive: Date.now(),
        });
      }
    };

    const handleUnload = () => {
      saveUserAvatarToFirestore(currentUser.id, {
        currentExperienceId: null,
        currentExperienceName: null,
        lastActive: 0,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [currentUser?.id, selectedExperience]);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.avatarColors) setAvatarColors(user.avatarColors);
    if (user.selectedFaceId) setSelectedFaceId(user.selectedFaceId);
    if (user.shirtDataUrl) setShirtDataUrl(user.shirtDataUrl);
    if (user.pantsDataUrl) setPantsDataUrl(user.pantsDataUrl);
    if (user.selectedHairId) setSelectedHairId(user.selectedHairId);
    if (user.hairColor) setHairColor(user.hairColor);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      // ignore
    }
  };

  const handleLogout = () => {
    logoutFirebaseUser().catch(() => {});
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  };

  const handleUpdateAvatarColors = (newColors: AvatarColors) => {
    setAvatarColors(newColors);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColors));
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { avatarColors: newColors });
    }
  };

  const handleUpdateFaceId = (faceId: string) => {
    setSelectedFaceId(faceId);
    try {
      localStorage.setItem(FACE_STORAGE_KEY, faceId);
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { selectedFaceId: faceId });
    }
  };

  const handleUpdateShirt = (url: string | null) => {
    setShirtDataUrl(url);
    try {
      if (url) {
        localStorage.setItem(SHIRT_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(SHIRT_STORAGE_KEY);
      }
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { shirtDataUrl: url });
    }
  };

  const handleUpdatePants = (url: string | null) => {
    setPantsDataUrl(url);
    try {
      if (url) {
        localStorage.setItem(PANTS_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(PANTS_STORAGE_KEY);
      }
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { pantsDataUrl: url });
    }
  };

  const handleUpdateHair = (hairId: string) => {
    setSelectedHairId(hairId);
    try {
      localStorage.setItem(HAIR_STORAGE_KEY, hairId);
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { selectedHairId: hairId });
    }
  };

  const handleUpdateHairColor = (colorHex: string) => {
    setHairColor(colorHex);
    try {
      localStorage.setItem(HAIR_COLOR_STORAGE_KEY, colorHex);
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { hairColor: colorHex });
    }
  };

  const handleUpdateCustomHairObj = (objText: string | null) => {
    setCustomHairObj(objText);
    try {
      if (objText) {
        localStorage.setItem(HAIR_OBJ_STORAGE_KEY, objText);
      } else {
        localStorage.removeItem(HAIR_OBJ_STORAGE_KEY);
      }
    } catch (e) {
      // ignore
    }
    if (currentUser?.id) {
      saveUserAvatarToFirestore(currentUser.id, { customHairObj: objText });
    }
  };

  // Real-time experiences subscription from Firestore (cross-tab & multi-device sync)
  useEffect(() => {
    const unsub = subscribeExperiencesFromFirestore((remoteExps) => {
      const valid = (remoteExps || []).filter((e) => e && e.id && e.id !== 'exp-default-1');
      setExperiences(valid);
      saveExperiences(valid);
    });
    return () => unsub?.();
  }, []);

  // -------------------------------------------------------------
  // REAL EXPERIENCES MANAGEMENT (Persistent, Real Likes/Dislikes)
  // -------------------------------------------------------------
  const handleCreateNewExperience = (newExp: ExperienceData) => {
    const updated = [newExp, ...experiences];
    setExperiences(updated);
    saveExperiences(updated);
    setEditingExperience(newExp);
    setCurrentView('studio3d');

    const creatorUser: UserProfile = currentUser || {
      id: 'creator-' + Math.random().toString(36).substring(2, 8),
      username: 'Builder',
      email: 'builder@boblox.app',
      displayName: 'Builder',
      joinedDate: 'Joined Sep 2026',
      createdAt: Date.now(),
      lastActive: Date.now(),
      avatarColors,
      selectedFaceId,
      shirtDataUrl,
      pantsDataUrl,
      selectedHairId,
      hairColor,
      friends: [],
      friendRequests: [],
      followers: [],
      following: [],
    };
    saveExperienceToFirestore(newExp, creatorUser);
  };

  const handleSaveExperience = (updatedExp: ExperienceData, andPublish: boolean = false) => {
    const nextExp = {
      ...updatedExp,
      published: andPublish ? true : updatedExp.published,
      lastUpdated: Date.now(),
    };
    const updatedList = experiences.map((exp) => (exp.id === nextExp.id ? nextExp : exp));
    if (!updatedList.some((e) => e.id === nextExp.id)) {
      updatedList.unshift(nextExp);
    }
    setExperiences(updatedList);
    saveExperiences(updatedList);
    setEditingExperience(nextExp);
    if (selectedExperience?.id === nextExp.id) {
      setSelectedExperience(nextExp);
    }

    const creatorUser: UserProfile = currentUser || {
      id: 'creator-' + Math.random().toString(36).substring(2, 8),
      username: 'Builder',
      email: 'builder@boblox.app',
      displayName: 'Builder',
      joinedDate: 'Joined Sep 2026',
      createdAt: Date.now(),
      lastActive: Date.now(),
      avatarColors,
      selectedFaceId,
      shirtDataUrl,
      pantsDataUrl,
      selectedHairId,
      hairColor,
      friends: [],
      friendRequests: [],
      followers: [],
      following: [],
    };
    saveExperienceToFirestore(nextExp, creatorUser);
  };

  const handleSaveAndExitStudio = (updatedExp: ExperienceData) => {
    handleSaveExperience(updatedExp, false);
    setCurrentView('studio');
    setEditingExperience(null);
  };

  const handleOpenStudioForExperience = (exp: ExperienceData) => {
    setEditingExperience(exp);
    setCurrentView('studio3d');
  };

  const handleDeleteExperience = async (expId: string) => {
    const nextList = experiences.filter((e) => e.id !== expId);
    setExperiences(nextList);
    saveExperiences(nextList);
    if (selectedExperience?.id === expId) setSelectedExperience(null);
    await deleteExperienceFromFirestore(expId);
  };

  const handleResetAllExperiences = async () => {
    const cleanList = resetAllSavedExperiences();
    setExperiences(cleanList);
    setSelectedExperience(null);
    await deleteAllExperiencesFromFirestore();
  };

  // Real Likes & Dislikes handler for the game screen
  const handleToggleLike = (expId: string) => {
    setExperiences((prev) => {
      const next = prev.map((exp) => {
        if (exp.id !== expId) return exp;
        const currentLiked = exp.userLiked;
        let newLikes = exp.likes || 0;
        let newDislikes = exp.dislikes || 0;
        let nextUserLiked: 'like' | 'dislike' | null = null;

        if (currentLiked === 'like') {
          newLikes = Math.max(0, newLikes - 1);
          nextUserLiked = null;
        } else {
          if (currentLiked === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
          newLikes += 1;
          nextUserLiked = 'like';
        }

        const updated = {
          ...exp,
          likes: newLikes,
          dislikes: newDislikes,
          userLiked: nextUserLiked,
        };
        if (selectedExperience?.id === exp.id) setSelectedExperience(updated);
        return updated;
      });
      saveExperiences(next);
      return next;
    });
  };

  const handleToggleDislike = (expId: string) => {
    setExperiences((prev) => {
      const next = prev.map((exp) => {
        if (exp.id !== expId) return exp;
        const currentLiked = exp.userLiked;
        let newLikes = exp.likes || 0;
        let newDislikes = exp.dislikes || 0;
        let nextUserLiked: 'like' | 'dislike' | null = null;

        if (currentLiked === 'dislike') {
          newDislikes = Math.max(0, newDislikes - 1);
          nextUserLiked = null;
        } else {
          if (currentLiked === 'like') newLikes = Math.max(0, newLikes - 1);
          newDislikes += 1;
          nextUserLiked = 'dislike';
        }

        const updated = {
          ...exp,
          likes: newLikes,
          dislikes: newDislikes,
          userLiked: nextUserLiked,
        };
        if (selectedExperience?.id === exp.id) setSelectedExperience(updated);
        return updated;
      });
      saveExperiences(next);
      return next;
    });
  };

  const handleToggleFavorite = (expId: string) => {
    setExperiences((prev) => {
      const next = prev.map((exp) => {
        if (exp.id !== expId) return exp;
        const isFav = exp.userFavorited;
        let newFavs = exp.favorites || 0;
        let nextFav = false;

        if (isFav) {
          newFavs = Math.max(0, newFavs - 1);
          nextFav = false;
        } else {
          newFavs += 1;
          nextFav = true;
        }

        const updated = {
          ...exp,
          favorites: newFavs,
          userFavorited: nextFav,
        };
        if (selectedExperience?.id === exp.id) setSelectedExperience(updated);
        return updated;
      });
      saveExperiences(next);
      return next;
    });
  };

  const filteredExperiences = experiences.filter((exp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      exp.name.toLowerCase().includes(q) ||
      (exp.description && exp.description.toLowerCase().includes(q))
    );
  });

  const handleOpenGameDetail = (exp: ExperienceData) => {
    setSelectedExperience(exp);
    setCurrentView('game');
  };

  const handleGoHome = () => {
    setSelectedExperience(null);
    setCurrentView('home');
  };

  const handleOpenAvatar = () => {
    setCurrentView('avatar');
  };

  const handleOpenProfile = (uid?: string) => {
    const targetUid = uid || currentUser?.id || '';
    setViewingProfileUserId(targetUid);
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Launch into the full-screen 3D Baseplate
  const handlePlayClick = () => {
    // Increment visit count for real
    if (selectedExperience) {
      setExperiences((prev) => {
        const next = prev.map((exp) =>
          exp.id === selectedExperience.id ? { ...exp, visits: (exp.visits || 0) + 1 } : exp
        );
        saveExperiences(next);
        return next;
      });
    }
    setCurrentView('playing');
  };

  const handleLeaveBaseplate = () => {
    if (selectedExperience) {
      setCurrentView('game');
    } else {
      setCurrentView('home');
    }
  };

  return (
    <>
      {!currentUser ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <div className="min-h-screen bg-[#0c0915] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
          {/* ===================== FULL SCREEN 3D BASEPLATE GAME ===================== */}
          {currentView === 'playing' ? (
            <BaseplateGame
              onLeaveGame={handleLeaveBaseplate}
              avatarColors={avatarColors}
              selectedFaceId={selectedFaceId}
              shirtDataUrl={shirtDataUrl}
              pantsDataUrl={pantsDataUrl}
              selectedAccessoryId={selectedAccessoryId}
              selectedHairId={selectedHairId}
              hairColor={hairColor}
              customHairObj={customHairObj}
              experience={selectedExperience}
              currentUser={currentUser}
              onOpenProfile={(uid) => setViewingProfileUserId(uid)}
            />
          ) : currentView === 'studio3d' && editingExperience ? (
            /* ===================== FULL SCREEN 3D BOBLOX STUDIO ===================== */
            <BoBloxStudio3D
              experience={editingExperience}
              onSaveExperience={handleSaveExperience}
              onSaveAndExit={handleSaveAndExitStudio}
              onCloseWithoutSaving={() => {
                setCurrentView('studio');
                setEditingExperience(null);
              }}
              avatarColors={avatarColors}
              selectedFaceId={selectedFaceId}
              shirtDataUrl={shirtDataUrl}
              pantsDataUrl={pantsDataUrl}
              selectedHairId={selectedHairId}
              hairColor={hairColor}
              customHairObj={customHairObj}
              selectedAccessoryId={selectedAccessoryId}
            />
          ) : (
            <>
              {/* Top Navigation Bar */}
              <header className="sticky top-0 z-40 h-14 bg-[#120e22]/95 backdrop-blur-md border-b border-purple-500/15 px-4 flex items-center justify-between gap-4">
                {/* Left: Menu toggle & Uploaded Logo ONLY */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setSidebarOpen((prev) => !prev)}
                    aria-label="Toggle Navigation Sidebar"
                    className="p-2 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleGoHome}
                    className="flex items-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg p-0.5 group"
                    title="BoBlox Home"
                  >
                    <img
                      src={logoImg}
                      alt="BoBlox Logo"
                      className="h-8 sm:h-9 md:h-10 w-auto max-w-[150px] object-contain select-none transition-transform duration-200 group-hover:scale-105"
                    />
                  </button>
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 max-w-xl mx-auto hidden sm:block">
                  <div className="relative">
                    <Search className="w-4 h-4 text-purple-400/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search experiences &amp; places..."
                      className="w-full h-9 pl-10 pr-4 rounded-lg bg-[#19132e] border border-purple-500/20 text-sm text-slate-100 placeholder-purple-400/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Welcome greeting, Real 3D Avatar Profile Icon, Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Prominent Welcome, {username} at top - clickable to open own profile */}
                  <button
                    onClick={() => handleOpenProfile(currentUser.id)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-900/40 border border-purple-500/30 text-xs sm:text-sm shadow-inner shrink-0 hover:bg-purple-800/50 transition-colors cursor-pointer group"
                    title="View My Profile"
                  >
                    <span className="text-purple-300 font-normal hidden xs:inline">Welcome,</span>
                    <span className="font-extrabold text-white tracking-wide group-hover:text-purple-200 flex items-center gap-1">
                      <span>{currentUser.username}</span>
                      {isVerifiedUser(currentUser.username) && <VerifiedBadge username={currentUser.username} size="sm" />}
                    </span>
                  </button>

                  {/* Real 3D Avatar Profile Pill - clickable to open own profile */}
                  <button
                    onClick={() => handleOpenProfile(currentUser.id)}
                    className="flex items-center gap-2 px-2 sm:px-2.5 py-1 rounded-lg bg-[#18112e] border border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-900/30 transition-all cursor-pointer"
                    title="View My Profile"
                  >
                    <AvatarProfileIcon
                      colors={avatarColors}
                      selectedFaceId={selectedFaceId}
                      shirtDataUrl={shirtDataUrl}
                      pantsDataUrl={pantsDataUrl}
                      selectedHairId={selectedHairId}
                      hairColor={hairColor}
                      customHairObj={customHairObj}
                      selectedAccessoryId={selectedAccessoryId}
                      size={28}
                      shape="circle"
                      border={false}
                      framing="bust"
                    />
                    <span className="text-xs font-bold text-white max-w-[85px] truncate hidden md:inline">
                      {currentUser.displayName}
                    </span>
                  </button>

                  {/* Marketplace Button */}
                  <button
                    onClick={() => setCurrentView('marketplace')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentView === 'marketplace'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                        : 'bg-purple-950/40 border-purple-500/20 text-purple-200 hover:text-white hover:bg-purple-900/50'
                    }`}
                    title="Open Marketplace"
                  >
                    <ShoppingBag className="w-4 h-4 text-purple-300" />
                    <span className="hidden sm:inline">Market</span>
                  </button>

                  {/* Studio Button */}
                  <button
                    onClick={() => setCurrentView('studio')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold hidden sm:flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentView === 'studio'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                        : 'bg-purple-950/40 border-purple-500/20 text-purple-200 hover:text-white hover:bg-purple-900/50'
                    }`}
                    title="Open BoBlox Studio"
                  >
                    <Boxes className="w-4 h-4 text-purple-300" />
                    <span>Studio</span>
                  </button>

                  {/* Avatar Button */}
                  <button
                    onClick={handleOpenAvatar}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold hidden sm:flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentView === 'avatar'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                        : 'bg-purple-950/40 border-purple-500/20 text-purple-200 hover:text-white hover:bg-purple-900/50'
                    }`}
                    title="Open Avatar Editor"
                  >
                    <UserIcon className="w-4 h-4 text-purple-300" />
                    <span>Avatar</span>
                  </button>

                  {/* Settings Button */}
                  <button
                    onClick={() => setShowSettings(true)}
                    aria-label="Settings"
                    className="p-1.5 sm:p-2 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Log Out Button */}
                  <button
                    onClick={handleLogout}
                    aria-label="Log Out"
                    className="p-1.5 sm:p-2 rounded-lg text-purple-400 hover:text-red-300 hover:bg-red-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Friends Top Bar (Multiplayer Friends, User Search, Active In-Game Status) */}
              <FriendsTopBar
                currentUser={currentUser}
                onOpenProfile={(uid) => handleOpenProfile(uid)}
                onJoinGame={(expId) => {
                  const exp: ExperienceData = experiences.find((e) => e.id === expId) || {
                    id: expId,
                    name: 'Friend Experience',
                    description: 'Joined friend world',
                    createdAt: Date.now(),
                    lastUpdated: Date.now(),
                    published: true,
                    visits: 1,
                    likes: 0,
                    dislikes: 0,
                    favorites: 0,
                    parts: [],
                  };
                  setSelectedExperience(exp);
                  setCurrentView('playing');
                }}
              />

              {/* Main Layout: Sidebar + View Content */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Drawer Overlay Backdrop */}
                {sidebarOpen && (
                  <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs md:hidden"
                  />
                )}

                {/* Left Sidebar: Off-canvas drawer on mobile (< md), aside on desktop (md+) */}
                <aside
                  className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto bg-[#0f0b1d] border-r border-purple-500/15 transition-all duration-300 flex flex-col ${
                    sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
                  }`}
                >
                  <div className="p-3 space-y-1.5">
                    {/* Home Link */}
                    <button
                      onClick={() => {
                        handleGoHome();
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        sidebarOpen ? 'justify-start' : 'justify-center'
                      } ${
                        currentView === 'home'
                          ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/30'
                          : 'text-purple-300/80 hover:text-white hover:bg-purple-950/40'
                      }`}
                    >
                      <HomeIcon className="w-5 h-5 text-purple-400 shrink-0" />
                      {sidebarOpen && <span>Home</span>}
                    </button>

                    {/* Profile Link */}
                    <button
                      onClick={() => {
                        handleOpenProfile(currentUser.id);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        sidebarOpen ? 'justify-start' : 'justify-center'
                      } ${
                        currentView === 'profile' && (!viewingProfileUserId || viewingProfileUserId === currentUser.id)
                          ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/30'
                          : 'text-purple-300/80 hover:text-white hover:bg-purple-950/40'
                      }`}
                      title="Open Profile Page"
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <AvatarProfileIcon
                          colors={avatarColors}
                          selectedFaceId={selectedFaceId}
                          shirtDataUrl={shirtDataUrl}
                          pantsDataUrl={pantsDataUrl}
                          selectedHairId={selectedHairId}
                          hairColor={hairColor}
                          customHairObj={customHairObj}
                          selectedAccessoryId={selectedAccessoryId}
                          size={22}
                          shape="circle"
                          border={false}
                          framing="bust"
                        />
                      </div>
                      {sidebarOpen && <span>Profile</span>}
                    </button>

                    {/* Marketplace Link */}
                    <button
                      onClick={() => {
                        setCurrentView('marketplace');
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        sidebarOpen ? 'justify-start' : 'justify-center'
                      } ${
                        currentView === 'marketplace'
                          ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/30'
                          : 'text-purple-300/80 hover:text-white hover:bg-purple-950/40'
                      }`}
                      title="Open Marketplace"
                    >
                      <ShoppingBag className="w-5 h-5 text-purple-400 shrink-0" />
                      {sidebarOpen && (
                        <div className="flex items-center justify-between w-full">
                          <span>Marketplace</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                            FREE
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Avatar Viewer Link */}
                    <button
                      onClick={() => {
                        handleOpenAvatar();
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        sidebarOpen ? 'justify-start' : 'justify-center'
                      } ${
                        currentView === 'avatar'
                          ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/30'
                          : 'text-purple-300/80 hover:text-white hover:bg-purple-950/40'
                      }`}
                    >
                      <UserIcon className="w-5 h-5 text-purple-400 shrink-0" />
                      {sidebarOpen && <span>Avatar</span>}
                    </button>

                    {/* BoBlox Studio Link */}
                    <button
                      onClick={() => {
                        setCurrentView('studio');
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        sidebarOpen ? 'justify-start' : 'justify-center'
                      } ${
                        currentView === 'studio'
                          ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/30'
                          : 'text-purple-300/80 hover:text-white hover:bg-purple-950/40'
                      }`}
                      title="Open BoBlox Studio"
                    >
                      <Boxes className="w-5 h-5 text-purple-400 shrink-0" />
                      {sidebarOpen && (
                        <div className="flex items-center justify-between w-full">
                          <span>BoBlox Studio</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 font-bold">
                            HUB
                          </span>
                        </div>
                      )}
                    </button>
                  </div>

                  {sidebarOpen && (
                    <div className="mt-auto p-4 border-t border-purple-500/10 text-xs text-purple-400/50">
                      <p className="font-semibold text-purple-300/80 mb-0.5">BoBlox</p>
                      <p>Clean 3D Sandbox</p>
                    </div>
                  )}
                </aside>

                {/* Content Views */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                  {/* ===================== 1. HOME SCREEN ===================== */}
                  {currentView === 'home' && (
                    <div>
                      {/* Roblox Header Welcome Card with Real 3D Avatar Profile Icon */}
                      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#21153d] via-[#1a1233] to-[#120d24] border border-purple-500/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div
                          onClick={() => handleOpenProfile(currentUser.id)}
                          className="flex items-center gap-4 cursor-pointer group"
                          title="View your Profile Page"
                        >
                          <AvatarProfileIcon
                            colors={avatarColors}
                            selectedFaceId={selectedFaceId}
                            shirtDataUrl={shirtDataUrl}
                            pantsDataUrl={pantsDataUrl}
                            selectedHairId={selectedHairId}
                            hairColor={hairColor}
                            customHairObj={customHairObj}
                            selectedAccessoryId={selectedAccessoryId}
                            size={68}
                            shape="rounded"
                            border={true}
                            framing="bust"
                          />
                          <div>
                            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight flex items-center gap-2 group-hover:text-purple-200 transition-colors">
                              <span>Welcome, {currentUser.username}</span>
                              {isVerifiedUser(currentUser.username) && <VerifiedBadge username={currentUser.username} size="md" />}
                            </h1>
                            <p className="text-purple-300/80 text-xs sm:text-sm mt-0.5">
                              Explore your published experiences, view your profile, or build in BoBlox Studio.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => setCurrentView('studio')}
                            className="px-3.5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Boxes className="w-3.5 h-3.5 text-purple-400" />
                            <span>BoBlox Studio</span>
                          </button>
                          <button
                            onClick={handleOpenAvatar}
                            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <UserIcon className="w-3.5 h-3.5" />
                            <span>Customize Avatar</span>
                          </button>
                        </div>
                      </div>

                      {/* Experiences Grid */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-purple-500/15 pb-3">
                          <div>
                            <h2 className="text-xl font-display font-bold text-white tracking-tight">
                              Experiences
                            </h2>
                            <p className="text-xs text-purple-300/70">
                              Explore user-created 3D baseplates and worlds with authentic physics.
                            </p>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/30">
                            {filteredExperiences.length} experiences
                          </span>
                        </div>

                        {filteredExperiences.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                            {filteredExperiences.map((exp) => (
                              <div
                                key={exp.id}
                                onClick={() => handleOpenGameDetail(exp)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    handleOpenGameDetail(exp);
                                  }
                                }}
                                className="group flex flex-col text-left rounded-xl bg-[#16102a] hover:bg-[#1f163b] border border-purple-500/20 hover:border-purple-400/50 transition-all duration-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-lg hover:shadow-purple-950/50 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              >
                                <div className="aspect-[16/9] w-full bg-gradient-to-br from-[#251b47] to-[#120c24] flex flex-col items-center justify-center p-4 relative group-hover:scale-105 transition-transform duration-300">
                                  <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center mb-1 group-hover:bg-purple-600/30 group-hover:border-purple-400 transition-colors shadow-inner">
                                    <Boxes className="w-6 h-6 text-purple-300" />
                                  </div>

                                  {/* Staff Moderation Quick Delete on Card */}
                                  {isStaffUser(currentUser.username) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`[Moderation] Delete experience "${exp.name}"?`)) {
                                          handleDeleteExperience(exp.id);
                                        }
                                      }}
                                      className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white z-20 shadow-md transition-colors cursor-pointer"
                                      title="Delete Game (BoBlox Moderation)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Last Updated badge */}
                                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-purple-200 border border-white/10">
                                    <Clock className="w-3 h-3 text-purple-400" />
                                    <span>{formatTimeAgo(exp.lastUpdated)}</span>
                                  </div>

                                  <div className="absolute inset-0 bg-purple-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 transform scale-75 group-hover:scale-100 transition-transform">
                                      <Play className="w-4 h-4 fill-white ml-0.5" />
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3.5 space-y-1">
                                  <p className="font-bold text-sm text-white truncate group-hover:text-purple-200 transition-colors">
                                    {exp.name}
                                  </p>
                                  <div className="flex items-center gap-1 text-[11px] text-purple-300/80 truncate">
                                    <span>By</span>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenProfile(exp.creatorId || currentUser.id);
                                      }}
                                      className="font-semibold hover:text-white hover:underline cursor-pointer"
                                    >
                                      {exp.creatorUsername || 'Builder'}
                                    </span>
                                    {isVerifiedUser(exp.creatorUsername) && <VerifiedBadge username={exp.creatorUsername} size="sm" />}
                                  </div>
                                  <p className="text-[11px] text-purple-300/70 line-clamp-1">
                                    {exp.description || 'Custom Sandbox World'}
                                  </p>
                                  <div className="flex items-center justify-between text-[11px] text-purple-400/60 pt-1 font-mono">
                                    <span>{exp.parts?.length || 0} Parts</span>
                                    <span>{exp.likes || 0} Likes</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 rounded-2xl bg-[#16102c]/50 border border-purple-500/20 text-center space-y-3">
                            <Boxes className="w-10 h-10 text-purple-400/50 mx-auto" />
                            <h3 className="font-bold text-base text-white">No experiences created yet</h3>
                            <p className="text-xs text-purple-300/60 max-w-sm mx-auto">
                              Head over to BoBlox Studio to build and publish your first custom 3D sandbox world!
                            </p>
                            <button
                              onClick={() => setCurrentView('studio')}
                              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              Open BoBlox Studio
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ===================== 2. GAME DETAIL SCREEN ===================== */}
                  {currentView === 'game' && selectedExperience && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-xs text-purple-300/80">
                        <button
                          onClick={handleGoHome}
                          className="hover:text-white hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <HomeIcon className="w-3.5 h-3.5" />
                          <span>Home</span>
                        </button>
                        <span>/</span>
                        <span className="text-purple-100 font-semibold">{selectedExperience.name}</span>
                      </div>

                      <div className="rounded-2xl bg-[#17102d] border border-purple-500/20 overflow-hidden shadow-2xl">
                        <div className="aspect-[16/9] w-full max-h-[460px] bg-gradient-to-br from-[#2a1d4f] via-[#1c1236] to-[#0f0920] flex flex-col items-center justify-center p-8 relative">
                          <div className="text-center space-y-4 max-w-md z-10">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-tight drop-shadow-md">
                              {selectedExperience.name}
                            </h1>
                            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
                              {selectedExperience.description || 'Custom 3D Baseplate sandbox. Click play to enter the world with your avatar!'}
                            </p>
                          </div>

                          <div className="pt-6 z-10 flex items-center gap-3">
                            <button
                              onClick={handlePlayClick}
                              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-display font-black text-lg tracking-wide shadow-xl shadow-purple-900/60 hover:shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer group"
                            >
                              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </div>
                              <span>Play Experience</span>
                            </button>

                            <button
                              onClick={() => handleOpenStudioForExperience(selectedExperience)}
                              className="px-6 py-4 rounded-2xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 text-purple-200 hover:text-white font-display font-bold text-sm tracking-wide shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                              <span>Edit in Studio</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-6 bg-[#130d26] border-t border-purple-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-display font-black text-white tracking-tight">
                              {selectedExperience.name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-purple-300/70 mt-1 font-mono">
                              <span className="flex items-center gap-1">
                                <span>By</span>
                                <span
                                  onClick={() => handleOpenProfile(selectedExperience.creatorId || currentUser.id)}
                                  className="font-semibold text-purple-200 hover:text-white hover:underline cursor-pointer"
                                >
                                  {selectedExperience.creatorUsername || currentUser.username}
                                </span>
                                {isOwnerUser(selectedExperience.creatorUsername || currentUser.username) && (
                                  <VerifiedBadge size="sm" />
                                )}
                              </span>
                              <span>&bull;</span>
                              <span>Last updated: {formatTimeAgo(selectedExperience.lastUpdated)}</span>
                              <span>&bull;</span>
                              <span>{selectedExperience.visits || 0} Visits</span>
                            </div>
                          </div>

                          {/* Real Likes, Dislikes & Owner Moderation Delete */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Owner Moderation Delete Experience */}
                            {isOwnerUser(currentUser.username) && (
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `[Owner Moderation] Are you sure you want to permanently delete "${selectedExperience.name}" from BoBlox?`
                                    )
                                  ) {
                                    await handleDeleteExperience(selectedExperience.id);
                                    handleGoHome();
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-900/40 transition-colors cursor-pointer"
                                title="Delete this game as BoBlox Owner"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Game (Owner)</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleLike(selectedExperience.id)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                selectedExperience.userLiked === 'like'
                                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-purple-950/40 border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-900/40'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>{selectedExperience.likes || 0}</span>
                            </button>

                            <button
                              onClick={() => handleToggleDislike(selectedExperience.id)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                selectedExperience.userLiked === 'dislike'
                                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-purple-950/40 border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-900/40'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>{selectedExperience.dislikes || 0}</span>
                            </button>

                            <button
                              onClick={() => handleToggleFavorite(selectedExperience.id)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                selectedExperience.userFavorited
                                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-md'
                                  : 'bg-purple-950/40 border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-900/40'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${selectedExperience.userFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                              <span>{selectedExperience.favorites || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===================== 3. AVATAR VIEWER SCREEN ===================== */}
                  {currentView === 'avatar' && (
                    <AvatarViewer
                      onBackToHome={handleGoHome}
                      username={currentUser.username}
                      colors={avatarColors}
                      onChangeColors={handleUpdateAvatarColors}
                      selectedFaceId={selectedFaceId}
                      onSelectFace={handleUpdateFaceId}
                      shirtDataUrl={shirtDataUrl}
                      onSelectShirt={handleUpdateShirt}
                      pantsDataUrl={pantsDataUrl}
                      onSelectPants={handleUpdatePants}
                      selectedHairId={selectedHairId}
                      onSelectHair={handleUpdateHair}
                      hairColor={hairColor}
                      onChangeHairColor={handleUpdateHairColor}
                      customHairObj={customHairObj}
                      onUploadCustomHairObj={handleUpdateCustomHairObj}
                    />
                  )}

                  {/* ===================== 4. BOBLOX STUDIO HUB ===================== */}
                  {currentView === 'studio' && (
                    <BoBloxStudio
                      currentUser={currentUser}
                      avatarColors={avatarColors}
                      selectedFaceId={selectedFaceId}
                      shirtDataUrl={shirtDataUrl}
                      pantsDataUrl={pantsDataUrl}
                      experiences={experiences}
                      onCreateExperience={handleCreateNewExperience}
                      onEditExperienceInStudio={handleOpenStudioForExperience}
                      onPlayExperience={(exp) => {
                        setSelectedExperience(exp);
                        setCurrentView('playing');
                      }}
                      onDeleteExperience={handleDeleteExperience}
                      onResetAllExperiences={handleResetAllExperiences}
                      onOpenAvatarEditor={handleOpenAvatar}
                      onBackToHome={handleGoHome}
                      onSelectShirt={handleUpdateShirt}
                      onSelectPants={handleUpdatePants}
                    />
                  )}

                  {/* ===================== 5. CLOTHING MARKETPLACE ===================== */}
                  {currentView === 'marketplace' && (
                    <Marketplace
                      currentUser={currentUser}
                      avatarColors={avatarColors}
                      selectedFaceId={selectedFaceId}
                      shirtDataUrl={shirtDataUrl}
                      pantsDataUrl={pantsDataUrl}
                      selectedHairId={selectedHairId}
                      hairColor={hairColor}
                      customHairObj={customHairObj}
                      onEquipShirt={handleUpdateShirt}
                      onEquipPants={handleUpdatePants}
                      onOpenAvatarEditor={handleOpenAvatar}
                      onOpenStudio={() => setCurrentView('studio')}
                      onNavigateToUserProfile={(uid) => handleOpenProfile(uid)}
                    />
                  )}

                  {/* ===================== 6. USER PROFILE PAGE (FULL PAGE ON RIGHT, SIDEBAR ON LEFT) ===================== */}
                  {currentView === 'profile' && (
                    <ProfilePage
                      userId={viewingProfileUserId || currentUser.id}
                      currentUserId={currentUser.id}
                      currentUserProfile={currentUser}
                      onOpenAvatarEditor={handleOpenAvatar}
                      onOpenStudio={() => setCurrentView('studio')}
                      onOpenMarketplace={() => setCurrentView('marketplace')}
                      onPlayExperience={(exp) => {
                        setSelectedExperience(exp);
                        setCurrentView('playing');
                      }}
                      allExperiences={experiences}
                      onEquipShirt={handleUpdateShirt}
                      onEquipPants={handleUpdatePants}
                      onNavigateToUser={(uid) => handleOpenProfile(uid)}
                    />
                  )}
                </main>
              </div>

              {/* Mobile Bottom Navigation Bar (Auto-adjusts for mobile devices) */}
              <nav aria-label="Mobile Navigation" className="md:hidden sticky bottom-0 z-40 h-16 bg-[#120e22]/98 backdrop-blur-md border-t border-purple-500/20 px-2 flex items-center justify-around shadow-2xl">
                <button
                  onClick={() => {
                    handleGoHome();
                    setSidebarOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'home' ? 'text-purple-300 font-bold' : 'text-purple-400/60 hover:text-purple-200'
                  }`}
                >
                  <HomeIcon className="w-5 h-5" />
                  <span className="text-[10px]">Home</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('marketplace');
                    setSidebarOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'marketplace' ? 'text-purple-300 font-bold' : 'text-purple-400/60 hover:text-purple-200'
                  }`}
                >
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5" />
                  </div>
                  <span className="text-[10px]">Market</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('studio');
                    setSidebarOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'studio' ? 'text-purple-300 font-bold' : 'text-purple-400/60 hover:text-purple-200'
                  }`}
                >
                  <Boxes className="w-5 h-5" />
                  <span className="text-[10px]">Studio</span>
                </button>

                <button
                  onClick={() => {
                    handleOpenAvatar();
                    setSidebarOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'avatar' ? 'text-purple-300 font-bold' : 'text-purple-400/60 hover:text-purple-200'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-[10px]">Avatar</span>
                </button>

                <button
                  onClick={() => {
                    handleOpenProfile(currentUser.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'profile' && (!viewingProfileUserId || viewingProfileUserId === currentUser.id)
                      ? 'text-purple-300 font-bold'
                      : 'text-purple-400/60 hover:text-purple-200'
                  }`}
                >
                  <AvatarProfileIcon
                    colors={avatarColors}
                    selectedFaceId={selectedFaceId}
                    shirtDataUrl={shirtDataUrl}
                    pantsDataUrl={pantsDataUrl}
                    size={22}
                    shape="circle"
                    border={false}
                    framing="bust"
                  />
                  <span className="text-[10px]">Profile</span>
                </button>
              </nav>

              {/* Settings Modal */}
              {showSettings && (
                <div
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
                  onClick={() => setShowSettings(false)}
                >
                  <div
                    className="w-full max-w-sm bg-[#181230] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setShowSettings(false)}
                      className="absolute right-4 top-4 p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/40 transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <h3 className="font-display font-bold text-lg text-white mb-2">
                      BoBlox Settings
                    </h3>
                    <p className="text-xs text-purple-300/70 mb-4">
                      Minimalist Purple Edition
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between text-xs">
                        <span className="text-purple-200">Theme Scheme</span>
                        <span className="font-semibold text-purple-400">Deep Purple</span>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between text-xs">
                        <span className="text-purple-200">Current View</span>
                        <span className="font-semibold text-purple-400 capitalize">{currentView}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowSettings(false)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
