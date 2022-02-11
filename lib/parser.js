/**
 * parser.js
 */

 const util = require('util');

 module.exports = {
     reqReadHex (channels) {
        let varsCnt = 0;
        for (const channel of channels.data) {
            if (channel.r == 1) varsCnt++;
        }
        let buf = Buffer.alloc(varsCnt*10 + 12);
        buf.write('bbbb', 0, 2, 'hex');
        buf.writeUInt32LE(varsCnt*10+6, 2);
        buf.write('2e00', 6, 2, 'hex');
        buf.writeUInt32LE(varsCnt, 8);
        let curPointer = 12;
        // Заполнить buf из каналов
        for (const channel of channels.data) {
          if (channel.r == 1) {
           buf.writeUInt16LE(channel.refId, curPointer); curPointer += 2;
           buf.writeUInt32LE(channel.offset, curPointer); curPointer += 4;
           buf.writeUInt32LE(channel.size, curPointer); curPointer += 4; 
          }
        }
        return buf;
     },

     resReadHex (channels, data) {
        let curPointer = 12;
        let dataArray = [];
        let chan = 0;
         for (let i = 0; i< channels.data.length; i++) {
             if (channels.data[i].r == 1) {
                 switch (channels.data[i].vartype) {
                     case "bool" :
                        chan = data.readUInt8(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "int8" :
                        chan = data.readInt8(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "uint8" :
                        chan = data.readUInt8(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "int16" : 
                        chan = data.readInt16LE(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "uint16" : 
                        chan = data.readUInt16LE(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "int32" : 
                        chan = data.readInt32LE(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "uint32" : 
                        chan = data.readUInt32LE(curPointer+1); 
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "float": 
                        chan = data.readFloatLE(curPointer+1);
                        curPointer += channels.data[i].size + 1; 
                        break;
                     case "string":
                        chan = data.toString('utf8', curPointer+1, curPointer + 1 + channels.data[i].size);
                        curPointer += channels.data[i].size + 1; 
                        break;
                     
                 }
                dataArray.push(chan)
             }
         }
         return dataArray;
     },

     reqWriteHex (channels) {
        let writeSize = 0;
        for (const channel of channels) {
            writeSize += 10 + channel.size;
        }
        let buf = Buffer.alloc(writeSize + 12);
        buf.write('bbbb', 0, 2, 'hex');
        buf.writeUInt32LE(writeSize+6, 2);
        buf.write('3c00', 6, 2, 'hex');
        buf.writeUInt32LE(channels.length, 8);
        let curPointer = 12;
        for (const channel of channels) {
           buf.writeUInt16LE(channel.refId, curPointer); curPointer += 2;
           buf.writeUInt32LE(channel.offset, curPointer); curPointer += 4;
           buf.writeUInt32LE(channel.size, curPointer); curPointer += 4; 
           switch (channel.vartype) {
            case "bool": 
                buf.writeUInt8(channel.value, curPointer); 
                curPointer += channel.size;
                break;
            case "int8": 
                buf.writeInt8(channel.value, curPointer);
                curPointer += channel.size;
                break;
            case "uint8": 
                buf.writeUInt8(channel.value, curPointer);
                curPointer += channel.size;
                break;
            case "int16": 
                buf.writeInt16LE(channel.value, curPointer);
                curPointer += channel.size;
                break;
            case "uint16": 
                buf.writeUInt16LE(channel.value, curPointer);
                curPointer += channel.size;
                break;
            case "int32": 
                buf.writeInt32LE(channel.value, curPointer);
                curPointer += channel.size;
                break;
            case "uint32": 
                buf.writeUInt32LE(channel.value, curPointer);
                curPointer += channel.size;
                break;
            case "float": 
                buf.writeFloatLE(channel.value, curPointer);
                curPointer += channel.size;
                break;
            }
        }
       return buf;
     }
 }