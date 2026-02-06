/**
 * Lightweight message handler registry.
 *
 * Components register their handlers here via `registerMessageHandler`, and
 * MessageRouter reads from the same map to dispatch incoming messages.
 */

const messageHandlers = {};

/**
 * Add a new message handler.
 * @param {string} name
 * @param {(options: any, sender: any, req: any) => any} func
 */
export function registerMessageHandler(name, func) {
    messageHandlers[name] = func;
}

export default messageHandlers;
