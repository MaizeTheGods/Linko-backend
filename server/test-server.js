import('./src/server.js').catch(err => {
  console.error('SERVER STARTUP ERROR:', err);
  process.exit(1);
});
