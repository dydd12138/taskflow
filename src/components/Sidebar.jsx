import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../store';

// ─── Colors ────────────────────────────────────────────────────────────────────
const PROJECT_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#14b8a6', '#06b6d4', '#64748b',
];

// ─── Icons ─────────────────────────────────────────────────────────────────────
const NavIcon = ({ children }) => (
  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{children}</span>
);
const TodayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const WeekIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const AllIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const FolderIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 py-1.5 rounded-lg text-sm font-medium
        ${active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-l-[3px] border-l-blue-500 pl-[9px] pr-3'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-100 border-l-[3px] border-l-transparent px-3'}`}
    >
      <NavIcon>{icon}</NavIcon>
      <span>{label}</span>
    </button>
  );
}

// ─── SmartMenu ─────────────────────────────────────────────────────────────────
// Portal-based dropdown with viewport-aware positioning
function SmartMenu({ onOpen, onOpenChange, children }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const setOpenWithNotify = (val) => {
    setOpen(val);
    onOpenChange?.(val);
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    const MENU_W = 168;
    const MENU_H_EST = 260;
    const spaceBelow = window.innerHeight - rect.bottom;

    let left = rect.left;
    if (left + MENU_W > window.innerWidth - 8) left = window.innerWidth - MENU_W - 8;

    const style = { position: 'fixed', left, zIndex: 9999, width: MENU_W };
    if (spaceBelow < MENU_H_EST) {
      style.bottom = window.innerHeight - rect.top + 4;
    } else {
      style.top = rect.bottom + 4;
    }
    setMenuStyle(style);
    setOpenWithNotify(true);
    onOpen?.();
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      // React 19: 合成事件触发 re-render 后旧节点被移除，isConnected 为 false，跳过关闭
      if (!e.target.isConnected) return;
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpenWithNotify(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        className="w-5 h-5 flex items-center justify-center rounded text-slate-400
          hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {children(() => setOpenWithNotify(false))}
        </div>
      )}
    </>
  );
}

// ─── ColorPickerPopover ────────────────────────────────────────────────────────
function ColorPickerPopover({ currentColor, onSelect, onClose, anchorEl }) {
  const [style, setStyle] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const W = 188;
    let left = rect.left;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    setStyle({
      position: 'fixed',
      left,
      zIndex: 9999,
      ...(spaceBelow < 120
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [anchorEl]);

  useEffect(() => {
    const h = (e) => {
      if (!e.target.isConnected) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div ref={ref} style={style}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 p-3"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-xs text-slate-400 mb-2.5">选择颜色</p>
      <div className="flex flex-wrap gap-2">
        {PROJECT_COLORS.map(c => (
          <button key={c} type="button"
            onClick={() => { onSelect(c); onClose(); }}
            className={`w-5 h-5 rounded-full hover:scale-125 transition-transform
              ${currentColor === c ? 'ring-2 ring-offset-1 ring-slate-500 dark:ring-offset-slate-800' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

// ─── Menu primitives ──────────────────────────────────────────────────────────
const MenuBtn = ({ onClick, danger, disabled, children }) => (
  <button onClick={onClick} disabled={disabled}
    className={`w-full text-left px-3 py-1.5 text-xs transition-colors
      ${disabled
        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
        : danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
  >
    {children}
  </button>
);
const MenuSep = () => <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />;

// ─── InlineNameInput ──────────────────────────────────────────────────────────
function InlineNameInput({ value, onSave, onCancel }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = () => { const n = draft.trim(); if (n) onSave(n); else onCancel(); };
  return (
    <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      onClick={e => e.stopPropagation()}
      className="flex-1 min-w-0 text-xs bg-transparent border-b border-blue-400 focus:outline-none
        text-slate-700 dark:text-slate-200 py-0"
    />
  );
}

// ─── ProjectItem (L2) ─────────────────────────────────────────────────────────
function ProjectItem({
  project, active, onNavigate,
  isFirst, isLast,
  isEditing, onStartEdit, onDoneEdit,
}) {
  const { state, actions } = useApp();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuState, setMenuState] = useState('main'); // 'main' | 'confirmDelete' | 'moveToCategory'
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const rowRef = useRef(null);

  const taskCount = state.tasks.filter(t => t.projectId === project.id && !t.deletedAt && !t.completed).length;
  const sortedCats = [...state.categories].sort((a, b) => a.order - b.order);

  return (
    <div ref={rowRef}
      className={`rounded-md transition-colors
        ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${active && !isEditing ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-400 dark:border-blue-500' : 'border-l-2 border-transparent'}
        ${!active && !isEditing ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isEditing ? (
        /* ── Rename mode: text-only ── */
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
          <InlineNameInput
            value={project.name}
            onSave={name => { actions.updateProject(project.id, { name }); onDoneEdit(); }}
            onCancel={onDoneEdit}
          />
        </div>
      ) : (
        /* ── Normal mode ── */
        <div
          className="flex items-center gap-2 pl-2 pr-2 py-1.5 cursor-pointer"
          onClick={() => onNavigate(`project:${project.id}`)}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
          <span className={`flex-1 text-sm font-normal truncate
            ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {project.name}
          </span>
          {taskCount > 0 && !hovered && !menuOpen && (
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{taskCount}</span>
          )}
          {/* 始终占位，悬停时可见，避免高度抖动 */}
          <div className={`flex-shrink-0 ${(hovered || menuOpen) ? 'visible' : 'invisible'}`}>
            <SmartMenu onOpen={() => setMenuState('main')} onOpenChange={setMenuOpen}>
              {(close) => {
                if (menuState === 'confirmDelete') {
                  return (
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-slate-700 dark:text-slate-200 mb-1 leading-snug">
                        删除「{project.name}」？任务将移至其他项目。
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => { actions.deleteProject(project.id); close(); }}
                          className="flex-1 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >确认</button>
                        <button
                          onClick={() => setMenuState('main')}
                          className="flex-1 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >取消</button>
                      </div>
                    </div>
                  );
                }

                if (menuState === 'moveToCategory') {
                  return (
                    <>
                      <button
                        onClick={() => setMenuState('main')}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        移动到分类
                      </button>
                      <MenuSep />
                      <MenuBtn
                        onClick={() => {
                          if (project.categoryId !== null) {
                            actions.moveProjectToCategory(project.id, null);
                          }
                          close();
                        }}
                        disabled={project.categoryId === null}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                          未分类
                        </span>
                      </MenuBtn>
                      {sortedCats.map(cat => (
                        <MenuBtn
                          key={cat.id}
                          disabled={project.categoryId === cat.id}
                          onClick={() => { actions.moveProjectToCategory(project.id, cat.id); close(); }}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            <span className="truncate">{cat.name}</span>
                          </span>
                        </MenuBtn>
                      ))}
                    </>
                  );
                }

                return (
                  <>
                    <MenuBtn onClick={() => { onStartEdit(); close(); }}>重命名</MenuBtn>
                    <MenuBtn onClick={() => { setColorPickerOpen(true); close(); }}>更改颜色</MenuBtn>
                    <MenuBtn onClick={() => setMenuState('moveToCategory')}>
                      <span className="flex items-center justify-between">
                        <span>移动到分类</span>
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </MenuBtn>
                    <MenuSep />
                    <MenuBtn disabled={isFirst} onClick={() => { actions.moveProject(project.id, project.categoryId, 'up'); close(); }}>↑ 上移</MenuBtn>
                    <MenuBtn disabled={isLast} onClick={() => { actions.moveProject(project.id, project.categoryId, 'down'); close(); }}>↓ 下移</MenuBtn>
                    <MenuSep />
                    <MenuBtn danger onClick={() => setMenuState('confirmDelete')}>删除项目</MenuBtn>
                  </>
                );
              }}
            </SmartMenu>
          </div>
        </div>
      )}

      {/* Color picker popover (outside SmartMenu, persists independently) */}
      {colorPickerOpen && rowRef.current && (
        <ColorPickerPopover
          currentColor={project.color}
          onSelect={(c) => actions.updateProject(project.id, { color: c })}
          onClose={() => setColorPickerOpen(false)}
          anchorEl={rowRef.current}
        />
      )}
    </div>
  );
}

// ─── CategoryItem (L1) ────────────────────────────────────────────────────────
function CategoryItem({
  category, projects, currentView, onNavigate,
  isFirst, isLast,
  editingId, setEditingId,
  editingProjectId, setEditingProjectId,
}) {
  const { actions } = useApp();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuState, setMenuState] = useState('main'); // 'main' | 'confirmDelete'
  const isEditing = editingId === category.id;

  const handleAddProject = async () => {
    if (category.collapsed) actions.toggleCategory(category.id);
    const proj = await actions.createProject({ categoryId: category.id, name: '新建项目', color: '#3b82f6' });
    setEditingProjectId(proj.id);
  };

  const sortedProjs = [...projects].sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Category row */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 mt-1 rounded-lg transition-colors
          ${isEditing
            ? 'bg-slate-200/70 dark:bg-slate-700/60'
            : 'cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/60'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { if (!isEditing) actions.toggleCategory(category.id); }}
      >
        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform flex-shrink-0 ${category.collapsed ? '-rotate-90' : ''}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>

        {/* Folder icon — 比项目的 dot 大 */}
        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center" style={{ color: category.color }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </span>

        {/* Name or inline editor */}
        {isEditing ? (
          <InlineNameInput
            value={category.name}
            onSave={name => { actions.updateCategory(category.id, { name }); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <span className="flex-1 text-[13px] font-semibold text-slate-600 dark:text-slate-300 select-none truncate">
            {category.name}
          </span>
        )}

        {/* 项目数量（未悬停且有项目时显示）*/}
        {!isEditing && !hovered && !menuOpen && projects.length > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0">
            {projects.length}
          </span>
        )}

        {/* Dots menu — 始终占位，悬停时可见，避免高度抖动 */}
        {!isEditing && (
          <div className={`flex-shrink-0 ${(hovered || menuOpen) ? 'visible' : 'invisible'}`}>
            <SmartMenu onOpen={() => setMenuState('main')} onOpenChange={setMenuOpen}>
              {(close) => menuState === 'confirmDelete' ? (
              <div className="px-3 py-2.5">
                <p className="text-xs text-slate-700 dark:text-slate-200 mb-1 leading-snug">
                  删除「{category.name}」？项目将移至未分类。
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => { actions.deleteCategory(category.id); close(); }}
                    className="flex-1 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >确认</button>
                  <button
                    onClick={() => setMenuState('main')}
                    className="flex-1 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >取消</button>
                </div>
              </div>
            ) : (
              <>
                <MenuBtn onClick={() => { handleAddProject(); close(); }}>新建项目</MenuBtn>
                <MenuBtn onClick={() => { setEditingId(category.id); close(); }}>重命名</MenuBtn>
                <MenuSep />
                <MenuBtn disabled={isFirst} onClick={() => { actions.moveCategory(category.id, 'up'); close(); }}>↑ 上移</MenuBtn>
                <MenuBtn disabled={isLast} onClick={() => { actions.moveCategory(category.id, 'down'); close(); }}>↓ 下移</MenuBtn>
                <MenuSep />
                <MenuBtn danger onClick={() => setMenuState('confirmDelete')}>删除分类</MenuBtn>
              </>
            )}
          </SmartMenu>
          </div>
        )}
      </div>

      {/* Projects */}
      {!category.collapsed && (
        <div className="ml-4 mt-0.5 mb-1">
          {sortedProjs.map((proj, idx) => (
            <ProjectItem
              key={proj.id}
              project={proj}
              active={currentView === `project:${proj.id}`}
              onNavigate={onNavigate}
              isFirst={idx === 0}
              isLast={idx === sortedProjs.length - 1}
              isEditing={editingProjectId === proj.id}
              onStartEdit={() => setEditingProjectId(proj.id)}
              onDoneEdit={() => setEditingProjectId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── UncategorizedSection ─────────────────────────────────────────────────────
function UncategorizedSection({ projects, currentView, onNavigate, editingProjectId, setEditingProjectId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const sortedProjs = [...projects].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer
          hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setCollapsed(c => !c)}
      >
        <svg className={`w-3 h-3 text-slate-400 transition-transform flex-shrink-0 ${collapsed ? '-rotate-90' : ''}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
        <span className="flex-shrink-0 text-slate-400 dark:text-slate-500"><FolderIcon /></span>
        <span className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide uppercase select-none">
          未分类
        </span>
      </div>

      {!collapsed && (
        <div className="ml-4 mt-0.5 mb-1">
          {sortedProjs.map((proj, idx) => (
            <ProjectItem
              key={proj.id}
              project={proj}
              active={currentView === `project:${proj.id}`}
              onNavigate={onNavigate}
              isFirst={idx === 0}
              isLast={idx === sortedProjs.length - 1}
              isEditing={editingProjectId === proj.id}
              onStartEdit={() => setEditingProjectId(proj.id)}
              onDoneEdit={() => setEditingProjectId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ width }) {
  const { state, actions } = useApp();
  const [search, setSearch] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);

  const { categories, projects, currentView } = state;
  const navigate = (view) => actions.setView(view);
  const uncategorizedProjects = projects.filter(p => p.categoryId === null);
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const handleNewCategory = async () => {
    const cat = await actions.createCategory({ name: '新建分类', color: '#64748b' });
    setEditingCategoryId(cat.id);
  };

  return (
    <aside
      style={{ width }}
      className="flex-shrink-0 flex flex-col h-full bg-slate-50 dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-700"
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">TaskFlow</span>
        </div>
      </div>

      {/* Top nav */}
      <div className="px-2 pt-3 space-y-0.5">
        <NavItem icon={<TodayIcon />}    label="今天"     active={currentView === 'today'}    onClick={() => navigate('today')} />
        <NavItem icon={<WeekIcon />}     label="本周"     active={currentView === 'week'}     onClick={() => navigate('week')} />
        <NavItem icon={<AllIcon />}      label="所有任务" active={currentView === 'all'}      onClick={() => navigate('all')} />
        <NavItem icon={<CalendarIcon />} label="日历"     active={currentView === 'calendar'} onClick={() => navigate('calendar')} />
        <NavItem icon={<ChatIcon />}     label="对话"     active={false}                      onClick={() => {}} />
      </div>

      {/* Divider */}
      <div className="mx-3 my-3 h-px bg-slate-200 dark:bg-slate-700" />

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F5F5F5] dark:bg-slate-800
          border border-transparent focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..."
            className="flex-1 text-xs bg-transparent text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none" />
        </div>
      </div>

      {/* Section header */}
      <div className="px-3 mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">任务清单</span>
          <button
            onClick={() => actions.expandAllCategories()}
            className="px-1.5 py-0.5 text-[10px] text-slate-400 dark:text-slate-500
              hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20
              rounded transition-colors"
            title="展开全部"
          >展开全部</button>
        </div>
        <button onClick={handleNewCategory}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400
            hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20
            rounded-md transition-colors"
          title="新建分类"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建分类
        </button>
      </div>

      {/* Project tree */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sortedCategories.map((cat, idx) => (
          <CategoryItem
            key={cat.id}
            category={cat}
            projects={projects.filter(p => p.categoryId === cat.id)}
            currentView={currentView}
            onNavigate={navigate}
            isFirst={idx === 0}
            isLast={idx === sortedCategories.length - 1}
            editingId={editingCategoryId}
            setEditingId={setEditingCategoryId}
            editingProjectId={editingProjectId}
            setEditingProjectId={setEditingProjectId}
          />
        ))}
        <UncategorizedSection
          projects={uncategorizedProjects}
          currentView={currentView}
          onNavigate={navigate}
          editingProjectId={editingProjectId}
          setEditingProjectId={setEditingProjectId}
        />
      </div>

      {/* Bottom */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-2 space-y-0.5">
        <NavItem
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
          label="已删除" active={currentView === 'deleted'} onClick={() => navigate('deleted')}
        />
        <NavItem icon={<SettingsIcon />} label="设置"
          active={currentView === 'settings'} onClick={() => navigate('settings')} />
      </div>
    </aside>
  );
}
