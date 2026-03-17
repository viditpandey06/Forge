class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
  }

  register(jobType, handlerFn) {
    if (typeof handlerFn !== 'function') {
      throw new Error(`Handler for ${jobType} must be a function`);
    }
    this.handlers.set(jobType, handlerFn);
    console.log(`[Worker] Registered handler for: ${jobType}`);
  }

  get(jobType) {
    return this.handlers.get(jobType);
  }

  has(jobType) {
    return this.handlers.has(jobType);
  }
}

const handlerRegistry = new HandlerRegistry();
module.exports = { HandlerRegistry, handlerRegistry };
