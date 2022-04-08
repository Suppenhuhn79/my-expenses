Date.prototype.addMinutes = function (count)
{
	return new Date(this.getTime() + count * 1000 * 60);
};

Date.prototype.addMonths = function (count)
{
	let date_ = new Date(this);
	date_.setMonth(date_.getMonth() + count);
	return date_;
};

Date.prototype.addYears = function (count)
{
	let date_ = new Date(this);
	date_.setFullYear(date_.getFullYear() + count);
	return date_;
};

Date.prototype.fromIsoString = function (isoString)
{
	let datePart = isoString.split(/\D+/);
	this.setUTCFullYear(datePart[0]);
	this.setUTCMonth(datePart[1] - 1);
	this.setUTCDate(datePart[2]);
	this.setUTCHours(datePart[3]);
	this.setUTCMinutes(datePart[4]);
	this.setUTCSeconds(datePart[5]);
	this.setUTCMilliseconds(datePart[6]);
	return this;
};

Date.prototype.toIsoFormatText = function (digs = "YHMDHN")
{
	let result = "";
	if (digs.includes("Y"))
	{
		result += this.getFullYear().toString().padStart(4, "0");
	}
	if (digs.includes("M"))
	{
		result += "-" + (this.getMonth() + 1).toString().padStart(2, "0");
	}
	if (digs.includes("D"))
	{
		result += "-" + this.getDate().toString().padStart(2, "0");
	}
	if (digs.includes("H"))
	{
		result += " " + this.getHours().toString().padStart(2, "0");
	}
	if (digs.includes("N"))
	{
		result += ":" + this.getMinutes().toString().padStart(2, "0");
	}
	if (digs.includes("S"))
	{
		result += ":" + this.getSeconds().toString().padStart(2, "0");
	}
	if (digs.includes("Z"))
	{
		result += "." + this.getMilliseconds().toString().padStart(3, "0");
	}
	return result.replace(/^\D/, "");
};
