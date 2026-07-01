import { describe, expect, it } from "vitest";
import { memoryToStoredRecord, supportsCompression } from "./blobStorage.js";

describe("blob storage helpers", () => {
	it("builds stored records with compression metadata", () => {
		const memory = {
			relativePath: "Snapchat/photo.png",
			fileName: "photo.png",
			mimeType: "image/png",
			mediaType: "image",
			capturedAt: "2024-03-12T08:00:00.000Z",
			dateSource: "fileName",
			lastModified: 1710000000000,
			size: 2048,
		};
		const packed = {
			buffer: new Uint8Array([1, 2, 3]).buffer,
			compressed: true,
			storedSize: 3,
		};

		expect(memoryToStoredRecord(memory, packed)).toMatchObject({
			relativePath: "Snapchat/photo.png",
			compressed: true,
			storedSize: 3,
			size: 2048,
		});
	});

	it("reports whether browser compression APIs exist", () => {
		expect(typeof supportsCompression()).toBe("boolean");
	});
});
