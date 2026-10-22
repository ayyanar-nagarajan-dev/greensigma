import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="box">
      <h2>Login</h2>
      <div class="error" *ngIf="error">{{ error }}</div>
      <label>Email</label><input type="email" [(ngModel)]="form.email" name="email" />
      <label>Password</label><input type="password" [(ngModel)]="form.password" name="password" (keyup.enter)="submit()" />
      <button (click)="submit()" style="width:100%">Login</button>
      <p>No account? <a routerLink="/register">Register</a></p>
    </div>
  `,
})
export class LoginComponent {
  form = { email: '', password: '' };
  error = '';
  constructor(private auth: AuthService, private router: Router) {}
  submit() {
    this.auth.login(this.form).subscribe({
      next: (res) => this.router.navigate([res.user.role === 'admin' ? '/admin' : '/home']),
      error: (e) => (this.error = e.error?.message || 'Login failed'),
    });
  }
}
