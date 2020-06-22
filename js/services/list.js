"use strict";

wkApp.services.list = {

	emitter: new EventEmitter(),
	changeFunc: null,
	syncFunc: null,

	on: function(evt, func) {
		this.emitter.on(evt, func);
	},

	// Listen to local database changes to refresh display
	listenToLocalDb: function() {
		console.log('listenToLocalDb');
		this.changeFunc = wkApp.ldb.changes({
			since: 'now',
			live: 'true',
		}).on('change', () => {
			console.log('Local DB change');
			this.emitter.emit('list-changed');
			navigator.serviceWorker.ready.then(reg => reg.sync.register('background-sync'));
		}).on('error', (err) => {
			console.log(err);
			setTimeout(this.listenToLocalDb, 15000);
		});
	},

	// Synchronize local with remote database
	syncWithRemoteDb: function() {
		console.log('syncWithRemoteDb');
		this.syncFunc = wkApp.ldb.sync(wkApp.rdb, {
			live: true,
			retry: true,
		}).on('error', (err) => {
			console.log(err);
			setTimeout(this.syncWithRemoteDb, 15000);
		});
	},

	// PRIVATE common function access posting a request to "request.php" on the server
	postRequest: async function(body) {
		let protocol = window.location.protocol;
		let location = window.location.hostname;
		let config = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		}
		let response = await fetch(`${protocol}//${location}/php/request.php`, config);
		if (response.ok) {
			let json = await response.json();
			if (json.status == 'ok') {
				return json;
			} else {
				throw new Error(json.statusText);
			}
		} else {
			throw new Error(response.status + ' - ' + response.statusText);
		}
	},

	// PRIVATE common function for opening an existing list or creating a new list on server
	createOrOpen: async function(cmd, name, pin) {
		let json = await this.postRequest({
			'cmd' : cmd, 
			'name': name,
			'pin' : pin,
		});
		// Persist new list name and PIN to local storage
		await idbKeyval.set('listName', name);
		await idbKeyval.set('listPin', pin);
		await idbKeyval.set('dbServer', wkApp.dbServer);
		await idbKeyval.set('dbName', json.dbName);
		await idbKeyval.set('dbUser', json.dbUser);
		await idbKeyval.set('dbPass', json.dbPass);
		// Setup local and remote database
		await this.setupDatabase({
			listName: name, 
			listPin: pin, 
			dbServer: wkApp.dbServer,
			dbName: json.dbName, 
			dbUser: json.dbUser, 
			dbPass: json.dbPass,
		});
	},

	setupDatabase: async function(params) {
		// Cancel previous subscriptions
		await this.stopSync();
		// Create new local database
		wkApp.ldb = new PouchDB({
			name: params.listName + '-' + params.listPin,
			'revs_limit' : 50,
		});
		// Remote database
		wkApp.rdb = new PouchDB({
			name: params.dbServer + params.dbName,
			revs_limit: 50,
			auth: { 'username' : params.dbUser, 'password' : params.dbPass },
		});
		// Update display
		this.emitter.emit('list-changed');
		// Listen to changes to local and remote databases
		this.listenToLocalDb();
		this.syncWithRemoteDb();
		// Initial sync with remote db
		this.emitter.emit('initial-sync-start');
		try {
			await wkApp.ldb.replicate.from(wkApp.rdb);
		} catch(err) {
			console.log(err);
		} finally {
			this.emitter.emit('initial-sync-stop');
		}
	},

	stopSync: async function() {
		// Cancel previous subscriptions
		if (this.changeFunc) {
			await this.changeFunc.cancel();
			this.changeFunc = null;
		}
		if (wkApp.services.list.syncFunc) {
			await this.syncFunc.cancel();
			this.syncFunc = null;
		}
	},

	// Open existing list on server
	open: async function(name, pin) {
		return await this.createOrOpen('open', name, pin);
	},

	// Create a new list on server
	create: async function(name, pin) {
		return await this.createOrOpen('create', name, pin);
	},

	copy: async function(name, pin) {
		let oldName = await idbKeyval.get('listName');
		let oldPin = await idbKeyval.get('listPin');
		await this.createOrOpen('create', name, pin);
		let oldDb = new PouchDB(oldName + '-' + oldPin);
		wkApp.ldb.replicate.from(oldDb).on('error', err => console.log(err));
	},

	// Create a new list if no existing name is found in local storage.
	// Otherwise open existing list whose name is found in local storage.
	init: async function() {
		if (await idbKeyval.get('dbName') === undefined) {
			let listName = 'Alarms-' + wkApp.util.randomString('ABCDEFGHJKLMNPQRSTUVWXTZ', 4);
			let listPin = wkApp.util.randomString('0123456789', 4);
			await this.create(listName, listPin);
		}
		else {
			await this.setupDatabase({
				listName: await idbKeyval.get('listName'), 
				listPin: await idbKeyval.get('listPin'), 
				dbServer: wkApp.dbServer, 
				dbName: await idbKeyval.get('dbName'), 
				dbUser: await idbKeyval.get('dbUser'), 
				dbPass: await idbKeyval.get('dbPass'),
			});
		}
	},

	// Get quick access code for the current list
	getQuickAccessCode: async function() {
		let json = await this.postRequest({
			'cmd' : 'get-code', 
			'name': await idbKeyval.get('listName'),
			'pin' : await idbKeyval.get('listPin'),
		});
		return json.code;
	},
	
	// Reddem quick access code and open the list
	redeemQuickAccessCode: async function(code) {
		return await this.postRequest({
			'cmd' : 'redeem-code', 
			'code': code,
		});
	},

	// Add an item to the list
	addItem: async function(title, msg, alarm) {
		let doc = { title: title, msg: msg, alarm: alarm, enabled: true };
		await wkApp.ldb.post(doc);
	},

	// Update an existing item
	updateItem: async function(item) {
		await wkApp.ldb.put(item);
	},

	// Toggle enabled status of given item
	toggleEnabled: async function(id) {
		let doc = await wkApp.ldb.get(id);
		doc.enabled = !doc.enabled;
		await wkApp.ldb.put(doc);
	},

	// Delete all disabled items
	deleteDisabled: async function() {
		let result = await wkApp.ldb.allDocs({
			include_docs: true
		});
		var list = [];
		for (var i=0; i<result.total_rows; i++) {
			if (!result.rows[i].doc.enabled) {
				result.rows[i].doc._deleted = true;
				list.push(result.rows[i].doc);
			}
		};
		await wkApp.ldb.bulkDocs(list);
	},

	// Return all items in the list
	// [
	//		tags[0]: { title, items[ { title, tags, doc } ... ] }
	//		tags[1]: { title, items[ { title, tags, doc } ... ] }
	//		...
	// ]
	//
	getAll: async function() {
		let list = new Array;
		let docs = await wkApp.ldb.allDocs({ include_docs: true });
		docs.rows.forEach(result => {
			// Process other list items
			let item = this.parseItem(result.doc.title);
			item.msg = result.doc.msg;
			item.alarm = result.doc.alarm;
			item.enabled = result.doc.enabled;
			item.doc = result.doc;
			if (item.tags.length === 0) {
				let group = list.find(group => group.title === '');
				if (group === undefined) list.push(group = { title: '', items: new Array() });
				if (item.title.trim().length > 0) group.items.push(item);
			} else {
				item.tags.forEach(tag => {
					let group = list.find(group => group.title === tag);
					if (group === undefined) list.push(group = { title: tag, items: new Array() });
					if (item.title.trim().length > 0)  group.items.push(item);
				});
			}
		});
		// Only keep tags with 1 or more items
		list.filter(tag => tag.items.length > 0);
		// Sort items within each tag
		list.forEach(tag => wkApp.util.sort(tag.items, 'title'));
		// Return list sorted by tags
		return wkApp.util.sort(list, 'title');
	},
	
	//	Returns
	//	{
	//		title (trimmed),
	//		longtitle (with sorted tags),
	//		tags (sorted array of strings, no leading #)
	//	}
	parseItem: function(value) {
		var keywords = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'WEEKDAYS', 'WEEKENDS'];
		let result = { title: '', keywords: new Array(), tags: new Array()};
		let tokens = value.toUpperCase().split(' ');
		for (let i=0; i<tokens.length; i++) {
			if (tokens[i].charAt(0) === '#') {
				// Tags
				if (tokens[i].length > 1) {
					let tag = tokens[i].substr(1);
					if (result.tags.indexOf(tag) < 0) result.tags.push(tag);
				}
			} else if (keywords.indexOf(tokens[i]) >= 0) {
				// Keywords
				if (result.keywords.indexOf(tokens[i]) < 0) result.keywords.push(tokens[i]);
			} else {
				// Time
				let time = tokens[i].trim();
				if (time.length === 4) {
					let hh = time.substr(0, 2);
					let mm = time.substr(2, 2);
					if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) result.title = time;
				}
			}
		}
		if (result.title.length !== 4) return null;
		for (let i=0; i<result.keywords.length; i++) result.title += ' ' + result.keywords[i];
		wkApp.util.sort(result.tags);
		result.longtitle = result.title;
		for (let i=0; i<result.tags.length; i++) result.longtitle += ' #' + result.tags[i];
		return result;
	},

};
