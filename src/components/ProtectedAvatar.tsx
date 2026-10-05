import { Avatar } from '@mui/material';
import { useImageUrl } from '../utils/avatarCache';

/**
 * Avatar d'URLs protegides (necessiten header d'autenticació): resol la imatge
 * des de la memòria cau compartida i només demana-la al servidor si fa falta.
 */
export function ProtectedAvatar({ src, alt, sx }: { src?: string; alt?: string; sx?: any }) {
  const objectUrl = useImageUrl(src);
  return (
    <Avatar src={objectUrl || undefined} alt={alt || ''} sx={sx}>
      {alt ? alt.charAt(0).toUpperCase() : ''}
    </Avatar>
  );
}

export default ProtectedAvatar;