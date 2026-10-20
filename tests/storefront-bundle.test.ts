import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it.each(['index', 'management'])('bundles %s without React, Next, server kernels or the ERP SDK', async (entry) => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(`../src/${entry}.ts`, import.meta.url))],
    bundle: true, write: false, platform: 'browser', format: 'esm', treeShaking: true,
    minify: true, metafile: true,
  });
  const inputs = Object.keys(result.metafile.inputs).map((path) => path.replace(/\\/g, '/'));
  expect(inputs.length).toBeGreaterThan(3);
  expect(inputs.filter((path) => /node_modules\/(?:react(?:-dom)?|next|@tanstack|@spinekit|@classytic\/(?:commerce-sdk|catalog|order|revenue|mongokit))\//.test(path))).toEqual([]);
  expect(inputs.filter((path) => /\/(?:catalog|sales)\/api\/|core\/api-handler/.test(path))).toEqual([]);
  expect(result.outputFiles[0]?.contents.length).toBeGreaterThan(0);
});
