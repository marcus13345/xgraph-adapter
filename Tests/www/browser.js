let xGraphAdapter = require('xgraph-adapter');

class A extends xGraphAdapter {
	constructor(com) {
		super('192.168.2.209', 28000);
		this.ping();
	}

	Pong(com, fun) {
		console.log('Pong!!');
		this.ping();
	}

	ping() {
		console.log('sending ping');
		this.send('Ping', {}, (err, cmd) => {
			console.log('ping callback', err, cmd);
		});
	}

}

new A();