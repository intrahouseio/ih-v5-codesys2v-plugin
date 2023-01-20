/**
 * client.js
 */

 const util = require('util');
 const net = require('net'); 
 const parser = require('./lib/parser');

 let variables = {};
 
 module.exports = {
   dataLength: 12, 
   conn: {},
   sendwriteMsg:{},

   init(plugin) {
     this.plugin = plugin;
     return this.addItems(this.plugin.channels);
   },
 
   addItems(channels) {
     const sendReadMsgs = parser.reqReadHex(channels);
     this.plugin.log("SendMSGlength: " + sendReadMsgs.length, 2);
     return sendReadMsgs;
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
 
   readAll(sendReadMsg) {
    return new Promise((resolve) => {
        this.conn.write(sendReadMsg.buf);
        let dataLength = sendReadMsg.datalength;
        let channels = sendReadMsg.channels;
        let bufdata = Buffer.alloc(0);
        this.conn.on('data', function getData (data) {
         if (bufdata.length + data.length < dataLength) {
          bufdata = Buffer.concat([bufdata, data], bufdata.length + data.length);
         } else {
          this.removeListener('data', getData);
          bufdata = Buffer.concat([bufdata, data], bufdata.length + data.length);
          //resolve(bufdata.toString('hex'));
          resolve(parser.resReadHex(channels, bufdata));
         }
         
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