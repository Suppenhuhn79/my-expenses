myx.debug = {

	backupAll: function ()
	{
		let today = (new Date()).toIsoDate();
		for (let file of googleAppApi.files.keys())
		{
			let periodIndex = file.indexOf(".");
			myx.debug.pull(file, "/" + today + "/" + file.substring(0, periodIndex) + file.substring(periodIndex));
		}
	},

	pull: function (filename, saveAsFilename = filename)
	{
		googleAppApi.loadFile(filename).then((payload) =>
		{
			console.log(payload);
			if (typeof payload === "object")
			{
				payload = JSON.stringify(payload, null, "\t");
			}
			xhr("PUT", "http://localhost:8800/files/0/myx/" + saveAsFilename, null, payload).then(console.log, console.error);
		}
		);
	},

	push: function (filename)
	{
		xhr("GET", "http://localhost:8800/files/0/myx/" + filename).then((payload) =>
		{
			console.log(payload);
			googleAppApi.saveToFile(filename, payload).then(console.log, console.error);
		});
	}
};
