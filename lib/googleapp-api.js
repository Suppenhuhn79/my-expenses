/**
 * @typedef RegisteredFile
 * @type {Object}
 * @property {String} id The files id on GoogleDrive
 * @property {String} mimeType The files mime type
 * @property {Date} modifiedTime The date of the files latest modification
 * @property {Number} size The files size in bytes.
 *
 * @typedef XhrQueryDefinition
 * @type {Object}
 * @property {String} method HTTP request method to use (`GET`, `PUT`, `POST`, `DELETE` etc.)
 * @property {DOMString} url URL to send the request to
 * @property {Object} [headers] Additional headers as `key=value`-pairs
 * @property {Document|XMLHttpRequestBodyInit} [body] Body data to send
 * 
 * @typedef XhrErrorResponse
 * @type {Object}
 * @property {Number} status The returned HTTP status code
 * @property {String} text The returned status text
 * @property {any} response The original server response
 */
const googleappApi = {
	API_KEY: "AIzaSyDSbOXliOMEoenjL_FlBAT941SYX0u86OU",
	CLIENT_ID: "810920455401-sm95qf24dukmr8hsqeksh0gv2pkf7npt.apps.googleusercontent.com",
	SCOPES: "https://www.googleapis.com/auth/drive.appdata",
	REDIRECT_URI: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1) + "re_google.html",

	/** @type {String} */
	accessToken: null,

	/** @type {RegisteredFile} */
	files: {},

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

	/**
	 * Signs the user in to Google. Google then proceeds to the `REDIRECT_URI`.
	 */
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

	/**
	 * Clears the access token. **NOTE** that this is not a real signout. The user stays signed in as long a the acces token remains valid.
	 */
	signOut: () =>
	{
		googleappApi.tokenCookie.clear();
	},

	/**
	 * Removes the app from the users GoogleDrive connected apps. Requires the user to be signed in.
	 * Signes out the user.
	 */
	disconnectApp: () =>
	{
		xhr("GET", "https://accounts.google.com/o/oauth2/revoke?token=" + encodeURIComponent(googleappApi.accessToken)).then(console.log, console.error);
		googleappApi.signOut();
	},

	/**
	 * Initializes the GooglDive-App api. Gets the access token and registers all files to the `files` data.
	 * Call this after returning from the signIn-referrer.
	 * @returns {Promise<undefined, XhrErrorResponse>} Returns a Promise: `resolve()` or `reject(XhrErrorResponseObject)`.
	 */
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
				resolve();
			},
			reject
		);
	}),

	/**
	 * Registers a file to the `files` data, whereas its name is a key in `files` having the files id, mime type, modification time and size as members.
	 * @param {RegisteredFile} metaObject Object containing relevant file information
	 */
	registerFile: (metaObject) =>
	{
		googleappApi.files[metaObject.name] = {
			id: metaObject.id,
			mimeType: metaObject.mimeType,
			modifiedTime: new Date(metaObject.modifiedTime),
			size: Number(metaObject.size)
		};
	},

	/**
	* Creates a new file.
	* The newly created file will be automatically registered within the `files` data.
	* @param {String} name Name of the file to create
	* @returns {Promise<undefined,XhrErrorResponse>} Returns a Promise: `resolve()` or `reject(XhrErrorResponseObject)`.
	*/
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

	/**
	 * Load a file's content.
	 * @param {String} name Name of file to load
	 * @returns {Promise<String|Object,XhrErrorResponse>} Returns a Promise: `resolve(fileContent)` or `reject(XhrErrorResponseObject)`.
	 */
	loadFile: (name) => new Promise((resolve, reject) =>
		googleappApi._query({
			method: "GET",
			url: "/drive/v3/files/" + googleappApi.files[name].id +
				"?alt=media" +
				"&source=downloadUrl"
		}).then(resolve, reject)
	),

	/**
	 * Saves data to a file. If the file does not exists, it will be created.
	 * @param {String} name Name of file to save data to
	 * @param {String|Object} data Content to wirte to the file
	 * @returns {Promise<undefined,XhrErrorResponse>} Returns a Promise: `resolve()` or `reject(XhrErrorResponseObject)`.
	 */
	saveToFile: (name, data) => new Promise((resolve, reject) =>
	{
		function _doSaveFile ()
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
				() =>
				{
					googleappApi.files[name].modifiedTime = new Date();
					resolve();
				},
				reject
			);
		}
		if (googleappApi.files[name] === undefined)
		{
			googleappApi.createFile(name).then(() => _doSaveFile(), reject);
		}
		else
		{
			_doSaveFile();
		}
	}),

	/**
	 * Deletes a file. The deleted file will be removed from `files` data.
	 * @param {String} name Name of file to delete.
	 * @returns {Promise<undefined,XhrErrorResponse>} Returns a Promise: `resolve()` or `reject(XhrErrorResponseObject)`.
	 */
	deleteFile: (name) => new Promise((resolve, reject) =>
	{
		googleappApi._query({
			method: "DELETE",
			url: "/drive/v3/files/" + googleappApi.files[name].id
		}).then(
			() =>
			{
				delete googleappApi.files[name];
				resolve();
			},
			reject
		);
	}),

	/**
	 * Sends a HTTP request to the GoogleDrive rest api. This uses the `xhr()`-method.
	 * @param {XhrQueryDefinition} query Query definition of the request. The hostname may be omitted in the URL, default is `https://www.googleapis.com`. `Authorization` header will be added automatically.
	 * @returns {Promise<any,XhrErrorResponse>} Returns a Promise: `resolve(response)` or `reject(XhrErrorResponseObject)`
	 */
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

/**
 * Sends a HTTP-request to a server an returns the response.
 * @param {String} method HTTP request method to use (`GET`, `PUT`, `POST`, `DELETE` etc.)
 * @param {DOMString} url URL to send the request to
 * @param {Object<String,String>} [headers] Additional headers as `key: "value"`-pairs
 * @param {Document|XMLHttpRequestBodyInit} [body] Body data to send
 * @returns {Promise<DOMString|Object,XhrErrorResponse>} If the response status code is not a `2xx`, it rejects an `XhrErrorResponseObject`.
 * Otherwise it resolves with the responses content, dependant on it's MIME type as
 * - application/json: Object
 * - any other: DOMString
 */
function xhr (method, url, headers = {}, body = null)
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
