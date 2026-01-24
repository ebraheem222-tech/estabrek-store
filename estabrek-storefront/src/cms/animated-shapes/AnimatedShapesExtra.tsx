import React from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL ANIMATED SHAPE COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface AnimatedShapeProps {
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  speed?: 'slow' | 'normal' | 'fast';
  opacity?: number;
}

// ═══════════════════════════════════════════════════════════════
// TRIANGLES
// ═══════════════════════════════════════════════════════════════

export const TriangleFloat: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'green',
  size = 'md',
  speed = 'normal',
  opacity = 0.5,
}) => {
  const sizes = { sm: 24, md: 40, lg: 60, xl: 80 };
  const speeds = { slow: '7s', normal: '5s', fast: '3s' };
  const colors: Record<string, string> = {
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
  };

  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <svg
        width={sizes[size]}
        height={sizes[size]}
        viewBox="0 0 64 64"
        style={{
          opacity,
          animation: `float ${speeds[speed]} ease-in-out infinite`,
        }}
      >
        <polygon points="32,8 56,56 8,56" fill={colors[color] || color} />
      </svg>
    </div>
  );
};

export const TrianglesScatter: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 8,
  opacity = 0.4,
}) => {
  const triangles = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 30 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 5,
    rotation: Math.random() * 360,
    color: ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'][i % 5],
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {triangles.map((tri, i) => (
        <svg
          key={i}
          className="absolute"
          width={tri.size}
          height={tri.size}
          viewBox="0 0 64 64"
          style={{
            left: `${tri.x}%`,
            top: `${tri.y}%`,
            opacity,
            transform: `rotate(${tri.rotation}deg)`,
            animation: `float ${tri.duration}s ease-in-out infinite`,
            animationDelay: `${tri.delay}s`,
          }}
        >
          <polygon points="32,8 56,56 8,56" fill={tri.color} />
        </svg>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CONFETTI & CELEBRATION
// ═══════════════════════════════════════════════════════════════

export const Confetti: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 30,
  opacity = 0.8,
}) => {
  const pieces = Array.from({ length: count }, (_, i) => ({
    width: Math.random() * 10 + 5,
    height: Math.random() * 15 + 5,
    x: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 4,
    rotation: Math.random() * 360,
    color: ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'][i % 6],
    shape: i % 3, // 0: rect, 1: circle, 2: triangle
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {pieces.map((piece, i) => (
        <div
          key={i}
          className={`absolute ${piece.color} ${piece.shape === 1 ? 'rounded-full' : piece.shape === 0 ? 'rounded-sm' : ''}`}
          style={{
            width: piece.width,
            height: piece.shape === 1 ? piece.width : piece.height,
            left: `${piece.x}%`,
            top: '-5%',
            opacity,
            transform: `rotate(${piece.rotation}deg)`,
            animation: `slide-down ${piece.duration}s linear infinite`,
            animationDelay: `${piece.delay}s`,
            clipPath: piece.shape === 2 ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : undefined,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SNOW & WEATHER
// ═══════════════════════════════════════════════════════════════

export const Snow: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 40,
  opacity = 0.8,
}) => {
  const flakes = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 6 + 2,
    x: Math.random() * 100,
    delay: Math.random() * 10,
    duration: Math.random() * 5 + 8,
    sway: Math.random() * 20 - 10,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {flakes.map((flake, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            width: flake.size,
            height: flake.size,
            left: `${flake.x}%`,
            top: '-2%',
            opacity,
            animation: `slide-down ${flake.duration}s linear infinite`,
            animationDelay: `${flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export const Rain: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 50,
  opacity = 0.5,
}) => {
  const drops = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: Math.random() * 0.5 + 0.5,
    height: Math.random() * 15 + 10,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {drops.map((drop, i) => (
        <div
          key={i}
          className="absolute w-0.5 bg-gradient-to-b from-blue-300 to-transparent rounded-full"
          style={{
            height: drop.height,
            left: `${drop.x}%`,
            top: '-5%',
            opacity,
            animation: `slide-down ${drop.duration}s linear infinite`,
            animationDelay: `${drop.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FIREFLIES & GLOWING
// ═══════════════════════════════════════════════════════════════

export const Fireflies: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 15,
  opacity = 0.8,
}) => {
  const flies = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 4 + 4,
    glowDuration: Math.random() * 2 + 1,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {flies.map((fly, i) => (
        <div
          key={i}
          className="absolute bg-yellow-300 rounded-full"
          style={{
            width: fly.size,
            height: fly.size,
            left: `${fly.x}%`,
            top: `${fly.y}%`,
            opacity,
            boxShadow: '0 0 10px #fde047, 0 0 20px #fde047',
            animation: `float ${fly.duration}s ease-in-out infinite, fade ${fly.glowDuration}s ease-in-out infinite`,
            animationDelay: `${fly.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ORBIT & PLANETARY
// ═══════════════════════════════════════════════════════════════

export const CirclesOrbit: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 3,
  opacity = 0.6,
}) => {
  const orbits = Array.from({ length: count }, (_, i) => ({
    radius: 50 + i * 40,
    size: 12 - i * 2,
    duration: 5 + i * 3,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-pink-500'][i % 3],
  }));

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      {/* Center */}
      <div className="absolute w-8 h-8 bg-yellow-500 rounded-full" style={{ opacity, boxShadow: '0 0 20px #fbbf24' }} />
      
      {/* Orbiting elements */}
      {orbits.map((orbit, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-gray-300/30"
          style={{
            width: orbit.radius * 2,
            height: orbit.radius * 2,
          }}
        >
          <div
            className={`absolute ${orbit.color} rounded-full`}
            style={{
              width: orbit.size,
              height: orbit.size,
              top: -orbit.size / 2,
              left: '50%',
              marginLeft: -orbit.size / 2,
              opacity,
              animation: `orbit ${orbit.duration}s linear infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// GRID PATTERNS
// ═══════════════════════════════════════════════════════════════

export const TechGrid: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'blue',
  opacity = 0.1,
}) => {
  const colors: Record<string, string> = {
    blue: 'stroke-blue-500',
    purple: 'stroke-purple-500',
    cyan: 'stroke-cyan-500',
    green: 'stroke-green-500',
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg className="w-full h-full" style={{ opacity }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              className={colors[color] || colors.blue}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Animated highlight */}
      <div
        className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
        style={{
          top: '50%',
          opacity: 0.3,
          animation: 'slide-down 5s linear infinite',
        }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// GRADIENT BACKGROUNDS
// ═══════════════════════════════════════════════════════════════

export const GradientOrbs: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.5,
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full blur-3xl"
        style={{ opacity, animation: 'float 8s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-pink-600 to-orange-600 rounded-full blur-3xl"
        style={{ opacity, animation: 'float 10s ease-in-out infinite', animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-1/3 h-1/3 bg-gradient-to-br from-cyan-600 to-green-600 rounded-full blur-3xl"
        style={{ opacity: opacity * 0.7, animation: 'float 12s ease-in-out infinite', animationDelay: '4s' }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CYBER / TECH SHAPES
// ═══════════════════════════════════════════════════════════════

export const CyberShapes: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.6,
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Hexagon */}
      <svg
        className="absolute top-10 left-10 w-20 h-20"
        viewBox="0 0 100 100"
        style={{ opacity, animation: 'rotate 20s linear infinite' }}
      >
        <polygon
          points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
        />
      </svg>
      
      {/* Diamond */}
      <svg
        className="absolute bottom-20 right-20 w-16 h-16"
        viewBox="0 0 100 100"
        style={{ opacity, animation: 'pulse 3s ease-in-out infinite' }}
      >
        <polygon
          points="50,10 90,50 50,90 10,50"
          fill="none"
          stroke="#ec4899"
          strokeWidth="2"
        />
      </svg>
      
      {/* Plus */}
      <svg
        className="absolute top-1/2 left-1/4 w-12 h-12"
        viewBox="0 0 100 100"
        style={{ opacity, animation: 'rotate 15s linear infinite reverse' }}
      >
        <path
          d="M50,20 L50,80 M20,50 L80,50"
          stroke="#8b5cf6"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Circle outline */}
      <div
        className="absolute bottom-1/3 left-1/2 w-24 h-24 border-2 border-cyan-500 rounded-full"
        style={{ opacity, animation: 'pulse-glow 4s ease-in-out infinite' }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RETRO / VINTAGE
// ═══════════════════════════════════════════════════════════════

export const RetroShapes: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.5,
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Sunburst lines */}
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 w-1 h-[200%] bg-gradient-to-t from-orange-500/0 via-orange-500 to-orange-500/0"
          style={{
            opacity: opacity * 0.3,
            transform: `rotate(${i * 30}deg)`,
            transformOrigin: 'center center',
          }}
        />
      ))}
      
      {/* Circles */}
      <div
        className="absolute top-20 right-20 w-16 h-16 bg-yellow-500 rounded-full"
        style={{ opacity, animation: 'bounce 2s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-20 left-20 w-12 h-12 bg-pink-500 rounded-full"
        style={{ opacity, animation: 'bounce 2.5s ease-in-out infinite', animationDelay: '0.5s' }}
      />
      
      {/* Squiggly line */}
      <svg className="absolute top-1/3 left-10 w-32 h-8" style={{ opacity }}>
        <path
          d="M0,15 Q10,0 20,15 T40,15 T60,15 T80,15 T100,15 T120,15"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MINIMAL / ELEGANT
// ═══════════════════════════════════════════════════════════════

export const MinimalShapes: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.3,
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Thin circles */}
      <div
        className="absolute top-10 right-10 w-32 h-32 border border-gray-400 rounded-full"
        style={{ opacity, animation: 'float 8s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-20 left-10 w-24 h-24 border border-gray-400 rounded-full"
        style={{ opacity, animation: 'float 10s ease-in-out infinite', animationDelay: '2s' }}
      />
      
      {/* Thin lines */}
      <div
        className="absolute top-1/2 left-0 w-1/3 h-px bg-gray-400"
        style={{ opacity, animation: 'fade 4s ease-in-out infinite' }}
      />
      <div
        className="absolute top-1/3 right-0 w-1/4 h-px bg-gray-400"
        style={{ opacity, animation: 'fade 5s ease-in-out infinite', animationDelay: '1s' }}
      />
      
      {/* Small dot */}
      <div
        className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-gray-500 rounded-full"
        style={{ opacity, animation: 'pulse 3s ease-in-out infinite' }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COSMIC / SPACE
// ═══════════════════════════════════════════════════════════════

export const CosmicShapes: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 50,
  opacity = 0.7,
}) => {
  const stars = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none bg-gray-950 ${className}`}>
      {/* Stars */}
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            width: star.size,
            height: star.size,
            left: `${star.x}%`,
            top: `${star.y}%`,
            opacity,
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      
      {/* Nebula */}
      <div
        className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full blur-3xl"
        style={{ animation: 'morph 15s ease-in-out infinite' }}
      />
      
      {/* Shooting star */}
      <div
        className="absolute w-20 h-0.5 bg-gradient-to-r from-white to-transparent rounded-full"
        style={{
          top: '20%',
          left: '-10%',
          transform: 'rotate(-45deg)',
          animation: 'slide-down 3s linear infinite',
          animationDelay: '5s',
        }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// NATURE / ORGANIC
// ═══════════════════════════════════════════════════════════════

export const NatureShapes: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.4,
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Leaves */}
      <svg
        className="absolute top-10 left-10 w-16 h-16"
        viewBox="0 0 100 100"
        style={{ opacity, animation: 'float 6s ease-in-out infinite' }}
      >
        <path
          d="M50,10 Q80,30 70,60 Q60,90 50,90 Q40,90 30,60 Q20,30 50,10"
          fill="#22c55e"
        />
      </svg>
      
      <svg
        className="absolute bottom-20 right-20 w-12 h-12"
        viewBox="0 0 100 100"
        style={{ opacity, animation: 'float 8s ease-in-out infinite', animationDelay: '2s', transform: 'rotate(45deg)' }}
      >
        <path
          d="M50,10 Q80,30 70,60 Q60,90 50,90 Q40,90 30,60 Q20,30 50,10"
          fill="#4ade80"
        />
      </svg>
      
      {/* Flower */}
      <svg
        className="absolute top-1/2 left-1/4 w-20 h-20"
        viewBox="0 0 100 100"
        style={{ opacity, animation: 'rotate 20s linear infinite' }}
      >
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="25"
            rx="15"
            ry="25"
            fill="#f472b6"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="10" fill="#fbbf24" />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════

export const additionalShapeComponents = {
  'triangle-float': TriangleFloat,
  'triangle-rotate': TriangleFloat,
  'triangles-scatter': TrianglesScatter,
  'triangles-geometric': TrianglesScatter,
  'confetti': Confetti,
  'snow': Snow,
  'rain': Rain,
  'fireflies': Fireflies,
  'circles-orbit': CirclesOrbit,
  'tech-grid': TechGrid,
  'gradient-shapes': GradientOrbs,
  'cyber-shapes': CyberShapes,
  'retro-shapes': RetroShapes,
  'minimal-shapes': MinimalShapes,
  'cosmic-shapes': CosmicShapes,
  'nature-shapes': NatureShapes,
  'playful-shapes': Confetti,
  'elegant-shapes': MinimalShapes,
  'abstract-shapes': GradientOrbs,
  'stars-shooting': CosmicShapes,
};

export default additionalShapeComponents;
