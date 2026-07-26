'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';

type ScratchPoint = {
  x: number;
  y: number;
};

type ScratchTicketCoverProps = {
  revealed: boolean;
  hint: string;
  onScratchStart?: () => void;
  onReveal: () => void;
  className?: string;
  hintClassName?: string;
};

const REVEAL_RATIO = 0.46;

function paintFoil(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = 'source-over';

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#cfd6e1');
  gradient.addColorStop(0.22, '#fbfdff');
  gradient.addColorStop(0.46, '#aeb9c8');
  gradient.addColorStop(0.66, '#eef3f8');
  gradient.addColorStop(1, '#bac5d2');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.34;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  for (let x = -height; x < width; x += 18) {
    context.beginPath();
    context.moveTo(x, height);
    context.lineTo(x + height, 0);
    context.stroke();
  }

  context.globalAlpha = 0.24;
  context.fillStyle = '#25443c';
  for (let i = 0; i < 180; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 1.25 + 0.35;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 0.28;
  context.fillStyle = '#ffffff';
  for (let i = 0; i < 52; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 3 + 1;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
}

function scratchedRatio(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return 0;

  const sample = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  for (let index = 3; index < sample.length; index += 16) {
    if (sample[index] < 18) cleared += 1;
  }
  return cleared / (sample.length / 16);
}

export function ScratchTicketCover({ revealed, hint, onScratchStart, onReveal, className, hintClassName }: ScratchTicketCoverProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<ScratchPoint | null>(null);
  const strokeCountRef = useRef(0);
  const revealCalledRef = useRef(false);
  const [hasScratched, setHasScratched] = useState(false);

  const resizeCanvas = useCallback(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const rect = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    paintFoil(canvas);
    strokeCountRef.current = 0;
    revealCalledRef.current = false;
    setHasScratched(false);
  }, []);

  useEffect(() => {
    if (revealed) return;
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (hostRef.current) observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas, revealed]);

  const getPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = hostRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const scratchTo = (point: ScratchPoint, pointerType: string) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const previous = lastPointRef.current ?? point;
    const pressureWidth = pointerType === 'mouse' ? 24 : 34;
    const width = pressureWidth + Math.random() * 10;
    context.globalCompositeOperation = 'destination-out';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    for (let i = 0; i < 4; i += 1) {
      const jitter = width * 0.36;
      context.beginPath();
      context.arc(
        point.x + (Math.random() - 0.5) * jitter,
        point.y + (Math.random() - 0.5) * jitter,
        width * (0.18 + Math.random() * 0.2),
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    lastPointRef.current = point;
    strokeCountRef.current += 1;
    if (!revealCalledRef.current && strokeCountRef.current % 6 === 0 && scratchedRatio(canvas) >= REVEAL_RATIO) {
      revealCalledRef.current = true;
      window.setTimeout(onReveal, 120);
    }
  };

  return (
    <div
      ref={hostRef}
      className={cn('absolute inset-0 touch-none overflow-hidden rounded-[inherit] transition-opacity duration-300 motion-reduce:transition-none', revealed && 'pointer-events-none opacity-0', className)}
      onPointerDown={(event) => {
        if (revealed) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drawingRef.current = true;
        lastPointRef.current = null;
        setHasScratched(true);
        onScratchStart?.();
        const point = getPoint(event);
        if (point) scratchTo(point, event.pointerType);
      }}
      onPointerMove={(event) => {
        if (!drawingRef.current || revealed) return;
        event.preventDefault();
        const point = getPoint(event);
        if (point) scratchTo(point, event.pointerType);
      }}
      onPointerUp={() => {
        drawingRef.current = false;
        lastPointRef.current = null;
      }}
      onPointerCancel={() => {
        drawingRef.current = false;
        lastPointRef.current = null;
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgb(255_255_255_/_0.42),transparent_22%),radial-gradient(circle_at_80%_76%,rgb(23_37_32_/_0.08),transparent_28%)] mix-blend-soft-light" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,rgb(23_37_32_/_0.16)_0_1px,transparent_1px)] [background-size:15px_15px]" aria-hidden="true" />
      <span className={cn('pointer-events-none absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center text-sm font-black text-[#53625d]/70 transition-opacity duration-200', hasScratched && 'opacity-0', hintClassName)}>
        {hint}
      </span>
    </div>
  );
}
