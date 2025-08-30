# RBU Smart Canteen

A full-stack smart canteen management system for RBU, featuring:
- Java 17 Spring Boot backend (REST, JWT, PostgreSQL, Swagger)
- React.js + Tailwind CSS frontend (role-based dashboards)
- Docker support, seed data, analytics, and more

## Features
- Student: Browse menu, order, pay (mock), track orders, see analytics
- Admin/Staff: Manage menu, update availability, view/manage orders, analytics
- Secure JWT authentication, role-based access
- Analytics: Bestsellers, average prep time, peak hours

## Prerequisites
- Node.js (v18+ recommended)
- Java 17+
- PostgreSQL
- Docker (optional, for containerized backend)

## Backend Setup
1. **Database:**
   - Create a PostgreSQL database named `rbu_smart_canteen`.
   - Update `backend/backend/src/main/resources/application.properties` with your DB credentials.
   - The app will auto-seed 100+ food items and demo users from `data.sql`.
2. **Run with Maven:**
   ```sh
   cd backend/backend
   ./mvnw spring-boot:run
   ```
3. **Or Run with Docker:**
   ```sh
   cd backend/backend
   docker build -t rbu-smart-canteen-backend .
   docker run -p 8080:8080 rbu-smart-canteen-backend
   ```
4. **API Docs:**
   - Visit [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

## Frontend Setup
1. **Install dependencies:**
   ```sh
   cd frontend
   npm install
   ```
2. **Start the app:**
   ```sh
   npm start
   ```
3. **Access:**
   - Visit [http://localhost:3000](http://localhost:3000)

## Demo Users
- Student: `student1` / `password`
- Admin: `admin1` / `adminpass`
- Staff: `staff1` / `staffpass`

## Project Structure
- `backend/` - Spring Boot backend
- `frontend/` - React frontend

## Customization
- Update seed data in `backend/backend/src/main/resources/data.sql`
- Add real Razorpay integration in `frontend/src/pages/StudentDashboard.tsx`
- Extend analytics, notifications, and UI as needed

## License
MIT
