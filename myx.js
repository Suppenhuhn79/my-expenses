const myx = function ()
{
	let activeTab = null;
	let currencySymbol = "€";
	let selectedMonth = (new Date()).toIsoFormatText("YM");
	let bottomMenu = document.getElementById("bottom-menu");
	let xhrActivityIndicator = document.getElementById("xhr-indicator");

	document.getElementById("bottom-menu").onclick = (mouseEvent) =>
	{
		activeTab?.leave?.();
		switch (mouseEvent.target.closest("[data-choice]").dataset.choice)
		{
			case myx.paymentMethods.moduleName:
				activeTab = myx.paymentMethods;
				break;
			case myx.categories.moduleName:
				activeTab = myx.categories;
				break;
			case myx.expenses.moduleName:
				activeTab = myx.expenses;
				break;
			case myx.statistics.moduleName:
				activeTab = myx.statistics;
				break;
		}
		activeTab.enter();
	};

	function init (promiseResults)
	{
		choices.onChoose("active-tab", onTabChosen);
		myx.expenses.loadFromFile().then(() =>
		{
			// choices.choose("active-tab", myx.statistics.moduleName);
			choices.choose("active-tab", myx.expenses.moduleName);
			myx.expenses.enter();
		});
	}

	function onTabChosen (tabName, event)
	{
		if (tabName.endsWith("-editor"))
		{
			bottomMenu.classList.add("hidden");
		}
		else
		{
			bottomMenu.classList.remove("hidden");
		}
	}

	function loadConfigFile (filename)
	{
		return new Promise((resolve) =>
		{
			let cacheName = "myx_" + filename.substring(0, filename.lastIndexOf(".")).replaceAll(/[^\w\d]/g, "_"); //filename.replaceAll(/\./g, "_");
			let cache = JSON.parse(localStorage.getItem(cacheName));
			if ((!!cache) && !(new Date(cache.date) < googleappApi.files[filename].modifiedTime))
			{
				console.info("Loading " + filename + " from cache");
				resolve(cache);
			}
			else
			{
				googleappApi.loadFile(filename).then((payload) =>
				{
					localStorage.setItem(cacheName, JSON.stringify(Object.assign({}, payload, { date: googleappApi.files[filename].modifiedTime })));
					resolve(payload);
				});
			}
		});
	};

	function getIconAttributes (iconCode)
	{
		return {
			faScope: iconCode.substr(0, 3),
			htmlEntity: "&#x" + iconCode.substr(4) + ";"
		};
	};

	function newId ()
	{
		return (Math.floor((Math.random() * 1e12))).toString(16).substring(0, 8);
	};

	function formatAmountLocale (num)
	{
		let numAsString = Math.round(num).toString();
		let integers = formatIntegersLocale(numAsString);
		return integers + "&#x00a0;" + currencySymbol;
	};

	function xhrOnBegin ()
	{
		xhrActivityIndicator.classList = ["active"];
	};

	function xhrOnSuccess ()
	{
		xhrActivityIndicator.classList = ["success"];
	};

	function xhrOnError ()
	{
		xhrActivityIndicator.classList = ["error"];
	};

	const myx = { // publish members
		client: document.getElementById("client"),
		get currencySymbol () { return currencySymbol; },
		get selectedMonth ()
		{
			let asDate = new Date(selectedMonth);
			let month = asDate.getMonth();
			let year = asDate.getFullYear();
			return {
				asDate: asDate,
				asIsoString: selectedMonth,
				asShortText: monthNames[month].substring(0, 3) + "\u00a0" + year,
				asText: monthNames[month] + "\u00a0" + year
			};
		},
		set selectedMonth (value) { selectedMonth = value; },
		init: init,
		getIconAttributes: getIconAttributes,
		loadConfigFile: loadConfigFile,
		newId: newId,
		formatAmountLocale: formatAmountLocale,
		xhrBegin: xhrOnBegin,
		xhrSuccess: xhrOnSuccess,
		xhrError: xhrOnError
	};

	pageSnippets.import("snippets/iconeditor.xml").then(() =>
	{
		myx.iconEditor = iconEditor(myx.client);
	});

	myx.paymentMethods = myxPaymentMethods(myx);
	myx.categories = myxCategories(myx);
	myx.expenses = myxExpenses(myx, myx.paymentMethods, myx.categories);
	myx.statistics = myxStatistics(myx, myx.expenses, myx.categories, myx.paymentMethods);
	myx.addExpense = myx.expenses.edit;
	choices.choose("active-tab", myx.expenses.moduleName);

	const AUTOSIGNIN_FLAG = "myx_autosignin";
	googleappApi.init().then(
		() =>
		{ // successfully signed in
			if (localStorage.getItem(AUTOSIGNIN_FLAG))
			{
				localStorage.removeItem(AUTOSIGNIN_FLAG);
			}
			console.table(googleappApi.files);
			Promise.allSettled([
				myx.categories.init(),
				myx.paymentMethods.init()
			]).then(init);
		},
		(reason) =>
		{ // operation failed
			if (reason.status === 401) // "unauthorized"
			{
				if (localStorage.getItem(AUTOSIGNIN_FLAG) !== true)
				{
					localStorage.setItem("myx_autosignin", true);
					googleappApi.signIn();
				}
				else
				{
					document.getElementById("bottom-menu").classList.add("hidden");
					document.getElementById("signin-button").onclick = googleappApi.signIn;
					choices.choose("active-tab", "not-signed-in");
				}
			}
		});

	return myx;
}();
