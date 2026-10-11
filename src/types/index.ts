export interface Message {
  sender: "ai" | "user";
  text?: string;
  type?: "text" | "voice" | "image" | "video";
  duration?: string;
  imageUrl?: string;
  videoUrl?: string;
  time: string;
  timestamp?: number;
}

export interface Character {
  id: string;
  slug: string;
  name: string;
  age: number;
  gender: "female" | "male" | "anime";
  style: "realistic" | "anime";
  tagline: string;
  desc: string;
  image: string;
  badge?: string;
  category: string;
  series: boolean;
  verified: boolean;
  online: boolean;
  tags: string[];
  voice: string;
  greeting: string;
  videoUrl?: string;
  gallery?: string[];
  messages: Message[];
  likes?: number;
  isOnline?: boolean;
  unreadCount?: number;
  accessTier?: "free" | "plus" | "vip";
  isVipOnly?: boolean;
  creatorId?: string;
  creatorEmail?: string;
}

export interface ShortReel {
  id: string;
  characterId: string;
  characterName: string;
  characterAge: number;
  avatar: string;
  videoUrl: string;
  caption: string;
  tags: string[];
  likes?: number;
  createdAt?: string;
}

export interface PaymentRequest {
  id: string;
  userEmail: string;
  plan: "plus" | "vip" | string;
  planName: string;
  currency: string;
  amount: number;
  method: string;
  trxId: string;
  senderName: string;
  screenshot: string | null;
  screenshotPurged?: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  photoURL?: string | null;
  tier: "free" | "plus" | "vip";
  isVip: boolean;
  subscriptionDays: number;
  subscriptionStart?: string | null;
  subscriptionEndsAt?: string | null;
  storageRetentionDays: number;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserStatusResponse {
  success: boolean;
  tier: "free" | "plus" | "vip";
  isVip: boolean;
  subscriptionEndsAt: string | null;
  storageRetentionDays: number;
  error?: string;
}

export interface SavedPhoto {
  id: string;
  url?: string;
  photoUrl?: string;
  caption?: string;
  characterName?: string;
  characterAvatar?: string;
  createdAt?: number;
  time?: string;
  isUnlocked?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  pricePKR: number;
  originalPricePKR: number;
  priceUSD: number;
  originalPriceUSD: number;
  durationDays: number;
  dailyMessages?: number;
  dailyPhotos?: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentAccountConfig {
  id: string;
  name: string;
  label: string;
  number: string;
  title: string;
  instructions: string;
  isActive: boolean;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  badge?: string;
  actionType: "open_premium" | "custom_link";
  linkUrl?: string;
  updatedAt?: string;
}



