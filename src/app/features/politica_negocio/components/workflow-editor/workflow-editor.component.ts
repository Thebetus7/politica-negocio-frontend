import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ActividadService, Actividad } from '../../../../core/services/actividad.service';
import { FlujoService, Flujo } from '../../../../core/services/flujo.service';
import { DepartamentoService } from '../../../../core/services/departamento.service';
import { FormularioService, Formulario } from '../../../../core/services/formulario.service';
import { FormularioBuilderComponent } from '../../../formularios/components/formulario-builder/formulario-builder.component';
import { FuncionarioDepaService } from '../../../../core/services/funcionario-depa.service';
import { PoliticaService } from '../../../../core/services/politica.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FormUpdateService } from '../../../../core/services/form-update.service';
import { DiagramService } from '../../services/diagram.service';
import { LogPoliticaService } from '../../../../core/services/log-politica.service';

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
  // Campos extra para structured_activity
  loopText?: string;
  setupText?: string;
  testText?: string;
  bodyText?: string;
  // Campos para Object y DataStore
  subNombre?: string;
  /** while_do | do_while — nodo pregunta */
  iterativoTipo?: 'while_do' | 'do_while';
  /** Condición mostrada en decision / pregunta */
  condicion?: string;
  /** Actividad a la que retorna el bucle (nodo pregunta) */
  retornoActividadId?: string;
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
  imports: [CommonModule, FormsModule, FormularioBuilderComponent],
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.css']
})
export class WorkflowEditorComponent implements OnInit, AfterViewInit, OnDestroy {
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
  private logPoliticaService = inject(LogPoliticaService);

  @ViewChild('svgCanvas', { static: true }) svgCanvas!: ElementRef<SVGSVGElement>;
  @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>;

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

  // ── ESTADO DE REDIMENSIONAMIENTO (Resize) ──
  isResizing = false;
  resizingNode: WorkflowNode | null = null;
  resizeStartSize = { w: 0, h: 0 };
  resizeStartPos = { x: 0, y: 0 };

  // Funcionarios por departamento (cache)
  funcionariosByDepa = signal<Map<string, any[]>>(new Map());

  // Panel de propiedades
  showPropertiesPanel = signal(false);
  editNodeName = '';
  editNodeFormId = '';
  editNodeFuncId = '';
  editNodeDepaId = '';
  // Campos editables para structured_activity
  editLoopText = '';
  editSetupText = '';
  editTestText = '';
  editBodyText = '';
  // Campos editables para datastore
  editSubNombre = '';
  editIterativoTipo: 'while_do' | 'do_while' = 'while_do';
  editCondicion = '';

  /** Estado del último compile de LogPolitica */
  flujoValido = signal<boolean | null>(null);
  flujoVersion = signal<number | null>(null);
  flujoMensaje = signal<string>('');
  flujoJson = signal<Record<string, unknown> | null>(null);
  ultimoFlujoValidoJson = signal<Record<string, unknown> | null>(null);
  ultimoFlujoValidoVersion = signal<number | null>(null);
  showFlujoModal = signal(false);
  modalFlujoJson = signal<Record<string, unknown> | null>(null);
  modalFlujoVersion = signal<number | null>(null);
  modalEsIncompleto = signal(false);

  /** Valor especial en el select de formulario */
  readonly FORM_CREATE_OPTION = '__create__';
  showFormularioBuilder = signal(false);
  formularioBuilderInicial = signal<Formulario | null>(null);

  // Color del cursor local
  cursorColor = this.getRandomColor();

  // Suscripciones
  private subs: Subscription[] = [];
  private resizeObserver?: ResizeObserver;
  private isSyncingScroll = false;
  private initialCenterApplied = false;
  private refreshFlujoTimer?: ReturnType<typeof setTimeout>;
  private dragDepaInicio?: string;

  // Lane layout
  private readonly defaultLaneWidth = 250;
  private readonly laneStartX = 50;
  laneWidths: number[] = [];
  laneHeaderHeight = 50;
  canvasHeight = 1200;

  worldWidth = computed(() =>
    Math.max(2400, this.laneWidths.reduce((s, w) => s + w, 0) + 200)
  );
  worldHeight = computed(() => Math.max(this.canvasHeight + 200, 1500));

  private laneHover: { kind: 'width' | 'height'; index?: number } | null = null;
  private laneResize: {
    kind: 'width' | 'height';
    index?: number;
    startVal: number;
    startPt: { x: number; y: number };
  } | null = null;

