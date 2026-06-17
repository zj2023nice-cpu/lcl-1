import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Send,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Settings,
} from 'lucide-react';
import { emailTemplateApi } from '@/services/api';
import { EmailTemplate, EmailPreviewResponse } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/time';

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<EmailPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    templateKey: '',
    name: '',
    subject: '',
    content: '',
    description: '',
    isHtml: true,
    isEnabled: true,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await emailTemplateApi.getAll();
      setTemplates(res.data.data || []);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.templateKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsEditing(true);
    setFormData({
      templateKey: '',
      name: '',
      subject: '',
      content: '',
      description: '',
      isHtml: true,
      isEnabled: true,
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setFormData({
      templateKey: template.templateKey,
      name: template.name,
      subject: template.subject,
      content: template.content,
      description: template.description,
      isHtml: template.isHtml,
      isEnabled: template.isEnabled,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedTemplate(null);
    setFormData({
      templateKey: '',
      name: '',
      subject: '',
      content: '',
      description: '',
      isHtml: true,
      isEnabled: true,
    });
    setError('');
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setError('请输入模板名称');
      return;
    }
    if (!formData.templateKey?.trim()) {
      setError('请输入模板key');
      return;
    }
    if (!formData.subject?.trim()) {
      setError('请输入邮件主题');
      return;
    }
    if (!formData.content?.trim()) {
      setError('请输入邮件内容');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (selectedTemplate) {
        await emailTemplateApi.update(selectedTemplate.id, formData);
        setSuccessMsg('模板更新成功');
      } else {
        await emailTemplateApi.create(formData as EmailTemplate);
        setSuccessMsg('模板创建成功');
      }

      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchTemplates();
      setIsEditing(false);
      setSelectedTemplate(null);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个邮件模板吗？')) {
      return;
    }
    try {
      await emailTemplateApi.delete(id);
      setSuccessMsg('删除成功');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchTemplates();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '删除失败');
    }
  };

  const handlePreview = async () => {
    if (!formData.subject || !formData.content) {
      setError('请先填写主题和内容');
      return;
    }
    try {
      setPreviewLoading(true);
      const variables: Record<string, unknown> = {};
      const variableRegex = /\{\{(\w+)\}\}/g;
      let match;
      while ((match = variableRegex.exec(formData.subject + formData.content)) !== null) {
        variables[match[1]] = `[示例${match[1]}]`;
      }
      const res = await emailTemplateApi.preview({
        subject: formData.subject,
        content: formData.content,
        variables,
      });
      setPreviewResult(res.data.data || null);
      setShowPreview(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleEnabled = async (template: EmailTemplate) => {
    try {
      await emailTemplateApi.update(template.id, {
        isEnabled: !template.isEnabled,
      });
      await fetchTemplates();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '操作失败');
    }
  };

  const handleSendTest = async (template: EmailTemplate) => {
    const email = prompt('请输入测试邮箱地址：');
    if (!email) return;
    try {
      await emailTemplateApi.sendTest(template.id, { toEmail: email });
      setSuccessMsg('测试邮件已发送');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '发送失败');
    }
  };

  const getStatusBadgeClass = (enabled: boolean) =>
    enabled ? 'badge-success' : 'badge-muted';

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="btn-secondary p-2"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedTemplate ? '编辑邮件模板' : '创建邮件模板'}
              </h1>
              <p className="text-muted mt-1">
                {selectedTemplate ? '修改现有邮件模板的配置' : '创建一个新的邮件模板'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2 text-error bg-error/10 px-3 py-2 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-2 rounded-lg text-sm">
                <Check className="w-4 h-4" />
                {successMsg}
              </div>
            )}
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="btn-secondary flex items-center gap-2"
            >
              {previewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              预览
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              保存
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    模板名称
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="例如：新消息通知"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    模板Key
                  </label>
                  <input
                    type="text"
                    value={formData.templateKey || ''}
                    onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
                    className="input-field font-mono text-sm"
                    placeholder="例如：new_message"
                    disabled={!!selectedTemplate}
                  />
                  {selectedTemplate && (
                    <p className="text-xs text-muted mt-1">模板Key创建后不可修改</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  模板描述
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="简要描述这个模板的用途"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  邮件主题
                </label>
                <input
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input-field"
                  placeholder="例如：您有一条新消息 - {{senderName}}"
                />
                <p className="text-xs text-muted mt-1">
                  使用 {'{{变量名}}'} 的格式插入动态变量
                </p>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">邮件内容</h3>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={16}
                className="input-field font-mono text-sm resize-none"
                placeholder={
                  formData.isHtml
                    ? '<html><body><h1>邮件标题</h1><p>正文内容...</p></body></html>'
                    : '纯文本邮件内容...'
                }
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted">
                  使用 {'{{变量名}}'} 的格式插入动态变量
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">HTML格式</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isHtml: !formData.isHtml })}
                    className="text-primary-400"
                  >
                    {formData.isHtml ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">模板设置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-foreground/5 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">启用状态</p>
                    <p className="text-xs text-muted">关闭后该模板将不会被使用</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                    className={cn(
                      formData.isEnabled ? 'text-success' : 'text-muted'
                    )}
                  >
                    {formData.isEnabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">变量说明</h3>
              <p className="text-sm text-muted mb-3">
                在主题和内容中检测到的变量：
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const vars = new Set<string>();
                  const regex = /\{\{(\w+)\}\}/g;
                  let m;
                  while ((m = regex.exec((formData.subject || '') + (formData.content || ''))) !== null) {
                    vars.add(m[1]);
                  }
                  if (vars.size === 0) {
                    return <span className="text-xs text-muted">暂无变量</span>;
                  }
                  return Array.from(vars).map((v) => (
                    <span
                      key={v}
                      className="text-xs bg-primary-500/10 text-primary-400 px-2 py-1 rounded-md font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {showPreview && previewResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-3xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">邮件预览</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1 hover:bg-foreground/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-border">
                <p className="text-sm text-muted mb-1">主题：</p>
                <p className="font-medium text-foreground">{previewResult.subject}</p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {formData.isHtml ? (
                  <div
                    className="bg-white p-6 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: previewResult.content }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-foreground bg-foreground/5 p-4 rounded-lg">
                    {previewResult.content}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">邮件模板</h1>
          <p className="text-muted mt-1">管理系统通知邮件的模板配置</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 text-error bg-error/10 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-2 rounded-lg text-sm">
              <Check className="w-4 h-4" />
              {successMsg}
            </div>
          )}
          <button
            onClick={handleCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建模板
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="搜索模板名称、key或主题..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredTemplates.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {template.name}
                        </h3>
                        <span className={cn('badge', getStatusBadgeClass(template.isEnabled))}>
                          {template.isEnabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mb-2 font-mono">
                        {template.templateKey}
                      </p>
                      <p className="text-sm text-foreground truncate">
                        主题：{template.subject}
                      </p>
                      {template.description && (
                        <p className="text-xs text-muted mt-1 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleEnabled(template)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        template.isEnabled
                          ? 'text-success hover:bg-success/10'
                          : 'text-muted hover:bg-foreground/10'
                      )}
                      title={template.isEnabled ? '禁用' : '启用'}
                    >
                      {template.isEnabled ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSendTest(template)}
                      className="p-2 text-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                      title="发送测试邮件"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {template.isHtml ? 'HTML 格式' : '纯文本格式'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    更新于 {formatDate(template.updatedAt, 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? '未找到匹配的模板' : '暂无邮件模板'}
            </h3>
            <p className="text-muted">
              {searchQuery
                ? '尝试调整搜索关键词'
                : '点击上方按钮创建第一个邮件模板'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export { EmailTemplates };
