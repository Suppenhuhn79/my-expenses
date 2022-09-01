/**
 * @typedef Category
 * Category object. Represents a single category.
 * @type {Object}
 * @property {String} label
 * @property {IconCode} icon // DEPRECATED use `FAGlyph` instead
 * @property {String} color
 * @property {IdString} [masterCategory]
 * @property {Array<IdString>} [subCategories]
 * 
 * @callback CategorySelectorCallback
 * @param {IdString} catId Id of the selected category
 * 
 */

const CategoriesTabMode = {
	/** @enum {String} */
	DEFAULT: "default",
	EDIT: "edit",
	SEARCH: "search",
	SAVING: "__saving__"
};

/**
 * Puts a category selection element on an existing document node.
 * @constructor
 * @param {HTMLElement} element Element to render the selection on
 * @param {CategorySelectorCallback} callback Callback on category selection
 * @param {Boolean} [mastersOnly] Set if selection is limited to maste categories only, or if sub-categories can be selected (default)
 */
function CategorySelector (element, callback, mastersOnly = false)
{
	/**
	 * This instance, to have it in event handlers where `this` is `window`.
	 * @type {CategorySelector}
	 */
	let _instance = this;

	/**
	 * Callback on category selection
	 * @type {CategorySelectorCallback}
	 */
	this.callback = callback;

	/**
	 * Element to render the selection on
	 * @type {HTMLElement}
	 */
	this.element = element;

	/**
	 * Limit selection to master categories only (`true`) or allow selection of sub-categiroes (`false`)
	 * @type {Boolean}
	 */
	this.mastersOnly = mastersOnly;

	/**
	 * Selects (highlights) a category within the selection.
	 * @param {IdString} id Category id to select
	 */
	this._highlightSelection = function (id)
	{
		for (let otherElement of this.element.querySelectorAll("[data-catid]"))
		{
			otherElement.style.backgroundColor = null;
			otherElement.style.color = null;
		};
		let selectedElement = this.element.querySelector("[data-catid='" + id + "']");
		selectedElement.style.backgroundColor = myx.categories.getColor(id);
		selectedElement.style.color = "#fff";
		selectedElement.scrollIntoView({ inline: "center" });
	};

	/**
	 * Event handler for clicking a category item (or the "back" button).
	 * 
	 * Calls the `callback` function.
	 * 
	 * @param {Event} event Triggering event
	 */
	function _onItemClick (event)
	{
		/**
		 * Id of the clicked items.
		 * @type {String} */
		let id = event.target.closest("[data-catid]").dataset.catid;
		if (id === "__back__")
		{
			_instance.refresh(null);
		}
		else
		{
			if (_instance.mastersOnly !== true)
			{
				_instance.refresh(id);
			}
			else
			{
				_instance._highlightSelection(id);
				_instance.callback(id);
			}
		}
	}

	/**
	 * Renders the category items as _labled icons_ on the given document element.
	 * @param {IdString} [selectedId] Id of the pre-selected category; no selection if omitted
	 */
	this.refresh = function (selectedId)
	{
		htmlBuilder.removeAllChildren(element);
		let headCat = (selectedId) ? (myx.categories.data[selectedId].masterCategory || selectedId) : null;
		let catSet = (selectedId) ? [headCat].concat(myx.categories.data[headCat].subCategories || []) : myx.categories.masterCategoryIds;
		if (selectedId)
		{
			element.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
				htmlBuilder.newElement("div.cat.icon.back.fas",
					{ 'data-catid': "__back__", onclick: _onItemClick },
					fa.arrow_left)));
		}
		for (let key of catSet)
		{
			if ((selectedId) || (!myx.categories.data[key].masterCategory))
			{
				element.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
					{ 'data-catid': key, onclick: _onItemClick },
					myx.categories.renderIcon(key),
					htmlBuilder.newElement("div.label", myx.categories.data[key].label)));
			}
		}
		if (selectedId)
		{
			this._highlightSelection(selectedId);
		}
		else
		{
			element.scrollTo({ left: 0 });
		}
	};
};


/**
 * @namespace myxCategories
 * my-expenses "categories" module.
 */
