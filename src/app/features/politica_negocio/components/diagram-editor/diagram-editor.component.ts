import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { DiagramService } from '../../services/diagram.service';
import * as go from 'gojs';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

const MINLENGTH = 200;
const MINBREADTH = 20;

function computeMinPoolSize(pool: go.Group) {
    let len = MINLENGTH;
    pool.memberParts.each(lane => {
        if (!(lane instanceof go.Group)) return;
        const holder = lane.placeholder;
        if (holder !== null) {
            len = Math.max(len, holder.actualBounds.height);
        }
    });
    return new go.Size(NaN, len);
}

function computeMinLaneSize(lane: go.Group) {
    if (!lane.isSubGraphExpanded) return new go.Size(1, MINLENGTH);
    return new go.Size(MINBREADTH, MINLENGTH);
}

function computeLaneSize(lane: go.Group) {
    const sz = computeMinLaneSize(lane);
    if (lane.isSubGraphExpanded) {
        const holder = lane.placeholder;
        if (holder !== null) {
            const hsz = holder.actualBounds;
            sz.width = Math.ceil(Math.max(sz.width, hsz.width));
        }
    }
    const hdr = lane.findObject('HEADER');
    if (hdr !== null) sz.width = Math.ceil(Math.max(sz.width, hdr.actualBounds.width));
    return sz;
}

function relayoutDiagram(diagram: go.Diagram) {
    diagram.layout.invalidateLayout();
    diagram.findTopLevelGroups().each(g => {
        if (g.category === 'Pool' && g.layout) g.layout.invalidateLayout();
    });
    diagram.layoutDiagram();
}

class LaneResizingTool extends go.ResizingTool {
    isLengthening() { return this.handle!.alignment === go.Spot.Bottom; }
    override computeMinSize() {
        const lane = this.adornedObject!.part as go.Group;
        const msz = computeMinLaneSize(lane);
        if (this.isLengthening()) {
            const sz = computeMinPoolSize(lane.containingGroup!);
            msz.height = Math.max(msz.height, sz.height);
        } else {
            const sz = computeLaneSize(lane);
            msz.width = Math.max(msz.width, sz.width);
            msz.height = Math.max(msz.height, sz.height);
        }
        return msz;
    }
    override resize(newr: go.Rect) {
        const lane = this.adornedObject!.part as go.Group;
        if (this.isLengthening()) {
            lane.containingGroup!.memberParts.each(l => {
                if (!(l instanceof go.Group)) return;
                const shape = l.resizeObject;
                if (shape !== null) shape.height = newr.height;
            });
        } else {
            super.resize(newr);
        }
        relayoutDiagram(this.diagram);
    }
}

class PoolLayout extends go.GridLayout {
    constructor() {
        super();
        this.cellSize = new go.Size(1, 1);
        this.wrappingColumn = Infinity;
        this.wrappingWidth = Infinity;
        this.alignment = go.GridAlignment.Position;
        this.comparer = (a: go.Part, b: go.Part) => {
            const ax = a.location.x;
            const bx = b.location.x;
            if (isNaN(ax) || isNaN(bx)) return 0;
            if (ax < bx) return -1;
            if (ax > bx) return 1;
            return 0;
        };
        this.boundsComputation = (part, layout, rect) => {
            part.getDocumentBounds(rect);
            rect.inflate(-1, -1);
            return rect;
        };
    }
    override doLayout(coll: go.Diagram | go.Group | go.Iterable<go.Part>) {
        const diagram = this.diagram;
        if (diagram === null) return;
        diagram.startTransaction('PoolLayout');
        const pool = this.group;
        if (pool !== null && pool.category === 'Pool') {
            const minsize = computeMinPoolSize(pool);
            pool.memberParts.each(lane => {
                if (!(lane instanceof go.Group)) return;
                if (lane.category !== 'Pool') {
                    const shape = lane.resizeObject;
                    if (shape !== null) {
                        const sz = computeLaneSize(lane);
                        shape.width = !isNaN(shape.width) ? Math.max(shape.width, sz.width) : sz.width;
                        shape.height = isNaN(shape.height) ? minsize.height : Math.max(shape.height, minsize.height);
                        const cell = lane.resizeCellSize;
                        if (!isNaN(shape.width) && !isNaN(cell.width) && cell.width > 0) shape.width = Math.ceil(shape.width / cell.width) * cell.width;
                        if (!isNaN(shape.height) && !isNaN(cell.height) && cell.height > 0) shape.height = Math.ceil(shape.height / cell.height) * cell.height;
                    }
                }
            });
        }
        super.doLayout(coll);
        diagram.commitTransaction('PoolLayout');
    }
}

