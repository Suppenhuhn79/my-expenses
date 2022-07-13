/**
 * Provides functionality to handle radio selections (one active item at one time).
 * You'll need an element with a `data-choice-group` attribute and some children with `data-choice` attributes.
 * If there is an element with client content linked to the choice, get it a `data-choice-client` attribute with
 * the same value as the _data-choice_.
 *
 * @callback ChoiseCallback
 * @param {String} choiceKey Key of chosen item
 * @param {Event} [event] Event that triggered the choise, if any
 */
const choices = function ()
{
	/**
	 * HashMap of choice-group callbacks
	 * @type {Object<String, ChoiseCallback>} */
	let callbacks = {};
	/**
	 * HashMap of choice values
	 * @type {Object<String, String>} */
	let data = {};

	/**
	 * Register an event handler to call when an item of a certain choice group is chosen.
	 * @param {String} choiceGroupKey Choice group key to act on
	 * @param {ChoiseCallback} callbackFunction `function(choiceKey: String, [event: Event])` to call on choice
	 */
	function onChoose (choiceGroupKey, callbackFunction)
	{
		if (typeof callbackFunction === "function")
		{
			callbacks[choiceGroupKey] = callbackFunction;
		}
	}

	/**
	 * Sets chioce to an item of a chioce group.
	 * @param {String} choiceGroupKey Group key of the current choice
	 * @param {String} choiseKey Item key of the current choice
	 * @param {Event} [event] Event that triggered the choice, if any
	 */
	function choose (choiceGroupKey, choiseKey, event)
	{
		let choiceGroupElement = document.body.querySelector("[data-choice-group='" + choiceGroupKey + "']");
		if (!!choiceGroupElement) // && ((!!choiceElement) || (!mustExists)))
		{
			let choiceElement = choiceGroupElement.querySelector("[data-choice='" + choiseKey + "']");
			data[camelCase(choiceGroupKey)] = choiseKey;
			let choiceClientElement = document.body.querySelector("[data-choice-client='" + choiseKey + "']");
			for (let otherChoiceElement of choiceGroupElement.querySelectorAll(".chosen"))
			{
				otherChoiceElement.classList.remove("chosen");
				let otherChoiceClientElement = document.body.querySelector("[data-choice-client='" + otherChoiceElement.dataset.choice + "']");
				if (!!otherChoiceClientElement)
				{
					otherChoiceClientElement.classList.remove("chosen");
				}
			}
			choiceElement?.classList.add("chosen");
			if (!!choiceClientElement)
			{
				choiceClientElement.classList.add("chosen");
			}
			callbacks[choiceGroupKey]?.(choiseKey, event);
		}
		else
		{
			console.warn("Unknown choice group '" + choiceGroupKey + "'");
		}
	}

	window.addEventListener("click", (mouseEvent) =>
	{
		let choiceElement = mouseEvent.target.closest("[data-choice]");
		if (!!choiceElement)
		{
			let choiceGroupElement = choiceElement.closest("[data-choice-group]");
			if (!!choiceGroupElement)
			{
				choose(choiceGroupElement.dataset.choiceGroup, choiceElement.dataset.choice, mouseEvent);
			}
		}
	});

	return {
		choose: choose,
		get chosen () { return data; },
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
