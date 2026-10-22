import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API } from './auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Admin Panel – Users ({{ users.length }})</h2>
      <div class="error" *ngIf="error">{{ error }}</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Logins</th><th>Last login</th><th>Subscription</th><th>Expires</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.role }}</td>
              <td>{{ u.loginCount }}</td>
              <td>{{ u.lastLogin ? (u.lastLogin | date: 'short') : '-' }}</td>
              <td>{{ u.subscription?.plan ? u.subscription.plan + ' (₹' + u.subscription.amount + ')' : 'None' }}</td>
              <td>{{ u.subscription?.expiresAt ? (u.subscription.expiresAt | date: 'mediumDate') : '-' }}</td>
              <td><button class="danger" *ngIf="u.role !== 'admin'" (click)="remove(u)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  users: any[] = [];
  error = '';
  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  load() { this.http.get<any[]>(`${API}/admin/users`).subscribe((u) => (this.users = u)); }
  remove(u: any) {
    if (!confirm(`Delete ${u.name} (${u.email})?`)) return;
    this.http.delete(`${API}/admin/users/${u._id}`).subscribe({
      next: () => this.load(),
      error: (e) => (this.error = e.error?.message || 'Delete failed'),
    });
  }
}
