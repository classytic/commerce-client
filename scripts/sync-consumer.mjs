import { cp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const source = resolve(import.meta.dirname, '..');
const app = resolve(process.cwd());
const manifest = JSON.parse(
  await readFile(resolve(source, 'package.json'), 'utf8'),
);
const application = JSON.parse(
  await readFile(resolve(app, 'package.json'), 'utf8'),
);
if (
  !application.dependencies?.[manifest.name] &&
  !application.devDependencies?.[manifest.name]
)
  throw new Error(
    'Run SDK sync from a consumer application that declares this package.',
  );
const consumer = resolve(app, 'node_modules', manifest.name);
async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(resolve(path, entry.name))
          : [resolve(path, entry.name)],
      ),
    )
  ).flat();
}
const sourceFiles = await files(resolve(source, 'src'));
const builtFiles = await files(resolve(source, 'dist'));
if (!builtFiles.length) throw new Error('Build the SDK before syncing.');
const latest = async (paths) =>
  Math.max(
    ...(await Promise.all(
      paths.map(async (path) => (await stat(path)).mtimeMs),
    )),
  );
if ((await latest(sourceFiles)) > (await latest(builtFiles)))
  throw new Error('SDK dist is older than source; rebuild first.');
await rm(resolve(consumer, 'dist'), { recursive: true, force: true });
await cp(resolve(source, 'dist'), resolve(consumer, 'dist'), {
  recursive: true,
});
await cp(resolve(source, 'package.json'), resolve(consumer, 'package.json'));
for (const file of builtFiles) {
  const relative = file.slice(resolve(source, 'dist').length + 1);
  const hash = async (path) =>
    createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
  if ((await hash(file)) !== (await hash(resolve(consumer, 'dist', relative))))
    throw new Error(`SDK copy differs: ${relative}`);
}
// Copied distributions keep their version; discard webpack's immutable-package snapshot.
await rm(resolve(app, '.next/cache/webpack'), {
  recursive: true,
  force: true,
});
await rm(resolve(app, '.next/dev/cache/webpack'), {
  recursive: true,
  force: true,
});
process.stdout.write(
  `${manifest.name}: verified ${builtFiles.length} built files\n`,
);
