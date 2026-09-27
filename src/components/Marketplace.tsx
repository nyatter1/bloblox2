import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  ShoppingBag,
  Search,
  Sparkles,
  Shirt,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Tag,
  ArrowRight,
  TrendingUp,
  UserCheck,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Share2,
  Info
} from 'lucide-react';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import VerifiedBadge, { isOwnerUser } from './VerifiedBadge';
import {
  MarketplaceClothingItem,
  getSavedMarketplaceItems,
  buyMarketplaceItem,
  isItemInInventory,
  subscribeMarketplaceFromFirestore,
} from '../types/marketplace';
import { UserProfile } from '../services/firebase';
import { getFaceTexture } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh } from '../utils/hairMesh';

interface MarketplaceProps {
  currentUser: UserProfile;
  avatarColors: AvatarColors;
  selectedFaceId: string;
  shirtDataUrl: string | null;
  pantsDataUrl: string | null;
  selectedHairId: string;
  hairColor: string;
  customHairObj: string | null;
  onEquipShirt: (url: string | null) => void;
  onEquipPants: (url: string | null) => void;
  onOpenAvatarEditor: () => void;
  onOpenStudio: () => void;
  onNavigateToUserProfile?: (uid: string) => void;
}

export default function Marketplace({
  currentUser,
  avatarColors,
  selectedFaceId,
  shirtDataUrl,
  pantsDataUrl,
  selectedHairId,
  hairColor,
  customHairObj,
  onEquipShirt,
  onEquipPants,
  onOpenAvatarEditor,
  onOpenStudio,
  onNavigateToUserProfile,
}: MarketplaceProps) {
  const [items, setItems] = useState<MarketplaceClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'shirt' | 'pants'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');

  // Dedicated Buy Page state: When an item is selected, this page is shown
  const [selectedItemForBuy, setSelectedItemForBuy] = useState<MarketplaceClothingItem | null>(null);

  // Buy Page View mode: '2d' (template/front preview) vs '3d' (live interactive avatar try-on)
  const [buyPageViewMode, setBuyPageViewMode] = useState<'2d' | '3d'>('2d');
  const [is3DSpinning, setIs3DSpinning] = useState(false);

  // Purchase Dialog Prompt & Success Dialog state
  const [purchaseConfirmModalItem, setPurchaseConfirmModalItem] = useState<MarketplaceClothingItem | null>(null);
  const [purchaseSuccessItem, setPurchaseSuccessItem] = useState<MarketplaceClothingItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3D Canvas ref for Buy Page Try-on
  const tryOn3DContainerRef = useRef<HTMLDivElement | null>(null);

  // Load marketplace items
  useEffect(() => {
    let isMounted = true;
    getSavedMarketplaceItems().then((saved) => {
      if (isMounted) {
        setItems(saved);
        setLoading(false);
      }
    });

    const unsub = subscribeMarketplaceFromFirestore((remoteItems) => {
      if (isMounted && remoteItems.length > 0) {
        setItems((prev) => {
          const map = new Map<string, MarketplaceClothingItem>();
          prev.forEach((i) => map.set(i.id, i));
          remoteItems.forEach((i) => map.set(i.id, i));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform purchase: saves to inventory permanently
  const executePurchase = async (item: MarketplaceClothingItem) => {
    setPurchasing(true);
    const updated = await buyMarketplaceItem(item);
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    if (selectedItemForBuy && selectedItemForBuy.id === item.id) {
      setSelectedItemForBuy(updated);
    }
    setPurchasing(false);
    setPurchaseConfirmModalItem(null);
    setPurchaseSuccessItem(updated);
  };

  // Filter & Sort
  const filteredItems = items
    .filter((i) => {
      if (filterType !== 'all' && i.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          i.name.toLowerCase().includes(q) ||
          i.creatorUsername.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.boughtCount || 0) - (a.boughtCount || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  // 3D Interactive Try-On Avatar in Buy Page
  useEffect(() => {
    if (!selectedItemForBuy || buyPageViewMode !== '3d' || !tryOn3DContainerRef.current) return;

    const container = tryOn3DContainerRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0.2, 2.7, 7.2);
    camera.lookAt(0, 2.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Platform
    const platformGeo = new THREE.CylinderGeometry(2.3, 2.5, 0.25, 48);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1b1138,
      metalness: 0.6,
      roughness: 0.3,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.15;
    scene.add(platform);

    const ringGeo = new THREE.RingGeometry(2.1, 2.45, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Neutral natural lighting (accurate skin tone and clothing rendering with NO color tint)
    const amb = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfffdfa, 2.2);
    sun.position.set(5, 10, 6);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xfff7ed, 0.6);
    rim.position.set(-5, 4, -4);
    scene.add(rim);

    // Character Group
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    const createMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex || DEFAULT_GREY),
        roughness: 0.45,
        metalness: 0.08,
      });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
    const torsoMesh = new THREE.Mesh(torsoGeo, createMat(avatarColors.torso));
    torsoMesh.position.set(0, 3, 0);
    characterGroup.add(torsoMesh);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.7, 0);
    const cylinderGeo = new THREE.CylinderGeometry(0.625, 0.625, 0.95, 32);
    const headCylinder = new THREE.Mesh(cylinderGeo, createMat(avatarColors.head));
    headGroup.add(headCylinder);

    const topCapGeo = new THREE.SphereGeometry(0.625, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    topCapGeo.scale(1, 0.35, 1);
    const topCap = new THREE.Mesh(topCapGeo, createMat(avatarColors.head));
    topCap.position.y = 0.475;
    headGroup.add(topCap);

    const botCapGeo = new THREE.SphereGeometry(0.625, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    botCapGeo.scale(1, 0.35, 1);
    const botCap = new THREE.Mesh(botCapGeo, createMat(avatarColors.head));
    botCap.position.y = -0.475;
    headGroup.add(botCap);

    // Face
    const faceGeo = new THREE.PlaneGeometry(1.18, 1.18);
    const faceMat = new THREE.MeshBasicMaterial({
      map: getFaceTexture(selectedFaceId || 'classic-smile'),
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.position.set(0, 0, 0.638);
    headGroup.add(faceMesh);

    // Hair
    if (selectedHairId && selectedHairId !== 'none') {
      const hairMesh = createHairMesh(selectedHairId, hairColor || '#4a2e1b');
      if (hairMesh) headGroup.add(hairMesh);
    }
    characterGroup.add(headGroup);

    // Arms
    const armGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(1.5, 4, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, createMat(avatarColors.leftArm));
    leftArmMesh.position.set(0, -1, 0);
    leftArmGroup.add(leftArmMesh);
    characterGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-1.5, 4, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, createMat(avatarColors.rightArm));
    rightArmMesh.position.set(0, -1, 0);
    rightArmGroup.add(rightArmMesh);
    characterGroup.add(rightArmGroup);

    // Legs
    const legGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(0.5, 2, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, createMat(avatarColors.leftLeg));
    leftLegMesh.position.set(0, -1, 0);
    leftLegGroup.add(leftLegMesh);
    characterGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-0.5, 2, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, createMat(avatarColors.rightLeg));
    rightLegMesh.position.set(0, -1, 0);
    rightLegGroup.add(rightLegMesh);
    characterGroup.add(rightLegGroup);

    // Determine preview shirt and pants URLs
    const effectiveShirtUrl =
      selectedItemForBuy.type === 'shirt' ? selectedItemForBuy.dataUrl : shirtDataUrl;
    const effectivePantsUrl =
      selectedItemForBuy.type === 'pants' ? selectedItemForBuy.dataUrl : pantsDataUrl;

    if (effectiveShirtUrl) {
      attachShirtToLimbs(torsoMesh, leftArmGroup, rightArmGroup, effectiveShirtUrl, () => {
        renderer.render(scene, camera);
      });
    }
    if (effectivePantsUrl) {
      attachPantsToLimbs(torsoMesh, leftLegGroup, rightLegGroup, effectivePantsUrl, () => {
        renderer.render(scene, camera);
      });
    }

    // Drag to rotate
    let isDragging = false;
    let prevMouseX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      characterGroup.rotation.y += deltaX * 0.012;
      prevMouseX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (is3DSpinning && !isDragging) {
        characterGroup.rotation.y += 0.009;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [selectedItemForBuy, buyPageViewMode, is3DSpinning, avatarColors, selectedFaceId, selectedHairId, hairColor, shirtDataUrl, pantsDataUrl]);

  // =========================================================================
  // VIEW 1: DEDICATED CLOTHING BUY PAGE
  // When a user clicked on a shirt or pants card in the marketplace!
  // =========================================================================
  if (selectedItemForBuy) {
    const item = selectedItemForBuy;
    const owned = isItemInInventory(item);
    const isEquipped =
      (item.type === 'shirt' && shirtDataUrl === item.dataUrl) ||
      (item.type === 'pants' && pantsDataUrl === item.dataUrl);

    // Other items from community for carousel
    const otherItems = items.filter((i) => i.id !== item.id).slice(0, 4);

    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-18 right-6 z-50 p-4 rounded-xl bg-purple-600 text-white shadow-2xl border border-purple-400 flex items-center gap-3 animate-slideDown">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Breadcrumb & Back Button */}
        <div className="flex items-center justify-between text-xs text-purple-300/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedItemForBuy(null);
                setBuyPageViewMode('2d');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#191136] hover:bg-purple-900/60 border border-purple-500/25 text-purple-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </button>
            <span className="hidden sm:inline text-purple-500/50">/</span>
            <span className="hidden sm:inline text-purple-400 capitalize">
              {item.type === 'shirt' ? 'Classic Shirts' : 'Classic Pants'}
            </span>
            <span className="hidden sm:inline text-purple-500/50">/</span>
            <span className="text-white font-bold truncate max-w-xs">{item.name}</span>
          </div>
        </div>

        {/* ================= MAIN BUY PAGE CONTAINER ================= */}
        <div className="rounded-3xl bg-[#140e28] border border-purple-500/25 shadow-2xl overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* LEFT COLUMN: Visual Showcase & Try On (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Preview Window with 2D and 3D Avatar Try-On Switch */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#1b1137] to-[#0c0819] border border-purple-500/25 shadow-inner overflow-hidden aspect-square flex items-center justify-center p-4">
                {/* 2D Preview Display */}
                {buyPageViewMode === '2d' && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 relative animate-fadeIn">
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full max-h-[360px] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] select-none"
                      />
                    ) : (
                      <div className="text-center space-y-2 text-purple-400">
                        <Shirt className="w-16 h-16 mx-auto opacity-60" />
                        <p className="text-xs">2D Template Preview</p>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] uppercase font-mono font-bold text-purple-200">
                      2D FRONT VIEW
                    </div>
                  </div>
                )}

                {/* 3D Interactive Avatar Try-On Stage */}
                {buyPageViewMode === '3d' && (
                  <div className="w-full h-full relative animate-fadeIn">
                    <div
                      ref={tryOn3DContainerRef}
                      className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                      title="Drag to rotate character"
                    />

                    {/* Try-On Live Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-purple-600/80 backdrop-blur-sm border border-purple-400/50 text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                      <Sparkles className="w-3 h-3 text-purple-200" />
                      <span>TRY-ON ACTIVE</span>
                    </div>

                    {/* 3D Spin Toggle */}
                    <button
                      onClick={() => setIs3DSpinning(!is3DSpinning)}
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        is3DSpinning
                          ? 'bg-purple-600/40 border-purple-400 text-purple-100'
                          : 'bg-black/60 border-white/10 text-purple-300'
                      }`}
                    >
                      {is3DSpinning ? 'Auto-Spin: ON' : 'Auto-Spin: OFF'}
                    </button>

                    <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                      <span className="text-[10px] text-purple-300/60 bg-black/60 px-3 py-1 rounded-full border border-purple-500/20 backdrop-blur-xs">
                        Drag horizontally to rotate 360&deg;
                      </span>
                    </div>
                  </div>
                )}

                {/* Top Badge: Item Type */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-purple-500/30 text-[10px] uppercase font-mono font-bold text-purple-200 z-10">
                  {item.type === 'shirt' ? 'Classic Shirt' : 'Classic Pants'}
                </div>

                {/* Top Right: Free Price Tag */}
                <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 text-xs font-black tracking-wide shadow-md z-10">
                  FREE
                </div>
              </div>

              {/* Try On Button / View Toggle below preview */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBuyPageViewMode(buyPageViewMode === '2d' ? '3d' : '2d')}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                    buyPageViewMode === '3d'
                      ? 'bg-purple-950/80 border border-purple-400/50 text-purple-200 hover:text-white'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/60 hover:scale-[1.02]'
                  }`}
                  title="Try on this clothing with your 3D avatar"
                >
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  <span>{buyPageViewMode === '3d' ? 'Take Off (View 2D Item)' : 'Try On with 3D Avatar'}</span>
                </button>

                {buyPageViewMode === '3d' && (
                  <button
                    onClick={() => {
                      setBuyPageViewMode('2d');
                    }}
                    className="p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/25 text-purple-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset to 2D view"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Item Information & Purchase (lg:col-span-6) */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Title & Creator */}
                <div className="space-y-2 border-b border-purple-500/20 pb-4">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                    {item.type === 'shirt' ? 'BoBlox Classic Shirt' : 'BoBlox Classic Pants'}
                  </span>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-white tracking-tight">
                    {item.name}
                  </h1>

                  {/* Creator Link with Verified Badge */}
                  <div className="flex items-center gap-2 text-sm text-purple-300/80 pt-1">
                    <span>By</span>
                    <button
                      onClick={() => onNavigateToUserProfile?.(item.creatorId)}
                      className="font-bold text-purple-200 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.creatorUsername}</span>
                      {isOwnerUser(item.creatorUsername) && <VerifiedBadge size="sm" />}
                    </button>
                  </div>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-[#191135] border border-purple-500/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-purple-400 font-bold uppercase font-mono">Price</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-300 font-display">FREE</span>
                      <span className="text-xs text-purple-300/60 font-mono">(0 Coins)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-purple-400 font-bold uppercase font-mono">Sales</span>
                    <p className="text-base font-bold text-white font-mono">{item.boughtCount || 0} bought</p>
                  </div>
                </div>

                {/* Primary Action Button: Buy / Equip */}
                <div className="space-y-3">
                  {isEquipped ? (
                    <div className="w-full py-4 px-6 rounded-2xl bg-purple-950/60 border border-purple-400/40 text-purple-200 font-display font-black text-center text-sm flex items-center justify-center gap-2">
                      <Check className="w-5 h-5 text-emerald-400" />
                      <span>Currently Worn on Avatar</span>
                    </div>
                  ) : owned ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>You own this item in your inventory</span>
                      </div>
                      <button
                        onClick={() => {
                          if (item.type === 'shirt') onEquipShirt(item.dataUrl);
                          else onEquipPants(item.dataUrl);
                          showToast(`Equipped "${item.name}"!`);
                        }}
                        className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-display font-black text-base shadow-xl shadow-purple-900/50 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Shirt className="w-5 h-5" />
                        <span>Wear Now</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPurchaseConfirmModalItem(item)}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black text-lg tracking-wide shadow-xl shadow-emerald-950/80 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                    >
                      <Tag className="w-5 h-5 fill-white" />
                      <span>Get Item (Free)</span>
                    </button>
                  )}
                </div>

                {/* Description & Attribute Specs */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono">
                      Description
                    </h3>
                    <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
                      Custom 585x559 community clothing designed for BoBlox avatars. Once acquired, it stays
                      permanently in your inventory and can be equipped anytime across all sandbox experiences and in
                      BoBlox Studio!
                    </p>
                  </div>

                  {/* Attributes Table */}
                  <div className="rounded-xl border border-purple-500/20 bg-[#160f2e] divide-y divide-purple-500/15 text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-purple-400 font-semibold">Type</span>
                      <span className="text-white font-bold capitalize">{item.type}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-purple-400 font-semibold">Usable In</span>
                      <span className="text-white font-bold">All BoBlox Experiences</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-purple-400 font-semibold">Creator</span>
                      <span className="text-purple-200 font-bold">{item.creatorUsername}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-purple-400 font-semibold">Created</span>
                      <span className="text-white font-mono">Sep 2026</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Link */}
              <div className="pt-4 border-t border-purple-500/15 flex items-center justify-between text-xs text-purple-400">
                <span>Want to create your own clothing?</span>
                <button
                  onClick={onOpenStudio}
                  className="font-bold text-purple-300 hover:text-white underline cursor-pointer"
                >
                  Create in Studio
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MORE CLOTHING RECOMMENDATIONS ================= */}
        {otherItems.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span>More Community Clothing</span>
              </h3>
              <button
                onClick={() => setSelectedItemForBuy(null)}
                className="text-xs font-semibold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>View all items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {otherItems.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    setSelectedItemForBuy(rec);
                    setBuyPageViewMode('2d');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group rounded-2xl bg-[#150e2b] border border-purple-500/20 hover:border-purple-400/50 p-3.5 flex flex-col justify-between shadow-lg hover:shadow-purple-950/60 transition-all cursor-pointer"
                >
                  <div className="aspect-square w-full rounded-xl bg-[#0f0a1c] border border-purple-500/15 flex items-center justify-center p-3 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                    {rec.previewUrl ? (
                      <img src={rec.previewUrl} alt={rec.name} className="w-full h-full object-contain filter drop-shadow-md select-none" />
                    ) : (
                      <Shirt className="w-10 h-10 text-purple-400" />
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold shadow-sm">
                      FREE
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <h4 className="font-display font-bold text-white text-xs truncate group-hover:text-purple-200 transition-colors">
                      {rec.name}
                    </h4>
                    <p className="text-[11px] text-purple-300/70 truncate mt-0.5">By {rec.creatorUsername}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= PURCHASE CONFIRMATION MODAL (ROBLOX STYLE) ================= */}
        {purchaseConfirmModalItem && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setPurchaseConfirmModalItem(null)}
          >
            <div
              className="w-full max-w-md bg-[#160f2e] border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative text-center space-y-5 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-black text-xl text-white">Get Item</h3>

              {/* Item Thumbnail */}
              <div className="w-28 h-28 mx-auto rounded-2xl bg-[#0e091c] border border-purple-500/30 p-2 flex items-center justify-center shadow-inner">
                {purchaseConfirmModalItem.previewUrl ? (
                  <img
                    src={purchaseConfirmModalItem.previewUrl}
                    alt={purchaseConfirmModalItem.name}
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <Shirt className="w-12 h-12 text-purple-400" />
                )}
              </div>

              {/* Prompt Text */}
              <div className="space-y-1 text-sm text-purple-200">
                <p>
                  Would you like to get the {purchaseConfirmModalItem.type}{' '}
                  <span className="font-bold text-white">&ldquo;{purchaseConfirmModalItem.name}&rdquo;</span> from{' '}
                  <span className="font-bold text-purple-300">{purchaseConfirmModalItem.creatorUsername}</span> for{' '}
                  <span className="font-extrabold text-emerald-400">FREE</span>?
                </p>
                <p className="text-xs text-purple-400/80 pt-1">
                  Your balance after this transaction will be unchanged.
                </p>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setPurchaseConfirmModalItem(null)}
                  className="py-3 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-900 border border-purple-500/30 text-purple-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executePurchase(purchaseConfirmModalItem)}
                  disabled={purchasing}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all cursor-pointer hover:scale-105"
                >
                  {purchasing ? 'Acquiring...' : 'Get Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PURCHASE SUCCESS MODAL ================= */}
        {purchaseSuccessItem && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setPurchaseSuccessItem(null)}
          >
            <div
              className="w-full max-w-md bg-[#160f2e] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative text-center space-y-5 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center justify-center mx-auto shadow-lg">
                <Check className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-xl text-white">Purchase Complete!</h3>
                <p className="text-xs sm:text-sm text-purple-200">
                  You successfully acquired <span className="font-bold text-white">&ldquo;{purchaseSuccessItem.name}&rdquo;</span>.
                  It has been added permanently to your inventory!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setPurchaseSuccessItem(null)}
                  className="py-3 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-900 border border-purple-500/30 text-purple-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    if (purchaseSuccessItem.type === 'shirt') onEquipShirt(purchaseSuccessItem.dataUrl);
                    else onEquipPants(purchaseSuccessItem.dataUrl);
                    setPurchaseSuccessItem(null);
                    showToast(`Equipped "${purchaseSuccessItem.name}"!`);
                  }}
                  className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/50 transition-all cursor-pointer hover:scale-105"
                >
                  Wear Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MARKETPLACE BROWSER GRID
  // Note: Try On button is REMOVED from the cards. Clicking the card opens Buy Page!
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 p-4 rounded-xl bg-purple-600 text-white shadow-2xl border border-purple-400 flex items-center gap-3 animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ================= MARKETPLACE HERO HEADER ================= */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#241344] via-[#1a0f30] to-[#120a22] border border-purple-500/25 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              Community Marketplace
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-purple-200/80 max-w-xl leading-relaxed">
            Discover community shirts and pants created by BoBlox players. Click any item to inspect, try on with your
            3D avatar, and add it permanently to your inventory for free!
          </p>
        </div>

        {/* Studio Upload CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenStudio}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
          >
            <Shirt className="w-4 h-4" />
            <span>Create & Sell Clothing</span>
          </button>
        </div>
      </div>

      {/* ================= CONTROLS: FILTER TABS & SEARCH ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#140e28] p-3 sm:p-4 rounded-2xl border border-purple-500/20 shadow-md">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterType === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            All Items ({items.length})
          </button>

          <button
            onClick={() => setFilterType('shirt')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'shirt'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Classic Shirts</span>
          </button>

          <button
            onClick={() => setFilterType('pants')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'pants'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Classic Pants</span>
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clothes or creators..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1a1236] border border-purple-500/20 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-[#1a1236] border border-purple-500/20 text-xs text-purple-200 focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="popular">Most Popular (Boughts)</option>
            <option value="newest">Newest Creations</option>
          </select>
        </div>
      </div>

      {/* ================= ITEMS GRID ================= */}
      {loading ? (
        <div className="p-12 text-center text-purple-300">
          <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading BoBlox Marketplace...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#140e29] border border-purple-500/20 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-purple-400/40 mx-auto" />
          <h3 className="font-display font-bold text-white text-base">No clothing items found</h3>
          <p className="text-xs text-purple-300/70 max-w-sm mx-auto">
            Try adjusting your search query, or upload your own 585x559 shirt/pants template in BoBlox Studio!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const owned = isItemInInventory(item);
            const isEquipped =
              (item.type === 'shirt' && shirtDataUrl === item.dataUrl) ||
              (item.type === 'pants' && pantsDataUrl === item.dataUrl);

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItemForBuy(item);
                  setBuyPageViewMode('2d');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group rounded-2xl bg-[#150e2b] border border-purple-500/20 hover:border-purple-400/60 p-3.5 flex flex-col justify-between shadow-lg hover:shadow-purple-950/80 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <div>
                  {/* 2D Form Preview Container */}
                  <div className="aspect-square w-full rounded-xl bg-[#0f0a1c] border border-purple-500/15 flex items-center justify-center p-3 relative overflow-hidden group-hover:scale-[1.03] transition-transform">
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-contain filter drop-shadow-md select-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-purple-400">
                        <Shirt className="w-10 h-10 mb-1 opacity-70" />
                        <span className="text-[10px]">2D Clothing</span>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] uppercase font-mono font-bold text-purple-200">
                      {item.type}
                    </div>

                    {/* Free Price Tag */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold shadow-sm">
                      FREE
                    </div>

                    {/* Owned Indicator overlay */}
                    {owned && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-purple-900/80 border border-purple-400/40 text-[9px] font-bold text-purple-200 flex items-center gap-1 backdrop-blur-xs">
                        <Check className="w-2.5 h-2.5 text-emerald-300" />
                        <span>Owned</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Creator */}
                  <div className="mt-3 space-y-1">
                    <h3 className="font-display font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-purple-200 transition-colors">
                      {item.name}
                    </h3>

                    {/* Creator with Verified Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-300/70">
                      <span className="text-[10px]">By</span>
                      <span className="font-semibold text-purple-200 truncate">
                        {item.creatorUsername}
                      </span>
                      {isOwnerUser(item.creatorUsername) && <VerifiedBadge size="sm" />}
                    </div>

                    {/* Boughts count */}
                    <div className="flex items-center gap-1 text-[10px] text-purple-400 font-mono pt-1">
                      <ShoppingBag className="w-3 h-3 text-purple-400" />
                      <span>{item.boughtCount || 0} bought</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Simple prompt to click to buy & try-on */}
                <div className="mt-3 pt-2 border-t border-purple-500/15 flex items-center justify-between text-[11px] text-purple-300 group-hover:text-white transition-colors">
                  <span className="font-semibold">{isEquipped ? 'Currently Worn' : owned ? 'View in Wardrobe' : 'Click to Inspect & Buy'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
