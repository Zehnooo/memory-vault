import MemoryCard from "./MemoryCard.jsx";

export default function TimelineGroup({
	group,
	onOpenMemory,
	onToggleFavorite,
}) {
	return (
		<section className="year-group" aria-labelledby={`year-${group.year}`}>
			<h2 id={`year-${group.year}`}>{group.year}</h2>

			{group.months.map((monthGroup) => (
				<section
					className="month-group"
					key={`${group.year}-${monthGroup.month}`}>
					<h3>{monthGroup.month}</h3>

					{monthGroup.days.map((dayGroup) => (
						<section className="day-group" key={dayGroup.dayKey}>
							<div className="day-heading">
								<h4>{dayGroup.day}</h4>
								<span>{dayGroup.memories.length} memories</span>
							</div>

							<div className="memory-grid">
								{dayGroup.memories.map((memory) => (
									<MemoryCard
										key={memory.relativePath}
										memory={memory}
										onOpen={() => onOpenMemory(memory.id)}
										onToggleFavorite={() => onToggleFavorite(memory)}
									/>
								))}
							</div>
						</section>
					))}
				</section>
			))}
		</section>
	);
}