function stayInGroup(part: go.Part, pt: go.Point, gridpt: go.Point) {
    const grp = part.containingGroup;
    if (grp === null) return pt;
    const back = grp.resizeObject;
    if (back === null) return pt;
    if (part.diagram!.lastInput.shift) return pt;
    const r = back.getDocumentBounds();
    const b = part.actualBounds;
    const loc = part.location;
    const m = grp.placeholder!.padding as go.Margin;
    const x = Math.max(r.x + m.left, Math.min(pt.x, r.right - m.right - b.width - 1)) + (loc.x - b.x);
    const y = Math.max(r.y + m.top, Math.min(pt.y, r.bottom - m.bottom - b.height - 1)) + (loc.y - b.y);
    return new go.Point(x, y);
}

function groupStyle(grp: go.Group) {
    grp.layerName = 'Background';
    grp.background = 'transparent';
    grp.movable = true;
    grp.copyable = false;
    grp.avoidable = false;
    grp.minLocation = new go.Point(-Infinity, NaN);
    grp.maxLocation = new go.Point(Infinity, NaN);
    grp.bindTwoWay('location', 'loc', go.Point.parse, go.Point.stringify);
}

function updateCrossLaneLinks(group: go.Group) {
    group.findExternalLinksConnected().each(l => {
        l.visible = l.fromNode!.isVisible() && l.toNode!.isVisible();
    });
}

