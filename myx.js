/**
 * String representing a month in format `yyyy-mm`.
 * @typedef MonthString
 * @type {String}
 */
const myx = function ()
{
	let activeTab = null;
	let currencySymbol = "€";
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

	function init ()
	{
		choices.onChoose("active-tab", onTabChosen);
		let latestFileIndex = null;
		for (let fileIndex = Object.keys(googleappApi.files).length; fileIndex > 0; fileIndex -= 1)
		{
			let fileName = "data-" + fileIndex + ".csv";
			if (googleappApi.files[fileName] !== undefined)
			{
				latestFileIndex ||= fileIndex;
				myx.expenses.loadFromFile(fileIndex).then(() =>
				{
					if (latestFileIndex === fileIndex)
					{
						choices.choose("active-tab", myx.expenses.moduleName);
						myx.expenses.enter();
					}
				});
			}
		}
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
		return integers + "&#x00a0;" + currencySymbol;
	}

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

	const myx = { // publish members
		client: document.getElementById("client"),
		get currencySymbol () { return currencySymbol; },
		init: init,
		getIconAttributes: getIconAttributes,
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

	myx.paymentMethods = myxPaymentMethods();
	myx.categories = myxCategories();
	myx.expenses = myxExpenses(myx.paymentMethods, myx.categories);
	myx.statistics = myxStatistics(myx.expenses, myx.categories, myx.paymentMethods);
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

// inject some getters we find useful to Data class.
Object.defineProperty(Date.prototype, "asIsoString", {
	get () { return this.toIsoFormatText("YM"); }
});
Object.defineProperty(Date.prototype, "asShortText", {
	get () { return monthNames[this.getMonth()].substring(0, 3) + "\u00a0" + this.getFullYear(); }
});
Object.defineProperty(Date.prototype, "asText", {
	get () { return monthNames[this.getMonth()] + "\u00a0" + this.getFullYear(); }
});

// inject caching mehtod into googleappApi
/**
 * Loads a file from Google Drive but previously checks if the file is cached in LocalStorage.
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