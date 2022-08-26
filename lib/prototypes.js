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
Date.prototype.addDays = function (count)
{
	let date_ = new Date(this.valueOf());
	date_.setDate(date_.getDate() + count);
	return date_;
};

Date.prototype.addMonths = function (count)
{
	let date_ = new Date(this);
	date_.setMonth(date_.getMonth() + count);
	return date_;
};

Date.prototype.addYears = function (count)
{
	let date_ = new Date(this);
	date_.setFullYear(date_.getFullYear() + count);
	return date_;
};

Date.prototype.shiftMonths = function (count)
{
	let date_ = (new Date(this)).addMonths(count);
	if (date_.getDate() < this.getDate())
	{
		date_ = date_.addDays((date_.getDate()) * -1);
	}
	return date_;
};

Date.prototype.endOfMonth = function ()
{
	return new Date(this.getFullYear(), this.getMonth() + 1, 0, 23, 59, 59, 999);
};

Date.prototype.isLastDayOfMonth = function ()
{
	return (this.getDate() === (new Date(this.getFullYear(), this.getMonth() + 1, 0)).getDate());
};

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

Date.prototype.toIsoDate = function ()
{
	return this.format("yyyy-mm-dd");
};

Date.prototype.toMonthString = function ()
{
	return this.format("yyyy-mm");
};

/*
 * HTMLElement
 */
HTMLElement.prototype.getNamedChildren = function ()
{
	let result = new Map();
	result.set(undefined, this);
	for (let ele of this.querySelectorAll("[name]"))
	{
		result.set((ele.name || ele.getAttribute("name")), ele);
	}
	return result;
};

HTMLElement.prototype.assginProperties = function (props)
{
	for (let key of Object.keys(props))
	{
		this[key] = props[key];
	}
	return this;
};

HTMLElement.prototype.setStyles = function (styles)
{
	for (let key of Object.keys(styles))
	{
		this.style[key] = styles[key];
	}
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
