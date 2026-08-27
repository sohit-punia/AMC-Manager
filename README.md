# AMC Record Manager

A full-stack web application designed to simplify and organize **Annual Maintenance Contract (AMC) management**. The system helps manage employees, AMC records, customer visits, and service details from a centralized dashboard.

## 🚀 Features

### 👨‍💼 Employee Management

* Add new employees
* View employee records
* Manage employee information
* Assign employees to AMC-related activities

### 📋 AMC Record Management

* Create and manage AMC records
* Store customer and contract information
* Track AMC-related details in an organized way
* Maintain records in a centralized database

### 🛠️ Visit Management

* Add service or maintenance visits
* Track visit details
* View previous visits
* Maintain a complete history of AMC service activities

### ✏️ Create and Update Records

The application supports different API operations for managing records:

* `POST` – Create new records
* `GET` – Fetch records
* `PUT` – Update existing records
* `DELETE` – Remove records

### 🌐 Full-Stack Architecture

The frontend communicates with the backend using REST APIs.

```text
React Frontend
      │
      │ HTTP / Fetch API
      ▼
Node.js + Express Backend
      │
      ▼
SQLite Database
```

## 🛠️ Tech Stack

### Frontend

* React
* JavaScript
* HTML
* CSS
* Fetch API

### Backend

* Node.js
* Express.js

### Database

* SQLite

### Development Tools

* Vite
* Git
* GitHub
* VS Code

## 📁 Project Structure

```text
amc-record-manager/
│
├── backend/
│   ├── database.js
│   ├── database.db
│   ├── server.js
│   └── package.json
│
├── src/
│   ├── assets/
│   ├── AddVisit.jsx
│   ├── Employees.jsx
│   ├── VisitDetails.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── public/
├── package.json
├── vite.config.js
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
```

### 2. Navigate to the Project

```bash
cd amc-record-manager
```

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

## ▶️ Run the Application

### Start the Backend Server

Inside the `backend` folder:

```bash
node server.js
```

The backend server will start and handle API requests from the frontend.

### Start the Frontend

Open another terminal in the main project folder:

```bash
npm run dev
```

Then open the local URL provided by Vite in your browser.

## 🔌 API Communication

The React frontend communicates with the Express backend using the Fetch API.

Example:

```javascript
const response = await fetch(`${API}/employees`);
const data = await response.json();
```

For creating or updating records, the application dynamically chooses the appropriate HTTP method.

```javascript
const url = editingId
  ? `${API}/employees/${editingId}`
  : `${API}/employees`;

const response = await fetch(url, {
  method: editingId ? "PUT" : "POST",
});
```

This allows the same form to handle both:

* Creating a new record
* Updating an existing record

## 📊 Database

The application uses **SQLite** as its database.

SQLite was chosen because it is:

* Lightweight
* Easy to set up
* Serverless
* Suitable for small to medium-sized management applications

The database stores information related to AMC records, employees, and service visits.

## 🎯 Project Objective

The main goal of the AMC Record Manager is to replace manual record-keeping with a simple digital system.

The application aims to help organizations:

* Organize AMC information
* Manage employees efficiently
* Track service visits
* Maintain historical records
* Reduce manual paperwork
* Access important information from one centralized system

## 🔮 Future Improvements

Some features that can be added in future versions include:

* 🔐 User authentication and role-based access
* 📊 Dashboard with analytics
* 🔍 Advanced search and filtering
* 📅 AMC expiry reminders
* 🔔 Notification system
* 📄 PDF report generation
* 📧 Email notifications
* ☁️ Cloud database integration
* 📱 Improved mobile responsiveness

## 👨‍💻 Author

**Sohit Punia**

## 📄 License

This project is currently intended for educational and internal management purposes.

---

⭐ If you find this project useful, consider giving the repository a star!
