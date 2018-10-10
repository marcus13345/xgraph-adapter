
// #sourceURL=xGraphAdapter.js

module.exports.xGraphAdapter = class xGraphAdapter {
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
	}

	_message(evt) {
		let parts = evt.data.split(/([\x02\x03])/);
		for(let part of parts) {
			if(part == '\x02') {
				this._buffer = '';
			} else if(part == '\x03') {
				let response = JSON.parse(this._buffer);
				if(Array.isArray(response)) {
					this._callbacks[response[1].Passport.Pid](response[0], response[1]);
				} else {
					this._dispatch(response);
				}
			} else {
				this._buffer += part;
			}
		}
	}

	_dispatch(command) {
		console.log(command);
		if(command.Cmd in this) {
			this[command.Cmd](command, (err, cmd) => {
				//TODO do something with the callback idfk
			})
		}
	}

	_error(evt) {
		let fart = 6;
	}

	_closed(evt) {
		this._status = 'CLOSED';
		setTimeout(this._connect.bind(this), 0);
	}

	_opened(evt) {
		this._status = 'OPEN';

		for(let obj of this._sendQueue) {
			this.send(obj)
		}

	}

	async ping (obj) {
		this.send(obj);
	}

	async send(obj) {
		let id = ++this._messageCount;
		if(!('Passport' in obj)) {
			obj = Object.assign(obj, {
				Passport: {
					Query: true,
					Pid: "" + id
				}
			});
		}
		if(this._status === 'CLOSED') {
			this._sendQueue.push(obj);
			return await new Promise(resolve => {
				this._callbacks[id] = (err, cmd) => {
					delete this._callbacks[id];
					// console.log(_)
					resolve([err, cmd]);
				}
			})
		}
		let message = JSON.stringify(obj);
		this._socket.send(`\x02${message}\x03`);

		return await new Promise(resolve => {
			this._callbacks[id] = (err, cmd) => {
				delete this._callbacks[id];
				// console.log(_)
				resolve([err, cmd]);
			}
		})
	}

}
