"use strict";

wkApp.controllers['page-main'] = {

	pinned: null,

	init: function(page) {
		// Callback for "Menu" button
		page.querySelector('#id-menu').addEventListener('click', () => document.querySelector('#id-splitter').left.toggle());
		// Callback for "New item" button
		let element = page.querySelector('#id-new-item');
		element.onclick = () => document.querySelector('#id-navigator').pushPage('html/item-ops.html', {data:{ func:'new' }});
		element.show && element.show(); // Fix ons-fab in Safari.
		// Callback for "Delete" button
		page.querySelector('#id-delete').addEventListener('click', async () => {
			let button = await ons.notification.confirm({ message: 'Delete disabled alarms?' });
			if (button == 1) {
				wkApp.util.waitFor(async function() {
					await wkApp.services.list.deleteDisabled();
				});
			}
		});
		// Initialize database and refresh view
		wkApp.services.list.on('list-changed', this.refreshList);
		wkApp.services.list.on('initial-sync-start', () => wkApp.util.loading(true));
		wkApp.services.list.on('initial-sync-stop', () => wkApp.util.loading(false));
		wkApp.services.list.init();
	},

	getPin: function() {
		return this.pinned;
	},
	
	refreshList: async function() {
		// Sanity checks
		if (wkApp.ldb === undefined) return;
		// Populate list items
		document.querySelector('#id-list-title').textContent = await idbKeyval.get('listName');
		try {
			// We protect the refresh by a mutex to make sure it runs to completion before 
			// another refresh starts. This prevents the display from being messed up if 
			// another refresh request comes in before the current one finishes.
			let mutex = new Mutex();
			var unlock = await mutex.lock();
			// Setup
			let controller = wkApp.controllers['page-main'];
			let tags = await wkApp.services.list.getAll();
			let list = document.querySelector('#id-main-list');
			let clone = list.cloneNode(false);
			// If a certain tag has been pinned, try looking for it and using only that slice of the tag array.
			// Unpin the tag if the pinned tag cannot be found (maybe it's been removed remotely).
			let ptag = tags.filter(tag => tag.title === controller.pinned);
			if (ptag.length == 0) controller.pinned = null; else tags = ptag; 
			// Generate new list
			tags.forEach(tag => {
				// Handle tag header
				if (tag.title !== '') {
					let header = ons.createElement(
						'<ons-list-header ' +  (controller.pinned === null ? '' : 'class="pinned" ') + 'tappable modifier="longdivider">' +
						(controller.pinned === null ? '' : '<ons-icon icon="md-long-arrow-return"></ons-icon> ') + 
						tag.title + '</ons-list-header>'
					);
					header.data = tag.title;
					header.addEventListener('click', event => {
						let target = event.currentTarget.closest('ons-list-header');
						controller.pinned = (controller.pinned === null) ? target.data : null;
						controller.refreshList();
					});
					clone.insertBefore(header, null);
				}
				// Handle tag items
				tag.items.forEach(item => {
					let dom =
							'<ons-list-item tappable modifier="longdivider" id="list-item-' + item.doc._id + '">' +
							'<label class="left"><ons-icon icon="md-alarm"></label>' +
							'<div class="center" style="font-size:0.8em;">' +
								item.title + '&nbsp;&nbsp;' + 
								'<font color="blue">&#x2709;&nbsp;' + item.msg + '</font>&nbsp;&nbsp;' +
								'<font color="red">&#x266b;&nbsp<b>' + item.alarm + '</b></font>' +
							'</div>' +
							'<div class="right"><ons-button id="button-edit-' + item.doc._id + '" icon="md-edit" modifier="material quiet" style="font-size: 1.3em;"></div>' +
//							'<div class="right"><ons-toolbar-button id="button-edit-' + item.doc._id + '" icon="md-edit" /></div>' +
							'</ons-list-item>';
					let listItem	= ons.createElement(dom);
					listItem.addEventListener('click', async event => {
						await wkApp.services.list.toggleEnabled(listItem.data.doc._id);
					});
					listItem.querySelector('#button-edit-' + item.doc._id).addEventListener('click', async event => {
						event.stopPropagation();
						let target = event.currentTarget.closest('ons-list-item');
						document.querySelector('#id-navigator').pushPage('html/item-ops.html', { data: { func: 'edit', item: target.data } } );
					});
					listItem.data = item;
					listItem.data.enabled = item.doc.enabled;
					listItem.classList[listItem.data.enabled ? 'remove' : 'add']('item-enabled');
					clone.insertBefore(listItem, null);
				});
			});
			// Replace existing list with new list if different
			list.parentNode.replaceChild(clone, list);
		} finally {
			unlock();
		}
	},
};
