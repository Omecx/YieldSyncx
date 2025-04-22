<script lang="ts">
    import { MonitoringService } from '$lib/services/monitoringService';
    import SensorDataChart from '$components/SensorDataChart.svelte';
    
    let events = $state<any[]>([]);
    let filter = $state('all');
    let timeRange = $state('24h');
    let systemHealth = $state({
      status: 'healthy',
      uptime: '99.9%',
      lastCheck: new Date().toLocaleString()
    });
    
    $effect(() => {
      loadMonitoringData();
      const interval = setInterval(loadMonitoringData, 30000);
      return () => clearInterval(interval);
    });
    
    function loadMonitoringData() {
      events = MonitoringService.getRecentEvents(100);
      // Update system health status
      updateSystemHealth();
    }
    
    function updateSystemHealth() {
      const recentErrors = events.filter(e => e.severity === 'error' || e.severity === 'critical');
      systemHealth.status = recentErrors.length > 5 ? 'warning' : 'healthy';
      systemHealth.lastCheck = new Date().toLocaleString();
    }
    
    const filteredEvents = $derived(() => {
      return events.filter(event => 
        filter === 'all' || event.severity === filter
      );
    });
  </script>
  
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">System Monitoring</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-600">System Status</h3>
        <p class={`text-2xl font-bold ${
          systemHealth.status === 'healthy' 
            ? 'text-preset-filled-success' 
            : 'text-preset-filled-warning'
        }`}>
          {systemHealth.status.toUpperCase()}
        </p>
        <p class="text-sm text-gray-500 mt-2">Last checked: {systemHealth.lastCheck}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-600">Uptime</h3>
        <p class="text-2xl font-bold text-preset-filled-primary">{systemHealth.uptime}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-600">Events Today</h3>
        <p class="text-2xl font-bold text-preset-filled-secondary">{events.length}</p>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Event Log</h2>
        <div class="flex space-x-4">
          <select 
            bind:value={filter}
            class="border rounded-md px-3 py-2"
          >
            <option value="all">All Events</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <select 
            bind:value={timeRange}
            class="border rounded-md px-3 py-2"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each filteredEvents as event}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.type}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class={`px-2 py-1 rounded text-xs ${
                    event.severity === 'critical' ? 'bg-preset-filled-error/10 text-preset-filled-error' :
                    event.severity === 'error' ? 'bg-preset-filled-error/10 text-preset-filled-error' :
                    event.severity === 'warning' ? 'bg-preset-filled-warning/10 text-preset-filled-warning' :
                    'bg-preset-filled-info/10 text-preset-filled-info'
                  }`}>
                    {event.severity}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">{JSON.stringify(event.details)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>