import React from 'react';

const ChatInterface = ({ messages }) => {
    return (
        <div className="flex flex-col h-full bg-slate-50 p-4 space-y-4 overflow-y-auto">
            {messages.map((msg) => {
                const isInternal = msg.type === 'internal_note';
                const isAgent = msg.type === 'outgoing';
                const isCustomer = msg.type === 'incoming';

                return (
                    <div
                        key={msg.id}
                        className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} w-full`}
                    >
                        <div
                            className={`max-w-[70%] p-3 rounded-lg shadow-sm text-sm 
                ${isInternal ? 'bg-amber-100 border-l-4 border-amber-400 text-amber-900' : ''}
                ${isCustomer ? 'bg-white text-slate-800' : ''}
                ${isAgent ? 'bg-indigo-600 text-white' : ''}
              `}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-[10px] uppercase tracking-wider opacity-70">
                                    {isInternal ? 'Nota Interna' : (isAgent ? 'Tú' : 'Cliente')}
                                </span>
                                <span className="text-[10px] opacity-50 ml-2">
                                    {new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChatInterface;
