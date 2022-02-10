const myxPaymentMethods = function (myx)
{
	const MODULE_NAME = "payment-methods";
	const FILE_NAME = "pmt.json";
	let data = {};
	let order = [];
	let defaultId;
	let elements = getNames(document.getElementById(MODULE_NAME));

	let modeHandler = clientModeHandler(MODULE_NAME, elements,
		() => { return { items: data, order: order, defaultId: defaultId }; },
		(modifiedData) => { data = modifiedData.items; order = modifiedData.order; defaultId = modifiedData.defaultId; });

	elements.editButton.onclick = () => modeHandler.setMode("edit");
	elements.addButton.onclick = () => promptEditor();
	elements.applyeditsButton.onclick = () => modeHandler.setMode("default");
	modeHandler.onSave = save;

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
	};

	async function save ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, {
			order: order,
			items: data,
			'default': defaultId
		}).then(myx.xhrSuccess, myx.xhrError);
	};

	function getLabel (id)
	{
		return data[id].label;
	}

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
	};

	function renderIcon (id)
	{
		let icon = myx.getIconAttributes(data[id].icon);
		return htmlBuilder.newElement("div.pmt-icon",
			{ style: "color:" + data[id].color },
			htmlBuilder.newElement("i." + icon.faScope, icon.htmlEntity));
	};

	function renderList (mode = modeHandler.currentMode)
	{
		htmlBuilder.removeAllChildren(elements.content);
		elements.content.appendChild(htmlBuilder.newElement("div.headline", "&#x00a0;"));
		for (let id of order)
		{
			let div = htmlBuilder.newElement("div.item",
				renderIcon(id),
				htmlBuilder.newElement("div.flex-fill.big", data[id].label, { 'data-key': id, onclick: onItemClick }),
				htmlBuilder.newElement("div.for-mode.default-mode.pmt-def-flag.fas", (defaultId === id) ? "&#xf005;" : ""),
				htmlBuilder.newElement("div.for-mode.edit-mode.fas", "&#xf0dc;")
			);
			if (data[id].exclude)
			{
				div.classList.add("exclude");
			}
			elements.content.appendChild(div);
		}
		elements.content.querySelector("[data-key='" + defaultId + "']").parentElement.classList.add("default-selected");
		modeHandler.setMode(mode);
	};

	function promptEditor (id)
	{
		const ADD_NEW = 1;
		const EDIT_EXISTING = 2;
		let editorMode = (!!id) ? EDIT_EXISTING : ADD_NEW;
		console.log(id, editorMode);
		let itemToEdit = (editorMode === EDIT_EXISTING) ? data[id] : { label: "New payment method" };
		itemToEdit.meta = {
			type: "payment-method",
			isDefault: (defaultId === id),
			cssModifier: "paymentmethod",
			header: (editorMode === EDIT_EXISTING) ? "Edit payment method" : "New payment method"
		};
		myx.iconEditor.popup("pmt", itemToEdit, (editedObj, isDefault) =>
		{
			console.log(editedObj);
			if (editorMode === ADD_NEW)
			{
				id = myx.newId();
				data[id] = editedObj;
				order.push(id);
				save();
				// modeHandler.setMode("default");
			}
			else
			{
				data[id] = Object.assign({}, editedObj);
			}
			console.log(id, data);
			if (isDefault)
			{
				defaultId = id;
			}
			choices.choose("active-tab", MODULE_NAME);
			elements.content.querySelector("[data-key='" + id + "']").scrollIntoView();
		});

	};

	function onItemClick (mouseEvent)
	{
		let id = mouseEvent.target.dataset.key;
		console.log(modeHandler.currentMode, id);
		switch (modeHandler.currentMode)
		{
			case "edit":
				promptEditor(id, mouseEvent.target.dataset.masterKey);
				break;
			default:
		}
	};

	return { // publish members
		moduleName: MODULE_NAME,
		init: init,
		enter: () => renderList(modeHandler.currentMode),
		leave: modeHandler.leave,
		// save: save,
		get defaultPmt () { return defaultId; },
		getLabel: getLabel,
		isExcluded: (id) => (data[id].exclude === true),
		renderIcon: renderIcon,
		prompt: prompt
	};
};
