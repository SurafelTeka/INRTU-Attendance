let attendanceLog = [];

// Initialize face-api.js models
async function loadFaceModels() {
  try {
    showStatus("⌛ Loading face recognition models...", "warning");

    await Promise.all([
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    ]);

    showStatus("✅ Models loaded successfully!", "success");
    renderStudentList();
  } catch (error) {
    showStatus(`❌ Error loading models: ${error.message}`, "error");
  }
}

// Status message helper
function showStatus(message, type) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = "block";

  // Auto hide success messages after 3 seconds
  if (type === "success") {
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }
}

// Detection status helper
function showDetectionStatus(message, type) {
  const statusEl = document.getElementById("detection-status");
  statusEl.textContent = message;
  statusEl.className = `detection-status ${type}`;
  statusEl.style.display = "block";
}

// Load models when page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadFaceModels);
} else {
  loadFaceModels();
}

// Register Student
document
  .getElementById("register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const imageFile = document.getElementById("photo").files[0];
    if (!name || !imageFile) {
      showStatus("⚠️ Please fill all fields", "error");
      return;
    }

    showStatus("⌛ Processing student registration...", "warning");

    try {
      const image = await faceapi.bufferToImage(imageFile);
      const detection = await faceapi
        .detectSingleFace(image)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        showStatus("⚠️ No face detected! Please try another photo.", "error");
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const students = JSON.parse(localStorage.getItem("students") || "[]");
      students.push({ name, descriptor });
      localStorage.setItem("students", JSON.stringify(students));

      showStatus(`✅ ${name} registered successfully!`, "success");
      document.getElementById("register-form").reset();
      document.getElementById("preview-img").src = "";
      document.getElementById("preview-img").style.display = "none";
      renderStudentList();
    } catch (error) {
      showStatus(`❌ Error registering student: ${error.message}`, "error");
    }
  });

