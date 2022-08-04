/*
 * Array
 */
Array.prototype.clone = function ()
{
	return [...this.valueOf()];
};

Array.prototype.removeDuplicates = function ()
{
	this.splice(0, this.length, ...new Set(this));
	return this;
};

/*
 * Date
 */
Date.prototype.format = function (formatStr)
{
	let result = "";
	function _towDigs (s)
	{
		s = "00" + s;
		return s.substring(s.length - 2);
	}
	function _put (t, v)
	{
		let pre = formatStr.substring(0, formatStr.indexOf(t));
		formatStr = formatStr.replace(pre + t, "");
		result += pre + v;
	}
	const REX = /(d{1,4}|m{1,4}|y{4}|y{2})/;
	let tag = REX.exec(formatStr);
	{
		while (!!tag)
		{
			switch (tag[0].toUpperCase())
			{
				case "D":
					_put(tag[0], this.getDate());
					break;
				case "DD":
					_put(tag[0], _towDigs(this.getDate().toString()));
					break;
				case "DDD":
					_put(tag[0], Date.locales.weekdayNames[this.getDay()].substring(0, 3));
					break;
				case "DDDD":
					_put(tag[0], Date.locales.weekdayNames[this.getDay()]);
					break;
				case "M":
					_put(tag[0], this.getMonth() + 1);
					break;
				case "MM":
					_put(tag[0], _towDigs((this.getMonth() + 1).toString()));
					break;
				case "MMM":
					_put(tag[0], Date.locales.monthNames[this.getMonth()].substring(0, 3));
					break;
				case "MMMM":
					_put(tag[0], Date.locales.monthNames[this.getMonth()]);
					break;
				case "YY":
					_put(tag[0], this.getFullYear().toString().substring(2, 4));
					break;
				case "YYYY":
					_put(tag[0], this.getFullYear());
					break;
				default:
					_put(tag[0], "");
			}
			tag = /(d{1,4}|m{1,4}|y{4}|y{2})/.exec(formatStr);
		}
	}
	return result;
};

Date.prototype.toMonthString = function ()
{
	return this.toIsoFormatText("YM");
};

/*
 * HTMLElement
 */
HTMLElement.prototype.getNames = function ()
{
	let result = {
		_self: this,
	};
	for (let ele of this.querySelectorAll("[name]"))
	{
		result[(ele.name || ele.getAttribute("name")).toCamelCase()] = ele;
	}
	return result;
};

/*
 * String
 */
String.prototype.getHash = function ()
{
	/** This is based on https://github.com/darkskyapp/string-hash
	 * Since the basic code is public domain, this function is public domain as well.
	 */
	let hash, i = this.length;
	while (i)
	{
		hash = (hash * 33) ^ this.charCodeAt(--i);
	}
	return hash >>> 0;
};

String.prototype.toCamelCase = function ()
{
	return this.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};
