const vikb = function ()
{
	let orgHeight = window.innerHeight;
	let listeners = [];

	/*
	screen.orientation.addEventListener("change", (evt) =>
	{
		console.log(window.innerHeight, evt);
		orgHeight = window.innerHeight;
		document.body.append("screen.orientation changed -- ");
	});
	*/

	window.addEventListener("resize", () =>
	{
		let event = (window.innerHeight < orgHeight) ? "opened" : "closed";
		for (let listener of listeners)
		{
			listener(event);
		}
	});

	function addEventListener (func)
	{
		if ((!listeners.includes(func)) && (typeof func === "function"))
		{
			listeners.push(func);
		}
	};

	return {
		addEventListener: addEventListener
	};
}();
