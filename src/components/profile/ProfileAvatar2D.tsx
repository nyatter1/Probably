import React, { useRef, useEffect } from 'react';
import { AvatarColors } from '../AvatarCanvas3D.tsx';
import { ROBLOX_TEMPLATE_RECTS } from '../../utils/robloxClothingUV.ts';

interface ProfileAvatar2DProps {
  colors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
  className?: string;
  height?: number;
}

export default function ProfileAvatar2D({
  colors,
  shirtUrl,
  pantsUrl,
  className = '',
  height = 240,
}: ProfileAvatar2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    // Helper to load image
    const loadImage = (url: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        if (!url.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const render = async () => {
      const shirtImg = shirtUrl ? await loadImage(shirtUrl) : null;
      const pantsImg = pantsUrl ? await loadImage(pantsUrl) : null;
      if (isCancelled) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Base proportions in 2D coordinate system:
      // Character is approx 240 units high, 160 units wide
      // Scale to fit canvas with padding
      const scale = (h * 0.88) / 240;
      const cx = w / 2;
      const groundY = h * 0.94;

      ctx.save();
      ctx.translate(cx, groundY);
      ctx.scale(scale, scale);

      // 1. Soft Shadow on ground
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.filter = 'blur(4px)';
      ctx.fill();
      ctx.restore();

      // Proportions (R6):
      // Legs: height 80, width 40 each. Left leg x = 2 to 42, Right leg x = -42 to -2. y = -80 to 0
      // Torso: height 80, width 80. x = -40 to 40, y = -160 to -80
      // Arms: height 80, width 40 each. Left arm x = 44 to 84, Right arm x = -84 to -44. y = -160 to -80
      // Head: height 52, width 52. x = -26 to 26, y = -215 to -163

      // A. LEGS
      // Right Leg (Character's Right, Left side from viewer)
      drawLimb(ctx, -42, -80, 40, 80, colors.rightLeg, pantsImg, ROBLOX_TEMPLATE_RECTS.rightLimb.f);
      // Left Leg (Character's Left, Right side from viewer)
      drawLimb(ctx, 2, -80, 40, 80, colors.leftLeg, pantsImg, ROBLOX_TEMPLATE_RECTS.leftLimb.f);

      // B. TORSO (and lower torso if pants has waist)
      drawTorso(ctx, -40, -160, 80, 80, colors.torso, shirtImg, pantsImg);

      // C. ARMS
      // Right Arm (viewer left)
      drawLimb(ctx, -84, -160, 40, 80, colors.rightArm, shirtImg, ROBLOX_TEMPLATE_RECTS.rightLimb.f);
      // Left Arm (viewer right)
      drawLimb(ctx, 44, -160, 40, 80, colors.leftArm, shirtImg, ROBLOX_TEMPLATE_RECTS.leftLimb.f);

      // D. HEAD with smooth rounded cap and smile face
      drawHead(ctx, -26, -215, 52, 52, colors.head);

      ctx.restore();
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [colors, shirtUrl, pantsUrl, height]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(height * 0.95)}
      height={height}
      className={`select-none pointer-events-none ${className}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}

// Draw a blocky limb with beveled edges, optional clothing texture, and lighting
function drawLimb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  textureImg: HTMLImageElement | null,
  uvRect?: { x: number; y: number; w: number; h: number }
) {
  ctx.save();
  // Base color
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Clothing texture crop if available
  if (textureImg && uvRect) {
    ctx.drawImage(
      textureImg,
      uvRect.x,
      uvRect.y,
      uvRect.w,
      uvRect.h,
      x,
      y,
      w,
      h
    );
  }

  // Subtle 2D shading overlay (classic blocky Roblox shading)
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.04)');
  grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.04)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Border outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}

// Draw torso with shirt and optional pants waistline
function drawTorso(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  shirtImg: HTMLImageElement | null,
  pantsImg: HTMLImageElement | null
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Shirt Front texture
  if (shirtImg) {
    const f = ROBLOX_TEMPLATE_RECTS.torso.f;
    ctx.drawImage(shirtImg, f.x, f.y, f.w, f.h, x, y, w, h);
  }

  // Pants top overlap (waist area) if pants equipped
  if (pantsImg) {
    const pf = ROBLOX_TEMPLATE_RECTS.torso.f;
    // Lower 25% of torso is pants belt/waist
    const waistH = h * 0.28;
    const waistY = y + h - waistH;
    ctx.drawImage(
      pantsImg,
      pf.x,
      pf.y + pf.h * 0.72,
      pf.w,
      pf.h * 0.28,
      x,
      waistY,
      w,
      waistH
    );
  }

  // Shading overlay
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}

// Draw classic smooth cylindrical head with rounded top and smile face
function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  const radius = 10;

  // Rounded cylinder head path
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  // Fill head color
  ctx.fillStyle = color;
  ctx.fill();

  // Head Shading
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Classic Smile Face Decal
  const faceCenterX = x + w / 2;
  const faceCenterY = y + h * 0.52;

  ctx.fillStyle = '#141619';
  // Left eye
  ctx.beginPath();
  ctx.ellipse(faceCenterX - 8.5, faceCenterY - 6, 2.5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(faceCenterX + 8.5, faceCenterY - 6, 2.5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Classic smile curve
  ctx.strokeStyle = '#141619';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(faceCenterX, faceCenterY - 1, 9.5, 0.22 * Math.PI, 0.78 * Math.PI, false);
  ctx.stroke();

  ctx.restore();
}
