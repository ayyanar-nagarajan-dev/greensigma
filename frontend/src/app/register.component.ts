import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="box">
      <h2>Register</h2>
      <div class="error" *ngIf="error">{{ error }}</div>
      <label>Name</label><input [(ngModel)]="form.name" name="name" />
      <label>Email</label><input type="email" [(ngModel)]="form.email" name="email" />
      <label>Password (min 6)</label><input type="password" [(ngModel)]="form.password" name="password" />
      <button (click)="submit()" style="width:100%">Create account</button>
      <p>Already registered? <a routerLink="/login">Login</a></p>
    </div>
  `,
})
export class RegisterComponent {
  form = { name: '', email: '', password: '' };
  error = '';
  constructor(private auth: AuthService, private router: Router) {}
  submit() {
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (e) => (this.error = e.error?.message || 'Registration failed'),
    });
  }
}
