const CategoriesTabMode = {
	DEFAULT: "default",
	EDIT: "edit",
	SEARCH: "search",
	SAVING: "__saving__"
};

/**
 * An expenses category.
 * @augments UserDataItem
 */
class Category extends UserDataItem
{
	static DEFAULT_LABEL = "New category";
	static DEFAULT_GLYPH = "fas:f07a";

	/**
	 * @param {Category|EditableIcon} [src] Category to copy; if omitted, a new category is created.
	 * @param {IdString} [id] Id of the src category if it is an `EditableIcon`.
	 */
	constructor(src, id)
	{
		super(src, id);

		/** 
		 * @private Use `color` getter instead.
		 * @type {string?} */
		this._color = src?.color || "#808080";

		/** @type {Category?} */
		this.master = undefined;

		/** @type {Array<Category>?} */
		this.subCategories = [];
	}

	/**
	 * Provides the color of the category.
	 * 
	 * Only master categories do have own colors. Sub-categories inherit their masters color.
	 * @returns {string} This categorys color.
	 */
	get color ()
	{
		return (this.isMaster) ? this._color : this.master.color;
	}

	/**
	 * Sets this categorys color, if it is a master category.
	 */
	set color (val)
	{
		if (this.isMaster)
		{
			this._color = val;
		}
	}

	/**
	 * Gives the full qualified label of this category.
	 * 
	 * If this is a sub-categoy, the label will be prefixed with the master categorys name.
	 * 
	 * @returns {string} Full qualified label of this category.
	 */
	get fullQualifiedLabel ()
	{
		let result = this.label;
		if (this.isMaster === false)
		{
			result = this.master.label + "/" + result;
		}
		return result;
	}

	/**
	 * Tells if this is a master category or not.
	 * 
	 * `true` if this is a master category, `false` if this is a sub-category.
	 * 
	 * @returns {boolean} Whether this is a master category or not.
	 */
	get isMaster ()
	{
		return ((this.master instanceof Category) === false);
	}

	/**
	 * Ordered array of this categorys sub-category ids.
	 * @returns {Array<IdString>} Ids of this categorys sub-categories.
	 */
	get subCategoriesIds ()
	{
		/** @type {Array<IdString>} */
		let result = [];
		for (let subCategory of this.subCategories)
		{
			result.push(subCategory.id);
		}
		return result;
	}

	/**
	 * Adds a category a this categorys sub-category.
	 * @param {Category} cat Category to add as this sub-category.
	 */
	addSubCategory (cat)
	{
		cat.master = this;
		cat._color = undefined; // sub-categories do not have own colors but inherit their masters color
		this.subCategories ||= [];
		this.subCategories.push(cat);
	}

	/**
	 * Provides a HTML `<div>` element that shows this categorys icon.
	 * @returns {HTMLElement} HTML element that shows this categorys icon.
	 */
	renderIcon ()
	{
		return htmlBuilder.newElement("div.cat.icon", { style: "background-color:" + this.color }, this.glyph.render());
	}

	/**
	 * Returns a simplified category object for serialisation.
	 * @returns {Object} Simplified category object for serialisation.
	 */
	toJSON ()
	{
		let result = {
			label: this.label,
			icon: this.glyph.value
		};
		if (this.isMaster)
		{
			result.color = this._color;
			if ((this.subCategories instanceof Array) && (this.subCategories.length > 0))
			{
				result.subCategories = [];
				for (let sub of this.subCategories)
				{
					result.subCategories.push(sub.id);
				}
			}
		}
		else
		{
			result.masterCategory = this.master.id;
		}
		return result;
	};
}

/**
 * Selector for categories.
 * @augments Selector
 */
class CategorySelector extends Selector
{
	/**
	 * Converts a `Category` array to a `SelectableIcon` array that can be used as a selectors `item` set.
	 * @param {Array<Category>} categories Categories to be converted.
	 * @returns {Array<SelectableIcon>} Aray of selectable icons.
	 */
	static itemsFromCategories (categories)
	{
		/** @type {Array<SelectableIcon>} */
		let result = [];
		for (let item of categories)
		{
			result.push({
				id: item.id,
				color: item.color,
				element: item.renderLabeledIcon()
			});
		}
		return result;
	}


