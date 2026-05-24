import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

// Auto-detect Chromium in Claude Code web environment
const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
	process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
	(existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined);

export default defineConfig({
	testDir: './e2e',
	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:5173',
		screenshot: 'on',
		launchOptions: executablePath ? {
			executablePath,
			args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
		} : {},
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'npx vite --host',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 60000,
	},
});
