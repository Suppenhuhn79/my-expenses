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
	 * - `d` - day of months (one or two digits)
	 * - `dd` - day of months (two digits)
	 * - `ddd` - weekday name (three letter abbreviation)
	 * - `dddd` - weekday name (full)
	 * - `m` - month (one or two digits)
	 * - `mm` - month (two digits)
	 * - `mmm` - month name (three letter abbreviation)
	 * - `mmmm` - month name (full)
	 * - `yy` - year (last two digits)
	 * - `yyyy` - year (full)
	 */
	format(): string;
	/**
	 * Numeric date string (`"YYYY-MM-DD"`)
	 */
	toIsoDate(): string;
	/**
	 * Numeric month string (`"YYYY-MM"`)
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
