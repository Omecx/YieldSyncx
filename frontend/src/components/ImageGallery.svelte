<script lang="ts">
  import { onMount } from 'svelte';
  import { Modal, ProgressRing } from '@skeletonlabs/skeleton-svelte';
  import Icon from '@iconify/svelte';
  import type { CropImage } from '$lib/types';
  
  // Props using Svelte 5 syntax
  let { deviceId = '' } = $props<{
    deviceId?: string;
  }>();
  
  // Component state
  let images = $state<CropImage[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let selectedImage = $state<CropImage | null>(null);
  let showModal = $state(false);
  
  // Load images from IndexedDB
  async function loadImages() {
    isLoading = true;
    error = null;
    
    try {
      // Open IndexedDB
      const dbOpenRequest = indexedDB.open('YieldSyncxImageDB', 1);
      
      // Database operations remain unchanged
      dbOpenRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cropImages')) {
          images = [];
          isLoading = false;
          return;
        }
        
        const transaction = db.transaction('cropImages', 'readonly');
        const store = transaction.objectStore('cropImages');
        
        let request;
        if (deviceId) {
          const deviceIndex = store.index('deviceId');
          request = deviceIndex.getAll(deviceId);
        } else {
          request = store.getAll();
        }
        
        request.onsuccess = () => {
          images = request.result as CropImage[];
          isLoading = false;
        };
        
        request.onerror = () => {
          error = 'Failed to retrieve images';
          isLoading = false;
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
      
      dbOpenRequest.onerror = () => {
        error = 'Failed to open image database';
        isLoading = false;
      };
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error loading images';
      isLoading = false;
    }
  }
  
  // Format date for display
  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
  
  // Open image in modal
  function viewImage(image: CropImage) {
    selectedImage = image;
    showModal = true;
  }
  
  // Close modal
  function closeModal() {
    showModal = false;
    selectedImage = null;
  }
  
  // Filter images when deviceId changes
  $effect(() => {
    loadImages();
  });
  
  // Initialize component
  onMount(() => {
    loadImages();
  });
</script>

<div class="space-y-4">
<div class="flex justify-between items-center">
  <h2 class="text-xl font-bold">Crop Images</h2>
  
  <button 
    class="btn preset-filled-primary" 
    onclick={loadImages}
    disabled={isLoading}
  >
    {#if isLoading}
      <div class="w-5 h-5">
        <ProgressRing strokeWidth="2px" />
      </div>
      <span>Loading...</span>
    {:else}
      <Icon icon="mdi:refresh" class="size-5" />
      <span>Refresh</span>
    {/if}
  </button>
</div>

{#if error}
  <div class="alert preset-filled-error">
    <Icon icon="mdi:alert-circle" class="size-5" />
    <div class="alert-message">
      <p>{error}</p>
    </div>
  </div>
{/if}

{#if isLoading}
  <div class="flex justify-center items-center h-64">
    <ProgressRing strokeWidth="2px" />
  </div>
{:else if images.length === 0}
  <div class="card p-8 text-center">
    <div class="flex flex-col items-center">
      <Icon icon="mdi:image-off" class="size-12 text-surface-500 mb-4" />
      <h3 class="h3 mb-2">No Images Available</h3>
      <p class="text-surface-600">No crop images have been captured yet.</p>
    </div>
  </div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {#each images as image}
      <div 
        class="card overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer" 
        onclick={() => viewImage(image)}
        onkeydown={(e) => e.key === 'Enter' && viewImage(image)}
        tabindex="0"
        role="button"
        aria-label="View image details"
      >
        <div class="aspect-video bg-surface-200 overflow-hidden">
          <img 
            src={image.preview} 
            alt="Crop"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="p-3">
          <p class="font-medium truncate">{image.deviceId}</p>
          <p class="text-sm text-surface-600">{formatDate(image.timestamp)}</p>
          {#if image.notes}
            <p class="text-sm text-surface-600 truncate mt-1">{image.notes}</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Updated Image Modal -->
<Modal
  open={showModal}
  onOpenChange={(e) => (showModal = e.open)}
  contentBase="bg-surface-100-900 p-0 shadow-xl w-full max-w-3xl rounded-lg overflow-hidden"
>
  {#snippet content()}
    {#if selectedImage}
      <div class="p-4 space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold">Image Details</h3>
          <button 
            class="btn-icon preset-ghost" 
            onclick={closeModal}
            aria-label="Close modal"
          >
            <Icon icon="mdi:close" class="size-6" />
          </button>
        </div>
        
        <div class="bg-surface-200 rounded-lg overflow-hidden">
          <img 
            src={selectedImage.preview} 
            alt="Crop"
            class="w-full max-h-96 object-contain"
          />
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <p><span class="font-medium">Device:</span> {selectedImage.deviceId}</p>
            <p><span class="font-medium">Date:</span> {formatDate(selectedImage.timestamp)}</p>
            <p><span class="font-medium">Location:</span> {selectedImage.location}</p>
            <p><span class="font-medium">Size:</span> {(selectedImage.size / 1024).toFixed(0)} KB (compressed from {(selectedImage.originalSize / 1024).toFixed(0)} KB)</p>
            <p><span class="font-medium">Resolution:</span> {selectedImage.width} × {selectedImage.height}</p>
          </div>
          
          <div>
            <h4 class="font-medium mb-2">Notes</h4>
            <p class="text-surface-700">{selectedImage.notes || 'No notes provided'}</p>
          </div>
        </div>
      </div>
    {/if}
  {/snippet}
</Modal>
</div>