/**
 * Creates a new instance of ModuleModeHandler.
 * @param {HTMLElement} element Element that contains module items
 * @param {Function} dataGetter `function(): Object` to get the current module data before switching to "edit" mode
 * @param {Function} dataSetter `function(data: Object)` to call to reset modified data when cancelling "edit" mode
 */
function ModuleModeHandler (element, dataGetter, dataSetter)
{
	let dataBeforeEdit;
	this.currentMode = "default";

	/**
	 * Sets the current mode for the module. Hides all elements that have the class "for-mode"
	 * but not "\<mode\>-mode".
	 * If switching from "default" to "edit" mode, a backup of the module data is taken via the `dataGetter()`.
	 * If Switching from "edit" to "default" mode (which means the edit mode was cancelled), the module data
	 * is restored to backup via `dataSetter()`.
	 * @param {String} newMode Mew mode to set
	 */
	this.setMode = function (newMode)
	{
		if ((typeof dataGetter === "function") && (typeof dataSetter === "function"))
		{
			if ((this.currentMode === "default") && (newMode === "edit"))
			{
				// backup data to persistent json string
				dataBeforeEdit = JSON.stringify(dataGetter());
			}
			else if ((this.currentMode === "edit") && (newMode === "default"))
			{
				// revert data to pre-edit state
				dataSetter(JSON.parse(dataBeforeEdit));
			}
		}
		this.currentMode = newMode || "default";
		if (newMode.startsWith("__") === false) // a mode with "__" prefix is an intermediate mode and we don't need to update the ui
		{
			let modeCssClass = this.currentMode + "-mode";
			for (let childElement of element.querySelectorAll(".for-mode"))
			{
				(childElement.classList.contains(modeCssClass)) ? childElement.classList.remove("hidden") : childElement.classList.add("hidden");
			}
		}
	};
}
