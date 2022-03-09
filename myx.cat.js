const myxCategories = function (myx)
{
	const MODULE_NAME = "categories-list";
	const FILE_NAME = "cat.json";
	let data = {};
	let order = [];
	let elements = getNames(document.getElementById(MODULE_NAME));
	let modeHandler = new ModuleModeHandler(elements._self,
		/*getData*/() => { return { items: data, order: order }; },
		/*revertData*/(revertData) => { data = revertData.items; order = revertData.order; });

	elements.addButton.onclick = () => promptEditor();
	elements.searchButton.onclick = () => modeHandler.setMode("search");
	elements.editButton.onclick = () => modeHandler.setMode("edit");
	elements.applyEditsButton.onclick = () => applyEdits();
	elements.cancelSearchButton.onclick = () => modeHandler.setMode("default");

	/**
	 * Initializes the module by loading categories from config file on Google Drive.
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
				resolve();
			});
		});
	}

	/**
	* Saves categories to file on Google Drive.
	*/
	async function save ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, {
			order: order,
			items: data
		}).then(myx.xhrSuccess, myx.xhrError);
	}

	/**
	 * Provides the color code of a category.
	 * @param {String} id category id
	 * @returns {String} RGB color code of the category
	 */
	function getColor (id)
	{
		return data[id].color || data[data[id].masterCategory].color;
	}

	/**
	 * Provides the label of a category.
	 * @param {String} id category id
	 * @param {Boolean} [fullQualified=true] `true`: fully qualified name (default); `false`: simple name
	 * @returns {String} label of the category
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
	 * Provides the sub-category ids auf a master category.
	 * @param {String} masterCategoryId id of the master category
	 * @returns {String[]} String-Array of the sub-category ids; empty if there aren't any.
	 */
	function getSubCategories (masterCategoryId)
	{
		return data[masterCategoryId].subCategories || [];
	}

	/**
	 * Provides a HTML element with the icon of a category.
	 * @param {String} id category id
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
	 * Puts a list of all categories to the "content"-element
	 * @param {String} [mode] mode to set for the list
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
	}

	/**
	 * Puts a category selection element on an existing document node.
	 * @param {HTMLElement} toElement element to render the selection on
	 * @param {String} actualCatId id of the actual selected category; `null` if none selected
	 * @param {Function} callback `function(selectedCategoryId: String)` to call on category selection
	 */
	function renderSelection (toElement, actualCatId, callback)
	{
		/**
		 * Selects (highlights) a category within the selection.
		 * @param {String} id category id to select
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
		 * @param {String} id id of the selected category
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
				if (!actualCatId)
				{
					renderSelection(toElement, id, callback);
				}
				_highlightSelection(id);
			}
			callback(id);
		}
		htmlBuilder.removeAllChildren(toElement);
		toElement.dataset.choiceGroup = "category-selection";
		let headCat = (actualCatId) ? (data[actualCatId].masterCategory || actualCatId) : null;
		let catSet = (actualCatId) ? [headCat].concat(data[headCat].subCategories || []) : order;
		if (actualCatId)
		{
			toElement.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
				htmlBuilder.newElement("div.cat-icon.back.fas",
					{ 'data-choice': "__back__" },
					"&#xf060;")));
		}
		for (let key of catSet)
		{
			if ((actualCatId) || (!data[key].masterCategory))
			{
				toElement.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
					{ 'data-choice': key },
					renderIcon(key),
					htmlBuilder.newElement("div.label", data[key].label)));
			}
		}
		if (actualCatId)
		{
			_highlightSelection(actualCatId);
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
	 * @param {String} [id] id of category to edit; if empty, a new category will be created
	 * @param {String} [masterCategory] id of the categorys master category (if it's a subcategory)
	 */
	function promptEditor (id, masterCategory)
	{
		console.log(id, masterCategory);
		const ADD_NEW = 1;
		const EDIT_EXISTING = 2;
		let editorMode = (!!id) ? EDIT_EXISTING : ADD_NEW;
		if (editorMode === ADD_NEW)
		{
			modeHandler.setMode("edit");
		}
		let itemToEdit = (editorMode === EDIT_EXISTING) ? data[id] : { label: "New category" };
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
				if (!data[id].masterCategory)
				{
					data[id].color = editedObj.color;
				}
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
	 * - "default": pops up the "add expense" page
	 * - "edit": pops up the IconEditor to edit the payment method
	 * - "search": sets the expenses filter to the category and switches to expenses
	 * @param {MouseEvent} mouseEvent mouse event triggered by the click
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
	 * Sets expenses filter to category and all sub-categories and switches to expenses tab.
	 * @param {MouseEvent} mouseEvent click event on asterisk element
	 */
	function onSearchAllClick (mouseEvent)
	{
		mouseEvent.stopPropagation();
		let id = mouseEvent.target.dataset.key;
		console.log([id].concat(getSubCategories(id)));
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
