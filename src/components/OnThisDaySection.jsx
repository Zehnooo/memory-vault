import MemoryCard from "./MemoryCard.jsx";

export default function OnThisDaySection({
	heading,
	years,
	onOpenMemory,
	onToggleFavorite,
}) {
	if (!years.length) return null;

	return (
		<section className="on-this-day" aria-labelledby="on-this-day-title">
			<div className="on-this-day-header">
				<div>
					<p className="eyebrow">On this day</p>
					<h2 id="on-this-day-title">{heading}</h2>
				</div>
				<p>Memories captured on today&apos;s date in other years.</p>
			</div>

			{years.map((yearGroup) => (
				<section
					key={yearGroup.year}
					className="on-this-day-year"
					aria-labelledby={`on-this-day-${yearGroup.year}`}>
					<h3 id={`on-this-day-${yearGroup.year}`}>{yearGroup.year}</h3>
					<div className="memory-grid">
						{yearGroup.memories.map((memory) => (
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
	);
}
