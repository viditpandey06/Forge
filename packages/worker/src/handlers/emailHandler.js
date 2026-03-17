const { handlerRegistry } = require('../registry/HandlerRegistry');
const { FatalError } = require('../retry/RetryStrategy');

async function emailHandler(payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 10% chance to simulate a network failure
      if (Math.random() < 0.1) {
        return reject(new Error('SMTP connection timed out'));
      }
      
      // 2% chance to simulate a fatal error (e.g., invalid email format)
      if (Math.random() < 0.02) {
        return reject(new FatalError('Invalid destination address'));
      }
      
      resolve({ sentAt: new Date().toISOString(), messageId: `msg_${Date.now()}` });
    }, 150 + Math.random() * 200); // 150-350ms execution time
  });
}

handlerRegistry.register('email:send', emailHandler);

module.exports = { emailHandler };
