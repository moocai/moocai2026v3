import {Terminal, Globe, Cpu, Layers, Database, Code2} from 'lucide-react';

export const CourseIcon = ({ title }: { title: any }) => {
  const iconProps = { size: 22, color: '#a855f7' };
  const name = typeof title === 'string' ? title.toLowerCase() : (title?.ca || '').toLowerCase();
  if (name.includes('python')) return <Terminal {...iconProps} />;
  if (name.includes('react')) return <Globe {...iconProps} />;
  if (name.includes('learning') || name.includes('aprenent')) return <Cpu {...iconProps} />;
  if (name.includes('spring') || name.includes('java')) return <Layers {...iconProps} />;
  if (name.includes('base de dades') || name.includes('sql')) return <Database {...iconProps} />;
  return <Code2 {...iconProps} />;
};
