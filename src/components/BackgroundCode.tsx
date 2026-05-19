import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function BackgroundCode({ mood }: { mood?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~';
    const charArray = chars.split('');
    const fontSize = window.innerWidth < 640 ? 10 : 14;
    const columns = width / fontSize;
    
    // Array of drops - one per column
    // The value represents the current y position (in "rows", not pixels)
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100; // start randomly offscreen
    }

    const draw = () => {
      // Semi-transparent black to create the trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      // Get computed color of the phosphor theme
      const computedStyle = getComputedStyle(document.documentElement);
      const phosColor = computedStyle.getPropertyValue('--phos-color').trim() || '#39ff14';

      ctx.fillStyle = phosColor;
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Make the leading character brighter
        if (Math.random() > 0.95) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = phosColor;
            ctx.globalAlpha = 0.5 + Math.random() * 0.5; // jitter opacity
        }

        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1.0;

        // Reset drop if it's off screen and randomly
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
      }

      // Slightly slower frame rate than 60fps for that retro feel
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(draw);
      }, 50);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={cn(
      "absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20 bg-black",
    )}>
       <canvas ref={canvasRef} className="block w-full h-full" />
       
       {/* Vignette effect */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_100%)] pointer-events-none opacity-80" />
    </div>
  );
}
