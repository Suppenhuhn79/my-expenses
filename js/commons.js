/**
 * Mode handler for my-expenses tabs.
 * 
 * Preserves data on edits. Updates the UI on switching mode.
 */
class TabModeHandler
{
	/**
	 * Serialized tab data before entering "edit" mode.
	 * @type {String}
	 */
	_dataBeforeEdit;

	/**
	 * @param {HTMLElement} element Element that contains tab items
	 * @param {Function} dataGetter `function(): Object` to get the current tab data before switching to "edit" mode
	 * @param {Function} dataSetter `function(data: Object)` to call to reset modified data when cancelling "edit" mode
	 */
	constructor(element, dataGetter, dataSetter)
	{
		/** @type {String} */
		this.currentMode = "default";

		/** @type {HTMLElement} */
		this.element = element;

		/** @type {Function} */
		this._dataGetter = dataGetter;

		/** @type {Function} */
		this._dataSetter = dataSetter;
	}

	/**
	 * Sets the current mode for the tab. Hides all elements that have the class "for-mode"
	 * but not "\<mode\>-mode".
	 *
	 * If switching from "default" to "edit" mode, a backup of the tab data is taken via the `dataGetter()`.
	 *
	 * If Switching from "edit" to "default" mode (which means the edit mode was cancelled), the tab data
	 * is restored to backup via `dataSetter()`.
	 *
	 * @param {String} newMode New mode to set
	 */
	set (newMode)
	{
		if ((typeof this._dataGetter === "function") && (typeof this._dataSetter === "function"))
		{
			if ((this.currentMode === "default") && (newMode === "edit"))
			{
				// backup data to persistent json string
				this._dataBeforeEdit = JSON.stringify(this._dataGetter());
			}
			else if ((this.currentMode === "edit") && (newMode === "default"))
			{
				// revert data to pre-edit state
				this._dataSetter(JSON.parse(this._dataBeforeEdit));
			}
		}
		this.currentMode = newMode || "default";
		if (newMode.startsWith("__") === false) // a mode with "__" prefix is an intermediate mode and we don't need to update the ui
		{
			let modeCssClass = this.currentMode + "-mode";
			for (let childElement of this.element.querySelectorAll(".for-mode"))
			{
				(childElement.classList.contains(modeCssClass)) ? childElement.classList.remove("hidden") : childElement.classList.add("hidden");
			}
		}
	};

	/**
	 * Checks if the current mode is equal to the check mode.
	 * @param {String} mode Mode to check
	 * @returns {Boolean} `true` if the current mode is the checked mode, otherwise `false`
	 */
	is (mode)
	{
		return (this.currentMode === mode);
	};

	/**
	 * Returns the current mode.
	 * @returns {String} Current mode
	 */
	get ()
	{
		return this.currentMode;
	};
}

/**
 * FontAwesome glyph.
 */
class FAGlyph
{
	/**
	 * @param {String} glyphCode Code of the glyph to be created as combination of a CSS style and unicode codepoint, e.g. `"fas:f100"`
	 */
	constructor(glyphCode)
	{
		this.value = glyphCode;
		this.scope = glyphCode.substring(0, 3);
		this.unicodeCodepoint = glyphCode.substring(4);
		this.htmlEntity = "&#x" + glyphCode.substring(4) + ";";
	}

	/**
	 * Returns the glyph code of this FontAwesome glyph.
	 * @returns {String}
	 */
	valueOf ()
	{
		return this.value;
	};

	/**
	 * Returns an `<i>` element that shows this glyphs image.
	 * @returns {HTMLElement}
	 */
	render ()
	{
		return htmlBuilder.newElement("i." + this.scope, this.htmlEntity);
	};
}

/**
 * fontAwesome glyph codes and functions.
 */
