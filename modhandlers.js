/**
 * 
 * @param {string} MODULE_NAME name of the current module
 * @param {HTMLElements} elements 
 * @param {function} dataGetter 
 * @param {function} dataSetter 
 * @returns public interface
 */
const clientModeHandler = function (MODULE_NAME, elements, dataGetter, dataSetter)
{
	let currentMode = "default";
	let dataBeforeEdit;
	let onSave;

	function leave (toModule)
	{
		if ((["icon-editor", MODULE_NAME].includes(toModule) === false) && (currentMode === "edit"))
		{
			setMode("__reset__");
		}
	};

	function setMode (newMode)
	{
		console.log("setMode", currentMode, "-->", newMode);
		if ((typeof dataGetter === "function") && (typeof dataSetter === "function"))
		{
			if ((currentMode === "default") && (newMode === "edit"))
			{
				// backup data to persistent json string
				dataBeforeEdit = JSON.stringify(dataGetter());
			}
			else if ((currentMode === "edit") && (newMode === "default"))
			{
				// save data if changed
				if ((stringHash(JSON.stringify(dataGetter())) !== stringHash(dataBeforeEdit))
					&& (typeof onSave === "function"))
				{
					onSave();
				}
			}
			else if (newMode === "__reset__")
			{
				// reset data from backup
				dataSetter(JSON.parse(dataBeforeEdit));
				newMode = "default";
			}
		}
		// elements._self.classList.remove(currentMode + "-mode");
		currentMode = newMode || "default";
		let modeCssClass = currentMode + "-mode";
		for (let element of elements._self.querySelectorAll(".for-mode"))
		{
			(element.classList.contains(modeCssClass)) ? element.classList.remove("hidden") : element.classList.add("hidden");
		}
		// elements._self.classList.add(currentMode + "-mode");
	};

	return { // public interface
		get currentMode () { return currentMode; },
		set onSave (func) { onSave = func; },
		setMode: setMode,
		leave: leave
	};
};

const popupModuleHandler = function ()
{
	let cameFromModule;
	let cameFromSrcollTop;

	function memorizeOrigin ()
	{
		cameFromModule = choices.chosen.activeTab;
		cameFromSrcollTop = myx.client.scrollTop;
	};

	function returnToOrigin (mouseEvent)
	{
		choices.choose("active-tab", cameFromModule, mouseEvent);
		myx.client.scrollTo({ top: cameFromSrcollTop });
	};

	return { // public interface
		memorizeOrigin: memorizeOrigin,
		returnToOrigin: returnToOrigin
	};
};
