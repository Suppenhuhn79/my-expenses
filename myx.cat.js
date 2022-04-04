/**
 * my-expenses "categories" module.
 * @namespace myxCategories
 */
const myxCategories = function ()
{
	const MODULE_NAME = "categories-list";
	const FILE_NAME = "cat.json";
	let data = {};
	/** @type {Array<String>} */
	let order = [];
	let elements = getNames(document.getElementById(MODULE_NAME));
	let modeHandler = new ModuleModeHandler(elements._self,
		/*getData*/() => { return { items: data, order: order }; },
		/*revertData*/(revertData) => { data = revertData.items; order = revertData.order; });

	new Sortable(elements.content, {
		draggable: ".item",
		handle: ".dragger-ns",
		dataIdAttr: "data-id",
		animation: 350,
		group: "nested",
		fallbackOnBody: true,
		swapThreshold: 0.65,
		onEnd: onSortEnd
	});

	elements.editButton.onclick = () => modeHandler.setMode("edit");
	elements.applyEditsButton.onclick = () => applyEdits();
	elements.cancelEditsButton.onclick = () => { modeHandler.setMode("default"); renderList(); };
	elements.searchButton.onclick = () => modeHandler.setMode("search");
	elements.cancelSearchButton.onclick = () => modeHandler.setMode("default");
	elements.addButton.onclick = () => promptEditor();

	/**
	 * Initializes the module by loading categories from config file on Google Drive.
	 * @returns {Promise<void>} Promise
	 */
	function init ()
	{
		return new Promise((resolve) =>
		{
			googleappApi.loadFileEx(FILE_NAME).then((obj) =>
			{
				data = obj.items;
				order = obj.order;
				resolve();
			});
		});
	}

	/**
	 * Provides the color code of a category.
	 * @param {String} id Category id
	 * @returns {String} RGB color code of the category
	 */
	function getColor (id)
	{
		return data[id].color || data[data[id].masterCategory].color;
	}

	/**
	 * Provides the label of a category.
	 * "Fully qualified" means that sub-categoies will be prefixed by their master category name.
	 * @param {String} id Category id
	 * @param {Boolean} [fullQualified=true] `true`: fully qualified name (default); `false`: simple name
	 * @returns {String} Label of the category
	 */
	function getLabel (id, fullQualified = true)
	{
		let result = data[id].label;
		if ((!!data[id].masterCategory) && (fullQualified))
		{
			result = data[data[id].masterCategory].label + "/" + result;
		}
		return result;
	}

	/**
	 * Provides the sub-category ids of a master category.
	 * @param {String} masterCategoryId Id of the master category
	 * @returns {Array<String>} Sub-category ids; empty aray if there aren't any
	 */
	function getSubCategories (masterCategoryId)
	{
		return data[masterCategoryId].subCategories || [];
	}

	/**
	 * Provides a HTML element with the icon of a category.
	 * @param {String} id Category id
	 * @returns {HTMLDivElement} HTML element with the category icon
	 */
	function renderIcon (id)
	{
		let icon = myx.getIconAttributes(data[id].icon || data[data[id].masterCategory].icon);
		let color = getColor(id);
		let style = "background-color:" + color;
		return htmlBuilder.newElement("div.cat-icon",
			{ style: style },
			htmlBuilder.newElement("i." + icon.faScope, icon.htmlEntity));
	}

	/**
	 * Puts a list of all categories to the "content"-element.
	 * Item elements will contain all functionality for all modes.
	 * @param {String} [mode] Mode to set for the list; default is the current mode
	 */
	function renderList (mode = modeHandler.currentMode)
	{
		htmlBuilder.removeAllChildren(elements.content);
		for (let id of order)
		{
			let category = data[id];
			let labelElement = htmlBuilder.newElement("div.flex-fill",
				htmlBuilder.newElement("span.big.click", category.label,
					{ 'data-key': id, onclick: onItemClick },
					htmlBuilder.newElement("span.for-mode.search-mode.fas",
						{ style: "color:" + getColor(id), 'data-key': id, onclick: onSearchAllClick },
						"&#x00a0;&#xf069;")));
			let subCatDiv = htmlBuilder.newElement("div.subcats");
			for (let key of category.subCategories || [])
			{
				subCatDiv.appendChild(htmlBuilder.newElement("div.subcat",
					renderIcon(key),
					htmlBuilder.newElement("span.grey.click", data[key].label, { 'data-key': key, 'data-master-key': id, onclick: onItemClick })
				));
			}
			subCatDiv.appendChild(htmlBuilder.newElement("div.subcat",
				htmlBuilder.newElement("div.for-mode.edit-mode.no-sort.fas", "&#xf0fe;", { 'data-master-key': id, onclick: onItemClick })));
			labelElement.appendChild(subCatDiv);
			let div = htmlBuilder.newElement("div.item",
				renderIcon(id),
				labelElement,
				htmlBuilder.newElement("div.for-mode.edit-mode.dragger-ns.fas", "&#xf0dc;")
			);
			new Sortable(subCatDiv, {
				group: "nested",
				filter: ".no-sort",
				animation: 150,
				fallbackOnBody: true,
				swapThreshold: 0.65,
				onEnd: onSortEnd
			});
			elements.content.appendChild(div);
		}
		modeHandler.setMode(mode);
	}

	/**
	 * Puts a category selection element on an existing document node.
	 * @param {HTMLElement} toElement Element to render the selection on
	 * @param {String} [currentCatId] Id of the currently selected category; `null` if none selected
	 * @param {Function} callback `function(selectedCategoryId: String)` to call on category selection
	 */
	function renderSelection (toElement, currentCatId, callback)
	{
		/**
		 * Selects (highlights) a category within the selection.
		 * @param {String} id Category id to select
		 */
		function _highlightSelection (id)
		{
			let catColor = getColor(id);
			for (let otherElement of toElement.querySelectorAll("[data-choice]"))
			{
				otherElement.style.backgroundColor = null;
				otherElement.style.color = null;
			};
			let element = toElement.querySelector("[data-choice='" + id + "']");
			element.style.backgroundColor = catColor;
			element.style.color = "#fff";
			element.scrollIntoView({ inline: "center" });
		}
		/**
		 * Handles selecting a category (or the "back" button).
		 * Calls the callback function.
		 * @param {String} id Id of the selected category
		 */
		function _onChoice (id)
		{
			if (id === "__back__")
			{
				renderSelection(toElement, null, callback);
				id = null;
			}
			else
			{
				if (!currentCatId)
				{
					renderSelection(toElement, id, callback);
				}
				_highlightSelection(id);
			}
			callback(id);
		}
		htmlBuilder.removeAllChildren(toElement);
		toElement.dataset.choiceGroup = "category-selection";
		let headCat = (currentCatId) ? (data[currentCatId].masterCategory || currentCatId) : null;
		let catSet = (currentCatId) ? [headCat].concat(data[headCat].subCategories || []) : order;
		if (currentCatId)
		{
			toElement.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
				htmlBuilder.newElement("div.cat-icon.back.fas",
					{ 'data-choice': "__back__" },
					"&#xf060;")));
		}
		for (let key of catSet)
		{
			if ((currentCatId) || (!data[key].masterCategory))
			{
				toElement.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
					{ 'data-choice': key },
					renderIcon(key),
					htmlBuilder.newElement("div.label", data[key].label)));
			}
		}
		if (currentCatId)
		{
			_highlightSelection(currentCatId);
		}
		else
		{
			toElement.scrollTo({ left: 0 });
		}
		choices.onChoose("category-selection", _onChoice);
	}

	/**
	 * Opens the IconEditor for modifing a category or creating a new one.
	 * Changes are not saved until `applyEdits()` is called!
	 * @param {String} [id] Id of category to edit; if empty, a new category will be created
	 * @param {String} [masterCategory] Id of the categorys master category (if it's a subcategory)
	 */
	function promptEditor (id, masterCategory)
	{
		const ADD_NEW = 1;
		const EDIT_EXISTING = 2;
		let editorMode = (!!id) ? EDIT_EXISTING : ADD_NEW;
		if (editorMode === ADD_NEW)
		{
			modeHandler.setMode("edit");
		}
		let itemToEdit = (editorMode === EDIT_EXISTING) ? Object.assign({}, data[id]) : { label: "New category" };
		if (masterCategory)
		{
			itemToEdit.color = getColor(masterCategory); // in case its a subcategory
			itemToEdit.masterCategory = masterCategory;
		}
		itemToEdit.meta = { type: "category", cssModifier: (!masterCategory) ? "mastercategory" : "", header: (!!id) ? "Edit category" : "New category", headline: (!!masterCategory) ? "Subcategory of " + data[masterCategory].label : "" };
		myx.iconEditor.popup("cat", itemToEdit, (editedObj) =>
		{
			if (editorMode === ADD_NEW)
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
			}
			(data[id].masterCategory === undefined) ? data[id].color = editedObj.color : delete data[id].color;
			renderList();
			elements.content.querySelector("[data-key='" + id + "']").scrollIntoView();
		});
	}

	/**
	 * (async) Saves changes to file and returns to "default" mode.
	 */
	function applyEdits ()
	{
		modeHandler.setMode("__saving__"); // intermediate state 'cause going from "edit" to "default" mode triggers a data rollback
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, {
			order: order,
			items: data
		}).then(myx.xhrSuccess, myx.xhrError);
		modeHandler.setMode("default");
	}

	/**
	 * Handles end of sorting.
	 */
	function onSortEnd ()
	{
		order = [];
		for (let masterElement of elements.content.children)
		{
			let masterKey = masterElement.querySelector("[data-key]").dataset.key;
			let subsKeys = [];
			if (masterElement.querySelector("div.item")) // former master category became a subcategory
			{
				let exMasterKey = masterElement.querySelector("div.item div.item [data-key]").dataset.key;
				data[exMasterKey].masterCategory = masterKey;
				delete data[exMasterKey].color;
				delete data[exMasterKey].subCategories;
				subsKeys.push(exMasterKey);
			}
			for (let subElement of masterElement.querySelectorAll(".subcat [data-key]"))
			{
				let subKey = subElement.dataset.key;
				if (subKey !== masterKey) // if the subElement key is on the top level, this subcategory became a master category
				{
					subsKeys.push(subKey);
					data[subKey].masterCategory = masterKey;
				}
				else
				{
					data[subKey].color = getColor(subKey);
					delete data[subKey].masterCategory;
				}
			}
			if (subsKeys.length > 0)
			{
				data[masterKey].subCategories = subsKeys;
			}
			else
			{
				delete data[masterKey].subCategories;
			}
			order.push(masterKey);
		}
		renderList();
	}

	/**
	 * Handles clicks on items in the list depending on the current mode:
	 * - "default": pops up the "add expense" page
	 * - "edit": pops up the IconEditor to edit the payment method
	 * - "search": sets the expenses filter to the category and switches to expenses
	 * @param {MouseEvent} mouseEvent Mouse event triggered by the click
	 */
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
				myx.expenses.setFilter({ cat: id }, MODULE_NAME);
				choices.choose("active-tab", myx.expenses.moduleName);
				break;
			default:
		}
	}

	/**
	 * Handles clicks on master categoris asterisk in "search" mode.
	 * Sets expenses filter to the master category and all sub-categories and switches to expenses tab.
	 * @param {MouseEvent} mouseEvent Click event on asterisk element
	 */
	function onSearchAllClick (mouseEvent)
	{
		mouseEvent.stopPropagation();
		let id = mouseEvent.target.dataset.key;
		myx.expenses.setFilter({ cats: [id].concat(getSubCategories(id)) }, MODULE_NAME);
		// choices.choose("active-tab", myx.expenses.moduleName);
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		init: init,
		enter: () => renderList("default"),
		leave: () => modeHandler.setMode("default"),
		get masterCategoryIds () { return order; },
		getLabel: getLabel,
		getColor: getColor,
		getSubCategories: getSubCategories,
		renderIcon: renderIcon,
		renderSelection: renderSelection
	};
};
