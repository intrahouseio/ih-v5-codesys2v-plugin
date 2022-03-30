/**
 * app.js
 */

const util = require('util');
const client = require('./client');

module.exports = async function(plugin) {
  const pooldelay = plugin.params.data.pooldelay || 1000;
  //let channels = await plugin.channels.get();
  //await sendChannels(); // Отправить каналы на старте

  let nextTimer; // таймер поллинга
  let waiting;   // Флаг ожидания завершения операции (содержит ts старта операции или 0)
  let toWrite = []; // Массив команд на запись
  let variables = {};
  let nextDelay;

  (async () => {
    plugin.log('Plugin codesys2v has started.', 0);

    try {
      plugin.params.data = await plugin.params.get();
      plugin.log('Received params data:' + util.inspect(plugin.params.data), 1);

      plugin.channels.data = await plugin.channels.get();
      plugin.log('Received channels data: ' + util.inspect(plugin.channels.data), 1);

      client.init(plugin);
      await client.connect();
      plugin.log('Connected!');
      sendNext();
    } catch (err) {
      plugin.exit(8, util.inspect(err));
    }
  })();

  async function sendNext() {
    if (waiting) {
      // TODO Если ожидание длится долго - сбросить флаг и выполнить следующую операцию
      nextTimer = setTimeout(sendNext, 100); // min interval?
      return;
    }
  
    nextDelay = pooldelay; // стандартный интервал опроса
    waiting = Date.now();
    if (toWrite.length) {
      await write();
      nextDelay = 100; // интервал - чтение после записи
    } else {
      await read();
    }
    waiting = 0;
    nextTimer = setTimeout(sendNext, nextDelay); 
  }

   /*  read
  *   Отправляет команду чтения на контроллер, ожидает результат
  *   Преобразует результат и отправляет данные на сервер {id, value}
  *
  */
  async function read() {
    try {
      const data = await client.readAll();
      //plugin.log("data: " + data);
      if (data) {
        let res = [];
        let cnt = 0;
        //plugin.log('Read from PLC: ' + util.inspect(data), 2);
        for (let i = 0; i < plugin.channels.data.length; i++ ) {
          if (plugin.channels.data[i].r == 1) {
            if (plugin.channels.data[i].value != data[cnt]) {
              plugin.channels.data[i].value = data[cnt];
              res.push({id: plugin.channels.data[i].id, value: data[cnt]});
            }
            cnt ++;
          }
        }
        if (res.length>0) plugin.sendData(res);
      }
    } catch (e) {
      plugin.log('Read error: ' + util.inspect(e));
    }
  }

  /*  write
  *   Отправляет команду записи на контроллер и ожидает завершения 
  *   Данные для отправки находятся в массиве toWrite = [{id, value}]
  *   (возможно накопление нескольких команд при ожидании окончания предыдущей операции)
  */
  async function write() {
    try {
      let datawrite = toWrite.slice();  
      toWrite = [];  
      await client.write(datawrite);
      plugin.log('Write completed' + util.inspect(datawrite), 1);
      
    } catch (e) {
      plugin.log('Write ERROR: ' + util.inspect(e));
    }
  }

  // Сообщения от сервера
  /**  act
   * Получили от сервера команду(ы) для устройства - пытаться отправить на контроллер
   *
   * @param {Array of Objects} - message.data - массив команд
   */
  plugin.onAct(message => {
    //console.log('Write recieve', message);
    plugin.log('ACT data=' + util.inspect(message.data));
    
    if (!message.data) return;
    message.data.forEach(item => {
      toWrite.push(item);
    });
    // Попытаться отправить на контроллер
    // Сбросить таймер поллинга, чтобы не случилось наложения
    clearTimeout(nextTimer);
    sendNext();
  });

   // При изменении каналов, recs = {Array of Objects}
   plugin.onChange('channels', async (recs) => {
    plugin.log('onChange Channels '+ util.inspect(recs), 1);
    plugin.channels.data = await plugin.channels.get();
    client.init(plugin);
    /*recs.forEach(rec => {
      if (rec.op == 'add') {
        plugin.log('onChange addChannels '+ util.inspect(recs), 1);
        addChannel(rec);
      } else if (rec.op == 'update') {
        plugin.log('onChange updateChannels '+ util.inspect(recs), 1);
        updateChannel(rec);
      } else if (rec.op == 'delete') {
        plugin.log('onChange deleteChannels '+ util.inspect(recs), 1);
        deleteChannel(rec);
      }
    });*/
  });

  process.on('exit', terminate);
  process.on('SIGTERM', () => {
    terminate();
    process.exit(0);
  });

  function terminate() {
    client.close();
    console.log('TERMINATE PLUGIN');
    // Здесь закрыть все что нужно
  }
};
