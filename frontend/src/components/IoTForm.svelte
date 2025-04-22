<script lang="ts">
	import { blockchainStore } from '$lib/stores/blockchainStore';
	import { simulateSensorReading } from '$lib/sensors/sensorIntegration';
	import { ProgressRing, Switch } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';

	// Props using Svelte 5 syntax
	let { onDataAdded } = $props<{
		onDataAdded?: () => void;
	}>();

	// Component state using Svelte 5 reactivity with direct state assignments
	let deviceId = $state('device-001');
	let dataType = $state('temperature');
	let location = $state('field-north');
	let useJsonFormat = $state(true);
	let sensorValue = $state('25.5');
	let sensorUnit = $state('°C');
	let jsonData = $state('{"temperature": 25.5, "unit": "°C", "battery": 98}');
	let isLoading = $state(false);
	let autoFetch = $state(false);

	// Predefined device IDs for convenience
	const deviceOptions = [
		{ id: 'device-001', label: 'Temperature Sensor' },
		{ id: 'device-002', label: 'Humidity Sensor' },
		{ id: 'device-003', label: 'Soil Moisture Sensor' },
		{ id: 'device-004', label: 'Light Sensor' },
		{ id: 'device-005', label: 'CO₂ Sensor' }
	];

	// Predefined locations
	const locationOptions = [
		{ id: 'field-north', label: 'Field - North' },
		{ id: 'field-south', label: 'Field - South' },
		{ id: 'greenhouse', label: 'Greenhouse' },
		{ id: 'storage', label: 'Storage' },
		{ id: 'processing', label: 'Processing Area' }
	];

	// Predefined sensor types and related options
	const sensorTypes = [
		{
			value: 'temperature',
			icon: 'mdi:temperature-celsius',
			defaults: { unit: '°C', value: '22.5' }
		},
		{ value: 'humidity', icon: 'mdi:water-percent', defaults: { unit: '%', value: '58' } },
		{ value: 'soil-moisture', icon: 'mdi:water', defaults: { unit: '%', value: '42' } },
		{ value: 'light', icon: 'mdi:brightness-7', defaults: { unit: 'lux', value: '850' } },
		{ value: 'co2', icon: 'mdi:molecule-co2', defaults: { unit: 'ppm', value: '450' } },
		{ value: 'custom', icon: 'mdi:code-json', defaults: { unit: '', value: '' } }
	];

	// Generate simple data from form inputs
	function generateSimpleData(): string {
		return `${sensorValue} ${sensorUnit}`;
	}

	// Generate JSON data from form inputs if not using custom JSON
	function generateJsonData(): string {
		try {
			// When in JSON mode but using the custom JSON
			if (useJsonFormat && dataType === 'custom') {
				// Use the custom JSON as is
				return jsonData;
			} else if (useJsonFormat) {
				// Generate JSON based on the form fields
				const data: Record<string, any> = {
					value: parseFloat(sensorValue) || sensorValue,
					unit: sensorUnit,
					timestamp: Date.now()
				};
				return JSON.stringify(data);
			} else {
				// Simple string format
				return generateSimpleData();
			}
		} catch (err) {
			console.error('Error generating JSON data:', err);
			return generateSimpleData();
		}
	}

	// Fetch sensor data from device (simulated)
	function fetchSensorData() {
		try {
			// Get the appropriate sensor type from dataType
			const sensorId = deviceId;

			// Simulate a sensor reading
			const reading = simulateSensorReading(sensorId);

			// Update form fields
			dataType = reading.dataType;
			location = reading.location;
			jsonData = reading.data;

			// Parse the data to update value and unit
			try {
				const parsedData = JSON.parse(reading.data);
				if (parsedData.value !== undefined) {
					sensorValue = parsedData.value.toString();
				}
				if (parsedData.unit !== undefined) {
					sensorUnit = parsedData.unit;
				}
			} catch (e) {
				console.warn('Error parsing sensor data JSON:', e);
			}

			// Ensure we're in JSON format mode
			useJsonFormat = true;
		} catch (err) {
			console.error('Error fetching sensor data:', err);
		}
	}

	// Handle form submission
	async function handleSubmit(event: Event) {
		// Prevent default form submission behavior
		event.preventDefault();
		
		if (!$blockchainStore.connected) {
			// Toast notification is handled by blockchain store
			return;
		}

		isLoading = true;

		try {
			// Generate the data in the appropriate format
			const formattedData = generateJsonData();

			// Send data to blockchain
			const result = await blockchainStore.storeIoTData(
				deviceId,
				formattedData,
				dataType,
				location
			);

			if (result && onDataAdded) {
				onDataAdded();
			}
		} catch (err) {
			console.error('Error in form submission:', err);
		} finally {
			isLoading = false;
		}
	}

	// Update defaults when sensor type changes
	function updateSensorDefaults() {
		const selected = sensorTypes.find((type) => type.value === dataType);
		if (selected && selected.value !== 'custom') {
			sensorUnit = selected.defaults.unit;
			sensorValue = selected.defaults.value;
		}
	}

	// Watch for dataType changes and update defaults
	$effect(() => {
		updateSensorDefaults();
	});

	// Set up auto-fetch interval
	$effect(() => {
		let interval: number | undefined;

		if (autoFetch) {
			// Immediately fetch once
			fetchSensorData();

			// Then set up interval (every 10 seconds)
			interval = window.setInterval(fetchSensorData, 10000);
		} else if (interval) {
			window.clearInterval(interval);
		}

		// Clean up on component destruction
		return () => {
			if (interval) {
				window.clearInterval(interval);
			}
		};
	});
	
	// Function to handle button click for specific data type
	function selectDataType(typeValue: string) {
		dataType = typeValue;
	}
