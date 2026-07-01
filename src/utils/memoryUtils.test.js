import { describe, expect, it, vi, beforeEach } from "vitest";
import {
	createMemoryFromFile,
	filterMemories,
	groupMemoriesByDate,
	isMediaFile,
	sortMemories,
} from "./fileUtils.js";
import {
	getMemoryMetadata,
	mergeSavedMetadata,
	saveMemoryMetadata,
	clearAllMemoryMetadata,
} from "./storageUtils.js";
import { getOnThisDayMemories, parseDateFromFileName } from "./dateUtils.js";

function makeFile(name, type = "", lastModified = Date.UTC(2024, 2, 12)) {
	const file = new File(["memory"], name, { type, lastModified });
	Object.defineProperty(file, "webkitRelativePath", {
		value: `Snapchat/${name}`,
	});
	return file;
}

beforeEach(() => {
	localStorage.clear();
	vi.stubGlobal("crypto", {
		randomUUID: () => "test-id",
	});
	vi.stubGlobal("URL", {
		createObjectURL: () => "blob:test",
	});
});

describe("media file helpers", () => {
	it("detects supported media by MIME type or extension", () => {
		expect(isMediaFile(makeFile("photo.jpg", "image/jpeg"))).toBe(true);
		expect(isMediaFile(makeFile("clip.MOV"))).toBe(true);
		expect(isMediaFile(makeFile("notes.txt", "text/plain"))).toBe(false);
	});

	it("creates memory objects from browser File data", () => {
		const memory = createMemoryFromFile(makeFile("clip.mp4", "video/mp4"));

		expect(memory).toMatchObject({
			id: "test-id",
			fileName: "clip.mp4",
			relativePath: "Snapchat/clip.mp4",
			mediaType: "video",
			mimeType: "video/mp4",
			dateSource: "fileLastModified",
			objectUrl: "blob:test",
			favorite: false,
			tags: [],
			note: "",
		});
	});

	it("parses capture dates from common Snapchat filename formats", () => {
		const dashed = createMemoryFromFile(
			makeFile("2024-03-12_14-30-45.jpg", "image/jpeg"),
		);
		const compact = createMemoryFromFile(
			makeFile("20240312_143045.mp4", "video/mp4"),
		);

		expect(dashed.dateSource).toBe("fileName");
		expect(dashed.calendarDate).toBe("2024-03-12");
		expect(dashed.capturedAt).toBe("2024-03-12T14:30:45");

		expect(compact.dateSource).toBe("fileName");
		expect(compact.calendarDate).toBe("2024-03-12");
		expect(compact.capturedAt).toBe("2024-03-12T14:30:45");
	});

	it("groups filename-dated memories on the parsed calendar day", () => {
		const memory = createMemoryFromFile(
			makeFile("2021-03-25.mp4", "video/mp4"),
		);
		const groups = groupMemoriesByDate([memory]);

		expect(memory.calendarDate).toBe("2021-03-25");
		expect(groups[0].months[0].days[0].dayKey).toBe("2021-03-25");
	});
});

describe("filename date parsing", () => {
	it("supports dashed, compact, and date-only filename patterns", () => {
		expect(
			parseDateFromFileName("2024-03-12_14-30-45_overlay.mp4")?.calendarDate,
		).toBe("2024-03-12");
		expect(parseDateFromFileName("20240312_143045.jpg")?.calendarDate).toBe(
			"2024-03-12",
		);
		expect(parseDateFromFileName("vacation-2022-08-23.jpg")?.calendarDate).toBe(
			"2022-08-23",
		);
	});

	it("keeps the leading filename date when extra digits appear later", () => {
		const parsed = parseDateFromFileName("2021-03-25_1616860800_overlay.mp4");

		expect(parsed?.calendarDate).toBe("2021-03-25");
	});

	it("does not treat embedded unix ids as the capture date", () => {
		expect(
			parseDateFromFileName("2021-03-25-1616860800.mp4")?.calendarDate,
		).toBe("2021-03-25");
	});
});

