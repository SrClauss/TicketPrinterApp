#!/usr/bin/env node
const net = require('net');
const fs = require('fs');
const path = require('path');

const port = process.argv[2] ? parseInt(process.argv[2], 10) : 9100;
const outdir = path.resolve(process.cwd(), 'printer-captures');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

const server = net.createServer((socket) => {
  const addr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Connection from ${addr}`);
  const chunks = [];

  socket.on('data', (data) => {
    console.log(`Received ${data.length} bytes from ${addr}`);
    // Print a short hex preview (first 512 bytes)
    const preview = data.slice(0, 512).toString('hex');
    console.log(preview.match(/.{1,64}/g).join('\n'));
    chunks.push(data);
  });

  socket.on('end', () => {
    const buf = Buffer.concat(chunks);
    const filename = path.join(outdir, `capture-${Date.now()}.bin`);
    fs.writeFileSync(filename, buf);
    console.log(`Connection closed. Saved ${buf.length} bytes to ${filename}`);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

server.listen(port, () => console.log(`netcat-printer listening on 0.0.0.0:${port}`));

process.on('SIGINT', () => {
  console.log('\nShutting down');
  server.close(() => process.exit(0));
});
