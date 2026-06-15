#!/usr/bin/env tsx
/**
 * Screenshot utility for AI agents and developers.
 * Usage: npm run claude-screenshot-for-pr -- <route> <output-file> [css-selector]
 *
 * Examples:
 *   npm run claude-screenshot-for-pr -- / screenshots/home.png
 *   npm run claude-screenshot-for-pr -- /heroes screenshots/heroes.png
 *   npm run claude-screenshot-for-pr -- /heroes screenshots/hero-card.png ".hero-card"
 *
 * Requires the dev server to be running: npx vite --host
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'fs';
import path from 'path';

const [ ,, route = '/', outputFile = 'screenshot.png', selector ] = process.argv;
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

// Auto-detect Chromium in Claude Code web environment
const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
	process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
	(existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined);

async function main() {
	const browser = await chromium.launch({
		executablePath,
		args: [ '--no-sandbox', '--disable-setuid-sandbox' ],
	});

	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
	});
	const page = await context.newPage();

	const url = route.startsWith('http') ? route : `${baseUrl}${route}`;
	console.log(`Navigating to ${url}...`);

	await page.goto(url, { waitUntil: 'networkidle' });

	const outPath = path.resolve(outputFile);

	if (selector) {
		console.log(`Screenshotting element: ${selector}`);
		await page.locator(selector).first().screenshot({ path: outPath });
	} else {
		await page.screenshot({ path: outPath, fullPage: true });
	}

	await browser.close();
	console.log(`Screenshot saved: ${outPath}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
