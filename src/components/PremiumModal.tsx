"use client";

import React from "react";
import CoinStoreModal from "./CoinStoreModal";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  return <CoinStoreModal isOpen={isOpen} onClose={onClose} />;
}