class FA
{
	static ICONS = {
		angle_left: "f104",
		angle_right: "f105",
		angle_up: "f106",
		angle_double_up: "f102",
		arrow_left: "f060",
		asterisk: "f069",
		backspace: "f55a",
		backward: "f04a",
		ban: "f05e",
		bars: "f0c9",
		boxes: "f468",
		calendar: "f133",
		calendar_alt: "f073",
		calendar_day: "f783",
		calculator: "f1ec",
		chart_area: "f1fe",
		chart_bar: "f080",
		chart_line: "f201",
		chart_pie: "f200",
		check: "f00c",
		clone: "f24d",
		cog: "f013",
		divide: "f529",
		filter: "f0b0",
		forward: "f04e",
		home: "f015",
		hourglass_half: "f252",
		infinite: "f534",
		list_ul: "f0ca",
		micoscope: "f610",
		pen: "f304",
		plus: "f067",
		plus_square: "f0fe",
		redo: "f01e",
		search: "f002",
		smiley_meh: "f11a",
		sort: "f0dc",
		space: "00a0",
		star: "f005",
		tag: "f02b",
		tags: "f02c",
		times: "f00d",
		trash_alt: "f2ed",
		trash_restore_alt: "f82a",
		wallet: "f555"
	};

	/**
	 * On the given element, all `<i data-icon="...">` children will receive the desired icon as its content.
	 * @param {HTMLElement} element Element to put FontAwesome glyphs on
	 */
	static applyOn (element)
	{
		for (let e of element.querySelectorAll("i[data-icon]"))
		{
			e.innerHTML = FA.toHTML(e.dataset.icon);
		}
	}

	/**
	 * Returns the HTML entity for a known FontAwesome icon.
	 * @param {String} name Name of desired FontAwesome icon
	 * @returns {String} HTML entity of the requested icon; or icon name if it is not known
	 */
	static toHTML (name)
	{
		name = name.replaceAll(/-/g, "_");
		let result = FA.ICONS[name];
		return (!!result) ? "&#x" + result + ";" : "[" + name + "]";
	}

	constructor()
	{
		if (new.target === FA) throw TypeError("FA is not a constructor");
	}
};

/**
 * Abstract class for selectors.
 * 
 * Provides functionality for rendering and selecting items.
 * 
 * @abstract
 */
class Selector
{
	/**
	 * @param {SelectorCallback} callback Callback on item selection
	 * @param {Boolean} multiSelect Allow seletion multiple items (`true`) or single item selection (`false`)
	 * @param {Map<String, ISelectableIcon>} items Items to be availible for selection in this selector
	 */
	constructor(callback, multiSelect, items)
	{
		if (this.constructor === Selector)
		{
			throw new TypeError("Selector is an abstract class");
		}
		else
		{
			/**
			 * This instance, to have it in event handlers where `this` is `window`.
			 * @type {Selector}
			 */
			let _this = this;

			/**
			 * Callback on item selection
			 * @type {SelectorCallback}
			 */
			this.callback = callback;

			/**
			 * Allow seletion multiple items or single item selection only
			 */
			this.multiSelect = multiSelect;

			/**
			 * Items to be availible for selection in this selector.
			 * @type {Map<IdString, ISelectableIcon>}
			 */
			this.items = items;

			/**
			 * Element to render the selection on
			 * @type {HTMLElement}
			 */
			this.element = htmlBuilder.newElement("div.selector" + ((this.multiSelect) ? ".multiselect" : ""));

			/**
			 * Event handler for clicking an item.
			 *
			 * Calls the `callback` function.
			 *
			 * @param {Event} event Triggering event
			 */
			this._onItemClick = function (event)
			{
				/**
				 * Actual item.
				 * @type {HTMLElement} */
				let eventItem = event.target.closest(".item");
				/**
				 * Id of the clicked items.
				 * @type {String} */
				let id = eventItem.dataset.id;
				if (_this.multiSelect === true)
				{
					eventItem.classList.toggle("selected");
				}
				else
				{
					_this.highlightItem(id);
				}
				eventItem.scrollIntoView();
				_this.callback(id);
			};
		}
	}

