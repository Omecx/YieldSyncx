<script lang="ts">
    import { blockchainStore } from '$lib/stores/blockchainStore';
    import { Tabs } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    import ImageCapture from './../../components/ImageCapture.svelte';
    import ImageGallery from './../../components/ImageGallery.svelte';
    import Toast from './../../components/Toast.svelte';
    import type { CropImage } from '$lib/types';
    
    // Component state using Svelte 5 reactivity
    let activeTab = $state('gallery');
    let selectedDevice = $state('');
    let selectedLocation = $state('field-north');
    
    // Available devices
    const deviceOptions = [
      { id: 'device-001', label: 'Temperature Sensor 1', location: 'field-north' },
      { id: 'device-002', label: 'Humidity Sensor 1', location: 'field-north' },
      { id: 'device-003', label: 'Soil Moisture Sensor 1', location: 'field-north' },
      { id: 'device-004', label: 'Light Sensor 1', location: 'field-south' },
      { id: 'device-005', label: 'CO₂ Sensor 1', location: 'greenhouse' }
    ];
    
    // Available locations
    const locationOptions = [
      { id: 'field-north', label: 'Field - North' },
      { id: 'field-south', label: 'Field - South' },
      { id: 'greenhouse', label: 'Greenhouse' },
      { id: 'processing', label: 'Processing Area' },
      { id: 'storage', label: 'Storage Area' }
    ];
    
    // Handle image capture completion
    function handleImageCaptured(image: CropImage) {
      // Switch to gallery tab after capturing
      activeTab = 'gallery';
    }
    
    // Update location based on selected device
    $effect(() => {
      if (selectedDevice) {
        const device = deviceOptions.find(d => d.id === selectedDevice);
        if (device) {
          selectedLocation = device.location;
        }
      }
    });
  </script>
  
  <Toast />
  
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col lg:flex-row justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold mb-2">Crop Imagery</h1>
        <p class="text-surface-700 max-w-3xl">
          Capture, analyze, and store high-quality crop images with automatic compression and metadata.
        </p>
      </div>
    </div>
    
    <!-- Device & Location Selection -->
    <div class="flex flex-wrap gap-4">
      <div class="form-field w-full sm:w-auto sm:flex-1">
        <label class="label">
          <span>Device</span>
          <select 
            class="select w-full" 
            bind:value={selectedDevice}
          >
            <option value="">Select a device</option>
            {#each deviceOptions as device}
              <option value={device.id}>{device.label}</option>
            {/each}
          </select>
        </label>
      </div>
      
      <div class="form-field w-full sm:w-auto sm:flex-1">
        <label class="label">
          <span>Location</span>
          <select 
            class="select w-full" 
            bind:value={selectedLocation}
          >
            {#each locationOptions as location}
              <option value={location.id}>{location.label}</option>
            {/each}
          </select>
        </label>
      </div>
    </div>
    
    <!-- Dashboard Tabs -->
    <Tabs value={activeTab} onValueChange={(e) => (activeTab = e.value)} listJustify="justify-start">
      {#snippet list()}
        <Tabs.Control value="gallery">
          <Icon icon="mdi:image-multiple" class="size-5 mr-2" />
          Image Gallery
        </Tabs.Control>
        <Tabs.Control value="capture">
          <Icon icon="mdi:camera" class="size-5 mr-2" />
          Capture Image
        </Tabs.Control>
      {/snippet}
      
      {#snippet content()}
        <!-- Gallery Tab Panel -->
        <Tabs.Panel value="gallery">
          <div class="p-4">
            <ImageGallery deviceId={selectedDevice} />
          </div>
        </Tabs.Panel>
        
        <!-- Capture Tab Panel -->
        <Tabs.Panel value="capture">
          <div class="p-4">
            {#if !selectedDevice}
              <div class="alert preset-filled-warning">
                <Icon icon="mdi:information" class="size-5" />
                <div class="alert-message">
                  <h3 class="h3">Select a Device</h3>
                  <p>Please select a device before capturing images.</p>
                </div>
              </div>
            {:else}
              <ImageCapture 
                deviceId={selectedDevice} 
                location={selectedLocation}
                onImageCaptured={handleImageCaptured}
              />
            {/if}
          </div>
        </Tabs.Panel>
      {/snippet}
    </Tabs>
  </div>