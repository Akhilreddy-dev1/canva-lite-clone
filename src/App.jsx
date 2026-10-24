import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import {
  AlignCenter, AlignLeft, AlignRight, ChevronDown, Circle, Copy, Download,
  FileImage, FolderOpen, Grid2X2, ImagePlus, Italic, LayoutTemplate, Minus,
  MousePointer2, Palette, Plus, Redo2, Search, Share2, Square, Trash2, Type,
  Underline, Undo2, Upload, X, Triangle, Minus as LineIcon,
} from 'lucide-react';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const MAX_HISTORY = 40;

const templates = [
  { name: 'Sunset social', colors: ['#ff8b6a', '#6b4eff'], heading: 'Create your moment' },
  { name: 'Minimal studio', colors: ['#f4f1ea', '#202124'], heading: 'Less, but better' },
  { name: 'Fresh launch', colors: ['#b7f3d4', '#153b35'], heading: 'Something new is here' },
  { name: 'Bold editorial', colors: ['#101010', '#f7c948'], heading: 'Make it matter' },
];

const panels = {
  templates: { label: 'Design', icon: LayoutTemplate },
  elements: { label: 'Elements', icon: Grid2X2 },
  text: { label: 'Text', icon: Type },
  uploads: { label: 'Uploads', icon: Upload },
  brand: { label: 'Brand', icon: Palette },
};

