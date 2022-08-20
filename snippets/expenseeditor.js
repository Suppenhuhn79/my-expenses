const ExpenseEditorAction = {
	/** @enum {String} */
	ADD: "add",
	MODIFY: "modify",
	DELETE: "delete",
	REPEATING: "repeating",
	NONE: "none"
};

const ExpenseEditorMode = {
	/** @enum {String} */
	DEFAULT: "default",
	REPEATING: "repeat"
};

/**
 * @callback ExpenseEditorCallback
 * @param {Expense} editedExpense Expense with the edited properties
 * @param {ExpenseEditorAction} action Action to perform (add, modify, delete the expense etc.)
 */

/**
 * 
 * @param {repeatingExpenses} repeatingExpenses 
 * @param {HTMLElement} targetElement 
 * @returns 
 */
let expenseEditor = function (repeatingExpenses, targetElement)
{
	let elements = pageSnippets.expenseEditor.produce({
		onApplyClick: onApplyClick,
		onCancelClick: onCancelClick,
		onCloneClick: onCloneClick,
		onDatChange: onDatChange,
		onDeleteClick: onDeleteClick,
		onKeypadClick: onKeypadClick,
		onPmtClick: onPmtClick,
		onRedoClick: onRedoClick,
		onTxtKeydown: onTxtKeydown
	}).getNames();
	/**
	 * Name of the tab that called the editor.
	 * @type {String} */
	let originTabName;
	/**
	 * Expense with in the editor currently set values.
	 * @type {Expense} */
	let currentItem;
	/**
	 * Current index of the expense in the expenses `data`. Does indicates whether an existing expense (a non-negative integer)
	 * or a new/cloned expense (`null`) is being edited.
	 * @type {Number?} */
	let currentDataIndex;
	/**
	 * Repeating interval for the currently edited expense.
	 * @type {RepeatingInterval} */
	let editedInterval;
	/**
	 * Function to call when edits are applied.
	 * @type {ExpenseEditorCallback} */
	let callbackFunc;
	let modeHandler = new ModuleModeHandler(elements._self);
	let confirmDeletePrompt = new Menubox("delete-expense", {
		title: "Confirm delete expense",
		items: [],
		buttons: [
			{ key: "delete" },
			{ key: "cancel" }
		]
	}, onConfirmDelete);
	let decimalSeparator = (1.2).toLocaleString().substring(1, 2);
	let amountAsString = "0";

	elements.decimalSeparator.innerText = decimalSeparator;
	elements.dat.setAttribute("max", (new Date()).format("yyyy-mm-dd"));
	vikb.addEventListener((event) =>
	{
		(event === "opened") ? elements.keypad.classList.add("hidden") : elements.keypad.classList.remove("hidden");
	});
	targetElement.appendChild(elements._self);

	/**
	 * Checks if an existing expense is being edited. For an existing expense `currentDataIndex` is a non-negative integer.
	 * @returns {Boolean} `true` if an existing expense is being edited, otherwise `false`
	 */
	function isExistingExpense ()
	{
		return ((typeof currentDataIndex === "number") && (currentDataIndex >= 0));
	}

	/**
	 * Checks if an element is enabled (having or having not the `"disabled"` CSS class.).
	 * @param {HTMLElement} element Element to check if it is enabled
	 * @return {Boolean} Whether the element is enabled (`true`) or not (`false`)
	 */
	function isEnabled (element)
	{
		return (!element.classList.contains("disabled"));
	}

	/**
	 * Refreshes the editor UI. Set buttons enabled/disabled, updates values etc.
	 */
	function refreshEditor ()
	{
		/**
		 * Sets an element enabled/disabled by toggeling the `"disabled"` CSS class.
		 * @param {HTMLElement} element 
		 * @param {Boolean} enabled 
		 */
		function _setElementEnabled (element, enabled)
		{
			(enabled) ? element.classList.remove("disabled") : element.classList.add("disabled");
		}
		let isExisting = isExistingExpense();
		let isRepeatingMode = (modeHandler.currentMode === ExpenseEditorMode.REPEATING);
		_setElementEnabled(elements.clone, isExisting);
		_setElementEnabled(elements.redo, isExisting);
		_setElementEnabled(elements.delete, (isExisting || isRepeatingMode));
		_setElementEnabled(elements.apply, (!!currentItem.cat));
		elements.title.innerText = (isRepeatingMode) ? "set repeating expense" : ((isExisting) ? "edit expense" : "add expense");
		elements.dat.value = currentItem.dat.format("yyyy-mm-dd");
		if (editedInterval.isValid())
		{
			if (isRepeatingMode)
			{
				htmlBuilder.replaceContent(
					elements.repeatingText,
					pageSnippets.expenseEditor.repeatmentLine.produce(expenseEditor, { dayOfMonth: editedInterval.dayOfMonth, months: editedInterval.months })
				);
			}
			else
			{
				elements.repeatingButtonOverlay.innerHTML = "/" + editedInterval.getSupershortText();
				elements.repeatingButtonOverlay.style.display = null;
			}
		}
		else
		{
			elements.repeatingButtonOverlay.style.display = "none";
		}
	};

	/**
	 * Switches from _default_ mode to _repeat_ mode. In repeat mode the repeating expense is edited, no more the original actual expense.
	 * This is a one way action.
	 */
	function switchToRepeatMode ()
	{
		modeHandler.setMode(ExpenseEditorMode.REPEATING);
		currentItem.dat = repeatingExpenses.lastExecutionDateOf(currentItem.rep) || currentItem.dat;
		if (editedInterval.isValid() === false)
		{
			editedInterval = new RepeatingInterval({ months: 1, dayOfMonth: currentItem.dat.getDate() });
		}
		refreshEditor();
	}

	/**
	 * Updates the displayed expense amount text.
	 */
	function renderAmountText ()
	{
		let rexMatch = /([0-9]+)(\.([0-9]{0,2}))?/.exec(amountAsString);
		elements.amt.innerText = Math.floor(amountAsString).toLocaleString() + ((!!rexMatch[2]) ? decimalSeparator + rexMatch[3] : "") + "\u00a0" + myx.currencySymbol;
	}

	/**
	* Renders the payment method element.
	*/
	function renderPaymentmethod ()
	{
		let div = htmlBuilder.newElement("div.labeled-icon",
			myx.paymentMethods.renderIcon(currentItem.pmt),
			htmlBuilder.newElement("div.label.cutoff", myx.paymentMethods.getLabel(currentItem.pmt))
		);
		htmlBuilder.replaceContent(elements.pmt, div);
	};

	/**
	 * Sets the expense editor the current UI tab.
	 * @param {Expense} [item] Expense to edit. If omited, a new expense is being created.
	 * @param {Number} [dataIndex] Index of the expense in the expenses `data`
	 * @param {ExpenseEditorCallback} callback Function to call on applying edits.
	 */
	function popup (item, dataIndex, callback)
	{
		originTabName = choices.get("active-tab");
		currentItem = new Expense(item);
		currentDataIndex = dataIndex;
		editedInterval = repeatingExpenses.intervalOf(currentItem.rep);
		console.log("editor:", currentItem, editedInterval);
		callbackFunc = callback;
		renderPaymentmethod();
		let amountBits = currentItem.amt.toString().split(".");
		amountAsString = amountBits[0] + ((amountBits[1]) ? "." + (amountBits[1] + "00").substring(0, 2) : "");
		renderAmountText();
		elements.txt.value = currentItem.txt || "";
		choices.set("active-tab", "expense-editor");
		myx.categories.renderSelection(elements.categorySelector, currentItem.cat, onCategoryChosen);
		if ((!isExistingExpense()) && (repeatingExpenses.intervalOf(currentItem.rep).isValid()))
		{
			switchToRepeatMode();
		}
		else
		{
			modeHandler.setMode(ExpenseEditorMode.DEFAULT);
			refreshEditor();
		}
	};

	/**
	 * Event handler for clicking the "clone" button.
	 * Creates a clone of the currently edited expense.
	 */
	function onCloneClick ()
	{
		currentDataIndex = null;
		currentItem.dat = new Date();
		refreshEditor();
	};

	/**
	 * Event handler for clicking the "cancel" button.
	 * Closes the editor with all changes discarded.
	 */
	function onCancelClick () 
	{
		choices.set("active-tab", originTabName);
	};

	/**
	 * Event handler for changing the expense date.
	 */
	function onDatChange (event)
	{
		event.stopPropagation();
		currentItem.dat = new Date(elements.dat.value);
	};

	/**
	 * Event handler for clicking on the "payment method" button.
	 * Pops up a menubox for selecting a payment method and applys the selection to the currently edited expense.
	 */
	function onPmtClick (event) 
	{
		event.stopPropagation();
		myx.paymentMethods.prompt(elements.pmt, (pmt) =>
		{
			currentItem.pmt = pmt;
			renderPaymentmethod();
		});
	};

	/**
	 * Event handler for key strikes while the annotation text is focused. Handles certain keys to leave the input.
	 */
	function onTxtKeydown (keyEvent) 
	{
		switch (keyEvent.keyCode)
		{
			case 13:
			case 27:
				elements.txt.blur();
				break;
		};
	};

	/**
	 * Event handler for clicking the "redo" button.
	 * Switches to _repeat_ mode.
	 */
	function onRedoClick () 
	{
		if (isEnabled(elements.redo))
		{
			switchToRepeatMode();
		}
	}

	/**
	 * Event handler for clicking the "delete" button.
	 * Pops up a prompt to confirm or cancel the deletion of the expense or repeating.
	 */
	function onDeleteClick (mouseEvent) 
	{
		if (isEnabled(elements.delete))
		{
			confirmDeletePrompt.popup(mouseEvent, null, mouseEvent.target.closest("td"), "start left, above bottom");
		}
	};

	/**
	 * Event handler for clicking a button in the deletion confirmation prompt.
	 */
	function onConfirmDelete (menuboxEvent)
	{
		if (menuboxEvent.buttonKey === "delete")
		{
			if (modeHandler.currentMode === ExpenseEditorMode.REPEATING)
			{
				repeatingExpenses.set(currentItem.rep, null, null);
				callbackFunc(null, ExpenseEditorAction.NONE);
			}
			else
			{
				callbackFunc(null, ExpenseEditorAction.DELETE);
			}
		}
	};

	/**
	* Event handler for clicking any button on the keypad (numbers, actions etc.)
	*/
	function onKeypadClick (mouseEvent)
	{
		let code = mouseEvent.target.dataset.keycode;
		switch (code)
		{
			case "__clearall__":
				amountAsString = "";
				break;
			case "__backspace__":
				amountAsString = amountAsString.substring(0, amountAsString.length - 1);
				break;
			default:
				amountAsString = (((amountAsString === "0") && (code !== ".")) ? "" : amountAsString) + code;
		}
		amountAsString = (/([0-9]+)(\.([0-9]{0,2}))?/.exec(amountAsString) || "0")[0];
		renderAmountText();
	};

	/**
	 * Event handler for chosing a category. Applies the choice to the currently edited expense.
	 */
	function onCategoryChosen (catId)
	{
		currentItem.cat = catId;
		refreshEditor();
	};

	/**
	 * Event handler for clicking the "apply" button.
	 */
	function onApplyClick ()
	{
		if (isEnabled(elements.apply))
		{
			/** @type {ExpenseEditorAction} */
			let returnType;
			if (isNaN(Number(amountAsString)))
			{
				window.alert("Is NaN: " + amountAsString);
				return 0;
			}
			currentItem.dat = new Date(elements.dat.value);
			currentItem.amt = Number(amountAsString);
			currentItem.txt = elements.txt.value;
			currentItem.rep = repeatingExpenses.set(currentItem.rep, currentItem, editedInterval);
			if (isExistingExpense())
			{
				returnType = ExpenseEditorAction.MODIFY;
			}
			else if (modeHandler.currentMode === ExpenseEditorMode.REPEATING)
			{
				returnType = ExpenseEditorAction.REPEATING;
			}
			else
			{
				returnType = ExpenseEditorAction.ADD;
			}
			callbackFunc(currentItem, returnType);
		}
	};

	return { // public interface
		popup: popup
	};
};
