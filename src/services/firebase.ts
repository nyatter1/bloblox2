import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocFromServer,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { AvatarColors } from '../components/AvatarViewer';
import { ExperienceData, StudioPart } from '../types/experience';

export const firebaseConfig = {
  apiKey: "AIzaSyDm4F52YC9eSBsE_xXZIr9fMNJhZBsnFfA",
  authDomain: "boblox-4759c.firebaseapp.com",
  projectId: "boblox-4759c",
  storageBucket: "boblox-4759c.firebasestorage.app",
  messagingSenderId: "434107737685",
  appId: "1:434107737685:web:e8f005a4c698d00c0d96dc",
  measurementId: "G-P4FHCMR9JW"
};

// Initialize App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Error handling as required by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// Test Connection on Boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connection.");
    }
  }
}
testConnection();

// User Profile Interface
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  joinedDate: string;
  createdAt: number;
  lastActive: number;
  currentExperienceId?: string | null;
  currentExperienceName?: string | null;
  avatarColors?: AvatarColors;
  selectedFaceId?: string;
  selectedAccessoryId?: string;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  friends: string[]; // List of user UIDs
  friendRequests: { fromUid: string; fromUsername: string; timestamp: number }[];
  followers: string[]; // List of user UIDs
  following: string[]; // List of user UIDs
  bio?: string;
}

// Live In-Game Player Presence
export interface LivePlayerPresence {
  userId: string;
  username: string;
  position: [number, number, number];
  rotationY: number;
  isMoving: boolean;
  isJumping?: boolean;
  avatarColors: AvatarColors;
  selectedFaceId: string;
  selectedAccessoryId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  currentChat?: { message: string; timestamp: number } | null;
  lastPing: number;
}

// Live Chat Message
export interface LiveChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  timestamp: number;
}

// Helper to convert BoBlox username into a valid email
export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${clean}@boblox.app`;
}

// -------------------------------------------------------------
// AUTH & USER SERVICES
// -------------------------------------------------------------
export async function registerFirebaseUser(
  username: string,
  pass: string,
  initialAvatar?: {
    colors?: AvatarColors;
    faceId?: string;
    shirtUrl?: string | null;
    pantsUrl?: string | null;
    hairId?: string;
    hairColor?: string;
  }
): Promise<UserProfile> {
  const cleanUsername = username.trim();
  const email = usernameToEmail(cleanUsername);

  // 1. Create Auth user (Firebase Auth securely validates and enforces uniqueness)
  let userCred;
  try {
    userCred = await createUserWithEmailAndPassword(auth, email, pass);
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('This username is already taken. Please choose another or Log In.');
    }
    throw err;
  }

  const uid = userCred.user.uid;

  try {
    await updateProfile(userCred.user, { displayName: cleanUsername });
  } catch {
    // Non-fatal
  }

  const now = Date.now();
  const joinedDate = `Joined ${new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;

  const profile: UserProfile = {
    id: uid,
    username: cleanUsername,
    email,
    displayName: cleanUsername,
    joinedDate,
    createdAt: now,
    lastActive: now,
    avatarColors: initialAvatar?.colors || {
      head: '#8A929E',
      torso: '#8A929E',
      leftArm: '#8A929E',
      rightArm: '#8A929E',
      leftLeg: '#8A929E',
      rightLeg: '#8A929E',
    },
    selectedFaceId: initialAvatar?.faceId || 'classic-smile',
    selectedAccessoryId: 'none',
    selectedHairId: initialAvatar?.hairId || 'none',
    hairColor: initialAvatar?.hairColor || '#4a2e1b',
    shirtDataUrl: initialAvatar?.shirtUrl || null,
    pantsDataUrl: initialAvatar?.pantsUrl || null,
    friends: [],
    friendRequests: [],
    followers: [],
    following: [],
  };

  try {
    await setDoc(doc(db, 'users', uid), profile);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  return profile;
}

export async function loginFirebaseUser(identifier: string, pass: string): Promise<UserProfile> {
  let email = identifier.trim();
  if (!email.includes('@')) {
    email = usernameToEmail(email);
  }

  const userCred = await signInWithEmailAndPassword(auth, email, pass);
  const uid = userCred.user.uid;

  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    const profile = userDoc.data() as UserProfile;
    // update lastActive
    updateDoc(doc(db, 'users', uid), { lastActive: Date.now() }).catch(() => {});
    return profile;
  }

  // Fallback if auth exists but profile doc was missing
  const fallbackProfile: UserProfile = {
    id: uid,
    username: userCred.user.displayName || identifier.split('@')[0],
    email,
    displayName: userCred.user.displayName || identifier.split('@')[0],
    joinedDate: 'Joined Sep 2026',
    createdAt: Date.now(),
    lastActive: Date.now(),
    friends: [],
    friendRequests: [],
    followers: [],
    following: [],
  };
  await setDoc(doc(db, 'users', uid), fallbackProfile);
  return fallbackProfile;
}

export async function logoutFirebaseUser() {
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        currentExperienceId: null,
        currentExperienceName: null,
        lastActive: Date.now(),
      });
    } catch {
      // ignore
    }
  }
  await signOut(auth);
}

