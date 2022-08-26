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
