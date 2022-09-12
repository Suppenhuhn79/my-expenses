/**
 * A payment method.
 * @augments UserDataItem
 */
class PaymentMethod extends UserDataItem
{
	static DEFAULT_LABEL = "New payment method";
	static DEFAULT_GLYPH = "fas:f555";

	/**
	 * @param {PaymentMethod|EditableIcon} [src] Payment method to copy; if omitted, a new payment method is created
	 * @param {IdString} [id] Id of the src payment method if it is an `EditableIcon`
	 */
	constructor(src, id)
	{
		super(src, id);

		/**
		 * Whether this payment method is disabled (`true`) or active (`false`).
		 * @type {Boolean}
		 */
		this.isDisabled = false;
	}

	/**
	 * Returns a HTML element that shows this payment methods icon.
	 * @returns {HTMLElement}
	 */
	renderIcon ()
	{
		return htmlBuilder.newElement("div.pmt.icon", { style: "color:" + this.color }, this.glyph.render());
	};

	/**
	 * Returns a simplified payment method object for serialisation.
	 * @returns {Object} Simplified payment method object for serialisation
	 */
	toJSON ()
	{
		return {
			label: this.label,
			icon: this.glyph.value,
			color: this.color
		};
	};
}

/**
 * Selector for payment methods.
 * @augments Selector
 */
class PaymentMethodSelector extends Selector
{
	/**
	 * @param {SelectorCallback} callback Function to call on selection
	 * @param {SelectorOptions} options Configuration of the payment method selector
	 * @param {Boolean} activeOnly Provide only active payment methods for selection (`true`) or also include disabled payment methods (`false`)
	 */
	constructor(callback, options, activeOnly)
	{
		let items = (activeOnly) ? myx.paymentMethods.active : myx.paymentMethods.all;
		super(callback, items, options);
	}
};

const PaymentMethodTabMode = {
	DEFAULT: "default",
	EDIT: "edit",
	SEARCH: "search",
	SAVING: "__saving__"
};

/**
 * my-expenses "payment methods" module.
 * @namespace
 */
