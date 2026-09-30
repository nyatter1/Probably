import * as THREE from 'three';

export const TEMPLATE_WIDTH = 585;
export const TEMPLATE_HEIGHT = 559;

export interface UVRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Exact pixel coordinates from standard classic 585x559 Roblox template
export const ROBLOX_TEMPLATE_RECTS = {
  torso: {
    up:   { x: 231, y: 8,   w: 128, h: 64 },
    r:    { x: 165, y: 74,  w: 64,  h: 128 },
    f:    { x: 231, y: 74,  w: 128, h: 128 },
    l:    { x: 361, y: 74,  w: 64,  h: 128 },
    b:    { x: 427, y: 74,  w: 128, h: 128 },
    down: { x: 231, y: 204, w: 128, h: 64 },
  },
  rightLimb: {
    // Right Arm on Shirt, Right Leg on Pants (character's right, at -X)
    // Left column of template
    l:    { x: 19,  y: 355, w: 64,  h: 128 }, // Inside face (facing Torso, +X)
    b:    { x: 85,  y: 355, w: 64,  h: 128 }, // Back face (-Z)
    r:    { x: 151, y: 355, w: 64,  h: 128 }, // Outside face (away from Torso, -X)
    f:    { x: 217, y: 355, w: 64,  h: 128 }, // Front face (+Z)
    up:   { x: 217, y: 289, w: 64,  h: 64 },  // Top shoulder face (+Y)
    down: { x: 217, y: 485, w: 64,  h: 64 },  // Bottom hand/foot face (-Y)
  },
  leftLimb: {
    // Left Arm on Shirt, Left Leg on Pants (character's left, at +X)
    // Right column of template
    f:    { x: 308, y: 355, w: 64,  h: 128 }, // Front face (+Z)
    l:    { x: 374, y: 355, w: 64,  h: 128 }, // Outside face (away from Torso, +X)
    b:    { x: 440, y: 355, w: 64,  h: 128 }, // Back face (-Z)
    r:    { x: 506, y: 355, w: 64,  h: 128 }, // Inside face (facing Torso, -X)
    up:   { x: 308, y: 289, w: 64,  h: 64 },  // Top shoulder face (+Y)
    down: { x: 308, y: 485, w: 64,  h: 64 },  // Bottom hand/foot face (-Y)
  },
};

/**
 * Assigns proper Roblox classic clothing UV coordinates to each face of a Three.js BoxGeometry
 * 
 * Face 0: +X (Right of mesh in Three.js coordinates)
 * Face 1: -X (Left of mesh in Three.js coordinates)
 * Face 2: +Y (Top of mesh)
 * Face 3: -Y (Bottom of mesh)
 * Face 4: +Z (Front of mesh)
 * Face 5: -Z (Back of mesh)
 */
