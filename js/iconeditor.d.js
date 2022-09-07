/**
 * @typedef IconEditorOptions
 * Options for the icon editor.
 * @property {EditableIconType} iconType Whether it's a color-on-white or a white-on-color icon
 * @property {String} title Editors title
 * @property {String} [headline] Optional headline
 * @property {String} defaultLabel Icons default label
 * @property {IconEditorDeleteFunction} [deleteHandler] Function that handles delete requests
 * @property {Boolean} [canColor] Whether the editor should provide a color selection (`true`, default) or not (`false`).
 * @property {any} [context] Context of the icon that is being edited; usually it's the icons item id
 *
 * @callback IconEditorCallback
 * @param {EditableIcon} editedIcon Edited icon
 * 
 * @typedef IconEditorDeleteFunction
 * Function that is called on a delete request.
 * @type {Function}
 * @param {Event} event Event that triggered the delete request
 * @param {any} context Context of the delete request (out of the options)
 * @returns {Boolean} `true` if the icon editor shall be closed (default), otherwise it remains open
 */
