/**
 * Provides an index of which data file does contain which months.
 * File indexes start at 1.
 * Months are notated as string in `yyyy-mm`-format.
 */
const myxDataindex = function () 
{
	const MAX_MONTHS_PER_FILE = 5;
	let data = [];

	/**
	 * Sets an entry for a _fileindex/month_ into the toc data.
	 * @param {String} month month (as `yyyy-mm`) to register
	 * @param {Number} [fileIndex] data file number (`1..x`); If not given and the month is already registered, nothing happens. If it's a new month, it will be assigned to a file automatically.
	 */
	function register (month, fileIndex = null)
	{
		let arrayIndex = ((fileIndex > 0) ? fileIndex : getFileindexForMonth(month)) - 1;
		if (data[arrayIndex] === undefined)
		{
			data[arrayIndex] = [];
		}
		if (data[arrayIndex].includes(month) === false)
		{
			data[arrayIndex].push(month);
		}
	}

	/**
	 * Returns all registerd months.
	 * @returns {Array<String>} all registerd months
	 */
	function getAllMonths ()
	{
		let result = [];
		for (let item of data)
		{
			result = result.concat(item);
		}
		return result;
	}

	/**
	 * Provides all months that are contained in a specific file.
	 * @param {Number} fileIndex index (`1..x`) of file from which to get contained months
	 * @returns {Array<String>}
	 */
	function getAllMonthInFile (fileIndex)
	{
		return data[fileIndex - 1] || [];
	}

	/**
	 * Provides the index of the file that contains a certain month.
	 * @param {String} month month to find it's containing file
	 * @returns {Number} index of the file that does contain the month; If the month does not exist in any file yet, it will be assigned automatically to eithter the lastest or a new file.
	 */
	function getFileindexForMonth (month)
	{
		let result = null;
		for (let arrayIndex = 0, dataLength = data.length; arrayIndex < dataLength; arrayIndex += 1)
		{
			if (data[arrayIndex].includes(month))
			{
				result = arrayIndex + 1;
				break;
			}
		}
		if (result === null)
		{
			result = (data[data.length - 1].length < MAX_MONTHS_PER_FILE) ? data.length : data.length + 1;
		}
		return result;
	}

	return { // public interface
		get data () { return data; }, // TODO: debug only
		register: register,
		allMonthsInFile: getAllMonthInFile,
		fileindexOfMonth: getFileindexForMonth,
		get allAvailibleMonths () { return getAllMonths(); }
	};
};
