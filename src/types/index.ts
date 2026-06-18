export type UserRole = 'ADMIN' | 'PRODUCER' | 'EDITOR' | 'OPERATOR' | 'HOST' | 'GUEST';

export type EpisodeStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'FINALIZED' | 'DISTRIBUTED';

export type AnnotationType = 'COMMENT' | 'CORRECTION' | 'APPROVAL' | 'QUESTION';

export type AnnotationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type AnnotationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type PlatformType = 'XIAOYUZHOU' | 'XIMALAYA' | 'APPLE' | 'SPOTIFY' | 'RSS' | 'OTHER';

export type DistributionStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';

export type NotificationType = 'DISTRIBUTION_STARTED' | 'DISTRIBUTION_COMPLETED' | 'DISTRIBUTION_FAILED' | 'DISTRIBUTION_CANCELLED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE' | 'EPISODE_SCHEDULE_CONFLICT' | 'EPISODE_PUBLISH_SOON';

export type ScheduleItemType = 'EPISODE' | 'TASK';

export interface ScheduleItem {
  id: string;
  itemType: ScheduleItemType;
  title: string;
  description?: string;
  date?: string;
  status?: string;
  priority?: string;
  programId?: string;
  programName?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleConflict {
  date: string;
  hasConflict: boolean;
  conflictCount: number;
  conflictingItems: ScheduleItem[];
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  teamId: string;
  createdAt: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  teamId: string;
  episodeCount: number;
  sortVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  programId: string;
  title: string;
  description?: string;
  status: EpisodeStatus;
  currentVersion: number;
  duration: number;
  sortOrder: number;
  sortVersion: number;
  publishDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioVersion {
  id: string;
  episodeId: string;
  version: number;
  fileName: string;
  fileSize: number;
  duration: number;
  mimeType: string;
  createdBy: string;
  createdByName?: string;
  note?: string;
  isArchived: boolean;
  isCorrupted: boolean;
  corruptedReason?: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  episodeId: string;
  audioVersionId: string;
  startTime: number;
  endTime?: number;
  content: string;
  type: AnnotationType;
  status: AnnotationStatus;
  priority: AnnotationPriority;
  assigneeId?: string;
  assigneeName?: string;
  createdBy: string;
  createdByName?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
}

export interface AnnotationReply {
  id: string;
  annotationId: string;
  parentId?: string;
  quotedReplyId?: string;
  quotedContent?: string;
  quotedAuthorName?: string;
  content: string;
  createdById: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: string;
  updatedAt: string;
  children?: AnnotationReply[];
  childCount?: number;
}

export type ReplySortOrder = 'asc' | 'desc';

export interface CreateAnnotationReplyRequest {
  content: string;
  parentId?: string;
  quotedReplyId?: string;
}

export interface Task {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  annotationIds: string[];
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionPlatform {
  id: string;
  name: string;
  type: PlatformType;
  config: Record<string, unknown>;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionRecord {
  id: string;
  episodeId: string;
  episodeTitle?: string;
  platformId: string;
  platformName?: string;
  platformType?: PlatformType;
  status: DistributionStatus;
  progress: number;
  retryCount: number;
  publishUrl?: string;
  publishedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userName?: string;
  type: NotificationType;
  title: string;
  content?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface WaveformData {
  version: number;
  sampleRate: number;
  samplesPerPixel: number;
  duration: number;
  data: number[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  teamName?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

export interface CreateProgramRequest {
  name: string;
  description?: string;
  coverImage?: File;
}

export interface CreateEpisodeRequest {
  programId: string;
  title: string;
  description?: string;
}

export interface CreateAnnotationRequest {
  episodeId: string;
  audioVersionId: string;
  startTime: number;
  endTime?: number;
  content: string;
  type: AnnotationType;
  priority?: AnnotationPriority;
  assigneeId?: string;
}

export interface UpdateAnnotationRequest {
  content?: string;
  status?: AnnotationStatus;
  priority?: AnnotationPriority;
  assigneeId?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  annotationIds?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  annotationIds?: string[];
}

export interface AuditLog {
  id: string;
  teamId: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
}

export interface DashboardStats {
  programCount: number;
  episodeCount: number;
  inProgressEpisodes: number;
  pendingTasks: number;
  pendingDistribution: number;
  recentEpisodes: Episode[];
  recentActivity: AuditLog[];
}

export interface RollbackLog {
  id: string;
  episodeId: string;
  episodeTitle?: string;
  fromVersionId: string;
  fromVersionNumber: number;
  toVersionId: string;
  toVersionNumber: number;
  reason?: string;
  rolledBackBy: string;
  rolledBackByName?: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  token: string;
  episodeId: string;
  episodeTitle?: string;
  createdBy: string;
  expiresAt: string;
  accessCount: number;
  createdAt: string;
}

export interface RollbackRequest {
  targetVersionId: string;
  reason?: string;
}

export interface MarkCorruptedRequest {
  reason: string;
}

export interface ApiResponse<T> {
  success: boolean;
  code?: number;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface EpisodeSortRequest {
  episodeIds: string[];
  baseSortVersion: number;
}

export interface EpisodeSortUndoRequest {
  baseSortVersion: number;
}

export interface EpisodeSortResult {
  success: boolean;
  conflict: boolean;
  message: string;
  sortVersion: number;
  episodes: Episode[];
  historyId?: string;
}

export interface SortUpdateMessage {
  type: string;
  programId: string;
  sortVersion: number;
  updatedBy: string;
  updatedByName: string;
}

export interface CollaboratorCursor {
  userId: string;
  userName: string;
  avatarUrl?: string;
  color: string;
  timePosition: number;
  lastActiveAt: string;
  episodeId: string;
}

export interface CollaborationMessage {
  id: string;
  episodeId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timePosition?: number;
  createdAt: string;
}

export interface OnlineCollaborator {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  joinedAt: string;
  lastActiveAt: string;
  isActive: boolean;
  color: string;
}

export type CollaborationWSMessage =
  | { type: 'CURSOR_UPDATE'; data: CollaboratorCursor }
  | { type: 'COLLABORATOR_JOIN'; data: OnlineCollaborator }
  | { type: 'COLLABORATOR_LEAVE'; data: { userId: string } }
  | { type: 'MESSAGE_SEND'; data: CollaborationMessage }
  | { type: 'INIT_STATE'; data: { collaborators: OnlineCollaborator[]; cursors: CollaboratorCursor[]; messages: CollaborationMessage[] } };

export interface SendCollaborationMessageRequest {
  content: string;
  timePosition?: number;
}

export type SubtitleStatus = 'GENERATING' | 'DRAFT' | 'REVIEW' | 'FINALIZED';

export interface SubtitleCue {
  id: string;
  subtitleId: string;
  startTime: number;
  endTime: number;
  text: string;
  speakerId?: string;
  speakerName?: string;
  confidence?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtitle {
  id: string;
  audioVersionId: string;
  audioVersion?: number;
  episodeId?: string;
  episodeTitle?: string;
  language: string;
  title?: string;
  status: SubtitleStatus;
  speakerDetectionEnabled: boolean;
  createdById: string;
  createdByName?: string;
  cues?: SubtitleCue[];
  cueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubtitleGenerateRequest {
  audioVersionId: string;
  language?: string;
  speakerDetectionEnabled?: boolean;
  title?: string;
}

export interface SubtitleCueUpdateRequest {
  startTime: number;
  endTime: number;
  text: string;
  speakerId?: string;
  speakerName?: string;
}

export interface SubtitleBatchUpdateRequest {
  cues: SubtitleCueUpdateRequest[];
}

export interface SubtitleExportRequest {
  format?: 'SRT' | 'VTT';
  includeSpeaker?: boolean;
  speakerSeparator?: string;
}

export type EmailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'RETRYING';

export interface EmailTemplate {
  id: string;
  teamId: string;
  templateKey: string;
  name: string;
  subject: string;
  content: string;
  description?: string;
  isHtml: boolean;
  isEnabled: boolean;
  variables?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  teamId: string;
  templateId?: string;
  templateKey?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  content: string;
  status: EmailStatus;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  sentAt?: string;
  nextRetryAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailPreviewRequest {
  subject: string;
  content: string;
  variables?: Record<string, unknown>;
}

export interface EmailPreviewResponse {
  subject: string;
  content: string;
}

export interface TestEmailRequest {
  toEmail: string;
  toName?: string;
}

export interface EmailStats {
  pending: number;
  sent: number;
  failed: number;
  retrying: number;
}

export type AudioEnhancementTaskType = 'NOISE_REDUCTION' | 'VOLUME_BALANCE' | 'VOICE_ENHANCE' | 'FULL_ENHANCE';
export type AudioEnhancementTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AudioEnhancementItemStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AudioEnhancementSettings {
  noiseReductionStrength?: number;
  noiseFloor?: number;
  frequencySmoothing?: number;
  targetLoudness?: number;
  truePeak?: number;
  loudnessRange?: number;
  lowCutFreq?: number;
  highCutFreq?: number;
  presenceGain?: number;
}

export interface AudioEnhancementItem {
  id: string;
  taskId: string;
  sourceAudioVersionId: string;
  resultAudioVersionId?: string;
  status: AudioEnhancementItemStatus;
  progress: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AudioEnhancementTask {
  id: string;
  teamId: string;
  episodeId: string;
  createdBy: string;
  taskType: AudioEnhancementTaskType;
  status: AudioEnhancementTaskStatus;
  progress: number;
  totalAudioCount: number;
  completedAudioCount: number;
  audioVersionIds: string[];
  resultAudioVersionIds?: string[];
  errorMessage?: string;
  settings: AudioEnhancementSettings;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  items?: AudioEnhancementItem[];
}

export interface AudioEnhancementRequest {
  teamId: string;
  episodeId: string;
  audioVersionIds: string[];
  taskType: AudioEnhancementTaskType;
  settings?: AudioEnhancementSettings;
  note?: string;
}

export interface AudioEnhancementWSMessage {
  type: 'TASK_PROGRESS' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'PONG';
  data: {
    taskId: string;
    status: AudioEnhancementTaskStatus;
    progress: number;
    totalAudioCount: number;
    completedAudioCount: number;
    resultAudioVersionIds?: string[];
    errorMessage?: string;
    completedAt?: string;
    items?: AudioEnhancementItem[];
  };
}

export type CollaborationType = 'RECORDING' | 'INTERVIEW' | 'GUEST_SPEAKER' | 'CO_HOST' | 'OTHER';

export interface Guest {
  id: string;
  teamId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  topicAreas?: string;
  weiboUrl?: string;
  wechatId?: string;
  zhihuUrl?: string;
  bilibiliUrl?: string;
  otherLinks?: string;
  bio?: string;
  participationCount: number;
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  collaborationHistory?: GuestCollaborationHistory[];
}

export interface GuestCollaborationHistory {
  id: string;
  teamId: string;
  guestId: string;
  episodeId?: string;
  episodeTitle?: string;
  collaborationType: CollaborationType;
  topic?: string;
  recordingDate?: string;
  publishDate?: string;
  feedback?: string;
  rating?: number;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuestRequest {
  name: string;
  email: string;
  phoneNumber?: string;
  topicAreas?: string;
  weiboUrl?: string;
  wechatId?: string;
  zhihuUrl?: string;
  bilibiliUrl?: string;
  otherLinks?: string;
  bio?: string;
}

export interface UpdateGuestRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  topicAreas?: string;
  weiboUrl?: string;
  wechatId?: string;
  zhihuUrl?: string;
  bilibiliUrl?: string;
  otherLinks?: string;
  bio?: string;
  isActive?: boolean;
}

export interface CreateCollaborationHistoryRequest {
  collaborationType: CollaborationType;
  episodeId?: string;
  topic?: string;
  recordingDate?: string;
  publishDate?: string;
  feedback?: string;
  rating?: number;
  notes?: string;
}

export type GuestEmailType = 'INVITATION' | 'THANK_YOU';

export interface SendGuestEmailRequest {
  emailType: GuestEmailType;
  variables?: Record<string, unknown>;
  episodeId?: string;
}

export interface GuestEmailResponse {
  emailLogId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface GuestStats {
  totalGuests: number;
  activeGuests: number;
  totalCollaborations: number;
  averageRating: number;
}

export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'HATE_SPEECH' | 'EXPLICIT' | 'MISINFORMATION' | 'OTHER';
export type CommentSortOrder = 'NEWEST' | 'OLDEST' | 'MOST_LIKED' | 'MOST_REPLIES' | 'PINNED_FIRST';

export interface ReportRecord {
  id: string;
  commentId: string;
  reporterId?: string;
  reporterName?: string;
  reason: ReportReason;
  description?: string;
  createdAt: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ShareComment {
  id: string;
  shareId: string;
  episodeId: string;
  parentId?: string;
  content: string;
  status: CommentStatus;
  isPinned: boolean;
  likeCount: number;
  replyCount: number;
  reportCount: number;
  createdById?: string;
  createdByName: string;
  createdByAvatar?: string;
  isGuest: boolean;
  guestNickname?: string;
  visitorId?: string;
  createdAt: string;
  updatedAt: string;
  replies?: ShareComment[];
  reports?: ReportRecord[];
  adminReply?: string;
  adminRepliedBy?: string;
  adminRepliedAt?: string;
  likedByMe?: boolean;
  reportedByMe?: boolean;
}

export interface PaginatedComments {
  items: ShareComment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pinnedComments: ShareComment[];
  stats: {
    totalCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    reportedCount: number;
  };
}

export interface CreateShareCommentRequest {
  shareId: string;
  episodeId: string;
  parentId?: string;
  content: string;
  guestNickname?: string;
  visitorId?: string;
}

export interface UpdateShareCommentRequest {
  status?: CommentStatus;
  isPinned?: boolean;
  adminReply?: string;
}

export interface ReportCommentRequest {
  reason: ReportReason;
  description?: string;
  reporterName?: string;
}

export interface ListShareCommentsParams {
  page?: number;
  pageSize?: number;
  sort?: CommentSortOrder;
  status?: CommentStatus;
  includeReplies?: boolean;
  searchQuery?: string;
}

export interface Chapter {
  id: string;
  episodeId: string;
  audioVersionId: string;
  startTime: number;
  endTime: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterDetectionConfig {
  minSilenceDuration: number;
  silenceThreshold: number;
  minChapterDuration: number;
  maxChapterDuration: number;
  enableTopicDetection: boolean;
}

export interface ChapterDetectionResult {
  chapters: Chapter[];
  silenceSegments: SilenceSegment[];
  topicChangePoints: number[];
}

export interface SilenceSegment {
  startTime: number;
  endTime: number;
  duration: number;
  avgVolume: number;
}

export interface ChapterImportExportData {
  version: string;
  episodeId?: string;
  audioVersionId?: string;
  duration?: number;
  chapters: Array<{
    startTime: number;
    endTime: number;
    title: string;
    description?: string;
    thumbnailUrl?: string;
  }>;
}

export interface CreateChapterRequest {
  episodeId: string;
  audioVersionId: string;
  startTime: number;
  endTime: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface UpdateChapterRequest {
  startTime?: number;
  endTime?: number;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  order?: number;
}

export interface DetectChaptersRequest {
  audioVersionId: string;
  config?: Partial<ChapterDetectionConfig>;
}
