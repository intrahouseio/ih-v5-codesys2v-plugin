/**
 * parser.js
 */

const util = require('util');
const iconv = require('iconv-lite');

module.exports = {
    reqReadHex(channels) {
        let arr = [];
        let buf;
        let datalength;

        while (channels.data.length > 0) {
            datalength = 12;
            let curchannels = [];
            let chunk = channels.data.splice(0, 1000);
            let varsCnt = 0;
            for (const channel of chunk) {
                if (channel.r == 1) varsCnt++;
            }
            buf = Buffer.alloc(varsCnt * 10 + 12);
            buf.write('bbbb', 0, 2, 'hex');
            buf.writeUInt32LE(varsCnt * 10 + 6, 2);
            buf.write('2e00', 6, 2, 'hex');
            buf.writeUInt32LE(varsCnt, 8);
            let curPointer = 12;
            // Заполнить buf из каналов
            for (const channel of chunk) {
                if (channel.r == 1) {
                    buf.writeUInt16LE(channel.refId, curPointer); curPointer += 2;
                    buf.writeUInt32LE(channel.offset, curPointer); curPointer += 4;
                    buf.writeUInt32LE(channel.size, curPointer); curPointer += 4;
                    datalength += channel.size + 1;
                    curchannels.push(channel)
                }
            }
            arr.push({datalength, buf, channels:curchannels});
        }

        return arr;
    },

    resReadHex(channels, data) {
        let curPointer = 12;
        let dataArray = [];
        let chan = 0;
        for (let i = 0; i < channels.length; i++) {
            if (channels[i].r == 1) {
                switch (channels[i].vartype) {
                    case "BOOL":
                        chan = data.readUInt8(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "SINT":
                        chan = data.readInt8(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "BYTE":
                        chan = data.readUInt8(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "INT":
                        chan = data.readInt16LE(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "WORD":
                        chan = data.readUInt16LE(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "DINT":
                        chan = data.readInt32LE(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "DWORD":
                        chan = data.readUInt32LE(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "REAL":
                        chan = data.readFloatLE(curPointer + 1);
                        curPointer += channels[i].size + 1;
                        break;
                    case "STRING":
                        let buf = Buffer.alloc(channels[i].size);
                        data.copy(buf, 0, curPointer + 1);
                        chan = iconv.decode(buf, "win1251");
                        chan = chan.split("\0")[0];
                        curPointer += channels[i].size + 1;
                        break;

                }
                dataArray.push(chan)
            }
        }
        return dataArray;
    },

    reqWriteHex(channels) {
        let writeSize = 0;
        for (const channel of channels) {
            writeSize += 10 + channel.size;
        }
        let buf = Buffer.alloc(writeSize + 12);
        buf.write('bbbb', 0, 2, 'hex');
        buf.writeUInt32LE(writeSize + 6, 2);
        buf.write('3c00', 6, 2, 'hex');
        buf.writeUInt32LE(channels.length, 8);
        let curPointer = 12;
        for (const channel of channels) {
            buf.writeUInt16LE(channel.refId, curPointer); curPointer += 2;
            buf.writeUInt32LE(channel.offset, curPointer); curPointer += 4;
            buf.writeUInt32LE(channel.size, curPointer); curPointer += 4;
            switch (channel.vartype) {
                case "BOOL":
                    buf.writeUInt8(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "SINT":
                    buf.writeInt8(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "BYTE":
                    buf.writeUInt8(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "INT":
                    buf.writeInt16LE(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "WORD":
                    buf.writeUInt16LE(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "DINT":
                    buf.writeInt32LE(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "DWORD":
                    buf.writeUInt32LE(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "REAL":
                    buf.writeFloatLE(channel.value, curPointer);
                    curPointer += channel.size;
                    break;
                case "STRING":
                    let bufString = Buffer.alloc(channel.size);
                    bufString = iconv.encode(channel.value, 'win1251');
                    bufString.copy(buf, curPointer, 0);
                    curPointer += channel.size;
                    break;
            }
        }
        return buf;
    }
}