"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useStorefrontSettings } from "./StorefrontFeaturesProvider";
import { useConfetti, useHeartBurst, ConfettiCanvas, HeartBurstCanvas } from "./Animations";

interface AnimationEffectsContextValue {
  fireConfetti: (x?: number, y?: number) => void;
  fireHeartBurst: (x?: number, y?: number) => void;
}

const AnimationEffectsContext = createContext<AnimationEffectsContextValue>({
  fireConfetti: () => {},
  fireHeartBurst: () => {},
});

export function useAnimationEffects() {
  return useContext(AnimationEffectsContext);
}

export function AnimationEffectsProvider({ children }: { children: React.ReactNode }) {
  const settings = useStorefrontSettings();
  const confetti = useConfetti();
  const heartBurst = useHeartBurst();

  const fireConfetti = useCallback((x?: number, y?: number) => {
    if (settings.confettiOnAddToCart) {
      confetti.fire(x, y);
    }
  }, [settings.confettiOnAddToCart, confetti]);

  const fireHeartBurst = useCallback((x?: number, y?: number) => {
    if (settings.heartBurstOnWishlist) {
      heartBurst.burst(x, y);
    }
  }, [settings.heartBurstOnWishlist, heartBurst]);

  return (
    <AnimationEffectsContext.Provider value={{ fireConfetti, fireHeartBurst }}>
      {children}
      <ConfettiCanvas particles={confetti.particles} isActive={confetti.isActive} />
      <HeartBurstCanvas hearts={heartBurst.hearts} isActive={heartBurst.isActive} />
    </AnimationEffectsContext.Provider>
  );
}
