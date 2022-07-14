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
		// console.log(bubbleElement);
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

