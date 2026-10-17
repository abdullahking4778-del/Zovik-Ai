export interface Message {
  sender: "ai" | "user";
  text?: string;
  type?: "text" | "image" | "video";
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
  dropBadge?: "NEW" | "HOT" | "VIP" | "LIMITED" | "TRENDING";
  isLimitedDrop?: boolean;
  dropStartsAt?: string;
  dropEndsAt?: string;
  maxCopies?: number;
  claimedCopies?: number;
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
  userId?: string;
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
  coins?: number;
  status: "pending" | "approved" | "rejected";
  promoCode?: string;
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
  coins?: number;
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

// ============================================================================
// PHASE 1: EVENTS, FEATURE FLAGS & SYSTEM ANALYTICS
// ============================================================================

export type EventType = "weekly" | "monthly" | "seasonal" | "flash" | "special";
export type EventStatus = "draft" | "scheduled" | "live" | "ended";
export type EventVisibility = "all" | "premium" | "free";

export interface AppEvent {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  badge?: string;
  bannerUrl?: string;
  themeColor?: string; // e.g. "#f53b70", "#8b5cf6", "#eab308"
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  actionType: "open_premium" | "open_character" | "open_link" | "none";
  actionTarget?: string; // Character ID, URL, or Plan ID
  actionText?: string; // Button text e.g. "Join Event", "Claim Deal"
  visibility: EventVisibility;
  priority: number; // Higher number = higher precedence
  isActive: boolean; // Master toggle
  linkedCharacterIds?: string[];
  discountPercent?: number; // Optional discount % during this event
  createdAt: string;
  updatedAt: string;
}

export type FeatureFlagCategory = "features" | "system" | "monetization" | "ai";

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  enabled: boolean;
  rolloutPercentage?: number; // 0 - 100
  allowedTiers?: ("free" | "plus" | "vip")[];
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminAnalyticsSummary {
  totalUsers: number;
  vipUsers: number;
  freeUsers: number;
  activeToday: number;
  conversionRatePercent: number;
  totalRevenuePKR: number;
  totalRevenueUSD: number;
  pendingPaymentsCount: number;
  approvedPaymentsCount: number;
  circulatingCoins: number;
  totalCompanions: number;
  activeEventsCount: number;
  activeFeatureFlagsCount: number;
  health: {
    status: "healthy" | "warning" | "degraded";
    database: string;
    groqCircuitBreaker: string;
    lastChecked: string;
  };
}

// ============================================================================
// PHASE 2: PROMO CODES, OFFERS & LIVE PRICING ENGINE
// ============================================================================

export type DiscountType = "percentage" | "flat_pkr" | "flat_usd" | "bonus_coins";
export type AudienceType = "all" | "free" | "vip" | "new";

export interface Offer {
  id: string;
  code: string; // e.g. "EID50", "ZOVIK100", uppercase
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 50 (for 50%) or 200 (for Rs. 200 off) or 100 (coins)
  minPurchasePKR?: number; // Minimum purchase order in PKR
  maxRedemptions?: number; // Total redemptions cap (undefined = unlimited)
  currentRedemptions: number; // Counter of how many times used
  perUserLimit?: number; // e.g. 1 use per user email
  validFrom: string; // ISO date
  validTo: string; // ISO date
  targetAudience: AudienceType;
  applicablePlanIds?: string[]; // Empty array = all plans
  isActive: boolean; // Master toggle
  createdAt: string;
  updatedAt: string;
}

export interface OfferValidationResult {
  valid: boolean;
  error?: string;
  offer?: {
    id: string;
    code: string;
    title: string;
    discountType: DiscountType;
    discountValue: number;
    discountAmountPKR: number;
    discountAmountUSD: number;
    finalPricePKR: number;
    finalPriceUSD: number;
    bonusCoins: number;
  };
}

// ============================================================================
// PHASE 3: ENGAGEMENT, NOTIFICATIONS & SMART BANNERS
// ============================================================================

export type NotificationType = "info" | "promo" | "alert" | "reward" | "event";
export type NotificationTarget = "all" | "free" | "vip";

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: NotificationTarget;
  linkUrl?: string;
  actionText?: string;
  badge?: string;
  priority: "high" | "normal" | "low";
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  readBy?: string[];
}

export type BannerStyle = "ticker" | "hero_card" | "countdown_bar";

export interface SmartBannerConfig {
  id: string;
  title: string;
  subtitle?: string;
  style: BannerStyle;
  highlightText?: string;
  badge?: string;
  ctaText?: string;
  ctaLink?: string;
  targetAudience: "all" | "free" | "vip";
  startsAt?: string;
  endsAt?: string;
  countdownTarget?: string;
  isActive: boolean;
  isDismissible: boolean;
  updatedAt: string;
}

export interface PromoModalConfig {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  badge?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  showOncePerSession: boolean;
  updatedAt: string;
}

