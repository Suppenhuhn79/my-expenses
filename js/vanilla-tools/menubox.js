/*
This is a file from Vanilla-Tools (https://github.com/suppenhuhn79/vanilla-tools)
Copyright 2021 Christoph Zager, licensed under the Apache License, Version 2.0
See the full license text at http://www.apache.org/licenses/LICENSE-2.0
 */

/* requires htmlbuilder.js */

class Menubox
{
	constructor(id, menuJson, eventHandler = null, _parentMenubox = null)
	{
		if (typeof id !== "string")
		{
			throw new TypeError("ID required (as string)");
		}
		this.id = id;
		if (Menubox.instances[this.id])
		{
			console.info("Menubox \"" + this.id + "\" already existed, has been replaced.");
			document.body.querySelector("[data-menubox=\"" + id + "\"]")?.remove();
		}
		this.eventHandler = eventHandler;
		this.parentMenubox = _parentMenubox;
		this.selectMode = menuJson.selectMode ?? ((menuJson.multiselect === true) ? Menubox.SELECT_MODE.multiselect : Menubox.SELECT_MODE.normal);
		this.multiselect = ([Menubox.SELECT_MODE.multiselect, Menubox.SELECT_MODE.multiselect_interactive].includes(this.selectMode));
		this.items = {};
		this.adjust = Object.assign({ visibility: ["hidden", "visible"] }, menuJson.adjust);
		this.element = htmlBuilder.newElement("div.menubox", // wrapper DIV is required for transistions
			{ 'data-menubox': id, onclick: (evt) => { evt.stopPropagation(); } },
			htmlBuilder.newElement("div", htmlBuilder.newElement("div.items"))
		);
		if (_parentMenubox)
		{
			this.element.classList.add("submenu");
		}
		htmlBuilder.styleElement(this.element, {
			position: menuJson.position ?? "absolute",
			top: "0px",
			left: "0px"
		});
		if (typeof menuJson.css === "string")
		{
			for (let cssClass of menuJson.css.split(" "))
			{
				this.element.classList.add(cssClass);
			}
		}
		this.setTitle(menuJson.title);
		this.setItems((menuJson.items instanceof Array) ? menuJson.items : menuJson);
		if (menuJson.buttons instanceof Array)
		{
			let buttonsContainer = htmlBuilder.newElement("div.buttons");
			for (let menuButton of menuJson.buttons)
			{
				buttonsContainer.appendChild(htmlBuilder.newElement("div.menubutton",
					{ 'data-menubutton': menuButton.key, onclick: Menubox.onMenuItemClick },
					menuButton.label ?? menuButton.key)
				);
			}
			this.element.firstElementChild.appendChild(buttonsContainer);
		}
		document.body.appendChild(this.element);
		Menubox.instances[this.id] = this;
		Menubox.closeAll();
	};

	static EVENT_ID = "menubox";

	static SELECT_MODE = {
		normal: 0,
		persistent: 1,
		multiselect: 2,
		multiselect_interactive: 3
	};

	static instances = {};

	static hideAll (exceptFor = "")
	{
		console.warn("Menubox.hideAll() is deprecated and will be removed in the next release. Use Menubox.closeAll() instead.");
		Menubox.closeAll(exceptFor);
	};

	static closeAll (exceptFor = "")
	{
		for (let key in Menubox.instances)
		{
			if (exceptFor.startsWith(key) === false)
			// if ((exceptFor.startsWith(key) === false) && (key !== "__dialogbox__"))
			{
				Menubox.instances[key].close();
			}
		}
	};

