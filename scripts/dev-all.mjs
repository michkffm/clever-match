import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspaces = ['frontend', 'backend'];
const processes = workspaces.map((workspace) =>
  spawn(npm, ['run', 'dev', '--workspace', workspace], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
);

let stopping = false;

function stopAll(signal) {
  if (stopping) return;
  stopping = true;
  processes.forEach((child) => child.kill(signal));
}

processes.forEach((child) => {
  child.on('error', () => {
    stopAll('SIGTERM');
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) {
      process.exitCode = code ?? 1;
      stopAll('SIGTERM');
    }
  });
});

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