  // Nodo dimensions por tipo
  nodeDimensions: Record<string, { w: number; h: number }> = {
    actividad: { w: 200, h: 100 },
    decision: { w: 120, h: 120 },
    pregunta: { w: 150, h: 90 },
    inicio: { w: 60, h: 60 },
    fin: { w: 60, h: 60 },
    send: { w: 140, h: 60 },
    receive: { w: 140, h: 60 },
    synch: { w: 60, h: 60 },
    flow_final: { w: 60, h: 60 },
    region: { w: 400, h: 300 },
    excepcion: { w: 160, h: 70 },
    structured_activity: { w: 400, h: 350 },
    object: { w: 180, h: 90 },
    datastore: { w: 180, h: 90 },
    fork_horizontal: { w: 120, h: 10 },
    fork_vertical: { w: 10, h: 120 },
    time_event: { w: 80, h: 80 },
    comment: { w: 180, h: 80 },
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
    this.loadFlujoEstado();

    // WebSocket
    this.diagramService.connectToDiagram(this.politicaId);
    this.subs.push(
      this.diagramService.getDiagramUpdates().subscribe(data => this.handleRemoteUpdate(data)),
      this.diagramService.getCursorUpdates().subscribe(data => this.handleCursorUpdate(data))
    );
  }

  ngAfterViewInit(): void {
    this.updateViewBoxSize();
    this.resizeObserver = new ResizeObserver(() => this.updateViewBoxSize());
    if (this.canvasWrapper?.nativeElement) {
      this.resizeObserver.observe(this.canvasWrapper.nativeElement);
    }
    requestAnimationFrame(() => this.tryInitialLaneCentering());
  }

