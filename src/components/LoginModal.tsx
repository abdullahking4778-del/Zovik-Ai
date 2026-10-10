"use client";

import React, { useState } from "react";
import { 
  X, 
  LogIn, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  KeyRound 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "forgot";

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    resetPassword,
    loginPromptMessage, 
    setLoginPromptMessage 
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setMode("login");
    setLoginPromptMessage(null);
    onClose();
  };

  const switchMode = (newMode: AuthMode) => {
    setErrorMessage("");
    setSuccessMessage("");
    setMode(newMode);
  };

  const getFriendlyError = (err: unknown) => {
    const errorObj = err && typeof err === "object" ? (err as { code?: string; message?: string }) : null;
    const code = errorObj?.code || "";
    if (
      code === "auth/invalid-credential" || 
      code === "auth/wrong-password" || 
      code === "auth/user-not-found"
    ) {
      return "Invalid email or password. Please check your credentials.";
    }
    if (code === "auth/weak-password") {
      return "Password must be at least 6 characters long.";
    }
    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Google sign-in popup was closed.";
    }
    if (code === "auth/popup-blocked") {
      return "Browser ne Google popup ko block kar diya hai. Meharbani karke URL bar se popups allow karein ya seedha Chrome/Edge browser mein http://localhost:3000 open karein.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many failed attempts. Please wait a few moments or reset your password.";
    }
    return errorObj?.message || "Authentication failed. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    // FORGOT PASSWORD FLOW
    if (mode === "forgot") {
      setLoading(true);
      try {
        await resetPassword(cleanEmail);
        setSuccessMessage("Password reset link has been sent to your email! Please check your inbox (and spam folder).");
      } catch (err: unknown) {
        setErrorMessage(getFriendlyError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // SIGN IN FLOW
    if (mode === "login") {
      if (!password) {
        setErrorMessage("Please enter your password.");
        return;
      }

      setLoading(true);
      try {
        await loginWithEmail(cleanEmail, password);
        handleClose();
      } catch (err: unknown) {
        setErrorMessage(getFriendlyError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);
    try {
      await loginWithGoogle();
      handleClose();
    } catch (err: unknown) {
      setErrorMessage(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative flex flex-col w-full max-w-md bg-[#130b1b] rounded-3xl border border-white/10 shadow-2xl p-5 sm:p-7 overflow-hidden max-h-[94vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#aeaeae] hover:text-white transition-colors z-10"
        >
          <X className="size-4" />
        </button>

        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#f53b70]/20 via-[#8b5cf6]/10 to-transparent pointer-events-none" />

        {/* Header Icon & Title */}
        <div className="text-center relative mb-5">
          <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-pink-600/30">
            {mode === "forgot" ? (
              <KeyRound className="size-6 text-white" />
            ) : (
              <LogIn className="size-6 text-white" />
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white">
            {mode === "forgot" ? "Reset Password" : "Welcome Back"}
          </h3>
          <p className="text-xs text-[#aeaeae] mt-1">
            {mode === "forgot"
              ? "Enter your email to receive an instant password reset link."
              : "Sign in with Google or your email & password."}
          </p>
        </div>

        {/* Smart Auth Prompt (if triggered by guarded action) */}
        {loginPromptMessage && (
          <div className="flex items-center space-x-2 p-3 rounded-2xl bg-[#f53b70]/15 border border-[#f53b70]/30 text-pink-200 text-xs mb-4 animate-fadeIn">
            <Sparkles className="size-4 shrink-0 text-[#f53b70]" />
            <span className="font-semibold leading-tight">{loginPromptMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs mb-4 animate-fadeIn">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-tight font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-start space-x-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs mb-4 animate-fadeIn">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-tight font-medium">{successMessage}</span>
          </div>
        )}

        {/* 1-Click Google Sign In (for real Firebase Google Auth) */}
        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-extrabold text-xs shadow-md hover:bg-gray-100 active:scale-98 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-60 mb-4"
            >
              <svg viewBox="0 0 24 24" className="size-4 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-x-0 h-px bg-white/10" />
              <span className="relative px-3 bg-[#130b1b] text-[10px] uppercase font-bold text-[#aeaeae]">
                Or with email & password
              </span>
            </div>
          </>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#aeaeae]">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 size-4 text-[#aeaeae]" />
              <input
                type="email"
                required
                placeholder="yourname@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-[#666] outline-none focus:border-[#f53b70] transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          {mode !== "forgot" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#aeaeae]">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-[11px] font-semibold text-[#f53b70] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 size-4 text-[#aeaeae]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-[#666] outline-none focus:border-[#f53b70] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#aeaeae] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white font-black text-xs shadow-lg shadow-pink-600/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "forgot" ? (
              <span>Send Reset Link 🔑</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Bottom Switcher (Only for Forgot Password) */}
        {mode === "forgot" && (
          <div className="mt-4 pt-3 border-t border-white/5 text-center text-xs text-[#aeaeae]">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="inline-flex items-center space-x-1.5 font-bold text-white hover:text-[#f53b70] transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center justify-center space-x-1.5 text-[10px] text-[#777] mt-4">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span>Real Firebase Auth • Encrypted & Secure</span>
        </div>
      </div>
    </div>
  );
}
