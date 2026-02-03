const { spawn } = require('child_process');

// Only start Next.js (frontend with built-in API routes)
// No need for separate Express backend anymore
const frontend = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true
});

frontend.on('error', (err) => {
  console.error('Frontend error:', err);
  process.exit(1);
});

// Handle cleanup
process.on('SIGTERM', () => {
  frontend.kill();
  process.exit(0);
});