describe("on this day", () => {
	it("returns memories from the same month/day in other years", () => {
		const today = new Date(2026, 6, 1);
		const result = getOnThisDayMemories(
			[
				{
					fileName: "today-old.jpg",
					calendarDate: "2024-07-01",
					capturedAt: "2024-07-01T12:00:00",
				},
				{
					fileName: "today-current.jpg",
					calendarDate: "2026-07-01",
					capturedAt: "2026-07-01T12:00:00",
				},
				{
					fileName: "other-day.jpg",
					calendarDate: "2023-06-15",
					capturedAt: "2023-06-15T12:00:00",
				},
			],
			today,
		);

		expect(result.total).toBe(1);
		expect(result.years).toHaveLength(1);
		expect(result.years[0].year).toBe("2024");
		expect(result.years[0].memories[0].fileName).toBe("today-old.jpg");
	});
});

describe("timeline helpers", () => {
	const baseMemories = [
		{
			fileName: "one.jpg",
			relativePath: "Vault/one.jpg",
			mediaType: "image",
			calendarDate: "2024-03-12",
			capturedAt: "2024-03-12T08:00:00",
			favorite: false,
			tags: ["beach"],
			note: "sunrise",
		},
		{
			fileName: "two.mp4",
			relativePath: "Vault/two.mp4",
			mediaType: "video",
			calendarDate: "2023-01-02",
			capturedAt: "2023-01-02T08:00:00",
			favorite: true,
			tags: ["party"],
			note: "new year",
		},
	];

	it("filters by search text and selected media filter", () => {
		expect(
			filterMemories(baseMemories, { search: "party", filter: "favorites" }),
		).toHaveLength(1);
		expect(
			filterMemories(baseMemories, { search: "vault", filter: "photos" })[0]
				.fileName,
		).toBe("one.jpg");
		expect(
			filterMemories(baseMemories, { search: "missing", filter: "all" }),
		).toHaveLength(0);
	});

	it("sorts memories by captured date", () => {
		expect(sortMemories(baseMemories, "newest")[0].fileName).toBe("one.jpg");
		expect(sortMemories(baseMemories, "oldest")[0].fileName).toBe("two.mp4");
	});

	it("groups memories by year, month, and day", () => {
		const groups = groupMemoriesByDate(baseMemories);

		expect(groups[0].year).toBe("2024");
		expect(groups[0].months[0].month).toBe("March");
		expect(groups[0].months[0].days[0].day).toBe("March 12");
		expect(groups[0].months[0].days[0].memories[0].fileName).toBe("one.jpg");
	});
});

describe("metadata persistence", () => {
	it("stores metadata by relative path and merges it into imported memories", () => {
		saveMemoryMetadata("Snapchat/photo.jpg", {
			favorite: true,
			tags: ["best"],
			note: "keeper",
		});

		expect(getMemoryMetadata("Snapchat/photo.jpg")).toEqual({
			favorite: true,
			tags: ["best"],
			note: "keeper",
		});
		expect(
			mergeSavedMetadata({
				relativePath: "Snapchat/photo.jpg",
				favorite: false,
				tags: [],
				note: "",
			}),
		).toMatchObject({
			favorite: true,
			tags: ["best"],
			note: "keeper",
		});
	});

	it("clears all saved metadata keys", () => {
		saveMemoryMetadata("Snapchat/a.jpg", {
			favorite: true,
			tags: [],
			note: "",
		});
		saveMemoryMetadata("Snapchat/b.jpg", {
			favorite: false,
			tags: ["x"],
			note: "",
		});
		clearAllMemoryMetadata();
		expect(getMemoryMetadata("Snapchat/a.jpg")).toBeNull();
		expect(getMemoryMetadata("Snapchat/b.jpg")).toBeNull();
	});
});
