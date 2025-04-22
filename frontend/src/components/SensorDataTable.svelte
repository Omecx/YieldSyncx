<script lang="ts">
  import { Pagination } from '@skeletonlabs/skeleton-svelte';
  import Icon from '@iconify/svelte';
  import type { FormattedSensorData } from '$lib/types';
  
  // Props using Svelte 5 syntax
  let { data, deviceId = $bindable('') } = $props<{
    data: FormattedSensorData[];
    deviceId?: string;
  }>();
  
  // Component state with object wrappers to enable mutation
  const pageState = $state({ current: 0 });
  const pageSizeState = $state({ value: 10 });
  
  // Filter and pagination of data
  const filteredData = $derived(
    deviceId ? data.filter((item: { deviceId: any; }) => item.deviceId === deviceId) : data
  );
  
  const paginatedData = $derived(
    filteredData.slice(
      pageState.current * pageSizeState.value, 
      (pageState.current + 1) * pageSizeState.value
    )
  );
  
  const totalPages = $derived(
    Math.ceil(filteredData.length / pageSizeState.value)
  );
  
  // Get CSS class for a data type
  function getDataTypeClass(dataType: string): string {
    switch (dataType?.toLowerCase()) {
      case 'temperature': return 'bg-warning-500';
      case 'humidity': return 'bg-primary-500';
      case 'soil-moisture': case 'soil': return 'bg-success-500';
      case 'light': return 'bg-yellow-500';
      case 'co2': return 'bg-tertiary-500';
      default: return 'bg-surface-500';
    }
  }
  
  // Format data value for display
  function formatDataValue(record: FormattedSensorData): string {
    if (record.parsedData) {
      // If we have parsed data, get the value-unit pair if possible
      const { value, unit } = record.parsedData;
      if (value !== undefined && unit !== undefined) {
        return `${value} ${unit}`;
      }
      
      // Try to extract a meaningful value
      for (const key in record.parsedData) {
        if (key !== 'timestamp' && key !== 'unit') {
          return `${key}: ${record.parsedData[key]}`;
        }
      }
    }
    
    // Fall back to showing the raw data, with some truncation if needed
    const maxLength = 30;
    return record.sensorData.length > maxLength 
      ? `${record.sensorData.substring(0, maxLength)}...` 
      : record.sensorData;
  }
  
  // Handle pagination changes
  function handlePageChange(event: { page: number }) {
    pageState.current = event.page - 1; // Convert 1-based to 0-based
  }
  
  // Clear device filter
  function clearDeviceFilter() {
    deviceId = '';
  }
  
  // Show record details
  function showRecordDetails(record: FormattedSensorData) {
    alert(`Record Details:\n${JSON.stringify(record, null, 2)}`);
  }
  
  // Reset pagination when deviceId changes
  $effect(() => {
    pageState.current = 0;
  });
</script>

<div class="space-y-4">
  <!-- Data filtering info -->
  {#if deviceId}
    <div class="flex items-center gap-2 mb-2">
      <span>Filtering by device:</span>
      <span class="chip preset-filled-primary">{deviceId}</span>
      <button 
        class="btn btn-sm preset-soft" 
        onclick={clearDeviceFilter}
      >
        <Icon icon="mdi:close" class="size-4" />
        <span>Clear Filter</span>
      </button>
    </div>
  {/if}
  
  <!-- Data Table -->
  <div class="table-container overflow-x-auto">
    <table class="table table-hover">
      <thead>
        <tr>
          <th class="text-left">ID</th>
          <th class="text-left">Device ID</th>
          <th class="text-left">Type</th>
          <th class="text-left">Data</th>
          <th class="text-left">Time</th>
          <th class="text-left">Location</th>
          <th class="text-right w-20">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each paginatedData as record}
          <tr>
            <td>{record.id}</td>
            <td>
              <span class="chip preset-soft">
                {record.deviceId}
              </span>
            </td>
            <td>
              <span class="chip {getDataTypeClass(record.dataType)} text-white">
                {record.dataType}
              </span>
            </td>
            <td class="max-w-xs truncate">
              {formatDataValue(record)}
            </td>
            <td>
              {record.timestamp}
            </td>
            <td>{record.location}</td>
            <td class="text-right">
              <div class="flex justify-end">
                <button 
                  class="btn btn-sm preset-ghost" 
                  onclick={() => showRecordDetails(record)}
                >
                  <Icon icon="mdi:eye" class="size-5" />
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  
  <!-- Pagination -->
  {#if filteredData.length > pageSizeState.value}
  <div class="flex justify-center mt-4">
    <Pagination 
      data={filteredData}
      count={filteredData.length}
      page={pageState.current + 1} 
      pageSize={pageSizeState.value}
      onPageChange={(e) => pageState.current = e.page - 1}
      onPageSizeChange={(e) => pageSizeState.value = e.pageSize}
    />
  </div>
{/if}
</div>

<style>
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .table th {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(var(--color-surface-500), 0.3);
    font-weight: bold;
    text-align: left;
  }
  
  .table td {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(var(--color-surface-500), 0.1);
  }
  
  .table-hover tr:hover td {
    background-color: var(--color-surface-hover);
  }
</style>