// ============================================================================
// PHASE 4: INTELLIGENCE, ANALYTICS, CONTENT CALENDAR & A/B EXPERIMENTS
// ============================================================================

export interface TopCompanionMetric {
  id: string;
  name: string;
  image: string;
  category: string;
  gender: string;
  chatCount: number;
  messageCount: number;
  likesCount: number;
  engagementScore: number;
  tagline: string;
  isVipOnly?: boolean;
}

export interface PromoROIMetric {
  code: string;
  title: string;
  discount: string;
  discountType: DiscountType;
  redemptionsCount: number;
  estimatedDiscountPKR: number;
  estimatedRevenuePKR: number;
  isActive: boolean;
}

export interface UserCohortMetric {
  id: "new_users" | "vip_subscribers" | "power_users" | "inactive_users" | "general_users";
  name: string;
  description: string;
  count: number;
  percentage: number;
  badge: string;
  accentColor: string;
  recommendedAction: string;
}

export interface AnalyticsOverview {
  revenue: {
    totalApprovedPKR: number;
    totalApprovedUSD: number;
    pendingCount: number;
    approvedCount: number;
    last7DaysPKR: number;
    last30DaysPKR: number;
  };
  activity: {
    estimatedActiveUsers: number;
    totalRegisteredUsers: number;
    totalChatMessages: number;
    totalCharacters: number;
    coinsInCirculation: number;
    coinsBurned24h: number;
    avgSessionMinutes: number;
  };
  topCompanions: TopCompanionMetric[];
  promoROI: PromoROIMetric[];
  userCohorts: UserCohortMetric[];
  systemHealth: {
    groqPoolKeysCount: number;
    supabaseStatus: "connected" | "fallback_local";
    firebaseStatus: "connected" | "degraded";
    memoryCacheActive: boolean;
    timestamp: string;
  };
}

export type CalendarItemType = "event" | "offer" | "drop";

export interface ContentCalendarItem {
  id: string;
  title: string;
  subtitle?: string;
  type: CalendarItemType;
  startDate: string; // ISO
  endDate: string; // ISO
  status: "live" | "scheduled" | "ended" | "draft";
  badge?: string;
  color: string;
  description?: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
}

export interface CalendarConflict {
  id: string;
  itemA: ContentCalendarItem;
  itemB: ContentCalendarItem;
  reason: string;
  severity: "warning" | "high";
  recommendation: string;
}

export interface ABVariant {
  id: "A" | "B";
  label: string;
  value: string;
  impressions: number;
  conversions: number;
}

export interface ABExperimentConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  variantA: ABVariant;
  variantB: ABVariant;
  status: "running" | "paused" | "completed";
  winner?: "A" | "B" | "none";
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PHASE 5: OPERATIONS, SECURITY, MULTI-ADMIN RBAC & AUDIT LOGS
// ============================================================================

export type AdminRole = "super_admin" | "support_admin" | "marketing_admin";

export type AdminPermission =
  | "manage_settings"
  | "manage_admins"
  | "manage_payments"
  | "manage_characters"
  | "manage_events"
  | "manage_offers"
  | "manage_banners"
  | "view_analytics"
  | "export_data"
  | "manage_fraud";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: "active" | "suspended";
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  invitedBy?: string;
}

export type AuditLogAction =
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "PLAN_UPDATED"
  | "OFFER_CREATED"
  | "OFFER_UPDATED"
  | "OFFER_DELETED"
  | "EVENT_CREATED"
  | "EVENT_UPDATED"
  | "BANNER_UPDATED"
  | "NOTIFICATION_BROADCAST"
  | "PASSWORD_CHANGED"
  | "USER_SUSPENDED"
  | "USER_COIN_GRANT"
  | "ADMIN_INVITED"
  | "ADMIN_ROLE_UPDATED"
  | "ADMIN_REMOVED"
  | "FRAUD_ACTION"
  | "BACKUP_EXPORTED";

export type AuditLogSeverity = "info" | "warning" | "critical";

export interface AuditLog {
  id: string;
  timestamp: string; // ISO
  actorEmail: string;
  actorRole: AdminRole;
  action: AuditLogAction;
  resourceType: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  severity: AuditLogSeverity;
}

export type FraudAlertCategory =
  | "multi_account"
  | "rapid_chat_spam"
  | "trx_duplicate"
  | "promo_abuse"
  | "abnormal_coin_velocity";

export type FraudAlertSeverity = "low" | "medium" | "high" | "critical";

export interface FraudAlert {
  id: string;
  category: FraudAlertCategory;
  severity: FraudAlertSeverity;
  riskScore: number; // 0 - 100
  identifier: string; // email, ip, or trxId
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  occurrences: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  recommendedAction: string;
}

export interface BackupSnapshotMetadata {
  timestamp: string;
  version: string;
  counts: {
    users: number;
    payments: number;
    characters: number;
    events: number;
    offers: number;
    auditLogs: number;
  };
}

