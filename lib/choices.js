const choices = function ()
{
	/**
	 * @callback choiseCallback
	 * @param {String} choiceKey Key of chosen item
	 * @param {Event} [event] Event that eventually triggered the choise
	 */
	let callbacks = {};
	let data = {};

	/**
	 * Register an event handler to call when an item of a certain choive group is chosen.
	 * @param {String} choiceGroupKey choice group key to act on
	 * @param {choiseCallback} callbackFunction `function(choiceKey: String, [event: Event])` to call on choice
	 */
	function onChoose (choiceGroupKey, callbackFunction)
	{
		if (typeof callbackFunction === "function")
		{
			callbacks[choiceGroupKey] = callbackFunction;
		}
	};

	/**
	 * 
	 * @param {String} choiceGroupKey group key of the curent choice
	 * @param {String} choiseKey item key of the current choice
	 * @param {Event} [event] event that triggered the choice
	 */
	function choose (choiceGroupKey, choiseKey, event)
	{
		let choiceGroupElement = document.body.querySelector("[data-choice-group='" + choiceGroupKey + "']");
		// console.trace(choiceGroupKey, choiceGroupElement, choiseKey, choiceElement);
		if (!!choiceGroupElement) // && ((!!choiceElement) || (!mustExists)))
		{
			let choiceElement = choiceGroupElement.querySelector("[data-choice='" + choiseKey + "']");
			data[camelCase(choiceGroupKey)] = choiseKey;
			// console.log("chosen '" + choiceGroupKey + "' is " + choiseKey);
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
	};

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
 * Easy tool to manage 'check' elements. Just get an element a `data-check` attribute, then on any mouse click it will toggle the 'checked' state.
 */
const checks = function ()
{
	/**
	 * Returns all elements that are 'checked'.
	 * @param {HTMLElement} element element to get all checked child elements from
	 * @returns {Array<String>} array with the data-names of all checked elements within the element
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
	 * @param {HTMLElement} element element to set the 'checked' state
	 * @param {Boolean} [isChecked=true] whether the element is checked (`true`, default) or not checked (`false`)
	 */
	function setChecked (element, isChecked = true)
	{
		(isChecked === true) ? element.classList.add("checked") : element.classList.remove("checked");
	};

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
