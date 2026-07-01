const MIN_MEMORY_YEAR = 2011;
const MAX_MEMORY_YEAR_OFFSET = 1;

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
	month: "long",
	day: "numeric",
});

const ON_THIS_DAY_HEADING = new Intl.DateTimeFormat(undefined, {
	month: "long",
	day: "numeric",
});

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
	month: "long",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
});

const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value) {
	return String(value).padStart(2, "0");
}

export function buildCalendarDate(year, month, day) {
	return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidCalendarParts(year, month, day) {
	const numericYear = Number(year);
	const numericMonth = Number(month);
	const numericDay = Number(day);
	if (
		!Number.isInteger(numericYear) ||
		!Number.isInteger(numericMonth) ||
		!Number.isInteger(numericDay)
	) {
		return false;
	}
	if (
		numericMonth < 1 ||
		numericMonth > 12 ||
		numericDay < 1 ||
		numericDay > 31
	) {
		return false;
	}

	const maxYear = new Date().getFullYear() + MAX_MEMORY_YEAR_OFFSET;
	return numericYear >= MIN_MEMORY_YEAR && numericYear <= maxYear;
}

function isValidMemoryDate(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;

	const year = date.getFullYear();
	const maxYear = new Date().getFullYear() + MAX_MEMORY_YEAR_OFFSET;
	return year >= MIN_MEMORY_YEAR && year <= maxYear;
}

function dateFromParts(year, month, day, hour = 0, minute = 0, second = 0) {
	if (!isValidCalendarParts(year, month, day)) return null;

	const parsed = new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
	);

	if (
		parsed.getFullYear() !== Number(year) ||
		parsed.getMonth() !== Number(month) - 1 ||
		parsed.getDate() !== Number(day)
	) {
		return null;
	}

	return isValidMemoryDate(parsed) ? parsed : null;
}

function buildParsedDate(year, month, day, hour = 0, minute = 0, second = 0) {
	const date = dateFromParts(year, month, day, hour, minute, second);
	if (!date) return null;

	return {
		date,
		calendarDate: buildCalendarDate(year, month, day),
		dateSource: "fileName",
	};
}

