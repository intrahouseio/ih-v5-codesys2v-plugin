/**
 * client.js
 */

 const util = require('util');
 const net = require('net'); 
 
 let variables = {};
 
 module.exports = {
   //conn: '',
   conn: {},
   sendReadMsg: {},
   sendwriteMsg:{},

   init(plugin) {
     this.plugin = plugin;
     this.plugin.channels.data = this.plugin.channels.data.filter(item => item.refId && item.offset);
     this.addItems(this.plugin.channels);

   },
 
   addItems(channels) {
     let bufferString = "bbbb";
     let varString = "";
     let varsCnt = 0;
     // Заполнить bufferString из каналов
     for (let i=0; i < channels.data.length; i++) {
       if (channels.data[i].r == 1) {
        varString += this.Number2HEXString(channels.data[i].refId, 4);
        varString += this.Number2HEXString(channels.data[i].offset, 8);
        varString += this.Number2HEXString(channels.data[i].size, 8);
        varsCnt++; 
       }
     }
     bufferString += this.Number2HEXString(varsCnt*10+6, 8) + '2e00' + this.Number2HEXString(varsCnt, 8) + varString;
     this.plugin.log("bufferString: " + bufferString, 2);
     //this.sendReadMsg = new Buffer.from("bbbb1a0000002e00030000000400940000000200000004009000000004000000", "hex")
     this.sendReadMsg = new Buffer.from(bufferString, "hex")
   },

   Number2HEXString(Num, cnt) {
    let hex = Num.toString(16);
    if ((hex.length % 2) > 0) {
        hex = "0" + hex;
    }
    hex = hex + "00000000".substr(0, cnt - hex.length);
    return hex
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
    return new Promise((resolve, reject) => {
        this.conn.write(this.sendReadMsg);
        this.conn.once('data', (data) => {
        let curPointer = 12;
        let channels = [];
        let chan = 0;
        //this.plugin.log("data: " + data.toString('hex'))
         for (let i = 0; i< this.plugin.channels.data.length; i++) {
           // this.plugin.log("curPointer: "+ curPointer + " type: "+this.plugin.channels.data[i].vartype + " size: " + this.plugin.channels.data[i].size)
             if (this.plugin.channels.data[i].r == 1) {
                 switch (this.plugin.channels.data[i].vartype) {
                     case "bool" :
                        chan = data.readUInt8(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "int8" :
                        chan = data.readInt8(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "uint8" :
                        chan = data.readUInt8(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "int16" : 
                        chan = data.readInt16LE(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "uint16" : 
                        chan = data.readUInt16LE(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "int32" : 
                        chan = data.readInt32LE(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "uint32" : 
                        chan = data.readUInt32LE(curPointer+1); 
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "float": 
                        chan = data.readFloatLE(curPointer+1);
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     case "string":
                        chan = data.toString('utf8', curPointer+1, curPointer + 1 + this.plugin.channels.data[i].size);
                        curPointer += this.plugin.channels.data[i].size + 1; 
                        break;
                     
                 }
                channels.push(chan)
             }
         }
         
         resolve(channels);
         if (data.toString().endsWith('exit')) {
            this.conn.destroy();
         }
        }); 
        this.conn.on('error', (err) => {
         reject(err);
        });
      
       });
   },
 
   write(data) {
    let writeMsg = 'bbbb';
    let varString = '';
    let writeByteCnt = 6;
    
    for (let i = 0; i < data.length; i++) {
        let buf = Buffer.alloc(data[i].size);
        varString += this.Number2HEXString(data[i].refId, 4);
        varString += this.Number2HEXString(data[i].offset, 8);
        varString += this.Number2HEXString(data[i].size, 8);
        writeByteCnt += 10;
        switch (data[i].vartype) {
            case "bool": 
                buf.writeUInt8(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "int8": 
                buf.writeInt8(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "uint8": 
                buf.writeUInt8(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "int16": 
                buf.writeInt16LE(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "uint16": 
                buf.writeUInt16LE(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "int32": 
                buf.writeInt32LE(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "uint32": 
                buf.writeUInt32LE(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
            case "float": 
                buf.writeFloatLE(data[i].value, 0);
                varString += buf.toString('hex');
                writeByteCnt += data[i].size;
                break;
        }
        
    }
    writeMsg += this.Number2HEXString(writeByteCnt, 8) + "3c00" + this.Number2HEXString(data.length, 8) + varString;
    this.plugin.log("WriteMSG: " + writeMsg);
    this.sendwriteMsg = new Buffer.from(writeMsg, "hex");
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