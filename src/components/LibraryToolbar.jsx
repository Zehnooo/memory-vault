export default function LibraryToolbar({
	search,
	filter,
	sortDirection,
	onSearchChange,
	onFilterChange,
	onSortToggle,
	onClearLibrary,
}) {
	return (
		<div className="toolbar" role="region" aria-label="Library tools">
			<label className="field search-field">
				<span>Search</span>
				<input
					type="search"
					value={search}
					placeholder="File name, path, tag, note..."
					onChange={(event) => onSearchChange(event.target.value)}
				/>
			</label>

			<label className="field">
				<span>Filter</span>
				<select
					value={filter}
					onChange={(event) => onFilterChange(event.target.value)}>
					<option value="all">All</option>
					<option value="photos">Photos</option>
					<option value="videos">Videos</option>
					<option value="favorites">Favorites</option>
				</select>
			</label>

			<button className="button secondary" type="button" onClick={onSortToggle}>
				{sortDirection === "newest" ? "Newest first" : "Oldest first"}
			</button>

			<button className="button danger" type="button" onClick={onClearLibrary}>
				Clear library
			</button>
		</div>
	);
}
