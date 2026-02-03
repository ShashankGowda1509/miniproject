const { spawn } = require('child_process');

// Start backend server
const backend = spawn('npx', ['tsx', 'backend/server.ts'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit then start frontend
setTimeout(() => {
  const frontend = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    console.error('Frontend error:', err);
    process.exit(1);
  });
}, 3000);

backend.on('error', (err) => {
  console.error('Backend error:', err);
  process.exit(1);
});

// Handle cleanup
process.on('SIGTERM', () => {
  backend.kill();
  process.exit(0);
});
