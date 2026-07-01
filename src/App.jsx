import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "./components/EmptyState.jsx";
import ImportPanel from "./components/ImportPanel.jsx";
import LibraryToolbar from "./components/LibraryToolbar.jsx";
import MemoryModal from "./components/MemoryModal.jsx";
import OnThisDaySection from "./components/OnThisDaySection.jsx";
import StorageStatus from "./components/StorageStatus.jsx";
import Timeline from "./components/Timeline.jsx";
import {
	createMemoryFromFile,
	filterMemories,
	groupMemoriesByDate,
	isMediaFile,
	sortMemories,
} from "./utils/fileUtils.js";
import {
	formatDate,
	getOnThisDayMemories,
	parseCapturedAt,
} from "./utils/dateUtils.js";
import {
	clearAllMemoryMetadata,
	mergeSavedMetadata,
	saveMemoryMetadata,
} from "./utils/storageUtils.js";
import {
	clearStoredMemories,
	getBrowserStorageEstimate,
	getStoredLibraryStats,
	loadMemoriesFromStorage,
	saveMemoriesToStorage,
} from "./utils/blobStorage.js";
import { createMemoryFromStoredRecord } from "./utils/memoryFactory.js";

function revokeMemoryUrls(memories) {
	for (const memory of memories) {
		URL.revokeObjectURL(memory.objectUrl);
	}
}

function buildSummaryFromMemories(memories, unsupported = 0) {
	const photos = memories.filter(
		(memory) => memory.mediaType === "image",
	).length;
	const videos = memories.filter(
		(memory) => memory.mediaType === "video",
	).length;
	const dates = memories
		.map((memory) => parseCapturedAt(memory.capturedAt).getTime())
		.filter(Number.isFinite)
		.sort((a, b) => a - b);

	return {
		total: memories.length,
		photos,
		videos,
		unsupported,
		dateRange: dates.length
			? `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`
			: "No media dates",
	};
}

function buildImportSummary(allFiles, memories) {
	return buildSummaryFromMemories(
		memories,
		Math.max(allFiles.length - memories.length, 0),
	);
}

async function refreshStorageStats(setLibraryStats, setBrowserEstimate) {
	try {
		const [libraryStats, browserEstimate] = await Promise.all([
			getStoredLibraryStats(),
			getBrowserStorageEstimate(),
		]);
		setLibraryStats(libraryStats);
		setBrowserEstimate(browserEstimate);
	} catch {
		setLibraryStats({ count: 0, totalBytes: 0, compressedCount: 0 });
		setBrowserEstimate(null);
	}
}

