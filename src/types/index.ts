export type UserRole = 'ADMIN' | 'PRODUCER' | 'EDITOR' | 'OPERATOR' | 'HOST' | 'GUEST';

export type EpisodeStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'FINALIZED' | 'DISTRIBUTED';

export type AnnotationType = 'COMMENT' | 'CORRECTION' | 'APPROVAL' | 'QUESTION';

export type AnnotationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type AnnotationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type PlatformType = 'XIAOYUZHOU' | 'XIMALAYA' | 'APPLE' | 'SPOTIFY' | 'RSS' | 'OTHER';

export type DistributionStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
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
  config: Record<string, any>;
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
  status: DistributionStatus;
  publishUrl?: string;
  publishedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
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
  details?: Record<string, any>;
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
