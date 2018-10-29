
// #sourceURL=xGraphAdapter.js

let {StreamParser} = require('xgmp');

module.exports = class xGraphAdapter {
	constructor(host, port) {
		this._status = 'CLOSED';
		this._sendQueue = [];
		this._callbacks = {};
		this._messageCount = 0;
		this._buffer = '';
		this._url = `ws://${host}:${port}`;
		this._connect();
	}
	
	_connect() {
		this._socket = new WebSocket(this._url);
		this._socket.onopen = this._opened.bind(this);
		this._socket.onclose = this._closed.bind(this);
		this._socket.onerror = this._error.bind(this);
		this._socket.onmessage = this._message.bind(this);

		// create a new parser for this connection.
		// its write stream 
		this._parser = new StreamParser({
			write: {
				writable: true,
				on: (_, close_cb) => {
					this._closedListener = close_cb;
				},
				//redirect write to send
				write: this._socket.send.bind(this._socket)
			}
		});

		this._parser.on('reply', ({err, cmd}) => {
			let id = cmd.Passport.Pid;
			this._callbacks[id](err, cmd);
		})

		this._parser.on('query', (cmd) => {
			this._dispatch(cmd);
		})
	}

	// when we get a message on the line, pass it to the message parser.
	_message(evt) {
		this._parser.data(evt.data.toString());
	}

	_dispatch(command) {
		if(command.Cmd in this) {
			this[command.Cmd](command, (err, cmd) => {
				this._parser.reply(err, cmd);
			});
		}
	}

	_error(evt) {
		console.log(evt);
		// this._closed(evt);
	}

	_closed(evt) {
		this._status = 'CLOSED';
		// send a closed event to the parser
		this._closedListener(evt);
		console.log('setTimeout')
		setTimeout(this._connect.bind(this), 0);
	}

	_opened(evt) {
		this._status = 'OPEN';
		for(let pid in this._sendQueue) {
			let [messageType, obj] = this._sendQueue[pid];
			this._send(messageType, obj);
		}
		this._sendQueue = [];
	}

	async send(cmd, opt, fun) {
		let id = ++this._messageCount;
		let obj = Object.assign(opt, {
			Cmd: cmd,
			Passport: {
				Query: true,
				Pid: '' + id
			}
		});
		let messageType = fun ? 'query' : 'ping';

		this._send(messageType, obj);

		if(!fun) {
			return await new Promise(resolve => {
				this._callbacks[id] = (err, cmd) => {
					delete this._callbacks[id];
					// console.log(_)
					if(err) resolve([err, cmd]);
					else resolve(cmd);
				};
			});
		} else {
			this._callbacks[id] = (err, cmd) => {
				delete this._callbacks[id];
				// console.log(_)
				fun(err, cmd);
			};
		}

	}

	_send(messageType, obj) {
		if(this._status === 'CLOSED') {
			this._sendQueue[obj.Passport.Pid] = ([messageType, obj]);
			return;
		}
		this._parser[messageType](obj);
	}

};
