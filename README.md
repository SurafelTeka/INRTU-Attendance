# 📸 Smart Attendance Management System

A smart attendance system that uses AI-powered face recognition to automate attendance tracking from a single group photo. This is a web-based application designed for teachers to quickly and efficiently manage student attendance.

## 🌐 Live Demo

Try it out now:

- 🔗 [attendance.zenbil.net](https://attendance.zenbil.net/)
- 🔗 [inrtu-attendance.netlify.app](https://inrtu-attendance.netlify.app/)

## 🚀 Features

- Register students with names and photos
- Open webcam to capture group photo
- Identify students from group photo using face recognition
- Export attendance as an Excel (.xlsx) file
- Offline-friendly and lightweight

## 🧠 Technologies Used

- HTML, CSS, JavaScript
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) for face detection and recognition
- Excel Export
- Browser-based camera access via `navigator.mediaDevices`

## 📸 How It Works

1. **Register Students**  
   Upload individual student images with their names to create a face dataset.

2. **Open Group Camera**  
   Use the webcam to capture a single group photo of the class.

3. **Face Recognition**  
   The app compares the faces in the group photo with the known faces of registered students.

4. **Export Attendance**  
   Generate and download an Excel file listing students marked as present.

## 🗂️ Project Structure

smart-attendance/

├── index.html

├── style.css

├── script.js

├── models/ # Face-api.js models

└── README.md

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/smart-attendance.git
   cd smart-attendance
2. Open index.html in a modern browser (Chrome/Firefox).

3. Allow camera permissions.

👨‍💻 Developed by

Surafel Teka Zewdie
AI and Computer Science student at INRTU |
✉️ surafelteka243@gmail.com
