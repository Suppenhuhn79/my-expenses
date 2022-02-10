const googleappApi = {
	API_KEY: "AIzaSyDSbOXliOMEoenjL_FlBAT941SYX0u86OU",
	CLIENT_ID: "810920455401-sm95qf24dukmr8hsqeksh0gv2pkf7npt.apps.googleusercontent.com",
	SCOPES: "https://www.googleapis.com/auth/drive.appdata",
	REDIRECT_URI: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1) + "re_google.html",
	accessToken: null,
	files: {},
	registerFile: (metaObject) =>
	{
		googleappApi.files[metaObject.name] = {
			id: metaObject.id,
			mimeType: metaObject.mimeType,
			modifiedTime: new Date(metaObject.modifiedTime),
			size: metaObject.size
		};
	},
	tokenCookie: {
		NAME: "gaauth",
		set: (token) =>
		{
			document.cookie = googleappApi.tokenCookie.NAME + "=" + token + "; path=/; " + ((document.location.protocol.toLowerCase() === "https") ? "secure; " : "SameSite=Strict; ");
		},
		get: () =>
		{
			let cookieMatch = (new RegExp(googleappApi.tokenCookie.NAME + "=([^&]+)")).exec(document.cookie);
			googleappApi.accessToken = (!!cookieMatch) ? cookieMatch[1] : null;
			return googleappApi.accessToken;
		},
		clear: () =>
		{
			let expiration = new Date();
			document.cookie = googleappApi.tokenCookie.NAME + "=; path=/; expires=" + expiration.toUTCString() + "; " + ((document.location.protocol.toLowerCase() === "https") ? "secure; " : "SameSite=Strict; ");
			googleappApi.accessToken = null;
		}
	},
	signIn: () =>
	{
		const AUTHSERVICE_URI = "https://accounts.google.com/o/oauth2/auth";
		let nonce = Math.round((0.1 + Math.random() * 1e16)).toString(16); // random string
		location.replace(AUTHSERVICE_URI +
			"?client_id=" + googleappApi.CLIENT_ID +
			"&response_type=" + encodeURIComponent("permission id_token") +
			"&redirect_uri=" + encodeURIComponent(googleappApi.REDIRECT_URI) +
			"&scope=" + encodeURIComponent(googleappApi.SCOPES) +
			"&nonce=" + nonce +
			"&include_granted_scopes=false"
		);
	},
	signOut: () =>
	{
		googleappApi.tokenCookie.clear();
	},
	disconnectApp: () =>
	{
		xhr("GET", "https://accounts.google.com/o/oauth2/revoke?token=" + encodeURIComponent(googleappApi.accessToken)).then(console.log, console.error);
		googleappApi.signOut();
	},
	init: () => new Promise((resolve, reject) =>
	{
		googleappApi.tokenCookie.get();
		googleappApi._query({
			method: "GET",
			url: "/drive/v3/files" +
				"?spaces=appDataFolder" +
				"&fields=" + encodeURIComponent("nextPageToken, files(id, name, mimeType, modifiedTime, size)")
		}).then(
			(response) =>
			{
				if (!!response.files)
				{
					for (let file of response.files)
					{
						googleappApi.registerFile(file);
					}
				}
				resolve(response);
			},
			reject
		);
	}),
	createFile: (name) => new Promise((resolve, reject) =>
	{
		let metadata = {
			name: name,
			parents: ["appDataFolder"]
		};
		let data = new FormData();
		data.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
		googleappApi._query({
			method: "POST",
			url: "/upload/drive/v3/files/?uploadType=multipart",
			body: data
		}).then(
			(result) =>
			{
				googleappApi.registerFile(result);
				resolve();
			},
			reject
		);
	}),
	loadFile: (name) => new Promise((resolve, reject) =>
		googleappApi._query({
			method: "GET",
			url: "/drive/v3/files/" + googleappApi.files[name].id +
				"?alt=media" +
				"&source=downloadUrl"
		}).then(resolve, reject)
	),
	saveToFile: (name, data) => new Promise((resolve, reject) =>
	{
		let metadata = {
			name: name,
			parents: ["appDataFolder"]
		};
		if (typeof data === "object")	
		{
			data = JSON.stringify(data);
		}
		let body = new FormData();
		body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
		body.append("file", new File([data], name));
		googleappApi._query({
			method: "PUT",
			url: "/upload/drive/v2/files/" + googleappApi.files[name].id + "/?uploadType=multipart",
			body: body
		}).then(
			(result) =>
			{
				googleappApi.files[name].modifiedTime = new Date();
				resolve(result);
			},
			reject
		);
	}),
	deleteFile: (name) => new Promise((resolve, reject) =>
	{
		googleappApi._query({
			method: "DELETE",
			url: "/drive/v3/files/" + googleappApi.files[name].id
		}).then(
			(result) =>
			{
				delete googleappApi.files[name];
				resolve(result);
			},
			reject
		);
	}),
	_query: (query) =>
	{
		const GOOGLEAPI_URL = "https://www.googleapis.com";
		return new Promise((resolve, reject) =>
		{
			if (!!googleappApi.accessToken)
			{
				if (!query.headers)
				{
					query.headers = {};
				}
				query.headers["Authorization"] = "Bearer " + googleappApi.accessToken;
				xhr(query.method, (query.url.startsWith("https://") ? query.url : GOOGLEAPI_URL + query.url), query.headers, query.body).then(
					(response) => resolve(response),
					(reason) => reject(reason)
				);
			}
			else
			{
				reject({
					status: 401,
					text: "Currently no valid access token availibile. Please sign in."
				});
			}
		});
	}
};

function xhr (method, url, headers = {}, body = null, responseType = "")
{
	return new Promise((resolve, reject) =>
	{
		let xhrReq = new XMLHttpRequest();
		let resContentType = undefined;
		xhrReq.open(method, url);
		for (let headerKey in headers)
		{
			xhrReq.setRequestHeader(headerKey, headers[headerKey]);
		};
		xhrReq.responseType = responseType;
		xhrReq.onreadystatechange = () =>
		{
			if (xhrReq.readyState === xhrReq.HEADERS_RECEIVED)
			{
				resContentType = /(\S+)\b/.exec(xhrReq.getResponseHeader("content-type"))[1];
			}
		};
		xhrReq.onloadend = (xhrEvt) =>
		{
			if ((xhrEvt.target.status >= 200) && (xhrEvt.target.status <= 299))
			{
				let response = xhrEvt.target.response;
				if (resContentType === "application/json")
				{
					response = JSON.parse(response);
				}
				resolve(response);
			}
			else
			{
				let rejctReason = {
					status: xhrEvt.target.status,
					text: xhrEvt.target.statusText,
					response: xhrEvt.target.response
				};
				console.error("xhr", method, url, rejctReason);
				reject(rejctReason);
			}
		};
		xhrReq.send(body);
	});
};
