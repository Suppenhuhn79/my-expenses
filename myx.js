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
		doFontAwesome(document.body);
		choices.set("active-tab", "data-dummy");
		choices.onChoose("active-tab", onTabChosen);
		window.addEventListener("focus", onWindowFocus, false);
		return new Promise((resolve) =>
		{
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
		console.log("onTabChosen", tabName, interactive);
		(tabName.endsWith("-tab")) ? bottomMenu.classList.remove("hidden") : bottomMenu.classList.add("hidden");
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
			activeTab?.enter?.();
		}
	}

	function getIconAttributes (iconCode)
	{
		return {
			faScope: iconCode.substr(0, 3),
			htmlEntity: "&#x" + iconCode.substr(4) + ";"
		};
	}

	/**
	 * Gives an identifier string.
	 * @return {IdString} New identifier
	 */
	function newIdString ()
	{
		return (Math.floor((Math.random() * 1e12))).toString(16).substring(0, 8);
	}

	function formatAmountLocale (num)
	{
		return Math.max(Math.round(num), 1).toLocaleString() + fa.space + currencySymbol;
	}

	function onWindowFocus ()
	{
		// console.clear();
		console.debug("window focused");
		let currentChosenTab = choices.get("active-tab");
		if (currentChosenTab !== "data-dummy")
		{
			xhrBegin();
		}
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
					let currentContentElement = document.querySelector("#client .chosen .content");
					let currentScrollPosition = currentContentElement?.scrollTop || 0;
					xhrSuccess();
					choices.set("active-tab", (currentChosenTab === "data-dummy") ? expenses.moduleName : currentChosenTab);
					onTabChosen(choices.get("active-tab"), true);
					if (!!currentContentElement)
					{
						currentContentElement.scrollTop = currentScrollPosition;
					}
				});
			},
			(reason) =>
			{ // operation failed
				googleappApi.tokenCookie.clear();
				xhrActivityIndicator.classList = [];
				console.warn("google login failed", reason, "AUTOSIGNIN_FLAG?", localStorage.getItem(AUTOSIGNIN_FLAG));
				if ((reason?.status === 401 /* "unauthorized" */) && (localStorage.getItem(AUTOSIGNIN_FLAG) !== "true"))
				{
					localStorage.setItem(AUTOSIGNIN_FLAG, true);
					console.warn("auto retry signin");
					googleappApi.signIn();
				}
				else
				{
					choices.set("active-tab", "not-signed-in");
					document.getElementById("signin-button").onclick = googleappApi.signIn;
				}
				localStorage.removeItem(AUTOSIGNIN_FLAG);
			}
		);
	};

	function xhrBegin ()
	{
		xhrActivityIndicator.classList = ["active"];
	}

	function xhrSuccess ()
	{
		if (xhrActivityIndicator.classList.contains("active"))
		{
			xhrActivityIndicator.classList = ["success"];
		}
	}

	function xhrError ()
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
		newId: newIdString,
		formatAmountLocale: formatAmountLocale,
		xhrBegin: xhrBegin,
		xhrSuccess: xhrSuccess,
		xhrError: xhrError
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

Date.locales = {
	monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	weekdayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};
