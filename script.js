let attendanceLog = [];
//Face API Models
Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
]).then(() => {
  document.getElementById("status").textContent = "✅ Models loaded!";
  renderStudentList();
});

//Register Student
document
  .getElementById("register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const imageFile = document.getElementById("photo").files[0];
    if (!name || !imageFile) return alert("Fill all fields.");

    const image = await faceapi.bufferToImage(imageFile);
    const detection = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return alert("⚠️ No face detected!");

    const descriptor = Array.from(detection.descriptor);
    const students = JSON.parse(localStorage.getItem("students") || "[]");
    students.push({ name, descriptor });
    localStorage.setItem("students", JSON.stringify(students));

    document.getElementById("status").textContent = `✅ ${name} registered!`;
    document.getElementById("register-form").reset();
    document.getElementById("preview-img").src = "";
    document.getElementById("preview-img").style.display = "none";
    renderStudentList();
  });

//Render Student List
function renderStudentList() {
  const list = document.getElementById("student-list");
  const students = JSON.parse(localStorage.getItem("students") || "[]");
  list.innerHTML = "";
  students.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${i + 1}. ${s.name}
      <button onclick="deleteStudent(${i})">❌ Delete</button>`;
    list.appendChild(li);
  });
}

function deleteStudent(index) {
  const students = JSON.parse(localStorage.getItem("students") || "[]");
  students.splice(index, 1);
  localStorage.setItem("students", JSON.stringify(students));
  renderStudentList();
}

document.getElementById("clear-btn").addEventListener("click", () => {
  if (confirm("⚠️ Delete all students?")) {
    localStorage.removeItem("students");
    renderStudentList();
  }
});

//Group photo Detect Attendance
document
  .getElementById("detect-attendance-btn")
  .addEventListener("click", async () => {
    const fileInput = document.getElementById("group-photo");
    const file = fileInput.files[0];
    if (!file) return alert("📸 Please upload a group photo.");

    const students = JSON.parse(localStorage.getItem("students") || "[]");
    if (students.length === 0) return alert("👤 No registered students.");

    const image = await faceapi.bufferToImage(file);
    const preview = document.getElementById("group-preview");
    const canvas = document.getElementById("group-canvas");

    // Load preview image
    preview.src = URL.createObjectURL(file);
    preview.onload = async () => {
      // Match canvas to preview display size
      canvas.width = preview.width;
      canvas.height = preview.height;

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

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);

      const scale = preview.width / image.width;

      detections.forEach((detection) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const box = detection.detection.box;
        const label =
          bestMatch.label !== "unknown" ? bestMatch.label : "Unknown";

        const scaledBox = {
          x: box.x * scale,
          y: box.y * scale,
          width: box.width * scale,
          height: box.height * scale,
        };

        drawBox(canvas, scaledBox, label);
        if (label !== "Unknown") markPresent(label);
      });
    };

    preview.style.display = "block";
  });

// labeled box draw
function drawBox(canvas, box, label) {
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#00c853";
  ctx.lineWidth = 2;
  ctx.font = "16px Arial";
  ctx.fillStyle = "#00c853";

  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.stroke();

  ctx.fillText(label, box.x, box.y > 20 ? box.y - 5 : box.y + 15);
}

//Mark Attendance
function markPresent(name) {
  if (attendanceLog.some((entry) => entry.name === name)) return;

  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  attendanceLog.push({ name, date, time });
  renderAttendanceLog();
}

//Render Attendance Log
function renderAttendanceLog() {
  const logBody = document.getElementById("attendance-log");
  logBody.innerHTML = "";
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

//Export Attendance CSV
document.getElementById("export-btn").addEventListener("click", () => {
  if (!attendanceLog.length) return alert("⚠️ No attendance to export.");

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
});
//Preview Image Logic
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

const openCameraBtn = document.getElementById("open-camera-btn");
const captureBtn = document.getElementById("capture-btn");
const video = document.getElementById("camera-stream");
const canvas = document.getElementById("snapshot-canvas");
const previewImg = document.getElementById("preview-img");

let stream = null;

//Open the camera
openCameraBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = "block";
    captureBtn.style.display = "inline-block";
  } catch (err) {
    alert("⚠️ Cannot access camera: " + err.message);
  }
});

//Capture the image
captureBtn.addEventListener("click", () => {
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    const file = new File([blob], "captured.png", { type: "image/png" });

    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = "block";

    // Put the file into file input for later registration
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    document.getElementById("photo").files = dataTransfer.files;

    // Stop the stream
    video.style.display = "none";
    captureBtn.style.display = "none";
    stream.getTracks().forEach((track) => track.stop());
  });
});
