/**
 * @typedef MonthString
 * String representing a month in format `yyyy-mm`.
 * @type {String}
 * 
 * @typedef IdString
 * String used as identifier. Can be obtained via `myx.newId()`.
 * @type {String}
 * 
 * @typedef IconCode
 * Representing a FontAwesome icon as combination of a CSS style and unicode codepoint, e.g. `"fas:f100"`.
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
	let expenses = myxExpenses();
	let statistics = myxStatistics();

	function init ()
	{
		return new Promise((resolve) =>
		{
			doFontAwesome(document.body);
			choices.onChoose("active-tab", onTabChosen);
			window.addEventListener("focus", onWindowFocus, false);
			Promise.allSettled([
				pageSnippets.import("snippets/iconeditor.xml"),
				expenses.init()
			]).then(() =>
			{
				window.iconEditor = iconEditor(document.getElementById("client"));
				resolve();
			});
		});
	}

	function onTabChosen (tabName, interactive)
	{
		(tabName.endsWith("-editor")) ? bottomMenu.classList.add("hidden") : bottomMenu.classList.remove("hidden");
		if (interactive)
		{
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
				localStorage.removeItem(AUTOSIGNIN_FLAG);
				console.table(googleappApi.files);
				Promise.allSettled([
					categories.fetchData(),
					paymentMethods.fetchData(),
					expenses.fetchData(),
				]).then(() => 
				{
					document.getElementById("dummy")?.remove();
					choices.set("active-tab", choices.get("active-tab") || expenses.moduleName);
					onTabChosen(choices.get("active-tab"), true);
				});
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
					choices.set("active-tab", "not-signed-in");
				}
				localStorage.removeItem(AUTOSIGNIN_FLAG);
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

	init().then(onWindowFocus);

	return { // publish members
		statistics: statistics, // TODO: debug only
		expenses: expenses, // TODO: debug only
		categories: categories,
		paymentMethods: paymentMethods,
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
 * @memberof googleappApi
 * @type {Map<String, Date>}
 */
googleappApi.lastLoaded = new Map();

/**
 * Loads a file from Google Drive but previously checks if the file is cached in LocalStorage.
 * @memberof googleappApi
 * @param {String} name File name to load
 * @returns {Promise<any>}
 */
googleappApi.loadFileEx = function (name)
{
	return new Promise((resolve) =>
	{
		let cacheName = "myx_" + name.substring(0, name.lastIndexOf(".")).replaceAll(/[^\w\d]/g, "_");
		let cache = JSON.parse(localStorage.getItem(cacheName));
		if (googleappApi.files[name] !== undefined)
		{
			if ((!!cache) && !!cache.data && !(new Date(cache.date) < googleappApi.files[name].modifiedTime))
			{
				console.info("Loading " + name + " from cache");
				googleappApi.lastLoaded.set(name, new Date());
				resolve(cache.data);
			}
			else
			{
				console.info("Loading", name);
				googleappApi.loadFile(name).then((payload) =>
				{
					localStorage.setItem(cacheName, JSON.stringify({ data: payload, date: googleappApi.files[name].modifiedTime }));
					googleappApi.lastLoaded.set(name, new Date());
					resolve(payload);
				});
			}
		}
		else
		{
			console.info("File does not exist", name);
			resolve();
		}
	});
};

googleappApi.isModified = function (name)
{
	let lastLoaded = googleappApi.lastLoaded.get(name);
	let isModified = ((lastLoaded === undefined) || (lastLoaded < googleappApi.files[name].modifiedTime));
	if (isModified === false)
	{
		console.info("Not modified", name);
	}
	return isModified;
};