export function subscribeUserProfile(userId: string, callback: (profile: UserProfile | null) => void) {
  return onSnapshot(
    doc(db, 'users', userId),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }
  );
}

export async function saveUserAvatarToFirestore(userId: string, avatarData: Partial<UserProfile>) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...avatarData,
      lastActive: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// -------------------------------------------------------------
// SOCIAL: FRIENDS, FOLLOWERS, USER SEARCH
// -------------------------------------------------------------
export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  if (!searchTerm.trim()) return [];
  try {
    const clean = searchTerm.trim().toLowerCase();
    const snap = await getDocs(collection(db, 'users'));
    const allUsers = snap.docs.map((d) => d.data() as UserProfile);
    return allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(clean) ||
        (u.displayName && u.displayName.toLowerCase().includes(clean))
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

export async function sendFriendRequest(fromUser: UserProfile, targetUserId: string) {
  if (fromUser.id === targetUserId) return;
  try {
    const targetRef = doc(db, 'users', targetUserId);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) return;
    const targetData = targetSnap.data() as UserProfile;

    // Already friends?
    if (targetData.friends?.includes(fromUser.id)) return;

    // Already has pending request?
    const hasRequest = targetData.friendRequests?.some((r) => r.fromUid === fromUser.id);
    if (hasRequest) return;

    await updateDoc(targetRef, {
      friendRequests: arrayUnion({
        fromUid: fromUser.id,
        fromUsername: fromUser.username,
        timestamp: Date.now(),
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
  }
}

export async function acceptFriendRequest(currentUserId: string, requesterUid: string) {
  try {
    const userRef = doc(db, 'users', currentUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data() as UserProfile;
    const reqToRemove = userData.friendRequests?.find((r) => r.fromUid === requesterUid);

    // Mutual friendship: add to both users
    await updateDoc(userRef, {
      friends: arrayUnion(requesterUid),
      friendRequests: reqToRemove ? arrayRemove(reqToRemove) : userData.friendRequests || [],
    });

    const requesterRef = doc(db, 'users', requesterUid);
    await updateDoc(requesterRef, {
      friends: arrayUnion(currentUserId),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUserId}`);
  }
}

export async function declineFriendRequest(currentUserId: string, requesterUid: string) {
  try {
    const userRef = doc(db, 'users', currentUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data() as UserProfile;
    const reqToRemove = userData.friendRequests?.find((r) => r.fromUid === requesterUid);
    if (reqToRemove) {
      await updateDoc(userRef, {
        friendRequests: arrayRemove(reqToRemove),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUserId}`);
  }
}

export async function toggleFollowUser(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) return;
  try {
    const userRef = doc(db, 'users', currentUserId);
    const targetRef = doc(db, 'users', targetUserId);

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data() as UserProfile;
    const isFollowing = userData.following?.includes(targetUserId);

    if (isFollowing) {
      await updateDoc(userRef, { following: arrayRemove(targetUserId) });
      await updateDoc(targetRef, { followers: arrayRemove(currentUserId) });
    } else {
      await updateDoc(userRef, { following: arrayUnion(targetUserId) });
      await updateDoc(targetRef, { followers: arrayUnion(currentUserId) });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUserId}`);
  }
}

export async function updateUserBio(userId: string, bio: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { bio });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export function subscribeFriendsList(friendUids: string[], callback: (friends: UserProfile[]) => void) {
  if (!friendUids || friendUids.length === 0) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const all = snap.docs.map((d) => d.data() as UserProfile);
      const friends = all.filter((u) => friendUids.includes(u.id));
      callback(friends);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  );
}

// -------------------------------------------------------------
// EXPERIENCES IN FIRESTORE
// -------------------------------------------------------------
export async function saveExperienceToFirestore(exp: ExperienceData, creator: UserProfile) {
  const expDocRef = doc(db, 'experiences', exp.id);
  const payload = {
    ...exp,
    creatorId: creator.id,
    creatorUsername: creator.username,
    lastUpdated: Date.now(),
  };
  try {
    await setDoc(expDocRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `experiences/${exp.id}`);
  }
}

export async function deleteExperienceFromFirestore(expId: string) {
  try {
    await deleteDoc(doc(db, 'experiences', expId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `experiences/${expId}`);
  }
}

export async function deleteAllExperiencesFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'experiences'));
    const promises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'experiences');
  }
}

export function subscribeExperiencesFromFirestore(callback: (experiences: ExperienceData[]) => void) {
  return onSnapshot(
    collection(db, 'experiences'),
    (snap) => {
      const exps = snap.docs
        .map((d) => d.data() as ExperienceData)
        .filter((e) => e && e.id && e.id !== 'exp-default-1');
      // If legacy default exp exists in Firestore, quietly delete it
      snap.docs.forEach((d) => {
        if (d.id === 'exp-default-1') {
          deleteDoc(d.ref).catch(() => {});
        }
      });
      callback(exps);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'experiences');
    }
  );
}

export function subscribeExperienceById(expId: string, callback: (exp: ExperienceData | null) => void) {
  const expDocRef = doc(db, 'experiences', expId);
  return onSnapshot(
    expDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as ExperienceData);
      } else {
        callback(null);
      }
    },
    (err) => {
      // Non-fatal if experience not yet in Firestore
    }
  );
}

// -------------------------------------------------------------
// REAL-TIME MULTIPLAYER IN-GAME PRESENCE & CHAT
// -------------------------------------------------------------
export async function joinGamePresence(
  experienceId: string,
  user: UserProfile,
  initialPos: [number, number, number] = [0, 0, 0]
) {
  const playerDocRef = doc(db, 'active_games', experienceId, 'players', user.id);
  const presence: LivePlayerPresence = {
    userId: user.id,
    username: user.username,
    position: initialPos,
    rotationY: 0,
    isMoving: false,
    avatarColors: user.avatarColors || {
      head: '#8A929E',
      torso: '#8A929E',
      leftArm: '#8A929E',
      rightArm: '#8A929E',
      leftLeg: '#8A929E',
      rightLeg: '#8A929E',
    },
    selectedFaceId: user.selectedFaceId || 'classic-smile',
    selectedAccessoryId: user.selectedAccessoryId || 'none',
    shirtDataUrl: user.shirtDataUrl || null,
    pantsDataUrl: user.pantsDataUrl || null,
    selectedHairId: user.selectedHairId || 'none',
    hairColor: user.hairColor || '#4a2e1b',
    customHairObj: user.customHairObj || null,
    currentChat: null,
    lastPing: Date.now(),
  };

  try {
    await setDoc(playerDocRef, presence);
    // update user document currentExperienceId for friend joins
    await updateDoc(doc(db, 'users', user.id), {
      currentExperienceId: experienceId,
      lastActive: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `active_games/${experienceId}/players/${user.id}`);
  }
}

export async function updateGamePresence(
  experienceId: string,
  userId: string,
  updates: Partial<LivePlayerPresence>
) {
  const playerDocRef = doc(db, 'active_games', experienceId, 'players', userId);
  try {
    await updateDoc(playerDocRef, {
      ...updates,
      lastPing: Date.now(),
    });
  } catch (err) {
    // silent catch for rapid movement updates
  }
}

export async function leaveGamePresence(experienceId: string, userId: string) {
  const playerDocRef = doc(db, 'active_games', experienceId, 'players', userId);
  try {
    await deleteDoc(playerDocRef);
    await updateDoc(doc(db, 'users', userId), {
      currentExperienceId: null,
      currentExperienceName: null,
      lastActive: Date.now(),
    });
  } catch {
    // ignore
  }
}

export function subscribeGamePlayers(
  experienceId: string,
  currentUserId: string,
  callback: (players: LivePlayerPresence[]) => void
) {
  const playersCol = collection(db, 'active_games', experienceId, 'players');
  return onSnapshot(
    playersCol,
    (snap) => {
      const now = Date.now();
      const players: LivePlayerPresence[] = [];
      snap.docs.forEach((d) => {
        const p = d.data() as LivePlayerPresence;
        // Ignore players whose heartbeat is older than 25 seconds (stale sessions)
        if (p.userId !== currentUserId && now - p.lastPing < 25000) {
          players.push(p);
        }
      });
      callback(players);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `active_games/${experienceId}/players`);
    }
  );
}

export async function sendChatMessage(
  experienceId: string,
  sender: UserProfile,
  message: string
) {
  const cleanMsg = message.trim();
  if (!cleanMsg) return;

  const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const msgDocRef = doc(db, 'active_games', experienceId, 'chat_messages', msgId);
  const now = Date.now();

  const chatMsg: LiveChatMessage = {
    id: msgId,
    senderId: sender.id,
    senderUsername: sender.username,
    message: cleanMsg,
    timestamp: now,
  };

  try {
    await setDoc(msgDocRef, chatMsg);

    // Also update player's presence with currentChat so a floating chatbubble appears above their 3D head!
    await updateGamePresence(experienceId, sender.id, {
      currentChat: {
        message: cleanMsg,
        timestamp: now,
      },
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `active_games/${experienceId}/chat_messages/${msgId}`);
  }
}

export function subscribeChatMessages(
  experienceId: string,
  callback: (messages: LiveChatMessage[]) => void
) {
  const chatCol = collection(db, 'active_games', experienceId, 'chat_messages');
  return onSnapshot(
    chatCol,
    (snap) => {
      const messages = snap.docs.map((d) => d.data() as LiveChatMessage);
      messages.sort((a, b) => a.timestamp - b.timestamp);
      // Keep recent 60 messages
      callback(messages.slice(-60));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `active_games/${experienceId}/chat_messages`);
    }
  );
}

// Active players count per game
export function subscribeActivePlayerCount(
  experienceId: string,
  callback: (count: number) => void
) {
  const playersCol = collection(db, 'active_games', experienceId, 'players');
  return onSnapshot(
    playersCol,
    (snap) => {
      const now = Date.now();
      const active = snap.docs.filter((d) => {
        const p = d.data() as LivePlayerPresence;
        return now - (p.lastPing || 0) < 25000;
      });
      callback(active.length);
    },
    () => {
      callback(0);
    }
  );
}
