/**
 * Базовый плагин
 */
const util = require('util');

const plugin = require('ih-plugin-api')();
const app = require('./app');

(async () => {
  plugin.log('Basic plugin has started.', 0);

  try {
    // Получить параметры
    plugin.params.data = await plugin.params.get();
    plugin.log('Received params...', 1);

    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error: ${util.inspect(err)}`);
  }
})();
