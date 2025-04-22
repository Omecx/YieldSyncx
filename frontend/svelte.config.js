import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

const config = {
	preprocess: vitePreprocess(),
	kit: { 
		adapter: adapter(),
		alias: {
			'@components': path.resolve('./src/lib/components'),
			'@source': path.resolve('./node_modules'),
		  } 
	}
};

export default config;
