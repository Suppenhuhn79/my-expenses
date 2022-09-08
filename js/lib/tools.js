/**
 * Provides functionality to handle radio selections (one active item at one time).
 * You'll need an element with a `data-choice` attribute and some children with `data-choice-value` attributes.
 * If there is an element with client content linked to the choice, get it a `data-choice-client` attribute with
 * the same value as the _data-choice-value_.
 */
let choices = new function ()
{
	/**
	 * Map of choice callbacks.
	 * @type {Map<String, ChoiceCallback>} */
	let callbacks = new Map();

	/**
	 * Map of choice values.
	 * @type {Map<String, String?>} */
	let data = new Map();

	window.addEventListener("click", (mouseEvent) =>
	{
		let choiceElement = mouseEvent.target.closest("[data-choice-value]");
		if (!!choiceElement)
		{
			let choiceGroupElement = choiceElement.closest("[data-choice]");
			if (!!choiceGroupElement)
			{
				this.set(choiceGroupElement.dataset.choice, choiceElement.dataset.choiceValue, mouseEvent);
			}
		}
	});

	/**
	 * Register an event handler to call when a choice is made.
	 * @param {String} choiceKey Choice key to act on
	 * @param {ChoiceCallback} callback `function(choiceKey: String, [event: Event])` to call on choice
	 */
	this.onChoose = function (choiceKey, callback)
	{
		if (typeof callback === "function")
		{
			callbacks.set(choiceKey, callback);
			if (data.has(choiceKey) === false)
			{
				data.set(choiceKey, undefined);
			}
		}
	};

	/**
	 * Returns the current value of a chioce.
	 * @param {String} choiceKey Choice key of the requested choice
	 * @returns {String?} Current value of the choice
	 */
	this.get = function (choiceKey)
	{
		return data.get(choiceKey);
	};

	/**
	 * Sets the value of a chioce. Also calls the callback for that choice key, if defined.
	 * @param {String} choiceKey Choice key of the choice to set
	 * @param {String} value Value to set for the choice
	 * @param {Event} [event] Event that triggered the choice
	 */
	this.set = function (choiceKey, value, event)
	{
		let choiceGroupElement = document.body.querySelector("[data-choice='" + choiceKey + "']");
		if (!!choiceGroupElement)
		{
			let choiceElement = choiceGroupElement.querySelector("[data-choice-value='" + value + "']");
			let choiceClientElement = document.body.querySelector("[data-choice-client='" + value + "']");
			for (let otherChoiceElement of choiceGroupElement.querySelectorAll(".chosen"))
			{
				otherChoiceElement.classList.remove("chosen");
				let otherChoiceClientElement = document.body.querySelector("[data-choice-client='" + otherChoiceElement.dataset.choiceValue + "']");
				otherChoiceClientElement?.classList.remove("chosen");
			}
			choiceElement?.classList.add("chosen");
			choiceClientElement?.classList.add("chosen");
			data.set(choiceKey, value);
			if (callbacks.has(choiceKey))
			{
				callbacks.get(choiceKey)(value, (event instanceof Event));
			}
		}
		else
		{
			console.warn("Unknown choice '" + choiceKey + "'");
		}
	};
};

/**
 * Easy tool to manage 'check' elements.
 * Just get an element a `data-check` attribute, then on any mouse click it will toggle the 'checked' state.
 */
let checks = new function ()
{
	window.addEventListener("click", (mouseEvent) =>
	{
		let checkElement = mouseEvent.target.closest("[data-check]");
		if (!!checkElement)
		{
			checkElement.classList.toggle("checked");
		}
	});

	/**
	 * Returns all elements that are 'checked'.
	 * @param {HTMLElement} [element] Element to get all checked child elements; entire document body if omitted
	 * @returns {Array<String>} Array with the data values of all checked elements within the element
	 */
	this.getAllChecked = function (element = document.body)
	{
		/** @type {Array<String>} */
		let result = [];
		for (let e of element.querySelectorAll(".checked[data-check]"))
		{
			result.push(e.dataset.check);
		}
		return result;
	};

	/**
	 * Gets the 'checked' state of an element.
	 * @param {HTMLElement} element Element to get the 'checked' state
	 * @return {Boolean} `true` if the element is checked, otherwiese `false`
	 */
	this.isChecked = function (element)
	{
		return element.classList.contains("checked");
	};

	/**
	 * Sets the 'checked' state of an element.
	 * @param {HTMLElement} element Element to set the 'checked' state
	 * @param {Boolean} [isChecked] `true` if the element shall be checked (default), `false` if it shall be unchecked
	 */
	this.setChecked = function (element, isChecked = true)
	{
		(isChecked === true) ? element.classList.add("checked") : element.classList.remove("checked");
	};
};

/**
 * Detector for popping on/off virtual keyboard.
 */
let vikb = new function ()
{
	let orgHeight = window.innerHeight;

	/**
	 * Registered event listeners
	 * @type {Array<vikbCallback>} */
	let listeners = [];

	window.addEventListener("resize", () =>
	{
		let event = (window.innerHeight < orgHeight) ? "opened" : "closed";
		for (let listener of listeners)
		{
			listener(event);
		}
	});

	/**
	 * Register an event handler to call on virtaul keyboard popping on/off.
	 * @param {vikbCallback} callback `function(event: String)` to call; where `event` is either `"opened"` or `"closed"`
	 */
	this.addEventListener = function (callback)
	{
		if ((!listeners.includes(callback)) && (typeof callback === "function"))
		{
			listeners.push(callback);
		}
	};
};
