import { User, Team, Program, Episode, Annotation, AnnotationReply, Task, DistributionPlatform, DistributionRecord, AudioVersion, AuditLog, DashboardStats, Session, RollbackLog, Chapter } from '@/types';

export const mockUser: User = {
  id: '1',
  email: 'admin@example.com',
  name: '张三',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  role: 'ADMIN',
  teamId: '1',
  createdAt: '2024-01-01T00:00:00Z',
  isActive: true,
};

export const mockTeam: Team = {
  id: '1',
  name: '声动工作室',
  logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=team',
  ownerId: '1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockTeamMembers: User[] = [
  mockUser,
  {
    id: '2',
    email: 'producer@example.com',
    name: '李四',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=producer',
    role: 'PRODUCER',
    teamId: '1',
    createdAt: '2024-01-02T00:00:00Z',
    isActive: true,
  },
  {
    id: '3',
    email: 'editor@example.com',
    name: '王五',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor',
    role: 'EDITOR',
    teamId: '1',
    createdAt: '2024-01-03T00:00:00Z',
    isActive: true,
  },
  {
    id: '4',
    email: 'operator@example.com',
    name: '赵六',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operator',
    role: 'OPERATOR',
    teamId: '1',
    createdAt: '2024-01-04T00:00:00Z',
    isActive: true,
  },
  {
    id: '5',
    email: 'host@example.com',
    name: '孙七',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=host',
    role: 'HOST',
    teamId: '1',
    createdAt: '2024-01-05T00:00:00Z',
    isActive: true,
  },
];

export const mockPrograms: Program[] = [
  {
    id: '1',
    name: '科技前沿',
    description: '每周深度解析一个科技话题，带你了解行业最新动态',
    coverImage: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&fit=crop',
    teamId: '1',
    episodeCount: 24,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: '2',
    name: '商业内幕',
    description: '深度剖析商业案例，洞察商业本质',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    teamId: '1',
    episodeCount: 18,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-05-28T00:00:00Z',
  },
  {
    id: '3',
    name: '人文漫谈',
    description: '聊聊历史、文化与人生的那些事',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop',
    teamId: '1',
    episodeCount: 12,
    createdAt: '2024-03-20T00:00:00Z',
    updatedAt: '2024-06-05T00:00:00Z',
  },
];

export const mockEpisodes: Episode[] = [
  {
    id: '1',
    programId: '1',
    title: 'AI 大模型的未来走向',
    description: '邀请业内专家探讨大模型技术的发展趋势和应用场景',
    status: 'IN_PROGRESS',
    currentVersion: 5,
    duration: 3620,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-15T10:00:00Z',
  },
  {
    id: '2',
    programId: '1',
    title: '边缘计算的崛起',
    description: '5G 时代下边缘计算的机遇与挑战',
    status: 'REVIEW',
    currentVersion: 2,
    duration: 2800,
    createdAt: '2024-05-28T09:00:00Z',
    updatedAt: '2024-06-08T12:00:00Z',
  },
  {
    id: '3',
    programId: '2',
    title: '新消费品牌的破局之路',
    description: '从0到1打造一个新消费品牌的方法论',
    status: 'FINALIZED',
    currentVersion: 5,
    duration: 4200,
    createdAt: '2024-05-20T14:00:00Z',
    updatedAt: '2024-06-05T18:00:00Z',
  },
  {
    id: '4',
    programId: '3',
    title: '宋人的日常生活',
    description: '从《清明上河图》看宋代市井生活',
    status: 'DRAFT',
    currentVersion: 1,
    duration: 0,
    createdAt: '2024-06-10T08:00:00Z',
    updatedAt: '2024-06-10T08:00:00Z',
  },
];

