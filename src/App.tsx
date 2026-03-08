import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { addDays, isBefore, parseISO, differenceInDays, isSameWeek } from 'date-fns';
import { 
  ClipboardList, 
  Users, 
  Trophy, 
  BookOpen, 
  Database as DbIcon,
  Search,
  Plus,
  ChevronRight,
  Phone,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  UserPlus,
  Filter,
  Check,
  Bell,
  Edit2,
  Trash2
} from 'lucide-react';
import { cn, generateId } from './lib/utils';
import { RiskLevel, type Household, type VisitRecord, type CreditRecord, type Note } from './types';
import * as XLSX from 'xlsx';
import { storage } from './services/storage';
import ExcelJS from 'exceljs';

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
  const file = e.target.files?.[0];
  console.log("Image upload triggered:", file?.name);
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log("Image loaded as base64");
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};

// --- Components ---

const TabButton = ({ active, icon: Icon, label, onClick, center }: { active: boolean, icon: any, label: string, onClick: () => void, center?: boolean }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative",
      center ? (active ? "text-white" : "text-white/80") : (active ? "text-primary" : "text-slate-400")
    )}
  >
    <div className={cn(
      "transition-transform", 
      active && "scale-110",
      center && "bg-primary p-3 rounded-2xl shadow-lg shadow-primary/40 -mt-8 mb-1"
    )}>
      <Icon size={center ? 24 : 22} className={cn(active && !center && "fill-primary/10")} />
    </div>
    <span className={cn("text-[10px] font-bold tracking-wider", center ? "mt-0" : "mt-1")}>{label}</span>
    {active && !center && (
      <motion.div 
        layoutId="activeTab"
        className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
      />
    )}
  </button>
);

const Badge = ({ level }: { level: RiskLevel }) => {
  const configs: Record<string, { color: string, label: string }> = {
    [RiskLevel.RED]: { color: "bg-primary text-white border-primary/20", label: "红" },
    [RiskLevel.YELLOW]: { color: "bg-amber-500 text-white border-amber-600/20", label: "黄" },
    [RiskLevel.GREEN]: { color: "bg-emerald-600 text-white border-emerald-700/20", label: "绿" },
  };
  
  const safeLevel = String(level || "").toUpperCase().trim();
  const config = configs[safeLevel] || configs[RiskLevel.GREEN];
  
  return (
    <span className={cn("w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black border shadow-sm", config.color)}>
      {config.label}
    </span>
  );
};

interface SkillBadgeProps {
  skill: string;
}

const SkillBadge: React.FC<SkillBadgeProps> = ({ skill }) => (
  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold border border-slate-200">
    {skill}
  </span>
);

// --- Views ---

