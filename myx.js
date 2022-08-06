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

	/**
	 * Timestamps of when a file was loaded.
	 * @type {Map<String, Date>} 
	 */
	let filesLoadTimestamps = new Map();

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

	/**
	 * Loads data from a file. To reduce network traffic, files are cached in the localStorage.
	 * 
	 * If the file is cached and the remote file is not newer that the cached one, file content is loaded from cache.
	 * Otherwiese, the file is fetched from remote.
	 * 
	 * If the file already has been loaded and wasn't modified since then, nothing happens.
	 * 
	 * @async
	 * @param {String} name Name of file to load
	 * @param {any} defaults Default data if file does not exists or is empty
	 * @param {Function} callback Function `f(data: any)` to call after the file has loaded
	 * @returns {Promise<void>} Promise
	 */
	function loadFile (name, defaults, callback)
	{
		return new Promise((resolve) =>
		{
			let file = googleAppApi.files.get(name);
			if (file !== undefined)
			{
				let cacheName = "myx_" + name.substring(0, name.lastIndexOf(".")).replaceAll(/[^\w\d]/g, "_");
				let cacheItem = JSON.parse(localStorage.getItem(cacheName));
				if ((filesLoadTimestamps.get(name) || new Date(0)) < file.modifiedTime)
				{
					if (file.modifiedTime > new Date(cacheItem?.date || 0))
					{
						console.info("Fetching '" + name + "' from remote");
						googleAppApi.loadFile(name).then(
							(payload) =>
							{
								localStorage.setItem(cacheName, JSON.stringify({ data: payload, date: file.modifiedTime }));
								filesLoadTimestamps.set(name, new Date());
								callback(payload || defaults);
								resolve();
							}
						);
					}
					else
					{
						console.info("Loading '" + name + "' from cache");
						filesLoadTimestamps.set(name, new Date());
						callback(cacheItem.data);
						resolve();
					}
				}
				else
				{
					console.info("Not modified '" + name + "'");
					resolve();
				}
			}
			else
			{
				console.info("File does not exist '" + name + "'");
				callback(defaults);
				resolve();
			}
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
			faScope: iconCode.substring(0, 3),
			htmlEntity: "&#x" + iconCode.substring(4) + ";"
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
		return ((num > 0) ? Math.max(Math.round(num), 1) : 0).toLocaleString() + fa.space + currencySymbol;
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
		googleAppApi.init().then(
			() =>
			{ // successfully signed in
				localStorage.removeItem(AUTOSIGNIN_FLAG);
				console.table(Array.from(googleAppApi.files));
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
				googleAppApi.tokenCookie.clear();
				xhrActivityIndicator.classList = [];
				console.warn("google login failed", reason, "AUTOSIGNIN_FLAG?", localStorage.getItem(AUTOSIGNIN_FLAG));
				if ((reason?.status === 401 /* "unauthorized" */) && (localStorage.getItem(AUTOSIGNIN_FLAG) !== "true"))
				{
					localStorage.setItem(AUTOSIGNIN_FLAG, true);
					console.warn("auto retry signin");
					googleAppApi.signIn();
				}
				else
				{
					choices.set("active-tab", "not-signed-in");
					document.getElementById("signin-button").onclick = googleAppApi.signIn;
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
		expenses: expenses,
		categories: categories,
		paymentMethods: paymentMethods,
		get currencySymbol () { return currencySymbol; },
		loadFile: loadFile,
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

Date.locales = {
	monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	weekdayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};
