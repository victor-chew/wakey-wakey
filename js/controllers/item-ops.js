"use strict";

wkApp.controllers['page-item-ops'] = {

	isUpdated: false,

	init: function(page) {
		this.isUpdated = false;
		// Page setup
		let data = document.querySelector('#id-navigator').topPage.data;
		switch(data.func) {
			case 'new':
				page.querySelector('#id-page-title').textContent = 'Add new alarm';
				page.querySelector('#id-item-title').value = '';
				page.querySelector('#id-item-msg').value = '';
				page.querySelector('#id-item-alarm').value = 'A Real Hoot';
				page.querySelector('#id-submit').addEventListener('click', this.addItem.bind(this));
				break;
			case 'edit':
				page.querySelector('#id-page-title').textContent = 'Edit alarm';
				page.querySelector('#id-item-title').value = data.item.doc.title;
				page.querySelector('#id-item-msg').value = data.item.doc.msg;
				page.querySelector('#id-item-alarm').value = data.item.doc.alarm;
				page.querySelector('#id-submit').addEventListener('click', this.updateItem.bind(this));
				break;
		};
		// Setup help for time field
		page.querySelector('#id-time-help').addEventListener('click', (target) => {
			page.querySelector('#id-time-help-popover').show(target);
		});
		page.querySelector('#id-time-help-popover-dismiss').addEventListener('click', (target) => {
			page.querySelector('#id-time-help-popover').hide();
		});
		// Confirm cancellation when back button is clicked
		page.querySelector('ons-back-button').onClick = this.abortItem.bind(this);
		// Click on submit button when enter key is pressed in input fields
		page.querySelector('#id-item-title').addEventListener('keyup', this.onKeyUp.bind(this));
		page.querySelector('#id-item-msg').addEventListener('keyup', this.onKeyUp.bind(this));
		// Set focus on first input field
		page.querySelector('#id-item-title').querySelector('input').focus();
	},
	
	validateFields: function(event) {
		let page = document.querySelector('#id-navigator').topPage;
		let title = page.querySelector('#id-item-title').value;
		let msg = page.querySelector('#id-item-msg').value;
		let alarm = page.querySelector('#id-item-alarm').value;
		let pin = wkApp.controllers['page-main'].getPin();
		if (pin !== null) title += ' #' + pin;
		let item = wkApp.services.list.parseItem(title);
		if (item === null) {
			wkApp.util.error('Invalid time!');
			return false;
		};
		return { page: page, title: item.longtitle, msg: msg, alarm: alarm };
	},
	
	addItem: async function(event) {
		// Validate fields
		let item = this.validateFields(event);
		if (item === false) return;
		// Add new item
		await wkApp.services.list.addItem(item.title, item.msg, item.alarm);
		// Go back
		document.querySelector('#id-navigator').popPage();
	},
	
	updateItem: async function(event) {
		// Validate fields
		let item = this.validateFields(event);
		if (item === false) return;
		// Update existing item
		let data = document.querySelector('#id-navigator').topPage.data;
		data.item.doc['title'] = item.title;
		data.item.doc['msg'] = item.msg;
		data.item.doc['alarm'] = item.alarm;
		await wkApp.services.list.updateItem(data.item.doc);
		// Go back
		document.querySelector('#id-navigator').popPage();
	},

	abortItem: async function(event) {
		if (this.isUpdated) {
			const button = await ons.notification.confirm({ messageHTML: 'Discard changes?' });
			if (button == 0) return;
		}
		document.querySelector('#id-navigator').popPage();
	},

	onKeyUp: function(event) {
		let page = document.querySelector('#id-navigator').topPage;
		if (event.key === 'Enter') return page.querySelector('#id-submit').click();
	},

}