	static onMenuItemClick (mouseEvent)
	{
		mouseEvent.stopPropagation();
		if ((mouseEvent.target instanceof HTMLInputElement === false) && (mouseEvent.target.classList.contains("disabled") === false))
		{
			let menuboxItem = mouseEvent.target.closest("[data-menuitem]");
			let menuboxButton = mouseEvent.target.closest("[data-menubutton]");
			let menubox = Menubox.instances[mouseEvent.target.closest("[data-menubox]").getAttribute("data-menubox")];
			let submenuId = menuboxItem?.getAttribute("data-submenu");
			if (menuboxItem)
			{
				if (submenuId)
				{
					let submenu = menubox.submenus[submenuId];
					Menubox.closeAll(submenuId);
					submenu.popup(mouseEvent, menubox.context, menuboxItem, submenu.alignment);
				}
				else if (menubox.multiselect)
				{
					menuboxItem.classList.toggle("selected");
				}
			}
			if (((menubox.selectMode === Menubox.SELECT_MODE.normal) || (menuboxButton)) && (!submenuId))
			{
				Menubox.closeAll();
			}
			if ((menubox.selectMode !== Menubox.SELECT_MODE.multiselect) || (menuboxButton))
			{
				/* dispatch event */
				let eventDetails = {
					context: menubox.context,
					menubox: menubox
				};
				if (menuboxItem)
				{
					eventDetails.itemKey = menuboxItem.getAttribute("data-menuitem");
				}
				else if (menuboxButton)
				{
					eventDetails.buttonKey = menuboxButton.getAttribute("data-menubutton");
				}
				if (menubox.multiselect)
				{
					eventDetails.selectedKeys = [];
					for (let item of menubox.element.querySelectorAll("[data-menuitem].selected"))
					{
						eventDetails.selectedKeys.push(item.getAttribute("data-menuitem"));
					}
				}
				if (typeof menubox.eventHandler === "function")
				{
					menubox.eventHandler(Object.assign(eventDetails, { originalEvent: mouseEvent }));
				}
				else
				{
					window.dispatchEvent(new CustomEvent(Menubox.EVENT_ID, { detail: eventDetails }));
				}
			}
		}
	};

	_setVisibility (visible)
	{
		let styleIndex = (visible) ? 1 : 0;
		for (let key in this.adjust)
		{
			let styleValue = this.adjust[key][styleIndex];
			if ((key === "height") && (styleValue === "auto"))
			{
				styleValue = this.element.firstElementChild.offsetHeight + "px";
			}
			else if ((key === "width") && (styleValue === "auto"))
			{
				styleValue = this.element.firstElementChild.offsetWidth + "px";
			}
			this.element.style[key] = styleValue;
		}
	};

	setItems (itemDefs)
	{
		this.items = {};
		htmlBuilder.removeAllChildren(this.element.querySelector("div.items"));
		console.log(this, this.items);
		if (itemDefs instanceof Array)
		{
			for (let itemDef of itemDefs)
			{
				this.appendItem(itemDef);
			}
		}
		else
		{
			for (let key in itemDefs)
			{
				this.appendItem({ [key]: itemDefs[key] });
			}
		}
	};

