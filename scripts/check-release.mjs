import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const expectedVersion =
  process.argv.slice(2).find((argument) => argument !== '--') ?? packageJson.version;
const failures = [];

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expectedVersion)) {
  failures.push(`invalid release version: ${expectedVersion}`);
}

if (packageJson.version !== expectedVersion) {
  failures.push(`package.json is ${packageJson.version}, expected ${expectedVersion}`);
}

const manifest = JSON.parse(
  await readFile('custom_components/virtual_carillon/manifest.json', 'utf8'),
);
if (manifest.version !== expectedVersion) {
  failures.push(`Home Assistant manifest is ${manifest.version}, expected ${expectedVersion}`);
}

const appConfig = await readFile('add-on/config.yaml', 'utf8');
if (!new RegExp(`^version: ${expectedVersion.replaceAll('.', '\\.')}$`, 'm').test(appConfig)) {
  failures.push(`Home Assistant app config does not declare ${expectedVersion}`);
}

const dockerfile = await readFile('Dockerfile', 'utf8');
if (
  !new RegExp(`^ARG BUILD_VERSION=${expectedVersion.replaceAll('.', '\\.')}$`, 'm').test(dockerfile)
) {
  failures.push(`Dockerfile default version is not ${expectedVersion}`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Release metadata is consistent at ${expectedVersion}`);
