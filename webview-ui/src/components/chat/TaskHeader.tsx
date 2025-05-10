import { memo, useMemo, useRef, useState } from "react"
import { useWindowSize } from "react-use"
import { useTranslation } from "react-i18next"
import { CloudUpload, CloudDownload } from "lucide-react"
import { VSCodeBadge } from "@vscode/webview-ui-toolkit/react"

import { ClineMessage } from "@roo/shared/ExtensionMessage"

import { getMaxTokensForModel } from "@src/utils/model-utils"
import { formatLargeNumber } from "@src/utils/format"
import { cn } from "@src/lib/utils"
import { Button } from "@src/components/ui"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { useSelectedModel } from "@/components/ui/hooks/useSelectedModel"

import Thumbnails from "../common/Thumbnails"

import { TaskActions } from "./TaskActions"
import { ContextWindowProgress } from "./ContextWindowProgress"
import { Mention } from "./Mention"

export interface TaskHeaderProps {
	task: ClineMessage
	tokensIn: number
	tokensOut: number
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	contextTokens: number
	onClose: () => void
}

const TaskHeader = ({
	task,
	tokensIn,
	tokensOut,
	doesModelSupportPromptCache,
	cacheWrites,
	cacheReads,
	totalCost,
	contextTokens,
	onClose,
}: TaskHeaderProps) => {
	const { t } = useTranslation()
	const { apiConfiguration, currentTaskItem } = useExtensionState()
	const { info: model } = useSelectedModel(apiConfiguration)
	const [isTaskExpanded, setIsTaskExpanded] = useState(false)

	const textContainerRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLDivElement>(null)
	const contextWindow = model?.contextWindow || 1

	const { width: windowWidth } = useWindowSize()

	const firstLineOfTask = useMemo(() => {
		if (!task || !task.text) {
			return ""
		}
		const newlineIndex = task.text.indexOf("\n")
		if (newlineIndex === -1) {
			return task.text // No newline, so the whole text is the first line
		}
		return task.text.substring(0, newlineIndex)
	}, [task])

	return (
		<div className="py-2 px-3">
			<div
				className={cn(
					"rounded-xs p-2.5 flex flex-col gap-1.5 relative z-1 border",
					!!isTaskExpanded
						? "border-vscode-panel-border text-vscode-foreground"
						: "border-vscode-panel-border/80 text-vscode-foreground/80",
				)}>
				<div className="flex justify-between items-center gap-2">
					<div
						className="flex items-center cursor-pointer -ml-0.5 select-none grow min-w-0"
						onClick={() => setIsTaskExpanded(!isTaskExpanded)}>
						<div className="flex items-center shrink-0">
							<span className={`codicon codicon-chevron-${isTaskExpanded ? "down" : "right"}`}></span>
						</div>
						<div className="ml-1.5 whitespace-nowrap overflow-hidden text-ellipsis grow min-w-0">
							<span className="font-bold">
								{t("chat:task.title")}
								{!isTaskExpanded && ":"}
							</span>
							{!isTaskExpanded && (
								<span className="ml-1">
									<Mention text={firstLineOfTask} />
								</span>
							)}
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						title={t("chat:task.closeAndStart")}
						className="shrink-0 w-5 h-5">
						<span className="codicon codicon-close" />
					</Button>
				</div>
				{/* Collapsed state: Display context, tokens, and cache/actions */}
				{!isTaskExpanded && contextWindow > 0 && (
					<div className="flex flex-col gap-1">
						{/* First row: Context Length */}
						<div
							className={`w-full flex ${windowWidth < 400 ? "flex-col" : "flex-row"} gap-1 h-auto items-center`}>
							<TaskHeaderContextDisplay
								t={t}
								windowWidth={windowWidth}
								contextWindow={contextWindow}
								contextTokens={contextTokens}
								model={model}
								apiConfiguration={apiConfiguration}
							/>
							{/* Cost is now moved to the second row */}
						</div>
						{/* Second row: Token Usage, Cost, and Cache/Actions */}
						<div className="flex justify-between items-center h-[20px]">
							<div className="flex items-center gap-1 flex-wrap">
								{" "}
								{/* Container for Token Usage and Cost */}
								<TaskHeaderTokenUsageDisplay t={t} tokensIn={tokensIn} tokensOut={tokensOut} />
								{!!totalCost && <VSCodeBadge className="ml-1">${totalCost.toFixed(2)}</VSCodeBadge>}
							</div>
							<div className="flex items-center gap-1">
								{" "}
								{/* Container for Cache and Actions (right-aligned) */}
								{doesModelSupportPromptCache && typeof cacheReads === "number" && cacheReads > 0 && (
									<span className="flex items-center gap-0.5">
										<CloudDownload size={16} />
										{/* Not displaying number for cacheReads in collapsed to save space, icon is indicator */}
									</span>
								)}
								{/* Not showing cacheWrites in collapsed view to save space and match screenshot closely */}
								<TaskActions item={currentTaskItem} />
							</div>
						</div>
					</div>
				)}
				{/* Expanded state: Show task text and images */}
				{isTaskExpanded && (
					<>
						<div
							ref={textContainerRef}
							className="-mt-0.5 text-vscode-font-size overflow-y-auto break-words break-anywhere relative">
							<div
								ref={textRef}
								className="overflow-auto max-h-80 whitespace-pre-wrap break-words break-anywhere"
								style={{
									display: "-webkit-box",
									WebkitLineClamp: "unset",
									WebkitBoxOrient: "vertical",
								}}>
								<Mention text={task.text} />
							</div>
						</div>
						{task.images && task.images.length > 0 && <Thumbnails images={task.images} />}

						<div className="flex flex-col gap-1">
							{contextWindow > 0 && ( // Context display is always shown in expanded if contextWindow > 0
								<TaskHeaderContextDisplay
									t={t}
									windowWidth={windowWidth}
									contextWindow={contextWindow}
									contextTokens={contextTokens}
									model={model}
									apiConfiguration={apiConfiguration}
								/>
							)}
							<div className="flex justify-between items-center h-[20px]">
								<TaskHeaderTokenUsageDisplay t={t} tokensIn={tokensIn} tokensOut={tokensOut} />
								{!totalCost && <TaskActions item={currentTaskItem} />}
							</div>

							<TaskHeaderCacheInfoDisplay
								t={t}
								doesModelSupportPromptCache={doesModelSupportPromptCache}
								cacheWrites={cacheWrites}
								cacheReads={cacheReads}
							/>

							{!!totalCost && ( // API Cost and TaskActions if totalCost exists
								<div className="flex justify-between items-center h-[20px]">
									<TaskHeaderApiCostDisplay t={t} totalCost={totalCost} />
									<TaskActions item={currentTaskItem} />
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	)
}

// Helper components defined below TaskHeader for better readability

// Props for TaskHeaderContextDisplay
interface TaskHeaderContextDisplayProps {
	t: (key: string) => string
	windowWidth: number
	contextWindow: number
	contextTokens: number
	model: ReturnType<typeof useSelectedModel>["info"]
	apiConfiguration: ReturnType<typeof useExtensionState>["apiConfiguration"]
}

const TaskHeaderContextDisplay: React.FC<TaskHeaderContextDisplayProps> = ({
	t,
	windowWidth,
	contextWindow,
	contextTokens,
	model,
	apiConfiguration,
}) => (
	<div className={`w-full flex ${windowWidth < 400 ? "flex-col" : "flex-row"} gap-1 h-auto items-center`}>
		<div className="flex items-center gap-1 flex-shrink-0">
			<span className="font-bold" data-testid="context-window-label">
				{t("chat:task.contextWindow")}
			</span>
		</div>
		<ContextWindowProgress
			contextWindow={contextWindow}
			contextTokens={contextTokens || 0}
			maxTokens={getMaxTokensForModel(model, apiConfiguration)}
		/>
	</div>
)

// Props for TaskHeaderTokenUsageDisplay
interface TaskHeaderTokenUsageDisplayProps {
	t: (key: string) => string
	tokensIn: number
	tokensOut: number
}

const TaskHeaderTokenUsageDisplay: React.FC<TaskHeaderTokenUsageDisplayProps> = ({ t, tokensIn, tokensOut }) => (
	<div className="flex items-center gap-1 flex-wrap">
		<span className="font-bold">{t("chat:task.tokens")}</span>
		{typeof tokensIn === "number" && tokensIn > 0 && (
			<span className="flex items-center gap-0.5">
				<i className="codicon codicon-arrow-up text-xs font-bold" />
				{formatLargeNumber(tokensIn)}
			</span>
		)}
		{typeof tokensOut === "number" && tokensOut > 0 && (
			<span className="flex items-center gap-0.5">
				<i className="codicon codicon-arrow-down text-xs font-bold" />
				{formatLargeNumber(tokensOut)}
			</span>
		)}
	</div>
)

// Props for TaskHeaderCacheInfoDisplay
interface TaskHeaderCacheInfoDisplayProps {
	t: (key: string) => string
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
}

const TaskHeaderCacheInfoDisplay: React.FC<TaskHeaderCacheInfoDisplayProps> = ({
	t,
	doesModelSupportPromptCache,
	cacheWrites,
	cacheReads,
}) => {
	if (
		!doesModelSupportPromptCache ||
		!((typeof cacheReads === "number" && cacheReads > 0) || (typeof cacheWrites === "number" && cacheWrites > 0))
	) {
		return null
	}
	return (
		<div className="flex items-center gap-1 flex-wrap h-[20px]">
			<span className="font-bold">{t("chat:task.cache")}</span>
			{typeof cacheWrites === "number" && cacheWrites > 0 && (
				<span className="flex items-center gap-0.5">
					<CloudUpload size={16} />
					{formatLargeNumber(cacheWrites)}
				</span>
			)}
			{typeof cacheReads === "number" && cacheReads > 0 && (
				<span className="flex items-center gap-0.5">
					<CloudDownload size={16} />
					{formatLargeNumber(cacheReads)}
				</span>
			)}
		</div>
	)
}

// Props for TaskHeaderApiCostDisplay
interface TaskHeaderApiCostDisplayProps {
	t: (key: string) => string
	totalCost: number
}

const TaskHeaderApiCostDisplay: React.FC<TaskHeaderApiCostDisplayProps> = ({ t, totalCost }) => {
	if (!totalCost) {
		return null
	}
	return (
		<div className="flex items-center gap-1">
			<span className="font-bold">{t("chat:task.apiCost")}</span>
			<span>${totalCost?.toFixed(2)}</span>
		</div>
	)
}

export default memo(TaskHeader)
