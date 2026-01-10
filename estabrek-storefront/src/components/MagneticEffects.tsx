"use client";

import React, { useEffect, useRef, useState } from "react";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export function MagneticButton({ children, className = "", strength = 0.3, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = "translate(0, 0)";
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength]);

  return (
    <button ref={ref} className={`magnetic-button ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

// Custom Cursor Component
export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show custom cursor on desktop
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Track hover on interactive elements
    const handleHoverableEnter = () => setIsHovering(true);
    const handleHoverableLeave = () => setIsHovering(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    // Add hover listeners to interactive elements
    const hoverables = document.querySelectorAll("a, button, [role='button'], input, textarea, select, .hoverable");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", handleHoverableEnter);
      el.addEventListener("mouseleave", handleHoverableLeave);
    });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);

      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", handleHoverableEnter);
        el.removeEventListener("mouseleave", handleHoverableLeave);
      });
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Main cursor dot */}
      <div
        className="custom-cursor-dot"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.5 : 1})`,
        }}
      />
      {/* Cursor ring */}
      <div
        className="custom-cursor-ring"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`,
          opacity: isHovering ? 0.8 : 0.5,
        }}
      />
    </>
  );
}

// Spotlight Effect for Cards
export function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, visible: false });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    setSpotlight((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={ref}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        "--spotlight-x": `${spotlight.x}px`,
        "--spotlight-y": `${spotlight.y}px`,
        "--spotlight-opacity": spotlight.visible ? 1 : 0,
      } as React.CSSProperties}
    >
      <div className="spotlight-effect" />
      {children}
    </div>
  );
}
