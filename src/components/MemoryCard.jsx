import { formatDate } from "../utils/dateUtils.js";

export default function MemoryCard({ memory, onOpen, onToggleFavorite }) {
	return (
		<article className="memory-card">
			<button className="memory-preview" type="button" onClick={onOpen}>
				{memory.mediaType === "video" ? (
					<video src={memory.objectUrl} muted playsInline preload="metadata" />
				) : (
					<img src={memory.objectUrl} alt={memory.fileName} loading="lazy" />
				)}
				{memory.mediaType === "video" && (
					<span className="video-pill">Video</span>
				)}
			</button>

			<div className="memory-meta">
				<div>
					<p title={memory.relativePath}>{memory.fileName}</p>
					<span>{formatDate(memory.capturedAt)}</span>
				</div>
				<button
					className={memory.favorite ? "star-button active" : "star-button"}
					type="button"
					aria-label={memory.favorite ? "Remove favorite" : "Add favorite"}
					aria-pressed={memory.favorite}
					onClick={onToggleFavorite}>
					<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
						<path
							d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6.01L12 16.77l-5.4 2.84 1.03-6.01-4.36-4.25 6.03-.88L12 3Z"
							fill="currentColor"
						/>
					</svg>
				</button>
			</div>
		</article>
	);
}
