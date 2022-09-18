/**
 * Functionality for menu boxes used in "my-expenses".
 * Outsourced here to keep source files clean.
 */
let myxMenuboxes = new function ()
{
	/**
	 * Menubox definitions.
	 * @property {[k: string]: Object} MENU_DEFS
	 */
	let MENU_DEFS = {
		"app-select-data-tab": {
			css: "grey",
			items: []
		},
		"exp-multiselect-edits": {
			items: [
				{
					key: "edit-cat",
					label: "Change category",
					iconHtml: FA.renderSolid("boxes")
				},
				{
					key: "edit-pmt",
					label: "Change payment method",
					iconHtml: FA.renderSolid("wallet")
				},
				{
					key: "edit-lbl",
					label: "Change label",
					iconHtml: FA.renderSolid("tags")
				},
				{
					key: "delete",
					label: " Delete",
					iconHtml: FA.renderSolid("trash_alt")
				}
			]
		},
		"exp-change-payment-method": {
			title: "Set payment method",
			items: [],
			buttons: [
				{
					key: "ok",
					label: "assign"
				},
				{
					key: "cancel",
					label: "cancel"
				}
			]
		},
		"pmt-select-pmt": { items: [] },
		"sta-filters": {
			title: "Expenses filter",
			css: "buttons-as-items",
			items: [
				{
					key: "__default__",
					label: "Default",
					iconHtml: FA.renderSolid("filter")
				},
				{
					key: "__none__",
					label: "No filter",
					iconHtml: FA.renderSolid("ban")
				}
			]
			// TODO: filter menu buttons
		}
	};

	/**
	 * Returns a Menubox from the `MENU_DEFS` list.
	 * @param {keyof MENU_DEFS} id Menubox id.
	 * @param {function(MenuboxEvent): void} onEvent Event handler for clicks on this menubox' items or buttons.
	 * @param {function(Array<MenuboxItem>): void} [itemsFunc] Function for manipulating menu box items.
	 * @param {boolean} [forceItemsRebuild] This menubox items will be build only the first time when the menu is created. Setting this to `ture` will force calling the `itemsFunc()` each time this menubox is requested.
	 * @returns {Menubox} The requested menubox.
	 */
	this.get = function (id, onEvent, itemsFunc, forceItemsRebuild = false)
	{
		let def = MENU_DEFS[id];
		if (Menubox.instances[id] === undefined)
		{
			forceItemsRebuild = true;
			new Menubox(id, def, onEvent);
		}
		if ((forceItemsRebuild) && (typeof itemsFunc === "function"))
		{
			itemsFunc(def.items);
			Menubox.instances[id].setItems(def.items);
		}
		return Menubox.instances[id];
	};

};