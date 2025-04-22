<script lang="ts">
    import { BackupService } from '$lib/services/backupService';
    import { trigger } from '$lib/stores/toastStore.svelte';
    import { blockchainStore } from '$lib/stores/blockchainStore';
    
    let autoBackup = $state(
      typeof localStorage !== 'undefined' && localStorage.getItem('autoBackup') === 'true'
    );
    let backupInterval = $state(
      typeof localStorage !== 'undefined' ? localStorage.getItem('backupInterval') || '24' : '24'
    );
    let lastBackup = $state<number | null>(BackupService.getLastBackupTimestamp());
    
    $effect(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('autoBackup', autoBackup.toString());
        localStorage.setItem('backupInterval', backupInterval);
      }
    });
    
    async function createManualBackup() {
      try {
        const backup = await BackupService.exportBackup();
        const url = URL.createObjectURL(backup);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yieldsyncx-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        trigger({
          message: 'Backup created successfully',
          background: 'preset-filled-success'
        });
        
        lastBackup = Date.now();
      } catch (error) {
        trigger({
          message: 'Backup failed',
          background: 'preset-filled-error'
        });
      }
    }
    
    async function restoreBackup(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        try {
          await BackupService.restoreFromBackup(content);
          trigger({
            message: 'Backup restored successfully',
            background: 'preset-filled-success'
          });
        } catch (error) {
          trigger({
            message: 'Restore failed',
            background: 'preset-filled-error'
          });
        }
      };
      reader.readAsText(file);
    }
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Settings</h1>
    
    <div class="max-w-3xl mx-auto space-y-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Backup Management</h2>
        
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">Automatic Backup</h3>
              <p class="text-sm text-gray-500">Automatically backup data at regular intervals</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={autoBackup} class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-preset-filled-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-preset-filled-primary"></div>
            </label>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Backup Interval (hours)</label>
            <select 
              bind:value={backupInterval}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Every 24 hours</option>
              <option value="48">Every 48 hours</option>
            </select>
          </div>
          
          <div class="pt-4 border-t">
            <h3 class="font-medium mb-4">Manual Backup</h3>
            <div class="flex space-x-4">
              <button
                onclick={createManualBackup}
                class="px-4 py-2 bg-preset-filled-primary text-white rounded-md hover:bg-preset-filled-primary/90"
              >
                Create Backup
              </button>
              <label class="px-4 py-2 bg-preset-filled-secondary text-white rounded-md hover:bg-preset-filled-secondary/90 cursor-pointer">
                Restore Backup
                <input type="file" accept=".json" onchange={restoreBackup} class="hidden">
              </label>
            </div>
            
            {#if lastBackup}
              <p class="mt-2 text-sm text-gray-500">
                Last backup: {new Date(lastBackup).toLocaleString()}
              </p>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Network Information</h2>
        <dl class="grid grid-cols-1 gap-4">
          <div>
            <dt class="text-sm font-medium text-gray-500">Network</dt>
            <dd class="mt-1 text-sm text-gray-900">{$blockchainStore.network || 'Not connected'}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Chain ID</dt>
            <dd class="mt-1 text-sm text-gray-900">{$blockchainStore.chainId || 'N/A'}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Contract Address</dt>
            <dd class="mt-1 text-sm text-gray-900 font-mono">{$blockchainStore.contract?.address || 'N/A'}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Your Address</dt>
            <dd class="mt-1 text-sm text-gray-900 font-mono">{$blockchainStore.account || 'N/A'}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Your Roles</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {$blockchainStore.roles.join(', ') || 'None'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>