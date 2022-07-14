/**
 * @typedef MonthString
 * String representing a month in format `yyyy-mm`.
 * @type {String}
 * 
 * @typedef IconCode
 * Representing a FontAwesome icon as combination of a CSS style and unicode codepoint, e.g. `"fas:f100"`
 * @type {String}
 */

/**
 * Application main module.
 * @namespace myx
 */
let myx = function ()
{
	const AUTOSIGNIN_FLAG = "myx_autosignin";
	/** @type {HTMLElement} */
	let activeTab = null;
	let currencySymbol = "€";
	let bottomMenu = document.getElementById("bottom-menu");
	let xhrActivityIndicator = document.getElementById("xhr-indicator");

	let paymentMethods = myxPaymentMethods();
	let categories = myxCategories();
	let expenses = myxExpenses(paymentMethods, categories);
	let statistics = myxStatistics(expenses, categories, paymentMethods);

	function init ()
	{
		/**
		 * Iterable promises of all file load actions
		 * @type {Array<Promise>} */
		let asyncCalls = [];
		localStorage.removeItem(AUTOSIGNIN_FLAG);
		for (let fileIndex = Object.keys(googleappApi.files).length; fileIndex > 0; fileIndex -= 1)
		{
			let fileName = "data-" + fileIndex + ".csv";
			if (googleappApi.files[fileName] !== undefined)
			{
				asyncCalls.push(expenses.loadFromFile(fileIndex));
			}
		}
		Promise.allSettled(asyncCalls).then(() =>
		{
			document.getElementById("dummy")?.remove();
			choices.choose("active-tab", choices.chosen.activeTab || expenses.moduleName);
		});
	}

	function onTabChosen (tabName)
	{
		(tabName.endsWith("-editor")) ? bottomMenu.classList.add("hidden") : bottomMenu.classList.remove("hidden");
		activeTab?.leave?.();
		switch (tabName)
		{
			case paymentMethods.moduleName:
				activeTab = paymentMethods;
				break;
			case categories.moduleName:
				activeTab = categories;
				break;
			case expenses.moduleName:
				activeTab = expenses;
				break;
			case statistics.moduleName:
				activeTab = statistics;
				break;
		}
		activeTab.enter();
	}

	function getIconAttributes (iconCode)
	{
		return {
			faScope: iconCode.substr(0, 3),
			htmlEntity: "&#x" + iconCode.substr(4) + ";"
		};
	}

	function newId ()
	{
		return (Math.floor((Math.random() * 1e12))).toString(16).substring(0, 8);
	}

	function formatAmountLocale (num)
	{
		let numAsString = Math.round(num).toString();
		let integers = formatIntegersLocale(numAsString);
		return integers + fa.space + currencySymbol;
	}

	function onWindowFocus ()
	{
		// console.clear();
		console.debug("window focused");
		googleappApi.init().then(
			() =>
			{ // successfully signed in
				console.table(googleappApi.files);
				Promise.allSettled([
					categories.init(),
					paymentMethods.init()
				]).then(init);
			},
			(reason) =>
			{ // operation failed
				googleappApi.tokenCookie.clear();
				console.warn("google login failed", "AUTOSIGNIN_FLAG?", localStorage.getItem(AUTOSIGNIN_FLAG));
				if ((reason?.status === 401 /* "unauthorized" */) && (localStorage.getItem(AUTOSIGNIN_FLAG) !== "true"))
				{
					localStorage.setItem(AUTOSIGNIN_FLAG, true);
					console.warn("auto retry signin");
					googleappApi.signIn();
				}
				else
				{
					document.getElementById("bottom-menu").classList.add("hidden");
					document.getElementById("signin-button").onclick = googleappApi.signIn;
					choices.choose("active-tab", "not-signed-in");
				}
			}
		);
	};

	function xhrOnBegin ()
	{
		xhrActivityIndicator.classList = ["active"];
	}

	function xhrOnSuccess ()
	{
		xhrActivityIndicator.classList = ["success"];
	}

	function xhrOnError ()
	{
		xhrActivityIndicator.classList = ["error"];
	}

	doFontAwesome(document.body);
	choices.onChoose("active-tab", onTabChosen);
	pageSnippets.import("snippets/iconeditor.xml").then(() =>
	{
		window.iconEditor = iconEditor(document.getElementById("client"));
	});
	window.addEventListener("focus", onWindowFocus, false);
	onWindowFocus();

	return { // publish members
		categories: categories, // TODO: debug only
		paymentMethods: paymentMethods, // TODO: debug only
		statistics: statistics, // TODO: debug only
		expenses: expenses, // TODO: debug only
		get currencySymbol () { return currencySymbol; },
		getIconAttributes: getIconAttributes,
		addExpense: expenses.edit,
		setExpenseFilter: expenses.setFilter,
		newId: newId,
		formatAmountLocale: formatAmountLocale,
		xhrBegin: xhrOnBegin,
		xhrSuccess: xhrOnSuccess,
		xhrError: xhrOnError
	};
}();

// inject caching method into googleappApi
/**
 * Loads a file from Google Drive but previously checks if the file is cached in LocalStorage.
 * @memberof googleappApi
 * @static
 * @param {String} name File name to load
 * @returns {Promise<any>}
 */
googleappApi.loadFileEx = function (name)
{
	return new Promise((resolve) =>
	{
		let cacheName = "myx_" + name.substring(0, name.lastIndexOf(".")).replaceAll(/[^\w\d]/g, "_"); //filename.replaceAll(/\./g, "_");
		let cache = JSON.parse(localStorage.getItem(cacheName));
		if ((!!cache) && !!cache.data && !(new Date(cache.date) < googleappApi.files[name].modifiedTime))
		{
			console.info("Loading " + name + " from cache");
			resolve(cache.data);
		}
		else
		{
			googleappApi.loadFile(name).then((payload) =>
			{
				localStorage.setItem(cacheName, JSON.stringify({ data: payload, date: googleappApi.files[name].modifiedTime }));
				resolve(payload);
			});
		}
	});
};