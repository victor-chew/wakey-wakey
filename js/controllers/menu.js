"use strict";

wkApp.controllers['page-menu'] = {

	init: function(page) {
		// Display version number
		page.querySelector('#id-version').textContent = wkApp.version;
		// Callback for menu item "Settings"
		page.querySelector('#id-settings').onclick = function() {
			document.querySelector('#id-splitter').left.toggle();
			document.querySelector('#id-navigator').pushPage('html/list-ops.html', { data: { func: 'settings' } } );
		}
		// Callback for menu item "Create new list"
		page.querySelector('#id-new-list').onclick = function() {
			document.querySelector('#id-splitter').left.toggle();
			document.querySelector('#id-navigator').pushPage('html/list-ops.html', { data: { func: 'new' } } );
		}
		// Callback for menu item "Open existing list"
		page.querySelector('#id-open-list').onclick = function() {
			document.querySelector('#id-splitter').left.toggle();
			document.querySelector('#id-navigator').pushPage('html/list-ops.html', { data: { func: 'open' } } );
		}
	},

};