export const mockAudioVersions: AudioVersion[] = [
  {
    id: '1',
    episodeId: '1',
    version: 5,
    fileName: 'ep01_v5_final.mp3',
    fileSize: 53428800,
    duration: 3620,
    mimeType: 'audio/mpeg',
    createdBy: '2',
    createdByName: '李四',
    note: '制作人最终审核通过版本',
    isArchived: false,
    isCorrupted: false,
    createdAt: '2024-06-15T10:00:00Z',
  },
  {
    id: '2',
    episodeId: '1',
    version: 4,
    fileName: 'ep01_v4_mixdown.mp3',
    fileSize: 52928800,
    duration: 3610,
    mimeType: 'audio/mpeg',
    createdBy: '3',
    createdByName: '王五',
    note: '根据制作人反馈调整了音量和过渡效果',
    isArchived: false,
    isCorrupted: false,
    createdAt: '2024-06-13T16:20:00Z',
  },
  {
    id: '3',
    episodeId: '1',
    version: 3,
    fileName: 'ep01_v3_corrupted.mp3',
    fileSize: 52428800,
    duration: 3600,
    mimeType: 'audio/mpeg',
    createdBy: '3',
    createdByName: '王五',
    note: '根据标注修改了第15分钟和第45分钟的内容',
    isArchived: false,
    isCorrupted: true,
    corruptedReason: '文件在导出过程中损坏，后半段音频缺失',
    createdAt: '2024-06-10T15:30:00Z',
  },
  {
    id: '4',
    episodeId: '1',
    version: 2,
    fileName: 'ep01_v2.mp3',
    fileSize: 51380224,
    duration: 3580,
    mimeType: 'audio/mpeg',
    createdBy: '3',
    createdByName: '王五',
    note: '初剪完成，待制作人审核',
    isArchived: true,
    isCorrupted: false,
    createdAt: '2024-06-08T14:00:00Z',
  },
  {
    id: '5',
    episodeId: '1',
    version: 1,
    fileName: 'ep01_raw.wav',
    fileSize: 629145600,
    duration: 3720,
    mimeType: 'audio/wav',
    createdBy: '1',
    createdByName: '张三',
    note: '原始录音文件',
    isArchived: true,
    isCorrupted: false,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: '6',
    episodeId: '2',
    version: 2,
    fileName: 'ep02_v2.mp3',
    fileSize: 48234496,
    duration: 2800,
    mimeType: 'audio/mpeg',
    createdBy: '3',
    createdByName: '王五',
    note: '边缘计算 - 修订版',
    isArchived: false,
    isCorrupted: false,
    createdAt: '2024-06-08T12:00:00Z',
  },
  {
    id: '7',
    episodeId: '2',
    version: 1,
    fileName: 'ep02_v1_raw.wav',
    fileSize: 419430400,
    duration: 2900,
    mimeType: 'audio/wav',
    createdBy: '1',
    createdByName: '张三',
    note: '边缘计算 - 原始录音',
    isArchived: true,
    isCorrupted: false,
    createdAt: '2024-05-28T09:00:00Z',
  },
  {
    id: '8',
    episodeId: '3',
    version: 5,
    fileName: 'ep03_v5_final.mp3',
    fileSize: 62914560,
    duration: 4200,
    mimeType: 'audio/mpeg',
    createdBy: '2',
    createdByName: '李四',
    note: '新消费品牌 - 最终版',
    isArchived: false,
    isCorrupted: false,
    createdAt: '2024-06-05T18:00:00Z',
  },
];

export const mockRollbackLogs: RollbackLog[] = [
  {
    id: 'rb1',
    episodeId: '1',
    episodeTitle: 'AI 大模型的未来走向',
    fromVersionId: '3',
    fromVersionNumber: 3,
    toVersionId: '2',
    toVersionNumber: 2,
    reason: 'v3 文件损坏，需要回滚到上一个可用版本',
    rolledBackBy: '1',
    rolledBackByName: '张三',
    createdAt: '2024-06-11T09:30:00Z',
  },
  {
    id: 'rb2',
    episodeId: '1',
    episodeTitle: 'AI 大模型的未来走向',
    fromVersionId: '2',
    fromVersionNumber: 2,
    toVersionId: '4',
    toVersionNumber: 4,
    reason: '恢复使用归档的 v2 版本作为基础重新编辑，生成 v4',
    rolledBackBy: '2',
    rolledBackByName: '李四',
    createdAt: '2024-06-12T11:00:00Z',
  },
];

function generateWaveformData(duration: number, samples: number = 1000): number[] {
  const data: number[] = [];
  for (let i = 0; i < samples; i++) {
    const base = Math.sin(i * 0.1) * 0.3 + 0.5;
    const noise = Math.random() * 0.4;
    const envelope = Math.sin((i / samples) * Math.PI);
    data.push(Math.min(1, Math.max(0.05, (base + noise) * envelope)));
  }
  return data;
}

