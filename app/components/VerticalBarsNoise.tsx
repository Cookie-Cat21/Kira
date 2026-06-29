"use client";

import { useEffect, useRef, useCallback } from "react";

interface VerticalBarsNoiseProps {
  backgroundColor?: string;
  lineColor?: string;
  barColor?: string;
  lineWidth?: number;
  animationSpeed?: number;
  removeWaveLine?: boolean;
  /** Multiplier for bar/line opacity (0–1). Lower = subtler background. */
  intensity?: number;
  /** Gentler motion — less horizontal wobble on bars. */
  calm?: boolean;
  /** Draw the horizontal rules (can read as harsh scanlines on chat). */
  showLines?: boolean;
  className?: string;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const cleanHex = hex.charAt(0) === "#" ? hex.substring(1) : hex;
  const r = Number.parseInt(cleanHex.substring(0, 2), 16);
  const g = Number.parseInt(cleanHex.substring(2, 4), 16);
  const b = Number.parseInt(cleanHex.substring(4, 6), 16);
  return { r, g, b };
};

/** Animated vertical-bar noise field — sized to its container, not the viewport. */
export default function VerticalBarsNoise({
  backgroundColor = "#0a0612",
  lineColor = "#2a1f42",
  barColor = "#9464ff",
  lineWidth = 1,
  animationSpeed = 0.0005,
  removeWaveLine = true,
  intensity: intensityScale = 1,
  calm = false,
  showLines = true,
  className = "",
}: VerticalBarsNoiseProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const ripples = useRef<
    Array<{ x: number; y: number; time: number; intensity: number }>
  >([]);
  const sizeRef = useRef({ width: 0, height: 0 });

  const noise = (x: number, y: number, t: number): number => {
    const n =
      Math.sin(x * 0.01 + t) * Math.cos(y * 0.01 + t) +
      Math.sin(x * 0.015 - t) * Math.cos(y * 0.005 + t);
    return (n + 1) / 2;
  };

  const getMouseInfluence = (x: number, y: number): number => {
    const dx = x - mouseRef.current.x;
    const dy = y - mouseRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 200;
    return Math.max(0, 1 - distance / maxDistance);
  };

  const getRippleInfluence = (
    x: number,
    y: number,
    currentTime: number
  ): number => {
    let totalInfluence = 0;
    ripples.current.forEach((ripple) => {
      const age = currentTime - ripple.time;
      const maxAge = 2000;
      if (age < maxAge) {
        const dx = x - ripple.x;
        const dy = y - ripple.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rippleRadius = (age / maxAge) * 300;
        const rippleWidth = 50;
        if (Math.abs(distance - rippleRadius) < rippleWidth) {
          const rippleStrength = (1 - age / maxAge) * ripple.intensity;
          const proximityToRipple =
            1 - Math.abs(distance - rippleRadius) / rippleWidth;
          totalInfluence += rippleStrength * proximityToRipple;
        }
      }
    });
    return Math.min(totalInfluence, 2);
  };

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = root.clientWidth;
    const displayHeight = root.clientHeight;
    if (displayWidth === 0 || displayHeight === 0) return;

    sizeRef.current = { width: displayWidth, height: displayHeight };
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    mouseRef.current.isDown = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    ripples.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
      intensity: 1.5,
    });
    const now = Date.now();
    ripples.current = ripples.current.filter((r) => now - r.time < 2000);
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDown = false;
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    timeRef.current += animationSpeed;
    const currentTime = Date.now();
    const canvasWidth = sizeRef.current.width || canvas.clientWidth;
    const canvasHeight = sizeRef.current.height || canvas.clientHeight;
    if (canvasWidth === 0 || canvasHeight === 0) {
      animationFrameId.current = requestAnimationFrame(animate);
      return;
    }

    const numLines = Math.floor(canvasHeight / (showLines ? 11 : 22));
    const lineSpacing = canvasHeight / numLines;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < numLines; i++) {
      const y = i * lineSpacing + lineSpacing / 2;

      if (showLines) {
        const mouseInfluence = getMouseInfluence(canvasWidth / 2, y);
        const lineAlpha = Math.max(0.15, (0.3 + mouseInfluence * 0.7) * intensityScale);
        ctx.beginPath();
        const lineRgb = hexToRgb(lineColor);
        ctx.strokeStyle = `rgba(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b}, ${lineAlpha})`;
        ctx.lineWidth = lineWidth + mouseInfluence * 2;
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      for (let x = 0; x < canvasWidth; x += 8) {
        const noiseVal = noise(x, y, timeRef.current);
        const mouseInfl = getMouseInfluence(x, y);
        const rippleInfl = getRippleInfluence(x, y, currentTime);
        const totalInfluence = mouseInfl + rippleInfl;
        const mouseInfluence = getMouseInfluence(canvasWidth / 2, y);
        const threshold = Math.max(
          0.2,
          0.5 - mouseInfl * 0.2 - Math.abs(rippleInfl) * 0.1
        );

        if (noiseVal > threshold) {
          const barWidth = 3 + noiseVal * 10 + totalInfluence * 5;
          const barHeight = 2 + noiseVal * 3 + totalInfluence * 3;
          const wobble = calm ? 8 : 20;
          const baseAnimation =
            Math.sin(timeRef.current + y * 0.0375) * wobble * noiseVal;
          const mouseAnimation = mouseRef.current.isDown
            ? Math.sin(timeRef.current * 3 + x * 0.01) * 10 * mouseInfl
            : 0;
          const rippleAnimation =
            rippleInfl * Math.sin(timeRef.current * 2 + x * 0.02) * 15;
          const animatedX =
            x + baseAnimation + mouseAnimation + rippleAnimation;
          const barAlpha = Math.min(
            1,
            Math.max(0.35, (0.7 + totalInfluence * 0.3) * intensityScale)
          );
          const barRgb = hexToRgb(barColor);
          ctx.fillStyle = `rgba(${barRgb.r}, ${barRgb.g}, ${barRgb.b}, ${barAlpha})`;
          ctx.fillRect(
            animatedX - barWidth / 2,
            y - barHeight / 2,
            barWidth,
            barHeight
          );
        }
      }
    }

    if (!removeWaveLine) {
      ripples.current.forEach((ripple) => {
        const age = currentTime - ripple.time;
        const maxAge = 2000;
        if (age < maxAge) {
          const progress = age / maxAge;
          const radius = progress * 300;
          const alpha = (1 - progress) * 0.3 * ripple.intensity;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.arc(ripple.x, ripple.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });
    }

    animationFrameId.current = requestAnimationFrame(animate);
  }, [
    animationSpeed,
    backgroundColor,
    barColor,
    lineColor,
    lineWidth,
    removeWaveLine,
    intensityScale,
    calm,
    showLines,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(root);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    animate();

    return () => {
      ro.disconnect();
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      timeRef.current = 0;
      ripples.current = [];
    };
  }, [animate, handleMouseDown, handleMouseMove, handleMouseUp, resizeCanvas]);

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ backgroundColor }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="pointer-events-none block h-full w-full" />
    </div>
  );
}