</script>

<div class="card w-full">
	<header class="border-surface-500/20 flex items-center justify-between border-b p-4">
		<h3 class="h3">Store IoT Data</h3>
		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2">
				<span class="text-sm">Auto-Fetch</span>
				<Switch checked={autoFetch} onCheckedChange={(e) => autoFetch = e.checked} />
			</label>

			<label class="flex items-center gap-2">
				<span class="text-sm">JSON Format</span>
				<Switch checked={useJsonFormat} onCheckedChange={(e) => useJsonFormat = e.checked} />
			</label>
		</div>
	</header>

	<section class="p-4">
		<form onsubmit={handleSubmit} class="space-y-4">
			<!-- Device Selection -->
			<label class="label">
				<span>Device ID</span>
				<select class="select" value={deviceId} onchange={(e) => deviceId = e.currentTarget.value}>
					{#each deviceOptions as device}
						<option value={device.id}>{device.id} - {device.label}</option>
					{/each}
					<option value="custom">Custom Device ID</option>
				</select>
			</label>

			{#if deviceId === 'custom'}
				<label class="label">
					<span>Custom Device ID</span>
					<input
						class="input"
						type="text"
						value={deviceId}
						oninput={(e) => deviceId = e.currentTarget.value}
						placeholder="Enter a custom device ID"
						required
					/>
				</label>
			{/if}

			<!-- Location Selection -->
			<label class="label">
				<span>Location</span>
				<select class="select" value={location} onchange={(e) => location = e.currentTarget.value}>
					{#each locationOptions as loc}
						<option value={loc.id}>{loc.label}</option>
					{/each}
					<option value="custom">Custom Location</option>
				</select>
			</label>

			{#if location === 'custom'}
				<label class="label">
					<span>Custom Location</span>
					<input
						class="input"
						type="text"
						value={location}
						oninput={(e) => location = e.currentTarget.value}
						placeholder="Enter a custom location"
						required
					/>
				</label>
			{/if}

			<!-- Sensor Type Selection -->
			<fieldset class="space-y-2">
				<legend class="label">Sensor Type</legend>
				<div class="flex flex-wrap gap-2">
					{#each sensorTypes as type}
						<button
							type="button"
							class="btn {dataType === type.value
								? 'preset-filled-primary'
								: 'preset-soft-surface'}"
							onclick={() => selectDataType(type.value)}
							aria-pressed={dataType === type.value}
						>
							<div class="flex items-center gap-2">
								<Icon icon={type.icon} class="size-5" />
								<span class="capitalize">{type.value.replace('-', ' ')}</span>
							</div>
						</button>
					{/each}
				</div>
			</fieldset>

			<!-- Data Input Section -->
			{#if dataType === 'custom' && useJsonFormat}
				<label class="label">
					<span>Custom JSON Data</span>
					<textarea
						class="textarea h-32 font-mono"
						value={jsonData}
						oninput={(e) => jsonData = e.currentTarget.value}
						placeholder="Enter JSON data..."
						required
					></textarea>
				</label>
			{:else}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<label class="label">
						<span>Value</span>
						<input 
							class="input" 
							type="text" 
							value={sensorValue} 
							oninput={(e) => sensorValue = e.currentTarget.value} 
							required 
						/>
					</label>

					<label class="label">
						<span>Unit</span>
						<input
							class="input"
							type="text"
							value={sensorUnit}
							oninput={(e) => sensorUnit = e.currentTarget.value}
							placeholder="e.g., °C, %, lux"
						/>
					</label>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="border-surface-500/20 flex flex-wrap justify-end gap-2 border-t pt-4">
				<button
					type="button"
					class="btn preset-soft-secondary"
					onclick={fetchSensorData}
					disabled={isLoading}
				>
					<Icon icon="mdi:refresh" class="size-5" />
					<span>Fetch Data</span>
				</button>

				<button
					type="submit"
					class="btn preset-filled-primary"
					disabled={isLoading || !$blockchainStore.connected}
				>
					{#if isLoading}
						<ProgressRing size="md" />
						<span>Sending...</span>
					{:else if !$blockchainStore.connected}
						<Icon icon="mdi:wallet-off" class="size-5" />
						<span>Connect Wallet to Submit</span>
					{:else}
						<Icon icon="mdi:upload" class="size-5" />
						<span>Send to Blockchain</span>
					{/if}
				</button>
			</div>
		</form>
	</section>
</div>