export const mockWaveformData = {
  version: 2,
  sampleRate: 44100,
  samplesPerPixel: 1024,
  duration: 3600,
  data: generateWaveformData(3600),
};

export const mockChapters: Chapter[] = [
  {
    id: 'chap_1',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 0,
    endTime: 420,
    title: '开场介绍',
    description: '节目开场，介绍本期主题和嘉宾',
    order: 0,
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
  {
    id: 'chap_2',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 420,
    endTime: 980,
    title: '话题一：AI 技术发展现状',
    description: '讨论当前人工智能技术的发展趋势和最新突破',
    order: 1,
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
  {
    id: 'chap_3',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 980,
    endTime: 1560,
    title: '话题二：AI 在播客领域的应用',
    description: '探讨 AI 技术如何改变播客创作和分发方式',
    order: 2,
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
  {
    id: 'chap_4',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 1560,
    endTime: 2200,
    title: '话题三：未来展望与挑战',
    description: '展望 AI 技术的未来发展方向以及面临的挑战',
    order: 3,
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
  {
    id: 'chap_5',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 2200,
    endTime: 2800,
    title: '听众问答环节',
    description: '回答听众在评论区和社交媒体上提出的问题',
    order: 4,
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
  {
    id: 'chap_6',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 2800,
    endTime: 3600,
    title: '总结与下期预告',
    description: '总结本期内容，预告下一期话题',
    order: 5,
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
];

export const mockAnnotations: Annotation[] = [
  {
    id: '1',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 185.5,
    endTime: 192.0,
    content: '这里有一个口误，"人工智能"说成了"人工只能"，请剪辑师修正',
    type: 'CORRECTION',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: '3',
    assigneeName: '王五',
    createdBy: '1',
    createdByName: '张三',
    createdAt: '2024-06-10T16:00:00Z',
    updatedAt: '2024-06-10T16:30:00Z',
    replyCount: 4,
  },
  {
    id: '2',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 450.0,
    content: '这段背景音乐声音太大，盖过了人声，请调小',
    type: 'COMMENT',
    status: 'OPEN',
    priority: 'MEDIUM',
    assigneeId: '3',
    assigneeName: '王五',
    createdBy: '2',
    createdByName: '李四',
    createdAt: '2024-06-10T14:20:00Z',
    updatedAt: '2024-06-10T14:20:00Z',
    replyCount: 2,
  },
  {
    id: '3',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 1200.0,
    endTime: 1210.0,
    content: '这段讲得很好，保留',
    type: 'APPROVAL',
    status: 'RESOLVED',
    priority: 'LOW',
    createdBy: '1',
    createdByName: '张三',
    resolvedBy: '1',
    resolvedByName: '张三',
    resolvedAt: '2024-06-10T15:00:00Z',
    createdAt: '2024-06-10T11:00:00Z',
    updatedAt: '2024-06-10T15:00:00Z',
    replyCount: 1,
  },
  {
    id: '4',
    episodeId: '1',
    audioVersionId: '1',
    startTime: 2700.0,
    content: '嘉宾这里提到的数据是否准确？需要确认一下来源',
    type: 'QUESTION',
    status: 'OPEN',
    priority: 'URGENT',
    assigneeId: '5',
    assigneeName: '孙七',
    createdBy: '2',
    createdByName: '李四',
    createdAt: '2024-06-10T13:45:00Z',
    updatedAt: '2024-06-10T13:45:00Z',
    replyCount: 3,
  },
];

export const mockReplies: Record<string, AnnotationReply[]> = {
  '1': [
    {
      id: 'r1-1',
      annotationId: '1',
      content: '收到，我马上处理这个口误',
      createdById: '3',
      createdByName: '王五',
      createdAt: '2024-06-10T16:10:00Z',
      updatedAt: '2024-06-10T16:10:00Z',
      children: [
        {
          id: 'r1-1-1',
          annotationId: '1',
          parentId: 'r1-1',
          content: '辛苦了，修完后我再听一遍确认',
          createdById: '1',
          createdByName: '张三',
          createdAt: '2024-06-10T16:15:00Z',
          updatedAt: '2024-06-10T16:15:00Z',
          children: [],
        },
      ],
    },
    {
      id: 'r1-2',
      annotationId: '1',
      content: '我也注意到了，可以用 AI 语音修复来处理',
      createdById: '2',
      createdByName: '李四',
      createdAt: '2024-06-10T16:20:00Z',
      updatedAt: '2024-06-10T16:20:00Z',
      quotedReplyId: 'r1-1',
      quotedContent: '收到，我马上处理这个口误',
      quotedAuthorName: '王五',
      children: [],
    },
  ],
  '2': [
    {
      id: 'r2-1',
      annotationId: '2',
      content: '背景音乐已调低了 6dB，请审核',
      createdById: '3',
      createdByName: '王五',
      createdAt: '2024-06-10T14:30:00Z',
      updatedAt: '2024-06-10T14:30:00Z',
      children: [],
    },
    {
      id: 'r2-2',
      annotationId: '2',
      content: '确认好多了，不过人声段还可以再提一点',
      createdById: '2',
      createdByName: '李四',
      createdAt: '2024-06-10T14:35:00Z',
      updatedAt: '2024-06-10T14:35:00Z',
      quotedReplyId: 'r2-1',
      quotedContent: '背景音乐已调低了 6dB，请审核',
      quotedAuthorName: '王五',
      children: [],
    },
  ],
  '3': [
    {
      id: 'r3-1',
      annotationId: '3',
      content: '同意，这段讲得非常清晰',
      createdById: '2',
      createdByName: '李四',
      createdAt: '2024-06-10T11:10:00Z',
      updatedAt: '2024-06-10T11:10:00Z',
      children: [],
    },
  ],
  '4': [
    {
      id: 'r4-1',
      annotationId: '4',
      content: '我去查一下原始数据来源，稍后回复',
      createdById: '5',
      createdByName: '孙七',
      createdAt: '2024-06-10T13:50:00Z',
      updatedAt: '2024-06-10T13:50:00Z',
      children: [
        {
          id: 'r4-1-1',
          annotationId: '4',
          parentId: 'r4-1',
          content: '好的，麻烦尽快确认，下周一要定稿',
          createdById: '2',
          createdByName: '李四',
          createdAt: '2024-06-10T14:00:00Z',
          updatedAt: '2024-06-10T14:00:00Z',
          children: [],
        },
        {
          id: 'r4-1-2',
          annotationId: '4',
          parentId: 'r4-1',
          quotedReplyId: 'r4-1-1',
          quotedContent: '好的，麻烦尽快确认，下周一要定稿',
          quotedAuthorName: '李四',
          content: '已确认，数据来源是 2024 年行业报告，信息准确',
          createdById: '5',
          createdByName: '孙七',
          createdAt: '2024-06-10T16:00:00Z',
          updatedAt: '2024-06-10T16:00:00Z',
          children: [],
        },
      ],
    },
  ],
};

export const mockTasks: Task[] = [
  {
    id: '1',
    teamId: '1',
    title: '修正第1集口误问题',
    description: '处理第1集中标注的口误和音量问题',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    annotationIds: ['1', '2'],
    assigneeId: '3',
    assigneeName: '王五',
    dueDate: '2024-06-12',
    createdBy: '1',
    createdByName: '张三',
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T16:00:00Z',
  },
  {
    id: '2',
    teamId: '1',
    title: '确认数据来源',
    description: '确认第1集2700秒处提到的数据准确性',
    status: 'TODO',
    priority: 'URGENT',
    annotationIds: ['4'],
    assigneeId: '5',
    assigneeName: '孙七',
    dueDate: '2024-06-11',
    createdBy: '2',
    createdByName: '李四',
    createdAt: '2024-06-10T14:00:00Z',
    updatedAt: '2024-06-10T14:00:00Z',
  },
  {
    id: '3',
    teamId: '1',
    title: '第2集后期制作',
    description: '完成第2集的剪辑和混音',
    status: 'REVIEW',
    priority: 'MEDIUM',
    annotationIds: [],
    assigneeId: '3',
    assigneeName: '王五',
    dueDate: '2024-06-15',
    createdBy: '2',
    createdByName: '李四',
    createdAt: '2024-06-08T09:00:00Z',
    updatedAt: '2024-06-10T12:00:00Z',
  },
  {
    id: '4',
    teamId: '1',
    title: '第3集多平台分发',
    description: '将第3集发布到各个播客平台',
    status: 'DONE',
    priority: 'LOW',
    annotationIds: [],
    assigneeId: '4',
    assigneeName: '赵六',
    dueDate: '2024-06-06',
    createdBy: '1',
    createdByName: '张三',
    createdAt: '2024-06-05T08:00:00Z',
    updatedAt: '2024-06-06T18:00:00Z',
  },
];

export const mockDistributionPlatforms: DistributionPlatform[] = [
  {
    id: '1',
    name: '小宇宙',
    type: 'XIAOYUZHOU',
    config: {
      apiKey: 'xxx',
      feedId: 'feed_123',
    },
    teamId: '1',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: '2',
    name: '喜马拉雅',
    type: 'XIMALAYA',
    config: {
      accountId: 'acc_456',
      category: '科技',
    },
    teamId: '1',
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
  {
    id: '3',
    name: 'Apple Podcasts',
    type: 'APPLE',
    config: {
      showId: 'show_789',
    },
    teamId: '1',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    name: 'Spotify',
    type: 'SPOTIFY',
    config: {
      artistId: 'artist_abc',
    },
    teamId: '1',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '5',
    name: '官方 RSS',
    type: 'RSS',
    config: {
      feedUrl: 'https://feeds.example.com/podcast.xml',
    },
    teamId: '1',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

export const mockDistributionRecords: DistributionRecord[] = [
  {
    id: '1',
    episodeId: '3',
    episodeTitle: '新消费品牌的破局之路',
    platformId: '1',
    platformName: '小宇宙',
    status: 'PUBLISHED',
    progress: 100,
    retryCount: 0,
    publishUrl: 'https://www.xiaoyuzhou.com/episodes/123',
    publishedAt: '2024-06-06T10:00:00Z',
    createdAt: '2024-06-06T09:00:00Z',
    updatedAt: '2024-06-06T10:05:00Z',
  },
  {
    id: '2',
    episodeId: '3',
    episodeTitle: '新消费品牌的破局之路',
    platformId: '2',
    platformName: '喜马拉雅',
    status: 'PUBLISHED',
    progress: 100,
    retryCount: 1,
    publishUrl: 'https://www.ximalaya.com/episode/456',
    publishedAt: '2024-06-06T10:15:00Z',
    createdAt: '2024-06-06T09:00:00Z',
    updatedAt: '2024-06-06T10:20:00Z',
  },
  {
    id: '3',
    episodeId: '3',
    episodeTitle: '新消费品牌的破局之路',
    platformId: '3',
    platformName: 'Apple Podcasts',
    status: 'PUBLISHING',
    progress: 60,
    retryCount: 0,
    createdAt: '2024-06-06T09:00:00Z',
    updatedAt: '2024-06-06T10:30:00Z',
  },
  {
    id: '4',
    episodeId: '2',
    episodeTitle: '边缘计算的崛起',
    platformId: '1',
    platformName: '小宇宙',
    status: 'PENDING',
    progress: 0,
    retryCount: 0,
    createdAt: '2024-06-08T14:00:00Z',
    updatedAt: '2024-06-08T14:00:00Z',
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    teamId: '1',
    userId: '1',
    userName: '张三',
    action: 'VERSION_ROLLBACK',
    entityType: 'AUDIO_VERSION',
    entityId: '1',
    details: {
      fromVersion: 3,
      toVersion: 2,
      reason: 'v3 文件损坏，需要回滚到上一个可用版本',
      episodeTitle: 'AI 大模型的未来走向',
    },
    ipAddress: '192.168.1.100',
    createdAt: '2024-06-15T09:30:00Z',
  },
  {
    id: '2',
    teamId: '1',
    userId: '1',
    userName: '张三',
    action: 'UPLOAD_AUDIO',
    entityType: 'AUDIO_VERSION',
    entityId: '1',
    details: {
      fileName: 'ep01_v3_mixdown.mp3',
      fileSize: 52428800,
    },
    ipAddress: '192.168.1.100',
    createdAt: '2024-06-10T15:30:00Z',
  },
  {
    id: '3',
    teamId: '1',
    userId: '2',
    userName: '李四',
    action: 'CREATE_ANNOTATION',
    entityType: 'ANNOTATION',
    entityId: '2',
    details: {
      startTime: 450.0,
      type: 'COMMENT',
    },
    ipAddress: '192.168.1.101',
    createdAt: '2024-06-10T14:20:00Z',
  },
  {
    id: '4',
    teamId: '1',
    userId: '3',
    userName: '王五',
    action: 'UPDATE_TASK_STATUS',
    entityType: 'TASK',
    entityId: '1',
    details: {
      oldStatus: 'TODO',
      newStatus: 'IN_PROGRESS',
    },
    ipAddress: '192.168.1.102',
    createdAt: '2024-06-10T10:30:00Z',
  },
  {
    id: '5',
    teamId: '1',
    userId: '4',
    userName: '赵六',
    action: 'PUBLISH_DISTRIBUTION',
    entityType: 'DISTRIBUTION_RECORD',
    entityId: '1',
    details: {
      platform: '小宇宙',
      episodeTitle: '新消费品牌的破局之路',
    },
    ipAddress: '192.168.1.103',
    createdAt: '2024-06-06T10:00:00Z',
  },
  {
    id: '6',
    teamId: '1',
    userId: '1',
    userName: '张三',
    action: 'INVITE_MEMBER',
    entityType: 'USER',
    details: {
      email: 'newhost@example.com',
      role: 'HOST',
    },
    ipAddress: '192.168.1.100',
    createdAt: '2024-06-09T16:00:00Z',
  },
];

export const mockDashboardStats: DashboardStats = {
  programCount: 3,
  episodeCount: 54,
  inProgressEpisodes: 4,
  pendingTasks: 8,
  pendingDistribution: 3,
  recentEpisodes: mockEpisodes.slice(0, 3),
  recentActivity: mockAuditLogs.slice(0, 5),
};

export const getAnnotationColor = (type: string): string => {
  switch (type) {
    case 'CORRECTION':
      return '#EF4444';
    case 'APPROVAL':
      return '#10B981';
    case 'QUESTION':
      return '#F59E0B';
    default:
      return '#6366F1';
  }
};

export const getAnnotationBgColor = (type: string): string => {
  switch (type) {
    case 'CORRECTION':
      return 'rgba(239, 68, 68, 0.3)';
    case 'APPROVAL':
      return 'rgba(16, 185, 129, 0.3)';
    case 'QUESTION':
      return 'rgba(245, 158, 11, 0.3)';
    default:
      return 'rgba(99, 102, 241, 0.3)';
  }
};

export const mockSessions: Session[] = [
  {
    id: '1',
    userId: '1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ipAddress: '192.168.1.100',
    createdAt: '2024-06-10T08:00:00Z',
    expiresAt: '2024-06-24T08:00:00Z',
  },
  {
    id: '2',
    userId: '1',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ipAddress: '192.168.1.101',
    createdAt: '2024-06-09T14:30:00Z',
    expiresAt: '2024-06-23T14:30:00Z',
  },
  {
    id: '3',
    userId: '1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    ipAddress: '10.0.0.50',
    createdAt: '2024-06-08T09:15:00Z',
    expiresAt: '2024-06-22T09:15:00Z',
  },
  {
    id: '4',
    userId: '1',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ipAddress: '192.168.1.102',
    createdAt: '2024-06-05T16:45:00Z',
    expiresAt: '2024-06-19T16:45:00Z',
  },
];

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}

export const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: '生产环境 API 密钥',
    key: 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxx',
    createdAt: '2024-01-15T00:00:00Z',
    lastUsed: '2024-06-10T12:30:00Z',
  },
  {
    id: '2',
    name: '测试环境 API 密钥',
    key: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
    createdAt: '2024-03-20T00:00:00Z',
    lastUsed: '2024-06-08T09:15:00Z',
  },
];

import { ShareComment, ReportRecord, CommentSortOrder, CommentStatus } from '@/types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const mockShareComments: ShareComment[] = [
  {
    id: 'c1',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '这期节目太棒了！AI大模型的发展真的令人兴奋，特别是多模态能力的突破。期待下期节目深入探讨Agent智能体方向。',
    status: 'APPROVED',
    isPinned: true,
    likeCount: 128,
    replyCount: 5,
    reportCount: 0,
    createdByName: '科技爱好者小明',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
    isGuest: true,
    guestNickname: '科技爱好者小明',
    visitorId: 'v_demo_visitor_1',
    createdAt: '2024-06-16T09:30:00Z',
    updatedAt: '2024-06-16T10:00:00Z',
    adminReply: '感谢您的支持！下期节目我们确实会邀请AI Agent领域的专家，敬请期待~',
    adminRepliedBy: '张三（管理员）',
    adminRepliedAt: '2024-06-16T10:00:00Z',
    likedByMe: false,
  },
  {
    id: 'c2',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '请问嘉宾提到的开源大模型对比表格在哪里可以看到？想详细了解一下各模型的Benchmark数据。',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 45,
    replyCount: 2,
    reportCount: 0,
    createdById: '3',
    createdByName: '王五',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor',
    isGuest: false,
    createdAt: '2024-06-16T11:20:00Z',
    updatedAt: '2024-06-16T11:20:00Z',
    likedByMe: true,
  },
  {
    id: 'c3',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '我觉得节目中关于AI伦理的讨论有点浅了，希望能更深入探讨数据隐私、算法偏见这些问题。另外25分钟左右的内容好像重复了？',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 32,
    replyCount: 1,
    reportCount: 0,
    createdByName: '产品经理老李',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laoli',
    isGuest: true,
    guestNickname: '产品经理老李',
    visitorId: 'v_demo_visitor_2',
    createdAt: '2024-06-16T14:15:00Z',
    updatedAt: '2024-06-16T14:15:00Z',
    likedByMe: false,
  },
  {
    id: 'c4',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '节目制作质量非常高，音质和剪辑都很专业。唯一的建议是嘉宾的声音大小可以再均衡一下，有时候忽大忽小的。',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 21,
    replyCount: 0,
    reportCount: 0,
    createdByName: '播客制作人Amy',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amy',
    isGuest: true,
    guestNickname: '播客制作人Amy',
    visitorId: 'v_demo_visitor_3',
    createdAt: '2024-06-16T16:45:00Z',
    updatedAt: '2024-06-16T16:45:00Z',
    likedByMe: false,
  },
  {
    id: 'c5',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '垃圾节目，完全是胡说八道！[此处有大量不当言论已被折叠]',
    status: 'REJECTED',
    isPinned: false,
    likeCount: 0,
    replyCount: 0,
    reportCount: 12,
    createdByName: '匿名用户',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=troll1',
    isGuest: true,
    guestNickname: '路人甲',
    visitorId: 'v_demo_visitor_troll',
    createdAt: '2024-06-16T18:00:00Z',
    updatedAt: '2024-06-16T18:30:00Z',
    likedByMe: false,
    reportedByMe: true,
  },
  {
    id: 'c6',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '这个广告也太多了吧？中间插了三个广告，听的体验有点差。',
    status: 'PENDING',
    isPinned: false,
    likeCount: 8,
    replyCount: 0,
    reportCount: 1,
    createdByName: '听众小王',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaowang',
    isGuest: true,
    guestNickname: '听众小王',
    visitorId: 'v_demo_visitor_4',
    createdAt: '2024-06-17T08:10:00Z',
    updatedAt: '2024-06-17T08:10:00Z',
    likedByMe: false,
  },
  {
    id: 'c7',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '作为NLP领域的研究者，这期节目对大模型趋势的判断还是比较准确的。不过我有个小疑问：关于推理能力(RAG)部分，你们认为未来的主要瓶颈是在检索还是生成？',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 56,
    replyCount: 3,
    reportCount: 0,
    createdByName: 'Dr. Chen',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=drchen',
    isGuest: true,
    guestNickname: 'Dr. Chen',
    visitorId: 'v_demo_visitor_5',
    createdAt: '2024-06-17T10:30:00Z',
    updatedAt: '2024-06-17T10:30:00Z',
    likedByMe: false,
  },
  {
    id: 'c8',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    content: '求推荐几篇节目中提到的论文，特别是关于Scaling Law那部分的！',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 19,
    replyCount: 1,
    reportCount: 0,
    createdByName: '在读研究生',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
    isGuest: true,
    guestNickname: '在读研究生',
    visitorId: 'v_demo_visitor_6',
    createdAt: '2024-06-17T13:20:00Z',
    updatedAt: '2024-06-17T13:20:00Z',
    likedByMe: false,
  },
  {
    id: 'c9',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    parentId: 'c1',
    content: '同意！我也特别期待Agent方向的讨论，还有多智能体协作方面~',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 15,
    replyCount: 0,
    reportCount: 0,
    createdByName: 'AI创业者',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=startup',
    isGuest: true,
    guestNickname: 'AI创业者',
    visitorId: 'v_demo_visitor_7',
    createdAt: '2024-06-16T10:15:00Z',
    updatedAt: '2024-06-16T10:15:00Z',
    likedByMe: false,
  },
  {
    id: 'c10',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    parentId: 'c1',
    content: '大模型现在更新太快了，节目录制到发布的时间里可能又有新模型出来了哈哈',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 8,
    replyCount: 0,
    reportCount: 0,
    createdByName: '算法工程师',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=algo',
    isGuest: true,
    guestNickname: '算法工程师',
    visitorId: 'v_demo_visitor_8',
    createdAt: '2024-06-16T11:00:00Z',
    updatedAt: '2024-06-16T11:00:00Z',
    likedByMe: false,
  },
  {
    id: 'c11',
    shareId: 'valid-share-token-123',
    episodeId: '1',
    parentId: 'c3',
    content: '我也有同感！希望下期可以专门聊聊AI治理和伦理的话题',
    status: 'APPROVED',
    isPinned: false,
    likeCount: 6,
    replyCount: 0,
    reportCount: 0,
    createdByName: '法学专业学生',
    createdByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=law',
    isGuest: true,
    guestNickname: '法学专业学生',
    visitorId: 'v_demo_visitor_9',
    createdAt: '2024-06-16T15:00:00Z',
    updatedAt: '2024-06-16T15:00:00Z',
    likedByMe: false,
  },
];

export const mockReportRecords: ReportRecord[] = [
  {
    id: 'r1',
    commentId: 'c5',
    reporterName: '热心听众',
    reason: 'HATE_SPEECH',
    description: '评论中包含人身攻击和歧视性言论',
    createdAt: '2024-06-16T18:10:00Z',
    resolved: true,
    resolvedBy: '张三',
    resolvedAt: '2024-06-16T18:30:00Z',
  },
  {
    id: 'r2',
    commentId: 'c6',
    reporterName: '运营团队',
    reason: 'SPAM',
    description: '怀疑是刷评机器人批量发布的内容',
    createdAt: '2024-06-17T08:15:00Z',
    resolved: false,
  },
];

export function filterAndSortComments(
  comments: ShareComment[],
  params: {
    sort?: CommentSortOrder;
    status?: CommentStatus;
    includeReplies?: boolean;
    searchQuery?: string;
    parentId?: string | null;
  }
): ShareComment[] {
  let result = [...comments];

  if (!params.includeReplies) {
    result = result.filter(c => !c.parentId);
  } else if (params.parentId !== undefined) {
    if (params.parentId === null) {
      result = result.filter(c => !c.parentId);
    } else {
      result = result.filter(c => c.parentId === params.parentId);
    }
  }

  if (params.status) {
    result = result.filter(c => c.status === params.status);
  }

  if (params.searchQuery) {
    const query = params.searchQuery.toLowerCase();
    result = result.filter(c =>
      c.content.toLowerCase().includes(query) ||
      c.createdByName.toLowerCase().includes(query)
    );
  }

  const sortOrder = params.sort || 'PINNED_FIRST';
  switch (sortOrder) {
    case 'NEWEST':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'OLDEST':
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'MOST_LIKED':
      result.sort((a, b) => b.likeCount - a.likeCount);
      break;
    case 'MOST_REPLIES':
      result.sort((a, b) => b.replyCount - a.replyCount);
      break;
    case 'PINNED_FIRST':
      result.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      break;
  }

  return result;
}

export function paginateComments(comments: ShareComment[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return comments.slice(start, end);
}
