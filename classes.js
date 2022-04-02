class ModuleModeHandler
{
	#element;
	#dataBeforeEdit;
	#dataGetter;
	#dataSetter;
	currentMode = "default";

	/**
	 * Creates a new instance of ModuleModeHandler.
	 * @param {HTMLElement} element Element that contains module items
	 * @param {Function} dataGetter `function(): Object` to get the current module data before switching to "edit" mode
	 * @param {Function} dataSetter `function(data: Object)` to call to reset modified data when cancelling "edit" mode
	 */
	constructor(element, dataGetter, dataSetter)
	{
		this.#element = element;
		this.#dataGetter = dataGetter;
		this.#dataSetter = dataSetter;
	}

	/**
	 * Sets the current mode for the module. Hides all elements that have the class "for-mode"
	 * but not "\<mode\>-mode".
	 * If switching from "default" to "edit" mode, a backup of the module data is taken via the `dataGetter()`.
	 * If Switching from "edit" to "default" mode (which means the edit mode was cancelled), the module data
	 * is restored to backup via `dataSetter()`.
	 * @param {String} newMode Mew mode to set
	 */
	setMode (newMode)
	{
		console.log("setMode", this.currentMode, "-->", newMode);
		if ((typeof this.#dataGetter === "function") && (typeof this.#dataSetter === "function"))
		{
			if ((this.currentMode === "default") && (newMode === "edit"))
			{
				// backup data to persistent json string
				this.#dataBeforeEdit = JSON.stringify(this.#dataGetter());
			}
			else if ((this.currentMode === "edit") && (newMode === "default"))
			{
				// revert data to pre-edit state
				this.#dataSetter(JSON.parse(this.#dataBeforeEdit));
			}
		}
		this.currentMode = newMode || "default";
		let modeCssClass = this.currentMode + "-mode";
		for (let element of this.#element.querySelectorAll(".for-mode"))
		{
			(element.classList.contains(modeCssClass)) ? element.classList.remove("hidden") : element.classList.add("hidden");
		}
	}
}
