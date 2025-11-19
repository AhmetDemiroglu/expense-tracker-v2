import React, { useState } from 'react';
import { Transaction } from '../types';
import { analyzeFinances, askFinancialAdvisor } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AIAdvisorProps {
  transactions: Transaction[];
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ transactions }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeFinances(transactions);
    setAnalysis(result);
    setLoading(false);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQ = question;
    setQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: userQ }]);
    
    // Temporary loading state for chat
    setChatHistory(prev => [...prev, { role: 'ai', text: '...' }]);

    const response = await askFinancialAdvisor(transactions, userQ);
    
    setChatHistory(prev => {
        const newHist = [...prev];
        newHist.pop(); // remove loading
        return [...newHist, { role: 'ai', text: response }];
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Overview Analysis Section */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Gemini Finans Analizi
          </h3>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analiz Ediliyor...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Rapor Oluştur
              </>
            )}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 min-h-[300px]">
          {analysis ? (
            <div className="prose prose-invert prose-sm max-w-none">
               {/* Note: We render markdown here safely */}
               <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
               <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                 <span className="text-2xl">✨</span>
               </div>
               <p className="text-center max-w-xs">
                 Harcamalarınızı yapay zeka ile analiz etmek için butona tıklayın.
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Asistana Sor
        </h3>
        
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 custom-scrollbar bg-slate-900/30 p-4 rounded-xl border border-slate-700/50 h-[300px]">
            {chatHistory.length === 0 && (
                <p className="text-slate-500 text-sm text-center mt-10">
                    "Bu ay en çok neye harcama yaptım?" veya "Nasıl tasarruf edebilirim?" gibi sorular sorabilirsiniz.
                </p>
            )}
            {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-700 text-slate-200 rounded-bl-none'
                    }`}>
                        {msg.text === '...' ? (
                             <div className="flex gap-1 h-5 items-center">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                             </div>
                        ) : (
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        )}
                    </div>
                </div>
            ))}
        </div>

        <form onSubmit={handleAsk} className="relative">
            <input 
                type="text" 
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Bir soru sor..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-500"
            />
            <button 
                type="submit"
                disabled={!question.trim()}
                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </form>
      </div>
    </div>
  );
};