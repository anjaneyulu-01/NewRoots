/**
 * Compress an image file to a maximum size and dimensions
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 1)
 * @param {number} options.maxWidthOrHeight - Maximum width or height (default: 1920)
 * @param {number} options.quality - Image quality 0-1 (default: 0.75)
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export async function compressImage(file, options = {}) {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    quality = 0.75
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try to compress to target size
        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // Check if still too large and reduce quality if needed
        let currentQuality = quality;
        const maxBytes = maxSizeMB * 1024 * 1024;
        
        while (compressedBase64.length > maxBytes && currentQuality > 0.1) {
          currentQuality -= 0.1;
          compressedBase64 = canvas.toDataURL('image/jpeg', currentQuality);
        }

        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 to file size in MB
 * @param {string} base64 - Base64 encoded string
 * @returns {number} - File size in MB
 */
export function getBase64SizeMB(base64) {
  const stringLength = base64.length - 'data:image/png;base64,'.length;
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
  return sizeInBytes / (1024 * 1024);
}
