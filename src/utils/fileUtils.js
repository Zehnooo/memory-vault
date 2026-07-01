import {
	getDateParts,
	parseCapturedAt,
	resolveMemoryDate,
} from "./dateUtils.js";

const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"heic",
	"heif",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);
const ALL_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

function extensionFromName(fileName = "") {
	return fileName.split(".").pop()?.toLowerCase() || "";
}

export function isMediaFile(file) {
	if (!file) return false;
	if (file.type?.startsWith("image/") || file.type?.startsWith("video/"))
		return true;
	return ALL_EXTENSIONS.has(extensionFromName(file.name));
}

export function getMediaType(file) {
	if (file.type?.startsWith("video/")) return "video";
	if (file.type?.startsWith("image/")) return "image";
	return VIDEO_EXTENSIONS.has(extensionFromName(file.name)) ? "video" : "image";
}

export function createMemoryFromFile(file) {
	const { capturedAt, calendarDate, dateSource } = resolveMemoryDate(file);

	return {
		id: crypto.randomUUID(),
		file,
		fileName: file.name,
		relativePath: file.webkitRelativePath || file.name,
		mediaType: getMediaType(file),
		mimeType: file.type,
		size: file.size,
		lastModified: file.lastModified,
		capturedAt,
		calendarDate,
		dateSource,
		objectUrl: URL.createObjectURL(file),
		favorite: false,
		tags: [],
		note: "",
	};
}

export function formatFileSize(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	const index = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** index;
	return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function filterMemories(memories, filters = {}) {
	const search = filters.search?.trim().toLowerCase() || "";
	const filter = filters.filter || "all";

	return memories.filter((memory) => {
		if (filter === "photos" && memory.mediaType !== "image") return false;
		if (filter === "videos" && memory.mediaType !== "video") return false;
		if (filter === "favorites" && !memory.favorite) return false;

		if (!search) return true;

		const haystack = [
			memory.fileName,
			memory.relativePath,
			...(memory.tags || []),
			memory.note,
		]
			.join(" ")
			.toLowerCase();

		return haystack.includes(search);
	});
}

export function sortMemories(memories, sortDirection = "newest") {
	const direction = sortDirection === "oldest" ? 1 : -1;
	return [...memories].sort((a, b) => {
		const first = parseCapturedAt(a.capturedAt).getTime();
		const second = parseCapturedAt(b.capturedAt).getTime();
		return (first - second) * direction;
	});
}

export function groupMemoriesByDate(memories) {
	const yearMap = new Map();

	for (const memory of memories) {
		const parts = getDateParts(memory.capturedAt, memory.calendarDate);

		if (!yearMap.has(parts.year)) {
			yearMap.set(parts.year, {
				year: parts.year,
				months: new Map(),
				timestamp: parts.timestamp,
			});
		}

		const yearGroup = yearMap.get(parts.year);
		if (!yearGroup.months.has(parts.month)) {
			yearGroup.months.set(parts.month, {
				month: parts.month,
				monthIndex: parts.monthIndex,
				days: new Map(),
				timestamp: parts.timestamp,
			});
		}

		const monthGroup = yearGroup.months.get(parts.month);
		if (!monthGroup.days.has(parts.dayKey)) {
			monthGroup.days.set(parts.dayKey, {
				day: parts.day,
				dayKey: parts.dayKey,
				memories: [],
				timestamp: parts.timestamp,
			});
		}

		monthGroup.days.get(parts.dayKey).memories.push(memory);
	}

	return Array.from(yearMap.values()).map((yearGroup) => ({
		year: yearGroup.year,
		months: Array.from(yearGroup.months.values()).map((monthGroup) => ({
			month: monthGroup.month,
			days: Array.from(monthGroup.days.values()),
		})),
	}));
}
