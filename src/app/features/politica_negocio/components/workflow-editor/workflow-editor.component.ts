import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ActividadService, Actividad } from '../../../../core/services/actividad.service';
import { FlujoService, Flujo } from '../../../../core/services/flujo.service';
import { DepartamentoService } from '../../../../core/services/departamento.service';
import { FormularioService, Formulario } from '../../../../core/services/formulario.service';
import { FuncionarioDepaService } from '../../../../core/services/funcionario-depa.service';
import { PoliticaService } from '../../../../core/services/politica.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FormUpdateService } from '../../../../core/services/form-update.service';
import { DiagramService } from '../../services/diagram.service';

// ──────── Interfaces internas ────────
interface WorkflowNode {
  id: string;
  tempId: string;
  // Tipos usados por UI del editor
  // - actividad: tarea normal
  // - decision: condición (rama)
  // - pregunta: iterativo (un solo tipo de caja de pregunta)
  // - inicio / fin
  tipo: string; // actividad | decision | pregunta | inicio | fin
  nombre: string;
  x: number;
  y: number;
  departamentoId: string;
  formularioId?: string;
  formularioNombre?: string;
  funcionarioId?: string;
  funcionarioNombre?: string;
  estado?: string;
  width: number;
  height: number;
}

interface WorkflowLink {
  id: string;
  sourceId: string;
  targetId: string;
  // Se mantiene para compatibilidad con el backend (Flujo.proceso.tipo)
  tipo: string; // secuencial | alternativo | iterativo_while | paralelo
  label?: string;
  condicion?: string;
}

interface RemoteCursor {
  userId: string;
  nombre: string;
  x: number;
  y: number;
  color: string;
}

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.css']
})
export class WorkflowEditorComponent implements OnInit, OnDestroy {
  // Servicios
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private actividadService = inject(ActividadService);
  private flujoService = inject(FlujoService);
  private departamentoService = inject(DepartamentoService);
  private formularioService = inject(FormularioService);
  private funcionarioDepaService = inject(FuncionarioDepaService);
  private politicaService = inject(PoliticaService);
  private authService = inject(AuthService);
  private formUpdateService = inject(FormUpdateService);
  private diagramService = inject(DiagramService);

  @ViewChild('svgCanvas', { static: true }) svgCanvas!: ElementRef<SVGSVGElement>;

  // Estado
  politicaId = '';
  politicaNombre = '';
  nodes = signal<WorkflowNode[]>([]);
  links = signal<WorkflowLink[]>([]);
  departamentos = signal<any[]>([]);
  formularios = signal<Formulario[]>([]);
  remoteCursors = signal<RemoteCursor[]>([]);

  // UI
  selectedNode = signal<WorkflowNode | null>(null);
  selectedLink = signal<WorkflowLink | null>(null);
  isDragging = false;
  dragNode: WorkflowNode | null = null;
  dragOffset = { x: 0, y: 0 };
  isPanning = false;
  panStart = { x: 0, y: 0 };
  viewBox = { x: 0, y: 0, w: 2400, h: 1200 };
  zoom = 1;

