/*
This is a file from Vanilla-Tools (https://github.com/suppenhuhn79/vanilla-tools)
Copyright 2021 Christoph Zager, licensed under the Apache License, Version 2.0
See the full license text at http://www.apache.org/licenses/LICENSE-2.0
 */

const htmlBuilder = {};

htmlBuilder.adjust = function (element, anchorElement, adjustment = "below bottom, start left")
{
	/* initial position: "start left, top below" */
	let anchorRect = anchorElement.getBoundingClientRect();
	let position = {
		x: (!!/\bright\b/i.exec(adjustment)) ? anchorRect.right : anchorRect.left,
		y: (!!/\bbottom\b/i.exec(adjustment)) ? anchorRect.bottom : anchorRect.top
	};
	let elementPositionIsFixed = (window.getComputedStyle(element).position === "fixed");
	/* horizontal adjustment */
	position.x -= (!!/\bend\b/i.exec(adjustment)) ? element.offsetWidth : 0;
	position.x += (!!/\bcenter\b/i.exec(adjustment)) ? ((anchorRect.width - element.offsetWidth) / 2) : 0;
	/* vertical adjustment */
	position.y -= (!!/\babove\b/i.exec(adjustment)) ? element.offsetHeight : 0;
	position.y += (!!/\bmiddle\b/i.exec(adjustment)) ? ((anchorRect.height - element.offsetHeight) / 2) : 0;
	/* prevent exceeding the docment client area */
	/* document.body.clientWidth for x, because window.innerWidth does not exclude a scrollbar; we expect a document not be wider than the window */
	let exceedings = {
		x: ((elementPositionIsFixed) ? document.body.clientWidth : document.documentElement.offsetWidth) - position.x - element.offsetWidth,
		y: ((elementPositionIsFixed) ? window.innerHeight : document.documentElement.offsetHeight) - position.y - element.offsetHeight
	};
	position.x += Math.min(exceedings.x, 0);
	position.y += Math.min(exceedings.y, 0);
	/* prevent positions < 0 */
	position.y = Math.max(position.y, 0);
	position.x = Math.max(position.x, 0);
	/* rescpect scroll position for non-fixed elements */
	if (elementPositionIsFixed === false)
	{
		position.y += document.documentElement.scrollTop;
		position.x += document.documentElement.scrollLeft;
	}
	/* set position */
	element.style.top = Math.round(position.y) + "px";
	element.style.left = Math.round(position.x) + "px";
};

htmlBuilder.newElement = function (elementDefinition, ...content)
{
	let tagName = /^[^#.\s\[]+/.exec(elementDefinition)[0];
	let result = document.createElement(tagName);
	let idDefinition = /#([^.\s\[]+)/.exec(elementDefinition);
	(!!idDefinition) ? result.id = idDefinition[1] : null;
	let attributesRex = /\[(.+?)=(['"])(.*?)\2\]/g,
	attributesMatch;
	while (attributesMatch = attributesRex.exec(elementDefinition))
	{
		result.setAttribute(attributesMatch[1], attributesMatch[3]);
	}
	elementDefinition = /[^\[]+/.exec(elementDefinition);
	let cssClassesRex = /\.([^.\s]+)/g,
	cssClassMatch;
	while (cssClassMatch = cssClassesRex.exec(elementDefinition))
	{
		result.classList.add(cssClassMatch[1]);
	}
	for (let item of content)
	{
		switch (item.constructor.name)
		{
		case "Number":
			result.appendChild(document.createTextNode(item));
			break;
		case "String":
			let rex = /&#x([0-9a-f]{4});/i;
			let rem = rex.exec(item);
			while (rem)
			{
				item = item.replace(rem[0], JSON.parse("\"\\u" + rem[1] + "\""));
				rem = /&#x([0-9a-f]{4});/i.exec(item);
			}
			result.appendChild(document.createTextNode(item));
			break;
		case "Object":
			for (let key in item)
			{
				let value = item[key];
				if (typeof value === "function")
				{
					result[key] = value;
				}
				else
				{
					result.setAttribute(key, value);
				}
			}
			break;
		default:
			if (item instanceof HTMLElement)
			{
				result.appendChild(item);
			}
			else
			{
				throw new TypeError("Expected String, Number, Object or HTMLElement, got " + ((!!item) ? item.constructor.name : typeof item));
			}
		}
	}
	return result;
};

htmlBuilder.replaceElement = function (element, newElement)
{
	element.parentElement.replaceChild(newElement, element);
	return newElement;
};

htmlBuilder.replaceContent = function (element, newContentElement)
{
	htmlBuilder.removeAllChildren(element);
	element.appendChild(newContentElement);
};

htmlBuilder.removeChildrenByQuerySelectors = function (querySelectors, rootElement = document.body)
{
	for (let querySelector of querySelectors)
	{
		for (let node of rootElement.querySelectorAll(querySelector))
		{
			node.remove();
		}
	}
};

htmlBuilder.styleElement = function (element, styles)
{
	for (let styleKey in styles)
	{
		element.style[styleKey] = styles[styleKey];
	}
};

htmlBuilder.removeClasses = function (classes, rootElement = document.body)
{
	for (let clss of classes)
	{
		rootElement.classList.remove(clss);
		for (let node of rootElement.querySelectorAll("." + clss))
		{
			node.classList.remove(clss);
		}
	}
};

htmlBuilder.removeAllChildren = function (element)
{
	while (element.firstChild)
	{
		element.firstChild.remove();
	}
};

htmlBuilder.dataFromElements = function (object, rootElement)
{
	function _processPath(object, path, value, valueType = "string")
	{
		if (path.length > 1)
		{
			object[path[0]] ??= {};
			_processPath(object[path[0]], path.slice(1), value, valueType);
		}
		else
		{
			if (valueType === "number")
			{
				value = Number(value);
			}
			object[path[0]] = value;
		}
	}
	for (let mappedElement of rootElement.querySelectorAll("[data-value-key]"))
	{
		let elementAttribute = mappedElement.getAttribute("data-value-attribute") ?? "value";
		_processPath(object, mappedElement.getAttribute("data-value-key").split("."), mappedElement[elementAttribute], mappedElement.getAttribute("data-value-type"));
	}
};

htmlBuilder.dataToElements = function (object, rootElement)
{
	function _processPath(object, path)
	{
		let result = null;
		if (path.length > 1)
		{
			if (!!object[path[0]])
			{
				result = _processPath(object[path[0]], path.slice(1));
			}
		}
		else
		{
			result = object[path[0]];
		}
		return result;
	}
	for (let mappedElement of rootElement.querySelectorAll("[data-value-key]"))
	{
		let elementAttribute = mappedElement.getAttribute("data-value-attribute") ?? "value";
		mappedElement[elementAttribute] = _processPath(object, mappedElement.getAttribute("data-value-key").split("."));
	}
};
