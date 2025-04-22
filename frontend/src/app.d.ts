// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { EthereumProvider } from '@metamask/providers';
declare global {
	namespace App {
		interface Window {
			ethereum?: EthereumProvider;
		}
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
