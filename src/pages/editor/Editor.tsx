import React from 'react';
import { PencilLine } from 'lucide-react';
import { useParams } from 'react-router-dom';

const Editor: React.FC = () => {
  const { episodeId } = useParams();

  return (
    <div className="glass-card p-12 text-center">
      <PencilLine className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
      <h3 className="text-lg font-semibold text-foreground mb-2">音频编辑器</h3>
      <p className="text-muted">集数 ID: {episodeId}</p>
      <p className="text-muted mt-2">此功能正在开发中</p>
    </div>
  );
};

export { Editor };
