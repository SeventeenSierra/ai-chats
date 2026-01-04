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

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: complex interactive list item with nested interactive elements
		// biome-ignore lint/a11y/noStaticElementInteractions: see above
		<div
			className={cn(
				'group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent',
				isSelected
					? 'bg-accent/10 border-accent/20 shadow-sm'
					: 'hover:bg-muted/60 hover:border-border/50',
			)}
			onClick={() => onSelect(conversation)}
			draggable="true"
			onDragStart={handleDragStart}
		>
			{isSelected && (
				<div className="absolute left-0 top-3 bottom-3 w-1 bg-accent rounded-r-full" />
			)}

			<div className={cn('mt-0.5 shrink-0', children ? 'mr-1' : '')}>{children}</div>

			<div
				className={cn(
					'p-2 rounded-full shrink-0 transition-colors',
					isSelected
						? 'bg-accent/20 text-accent'
						: 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10',
				)}
			>
				<Bot className="h-4 w-4" />
			</div>

			<div className="flex flex-col min-w-0 flex-1 gap-1">
				<p
					className={cn(
						'text-sm truncate pr-2',
						isSelected ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
					)}
				>
					{conversation.title}
				</p>
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
					{conversation.hasRichContent && (
						<Badge variant="secondary" className="text-[10px] px-1 h-5">
							Rich
						</Badge>
					)}
				</div>
			</div>
		</div>
	)
}
