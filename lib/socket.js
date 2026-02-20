/**
 * Shared Socket.io instance for API routes (live score emit, etc.)
 * Set by custom server (server.js), consumed by API routes.
 */
let io = null;

function setIo(instance) {
  io = instance;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized. Ensure custom server is running.');
  }
  return io;
}

module.exports = { setIo, getIo };
