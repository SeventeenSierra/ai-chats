// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, Columns2, ListFilter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

type SortOption = 'createdAt' | 'title' | 'turnCount' | 'charCount'
type SortDirection = 'asc' | 'desc'
type GroupByOption = 'category' | 'none'

type CharacterCountBucket = 'sm' | 'md' | 'lg' | 'xl'
type TurnCountBucket = 'xs' | 'sm' | 'md' | 'lg'

type StatusFilterOption = 'active' | 'archived' | 'all'

type FilterOptions = {
	richContent: 'any' | 'yes' | 'no'
	characterCount: Set<CharacterCountBucket>
	turnCount: Set<TurnCountBucket>
	status: StatusFilterOption
	noCategoryOnly: boolean
	deepResearchOnly: boolean
}

type ConversationFiltersProps = {
	searchTerm: string
	onSearchTermChange: (term: string) => void
	sortOption: SortOption
	onSortOptionChange: (option: SortOption) => void
	sortDirection: SortDirection
	onSortDirectionChange: (direction: SortDirection) => void
	groupBy: GroupByOption
	onGroupByChange: (option: GroupByOption) => void
	filters: FilterOptions
	onFilterChange: <K extends keyof FilterOptions>(filterName: K, value: FilterOptions[K]) => void
}

const charCountLabels: Record<CharacterCountBucket, string> = {
	sm: 'Small (< 1k chars)',
	md: 'Medium (1k - 5k)',
	lg: 'Large (5k - 20k)',
	xl: 'Extra Large (> 20k)',
}

const turnCountLabels: Record<TurnCountBucket, string> = {
	xs: 'Very Short (1-2)',
	sm: 'Short (3-5)',
	md: 'Medium (6-15)',
	lg: 'Long (> 15)',
}

export function ConversationFilters({
	searchTerm,
	onSearchTermChange,
	sortOption,
	onSortOptionChange,
	sortDirection,
	onSortDirectionChange,
	groupBy,
	onGroupByChange,
	filters,
	onFilterChange,
}: ConversationFiltersProps) {
	const handleCharacterCountChange = (bucket: CharacterCountBucket, checked: boolean) => {
		const newSet = new Set(filters.characterCount)
		if (checked) {
			newSet.add(bucket)
		} else {
			newSet.delete(bucket)
		}
		onFilterChange('characterCount', newSet)
	}

	const handleTurnCountChange = (bucket: TurnCountBucket, checked: boolean) => {
		const newSet = new Set(filters.turnCount)
		if (checked) {
			newSet.add(bucket)
		} else {
			newSet.delete(bucket)
		}
		onFilterChange('turnCount', newSet)
	}

	const toggleSortDirection = () => {
		onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
	}

	const SortDirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown

	return (
		<div className="flex flex-col gap-2">
			<div className="relative flex-grow">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Search titles and content..."
					className="w-full rounded-lg bg-background pl-8"
					value={searchTerm}
					onChange={(e) => onSearchTermChange(e.target.value)}
				/>
			</div>
			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="h-9 gap-1">
							<Columns2 className="h-3.5 w-3.5" />
							<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Group</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Group by</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuRadioGroup
							value={groupBy}
							onValueChange={(value) => onGroupByChange(value as GroupByOption)}
						>
							<DropdownMenuRadioItem value="category">Category</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="h-9 gap-1">
							<ListFilter className="h-3.5 w-3.5" />
							<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Filter by</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuCheckboxItem
							checked={filters.noCategoryOnly}
							onCheckedChange={(checked) => onFilterChange('noCategoryOnly', !!checked)}
						>
							No Category Only
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={filters.deepResearchOnly}
							onCheckedChange={(checked) => onFilterChange('deepResearchOnly', !!checked)}
						>
							🔬 Deep Research Only
						</DropdownMenuCheckboxItem>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuRadioGroup
									value={filters.status}
									onValueChange={(value) =>
										onFilterChange('status', value as FilterOptions['status'])
									}
								>
									<DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
								</DropdownMenuRadioGroup>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>Rich Content</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuRadioGroup
									value={filters.richContent}
									onValueChange={(value) =>
										onFilterChange('richContent', value as FilterOptions['richContent'])
									}
								>
									<DropdownMenuRadioItem value="any">Any</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="yes">Yes</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="no">No</DropdownMenuRadioItem>
								</DropdownMenuRadioGroup>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>Character Count</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{Object.keys(charCountLabels).map((bucket) => (
									<DropdownMenuCheckboxItem
										key={bucket}
										checked={filters.characterCount.has(bucket as CharacterCountBucket)}
										onCheckedChange={(checked) =>
											handleCharacterCountChange(bucket as CharacterCountBucket, !!checked)
										}
									>
										{charCountLabels[bucket as CharacterCountBucket]}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>Turn Count</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{Object.keys(turnCountLabels).map((bucket) => (
									<DropdownMenuCheckboxItem
										key={bucket}
										checked={filters.turnCount.has(bucket as TurnCountBucket)}
										onCheckedChange={(checked) =>
											handleTurnCountChange(bucket as TurnCountBucket, !!checked)
										}
									>
										{turnCountLabels[bucket as TurnCountBucket]}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					</DropdownMenuContent>
				</DropdownMenu>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="h-9 gap-1">
							<ArrowUpDown className="h-3.5 w-3.5" />
							<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Sort</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Sort by</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuRadioGroup
							value={sortOption}
							onValueChange={(value) => onSortOptionChange(value as SortOption)}
						>
							<DropdownMenuRadioItem value="createdAt">Date</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="turnCount">Turn Count</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="charCount">Character Count</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<Button variant="outline" size="sm" className="h-9 w-9" onClick={toggleSortDirection}>
					<SortDirectionIcon className="h-3.5 w-3.5" />
					<span className="sr-only">Toggle sort direction</span>
				</Button>
			</div>
		</div>
	)
}