export function applyRobloxClothingUV(
  geometry: THREE.BoxGeometry,
  part: 'torso' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg'
) {
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  const setFaceUV = (faceIndex: number, rect: UVRect) => {
    const uMin = rect.x / TEMPLATE_WIDTH;
    const uMax = (rect.x + rect.w) / TEMPLATE_WIDTH;
    // In WebGL UVs, v = 0 is bottom, v = 1 is top
    const vMax = 1.0 - rect.y / TEMPLATE_HEIGHT;
    const vMin = 1.0 - (rect.y + rect.h) / TEMPLATE_HEIGHT;

    const baseIdx = faceIndex * 4;

    // v0: top-left (uMin, vMax)
    uvAttr.setXY(baseIdx + 0, uMin, vMax);
    // v1: top-right (uMax, vMax)
    uvAttr.setXY(baseIdx + 1, uMax, vMax);
    // v2: bottom-left (uMin, vMin)
    uvAttr.setXY(baseIdx + 2, uMin, vMin);
    // v3: bottom-right (uMax, vMin)
    uvAttr.setXY(baseIdx + 3, uMax, vMin);
  };

  if (part === 'torso') {
    // Face 0: +X -> Left side of torso (panel L)
    setFaceUV(0, ROBLOX_TEMPLATE_RECTS.torso.l);
    // Face 1: -X -> Right side of torso (panel R)
    setFaceUV(1, ROBLOX_TEMPLATE_RECTS.torso.r);
    // Face 2: +Y -> Top of torso (panel UP)
    setFaceUV(2, ROBLOX_TEMPLATE_RECTS.torso.up);
    // Face 3: -Y -> Bottom of torso (panel DOWN)
    setFaceUV(3, ROBLOX_TEMPLATE_RECTS.torso.down);
    // Face 4: +Z -> Front of torso (panel FRONT)
    setFaceUV(4, ROBLOX_TEMPLATE_RECTS.torso.f);
    // Face 5: -Z -> Back of torso (panel BACK)
    setFaceUV(5, ROBLOX_TEMPLATE_RECTS.torso.b);
  } else if (part === 'rightArm' || part === 'rightLeg') {
    // Right limb is at -X (character's right)
    // Face 0: +X -> Inside face facing torso (panel L at x=19)
    setFaceUV(0, ROBLOX_TEMPLATE_RECTS.rightLimb.l);
    // Face 1: -X -> Outside face away from torso (panel R at x=151)
    setFaceUV(1, ROBLOX_TEMPLATE_RECTS.rightLimb.r);
    // Face 2: +Y -> Top of limb (panel UP at x=217, y=289)
    setFaceUV(2, ROBLOX_TEMPLATE_RECTS.rightLimb.up);
    // Face 3: -Y -> Bottom of limb (panel DOWN at x=217, y=485)
    setFaceUV(3, ROBLOX_TEMPLATE_RECTS.rightLimb.down);
    // Face 4: +Z -> Front of limb (panel FRONT at x=217, y=355)
    setFaceUV(4, ROBLOX_TEMPLATE_RECTS.rightLimb.f);
    // Face 5: -Z -> Back of limb (panel BACK at x=85, y=355)
    setFaceUV(5, ROBLOX_TEMPLATE_RECTS.rightLimb.b);
  } else if (part === 'leftArm' || part === 'leftLeg') {
    // Left limb is at +X (character's left)
    // Face 0: +X -> Outside face away from torso (panel L at x=374)
    setFaceUV(0, ROBLOX_TEMPLATE_RECTS.leftLimb.l);
    // Face 1: -X -> Inside face facing torso (panel R at x=506)
    setFaceUV(1, ROBLOX_TEMPLATE_RECTS.leftLimb.r);
    // Face 2: +Y -> Top of limb (panel UP at x=308, y=289)
    setFaceUV(2, ROBLOX_TEMPLATE_RECTS.leftLimb.up);
    // Face 3: -Y -> Bottom of limb (panel DOWN at x=308, y=485)
    setFaceUV(3, ROBLOX_TEMPLATE_RECTS.leftLimb.down);
    // Face 4: +Z -> Front of limb (panel FRONT at x=308, y=355)
    setFaceUV(4, ROBLOX_TEMPLATE_RECTS.leftLimb.f);
    // Face 5: -Z -> Back of limb (panel BACK at x=440, y=355)
    setFaceUV(5, ROBLOX_TEMPLATE_RECTS.leftLimb.b);
  }

  uvAttr.needsUpdate = true;
}

/**
 * Validates whether an uploaded image file conforms to Roblox clothing template requirements
 */
export function validateRobloxTemplate(file: File): Promise<{
  valid: boolean;
  width: number;
  height: number;
  isExactSize: boolean;
  error?: string;
  dataUrl: string;
}> {
  return new Promise((resolve) => {
    if (!file.type.includes('png') && !file.type.includes('image')) {
      resolve({
        valid: false,
        width: 0,
        height: 0,
        isExactSize: false,
        error: 'Only PNG images are supported for Roblox clothing templates.',
        dataUrl: '',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const isExact = img.width === TEMPLATE_WIDTH && img.height === TEMPLATE_HEIGHT;
        const aspect = img.width / img.height;
        const targetAspect = TEMPLATE_WIDTH / TEMPLATE_HEIGHT; // ~1.0465

        // Check if dimensions or aspect ratio are close enough
        const isAspectValid = Math.abs(aspect - targetAspect) < 0.15;

        if (!isExact && !isAspectValid) {
          resolve({
            valid: true,
            width: img.width,
            height: img.height,
            isExactSize: false,
            error: `Image dimensions are ${img.width}x${img.height}. Standard Roblox template is 585x559. It will be mapped automatically.`,
            dataUrl,
          });
        } else {
          resolve({
            valid: true,
            width: img.width,
            height: img.height,
            isExactSize: isExact,
            dataUrl,
          });
        }
      };
      img.onerror = () => {
        resolve({
          valid: false,
          width: 0,
          height: 0,
          isExactSize: false,
          error: 'Failed to read image data.',
          dataUrl: '',
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      resolve({
        valid: false,
        width: 0,
        height: 0,
        isExactSize: false,
        error: 'Error reading file.',
        dataUrl: '',
      });
    };
    reader.readAsDataURL(file);
  });
}
