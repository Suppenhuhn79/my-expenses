const iconEditor = function (targetElement)
{
	const ICONS = [
		/*shopping */
		"fas:f07a", "fas:f291", "fas:f290", "fas:f788",
		/* symbols */
		"fas:f541",
		"fas:f118",
		"fas:f004", "fas:f005",
		"fas:f630", "fas:f3cd", "fas:f1e6", "fas:f0ac", "fas:f0fe", "fas:f015", "fas:f553", "fas:f5bb", "fas:f3ed",
		/* objects */
		"fas:f02d",
		/* drinks */
		"fas:f0fc", "fas:f57b", "fas:f7b6", "fas:f72f", "fas:f5ce", "fas:f7a0",
		/* food */
		"fas:f2e7", "fas:f805", "fas:f818", "fas:f80f", "fas:f816", "fas:f5d1", "fas:f7ef", "fas:f578", "fas:f810", "fas:f094",
		/* car */
		"fas:f1b9", "fas:f52f", "fas:f7d9",
		/* payment */
		"fas:f51e", "fas:f4d3", "fas:f555",
		"fas:f0d6", "far:f3d1",
		"fas:f53a", "far:f09d", "fab:f1f1", "fab:f1f0", "fab:f1ed",
		"fas:f19c",
		// AmazonPay, ApplePay, GooglePay "fab:f42c", "fab:f415", "fab:e079",
		/* question mark */
		"fas:f128"
	];
	const DEFAULT_ICON = "fas:f128";
	const DEFAULT_COLOR = "#888";
	let elements = {};
	let currentObject = {};

	function setIconData (iconCode)
	{
		elements.faScope.value = iconCode.substring(0, 3);
		elements.unicodeCodepoint.value = iconCode.substring(4);
		renderCustomIcon();
	};

	function setIconColor (color)
	{
		if (currentObject.meta.type === "category")
		{
			elements.iconPreviewWrapper.style.backgroundColor = color;
			elements.iconPreview.style.color = "#fff";
		}
		else 
		{
			elements.iconPreviewWrapper.style.backgroundColor = "#fff";
			elements.iconPreview.style.color = color;
		}
		currentObject.color = color;
	};

	function renderCustomIcon ()
	{
		if (!elements._self.querySelector("input:invalid, select:invalid"))	
		{
			let faScope = elements.faScope.value;
			let unicodeCodepoint = elements.unicodeCodepoint.value;
			for (let c of elements.faScope.options)
			{
				elements.iconPreview.classList.remove(c.value);
			}
			elements.iconPreview.classList.add(faScope);
			elements.iconPreview.innerHTML = "&#x" + unicodeCodepoint + ";";
			currentObject.icon = faScope + ":" + unicodeCodepoint;
		}
	};

	function popup (mode, obj, callback)
	{
		let originTabName = choices.chosen.activeTab;
		currentObject = Object.assign({}, {
			label: "?",
			icon: DEFAULT_ICON,
			color: DEFAULT_COLOR
		}, obj);
		console.log(obj);
		elements.objectLabel.dataset.defaultvalue = obj.meta.defaultlabel;
		elements.objectLabel.dataset.initialvalue = obj.label || obj.meta.defaultlabel;
		elements.objectLabel.value = elements.objectLabel.dataset.initialvalue;
		checks.setChecked(elements.checkDefault, obj.meta.isDefault);
		checks.setChecked(elements.checkExclude, (obj.exclude === true));
		elements.ok.onclick = () =>
		{
			currentObject.label = elements.objectLabel.value || "?";
			delete currentObject.meta;
			callback(currentObject, checks.getAllChecked(elements._self));
			choices.choose("active-tab", originTabName);
		};
		elements._self.classList = obj.meta.cssModifier;
		elements.cancel.onclick = () => choices.choose("active-tab", originTabName);
		elements.title.innerText = obj.meta.header;
		elements.headline.innerText = obj.meta.headline || "\u00a0";
		choices.choose("active-tab", "icon-editor");
		choices.choose("iconeditor-icon", currentObject.icon);
		choices.choose("iconeditor-color", currentObject.color);
		choices.choose("iconeditor-tab", "icon-selection");
		elements.knownIconsList.querySelector("[data-choice='" + currentObject.icon + "']")?.scrollIntoView({ block: "center" });
	};

	/* =========== constructor =========== */
	const psInterface = {
		onCustomIconEdited: renderCustomIcon
		// setLightness: setLightness,
		// serSaturation: setSaturation
	};
	elements = getNames(pageSnippets.iconSelector.produce(psInterface));
	void colorSelector(elements.colorselectorBubbles, 27);
	for (let icon of ICONS)
	{
		elements.knownIconsList.appendChild(htmlBuilder.newElement("div.icon." + icon.substring(0, 3),
			{ 'data-choice': icon },
			"&#x" + icon.substring(4) + ";"));
	};
	targetElement.appendChild(elements._self);
	choices.onChoose("iconeditor-icon", setIconData);
	choices.onChoose("iconeditor-color", setIconColor);
	elements.objectLabel.onfocus = () =>
	{
		if (elements.objectLabel.value === elements.objectLabel.dataset.defaultvalue)
		{
			elements.objectLabel.value = "";
		}
	};
	elements.objectLabel.onblur = () =>
	{
		if (elements.objectLabel.value.trim() === "")
		{
			elements.objectLabel.value = elements.objectLabel.dataset.initialvalue;
		}
	};
	return { // public interface
		popup: popup
	};
};
