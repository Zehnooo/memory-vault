const STORAGE_PREFIX = "memory-vault:metadata:";

function storageKey(relativePath) {
	return `${STORAGE_PREFIX}${relativePath}`;
}

export function getMemoryMetadata(relativePath) {
	if (!relativePath) return null;

	try {
		const raw = localStorage.getItem(storageKey(relativePath));
		if (!raw) return null;

		const parsed = JSON.parse(raw);
		return {
			favorite: Boolean(parsed.favorite),
			tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : [],
			note: typeof parsed.note === "string" ? parsed.note : "",
		};
	} catch {
		return null;
	}
}

export function saveMemoryMetadata(relativePath, metadata) {
	if (!relativePath) return;

	const payload = {
		favorite: Boolean(metadata.favorite),
		tags: Array.isArray(metadata.tags) ? metadata.tags.filter(Boolean) : [],
		note: typeof metadata.note === "string" ? metadata.note : "",
	};

	localStorage.setItem(storageKey(relativePath), JSON.stringify(payload));
}

export function mergeSavedMetadata(memory) {
	const saved = getMemoryMetadata(memory.relativePath);
	if (!saved) return memory;

	return {
		...memory,
		favorite: saved.favorite,
		tags: saved.tags,
		note: saved.note,
	};
}

export function clearAllMemoryMetadata() {
	const keysToRemove = [];
	for (let index = 0; index < localStorage.length; index += 1) {
		const key = localStorage.key(index);
		if (key?.startsWith(STORAGE_PREFIX)) {
			keysToRemove.push(key);
		}
	}
	for (const key of keysToRemove) {
		localStorage.removeItem(key);
	}
}
