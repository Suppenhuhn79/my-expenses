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
 * fontAwesome glyph codes and processing function.
 */
const fa = {
	ICONS: {
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
	},

	/**
	 * On the given element, all `<i data-icon="...">` children will receive the desired icon as its content.
	 * @param {HTMLElement} element Element to put FontAwesome glyphs on
	 */
	applyOn: function (element)
	{
		for (let e of element.querySelectorAll("i[data-icon]"))
		{
			e.innerHTML = fa.toHTML(e.dataset.icon);
		}
	},

	/**
	 * Returns the HTML entity for a known FontAwesome icon.
	 * @param {String} name Name of desired FontAwesome icon
	 * @returns {String} HTML entity of the requested icon; or icon name if it is not known
	 */
	toHTML: function (name)
	{
		name = name.replaceAll(/-/g, "_");
		let result = fa.ICONS[name];
		return (!!result) ? "&#x" + result + ";" : "[" + name + "]";
	}
};
