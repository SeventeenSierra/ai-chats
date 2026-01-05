// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { BrainCircuit, Loader, Sparkles } from 'lucide-react'
import type * as React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { Conversation } from '@/types'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { ConversationFilters } from './conversation-filters'
import { ConversationListItem } from './conversation-list-item'

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

type ConversationListProps = {
	conversations: Conversation[]
	selectedConversation: Conversation | null
	onSelectConversation: (conversation: Conversation) => void
	loading: boolean
	isGrouping: boolean
	selectedIds: Set<string>
	onToggleSelection: (id: string) => void
	onToggleSelectAll: (select: boolean) => void
	onProcessSelected: () => void
	onProcessAll: () => void
	// Search, Filter, Sort props
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

function ConversationListSkeleton() {
	return (
		<div className="p-2 space-y-2">
			{[...Array(5)].map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loader
				<div key={i} className="flex items-center gap-4 p-2">
					<Skeleton className="h-5 w-5 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
			))}
		</div>
	)
}

export default function ConversationList({
	conversations,
	selectedConversation,
	onSelectConversation,
	loading,
	isGrouping,
	selectedIds,
	onToggleSelection,
	onToggleSelectAll,
	onProcessSelected,
	onProcessAll,
	...filterProps
}: ConversationListProps) {
	const isAnythingSelected = selectedIds.size > 0
	const isEverythingSelected = conversations.length > 0 && selectedIds.size === conversations.length
	const hasUnprocessed = conversations.some((c) => !c.category)

	const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		onToggleSelection(id)
	}

	return (
		<div className="flex flex-col h-full bg-background overflow-hidden">
			<div className="p-3 border-b space-y-3 shrink-0">
				<ConversationFilters {...filterProps} />
				{/* Actions Area */}
				{conversations.length > 0 && (
					<div className="flex items-center justify-between gap-2 pt-2 border-t">
						<div className="flex items-center gap-2">
							<Checkbox
								id="select-all-flat"
								checked={isEverythingSelected}
								onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
							/>
							<label htmlFor="select-all-flat" className="text-xs text-muted-foreground">
								Select all ({conversations.length})
							</label>
						</div>
						<div className="flex items-center gap-1">
							{isAnythingSelected ? (
								<Button
									onClick={onProcessSelected}
									size="sm"
									variant="outline"
									disabled={isGrouping}
								>
									{isGrouping ? (
										<Loader className="mr-1.5 h-3 w-3 animate-spin" />
									) : (
										<BrainCircuit className="mr-1.5 h-3 w-3" />
									)}
									Process ({selectedIds.size})
								</Button>
							) : hasUnprocessed ? (
								<Button onClick={onProcessAll} size="sm" variant="outline" disabled={isGrouping}>
									{isGrouping ? (
										<Loader className="mr-1.5 h-3 w-3 animate-spin" />
									) : (
										<Sparkles className="mr-1.5 h-3 w-3" />
									)}
									Process All
								</Button>
							) : null}
						</div>
					</div>
				)}
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2 space-y-1 flex flex-wrap flex-col w-full">
					{' '}
					{/* Flex classes added */}
					{loading ? (
						<ConversationListSkeleton />
					) : conversations.length === 0 ? (
						<div className="p-4 text-center text-sm text-muted-foreground">
							<p>No conversations found.</p>
							<p>Try adjusting your filters or importing data.</p>
						</div>
					) : (
						conversations.map((convo) => (
							<ConversationListItem
								key={convo.id}
								conversation={convo}
								isSelected={selectedConversation?.id === convo.id}
								onSelect={onSelectConversation}
							>
								<Checkbox
									id={`select-flat-${convo.id}`}
									checked={selectedIds.has(convo.id)}
									onClick={(e) => handleCheckboxClick(e, convo.id)}
									aria-label={`Select ${convo.title}`}
									className="mt-0.5"
								/>
							</ConversationListItem>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
