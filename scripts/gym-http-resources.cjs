const os = require('node:os');
const gib = bytes => Math.round(bytes / 1024 ** 3 * 100) / 100;
console.log(JSON.stringify({ totalMemoryGiB: gib(os.totalmem()), availableMemoryGiB: gib(os.freemem()), logicalProcessors: os.availableParallelism() }));