export function serializeLocalDateTime(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function parseCapturedAt(value) {
	if (!value) return new Date(Number.NaN);

	if (typeof value === "string" && LOCAL_DATE_TIME_PATTERN.test(value)) {
		const [datePart, timePart] = value.split("T");
		const [year, month, day] = datePart.split("-").map(Number);
		const [hour, minute, second] = timePart.split(":").map(Number);
		return new Date(year, month - 1, day, hour, minute, second);
	}

	return new Date(value);
}

export function formatDate(date) {
	const parsed = parseCapturedAt(date);
	if (Number.isNaN(parsed.getTime())) return "Unknown date";
	return FULL_DATE_FORMATTER.format(parsed);
}

function parseUnixBasename(baseName) {
	const withoutExtension = baseName.replace(/\.[^.]+$/, "");
	if (!/^\d{10,13}$/.test(withoutExtension)) return null;

	const timestamp =
		withoutExtension.length === 13
			? Number(withoutExtension)
			: Number(withoutExtension) * 1000;
	const parsed = new Date(timestamp);
	if (!isValidMemoryDate(parsed)) return null;

	return {
		date: parsed,
		calendarDate: buildCalendarDate(
			parsed.getFullYear(),
			parsed.getMonth() + 1,
			parsed.getDate(),
		),
		dateSource: "fileName",
	};
}

export function parseDateFromFileName(fileName = "") {
	const baseName = fileName.split(/[/\\]/).pop() || fileName;

	const startPatterns = [
		{
			regex: /^(\d{4})-(\d{2})-(\d{2})[_\sT-](\d{2})[-:]?(\d{2})[-:]?(\d{2})/,
			map: (match) =>
				buildParsedDate(
					match[1],
					match[2],
					match[3],
					match[4],
					match[5],
					match[6],
				),
		},
		{
			regex: /^(\d{4})-(\d{2})-(\d{2})[_\sT-](\d{2})(\d{2})(\d{2})/,
			map: (match) =>
				buildParsedDate(
					match[1],
					match[2],
					match[3],
					match[4],
					match[5],
					match[6],
				),
		},
		{
			regex: /^(\d{4})(\d{2})(\d{2})[_\sT-](\d{2})(\d{2})(\d{2})/,
			map: (match) =>
				buildParsedDate(
					match[1],
					match[2],
					match[3],
					match[4],
					match[5],
					match[6],
				),
		},
		{
			regex: /^(\d{4})-(\d{2})-(\d{2})(?:[_\s.-]|$)/,
			map: (match) => buildParsedDate(match[1], match[2], match[3]),
		},
		{
			regex: /^(\d{4})(\d{2})(\d{2})(?:[_\s.-]|$)/,
			map: (match) => buildParsedDate(match[1], match[2], match[3]),
		},
	];

	for (const pattern of startPatterns) {
		const match = baseName.match(pattern.regex);
		if (match) {
			const parsed = pattern.map(match);
			if (parsed) return parsed;
		}
	}

	const embeddedMatch = baseName.match(
		/(?:^|[^\d])(\d{4})-(\d{2})-(\d{2})(?:[_\s.-]|$)/,
	);
	if (embeddedMatch) {
		const parsed = buildParsedDate(
			embeddedMatch[1],
			embeddedMatch[2],
			embeddedMatch[3],
		);
		if (parsed) return parsed;
	}

	return parseUnixBasename(baseName);
}

function dateCandidatesFromFile(file) {
	const relativePath = file.webkitRelativePath || file.name;
	const segments = relativePath.split(/[/\\]/).filter(Boolean);
	return [...segments].reverse();
}

export function resolveMemoryDate(file) {
	for (const candidate of dateCandidatesFromFile(file)) {
		const parsed = parseDateFromFileName(candidate);
		if (parsed) {
			return {
				capturedAt: serializeLocalDateTime(parsed.date),
				calendarDate: parsed.calendarDate,
				dateSource: parsed.dateSource,
			};
		}
	}

	const fallback = new Date(file.lastModified);
	return {
		capturedAt: serializeLocalDateTime(fallback),
		calendarDate: buildCalendarDate(
			fallback.getFullYear(),
			fallback.getMonth() + 1,
			fallback.getDate(),
		),
		dateSource: "fileLastModified",
	};
}

export function formatDateSource(dateSource) {
	if (dateSource === "fileName") return "Parsed from filename";
	if (dateSource === "fileLastModified") return "File modified date (fallback)";
	return dateSource;
}

export function getOnThisDayHeading(referenceDate = new Date()) {
	return ON_THIS_DAY_HEADING.format(referenceDate);
}

function getMemoryCalendarParts(memory) {
	if (memory.calendarDate && CALENDAR_DATE_PATTERN.test(memory.calendarDate)) {
		const [year, month, day] = memory.calendarDate.split("-").map(Number);
		return { year, month: month - 1, day };
	}

	const parsed = parseCapturedAt(memory.capturedAt);
	return {
		year: parsed.getFullYear(),
		month: parsed.getMonth(),
		day: parsed.getDate(),
	};
}

export function getOnThisDayMemories(memories, referenceDate = new Date()) {
	const month = referenceDate.getMonth();
	const day = referenceDate.getDate();
	const currentYear = referenceDate.getFullYear();

	const matches = memories.filter((memory) => {
		const parts = getMemoryCalendarParts(memory);
		if (!Number.isFinite(parts.year)) return false;
		return (
			parts.month === month && parts.day === day && parts.year !== currentYear
		);
	});

	matches.sort(
		(a, b) =>
			parseCapturedAt(b.capturedAt).getTime() -
			parseCapturedAt(a.capturedAt).getTime(),
	);

	const byYear = new Map();
	for (const memory of matches) {
		const year = String(getMemoryCalendarParts(memory).year);
		if (!byYear.has(year)) byYear.set(year, []);
		byYear.get(year).push(memory);
	}

	return {
		heading: getOnThisDayHeading(referenceDate),
		total: matches.length,
		years: Array.from(byYear.entries())
			.sort(([a], [b]) => Number(b) - Number(a))
			.map(([year, yearMemories]) => ({ year, memories: yearMemories })),
	};
}

export function getDateParts(dateInput, calendarDate) {
	if (calendarDate && CALENDAR_DATE_PATTERN.test(calendarDate)) {
		const [year, month, day] = calendarDate.split("-").map(Number);
		const anchor = new Date(year, month - 1, day, 12, 0, 0);
		const parsed = parseCapturedAt(dateInput);
		const timestamp = Number.isNaN(parsed.getTime())
			? anchor.getTime()
			: parsed.getTime();

		return {
			year: String(year),
			month: MONTH_FORMATTER.format(anchor),
			monthIndex: month - 1,
			day: DAY_FORMATTER.format(anchor),
			dayKey: calendarDate,
			timestamp,
		};
	}

	const parsed = parseCapturedAt(dateInput);
	if (Number.isNaN(parsed.getTime())) {
		return {
			year: "Unknown",
			month: "Unknown",
			monthIndex: 0,
			day: "Unknown date",
			dayKey: "unknown",
			timestamp: 0,
		};
	}

	return {
		year: String(parsed.getFullYear()),
		month: MONTH_FORMATTER.format(parsed),
		monthIndex: parsed.getMonth(),
		day: DAY_FORMATTER.format(parsed),
		dayKey: buildCalendarDate(
			parsed.getFullYear(),
			parsed.getMonth() + 1,
			parsed.getDate(),
		),
		timestamp: parsed.getTime(),
	};
}
