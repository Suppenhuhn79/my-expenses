const CategoriesTabMode = {
	DEFAULT: "default",
	EDIT: "edit",
	SEARCH: "search",
	SAVING: "__saving__"
};

class Category
{
	static DEFAULT_LABEL = "Unnamed category";

	/**
	 * @param {Category|EditableIcon} [src] Category to copy; if omitted, a new category is created
	 * @param {IdString} [id] Id of the src category if it is an `EditableIcon`
	 */
	constructor(src, id)
	{
		/** @type {IdString} */
		this.id = src?.id || ((!!id) ? id : myx.newId());

		/** @type {String} */
		this.label = src?.label || Category.DEFAULT_LABEL;

		/** @type {FAGlyph}*/
		this.glyph = new FAGlyph((src?.glyph instanceof FAGlyph) ? src.glyph.value : (src?.glyph || src?.icon || "fas:f07a"));

		/** 
		 * @private Use `color` getter instead.
		 * @type {String?} */
		this._color = src?.color || "#808080";

		/** @type {Category?} */
		this.master = undefined;

		/** @type {Array<Category>?} */
		this.subCategories = [];
	}

	/**
	 * Color of the category. Only master categories do have own colors. Sub-categories inherit their masters color.
	 * @returns {String}
	 */
	get color ()
	{
		return (this.master instanceof Category) ? this.master.color : this._color;
	}

	/**
	 * Full qualified label of this category. If this is a sub-categoy, the label will be prefixed with the master categorys name.
	 */
	get fullQualifiedLabel ()
	{
		let result = this.label;
		if (this.master instanceof Category)
		{
			result = this.master.label + "/" + result;
		}
		return result;
	}

	/**
	 * Returns the ids of this categorys sub-categories.
	 * @returns {Array<IdString>}
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
	 * @param {Category} cat Category to add as this sub-category
	 */
	addSubCategory (cat)
	{
		cat.master = this;
		cat._color = undefined; // sub-categories do not have own colors but inherit their masters color
		this.subCategories ||= [];
		this.subCategories.push(cat);
	}

	/**
	* Assigns properties from an editable icon to this category.
	* @param {EditableIcon} icon Editable icon to assign
	*/
	assign (icon)
	{
		this.label = icon.label;
		this.glyph = icon.glyph;
		this._color = (this.master instanceof Category) ? undefined : icon.color;
	}

	/**
	 * Returns a HTML element that shows this payment methods icon.
	 * @returns {HTMLElement}
	 */
	renderIcon ()
	{
		return htmlBuilder.newElement("div.cat.icon", { style: "background-color:" + this.color }, this.glyph.render());
	}

	/**
	 * Returns a simplified payment method object for serialisation.
	 * @returns {Object} Simplified payment method object for serialisation
	 */
	toJSON ()
	{
		let result = {
			label: this.label,
			icon: this.glyph.value
		};
		if ((this.master instanceof Category) === false)
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
		else if (this.master instanceof Category)
		{
			result.masterCategory = this.master.id;
		}
		return result;
	};
}

/**
 * Puts a category selection element on an existing document node.
 */
