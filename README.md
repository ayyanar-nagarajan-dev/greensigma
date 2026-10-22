# MEAN Subscription App (Angular 16 + Express + MongoDB + JWT + Razorpay test)

## 1. Backend
    cd backend
    cp .env.example .env     # fill JWT_SECRET, MONGO_URI and Razorpay TEST keys
    npm install
    npm start                # http://localhost:3000
Admin is auto-created from ADMIN_EMAIL / ADMIN_PASSWORD in .env (default admin@example.com / Admin@123).

## 2. Frontend (Angular 16)
    npx @angular/cli@16 new frontend --standalone --routing=false --style=css --skip-git
    cd frontend
    # delete src/app/* then copy this package's frontend-src contents into frontend/src
    #   (index.html, main.ts, styles.css, and the app/ folder)
    ng serve                 # http://localhost:4200

## 3. Razorpay test payment
Get Test Mode keys at dashboard.razorpay.com. Test card: 4111 1111 1111 1111, any future expiry, any CVV, OTP/any value on the test page. Test UPI: success@razorpay.

## Flow
Register -> Login (JWT, login count +1) -> Home (welcome + plans -> Razorpay) -> Admin panel (users, login counts, subscriptions, delete).
