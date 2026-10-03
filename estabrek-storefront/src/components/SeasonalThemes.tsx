"use client";

import React, { useEffect, useState, useRef, createContext, useContext } from "react";

type SeasonalTheme = "default" | "ramadan" | "eid" | "black-friday" | "winter" | "summer";
type SeasonalThemeMode = "auto" | "none" | SeasonalTheme;

interface SeasonalContextValue {
  theme: SeasonalTheme;
  setTheme: (theme: SeasonalTheme) => void;
}

const SeasonalContext = createContext<SeasonalContextValue>({
  theme: "default",
  setTheme: () => {},
});

export function useSeasonalTheme() {
  return useContext(SeasonalContext);
}

// Provider
export function SeasonalThemeProvider({
  children,
  mode = "auto",
  effectsEnabled = true,
}: {
  children: React.ReactNode;
  mode?: SeasonalThemeMode;
  effectsEnabled?: boolean;
}) {
  const [theme, setTheme] = useState<SeasonalTheme>("default");
  const [showEffects, setShowEffects] = useState(false);

  // Auto-detect season and check if should show effects
  useEffect(() => {
    if (!effectsEnabled || mode === "none") {
      setTheme("default");
      setShowEffects(false);
      return;
    }

    if (mode && mode !== "auto") {
      setTheme(mode);
      setShowEffects(true);

      const timer = setTimeout(() => {
        setShowEffects(false);
      }, 20000);

      return () => clearTimeout(timer);
    }

    // Check localStorage for last seen time
    const lastSeen = localStorage.getItem("seasonal_effects_last_seen");
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in ms
    
    // Only show effects if not seen in the last hour
    const shouldShow = !lastSeen || (now - parseInt(lastSeen)) > oneHour;

    const currentDate = new Date();
    const month = currentDate.getMonth(); // 0-11
    const day = currentDate.getDate();

    // Detect season
    let detectedTheme: SeasonalTheme = "default";
    
    // Winter (Dec-Feb)
    if (month === 11 || month === 0 || month === 1) {
      detectedTheme = "winter";
    }
    // Black Friday (November 20-30)
    else if (month === 10 && day >= 20 && day <= 30) {
      detectedTheme = "black-friday";
    }
    // Summer (June-Aug)
    else if (month >= 5 && month <= 7) {
      detectedTheme = "summer";
    }

    setTheme(detectedTheme);

    if (shouldShow && detectedTheme !== "default") {
      setShowEffects(true);
      localStorage.setItem("seasonal_effects_last_seen", now.toString());
      
      // Auto-hide effects after 20 seconds
      const timer = setTimeout(() => {
        setShowEffects(false);
      }, 20000);

      return () => clearTimeout(timer);
    }
  }, [effectsEnabled, mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-seasonal-theme", theme);
  }, [theme]);

  return (
    <SeasonalContext.Provider value={{ theme, setTheme }}>
      {children}
      {/* Only show effects if enabled */}
      {showEffects && <SeasonalEffectsDisplay theme={theme} onClose={() => setShowEffects(false)} />}
    </SeasonalContext.Provider>
  );
}

// Separate effects display component with close button
function SeasonalEffectsDisplay({ theme, onClose }: { theme: SeasonalTheme; onClose: () => void }) {
  if (theme === "default") return null;

  return (
    <div className="seasonal-effects-wrapper">
      <button 
        onClick={onClose}
        className="seasonal-close-btn"
        title="إخفاء التأثيرات"
      >
        ✕
      </button>
      {theme === "winter" && <WinterEffect count={30} />}
      {theme === "ramadan" && <RamadanEffect />}
      {theme === "eid" && <EidEffect />}
      {theme === "black-friday" && <BlackFridayEffect />}
      {theme === "summer" && <SummerEffect />}
    </div>
  );
}

// ============ SNOW EFFECT ============
interface SnowflakeProps {
  id: number;
}