	/**
	 * @param {SelectorCallback} callback Callback on item selection.
	 * @param {SelectorOptions} options Configuration of the payment method selector.
	 */
	constructor(callback, options)
	{
		super(callback, CategorySelector.itemsFromCategories(myx.categories.masters), options);

		/** @type {CategorySelector} */
		let _this = this; // Must be accessed after calling `super()`

		/**
		 * Event handler for clicking an item.
		 * 
		 * Overloads the parent method to handle switching between master and sub-categories.
		 *
		 * Calls the `callback` function.
		 *
		 * @param {Event} event Triggering event.
		 */
		this._onItemClick = function (event)
		{
			/**
			 * Actual item.
			 * @type {HTMLElement} */
			let eventItem = event.target.closest("[data-id]");
			/**
			 * Id of the clicked items.
			 * @type {string} */
			let id = eventItem.dataset.id;
			eventItem.scrollIntoView();
			if (id === "__back__")
			{
				_this.items = CategorySelector.itemsFromCategories(myx.categories.masters);
				_this.refresh();
			}
			else if (myx.categories.get(id).isMaster)
			{
				if ((_this.multiSelect !== true) || (_this.element.querySelector(".back") === null))
				{
					_this.refresh(id);
				}
			}
			if (_this.multiSelect === true)
			{
				// TODO: aint enough setting the class, because we can not get all selected items from the existing elements, but must have a set in this class
				eventItem.classList.toggle("selected");
			}
			else
			{
				_this.highlightItem(id, false);
			}
			_this.callback(id);
		};
	};

	/**
	 * Renders the items as _labled icons_ on this selectors element.
	 * @param {IdString} [selectedId] Id of the pre-selected item; no selection if omitted.
	 */
	refresh (selectedId)
	{
		if (!!selectedId)
		{
			let masterOfSelected = (myx.categories.get(selectedId).isMaster) ? myx.categories.get(selectedId) : myx.categories.get(selectedId).master;
			this.items = CategorySelector.itemsFromCategories([masterOfSelected].concat(masterOfSelected.subCategories));
			this.refresh();
			this.element.insertBefore(htmlBuilder.newElement("div.item.labeled-icon",
				{ 'data-id': "__back__", onclick: this._onItemClick },
				htmlBuilder.newElement("i.icon.back.fas", FA.toHTML("arrow-left"))
			), this.element.firstElementChild);
			if (this.multiSelect !== true)
			{
				super.highlightItem(selectedId, true);
			}
		}
		else
		{
			super.refresh(selectedId);
		}
	}
}

/**
 * my-expenses "categories" module.
 */
