/**
 * Provides an index of which data file does contain which months.
 * File numbers start at 1.
 * Months are notated as string in `yyyy-mm`-format.
 */
const myxDataindex = function () 
{
	const MAX_MONTHS_PER_FILE = 5;
	/**
	 * - First level is the file number -1
	 * - Second level is the months in the file
	 * @type {Array<Array<MonthString>>} 
	 */
	let data = [];

	/**
	 * Sets an entry for a _fileindex/month_ into the toc data.
	 * @param {MonthString} month Month to register
	 * @param {Number} [fileNumber] Data file number; if not given and the month is already registered, nothing happens. If it's a new month, it will be assigned to a file automatically.
	 */
	function register (month, fileNumber = null)
	{
		let arrayIndex = ((fileNumber > 0) ? fileNumber : getFileindexForMonth(month)) - 1;
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
	 * @returns {Array<MonthString>} All registerd months
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
	 * @param {Number} fileNumber Number of file from which to get contained months
	 * @returns {Array<MonthString>} All months that are contained in the file
	 */
	function getAllMonthInFile (fileNumber)
	{
		return data[fileNumber - 1] || [];
	}

	/**
	 * Provides the index of the file that contains a certain month.
	 * @param {MonthString} month Month to find it's containing file
	 * @returns {Number} Number of the file that does contain the month; If the month does not exist in any file yet, it will be assigned automatically to eithter the lastest or a new file.
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
