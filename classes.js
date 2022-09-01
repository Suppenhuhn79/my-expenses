/**
 * Creates a new instance of ModuleModeHandler.
 * @constructor
 * @param {HTMLElement} element Element that contains module items
 * @param {Function} dataGetter `function(): Object` to get the current module data before switching to "edit" mode
 * @param {Function} dataSetter `function(data: Object)` to call to reset modified data when cancelling "edit" mode
 */
function ModuleModeHandler (element, dataGetter, dataSetter)
{
	let dataBeforeEdit;
	let currentMode = "default";

	/**
	 * Sets the current mode for the module. Hides all elements that have the class "for-mode"
	 * but not "\<mode\>-mode".
	 * 
	 * If switching from "default" to "edit" mode, a backup of the module data is taken via the `dataGetter()`.
	 * 
	 * If Switching from "edit" to "default" mode (which means the edit mode was cancelled), the module data
	 * is restored to backup via `dataSetter()`.
	 * 
	 * @param {String} newMode New mode to set
	 */
	this.set = function (newMode) 
	{
		if ((typeof dataGetter === "function") && (typeof dataSetter === "function"))
		{
			if ((currentMode === "default") && (newMode === "edit"))
			{
				// backup data to persistent json string
				dataBeforeEdit = JSON.stringify(dataGetter());
			}
			else if ((currentMode === "edit") && (newMode === "default"))
			{
				// revert data to pre-edit state
				dataSetter(JSON.parse(dataBeforeEdit));
			}
		}
		currentMode = newMode || "default";
		if (newMode.startsWith("__") === false) // a mode with "__" prefix is an intermediate mode and we don't need to update the ui
		{
			let modeCssClass = currentMode + "-mode";
			for (let childElement of element.querySelectorAll(".for-mode"))
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
	this.is = function (mode)
	{
		return (currentMode === mode);
	};

	/**
	 * Returns the current mode.
	 * @returns {String} Current mode
	 */
	this.get = function ()
	{
		return currentMode;
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
		times: "f00d",
		trash_alt: "f2ed",
		trash_restore_alt: "f82a",
		wallet: "f555"
	},

	/**
	 * @deprecated
	 */
	space: "\u00a0",

	/**
	 * On the given element, all `<i data-icon="...">` children will receive the desired icon as its content.
	 * @param {HTMLElement} element Element to put FontAwesome glyphs on
	 */
	applyOn: function (element)
	{
		for (let e of element.querySelectorAll("i[data-icon]"))
		{
			e.innerHTML = fa.icon(e.dataset.icon);
		}
	},

	/**
	 * Returns the HTML entity for a known FontAwesome icon.
	 * @param {String} name Name of desired FontAwesome icon
	 * @returns {String} HTML entity of the requested icon; or icon name if it is not known
	 */
	icon: function (name)
	{
		name = name.replaceAll(/-/g, "_");
		let result = fa.ICONS[name];
		return (!!result) ? "&#x" + result + ";" : "[" + name + "]";
	}
};
