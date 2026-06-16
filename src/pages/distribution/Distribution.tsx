import React from 'react';
import { Share2 } from 'lucide-react';

const Distribution: React.FC = () => {
  return (
    <div className="glass-card p-12 text-center">
      <Share2 className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
      <h3 className="text-lg font-semibold text-foreground mb-2">分发管理</h3>
      <p className="text-muted">此功能正在开发中</p>
    </div>
  );
};

export { Distribution };
