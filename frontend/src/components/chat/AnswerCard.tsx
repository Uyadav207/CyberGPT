import React from "react";

interface AnswerCardProps {
  title?: string;
  content: string;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ title, content }) => (
  <div className="bg-background border rounded-lg p-4 shadow-sm mt-4">
    {title && <div className="font-semibold text-lg mb-2 text-primary">{title}</div>}
    <div className="text-base text-foreground" style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
  </div>
);

export default AnswerCard; 