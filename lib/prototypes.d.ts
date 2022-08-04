interface Array<T> {
	/**
	 * Provides a copy of the array as a new array object.
	 */
	clone(): Array<T>;
	/**
	 * Removes duplicate items from the array.
	 * Returns the array.
	 */
	removeDuplicates(): Array<T>;
}

interface Date {
	/**
	 * Formats the date to a string, using locale names.
	 *
	 * **Requires** `Date.locales.monthNames: string[]` and `Date.locales.weekdayNames: string[]`
	 *
	 * Valid format tokens are:
	 * - `D` - day of months (one or two digits)
	 * - `DD` - day of months (two digits)
	 * - `DDD` - weekday name (three letter abbreviation)
	 * - `DDDD` - weekday name (full)
	 * - `M` - month (one or two digits)
	 * - `MM` - month (two digits)
	 * - `MMM` - month name (three letter abbreviation)
	 * - `MMMM` - month name (full)
	 * - `YY` - year (last two digits)
	 * - `YYYY` - year (full)
	 */
	format(): string;
	/**
	 * Numberic month string (`"YYYY-MM"`)
	 */
	toMonthString(): string;
}

interface HTMLElement {
	/**
	 * Collects all named children of an element into an object.
	 * Returns map with `camelCaseElementName: {HTMLElement}` with all named elements
	 */
	getNames(): Object<String, HTMLElement>;
}

interface String {
	/**
	 * Provides the hash value of a string.
	 */
	getHash(): string;
	/**
	 * Converts a kebab-case string to a camelCase string.
	 */
	toCamelCase(): string;
}
