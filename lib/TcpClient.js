const BaseClient = require('./BaseClient');
const net = require('net');
const RtpEngineError = require('./error');
const { COMMANDS } = require('./constants');

class TcpClient extends BaseClient {

  constructor(...args) {
    super({type: 'tcp', ...args});

    if (typeof args[0] === 'object') {
      if (args[0].timeout) this.timeout = args[0].timeout;
      this.hostport = args[0].hostport;
    }
    else {
      this.hostport = args[0];
    }

    const arr = /^(.*):(\d+)$/.exec(this.hostport);
    if (!arr) throw new RtpEngineError(`rtpengine-client: invalid hostport for tcp connection: ${this.hostport}`);

    this.host = arr[1];
    this.port = arr[2];

    const socket = this.socket = new net.Socket();
    let buffer_string = '';
    socket.setEncoding('utf8');

    socket.on('connect', () => {
      this.connected = true;
      this.emit('connect');
    });
    socket.on('data', (message) => {
      buffer_string += message;
      let id = buffer_string.split(' ')[0];
      let last_readable_bracket = 0;
      let read_index = 0;

      // assuming that a message could have more than one message
      while (read_index < message.length) {
        last_readable_bracket += BaseClient.checkMessage(buffer_string);

        if (last_readable_bracket === -1) {
          // the message is incomplete, break and append another one to buffer
          last_readable_bracket = 0;
          break;
        }
        // else if (last_readable_bracket < message_len) {
        //   // the message has one more thing to read
        //   buffer_string = buffer_string.substring(read_index, last_readable_bracket+message_id);
        // }
        // console.log(`thing to read ${buffer_string}`);
        this._onMessage(buffer_string);
        // console.log(read_index);
        // console.log(last_readable_bracket);
        // console.log(message.length);
        read_index += last_readable_bracket;
        buffer_string = id + ' ' + buffer_string.substring(read_index, message.length);
        
      }
      // if (last_bracket === -1) {
      //   // the message is incomplete so the brackets don't match up
      //   return;
      // }

      // else if (last_bracket < message_len) {
      //   // the message is has more than enough info, split them
      //   var read_index = 0;
      //   while (read_index < message_len) {
      //     // assuming the message is complete
      //     this._onMessage(message.subString(read_index, message_len));
      //     read_index += last_bracket;

      //     let last_bracket = BaseClient.checkMessage(buffer_string);
      //   }
      // }

      // else {
      //   // everything is OK
      //   this._onMessage(buffer_string);
      //   buffer_string = '';
      // }
    });
    socket.on('end', this._onEnd.bind(this));
    socket.on('ready', () => this._onListening.bind(this));
    socket.on('error', this._onError.bind(this));

    socket.connect(this.port, this.host);
  }
}

// add commands
COMMANDS.forEach((method) => {
  TcpClient.prototype[method] = function(...args) {
    return this.send_internal(...[method].concat(args));
  };
});

module.exports = TcpClient;
