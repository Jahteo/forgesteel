#!/usr/bin/env tsx
/**
 * Records a demo GIF of the custom grouping feature on the hero Features tab.
 * Usage: npx tsx scripts/record-grouping-demo.ts [output-file]
 * Requires: dev server running (npx vite --host).
 */
import { chromium, Page } from '@playwright/test';
import { createRequire } from 'module';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
const require = createRequire(import.meta.url);
const GifEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');

const outputFile = process.argv[2] || 'docs/screenshots/pr-grouping-demo.gif';
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
	process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
	(existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined);

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

const WIDTH = 1024;
const HEIGHT = 768;

async function captureFrame(page: Page, framesDir: string, frameIndex: number, count = 1) {
	const buf = await page.screenshot();
	for (let i = 0; i < count; i++) {
		const idx = frameIndex + i;
		const p = path.join(framesDir, `frame${String(idx).padStart(4, '0')}.png`);
		writeFileSync(p, buf);
	}
}

function buildGif(framesDir: string, outPath: string, delay = 160) {
	const files = readdirSync(framesDir).filter(f => f.endsWith('.png')).sort();
	if (files.length === 0) throw new Error('No frames found');

	const encoder = new GifEncoder(WIDTH, HEIGHT, 'neuquant', true);
	encoder.setDelay(delay);
	encoder.setRepeat(0);
	encoder.start();

	for (const file of files) {
		const data = readFileSync(path.join(framesDir, file));
		const png = PNG.sync.read(data);
		const rgba = new Uint8Array(png.data);
		encoder.addFrame(rgba);
	}

	encoder.finish();
	const buf = encoder.out.getData();
	writeFileSync(outPath, buf);
}

async function main() {
	const framesDir = path.join(os.tmpdir(), `grouping-frames-${Date.now()}`);
	mkdirSync(framesDir, { recursive: true });

	const browser = await chromium.launch({
		executablePath,
		args: [ '--no-sandbox', '--disable-setuid-sandbox' ],
	});

	const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
	const page = await context.newPage();

	let frameIdx = 0;
	const cap = async (count = 1) => {
		await captureFrame(page, framesDir, frameIdx, count);
		frameIdx += count;
	};

	// ── 1. Load premade hero ───────────────────────────────────────────────
	console.log('Loading app and importing a premade hero...');
	await page.goto(baseUrl + '/', { waitUntil: 'networkidle' });
	await pause(600);
	await cap(2);

	await page.locator('button', { hasText: 'Use a Premade Hero' }).first().click();
	await pause(500);
	await cap(2);

	const heroBtn = page.locator('button').filter({ hasText: /Level/ }).first();
	await heroBtn.waitFor({ timeout: 5000 });
	await heroBtn.click();
	await pause(1200);
	await cap(3);

	// ── 2. Click Features tab ─────────────────────────────────────────────
	console.log('Navigating to Features tab...');
	const featuresTab = page.locator('.ant-segmented-item', { hasText: 'Features' });
	await featuresTab.waitFor({ timeout: 10000 });
	await featuresTab.click();
	await pause(700);
	await cap(3);

	// ── 3. Open ··· and switch to Custom ─────────────────────────────────
	console.log('Switching to Custom organize...');
	await page.locator('.features-section button[title="Feature Options"]').click();
	await pause(600);
	await cap(2);

	await page.locator('.ant-popover .ant-select').click();
	await pause(400);
	await cap(2);

	await page.locator('.ant-select-dropdown .ant-select-item', { hasText: 'Custom' }).click();
	await pause(500);
	await page.keyboard.press('Escape');
	await pause(800);
	await cap(4);

	// ── 4. Create a group ────────────────────────────────────────────────
	console.log('Creating a group...');
	const firstGroupSelect = page.locator('.ungrouped-container .group-select-wrapper .ant-select').first();
	await firstGroupSelect.scrollIntoViewIfNeeded();
	await firstGroupSelect.click();
	await pause(600);
	await cap(2);

	await page.keyboard.type('Combat');
	await pause(600);
	await cap(2);

	const createRow = page.locator('.create-group-row').first();
	await createRow.waitFor({ timeout: 5000 });
	await cap(2);
	await createRow.click();
	await pause(800);
	await cap(4);

	// ── 5. Assign a second feature to the group ───────────────────────────
	console.log('Assigning second feature to group...');
	const secondGroupSelect = page.locator('.ungrouped-container .group-select-wrapper .ant-select').first();
	if (await secondGroupSelect.isVisible()) {
		await secondGroupSelect.scrollIntoViewIfNeeded();
		await secondGroupSelect.click();
		await pause(500);
		await cap(2);
		const combatOption = page.locator('.ant-select-dropdown .ant-select-item', { hasText: 'Combat' });
		if (await combatOption.isVisible({ timeout: 3000 }).catch(() => false)) {
			await combatOption.click();
			await pause(700);
			await cap(4);
		} else {
			await page.keyboard.press('Escape');
		}
	}

	// ── 6. Collapse the group ─────────────────────────────────────────────
	console.log('Collapsing group...');
	const groupHeader = page.locator('.group-header').first();
	await groupHeader.scrollIntoViewIfNeeded();
	await pause(400);
	await cap(2);
	await groupHeader.click();
	await pause(800);
	await cap(4);

	// ── 7. Expand the group ───────────────────────────────────────────────
	console.log('Expanding group...');
	await groupHeader.click();
	await pause(800);
	await cap(5);

	await browser.close();

	// ── 8. Build GIF ─────────────────────────────────────────────────────
	console.log(`Building GIF from ${frameIdx} frames...`);
	const outPath = path.resolve(outputFile);
	mkdirSync(path.dirname(outPath), { recursive: true });
	buildGif(framesDir, outPath, 160);
	rmSync(framesDir, { recursive: true });
	console.log(`Demo GIF saved: ${outPath}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
