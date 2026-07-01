import { useId } from "react";

export default function ImportPanel({ onImport, summary, compact = false }) {
	const inputId = useId();

	function handleChange(event) {
		onImport(event.target.files);
		event.target.value = "";
	}

	return (
		<section className={compact ? "import-panel compact" : "import-panel"}>
			{!compact && (
				<div className="import-copy">
					<p className="privacy-note">
						Your files stay on this device. Nothing is uploaded. After import,
						your library is saved in this browser&apos;s IndexedDB so it can
						reload later without reselecting the folder.
					</p>
					<h2>Select your Memories folder</h2>
					<p>
						Choose a local Snapchat Memories export folder. Memory Vault scans
						supported images and videos in your browser, saves them locally, and
						builds your timeline.
					</p>
				</div>
			)}

			<input
				id={inputId}
				className="visually-hidden"
				type="file"
				webkitdirectory=""
				multiple
				accept="image/*,video/*"
				onChange={handleChange}
			/>

			<label
				className={compact ? "drop-card reimport-card" : "drop-card"}
				htmlFor={inputId}
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => {
					event.preventDefault();
					if (event.dataTransfer.files?.length)
						onImport(event.dataTransfer.files);
				}}>
				<span className="drop-icon" aria-hidden="true">
					MV
				</span>
				<span>
					<strong>{compact ? "Re-import folder" : "Select Folder"}</strong>
					<small>
						{compact
							? "Reload media and reapply saved metadata."
							: "Images and videos only. Nested folders supported."}
					</small>
				</span>
			</label>

			{summary && (
				<div className="summary-grid" aria-live="polite">
					<SummaryItem label="Media files" value={summary.total} />
					<SummaryItem label="Photos" value={summary.photos} />
					<SummaryItem label="Videos" value={summary.videos} />
					<SummaryItem label="Date range" value={summary.dateRange} wide />
					{summary.unsupported > 0 && (
						<SummaryItem
							label="Unsupported skipped"
							value={summary.unsupported}
						/>
					)}
				</div>
			)}

			{summary?.total === 0 && (
				<p className="empty-hint">
					No supported image or video files found in that selection.
				</p>
			)}
		</section>
	);
}

function SummaryItem({ label, value, wide = false }) {
	return (
		<div className={wide ? "summary-item wide" : "summary-item"}>
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}
