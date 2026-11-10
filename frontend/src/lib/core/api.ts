import type { ConversationClient } from '@assistant/protocol'

/**
 * Bề mặt backend mà store dùng. ConversationClient thoả mãn cấu trúc này; test truyền đối tượng cùng hình dạng.
 */
export type AssistantApi = Pick<ConversationClient,
  | 'getConfig' | 'listConversations' | 'createConversation' | 'getConversation' | 'updateConversation' | 'deleteConversation'
  | 'sendMessage' | 'cancel' | 'answerQuestion' | 'decideApproval' | 'setFeedback'
  | 'listArtifacts' | 'getArtifact' | 'listArtifactVersions' | 'getArtifactVersion' | 'saveArtifact' | 'restoreArtifact'
  | 'uploadFile' | 'diffArtifact' | 'exportArtifact' | 'renderArtifact' | 'runArtifactAction' | 'listArtifactTypes'
  | 'listReminders' | 'createReminder' | 'cancelReminder' | 'getSource' | 'openStream'>