function Snowflake({ id }: SnowflakeProps) {
  const style = {
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 10 + 10}s`,
    animationDelay: `${Math.random() * 5}s`,
    opacity: Math.random() * 0.6 + 0.4,
    fontSize: `${Math.random() * 10 + 8}px`,
  };

  return (
    <div className="snowflake" style={style}>
      ❄
    </div>
  );
}

export function WinterEffect({ count = 50 }: { count?: number }) {
  const [snowflakes] = useState(() =>
    Array.from({ length: count }, (_, i) => i)
  );

  return (
    <div className="winter-effect">
      {snowflakes.map((id) => (
        <Snowflake key={id} id={id} />
      ))}
    </div>
  );
}

// ============ RAMADAN EFFECT ============
interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

export function RamadanEffect() {
  const [stars] = useState<Star[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 50,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 3,
    }))
  );

  return (
    <div className="ramadan-effect">
      {/* Moon/Crescent */}
      <div className="ramadan-moon">
        <div className="crescent">🌙</div>
      </div>

      {/* Stars */}
      <div className="ramadan-stars">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Decorative Lanterns */}
      <div className="ramadan-lanterns">
        <div className="lantern lantern-1">🏮</div>
        <div className="lantern lantern-2">🏮</div>
        <div className="lantern lantern-3">🏮</div>
      </div>
    </div>
  );
}

// ============ EID EFFECT ============
interface Balloon {
  id: number;
  x: number;
  color: string;
  delay: number;
  speed: number;
}

interface Confetti {
  id: number;
  x: number;
  color: string;
  delay: number;
}

export function EidEffect() {
  const [balloons] = useState<Balloon[]>(() => {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6", "#3498DB"];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 10,
      speed: Math.random() * 10 + 15,
    }));
  });

  const [confetti] = useState<Confetti[]>(() => {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6", "#3498DB", "#E74C3C"];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 5,
    }));
  });

  return (
    <div className="eid-effect">
      {/* Balloons */}
      <div className="eid-balloons">
        {balloons.map((balloon) => (
          <div
            key={balloon.id}
            className="balloon"
            style={{
              left: `${balloon.x}%`,
              backgroundColor: balloon.color,
              animationDelay: `${balloon.delay}s`,
              animationDuration: `${balloon.speed}s`,
            }}
          >
            <div className="balloon-string" />
          </div>
        ))}
      </div>

      {/* Confetti */}
      <div className="eid-confetti">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{
              left: `${c.x}%`,
              backgroundColor: c.color,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Celebration Text */}
      <div className="eid-text">
        <span>🎉</span>
        <span>عيد مبارك</span>
        <span>🎊</span>
      </div>
    </div>
  );
}

// ============ BLACK FRIDAY EFFECT ============
export function BlackFridayEffect() {
  return (
    <div className="black-friday-effect">
      {/* Fire particles */}
      <div className="fire-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="fire-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Sale badge */}
      <div className="bf-badge">
        <span className="bf-text">BLACK FRIDAY</span>
        <span className="bf-discount">خصم حتى 70%</span>
      </div>

      {/* Neon border */}
      <div className="bf-neon-border" />
    </div>
  );
}

// ============ SUMMER EFFECT ============
export function SummerEffect() {
  return (
    <div className="summer-effect">
      {/* Sun */}
      <div className="summer-sun">☀️</div>

      {/* Beach waves */}
      <div className="summer-waves">
        <div className="wave wave-1" />
        <div className="wave wave-2" />
      </div>

      {/* Palm trees (corners) */}
      <div className="summer-palms">
        <span className="palm palm-left">🌴</span>
        <span className="palm palm-right">🌴</span>
      </div>
    </div>
  );
}

// ============ MAIN SEASONAL EFFECTS COMPONENT ============
interface SeasonalEffectsProps {
  duration?: number; // seconds
  interval?: number; // minutes
  particleCount?: number;
}

export function SeasonalEffects({ 
  duration = 15, 
  interval = 60,
  particleCount = 25 
}: SeasonalEffectsProps) {
  const { theme } = useSeasonalTheme();
  const [showEffects, setShowEffects] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if effects were dismissed or shown recently
    const lastSeen = localStorage.getItem("seasonal_effects_last_seen");
    const wasDismissed = localStorage.getItem("seasonal_effects_dismissed");
    const now = Date.now();
    const intervalMs = interval * 60 * 1000; // Convert minutes to ms

    // Don't show if dismissed in this session or seen within the interval
    if (wasDismissed === "true") {
      return;
    }

    if (lastSeen && (now - parseInt(lastSeen)) < intervalMs) {
      return;
    }

    // Show effects after a short delay
    const timer = setTimeout(() => {
      setShowEffects(true);
      localStorage.setItem("seasonal_effects_last_seen", now.toString());
    }, 2000);

    // Auto-hide after duration
    const hideTimer = setTimeout(() => {
      setShowEffects(false);
    }, 2000 + (duration * 1000));

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [duration, interval]);

  const handleDismiss = () => {
    setShowEffects(false);
    setDismissed(true);
    localStorage.setItem("seasonal_effects_dismissed", "true");
  };

  if (!showEffects || dismissed || theme === "default") return null;

  return (
    <div className="seasonal-effects-overlay">
      <button onClick={handleDismiss} className="seasonal-dismiss-btn" title="إخفاء التأثيرات">
        ✕
      </button>
      {theme === "winter" && <WinterEffect count={particleCount} />}
      {theme === "ramadan" && <RamadanEffect />}
      {theme === "eid" && <EidEffect />}
      {theme === "black-friday" && <BlackFridayEffect />}
      {theme === "summer" && <SummerEffect />}
    </div>
  );
}

// ============ THEME SWITCHER (for testing/admin) ============
export function SeasonalThemeSwitcher() {
  const { theme, setTheme } = useSeasonalTheme();

  const themes: { value: SeasonalTheme; label: string; icon: string }[] = [
    { value: "default", label: "عادي", icon: "🎨" },
    { value: "ramadan", label: "رمضان", icon: "🌙" },
    { value: "eid", label: "العيد", icon: "🎉" },
    { value: "black-friday", label: "الجمعة السوداء", icon: "🔥" },
    { value: "winter", label: "الشتاء", icon: "❄️" },
    { value: "summer", label: "الصيف", icon: "☀️" },
  ];

  return (
    <div className="seasonal-switcher">
      <span className="switcher-label">المظهر الموسمي:</span>
      <div className="switcher-options">
        {themes.map((t) => (
          <button
            key={t.value}
            className={`switcher-option ${theme === t.value ? "active" : ""}`}
            onClick={() => setTheme(t.value)}
            title={t.label}
          >
            <span>{t.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ PROMOTIONAL BANNER WITH THEME ============
interface SeasonalBannerProps {
  className?: string;
}

export function SeasonalPromoBanner({ className = "" }: SeasonalBannerProps) {
  const { theme } = useSeasonalTheme();

  const content: Record<SeasonalTheme, { title: string; subtitle: string; cta: string; icon: string }> = {
    default: {
      title: "عروض حصرية",
      subtitle: "تسوق الآن واستمتع بأفضل الأسعار",
      cta: "تسوق الآن",
      icon: "🛍️",
    },
    ramadan: {
      title: "عروض رمضان",
      subtitle: "خصومات مميزة طوال الشهر الكريم",
      cta: "تسوق عروض رمضان",
      icon: "🌙",
    },
    eid: {
      title: "عروض العيد",
      subtitle: "احتفل معنا بأفضل التخفيضات",
      cta: "تسوق عروض العيد",
      icon: "🎊",
    },
    "black-friday": {
      title: "الجمعة السوداء",
      subtitle: "خصومات تصل حتى 70%",
      cta: "لا تفوت الفرصة",
      icon: "🔥",
    },
    winter: {
      title: "تخفيضات الشتاء",
      subtitle: "دفء وأناقة بأسعار لا تقاوم",
      cta: "تسوق مجموعة الشتاء",
      icon: "❄️",
    },
    summer: {
      title: "عروض الصيف",
      subtitle: "أجواء صيفية وخصومات حارة",
      cta: "تسوق مجموعة الصيف",
      icon: "☀️",
    },
  };

  const { title, subtitle, cta, icon } = content[theme];

  return (
    <div className={`seasonal-promo-banner ${theme} ${className}`}>
      <div className="promo-content">
        <span className="promo-icon">{icon}</span>
        <div className="promo-text">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <a href="/shop" className="promo-cta">{cta}</a>
      </div>
    </div>
  );
}
