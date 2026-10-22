import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API, AuthService } from './auth.service';

declare const Razorpay: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="welcome" *ngIf="user">
        <h2>Welcome, {{ user.name }}! </h2>
        <p *ngIf="user.subscription?.plan; else none">
          Subscription: <b>{{ user.subscription.plan }}</b>
          (valid till {{ user.subscription.expiresAt | date: 'mediumDate' }})
        </p>
        <ng-template #none><p>Subscription: <b>No active subscription</b></p></ng-template>
      </div>

      <div class="ok" *ngIf="msg" style="margin-top:12px">{{ msg }}</div>

      <div class="cards">
        <div class="card" *ngFor="let p of plans">
          <h3>{{ p.name }}</h3>
          <div class="price">₹{{ p.price }}</div>
          <small>per {{ p.days }} days</small>
          <ul><li *ngFor="let f of p.features">{{ f }}</li></ul>
          <button (click)="buy(p)">Subscribe</button>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  plans: any[] = [];
  user: any;
  msg = '';
  constructor(private http: HttpClient, private auth: AuthService, private zone: NgZone) {}

  ngOnInit() {
    this.http.get<any[]>(`${API}/plans`).subscribe((p) => (this.plans = p));
    this.loadUser();
  }

  loadUser() { this.auth.me().subscribe((u) => (this.user = u)); }

  buy(plan: any) {
    this.msg = '';
    this.http.post<any>(`${API}/payment/order`, { planId: plan.id }).subscribe({
      next: (o) => {
        const rzp = new Razorpay({
          key: o.keyId,
          amount: o.amount,
          currency: o.currency,
          order_id: o.orderId,
          name: 'MEAN Subscriptions',
          description: `${plan.name} plan`,
          prefill: { name: this.user?.name, email: this.user?.email },
          handler: (r: any) =>
            this.zone.run(() =>
              this.http.post(`${API}/payment/verify`, { ...r, planId: plan.id }).subscribe({
                next: () => { this.msg = 'Payment successful! Subscription activated.'; this.loadUser(); },
                error: () => (this.msg = 'Payment verification failed.'),
              })
            ),
        });
        rzp.open();
      },
      error: (e) => (this.msg = e.error?.message || 'Could not start payment'),
    });
  }
}
