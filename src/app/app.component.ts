import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagramComponent } from './diagram.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DiagramComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'politica-negocio-frontend';
}
