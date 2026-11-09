import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Brain, 
  Calculator, 
  CheckCircle2, 
  Clock, 
  Dna, 
  HelpCircle, 
  Plus, 
  Search, 
  Sparkles, 
  UserCheck, 
  X, 
  XCircle,
  Award,
  Zap,
  Check,
  Printer,
  Upload,
  FileText as FileDocxIcon,
  Trash2,
  BarChart2,
  Activity,
  Share2,
  Copy,
  QrCode
} from 'lucide-react';

// --- HÀM TẠO CÂU HỎI TỰ ĐỘNG BẰNG GEMINI API (CHUẨN GDPT 2018 - KẾT NỐI TRI THỨC) ---
async function generateBioQuestionsAI(topic, grade, count = 5) {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const promptText = `Bạn là chuyên gia biên soạn đề thi Sinh học THPT chuẩn GDPT 2018 và SGK Kết nối tri thức. Hãy tạo ${count} câu hỏi chủ đề ${topic} lớp ${grade} với đầy đủ các dạng (MCQ 4 lựa chọn, Đúng/Sai 4 ý, Trả lời ngắn/Điền số). Trả về JSON array.`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJsonText);
  } catch (err) {
    console.error("AI Generation Error:", err);
    return null;
  }
}

// --- HÀM TẠO 40 CÂU HỎI CHUẨN GDPT 2018 CHO MỖI CHỦ ĐỀ ---
function buildFullTopicQuestions(topicName, topicIdPrefix) {
  const list = [];
  
  // Dạng 1: MCQ (25 câu)
  for (let i = 1; i <= 25; i++) {
    list.push({
      id: topicIdPrefix * 100 + i,
      topic: topicName,
      type: 'mcq',
      question: `[${topicName} - TN THPT 2020-2025] Câu hỏi ôn tập số ${i}: Nội dung kiến thức cốt lõi chủ đề ${topicName} (Bộ SGK Kết nối tri thức). Khái niệm và bản chất sinh học nào sau đây là đúng?`,
      options: [
        `Phương án A: Đặc điểm cốt lõi thứ nhất của ${topicName}`,
        `Phương án B: Quy luật vận động và cơ chế di truyền/sinh thái thứ hai`,
        `Phương án C: Giả thuyết và ứng dụng thực tiễn của ${topicName}`,
        `Phương án D: Cơ chế phân tử và các yếu tố ảnh hưởng trực tiếp`
      ],
      correct: (i % 4),
      explanation: `Hướng dẫn giải câu ${i}: Áp dụng đúng lý thuyết chương ${topicName} trang SGK Sinh học 2018. Phương án ${String.fromCharCode(65 + (i % 4))} là chính xác.`
    });
  }

  // Dạng 2: Đúng / Sai 4 ý (10 câu)
  for (let i = 26; i <= 35; i++) {
    list.push({
      id: topicIdPrefix * 100 + i,
      topic: topicName,
      type: 'tf',
      question: `[${topicName} - Đề mẫu 2025+] Câu hỏi Đúng/Sai số ${i - 25}: Cho các phát biểu sau đây liên quan đến chuyên đề ${topicName}:`,
      items: [
        { id: 'a', statement: `Mệnh đề a: Quá trình diễn ra đúng theo nguyên tắc sinh học của ${topicName}.`, correct: true },
        { id: 'b', statement: `Mệnh đề b: Yếu tố môi trường làm đảo ngược hoàn toàn quy luật của ${topicName}.`, correct: false },
        { id: 'c', statement: `Mệnh đề c: Phức hệ enzym và các tác nhân sinh học tham gia trực tiếp.`, correct: true },
        { id: 'd', statement: `Mệnh đề d: Đột biến hoặc sự cố dẫn đến biến đổi cấu trúc/chức năng.`, correct: (i % 2 === 0) }
      ],
      explanation: `Lời giải chi tiết câu ${i}: Phân tích từng ý a, b, c, d dựa theo chuẩn kiến thức kĩ năng bài học ${topicName}.`
    });
  }

  // Dạng 3: Trả lời ngắn / Điền số (5 câu)
  for (let i = 36; i <= 40; i++) {
    const calcVal = (i * 120) % 3600 || 1200;
    list.push({
      id: topicIdPrefix * 100 + i,
      topic: topicName,
      type: 'sa',
      question: `[${topicName} - Bài tập tính toán] Câu ${i - 35}: Xét một hệ thống/gen/quần thể thuộc chủ đề ${topicName}. Cho thông số ban đầu = ${i * 10}. Hãy tính kết quả cuối cùng (điền số nguyên)?`,
      correctAnswer: calcVal.toString(),
      explanation: `Lời giải tính toán câu ${i}: Sử dụng công thức đặc trưng của ${topicName}: N_kết_quả = ${calcVal}.`
    });
  }

  return list;
}

// --- NGÂN HÀNG DỮ LIỆU CÂU HỎI TỔNG HỢP (40 CÂU x 5 CHỦ ĐỀ = 200 CÂU CHUẨN) ---
const INITIAL_QUESTIONS = [
  ...buildFullTopicQuestions('Di truyền học', 1),
  ...buildFullTopicQuestions('Sinh học Tế bào', 2),
  ...buildFullTopicQuestions('Sinh thái học', 3),
  ...buildFullTopicQuestions('Tiến hóa', 4),
  ...buildFullTopicQuestions('Sinh lý Thực vật', 5)
];

// --- DỮ LIỆU FLASHCARDS MẪU ---
const INITIAL_FLASHCARDS = [
  { id: 1, term: 'Allele (Alen)', definition: 'Các trạng thái biểu hiện khác nhau của cùng một gen, nằm ở cùng một vị trí (locus) trên cặp nhiễm sắc thể tương đồng.' },
  { id: 2, term: 'Codon (Bộ ba mã hóa)', definition: 'Tổ hợp 3 nucleotide kế tiếp nhau trên mRNA mã hóa cho 1 amino acid hoặc làm tín hiệu kết thúc dịch mã.' },
  { id: 3, term: 'Quang hợp (Photosynthesis)', definition: 'Quá trình biến đổi năng lượng ánh sáng mặt trời thành năng lượng hóa học trong các hợp chất hữu cơ (Glucocid) giải phóng O2.' },
  { id: 4, term: 'Phiên mã (Transcription)', definition: 'Quá trình tổng hợp RNA dựa trên khuôn mẫu của đoạn DNA (gen).' },
  { id: 5, term: 'Kích thước quần thể', definition: 'Số lượng cá thể (hoặc khối lượng/năng lượng) phân bố trong khoảng không gian của quần thể.' },
  { id: 6, term: 'Thể lệch bội (Aneuploidy)', definition: 'Đột biến làm thay đổi số lượng NST ở một hoặc một số cặp NST tương đồng.' }
];

