'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

export function TasteMotionRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;

      gsap.fromTo(
        '.taste-word',
        { opacity: 0.18, y: 12 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.045,
          duration: 0.58,
          ease: 'power3.out',
        },
      );

      gsap.fromTo(
        '.taste-stack-card',
        { opacity: 0, y: 42, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.taste-stack',
            start: 'top 82%',
            end: 'bottom 48%',
            scrub: 0.8,
          },
        },
      );
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={cn('overflow-x-hidden', className)}>
      {children}
    </div>
  );
}

export function TasteWords({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`} className="taste-word inline-block">
          {word}
          {index < text.split(' ').length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </>
  );
}
