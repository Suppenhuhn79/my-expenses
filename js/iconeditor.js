const EditableIconType = {
	COLOR_ON_WHITE: 1,
	WHITE_ON_COLOR: 2
};

/**
 * Interface of common editable icon properties.
 */
class EditableIcon
{
	/**
	 * @param {{label: String, glyph: FAGlyph, color: string}} src Object from which to create an editable icon
	 */
	constructor(src)
	{
		/** @type {string} */
		this.label = src.label;

		/** @type {FAGlyph} */
		this.glyph = new FAGlyph(src.glyph.value);

		/** @type {string} */
		this.color = src.color;
	}
}

// TODO: refactor
const colorSelector = function (element, bubbleCount, initialSat = 0.8, initalLight = 0.6, hueOffset = 0)
{
	let hueStep;
	let hueStart = hueOffset;
	let saturation = initialSat;
	let lightness = initalLight;
	let bubbleElements = [];

	function hsl2rgb (h, s, l)
	{
		// based upon: https://stackoverflow.com/a/64090995/15919152
		// input: h as an angle in [0,360] and s,l in [0,1] - output: r,g,b in [0,1]
		let a = s * Math.min(l, 1 - l); let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return ("#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, 0)).join(""));
	};

	function updateBubbles ()
	{
		function _styleElement (element, color)
		{
			element.dataset.choiceValue = color;
			element.style.backgroundColor = color;
		}
		for (let h = 0, hh = bubbleElements.length - 1; h < hh; h += 1)
		{
			_styleElement(bubbleElements[h], hsl2rgb(h * hueStep + hueStart, saturation, lightness));
		}
		/* grey bubble */
		_styleElement(bubbleElements[bubbleElements.length - 1], hsl2rgb(0, 0, lightness));
		updateSelectedBubble();
	};

	function updateSelectedBubble (bubbleElement)
	{
		bubbleElement ||= element.querySelector(".chosen");
		if (bubbleElement)
		{
			bubbleElement.style.boxShadow = "0 0 0 4px " + bubbleElement.dataset.choiceValue;
		}
	};

	function onColorBubbleClick (event)
	{
		let bubbleElement = event.target.closest("[data-choice-value]");
		if (!!bubbleElement)
		{
			for (let otherBubble of bubbleElements)
			{
				otherBubble.style.boxShadow = null;
			}
			updateSelectedBubble(bubbleElement);
		}
	};

	// htmlBuilder.removeAllChildren(element);
	hueStep = Math.round(360 / bubbleCount);
	for (let h = 0; h <= bubbleCount; h += 1)
	{
		let bubbleElement = htmlBuilder.newElement("div.color-bubble",
			{
				name: "colorBubble",
				onclick: onColorBubbleClick
			});
		bubbleElements.push(bubbleElement);
		element.appendChild(bubbleElement);
	}
	updateBubbles();

	// element.onclick = onColorBubbleClick;
	// }

	return { // publish members
		get color () { return choices.get("iconeditor-color"); },
		get saturation () { return saturation; },
		set saturation (value) { saturation = value; updateBubbles(); },
		get lightness () { return lightness; },
		set lightness (value) { lightness = value; updateBubbles(); }
	};
};

let iconEditor = new function ()
{
	const ICON_LIBRARAY = {
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
			"far:f09d",
			"fas:f53d",
			"fas:f53c",
			"fas:f51e",
			"fas:f4d3",
			"fas:f3a5",
			"fab:f1f1", "fab:f1f0", "fab:f1ed", "fab:f42c", "fab:f415", "fab:e079"
		]
	};

	/**
	 * Named child elements of the editor.
	 * @type {Map<string, HTMLElement>}
	 */
	let elements = pageSnippets.iconSelector.produce({
		onLabelFocus: onLabelFocus,
		onLabelBlur: onLabelBlur,
		onCancelClick: onCancelClick,
		onOkClick: onConfirmClick,
		onDeleteClick: onDeleteClick
	}).getNamedChildren();

	/**
	 * Properties of the currently edited icon .
	 * @type {EditableIcon}
	 */
	let editedIcon;

	/**
	 * Current editor options.
	 * @type {IconEditorOptions}
	 */
	let _options;

	/** @type {IconEditorCallback} */
	let _callback;

	/**
	 * Name of tab which opend the editor.
	 * @type {string}
	 */
	let _originTabName;

	FA.applyOn(elements.get());
	colorSelector(elements.get("colorselector-bubbles"), 27);
	for (let glyphCode of [].concat(...Object.values(ICON_LIBRARAY)))
	{
		let glyph = new FAGlyph(glyphCode);
		elements.get("icon-list").appendChild(htmlBuilder.newElement("div.icon." + glyph.scope, { "data-choice-value": glyph.value }, glyph.htmlEntity));
	};
	document.getElementById("client").appendChild(elements.get());
	choices.onChoose("iconeditor-icon", renderGlyph);
	choices.onChoose("iconeditor-color", setIconColor);

	/**
	 * Sets the color of the icon preview.
	 * @param {string} color Color code of the icon
	 */
	function setIconColor (color)
	{
		if (_options.iconType === EditableIconType.WHITE_ON_COLOR)
		{
			elements.get("icon-preview").setStyles({
				backgroundColor: color,
				color: "#fff",
				fontSize: "1em"
			});
		}
		else 
		{
			elements.get("icon-preview").setStyles({
				backgroundColor: "#fff",
				color: color,
				fontSize: "1.3em"
			});
		}
		editedIcon.color = color;
	};

	/**
	 * Paints the icons glyph preview.
	 * @param {FAGlyph|string} glyph Glyph either as an actual FontAwesome glyph or a glyph code
	 */
	function renderGlyph (glyph)
	{
		if ((glyph instanceof FAGlyph) === false)
		{
			glyph = new FAGlyph(glyph);
		}
		htmlBuilder.replaceContent(elements.get("icon-preview"), glyph.render());
		elements.get("icon-list").querySelector("[data-choice-value='" + glyph.value + "']")?.scrollIntoView({ block: "center" });
		editedIcon.glyph = glyph;
	};

	/**
	 * Event handler on focussing the label input.
	 * Sets it empty if the label is the default label.
	 */
	function onLabelFocus ()
	{
		if (elements.get("icon-label").value === _options.defaultLabel)
		{
			elements.get("icon-label").value = "";
		}
	}

	/**
	 * Event handler for blurring the label input.
	 * Sets it to the original value if it is left blank.
	 */
	function onLabelBlur ()
	{
		if (elements.get("icon-label").value.trim() === "")
		{
			elements.get("icon-label").value = _options.initialValue;
		}
		editedIcon.label = elements.get("icon-label").value;
	}

	/**
	 * Event handler for clicking the "ok" button.
	 * Returns to the original tab and call the callback function.
	 */
	function onConfirmClick ()
	{
		choices.set("active-tab", _originTabName);
		_callback(editedIcon);
	};

	/**
	 * Event handler for clicking the "cancel" button.
	 * Returns to the original tab
	 */
	function onCancelClick ()
	{
		choices.set("active-tab", _originTabName);
	}

	/**
	 * Event handler for clicking the "delete" button.
	 * Calls the `deleteHandler`. If it does not return `true`, editor returns to the original tab.
	 * @param {Event} event Triggering event
	 */
	function onDeleteClick (event)
	{
		if (typeof _options.deleteHandler === "function")
		{
			if (_options.deleteHandler(event, _options.context) !== true)
			{
				choices.set("active-tab", _originTabName);
			}
		}
	}

	/**
	 * Pops up the icon editor, sets it the active tab.
	 * @param {EditableIcon} icon Icon to edit
	 * @param {IconEditorOptions} options Editor options
	 * @param {IconEditorCallback} callback Callback function for applying edits
	 */
	this.popup = function (icon, options, callback)
	{
		editedIcon = {
			label: icon.label.valueOf(),
			glyph: new FAGlyph(icon.glyph.value),
			color: icon.color.valueOf()
		};
		_originTabName = choices.get("active-tab");
		_options = options;
		_options.initialValue = icon.label;
		_callback = callback;
		elements.get("icon-label").value = icon.label;
		elements.get("title").innerText = _options.title;
		elements.get("headline").innerText = _options.headline || "\u00a0";
		elements.get("color-tab-button").style.display = (_options.canColor ?? true) ? null : "none";
		elements.get("delete").style.display = (typeof _options.deleteHandler === "function") ? null : "none";
		choices.set("active-tab", "icon-editor");
		choices.set("iconeditor-icon", editedIcon.glyph.value);
		choices.set("iconeditor-color", editedIcon.color);
		choices.set("iconeditor-tab", "icon-selection");
	};

	this.getItems = function ()
	{
		/** @type {Array<ISelectableIcon>} */
		let items = [];

		for (let glyphCode of [].concat(...Object.values(ICON_LIBRARAY)))
		{
			items.push(new UserDataItem({
				id: glyphCode,
				color: "#888",
				icon: glyphCode
			}));
		};
		let iconSelection = new Selector(console.log, items, { class: "no-labels" });
		myxDebug.publish(iconSelection, "is");
		iconSelection.refresh();
		htmlBuilder.replaceContent(
			elements.get("icon-list"),
			iconSelection.element
		);
		return items;
	};
};
