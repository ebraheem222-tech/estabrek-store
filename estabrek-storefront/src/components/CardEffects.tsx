"use client";

import React, { useRef, useState } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glareEnable?: boolean;
  glareMaxOpacity?: number;
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 15,
  perspective = 1000,
  scale = 1.02,
  speed = 400,
  glareEnable = true,
  glareMaxOpacity = 0.3,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (-mouseY / (rect.height / 2)) * maxTilt;
    const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
    
    setTransform(`perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`);
    
    if (glareEnable) {
      const glareX = (mouseX / rect.width + 0.5) * 100;
      const glareY = (mouseY / rect.height + 0.5) * 100;
      setGlareStyle({
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${glareMaxOpacity}), transparent 60%)`,
        opacity: 1,
      });
    }
  };

  const handleMouseLeave = () => {
    setTransform("");
    setGlareStyle({ opacity: 0 });
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`,
        transformStyle: "preserve-3d",
      }}
    >
      {glareEnable && (
        <div
          className="tilt-card-glare"
          style={{
            ...glareStyle,
            transition: `opacity ${speed}ms ease`,
          }}
        />
      )}
      <div className="tilt-card-content" style={{ transform: "translateZ(30px)" }}>
        {children}
      </div>
    </div>
  );
}

// Flip Card Component
interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export function FlipCard({ front, back, className = "" }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={`flip-card ${isFlipped ? "flipped" : ""} ${className}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">{front}</div>
        <div className="flip-card-back">{back}</div>
      </div>
    </div>
  );
}

// Hover Reveal Card
interface HoverRevealProps {
  image: string;
  title: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export function HoverRevealCard({ image, title, subtitle, className = "", onClick }: HoverRevealProps) {
  return (
    <div className={`hover-reveal-card ${className}`} onClick={onClick}>
      <div className="hover-reveal-image">
        <img src={image} alt={title} />
      </div>
      <div className="hover-reveal-content">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="hover-reveal-overlay" />
    </div>
  );
}

// Morphing Card (changes shape on hover)
interface MorphCardProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: { default: string; hover: string };
}

export function MorphCard({
  children,
  className = "",
  borderRadius = { default: "1.5rem", hover: "2.5rem" },
}: MorphCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`morph-card ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: isHovered ? borderRadius.hover : borderRadius.default,
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}
