import type { ComponentType } from 'react'
import type {
  ApprovalPreviewProps, ArtifactTypeUi, AssistantExtension, QuestionIntentProps, ResultRenderer, SlashCommand, Starter,
} from '@assistant/extension-sdk'
import type { PageContext } from '@assistant/protocol'

/** Registry các extension được bật trong bản build; tra theo tool / render_hint / kiểu artifact / intent. */
export class ExtensionRegistry {
  readonly extensions: AssistantExtension[]

  constructor(extensions: AssistantExtension[]) {
    this.extensions = extensions
  }

  #for(assistant: string | null): AssistantExtension[] {
    return this.extensions.filter(e => !e.assistants || (assistant !== null && e.assistants.includes(assistant)))
  }

  renderer(assistant: string | null, match: { tool?: string; renderHint?: string }): ResultRenderer | undefined {
    for (const ext of this.#for(assistant)) {
      const found = ext.renderers?.find(r =>
        (r.match.renderHint !== undefined && r.match.renderHint === match.renderHint) || (r.match.tool !== undefined && r.match.tool === match.tool))
      if (found) return found
    }
    return undefined
  }

  artifactType(assistant: string | null, type: string): ArtifactTypeUi | undefined {
    for (const ext of this.#for(assistant)) if (ext.artifactTypes?.[type]) return ext.artifactTypes[type]
    return undefined
  }

  approvalPreview(assistant: string | null, tool: string): ComponentType<ApprovalPreviewProps> | undefined {
    for (const ext of this.#for(assistant)) if (ext.approvalPreviews?.[tool]) return ext.approvalPreviews[tool]
    return undefined
  }

  questionIntent(assistant: string | null, intent: string): ComponentType<QuestionIntentProps> | undefined {
    for (const ext of this.#for(assistant)) if (ext.questionIntents?.[intent]) return ext.questionIntents[intent]
    return undefined
  }

  formatTool(assistant: string | null, tool: string, args: Record<string, unknown>, result: unknown): string | undefined {
    for (const ext of this.#for(assistant)) {
      const formatted = ext.toolFormatters?.[tool]?.(args, result)
      if (formatted) return formatted
    }
    return undefined
  }

  commands(assistant: string | null): SlashCommand[] {
    return this.#for(assistant).flatMap(e => e.commands ?? [])
  }

  starters(assistant: string | null, ctx: PageContext | null): Starter[] {
    return this.#for(assistant).flatMap(e => e.starters?.(ctx) ?? [])
  }
}
