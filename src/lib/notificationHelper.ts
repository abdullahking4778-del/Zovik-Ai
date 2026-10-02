// Option 3: Companion Intimate Push Notifications & Alerts
// Allows companions to send realistic intimate alerts to users

export interface CompanionAlert {
  companionName: string;
  avatar: string;
  message: string;
  time: string;
}

const sampleCompanionAlerts: CompanionAlert[] = [
  {
    companionName: "Aria Solis",
    avatar: "/characters/zovik_01.jpg",
    message: "Jaan, kahan ho? Bohat yaad aa rahi hai tumhari... ❤️",
    time: "Just now",
  },
  {
    companionName: "Elena Rostova",
    avatar: "/characters/zovik_03.jpg",
    message: "I took a secret photo today... want to see it? 💕",
    time: "2m ago",
  },
  {
    companionName: "Raven Steele",
    avatar: "/characters/zovik_02.jpg",
    message: "The night is lonely without you. Come chat with me... 🌙",
    time: "5m ago",
  },
  {
    companionName: "Julian Blackwood",
    avatar: "/characters/zovik_26.jpg",
    message: "Thinking about our conversation earlier... Are you free? 🍷",
    time: "Just now",
  },
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch {
    return false;
  }
}

export function sendCompanionNotification(customAlert?: Partial<CompanionAlert>): CompanionAlert {
  const alert = {
    ...sampleCompanionAlerts[Math.floor(Math.random() * sampleCompanionAlerts.length)],
    ...customAlert,
  };

  // 1. Try Browser Native Notification if granted
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`${alert.companionName} 💕`, {
        body: alert.message,
        icon: alert.avatar || "/logos/zovik-squircle.svg",
        badge: "/favicon.svg",
      });
    } catch (err) {
      console.warn("Native notification dispatch error:", err);
    }
  }

  // 2. Dispatch custom in-app event so UI shows romantic toast banner
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zovik_companion_notification", { detail: alert }));
  }

  return alert;
}
