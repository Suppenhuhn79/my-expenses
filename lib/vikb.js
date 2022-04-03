/**
 * Detector for popping on/off virtual keyboard.
 */
const vikb = function ()
{
	/**
	 * @callback vikbCallback
	 * @param {String} event `"opened"` if virtual keyboard just popped on, or `"closed"` if it popped off
	 */
	let orgHeight = window.innerHeight;
	/** @type {Array<vikbCallback>} */
	let listeners = [];

	window.addEventListener("resize", () =>
	{
		let event = (window.innerHeight < orgHeight) ? "opened" : "closed";
		for (let listener of listeners)
		{
			listener(event);
		}
	});

	/**
	 * Register an event handler to call on virtaul keyboard popping on/off.
	 * @param {vikbCallback} callback `function(event: String)` to call; where `event` is either `"opened"` or `"closed"`
	 */
	function addEventListener (callback)
	{
		if ((!listeners.includes(callback)) && (typeof callback === "function"))
		{
			listeners.push(callback);
		}
	}

	return {
		addEventListener: addEventListener
	};
}();