export default function App() {
	const [memories, setMemories] = useState([]);
	const [summary, setSummary] = useState(null);
	const [selectedMemoryId, setSelectedMemoryId] = useState(null);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("all");
	const [sortDirection, setSortDirection] = useState("newest");
	const [loadState, setLoadState] = useState("loading");
	const [persistState, setPersistState] = useState("idle");
	const [persistMessage, setPersistMessage] = useState("");
	const [libraryStats, setLibraryStats] = useState({
		count: 0,
		totalBytes: 0,
		compressedCount: 0,
	});
	const [browserEstimate, setBrowserEstimate] = useState(null);
	const memoriesRef = useRef(memories);

	const selectedMemory =
		memories.find((memory) => memory.id === selectedMemoryId) || null;

	const visibleMemories = useMemo(() => {
		const filtered = filterMemories(memories, { search, filter });
		return sortMemories(filtered, sortDirection);
	}, [filter, memories, search, sortDirection]);

	const groupedMemories = useMemo(
		() => groupMemoriesByDate(visibleMemories),
		[visibleMemories],
	);

	const onThisDay = useMemo(() => getOnThisDayMemories(memories), [memories]);

	useEffect(() => {
		let cancelled = false;

		async function restoreLibrary() {
			try {
				const restored = await loadMemoriesFromStorage(
					createMemoryFromStoredRecord,
				);
				if (cancelled) {
					revokeMemoryUrls(restored);
					return;
				}

				if (restored.length) {
					setMemories(restored);
					setSummary(buildSummaryFromMemories(restored));
				}
				await refreshStorageStats(setLibraryStats, setBrowserEstimate);
				setLoadState("ready");
			} catch {
				if (!cancelled) {
					setLoadState("ready");
					setPersistState("error");
					setPersistMessage(
						"Could not restore your saved library from this browser.",
					);
				}
			}
		}

		restoreLibrary();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		memoriesRef.current = memories;
	}, [memories]);

	useEffect(() => {
		const handleUnload = () => revokeMemoryUrls(memoriesRef.current);
		window.addEventListener("beforeunload", handleUnload);
		return () => {
			window.removeEventListener("beforeunload", handleUnload);
			revokeMemoryUrls(memoriesRef.current);
		};
	}, []);

	async function persistMemories(nextMemories) {
		setPersistState("saving");
		setPersistMessage("Saving library to this browser...");

		try {
			await saveMemoriesToStorage(nextMemories, ({ saved, total }) => {
				setPersistMessage(`Saving library... ${saved}/${total}`);
			});
			await refreshStorageStats(setLibraryStats, setBrowserEstimate);
			setPersistState("idle");
			setPersistMessage("");
		} catch {
			setPersistState("error");
			setPersistMessage(
				"Could not save the full library. Your browser storage may be full.",
			);
		}
	}

	async function handleImport(fileList) {
		const allFiles = Array.from(fileList || []);
		const importedMemories = allFiles
			.filter(isMediaFile)
			.map((file) => mergeSavedMetadata(createMemoryFromFile(file)));

		setMemories((current) => {
			revokeMemoryUrls(current);
			return importedMemories;
		});
		setSummary(buildImportSummary(allFiles, importedMemories));
		setSelectedMemoryId(null);
		await persistMemories(importedMemories);
	}

	async function handleClearLibrary() {
		setMemories((current) => {
			revokeMemoryUrls(current);
			return [];
		});
		setSummary(null);
		setSelectedMemoryId(null);
		setSearch("");
		setFilter("all");
		setPersistState("idle");
		setPersistMessage("");

		try {
			await clearStoredMemories();
			clearAllMemoryMetadata();
			await refreshStorageStats(setLibraryStats, setBrowserEstimate);
		} catch {
			setPersistState("error");
			setPersistMessage("Could not fully clear saved browser storage.");
		}
	}

	function updateMemory(relativePath, changes) {
		setMemories((current) =>
			current.map((memory) => {
				if (memory.relativePath !== relativePath) return memory;

				const updated = { ...memory, ...changes };
				saveMemoryMetadata(relativePath, {
					favorite: updated.favorite,
					tags: updated.tags,
					note: updated.note,
				});
				return updated;
			}),
		);
	}

	return (
		<div className="app-shell">
			<a className="skip-link" href="#library">
				Skip to memories
			</a>
			<main>
				<section className="hero">
					<div>
						<p className="eyebrow">Local-first archive</p>
						<h1>Memory Vault</h1>
						<p className="subtitle">
							Browse your Snapchat Memories without Snapchat.
						</p>
					</div>
					{memories.length > 0 && (
						<button
							className="button ghost"
							type="button"
							onClick={handleClearLibrary}>
							Clear library
						</button>
					)}
				</section>

				<p className="date-warning">
					Dates are parsed from filenames when possible (for example{" "}
					<code>2024-03-12_14-30-45.jpg</code>). Timeline grouping uses the
					calendar date from the filename, not timezone-shifted timestamps.
				</p>

				<StorageStatus
					libraryStats={libraryStats}
					browserEstimate={browserEstimate}
					persistState={persistState}
					persistMessage={persistMessage}
				/>

				{loadState === "loading" ? (
					<EmptyState
						title="Loading saved library"
						message="Checking this browser for a previously saved Memory Vault library."
					/>
				) : memories.length === 0 ? (
					<ImportPanel onImport={handleImport} summary={summary} />
				) : (
					<section id="library" className="library">
						<ImportPanel onImport={handleImport} summary={summary} compact />
						<LibraryToolbar
							search={search}
							filter={filter}
							sortDirection={sortDirection}
							onSearchChange={setSearch}
							onFilterChange={setFilter}
							onSortToggle={() =>
								setSortDirection((current) =>
									current === "newest" ? "oldest" : "newest",
								)
							}
							onClearLibrary={handleClearLibrary}
						/>

						<OnThisDaySection
							heading={onThisDay.heading}
							years={onThisDay.years}
							onOpenMemory={setSelectedMemoryId}
							onToggleFavorite={(memory) =>
								updateMemory(memory.relativePath, {
									favorite: !memory.favorite,
								})
							}
						/>

						{visibleMemories.length === 0 ? (
							<EmptyState
								title="No matching memories"
								message="Try a different search term or filter."
							/>
						) : (
							<Timeline
								groups={groupedMemories}
								onOpenMemory={setSelectedMemoryId}
								onToggleFavorite={(memory) =>
									updateMemory(memory.relativePath, {
										favorite: !memory.favorite,
									})
								}
							/>
						)}
					</section>
				)}
			</main>

			{selectedMemory && (
				<MemoryModal
					memory={selectedMemory}
					onClose={() => setSelectedMemoryId(null)}
					onUpdate={(changes) =>
						updateMemory(selectedMemory.relativePath, changes)
					}
				/>
			)}
		</div>
	);
}
