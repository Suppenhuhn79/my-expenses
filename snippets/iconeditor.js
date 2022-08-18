function IconEditor (targetElement)
{
	const ICON_LIBRARAY =
	{
		shopping: [
			"fas:f07a",
			"fas:f291",
			"fas:f290",
			"fas:f788",
			"fas:f541"],
		symbols: [
			"fas:f005",
			"fas:f004",
			"fas:f7a9",
			"fas:f0c2",
			"fas:f007",
			"fas:f0f3",
			"fas:f0eb",
			"fas:f0e7",
			"fas:f4d6",
			"fas:f562",
			"fas:f0e9",
			"fas:f0a3",
			"fas:f118",
			"fas:f119",
			"fas:f11a",
			"fas:f2b5",
			"fas:f70e",
			"fas:f06b",
			"fas:f0c4",
			"fas:f0e3",
			"fas:f77c",
			"fas:f77d",
			"fas:f4c0",
			"fas:f4be",
			"fas:f12e",
			"fas:f6cf",
			"fas:f6d1",
			"fas:f1f8",
			"fas:f783",
			"fas:f6ad",
			"fas:f1b2",
			"fas:f3ed",
			"fas:f7e4",
			"fas:f128",
			"fas:f01e"
		],
		food: [
			"fas:f2e7",
			"fas:f7ec",
			"fas:f6d7",
			"fas:f578",
			"fas:f7ef",
			"fas:f805",
			"fas:f80f",
			"fas:f818",
			"fas:f5d1",
			"fas:f787",
			"fas:f816",
			"fas:f094",
			"fas:f810",
			"fas:f1fd",
			"fas:f7b6",
			"fas:f0fc",
			"fas:f57b",
			"fas:f5ce",
			"fas:f7a0",
			"fas:f72f",
			"fas:f2dc"],
		housing: [
			"fas:f015",
			"fas:f6f1",
			"fas:f4b8",
			"fas:f49e",
			"fas:f5aa",
			"fas:f084",
			"fas:f2cd",
			"fas:f7d8",
			"fas:f71e"],
		transportation: [
			"fas:f018",
			"fas:f1b9",
			"fas:f1ba",
			"fas:f55e",
			"fas:f239",
			"fas:f0d1",
			"fas:f48b",
			"fas:f4df",
			"fas:f206",
			"fas:f072",
			"fas:f5b0",
			"fas:f13d",
			"fas:f52f",
			"fas:f613",
			"fas:f7d9"],
		sports: [
			"fas:f1e3",
			"fas:f434",
			"fas:f44e",
			"fas:f5c4",
			"fas:f44b",
			"fas:f091",
			"fas:f559",
			"fas:f7a6",
			"fas:f025",
			"fas:f001",
			"fas:f86d",
			"fas:f630"],
		electronics: [
			"fas:f108",
			"fas:f109",
			"fas:f3cd",
			"fas:f02f",
			"fas:f095",
			"fas:f1e6",
			"fas:f1eb",
			"fas:f02d",
			"fas:f03e",
			"fas:f518",
			"fas:f0e0",
			"fas:f5a1"],
		health: [
			"fas:f5bb",
			"fas:f21e",
			"fas:f7f2",
			"fas:f0f8",
			"fas:f0f0",
			"fas:f0f1",
			"fas:f469",
			"fas:f0f9",
			"fas:f5c9",
			"fas:f06e",
			"fas:f46b",
			"fas:f490",
			"fas:f610",
			"fas:f621"],
		travel_nature: [
			"fas:f0ac",
			"fas:f279",
			"fas:f276",
			"fas:f08d",
			"fas:f3c5",
			"fas:f124",
			"fas:f0f2",
			"fas:f1ad",
			"fas:f11e",
			"fas:f024",
			"fas:f5ca",
			"fas:f6fc",
			"fas:f1bb",
			"fas:f1e5",
			"fas:f6d3",
			"fas:f6be",
			"fas:f1b0",
			"fas:f6f0",
			"fas:f7ab",
			"fas:f520",
			"fas:f52e",
			"fas:f56b",
			"fas:f06c",
			"fas:f55f"],
		clothing: [
			"fas:f553",
			"fas:f696",
			"fas:f8c0",
			"fas:f521"],
		buildings: [
			"fas:f66f",
			"fas:f275",
			"fas:f67f"],
		payments: [
			"fas:f555",
			"fas:f3d1",
			"fas:f53a",
			"fas:f0d6",
			"fas:f09d",
			"fas:f53d",
			"fas:f53c",
			"fas:f51e",
			"fas:f4d3",
			"fas:f3a5",
			"fab:f1f1", "fab:f1f0", "fab:f1ed", "fab:f42c", "fab:f415", "fab:e079"
		]
	};

	const DEFAULT_ICON = "fas:f07a";
	const DEFAULT_COLOR = "#888";
	let currentObject = {};
	let elements = pageSnippets.iconSelector.produce().getNames();
	for (let iconCode of [].concat(...Object.values(ICON_LIBRARAY)))
	{
		let icon = myx.getIconAttributes(iconCode);
		elements.iconList.appendChild(htmlBuilder.newElement("div.icon." + icon.faScope,
			{ 'data-choice-value': iconCode },
			icon.htmlEntity));
	};
	colorSelector(elements.colorselectorBubbles, 27);
	targetElement.appendChild(elements._self);
	choices.onChoose("iconeditor-icon", renderIcon);
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

	function renderIcon (iconCode)
	{
		let icon = myx.getIconAttributes(iconCode);
		elements.iconPreview.classList.add(icon.faScope);
		elements.iconPreview.innerHTML = icon.htmlEntity;
		currentObject.icon = icon.faScope + ":" + icon.unicodeCodepoint;
	};

	this.popup = function (obj, callback)
	{
		let originTabName = choices.get("active-tab");
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
		checks.setChecked(elements.checkDisabled, obj.meta.isDisabled);
		elements.ok.onclick = () =>
		{
			currentObject.label = elements.objectLabel.value || "?";
			delete currentObject.meta;
			callback(currentObject, checks.getAllChecked(elements._self));
			choices.set("active-tab", originTabName);
		};
		elements._self.classList = obj.meta.cssModifier;
		elements.cancel.onclick = () => choices.set("active-tab", originTabName);
		elements.title.innerText = obj.meta.header;
		elements.headline.innerText = obj.meta.headline || "\u00a0";
		choices.set("active-tab", "icon-editor");
		choices.set("iconeditor-icon", currentObject.icon);
		choices.set("iconeditor-color", currentObject.color);
		choices.set("iconeditor-tab", "icon-selection");
		elements.iconList.querySelector("[data-choice-value='" + currentObject.icon + "']")?.scrollIntoView({ block: "center" });
	};

};
