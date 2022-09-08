/**
 * Payment method.
 */
class PaymentMethod
{
	static DEFAULT_LABEL = "Unnamed payment method";

	/**
	 * @param {PaymentMethod|EditableIcon} [src] Payment method to copy; if omitted, a new payment method is created
	 * @param {IdString} [id] Id of the src payment method if it is an `EditableIcon`
	 */
	constructor(src, id)
	{
		/**
		 * @type {IdString}
		 */
		this.id = src?.id || ((!!id) ? id : myx.newId());

		/**
		 * @type {String}
		 */
		this.label = src?.label || PaymentMethod.DEFAULT_LABEL;

		/**
		 * @type {FAGlyph}
		 */
		this.glyph = new FAGlyph((src?.glyph instanceof FAGlyph) ? src.glyph.value : (src?.glyph || src?.icon || "fas:f555"));

		/**
		 * @type {String}
		 */
		this.color = src?.color || "#808080";
	}

	/**
	 * Assigns properties from an editable icon to this payment method.
	 * @param {EditableIcon} icon Editable icon to assign
	 */
	assign (icon)
	{
		this.label = icon.label;
		this.glyph = icon.glyph;
		this.color = icon.color;
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
	let disabledItems = [];
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
		function stashData () { return { items: JSON.stringify([...data]), order: order, disabled: disabledItems, default: defaultId }; },
		function revertData (revertData) { revertData.items = Object.fromEntries(JSON.parse(revertData.items)); fromObject(revertData); }
	);

	elements.get("edit-button").onclick = () => tabMode.set(PaymentMethodTabMode.EDIT);
	elements.get("apply-edits-button").onclick = () => saveToFile();
	elements.get("cancel-edits-button").onclick = () => { tabMode.set(PaymentMethodTabMode.DEFAULT); renderList(); };
	elements.get("search-button").onclick = () => tabMode.set(PaymentMethodTabMode.SEARCH);
	elements.get("cancel-search-button").onclick = () => tabMode.set(PaymentMethodTabMode.DEFAULT);
	elements.get("add-button").onclick = () => promptEditor();

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
		for (let itemKey of Object.keys(obj.items))
		{
			data.set(itemKey, new PaymentMethod(obj.items[itemKey], itemKey));
		}
		order = obj.order;
		disabledItems = obj.disabled || [];
		defaultId = obj.default || Object.keys(obj.items)[0];
	}

	/**
	 * Pops up a menu to prompt for a payment method.
	 * @param {HTMLElement} alignElement Element to align the menu to
	 * @param {PaymentMethodPromptCallback} callback Fcuntion to call on selection
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
					pmt.renderIcon(),
					htmlBuilder.newElement("div.flex-fill.big.cutoff", pmt.label, { onclick: onItemClick }),
					...optionalElmts
				);
				elements.get("content").appendChild(div);
			}
		}
		htmlBuilder.removeAllChildren(elements.get("content"));
		_renderList(order, true);
		if (disabledItems.length > 0)
		{
			elements.get("content").appendChild(htmlBuilder.newElement("div.headline", "Disabled payment methods"));
			_renderList(disabledItems, false);
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
			disabled: disabledItems,
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
	 * @param {IdString} context Id of the affected payment method
	 */
	function onTrashClick (event, context)
	{
		if (order.length > 1)
		{
			order.splice(order.indexOf(context), 1);
			disabledItems.splice(0, 0, context);
			if (defaultId === context)
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
		disabledItems.splice(disabledItems.indexOf(pmtId), 1);
		order.push(pmtId);
		renderList();
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		get data () { return data; }, // debug_only
		fetchData: fetchData,
		enter: () => renderList(PaymentMethodTabMode.DEFAULT),
		leave: () => tabMode.set(PaymentMethodTabMode.DEFAULT),
		/** @type {IdString} */
		get default () { return defaultId; },
		/** @param {IdString} id */
		get: (id) => { return data.get(id); },
		prompt: prompt
	};

};
