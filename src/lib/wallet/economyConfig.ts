export interface CoinPackage {
  id: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  pricePKR: number;
  badge?: string;
  badgeColor?: string;
  isPopular?: boolean;
  label: string;
  description: string;
}

export interface EconomyConfig {
  usdtRate: number; // e.g. 280 PKR / USDT
  minPurchaseCoins: number; // e.g. 50
  costPerMessage: number; // 1
  costPerPhoto: number; // 5
  costPerVoice: number; // 2
  welcomeBonusCoins: number; // 20
  packages: CoinPackage[];
}

export const DEFAULT_PACKAGES: CoinPackage[] = [
  {
    id: "pack_50",
    coins: 50,
    bonusCoins: 0,
    totalCoins: 50,
    pricePKR: 50,
    label: "Starter Pack",
    badge: "MINIMUM",
    badgeColor: "gray",
    description: "50 Chat Messages or 10 HD Photos",
  },
  {
    id: "pack_200",
    coins: 200,
    bonusCoins: 0,
    totalCoins: 200,
    pricePKR: 200,
    label: "Popular Choice",
    badge: "POPULAR 🔥",
    badgeColor: "orange",
    isPopular: true,
    description: "200 Messages + 40 HD Photos + 100 Voice Notes",
  },
  {
    id: "pack_1000",
    coins: 1000,
    bonusCoins: 50,
    totalCoins: 1050,
    pricePKR: 1000,
    label: "Elite Value",
    badge: "+50 BONUS 🎁",
    badgeColor: "pink",
    description: "1,050 Coins total. Deep passionate intimate chat without limits",
  },
  {
    id: "pack_5000",
    coins: 5000,
    bonusCoins: 500,
    totalCoins: 5500,
    pricePKR: 5000,
    label: "VIP Diamond",
    badge: "+500 BONUS 💎",
    badgeColor: "purple",
    description: "5,500 Coins. Complete VIP freedom for weeks & unlimited selfies",
  },
  {
    id: "pack_50000",
    coins: 50000,
    bonusCoins: 10000,
    totalCoins: 60000,
    pricePKR: 50000,
    label: "Whale Unlimited",
    badge: "+10K BONUS 👑",
    badgeColor: "amber",
    description: "60,000 Coins. Lifetime intimate companion sanctuary & priority",
  },
];

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  usdtRate: 280,
  minPurchaseCoins: 50,
  costPerMessage: 1,
  costPerPhoto: 5,
  costPerVoice: 2,
  welcomeBonusCoins: 20,
  packages: DEFAULT_PACKAGES,
};

/**
 * Calculate coins from amount and currency (browser & server safe)
 */
export function calculateCoins(
  amount: number,
  currency: "PKR" | "USDT" | "USD",
  customUsdtRate?: number
): {
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  pricePKR: number;
  priceUSDT: number;
} {
  const usdtRate = customUsdtRate || DEFAULT_ECONOMY_CONFIG.usdtRate || 280;

  let pkrAmount = amount;
  if (currency === "USDT" || currency === "USD") {
    pkrAmount = Math.round(amount * usdtRate);
  }

  // 1 PKR = 1 Coin base
  const baseCoins = Math.max(0, Math.floor(pkrAmount));

  // Determine bonus for custom/large amounts
  let bonusCoins = 0;
  if (baseCoins >= 50000) {
    bonusCoins = Math.floor(baseCoins * 0.2); // 20% bonus
  } else if (baseCoins >= 5000) {
    bonusCoins = Math.floor(baseCoins * 0.1); // 10% bonus
  } else if (baseCoins >= 1000) {
    bonusCoins = Math.floor(baseCoins * 0.05); // 5% bonus
  }

  const usdtAmount = Number((pkrAmount / usdtRate).toFixed(2));

  return {
    coins: baseCoins,
    bonusCoins,
    totalCoins: baseCoins + bonusCoins,
    pricePKR: pkrAmount,
    priceUSDT: usdtAmount,
  };
}
