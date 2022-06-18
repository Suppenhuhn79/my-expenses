/*
 * I know I will go straight to hell for this. But hey, Satan's gotta suffer, too! >:-D
 */

/**
 * Provides the hash value of a string.
 * @param {String} string Input string
 * @returns {String} Hash value of the string
 */
function stringHash (string)
{
	/* This is based on https://github.com/darkskyapp/string-hash
	Since the basic code is public domain, this function is public domain as well.
	 */
	let hash, i = string.length;
	while (i)
	{
		hash = (hash * 33) ^ string.charCodeAt(--i);
	}
	return hash >>> 0;
}

/**
 * Collects all named children of an element into an object.
 * @param {HTMLElement} element Eet named children of this element
 * @returns {{camelCaseElementName: HTMLElement}} Object with all named elements
 */
function getNames (element)
{
	let result = {
		_self: element,
	};
	for (let ele of element.querySelectorAll("[name]"))
	{
		result[camelCase(ele.name || ele.getAttribute("name"))] = ele;
	}
	return result;
}

/**
 * Provides a number formatted with current locales thousands separators.
 * @param {String} numStr Input number as string
 * @returns {String} Integer part of a number formatted with thousands separators
 */
function formatIntegersLocale (numStr)
{
	let rexMatch = /([0-9]+)(\.([0-9]{0,2}))?/.exec(numStr);
	let integers = rexMatch[1];
	let intGrp = integers.length - 3;
	while (intGrp > 0)
	{
		integers = integers.substring(0, intGrp) + localeSeparator.thousand + integers.substring(intGrp);
		intGrp -= 3;
	}
	return integers;
}

/**
 * Provides a short text (month name abbreviated to three letters + year) for a date.
 * @param {Date} date Date
 * @returns {String} Short month text ("MMM YYYY")
 */
function getShortMonthText (date)
{
	return monthNames[date.getMonth()].substring(0, 3) + "\u00a0" + date.getFullYear();
}

/**
 * Provides a text (month full name + year) for a date.
 * @param {Date} date Date
 * @returns {String} Full length month text ("MMMMMM YYYY")
 */
function getFullMonthText (date)
{
	return monthNames[date.getMonth()] + "\u00a0" + date.getFullYear();
}

/**
 * Converts a kebab-case string to a camelCase string.
 * @param {string} s String to be converted to camelCase
 * @returns {string}
 */
function camelCase (s)
{
	return s.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

const localeSeparator = (function ()
{
	/** @type {String} */
	let separators = (1234.5).toLocaleString().replaceAll(/\d/g, "");
	return {
		thousand: separators[0],
		decimal: separators[1],
	};
})();

// Expand Date class with useful capatibilities 
Date.prototype.toMonthString = function ()
{
	return this.toIsoFormatText("YM");
};

// Expand Array class with useful capatibilities 
Array.prototype.removeDuplicates = function ()
{
	this.splice(0, this.length, ...new Set(this));
	return this;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fa = {
	angle_left: "&#xf104;",
	angle_right: "&#xf105;",
	arrow_left: "&#xf060;",
	asterisk: "&#xf069;",
	ban: "&#xf05e;",
	bars: "&#xf0c9;",
	boxes: "&#xf468;",
	calendar_alt: "&#xf073;",
	calendar_day: "&#xf783;",
	calculator: "6#xf1ec;",
	chart_area: "&#xf1fe;",
	chart_line: "&#xf201;",
	chart_pie: "&#xf200;",
	divide: "&#xf529;",
	filter: "&#xf0b0;",
	infinite: "&#xf534;",
	micoscope: "&#xf610;",
	plus: "&#xf067;",
	plus_square: "&#xf0fe;",
	smiley_meh: "&#xf11a;",
	sort: "&#xf0dc;",
	space: "&#x00a0;",
	star: "&#xf005;",
	wallet: "&#xf555;"
};
