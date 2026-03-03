import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Bell, Headphones, Link2, Mic, Search, Settings } from 'lucide-react';
import { api } from '../lib/api';
import { AuthPanel } from '../components/AuthPanel';

const statusStyles = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  invisible: 'bg-gray-600',
  offline: 'bg-zinc-500'
};

export function App() {
  const [user, setUser] = useState(null);
  const [servers, setServers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeServer, setActiveServer] = useState();
  const [activeChannel, setActiveChannel] = useState();
  const [typing, setTyping] = useState('');
  const [draft, setDraft] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const socket = useMemo(() => io('http://localhost:4000', { auth: { userId: user?.id }, autoConnect: !!user }), [user?.id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const srv = await api.get('/api/servers');
      setServers(srv.data);
      setActiveServer(srv.data[0]);
    })();
  }, [user]);

  useEffect(() => {
    if (!activeServer) return;
    (async () => {
      const { data } = await api.get(`/api/servers/${activeServer.id}/channels`);
      setChannels(data);
      setActiveChannel(data[0]);
      setInviteLink('');
    })();
  }, [activeServer]);

  useEffect(() => {
    if (!activeChannel) return;
    socket.emit('channel:join', activeChannel.id);
    api.get(`/api/channels/${activeChannel.id}/messages`).then(({ data }) => setMessages(data));
  }, [activeChannel, socket]);

  useEffect(() => {
    socket.on('message:new', (message) => setMessages((m) => [...m, message]));
    socket.on('typing:update', ({ username }) => setTyping(`${username} is typing...`));
    socket.on('message:reactions', ({ messageId, reactions }) => {
      setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg)));
    });
    return () => socket.disconnect();
  }, [socket]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post(`/api/channels/${activeChannel.id}/messages`, { content: draft });
    setDraft('');
    setTyping('');
  }

  async function addReaction(messageId, emoji) {
    await api.post(`/api/messages/${messageId}/reactions`, { emoji });
  }

  async function createInviteLink() {
    if (!activeServer) return;
    const { data } = await api.post(`/api/servers/${activeServer.id}/invites`, { expiresInHours: 24 });
    setInviteLink(data.link);
    await navigator.clipboard?.writeText(data.link).catch(() => {});
  }

  if (!user) return <div className="min-h-screen grid place-items-center bg-gradient-to-b from-slate-950 to-slate-800"><AuthPanel onAuthed={setUser} /></div>;

  return (
    <div className="h-screen text-slate-100 flex bg-[#1e1f22]">
      <aside className="w-20 bg-[#111214] p-3 space-y-3">
        {servers.map((s) => <button key={s.id} onClick={() => setActiveServer(s)} className="w-12 h-12 rounded-2xl hover:rounded-xl transition bg-indigo-500/90">{s.name[0]}</button>)}
      </aside>
      <aside className="w-64 bg-[#2b2d31] p-4 border-r border-black/20">
        <h2 className="font-semibold mb-2">{activeServer?.name}</h2>
        <button onClick={createInviteLink} className="w-full mb-3 text-left bg-indigo-500/90 hover:bg-indigo-500 rounded-lg p-2 text-sm inline-flex items-center gap-2"><Link2 size={16} /> Create Invite Link</button>
        {inviteLink && <p className="text-xs break-all text-slate-300 mb-3">Invite: <a href={inviteLink} className="text-indigo-300 underline">{inviteLink}</a></p>}
        {channels.map((c) => (
          <button key={c.id} onClick={() => setActiveChannel(c)} className="w-full text-left hover:bg-white/10 p-2 rounded-lg">{c.type === 'voice' ? '🔊' : '#'} {c.name}</button>
        ))}
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-14 border-b border-black/30 flex items-center px-4 justify-between">
          <div className="font-semibold">#{activeChannel?.name}</div>
          <div className="flex items-center gap-3 text-slate-300"><Search size={18} /><Bell size={18} /></div>
        </header>
        <section className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <article key={m.id} className={`p-3 rounded-xl ${m.content.includes(`@${user.username}`) || m.mentions_everyone ? 'bg-amber-500/10 border border-amber-400/40' : 'bg-white/5'}`}>
              <div className="text-sm"><span className="font-semibold">{m.display_name || m.username}</span> <span className="text-slate-400">{new Date(m.created_at).toLocaleTimeString()}</span></div>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <div className="flex gap-2 mt-2">
                {['👍', '❤️', '😂', '😭', '🔥'].map((emoji) => <button key={emoji} onClick={() => addReaction(m.id, emoji)} className="text-xs px-2 py-1 rounded bg-black/20 hover:bg-black/40">{emoji}</button>)}
                {m.reactions?.map((r) => <span key={r.emoji} className="text-xs">{r.emoji} {r.count}</span>)}
              </div>
            </article>
          ))}
          <p className="text-xs text-slate-400">{typing}</p>
        </section>
        <form onSubmit={sendMessage} className="p-4">
          <input value={draft} onChange={(e) => { setDraft(e.target.value); socket.emit('typing:start', { channelId: activeChannel.id, username: user.username }); }} placeholder="Message channel" className="w-full bg-[#383a40] rounded-lg p-3" />
        </form>
      </main>
      <aside className="w-64 bg-[#2b2d31] p-4 border-l border-black/20">
        <h3 className="text-xs text-slate-400 mb-2">ONLINE</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${statusStyles.online}`} />{user.username}</div>
        </div>
      </aside>
      <div className="fixed left-24 bottom-3 bg-[#232428] rounded-xl p-3 flex gap-3 items-center shadow-2xl">
        <Mic size={18} className="hover:text-green-400" />
        <Headphones size={18} className="hover:text-green-400" />
        <Settings size={18} className="hover:text-indigo-400" />
      </div>
    </div>
  );
}
