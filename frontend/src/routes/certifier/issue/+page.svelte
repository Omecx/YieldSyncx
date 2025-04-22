<script lang="ts">
  import { onMount } from 'svelte';
  import { blockchainStore, isAnalyst } from '$lib/stores/blockchainStore';
  import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
  import Icon from '@iconify/svelte';
  import { generateMerkleTree } from '../../../lib/services/merkleTree';
  import Toast from '../../../components/Toast.svelte';
  import type { SensorData } from '$lib/types';

  // Local component state
  let deviceId = '';
  let certificateType = 'organic-compliance';
  let metadataURI = 'ipfs://Qm...';
  let devices: { id: string; name: string }[] = [];
  let sensorData: SensorData[] = [];
  let isLoading = false;
  let isIssuing = false;
  let merkleRoot = '';
  let merkleProof: string[] = [];

  // Reactive derived state
  $: canIssueCertificates = $blockchainStore.connected && isAnalyst;

  const certificateTypes = [
    { id: 'organic-compliance', label: 'Organic Compliance' },
    { id: 'growth-milestone', label: 'Growth Milestone' },
    { id: 'harvest-quality', label: 'Harvest Quality' },
    { id: 'pesticide-free', label: 'Pesticide-Free' },
    { id: 'carbon-negative', label: 'Carbon Negative' }
  ];

  async function loadDeviceData() {
    isLoading = true;
    try {
      if (!$blockchainStore.connected) throw new Error('Not connected to blockchain');
      const recordCount = await blockchainStore.getRecordCount();
      const fetchCount = Math.min(recordCount, 50);
      const dataPromises = [];
      for (let i = recordCount - 1; i >= recordCount - fetchCount; i--) {
        dataPromises.push(blockchainStore.getIoTData(i));
      }
      const results = (await Promise.all(dataPromises)).filter(Boolean) as any[];
      const unique = new Set<string>(results.map(r => r.deviceId));
      devices = Array.from(unique).map(id => ({ id, name: id }));
      sensorData = results.map(r => ({
        deviceId: r.deviceId,
        timestamp: new Date(r.timestamp).getTime(),
        data: r.sensorData,
        dataType: r.dataType,
        location: r.location
      }));
    } catch (err) {
      console.error('Error loading device data:', err);
    } finally {
      isLoading = false;
    }
  }

  function generateMerkleProof() {
    if (!deviceId || sensorData.length === 0) return;
    const records = sensorData.filter(r => r.deviceId === deviceId);
    if (!records.length) return;
    const { merkleRoot: root, proofs } = generateMerkleTree(records);
    merkleRoot = root;
    merkleProof = proofs[records.length - 1] || [];
  }

  async function issueCertificate() {
    if (!deviceId || !certificateType || !metadataURI || !merkleRoot || !merkleProof.length) return;
    isIssuing = true;
    try {
      const tokenId = await blockchainStore.issueCertificate(
        deviceId,
        certificateType,
        metadataURI,
        merkleProof
      );
      if (tokenId !== null) {
        // Reset form
        deviceId = '';
        metadataURI = 'ipfs://Qm...';
        merkleRoot = '';
        merkleProof = [];
      }
    } catch (err) {
      console.error('Error issuing certificate:', err);
    } finally {
      isIssuing = false;
    }
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    issueCertificate();
  }

  // Reactively generate proof when deviceId changes
  $: if (deviceId) generateMerkleProof();
  $: if (!deviceId) {
    merkleRoot = '';
    merkleProof = [];
  }

  onMount(() => {
    if ($blockchainStore.connected) loadDeviceData();
  });

  // Reload if connected but no devices yet
  $: if ($blockchainStore.connected && !isLoading && !devices.length) loadDeviceData();
</script>

<Toast />

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col lg:flex-row justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold mb-2">Issue Certificate</h1>
      <p class="text-surface-700 max-w-3xl">
        Create verifiable digital certificates for organic compliance and growth milestones.
      </p>
    </div>
    <div>
      <button
        class="btn preset-filled-primary"
        on:click={loadDeviceData}
        disabled={isLoading || !$blockchainStore.connected}
      >
        {#if isLoading}
          <ProgressRing size="sm" />
          <span>Loading...</span>
        {:else}
          <Icon icon="mdi:refresh" class="w-5 h-5" />
          <span>Refresh Data</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Role Check -->
  {#if !canIssueCertificates}
    <div class="alert bg-warning-500/20 border border-warning-500">
      <Icon icon="mdi:account-key-outline" class="w-5 h-5" />
      <div class="alert-message">
        <h3 class="h3">Certifier Role Required</h3>
        <p>You need the Certifier role to issue certificates. Connect with a certified account.</p>
      </div>
      <div class="alert-actions">
        <button
          class="btn preset-filled"
          on:click={() => blockchainStore.connectWallet()}
          disabled={$blockchainStore.loading}
        >
          {#if $blockchainStore.loading}
            <ProgressRing size="sm" />
            <span>Connecting...</span>
          {:else}
            <Icon icon="mdi:wallet" class="w-5 h-5" />
            <span>Connect Wallet</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- Form -->
  <div class="card p-6">
    <h2 class="h2 mb-4">Certificate Details</h2>
    <form class="space-y-4" on:submit={handleSubmit}>
      <!-- Device -->
      <label class="label">
        <span>Device</span>
        <select
          class="select w-full"
          bind:value={deviceId}
          disabled={!canIssueCertificates || isLoading || isIssuing}
          required
        >
          <option value="">Select a device</option>
          {#each devices as d}
            <option value={d.id}>{d.id} - {d.name}</option>
          {/each}
        </select>
      </label>

      <!-- Certificate Type -->
      <label class="label">
        <span>Certificate Type</span>
        <select
          class="select w-full"
          bind:value={certificateType}
          disabled={!canIssueCertificates || isIssuing}
          required
        >
          {#each certificateTypes as t}
            <option value={t.id}>{t.label}</option>
          {/each}
        </select>
      </label>

      <!-- Metadata URI -->
      <label class="label">
        <span>Metadata URI</span>
        <input
          type="text"
          class="input w-full"
          bind:value={metadataURI}
          placeholder="ipfs://Qm..."
          disabled={!canIssueCertificates || isIssuing}
          required
        />
        <div class="text-xs text-surface-600 mt-1">
          IPFS URI for certificate metadata JSON
        </div>
      </label>

      <!-- Merkle Info -->
      {#if merkleRoot}
        <div class="card bg-surface-100 p-4">
          <h3 class="h3 mb-2">Merkle Tree Data</h3>
          <div class="space-y-2">
            <div class="flex flex-col">
              <span class="text-sm">Merkle Root</span>
              <pre class="font-mono text-xs break-all">{merkleRoot}</pre>
            </div>
            <div class="flex flex-col">
              <span class="text-sm">Proof Elements</span>
              <span class="font-mono text-xs">{merkleProof.length} elements</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Submit -->
      <div class="pt-4 border-t border-surface-300/20">
        <button
          type="submit"
          class="btn preset-filled-primary w-full"
          disabled={!canIssueCertificates || isIssuing || !merkleRoot || !merkleProof.length}
        >
          {#if isIssuing}
            <ProgressRing size="sm" />
            <span>Issuing...</span>
          {:else}
            <Icon icon="mdi:certificate-outline" class="w-5 h-5" />
            <span>Issue Certificate</span>
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
