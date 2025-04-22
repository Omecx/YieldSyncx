<script lang="ts">
    import { isUrgentAnomaly, getSuggestedActions } from '$lib/services/anomalyDetection';
    import Icon from '@iconify/svelte';
    import type { AnomalyReport } from '$lib/types';
    
    // Props using Svelte 5 syntax
    let { anomaly, collapsed = false } = $props<{
      anomaly: AnomalyReport;
      collapsed?: boolean;
    }>();
    
    // Component state
    let isExpanded = $state(!collapsed);
    
    // Format timestamp
    function formatTimestamp(timestamp: number): string {
      return new Date(timestamp).toLocaleString();
    }
    
    // Get icon based on anomaly severity
    function getAnomalyIcon(severity: string): string {
      switch (severity) {
        case 'error': return 'mdi:alert-circle';
        case 'warning': return 'mdi:alert';
        default: return 'mdi:information';
      }
    }
    
    // Get color based on anomaly severity
    function getAnomalyColor(severity: string): string {
      switch (severity) {
        case 'error': return 'variant-filled-error';
        case 'warning': return 'variant-filled-warning';
        default: return 'variant-filled-tertiary';
      }
    }
    
    // Generate description based on anomaly type
    function getAnomalyTypeDescription(type: string): string {
      switch (type) {
        case 'below_minimum': return 'Critical low value';
        case 'above_maximum': return 'Critical high value';
        case 'below_normal': return 'Below normal range';
        case 'above_normal': return 'Above normal range';
        case 'rapid_change': return 'Rapid rate of change';
        case 'fast_change': return 'Fast rate of change';
        case 'parsing_error': return 'Data parsing error';
        default: return 'Anomaly detected';
      }
    }
    
    // Get data type display name
    function getDataTypeDisplay(dataType: string): string {
      switch (dataType) {
        case 'temperature': return 'Temperature';
        case 'humidity': return 'Humidity';
        case 'soil-moisture': return 'Soil Moisture';
        case 'light': return 'Light Intensity';
        case 'co2': return 'CO₂ Level';
        default: return dataType.charAt(0).toUpperCase() + dataType.slice(1);
      }
    }
    
    // Get unit based on data type
    function getDataTypeUnit(dataType: string): string {
      switch (dataType) {
        case 'temperature': return '°C';
        case 'humidity': return '%';
        case 'soil-moisture': return '%';
        case 'light': return 'lux';
        case 'co2': return 'ppm';
        default: return '';
      }
    }
    
    // Toggle expanded state
    function toggleExpanded() {
      isExpanded = !isExpanded;
    }
    
    // Get suggested actions
    let suggestedActions = $derived(getSuggestedActions(anomaly));
    
    // Check if anomaly is urgent
    let isUrgent = $derived(isUrgentAnomaly(anomaly));
  </script>
  
  <div class="card {getAnomalyColor(anomaly.severity)} text-white shadow-lg mb-4">
    <!-- Alert header -->
    <div 
    class="p-4 flex items-center justify-between cursor-pointer" 
    role="button"
    tabindex="0"
    onclick={toggleExpanded}
    onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleExpanded() : null}
    aria-expanded={isExpanded}
    >
    <div class="flex items-center gap-3">
    <div class="bg-white/20 rounded-full p-2">
        <Icon icon={getAnomalyIcon(anomaly.severity)} class="size-6" />
    </div>
    <div>
        <h3 class="text-lg font-bold">{getDataTypeDisplay(anomaly.dataType)} Anomaly</h3>
        <p class="text-sm opacity-90">{formatTimestamp(anomaly.timestamp)}</p>
    </div>
    
    {#if isUrgent}
        <span class="badge bg-red-700 text-white ml-2">Urgent</span>
    {/if}
    </div>

    <button class="btn-icon preset-ghost-surface" aria-label="Toggle details">
    <Icon icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} class="w-5 h-5" />
    </button>
    </div>
    
    <!-- Alert details -->
    {#if isExpanded}
      <div class="p-4 pt-0 border-t border-white/20">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p class="text-sm opacity-80">Device</p>
            <p class="font-semibold">{anomaly.deviceId}</p>
          </div>
          <div>
            <p class="text-sm opacity-80">Location</p>
            <p class="font-semibold">{anomaly.location}</p>
          </div>
          <div>
            <p class="text-sm opacity-80">Current Value</p>
            <p class="font-semibold">{anomaly.value} {getDataTypeUnit(anomaly.dataType)}</p>
          </div>
        </div>
        
        <!-- Anomaly details -->
        <div class="mb-4">
          <h4 class="font-semibold mb-2">Detected Issues</h4>
          <ul class="space-y-2">
            {#each anomaly.anomalies as issue}
              <li class="flex items-start gap-2">
                <Icon icon="mdi:alert-circle" class="size-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p class="font-medium">{getAnomalyTypeDescription(issue.type)}</p>
                  <p class="text-sm opacity-90">{issue.message}</p>
                </div>
              </li>
            {/each}
          </ul>
        </div>
        
        <!-- Suggested actions -->
        {#if suggestedActions.length > 0}
          <div>
            <h4 class="font-semibold mb-2">Suggested Actions</h4>
            <ul class="space-y-1">
              {#each suggestedActions as action}
                <li class="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" class="size-5 mt-0.5 flex-shrink-0" />
                  <p>{action}</p>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>