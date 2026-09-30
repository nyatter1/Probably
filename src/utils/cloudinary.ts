/**
 * Cloudinary Direct Upload Utility
 * Cloud Name: oc8buhae
 * Upload Preset: revixcxx (Unsigned)
 */

export const CLOUDINARY_CLOUD_NAME = 'oc8buhae';
export const CLOUDINARY_UPLOAD_PRESET = 'revixcxx';
export const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Uploads a File, Blob, or base64 data URL directly to Cloudinary
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string,
  folder?: string
): Promise<string> {
  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  if (typeof fileOrBase64 === 'string') {
    formData.append('file', fileOrBase64);
  } else {
    formData.append('file', fileOrBase64);
  }

  const response = await fetch(CLOUDINARY_API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Cloudinary upload failed with status ${response.status}`
    );
  }

  const data: CloudinaryUploadResult = await response.json();
  return data.secure_url;
}
