import TimelineGroup from "./TimelineGroup.jsx";

export default function Timeline({ groups, onOpenMemory, onToggleFavorite }) {
	return (
		<div className="timeline">
			{groups.map((yearGroup) => (
				<TimelineGroup
					key={yearGroup.year}
					group={yearGroup}
					onOpenMemory={onOpenMemory}
					onToggleFavorite={onToggleFavorite}
				/>
			))}
		</div>
	);
}
