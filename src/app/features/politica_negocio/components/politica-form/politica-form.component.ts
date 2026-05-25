import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-politica-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './politica-form.component.html',
})
export class PoliticaFormComponent {
  @Input() show = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();

  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
    estado: ['borrador', Validators.required],
  });

  close() {
    this.form.reset({ estado: 'borrador' });
    this.onClose.emit();
  }

  submit() {
    if (this.form.valid) {
      this.onSubmit.emit(this.form.value);
    }
  }
}
