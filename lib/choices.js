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
const choices = function ()
{
	/**
	 * HashMap of choice callbacks
	 * @type {Object<String, ChoiceCallback>} */
	let callbacks = {};
	/**
	 * HashMap of choice values
	 * @type {Object<String, String>} */
	let data = {};

	/**
	 * Register an event handler to call when an item of a certain choice is made.
	 * @param {String} choiceKey Choice key to act on
	 * @param {ChoiceCallback} callbackFunction `function(choiceKey: String, [event: Event])` to call on choice
	 */
	function onChoose (choiceKey, callbackFunction)
	{
		if (typeof callbackFunction === "function")
		{
			callbacks[choiceKey] = callbackFunction;
			if (data.hasOwnProperty(choiceKey) === false)
			{
				data[choiceKey] = undefined;
			}
		}
	}

	/**
	 * Sets chioce to an item of a chioce.
	 * @param {String} choiceKey Choice key of the current choice
	 * @param {String} value Item key of the current choice
	 * @param {Event} [event] Event that triggered the choice
	 */
	function setChoice (choiceKey, value, event)
	{
		console.log("set choice", choiceKey, value);
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
	}

	window.addEventListener("click", (mouseEvent) =>
	{
		let choiceElement = mouseEvent.target.closest("[data-choice-value]");
		if (!!choiceElement)
		{
			let choiceGroupElement = choiceElement.closest("[data-choice]");
			if (!!choiceGroupElement)
			{
				setChoice(choiceGroupElement.dataset.choice, choiceElement.dataset.choiceValue, mouseEvent);
			}
		}
	});

	return {
		get keys () { return Object.keys(data).sort(); },
		/**
		 * Returns the value of a choice.
		 * @param {String} choiceKey Choice to get value for
		 * @returns {String} Value of the request choice
		 */
		get: (choiceKey) => { return data[choiceKey]; },
		/**
		 * Sets the value of a choice. Triggers the choices callbackFunction, if any.
		 * @param {String} choiceKey Choice to set it's value
		 * @param {String} value Value to set
		 */
		set: (choiceKey, value) => { setChoice(choiceKey, value); },
		onChoose: onChoose
	};
}();

/**
 * Easy tool to manage 'check' elements.
 * Just get an element a `data-check` attribute, then on any mouse click it will toggle the 'checked' state.
 */
const checks = function ()
{
	/**
	 * Returns all elements that are 'checked'.
	 * @param {HTMLElement} element Element to get all checked child elements
	 * @returns {Array<String>} Array with the data-names of all checked elements within the element
	 */
	function getAllChecked (element = document.body)
	{
		let checkKeys = [];
		for (let e of element.querySelectorAll(".checked"))
		{
			checkKeys.push(e.dataset.check);
		}
		return checkKeys;
	}

	/**
	 * Sets the 'checked' state of an element.
	 * @param {HTMLElement} element Element to set the 'checked' state
	 * @param {Boolean} [isChecked=true] `true` if the element shall be checked (default), `false` if it shall be unchecked
	 */
	function setChecked (element, isChecked = true)
	{
		(isChecked === true) ? element.classList.add("checked") : element.classList.remove("checked");
	}

	window.addEventListener("click", (mouseEvent) =>
	{
		let checkElement = mouseEvent.target.closest("[data-check]");
		if (!!checkElement)
		{
			checkElement.classList.toggle("checked");
		}
	});

	return {
		getAllChecked: getAllChecked,
		setChecked: setChecked
	};
}();
