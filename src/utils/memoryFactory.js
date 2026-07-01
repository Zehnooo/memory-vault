import { decompressBuffer } from "./blobStorage.js";
import { mergeSavedMetadata } from "./storageUtils.js";
import { parseDateFromFileName, serializeLocalDateTime } from "./dateUtils.js";

function resolveStoredDates(record) {
	if (record.calendarDate) {
		return {
			capturedAt: record.capturedAt,
			calendarDate: record.calendarDate,
			dateSource: record.dateSource,
		};
	}

	const parsed = parseDateFromFileName(record.fileName);
	if (parsed) {
		return {
			capturedAt: serializeLocalDateTime(parsed.date),
			calendarDate: parsed.calendarDate,
			dateSource: "fileName",
		};
	}

	return {
		capturedAt: record.capturedAt,
		calendarDate: record.calendarDate,
		dateSource: record.dateSource,
	};
}

export async function createMemoryFromStoredRecord(record) {
	if (!record?.relativePath || !record.data) return null;

	const blob = await decompressBuffer(
		record.data,
		record.compressed,
		record.mimeType,
	);
	const file = new File([blob], record.fileName, {
		type: record.mimeType,
		lastModified: record.lastModified,
	});

	Object.defineProperty(file, "webkitRelativePath", {
		value: record.relativePath,
		configurable: true,
	});

	const dates = resolveStoredDates(record);

	return mergeSavedMetadata({
		id: crypto.randomUUID(),
		file,
		fileName: record.fileName,
		relativePath: record.relativePath,
		mediaType: record.mediaType,
		mimeType: record.mimeType,
		size: record.size,
		lastModified: record.lastModified,
		capturedAt: dates.capturedAt,
		calendarDate: dates.calendarDate,
		dateSource: dates.dateSource,
		objectUrl: URL.createObjectURL(blob),
		favorite: false,
		tags: [],
		note: "",
	});
}
