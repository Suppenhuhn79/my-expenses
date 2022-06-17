const expenseEditor = function (paymentMethods, categories, targetElement)
{
	let elements = getNames(pageSnippets.expenseEditor.produce());
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
	let amountAsString = "0";

	elements.clone.onclick = (mouseEvent) =>
	{
		originalIndex = null;
		currentItem.dat = new Date();
		checkCapatibilities();
	};
	elements.cancel.onclick = (mouseEvent) =>
	{
		choices.choose("active-tab", originTabName);
	};
	elements.dat.onchange = (event) =>
	{
		event.stopPropagation();
		currentItem.dat = new Date(elements.dat.value);
	};
	elements.pmt.onclick = (event) =>
	{
		event.stopPropagation();
		paymentMethods.prompt(elements.pmt, (pmt) =>
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
	elements.delete.onclick = (mouseEvent) =>
	{
		if (!elements.delete.classList.contains("disabled"))
		{
			confirmDeletePrompt.popup(mouseEvent, null, mouseEvent.target, "start left, above bottom");
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
		for (let name of ["clone", "delete"])
		{
			(typeof originalIndex === "number") ? elements[name].classList.remove("disabled") : elements[name].classList.add("disabled");
		}
		(currentItem.cat) ? elements.apply.classList.remove("disabled") : elements.apply.classList.add("disabled");
		elements.title.innerText = (typeof originalIndex === "number") ? "edit expense" : "add expense";
		elements.dat.value = currentItem.dat.toIsoFormatText("YMD");
	};

	function setAmountText ()
	{
		let rexMatch = /([0-9]+)(\.([0-9]{0,2}))?/.exec(amountAsString);
		elements.amt.innerText = formatIntegersLocale(amountAsString) + ((!!rexMatch[2]) ? localeSeparator.decimal + rexMatch[3] : "") + "\u00a0" + myx.currencySymbol;
	}

	function renderPmt ()
	{
		let div = htmlBuilder.newElement("div.labeled-icon",
			paymentMethods.renderIcon(currentItem?.pmt || paymentMethods.defaultPmt),
			htmlBuilder.newElement("div.label.cutoff", paymentMethods.getLabel(currentItem.pmt))
		);
		htmlBuilder.replaceContent(elements.pmt, div);
	};

	function popup (item, dataMonth, dataIndex, callback)
	{
		originTabName = choices.chosen.activeTab;
		originalItem = JSON.stringify(item);
		currentItem = Object.assign({
			dat: new Date(),
			amt: 0,
			cat: null,
			pmt: paymentMethods.defaultPmt
		}, item);
		originalMonth = dataMonth;
		originalIndex = dataIndex;
		callbackFunc = callback;
		renderPmt();
		// elements.title.innerText = (typeof originalIndex === "number") ? "edit expense" : "add expense";
		// elements.dat.value = currentItem.dat.toIsoFormatText("YMD");
		let amountBits = currentItem.amt.toString().split(".");
		amountAsString = amountBits[0] + (amountBits[1] ? "." + (amountBits[1] + "00").substring(0, 2) : "");
		setAmountText();
		elements.txt.value = currentItem.txt || "";
		choices.choose("active-tab", "expense-editor");
		categories.renderSelection(elements.categorySelector, currentItem.cat, onCategoryChosen);
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
			if (stringHash(JSON.stringify(currentItem)) === stringHash(originalItem))
			{
				callbackMode = "not_modified";
			}
			callbackFunc(callbackMode, currentItem, originalMonth, originalIndex);
		}
	};

	/* =========== constructor =========== */
	elements.decimalSeparator.innerText = localeSeparator.decimal;
	targetElement.appendChild(elements._self);

	return { // public interface
		popup: popup
	};
};