	appendItem (itemDef)
	{
		console.log(this, this.items);
		function _copyProperties (itemDef, itemElement)
		{
			for (let itemDefKey in itemDef)
			{
				if (["key", "label", "input"].includes(itemDefKey) === false)
				{
					itemElement[itemDefKey] = itemDef[itemDefKey];
				}
			}
		}
		function _createInputElement (itemDef)
		{
			let inputElement = htmlBuilder.newElement("input", { type: itemDef.input });
			_copyProperties(itemDef, inputElement);
			return inputElement;
		}
		function _createSubmenu (menubox, itemElement, itemDef)
		{
			let submenuId = menubox.id + "::" + itemDef.key;
			itemElement.setAttribute("data-submenu", submenuId);
			itemElement.classList.add("submenu");
			menubox.submenus ??= {};
			menubox.submenus[submenuId] = new Menubox(submenuId, itemDef.submenu, menubox.eventHandler, menubox);
			menubox.submenus[submenuId].alignment = itemDef.submenu.alignment ?? "start right, below top";
		}
		function _appendItemObject (menubox, itemKey, itemElement)
		{
			menubox.items[itemKey] = {
				label: itemDef.label,
				get selected () { return itemElement.classList.contains("selected"); },
				set selected (selected)
				{
					if (menubox.multiselect === false)
					{
						for (let item of menubox.element.querySelectorAll("[data-menuitem].selected"))
						{
							item.classList.remove("selected");
						}
					}
					(selected) ? itemElement.classList.add("selected") : itemElement.classList.remove("selected");
				},
				get enabled () { return !itemElement.classList.contains("disabled"); },
				set enabled (enabled = true) { (enabled) ? itemElement.classList.remove("disabled") : itemElement.classList.add("disabled"); },
				setVisible: (visible = true) => { itemElement.style.display = (visible) ? null : "none"; },
				element: itemElement
			};
		}
		if ((itemDef.key === undefined) && (itemDef.separator === undefined) && (itemDef.html === undefined) && (itemDef.href === undefined))
		{
			for (let key in itemDef)
			{
				if (typeof itemDef[key] === "string")
				{
					itemDef = {
						key: key,
						label: itemDef[key]
					};
				}
				else
				{
					itemDef = { separator: {} };
				}
				break;
			}
		}
		let itemElement;
		if (itemDef.separator)
		{
			itemElement = htmlBuilder.newElement("div.separator", "\u00a0");
		}
		else if (itemDef.href)
		{
			itemElement = htmlBuilder.newElement("a.menuitem", itemDef.label ?? itemDef.href, { onclick: (evt) => Menubox.closeAll() });
			_copyProperties(itemDef, itemElement);
		}
		else if ((itemDef.html) && (itemDef.key === undefined))
		{
			itemElement = itemDef.html;
		}
		else if (itemDef.key !== undefined)
		{
			if (!this.items[itemDef.key])
			{
				itemElement = htmlBuilder.newElement("div.menuitem",
					{ 'data-menuitem': itemDef.key, onclick: itemDef.onclick ?? Menubox.onMenuItemClick },
					itemDef.html ?? itemDef.label ?? ((itemDef.input) ? "" : itemDef.key)
				);
				if (itemDef.input)
				{
					itemElement.appendChild(_createInputElement(itemDef));
				}
				else if (itemDef.submenu)
				{
					_createSubmenu(this, itemElement, itemDef);
				}
				else if (this.multiselect)
				{
					itemElement.classList.add("multiselect");
				}
				_appendItemObject(this, itemDef.key, itemElement);
			}
			else
			{
				console.warn("Menubox item \"" + itemDef.key + "\" does already exist.", this, itemDef);
			}
		}
		if (itemElement)
		{
			if (itemDef.icon)
			{
				itemElement.insertBefore(htmlBuilder.newElement("img", { src: itemDef.icon }), itemElement.firstChild);
			}
			if (itemDef.iconHtml)
			{
				itemElement.insertBefore(itemDef.iconHtml, itemElement.firstChild);
			}
			if (itemDef.selected)
			{
				itemElement.classList.add("selected");
			}
			if (itemDef.enabled === false)
			{
				itemElement.classList.add("disabled");
			}
			this.element.querySelector("div.items").appendChild(itemElement);
		}
	};

	selectItem (itemKey, beSelected = true)
	{
		this.items[itemKey].selected = beSelected;
	};

	setTitle (title)
	{
		let wrapperElement = this.element.firstElementChild;
		if (typeof title === "string")
		{
			let titleElement = wrapperElement.querySelector(".title");
			if (!titleElement)
			{
				titleElement = htmlBuilder.newElement("div.title");
				wrapperElement.insertBefore(titleElement, wrapperElement.firstElementChild);
			}
			titleElement.innerText = title;
		}
		else
		{
			wrapperElement.querySelector(".title")?.remove();
		}
	};