@Component({
  selector: 'app-diagram-editor',
  standalone: true,
  templateUrl: './diagram-editor.component.html',
  styleUrls: ['./diagram-editor.component.css']
})
export class DiagramEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('diagramDiv', { static: true }) diagramDiv!: ElementRef;
  private myDiagram!: go.Diagram;
  private isApplyingRemoteChange = false;
  private nodeCounter = 100;

  private updatesSubject = new Subject<string>();
  private updatesSub!: Subscription;
  private wsSub!: Subscription;

  constructor(private diagramService: DiagramService) {}

  ngOnInit() {
    this.updatesSub = this.updatesSubject.pipe(
      debounceTime(800)
    ).subscribe(json => {
      this.diagramService.sendDiagramUpdate('1', json);
    });

    this.wsSub = this.diagramService.getDiagramUpdates().subscribe(json => {
       if (!this.myDiagram) return;
       this.isApplyingRemoteChange = true;
       const savedPos = this.myDiagram.position; 
       this.myDiagram.model = go.Model.fromJson(json);
       
       this.myDiagram.delayInitialization(() => {
           this.relayoutLanes();
           this.myDiagram.position = savedPos;
           this.updateNodeCounter(json);
           setTimeout(() => { this.isApplyingRemoteChange = false; }, 400);
       });
    });
  }

  ngAfterViewInit() {
      this.myDiagram = new go.Diagram(this.diagramDiv.nativeElement, {
          resizingTool: new LaneResizingTool(),
          layout: new PoolLayout(),
          mouseDragOver: e => {
              if (!e.diagram.selection.all(n => n instanceof go.Group)) {
                  e.diagram.currentCursor = 'not-allowed';
              }
          },
          mouseDrop: e => {
              if (!e.diagram.selection.all(n => n instanceof go.Group)) {
                  e.diagram.currentTool.doCancel();
              }
          },
          'commandHandler.copiesGroupKey': true,
          SelectionMoved: e => relayoutDiagram(e.diagram),
          SelectionCopied: e => relayoutDiagram(e.diagram),
          'animationManager.isEnabled': false,
          'undoManager.isEnabled': true
      });

      this.myDiagram.nodeTemplate =
          new go.Node('Auto', { dragComputation: stayInGroup })
              .bindTwoWay('location', 'loc', go.Point.parse, go.Point.stringify)
              .add(
                  new go.Shape('Rectangle', { fill: 'white', portId: '', cursor: 'pointer', fromLinkable: true, toLinkable: true }),
                  new go.TextBlock({ margin: 5 }).bind('text', 'key')
              );

      this.myDiagram.groupTemplateMap.add('Lane',
          new go.Group('Vertical')
              .apply(groupStyle)
              .set({
                  selectionObjectName: 'SHAPE',
                  resizable: true,
                  resizeObjectName: 'SHAPE',
                  layout: new go.LayeredDigraphLayout({
                      isInitial: false, isOngoing: false,
                      direction: 90, columnSpacing: 10,
                      layeringOption: go.LayeredDigraphLayering.LongestPathSource
                  }),
                  computesBoundsAfterDrag: true,
                  computesBoundsIncludingLinks: false,
                  computesBoundsIncludingLocation: true,
                  handlesDragDropForMembers: true,
                  mouseDrop: (e, grp: any) => {
                      if (!e.shift) return;
                      if (!e.diagram.selection.any(n => n instanceof go.Group)) {
                          const ok = grp.addMembers(grp.diagram.selection, true);
                          if (ok) updateCrossLaneLinks(grp);
                          else grp.diagram.currentTool.doCancel();
                      } else {
                          e.diagram.currentTool.doCancel();
                      }
                  },
                  subGraphExpandedChanged: (grp: any) => {
                      const shp = grp.resizeObject;
                      if (grp.diagram.undoManager.isUndoingRedoing) return;
                      if (grp.isSubGraphExpanded) {
                          shp.width = grp.data.savedBreadth;
                      } else {
                          if (!isNaN(shp.width)) grp.diagram.model.set(grp.data, 'savedBreadth', shp.width);
                          shp.width = NaN;
                      }
                      updateCrossLaneLinks(grp);
                  }
              })
              .bindTwoWay('isSubGraphExpanded', 'expanded')
              .add(
                  new go.Panel('Horizontal', { name: 'HEADER', angle: 0, alignment: go.Spot.Center })
                      .add(
                          new go.Panel('Horizontal')
                              .bindObject('visible', 'isSubGraphExpanded')
                              .add(
                                  new go.Shape('Diamond', { width: 8, height: 8, fill: 'white' }).bind('fill', 'color'),
                                  new go.TextBlock({ font: 'bold 13pt sans-serif', editable: true, margin: new go.Margin(2, 0, 0, 0) })
                                      .bindTwoWay('text')
                              ),
                          go.GraphObject.build('SubGraphExpanderButton', { margin: 5 })
                      ),
                  new go.Panel('Auto')
                      .add(
                          new go.Shape('Rectangle', { name: 'SHAPE', fill: 'white' })
                              .bind('fill', 'color')
                              .bindTwoWay('desiredSize', 'size', go.Size.parse, go.Size.stringify),
                          new go.Placeholder({ padding: 12, alignment: go.Spot.TopLeft }),
                          new go.TextBlock({ name: 'LABEL', font: 'bold 13pt sans-serif', editable: true, angle: 90, alignment: go.Spot.TopLeft, margin: new go.Margin(4, 0, 0, 2) })
                              .bindObject('visible', 'isSubGraphExpanded', (e:any) => !e)
                              .bindTwoWay('text')
                      )
              )
      );

      this.myDiagram.groupTemplateMap.get('Lane')!.resizeAdornmentTemplate =
          new go.Adornment('Spot')
              .add(
                  new go.Placeholder(),
                  new go.Shape({ alignment: go.Spot.Bottom, desiredSize: new go.Size(50, 7), fill: 'lightblue', stroke: 'dodgerblue', cursor: 'row-resize' })
                      .bindObject('visible', '', (ad:any) => ad.adornedPart && ad.adornedPart.isSubGraphExpanded),
                  new go.Shape({ alignment: go.Spot.Right, desiredSize: new go.Size(7, 50), fill: 'lightblue', stroke: 'dodgerblue', cursor: 'col-resize' })
                      .bindObject('visible', '', (ad:any) => ad.adornedPart && ad.adornedPart.isSubGraphExpanded)
              );

      this.myDiagram.groupTemplateMap.add('Pool',
          new go.Group('Auto')
              .apply(groupStyle)
              .set({
                  layout: new PoolLayout()
              })
              .add(
                  new go.Shape({ fill: 'white' }).bind('fill', 'color'),
                  new go.Panel('Table', { defaultRowSeparatorStroke: 'black' })
                      .add(
                          new go.Panel('Horizontal', { row: 0, angle: 0 })
                              .add(new go.TextBlock({ font: 'bold 16pt sans-serif', editable: true, margin: new go.Margin(2, 0, 0, 0) }).bindTwoWay('text')),
                          new go.Placeholder({ row: 1 })
                      )
              )
      );

      this.myDiagram.linkTemplate =
          new go.Link({ routing: go.Routing.AvoidsNodes, corner: 5, relinkableFrom: true, relinkableTo: true })
              .add(
                  new go.Shape(),
                  new go.Shape({ toArrow: 'Standard' })
              );

      // Cargar base
      this.diagramService.getBaseDiagram('Diagrama Muestra').subscribe(data => {
          this.myDiagram.model = go.Model.fromJson(data);
          this.myDiagram.delayInitialization(() => {
              this.relayoutLanes();
          });
      });

      // Emission events
      this.myDiagram.addModelChangedListener((e) => {
          if (e.isTransactionFinished && !this.isApplyingRemoteChange) {
              const obj: any = e.object;
              if (obj && (obj['name'] === "Initial Layout" || obj['name'] === "Layout" || obj['name'] === "PoolLayout")) {
                  return;
              }
              this.updatesSubject.next(this.myDiagram.model.toJson());
          }
      });
  }

  ngOnDestroy() {
      if (this.updatesSub) this.updatesSub.unsubscribe();
      if (this.wsSub) this.wsSub.unsubscribe();
  }

  public relayoutLanes() {
      if (!this.myDiagram) return;
      this.myDiagram.nodes.each(lane => {
          if (!(lane instanceof go.Group)) return;
          if (lane.category === 'Pool') return;
          if (lane.layout) lane.layout.isValidLayout = false;
      });
      this.myDiagram.layoutDiagram();
  }

  private updateNodeCounter(jsonStr: string) {
      try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.nodeDataArray) {
              parsed.nodeDataArray.forEach((n:any) => {
                  const key = String(n.key);
                  const match = key.match(/^(?:node_|lane_)(\d+)$/);
                  if (match) {
                      this.nodeCounter = Math.max(this.nodeCounter, parseInt(match[1]));
                  }
              });
          }
      } catch (_) { }
  }

  public addActivity() {
      const lane = this.getSelectedLane();
      if (!lane) {
          console.warn('Selecciona un carril antes de agregar una actividad.');
          return;
      }
      this.myDiagram.startTransaction('add activity');
      const newKey = 'node_' + (++this.nodeCounter);
      this.myDiagram.model.addNodeData({
          key: newKey,
          text: 'Actividad',
          group: lane.data.key
      });
      if (lane.layout) lane.layout.isValidLayout = false;
      this.myDiagram.commitTransaction('add activity');
  }

  public addLane() {
      let poolKey: any = null;
      this.myDiagram.findTopLevelGroups().each(g => {
          if (g.category === 'Pool') poolKey = g.data.key;
      });
      if (!poolKey) {
          alert('No se encontró un Pool en el diagrama.');
          return;
      }
      this.myDiagram.startTransaction('add lane');
      const newLaneKey = 'lane_' + (++this.nodeCounter);
      const newLaneData = {
          key: newLaneKey,
          text: 'Nuevo Carril',
          isGroup: true,
          category: 'Lane',
          group: poolKey,
          color: 'lightcyan'
      };
      this.myDiagram.model.addNodeData(newLaneData);
      this.myDiagram.commitTransaction('add lane');
      this.relayoutLanes();
  }

  private getSelectedLane(): go.Group | null {
      if (!this.myDiagram) return null;
      const sel = this.myDiagram.selection.first();
      if (!sel) return null;
      if (sel instanceof go.Node && !(sel instanceof go.Group)) {
          const grp = sel.containingGroup;
          if (grp && grp.category === 'Lane') return grp;
      }
      if (sel instanceof go.Group && sel.category === 'Lane') return sel;
      return null;
  }
}