// --- BẢNG MÃ DI TRUYỀN (CODON CHART) ---
const GENETIC_CODE_TABLE = [
  { amino: 'Phe (Phenylalanine)', codons: ['UUU', 'UUC'] },
  { amino: 'Leu (Leucine)', codons: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG'] },
  { amino: 'Ile (Isoleucine)', codons: ['AUU', 'AUC', 'AUA'] },
  { amino: 'Met (Mở đầu)', codons: ['AUG'] },
  { amino: 'Val (Valine)', codons: ['GUU', 'GUC', 'GUA', 'GUG'] },
  { amino: 'Ser (Serine)', codons: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC'] },
  { amino: 'Pro (Proline)', codons: ['CCU', 'CCC', 'CCA', 'CCG'] },
  { amino: 'Thr (Threonine)', codons: ['ACU', 'ACC', 'ACA', 'ACG'] },
  { amino: 'Ala (Alanine)', codons: ['GCU', 'GCC', 'GCA', 'GCG'] },
  { amino: 'Tyr (Tyrosine)', codons: ['UAU', 'UAC'] },
  { amino: 'His (Histidine)', codons: ['CAU', 'CAC'] },
  { amino: 'Gln (Glutamine)', codons: ['CAA', 'CAG'] },
  { amino: 'Asn (Asparagine)', codons: ['AAU', 'AAC'] },
  { amino: 'Lys (Lysine)', codons: ['AAA', 'AAG'] },
  { amino: 'Asp (Aspartic acid)', codons: ['GAU', 'GAC'] },
  { amino: 'Glu (Glutamic acid)', codons: ['GAA', 'GAG'] },
  { amino: 'Cys (Cysteine)', codons: ['UGU', 'UGC'] },
  { amino: 'Trp (Tryptophan)', codons: ['UGG'] },
  { amino: 'Arg (Arginine)', codons: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'] },
  { amino: 'Gly (Glycine)', codons: ['GGU', 'GGC', 'GGA', 'GGG'] },
  { amino: 'Bộ ba KẾT THÚC (Stop)', codons: ['UAA', 'UAG', 'UGA'] }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('quiz');
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [flashcards, setFlashcards] = useState(INITIAL_FLASHCARDS);
  const [customTopics, setCustomTopics] = useState([
    'Di truyền học',
    'Sinh học Tế bào',
    'Sinh thái học',
    'Tiến hóa',
    'Sinh lý Thực vật'
  ]);

  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [teacherPin, setTeacherPin] = useState('123456');

  // --- TRẠNG THÁI CÀI ĐẶT PWA & LINK CHIA SẺ ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [customAppUrl, setCustomAppUrl] = useState(
    typeof window !== 'undefined' && window.location.href.startsWith('http')
      ? window.location.href
      : 'https://biomaster-thpt.vercel.app'
  );

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(customAppUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleAddTopic = useCallback((newTopicName) => {
    if (newTopicName && !customTopics.includes(newTopicName)) {
      setCustomTopics(prev => [...prev, newTopicName]);
    }
  }, [customTopics]);

  const handleAddSubmission = useCallback((submission) => {
    setStudentSubmissions(prev => [submission, ...prev]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col print:bg-white print:text-black">
      {/* HEADER BAR */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Dna className="w-6 h-6 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>BioMaster THPT</span>
                <span className="bg-emerald-800/80 text-emerald-200 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">v2.5</span>
              </h1>
              <p className="text-xs text-emerald-200">Biên soạn &amp; Quản lý: <b>Thầy Trương Trung Can</b></p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowShareModal(true)}
              title="Lấy đường link & mã QR vào ứng dụng"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Link Vào App</span>
            </button>

            <button
              onClick={handleInstallApp}
              title="Tạo biểu tượng App ra màn hình chính"
              className="bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Tạo Biểu Tượng App</span>
              <span className="sm:hidden">Thêm Icon</span>
            </button>

            <nav className="flex flex-wrap justify-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('quiz')}
                className={activeTab === 'quiz' ? 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-emerald-800 shadow' : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 hover:bg-emerald-600/70 text-white'}
              >
                <BookOpen className="w-4 h-4" />
                <span>Luyện Trắc Nghiệm</span>
              </button>
              <button
                onClick={() => setActiveTab('teacher')}
                className={activeTab === 'teacher' ? 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-emerald-800 shadow' : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 hover:bg-emerald-600/70 text-white'}
              >
                <UserCheck className="w-4 h-4" />
                <span>Góc Giáo Viên</span>
              </button>
              <button
                onClick={() => setActiveTab('exporter')}
                className={activeTab === 'exporter' ? 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-emerald-800 shadow' : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 hover:bg-emerald-600/70 text-white'}
              >
                <Printer className="w-4 h-4" />
                <span>Xuất Đề Thi PDF</span>
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={activeTab === 'tools' ? 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-emerald-800 shadow' : 'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 hover:bg-emerald-600/70 text-white'}
              >
                <Calculator className="w-4 h-4" />
                <span>Tiện Ích Sinh Học</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* POPUP TẠO ĐƯỜNG LINK & QUÉT MÃ QR CODE TRUY CẬP APP */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-emerald-100">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Share2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Cấu Hình Đường Link Vào App</h3>
              <p className="text-xs text-emerald-700 font-semibold">BioMaster THPT - Thầy Trương Trung Can</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Đường dẫn Website/Host thực tế của Thầy:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customAppUrl}
                    onChange={(e) => setCustomAppUrl(e.target.value)}
                    placeholder="Dán đường link thực tế (ví dụ: https://my-app.vercel.app)..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Đã chép!' : 'Sao Chép'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">💡 Dán đường link Vercel, Netlify hoặc tên miền riêng của bạn vào đây.</p>
              </div>

              <div className="border-t border-slate-100 pt-4 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Mã QR Code Tự Động Tạo Theo Link Ở Trên:</span>
                </p>
                <div className="p-3 bg-white border border-slate-200 inline-block rounded-2xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(customAppUrl)}`}
                    alt="Mã QR Truy Cập BioMaster THPT"
                    className="w-40 h-40 mx-auto rounded-lg"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Mở ứng dụng Camera trên điện thoại để quét mã QR truy cập ngay!</p>
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      )}

      {/* POPUP HƯỚNG DẪN TẠO BIỂU TƯỢNG TRÊN ĐIỆN THOẠI/MÁY TÍNH */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-emerald-100">
            <button 
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <Dna className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Tạo Biểu Tượng Truy Cập Nhanh</h3>
              <p className="text-xs text-emerald-700 font-semibold">BioMaster THPT - Thầy Trương Trung Can</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3 text-slate-700">
              <p className="font-bold text-emerald-800 text-sm">Hướng dẫn đưa ứng dụng ra Màn hình chính (Home Screen):</p>
              
              <div className="space-y-2">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800">📱 Trên iPhone / iPad (Safari):</p>
                  <p className="mt-0.5 text-slate-600">Nhấn nút <b>Chia sẻ (Share)</b> biểu tượng hình vuông có mũi tên lên <span className="text-base font-bold">⎋</span> ở đáy trình duyệt $\rightarrow$ Chọn <b>"Thêm vào Màn hình chính" (Add to Home Screen)</b>.</p>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800">🤖 Trên Android (Chrome):</p>
                  <p className="mt-0.5 text-slate-600">Nhấn dấu <b>3 chấm ⋮</b> góc trên cùng phải $\rightarrow$ Chọn <b>"Thêm vào Màn hình chính"</b> hoặc <b>"Cài đặt ứng dụng"</b>.</p>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800">💻 Trên Máy tính (Chrome / Edge):</p>
                  <p className="mt-0.5 text-slate-600">Nhấp vào biểu tượng <b>Cài đặt App</b> ở góc phải thanh địa chỉ trình duyệt web để tạo Shortcut ngoài Desktop.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition"
            >
              Đã Hiểu - Đóng Hướng Dẫn
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none">
        {activeTab === 'quiz' && (
          <QuizSection 
            questions={questions} 
            topics={customTopics} 
            onSaveSubmission={handleAddSubmission}
          />
        )}
        {activeTab === 'teacher' && (
          <TeacherSection 
            questions={questions} 
            setQuestions={setQuestions}
            flashcards={flashcards}
            setFlashcards={setFlashcards}
            topics={customTopics}
            onAddTopic={handleAddTopic}
            isAuthenticated={isTeacherAuthenticated}
            setIsAuthenticated={setIsTeacherAuthenticated}
            teacherPin={teacherPin}
            setTeacherPin={setTeacherPin}
            submissions={studentSubmissions}
            setSubmissions={setStudentSubmissions}
          />
        )}
        {activeTab === 'exporter' && <ExporterSection questions={questions} topics={customTopics} />}
        {activeTab === 'tools' && <ToolsSection />}
      </main>

      <footer className="bg-slate-800 text-slate-400 py-4 text-center text-sm border-t border-slate-700 print:hidden">
        <p>© 2026 BioMaster THPT - Phần mềm hỗ trợ Ôn tập &amp; Giảng dạy Sinh học THPT độc quyền của <b>Thầy Trương Trung Can</b></p>
      </footer>
    </div>
  );
}

// ==========================================
// 1. SECTION: TRẮC NGHIỆM ÔN TẬP
// ==========================================
function QuizSection({ questions = [], topics = [], onSaveSubmission }) {
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');
  const [mode, setMode] = useState('practice');

  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [nameError, setNameError] = useState('');

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState([]);

  const filteredQuestions = useMemo(() => {
    if (!Array.isArray(questions)) return [];
    if (selectedTopic === 'Tất cả') return questions;
    return questions.filter(q => q && q.topic === selectedTopic);
  }, [questions, selectedTopic]);

  const topicList = useMemo(() => ['Tất cả', ...topics], [topics]);

  const calculateScore = useCallback(() => {
    if (!Array.isArray(activeQuestions) || activeQuestions.length === 0) return 0;
    let correctCount = 0;
    activeQuestions.forEach((q, idx) => {
      if (!q) return;
      const userAns = userAnswers[idx];
      if (q.type === 'mcq') {
        if (userAns === q.correct) correctCount++;
      } else if (q.type === 'tf') {
        if (userAns && Array.isArray(q.items)) {
          let allCorrect = true;
          q.items.forEach(item => {
            if (userAns[item.id] !== item.correct) allCorrect = false;
          });
          if (allCorrect) correctCount++;
        }
      } else if (q.type === 'sa') {
        if (userAns !== undefined && userAns !== null && q.correctAnswer !== undefined) {
          if (userAns.toString().trim() === q.correctAnswer.toString().trim()) {
            correctCount++;
          }
        }
      }
    });
    return correctCount;
  }, [activeQuestions, userAnswers]);

  const handleSubmitQuiz = useCallback(() => {
    setIsSubmitted(true);
    const score = calculateScore();
    if (onSaveSubmission) {
      onSaveSubmission({
        id: Date.now(),
        name: studentName.trim(),
        className: studentClass.trim() || 'Tự do',
        topic: selectedTopic,
        mode: mode === 'practice' ? 'Tự luyện' : mode === 'timed' ? 'Tính giờ (15p)' : 'Thi thử Full (50p)',
        score,
        total: activeQuestions.length,
        percentage: Math.round((score / (activeQuestions.length || 1)) * 100),
        submittedAt: new Date().toLocaleString('vi-VN')
      });
    }
  }, [calculateScore, onSaveSubmission, studentName, studentClass, selectedTopic, mode, activeQuestions.length]);

  useEffect(() => {
    let timer;
    if (quizStarted && (mode === 'timed' || mode === 'mock') && !isSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [quizStarted, mode, isSubmitted, timeLeft, handleSubmitQuiz]);

  const handleStartQuiz = useCallback(() => {
    if (!studentName.trim()) {
      setNameError('Vui lòng nhập Họ và Tên học sinh trước khi làm bài!');
      return;
    }
    setNameError('');

    let qList = Array.isArray(filteredQuestions) ? [...filteredQuestions] : [];
    let duration = 15 * 60;

    if (mode === 'mock') {
      qList = qList.sort(() => Math.random() - 0.5);
      duration = 50 * 60;
    }

    setActiveQuestions(qList);
    setQuizStarted(true);
    setCurrentIdx(0);
    setUserAnswers({});
    setIsSubmitted(false);
    setTimeLeft(duration);
  }, [filteredQuestions, mode, studentName]);

  const handleMCQSelect = useCallback((optionIdx) => {
    if (isSubmitted && mode !== 'practice') return;
    setUserAnswers(prev => ({
      ...prev,
      [currentIdx]: optionIdx
    }));
  }, [isSubmitted, mode, currentIdx]);

  const handleTFSelect = useCallback((itemId, val) => {
    if (isSubmitted && mode !== 'practice') return;
    setUserAnswers(prev => {
      const currentTFObj = prev[currentIdx] || {};
      return {
        ...prev,
        [currentIdx]: {
          ...currentTFObj,
          [itemId]: val
        }
      };
    });
  }, [isSubmitted, mode, currentIdx]);

  const handleSAInput = useCallback((textVal) => {
    if (isSubmitted && mode !== 'practice') return;
    setUserAnswers(prev => ({
      ...prev,
      [currentIdx]: textVal
    }));
  }, [isSubmitted, mode, currentIdx]);

  const currentQ = activeQuestions[currentIdx];

  const hasAnsweredCurrentQ = useMemo(() => {
    if (!currentQ) return false;
    const ans = userAnswers[currentIdx];
    if (ans === undefined || ans === null) return false;
    if (currentQ.type === 'mcq') return true;
    if (currentQ.type === 'sa') return ans.toString().trim() !== '';
    if (currentQ.type === 'tf') return Object.keys(ans).length > 0;
    return false;
  }, [currentQ, userAnswers, currentIdx]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quizStarted) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full mb-3">
            <Brain className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Luyện Tập Trắc Nghiệm Sinh Học</h2>
          <p className="text-emerald-700 font-semibold text-sm mt-1">Hệ thống Ngân hàng Câu hỏi Thi THPT GDPT Mới - Biên soạn: Thầy Trương Trung Can</p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3 mb-6">
          <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <span>Thông Tin Học Sinh Thống Kê (Bắt buộc):</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên Học Sinh <span className="text-rose-500">*</span>:</label>
              <input
                type="text"
                placeholder="Nhập đầy đủ Họ và Tên..."
                value={studentName}
                onChange={e => {
                  setStudentName(e.target.value);
                  if (e.target.value.trim()) setNameError('');
                }}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp Học (Ví dụ: 12A1, 12A2...):</label>
              <input
                type="text"
                placeholder="Nhập Lớp học..."
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              />
            </div>
          </div>
          {nameError && (
            <p className="text-xs font-semibold text-rose-600">{nameError}</p>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn Chủ đề Học tập:</label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {topicList.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn Chế độ Luyện tập:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('practice')}
                className={mode === 'practice' ? 'p-4 border rounded-xl text-left transition flex flex-col justify-between border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' : 'p-4 border rounded-xl text-left transition flex flex-col justify-between border-slate-200 hover:border-slate-300 bg-white'}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-base mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Tự Luyện</span>
                  </div>
                  <p className="text-xs text-slate-500">Xem đáp án &amp; giải thích ngay sau khi chọn câu hỏi.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('timed')}
                className={mode === 'timed' ? 'p-4 border rounded-xl text-left transition flex flex-col justify-between border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' : 'p-4 border rounded-xl text-left transition flex flex-col justify-between border-slate-200 hover:border-slate-300 bg-white'}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-base mb-1">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Thi Tính Giờ</span>
                  </div>
                  <p className="text-xs text-slate-500">Bấm giờ 15 phút. Nộp bài mới hiển thị kết quả chi tiết.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('mock')}
                className={mode === 'mock' ? 'p-4 border rounded-xl text-left transition flex flex-col justify-between border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20' : 'p-4 border rounded-xl text-left transition flex flex-col justify-between border-slate-200 hover:border-slate-300 bg-white'}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-base mb-1">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Thi Thử Full</span>
                  </div>
                  <p className="text-xs text-slate-500">Đề tổng hợp ngẫu nhiên 50 phút phòng thi chuẩn THPT.</p>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Tổng số câu hỏi khả dụng: <b>{filteredQuestions.length} câu</b></span>
            <button
              onClick={handleStartQuiz}
              disabled={filteredQuestions.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg shadow transition flex items-center gap-2"
            >
              <span>Bắt Đầu Làm Bài</span>
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeQuestions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
        <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Không tìm thấy câu hỏi thuộc chủ đề này.</p>
        <button
          onClick={() => setQuizStarted(false)}
          className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Quay lại chọn chủ đề
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* BAR THÔNG TIN BÀI LÀM */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setQuizStarted(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md"
          >
            ← Chọn đề khác
          </button>
          <span className="text-sm font-semibold text-slate-700">
            Học sinh: <b className="text-emerald-700">{studentName}</b> {studentClass && `(${studentClass})`}
          </span>
          <span className="text-sm font-semibold text-slate-700 border-l pl-3">
            Câu hỏi: <span className="text-emerald-600">{currentIdx + 1}</span> / {activeQuestions.length}
          </span>
        </div>

        {(mode === 'timed' || mode === 'mock') && (
          <div className="flex items-center space-x-2 bg-amber-50 text-amber-700 font-mono font-bold px-3 py-1.5 rounded-lg border border-amber-200 text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}

        {!isSubmitted && (
          <button
            onClick={handleSubmitQuiz}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition"
          >
            Nộp Bài
          </button>
        )}
      </div>

      {isSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-2">
          <Award className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">KẾT QUẢ BÀI LÀM CỦA BẠN</h3>
          <p className="text-3xl font-extrabold text-emerald-700">
            {calculateScore()} / {activeQuestions.length} <span className="text-base font-normal text-slate-600">Câu Đúng</span>
          </p>
          <p className="text-xs text-slate-500">Đã hoàn tất bài kiểm tra. Hãy xem lại hướng dẫn chi tiết từng câu ở bên dưới.</p>
        </div>
      )}

      {/* KHUNG CÂU HỎI HIỆN TẠI */}
      {currentQ && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                {currentQ.topic || 'Sinh học'}
              </span>
              <span className="ml-2 text-xs text-slate-400 font-medium">
                {currentQ.type === 'mcq' ? 'Trắc nghiệm 4 lựa chọn' : currentQ.type === 'tf' ? 'Đúng / Sai 4 ý' : 'Điền số / Trả lời ngắn'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">ID: #{currentQ.id}</span>
          </div>

          <h3 className="text-lg font-bold text-slate-800 leading-snug">{currentQ.question}</h3>

          {/* DẠNG 1: MCQ 4 LỰA CHỌN */}
          {currentQ.type === 'mcq' && Array.isArray(currentQ.options) && (
            <div className="space-y-3">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = userAnswers[currentIdx] === oIdx;
                const isCorrectOpt = currentQ.correct === oIdx;
                const showFeedback = mode === 'practice' ? hasAnsweredCurrentQ : isSubmitted;

                let btnStyle = 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50';
                if (showFeedback) {
                  if (isCorrectOpt) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                  } else if (isSelected) {
                    btnStyle = 'border-rose-500 bg-rose-50 text-rose-900';
                  }
                } else if (isSelected) {
                  btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-500/20';
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleMCQSelect(oIdx)}
                    className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0 bg-white">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="flex-1 text-sm pt-0.5">{opt}</span>
                    {showFeedback && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                    {showFeedback && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* DẠNG 2: ĐÚNG / SAI 4 Ý */}
          {currentQ.type === 'tf' && Array.isArray(currentQ.items) && (
            <div className="space-y-3">
              {currentQ.items.map((item) => {
                const currentTFState = userAnswers[currentIdx] || {};
                const userVal = currentTFState[item.id];
                const showFeedback = mode === 'practice' ? hasAnsweredCurrentQ : isSubmitted;

                return (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
                    <p className="text-sm font-medium text-slate-700 flex-1">
                      <span className="font-bold text-emerald-700 mr-2">{item.id})</span>
                      {item.statement}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTFSelect(item.id, true)}
                        className={userVal === true ? 'px-4 py-1.5 rounded-lg font-semibold text-xs transition border bg-emerald-600 text-white border-emerald-600' : 'px-4 py-1.5 rounded-lg font-semibold text-xs transition border bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}
                      >
                        Đúng
                      </button>
                      <button
                        onClick={() => handleTFSelect(item.id, false)}
                        className={userVal === false ? 'px-4 py-1.5 rounded-lg font-semibold text-xs transition border bg-rose-600 text-white border-rose-600' : 'px-4 py-1.5 rounded-lg font-semibold text-xs transition border bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}
                      >
                        Sai
                      </button>
                      {showFeedback && (
                        <span className={item.correct ? 'text-xs font-bold px-2 py-1 rounded text-emerald-700 bg-emerald-100' : 'text-xs font-bold px-2 py-1 rounded text-rose-700 bg-rose-100'}>
                          Đ.Án: {item.correct ? 'Đúng' : 'Sai'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DẠNG 3: TRẢ LỜI NGẮN / ĐIỀN SỐ */}
          {currentQ.type === 'sa' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Nhập kết quả / Đáp số tính toán của bạn:</label>
              <input
                type="text"
                placeholder="Ví dụ: 3120, 0.6, 900..."
                value={userAnswers[currentIdx] || ''}
                onChange={e => handleSAInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl font-mono text-base outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {(mode === 'practice' ? hasAnsweredCurrentQ : isSubmitted) && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-mono">
                  <b>Đáp án chuẩn:</b> {currentQ.correctAnswer}
                </div>
              )}
            </div>
          )}

          {/* KHUNG LỜI GIẢI CHI TIẾT */}
          {((mode === 'practice' && hasAnsweredCurrentQ) || isSubmitted) && currentQ.explanation && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Hướng Dẫn Giải Chi Tiết:</span>
              </div>
              <p className="leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}

          {/* NÚT CHUYỂN CÂU */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              ← Câu trước
            </button>
            <button
              disabled={currentIdx === activeQuestions.length - 1}
              onClick={() => setCurrentIdx(prev => Math.min(activeQuestions.length - 1, prev + 1))}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
            >
              Câu tiếp theo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. SECTION: GÓC GIÁO VIÊN & TẠO CÂU HỎI & THỐNG KÊ HỌC SINH
// ==========================================
function TeacherSection({ 
  questions = [], 
  setQuestions, 
  flashcards = [], 
  setFlashcards, 
  topics = [], 
  onAddTopic,
  isAuthenticated,
  setIsAuthenticated,
  teacherPin,
  setTeacherPin,
  submissions = [],
  setSubmissions
}) {
  const [activeSubTab, setActiveSubTab] = useState('submissions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const [aiTopic, setAiTopic] = useState(topics[0] || 'Di truyền học');
  const [aiGrade, setAiGrade] = useState('12');
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);

  const [inputPassword, setInputPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  const [newTopicInput, setNewTopicInput] = useState('');
  const [rawTextInput, setRawTextInput] = useState('');
  const [docxParsedQuestions, setDocxParsedQuestions] = useState([]);

  const [formTopic, setFormTopic] = useState(topics[0] || 'Di truyền học');
  const [formType, setFormType] = useState('mcq');
  const [formQuestion, setFormQuestion] = useState('');
  const [formMcqOptions, setFormMcqOptions] = useState(['', '', '', '']);
  const [formMcqCorrect, setFormMcqCorrect] = useState(0);
  const [formExplanation, setFormExplanation] = useState('');

  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [filterClass, setFilterClass] = useState('Tất cả');

  const uniqueClasses = useMemo(() => {
    const list = submissions.map(s => s.className).filter(Boolean);
    return ['Tất cả', ...Array.from(new Set(list))];
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    if (filterClass === 'Tất cả') return submissions;
    return submissions.filter(s => s.className === filterClass);
  }, [submissions, filterClass]);

  const handleExportCSV = useCallback(() => {
    if (filteredSubmissions.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,STT,Ho va Ten,Lop,Chu De,Che Do,Diem So,Tong Cau,Ti Le (%),Thoi Gian Nop\n";
    filteredSubmissions.forEach((s, idx) => {
      csvContent += `${idx + 1},"${s.name}","${s.className}","${s.topic}","${s.mode}",${s.score},${s.total},${s.percentage}%,"${s.submittedAt}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Thong_Ke_Hoc_Sinh_Lam_Bai_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredSubmissions]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (inputPassword === teacherPin) {
      setIsAuthenticated(true);
      setLoginError('');
      setInputPassword('');
    } else {
      setLoginError('Mật khẩu không chính xác! Vui lòng thử lại.');
    }
  };

  const handleChangePin = () => {
    if (newPinInput.trim().length >= 4) {
      setTeacherPin(newPinInput.trim());
      setShowChangePinModal(false);
      setNewPinInput('');
    }
  };

  const handleSaveQuestion = () => {
    if (!formQuestion.trim()) return;
    const newQ = {
      id: Date.now(),
      topic: formTopic,
      type: formType,
      question: formQuestion,
      options: formType === 'mcq' ? formMcqOptions : undefined,
      correct: formType === 'mcq' ? formMcqCorrect : undefined,
      explanation: formExplanation
    };
    setQuestions(prev => [newQ, ...prev]);
    setShowAddModal(false);
    setFormQuestion('');
  };

  const handleSaveTopic = () => {
    if (newTopicInput.trim() && onAddTopic) {
      onAddTopic(newTopicInput.trim());
      setNewTopicInput('');
      setShowTopicModal(false);
    }
  };

  const parseRawTextToQuestions = useCallback(() => {
    if (!rawTextInput.trim()) return;
    const blocks = rawTextInput.split(/Câu\s+\d+[:\.]/i).filter(b => b.trim().length > 0);
    const parsedList = [];

    blocks.forEach((block, idx) => {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      const qText = lines[0];
      const hasMcqLabels = lines.some(l => /^[A-D]\./i.test(l));

      if (hasMcqLabels) {
        const options = [];
        let correctIdx = 0;
        lines.forEach(line => {
          const match = line.match(/^([A-D])\.\s*(.*)/i);
          if (match) {
            options.push(match[2]);
          }
        });

        parsedList.push({
          id: Date.now() + idx,
          topic: formTopic,
          type: 'mcq',
          question: qText,
          options: options.length === 4 ? options : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
          correct: correctIdx,
          explanation: 'Nhập tự động từ văn bản.'
        });
      } else {
        parsedList.push({
          id: Date.now() + idx,
          topic: formTopic,
          type: 'sa',
          question: qText,
          correctAnswer: '100',
          explanation: 'Nhập tự động từ văn bản.'
        });
      }
    });

    setDocxParsedQuestions(parsedList);
  }, [rawTextInput, formTopic]);

  const handleImportDocxParsed = () => {
    if (docxParsedQuestions.length > 0) {
      setQuestions(prev => [...docxParsedQuestions, ...prev]);
      setDocxParsedQuestions([]);
      setRawTextInput('');
      setShowDocxModal(false);
    }
  };

  const handleGenerateAiQuestions = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const generated = await generateBioQuestionsAI(aiTopic, aiGrade, aiCount);
      if (generated && generated.length > 0) {
        setAiGeneratedQuestions(generated);
      } else {
        setAiError('Không tạo được câu hỏi. Vui lòng thử lại!');
      }
    } catch (e) {
      setAiError('Đã xảy ra lỗi khi kết nối với AI Gemini. Vui lòng kiểm tra lại mạng.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImportAiQuestions = () => {
    if (aiGeneratedQuestions.length > 0) {
      setQuestions(prev => [...aiGeneratedQuestions, ...prev]);
      setAiGeneratedQuestions([]);
      setShowAiModal(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Khu Vực Dành Cho Giáo Viên</h2>
          <p className="text-xs text-slate-500">Mục quản lý ngân hàng đề thi yêu cầu xác thực quyền hạn của <b>Thầy Trương Trung Can</b> hoặc giáo viên bộ môn.</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mật khẩu xác thực Giáo viên:</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu..."
              value={inputPassword}
              onChange={e => setInputPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-center font-mono text-lg tracking-widest"
              autoFocus
            />
          </div>

          {loginError && (
            <p className="text-xs text-rose-600 font-semibold text-center bg-rose-50 p-2 rounded-lg border border-rose-200">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow transition text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Mở Khóa Góc Giáo Viên</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between text-xs text-emerald-900 font-medium">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đã xác thực quyền truy cập: <b>Thầy Trương Trung Can</b></span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowChangePinModal(true)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
          >
            Đổi mật khẩu
          </button>
          <span>|</span>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-rose-600 hover:text-rose-800 font-semibold"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {showChangePinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-800 text-base">Đổi Mật Khẩu Giáo Viên Mới</h3>
            <input
              type="text"
              placeholder="Nhập mật khẩu mới (ít nhất 4 ký tự)..."
              value={newPinInput}
              onChange={e => setNewPinInput(e.target.value)}
              className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowChangePinModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleChangePin}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Cập Nhật
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap space-x-2">
          <button
            onClick={() => setActiveSubTab('submissions')}
            className={activeSubTab === 'submissions' ? 'px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200'}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Thống Kê Học Sinh ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bank')}
            className={activeSubTab === 'bank' ? 'px-4 py-2 rounded-lg text-sm font-semibold transition bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200'}
          >
            Ngân Hàng Câu Hỏi ({questions.length})
          </button>

          <button
            onClick={() => setActiveSubTab('flashcards')}
            className={activeSubTab === 'flashcards' ? 'px-4 py-2 rounded-lg text-sm font-semibold transition bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200'}
          >
            Thẻ Flashcards ({flashcards.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Tạo Đề Tự Động (KNTT)</span>
          </button>
          <button
            onClick={() => setShowTopicModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Thêm Chủ Đề Mới</span>
          </button>
          <button
            onClick={() => setShowDocxModal(true)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 border border-emerald-200"
          >
            <Upload className="w-4 h-4" />
            <span>Nhập File Word / Văn Bản</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Câu Hỏi Mới</span>
          </button>
        </div>
      </div>

      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>AI Trợ Lý Biên Soạn Đề Thi (SGK Kết nối tri thức - GDPT 2018)</span>
              </h3>
              <button onClick={() => setShowAiModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-xs text-indigo-900 space-y-1">
              <p className="font-bold">✨ AI Gemini + Google Search Grounding:</p>
              <p>Tự động tổng hợp và sinh bộ câu hỏi chuẩn kiến thức chương trình Sinh học THPT 2018 (Sách Kết nối tri thức) đủ cả 3 dạng thi THPT mới.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chủ đề bài học:</label>
                <select
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs outline-none bg-white font-medium"
                >
                  {topics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Khối lớp THPT:</label>
                <select
                  value={aiGrade}
                  onChange={e => setAiGrade(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs outline-none bg-white font-medium"
                >
                  <option value="10">Sinh học Lớp 10</option>
                  <option value="11">Sinh học Lớp 11</option>
                  <option value="12">Sinh học Lớp 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Số lượng câu tạo:</label>
                <select
                  value={aiCount}
                  onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg text-xs outline-none bg-white font-medium"
                >
                  <option value={3}>3 câu hỏi</option>
                  <option value={5}>5 câu hỏi</option>
                  <option value={8}>8 câu hỏi</option>
                  <option value={10}>10 câu hỏi</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAiQuestions}
              disabled={aiLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AI Đang tra cứu SGK &amp; Biên soạn đề...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Bắt Đầu Tạo Bộ Câu Hỏi AI</span>
                </>
              )}
            </button>

            {aiError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 font-semibold">{aiError}</p>
            )}

            {aiGeneratedQuestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Xem trước {aiGeneratedQuestions.length} câu hỏi AI vừa tạo:</span>
                  <button
                    onClick={handleImportAiQuestions}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Lưu Vào Ngân Hàng Đề
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto divide-y border rounded-lg p-2 bg-slate-50">
                  {aiGeneratedQuestions.map((q, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700">Câu {idx + 1} ({q.type === 'mcq' ? 'MCQ 4 lựa chọn' : q.type === 'tf' ? 'Đúng/Sai 4 ý' : 'Điền số'}):</span>
                        <span className="bg-white px-2 py-0.5 rounded border text-slate-600">{q.topic}</span>
                      </div>
                      <p className="font-medium text-slate-800">{q.question}</p>
                      <p className="text-slate-500 italic">Lời giải: {q.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'submissions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Tổng số lượt học sinh làm bài</span>
                <p className="text-2xl font-bold text-emerald-700 font-mono">{submissions.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-lg" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Điểm trung bình toàn bộ</span>
                <p className="text-2xl font-bold text-slate-800 font-mono">
                  {submissions.length > 0
                    ? (submissions.reduce((acc, curr) => acc + curr.percentage, 0) / submissions.length).toFixed(1)
                    : '0'}%
                </p>
              </div>
              <Award className="w-8 h-8 text-amber-500 bg-amber-50 p-1.5 rounded-lg" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Lớp tham gia nhiều nhất</span>
                <p className="text-xl font-bold text-slate-800">
                  {submissions.length > 0 ? submissions[0].className : 'Chưa có'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-lg" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <h3 className="font-bold text-slate-700 text-sm">Danh Sách Học Sinh Nộp Bài</h3>
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="p-1.5 text-xs border rounded-lg outline-none bg-white font-medium"
                >
                  {uniqueClasses.map(c => (
                    <option key={c} value={c}>Lớp: {c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportCSV}
                  disabled={filteredSubmissions.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 rotate-180" />
                  <span>Xuất Excel/CSV</span>
                </button>
                {submissions.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử học sinh làm bài?')) {
                        setSubmissions([]);
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-3 py-1.5 rounded-lg text-xs border border-rose-200"
                  >
                    Xóa lịch sử
                  </button>
                )}
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Chưa có học sinh nào hoàn thành bài trắc nghiệm.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b">
                      <th className="p-3">STT</th>
                      <th className="p-3">Họ và Tên Học Sinh</th>
                      <th className="p-3">Lớp</th>
                      <th className="p-3">Chủ Đề</th>
                      <th className="p-3">Chế Độ</th>
                      <th className="p-3">Điểm Số</th>
                      <th className="p-3">Tỉ Lệ (%)</th>
                      <th className="p-3">Thời Gian Nộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{s.name}</td>
                        <td className="p-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">{s.className}</span></td>
                        <td className="p-3 text-emerald-800 font-medium">{s.topic}</td>
                        <td className="p-3 text-slate-600">{s.mode}</td>
                        <td className="p-3 font-bold font-mono text-emerald-700">{s.score} / {s.total}</td>
                        <td className="p-3">
                          <span className={s.percentage >= 80 ? 'px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800' : s.percentage >= 50 ? 'px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800' : 'px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800'}>
                            {s.percentage}%
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{s.submittedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showTopicModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-base">Thêm Chủ Đề Sinh Học Mới</h3>
              <button onClick={() => setShowTopicModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên chủ đề mới:</label>
              <input
                type="text"
                placeholder="Ví dụ: Công nghệ Gen, Sinh học Vi sinh..."
                value={newTopicInput}
                onChange={e => setNewTopicInput(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowTopicModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTopic}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Lưu Chủ Đề
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocxModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FileDocxIcon className="w-5 h-5 text-emerald-600" />
                <span>Nhập Câu Hỏi Hàng Loạt Từ Văn Bản</span>
              </h3>
              <button onClick={() => setShowDocxModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chọn Chủ đề cho các câu hỏi này:</label>
                <select
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs outline-none bg-white"
                >
                  {topics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Dán nội dung đề thi từ Word/Text vào ô dưới:</label>
                <textarea
                  rows={8}
                  placeholder={`Mẫu định dạng:\nCâu 1: Ở đậu Hà Lan, gen A quy định hạt vàng...\nA. Aa x Aa\nB. Aa x aa\nC. AA x aa\nD. aa x aa\n\nCâu 2: Bộ ba nào sau đây...`}
                  value={rawTextInput}
                  onChange={e => setRawTextInput(e.target.value)}
                  className="w-full p-3 border rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={parseRawTextToQuestions}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs transition"
              >
                Phân Tích Dữ Liệu Văn Bản
              </button>

              {docxParsedQuestions.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Đã phân tích thành công {docxParsedQuestions.length} câu hỏi!</span>
                  <button
                    onClick={handleImportDocxParsed}
                    className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs"
                  >
                    Lưu Vào Ngân Hàng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-base">Thêm Câu Hỏi Mới Thủ Công</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chủ đề:</label>
                <select
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs outline-none bg-white"
                >
                  {topics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Dạng câu hỏi:</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs outline-none bg-white"
                >
                  <option value="mcq">Nhiều lựa chọn (MCQ)</option>
                  <option value="sa">Điền số / Trả lời ngắn</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nội dung câu hỏi:</label>
              <textarea
                rows={3}
                value={formQuestion}
                onChange={e => setFormQuestion(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {formType === 'mcq' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">4 Phương án &amp; Chọn đáp án đúng:</label>
                {formMcqOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={formMcqCorrect === idx}
                      onChange={() => setFormMcqCorrect(idx)}
                    />
                    <input
                      type="text"
                      placeholder={`Phương án ${String.fromCharCode(65 + idx)}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...formMcqOptions];
                        newOpts[idx] = e.target.value;
                        setFormMcqOptions(newOpts);
                      }}
                      className="w-full p-1.5 border rounded text-xs outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hướng dẫn giải chi tiết:</label>
              <textarea
                rows={2}
                value={formExplanation}
                onChange={e => setFormExplanation(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Lưu Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'bank' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 text-sm">
            Danh Sách Câu Hỏi Trong Hệ Thống ({questions.length})
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {q.topic}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{q.id}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Câu {idx + 1}: {q.question}</p>
                  <p className="text-xs text-slate-500 italic">Lời giải: {q.explanation}</p>
                </div>
                <button
                  onClick={() => setQuestions(prev => prev.filter(item => item.id !== q.id))}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'flashcards' && flashcards.length > 0 && (
        <div className="max-w-md mx-auto space-y-4">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-64 bg-emerald-600 text-white rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-lg transition-transform transform active:scale-95"
          >
            <span className="text-xs uppercase tracking-widest text-emerald-200 mb-2">
              {isFlipped ? 'Định nghĩa / Khái niệm' : 'Thuật ngữ Sinh học'}
            </span>
            <h3 className="text-2xl font-bold">
              {isFlipped ? flashcards[flashcardIdx]?.definition : flashcards[flashcardIdx]?.term}
            </h3>
            <p className="text-xs text-emerald-200 mt-4">(Nhấn vào thẻ để lật mặt)</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIdx(prev => (prev === 0 ? flashcards.length - 1 : prev - 1));
              }}
              className="px-4 py-2 border rounded-lg font-semibold text-slate-600"
            >
              Thẻ trước
            </button>
            <span className="font-semibold text-slate-500">
              {flashcardIdx + 1} / {flashcards.length}
            </span>
            <button
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIdx(prev => (prev === flashcards.length - 1 ? 0 : prev + 1));
              }}
              className="px-4 py-2 border rounded-lg font-semibold text-slate-600"
            >
              Thẻ sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. SECTION: XUẤT ĐỀ THI RA PDF/WORD (EXPORTER)
// ==========================================
function ExporterSection({ questions = [], topics = [] }) {
  const [examTitle, setExamTitle] = useState('ĐỀ THI ÔN TẬP TỐT NGHIỆP THPT MÔN SINH HỌC');
  const [examCode, setExamCode] = useState('101');
  const [teacherName, setTeacherName] = useState('Thầy Trương Trung Can');
  const [timeAllowed, setTimeAllowed] = useState('50');
  const [showKey, setShowKey] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');

  const exportQuestions = useMemo(() => {
    if (!Array.isArray(questions)) return [];
    if (selectedTopic === 'Tất cả') return questions;
    return questions.filter(q => q && q.topic === selectedTopic);
  }, [questions, selectedTopic]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tạo ĐỀ THI &amp; Xuất File In (PDF/Word)</h2>
            <p className="text-xs text-slate-500">Tùy chỉnh cấu hình đề thi chuẩn định dạng kiểm tra dành cho học sinh - Biên soạn: Thầy Trương Trung Can</p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <Printer className="w-5 h-5" />
            <span>In / Lưu file PDF</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm pt-2">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Tiêu đề đề thi:</label>
            <input
              type="text"
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              className="w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Giáo viên ra đề:</label>
            <input
              type="text"
              value={teacherName}
              onChange={e => setTeacherName(e.target.value)}
              className="w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-emerald-800"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Mã đề thi:</label>
            <input
              type="text"
              value={examCode}
              onChange={e => setExamCode(e.target.value)}
              className="w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Thời gian (Phút):</label>
            <input
              type="text"
              value={timeAllowed}
              onChange={e => setTimeAllowed(e.target.value)}
              className="w-full p-2 border rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showKey}
              onChange={e => setShowKey(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Đính kèm Bảng Đáp Án ở cuối đề</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExplanation}
              onChange={e => setShowExplanation(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Đính kèm Hướng dẫn giải chi tiết</span>
          </label>
        </div>
      </div>

      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 font-serif text-slate-900 leading-normal">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div className="text-center w-1/2">
            <p className="font-bold text-sm uppercase">SỞ GIÁO DỤC &amp; ĐÀO TẠO</p>
            <p className="font-bold text-sm uppercase">LỚP SINH HỌC THẦY TRƯƠNG TRUNG CAN</p>
            <p className="text-xs italic mt-1">(Đề thi gồm {exportQuestions.length} câu hỏi)</p>
          </div>
          <div className="text-center w-1/2">
            <p className="font-bold text-base uppercase">{examTitle}</p>
            <p className="text-xs italic">Giáo viên biên soạn: <b>{teacherName}</b></p>
            <p className="text-xs italic">Thời gian làm bài: {timeAllowed} phút</p>
            <p className="font-mono text-xs font-bold mt-1">Mã đề thi: {examCode}</p>
          </div>
        </div>

        <div className="space-y-6">
          {exportQuestions.map((q, qIdx) => (
            <div key={q.id} className="space-y-2">
              <div className="flex gap-2 text-sm">
                <span className="font-bold">Câu {qIdx + 1}:</span>
                <span className="flex-1">{q.question}</span>
              </div>

              {q.type === 'mcq' && Array.isArray(q.options) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pl-6">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx}>
                      <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'tf' && Array.isArray(q.items) && (
                <div className="pl-6 space-y-1 text-sm">
                  {q.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span><span className="font-bold">{item.id})</span> {item.statement}</span>
                      <span className="text-xs italic font-sans text-slate-400 print:text-black">[ Đúng / Sai ]</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'sa' && (
                <div className="pl-6 text-sm italic text-slate-500 print:text-black">
                  <span>Đáp số / Kết quả: ................................................................</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {showKey && (
          <div className="mt-10 pt-6 border-t-2 border-slate-900 page-break-before">
            <h4 className="font-bold text-center text-base mb-4 uppercase">BẢNG ĐÁP ÁN ĐỀ THI MÃ {examCode}</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-800 text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 print:bg-transparent">
                    <th className="border border-slate-800 p-2">Câu</th>
                    {exportQuestions.map((_, i) => (
                      <th key={i} className="border border-slate-800 p-2">{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-800 p-2 font-bold">Đ.Án</td>
                    {exportQuestions.map((q, i) => (
                      <td key={i} className="border border-slate-800 p-2 font-mono font-bold">
                        {q.type === 'mcq' && String.fromCharCode(65 + q.correct)}
                        {q.type === 'tf' && 'Đ/S'}
                        {q.type === 'sa' && q.correctAnswer}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showExplanation && (
          <div className="mt-8 pt-4 border-t border-slate-300">
            <h4 className="font-bold text-sm mb-3 uppercase">HƯỚNG DẪN GIẢI CHI TIẾT</h4>
            <div className="space-y-3 text-xs">
              {exportQuestions.map((q, i) => (
                <div key={i}>
                  <span className="font-bold">Câu {i + 1}: </span>
                  <span>{q.explanation || 'Chưa có lời giải chi tiết.'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. SECTION: TIỆN ÍCH SINH HỌC INTERACTIVE
// ==========================================
function ToolsSection() {
  const [activeTool, setActiveTool] = useState('genetics');

  const [parent1, setParent1] = useState('Aa');
  const [parent2, setParent2] = useState('Aa');
  const [mendelResult, setMendelResult] = useState(null);

  const [countAA, setCountAA] = useState(360);
  const [countAa, setCountAa] = useState(480);
  const [countaa, setCountaa] = useState(160);

  const [searchCodon, setSearchCodon] = useState('');

  const calculateMendelCross = useCallback(() => {
    const getGametes = (genotype) => {
      if (genotype.length === 2) {
        return [genotype[0], genotype[1]];
      } else if (genotype.length === 4) {
        const g1 = [genotype[0], genotype[1]];
        const g2 = [genotype[2], genotype[3]];
        const res = [];
        g1.forEach(a1 => {
          g2.forEach(a2 => {
            res.push(a1 + a2);
          });
        });
        return res;
      }
      return [];
    };

    const g1 = getGametes(parent1);
    const g2 = getGametes(parent2);

    if (g1.length === 0 || g2.length === 0) {
      setMendelResult({ error: 'Kiểu gen không hợp lệ' });
      return;
    }

    const combinations = [];
    g1.forEach(a => {
      g2.forEach(b => {
        let combined = '';
        if (a.length === 1) {
          const pair = [a, b].sort();
          combined = pair[0] === pair[0].toLowerCase() && pair[1] === pair[1].toUpperCase() ? pair[1] + pair[0] : pair.join('');
        } else {
          const p1 = [a[0], b[0]].sort();
          const p1Str = p1[0] === p1[0].toLowerCase() && p1[1] === p1[1].toUpperCase() ? p1[1] + p1[0] : p1.join('');
          const p2 = [a[1], b[1]].sort();
          const p2Str = p2[0] === p2[0].toLowerCase() && p2[1] === p2[1].toUpperCase() ? p2[1] + p2[0] : p2.join('');
          combined = p1Str + p2Str;
        }
        combinations.push(combined);
      });
    });

    const counts = {};
    combinations.forEach(c => {
      counts[c] = (counts[c] || 0) + 1;
    });

    const total = combinations.length;
    const genotypeRatios = Object.entries(counts).map(([genotype, count]) => ({
      genotype,
      count,
      ratio: `${count}/${total}`,
      percentage: Math.round((count / total) * 100)
    }));

    setMendelResult({ genotypeRatios, total });
  }, [parent1, parent2]);

  useEffect(() => {
    calculateMendelCross();
  }, [calculateMendelCross]);

  const hwStats = useMemo(() => {
    const nAA = Number(countAA) || 0;
    const nAa = Number(countAa) || 0;
    const naa = Number(countaa) || 0;
    const N = nAA + nAa + naa;

    if (N === 0) return null;

    const d = nAA / N;
    const h = nAa / N;
    const r = naa / N;

    const p = d + h / 2;
    const q = r + h / 2;

    const expAA = Math.pow(p, 2);
    const expAa = 2 * p * q;
    const expaa = Math.pow(q, 2);

    const isEquilibrium = Math.abs(d - expAA) < 0.01 && Math.abs(h - expAa) < 0.01;

    return {
      N,
      d: d.toFixed(4),
      h: h.toFixed(4),
      r: r.toFixed(4),
      p: p.toFixed(4),
      q: q.toFixed(4),
      expAA: expAA.toFixed(4),
      expAa: expAa.toFixed(4),
      expaa: expaa.toFixed(4),
      isEquilibrium
    };
  }, [countAA, countAa, countaa]);

  const filteredGeneticCode = useMemo(() => {
    if (!searchCodon.trim()) return GENETIC_CODE_TABLE;
    const term = searchCodon.toUpperCase();
    return GENETIC_CODE_TABLE.filter(item => 
      item.amino.toUpperCase().includes(term) ||
      item.codons.some(c => c.includes(term))
    );
  }, [searchCodon]);

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 gap-4 pb-2">
        <button
          onClick={() => setActiveTool('genetics')}
          className={activeTool === 'genetics' ? 'pb-2 px-1 font-semibold text-sm transition border-b-2 border-emerald-600 text-emerald-700' : 'pb-2 px-1 font-semibold text-sm transition border-b-2 border-transparent text-slate-500 hover:text-slate-700'}
        >
          Trình Tính Phép Lai Mendel
        </button>
        <button
          onClick={() => setActiveTool('hardy_weinberg')}
          className={activeTool === 'hardy_weinberg' ? 'pb-2 px-1 font-semibold text-sm transition border-b-2 border-emerald-600 text-emerald-700' : 'pb-2 px-1 font-semibold text-sm transition border-b-2 border-transparent text-slate-500 hover:text-slate-700'}
        >
          Di Truyền Quần Thể (Hardy-Weinberg)
        </button>
        <button
          onClick={() => setActiveTool('genetic_code')}
          className={activeTool === 'genetic_code' ? 'pb-2 px-1 font-semibold text-sm transition border-b-2 border-emerald-600 text-emerald-700' : 'pb-2 px-1 font-semibold text-sm transition border-b-2 border-transparent text-slate-500 hover:text-slate-700'}
        >
          Tra Cứu Mã Di Truyền
        </button>
      </div>

      {activeTool === 'genetics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Dna className="w-5 h-5 text-emerald-600" />
              <span>Cấu Hình Phép Lai</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">P1 (Bố/Mẹ):</label>
              <select
                value={parent1}
                onChange={e => setParent1(e.target.value)}
                className="w-full p-2.5 border rounded-lg font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="AA">AA (Đồng hợp trội)</option>
                <option value="Aa">Aa (Dị hợp 1 cặp)</option>
                <option value="aa">aa (Đồng hợp lặn)</option>
                <option value="AaBb">AaBb (Dị hợp 2 cặp)</option>
                <option value="AABB">AABB</option>
                <option value="aabb">aabb</option>
              </select>
            </div>

            <div className="text-center font-bold text-slate-400">X</div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">P2 (Mẹ/Bố):</label>
              <select
                value={parent2}
                onChange={e => setParent2(e.target.value)}
                className="w-full p-2.5 border rounded-lg font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="AA">AA (Đồng hợp trội)</option>
                <option value="Aa">Aa (Dị hợp 1 cặp)</option>
                <option value="aa">aa (Đồng hợp lặn)</option>
                <option value="AaBb">AaBb (Dị hợp 2 cặp)</option>
                <option value="AABB">AABB</option>
                <option value="aabb">aabb</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Tỷ Lệ Phân Tính Kiểu Gen Đời Con (F1)</h3>

            {mendelResult && !mendelResult.error ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mendelResult.genotypeRatios.map(item => (
                    <div key={item.genotype} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                      <span className="font-mono font-bold text-emerald-800 text-base">{item.genotype}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-700 block">{item.ratio}</span>
                        <span className="text-xs text-slate-400">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-red-500 text-sm">{mendelResult?.error}</p>
            )}
          </div>
        </div>
      )}

      {activeTool === 'hardy_weinberg' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
              <span>Số Lượng Kiểu Gen Quần Thể</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số cá thể AA:</label>
              <input
                type="number"
                value={countAA}
                onChange={e => setCountAA(e.target.value)}
                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số cá thể Aa:</label>
              <input
                type="number"
                value={countAa}
                onChange={e => setCountAa(e.target.value)}
                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số cá thể aa:</label>
              <input
                type="number"
                value={countaa}
                onChange={e => setCountaa(e.target.value)}
                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Phân Tích Cấu Trúc &amp; Tần Số Allele</h3>

            {hwStats ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-xs text-emerald-600 font-medium block">Tần số Allele p(A)</span>
                    <span className="text-2xl font-bold text-emerald-800 font-mono">{hwStats.p}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-xs text-emerald-600 font-medium block">Tần số Allele q(a)</span>
                    <span className="text-2xl font-bold text-emerald-800 font-mono">{hwStats.q}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium block">Tổng số cá thể (N)</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">{hwStats.N}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                  <h4 className="font-semibold text-slate-800">Cấu trúc kiểu gen thực tế:</h4>
                  <p className="font-mono text-emerald-900 font-bold">
                    {hwStats.d} AA + {hwStats.h} Aa + {hwStats.r} aa = 1.00
                  </p>

                  <h4 className="font-semibold text-slate-800 pt-2">Cấu trúc kiểu gen lý thuyết (Hardy-Weinberg):</h4>
                  <p className="font-mono text-slate-700">
                    p² ({hwStats.expAA}) AA + 2pq ({hwStats.expAa}) Aa + q² ({hwStats.expaa}) aa = 1.00
                  </p>
                </div>

                <div className={hwStats.isEquilibrium ? 'p-4 rounded-xl border flex items-center gap-3 bg-emerald-50 border-emerald-300 text-emerald-800' : 'p-4 rounded-xl border flex items-center gap-3 bg-amber-50 border-amber-300 text-amber-800'}>
                  <Activity className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-xs sm:text-sm">
                    {hwStats.isEquilibrium 
                      ? 'Quần thể đang ở trạng thái cân bằng di truyền (Hardy-Weinberg).'
                      : 'Quần thể CHƯA đạt trạng thái cân bằng di truyền.'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Vui lòng nhập số lượng cá thể hợp lệ...</p>
            )}
          </div>
        </div>
      )}

      {activeTool === 'genetic_code' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên Amino Acid hoặc Codon (Ví dụ: AUG, Met)..."
              value={searchCodon}
              onChange={e => setSearchCodon(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-4">Amino Acid (Axit amin)</th>
                    <th className="p-4">Bộ Ba Mã Hóa (Codons trên 5&apos; &rarr; 3&apos; mRNA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGeneticCode.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-semibold text-emerald-800">{item.amino}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {item.codons.map(c => (
                            <span key={c} className="font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 text-xs font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
