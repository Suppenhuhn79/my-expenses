/**
 * Action to be profomed out of the expense editor.
 * @enum {string}
 */
const ExpenseEditorAction = {
	/** A new expense is to be added. */
	ADD: "add",
	/** An existing expense is being modified. */
	MODIFY: "modify",
	/** An existing expense is to be deleted. */
	DELETE: "delete",
	/** Changes to an repeating expense are being made or a new repeating expense is being created. */
	REPEATING: "repeating",
	/** No changed are being made. */
	NONE: "none"
};

/**
 * Operation mode of the expense editor.
 * @enum {string}
 */
const ExpenseEditorMode = {
	/** An actual or new expense is being edited. */
	DEFAULT: "default",
	/** A repeating expense is being edited. */
	REPEATING: "repeat"
};

/**
 * @callback ExpenseEditorCallback
 * Function to call on an expense editor action (apply edits, delete expense etc.).
 * @param {Expense} editedExpense Expense with the edited properties.
 * @param {keyof ExpenseEditorAction} action Action to perform (one fo the values of `ExpenseEditorAction`).
 */

/**
 * my-expenses "expense editor" module.
 */
function expenseEditor ()
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
	}).getNamedChildren();

	/**
	 * Name of the tab that called the editor.
	 * @type {string} */
	let originTabName;

	/**
	 * Expense with in the editor currently set values.
	 * @type {Expense} */
	let currentItem;

	/**
	 * Current index of the expense in the expenses `data`. Does indicates whether an existing expense (a non-negative integer)
	 * or a new/cloned expense (`null`) is being edited.
	 * @type {number?} */
	let currentDataIndex;

	/**
	 * Repeating interval for the currently edited expense.
	 * @type {RepeatingInterval} */
	let editedInterval;

	/**
	 * Function to call when edits are applied.
	 * @type {ExpenseEditorCallback} */
	let callbackFunc;

	/**
	 * Category selector.
	 * @type {CategorySelector} */
	let categorySelector;

	let tabMode = new TabModeHandler(elements.get());

	let confirmDeletePrompt = new Menubox("delete-expense", {
		items: [],
		buttons: [
			{ key: "delete" },
			{ key: "cancel" }
		]
	}, onConfirmDelete);
	let decimalSeparator = (1.2).toLocaleString().substring(1, 2);
	let amountAsString = "0";

	FA.applyOn(elements.get());
	elements.get("decimal-separator").innerText = decimalSeparator;
	elements.get("dat").setAttribute("max", (new Date()).format("yyyy-mm-dd"));
	vikb.addEventListener((event) =>
	{
		(event === "opened") ? elements.get("keypad").classList.add("hidden") : elements.get("keypad").classList.remove("hidden");
	});
	document.getElementById("client").appendChild(elements.get());

	/**
	 * Checks if an existing expense is being edited. For an existing expense `currentDataIndex` is a non-negative integer.
	 * @returns {boolean} `true` if an existing expense is being edited, otherwise `false`.
	 */
	function isExistingExpense ()
	{
		return ((typeof currentDataIndex === "number") && (currentDataIndex >= 0));
	}

	/**
	 * Checks if an element is enabled (having or having not the `"disabled"` CSS class).
	 * @param {HTMLElement} element Element to check if it is enabled.
	 * @return {boolean} Whether the element is enabled (`true`) or not (`false`).
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
		 * @param {boolean} enabled
		 */
		function _setElementEnabled (element, enabled)
		{
			(enabled) ? element.classList.remove("disabled") : element.classList.add("disabled");
		}
		let isExisting = isExistingExpense();
		let isRepeatingMode = (tabMode.is(ExpenseEditorMode.REPEATING));
		_setElementEnabled(elements.get("clone"), isExisting);
		_setElementEnabled(elements.get("redo"), isExisting);
		_setElementEnabled(elements.get("delete"), (isExisting || isRepeatingMode));
		_setElementEnabled(elements.get("apply"), (myx.categories.data.has(currentItem.cat)));
		elements.get("title").innerText = (isRepeatingMode) ? "set repeating expense" : ((isExisting) ? "edit expense" : "add expense");
		elements.get("dat").value = currentItem.dat.format("yyyy-mm-dd");
		if (editedInterval.isValid())
		{
			if (isRepeatingMode)
			{
				htmlBuilder.replaceContent(
					elements.get("repeating-text"),
					pageSnippets.expenseEditor.repeatmentLine.produce(expenseEditor, { dayOfMonth: editedInterval.dayOfMonth, months: editedInterval.months })
				);
			}
			else
			{
				elements.get("repeating-button-overlay").innerHTML = "/" + editedInterval.getSupershortText();
				elements.get("repeating-button-overlay").style.display = null;
			}
		}
		else
		{
			elements.get("repeating-button-overlay").style.display = "none";
		}
	};

	/**
	 * Switches from _default_ mode to _repeat_ mode. In repeat mode the repeating expense is edited, no more the original actual expense.
	 *
	 * This is an one way action.
	 */
	function switchToRepeatMode ()
	{
		tabMode.set(ExpenseEditorMode.REPEATING);
		currentItem.dat = myx.repeatings.lastExecutionDateOf(currentItem.rep) || currentItem.dat;
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
		elements.get("amt").innerText = Math.floor(amountAsString).toLocaleString() + ((!!rexMatch[2]) ? decimalSeparator + rexMatch[3] : "") + "\u00a0" + myx.currencySymbol;
	}

	/**
	* Renders the payment method element.
	*/
	function renderPaymentmethod ()
	{
		let pmt = myx.paymentMethods.get(currentItem.pmt);
		let div = htmlBuilder.newElement("div.cutoff",
			pmt.renderLabeledIcon()
		);
		htmlBuilder.replaceContent(elements.get("pmt"), div);
	};

	/**
	 * Sets the expense editor the current UI tab.
	 * @param {Expense} [item] Expense to edit. If omited, a new expense is being created.
	 * @param {number} [dataIndex] Index of the expense in the expenses `data`.
	 * @param {ExpenseEditorCallback} callback Function to call on applying edits.
	 */
	function popup (item, dataIndex, callback)
	{
		originTabName = choices.get("active-tab");
		currentItem = new Expense(item);
		currentDataIndex = dataIndex;
		editedInterval = myx.repeatings.intervalOf(currentItem.rep);
		console.log("editor:", currentItem, editedInterval);
		callbackFunc = callback;
		renderPaymentmethod();
		let amountBits = currentItem.amt.toString().split(".");
		amountAsString = amountBits[0] + ((amountBits[1]) ? "." + (amountBits[1] + "00").substring(0, 2) : "");
		renderAmountText();
		elements.get("txt").value = currentItem.txt || "";
		choices.set("active-tab", "expense-editor");
		categorySelector = new CategorySelector(onCategorySelected, { class: "wide-flex" });
		htmlBuilder.replaceContent(
			elements.get("category-selector"),
			categorySelector.element
		);
		if ((!isExistingExpense()) && (myx.repeatings.intervalOf(currentItem.rep).isValid()))
		{
			switchToRepeatMode();
		}
		else
		{
			tabMode.set(ExpenseEditorMode.DEFAULT);
			refreshEditor();
		}
		categorySelector.refresh(currentItem.cat);
	};

	/**
	 * Event handler for clicking the "clone" button.
	 * Creates a clone of the currently edited expense.
	 */
	function onCloneClick ()
	{
		if (isEnabled(elements.get("clone")))
		{
			currentDataIndex = null;
			currentItem.dat = new Date();
			refreshEditor();
			myx.showNotification("Expense copied.");
		}
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
	 * @param {Event} event Triggering event.
	 */
	function onDatChange (event)
	{
		event.stopPropagation();
		currentItem.dat = new Date(elements.get("dat").value);
	};

	/**
	 * Event handler for clicking on the "payment method" button.
	 * Pops up a menubox for selecting a payment method and applys the selection to the currently edited expense.
	 * @param {Event} event Triggering event.
	 */
	function onPmtClick (event)
	{
		event.stopPropagation();
		myx.paymentMethods.prompt(elements.get("pmt"), (pmt) =>
		{
			currentItem.pmt = pmt;
			renderPaymentmethod();
		});
	};

	/**
	 * Event handler for key strikes while the annotation text is focused. Handles certain keys to leave the input.
	 * @param {KeyboardEvent} keyEvent Triggering event.
	 */
	function onTxtKeydown (keyEvent)
	{
		if (["Escape", "Enter"].includes(keyEvent.code))
		{
			elements.get("txt").blur();
		};
	};

	/**
	 * Event handler for clicking the "redo" button.
	 * Switches to _repeat_ mode.
	 */
	function onRedoClick ()
	{
		if (isEnabled(elements.get("redo")))
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
		if (isEnabled(elements.get("delete")))
		{
			confirmDeletePrompt.setTitle((tabMode.is(ExpenseEditorMode.REPEATING)) ? "Confirm delete of repetition" : "Confirm delete of expense");
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
			if (tabMode.is(ExpenseEditorMode.REPEATING))
			{
				myx.repeatings.set(currentItem.rep, null, null);
				callbackFunc(null, ExpenseEditorAction.NONE);
			}
			else
			{
				callbackFunc(null, ExpenseEditorAction.DELETE);
			}
			myx.showNotification("Expense deleted.");
		}
	};

	/**
	 * Event handler for clicking any button on the keypad (numbers, actions etc.).
	 * @param {Event} mouseEvent Triggering event.
	 */
	function onKeypadClick (mouseEvent)
	{
		let code = mouseEvent.target.closest("td").dataset.keycode;
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
	 * @param {IdString} catId Id of the selected category
	 */
	function onCategorySelected (catId)
	{
		currentItem.cat = catId;
		refreshEditor();
	};

	/**
	 * Event handler for clicking the "apply" button.
	 */
	function onApplyClick ()
	{
		if (isEnabled(elements.get("apply")))
		{
			/** @type {ExpenseEditorAction} */
			let returnType;
			if (isNaN(Number(amountAsString)))
			{
				window.alert("Is NaN: " + amountAsString);
				return 0;
			}
			currentItem.dat = new Date(elements.get("dat").value);
			currentItem.amt = Number(amountAsString);
			currentItem.txt = elements.get("txt").value;
			currentItem.rep = myx.repeatings.set(currentItem.rep, currentItem, editedInterval);
			if (isExistingExpense())
			{
				returnType = ExpenseEditorAction.MODIFY;
			}
			else if (tabMode.is(ExpenseEditorMode.REPEATING))
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
