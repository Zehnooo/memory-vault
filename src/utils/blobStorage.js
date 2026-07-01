const DB_NAME = "memory-vault";
const DB_VERSION = 1;
const STORE_NAME = "media";

function openDb() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "relativePath" });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function runTransaction(mode, fn) {
	return openDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE_NAME, mode);
				const store = transaction.objectStore(STORE_NAME);

				Promise.resolve(fn(store))
					.then((result) => {
						transaction.oncomplete = () => {
							db.close();
							resolve(result);
						};
						transaction.onerror = () => reject(transaction.error);
					})
					.catch(reject);
			}),
	);
}

export function supportsCompression() {
	return typeof CompressionStream !== "undefined";
}

export async function compressBlob(blob) {
	if (!supportsCompression()) {
		return blob.arrayBuffer();
	}

	const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
	return new Response(stream).arrayBuffer();
}

export async function decompressBuffer(buffer, compressed, mimeType) {
	if (!compressed) {
		return new Blob([buffer], { type: mimeType });
	}

	if (!supportsCompression()) {
		throw new Error(
			"Compressed media requires a browser with DecompressionStream support.",
		);
	}

	const stream = new Blob([buffer])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	const blob = await new Response(stream).blob();
	return new Blob([blob], { type: mimeType });
}

export async function packBlobForStorage(blob, mediaType) {
	const originalBuffer = await blob.arrayBuffer();

	if (mediaType === "video" || !supportsCompression()) {
		return {
			buffer: originalBuffer,
			compressed: false,
			storedSize: originalBuffer.byteLength,
		};
	}

	try {
		const compressedBuffer = await compressBlob(blob);
		if (compressedBuffer.byteLength < originalBuffer.byteLength * 0.92) {
			return {
				buffer: compressedBuffer,
				compressed: true,
				storedSize: compressedBuffer.byteLength,
			};
		}
	} catch {
		// Fall back to raw storage if compression fails.
	}

	return {
		buffer: originalBuffer,
		compressed: false,
		storedSize: originalBuffer.byteLength,
	};
}

export function memoryToStoredRecord(memory, packed) {
	return {
		relativePath: memory.relativePath,
		fileName: memory.fileName,
		mimeType: memory.mimeType,
		mediaType: memory.mediaType,
		capturedAt: memory.capturedAt,
		calendarDate: memory.calendarDate,
		dateSource: memory.dateSource,
		lastModified: memory.lastModified,
		size: memory.size,
		storedSize: packed.storedSize,
		compressed: packed.compressed,
		data: packed.buffer,
		savedAt: Date.now(),
	};
}

export async function saveMemoriesToStorage(memories, onProgress) {
	if (!memories.length) {
		await clearStoredMemories();
		return { saved: 0, totalBytes: 0 };
	}

	const records = [];
	let totalBytes = 0;

	for (const memory of memories) {
		const packed = await packBlobForStorage(memory.file, memory.mediaType);
		const record = memoryToStoredRecord(memory, packed);
		records.push(record);
		totalBytes += record.storedSize;
		onProgress?.({ saved: records.length, total: memories.length, totalBytes });
	}

	await runTransaction("readwrite", (store) => {
		store.clear();
		for (const record of records) {
			store.put(record);
		}
	});

	return { saved: records.length, totalBytes };
}

export async function loadMemoriesFromStorage(createMemoryFromStored) {
	const records = await runTransaction("readonly", (store) => {
		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	});

	const memories = [];
	for (const record of records) {
		const memory = await createMemoryFromStored(record);
		if (memory) memories.push(memory);
	}

	return memories;
}

export async function clearStoredMemories() {
	await runTransaction("readwrite", (store) => {
		store.clear();
	});
}

export async function getStoredLibraryStats() {
	const records = await runTransaction("readonly", (store) => {
		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	});

	const totalBytes = records.reduce(
		(sum, record) => sum + (record.storedSize || record.size || 0),
		0,
	);
	const compressedCount = records.filter((record) => record.compressed).length;

	return {
		count: records.length,
		totalBytes,
		compressedCount,
	};
}

export async function getBrowserStorageEstimate() {
	if (!navigator.storage?.estimate) {
		return null;
	}

	const estimate = await navigator.storage.estimate();
	return {
		usage: estimate.usage || 0,
		quota: estimate.quota || 0,
	};
}
