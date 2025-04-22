<script lang="ts">
    import Icon from '@iconify/svelte';
    import type { Certificate } from '$lib/types';
    
    // Props using Svelte 5 runes syntax
    let { certificate } = $props<{
      certificate: Certificate;
    }>();
    
    // Format the issue date
    function formatDate(timestamp: number): string {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Format address for display
    function formatAddress(address: string): string {
      if (!address) return '';
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    // Get certificate icon based on type
    function getCertificateIcon(type: string): string {
      if (type.toLowerCase().includes('organic')) return 'mdi:leaf';
      if (type.toLowerCase().includes('growth')) return 'mdi:sprout';
      if (type.toLowerCase().includes('harvest')) return 'mdi:barley';
      if (type.toLowerCase().includes('quality')) return 'mdi:check-decagram';
      return 'mdi:certificate';
    }
    
    // Get certificate color based on type using $derived rune
    const certificateColor = $derived(getCertificateColorClass(certificate.certificateType));
    
    function getCertificateColorClass(type: string): string {
      if (type.toLowerCase().includes('organic')) return 'bg-green-500';
      if (type.toLowerCase().includes('growth')) return 'bg-blue-500';
      if (type.toLowerCase().includes('harvest')) return 'bg-amber-500';
      if (type.toLowerCase().includes('quality')) return 'bg-violet-500';
      return 'bg-primary-500';
    }
  </script>
  
  <!-- Using Skeleton UI Tailwind card component pattern -->
  <div class="card preset-filled-surface">
    <!-- Certificate header -->
    <header class="card-header {certificateColor} text-white p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-white/20 rounded-full p-2">
            <Icon icon={getCertificateIcon(certificate.certificateType)} class="size-6" />
          </div>
          <h3 class="h3">{certificate.certificateType}</h3>
        </div>
        <div class="badge preset-filled-secondary">
          #{certificate.tokenId}
        </div>
      </div>
    </header>
    
    <!-- Certificate content -->
    <div class="p-4 space-y-4">
      <div class="grid grid-cols-1 gap-4">
        <div class="flex flex-col">
          <span class="text-sm text-surface-500">Device ID</span>
          <span class="font-semibold">{certificate.deviceId}</span>
        </div>
        
        <div class="flex flex-col">
          <span class="text-sm text-surface-500">Issued On</span>
          <span class="font-semibold">{formatDate(certificate.issueTimestamp)}</span>
        </div>
        
        <div class="flex flex-col">
          <span class="text-sm text-surface-500">Owner</span>
          <span class="font-semibold">{formatAddress(certificate.owner)}</span>
        </div>
      </div>
      
      <hr class="divider" />
      
      <div class="card-footer flex justify-between items-center">
        <a href={certificate.metadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/')} 
           target="_blank" 
           rel="noopener noreferrer" 
           class="btn preset-soft">
          <Icon icon="mdi:link-preset" class="size-4" />
          <span>View Metadata</span>
        </a>
        
        <button class="btn preset-soft-primary">
          <Icon icon="mdi:qrcode" class="size-4" />
          <span>View Certificate</span>
        </button>
      </div>
    </div>
  </div>