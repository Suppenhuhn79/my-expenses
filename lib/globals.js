/*
 * I know I will go straight to hell for this. But hey, Satan's gotta suffer, too! >:-D
 */

/**
 * @param {string} string input string
 * @returns {string} hash value of the string
 */
function stringHash (string)
{
	/* This is based on https://github.com/darkskyapp/string-hash
	Since the basic code is public domain, this function is public domain as well.
	 */
	let hash,
		i = string.length;
	while (i)
	{
		hash = (hash * 33) ^ string.charCodeAt(--i);
	}
	return hash >>> 0;
}

/**
 * Collects all named children of an element into a hash map
 * @param {HTMLElement} element get named children of this element
 * @returns {object} hash map with id=camelCase element name, value=named element
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

function getDecimals (num)
{
	return Number(num.toString().split(".")[1]) || 0;
}

/**
 * @param {string} numStr input number as string
 * @returns {string} integer part of a number formatted with thousands separators
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
 *
 * @param {string} month ISO formatted base month ("YYYY-MM")
 * @param {number} relative relative month to be calculated
 * @returns {{date, shortName, isoString}}
 */
function calcRelativeMonth (month, relative)
{
	let tDate = new Date(month);
	tDate.setMonth(tDate.getMonth() + relative);
	return {
		date: tDate,
		shortName: monthNames[tDate.getMonth()].substring(0, 3),
		isoString: tDate.toIsoFormatText("YM"),
	};
}

/**
 * Converts a kebab-case string to a camelCase string
 * @param {string} s string to be converted to camelCase
 * @returns {string}
 */
function camelCase (s)
{
	return s.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

const localeSeparator = (function ()
{
	let separators = (1234.5).toLocaleString().replaceAll(/\d/g, "");
	return {
		thousand: separators[0],
		decimal: separators[1],
	};
})();

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