class CategorySelector
{
	/**
	 * @param {HTMLElement} element Element to render the selection on
	 * @param {CategorySelectorCallback} callback Callback on category selection
	 * @param {Boolean} [mastersOnly] Set if selection is limited to maste categories only, or if sub-categories can be selected (default)
	 */
	constructor(element, callback, mastersOnly = false)
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
		 * @param {Boolean} [scrollIntoView] Wheter to scroll the selected item into view (`true`) or not (`false`, default)
		 */
		this._highlightSelection = function (id, scrollIntoView)
		{
			for (let otherElement of this.element.querySelectorAll("[data-catid]"))
			{
				otherElement.style.backgroundColor = null;
				otherElement.style.color = null;
			};
			let selectedElement = this.element.querySelector("[data-catid='" + id + "']");
			selectedElement.style.backgroundColor = myx.categories.get(id).color;
			selectedElement.style.color = "#fff";
			if (scrollIntoView)
			{
				selectedElement.scrollIntoView({ inline: "center" });
			}
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
				// if ((_instance.mastersOnly !== true) && (myx.categories.masterCategoryIds.includes(id)))
				if (_instance.mastersOnly !== true)
				{
					_instance.refresh(id);
				}
				else
				{
					_instance._highlightSelection(id);
				}
				_instance.callback(id);
			}
		}

		/**
		 * Renders the category items as _labled icons_ on the given document element.
		 * @param {IdString} [selectedId] Id of the pre-selected category; no selection if omitted
		 */
		this.refresh = function (selectedId)
		{
			htmlBuilder.removeAllChildren(element);
			let catSet = myx.categories.masters;
			if (selectedId)
			{
				let masterCat = myx.categories.get(selectedId).master || myx.categories.get(selectedId);
				catSet = [masterCat].concat(masterCat.subCategories);
			}
			if (selectedId)
			{
				element.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
					htmlBuilder.newElement("div.cat.icon.back.fas",
						{ 'data-catid': "__back__", onclick: _onItemClick },
						fa.toHTML("arrow-left"))));
			}
			for (let cat of catSet)
			{
				element.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
					{ 'data-catid': cat.id, onclick: _onItemClick },
					cat.renderIcon(),
					htmlBuilder.newElement("div.label", cat.label)));
			}
			if (selectedId)
			{
				this._highlightSelection(selectedId, true);
			}
			else
			{
				element.scrollTo({ left: 0 });
			}
		};
	}
};

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
	 * @returns {Promise<void>} Promise
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
	 * @param {Object} obj Generic object that categories method data
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
	 * Item elements will contain all functionality for all modes.
	 * @param {String} [mode] Mode to set for the list; default is the current mode
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
						"\u00a0" + fa.toHTML("asterisk"))));
			let subCatDiv = htmlBuilder.newElement("div.subcats");
			for (let subCategory of category.subCategories || [])
			{
				subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.click",
					{ 'data-id': subCategory.id, 'data-master-id': id, onclick: onItemClick },
					subCategory.renderIcon(),
					htmlBuilder.newElement("span.grey", subCategory.label),
					htmlBuilder.newElement("div.for-mode.edit-mode.dragger-ew.fas", fa.toHTML("sort"))
				));
			}
			subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.for-mode.edit-mode.hover.fas",
				{ onclick: onAddSubCategoryClick },
				fa.toHTML("plus-square")));
			labelElement.appendChild(subCatDiv);
			let div = htmlBuilder.newElement("div.item",
				category.renderIcon(),
				labelElement,
				htmlBuilder.newElement("i.for-mode.edit-mode.dragger-ns.fas", fa.toHTML("sort"))
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
	 * @param {IdString} [masterId] Id of the categorys master category (if it's a sub-category)
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
				iconType: EditableIconType.WHITE_ON_COLOR,
				title: (creatingNewItem) ? "New category" : "Edit category",
				headline: (!!masterId) ? "Subcategory of " + data.get(masterId).label : "",
				defaultLabel: Category.DEFAULT_LABEL,
				canColor: !(!!masterId)
			}, function editorCallback (editedObj)
		{
			if (creatingNewItem)
			{
				id = myx.newId();
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
	 * Returns an array with all master categories.
	 * @returns {Array<Category>}
	 */
	function getMasters ()
	{
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
			if (masterCategory.master instanceof Category) // former sub-category became a master
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
	 * @param {MouseEvent} event Triggering event
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
	 * @param {MouseEvent} event Triggering event
	 */
	function onAddSubCategoryClick (event)
	{
		event.stopPropagation();
		promptEditor(null, event.target.closest("[data-id]").dataset.id);
	}

	/**
	 * Handles clicks on master categoris asterisk in "search" mode.
	 * Sets expenses filter to the master category and all sub-categories and switches to expenses tab.
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
		get data () { return data; }, // debug_only
		fetchData: fetchData,
		enter: () => renderList(CategoriesTabMode.DEFAULT),
		leave: () => tabMode.set(CategoriesTabMode.DEFAULT),
		/** @param {IdString} id */
		get: (id) => { return data.get(id); },
		get masters () { return getMasters(); }
	};
};
