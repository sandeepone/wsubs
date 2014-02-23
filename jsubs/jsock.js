
function jSock(opts) {
  var that = this;

  that.token_producer = opts.token_producer;
	that.url = opts.url;
  that.start = opts.start;
	that.log_error = opts.log_error || function() {
	  var ary = Array.prototype.slice.call(arguments, 0);
		ary.unshift(new Date());
		ary.unshift('ERROR');
	  console.log.apply(console, ary);
	};
	that.log_info = opts.log_info || function() {
	  if (that.log_level > 0) {
			var ary = Array.prototype.slice.call(arguments, 0);
			ary.unshift(new Date());
			ary.unshift('INFO');
			console.log.apply(console, ary);
		}
	};
	that.log_debug = opts.log_debug || function() {
	  if (that.log_level > 1) {
			var ary = Array.prototype.slice.call(arguments, 0);
			ary.unshift(new Date());
			ary.unshift('DEBUG');
			console.log.apply(console, ary);
		}
	};
	that.log_trace = opts.log_debug || function() {
	  if (that.log_level > 2) {
			var ary = Array.prototype.slice.call(arguments, 0);
			ary.unshift(new Date());
			ary.unshift('TRACE');
			console.log.apply(console, ary);
		}
	};
	that.log_level = opts.log_level || 2;
	that.error = opts.onerror;
	that.message = opts.onmessage;

	that.state = {
		reconnecting: false,
		started: false,
		open: false,
		backoff: 500
		subscriptions: {},
		rpc_calls: {},
		ws: {
		  send_if_ready: function() {}
		}
	};

  var send_subscription = function(url) {
		that.state.ws.send_if_ready(JSON.stringify({
			Type: 'Subscribe',
			Object: {
				URI: url,
			},
		}));
	};

  that.setup_connection = null;
	that.setup_connection = function() {
		that.token_producer({
			error: function() {
				if (that.state.backoff < 30000) {
					that.state.backoff *= 2;
				}
				if (!that.state.started) {
					if (that.start != null) {
						that.start();
						that.start = null;
					}
				}
				if (!state.reconnecting) {
					that.log_error('Scheduling refetch of token in', backoff, 'ms');
					state.reconnecting = true;
					setTimeout(that.setup_connection, that.state.backoff);
				},
				success: function(token) {
				  var token_url = that.url;
					if (token != null && token != '') {
					  token_url = token_url + '?token=' + encodeURIComponent(token);
					}

		      that.log_info('Opening socket to', token_url);
					that.state.ws = new WebSocket(url);
					that.state.ws.send_if_ready = function(msg) {
						if (that.state.ws.readyState == 1) {
							that.state.ws.send(msg);
						} else {
							that.log_error('Tried to send', msg, 'on', that.state.ws, 'in readyState', that.state.ws.readyState);
						}
					};
					that.state.ws.onclose = function(code, reason, wasClean) {
					  that.state.open = false;
						that.log_error('Socket closed');
						if (that.state.backoff < 30000) {
						  backoff *= 2;
						}
						if (!that.state.reconnecting) {
						  that.log_error('Scheduling reopen');
							state.reconnecting = true;
							setTimeout(that.setup_connection, that.state.backoff);
						}
					};
					that.state.ws.onopen = function() {
						that.state.open = true;
						that.log_info("Socket opened");
						backoff = 500;
						if (that.state.started) {
							for (var url in that.state.subscriptions) {
								that.log_debug('Re-subscribing to', url);
								send_subscription(url);
							}
						} else {
							that.state.started = true;
							if (that.start != null) {
								that.start();
								that.start = null;
							}
						}
					};
					that.state.ws.onerror = function(err) {
						that.state.open = false;
						that.log_error('WebSocket error', err);
						if (that.state.backoff < 30000) {
							that.state.backoff *= 2;
						}
						if (!that.state.started) {
							that.state.started = true;
							if (that.start != null) {
								that.start();
								that.start = null;
							}
						}
						if (!that.state.reconnecting) {
							that.log_error('Scheduling reopen');
							that.state.reconnecting = true;
							setTimeout(that.setup_connection, that.state.backoff);
						}
					};
					that.state.ws.onmessage = function(ev) {
						var mobj = JSON.parse(ev.data);
						if (mobj.Type == 'RPC') {
							var rpc_call = that.state.rpc_calls[mobj.Method.Id];
							if (rpc_call != null) {
								rpc_call(mobj.Method.Data);
							}
						} else if (mobj.Type == 'Error') {
							that.log_error(mobj);
							that.error(mobj);
						} else {
							if (mobj.Object.URI != null) {
								var subscription = that.state.subscriptions[mobj.Object.URI];
								if (subscription != null) {
								  subscription(mobj.Object);
								}
							}
						}
					};
				}
			}
		});
	};
	that.setup_connection();

	that.unsubscribe = function(url) {
		that.log_debug('Unsubscribing from', url);
		that.state.ws.send_if_ready(JSON.stringify({
			Type: 'Unsubscribe',
			Object: {
				URI: url,
			},
		}));
			delete(subscriptions[url]);
	};

  that.subscribe = function(url, cb) {
		that.log_debug('Subscribing to', url);
		that.state.subscriptions[urlBefore] = cb;
		send_subscription(url);
	};

	return that;
}