let myxCategories = function ()
{
	const MODULE_NAME = "categories-tab";
	const FILE_NAME = "cat.json";
	const DEFAULTS = {
		order: ["f92921c5"],
		items: {
			f92921c5: {
				label: "Shopping",
				icon: "fas:f291",
				color: "#479eeb",
			}
		}
	};
	/** @type {Object<IdString, Category>} */
	let data = {};
	/** @type {Array<IdString>} */
	let order = [];
	let elements = document.getElementById(MODULE_NAME).getNamedChildren();
	let tabMode = new ModuleModeHandler(elements.get(),
		/*getData*/() => { return { items: data, order: order }; },
		/*revertData*/(revertData) => { data = revertData.items; order = revertData.order; });

	new Sortable(elements.get("content"), {
		draggable: ".item",
		handle: ".dragger-ns",
		dataIdAttr: "data-id",
		animation: 350,
		group: "nested",
		fallbackOnBody: true,
		swapThreshold: 0.65,
		onEnd: onSortEnd
	});

	elements.get("edit-button").onclick = () => tabMode.set(CategoriesTabMode.EDIT);
	elements.get("apply-edits-button").onclick = () => applyEdits();
	elements.get("cancel-edits-button").onclick = () => { tabMode.set(CategoriesTabMode.DEFAULT); renderList(); };
	elements.get("search-button").onclick = () => tabMode.set(CategoriesTabMode.SEARCH);
	elements.get("cancel-search-button").onclick = () => tabMode.set(CategoriesTabMode.DEFAULT);
	elements.get("add-button").onclick = () => promptEditor();

	/**
	 * Loads _categories_ from cache or remote file (if modified).
	 * @async
	 * @returns {Promise<void>} Promise
	 */
	function fetchData ()
	{
		return new Promise((resolve) => 
		{
			myx.loadFile(FILE_NAME, DEFAULTS, (obj) =>
			{
				data = obj.items;
				order = obj.order;
			}).then(resolve);
		});
	}

	/**
	 * Provides the color code of a category.
	 * @param {IdString} id Category id
	 * @returns {String} RGB color code of the category
	 */
	function getColor (id)
	{
		return data[id].color || data[data[id].masterCategory].color;
	}

	/**
	 * Provides the label of a category.
	 * "Fully qualified" means that sub-categoies will be prefixed by their master category name.
	 * @param {IdString} id Category id
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
	 * @param {IdString} masterCategoryId Id of the master category
	 * @returns {Array<IdString>} Sub-category ids; empty array if there aren't any
	 */
	function getSubCategories (masterCategoryId)
	{
		return data[masterCategoryId].subCategories || [];
	}

	/**
	 * Provides a HTML element with the icon of a category.
	 * @param {IdString} id Category id
	 * @returns {HTMLDivElement} HTML element with the category icon
	 */
	function renderIcon (id)
	{
		let icon = myx.getIconAttributes(data[id].icon || data[data[id].masterCategory].icon);
		let color = getColor(id);
		let style = "background-color:" + color;
		return htmlBuilder.newElement("div.cat.icon",
			{ style: style },
			htmlBuilder.newElement("i." + icon.faScope, icon.htmlEntity));
	}

	/**
	 * Puts a list of all categories to the "content"-element.
	 * Item elements will contain all functionality for all modes.
	 * @param {String} [mode] Mode to set for the list; default is the current mode
	 */
	function renderList (mode = tabMode.get())
	{
		htmlBuilder.removeAllChildren(elements.get("content"));
		for (let id of order)
		{
			let category = data[id];
			let labelElement = htmlBuilder.newElement("div.flex-fill",
				htmlBuilder.newElement("span.big.click", category.label,
					{ 'data-key': id, onclick: onItemClick },
					htmlBuilder.newElement("span.for-mode.search-mode.fas",
						{ style: "color:" + getColor(id), 'data-key': id, onclick: onSearchAllClick },
						fa.space + fa.asterisk)));
			let subCatDiv = htmlBuilder.newElement("div.subcats");
			for (let key of category.subCategories || [])
			{
				subCatDiv.appendChild(htmlBuilder.newElement("div.subcat",
					renderIcon(key),
					htmlBuilder.newElement("span.grey.click",
						{ 'data-key': key, 'data-master-key': id, onclick: onItemClick },
						data[key].label),
					htmlBuilder.newElement("div.for-mode.edit-mode.dragger-ew.fas", fa.sort)
				));
			}
			subCatDiv.appendChild(htmlBuilder.newElement("div.subcat",
				htmlBuilder.newElement("div.for-mode.edit-mode.no-sort.fas", fa.plus_square, { 'data-master-key': id, onclick: onItemClick })));
			labelElement.appendChild(subCatDiv);
			let div = htmlBuilder.newElement("div.item",
				renderIcon(id),
				labelElement,
				htmlBuilder.newElement("i.for-mode.edit-mode.dragger-ns.fas", fa.sort)
			);
			new Sortable(subCatDiv, {
				group: "nested",
				filter: ".no-sort",
				handle: ".dragger-ew",
				animation: 150,
				fallbackOnBody: true,
				swapThreshold: 0.65,
				onEnd: onSortEnd
			});
			elements.get("content").appendChild(div);
		}
		tabMode.set(mode);
	}

	/**
	 * Opens the IconEditor for modifing a category or creating a new one.
	 * Changes are not saved until `applyEdits()` is called!
	 * @param {IdString} [id] Id of category to edit; if empty, a new category will be created
	 * @param {IdString} [masterId] Id of the categorys master category (if it's a subcategory)
	 */
	function promptEditor (id, masterId)
	{
		let creatingNewItem = !(!!id);
		tabMode.set(CategoriesTabMode.EDIT);
		let itemToEdit = {
			label: (creatingNewItem) ? "New category" : getLabel(id, false),
			glyph: new FAGlyph(data[id]?.icon || "fas:f07a"),
			color: ((!!id) || (!!masterId)) ? getColor(id || masterId) : "#808080"
		};
		iconEditor.popup(itemToEdit,
			{
				iconType: EditableIconType.WHITE_ON_COLOR,
				title: (creatingNewItem) ? "New category" : "Edit category",
				headline: (!!masterId) ? "Subcategory of " + data[masterId].label : "",
				defaultLabel: "New category",
				canColor: !(!!masterId)
			}, (editedObj) =>
		{
			if (creatingNewItem)
			{
				id = myx.newId();
				data[id] = Object.assign({}, editedObj);
				if (masterId)
				{
					data[masterId].subCategories ||= [];
					data[masterId].subCategories.push(id);
				}
				else
				{
					order.push(id);
				}
			}
			else
			{
				data[id].label = editedObj.label;
			}
			data[id].icon = editedObj.glyph.value;
			delete data[id].glyph;
			if (!!masterId)
			{
				data[id].masterCategory = masterId;
				delete data[id].color;
			}
			renderList();
			elements.get("content").querySelector("[data-key='" + id + "']").scrollIntoView();
		});
	}

	/**
	 * Saves changes to file and returns to "default" mode.
	 * @async
	 */
	async function applyEdits ()
	{
		tabMode.set(CategoriesTabMode.SAVING); // intermediate state 'cause going from "edit" to "default" mode triggers a data rollback
		myx.xhrBegin();
		googleAppApi.saveToFile(FILE_NAME, {
			order: order,
			items: data
		}).then(myx.xhrSuccess, myx.xhrError);
		tabMode.set(CategoriesTabMode.DEFAULT);
	}

	/**
	 * Handles end of sorting.
	 */
	function onSortEnd ()
	{
		order = [];
		for (let masterElement of elements.get("content").children)
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
		switch (tabMode.get())
		{
			case "default":
				myx.addExpense({ cat: id });
				break;
			case "edit":
				promptEditor(id, mouseEvent.target.dataset.masterKey);
				break;
			case "search":
				myx.setExpenseFilter({ cat: id }, MODULE_NAME);
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
		myx.setExpenseFilter({ cats: [id].concat(getSubCategories(id)) }, MODULE_NAME);
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		get data () { return data; }, // debug_only
		fetchData: fetchData,
		enter: () => renderList(CategoriesTabMode.DEFAULT),
		leave: () => tabMode.set(CategoriesTabMode.DEFAULT),
		get masterCategoryIds () { return order; },
		getLabel: getLabel,
		getColor: getColor,
		getSubCategories: getSubCategories,
		renderIcon: renderIcon
	};
};
