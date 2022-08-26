/*
 * I know I will go straight to hell for this. But hey, Satan's gotta suffer, too! >:-D
 */

const fa = {
	angle_left: "&#xf104;",
	angle_right: "&#xf105;",
	angle_up: "&#xf106;",
	angle_double_up: "&#xf102;",
	arrow_left: "&#xf060;",
	asterisk: "&#xf069;",
	backspace: "&#xf55a;",
	backward: "&#xf04a;",
	ban: "&#xf05e;",
	bars: "&#xf0c9;",
	boxes: "&#xf468;",
	calendar: "&#xf133;",
	calendar_alt: "&#xf073;",
	calendar_day: "&#xf783;",
	calculator: "&#xf1ec;",
	chart_area: "&#xf1fe;",
	chart_bar: "&#xf080;",
	chart_line: "&#xf201;",
	chart_pie: "&#xf200;",
	check: "&#xf00c;",
	clone: "&#xf24d;",
	divide: "&#xf529;",
	filter: "&#xf0b0;",
	hourglass_half: "&#xf252;",
	infinite: "&#xf534;",
	list_ul: "&#xf0ca;",
	micoscope: "&#xf610;",
	pen: "&#xf304;",
	plus: "&#xf067;",
	plus_square: "&#xf0fe;",
	redo: "&#xf01e;",
	search: "&#xf002;",
	smiley_meh: "&#xf11a;",
	sort: "&#xf0dc;",
	space: "&#x00a0;",
	star: "&#xf005;",
	times: "&#xf00d;",
	trash_alt: "&#xf2ed;",
	trash_restore_alt: "&#xf82a;",
	wallet: "&#xf555;"
};

function doFontAwesome (element)
{
	for (let e of element.querySelectorAll("i[data-icon]"))
	{
		let iconKey = e.dataset.icon.replaceAll(/-/g, "_");
		e.innerHTML = fa[iconKey] || "[" + iconKey + "]";
	}
}
