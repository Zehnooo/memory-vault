import { useEffect, useState } from "react";
import { formatDate, formatDateSource } from "../utils/dateUtils.js";
import { formatFileSize } from "../utils/fileUtils.js";

function parseTags(value) {
	return value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

export default function MemoryModal({ memory, onClose, onUpdate }) {
	const [tagText, setTagText] = useState(memory.tags.join(", "));
	const [noteDraft, setNoteDraft] = useState(memory.note);

	useEffect(() => {
		setTagText(memory.tags.join(", "));
		setNoteDraft(memory.note);
	}, [memory]);

	useEffect(() => {
		function handleKeyDown(event) {
			if (event.key === "Escape") onClose();
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	function handleTagsChange(value) {
		setTagText(value);
		onUpdate({ tags: parseTags(value) });
	}

	function saveNote() {
		onUpdate({ note: noteDraft });
	}

	return (
		<div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
			<section
				className="memory-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="memory-modal-title"
				onMouseDown={(event) => event.stopPropagation()}>
				<div className="modal-media">
					{memory.mediaType === "video" ? (
						<video src={memory.objectUrl} controls playsInline />
					) : (
						<img src={memory.objectUrl} alt={memory.fileName} />
					)}
				</div>

				<aside className="modal-details">
					<div className="modal-header">
						<div>
							<p className="eyebrow">{memory.mediaType}</p>
							<h2 id="memory-modal-title">{memory.fileName}</h2>
						</div>
						<button
							className="icon-button"
							type="button"
							onClick={onClose}
							aria-label="Close modal">
							x
						</button>
					</div>

					<dl className="detail-list">
						<div>
							<dt>Relative path</dt>
							<dd>{memory.relativePath}</dd>
						</div>
						<div>
							<dt>File size</dt>
							<dd>{formatFileSize(memory.size)}</dd>
						</div>
						<div>
							<dt>Captured date</dt>
							<dd>{formatDate(memory.capturedAt)}</dd>
						</div>
						<div>
							<dt>Date source</dt>
							<dd>{formatDateSource(memory.dateSource)}</dd>
						</div>
						<div>
							<dt>MIME type</dt>
							<dd>{memory.mimeType || "Unknown"}</dd>
						</div>
					</dl>

					<div className="modal-actions">
						<button
							className={
								memory.favorite ? "button primary" : "button secondary"
							}
							type="button"
							onClick={() => onUpdate({ favorite: !memory.favorite })}>
							{memory.favorite ? "Favorited" : "Add favorite"}
						</button>
						<a
							className="button secondary"
							href={memory.objectUrl}
							download={memory.fileName}>
							Download/open original
						</a>
					</div>

					<label className="field">
						<span>Tags</span>
						<input
							value={tagText}
							placeholder="travel, friends, birthday"
							onChange={(event) => handleTagsChange(event.target.value)}
						/>
					</label>

					<label className="field">
						<span>Note</span>
						<textarea
							value={noteDraft}
							placeholder="Add a private note..."
							rows="5"
							onChange={(event) => setNoteDraft(event.target.value)}
							onBlur={saveNote}
						/>
					</label>
					<button
						className="button secondary full-width"
						type="button"
						onClick={saveNote}>
						Save note
					</button>
				</aside>
			</section>
		</div>
	);
}