function App() {
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);
  const fileInputRef = useRef(null);
  const history = useRef([]);
  const historyIndex = useRef(-1);
  const pagesRef = useRef([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activePanel, setActivePanel] = useState('templates');
  const [fillColor, setFillColor] = useState('#7c3aed');
  const [background, setBackground] = useState('#ffffff');
  const [zoom, setZoom] = useState(0.72);
  const [title, setTitle] = useState('Untitled design');
  const [pages, setPages] = useState([{ id: 1, label: 'Page 1' }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isShared, setIsShared] = useState(false);
  const [templateQuery, setTemplateQuery] = useState('');
  const [uploads, setUploads] = useState([]);

  const snapshot = () => JSON.stringify(fabricCanvas.current?.toJSON() || {});

  const saveHistory = () => {
    if (!fabricCanvas.current || historyIndex.current < 0) return;
    const next = history.current.slice(0, historyIndex.current + 1);
    const value = snapshot();
    if (next[next.length - 1] !== value) {
      next.push(value);
      history.current = next.slice(-MAX_HISTORY);
      historyIndex.current = history.current.length - 1;
    }
    pagesRef.current[currentPage - 1] = value;
  };

  const refreshSelection = () => setSelectedObject(fabricCanvas.current?.getActiveObject() || null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selectionColor: 'rgba(124, 58, 237, .12)',
      selectionBorderColor: '#7c3aed',
      selectionLineWidth: 1,
    });
    fabricCanvas.current = canvas;
    const initial = JSON.stringify(canvas.toJSON());
    history.current = [initial];
    historyIndex.current = 0;
    pagesRef.current = [initial];
    ['selection:created', 'selection:updated', 'selection:cleared'].forEach((event) => canvas.on(event, refreshSelection));
    ['object:modified', 'object:added', 'object:removed'].forEach((event) => canvas.on(event, saveHistory));
    return () => canvas.dispose();
  }, []);

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    canvas.setZoom(zoom);
    canvas.setDimensions({ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom });
  }, [zoom]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target.matches('input, textarea')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const addObject = (object) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.renderAll();
    refreshSelection();
    saveHistory();
  };

  const addRect = () => addObject(new fabric.Rect({ left: 300, top: 190, width: 260, height: 180, rx: 18, ry: 18, fill: fillColor }));
  const addCircle = () => addObject(new fabric.Circle({ left: 340, top: 180, radius: 100, fill: fillColor }));
  const addTriangle = () => addObject(new fabric.Triangle({ left: 350, top: 190, width: 190, height: 170, fill: fillColor }));
  const addLine = () => addObject(new fabric.Line([260, 300, 640, 300], { stroke: fillColor, strokeWidth: 8 }));
  const addText = (text = 'Add a heading', body = false) => addObject(new fabric.IText(text, {
    left: 290, top: 220, fontSize: body ? 28 : 48, fontFamily: 'Arial', fontWeight: body ? '400' : '700', fill: fillColor,
  }));

  const deleteSelected = () => {
    const canvas = fabricCanvas.current;
    if (!canvas || !canvas.getActiveObjects().length) return;
    canvas.remove(...canvas.getActiveObjects());
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshSelection();
    saveHistory();
  };

  const updateObject = (property, value) => {
    if (!selectedObject) return;
    selectedObject.set(property, value);
    fabricCanvas.current?.renderAll();
    saveHistory();
    refreshSelection();
  };

  const duplicateSelected = () => {
    const object = fabricCanvas.current?.getActiveObject();
    if (!object) return;
    object.clone((clone) => {
      clone.set({ left: (object.left || 0) + 24, top: (object.top || 0) + 24 });
      addObject(clone);
    });
  };

  const undo = () => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    fabricCanvas.current?.loadFromJSON(history.current[historyIndex.current], () => {
      fabricCanvas.current.renderAll();
      refreshSelection();
    });
  };

  const redo = () => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    fabricCanvas.current?.loadFromJSON(history.current[historyIndex.current], () => {
      fabricCanvas.current.renderAll();
      refreshSelection();
    });
  };

  const applyTemplate = (template) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = template.colors[0];
    setBackground(template.colors[0]);
    addObject(new fabric.IText(template.heading, { left: 120, top: 210, fontSize: 64, fontFamily: 'Arial', fontWeight: '700', fill: template.colors[1], width: 650 }));
    addObject(new fabric.Circle({ left: 690, top: 80, radius: 120, fill: template.colors[1], opacity: 0.85 }));
    addObject(new fabric.Rect({ left: 80, top: 475, width: 230, height: 12, rx: 6, ry: 6, fill: template.colors[1] }));
    canvas.renderAll();
    saveHistory();
  };

  const addPage = () => {
    pagesRef.current.push(JSON.stringify({ version: '5.3.0', objects: [], background: '#ffffff' }));
    setPages((items) => [...items, { id: items.length + 1, label: `Page ${items.length + 1}` }]);
  };

  const selectPage = (page) => {
    if (page === currentPage) return;
    pagesRef.current[currentPage - 1] = snapshot();
    setCurrentPage(page);
    fabricCanvas.current?.loadFromJSON(pagesRef.current[page - 1], () => {
      const canvas = fabricCanvas.current;
      canvas.renderAll();
      setBackground(canvas.backgroundColor || '#ffffff');
      refreshSelection();
    });
  };

  const uploadFiles = (event) => {
    [...event.target.files].forEach((file) => {
      const url = URL.createObjectURL(file);
      setUploads((items) => [...items, { name: file.name, url }]);
      if (file.type.startsWith('image/')) {
        fabric.Image.fromURL(url, (image) => {
          image.scaleToWidth(300);
          image.set({ left: 300, top: 150 });
          addObject(image);
        }, { crossOrigin: 'anonymous' });
      }
    });
    event.target.value = '';
  };

  const downloadDesign = () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'design'}.png`;
    link.href = canvas.toDataURL({ format: 'png', multiplier: 2 });
    link.click();
  };

  const downloadProject = () => {
    const data = JSON.stringify({ title, pages: pagesRef.current });
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'design'}.json`;
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    link.click();
  };

  const setCanvasBackground = (value) => {
    setBackground(value);
    if (fabricCanvas.current) {
      fabricCanvas.current.backgroundColor = value;
      fabricCanvas.current.renderAll();
      saveHistory();
    }
  };

  const filteredTemplates = templates.filter((item) => item.name.toLowerCase().includes(templateQuery.toLowerCase()));
  const textSelected = selectedObject?.type === 'i-text' || selectedObject?.type === 'textbox';

  const panelContent = () => {
    if (activePanel === 'templates') return (
      <>
        <div className="panel-search"><Search size={16} /><input value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Search templates" /></div>
        <p className="panel-kicker">Start from a template</p>
        <div className="template-grid">{filteredTemplates.map((template) => (
          <button className="template-card" key={template.name} onClick={() => applyTemplate(template)}>
            <span className="template-preview" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }}><strong>{template.heading}</strong></span>
            <span>{template.name}</span>
          </button>
        ))}</div>
      </>
    );
    if (activePanel === 'elements') return (
      <>
        <p className="panel-kicker">Shapes</p>
        <div className="element-grid">
          <button onClick={addRect}><Square size={30} /><span>Rectangle</span></button>
          <button onClick={addCircle}><Circle size={30} /><span>Circle</span></button>
          <button onClick={addTriangle}><Triangle size={30} /><span>Triangle</span></button>
          <button onClick={addLine}><LineIcon size={30} /><span>Line</span></button>
        </div>
        <p className="panel-kicker">Color</p>
        <label className="color-row">Element color <input type="color" value={fillColor} onChange={(event) => { setFillColor(event.target.value); if (selectedObject) updateObject('fill', event.target.value); }} /></label>
      </>
    );
    if (activePanel === 'text') return (
      <>
        <p className="panel-kicker">Add text</p>
        <button className="add-text-button" onClick={() => addText()}><Type size={20} /><span>Add a heading</span></button>
        <button className="add-text-button body" onClick={() => addText('Add a little body text', true)}><Type size={17} /><span>Add body text</span></button>
      </>
    );
    if (activePanel === 'uploads') return (
      <>
        <p className="panel-kicker">Your uploads</p>
        <button className="upload-dropzone" onClick={() => fileInputRef.current?.click()}><ImagePlus size={28} /><strong>Upload media</strong><span>PNG, JPG, SVG</span></button>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={uploadFiles} />
        <div className="uploads-list">{uploads.map((item) => <button key={item.url} onClick={() => fabric.Image.fromURL(item.url, (image) => { image.scaleToWidth(300); image.set({ left: 300, top: 150 }); addObject(image); })}><img src={item.url} alt="" /><span>{item.name}</span></button>)}</div>
      </>
    );
    return <><p className="panel-kicker">Brand colors</p><div className="brand-swatches">{['#7c3aed', '#00c4cc', '#ff6b6b', '#f7c948', '#202124', '#ffffff'].map((color) => <button key={color} style={{ background: color }} aria-label={`Set background ${color}`} onClick={() => setCanvasBackground(color)} />)}</div></>;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">C</span><span>canva</span><small>lite</small></div>
        <div className="title-wrap"><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Design title" /><ChevronDown size={14} /></div>
        <div className="top-actions">
          <button className="icon-button" onClick={undo} title="Undo"><Undo2 size={18} /></button>
          <button className="icon-button" onClick={redo} title="Redo"><Redo2 size={18} /></button>
          <button className="share-button" onClick={() => setIsShared(true)}><Share2 size={16} /> {isShared ? 'Link copied' : 'Share'}</button>
          <button className="download-button" onClick={downloadDesign}><Download size={16} /> Export</button>
          <button className="icon-button" onClick={downloadProject} title="Download project"><FileImage size={18} /></button>
        </div>
      </header>
      <main className="workspace">
        <aside className="sidebar">
          {Object.entries(panels).map(([key, panel]) => { const Icon = panel.icon; return <button className={`side-item ${activePanel === key ? 'active' : ''}`} key={key} onClick={() => setActivePanel(key)}><Icon size={21} /><span>{panel.label}</span></button>; })}
          <div className="sidebar-bottom"><button className="side-item"><FolderOpen size={21} /><span>Projects</span></button></div>
        </aside>
        <aside className="panel"><div className="panel-heading"><h2>{panels[activePanel].label}</h2><button onClick={() => setActivePanel('templates')} aria-label="Close panel"><X size={17} /></button></div>{panelContent()}</aside>
        <section className="editor">
          <div className="editor-toolbar">
            <div className="toolbar-group"><button className="tool-button active"><MousePointer2 size={16} /> Select</button>{selectedObject && <><span className="toolbar-separator" /><button className="tool-button" onClick={duplicateSelected}><Copy size={16} /> Duplicate</button><button className="tool-button" onClick={deleteSelected}><Trash2 size={16} /> Delete</button></>}</div>
            {textSelected && <div className="toolbar-group text-tools"><select value={selectedObject.fontFamily || 'Arial'} onChange={(event) => updateObject('fontFamily', event.target.value)}><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Courier New</option></select><input aria-label="Font size" type="number" min="8" max="180" value={selectedObject.fontSize || 16} onChange={(event) => updateObject('fontSize', Number(event.target.value))} /><button onClick={() => updateObject('fontWeight', selectedObject.fontWeight === '700' ? '400' : '700')}><strong>B</strong></button><button onClick={() => updateObject('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}><Italic size={16} /></button><button onClick={() => updateObject('underline', !selectedObject.underline)}><Underline size={16} /></button><button onClick={() => updateObject('textAlign', 'left')}><AlignLeft size={16} /></button><button onClick={() => updateObject('textAlign', 'center')}><AlignCenter size={16} /></button><button onClick={() => updateObject('textAlign', 'right')}><AlignRight size={16} /></button></div>}
            <div className="toolbar-group zoom-controls"><button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}><Minus size={15} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(1, zoom + 0.1))}><Plus size={15} /></button></div>
          </div>
          <div className="canvas-stage"><div className="canvas-frame"><canvas ref={canvasRef} /></div></div>
          <div className="editor-footer"><span>Page {currentPage} of {pages.length}</span><span>Tip: use Ctrl/Cmd + D to duplicate</span><div className="footer-actions"><label className="background-control">Background <input type="color" value={background} onChange={(event) => setCanvasBackground(event.target.value)} /></label><button onClick={() => selectPage(Math.max(1, currentPage - 1))}><ChevronDown size={15} className="rotate-left" /></button><button onClick={() => selectPage(Math.min(pages.length, currentPage + 1))}><ChevronDown size={15} className="rotate-right" /></button></div></div>
          <div className="pages-strip">{pages.map((page) => <button className={page.id === currentPage ? 'page-thumb active' : 'page-thumb'} key={page.id} onClick={() => selectPage(page.id)}><span>{page.id}</span><small>{page.label}</small></button>)}<button className="add-page" onClick={addPage}><Plus size={17} /> Add page</button></div>
        </section>
        <aside className="properties"><div className="panel-heading"><h2>Design details</h2></div>{selectedObject ? <div className="property-content"><p className="panel-kicker">Selected element</p><label>Color<input type="color" value={selectedObject.fill || fillColor} onChange={(event) => updateObject('fill', event.target.value)} /></label><div className="property-pair"><label>X<input type="number" value={Math.round(selectedObject.left || 0)} onChange={(event) => updateObject('left', Number(event.target.value))} /></label><label>Y<input type="number" value={Math.round(selectedObject.top || 0)} onChange={(event) => updateObject('top', Number(event.target.value))} /></label></div><div className="property-pair"><label>Width<input type="number" value={Math.round(selectedObject.getScaledWidth())} onChange={(event) => updateObject('scaleX', Number(event.target.value) / selectedObject.width)} /></label><label>Height<input type="number" value={Math.round(selectedObject.getScaledHeight())} onChange={(event) => updateObject('scaleY', Number(event.target.value) / selectedObject.height)} /></label></div><button className="danger-button" onClick={deleteSelected}><Trash2 size={16} /> Delete element</button></div> : <div className="empty-properties"><Palette size={24} /><p>Select an element to see its properties.</p></div>}</aside>
      </main>
    </div>
  );
}

export default App;
