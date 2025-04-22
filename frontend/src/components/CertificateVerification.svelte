<script lang="ts">
  import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
  import Icon from '@iconify/svelte';
  import { blockchainStore } from '$lib/stores/blockchainStore';
  import type { Certificate } from '$lib/types';
  
  // Component state using Svelte 5 runes
  let tokenId = $state('');
  let certificate = $state<Certificate | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let isVerified = $state<boolean | null>(null);
  
  // Verify certificate
  async function verifyCertificate() {
    if (!tokenId || !$blockchainStore.connected) return;
    
    const tokenIdNum = parseInt(tokenId);
    if (isNaN(tokenIdNum)) {
      error = 'Please enter a valid token ID';
      return;
    }
    
    isLoading = true;
    error = null;
    certificate = null;
    isVerified = null;
    
    try {
      // This would be implemented in the actual blockchain contract
      // For this example, we'll simulate a verification process
      
      // Delay to simulate blockchain query
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate certificate data (in a real implementation, this would come from the contract)
      certificate = {
        tokenId: tokenIdNum,
        deviceId: `device-00${1 + (tokenIdNum % 5)}`,
        certificateType: tokenIdNum % 2 === 0 ? 'Organic Compliance' : 'Growth Milestone',
        issueTimestamp: Date.now() - (tokenIdNum * 86400000), // Days ago
        metadataURI: 'ipfs://QmXyZ123456789',
        owner: $blockchainStore.account || '0x1234567890123456789012345678901234567890'
      };
      
      // Simulate verification
      isVerified = true;
      
    } catch (err) {
      console.error('Error verifying certificate:', err);
      error = err instanceof Error ? err.message : 'Failed to verify certificate';
      isVerified = false;
    } finally {
      isLoading = false;
    }
  }
  
  // Format timestamp for display
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
  
  // Reset verification
  function resetVerification() {
    certificate = null;
    isVerified = null;
    error = null;
  }
  
  // Handle form submission
  function handleSubmit(event: Event) {
    event.preventDefault();
    verifyCertificate();
  }
  
  // Handle keyboard events for div click handlers
  function handleKeyDown(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }
</script>

<div class="card p-6 shadow-xl max-w-3xl mx-auto bg-surface-100-800">
  <header class="mb-6">
    <h2 class="h2">Certificate Verification</h2>
    <p class="text-surface-700-300">Verify the authenticity of organic certification NFTs.</p>
  </header>
  
  {#if !certificate}
    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="form-group">
        <label for="tokenId" class="label">Certificate Token ID</label>
        <input 
          id="tokenId"
          type="text" 
          class="input" 
          bind:value={tokenId}
          placeholder="Enter token ID"
          disabled={isLoading}
          required
          aria-describedby={error ? "token-id-error" : undefined}
        />
        {#if error}
          <p id="token-id-error" class="text-error-500 text-sm mt-1">{error}</p>
        {/if}
      </div>
      
      <button 
        type="submit" 
        class="btn preset-filled-primary-500 w-full"
        disabled={isLoading || !$blockchainStore.connected}
      >
        {#if isLoading}
          <div class="flex items-center gap-2">
            <ProgressRing value={undefined} size="sm" />
            <span>Verifying...</span>
          </div>
        {:else if !$blockchainStore.connected}
          <div class="flex items-center gap-2">
            <Icon icon="mdi:wallet-off" width="20" height="20" />
            <span>Connect Wallet to Verify</span>
          </div>
        {:else}
          <div class="flex items-center gap-2">
            <Icon icon="mdi:check-decagram" width="20" height="20" />
            <span>Verify Certificate</span>
          </div>
        {/if}
      </button>
    </form>
  {:else if certificate !== null}
    <div class="space-y-6">
      <!-- Verification result -->
      {#if isVerified === true}
        <div class="card preset-filled-success-500/20 border border-success-500 p-4 flex items-start gap-3">
          <Icon icon="mdi:shield-check" width="24" height="24" class="mt-0.5 flex-shrink-0" />
          <div>
            <h3 class="h3">Verification Successful</h3>
            <p class="opacity-80">This certificate is authentic and recorded on the blockchain.</p>
          </div>
        </div>
      {:else if isVerified === false}
        <div class="card preset-filled-error-500/20 border border-error-500 p-4 flex items-start gap-3">
          <Icon icon="mdi:shield-alert" width="24" height="24" class="mt-0.5 flex-shrink-0" />
          <div>
            <h3 class="h3">Verification Failed</h3>
            <p class="opacity-80">This certificate could not be verified on the blockchain.</p>
          </div>
        </div>
      {/if}
      
      <!-- Certificate details -->
      <div class="card preset-filled-surface-50-950 p-6">
        <h3 class="h3 mb-4 flex items-center gap-2">
          <Icon icon="mdi:certificate" width="24" height="24" />
          <span>Certificate #{certificate?.tokenId}</span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="label-text font-semibold">Type</label>
            <p class="font-medium">{certificate?.certificateType}</p>
          </div>
          
          <div class="form-group">
            <label class="label-text font-semibold">Device ID</label>
            <p class="font-medium">{certificate?.deviceId}</p>
          </div>
          
          <div class="form-group">
            <label class="label-text font-semibold">Issue Date</label>
            <p class="font-medium">
              {certificate?.issueTimestamp ? formatDate(certificate.issueTimestamp) : ''}
            </p>
          </div>
          
          <div class="form-group">
            <label class="label-text font-semibold">Owner</label>
            <p class="font-medium">
              {certificate?.owner ? formatAddress(certificate.owner) : ''}
            </p>
          </div>
          
          <div class="form-group col-span-full">
            <label class="label-text font-semibold">Metadata URI</label>
            <div class="flex items-center gap-2">
              <p class="font-mono text-sm truncate">{certificate?.metadataURI}</p>
              <button 
                class="btn-icon preset-tonal"
                onclick={() => {
                  if (certificate?.metadataURI) {
                    navigator.clipboard.writeText(certificate.metadataURI);
                  }
                }}
                aria-label="Copy metadata URI to clipboard"
              >
                <Icon icon="mdi:content-copy" width="16" height="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-between">
        <button 
          class="btn preset-tonal"
          onclick={resetVerification}
        >
          <Icon icon="mdi:arrow-left" width="20" height="20" />
          <span>Verify Another</span>
        </button>
        
        <button 
          class="btn preset-filled-secondary-500"
          onclick={() => {
            if (certificate?.tokenId) {
              window.open(`https://moonbase.moonscan.io/token/${certificate.tokenId}`, '_blank');
            }
          }}
          aria-label="View certificate on blockchain explorer"
        >
          <Icon icon="mdi:link-variant" width="20" height="20" />
          <span>View on Explorer</span>
        </button>
      </div>
    </div>
  {/if}
</div>