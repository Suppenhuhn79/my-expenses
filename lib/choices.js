const choices = function ()
{
	let callbacks = {};
	let data = {};

	function onChoose (choiceGroupKey, callbackFunction)
	{
		if (typeof callbackFunction === "function")
		{
			callbacks[choiceGroupKey] = callbackFunction;
		}
	};

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

const checks = function ()
{
	function getAllChecked (element = document.body)
	{
		let checkKeys = [];
		for (let e of element.querySelectorAll(".checked"))
		{
			checkKeys.push(e.dataset.check);
		}
		return checkKeys;
	}

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