	popup (mouseEvent, context = null, anchorElement = null, adjustment = "start left, below bottom")
	{
		if (!this.parentMenubox)
		{
			Menubox.closeAll();
		}
		let itemsElement = this.element.querySelector("div.items");
		let isFixed = (this.element.style.position === "fixed");
		let scrollPos = (isFixed) ? { top: 0, left: 0 } : { top: document.documentElement.scrollTop, left: document.documentElement.scrollLeft };
		itemsElement.scrollTo({ top: 0 });
		htmlBuilder.styleElement(itemsElement, {
			height: null,
			overflowY: null
		});
		if (mouseEvent instanceof MouseEvent)
		{
			mouseEvent.stopPropagation();
			if ((anchorElement instanceof HTMLElement) === false)
			{
				htmlBuilder.styleElement(this.element, {
					top: mouseEvent.clientY + scrollPos.top + "px",
					left: mouseEvent.clientX + scrollPos.left + "px"
				});
			}
		}
		if (anchorElement instanceof HTMLElement)
		{
			htmlBuilder.adjust(this.element, anchorElement, adjustment);
		}
		/* prevent menubox exceeds viewport */
		let elementRect = this.element.getBoundingClientRect();
		if (elementRect.right > window.innerWidth)
		{
			this.element.style.left = Math.round(Math.max(scrollPos.left, scrollPos.left + window.innerWidth - elementRect.width)) + "px";
		}
		if (elementRect.bottom > window.innerHeight)
		{
			this.element.style.top = Math.round(Math.max(scrollPos.top, scrollPos.top + window.innerHeight - elementRect.height)) + "px";
			if (elementRect.height > window.innerHeight)
			{
				itemsElement.style.height = (itemsElement.offsetHeight - (elementRect.height - window.innerHeight)) + "px";
				itemsElement.style.overflowY = "scroll";
			}
		}
		this.context = context;
		this._setVisibility(true);
	};

	close ()
	{
		this._setVisibility(false);
	};

	static dialogBox (title, lines, buttons)
	{
		return new Promise((resolve) =>
		{
			/* parse markdown in lines */
			let items = [];
			for (let line of lines.split("\n"))
			{
				let rexMatch;
				let lineItems = [];
				while (rexMatch = /(?:([_*]{2})(.+?)\1)|\[([^\]]+)\]\(([^)]+)\)/.exec(line))
				{
					lineItems.push(line.substr(0, line.indexOf(rexMatch[0])));
					if (rexMatch[1] === "**")
					{
						lineItems.push(htmlBuilder.newElement("em", rexMatch[2]));
					}
					else if (rexMatch[1] === "__")
					{
						lineItems.push(htmlBuilder.newElement("i", rexMatch[2]));
					}
					else if (!!rexMatch[3])
					{
						lineItems.push(htmlBuilder.newElement("a", { href: rexMatch[3], target: "_blank" }, rexMatch[4]));
					}
					line = line.substring(line.indexOf(rexMatch[0]) + rexMatch[0].length);
				}
				lineItems.push(line);
				items.push({ html: htmlBuilder.newElement("p", ...lineItems) });
			}
			/* fake Menubox as dialogbox */
			let dialogBox = new Menubox("__dialogbox__", { position: "fixed", css: "dialogbox", title: title, items: items, buttons: buttons },
				(menuboxEvent) =>
				{
					Menubox.instances.__dialogbox__.close();
					resolve(menuboxEvent.buttonKey);
					delete Menubox.instances.__dialogbox__;
				}
			);
			let boxRect = dialogBox.element.getBoundingClientRect();
			htmlBuilder.styleElement(dialogBox.element, {
				top: Math.round((window.innerHeight - boxRect.height) / 3) + "px",
				left: Math.round((window.innerWidth - boxRect.width) / 2) + "px"
			});
			dialogBox.popup(null);
		});
	};

};

window.addEventListener("click", (mouseEvent) =>
{
	if (mouseEvent.target.closest("[data-menubox]") === null)
	{
		Menubox.closeAll();
	}
});
window.addEventListener("keydown", (keyEvent) =>
{
	if (keyEvent.keyCode === 27)
	{
		Menubox.closeAll();
	}
});
