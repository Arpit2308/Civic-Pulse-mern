const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outFile = path.join(__dirname, 'test-results.txt');

const res = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    '--detectOpenHandles',
    '--verbose',
    '--no-color',
  ],
  {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'test' },
    timeout: 300000,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  }
);

const combined = (res.stdout || '') + '\n' + (res.stderr || '');
fs.writeFileSync(outFile, combined);

console.log('Test run finished with exit code:', res.status);
console.log('Results written to test-results.txt (bytes: ' + combined.length + ')');
process.exit(res.status || 0);
