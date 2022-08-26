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
	angle_left: "&#xf104;",
	angle_right: "&#xf105;",
	angle_up: "&#xf106;",
	angle_double_up: "&#xf102;",
	arrow_left: "&#xf060;",
	asterisk: "&#xf069;",
	backspace: "&#xf55a;",
	backward: "&#xf04a;",
	ban: "&#xf05e;",
	bars: "&#xf0c9;",
	boxes: "&#xf468;",
	calendar: "&#xf133;",
	calendar_alt: "&#xf073;",
	calendar_day: "&#xf783;",
	calculator: "&#xf1ec;",
	chart_area: "&#xf1fe;",
	chart_bar: "&#xf080;",
	chart_line: "&#xf201;",
	chart_pie: "&#xf200;",
	check: "&#xf00c;",
	clone: "&#xf24d;",
	divide: "&#xf529;",
	filter: "&#xf0b0;",
	hourglass_half: "&#xf252;",
	infinite: "&#xf534;",
	list_ul: "&#xf0ca;",
	micoscope: "&#xf610;",
	pen: "&#xf304;",
	plus: "&#xf067;",
	plus_square: "&#xf0fe;",
	redo: "&#xf01e;",
	search: "&#xf002;",
	smiley_meh: "&#xf11a;",
	sort: "&#xf0dc;",
	space: "&#x00a0;",
	star: "&#xf005;",
	times: "&#xf00d;",
	trash_alt: "&#xf2ed;",
	trash_restore_alt: "&#xf82a;",
	wallet: "&#xf555;",

	/**
	 * On the given element, all `<i data-icon="...">` children will receive the desired icon as its content.
	 * @param {HTMLElement} element Element to put FontAwesome glyphs on
	 */
	applyOn: function (element)
	{
		for (let e of element.querySelectorAll("i[data-icon]"))
		{
			let iconKey = e.dataset.icon.replaceAll(/-/g, "_");
			e.innerHTML = fa[iconKey] || "[" + iconKey + "]";
		}
	}
};
