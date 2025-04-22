<script lang="ts">
    import { onMount } from 'svelte';
    import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    import { trigger } from '$lib/stores/toastStore.svelte';
    import type { CropImage } from '$lib/types';
    
    // Props with explicit typing
    let { 
      deviceId = "", 
      location = "", 
      onImageCaptured = undefined 
    } = $props<{
      deviceId: string;
      location: string;
      onImageCaptured?: (image: CropImage) => void;
    }>();
    
    // Component state
    let cameraActive = $state(false);
    let isProcessing = $state(false);
    let videoElement: HTMLVideoElement | null = $state(null);
    let canvasElement: HTMLCanvasElement | null = $state(null);
    let cameraStream: MediaStream | null = $state(null);
    let imageNotes = $state('');
    let errorMessage = $state('');
    
    // Initialize camera
    async function initializeCamera() {
      try {
        errorMessage = '';
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported in this browser');
        }
        
        // Request camera permissions
        const constraints = {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'environment' // Use back camera if available
          }
        };
        
        // Get camera stream
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoElement) {
          videoElement.srcObject = cameraStream;
          cameraActive = true;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        errorMessage = err instanceof Error ? err.message : 'Unable to access camera';
        
        trigger({
          message: `Camera error: ${errorMessage}`,
          background: 'preset-filled-error'
        });
      }
    }
    
    // Stop camera stream
    function stopCamera() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      
      if (videoElement) {
        videoElement.srcObject = null;
      }
      
      cameraActive = false;
    }
    
    // Toggle camera
    function toggleCamera() {
      if (cameraActive) {
        stopCamera();
      } else {
        initializeCamera();
      }
    }
    
    // Capture image
    async function captureImage() {
  if (!videoElement || !canvasElement || !cameraActive) return;
  
  try {
    isProcessing = true;
    
    // Draw video frame to canvas
    const ctx = canvasElement.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Get image data
    const imageData = canvasElement.toDataURL('image/jpeg', 0.8);
    const originalSize = Math.round(imageData.length * 0.75); // Rough estimate
    
    // Compress image
    const compressedImage = await compressImage(imageData);
    const compressedSize = Math.round(compressedImage.length * 0.75); // Rough estimate
    
    // Convert base64 to blob for storage efficiency
    const dataBlob = await dataURLToBlob(compressedImage);
    
    // Calculate compression ratio
    const compressionRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
    
    // Generate a simple hash (you could use a more sophisticated method)
    const hash = await generateImageHash(compressedImage);
    
    // Create crop image object
    const cropImage: CropImage = {
      id: Date.now(),
      deviceId: deviceId,
      timestamp: Date.now(),
      preview: compressedImage,
      originalSize: originalSize,
      size: compressedSize,
      location: location,
      notes: imageNotes,
      width: canvasElement.width,
      height: canvasElement.height,
      // Add the missing properties
      hash: hash,
      compressionRatio: compressionRatio,
      data: dataBlob
    };    
        // Save the image
        await saveImage(cropImage);
        
        // Notify parent component
        if (onImageCaptured) {
          onImageCaptured(cropImage);
        }
        
        // Reset notes
        imageNotes = '';
        
        // Show success toast
        trigger({
          message: 'Image captured and saved successfully',
          background: 'preset-filled-success'
        });
        
      } catch (err) {
        console.error('Error capturing image:', err);
        errorMessage = err instanceof Error ? err.message : 'Error capturing image';
        
        // Show error toast
        trigger({
          message: `Error: ${errorMessage}`,
          background: 'preset-filled-error'
        });
      } finally {
        isProcessing = false;
      }
    }
    
    // Compress image
    async function compressImage(dataUrl: string): Promise<string> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Target max dimension (reduce size for large images)
          const MAX_DIMENSION = 1200;
          let width = img.width;
          let height = img.height;
          
          // Scale down if needed
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round(height * (MAX_DIMENSION / width));
              width = MAX_DIMENSION;
            } else {
              width = Math.round(width * (MAX_DIMENSION / height));
              height = MAX_DIMENSION;
            }
          }
          
          // Create compression canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Return compressed data URL (quality 0.7)
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        
        img.onerror = () => {
          reject(new Error('Error loading image for compression'));
        };
        
        img.src = dataUrl;
      });
    }

    async function dataURLToBlob(dataURL: string): Promise<Blob> {
        const response = await fetch(dataURL);
        return await response.blob();
        }

        // Generate a simple hash for the image
    async function generateImageHash(imageData: string): Promise<string> {
        // A simple hash function - in production, you might want a more robust solution
        const msgUint8 = new TextEncoder().encode(imageData.substring(0, 1000)); // Only hash a portion for efficiency
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    
    // Save image to IndexedDB
    async function saveImage(image: CropImage): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          // Open database
          const request = indexedDB.open('YieldSyncxImageDB', 1);
          
          // Set up database
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Create store if it doesn't exist
            if (!db.objectStoreNames.contains('cropImages')) {
              const store = db.createObjectStore('cropImages', { keyPath: 'id' });
              store.createIndex('deviceId', 'deviceId', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
            }
          };
          
          // Handle database open success
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction('cropImages', 'readwrite');
            const store = transaction.objectStore('cropImages');
            
            // Add the image
            const addRequest = store.add(image);
            
            addRequest.onsuccess = () => {
              resolve();
            };
            
            addRequest.onerror = () => {
              reject(new Error('Failed to save image'));
            };
            
            transaction.oncomplete = () => {
              db.close();
            };
          };
          
          // Handle database open error
          request.onerror = () => {
            reject(new Error('Failed to open image database'));
          };
          
        } catch (err) {
          reject(err);
        }
      });
    }
    
    // Clean up on component destroy
    function cleanup() {
      stopCamera();
    }
    
    onMount(() => {
      // Initialize camera when component is mounted
      if (deviceId) {
        initializeCamera();
      }
      
      // Clean up on destroy
      return cleanup;
    });
  </script>
  
  <div class="space-y-4">
    <div class="flex flex-col gap-2">
      <div class="form-field">
        <label class="label">
          <span>Notes</span>
          <textarea 
            class="textarea w-full" 
            rows="3" 
            placeholder="Add notes about this image (optional)"
            bind:value={imageNotes}
          ></textarea>
        </label>
      </div>
    </div>
    
    {#if errorMessage}
      <div class="alert preset-filled-error">
        <Icon icon="mdi:alert-circle" class="size-5" />
        <div class="alert-message">
          <p>{errorMessage}</p>
        </div>
      </div>
    {/if}
    
    <!-- Video preview -->
    <div class="card overflow-hidden shadow-lg">
      <div class="bg-surface-200 aspect-video relative">
        {#if cameraActive}
          <video 
            bind:this={videoElement} 
            autoplay 
            playsinline 
            class="w-full h-full object-cover"
            >
            <!-- Add an empty track element for accessibility compliance -->
            <track kind="captions" src="" label="No captions available" />
         </video>
        {:else}
          <div class="flex items-center justify-center w-full h-full">
            <div class="text-center p-4">
              <Icon icon="mdi:camera-off" class="size-12 text-surface-500 mb-3" />
              <p class="font-medium text-surface-600">Camera is inactive</p>
              <p class="text-sm text-surface-500">Click the button below to enable the camera</p>
            </div>
          </div>
        {/if}
        
        <!-- Processing overlay -->
        {#if isProcessing}
          <div class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <ProgressRing meterBase="bg-primary-500" strokeWidth="2px" />
            <p class="text-white mt-2">Processing image...</p>
          </div>
        {/if}
      </div>
      
      <!-- Canvas for image capture (hidden) -->
      <canvas bind:this={canvasElement} class="hidden"></canvas>
      
      <!-- Camera controls -->
      <div class="p-4 flex flex-wrap gap-2">
        <button 
          class="btn preset-filled-surface grow"
          onclick={toggleCamera}
          disabled={isProcessing}
        >
          {#if cameraActive}
            <Icon icon="mdi:camera-off" class="size-5" />
            <span>Disable Camera</span>
          {:else}
            <Icon icon="mdi:camera" class="size-5" />
            <span>Enable Camera</span>
          {/if}
        </button>
        
        <button 
          class="btn preset-filled-primary grow"
          onclick={captureImage}
          disabled={!cameraActive || isProcessing}
        >
          <Icon icon="mdi:camera-iris" class="size-5" />
          <span>Capture Image</span>
        </button>
      </div>
    </div>
  </div>