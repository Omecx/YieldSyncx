<script lang="ts">
    import { blockchainStore, isAdmin } from '$lib/stores/blockchainStore';
    import { trigger } from '$lib/stores/toastStore.svelte';
    import { ROLES } from '$lib/roles';
    
    let newRoleAddress = $state('');
    let selectedRole = $state('DEVICE_ROLE');
    let roleAddress = $state('');
    let roleToRevoke = $state('');
    
    function addRole() {
      if (!newRoleAddress || !ethers.isAddress(newRoleAddress)) {
        trigger({
          message: 'Invalid address',
          background: 'preset-filled-error'
        });
        return;
      }
      
      switch (selectedRole) {
        case 'DEVICE_ROLE':
          blockchainStore.grantDeviceRole(newRoleAddress);
          break;
        case 'ANALYST_ROLE':
          blockchainStore.grantAnalystRole(newRoleAddress);
          break;
        default:
          trigger({
            message: 'Invalid role selected',
            background: 'preset-filled-error'
          });
      }
      
      newRoleAddress = '';
    }
    
    function revokeRole() {
      if (!roleAddress || !ethers.isAddress(roleAddress) || !roleToRevoke) {
        trigger({
          message: 'Invalid input',
          background: 'preset-filled-error'
        });
        return;
      }
      
      blockchainStore.revokeRole(roleToRevoke, roleAddress);
      roleAddress = '';
      roleToRevoke = '';
    }
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Admin Dashboard</h1>
    
    {#if !$isAdmin}
      <div class="bg-preset-filled-error/10 border border-preset-filled-error rounded-lg p-6">
        <h2 class="text-xl font-semibold text-preset-filled-error mb-2">Access Denied</h2>
        <p class="text-gray-700">You need admin privileges to access this page.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Grant Role</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                bind:value={newRoleAddress}
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0x..."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select 
                bind:value={selectedRole}
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="DEVICE_ROLE">Device Role</option>
                <option value="ANALYST_ROLE">Analyst Role</option>
              </select>
            </div>
            <button 
              onclick={addRole}
              class="w-full bg-preset-filled-primary text-white py-2 px-4 rounded-md hover:bg-preset-filled-primary/90"
            >
              Grant Role
            </button>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Revoke Role</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                bind:value={roleAddress}
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0x..."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select 
                bind:value={roleToRevoke}
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="DEVICE_ROLE">Device Role</option>
                <option value="ANALYST_ROLE">Analyst Role</option>
              </select>
            </div>
            <button 
              onclick={revokeRole}
              class="w-full bg-preset-filled-error text-white py-2 px-4 rounded-md hover:bg-preset-filled-error/90"
            >
              Revoke Role
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>