/**
 * @typedef IconEditorOptions
 * Options for the icon editor.
 * @property {EditableIconType} iconType Whether it's a color-on-white or a white-on-color icon.
 * @property {string} title Editors title.
 * @property {string} [headline] Optional headline.
 * @property {string} defaultLabel Icons default label.
 * @property {IconEditorDeleteFunction} [deleteHandler] Function that handles delete requests.
 * @property {boolean} [canColor] Whether the editor should provide a color selection (`true`, default) or not (`false`).
 * @property {any} [context] Context of the icon that is being edited; usually it's the icons item id.
 *
 * @callback IconEditorCallback
 * @param {EditableIcon} editedIcon Edited icon.
 * @returns {void}
 * 
 * @typedef IconEditorDeleteFunction
 * Function that is called on a delete request.
 * @type {Function}
 * @param {Event} event Event that triggered the delete request.
 * @param {any} context Context of the delete request (out of the options).
 * @returns {boolean} `true` if the icon editor shall be closed (default), otherwise it remains open.
 * 
 * @typedef EditableIcon
 * Interface for objects that can be passed to the icon editor.
 * @property {string} label The objects label.
 * @property {FAGlyph} glyph The objects icon glyph.
 * @property {string} color The objects icon color.
 */
