import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartamentoListComponent } from './departamento-list.component';

describe('DepartamentoListComponent', () => {
  let component: DepartamentoListComponent;
  let fixture: ComponentFixture<DepartamentoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartamentoListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartamentoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