function myxCategories ()
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

	/** @type {Map<IdString, Category>} */
	let data = new Map();

	/** @type {Array<IdString>} */
	let order = [];
	let elements = document.getElementById(MODULE_NAME).getNamedChildren();
	let tabMode = new TabModeHandler(elements.get(),
		function stashData () { return { items: JSON.stringify([...data]), order: order }; },
		function revertData (revertData) { revertData.items = Object.fromEntries(JSON.parse(revertData.items)); fromObject(revertData); }
	);

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

	elements.get("edit-button").onclick = function onEditButtonClick () { tabMode.set(CategoriesTabMode.EDIT); };
	elements.get("apply-edits-button").onclick = saveToFile;
	elements.get("cancel-edits-button").onclick = function onCancelButtonClick () { tabMode.set(CategoriesTabMode.DEFAULT); renderList(); };
	elements.get("search-button").onclick = function onSearchButtonClick () { tabMode.set(CategoriesTabMode.SEARCH); };
	elements.get("cancel-search-button").onclick = function onCancelSeachButtonClick () { tabMode.set(CategoriesTabMode.DEFAULT); };
	elements.get("add-button").onclick = function onAddButtonClick () { promptEditor(); };

	/**
	 * Loads _categories_ from cache or remote file (if modified).
	 * @async
	 * @returns {Promise<void>} Void promise.
	 */
	function fetchData ()
	{
		return new Promise((resolve) => 
		{
			myx.loadFile(FILE_NAME, DEFAULTS, (obj) =>
			{
				fromObject(obj);
			}).then(resolve);
		});
	}

	/**
	 * Converts a generic object into categories data.
	 * @param {Object} obj Generic object that has categories properties.
	 */
	function fromObject (obj)
	{
		data.clear();
		for (let itemKey of Object.keys(obj.items))
		{
			data.set(itemKey, new Category(obj.items[itemKey], itemKey));
		}
		for (let masterId of obj.order)
		{
			for (let sub of obj.items[masterId].subCategories || [])
			{
				data.get(masterId).addSubCategory(data.get(sub));
			}
		}
		order = obj.order;
	}

	/**
	 * Puts a list of all categories to the "content"-element.
	 * 
	 * Item elements will contain all functionality for all modes.
	 * 
	 * @param {string} [mode] Mode to set for the list; remains at current mode if omitted.
	 */
	function renderList (mode = tabMode.get())
	{
		htmlBuilder.removeAllChildren(elements.get("content"));
		for (let id of order)
		{
			let category = data.get(id);
			let labelElement = htmlBuilder.newElement("div.flex-fill.click",
				{ 'data-id': id, onclick: onItemClick },
				htmlBuilder.newElement("span.big", category.label,
					htmlBuilder.newElement("span.for-mode.search-mode.fas",
						{ style: "color:" + category.color, onclick: onSearchAllClick },
						"\u00a0" + FA.toHTML("asterisk"))));
			let subCatDiv = htmlBuilder.newElement("div.subcats");
			for (let subCategory of category.subCategories || [])
			{
				subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.click",
					{ 'data-id': subCategory.id, 'data-master-id': id, onclick: onItemClick },
					subCategory.renderIcon(),
					htmlBuilder.newElement("span.grey", subCategory.label),
					htmlBuilder.newElement("div.for-mode.edit-mode.dragger-ew.fas", FA.toHTML("sort"))
				));
			}
			subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.for-mode.edit-mode.hover.fas",
				{ onclick: onAddSubCategoryClick },
				FA.toHTML("plus-square")));
			labelElement.appendChild(subCatDiv);
			let div = htmlBuilder.newElement("div.item",
				category.renderIcon(),
				labelElement,
				htmlBuilder.newElement("i.for-mode.edit-mode.dragger-ns.fas", FA.toHTML("sort"))
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
	 * 
	 * Changes are not saved until `saveToFile()` is called!
	 * 
	 * @param {IdString} [id] Id of category to edit; if empty, a new category will be created.
	 * @param {IdString} [masterId] Id of the categorys master category (if it's a sub-category).
	 */
	function promptEditor (id, masterId)
	{
		let creatingNewItem = !(!!id);
		let itemToEdit = new EditableIcon(data.get(id) || new Category());
		if ((creatingNewItem) && (masterId))
		{
			itemToEdit.color = data.get(masterId).color;
		}
		tabMode.set(CategoriesTabMode.EDIT);
		iconEditor.popup(itemToEdit,
			{
				iconType: IconStyle.WHITE_ON_COLOR,
				title: (creatingNewItem) ? "New category" : "Edit category",
				headline: (!!masterId) ? "Subcategory of " + data.get(masterId).label : "",
				defaultLabel: Category.DEFAULT_LABEL,
				canColor: !(!!masterId)
			}, function editorCallback (editedObj)
		{
			if (creatingNewItem)
			{
				id = newId();
				let newCategory = new Category(editedObj, id);
				data.set(id, newCategory);
				if (masterId)
				{
					data.get(masterId).addSubCategory(newCategory);
				}
				else
				{
					order.push(id);
				}
			}
			else
			{
				data.get(id).assign(editedObj);
			}
			renderList();
			if ((creatingNewItem) && (!(!!masterId)))
			{
				elements.get("content").querySelector("[data-id='" + id + "']").scrollIntoView({ block: "center" });
			}
		});
	}

	/**
	 * Saves changes to file and returns to "default" mode.
	 * @async
	 */
	async function saveToFile ()
	{
		tabMode.set(CategoriesTabMode.SAVING); // intermediate state 'cause going from "edit" to "default" mode triggers a data rollback
		myx.xhrBegin();
		googleAppApi.saveToFile(FILE_NAME, {
			order: order,
			items: Object.fromEntries(data),
		}).then(myx.xhrSuccess, myx.xhrError);
		tabMode.set(CategoriesTabMode.DEFAULT);
	}

	/**
	 * Returns an ordered array of all master categories.
	 * @returns {Array<Category>} All master categories.
	 */
	function getMasters ()
	{
		/** @type {Array<Category>} */
		let result = [];
		for (let masterId of order)
		{
			result.push(data.get(masterId));
		}
		return result;
	}

	/**
	 * Handles end of sorting.
	 */
	function onSortEnd ()
	{
		order = [];
		for (let listElement of elements.get("content").children)
		{
			let masterCategory = data.get(listElement.dataset.id || listElement.querySelector("[data-id]").dataset.id);
			if (masterCategory.isMaster === false) // former sub-category became a master
			{
				masterCategory._color = masterCategory.master.color;
				masterCategory.master = undefined;
			}
			masterCategory.subCategories = [];
			for (let subElement of listElement.querySelectorAll(".subcats [data-id]"))
			{
				masterCategory.addSubCategory(data.get(subElement.dataset.id));
			}
			order.push(masterCategory.id);
		}
		renderList();
	}

	/**
	 * Handles clicks on items in the list depending on the current mode:
	 * - "default": pops up the "add expense" page
	 * - "edit": pops up the IconEditor to edit the payment method
	 * - "search": sets the expenses filter to the category and switches to expenses
	 * @param {MouseEvent} event Triggering event.
	 */
	function onItemClick (event)
	{
		let id = event.target.closest("[data-id]").dataset.id;
		event.stopPropagation();
		switch (tabMode.get())
		{
			case "default":
				myx.addExpense({ cat: id });
				break;
			case "edit":
				promptEditor(id, event.target.closest("[data-master-id]")?.dataset.masterId);
				break;
			case "search":
				myx.setExpenseFilter({ cat: id }, MODULE_NAME);
				break;
			default:
		}
	}

	/**
	 * Event handler for clicking the "add" icon in a categorys sub-catergory list.
	 * 
	 * Pops up the editor to add a nwe sub-category.
	 * 
	 * @param {MouseEvent} event Triggering event.
	 */
	function onAddSubCategoryClick (event)
	{
		event.stopPropagation();
		promptEditor(null, event.target.closest("[data-id]").dataset.id);
	}

	/**
	 * Handles clicks on master categoris asterisk in "search" mode.
	 * 
	 * Sets expenses filter to the master category and all sub-categories and switches to expenses tab.
	 * 
	 * @param {MouseEvent} event Triggering event
	 */
	function onSearchAllClick (event)
	{
		event.stopPropagation();
		let id = event.target.closest("[data-id]").dataset.id;
		myx.setExpenseFilter({ cats: [id].concat(data.get(id).subCategoriesIds) }, MODULE_NAME);
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		get data () { return data; },
		fetchData: fetchData,
		enter: () => renderList(CategoriesTabMode.DEFAULT),
		leave: () => tabMode.set(CategoriesTabMode.DEFAULT),
		/** @param {IdString} id */
		get: (id) => { return data.get(id); },
		/**
		 * Ordered array of all master categories.
		 */
		get masters () { return getMasters(); }
	};
};
