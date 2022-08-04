const expenseEditor = function (repeatingExpenses, targetElement)
{
	let elements = pageSnippets.expenseEditor.produce().getNames();
	let originTabName;
	let originalMonth;
	let originalIndex;
	let originalItem;
	let currentItem;
	let callbackFunc;
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

	elements.clone.onclick = (mouseEvent) =>
	{
		originalIndex = null;
		currentItem.dat = new Date();
		checkCapatibilities();
	};
	elements.cancel.onclick = (mouseEvent) =>
	{
		choices.set("active-tab", originTabName);
	};
	elements.dat.onchange = (event) =>
	{
		event.stopPropagation();
		currentItem.dat = new Date(elements.dat.value);
	};
	elements.pmt.onclick = (event) =>
	{
		event.stopPropagation();
		myx.paymentMethods.prompt(elements.pmt, (pmt) =>
		{
			currentItem.pmt = pmt;
			renderPmt();
		});
	};
	elements.txt.onkeydown = (keyEvent) =>
	{
		switch (keyEvent.keyCode)
		{
			case 13:
			case 27:
				elements.txt.blur();
				break;
		};
	};
	elements.redo.onclick = (mouseEvent) =>
	{
		if (!elements.delete.classList.contains("disabled"))
		{
			if ((currentItem.interval?.months > 0) || (currentItem.interval?.weeks > 0))
			{
				delete currentItem.interval;
			}
			else
			{
				currentItem.interval = { months: 1 };
			}
			checkCapatibilities();
		}
	};
	elements.delete.onclick = (mouseEvent) =>
	{
		if (!elements.delete.classList.contains("disabled"))
		{
			confirmDeletePrompt.popup(mouseEvent, null, mouseEvent.target.closest("td"), "start left, above bottom");
		}
	};
	elements.keypad.onclick = (mouseEvent) =>
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
		setAmountText();
	};
	elements.apply.onclick = apply;

	vikb.addEventListener((event) =>
	{
		(event === "opened") ? elements.keypad.classList.add("hidden") : elements.keypad.classList.remove("hidden");
	});

	function checkCapatibilities ()
	{
		for (let name of ["clone", "redo", "delete"])
		{
			(typeof originalIndex === "number") ? elements[name].classList.remove("disabled") : elements[name].classList.add("disabled");
		}
		(currentItem.cat) ? elements.apply.classList.remove("disabled") : elements.apply.classList.add("disabled");
		elements.title.innerText = (typeof originalIndex === "number") ? "edit expense" : "add expense";
		elements.dat.value = currentItem.dat.toIsoFormatText("YMD");
		if ((currentItem.interval?.months > 0) || (currentItem.interval?.weeks > 0))
		{
			elements.repeatingButtonOverlay.innerHTML = repeatingExpenses.getSupershortIntervalText(currentItem.interval);
			elements.repeatingButtonOverlay.style.display = null;
		}
		else
		{
			elements.repeatingButtonOverlay.style.display = "none";
		}
		// TODO: capatibilities for preview of repeating expenses
	};

	function setAmountText ()
	{
		let rexMatch = /([0-9]+)(\.([0-9]{0,2}))?/.exec(amountAsString);
		elements.amt.innerText = Math.floor(amountAsString).toLocaleString() + ((!!rexMatch[2]) ? decimalSeparator + rexMatch[3] : "") + "\u00a0" + myx.currencySymbol;
	}

	function renderPmt ()
	{
		let div = htmlBuilder.newElement("div.labeled-icon",
			myx.paymentMethods.renderIcon(currentItem?.pmt || myx.paymentMethods.defaultPmt),
			htmlBuilder.newElement("div.label.cutoff", myx.paymentMethods.getLabel(currentItem.pmt))
		);
		htmlBuilder.replaceContent(elements.pmt, div);
	};

	function popup (item, dataMonth, dataIndex, callback)
	{
		originTabName = choices.get("active-tab");
		originalItem = JSON.stringify(item);
		currentItem = Object.assign({
			dat: new Date(),
			amt: 0,
			cat: null,
			pmt: myx.paymentMethods.defaultPmt
		}, item);
		originalMonth = dataMonth;
		originalIndex = dataIndex;
		callbackFunc = callback;
		renderPmt();
		let amountBits = currentItem.amt.toString().split(".");
		amountAsString = amountBits[0] + (amountBits[1] ? "." + (amountBits[1] + "00").substring(0, 2) : "");
		setAmountText();
		elements.txt.value = currentItem.txt || "";
		choices.set("active-tab", "expense-editor");
		myx.categories.renderSelection(elements.categorySelector, currentItem.cat, onCategoryChosen);
		checkCapatibilities();
	};

	function onCategoryChosen (catId)
	{
		currentItem.cat = catId;
		checkCapatibilities();
	};

	function onConfirmDelete (menuboxEvent)
	{
		if (menuboxEvent.buttonKey === "delete")
		{
			callbackFunc("delete", currentItem, originalMonth, originalIndex);
		}
	};

	function apply ()
	{
		if (!elements.apply.classList.contains("disabled"))
		{
			if (isNaN(Number(amountAsString)))
			{
				window.alert("Is NaN: " + amountAsString);
				return 0;
			}
			currentItem.dat = new Date(elements.dat.value);
			currentItem.amt = Number(amountAsString);
			currentItem.txt = elements.txt.value || null;
			let callbackMode = (typeof originalIndex === "number") ? "modify" : "append";
			if ((JSON.stringify(currentItem).getHash() === originalItem.getHash()) || (originalIndex < 0))
			{
				callbackMode = "not_modified";
			}
			callbackFunc(callbackMode, currentItem, originalMonth, originalIndex);
		}
	};

	/* =========== constructor =========== */
	elements.decimalSeparator.innerText = decimalSeparator;
	targetElement.appendChild(elements._self);

	return { // public interface
		popup: popup
	};
};
