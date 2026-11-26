import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: { conditions: ['browser'] },
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.ts'],
		restoreMocks: true,
		environmentOptions: {
			jsdom: { url: 'http://localhost/detections?date=2026-09-29' },
		},
	},
});
