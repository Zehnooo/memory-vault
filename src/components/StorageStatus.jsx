import { formatFileSize } from "../utils/fileUtils.js";

export default function StorageStatus({
	libraryStats,
	browserEstimate,
	persistState,
	persistMessage,
}) {
	if (!libraryStats?.count && !["saving", "error"].includes(persistState)) {
		return null;
	}

	return (
		<div className="storage-status" aria-live="polite">
			<div>
				<p className="eyebrow">Local storage</p>
				<strong>
					{libraryStats.count} memor{libraryStats.count === 1 ? "y" : "ies"}{" "}
					saved on this device
				</strong>
				<p>
					Media is stored in your browser&apos;s IndexedDB (not uploaded). JPEG
					and video files stay as-is; other images may be gzip-compressed when
					that saves space.
				</p>
			</div>

			<div className="storage-metrics">
				<Metric
					label="Library size"
					value={formatFileSize(libraryStats.totalBytes)}
				/>
				{libraryStats.compressedCount > 0 && (
					<Metric
						label="Compressed files"
						value={String(libraryStats.compressedCount)}
					/>
				)}
				{browserEstimate && (
					<Metric
						label="Browser storage used"
						value={`${formatFileSize(browserEstimate.usage)} / ${formatFileSize(browserEstimate.quota)}`}
					/>
				)}
			</div>

			{persistState === "saving" && (
				<p className="storage-note">{persistMessage || "Saving library..."}</p>
			)}
			{persistState === "error" && (
				<p className="storage-note error">
					{persistMessage || "Could not save the full library to this browser."}
				</p>
			)}
		</div>
	);
}

function Metric({ label, value }) {
	return (
		<div className="storage-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}
