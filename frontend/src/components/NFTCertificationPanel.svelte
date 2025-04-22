<!-- NFTCertificationPanel.svelte -->
<script lang="ts">
    import { blockchainStore } from '$lib/stores/blockchainStore';
    import { trigger } from '$lib/stores/toastStore.svelte';
    
    let selectedRecord = $state<number | null>(null);
    let certificationLevel = $state('STANDARD');
    let isProcessing = $state(false);
    
    async function certifyRecord() {
      if (selectedRecord === null) return;
      
      isProcessing = true;
      try {
        const tokenURI = `https://api.yieldsyncx.com/certificates/${selectedRecord}`;
        const tokenId = await blockchainStore.certifyRecord(
          selectedRecord,
          tokenURI,
          certificationLevel
        );
        
        if (tokenId >= 0) {
          trigger({
            message: `Certificate NFT #${tokenId} minted successfully`,
            background: 'preset-filled-success'
          });
          selectedRecord = null;
        }
      } catch (error) {
        trigger({
          message: error instanceof Error ? error.message : 'Certification failed',
          background: 'preset-filled-error'
        });
      } finally {
        isProcessing = false;
      }
    }
  </script>
  
  <div class="certification-panel">
    <h3>NFT Certification</h3>
    
    <div class="form-group">
      <label for="record-select">Select Record:</label>
      <select id="record-select" bind:value={selectedRecord}>
        <option value={null}>Choose a record...</option>
        {#each $blockchainStore.recentRecords as record}
          <option value={record.id}>
            Record #{record.id} - {record.deviceId} - {record.timestamp}
          </option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label for="certification-level">Certification Level:</label>
      <select id="certification-level" bind:value={certificationLevel}>
        <option value="STANDARD">Standard</option>
        <option value="PREMIUM">Premium</option>
        <option value="VERIFIED">Verified</option>
      </select>
    </div>
    
    <button 
      onclick={certifyRecord} 
      disabled={isProcessing || selectedRecord === null}
    >
      {isProcessing ? 'Processing...' : 'Certify as NFT'}
    </button>
  </div>