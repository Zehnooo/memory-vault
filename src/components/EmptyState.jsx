export default function EmptyState({ title, message }) {
	return (
		<div className="empty-state">
			<p className="empty-mark" aria-hidden="true">
				MV
			</p>
			<h2>{title}</h2>
			<p>{message}</p>
		</div>
	);
}
