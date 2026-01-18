import React, { useState, useEffect, useRef } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import ChatInterface from './components/ChatInterface';
import {
    MessageSquare,
    Users,
    BarChart3,
    Settings,
    Search,
    Paperclip,
    Send,
    Hash
} from 'lucide-react';

const WEBHOOK_URL = "https://helpdesk-webhook.vercel.app/api";

const App = () => {
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [activeCustomer, setActiveCustomer] = useState(null);

    // 1. Listen for active conversations
    useEffect(() => {
        const q = query(
            collection(db, "conversations"),
            where("status", "==", "open"),
            orderBy("updated_at", "desc")
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const convs = [];
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                // Fetch customer name
                const customerSnap = await getDoc(doc(db, "customers", data.customer_id));
                convs.push({
                    id: docSnap.id,
                    ...data,
                    customerName: customerSnap.exists() ? customerSnap.data().name : "Desconocido"
                });
            }
            setConversations(convs);
            if (convs.length > 0 && !activeConversationId) {
                setActiveConversationId(convs[0].id);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 2. Listen for messages
    useEffect(() => {
        if (!activeConversationId) return;

        const q = query(
            collection(db, "messages"),
            where("conversation_id", "==", activeConversationId),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
            }));
            setMessages(msgs);
        });

        const conv = conversations.find(c => c.id === activeConversationId);
        if (conv) {
            setActiveCustomer({
                name: conv.customerName,
                source: conv.channel_source,
                type: conv.message_type || 'dm'
            });
        }

        return () => unsubscribe();
    }, [activeConversationId, conversations]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !activeConversationId || sending) return;

        const isNote = inputText.startsWith('/note ');
        const text = isNote ? inputText.replace('/note ', '') : inputText;
        const currentConv = conversations.find(c => c.id === activeConversationId);

        setSending(true);
        try {
            // 1. Send via Webhook if not a note
            if (!isNote) {
                const customerDoc = await getDoc(doc(db, "customers", currentConv.customer_id));
                if (!customerDoc.exists()) throw new Error("Cliente no encontrado");
                const customer = customerDoc.data();

                // Usamos el ID del canal correspondiente
                const targetId = currentConv.channel_source === "whatsapp" ? customer.wa_id : customer.ig_id;

                if (!targetId) throw new Error("El cliente no tiene un ID de Meta configurado.");

                const payload = {
                    action: "send_reply",
                    message_type: currentConv.message_type || "dm",
                    message: text,
                    recipient_id: targetId,
                    comment_id: currentConv.comment_id || null
                };

                const response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || "Error al enviar a Meta");
                }
            }

            // 2. Local Firestore Write
            await addDoc(collection(db, "messages"), {
                conversation_id: activeConversationId,
                customer_id: currentConv.customer_id,
                type: isNote ? 'internal_note' : 'outgoing',
                text: text,
                timestamp: serverTimestamp()
            });

            // 3. Update conversation interaction
            await updateDoc(doc(db, "conversations", activeConversationId), {
                updated_at: serverTimestamp()
            });

            setInputText('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Error: " + error.message);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium tracking-tight">Cargando Helpdesk...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-white">
            <aside className="w-20 bg-indigo-950 flex flex-col items-center py-8 gap-10">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white p-2.5">
                    <MessageSquare size={24} />
                </div>
                <nav className="flex flex-col gap-8 text-indigo-300/30">
                    <Users size={24} className="hover:text-white transition-colors cursor-pointer" />
                    <BarChart3 size={24} className="hover:text-white transition-colors cursor-pointer" />
                    <Settings size={24} className="hover:text-white transition-colors cursor-pointer" />
                </nav>
            </aside>

            <div className="w-80 border-r border-slate-100 flex flex-col hidden lg:flex bg-white">
                <div className="p-6 border-b border-slate-50">
                    <h1 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Mensajes</h1>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar chats..."
                            className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => setActiveConversationId(conv.id)}
                            className={`p-4 rounded-2xl cursor-pointer relative overflow-hidden transition-all duration-200 
                                ${activeConversationId === conv.id
                                    ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                                    : 'hover:bg-slate-50 border border-transparent'}`}
                        >
                            {activeConversationId === conv.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                            )}
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold text-[13px] ${activeConversationId === conv.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                                    {conv.customerName}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${conv.message_type === 'comment' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {conv.message_type || 'dm'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase opacity-60">
                                        {conv.channel_source === 'whatsapp' ? 'WA' : 'IG'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[12px] text-slate-500 truncate pr-4 mt-1">
                                {conv.message_type === 'comment' ? 'Comentó en tu post' : 'Envió un mensaje privado'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50/30">
                {activeConversationId ? (
                    <>
                        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-xl z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${activeCustomer?.type === 'comment' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                                    {activeCustomer?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-[15px]">{activeCustomer?.name}</h2>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                        {activeCustomer?.source} • {activeCustomer?.type}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wide ${sending ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                                    {sending ? 'Sincronizando...' : 'Online'}
                                </span>
                            </div>
                        </header>

                        <main className="flex-1 overflow-hidden relative">
                            <ChatInterface messages={messages} />
                        </main>

                        <footer className="p-6 bg-white border-t border-slate-100">
                            <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                                <div className="flex items-end gap-3 bg-slate-50/80 border border-slate-100 rounded-[28px] p-2 pl-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-300">
                                    <button type="button" className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors mb-1">
                                        <Paperclip size={20} />
                                    </button>
                                    <textarea
                                        value={inputText}
                                        disabled={sending}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                                        placeholder={activeCustomer?.type === 'comment' ? "Respuesta pública al comentario..." : "Escribe un mensaje privado..."}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] text-slate-700 py-3 outline-none resize-none max-h-32 min-h-[44px] font-medium"
                                        rows="1"
                                    ></textarea>
                                    <button
                                        type="submit"
                                        disabled={sending || !inputText.trim()}
                                        className={`p-3.5 rounded-2xl shadow-lg transition-all ${sending || !inputText.trim() ? 'bg-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-100'}`}
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Send size={20} />
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 text-center font-medium opacity-60">
                                    Usa <span className="font-bold text-amber-600">/note</span> para mensajes internos • Presiona <span className="font-bold">Enter</span> para enviar
                                </p>
                            </form>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                        <MessageSquare size={80} className="mb-6 text-indigo-900" />
                        <h3 className="text-xl font-bold text-slate-900">Selecciona un chat</h3>
                        <p className="text-sm font-medium">Buscando conversaciones en tiempo real</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
