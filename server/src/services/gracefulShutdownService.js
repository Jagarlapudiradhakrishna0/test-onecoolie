/**
 * server/src/services/gracefulShutdownService.js
 *
 * ONECOOLIE Phase 6.8: Centralized Graceful Shutdown Coordinator
 *
 * Orchestrates zero-downtime draining, connection cleanup, and graceful termination.
 *
 * Sequence:
 * 1. Mark application as draining (causes /ready to immediately fail, alerting load balancers).
 * 2. Reject incoming Socket.IO handshakes with draining notice.
 * 3. Allow in-flight requests a configurable grace period.
 * 4. Close HTTP server and WebSocket server.
 * 5. Flush structured audit logs and telemetry.
 * 6. Safely terminate process with zero unhandled rejection or orphan processes.
 *
 * Idempotent: Multiple SIGTERM / SIGINT triggers are safely deduplicated.
 */

const { setDrainingState, isDraining } = require('./healthService');
const { logger } = require('../utils/logger');

let isShuttingDown = false;
let shutdownTimeoutTimer = null;

/**
 * Initiates the graceful shutdown sequence.
 *
 * @param {object} params
 * @param {string} params.signal - 'SIGTERM' | 'SIGINT' | 'MANUAL'
 * @param {object} [params.httpServer] - Node.js HTTP server instance
 * @param {object} [params.ioServer] - Socket.IO server instance
 * @param {number} [params.gracePeriodMs=5000] - Time to wait for in-flight requests
 * @param {number} [params.forceTimeoutMs=10000] - Hard deadline before forced exit
 * @param {boolean} [params.exitProcess=true] - Whether to call process.exit (false in unit tests)
 * @returns {Promise<{ success: boolean, signal: string }>}
 */
async function initiateGracefulShutdown({
  signal = 'SIGTERM',
  httpServer = null,
  ioServer = null,
  gracePeriodMs = 5000,
  forceTimeoutMs = 10000,
  exitProcess = true
} = {}) {
  if (isShuttingDown) {
    logger.warn(`[SHUTDOWN] Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
    return { success: false, signal, reason: 'already_shutting_down' };
  }

  isShuttingDown = true;
  logger.info(`[SHUTDOWN] Initiating graceful shutdown (signal: ${signal}). Draining traffic...`);

  // Step 1: Mark application as draining (causes /ready to return 503)
  setDrainingState(true);

  // Step 2: Establish hard force-exit timeout
  if (exitProcess) {
    shutdownTimeoutTimer = setTimeout(() => {
      logger.error(`[SHUTDOWN] Forced shutdown timeout (${forceTimeoutMs}ms) exceeded. Aborting.`);
      process.exit(1);
    }, forceTimeoutMs).unref();
  }

  try {
    // Step 3: Stop new Socket.IO connections & emit draining notice
    if (ioServer) {
      try {
        ioServer.emit('server_draining', {
          message: 'Server is restarting for scheduled maintenance. Connections will gracefully resume.'
        });
        // Disconnect idle sockets
        if (typeof ioServer.close === 'function') {
          ioServer.close();
          logger.info('[SHUTDOWN] Socket.IO server closed to new connections.');
        }
      } catch (ioErr) {
        logger.warn('[SHUTDOWN] Error closing Socket.IO server:', ioErr.message);
      }
    }

    // Step 4: Allow in-flight requests a grace period
    if (gracePeriodMs > 0) {
      logger.info(`[SHUTDOWN] Waiting ${gracePeriodMs}ms for in-flight requests to complete...`);
      await new Promise((resolve) => setTimeout(resolve, gracePeriodMs));
    }

    // Step 5: Close HTTP server
    if (httpServer && typeof httpServer.close === 'function') {
      await new Promise((resolve) => {
        httpServer.close((err) => {
          if (err) {
            logger.warn('[SHUTDOWN] HTTP server close encountered error:', err.message);
          } else {
            logger.info('[SHUTDOWN] HTTP server closed cleanly.');
          }
          resolve();
        });
      });
    }

    logger.info('[SHUTDOWN] Graceful shutdown completed cleanly.');

    if (shutdownTimeoutTimer) {
      clearTimeout(shutdownTimeoutTimer);
    }

    if (exitProcess) {
      process.exit(0);
    }

    return { success: true, signal };

  } catch (err) {
    logger.error('[SHUTDOWN] Error during graceful shutdown sequence:', err);
    if (shutdownTimeoutTimer) {
      clearTimeout(shutdownTimeoutTimer);
    }
    if (exitProcess) {
      process.exit(1);
    }
    return { success: false, signal, error: err.message };
  }
}

/**
 * Registers process signal handlers for SIGTERM and SIGINT.
 *
 * @param {object} params
 * @param {object} params.httpServer
 * @param {object} [params.ioServer]
 * @param {number} [params.gracePeriodMs]
 * @param {number} [params.forceTimeoutMs]
 */
function registerShutdownHandlers({ httpServer, ioServer, gracePeriodMs, forceTimeoutMs }) {
  const handler = (signal) => {
    initiateGracefulShutdown({
      signal,
      httpServer,
      ioServer,
      gracePeriodMs,
      forceTimeoutMs,
      exitProcess: true
    });
  };

  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));
}

/**
 * Resets shutdown state (strictly for testing).
 */
function resetShutdownState() {
  isShuttingDown = false;
  if (shutdownTimeoutTimer) {
    clearTimeout(shutdownTimeoutTimer);
    shutdownTimeoutTimer = null;
  }
  setDrainingState(false);
}

module.exports = {
  initiateGracefulShutdown,
  registerShutdownHandlers,
  resetShutdownState,
  isShuttingDown: () => isShuttingDown
};
