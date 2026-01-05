// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Bot } from 'lucide-react'
import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'

type ConversationListItemProps = {
	conversation: Conversation
	isSelected: boolean
	onSelect: (conversation: Conversation) => void
	children?: React.ReactNode // For checkbox in grouped view
}

export function ConversationListItem({
	conversation,
	isSelected,
	onSelect,
	children,
}: ConversationListItemProps) {
	const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
		e.dataTransfer.setData(
			'application/json',
			JSON.stringify({
				conversationId: conversation.id,
				originalCategory: conversation.category || 'Unprocessed',
			}),
		)
		e.dataTransfer.effectAllowed = 'move'
	}

	// Status indicators
	const needsTranscript = !conversation.transcript || conversation.transcript.length === 0
	const needsSummary = !needsTranscript && !conversation.summary
	const needsCategory =
		!needsTranscript && (!conversation.category || conversation.category === 'Unprocessed')
	const isFullyProcessed = !needsTranscript && !needsSummary && !needsCategory

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: complex interactive list item with nested interactive elements
		// biome-ignore lint/a11y/noStaticElementInteractions: see above
		<div
			className={cn(
				'group relative flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border border-transparent overflow-hidden',
				isSelected
					? 'bg-accent/10 border-accent/20 shadow-sm'
					: 'hover:bg-muted/60 hover:border-border/50',
			)}
			onClick={() => onSelect(conversation)}
			draggable="true"
			onDragStart={handleDragStart}
		>
			{isSelected && (
				<div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />
			)}

			<div className={cn('mt-0.5 shrink-0', children ? 'mr-0.5' : '')}>{children}</div>

			<div
				className={cn(
					'p-1.5 rounded-full shrink-0 transition-colors',
					isSelected
						? 'bg-accent/20 text-accent'
						: 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10',
				)}
			>
				<Bot className="h-3.5 w-3.5" />
			</div>

			<div className="flex flex-col min-w-0 flex-1 gap-0.5">
				<p
					className={cn(
						'text-xs line-clamp-2 break-words',
						isSelected ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
					)}
				>
					{conversation.title}
				</p>
				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
					{conversation.hasRichContent && (
						<Badge variant="secondary" className="text-[9px] px-1 h-4">
							Rich
						</Badge>
					)}
					{/* Status indicator dot */}
					{!isFullyProcessed && (
						<span
							className={cn(
								'w-1.5 h-1.5 rounded-full ml-auto',
								needsTranscript ? 'bg-blue-400' : needsSummary ? 'bg-purple-400' : 'bg-green-400',
							)}
							title={
								needsTranscript
									? 'Needs transcript'
									: needsSummary
										? 'Needs summary'
										: 'Needs category'
							}
						/>
					)}
				</div>
			</div>
		</div>
	)
}
