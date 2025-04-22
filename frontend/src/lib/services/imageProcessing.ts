import type { CropImage } from '$lib/types';

/**
 * Image processing module for agricultural imagery
 * Handles compression, analysis, and storage of crop images
 */

// Maximum dimensions for compressed images
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 768;

// Compression quality (0-1)
const DEFAULT_QUALITY = 0.8;

/**
 * Compress an image to reduce size while maintaining sufficient quality for analysis
 * @param imageData Original image data (from camera or file upload)
 * @param quality Compression quality (0-1)
 * @returns Promise with compressed image data
 */
export async function compressImage(
  imageData: Blob | File,
  quality: number = DEFAULT_QUALITY
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create image element to load the original image
    const img = new Image();
    const url = URL.createObjectURL(imageData);
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      
      if (height > MAX_HEIGHT) {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }
      
      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image on the canvas with new dimensions
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas to blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
      
      // Clean up object URL
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Calculate image hash for verification and comparison
 * @param imageData Image data to hash
 * @returns Promise with hash string
 */
export async function calculateImageHash(imageData: Blob): Promise<string> {
  const buffer = await imageData.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Extract basic image metadata
 * @param imageData Image blob or file
 * @returns Promise with image metadata
 */
export async function extractImageMetadata(imageData: Blob | File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
  name?: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageData);
    
    img.onload = () => {
      const metadata = {
        width: img.width,
        height: img.height,
        size: imageData.size,
        type: imageData.type,
        name: 'name' in imageData ? imageData.name : undefined
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for metadata extraction'));
    };
    
    img.src = url;
  });
}

/**
 * Process a crop image for storage and analysis
 * @param imageData Original image data
 * @param metadata Image context metadata
 * @returns Promise with processed image record
 */
export async function processCropImage(
  imageData: Blob | File,
  metadata: {
    deviceId: string;
    location: string;
    timestamp?: number;
    notes?: string;
  }
): Promise<CropImage> {
  // Compress the image
  const compressedImage = await compressImage(imageData);
  
  // Calculate hash for verification
  const imageHash = await calculateImageHash(compressedImage);
  
  // Extract basic image information
  const imageInfo = await extractImageMetadata(imageData);
  
  // Create base64 representation for preview
  const base64Preview = await blobToBase64(compressedImage);
  
  // Prepare complete image record
  return {
    deviceId: metadata.deviceId,
    location: metadata.location,
    timestamp: metadata.timestamp ?? Date.now(),
    hash: imageHash,
    size: compressedImage.size,
    originalSize: imageData.size,
    width: imageInfo.width,
    height: imageInfo.height,
    compressionRatio: imageData.size / compressedImage.size,
    preview: base64Preview,
    notes: metadata.notes ?? '',
    data: compressedImage
  };
}

/**
 * Convert blob to base64 string
 * @param blob Image blob
 * @returns Promise with base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Store image data in IndexedDB for offline access
 * @param cropImage Processed crop image
 * @returns Promise with storage result
 */
export async function storeImageOffline(cropImage: CropImage): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Open or create IndexedDB database
    const request = indexedDB.open('YieldSyncxImageDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for images if it doesn't exist
      if (!db.objectStoreNames.contains('cropImages')) {
        const store = db.createObjectStore('cropImages', { keyPath: 'id', autoIncrement: true });
        store.createIndex('deviceId', 'deviceId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('hash', 'hash', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction('cropImages', 'readwrite');
      const store = transaction.objectStore('cropImages');
      
      // Store the image
      const storeRequest = store.add(cropImage);
      
      storeRequest.onsuccess = () => {
        resolve(true);
      };
      
      storeRequest.onerror = () => {
        reject(new Error('Failed to store image in IndexedDB'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}