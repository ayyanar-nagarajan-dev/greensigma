import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <nav>
      <span class="brand">MEAN Subscriptions</span>
      <ng-container *ngIf="auth.user$ | async as user; else guest">
        <a routerLink="/home">Home</a>
        <a routerLink="/admin" *ngIf="user.role === 'admin'">Admin</a>
        <span class="spacer"></span>
        <span>{{ user.name }}</span>
        <button class="link" (click)="logout()">Logout</button>
      </ng-container>
      <ng-template #guest>
        <span class="spacer"></span>
        <a routerLink="/login">Login</a>
        <a routerLink="/register">Register</a>
      </ng-template>
    </nav>
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
