<script lang="ts">
    import { blockchainStore } from '$lib/stores/blockchainStore';
    import { trigger } from '$lib/stores/toastStore.svelte';
    
    let certificateId = $state('');
    let certificateData = $state<any>(null);
    let verificationStatus = $state<'pending' | 'valid' | 'invalid'>('pending');
    let loading = $state(false);
    
    async function verifyCertificate() {
      if (!certificateId) {
        trigger({
          message: 'Please enter a certificate ID',
          background: 'preset-filled-warning'
        });
        return;
      }
      
      loading = true;
      try {
        const certificate = await blockchainStore.getCertificate(parseInt(certificateId));
        if (certificate) {
          certificateData = certificate;
          verificationStatus = certificate.revoked ? 'invalid' : 'valid';
        } else {
          verificationStatus = 'invalid';
          trigger({
            message: 'Certificate not found',
            background: 'preset-filled-error'
          });
        }
      } catch (error) {
        verificationStatus = 'invalid';
        trigger({
          message: 'Verification failed',
          background: 'preset-filled-error'
        });
      } finally {
        loading = false;
      }
    }
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Certificate Verification</h1>
    
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <div class="mb-4">
          <label for="certificateId" class="block text-sm font-medium text-gray-700 mb-2">
            Certificate ID
          </label>
          <input
            type="text"
            id="certificateId"
            bind:value={certificateId}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-preset-filled-primary focus:border-preset-filled-primary"
            placeholder="Enter certificate ID"
          />
        </div>
        
        <button
          onclick={verifyCertificate}
          disabled={loading}
          class={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-preset-filled-primary hover:bg-preset-filled-primary/90'
            }`}
        >
          {loading ? 'Verifying...' : 'Verify Certificate'}
        </button>
      </div>
      
      {#if certificateData}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold">Certificate Details</h2>
            <span class={`px-3 py-1 rounded-full text-sm font-medium ${
              verificationStatus === 'valid' 
                ? 'bg-preset-filled-success/10 text-preset-filled-success' 
                : 'bg-preset-filled-error/10 text-preset-filled-error'
            }`}>
              {verificationStatus === 'valid' ? 'Valid' : 'Invalid'}
            </span>
          </div>
          
          <dl class="grid grid-cols-1 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Certificate ID</dt>
              <dd class="mt-1 text-sm text-gray-900">{certificateData.tokenId}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Device ID</dt>
              <dd class="mt-1 text-sm text-gray-900">{certificateData.deviceId}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Data Hash</dt>
              <dd class="mt-1 text-sm text-gray-900 font-mono">{certificateData.dataHash}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Issue Date</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {new Date(certificateData.timestamp * 1000).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Certification Level</dt>
              <dd class="mt-1 text-sm text-gray-900">{certificateData.certificationLevel}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Certifier</dt>
              <dd class="mt-1 text-sm text-gray-900 font-mono">{certificateData.certifier}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Owner</dt>
              <dd class="mt-1 text-sm text-gray-900 font-mono">{certificateData.owner}</dd>
            </div>
          </dl>
        </div>
      {/if}
    </div>
  </div>