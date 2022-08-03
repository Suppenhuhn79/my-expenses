/**
 * @typedef PaymentMethod
 * Payment method object. Represents a single payment method.
 * @type {Object}
 * @property {String} label
 * @property {IconCode} icon
 * @property {String} color
 */

/**
 * @namespace myxPaymentMethods
 * my-expenses "payment methods" module.
 */
let myxPaymentMethods = function ()
{
	const MODULE_NAME = "payment-methods-tab";
	const FILE_NAME = "pmt.json";
	const DEFAULTS = {
		order: ["d2ba53b0", "b6eb6e66"],
		default: "d2ba53b0",
		items: {
			d2ba53b0: {
				label: "Cash",
				icon: "fas:f53a",
				color: "#008000"
			},
			b6eb6e66: {
				label: "Bank account",
				icon: "far:f09d",
				color: "#ebb147"
			}
		}
	};
	/** @type {Object<IdString, PaymentMethod>} */
	let data = {};
	/** @type {Array<IdString>} */
	let order = [];
	/** @type {Array<IdString>} */
	let disabledItems = [];
	/** @type {IdString} */
	let defaultId;
	let elements = getNames(document.getElementById(MODULE_NAME));

	let sortable = new Sortable(elements.content, {
		draggable: ".sortable",
		handle: ".dragger-ns",
		dataIdAttr: "data-id",
		animation: 350,
		onEnd: () => order = sortable.toArray()
	});

	let modeHandler = new ModuleModeHandler(elements._self,
		/*getData*/() => { return { items: data, order: order, disabledItems: disabledItems, defaultId: defaultId }; },
		/*revertData*/(revertData) => { data = revertData.items; order = revertData.order; disabledItems = revertData.disabledItems, defaultId = revertData.defaultId; });

	elements.editButton.onclick = () => modeHandler.setMode("edit");
	elements.applyEditsButton.onclick = () => applyEdits();
	elements.cancelEditsButton.onclick = () => { modeHandler.setMode("default"); renderList(); };
	elements.searchButton.onclick = () => modeHandler.setMode("search");
	elements.cancelSearchButton.onclick = () => modeHandler.setMode("default");
	elements.addButton.onclick = () => promptEditor();

	/**
	 * Loads _payment methods_ from cache or remote file (if modified).
	 * @returns {Promise<void>} Promise
	 */
	function fetchData ()
	{
		return new Promise((resolve) =>
		{
			if (googleappApi.isModified(FILE_NAME))
			{
				googleappApi.loadFileEx(FILE_NAME).then((obj = DEFAULTS) =>
				{
					data = obj.items;
					order = obj.order;
					disabledItems = obj.disabled || [];
					defaultId = obj['default'] || Object.keys(obj.items)[0];
					resolve();
				});
			}
			else
			{
				resolve();
			}
		});
	}

	/**
	 * Provides the label of a payment method.
	 * @param {IdString} id Id of payment method to get label for
	 * @returns {String} Label of the payment method
	 */
	function getLabel (id)
	{
		return data[id].label;
	}

	/**
	 * Pops up a menu to prompt for a payment method.
	 * @param {HTMLElement} alignElement Element to align the menu to
	 * @param {Function} callback `function(selectedPaymentMethod: String)` to call on selection
	 */
	function prompt (alignElement, callback)
	{
		let menuItems = [];
		for (let id of order)
		{
			menuItems.push({
				key: id,
				label: data[id].label,
				iconHtml: renderIcon(id)
			});
		}
		let menubox = new Menubox("pmt.selection", { items: menuItems }, (event) =>
		{
			if (typeof callback === "function")
			{
				callback(event.itemKey);
			}
		});
		menubox.popup(null, null, alignElement, "end right, middle");
	}

	/**
	 * Provides a HTML element with the icon of a payment method.
	 * @param {IdString} id Id of payment method to get the icon for
	 * @returns {HTMLDivElement} HTML element with the payment methods icon
	 */
	function renderIcon (id)
	{
		let icon = myx.getIconAttributes(data[id].icon);
		return htmlBuilder.newElement("div.pmt-icon",
			{ style: "color:" + data[id].color },
			htmlBuilder.newElement("i." + icon.faScope, icon.htmlEntity));
	}

	/**
	 * Puts a list of all payment methods to the "content"-element.
	 * Item elements will contain all functionality for all modes.
	 * @param {String} [mode] Mode to set for the list; default is the current mode
	 */
	function renderList (mode = modeHandler.currentMode)
	{
		/**
		 * Actually does render the list items.
		 * @param {Array<IdString>} pmtIds Array that hold the pmt-ids to render
		 * @param {Boolean} canSort Whether the items should have a sorting capatibility (active pmts) o not (disabled pmts)
		 */
		function _renderList (pmtIds, canSort)
		{
			for (let id of pmtIds)
			{
				let div = htmlBuilder.newElement("div.item" + ((canSort) ? ".sortable" : ""),
					{ 'data-id': id },
					renderIcon(id),
					htmlBuilder.newElement("div.flex-fill.big", data[id].label, { 'data-key': id, onclick: onItemClick }),
					htmlBuilder.newElement("div.for-mode.default-mode.pmt-def-flag.fas", (defaultId === id) ? fa.star : "")
				);
				if (canSort)
				{
					div.appendChild(htmlBuilder.newElement("div.for-mode.edit-mode.dragger-ns.fas", fa.sort));
				}
				if (data[id].exclude)
				{
					div.classList.add("exclude");
				}
				elements.content.appendChild(div);
			}
		}
		htmlBuilder.removeAllChildren(elements.content);
		console.log(order, disabledItems);
		_renderList(order, true);
		if (disabledItems.length > 0)
		{
			elements.content.appendChild(htmlBuilder.newElement("div.headline", "Disabled payment methods"));
			_renderList(disabledItems, false);
		}
		elements.content.querySelector("[data-key='" + defaultId + "']").parentElement.classList.add("default-selected");
		modeHandler.setMode(mode);
	}

	/**
	 * Opens the IconEditor for modifing a payment method or creating a new one.
	 * Changes are not saved until `applyEdits()` is called!
	 * @param {IdString} [id] Id of payment method to edit; if empty, a new payment method will be created
	 */
	function promptEditor (id)
	{
		const ADD_NEW = 1;
		const EDIT_EXISTING = 2;
		let editorMode = (!!id) ? EDIT_EXISTING : ADD_NEW;
		if (editorMode === ADD_NEW)
		{
			modeHandler.setMode("edit");
		}
		let itemToEdit = (editorMode === EDIT_EXISTING) ? Object.assign({}, data[id]) : {};
		itemToEdit.meta = {
			type: "payment-method",
			isDefault: (defaultId === id),
			isDisabled: (disabledItems.indexOf(id) > -1),
			cssModifier: "paymentmethod",
			header: (editorMode === EDIT_EXISTING) ? "Edit payment method" : "New payment method",
			defaultlabel: "New payment method"
		};
		window.iconEditor.popup("pmt", itemToEdit, (editedObj, properties) =>
		{
			if (editorMode === ADD_NEW)
			{
				id = myx.newId();
				data[id] = editedObj;
				order.push(id);
			}
			else
			{
				data[id] = Object.assign({}, editedObj);
			}
			if (properties.includes("default"))
			{
				defaultId = id;
			}
			(properties.includes("exclude")) ? data[id].exclude = true : delete data[id].exclude;
			if (properties.includes("disable"))
			{
				order.splice(order.indexOf(id), 1);
				disabledItems.splice(0, 0, id);
				// disabledItems.push(id);
				// disabledItems.sort((a, b) => data[a].label.localeCompare(data[b].label));
			}
			else if (!!data.disabled)
			{
				disabledItems.splice(disabledItems.indexOf(id), 1);
				order.push(id);
			}
			delete data[id].disable;
			renderList();
			elements.content.querySelector("[data-key='" + id + "']").scrollIntoView();
		});
	}

	/**
	 * Saves changes to file and returns to "default" mode.
	 * @async
	 */
	async function applyEdits ()
	{
		modeHandler.setMode("__saving__"); // intermediate state 'cause going from "edit" to "default" mode triggers a data rollback
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, {
			order: order,
			items: data,
			disabled: disabledItems,
			'default': defaultId
		}).then(myx.xhrSuccess, myx.xhrError);
		modeHandler.setMode("default");
	}

	/**
	 * Handles clicks on items in the list depending on the current mode:
	 * - "edit": pops up the IconEditor to edit the payment method.
	 * - "search": sets the expenses filter to the payment method and switches to the expenses module
	 * @param {MouseEvent} mouseEvent Mouse event triggered by the click
	 */
	function onItemClick (mouseEvent)
	{
		let id = mouseEvent.target.dataset.key;
		switch (modeHandler.currentMode)
		{
			case "edit":
				promptEditor(id);
				break;
			case "search":
				myx.setExpenseFilter({ pmt: id }, MODULE_NAME);
				break;
			default:
		}
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		fetchData: fetchData,
		enter: () => renderList("default"),
		leave: () => modeHandler.setMode("default"),
		/** @type {IdString} */
		get defaultPmt () { return defaultId; },
		getLabel: getLabel,
		/**
		 * Provides whether a payment method is set to be excluded.
		 * @param {IdString} id Id of payment method
		 * @returns {Boolean} `true` if the payment methods "exclude" flag is set, otherwise `false`
		 */
		isExcluded: (id) => (data[id].exclude === true),
		renderIcon: renderIcon,
		prompt: prompt
	};
};
