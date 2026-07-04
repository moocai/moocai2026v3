import { useState } from 'react';
import { Fab, Drawer, Box, Typography, TextField, IconButton, Avatar, Badge, useTheme } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { ContactoChat, MensajeChat } from '../../types';

const contacts: ContactoChat[] = [];

export function ChatWidget() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactoChat | null>(null);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim() || !selectedContact) return;
    const newMsg: MensajeChat = { id: `msg-${Date.now()}`, text: message, sender: 'teacher', time: new Date().toLocaleTimeString() };
    selectedContact.mensajes.push(newMsg);
    setMessage('');
  };

  return (
    <>
      <Fab color="primary" onClick={() => setOpen(true)} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1500 }}>
        <ChatIcon />
      </Fab>
      <Drawer anchor="right" open={open} onClose={() => { setOpen(false); setSelectedContact(null); }} sx={{ '& .MuiDrawer-paper': { width: 380 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : '#fff' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('teacher.chat')}</Typography>
            <IconButton size="small" onClick={() => { setOpen(false); setSelectedContact(null); }}><CloseIcon /></IconButton>
          </Box>
          {!selectedContact ? (
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {contacts.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>{t('teacher.sinInvitaciones')}</Typography>
              ) : (
                contacts.map((c) => (
                  <Box key={c.id} onClick={() => setSelectedContact(c)} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Badge color="success" variant="dot"><Avatar src={c.avatar} sx={{ width: 40, height: 40 }} /></Badge>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.ultimoMensaje}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          ) : (
            <>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {selectedContact.mensajes.map((msg) => (
                  <Box key={msg.id} sx={{ alignSelf: msg.sender === 'teacher' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: msg.sender === 'teacher' ? 'primary.main' : theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100', color: msg.sender === 'teacher' ? '#fff' : 'text.primary' }}>
                      <Typography variant="body2">{msg.text}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.25, display: 'block', textAlign: msg.sender === 'teacher' ? 'right' : 'left' }}>{msg.time}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                <TextField fullWidth size="small" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t('teacher.enviaMensaje')} />
                <IconButton color="primary" onClick={handleSend}><SendIcon /></IconButton>
              </Box>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}