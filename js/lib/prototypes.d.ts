interface Array<T> {
	/**
	 * Removes all items from this array.
	 * @returns This emptied array.
	 */
	clear(): Array<T>;

	/**
	 * Provides a copy of the array as a new array object.
	 * @returns A ne array as a copy of this array.
	 */
	clone(): Array<T>;

	/**
	 * Removes duplicate items from the array. This affects the actual array.
	 * @returns This array with all duplicates removed.
	 */
	removeDuplicates(): Array<T>;
}

interface Date {
	/**
	 * Returs the count of days between two dates.
	 * @param start Start date (earlier) of time period.
	 * @param end End date (later) of time period.
	 * @returns The count of days between the tow dates.
	 */
	static daysBetween(start: Date, end: Date): Number;
	// TODO: doc return values
	/**
	 * Returns a new date with a count of days added to the current date.
	 * @param count Count of days to add.
	 */
	addDays(count: number): Date;

	/**
	 * Returns a new date with a count of months added to the current date.
	 * This may overflow to the next month, if the current day does not exist in the target month.
	 *
	 * See also `shiftMonths()`.
	 * @param count Count of months to add.
	 */
	addMonths(count: number): Date;

	/**
	 * Returns a new date with a count of years added to the current date.
	 * @param count Count of years to add.
	 */
	addYears(count: number): Date;

	/**
	 * Shifts a date by a count of months.
	 * In opposite to `addMonths()` it does not overflow to the next month but remains at the last possible day of the desired month.
	 * @param count Count of months by which to shift the current date.
	 */
	shiftMonths(count: number): Date;

	/**
	 * Returns a new date which is set to the end of the current dates month.
	 */
	endOfMonth(): date;

	/**
	 * Returns whether this dates day is the last day of this dates month.
	 */
	isLastDayOfMonth: boolean;

	/**
	 * Formats the date to a string, using locale names.
	 *
	 * **Requires** `Date.locales.monthNames: string[]` and `Date.locales.weekdayNames: string[]`.
	 *
	 * @param formatString String containing format tokens.
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
	format(formatString: string): string;

	/**
	 * Numeric date string (`"YYYY-MM-DD"`).
	 */
	toIsoDate(): string;

	/**
	 * Numeric month string (`"YYYY-MM"`).
	 */
	toMonthString(): string;
}

interface HTMLElement {
	/**
	 * Collects all named children of an element into an object.
	 * Returns an object with all named children as `camelCaseElementName: {HTMLElement}`.
	 */
	getNamedChildren(): Map<String, HTMLElement>;

	/**
	 * Sets this elements property values.
	 * @param props Object of `[key: string]: any` properties to set to the HTML element.
	 */
	assginProperties(props: Object): void;

	/**
	 * Adds or removes a CSS class to this element by condition.
	 * @param className Name of CSS class to add/remove to this element.
	 * @param condition Condition whether to add (`true`) or remove (`false`) the class.
	 */
	setClassConditional(className: String, condition: Boolean): void;

	/**
	 * Sets this elements style.
	 * @param styles Object of `[key: string]: String` style items to set to the HTML elements style.
	 */
	setStyles(styles: Object): void;
}

interface Set {
	/**
	 * Excludes items from this set.
	 * @param iterable Items to exclude from the set.
	 */
	exclude(iterable: Iterable): void;
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