function myxPaymentMethods ()
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
	/** @type {Map<IdString, PaymentMethod>} */
	let data = new Map();
	/** @type {Array<IdString>} */
	let order = [];
	/** @type {Array<IdString>} */
	let disabledIds = [];
	/** @type {IdString} */
	let defaultId;
	let elements = document.getElementById(MODULE_NAME).getNamedChildren();

	let sortable = new Sortable(elements.get("content"), {
		draggable: ".sortable",
		handle: ".dragger-ns",
		dataIdAttr: "data-id",
		animation: 350,
		onEnd: () => { order = sortable.toArray(); }
	});

	let tabMode = new TabModeHandler(elements.get(),
		function stashData () { return { items: JSON.stringify([...data]), order: order, disabled: disabledIds, default: defaultId }; },
		function revertData (revertData) { revertData.items = Object.fromEntries(JSON.parse(revertData.items)); fromObject(revertData); }
	);

	elements.get("edit-button").onclick = function onEditButtonClick () { tabMode.set(PaymentMethodTabMode.EDIT); };
	elements.get("apply-edits-button").onclick = function onApplyEditsButtonClick () { saveToFile(); };
	elements.get("cancel-edits-button").onclick = function onCancelEditsButtonClick () { { tabMode.set(PaymentMethodTabMode.DEFAULT); renderList(); }; };
	elements.get("search-button").onclick = function onSearchButtonClick () { tabMode.set(PaymentMethodTabMode.SEARCH); };
	elements.get("cancel-search-button").onclick = function onCancelSearchButtonClick () { tabMode.set(PaymentMethodTabMode.DEFAULT); };
	elements.get("add-button").onclick = function onAddButtonClick () { promptEditor(); };

	/**
	 * Loads _payment methods_ from cache or remote file (if modified).
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
	 * Converts a generic object into payment method data.
	 * @param {Object} obj Generic object that contains payment method data
	 */
	function fromObject (obj)
	{
		data.clear();
		order = obj.order;
		disabledIds = obj.disabled || [];
		for (let itemKey of Object.keys(obj.items))
		{
			data.set(itemKey, new PaymentMethod(obj.items[itemKey], itemKey));
			if (disabledIds.includes(itemKey))
			{
				data.get(itemKey).isDisabled = true;
			}
		}
		defaultId = obj.default || Object.keys(obj.items)[0];
	}

	/**
	 * Returns an ordered array of payment methods.
	 * @param {Boolean} includeDisabled Whether to include disabled payment methods into the result (`true`) or get only active payment methods (`false`)
	 * @returns {Array<PaymentMethod>} ordered array of payment methods
	 */
	function getOrderedPaymentMethods (includeDisabled)
	{
		/** @type {Array<PaymentMethod>} */
		let result = [];
		let set = order;
		if (includeDisabled)
		{
			set = set.concat(disabledIds);
		}
		for (let id of set)
		{
			result.push(data.get(id));
		}
		return result;
	}
	/**
	 * Pops up a menu to prompt for a payment method.
	 * @param {HTMLElement} alignElement Element to align the menu to
	 * @param {SelectorCallback} callback Function to call on selection
	 */
	function prompt (alignElement, callback)
	{
		let menuItems = [];
		for (let id of order)
		{
			menuItems.push({
				key: id,
				label: data.get(id).label,
				iconHtml: data.get(id).renderIcon()
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
	 * Puts a list of all payment methods to the "content"-element.
	 * Item elements will contain all functionality for all modes.
	 * @param {PaymentMethodTabMode} [mode] Mode to set for the list; default is the current mode
	 */
	function renderList (mode = tabMode.get())
	{
		/**
		 * Actually does render the list items.
		 * @param {Array<IdString>} pmtIds Array that hold the pmt-ids to render
		 * @param {Boolean} active Whether this are active or disabled. Affects the items capatibilities
		 */
		function _renderList (pmtIds, active)
		{
			for (let id of pmtIds)
			{
				let pmt = data.get(id);
				/**
				 * Optional item elements regarding whether the active or the disabled list is rendered.
				 * @type {Array<HTMLElement>} */
				let optionalElmts = [];
				if (active)
				{
					optionalElmts = [
						htmlBuilder.newElement("i.for-mode.default-mode.default-flag.fas", (defaultId === id) ? FA.toHTML("star") : ""),
						htmlBuilder.newElement("i.for-mode.edit-mode.hover.default-flag.far", FA.toHTML("star"), { onclick: onSetDefaultClick }),
						htmlBuilder.newElement("i.for-mode.edit-mode.dragger-ns.fas", FA.toHTML("sort"))
					];
				}
				else
				{
					optionalElmts = [
						htmlBuilder.newElement("i.hover.for-mode.edit-mode.fas", FA.toHTML("trash-restore-alt"), { onclick: onUntrashClick })
					];
				}
				let div = htmlBuilder.newElement("div.click.item" + ((active) ? ".sortable" : ""),
					{ "data-id": id },
					pmt.renderIcon(), // TODO: replace by `renderLabeledIcon()`?
					htmlBuilder.newElement("div.flex-fill.big.cutoff", pmt.label, { onclick: onItemClick }),
					...optionalElmts
				);
				elements.get("content").appendChild(div);
			}
		}
		htmlBuilder.removeAllChildren(elements.get("content"));
		_renderList(order, true);
		if (disabledIds.length > 0)
		{
			elements.get("content").appendChild(htmlBuilder.newElement("div.headline", "Disabled payment methods"));
			_renderList(disabledIds, false);
		}
		FA.applyOn(elements.get("content"));
		for (let e of elements.get("content").querySelectorAll("[data-id='" + defaultId + "'] .default-flag"))
		{
			e.classList.add("selected");
		}
		tabMode.set(mode);
	}

	/**
	 * Opens the IconEditor for modifing a payment method or creating a new one.
	 * Changes are not saved until `applyEdits()` is called!
	 * @param {IdString} [id] Id of payment method to edit; if empty, a new payment method will be created
	 */
	function promptEditor (id)
	{
		let creatingNewItem = !(!!id);
		let itemToEdit = new EditableIcon(data.get(id) || new PaymentMethod());
		tabMode.set(PaymentMethodTabMode.EDIT);
		iconEditor.popup(itemToEdit,
			{
				iconType: EditableIconType.COLOR_ON_WHITE,
				iconClass: "paymentmethod",
				title: (creatingNewItem) ? "New payment method" : "Edit payment method",
				defaultLabel: PaymentMethod.DEFAULT_LABEL,
				context: id,
				deleteHandler: (creatingNewItem) ? null : onTrashClick
			},
			function editorCallback (editedObj)
			{
				if (creatingNewItem)
				{
					id = myx.newId();
					let newPmt = new PaymentMethod(editedObj, id);
					data.set(id, newPmt);
					order.push(id);
				}
				else
				{
					data.get(id).assign(editedObj);
				}
				renderList();
				elements.get("content").querySelector("[data-id='" + id + "']").scrollIntoView();
			}
		);
	}

	/**
	 * Saves changes to file and returns to "default" mode.
	 * @async
	 */
	async function saveToFile ()
	{
		tabMode.set(PaymentMethodTabMode.SAVING); // intermediate state 'cause going from "edit" to "default" mode triggers a data rollback
		myx.xhrBegin();
		googleAppApi.saveToFile(FILE_NAME, {
			order: order,
			items: Object.fromEntries(data),
			disabled: disabledIds,
			default: defaultId
		}).then(myx.xhrSuccess, myx.xhrError);
		tabMode.set(PaymentMethodTabMode.DEFAULT);
	}

	/**
	 * Event handler for clicking on items in the list depending on the current mode:
	 * - "edit": pops up the IconEditor to edit the payment method.
	 * - "search": sets the expenses filter to the payment method and switches to the expenses module
	 * @param {MouseEvent} mouseEvent Triggering event
	 */
	function onItemClick (mouseEvent)
	{
		let id = mouseEvent.target.closest("div.item").dataset.id;
		switch (tabMode.get())
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

	/**
	 * Event handler for clicking the "set as default" star in edit mode.
	 * Sets the selected payment method as default.
	 * @param {Event} event Triggering event
	 */
	function onSetDefaultClick (event)
	{
		defaultId = event.target.closest("div.item").dataset.id;
		renderList();
	}

	/**
	 * Event handler for clicking the "trash" button in the icon editor.
	 * Puts the item at the top of the disabled items.
	 * @param {Event} [event] Triggering event; not used, but required by interface
	 * @param {IdString} pmtId Id of the affected payment method
	 */
	function onTrashClick (event, pmtId)
	{
		if (order.length > 1)
		{
			order.splice(order.indexOf(pmtId), 1);
			disabledIds.splice(0, 0, pmtId);
			data.get(pmtId).isDisabled = true;
			if (defaultId === pmtId)
			{
				defaultId = order[0];
			}
		}
		renderList();
	}

	/**
	 * Event handler for clicking the "untrash" icon on a disabled item.
	 * Puts the item at the end of active payment methods.
	 * @param {Event} event Triggering event
	 */
	function onUntrashClick (event)
	{
		let pmtId = event.target.closest("div.item").dataset.id;
		disabledIds.splice(disabledIds.indexOf(pmtId), 1);
		data.get(pmtId).isDisabled = false;
		order.push(pmtId);
		renderList();
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		get data () { return data; },
		/**
		 * Ordered array of all payment methods.
		 */
		get all () { return getOrderedPaymentMethods(true); },
		/**
		 * Ordered array of all active payment methods (excluding disabled payment methods).
		 */
		get active () { return getOrderedPaymentMethods(false); },
		fetchData: fetchData,
		enter: () => renderList(PaymentMethodTabMode.DEFAULT),
		leave: () => tabMode.set(PaymentMethodTabMode.DEFAULT),
		get default () { return defaultId; },
		/** @param {IdString} id */
		get: (id) => { return data.get(id); },
		prompt: prompt
	};

};
