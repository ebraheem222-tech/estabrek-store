"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

const RotateIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const ZoomInIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
  </svg>
);

const FullscreenIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  </svg>
);

interface Product360ViewProps {
  images: string[];
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  className?: string;
  showControls?: boolean;
  enableZoom?: boolean;
  enableFullscreen?: boolean;
}

export function Product360View({
  images,
  autoRotate = false,
  autoRotateSpeed = 100,
  className = "",
  showControls = true,
  enableZoom = true,
  enableFullscreen = true,
}: Product360ViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoRotate);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const autoPlayRef = useRef<NodeJS.Timeout>();

  const totalFrames = images.length;

  // Preload images
  useEffect(() => {
    setIsLoading(true);
    setLoadedCount(0);

    images.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        setLoadedCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= totalFrames) {
            setIsLoading(false);
          }
          return newCount;
        });
      };
      img.src = src;
    });
  }, [images, totalFrames]);

  // Auto-rotate
  useEffect(() => {
    if (isAutoPlaying && !isDragging && !isLoading) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalFrames);
      }, autoRotateSpeed);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, isDragging, isLoading, totalFrames, autoRotateSpeed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAutoPlaying(false);
    startXRef.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const delta = e.clientX - startXRef.current;
    const sensitivity = 5;

    if (Math.abs(delta) > sensitivity) {
      const direction = delta > 0 ? 1 : -1;
      setCurrentIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return totalFrames - 1;
        if (next >= totalFrames) return 0;
        return next;
      });
      startXRef.current = e.clientX;
    }

    if (isZoomed) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPosition({ x, y });
      }
    }
  }, [isDragging, totalFrames, isZoomed]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setIsAutoPlaying(false);
    startXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const delta = e.touches[0].clientX - startXRef.current;
    const sensitivity = 10;

    if (Math.abs(delta) > sensitivity) {
      const direction = delta > 0 ? 1 : -1;
      setCurrentIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return totalFrames - 1;
        if (next >= totalFrames) return 0;
        return next;
      });
      startXRef.current = e.touches[0].clientX;
    }
  }, [isDragging, totalFrames]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const progress = totalFrames > 0 ? ((currentIndex + 1) / totalFrames) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`product-360-view ${className} ${isFullscreen ? "fullscreen" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Loading */}
      {isLoading && (
        <div className="view-360-loading">
          <div className="loading-spinner" />
          <span>جارٍ التحميل... {Math.round((loadedCount / totalFrames) * 100)}%</span>
          <div className="loading-progress">
            <div style={{ width: `${(loadedCount / totalFrames) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Image */}
      <div
        className={`view-360-image ${isZoomed ? "zoomed" : ""}`}
        style={isZoomed ? {
          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
        } : undefined}
      >
        <img
          src={images[currentIndex]}
          alt={`360° view - frame ${currentIndex + 1}`}
          draggable={false}
        />
      </div>

      {/* Drag Indicator */}
      {!isDragging && !isLoading && (
        <div className="view-360-hint">
          <RotateIcon />
          <span>اسحب للتدوير</span>
        </div>
      )}

      {/* Progress */}
      <div className="view-360-progress">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      {showControls && (
        <div className="view-360-controls">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={isAutoPlaying ? "active" : ""}
            title={isAutoPlaying ? "إيقاف" : "تشغيل تلقائي"}
          >
            {isAutoPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          
          {enableZoom && (
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className={isZoomed ? "active" : ""}
              title="تكبير"
            >
              <ZoomInIcon />
            </button>
          )}
          
          {enableFullscreen && (
            <button onClick={toggleFullscreen} title="شاشة كاملة">
              <FullscreenIcon />
            </button>
          )}
        </div>
      )}

      {/* Frame Counter */}
      <div className="view-360-counter">
        {currentIndex + 1} / {totalFrames}
      </div>
    </div>
  );
}

// Simple 360 Rotation with Single Image + CSS
interface Simple360Props {
  image: string;
  alt?: string;
  className?: string;
}

export function Simple360Hover({ image, alt = "", className = "" }: Simple360Props) {
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    setRotation((x - 0.5) * 60); // -30 to +30 degrees
  };

  return (
    <div
      ref={containerRef}
      className={`simple-360-hover ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotation(0)}
    >
      <img
        src={image}
        alt={alt}
        style={{
          transform: `perspective(1000px) rotateY(${rotation}deg)`,
        }}
      />
    </div>
  );
}

// Product Image Gallery with 360° Option
interface ProductGalleryProps {
  images: string[];
  images360?: string[];
  productName?: string;
  className?: string;
}

export function ProductGallery({
  images,
  images360,
  productName = "المنتج",
  className = "",
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [show360, setShow360] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  return (
    <div className={`product-gallery ${className}`}>
      {/* Main Image / 360 View */}
      <div className="gallery-main">
        {show360 && images360?.length ? (
          <Product360View images={images360} />
        ) : (
          <div
            className={`gallery-image ${isZoomed ? "zoomed" : ""}`}
            onClick={() => setIsZoomed(!isZoomed)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
          >
            <img
              src={images[activeIndex]}
              alt={`${productName} - صورة ${activeIndex + 1}`}
              style={isZoomed ? {
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              } : undefined}
            />
            {!isZoomed && (
              <div className="zoom-hint">
                <ZoomInIcon />
              </div>
            )}
          </div>
        )}

        {/* 360 Toggle */}
        {images360?.length && (
          <button
            className={`toggle-360 ${show360 ? "active" : ""}`}
            onClick={() => setShow360(!show360)}
          >
            <RotateIcon />
            <span>360°</span>
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {!show360 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button
              key={i}
              className={`thumb ${activeIndex === i ? "active" : ""}`}
              onClick={() => setActiveIndex(i)}
            >
              <img src={img} alt={`${productName} - مصغرة ${i + 1}`} />
            </button>
          ))}
          {images360?.length && (
            <button
              className="thumb thumb-360"
              onClick={() => setShow360(true)}
            >
              <RotateIcon />
              <span>360°</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
