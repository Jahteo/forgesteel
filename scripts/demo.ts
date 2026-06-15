#!/usr/bin/env tsx
/**
 * Demo GIF recorder for AI agents and developers.
 * Usage: npm run demo -- <route> <output-file> [css-selectors-to-click...]
 *
 * Examples:
 *   npm run demo -- / screenshots/demo.gif
 *   npm run demo -- /heroes screenshots/demo.gif ".hero-card"
 *   npm run demo -- /heroes screenshots/demo.gif ".hero-card" ".btn-edit"
 *
 * Requires the dev server to be running: npx vite --host
 * Requires ffmpeg: sudo apt-get install ffmpeg
 */
import { chromium } from '@playwright/test';
import { execSync, execFileSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

const [ ,, route = '/', outputFile = 'screenshots/demo.gif', ...selectors ] = process.argv;
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
	process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
	(existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined);

function checkFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'ignore' });
	} catch {
		console.error('ffmpeg not found. Install it with: sudo apt-get install ffmpeg');
		process.exit(1);
	}
}

async function main() {
	checkFfmpeg();

	const tmpDir = path.join(os.tmpdir(), `demo-${Date.now()}`);
	mkdirSync(tmpDir, { recursive: true });

	const browser = await chromium.launch({
		executablePath,
		args: [ '--no-sandbox', '--disable-setuid-sandbox' ],
	});

	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		recordVideo: { dir: tmpDir, size: { width: 1280, height: 900 } },
	});

	const page = await context.newPage();
	const url = route.startsWith('http') ? route : `${baseUrl}${route}`;
	console.log(`Navigating to ${url}...`);

	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(1000);

	for (const selector of selectors) {
		console.log(`Clicking: ${selector}`);
		await page.locator(selector).first().click();
		await page.waitForTimeout(1000);
	}

	await page.waitForTimeout(1000);

	const video = page.video();
	await context.close();
	await browser.close();

	const videoPath = await video!.path();

	const outPath = path.resolve(outputFile);
	mkdirSync(path.dirname(outPath), { recursive: true });

	console.log('Converting to GIF...');
	execFileSync('ffmpeg', [
		'-i', videoPath,
		'-vf', 'fps=10,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
		'-loop', '0',
		outPath,
	], { stdio: 'inherit' });

	console.log(`Demo GIF saved: ${outPath}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
