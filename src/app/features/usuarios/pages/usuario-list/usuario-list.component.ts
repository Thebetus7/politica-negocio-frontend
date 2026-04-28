import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Departamento, DepartamentoService } from '../../../../core/services/departamento.service';
import { FuncionarioDepaService } from '../../../../core/services/funcionario-depa.service';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-list.component.html',
})
export class UsuarioListComponent implements OnInit, OnDestroy {
  usrService = inject(UsuarioService);
  private departamentoService = inject(DepartamentoService);
  private funcionarioDepaService = inject(FuncionarioDepaService);
  private fb = inject(FormBuilder);

  showModal = signal(false);
  departamentos = signal<Departamento[]>([]);
  private roleSub?: Subscription;

  usrForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['', Validators.required],
    departamentoId: [''],
  });

  ngOnInit() {
    this.usrService.getAll().subscribe();
    this.departamentoService.getAll().subscribe((deps) =>
      this.departamentos.set(
        deps
          .map((dep: any) => ({
            id: dep.id ?? dep._id ?? '',
            nombre: dep.nombre ?? '',
          }))
          .filter((dep) => !!dep.id && !!dep.nombre)
      )
    );

    this.roleSub = this.usrForm.get('rol')?.valueChanges.subscribe((rol) => {
      const depaCtrl = this.usrForm.get('departamentoId');
      if (!depaCtrl) return;

      if (this.isFuncionarioRole(rol)) {
        depaCtrl.setValidators([Validators.required]);
      } else {
        depaCtrl.clearValidators();
        depaCtrl.setValue('');
      }
      depaCtrl.updateValueAndValidity();
    });
  }

  ngOnDestroy() {
    this.roleSub?.unsubscribe();
  }

  openModal() {
    this.usrForm.reset({ rol: '', departamentoId: '' });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  getSelectedRole(): string {
    return String(this.usrForm.get('rol')?.value ?? '').trim();
  }

  isFuncionarioSelected(): boolean {
    return this.isFuncionarioRole(this.getSelectedRole());
  }

  onSubmit() {
    if (this.usrForm.invalid) return;

    const selectedRole = this.getSelectedRole();
    const selectedDepartamentoId = this.usrForm.value.departamentoId;
    const payload = {
      nombre: this.usrForm.value.nombre,
      correo: this.usrForm.value.correo,
      password: this.usrForm.value.password,
      rol: selectedRole,
    };

    this.usrService.create(payload as any).subscribe({
      next: (createdUser) => {
        if (this.isFuncionarioRole(selectedRole) && createdUser.id && selectedDepartamentoId) {
          this.funcionarioDepaService.create({
            userId: createdUser.id,
            departamentoId: selectedDepartamentoId,
          }).subscribe({
            next: () => this.closeModal(),
            error: () => alert('Usuario creado, pero fallo la asignacion al departamento.'),
          });
          return;
        }
        this.closeModal();
      },
    });
  }

  deleteUsr(id: string) {
    if (confirm('Estas seguro de eliminar este usuario? Perdera acceso inmediatamente.')) {
      this.usrService.delete(id).subscribe();
    }
  }

  private isFuncionarioRole(role: unknown): boolean {
    const value = String(role ?? '').trim();
    return value === 'FUNCIONARIO' || value === 'ROLE_FUNCIONARIO';
  }
}