  ngOnDestroy(): void {
    if (this.refreshFlujoTimer) {
      clearTimeout(this.refreshFlujoTimer);
    }
    this.resizeObserver?.disconnect();
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
      this.laneWidths = depas.map(() => this.defaultLaneWidth);
      requestAnimationFrame(() => this.tryInitialLaneCentering());
    });
  }

  private loadFormularios(): void {
    this.formularioService.getAll().subscribe();
    this.formularios = this.formularioService.formularios;
  }

  private loadActividades(): void {
    this.actividadService.getByPolitica(this.politicaId).subscribe(actividades => {
      const mapped: WorkflowNode[] = actividades.map(a => {
        const tipo = this.normalizeTipoNodo(a.tipoNodo || 'actividad');
        const newNode: WorkflowNode = {
          id: a.id!,
          tempId: a.id!,
          tipo: tipo,
          nombre: a.nombre,
          x: parseFloat(a.ejeX) || 100,
          y: parseFloat(a.ejeY) || 100,
          departamentoId: a.departamentoId,
          estado: a.estado,
          formularioId: undefined,
          width: a.width ? parseInt(a.width) : (this.nodeDimensions[tipo]?.w || 200),
          height: a.height ? parseInt(a.height) : (this.nodeDimensions[tipo]?.h || 100),
        };

        // Si es structured_activity, cargar textos desde el JSON en 'estado'
        if (tipo === 'structured_activity') {
          let data: any = {};
          if (typeof a.estado === 'string') {
            try {
              data = JSON.parse(a.estado);
            } catch (e) {
              console.error('Error parseando estado para structured_activity:', e);
            }
          } else if (typeof a.estado === 'object' && a.estado !== null) {
            data = a.estado;
          }
          
          newNode.loopText = data.loop || '«loop»';
          newNode.setupText = data.setup || '[Setup]';
          newNode.testText = data.test || '[Test]';
          newNode.bodyText = data.body || '[Body]';
        } else if (tipo === 'datastore') {
          let data: any = {};
          if (typeof a.estado === 'string') {
            try { data = JSON.parse(a.estado); } catch (e) {}
          } else if (typeof a.estado === 'object' && a.estado !== null) {
            data = a.estado;
          }
          newNode.subNombre = data.subNombre || '«datastore»';
        } else if (tipo === 'pregunta') {
          const data = this.parseNodeEstadoMeta(a.estado);
          newNode.iterativoTipo = data.iterativoTipo === 'do_while' ? 'do_while' : 'while_do';
          newNode.condicion = data.condicion || newNode.nombre;
          newNode.retornoActividadId = data.retornoActividadId;
        } else if (tipo === 'decision') {
          const data = this.parseNodeEstadoMeta(a.estado);
          newNode.condicion = data.condicion || newNode.nombre;
        }
        return newNode;
      });
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
    const x = this.getLaneX(laneIndex) + this.getLaneWidth(laneIndex) / 2 - dims.w / 2;
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

    if (tipo === 'structured_activity') {
      newNode.loopText = '«loop»';
      newNode.setupText = '[Setup]';
      newNode.testText = '[Test]';
      newNode.bodyText = '[Body]';
    }

    if (tipo === 'pregunta') {
      newNode.iterativoTipo = 'while_do';
      newNode.condicion = '¿Pregunta?';
    }

    if (tipo === 'decision') {
      newNode.condicion = '¿Condición?';
    }

    if (tipo === 'datastore') {
      newNode.subNombre = '«datastore»';
    }

    this.nodes.update(list => [...list, newNode]);
    this.selectNode(newNode);

    // Persistir
    let initialEstado = 'pendiente';
    if (tipo === 'structured_activity') {
      initialEstado = JSON.stringify({
        loop: newNode.loopText,
        setup: newNode.setupText,
        test: newNode.testText,
        body: newNode.bodyText
      });
    } else if (tipo === 'datastore') {
      initialEstado = JSON.stringify({
        subNombre: newNode.subNombre
      });
    } else if (tipo === 'pregunta') {
      initialEstado = JSON.stringify({
        iterativoTipo: newNode.iterativoTipo || 'while_do',
        condicion: newNode.condicion || newNode.nombre
      });
    } else if (tipo === 'decision') {
      initialEstado = JSON.stringify({
        condicion: newNode.condicion || newNode.nombre
      });
    }

    const actividad: Actividad = {
      politicaId: this.politicaId,
      departamentoId: depa.id,
      nombre: newNode.nombre,
      estado: initialEstado,
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
      fin: 'Fin',
      send: 'Enviar',
      receive: 'Recibir',
      synch: 'Sincronizar',
      flow_final: 'Flujo Final',
      region: 'Región',
      excepcion: 'Excepción',
      fork_horizontal: 'Barra H',
      fork_vertical: 'Barra V',
      object: 'Objeto',
      datastore: 'Data Store',
      time_event: 'Espera (UML)',
      comment: 'Nota...',
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
    if (this.isResizing) return; // No arrastrar si estamos redimensionando
    
    this.isDragging = true;
    this.dragNode = node;
    this.dragDepaInicio = node.departamentoId;
    const pt = this.screenToSvg(event.clientX, event.clientY);
    this.dragOffset = { x: pt.x - node.x, y: pt.y - node.y };
  }

  /** Inicio de redimensionamiento */
  onResizeMouseDown(event: MouseEvent, node: WorkflowNode): void {
    event.preventDefault();
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.isDragging = false; // Asegurar que no arrastramos
    this.dragNode = null;
    this.resizingNode = node;
    const pt = this.screenToSvg(event.clientX, event.clientY);
    this.resizeStartPos = { x: pt.x, y: pt.y };
    this.resizeStartSize = { w: node.width || 300, h: node.height || 200 };
  }

  onSvgMouseMove(event: MouseEvent): void {
    const pt = this.screenToSvg(event.clientX, event.clientY);

    // Enviar cursor con throttle
    this.throttledSendCursor(pt.x, pt.y);

    if (this.laneResize) {
      if (this.laneResize.kind === 'width' && this.laneResize.index !== undefined) {
        const dx = pt.x - this.laneResize.startPt.x;
        this.laneWidths[this.laneResize.index] = Math.max(100, this.laneResize.startVal + dx);
        this.laneWidths = [...this.laneWidths];
      } else if (this.laneResize.kind === 'height') {
        const dy = pt.y - this.laneResize.startPt.y;
        this.canvasHeight = Math.max(300, this.laneResize.startVal + dy);
      }
      return;
    }

    if (this.isDragging && this.dragNode) {
      const newX = pt.x - this.dragOffset.x;
      const newY = Math.max(this.laneHeaderHeight + 10, pt.y - this.dragOffset.y);
      this.dragNode.x = newX;
      this.dragNode.y = newY;

      // Detectar lane (departamento)
      const depas = this.departamentos();
      const centerX = newX + this.dragNode.width / 2;
      const laneIndex = this.getLaneIndexAtX(centerX);
      if (laneIndex >= 0 && laneIndex < depas.length) {
        this.dragNode.departamentoId = depas[laneIndex].id;
      }

      this.nodes.update(list => [...list]);
    }

    // Manejar resizing
    if (this.isResizing && this.resizingNode) {
      const dx = pt.x - this.resizeStartPos.x;
      const dy = pt.y - this.resizeStartPos.y;
      
      const newW = Math.max(100, this.resizeStartSize.w + dx);
      const newH = Math.max(50, this.resizeStartSize.h + dy);
      
      // Actualizamos las propiedades del objeto para que persistan hasta el mouseUp
      this.resizingNode.width = newW;
      this.resizingNode.height = newH;
      
      // Forzamos la actualización de la señal para que se vea el cambio en tiempo real
      this.nodes.update(list => [...list]);
    }

    if (this.isConnecting && this.connectionSource) {
      this.connectionLine.x2 = pt.x;
      this.connectionLine.y2 = pt.y;
    }

    if (this.isPanning) {
      const rect = this.svgCanvas.nativeElement.getBoundingClientRect();
      const dx = (event.clientX - this.panStart.x) * (this.viewBox.w / rect.width);
      const dy = (event.clientY - this.panStart.y) * (this.viewBox.h / rect.height);
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this.panStart = { x: event.clientX, y: event.clientY };
      this.syncScrollFromViewBox();
    }

    if (!this.isDragging && !this.isResizing && !this.isPanning && !this.isConnecting) {
      this.laneHover = this.detectLaneEdge(pt);
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
        const poolChanged = this.dragDepaInicio !== this.dragNode.departamentoId;
        this.actividadService.update(this.politicaId, this.dragNode.id, actividad).subscribe(() => {
          this.broadcastUpdate();
          if (poolChanged) {
            this.refreshFlujoEstado();
          }
        });
      }
      this.isDragging = false;
      this.dragNode = null;
      this.dragDepaInicio = undefined;
    }

    if (this.isResizing && this.resizingNode) {
      // Persistir el cambio de tamaño en la DB directamente
      this.persistNodeAndFormUpdate(this.resizingNode);
      this.broadcastUpdate();
      this.isResizing = false;
      this.resizingNode = null;
    }

    if (this.laneResize) {
      this.laneResize = null;
      this.laneHover = null;
    }

    this.isPanning = false;

    if (this.isConnecting) {
      this.cancelConnection();
    }
  }

  // ──────── Pan & Zoom ────────
  onSvgMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      const pt = this.screenToSvg(event.clientX, event.clientY);
      const edge = this.detectLaneEdge(pt);
      if (edge) {
        event.preventDefault();
        this.laneResize = {
          kind: edge.kind,
          index: edge.index,
          startVal: edge.kind === 'width' && edge.index !== undefined
            ? this.laneWidths[edge.index]
            : this.canvasHeight,
          startPt: { x: pt.x, y: pt.y },
        };
        return;
      }
    }

    if (event.button === 1 || event.button === 2) { // Middle or right click
      event.preventDefault();
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY };
    }
  }

  onSvgWheel(event: WheelEvent): void {
    event.preventDefault();
    const before = this.screenToSvg(event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(0.3, Math.min(3, this.zoom * factor));
    if (newZoom === this.zoom) return;

    this.zoom = newZoom;
    const rect = this.svgCanvas.nativeElement.getBoundingClientRect();
    this.viewBox.w = rect.width / this.zoom;
    this.viewBox.h = rect.height / this.zoom;

    const after = this.screenToSvg(event.clientX, event.clientY);
    this.viewBox.x += before.x - after.x;
    this.viewBox.y += before.y - after.y;
    this.syncScrollFromViewBox();
  }

  onWrapperScroll(event: Event): void {
    if (this.isSyncingScroll) return;
    const el = event.target as HTMLElement;
    this.viewBox.x = el.scrollLeft / this.zoom;
    this.viewBox.y = el.scrollTop / this.zoom;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!this.selectedNode() && !this.selectedLink()) return;
    event.preventDefault();
    this.deleteSelected();
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

    const validationError = this.validateConnection(this.connectionSource, targetNode);
    if (validationError) {
      this.showConnectionError(validationError);
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
        this.persistPreguntaRetornoAfterConnection(this.connectionSource!, targetNode);
        this.broadcastUpdate();
        this.refreshFlujoEstado();
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
    
    if (node.tipo === 'structured_activity') {
      this.editLoopText = node.loopText ?? '«loop»';
      this.editSetupText = node.setupText ?? '[Setup]';
      this.editTestText = node.testText ?? '[Test]';
      this.editBodyText = node.bodyText ?? '[Body]';
    } else {
      // Limpiar para otros nodos
      this.editLoopText = '';
      this.editSetupText = '';
      this.editTestText = '';
      this.editBodyText = '';
    }
    
    if (node.tipo === 'datastore') {
      this.editSubNombre = node.subNombre ?? '«datastore»';
    } else {
      this.editSubNombre = '';
    }

    if (node.tipo === 'pregunta') {
      this.editIterativoTipo = node.iterativoTipo ?? 'while_do';
      this.editCondicion = node.condicion ?? node.nombre ?? '¿Pregunta?';
    } else {
      this.editIterativoTipo = 'while_do';
      this.editCondicion = '';
    }

    if (node.tipo === 'decision') {
      this.editCondicion = node.condicion ?? node.nombre ?? '¿Condición?';
    }
    
    this.showPropertiesPanel.set(true);

    // Cargar funcionarios del departamento del nodo
    if (node.departamentoId) {
      this.loadFuncionariosForDepa(node.departamentoId);
    }
  }

  selectLink(link: WorkflowLink): void {
    this.selectedLink.set(link);
    this.selectedNode.set(null);
    this.showPropertiesPanel.set(true);
  }

  clearSelection(): void {
    this.selectedNode.set(null);
    this.selectedLink.set(null);
    this.showPropertiesPanel.set(false);
  }

  onCanvasClick(): void {
    if (!this.isDragging && !this.isConnecting) {
      this.clearSelection();
    }
  }

  onNodeContextMenu(event: MouseEvent, node: WorkflowNode): void {
    event.preventDefault();
    this.selectNode(node);
  }

  onFormularioSelectChange(value: string): void {
    if (value === this.FORM_CREATE_OPTION) {
      this.abrirCrearFormularioEnActividad();
      return;
    }
    this.editNodeFormId = value;
    this.updateNodeProperties(true);
  }

  abrirCrearFormularioEnActividad(): void {
    const node = this.selectedNode();
    const nombreSugerido = node?.nombre?.trim()
      ? `Formulario — ${node.nombre.trim()}`
      : '';
    this.formularioBuilderInicial.set(
      nombreSugerido
        ? { nombre: nombreSugerido, descripcion: '', campos: [] }
        : null
    );
    this.showFormularioBuilder.set(true);
  }

  cerrarFormularioBuilder(): void {
    this.showFormularioBuilder.set(false);
    this.formularioBuilderInicial.set(null);
    this.editNodeFormId = this.selectedNode()?.formularioId || '';
  }

  onFormularioCreadoDesdeActividad(form: Formulario): void {
    this.showFormularioBuilder.set(false);
    this.formularioBuilderInicial.set(null);
    this.formularioService.getAll().subscribe();
    if (form.id) {
      this.editNodeFormId = form.id;
      this.updateNodeProperties(true);
    }
  }

  // ──────── Propiedades del nodo ────────
  updateNodeProperties(persist: boolean = true): void {
    const node = this.selectedNode();
    if (!node) return;

    node.nombre = this.editNodeName;
    node.formularioId = this.editNodeFormId || undefined;
    node.funcionarioId = this.editNodeFuncId || undefined;

    if (node.tipo === 'structured_activity') {
      node.loopText = this.editLoopText;
      node.setupText = this.editSetupText;
      node.testText = this.editTestText;
      node.bodyText = this.editBodyText;
    }

    if (node.tipo === 'datastore') {
      node.subNombre = this.editSubNombre;
    }

    if (node.tipo === 'pregunta') {
      node.iterativoTipo = this.editIterativoTipo;
      node.condicion = this.editCondicion;
    }

    if (node.tipo === 'decision') {
      node.condicion = this.editCondicion;
    }

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
        width: node.width ? String(node.width) : undefined,
        height: node.height ? String(node.height) : undefined,
        estado: this.buildEstadoForPersist(node),
        formUpdateId
      };
      this.actividadService.update(this.politicaId, node.id, actividad).subscribe(() => {
        this.broadcastUpdate();
        this.refreshFlujoEstado();
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
        node.x = this.getLaneX(laneIndex) + (this.getLaneWidth(laneIndex) / 2) - (node.width / 2);
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
      this.refreshFlujoEstado();
    });
  }

  // ──────── Eliminar ────────
  deleteNode(node: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedNode.set(node);
    this.deleteSelected();
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
          this.refreshFlujoEstado();
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
          this.refreshFlujoEstado();
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

  // Path de conexión Lineal (Recto)
  getLinkPath(link: WorkflowLink): string {
    const source = this.nodes().find(n => n.id === link.sourceId || n.tempId === link.sourceId);
    const target = this.nodes().find(n => n.id === link.targetId || n.tempId === link.targetId);
    if (!source || !target) return '';

    const from = this.getAnchorPoint(source, target);
    const to = this.getAnchorPoint(target, source);
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
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
      send: '#0ea5e9',
      receive: '#f8fafc',
      synch: '#f8fafc',
      flow_final: '#f8fafc',
      region: 'transparent',
      excepcion: '#ef4444',
      fork_horizontal: '#334155',
      fork_vertical: '#334155',
      object: '#fff7ed',
      datastore: '#fff7ed',
    };
    return colors[tipo] || '#6366f1';
  }

  getNodeIcon(tipo: string): string {
    const icons: Record<string, string> = {
      actividad: '📋',
      decision: '◇',
      pregunta: '?',
      inicio: '▶',
      fin: '⬛',
      send: '✉️',
      receive: '📥',
      synch: '🔄',
      flow_final: '🔚',
      region: '📍',
      excepcion: '⚠️',
      fork_horizontal: '⟷',
      join_horizontal: '⇆',
      fork_vertical: '⇅',
      join_vertical: '⇅',
      object: '📦',
      datastore: '🗄️',
      time_event: '⌛',
      comment: '📝',
    };
    return icons[tipo] || '📋';
  }

  getLaneX(index: number): number {
    let x = this.laneStartX;
    for (let i = 0; i < index; i++) {
      x += this.laneWidths[i];
    }
    return x;
  }

  getLaneWidth(index: number): number {
    return this.laneWidths[index] ?? this.defaultLaneWidth;
  }

  getCanvasCursor(): string {
    if (this.isResizing) return 'nwse-resize';
    if (this.isDragging || this.isPanning) return 'grabbing';
    if (this.laneResize) {
      return this.laneResize.kind === 'width' ? 'ew-resize' : 'ns-resize';
    }
    if (this.laneHover) {
      return this.laneHover.kind === 'width' ? 'ew-resize' : 'ns-resize';
    }
    return 'default';
  }

  private getLaneIndexAtX(centerX: number): number {
    for (let i = 0; i < this.laneWidths.length; i++) {
      const lx = this.getLaneX(i);
      const lw = this.laneWidths[i];
      if (centerX >= lx && centerX < lx + lw) {
        return i;
      }
    }
    return -1;
  }

  private detectLaneEdge(pt: { x: number; y: number }): { kind: 'width' | 'height'; index?: number } | null {
    if (Math.abs(pt.y - this.canvasHeight) < 6) {
      return { kind: 'height' };
    }
    for (let i = 0; i < this.laneWidths.length; i++) {
      const right = this.getLaneX(i) + this.laneWidths[i];
      if (Math.abs(pt.x - right) < 6 && pt.y >= 0 && pt.y <= this.canvasHeight) {
        return { kind: 'width', index: i };
      }
    }
    return null;
  }

  private updateViewBoxSize(): void {
    const wrapper = this.canvasWrapper?.nativeElement;
    if (!wrapper) return;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.viewBox.w = w / this.zoom;
    this.viewBox.h = h / this.zoom;
  }

  private syncScrollFromViewBox(): void {
    const wrapper = this.canvasWrapper?.nativeElement;
    if (!wrapper) return;
    this.isSyncingScroll = true;
    wrapper.scrollLeft = Math.max(0, this.viewBox.x * this.zoom);
    wrapper.scrollTop = Math.max(0, this.viewBox.y * this.zoom);
    requestAnimationFrame(() => {
      this.isSyncingScroll = false;
    });
  }

  /** Centra los swimlanes en el viewport solo una vez al cargar (no afecta zoom). */
  private tryInitialLaneCentering(): void {
    if (this.initialCenterApplied || this.laneWidths.length === 0) return;

    const wrapper = this.canvasWrapper?.nativeElement;
    if (!wrapper || wrapper.clientWidth <= 0 || wrapper.clientHeight <= 0) return;

    if (this.viewBox.w <= 0 || this.viewBox.h <= 0) {
      this.updateViewBoxSize();
    }
    if (this.viewBox.w <= 0) return;

    const totalLaneWidth = this.laneWidths.reduce((sum, width) => sum + width, 0);
    const laneCenterX = this.laneStartX + totalLaneWidth / 2;
    this.viewBox.x = laneCenterX - this.viewBox.w / 2;

    this.initialCenterApplied = true;
    this.syncScrollFromViewBox();
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
      this.refreshFlujoEstado();
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
    this.broadcastUpdate();
    this.logPoliticaService.compile(this.politicaId).subscribe({
      next: (result) => this.applyCompileResult(result),
      error: () => {
        this.flujoValido.set(false);
        this.flujoMensaje.set('Error al compilar el flujo');
      }
    });
  }

  abrirModalFlujo(): void {
    const esIncompleto = this.flujoValido() === false;
    this.modalEsIncompleto.set(esIncompleto);

    if (!esIncompleto && this.flujoJson()) {
      this.modalFlujoJson.set(this.flujoJson());
      this.modalFlujoVersion.set(this.flujoVersion());
      this.showFlujoModal.set(true);
      return;
    }

    if (!esIncompleto) {
      this.logPoliticaService.getUltimo(this.politicaId).subscribe({
        next: (log) => {
          this.modalFlujoJson.set(log.flujoJson ?? null);
          this.modalFlujoVersion.set(log.version);
          this.showFlujoModal.set(true);
        },
        error: () => {
          this.modalFlujoJson.set(null);
          this.modalFlujoVersion.set(null);
          this.showFlujoModal.set(true);
        }
      });
      return;
    }

    this.modalFlujoJson.set(this.flujoJson());
    this.modalFlujoVersion.set(this.flujoVersion());
    if (!this.ultimoFlujoValidoJson()) {
      this.logPoliticaService.getUltimo(this.politicaId).subscribe({
        next: (log) => {
          this.ultimoFlujoValidoJson.set(log.flujoJson ?? null);
          this.ultimoFlujoValidoVersion.set(log.version);
          this.showFlujoModal.set(true);
        },
        error: () => this.showFlujoModal.set(true)
      });
    } else {
      this.showFlujoModal.set(true);
    }
  }

  cerrarModalFlujo(): void {
    this.showFlujoModal.set(false);
  }

  flujoJsonTexto(json: Record<string, unknown> | null): string {
    if (!json) return '';
    return JSON.stringify(json, null, 2);
  }

  copiarFlujoJson(json: Record<string, unknown> | null): void {
    const text = this.flujoJsonTexto(json);
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => undefined);
  }

  private refreshFlujoEstado(): void {
    if (this.refreshFlujoTimer) {
      clearTimeout(this.refreshFlujoTimer);
    }
    this.refreshFlujoTimer = setTimeout(() => {
      this.logPoliticaService.compile(this.politicaId).subscribe({
        next: (result) => this.applyCompileResult(result),
        error: () => {
          this.loadFlujoEstado();
        }
      });
    }, 400);
  }

  private applyCompileResult(result: {
    valido: boolean;
    version?: number;
    mensaje?: string;
    flujoJson?: Record<string, unknown>;
  }): void {
    this.flujoValido.set(result.valido);
    this.flujoVersion.set(result.version ?? null);
    this.flujoMensaje.set(result.mensaje ?? '');

    if (result.valido && result.flujoJson) {
      this.flujoJson.set(result.flujoJson);
      this.ultimoFlujoValidoJson.set(result.flujoJson);
      this.ultimoFlujoValidoVersion.set(result.version ?? null);
    } else if (!result.valido) {
      this.flujoJson.set(null);
      this.loadUltimoFlujoValidoCache();
    }
  }

  private loadFlujoEstado(): void {
    this.logPoliticaService.getUltimo(this.politicaId).subscribe({
      next: (log) => {
        const activo = log.valido && log.funcional;
        this.flujoValido.set(activo);
        this.flujoVersion.set(log.version);
        this.flujoMensaje.set(log.mensajeValidacion ?? 'Flujo activo');
        if (activo && log.flujoJson) {
          this.flujoJson.set(log.flujoJson);
          this.ultimoFlujoValidoJson.set(log.flujoJson);
          this.ultimoFlujoValidoVersion.set(log.version);
        }
      },
      error: () => {
        this.flujoValido.set(null);
        this.flujoVersion.set(null);
        this.flujoMensaje.set('Sin flujo compilado');
        this.flujoJson.set(null);
      }
    });
  }

  private loadUltimoFlujoValidoCache(): void {
    this.logPoliticaService.getUltimo(this.politicaId).subscribe({
      next: (log) => {
        if (log.valido && log.funcional && log.flujoJson) {
          this.ultimoFlujoValidoJson.set(log.flujoJson);
          this.ultimoFlujoValidoVersion.set(log.version);
        }
      }
    });
  }

  private showConnectionError(mensaje: string): void {
    this.flujoMensaje.set(mensaje);
    alert(mensaje);
  }

  private getNodeKey(node: WorkflowNode): string {
    return node.id || node.tempId;
  }

  private findNodeByKey(key: string): WorkflowNode | undefined {
    return this.nodes().find(n => (n.id || n.tempId) === key);
  }

  private getOutgoingLinks(sourceKey: string): WorkflowLink[] {
    return this.links().filter(l => l.sourceId === sourceKey);
  }

  private validateConnection(source: WorkflowNode, target: WorkflowNode): string | null {
    const sourceKey = this.getNodeKey(source);
    const targetKey = this.getNodeKey(target);

    if (sourceKey === targetKey) {
      return 'No se puede conectar un nodo consigo mismo';
    }

    if (this.links().some(l => l.sourceId === sourceKey && l.targetId === targetKey)) {
      return 'Ya existe una conexión entre estos nodos';
    }

    if (source.tipo === 'decision') {
      if (this.getOutgoingLinks(sourceKey).length >= 2) {
        return 'La decisión solo puede tener exactamente 2 conexiones';
      }
      if (target.tipo !== 'actividad' && target.tipo !== 'fin') {
        return 'La decisión solo puede conectarse a una actividad o a Fin';
      }
      const existingTargets = this.getOutgoingLinks(sourceKey)
        .map(l => this.findNodeByKey(l.targetId))
        .filter((n): n is WorkflowNode => !!n);
      const allTargets = [...existingTargets, target];
      if (allTargets.length === 2 && allTargets.every(n => n.tipo === 'fin')) {
        return 'La decisión no puede tener ambas ramas hacia Fin';
      }
    }

    const outgoingCount = this.getOutgoingLinks(sourceKey).length;
    if (outgoingCount >= 1 && target.tipo === 'fin' && source.tipo !== 'decision' && source.tipo !== 'pregunta') {
      return 'En conexión paralela no se puede conectar directamente a Fin';
    }

    if (outgoingCount >= 1 && source.tipo === 'actividad' && target.tipo !== 'actividad') {
      return 'En conexión paralela solo se puede conectar a actividades';
    }

    if (this.wouldCreateCycleWithoutPregunta(source, target)) {
      return 'Para volver a una actividad anterior use un nodo Pregunta (while/do-while)';
    }

    return null;
  }

  private wouldCreateCycleWithoutPregunta(source: WorkflowNode, target: WorkflowNode): boolean {
    const sourceKey = this.getNodeKey(source);
    const targetKey = this.getNodeKey(target);
    if (!this.canReachFrom(targetKey, sourceKey)) {
      return false;
    }

    const cycleNodes = this.collectCycleNodes(sourceKey, targetKey);
    const hasPregunta = cycleNodes.some(id => {
      const n = this.findNodeByKey(id);
      return n?.tipo === 'pregunta';
    });
    return !hasPregunta;
  }

  private canReachFrom(fromKey: string, toKey: string): boolean {
    const visited = new Set<string>();
    const queue = [fromKey];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (!visited.add(id)) continue;
      if (id === toKey) return true;
      for (const link of this.getOutgoingLinks(id)) {
        queue.push(link.targetId);
      }
    }
    return false;
  }

  private collectCycleNodes(sourceKey: string, targetKey: string): string[] {
    const path: string[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string): string[] | null => {
      visited.add(nodeId);
      path.push(nodeId);

      for (const link of this.getOutgoingLinks(nodeId)) {
        const next = link.targetId;
        if (next === targetKey && nodeId === sourceKey) {
          return [...path, next];
        }
        if (next === sourceKey && path.includes(targetKey)) {
          const start = path.indexOf(targetKey);
          return start >= 0 ? path.slice(start) : path;
        }
        if (!visited.has(next) || next === sourceKey) {
          if (next === sourceKey) {
            const start = path.indexOf(sourceKey);
            return start >= 0 ? [...path.slice(start), next] : path;
          }
          const found = dfs(next);
          if (found) return found;
        }
      }

      path.pop();
      return null;
    };

    return dfs(targetKey) ?? [sourceKey, targetKey];
  }

  private persistPreguntaRetornoAfterConnection(source: WorkflowNode, target: WorkflowNode): void {
    if (target.tipo !== 'pregunta' || source.tipo !== 'actividad' || !target.id || !source.id) {
      return;
    }
    target.retornoActividadId = source.id;
    this.nodes.update(list =>
      list.map(n => n.id === target.id ? { ...n, retornoActividadId: source.id } : n)
    );
    this.persistNodeAndFormUpdate(target);
  }

  private parseNodeEstadoMeta(estado: unknown): {
    iterativoTipo?: string;
    condicion?: string;
    retornoActividadId?: string;
  } {
    if (!estado) return {};
    if (typeof estado === 'object' && estado !== null) {
      const o = estado as Record<string, unknown>;
      return {
        iterativoTipo: o['iterativoTipo'] as string | undefined,
        condicion: o['condicion'] as string | undefined,
        retornoActividadId: o['retornoActividadId'] as string | undefined
      };
    }
    if (typeof estado === 'string' && estado.trim().startsWith('{')) {
      try {
        return this.parseNodeEstadoMeta(JSON.parse(estado));
      } catch {
        return {};
      }
    }
    return {};
  }

  private buildEstadoForPersist(node: WorkflowNode): string {
    if (node.tipo === 'structured_activity') {
      return JSON.stringify({
        loop: node.loopText || '«loop»',
        setup: node.setupText || '[Setup]',
        test: node.testText || '[Test]',
        body: node.bodyText || '[Body]'
      });
    }
    if (node.tipo === 'datastore') {
      return JSON.stringify({ subNombre: node.subNombre || '«datastore»' });
    }
    if (node.tipo === 'pregunta') {
      const estado: Record<string, string> = {
        iterativoTipo: node.iterativoTipo || 'while_do',
        condicion: node.condicion || node.nombre
      };
      if (node.retornoActividadId) {
        estado['retornoActividadId'] = node.retornoActividadId;
      }
      return JSON.stringify(estado);
    }
    if (node.tipo === 'decision') {
      return JSON.stringify({ condicion: node.condicion || node.nombre });
    }
    return node.estado || 'pendiente';
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
    if (!tipoNodo) return 'actividad';
    const t = tipoNodo.toLowerCase().trim();
    if (t === 'while_do' || t === 'do_while') return 'pregunta';
    if (t === 'fork' || t === 'join') return 'actividad';
    if (t.includes('structured') || t.includes('estructurada')) return 'structured_activity';
    return t.replace(/\s+/g, '_');
  }

  private persistTipoNodo(tipo: string): string {
    // Guardamos el tipo real para que el editor pueda volver a cargarlo igual.
    if (tipo === 'pregunta') return 'while_do';
    if (tipo === 'structured_activity') return 'structured_activity';
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
