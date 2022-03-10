const myxPaymentMethods = function (myx)
{
	const MODULE_NAME = "payment-methods";
	const FILE_NAME = "pmt.json";
	let data = {};
	let order = [];
	let defaultId;
	let elements = getNames(document.getElementById(MODULE_NAME));

	let sortable = new Sortable(elements.content, {
		draggable: ".item",
		handle: ".dragger-ns",
		dataIdAttr: "data-id",
		animation: 350,
		onEnd: () => order = sortable.toArray()
	});

	let modeHandler = new ModuleModeHandler(elements._self,
		/*getData*/() => { return { items: data, order: order, defaultId: defaultId }; },
		/*revertData*/(revertData) => { data = revertData.items; order = revertData.order; defaultId = revertData.defaultId; });

	elements.editButton.onclick = () => modeHandler.setMode("edit");
	elements.applyEditsButton.onclick = () => applyEdits();
	elements.cancelEditsButton.onclick = () => { modeHandler.setMode("default"); renderList(); };
	elements.searchButton.onclick = () => modeHandler.setMode("search");
	elements.cancelSearchButton.onclick = () => modeHandler.setMode("default");
	elements.addButton.onclick = () => promptEditor();

	/**
	 * Initializes the module by loading payment methods from config file on Google Drive.
	 * @returns {Promise}
	 */
	function init ()
	{
		return new Promise((resolve) =>
		{
			myx.loadConfigFile(FILE_NAME).then((obj) =>
			{
				data = obj.items;
				order = obj.order;
				defaultId = obj['default'] || Object.keys(obj.items)[0];
				resolve();
			});
		});
	}

	/**
	 * Saves payment methods to file on Google Drive.
	 */
	async function save ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, {
			order: order,
			items: data,
			'default': defaultId
		}).then(myx.xhrSuccess, myx.xhrError);
	};

	/**
	 * Provides the label of a payment method.
	 * @param {String} id id of payment method to get label for
	 * @returns {String} label of the payment method
	 */
	function getLabel (id)
	{
		return data[id].label;
	}

	/**
	 * Pops up a menu to prompt for a payment method.
	 * @param {HTMLElement} alignElement element to align the menu to
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
		let menubox = new Menubox("payment-methods", { items: menuItems }, (event) =>
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
	 * @param {String} id id of payment method to get the icon for
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
	 * @param {String} [mode] mode to set for the list
	 */
	function renderList (mode = modeHandler.currentMode)
	{
		htmlBuilder.removeAllChildren(elements.content);
		for (let id of order)
		{
			let div = htmlBuilder.newElement("div.item",
				{ 'data-id': id },
				renderIcon(id),
				htmlBuilder.newElement("div.flex-fill.big", data[id].label, { 'data-key': id, onclick: onItemClick }),
				htmlBuilder.newElement("div.for-mode.default-mode.pmt-def-flag.fas", (defaultId === id) ? "&#xf005;" : ""),
				htmlBuilder.newElement("div.for-mode.edit-mode.dragger-ns.fas", "&#xf0dc;")
			);
			if (data[id].exclude)
			{
				div.classList.add("exclude");
			}
			elements.content.appendChild(div);
		}
		elements.content.querySelector("[data-key='" + defaultId + "']").parentElement.classList.add("default-selected");
		modeHandler.setMode(mode);
	}

	/**
	 * Opens the IconEditor for modifing a payment method or creating a new one.
	 * Changes are not saved until `applyEdits()` is called!
	 * @param {String} [id] id of payment method to edit; if empty, a new payment method will be created
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
		let itemToEdit = (editorMode === EDIT_EXISTING) ? data[id] : { label: "New payment method" };
		itemToEdit.meta = {
			type: "payment-method",
			isDefault: (defaultId === id),
			cssModifier: "paymentmethod",
			header: (editorMode === EDIT_EXISTING) ? "Edit payment method" : "New payment method"
		};
		myx.iconEditor.popup("pmt", itemToEdit, (editedObj, isDefault) =>
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
			if (isDefault)
			{
				defaultId = id;
			}
			renderList();
			elements.content.querySelector("[data-key='" + id + "']").scrollIntoView();
		});
	}

	/**
	 * Applies edits. Saves changes and returns to "default" mode.
	 */
	function applyEdits ()
	{
		save();
		modeHandler.setMode("default");
	}

	/**
	 * Handles clicks on items in the list depending on the current mode:
	 * - "edit": pops up the IconEditor to edit the payment method.
	 * - "search": sets the expenses filter to the payment method and switches to the expenses module
	 * @param {MouseEvent} mouseEvent mouse event triggered by the click
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
				myx.expenses.setFilter({ pmt: id }, MODULE_NAME);
				// choices.choose("active-tab", myx.expenses.moduleName);
				break;
			default:
		}
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		init: init,
		enter: () => renderList("default"),
		leave: () => modeHandler.setMode("default"),
		get defaultPmt () { return defaultId; },
		getLabel: getLabel,
		isExcluded: (id) => (data[id].exclude === true),
		renderIcon: renderIcon,
		prompt: prompt
	};
};