// Render Student List
function renderStudentList() {
  const list = document.getElementById("student-list");
  const students = JSON.parse(localStorage.getItem("students") || "[]");
  list.innerHTML = "";

  if (students.length === 0) {
    list.innerHTML = "<li>No students registered yet</li>";
    return;
  }

  students.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
    <div>
      <strong>${i + 1}. ${s.name}</strong>
    </div>
    <button class="delete-btn" onclick="deleteStudent(${i})">❌ Delete</button>
  `;
    list.appendChild(li);
  });
}

// Delete a student
function deleteStudent(index) {
  const students = JSON.parse(localStorage.getItem("students") || "[]");
  students.splice(index, 1);
  localStorage.setItem("students", JSON.stringify(students));
  renderStudentList();
}

// Clear all students
document.getElementById("clear-btn").addEventListener("click", () => {
  if (confirm("⚠️ Are you sure you want to delete all students?")) {
    localStorage.removeItem("students");
    renderStudentList();
    showStatus("✅ All students cleared!", "success");
  }
});

// Group photo Detect Attendance
document
  .getElementById("detect-attendance-btn")
  .addEventListener("click", async () => {
    // Try to get photo from camera capture first
    let file = document.getElementById("group-photo").files[0];

    // If no file uploaded, check if we have a captured photo
    if (!file) {
      showDetectionStatus(
        "⚠️ Please capture or upload a group photo first",
        "detection-error"
      );
      return;
    }

    const students = JSON.parse(localStorage.getItem("students") || "[]");
    if (students.length === 0) {
      showDetectionStatus("👤 No registered students", "detection-error");
      return;
    }

    showDetectionStatus(
      "⌛ Detecting faces in the group photo...",
      "detection-warning"
    );

    try {
      const image = await faceapi.bufferToImage(file);
      const detectionContainer = document.getElementById("detection-container");
      const canvas = document.getElementById("detection-canvas");

      // Calculate the display dimensions while maintaining aspect ratio
      const maxDisplayWidth = Math.min(window.innerWidth * 0.9, 800);
      const aspectRatio = image.width / image.height;
      const displayWidth = Math.min(maxDisplayWidth, image.width);
      const displayHeight = displayWidth / aspectRatio;

      // Set canvas dimensions to display size
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Calculate scale factors
      const scaleX = displayWidth / image.width;
      const scaleY = displayHeight / image.height;

      const ctx = canvas.getContext("2d");

      // Draw the image on canvas with proper scaling
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

      const labeledDescriptors = students.map(
        (s) =>
          new faceapi.LabeledFaceDescriptors(s.name, [
            new Float32Array(s.descriptor),
          ])
      );

      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

      const detections = await faceapi
        .detectAllFaces(image)
        .withFaceLandmarks()
        .withFaceDescriptors();

      let recognizedCount = 0;

      detections.forEach((detection) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const box = detection.detection.box;
        const label =
          bestMatch.label !== "unknown" ? bestMatch.label : "Unknown";

        // Scale the detection box to display dimensions
        const scaledBox = {
          x: box.x * scaleX,
          y: box.y * scaleY,
          width: box.width * scaleX,
          height: box.height * scaleY,
        };

        drawBox(canvas, scaledBox, label);
        if (label !== "Unknown") {
          markPresent(label);
          recognizedCount++;
        }
      });

      // Show the detection container
      detectionContainer.style.display = "block";
      showDetectionStatus(
        `✅ Detected ${detections.length} faces (${recognizedCount} recognized)`,
        "detection-success"
      );
    } catch (error) {
      showDetectionStatus(
        `❌ Error detecting attendance: ${error.message}`,
        "detection-error"
      );
    }
  });

// Draw labeled box on canvas
function drawBox(canvas, box, label) {
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#00c853";
  ctx.lineWidth = 3;
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#00c853";

  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.stroke();

  // Draw label background
  ctx.fillStyle = "rgba(0, 200, 83, 0.7)";
  ctx.fillRect(box.x - 2, box.y - 25, ctx.measureText(label).width + 10, 25);

  // Draw label text
  ctx.fillStyle = "white";
  ctx.fillText(label, box.x + 3, box.y - 7);
}

// Mark Attendance
function markPresent(name) {
  if (attendanceLog.some((entry) => entry.name === name)) return;

  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  attendanceLog.push({ name, date, time });
  renderAttendanceLog();
  generateQRCode(); // Update QR code with new attendance data
}

// Render Attendance Log
function renderAttendanceLog() {
  const logBody = document.getElementById("attendance-log");
  logBody.innerHTML = "";

  if (attendanceLog.length === 0) {
    logBody.innerHTML =
      "<tr><td colspan='4' style='text-align: center;'>No attendance recorded yet</td></tr>";
    return;
  }

  attendanceLog.forEach((entry, i) => {
    const row = document.createElement("tr");

    const indexCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const dateCell = document.createElement("td");
    const timeCell = document.createElement("td");

    indexCell.textContent = i + 1;
    nameCell.textContent = entry.name;
    dateCell.textContent = entry.date;
    timeCell.textContent = entry.time;

    row.appendChild(indexCell);
    row.appendChild(nameCell);
    row.appendChild(dateCell);
    row.appendChild(timeCell);
    logBody.appendChild(row);
  });
}

// Generate QR Code for attendance log
function generateQRCode() {
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = ""; // Clear previous QR code

  if (attendanceLog.length === 0) {
    qrContainer.innerHTML = "<p>No attendance data yet</p>";
    return;
  }

  // Format the attendance data
  let qrData = "Smart Attendance System\n\n";
  qrData += `Date: ${new Date().toLocaleDateString()}\n\n`;
  qrData += "Attendance Log:\n";

  attendanceLog.forEach((entry, index) => {
    qrData += `${index + 1}. ${entry.name} - ${entry.time}\n`;
  });

  // Generate QR code with proper colors
  new QRCode(qrContainer, {
    text: qrData,
    width: 200,
    height: 200,
    colorDark: "#00796b",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

// Export Attendance CSV
document.getElementById("export-btn").addEventListener("click", () => {
  if (!attendanceLog.length) {
    showStatus("⚠️ No attendance to export", "error");
    return;
  }

  let csv = "Name,Date,Time\n";
  attendanceLog.forEach((e) => {
    csv += `${e.name},${e.date},${e.time}\n`;
  });

  const uri = encodeURI("data:text/csv;charset=utf-8," + csv);
  const link = document.createElement("a");
  link.setAttribute("href", uri);
  link.setAttribute(
    "download",
    `attendance_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showStatus("✅ Attendance exported to CSV!", "success");
});

// Preview Image Logic
document.getElementById("photo").addEventListener("change", function () {
  const file = this.files[0];
  const preview = document.getElementById("preview-img");
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    preview.style.display = "none";
  }
});

// Camera functionality for group photo
const openCameraBtn = document.getElementById("open-group-camera-btn");
const captureBtn = document.getElementById("capture-group-photo-btn");
const video = document.getElementById("group-video");
const snapshotCanvas = document.getElementById("group-snapshot-canvas");
const groupPhotoInput = document.getElementById("group-photo");

let stream = null;

// Open the camera
openCameraBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;
    video.style.display = "block";
    captureBtn.style.display = "block";
    openCameraBtn.style.display = "none";
  } catch (err) {
    showDetectionStatus(
      `⚠️ Cannot access camera: ${err.message}`,
      "detection-error"
    );
  }
});

// Capture the image
captureBtn.addEventListener("click", () => {
  const context = snapshotCanvas.getContext("2d");
  snapshotCanvas.width = video.videoWidth;
  snapshotCanvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

  // Create a blob from canvas
  snapshotCanvas.toBlob((blob) => {
    const file = new File([blob], "group-photo.png", {
      type: "image/png",
    });

    // Put the file into file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    groupPhotoInput.files = dataTransfer.files;

    showDetectionStatus(
      '✅ Photo captured! Click "Detect Attendance" to process',
      "detection-success"
    );

    // Stop the stream
    video.style.display = "none";
    captureBtn.style.display = "none";
    openCameraBtn.style.display = "block";
    stream.getTracks().forEach((track) => track.stop());
  });
});

// Initialize QR code
generateQRCode();
