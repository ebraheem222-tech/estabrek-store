"use client";

import React, { useEffect, useState, useCallback } from "react";
import { LoadingImg } from "@/components/LoadingImg";

// Confetti Particle
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocity: { x: number; y: number };
  rotationVelocity: number;
}

// Confetti Animation
export function useConfetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  const colors = [
    "#8b5cf6", // purple
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#ec4899", // pink
    "#f43f5e", // rose
  ];

  const fire = useCallback((x?: number, y?: number) => {
    const centerX = x ?? window.innerWidth / 2;
    const centerY = y ?? window.innerHeight / 2;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        velocity: {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20 - 10,
        },
        rotationVelocity: (Math.random() - 0.5) * 20,
      });
    }

    setParticles(newParticles);
    setIsActive(true);

    setTimeout(() => {
      setIsActive(false);
      setParticles([]);
    }, 2000);
  }, []);

  return { particles, isActive, fire };
}

export function ConfettiCanvas({ particles, isActive }: { particles: Particle[]; isActive: boolean }) {
  const [animatedParticles, setAnimatedParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) return;

    setAnimatedParticles(particles);

    const interval = setInterval(() => {
      setAnimatedParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocity.x,
            y: p.y + p.velocity.y + 2, // gravity
            rotation: p.rotation + p.rotationVelocity,
            velocity: {
              x: p.velocity.x * 0.99,
              y: p.velocity.y + 0.5,
            },
            scale: p.scale * 0.99,
          }))
          .filter((p) => p.y < window.innerHeight + 100 && p.scale > 0.1)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles, isActive]);

  if (!isActive) return null;

  return (
    <div className="confetti-container">
      {animatedParticles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.x,
            top: p.y,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
          }}
        />
      ))}
    </div>
  );
}

// Heart Burst Animation
interface Heart {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
}

export function useHeartBurst() {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [isActive, setIsActive] = useState(false);

  const burst = useCallback((x?: number, y?: number) => {
    const centerX = x ?? window.innerWidth / 2;
    const centerY = y ?? window.innerHeight / 2;

    const newHearts: Heart[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      newHearts.push({
        id: Date.now() + i,
        x: centerX + Math.cos(angle) * 50,
        y: centerY + Math.sin(angle) * 50,
        scale: Math.random() * 0.5 + 0.5,
        opacity: 1,
        rotation: Math.random() * 60 - 30,
      });
    }

    setHearts(newHearts);
    setIsActive(true);

    setTimeout(() => {
      setIsActive(false);
      setHearts([]);
    }, 1000);
  }, []);

  return { hearts, isActive, burst };
}

export function HeartBurstCanvas({ hearts, isActive }: { hearts: Heart[]; isActive: boolean }) {
  const [animatedHearts, setAnimatedHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (!isActive) return;

    setAnimatedHearts(hearts);

    const startTime = Date.now();
    const duration = 800;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setAnimatedHearts((prev) =>
        prev.map((h, i) => {
          const angle = (i / prev.length) * Math.PI * 2;
          const distance = progress * 80;
          return {
            ...h,
            x: hearts[i].x + Math.cos(angle) * distance,
            y: hearts[i].y + Math.sin(angle) * distance - progress * 30,
            scale: h.scale * (1 - progress * 0.5),
            opacity: 1 - progress,
          };
        })
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hearts, isActive]);

  if (!isActive) return null;

  return (
    <div className="heart-burst-container">
      {animatedHearts.map((h) => (
        <div
          key={h.id}
          className="heart-particle"
          style={{
            left: h.x,
            top: h.y,
            transform: `translate(-50%, -50%) scale(${h.scale}) rotate(${h.rotation}deg)`,
            opacity: h.opacity,
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}

// Ripple Effect Button
interface RippleButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function RippleButton({ children, className = "", onClick }: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);

    setTimeout(() => {
      setRipples((prev) => prev.slice(1));
    }, 600);

    onClick?.(e);
  };

  return (
    <button className={`ripple-button ${className}`} onClick={handleClick}>
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </button>
  );
}

// Add to Cart Success Animation
export function AddToCartSuccess({ isVisible, productImage }: { isVisible: boolean; productImage?: string }) {
  if (!isVisible) return null;

  return (
    <div className="add-to-cart-success">
      <div className="success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {productImage && (
        <div className="success-image">
          <LoadingImg src={productImage} alt="Added to cart" className="h-full w-full object-cover" />
        </div>
      )}
      <span className="success-text">تمت الإضافة للسلة!</span>
    </div>
  );
}

// Flying Cart Animation (product flies to cart icon)
export function useFlyToCart() {
  const fly = useCallback((
    fromElement: HTMLElement,
    toElement: HTMLElement,
    imageUrl?: string
  ) => {
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();

    const flyingEl = document.createElement("div");
    flyingEl.className = "flying-to-cart";
    flyingEl.innerHTML = imageUrl
      ? `<img src="${imageUrl}" alt="" loading="lazy" decoding="async" />`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3.5 6h17M16 10a4 4 0 01-8 0"/></svg>`;

    flyingEl.style.cssText = `
      position: fixed;
      left: ${fromRect.left + fromRect.width / 2}px;
      top: ${fromRect.top + fromRect.height / 2}px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 9999;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    `;

    if (imageUrl) {
      const img = flyingEl.querySelector("img");
      if (img) {
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover; border-radius: 50%;";
      }
    }

    document.body.appendChild(flyingEl);

    // Animate to cart
    requestAnimationFrame(() => {
      flyingEl.style.transition = "all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
      flyingEl.style.left = `${toRect.left + toRect.width / 2}px`;
      flyingEl.style.top = `${toRect.top + toRect.height / 2}px`;
      flyingEl.style.transform = "translate(-50%, -50%) scale(0.3)";
      flyingEl.style.opacity = "0";
    });

    setTimeout(() => {
      flyingEl.remove();
    }, 800);
  }, []);

  return { fly };
}
