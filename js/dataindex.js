/**
 * Index of which expenses data file does contain which months.
 * @namespace
 * File numbers start at `1`.
 * Months are notated as string in `yyyy-mm`-format.
 */
function myxExpensesDataindex () 
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
	 * @param {MonthString} month Month to register.
	 * @param {number} [fileNumber] Data file number; if not given and the month is already registered, nothing happens. If it's a new month, it will be assigned to a fileNumber automatically.
	 */
	function register (month, fileNumber = null)
	{
		let arrayIndex = ((fileNumber > 0) ? fileNumber : getFileindexForMonth(month)) - 1;
		data[arrayIndex] ||= [];
		if (data[arrayIndex].includes(month) === false)
		{
			data[arrayIndex].push(month);
		}
	}

	/**
	 * Returns all registerd months in ascending order.
	 * @returns {Array<MonthString>} All registered months.
	 */
	function getAllMonths ()
	{
		let result = [];
		for (let item of data)
		{
			result = result.concat(item);
		}
		return result.sort();
	}

	/**
	 * Provides all months that are contained in a specific file.
	 * @param {number} fileNumber Number of file from which to get contained months.
	 * @returns {Array<MonthString>} All months that are contained in the file
	 */
	function getAllMonthInFile (fileNumber)
	{
		return data[fileNumber - 1] || [];
	}

	/**
	 * Provides the index of the file that contains a certain month.
	 * 
	 * If the month does not exist in any file yet, it will be assigned automatically to eithter the lastest or a new file.
	 * 
	 * @param {MonthString} month Month to find it's containing file.
	 * @returns {number} Number of the file that does contain the month.
	 */
	function getFileindexForMonth (month)
	{
		/** @type {number} */
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
			if (data[data.length - 1].length >= MAX_MONTHS_PER_FILE)
			{
				data.push([]);
			}
			data[data.length - 1].push(month);
			result = data.length;
			console.debug("Registered new month", month, "in file #", result);
		}
		return result;
	}

	return { // public interface
		get data () { return data; }, // debug_only
		register: register,
		allMonthsInFile: getAllMonthInFile,
		fileindexOfMonth: getFileindexForMonth,
		get allAvailibleMonths () { return getAllMonths(); }
	};
};
