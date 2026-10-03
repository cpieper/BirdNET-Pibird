import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Compile the TypeScript tests so the suite also runs on the project's Node 20 CI.
const testDirectory = new URL('.', import.meta.url);
const files = (await readdir(testDirectory)).filter(name => name.endsWith('.test.ts'));
const output = await mkdtemp(join(tmpdir(), 'pibird-tests-'));
try {
	await build({
		entryPoints: files.map(name => new URL(name, testDirectory).pathname),
		bundle: true, platform: 'node', format: 'esm', target: 'node20',
		outdir: output, outExtension: { '.js': '.mjs' },
	});
	const result = spawnSync(process.execPath, ['--test', ...files.map(name => join(output, name.replace(/\.ts$/, '.mjs')))], { stdio: 'inherit' });
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	await rm(output, { recursive: true, force: true });
}
