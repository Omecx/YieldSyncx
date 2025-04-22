<script lang="ts">
	import { toasts, remove } from '../lib/stores/toastStore.svelte';
	import { fade, fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
</script>

{#if toasts.length}
	<div class="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
		{#each toasts as t (t.id)}
			<div
				class="card p-4 shadow-lg pointer-events-auto {t.background} text-white"
				in:fly={{ x: 100, duration: 300 }}
				out:fade={{ duration: 200 }}
			>
				<div class="flex items-center gap-3">
					<Icon icon={
						t.background.includes('success') ? 'mdi:check-circle' :
						t.background.includes('error')   ? 'mdi:alert-circle' :
						t.background.includes('warning') ? 'mdi:alert' :
						'mdi:information'
					} class="size-5"/>
					<p class="flex-1">{t.message}</p>
					<button class="btn-icon btn-icon-sm preset-ghost-surface" on:click={() => remove(t.id)}>
						<Icon icon="mdi:close" class="size-4"/>
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
