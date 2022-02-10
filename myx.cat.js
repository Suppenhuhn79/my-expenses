const myxCategories = function (myx)
{
	const MODULE_NAME = "categories-list";
	const FILE_NAME = "cat.json";
	let data = {};
	let order = [];
	let elements = getNames(document.getElementById(MODULE_NAME));
	let modeHandler = clientModeHandler(MODULE_NAME, elements,
		() => { return { items: data, order: order }; },
		(modifiedData) => { data = modifiedData.items; order = modifiedData.order; });

	elements.addButton.onclick = () => promptEditor(); //() => myx.iconEditor.popup(undefined, "#888", console.log);
	elements.editButton.onclick = () => modeHandler.setMode("edit");
	// elements.searchButton.onclick = () => modeHandler.setMode("search");
	elements.applyeditsButton.onclick = () => modeHandler.setMode("default");
	elements.cancelButton.onclick = () => modeHandler.setMode("default");
	modeHandler.onSave = save;

	function init ()
	{
		return new Promise((resolve) =>
		{
			myx.loadConfigFile(FILE_NAME).then((obj) =>
			{
				data = obj.items;
				order = obj.order;
				resolve();
			});
		});
	};

	async function save ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, {
			order: order,
			items: data
		}).then(myx.xhrSuccess, myx.xhrError);
	};

	function getColor (id)
	{
		return data[id].color || data[data[id].masterCategory].color;
	};

	/**
	 * @param {string} id category id
	 * @param {boolean} [fullQualified=true] fully qualified or simple name
	 * @returns {string} label od the category
	 */
	function getLabel (id, fullQualified = true)
	{
		let result = data[id].label;
		if ((!!data[id].masterCategory) && (fullQualified))
		{
			result = data[data[id].masterCategory].label + "/" + result;
		}
		return result;
	};

	function renderIcon (id)
	{
		// console.log(id, data[id]);
		let icon = myx.getIconAttributes(data[id].icon || data[data[id].masterCategory].icon);
		let color = getColor(id);
		let style = "background-color:" + color;
		return htmlBuilder.newElement("div.cat-icon",
			{ style: style },
			htmlBuilder.newElement("i." + icon.faScope, icon.htmlEntity));
	};

	function renderList (mode = modeHandler.currentMode)
	{
		htmlBuilder.removeAllChildren(elements.content);
		for (let id of order)
		{
			let category = data[id];
			let labelElement = htmlBuilder.newElement("div.flex-fill",
				htmlBuilder.newElement("span.big.click", category.label, { 'data-key': id, onclick: onItemClick }));
			let subCatDiv = htmlBuilder.newElement("div.subcats");
			for (let key of category.subCategories || [])
			{
				subCatDiv.appendChild(htmlBuilder.newElement("div.subcat",
					renderIcon(key),
					htmlBuilder.newElement("span.grey.click", data[key].label, { 'data-key': key, 'data-master-key': id, onclick: onItemClick })
				));
			}
			subCatDiv.appendChild(htmlBuilder.newElement("div.subcat",
				htmlBuilder.newElement("div.for-mode.edit-mode.fas", "&#xf0fe;", { 'data-master-key': id, onclick: onItemClick })));
			labelElement.appendChild(subCatDiv);
			let div = htmlBuilder.newElement("div.item",
				renderIcon(id),
				labelElement,
				htmlBuilder.newElement("div.for-mode.edit-mode.fas", "&#xf0dc;")
			);
			elements.content.appendChild(div);
		}
		modeHandler.setMode(mode);
	};

	function renderSelection (toElement, actuallCatKey, callback)
	{
		function _highlightSelection (key)
		{
			let catColor = getColor(key);
			for (let otherElement of toElement.querySelectorAll("[data-choice]"))
			{
				otherElement.style.backgroundColor = null;
				otherElement.style.color = null;
			};
			let element = toElement.querySelector("[data-choice='" + key + "']");
			element.style.backgroundColor = catColor;
			element.style.color = "#fff";
			element.scrollIntoView({ inline: "center" });
		};
		function _onChoice (key)
		{
			if (key === "__back__")
			{
				renderSelection(toElement, null, callback);
				key = null;
			}
			else
			{
				if (!actuallCatKey)
				{
					renderSelection(toElement, key, callback);
				}
				_highlightSelection(key);
			}
			callback(key);
		};
		htmlBuilder.removeAllChildren(toElement);
		toElement.dataset.choiceGroup = "category-selection";
		let headCat = (actuallCatKey) ? (data[actuallCatKey].masterCategory || actuallCatKey) : null;
		let catSet = (actuallCatKey) ? [headCat].concat(data[headCat].subCategories || []) : order;
		if (actuallCatKey)
		{
			toElement.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
				htmlBuilder.newElement("div.cat-icon.back.fas",
					{ 'data-choice': "__back__" },
					"&#xf060;")));
		}
		for (let key of catSet)
		{
			if ((actuallCatKey) || (!data[key].masterCategory))
			{
				toElement.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
					{ 'data-choice': key },
					renderIcon(key),
					htmlBuilder.newElement("div.label", data[key].label)));
			}
		}
		if (actuallCatKey)
		{
			_highlightSelection(actuallCatKey);
		}
		else
		{
			toElement.scrollTo({ left: 0 });
		}
		choices.onChoose("category-selection", _onChoice);
	};

	function promptEditor (id, masterCategory)
	{
		console.log(id, masterCategory);
		if ((!id) && (!masterCategory))
		{
			modeHandler.setMode("edit");
		}
		let itemToEdit = (!!id) ? data[id] : { label: "New category" };
		if (masterCategory)
		{
			itemToEdit.color = getColor(masterCategory); // in case its a subcategory
			itemToEdit.masterCategory = masterCategory;
		}
		// itemToEdit.type = "category";
		itemToEdit.meta = { type: "category", cssModifier: (!masterCategory) ? "mastercategory" : "", header: (!!id) ? "Edit category" : "New category", headline: (!!masterCategory) ? "Subcategory of " + data[masterCategory].label : "" };
		myx.iconEditor.popup("cat", itemToEdit, (editedObj) =>
		{
			// console.log(editedObj);
			if (!id)
			{
				id = myx.newId();
				data[id] = editedObj;
				if (masterCategory)
				{
					data[masterCategory].subCategories ||= [];
					data[masterCategory].subCategories.push(id);
				}
				else
				{
					order.push(id);
				}
			}
			else
			{
				data[id].label = editedObj.label;
				data[id].icon = editedObj.icon;
				if (!data[id].masterCategory)
				{
					data[id].color = editedObj.color;
				}
			}
			// console.log(id, data);
			choices.choose("active-tab", MODULE_NAME);
			elements.content.querySelector("[data-key='" + id + "']").scrollIntoView();
			modeHandler.setMode("edit");
		});

	};

	function onItemClick (mouseEvent)
	{
		let id = mouseEvent.target.dataset.key;
		switch (modeHandler.currentMode)
		{
			case "default":
				myx.addExpense({ cat: id });
				break;
			case "edit":
				promptEditor(id, mouseEvent.target.dataset.masterKey);
				break;
			case "search":
				modeHandler.setMode("default");
				myx.expenses.setFilter(id);
				choices.choose("active-tab", myx.expenses.moduleName);
				break;
			default:
				console.log(modeHandler.currentMode, id);
		}
	};

	return { // publish members
		moduleName: MODULE_NAME,
		init: init,
		enter: () => renderList(modeHandler.currentMode),
		leave: modeHandler.leave,
		// save: save,
		get masterCategoryIds () { return order; },
		getSubCategories: (masterCategoryId) => { return data[masterCategoryId].subCategories || []; },
		getLabel: getLabel,
		getColor: getColor,
		renderIcon: renderIcon,
		renderSelection: renderSelection
	};
};
