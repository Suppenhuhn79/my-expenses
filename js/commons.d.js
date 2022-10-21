/**
 * @typedef SelectorOptions
 * Configuration of `Selector` instances.
 * @property {boolean} [multiselect] Allow seletion multiple items (`true`) or single item selection (`false`, default).
 * @property {string} [class] CSS classes for the outer element; multiple classes separated by space.
 * 
 * @callback SelectorCallback
 * Callback function for selections in the `Selector` class.
 * @param {IdString|Set<IdString>} id Id of the selected item or set of selected ids if `multiSelect=true`.
 *
 * @callback FilterMenuCallback
 * Callback function for `FilterMenu`s.
 * @param {ExpensesFilter} filter Set expenses filter.
 * 
 * @typedef SelectableIcon
 * Interface for icons given for selection to selectors the `Selector` class.
 * @property {IdString} id Id of the selectable icon.
 * @property {HTMLElement} element HTML element that reprsents the icon.
 * @property {string} color Color of the icon.
 * 
 */
