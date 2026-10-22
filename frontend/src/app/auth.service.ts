import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

export const API = 'https://greensigma.onrender.com';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  get token() { return localStorage.getItem('token'); }
  get isLoggedIn() { return !!this.token; }
  get isAdmin() { return this.userSubject.value?.role === 'admin'; }

  register(data: any) { return this.http.post(`${API}/auth/register`, data); }

  login(data: any) {
    return this.http.post<any>(`${API}/auth/login`, data).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        this.setUser(res.user);
      })
    );
  }

  me() { return this.http.get<any>(`${API}/me`).pipe(tap((u) => this.setUser(u))); }

  private setUser(u: any) {
    localStorage.setItem('user', JSON.stringify(u));
    this.userSubject.next(u);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }
}