const TodoView = ({ onVisit, onExtraVisit, settings, onUpdateSetting }: { onVisit: (h: Household) => void, onExtraVisit: () => void, settings: any, onUpdateSetting: (key: string, value: string) => void }) => {
  const [todos, setTodos] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);
  const [isEditingVillage, setIsEditingVillage] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  useEffect(() => {
    const todoData = storage.getTodo();
    setTodos(todoData);
    setLoading(false);
  }, []);

  const itemsPerPage = 3;
  const currentTodos = todos.slice(dayOffset * itemsPerPage, (dayOffset + 1) * itemsPerPage);
  const hasNext = (dayOffset + 1) * itemsPerPage < todos.length;
  const hasPrev = dayOffset > 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const weekStr = today.toLocaleDateString('zh-CN', { weekday: 'long' });

  return (
    <div className="p-0 space-y-0">
      {/* Top Bar */}
      <div className="px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-serif font-bold text-lg">串</div>
          <span className="text-xl font-serif font-bold text-slate-900">串门宝</span>
        </div>
        <button 
          onClick={onExtraVisit}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="px-6 pt-1 pb-4">
        {/* Red Hero Card */}
        <div className="bg-primary rounded-[2rem] p-6 text-white relative overflow-hidden shadow-2xl shadow-primary/30">
          <div className="absolute right-4 top-4 opacity-10">
            <ClipboardList size={80} />
          </div>
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium opacity-80">{dateStr} {weekStr}</div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] opacity-80">你好，</span>
                {isEditingUser ? (
                  <input 
                    autoFocus
                    className="bg-white/20 border-none rounded px-1 text-[10px] font-bold w-20 focus:outline-none"
                    value={settings.user_name}
                    onChange={e => onUpdateSetting('user_name', e.target.value)}
                    onBlur={() => setIsEditingUser(false)}
                    onKeyDown={e => e.key === 'Enter' && setIsEditingUser(false)}
                  />
                ) : (
                  <span 
                    onClick={() => setIsEditingUser(true)}
                    className="text-[10px] font-bold border-b border-white/30 cursor-pointer"
                  >
                    {settings.user_name || '李姐'}
                  </span>
                )}
              </div>
            </div>

            {isEditingVillage ? (
              <input 
                autoFocus
                className="bg-white/20 border-none rounded px-2 py-1 text-xl font-serif font-bold w-full focus:outline-none"
                value={settings.village_name}
                onChange={e => onUpdateSetting('village_name', e.target.value)}
                onBlur={() => setIsEditingVillage(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingVillage(false)}
              />
            ) : (
              <div 
                onClick={() => setIsEditingVillage(true)}
                className="text-xl font-serif font-bold tracking-tight border-b border-white/30 inline-block cursor-pointer"
              >
                {settings.village_name || '科右前旗-红峰村'}
              </div>
            )}
            
            <div className="flex items-end justify-between pt-1">
              <div className="space-y-1">
                <div className="text-[10px] opacity-80">本周必访任务</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-bold">{todos.length}</span>
                  <span className="text-xs opacity-80 font-bold">户</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
            本周必访
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                disabled={!hasPrev}
                onClick={() => setDayOffset(dayOffset - 1)}
                className={cn("p-1 rounded-lg transition-colors", hasPrev ? "text-slate-900 bg-slate-100" : "text-slate-200")}
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {dayOffset + 1}
              </span>
              <button 
                disabled={!hasNext}
                onClick={() => setDayOffset(dayOffset + 1)}
                className={cn("p-1 rounded-lg transition-colors", hasNext ? "text-slate-900 bg-slate-100" : "text-slate-200")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">加载中...</p>
          </div>
        ) : currentTodos.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
            <ClipboardList size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">该时段暂无走访任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTodos.map((h, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={h.id} 
                onClick={() => onVisit(h)}
                className="group relative overflow-hidden bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/40 border border-slate-100 flex items-center justify-between transition-all hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-serif font-bold shadow-md",
                    h.riskLevel === RiskLevel.RED ? "bg-primary shadow-primary/20" : h.riskLevel === RiskLevel.YELLOW ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-600 shadow-emerald-600/20"
                  )}>
                    {h.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-base text-slate-900">{h.name}</span>
                      <Badge level={h.riskLevel} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-1">
                        <AlertCircle size={9} />
                        关注原因：{h.riskReason || "无"}
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md active:bg-primary transition-colors"
                >
                  <ChevronRight size={18} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AVAILABLE_SKILLS = ["草编", "粘豆包", "扭扭棒", "剪纸", "刺绣", "养殖", "种植"];

const LedgerView = ({ households, onSelect }: { households: Household[], onSelect: (h: Household) => void }) => {
  const [search, setSearch] = useState("");

  let filtered: Household[] = [];
  try {
    const safeHouseholds = Array.isArray(households) ? households : [];
    filtered = safeHouseholds.filter(h => {
      if (!h || typeof h !== 'object') return false;
      
      const searchLower = (search || "").toLowerCase();
      const name = String(h.name || "未命名").toLowerCase();
      const riskLevel = String(h.riskLevel || "GREEN").toLowerCase();
      const riskReason = String(h.riskReason || "无").toLowerCase();
      
      // Extremely safe skills check
      let skillsArr: string[] = [];
      if (Array.isArray(h.skills)) {
        skillsArr = h.skills;
      } else if (typeof h.skills === 'string') {
        skillsArr = (h.skills as string).split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const matchesSkills = skillsArr.some(s => {
        if (!s) return false;
        return String(s).toLowerCase().includes(searchLower);
      });
      
      return name.includes(searchLower) || 
             riskLevel.includes(searchLower) || 
             riskReason.includes(searchLower) || 
             matchesSkills;
    }).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  } catch (err) {
    console.error("LedgerView filter fatal error:", err);
    filtered = [];
  }

  return (
    <div className="p-0 space-y-0">
      <div className="p-6 bg-white border-b border-slate-100 sticky top-0 z-20 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold">邻里册</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜索姓名、技能或标签..." 
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 text-sm font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white">
        {filtered.map((h, i) => {
          const nameStr = String(h.name || "未命名");
          const firstChar = nameStr[0] || "?";
          const prevChar = i > 0 ? String(filtered[i - 1].name || "")[0] : null;
          const showHeader = firstChar !== prevChar;

          return (
            <div key={h.id}>
              {showHeader && (
                <div className="px-6 py-2 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-y border-slate-100">
                  {firstChar}
                </div>
              )}
              <div 
                onClick={() => onSelect(h)}
                className="px-6 py-4 flex items-center justify-between active:bg-slate-50 transition-colors border-b border-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-serif font-bold",
                    h.riskLevel === RiskLevel.RED ? "bg-primary" : h.riskLevel === RiskLevel.YELLOW ? "bg-amber-500" : "bg-emerald-600"
                  )}>
                    {firstChar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{nameStr}</span>
                      <Badge level={h.riskLevel} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {h.riskReason && h.riskReason !== "无" && (
                        <span className="px-2 py-0.5 bg-primary/5 text-primary rounded-md text-[9px] font-bold border border-primary/10">
                          {h.riskReason}
                        </span>
                      )}
                      {(Array.isArray(h.skills) ? h.skills : []).map(s => s && <SkillBadge key={s} skill={s} />)}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-200" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NoteItem: React.FC<{ note: Note, onEdit: (n: Note) => void, onDelete: (id: string) => void | Promise<void> }> = ({ note, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-50 group">
      {/* Background Actions (Revealed on Swipe Left) */}
      <div className="absolute inset-y-0 right-0 flex z-0">
        <button 
          onClick={() => {
            console.log('Frontend: Edit clicked', note.id);
            onEdit(note);
            setIsOpen(false);
          }}
          className="w-20 h-full bg-primary text-white flex flex-col items-center justify-center gap-1 active:bg-primary/90 transition-colors"
        >
          <Edit2 size={16} />
          <span className="text-[8px] font-black uppercase tracking-widest">编辑</span>
        </button>
        <button 
          onClick={() => {
            console.log('Frontend: Delete clicked', note.id);
            onDelete(note.id);
            setIsOpen(false);
          }}
          className="w-20 h-full bg-red-500 text-white flex flex-col items-center justify-center gap-1 active:bg-red-600 transition-colors"
        >
          <Trash2 size={16} />
          <span className="text-[8px] font-black uppercase tracking-widest">删除</span>
        </button>
      </div>

      {/* Foreground Content (Draggable) */}
      <motion.div 
        drag="x"
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          // If dragged left more than 40px, or velocity is high, snap open
          if (info.offset.x < -40 || info.velocity.x < -500) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        animate={{ x: isOpen ? -160 : 0 }}
        className="bg-white p-5 border border-slate-50 shadow-sm space-y-3 relative z-10 touch-pan-y cursor-grab active:cursor-grabbing"
      >
        <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{note.content}</p>
        <div className="flex items-center justify-between">
          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
            {new Date(note.createdAt).toLocaleString()}
          </div>
          {/* Desktop/Mobile Hint */}
          <div className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">
            {isOpen ? '向右滑动关闭' : '向左滑动操作'}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const NotesView = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const fetchNotes = () => {
    setNotes(storage.getNotes());
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    if (editingNote) {
      storage.updateNote(editingNote.id, newNote);
      setEditingNote(null);
    } else {
      const note = {
        id: generateId(),
        content: newNote,
        createdAt: new Date().toISOString()
      };
      storage.addNote(note);
    }
    setNewNote("");
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条记录吗？')) return;
    storage.deleteNote(id);
    fetchNotes();
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setNewNote(note.content);
  };

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-serif font-bold">民情记事本</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">记录村务细节与民情诉求</p>
      </header>

      <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-slate-100 space-y-4">
        <textarea 
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="输入需要注意的相关事项..."
          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none h-32 text-sm font-medium"
        />
        <div className="flex gap-2">
          <button 
            onClick={handleAddNote}
            className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            {editingNote ? '保存修改' : '保存记录'}
          </button>
          {editingNote && (
            <button 
              onClick={() => { setEditingNote(null); setNewNote(""); }}
              className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              取消
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-300 text-xs font-bold uppercase tracking-widest">加载中...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-slate-300 text-xs font-bold uppercase tracking-widest">暂无记录</div>
        ) : (
          notes.map(note => (
            <NoteItem 
              key={note.id} 
              note={note} 
              onEdit={startEdit} 
              onDelete={handleDelete} 
            />
          ))
        )}
      </div>
    </div>
  );
};

const CreditsView = ({ households, onRefresh }: { households: Household[], onRefresh: () => void }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subPage, setSubPage] = useState<'main' | 'issue'>('main');

  // Form State for Issuance
  const [issuance, setIssuance] = useState({
    householdId: "",
    category: "环境卫生",
    description: "",
    points: 2,
    search: "",
    image: ""
  });

  const fetchData = async () => {
    setLoading(true);
    setHistory(storage.getCreditsHistory());
    setSummary(storage.getCreditsSummary());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssue = async () => {
    if (!issuance.householdId) return alert("请选择村民");
    const h = households.find(h => String(h.id) === String(issuance.householdId));
    const record = {
      id: generateId(),
      householdId: issuance.householdId,
      householdName: h ? h.name : "未知",
      type: issuance.points >= 0 ? 'EARN' : 'SPEND',
      category: issuance.category,
      points: Math.abs(issuance.points),
      description: issuance.description || issuance.category,
      evidenceImage: issuance.image,
      createdAt: new Date().toISOString()
    };
    storage.addCredit(record as CreditRecord);
    setIssuance({ ...issuance, householdId: "", search: "", image: "", description: "" });
    setSubPage('main');
    fetchData();
  };

  const filteredIssuance = (Array.isArray(households) ? households : []).filter(h => 
    h && String(h.name || "").includes(issuance.search)
  );

  if (subPage === 'issue') {
    return (
      <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-6 space-y-8">
        <header className="flex items-center gap-4">
          <button onClick={() => setSubPage('main')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Plus size={20} className="rotate-45" />
          </button>
          <h1 className="text-2xl font-serif font-bold">积分发放</h1>
        </header>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">第一步：选择村民</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="输入姓名搜索..." 
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none"
                  value={issuance.search}
                  onChange={e => setIssuance({...issuance, search: e.target.value})}
                />
              </div>
              {issuance.search && (
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-sm divide-y divide-slate-50">
                  {filteredIssuance.map(h => (
                    <button 
                      key={h.id} 
                      onClick={() => setIssuance({...issuance, householdId: h.id, search: h.name})}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm font-bold flex items-center justify-between",
                        issuance.householdId === h.id ? "bg-primary/5 text-primary" : "text-slate-600"
                      )}
                    >
                      {h.name}
                      {issuance.householdId === h.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">第二步：选择类型</label>
              <div className="grid grid-cols-3 gap-2">
                {['环境卫生', '志愿服务', '好人好事'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setIssuance({...issuance, category: t})}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      issuance.category === t ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-500 border-slate-100"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">第三步：具体说明</label>
              <textarea 
                placeholder="叙述具体事由..." 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none h-24"
                value={issuance.description}
                onChange={e => setIssuance({...issuance, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">第四步：填写分值</label>
              <div className="flex flex-wrap gap-2">
                {[-5, -2, -1, 1, 2, 5, 10].map(v => (
                  <button 
                    key={v}
                    onClick={() => setIssuance({...issuance, points: v})}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black border transition-all",
                      issuance.points === v ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-400 border-slate-100"
                    )}
                  >
                    {v > 0 ? `+${v}` : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">第五步：拍照上传 (可选)</label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="credit-image-upload"
                  onChange={(e) => handleImageUpload(e, (base64) => setIssuance({...issuance, image: base64}))}
                />
                <label 
                  htmlFor="credit-image-upload"
                  className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer active:bg-slate-100 transition-colors overflow-hidden"
                >
                  {issuance.image ? (
                    <img src={issuance.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={24} />
                      <span className="text-[9px] font-black uppercase tracking-widest">点击拍照留存凭证</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button 
              onClick={handleIssue}
              className="w-full py-5 bg-primary text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 active:scale-95 transition-transform"
            >
              确认发放
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-6 space-y-10 pb-12">
      <header>
        <h1 className="text-2xl font-serif font-bold">积分治理</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">德治积分 · 物质奖励</p>
      </header>

      {/* 一级页面：功能入口卡片 */}
      <div className="grid grid-cols-1 gap-6">
        <button 
          onClick={() => setSubPage('issue')}
          className="group relative overflow-hidden bg-primary rounded-[2.5rem] p-8 text-white text-left shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Plus size={28} />
              </div>
              <h2 className="text-2xl font-serif font-bold">积分发放</h2>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">记录善举 · 激励文明</p>
            </div>
            <ChevronRight size={32} className="text-white/30" />
          </div>
        </button>
      </div>

      {/* 操作记录 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-serif font-bold text-slate-900">最近动态</h2>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">最近 50 条</span>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? (
              <div className="p-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">暂无操作记录</div>
            ) : (
              history.slice(0, 10).map((item) => (
                <div key={item.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                      item.type === 'EARN' ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-primary shadow-lg shadow-primary/20"
                    )}>
                      {item.type === 'EARN' ? <Plus size={20} /> : <Trophy size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.householdName || "未知村民"}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                          item.type === 'EARN' ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                        )}>
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xl font-serif font-bold",
                    item.type === 'EARN' ? "text-emerald-500" : "text-primary"
                  )}>
                    {item.type === 'EARN' ? '+' : '-'}{item.points}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const DataView = ({ onImportSuccess }: { onImportSuccess: () => void }) => {
  const [stats, setStats] = useState({ visited: 0, total: 0 });
  const [visits, setVisits] = useState<any[]>([]);
  const [showVisits, setShowVisits] = useState(false);
  const [exportType, setExportType] = useState<'HOUSEHOLD' | 'CREDIT' | 'VISIT' | null>(null);

  const fetchData = async () => {
    const hData = storage.getHouseholds();
    const vData = storage.getVisits();
    
    const today = new Date();
    const visitedThisWeek = hData.filter((h: any) => h.lastVisitedAt && isSameWeek(today, parseISO(h.lastVisitedAt), { weekStartsOn: 1 })).length;

    setStats({
      total: hData.length,
      visited: visitedThisWeek
    });
    setVisits(vData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async (type: 'HOUSEHOLD' | 'CREDIT' | 'VISIT') => {
    const workbook = new ExcelJS.Workbook();
    const sheetName = type === 'HOUSEHOLD' ? '邻里册' : type === 'CREDIT' ? '积分记录' : '走访记录';
    const worksheet = workbook.addWorksheet(sheetName);
    
    let filename = "";

    if (type === 'HOUSEHOLD') {
      const data = storage.getHouseholds();
      filename = `串门宝_邻里册导出_${new Date().toLocaleDateString()}.xlsx`;
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: '姓名', key: 'name', width: 15 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '地址', key: 'address', width: 30 },
        { header: '风险等级', key: 'riskLevel', width: 10 },
        { header: '原因', key: 'riskReason', width: 20 },
        { header: '备注', key: 'notes', width: 20 },
        { header: '特长', key: 'skills', width: 20 },
        { header: '家庭成员', key: 'members', width: 30 }
      ];
      worksheet.addRows(data.map(h => ({
        ...h,
        skills: Array.isArray(h.skills) ? h.skills.join(',') : h.skills
      })));
    } else if (type === 'CREDIT') {
      const raw = storage.getCreditsHistory();
      filename = `串门宝_积分记录导出_${new Date().toLocaleDateString()}.xlsx`;
      worksheet.columns = [
        { header: '村民姓名', key: 'householdName', width: 15 },
        { header: '类型', key: 'typeText', width: 10 },
        { header: '项目', key: 'category', width: 15 },
        { header: '分值', key: 'points', width: 10 },
        { header: '描述', key: 'description', width: 30 },
        { header: '时间', key: 'time', width: 25 },
        { header: '凭证照片', key: 'photo', width: 25 }
      ];
      
      for (const c of raw) {
        const row = worksheet.addRow({
          householdName: c.householdName,
          typeText: c.type === 'EARN' ? '获得' : '支出',
          category: c.category,
          points: c.points,
          description: c.description,
          time: new Date(c.createdAt).toLocaleString()
        });
        
        if (c.evidenceImage) {
          try {
            const imageId = workbook.addImage({
              base64: c.evidenceImage,
              extension: 'png',
            });
            worksheet.addImage(imageId, {
              tl: { col: 6, row: row.number - 1 },
              ext: { width: 150, height: 100 }
            });
            row.height = 80;
          } catch (e) {
            console.error("Error adding image to excel", e);
          }
        }
      }
    } else if (type === 'VISIT') {
      const raw = storage.getVisits();
      filename = `串门宝_走访记录导出_${new Date().toLocaleDateString()}.xlsx`;
      worksheet.columns = [
        { header: '被访人', key: 'householdName', width: 15 },
        { header: '走访人', key: 'visitorName', width: 15 },
        { header: '走访时间', key: 'time', width: 25 },
        { header: '身体状况', key: 'status', width: 15 },
        { header: '走访内容', key: 'content', width: 40 },
        { header: '现场照片', key: 'photo', width: 25 }
      ];
      
      for (const v of raw) {
        const row = worksheet.addRow({
          householdName: v.householdName,
          visitorName: v.visitorName,
          time: new Date(v.visitedAt).toLocaleString(),
          status: v.status,
          content: v.content
        });
        
        if (v.image) {
          try {
            const imageId = workbook.addImage({
              base64: v.image,
              extension: 'png',
            });
            worksheet.addImage(imageId, {
              tl: { col: 5, row: row.number - 1 },
              ext: { width: 150, height: 100 }
            });
            row.height = 80;
          } catch (e) {
            console.error("Error adding image to excel", e);
          }
        }
      }
    }

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);

    storage.saveSetting('last_export_at', new Date().toISOString());
    setExportType(null);
    fetchData();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      storage.saveHouseholds(data as Household[]);
      await fetchData();
      onImportSuccess();
      alert("导入成功，已覆盖旧数据");
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        id: "1",
        name: "张三",
        phone: "13800000000",
        address: "红峰村一组 1 号",
        riskLevel: "RED",
        riskReason: "独居老人",
        notes: "备注信息",
        skills: "草编",
        members: "配偶:李四,儿子:张小三"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "邻里册模板");
    XLSX.writeFile(wb, "串门宝_邻里册导入模板.xlsx");
  };

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">数据中心</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">离线管理与数据交互</p>
        </div>
        <button 
          onClick={handleDownloadTemplate}
          className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-primary transition-colors flex items-center gap-2"
        >
          <Download size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">下载模板</span>
        </button>
      </header>

      <button 
        onClick={() => setShowVisits(true)}
        className="w-full text-left bg-primary rounded-[1.5rem] p-5 text-white space-y-3 shadow-2xl shadow-primary/30 relative overflow-hidden active:scale-[0.98] transition-all"
      >
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-white/60 text-[8px] font-black uppercase tracking-widest">本周走访覆盖率</div>
            <div className="text-3xl font-serif font-bold">{Math.round((stats.visited / stats.total) * 100) || 0}%</div>
          </div>
          <DbIcon size={32} className="text-white/20" />
        </div>
        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
            style={{ width: `${(stats.visited / stats.total) * 100 || 0}%` }} 
          />
        </div>
        <div className="text-[8px] font-black uppercase tracking-widest text-white/60 flex justify-between">
          <span>本周已走访 {stats.visited} 户</span>
          <span>全村 {stats.total} 户</span>
        </div>
        <div className="text-center text-[7px] font-black uppercase tracking-widest pt-1.5 border-t border-white/10">点击查看待导出记录</div>
      </button>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => setExportType('CREDIT')}
          className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-xl shadow-slate-200/40 flex items-center justify-between active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Trophy size={26} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900">导出积分记录</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">导出积分发放与兑换明细</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-200" />
        </button>

        <button 
          onClick={() => setExportType('VISIT')}
          className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-xl shadow-slate-200/40 flex items-center justify-between active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ClipboardList size={26} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900">导出走访记录</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">导出最新入户巡访实录</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-200" />
        </button>

        <label className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-xl shadow-slate-200/40 flex items-center justify-between active:scale-[0.98] transition-all group cursor-pointer">
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Upload size={26} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900">导入邻里册</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">全量覆盖本地数据库</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-200" />
        </label>
      </div>

      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 flex gap-4 shadow-sm">
        <AlertCircle className="text-primary shrink-0" size={24} />
        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
          <b className="text-primary font-black uppercase tracking-widest block mb-1">离线模式说明</b>
          本应用所有数据优先存储在手机本地。在无网络环境下，您可以正常录入走访和积分，待回到村委会后通过 Excel 导出进行汇总上报。
        </p>
      </div>

      <button 
        onClick={() => {
          if (window.confirm("确定要清空所有本地数据并重置系统吗？此操作不可撤销。")) {
            localStorage.clear();
            window.location.reload();
          }
        }}
        className="w-full py-4 bg-red-50 border border-red-100 rounded-[2rem] text-red-600 flex items-center justify-center gap-3 hover:bg-red-100 transition-colors active:scale-[0.98]"
      >
        <Trash2 size={18} />
        <span className="text-[10px] font-black uppercase tracking-widest">重置系统（清空所有缓存数据）</span>
      </button>

      {/* Visits Modal */}
      <AnimatePresence>
        {showVisits && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 overflow-y-auto max-h-[90vh] shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-slate-900">待导出走访记录</h2>
                <button onClick={() => setShowVisits(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="space-y-4">
                {visits.length === 0 ? (
                  <div className="text-center py-10 text-slate-300 text-xs font-bold uppercase tracking-widest">暂无待导出记录</div>
                ) : (
                  visits.map(v => (
                    <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{v.householdName || "未知村民"}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                          v.status === '良好' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        )}>{v.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{v.content}</p>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(v.visitedAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => setShowVisits(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] active:scale-95 transition-transform"
              >
                关闭
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Confirmation Modal */}
      <AnimatePresence>
        {exportType && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 space-y-6 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <Download size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold">确认导出？</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">导出后，系统将记录本次导出时间，下次导出将仅包含新增记录。</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setExportType(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  取消
                </button>
                <button 
                  onClick={() => handleExport(exportType)}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  确认导出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'todo' | 'ledger' | 'notes' | 'credits' | 'data'>('todo');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showExtraVisit, setShowExtraVisit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [visitForm, setVisitForm] = useState({ content: '', status: '良好', image: '', search: '' });
  const [settings, setSettings] = useState<any>(storage.getSettings());

  const fetchHouseholds = () => {
    setAllHouseholds(storage.getHouseholds());
  };

  useEffect(() => {
    // Data Repair: Ensure all households have valid skills array
    try {
      const current = storage.getHouseholds();
      const needsRepair = current.some(h => !Array.isArray(h.skills));
      if (needsRepair) {
        console.log("System: Repairing malformed data...");
        storage.saveHouseholds(current);
        fetchHouseholds();
      }
    } catch (e) {
      console.error("Data repair failed:", e);
    }
    fetchHouseholds();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
    storage.saveSetting(key, value);
  };

  const handleVisit = (h: Household) => {
    setSelectedHousehold(h);
    setVisitForm({ content: '', status: '良好', image: '' });
    setShowVisitForm(true);
  };

  const handleExtraVisit = () => {
    setSelectedHousehold(null);
    setVisitForm({ content: '', status: '良好', image: '', search: '' });
    setShowExtraVisit(true);
  };

  const handleVisitSubmit = async () => {
    if (!selectedHousehold) return;
    const record = {
      id: generateId(),
      householdId: selectedHousehold.id,
      householdName: selectedHousehold.name,
      visitorName: settings.user_name || "李姐",
      visitedAt: new Date().toISOString(),
      content: visitForm.content,
      status: visitForm.status,
      image: visitForm.image
    };
    storage.addVisit(record);
    fetchHouseholds(); // Refresh after visit
    setShowVisitForm(false);
    setShowExtraVisit(false);
  };

  const handleSelectHousehold = (h: Household) => {
    setSelectedHousehold(h);
    setShowDetail(true);
  };

  const updateHousehold = async (updated: Household) => {
    const households = storage.getHouseholds();
    const idx = households.findIndex(h => h.id === updated.id);
    if (idx !== -1) {
      households[idx] = updated;
    } else {
      households.push(updated);
    }
    storage.saveHouseholds(households);
    setSelectedHousehold(updated);
    fetchHouseholds(); // Refresh after update
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFCFB] flex flex-col pb-24 font-sans">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === 'todo' && <TodoView onVisit={handleVisit} onExtraVisit={handleExtraVisit} settings={settings} onUpdateSetting={updateSetting} />}
            {activeTab === 'ledger' && <LedgerView households={allHouseholds} onSelect={handleSelectHousehold} />}
            {activeTab === 'notes' && <NotesView />}
            {activeTab === 'credits' && <CreditsView households={allHouseholds} onRefresh={fetchHouseholds} />}
            {activeTab === 'data' && <DataView onImportSuccess={fetchHouseholds} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-bottom z-40 border-t border-slate-100">
        <div className="max-w-md mx-auto flex justify-around items-center px-4 h-20">
          <TabButton 
            active={activeTab === 'todo'} 
            icon={ClipboardList} 
            label="待办" 
            onClick={() => setActiveTab('todo')} 
          />
          <TabButton 
            active={activeTab === 'ledger'} 
            icon={Users} 
            label="邻里册" 
            onClick={() => setActiveTab('ledger')} 
          />
          <TabButton 
            active={activeTab === 'notes'} 
            icon={BookOpen} 
            label="" 
            onClick={() => setActiveTab('notes')} 
            center
          />
          <TabButton 
            active={activeTab === 'credits'} 
            icon={Trophy} 
            label="积分" 
            onClick={() => setActiveTab('credits')} 
          />
          <TabButton 
            active={activeTab === 'data'} 
            icon={DbIcon} 
            label="数据" 
            onClick={() => setActiveTab('data')} 
          />
        </div>
      </nav>

      {/* Family Detail Modal */}
      {showDetail && selectedHousehold && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-8 overflow-y-auto max-h-[90vh] shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-slate-900">家庭详情</h2>
              <button onClick={() => setShowDetail(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-serif font-bold shadow-lg",
                    selectedHousehold.riskLevel === RiskLevel.RED ? "bg-primary" : selectedHousehold.riskLevel === RiskLevel.YELLOW ? "bg-amber-500" : "bg-emerald-600"
                  )}>
                    {selectedHousehold.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedHousehold.name}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">户主</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <MapPin size={18} className="text-primary" />
                    <div className="text-sm font-medium text-slate-700">{selectedHousehold.address}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <Phone size={18} className="text-primary" />
                    <div className="text-sm font-medium text-slate-700">{selectedHousehold.phone}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <Users size={18} className="text-primary" />
                    <div className="text-sm font-medium text-slate-700">{selectedHousehold.members || "暂无家庭成员信息"}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">关注原因</div>
                    <div className="text-sm font-bold text-primary">{selectedHousehold.riskReason || "无"}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">备注信息</div>
                    <div className="text-sm font-medium text-slate-700 leading-relaxed">{selectedHousehold.notes || "暂无备注"}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">风险等级管理</label>
                <div className="flex gap-2">
                  {[RiskLevel.RED, RiskLevel.YELLOW, RiskLevel.GREEN].map(l => (
                    <button 
                      key={l}
                      onClick={() => updateHousehold({...selectedHousehold, riskLevel: l})}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                        selectedHousehold.riskLevel === l ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 border-slate-100"
                      )}
                    >
                      {selectedHousehold.riskLevel === l && <Check size={12} />}
                      {l === RiskLevel.RED ? '红码' : l === RiskLevel.YELLOW ? '黄码' : '绿码'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">家庭技能管理</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map(s => {
                    const isSelected = selectedHousehold.skills.includes(s);
                    return (
                      <button 
                        key={s}
                        onClick={() => {
                          const newSkills = isSelected 
                            ? selectedHousehold.skills.filter(sk => sk !== s)
                            : [...selectedHousehold.skills, s];
                          updateHousehold({...selectedHousehold, skills: newSkills});
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                          isSelected ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200"
                        )}
                      >
                        {isSelected && <Check size={10} />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-2xl" />
                <div className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">历史访视记录</div>
                <div className="text-lg font-serif font-bold">
                  {selectedHousehold.lastVisitedAt 
                    ? `最近一次走访：${differenceInDays(new Date(), new Date(selectedHousehold.lastVisitedAt))} 天前`
                    : "暂无走访记录"}
                </div>
                <div className="text-[10px] font-bold mt-2 opacity-60">
                  {selectedHousehold.lastVisitedAt ? new Date(selectedHousehold.lastVisitedAt).toLocaleDateString() : "-"}
                </div>
              </div>

              <button 
                onClick={() => setShowDetail(false)}
                className="w-full py-5 bg-slate-100 text-slate-900 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] active:scale-95 transition-transform"
              >
                返回列表
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Extra Visit Modal */}
      {showExtraVisit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-8 overflow-y-auto max-h-[90vh] shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-slate-900">额外走访记录</h2>
              <button onClick={() => setShowExtraVisit(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">第一步：选择村民</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="输入姓名搜索..." 
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none"
                    value={visitForm.search}
                    onChange={e => setVisitForm({...visitForm, search: e.target.value})}
                  />
                </div>
                {visitForm.search && !selectedHousehold && (
                  <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-sm divide-y divide-slate-50">
                    {allHouseholds.filter(h => h.name.includes(visitForm.search)).map(h => (
                      <button 
                        key={h.id} 
                        onClick={() => {
                          setSelectedHousehold(h);
                          setVisitForm({...visitForm, search: h.name});
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                )}
                {selectedHousehold && (
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">
                        {selectedHousehold.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{selectedHousehold.name}</div>
                        <div className="text-[10px] text-slate-400">{selectedHousehold.address}</div>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedHousehold(null); setVisitForm({...visitForm, search: ''}); }} className="text-slate-300">
                      <Plus size={16} className="rotate-45" />
                    </button>
                  </div>
                )}
              </div>

              {selectedHousehold && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">第二步：走访实录</label>
                    <textarea 
                      placeholder="记录走访情况..." 
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:outline-none h-32 text-sm font-medium shadow-sm"
                      value={visitForm.content}
                      onChange={e => setVisitForm({ ...visitForm, content: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">第三步：状况评估</label>
                    <div className="flex gap-2">
                      {['良好', '一般', '较差'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setVisitForm({ ...visitForm, status: s })}
                          className={cn(
                            "flex-1 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                            visitForm.status === s ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 border-slate-100"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">第四步：拍照上传</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="extra-visit-image-upload"
                        onChange={(e) => handleImageUpload(e, (base64) => setVisitForm({...visitForm, image: base64}))}
                      />
                      <label 
                        htmlFor="extra-visit-image-upload"
                        className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer active:bg-slate-100 transition-colors overflow-hidden"
                      >
                        {visitForm.image ? (
                          <img src={visitForm.image} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <>
                            <Camera size={24} />
                            <span className="text-[9px] font-black uppercase tracking-widest">点击拍照留存凭证</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={handleVisitSubmit}
                    className="w-full py-5 bg-primary text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <CheckCircle2 size={20} /> 提交记录
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Visit Form Modal */}
      {showVisitForm && selectedHousehold && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-6 overflow-y-auto max-h-[95vh] shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-slate-900">走访：{selectedHousehold.name}</h2>
              <button onClick={() => setShowVisitForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">联系电话</div>
                  <div className="font-bold text-slate-800 flex items-center gap-2 mt-0.5 text-xs">
                    <Phone size={10} className="text-primary" /> {selectedHousehold.phone}
                  </div>
                </div>
                <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">家庭住址</div>
                  <div className="font-bold text-slate-800 flex items-center gap-2 mt-0.5 text-xs">
                    <MapPin size={10} className="text-primary" /> {selectedHousehold.address}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">走访实录</label>
                <textarea 
                  placeholder="记录身体状况、困难诉求..." 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none h-24 text-xs font-medium shadow-sm"
                  value={visitForm.content}
                  onChange={e => setVisitForm({ ...visitForm, content: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">拍照上传</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="visit-form-image-upload"
                      onChange={(e) => handleImageUpload(e, (base64) => setVisitForm({...visitForm, image: base64}))}
                    />
                    <label 
                      htmlFor="visit-form-image-upload"
                      className="w-full h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-1 cursor-pointer active:bg-slate-100 transition-colors overflow-hidden"
                    >
                      {visitForm.image ? (
                        <img src={visitForm.image} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <Camera size={20} />
                          <span className="text-[8px] font-black uppercase tracking-widest">点击拍照</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">状况评估</label>
                  <div className="flex flex-col gap-1.5">
                    {['良好', '一般', '较差'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setVisitForm({ ...visitForm, status: s })}
                        className={cn(
                          "w-full py-2 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                          visitForm.status === s ? "bg-primary text-white border-primary shadow-md shadow-primary/20" : "bg-slate-50 text-slate-400 border-slate-100"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleVisitSubmit}
                className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <CheckCircle2 size={18} /> 提交并签到
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
