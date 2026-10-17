// Start the workspace's recovered database only when it is explicitly configured.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const workspace = path.resolve(__dirname, '..', '..');
const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 3306);

function isListening() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ready) => { socket.destroy(); resolve(ready); };
    socket.setTimeout(1000);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

async function main() {
  if (process.platform !== 'win32' || port !== 3302 || !['localhost', '127.0.0.1'].includes(host)) return;
  if (await isListening()) return;
  const dataDir = path.join(workspace, 'mysql-recovered-data');
  const executable = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MySQL', 'MySQL Server 8.0', 'bin', 'mysqld.exe');
  if (!fs.existsSync(path.join(dataDir, 'mysql.ibd')) || !fs.existsSync(executable)) {
    throw new Error('Local MySQL installation or recovered data is missing. See docs/LOCAL_REGISTRATION_SETUP.md.');
  }
  const output = fs.openSync(path.join(workspace, 'mysql-recovered.log'), 'a');
  const errors = fs.openSync(path.join(workspace, 'mysql-recovered.err'), 'a');
  const child = spawn(executable, [
    '--no-defaults', `--datadir=${dataDir}`, `--port=${port}`,
    '--bind-address=127.0.0.1', '--mysqlx=0', '--skip-log-bin', '--console',
  ], { detached: true, windowsHide: true, stdio: ['ignore', output, errors] });
  let launchError;
  child.once('error', (error) => { launchError = error; });
  child.unref();
  fs.closeSync(output);
  fs.closeSync(errors);
  for (let attempt = 0; attempt < 30; attempt++) {
    if (launchError) throw launchError;
    if (await isListening()) {
      console.log(`Local MySQL ready on ${host}:${port}.`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Local MySQL did not start. Check mysql-recovered.err.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