	/**
	 * Selects (highlights) a item within the selection.
	 * @param {IdString} id Category id to select
	 * @param {Boolean} [scrollIntoView] Wheter to scroll the selected item into view (`true`) or not (`false`, default)
	 */
	highlightItem (id, scrollIntoView)
	{
		for (let otherElement of this.element.querySelectorAll("[data-id]"))
		{
			otherElement.setStyles({
				backgroundColor: null,
				color: null
			});
			otherElement.querySelector("i").style.color = null;
		};
		let selectedElement = this.element.querySelector("[data-id='" + id + "']");
		if (!!selectedElement)
		{
			selectedElement.setStyles({
				backgroundColor: this.items.get(id).color,
				color: "#fff"
			});
			selectedElement.querySelector("i").style.color = "#fff";
			if (scrollIntoView)
			{
				selectedElement.scrollIntoView({ inline: "center" });
			}
		}
	};

	/**
	 * Renders the items as _labled icons_ on this selectors element.
	 * @param {IdString} [selectedId] Id of the pre-selected item; no selection if omitted
	 */
	refresh (selectedId)
	{
		htmlBuilder.removeAllChildren(this.element);
		for (let item of this.items.values())
		{
			this.element.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
				{ 'data-id': item.id, onclick: this._onItemClick },
				item.renderIcon(),
				htmlBuilder.newElement("div.label", item.label)));
		}
		if (selectedId)
		{
			this.highlightItem(selectedId, true);
		}
		else
		{
			this.element.scrollTo({ left: 0 });
		}
	};

	/**
	 * Sets items as "selected".
	 * @param {Set<IdString>} ids Ids of items to set "selected"
	 */
	select (ids)
	{
		for (let element of this.element.querySelectorAll(".item"))
		{
			element.setClassConditional("selected", (ids.has(element.dataset.id)));
		}
	}

	/**
	 * Returns the ids of all selected items in this selector.
	 * @returns {Set<IdString>} Ids all selected items
	 */
	getSelectedIds ()
	{
		/** @type {Set<IdString>} */
		let result = new Set();
		for (let element of this.element.querySelectorAll(".item.selected"))
		{
			result.add(element.dataset.id);
		}
		return result;
	}
}

// TODO: doc
class FilterMenu
{
	constructor(filter, callback)
	{
		/** @type {FilterMenu} */
		let _this = this;

		/** @type {ExpensesFilter} */
		this.filter = filter;

		this.callback = callback;

		this.pmtSelector = new PaymentMethodSelector(onMenuboxClick, true, false);
		this.catSelector = new CategorySelector(console.log, true);
		this.pmtSelector.element.classList.add("wide-flex");
		this.pmtSelector.element.style = "padding: 0.5em; max-width: 85vw; overflow-x: scroll;";
		this.pmtSelector.refresh();

		this.catSelector.element.classList.add("wide-flex");
		this.catSelector.element.style = "padding: 0.5em; max-width: 85vw; overflow-x: scroll;";
		this.catSelector.refresh();

		let mbConfig = {
			title: "Expenses Filter",
			css: "filter",
			items: [
				{
					key: "_pmts",
					label: "Payment methods:",
					enabled: false,
					iconHtml: htmlBuilder.newElement("i.fas.icon", FA.toHTML("wallet"))
				},
				{
					html: this.pmtSelector.element,
					enabled: false
				},
				{
					key: "_cats",
					label: "Categories:",
					enabled: false,
					iconHtml: htmlBuilder.newElement("i.fas.icon", FA.toHTML("boxes"))
				},
				{
					html: this.catSelector.element
				}
			],
			buttons: [
				{
					key: "ok",
					label: "apply"
				},
				{
					key: "cancel",
					label: "cancel"
				}
			]
		};
		this._menuBox = new Menubox("filter-menu", mbConfig, onMenuboxClick);
		myxDebug.publish(this._menuBox, "filterMenu");

		function onMenuboxClick (event)
		{
			if (event.buttonKey === "ok")
			{
				let filter = new ExpensesFilter();
				filter.excludePaymentMethods(ExpensesFilter.allPaymentMethods.exclude(_this.pmtSelector.getSelectedIds()));
				// TODO: get selected categories
				_this.callback(filter);
			}
		}

	}

	// TODO: doc
	popup (event, element, align)
	{
		this.pmtSelector.select(ExpensesFilter.allPaymentMethods.exclude(this.filter.pmts));
		this._menuBox.popup(event, null, element, align);
	}
}
