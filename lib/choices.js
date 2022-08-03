/**
 * @callback ChoiceCallback
 * @param {String} choiceKey Key of chosen item
 * @param {Boolean} interactive `true` the choice was set by a (user) event, otherwise `false`
 */

/**
 * Provides functionality to handle radio selections (one active item at one time).
 * You'll need an element with a `data-choice` attribute and some children with `data-choice-value` attributes.
 * If there is an element with client content linked to the choice, get it a `data-choice-client` attribute with
 * the same value as the _data-choice_.
 */
const choices = new function ()
{
	/**
	 * HashMap of choice callbacks
	 * @type {Object<String, ChoiceCallback>} */
	let callbacks = {};
	/**
	 * HashMap of choice values
	 * @type {Object<String, String>} */
	let data = {};

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
	 * Register an event handler to call when an item of a certain choice is made.
	 * @param {String} choiceKey Choice key to act on
	 * @param {ChoiceCallback} callbackFunction `function(choiceKey: String, [event: Event])` to call on choice
	 */
	this.onChoose = function (choiceKey, callbackFunction)
	{
		if (typeof callbackFunction === "function")
		{
			callbacks[choiceKey] = callbackFunction;
			if (data.hasOwnProperty(choiceKey) === false)
			{
				data[choiceKey] = undefined;
			}
		}
	};

	/**
	 * Returns the current value of a chioce.
	 * @param {String} choiceKey Choice key of the requested choice
	 * @returns {String} Current value of the choice
	 */
	this.get = function (choiceKey)
	{
		return data[choiceKey];
	};

	/**
	 * Sets chioce to an item of a chioce.
	 * @param {String} choiceKey Choice key of the current choice
	 * @param {String} value Item key of the current choice
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
			data[choiceKey] = value;
			callbacks[choiceKey]?.(value, (event instanceof Event));
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
const checks = new function ()
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
	 * @param {HTMLElement} element Element to get all checked child elements
	 * @returns {Array<String>} Array with the data-names of all checked elements within the element
	 */
	this.getAllChecked = function (element = document.body)
	{
		let checkKeys = [];
		for (let e of element.querySelectorAll(".checked"))
		{
			checkKeys.push(e.dataset.check);
		}
		return checkKeys;
	};

	/**
	 * Gets the 'checked' state of an element.
	 * @param {HTMLElement} element Element to set the 'checked' state
	 * @return {Boolean} `true` if the element is checked, otherwiese `false`
	 */
	this.isChecked = function (element)
	{
		return element.classList.contains("checked");
	};

	/**
	 * Sets the 'checked' state of an element.
	 * @param {HTMLElement} element Element to set the 'checked' state
	 * @param {Boolean} [isChecked=true] `true` if the element shall be checked (default), `false` if it shall be unchecked
	 */
	this.setChecked = function (element, isChecked = true)
	{
		(isChecked === true) ? element.classList.add("checked") : element.classList.remove("checked");
	};
};