  // Conexión temporal
  isConnecting = false;
  connectionSource: WorkflowNode | null = null;
  connectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };

  // Funcionarios por departamento (cache)
  funcionariosByDepa = signal<Map<string, any[]>>(new Map());

  // Panel de propiedades
  showPropertiesPanel = signal(false);
  editNodeName = '';
  editNodeFormId = '';
  editNodeFuncId = '';
  editNodeDepaId = '';


  // Color del cursor local
  cursorColor = this.getRandomColor();

  // Suscripciones
  private subs: Subscription[] = [];

  // Lane layout
  laneWidth = 250;
  laneHeaderHeight = 50;
  canvasHeight = 1200;

  // Nodo dimensions por tipo
  nodeDimensions: Record<string, { w: number; h: number }> = {
    actividad: { w: 200, h: 100 },
    decision: { w: 120, h: 120 },
    pregunta: { w: 150, h: 90 },
    inicio: { w: 60, h: 60 },
    fin: { w: 60, h: 60 },
  };

  ngOnInit(): void {
    this.politicaId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.politicaId) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Cargar datos
    this.loadPolitica();
    this.loadDepartamentos();
    this.loadFormularios();
    this.loadActividades();
    this.loadFlujos();

    // WebSocket
    this.diagramService.connectToDiagram(this.politicaId);
    this.subs.push(
      this.diagramService.getDiagramUpdates().subscribe(data => this.handleRemoteUpdate(data)),
      this.diagramService.getCursorUpdates().subscribe(data => this.handleCursorUpdate(data))
    );
  }

  ngOnDestroy(): void {
    this.diagramService.disconnect();
    this.subs.forEach(s => s.unsubscribe());
  }

  // ──────── Carga de datos ────────
  private loadPolitica(): void {
    this.politicaService.getById(this.politicaId).subscribe(p => {
      this.politicaNombre = p.nombre;
    });
  }

  private loadDepartamentos(): void {
    this.departamentoService.getAll().subscribe((depas: any[]) => {
      this.departamentos.set(depas);
      this.viewBox.w = Math.max(2400, depas.length * this.laneWidth + 100);
    });
  }

  private loadFormularios(): void {
    this.formularioService.getAll().subscribe();
    this.formularios = this.formularioService.formularios;
  }

  private loadActividades(): void {
    this.actividadService.getByPolitica(this.politicaId).subscribe(actividades => {
      const mapped: WorkflowNode[] = actividades.map(a => ({
        id: a.id!,
        tempId: a.id!,
        tipo: this.normalizeTipoNodo(a.tipoNodo || 'actividad'),
        nombre: a.nombre,
        x: parseFloat(a.ejeX) || 100,
        y: parseFloat(a.ejeY) || 100,
        departamentoId: a.departamentoId,
        estado: a.estado,
        formularioId: undefined,
        width: this.nodeDimensions[this.normalizeTipoNodo(a.tipoNodo || 'actividad')]?.w || 200,
        height: this.nodeDimensions[this.normalizeTipoNodo(a.tipoNodo || 'actividad')]?.h || 100,
      }));
      this.nodes.set(mapped);
      this.hydrateFormAssignments(mapped);
    });
  }

  private loadFlujos(): void {
    this.flujoService.getByPolitica(this.politicaId).subscribe(flujos => {
      const mapped: WorkflowLink[] = flujos.map(f => ({
        id: f.id!,
        sourceId: f.actividadId,
        targetId: f.proceso?.['siguientes']?.[0]?.['actividadDestinoId'] || '',
        tipo: f.proceso?.['tipo'] || 'secuencial',
        label: f.proceso?.['siguientes']?.[0]?.['label'] || '',
        condicion: f.proceso?.['condicion'] || '',
      }));
      this.links.set(mapped);
    });
  }

  // ──────── Toolbar: Añadir nodos ────────
  addNode(tipo: string): void {
    const depas = this.departamentos();
    if (depas.length === 0) return;

    const dims = this.nodeDimensions[tipo] || { w: 200, h: 100 };
    const depa = depas[0];
    const laneIndex = depas.indexOf(depa);
    const x = laneIndex * this.laneWidth + this.laneWidth / 2 - dims.w / 2 + 50;
    const y = this.laneHeaderHeight + 80;

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const newNode: WorkflowNode = {
      id: '',
      tempId,
      tipo,
      nombre: this.getDefaultName(tipo),
      x,
      y,
      departamentoId: depa.id,
      width: dims.w,
      height: dims.h,
    };

    this.nodes.update(list => [...list, newNode]);

    // Persistir
    const actividad: Actividad = {
      politicaId: this.politicaId,
      departamentoId: depa.id,
      nombre: newNode.nombre,
      estado: 'pendiente',
      ejeX: String(newNode.x),
      ejeY: String(newNode.y),
      tipoNodo: this.persistTipoNodo(tipo),
    };
    this.actividadService.create(this.politicaId, actividad).subscribe(saved => {
      this.nodes.update(list =>
        list.map(n => n.tempId === tempId ? { ...n, id: saved.id! } : n)
      );
      this.broadcastUpdate();
    });
  }

  private getDefaultName(tipo: string): string {
    const names: Record<string, string> = {
      actividad: 'Nueva Actividad',
      decision: '¿Condición?',
      pregunta: '¿Pregunta?',
      inicio: 'Inicio',
      fin: 'Fin'
    };
    return names[tipo] || 'Nodo';
  }

  // ──────── Drag & Drop nodos ────────
  onNodeMouseDown(event: MouseEvent, node: WorkflowNode): void {
    event.preventDefault();
    event.stopPropagation();
    // Shift + drag: conectar libremente desde cualquier punto del nodo
    if (event.shiftKey) {
      this.startConnection(node, event);
      return;
    }
    if (this.isConnecting) return;
    this.isDragging = true;
    this.dragNode = node;
    const pt = this.screenToSvg(event.clientX, event.clientY);
    this.dragOffset = { x: pt.x - node.x, y: pt.y - node.y };
  }

  onSvgMouseMove(event: MouseEvent): void {
    const pt = this.screenToSvg(event.clientX, event.clientY);

    // Enviar cursor con throttle
    this.throttledSendCursor(pt.x, pt.y);

    if (this.isDragging && this.dragNode) {
      const newX = pt.x - this.dragOffset.x;
      const newY = Math.max(this.laneHeaderHeight + 10, pt.y - this.dragOffset.y);
      this.dragNode.x = newX;
      this.dragNode.y = newY;

      // Detectar lane (departamento)
      const depas = this.departamentos();
      const laneIndex = Math.floor((newX + this.dragNode.width / 2 - 50) / this.laneWidth);
      if (laneIndex >= 0 && laneIndex < depas.length) {
        this.dragNode.departamentoId = depas[laneIndex].id;
      }

      this.nodes.update(list => [...list]);
    }

    if (this.isConnecting && this.connectionSource) {
      this.connectionLine.x2 = pt.x;
      this.connectionLine.y2 = pt.y;
    }

    if (this.isPanning) {
      const dx = (event.clientX - this.panStart.x) / this.zoom;
      const dy = (event.clientY - this.panStart.y) / this.zoom;
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this.panStart = { x: event.clientX, y: event.clientY };
    }
  }

  onSvgMouseUp(event: MouseEvent): void {
    if (this.isDragging && this.dragNode) {
      // Persistir posición
      if (this.dragNode.id) {
        const actividad: Actividad = {
          politicaId: this.politicaId,
          departamentoId: this.dragNode.departamentoId,
          nombre: this.dragNode.nombre,
          ejeX: String(this.dragNode.x),
          ejeY: String(this.dragNode.y),
          tipoNodo: this.dragNode.tipo,
        };
        this.actividadService.update(this.politicaId, this.dragNode.id, actividad).subscribe(() => {
          this.broadcastUpdate();
        });
      }
      this.isDragging = false;
      this.dragNode = null;
    }
    this.isPanning = false;

    if (this.isConnecting) {
      this.cancelConnection();
    }
  }

  // ──────── Pan & Zoom ────────
  onSvgMouseDown(event: MouseEvent): void {
    if (event.button === 1 || event.button === 2) { // Middle or right click
      event.preventDefault();
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY };
    }
  }

  onSvgWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    this.zoom *= factor;
    this.zoom = Math.max(0.3, Math.min(3, this.zoom));
    this.viewBox.w = 2400 / this.zoom;
    this.viewBox.h = 1200 / this.zoom;
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  // ──────── Conexiones ────────
  startConnection(node: WorkflowNode, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isConnecting = true;
    this.connectionSource = node;
    const pt = this.screenToSvg(event.clientX, event.clientY);
    this.connectionLine = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
  }

  endConnection(targetNode: WorkflowNode): void {
    if (!this.isConnecting || !this.connectionSource || this.connectionSource.tempId === targetNode.tempId) {
      this.cancelConnection();
      return;
    }

    const computedTipo = this.computeLinkTipo(this.connectionSource);
    const label = this.computeLinkLabel(this.connectionSource, computedTipo);

    const newLink: WorkflowLink = {
      id: '',
      sourceId: this.connectionSource.id || this.connectionSource.tempId,
      targetId: targetNode.id || targetNode.tempId,
      tipo: computedTipo,
      label,
    };

    this.links.update(list => [...list, newLink]);

    // Persistir flujo
    if (this.connectionSource.id && targetNode.id) {
      const flujo: Flujo = {
        politicaId: this.politicaId,
        actividadId: this.connectionSource.id,
        proceso: {
          tipo: computedTipo,
          siguientes: [{ actividadDestinoId: targetNode.id, label: newLink.label }],
          estadoActual: 'pendiente',
          orden: this.links().length
        }
      };
      this.flujoService.create(this.politicaId, flujo).subscribe(saved => {
        this.links.update(list =>
          list.map(l => l === newLink ? { ...l, id: saved.id! } : l)
        );
        this.broadcastUpdate();
      });
    }

    this.cancelConnection();
  }

  onNodeMouseUp(event: MouseEvent, node: WorkflowNode): void {
    // Si estamos conectando, cerrar conexión sobre el nodo destino
    // y evitar que el mouseup burbujee al canvas.
    if (this.isConnecting) {
      event.stopPropagation();
      this.endConnection(node);
    }
  }

  cancelConnection(): void {
    this.isConnecting = false;
    this.connectionSource = null;
  }

  // ──────── Selección ────────
  selectNode(node: WorkflowNode): void {
    this.selectedNode.set(node);
    this.selectedLink.set(null);
    this.editNodeName = node.nombre;
    this.editNodeFormId = node.formularioId || '';
    this.editNodeFuncId = node.funcionarioId || '';
    this.editNodeDepaId = node.departamentoId || '';

    // Cargar funcionarios del departamento del nodo
    if (node.departamentoId) {
      this.loadFuncionariosForDepa(node.departamentoId);
    }
  }

  selectLink(link: WorkflowLink): void {
    this.selectedLink.set(link);
    this.selectedNode.set(null);
  }

  clearSelection(): void {
    this.selectedNode.set(null);
    this.selectedLink.set(null);
  }

  onCanvasClick(): void {
    if (!this.isDragging && !this.isConnecting) {
      this.clearSelection();
    }
  }

  onNodeContextMenu(event: MouseEvent, node: WorkflowNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectNode(node);
    this.showPropertiesPanel.set(!this.showPropertiesPanel());
  }

  // ──────── Propiedades del nodo ────────
  updateNodeProperties(persist: boolean = true): void {
    const node = this.selectedNode();
    if (!node) return;

    node.nombre = this.editNodeName;
    node.formularioId = this.editNodeFormId || undefined;
    node.funcionarioId = this.editNodeFuncId || undefined;

    // Buscar nombre del formulario
    if (this.editNodeFormId) {
      const form = this.formularios().find(f => f.id === this.editNodeFormId);
      node.formularioNombre = form?.nombre;
    } else {
      node.formularioNombre = undefined;
    }

    this.nodes.update(list => [...list]);

    // Persistir
    if (persist && node.id) {
      this.persistNodeAndFormUpdate(node);
    }
  }

  private persistNodeAndFormUpdate(node: WorkflowNode): void {
    const applyActividadUpdate = (formUpdateId?: string) => {
      const actividad: Actividad = {
        politicaId: this.politicaId,
        departamentoId: node.departamentoId,
        nombre: node.nombre,
        ejeX: String(node.x),
        ejeY: String(node.y),
        tipoNodo: this.persistTipoNodo(node.tipo),
        formUpdateId
      };
      this.actividadService.update(this.politicaId, node.id, actividad).subscribe(() => {
        this.broadcastUpdate();
      });
    };

    if (!node.id) return;

    if (!node.formularioId) {
      applyActividadUpdate(undefined);
      return;
    }

    this.formUpdateService.getByActividad(node.id).subscribe(existing => {
      const current = existing[0];
      const payload = {
        actividadId: node.id!,
        formularioId: node.formularioId!,
        contenidoUpdate: current?.contenidoUpdate || '{}'
      };

      if (current?.id) {
        this.formUpdateService.update(current.id, payload).subscribe(updated => {
          applyActividadUpdate(updated.id);
        });
        return;
      }

      this.formUpdateService.create(payload).subscribe(created => {
        applyActividadUpdate(created.id);
      });
    });
  }

  onDepartmentChange(event: any): void {
    const node = this.selectedNode();
    const depaId = event.target.value;
    if (node && depaId) {
      const depas = this.departamentos();
      const laneIndex = depas.findIndex(d => d.id === depaId);
      if (laneIndex >= 0) {
        node.departamentoId = depaId;
        // Mover el nodo al centro del lane
        node.x = this.getLaneX(laneIndex) + (this.laneWidth / 2) - (node.width / 2);
        this.nodes.update(list => [...list]);
        this.updateNodeProperties(true);
      }
    }
  }

  updateLinkProperties(): void {
    const link = this.selectedLink();
    if (!link || !link.id) return;

    const flujo: Flujo = {
      politicaId: this.politicaId,
      actividadId: link.sourceId,
      proceso: {
        tipo: link.tipo,
        siguientes: [{ actividadDestinoId: link.targetId, label: link.label, condicion: link.condicion }],
        condicion: link.condicion,
      }
    };
    this.flujoService.update(this.politicaId, link.id, flujo).subscribe(() => {
      this.broadcastUpdate();
    });
  }

  // ──────── Eliminar ────────
  deleteNode(node: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (confirm(`¿Estás seguro de eliminar el nodo "${node.nombre}"?`)) {
      this.selectedNode.set(node);
      this.deleteSelected();
    }
  }

  deleteSelected(): void {
    const node = this.selectedNode();
    if (node) {
      if (node.id) {
        this.actividadService.softDelete(this.politicaId, node.id).subscribe(() => {
          this.nodes.update(list => list.filter(n => n.tempId !== node.tempId));
          // Eliminar links asociados
          this.links.update(list => list.filter(l => l.sourceId !== node.id && l.targetId !== node.id));
          this.broadcastUpdate();
        });
      } else {
        this.nodes.update(list => list.filter(n => n.tempId !== node.tempId));
      }
      this.clearSelection();
      return;
    }

    const link = this.selectedLink();
    if (link) {
      if (link.id) {
        this.flujoService.softDelete(this.politicaId, link.id).subscribe(() => {
          this.links.update(list => list.filter(l => l !== link));
          this.broadcastUpdate();
        });
      } else {
        this.links.update(list => list.filter(l => l !== link));
      }
      this.clearSelection();
    }
  }

  // ──────── Funcionarios por departamento ────────
  private loadFuncionariosForDepa(depaId: string): void {
    const cache = this.funcionariosByDepa();
    if (cache.has(depaId)) return;

    this.funcionarioDepaService.getByDepartamento(depaId).subscribe(list => {
      this.funcionariosByDepa.update(map => {
        const newMap = new Map(map);
        newMap.set(depaId, list);
        return newMap;
      });
    });
  }

  getFuncionariosForSelectedNode(): any[] {
    const node = this.selectedNode();
    if (!node) return [];
    return this.funcionariosByDepa().get(node.departamentoId) || [];
  }

  // ──────── SVG helpers ────────
  screenToSvg(clientX: number, clientY: number): { x: number; y: number } {
    const svg = this.svgCanvas?.nativeElement;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return {
      x: this.viewBox.x + (clientX - rect.left) * (this.viewBox.w / rect.width),
      y: this.viewBox.y + (clientY - rect.top) * (this.viewBox.h / rect.height),
    };
  }

  getViewBoxString(): string {
    return `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`;
  }

  // Path de conexión tipo Bézier
  getLinkPath(link: WorkflowLink): string {
    const source = this.nodes().find(n => n.id === link.sourceId || n.tempId === link.sourceId);
    const target = this.nodes().find(n => n.id === link.targetId || n.tempId === link.targetId);
    if (!source || !target) return '';

    const from = this.getAnchorPoint(source, target);
    const to = this.getAnchorPoint(target, source);
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;
    const cx = (x1 + x2) / 2;

    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }

  getLinkMidpoint(link: WorkflowLink): { x: number; y: number } {
    const source = this.nodes().find(n => n.id === link.sourceId || n.tempId === link.sourceId);
    const target = this.nodes().find(n => n.id === link.targetId || n.tempId === link.targetId);
    if (!source || !target) return { x: 0, y: 0 };
    return {
      x: (source.x + source.width / 2 + target.x + target.width / 2) / 2,
      y: (source.y + source.height / 2 + target.y + target.height / 2) / 2 - 10,
    };
  }

  getLinkColor(tipo: string): string {
    const colors: Record<string, string> = {
      secuencial: '#3b82f6',
      alternativo: '#f59e0b',
      iterativo_while: '#10b981',
      paralelo: '#8b5cf6',
    };
    return colors[tipo] || '#64748b';
  }

  getNodeColor(tipo: string): string {
    const colors: Record<string, string> = {
      actividad: '#6366f1',
      decision: '#f59e0b',
      pregunta: '#10b981',
      inicio: '#22c55e',
      fin: '#ef4444',
    };
    return colors[tipo] || '#6366f1';
  }

  getNodeIcon(tipo: string): string {
    const icons: Record<string, string> = {
      actividad: '📋', decision: '◇', pregunta: '?', inicio: '▶', fin: '⬛'
    };
    return icons[tipo] || '📋';
  }

  getLaneX(index: number): number {
    return 50 + index * this.laneWidth;
  }

  getLaneColor(index: number): string {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
    return colors[index % colors.length];
  }

  // ──────── WebSocket ────────
  private broadcastUpdate(): void {
    this.diagramService.sendDiagramUpdate({
      type: 'full_sync',
      nodes: this.nodes(),
      links: this.links(),
    });
  }

  private handleRemoteUpdate(data: any): void {
    if (data.type === 'full_sync') {
      // Recargar del servidor para evitar conflictos
      this.loadActividades();
      this.loadFlujos();
    }
  }

  private handleCursorUpdate(data: any): void {
    const currentUser = this.authService.currentUser();
    if (data.userId === currentUser?.id) return; // Ignorar propio cursor

    this.remoteCursors.update(cursors => {
      const existing = cursors.findIndex(c => c.userId === data.userId);
      if (existing >= 0) {
        cursors[existing] = data;
        return [...cursors];
      }
      return [...cursors, data];
    });

    // Limpiar cursores inactivos (>10s sin actualización)
    setTimeout(() => {
      this.remoteCursors.update(cursors =>
        cursors.filter(c => c.userId !== data.userId || c === data)
      );
    }, 10000);
  }

  private lastCursorSend = 0;
  private throttledSendCursor(x: number, y: number): void {
    const now = Date.now();
    if (now - this.lastCursorSend < 100) return; // 100ms throttle
    this.lastCursorSend = now;
    const user = this.authService.currentUser();
    if (user) {
      this.diagramService.sendCursorPosition({
        userId: user.id,
        nombre: user.nombre,
        x, y,
        color: this.cursorColor
      });
    }
  }

  // ──────── Guardar diagrama completo ────────
  saveDiagram(): void {
    // Todas las actividades y flujos ya se persisten individualmente.
    // Este botón fuerza un broadcast a todos los usuarios conectados.
    this.broadcastUpdate();
    alert('Diagrama guardado correctamente');
  }

  // ──────── Volver ────────
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // ──────── Utilidades ────────
  private getRandomColor(): string {
    const colors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  trackByNode(index: number, node: WorkflowNode): string {
    return node.tempId;
  }

  trackByLink(index: number, link: WorkflowLink): string {
    return link.id || `${link.sourceId}-${link.targetId}`;
  }

  trackByDepa(index: number, depa: any): string {
    return depa.id;
  }

  // ──────── Normalización / compatibilidad ────────
  private normalizeTipoNodo(tipoNodo: string): string {
    // Unificamos while/do-while a un solo nodo de pregunta
    if (tipoNodo === 'while_do' || tipoNodo === 'do_while') return 'pregunta';
    // fork/join quedan “deprecados”; se renderizan como actividad normal
    if (tipoNodo === 'fork' || tipoNodo === 'join') return 'actividad';
    return tipoNodo;
  }

  private persistTipoNodo(tipo: string): string {
    // Para mantener compatibilidad con backend, persistimos "pregunta" como while_do
    if (tipo === 'pregunta') return 'while_do';
    return tipo;
  }

  private hydrateFormAssignments(nodes: WorkflowNode[]): void {
    nodes
      .filter(n => !!n.id && n.tipo === 'actividad')
      .forEach(node => {
        this.formUpdateService.getByActividad(node.id).subscribe(updates => {
          const first = updates[0];
          if (!first?.formularioId) return;

          const form = this.formularios().find(f => f.id === first.formularioId);
          this.nodes.update(list =>
            list.map(n => n.id === node.id
              ? {
                  ...n,
                  formularioId: first.formularioId,
                  formularioNombre: form?.nombre
                }
              : n)
          );
        });
      });
  }

  // ──────── Links: tipo y label auto ────────
  private computeLinkTipo(source: WorkflowNode): string {
    if (source.tipo === 'decision') return 'alternativo';
    if (source.tipo === 'pregunta') return 'iterativo_while';

    const sourceKey = source.id || source.tempId;
    const outgoingCount = this.links().filter(l => l.sourceId === sourceKey).length;
    if (outgoingCount >= 1) return 'paralelo';
    return 'secuencial';
  }

  private computeLinkLabel(source: WorkflowNode, tipo: string): string {
    if (tipo !== 'alternativo') return '';
    const sourceKey = source.id || source.tempId;
    const outgoingCount = this.links().filter(l => l.sourceId === sourceKey && l.tipo === 'alternativo').length;
    return outgoingCount === 0 ? 'Sí' : 'No';
  }

  // ──────── Anchors: conectar donde sea ────────
  private getAnchorPoint(from: WorkflowNode, towards: WorkflowNode): { x: number; y: number } {
    const fx = from.x + from.width / 2;
    const fy = from.y + from.height / 2;
    const tx = towards.x + towards.width / 2;
    const ty = towards.y + towards.height / 2;

    const dx = tx - fx;
    const dy = ty - fy;
    if (dx === 0 && dy === 0) return { x: fx, y: fy };

    // Aproximamos por caja (funciona bien para rect/hex/diamond/circle a nivel visual)
    const halfW = from.width / 2;
    const halfH = from.height / 2;
    const scale = 1 / Math.max(Math.abs(dx) / (halfW || 1), Math.abs(dy) / (halfH || 1));
    return { x: fx + dx * scale, y: fy + dy * scale };
  }
}
