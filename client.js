/**
 * client.js
 */

 const util = require('util');
 const net = require('net'); 
 const parser = require('./lib/parser');

 let variables = {};
 
 module.exports = {
   conn: {},
   sendReadMsg: {},
   sendwriteMsg:{},

   init(plugin) {
     this.plugin = plugin;
     this.plugin.channels.data = this.plugin.channels.data.filter(item => item.refId && item.offset);
     //this.plugin.log("data ch: " + util.inspect(plugin.channels.data))
     this.addItems(this.plugin.channels);

   },
 
   addItems(channels) {
     this.sendReadMsg = parser.reqReadHex(channels);
   },
 
   removeItems() {
     const vars = Object.keys(variables);
     //console.log('Removed vars', vars);
     try {
     this.conn.removeItems(vars);
     
    } catch (e) {
      this.plugin.log('ERROR onChange: ' + util.inspect(e));
    }
   },
   
   connect() {
     const host = this.plugin.params.data.host;
     const port = Number(this.plugin.params.data.port);
 
     this.plugin.log('Try connect to ' + host + ':' + port);

     return new Promise((resolve, reject) => {
        this.conn = net.createConnection({ host, port }, (err) => {
            
            this.conn.on('end', () => {
                this.plugin.exit(1, 'disconnected');
            });
          
             this.conn.on('error', e => {
                this.conn.end();
                this.plugin.exit(1, 'Connection error:  '  + e.code);
            });
          
            /*this.conn.on('data', data => {
                this.plugin.log('Recieve' + data.toString('hex'));
                //this.plugin.sendData();
            });*/

            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
     });    
   },
 
   readAll() {
    return new Promise((resolve) => {
        this.conn.write(this.sendReadMsg);
        let ch = this.plugin.channels;
        this.conn.on('data', function getData (data) {
         this.removeListener('data', getData);
         resolve(parser.resReadHex(ch, data));
         if (data.toString().endsWith('exit')) {
            this.conn.destroy();
         }
        }); 
       });
   },
 
   write(channels) {
    this.sendwriteMsg = parser.reqWriteHex(channels);
    this.conn.write(this.sendwriteMsg);
     return new Promise((resolve, reject) => {
       // this.conn.writeItems(['TEST5', 'TEST6'], [ 867.5309, 9 ], valuesWritten);
       this.conn.once('data', (data) => {
         if (!data) {
           reject();
         } else {
           resolve(data);
         }
       });
     });
   },
 
   close() {
     return new Promise((resolve, reject) => {
       this.conn.dropConnection(err => {
         if (err) {
           reject(err);
         } else {
           resolve();
         }
       });
     });
   }
 };