"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Sparkles, Tag, AlertCircle, Gift, CheckCheck, ExternalLink, X } from "lucide-react";
import { InAppNotification, NotificationType } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const userParam = user?.email || user?.uid || "";
      const res = await fetch(`/api/notifications?user=${encodeURIComponent(userParam)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn("[NotificationBell] Fetch note:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, [user?.email, user?.uid]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const userParam = user?.email || user?.uid || "anonymous";
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, user: userParam }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    const unread = notifications.filter((n) => !(n as any).isRead);
    for (const notif of unread) {
      await handleMarkAsRead(notif.id);
    }
    setUnreadCount(0);
    setLoading(false);
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case "promo":
        return <Tag className="size-3.5 text-amber-400" />;
      case "reward":
        return <Gift className="size-3.5 text-emerald-400" />;
      case "alert":
        return <AlertCircle className="size-3.5 text-rose-400" />;
      case "event":
        return <Sparkles className="size-3.5 text-pink-400" />;
      default:
        return <Bell className="size-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative size-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
          unreadCount > 0
            ? "bg-pink-500/20 border-[#f53b70] text-[#f53b70]"
            : "bg-white/5 hover:bg-white/10 border-white/10 text-[#aeaeae] hover:text-white"
        }`}
        title="Notifications & Announcements"
        aria-label="Notifications"
      >
        <Bell className="size-3.5" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#f53b70] text-[9px] font-black text-white flex items-center justify-center shadow-lg shadow-pink-600/50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <span className="absolute top-0 right-0 size-2 rounded-full bg-[#f53b70] animate-ping" />
          </>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#140b1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <div className="size-6 rounded-lg bg-[#f53b70]/20 flex items-center justify-center text-[#f53b70]">
                <Bell className="size-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">Notifications</h3>
                <span className="text-[10px] text-[#aeaeae]">
                  {unreadCount > 0 ? `${unreadCount} unread update(s)` : "All caught up"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[10px] text-pink-400 hover:text-pink-300 font-bold flex items-center space-x-1 px-2 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 transition-colors"
                >
                  <CheckCheck className="size-3" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="size-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#888] hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888] space-y-1">
                <p>No notifications yet</p>
                <p className="text-[10px] text-[#666]">Special drops and flash sales will appear here.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = (item as any).isRead;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors hover:bg-white/[0.03] space-y-1.5 ${
                      !isRead ? "bg-pink-500/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="size-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                          {getIconForType(item.type)}
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {item.title}
                        </h4>
                      </div>

                      {item.badge && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-pink-500/20 text-[#f53b70] text-[9px] font-black border border-pink-500/30 uppercase">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#aeaeae] leading-relaxed pl-8">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 pl-8">
                      {item.linkUrl ? (
                        <Link
                          href={item.linkUrl}
                          onClick={() => {
                            handleMarkAsRead(item.id);
                            setIsOpen(false);
                          }}
                          className="text-[11px] font-bold text-[#f53b70] hover:text-pink-300 flex items-center space-x-1 transition-colors"
                        >
                          <span>{item.actionText || "View Details"}</span>
                          <ExternalLink className="size-2.5" />
                        </Link>
                      ) : (
                        <span />
                      )}

                      {!isRead && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          className="text-[10px] text-white/40 hover:text-white/80 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
