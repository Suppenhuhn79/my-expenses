/**
 * @typedef Category
 * Category object. Represents a single category.
 * @type {Object}
 * @property {String} label
 * @property {IconCode} icon // DEPRECATED use `FAGlyph` instead
 * @property {String} color
 * @property {IdString} [masterCategory]
 * @property {Array<IdString>} [subCategories]
 * 
 * @callback CategorySelectorCallback
 * @param {IdString} catId Id of the selected category
 */
