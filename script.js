// API Configuration
const apiKey = "AIzaSyAR1kRNJ5CJ4BSPK9NjPfqw4_dcY7kCLdk";
const sheetId = "1GMqZgUU5FAMWG402AGqtKG1WPpHIKXZdq-c7bJAegJE";
const sheetURL =
  "https://script.google.com/macros/s/AKfycbzlqVhN-oSz2Ocdawf17tZS-HWyeaO6JwMHRGu1H5Z7wXAjmEV_9KyWPo8yU_ouTM0/exec";

// Helper Functions
function getSheetName(subject, classLevel) {
  return `${subject.replace(/\s+/g, "")}_${classLevel}`;
}

// Fetch and Display Questions
async function fetchQuestions(day, cls, subject) {
  if (!subject) {
    alert("Please select a subject.");
    return;
  }

  let sheetName = getSheetName(subject, cls);
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

  try {
    let response = await fetch(url);
    let data = await response.json();

    if (!data.values) {
      throw new Error(`No sheet found for ${sheetName}`);
    }

    displayQuestions(data.values, subject, cls);
  } catch (error) {
    console.error("Error fetching questions:", error);
    document.getElementById("questions").innerHTML = `
      <p class="error">Error: Could not load questions for ${subject.replace(
        /_/g,
        " "
      )} - ${cls} .is not yet available</p>
      <p>Please make sure the corresponding sheet exists in the spreadsheet.</p>
      <button onclick="window.location.href='index.html'" class="back-btn">Go Back</button>
    `;
  }
}

// Store questions data globally
let questionsData = [];

// Display questions in HTML
function displayQuestions(data, subject, cls) {
  let questionsDiv = document.getElementById("questions");
  questionsDiv.innerHTML = "";
  questionsData = [];

  if (!data || data.length <= 1) {
    questionsDiv.innerHTML = "<p>No questions found.</p>";
    return;
  }
  document.querySelectorAll(".option-label input").forEach((radio) => {
    radio.addEventListener("change", (e) => {
      // Find the question container and remove the unanswered class
      const questionContainer = e.target.closest(".question-container");
      if (questionContainer) {
        questionContainer.classList.remove("unanswered");
      }
    });
  });
  // Add exam metadata section
   questionsDiv.innerHTML = `
    <div class="exam-header">
      <h3>Subject: ${subject.replace(/_/g, " ")}</h3>
      <h4>Class: Primary ${cls.substring(1)}</h4>
      <h3 class="Warn">If you don't answer all the questions, you'll not be able to submit.</h3>
      <h3 class="Warn">Do well to answer all the questions before the time runs out.</h3>
      <div class="student-info">
        <label for="username">Full Name:</label>
        <input class="Input" type="text" id="username" placeholder="e.g Ada Success" required>
      </div>
    </div>
  `;

  // Create questions
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let questionText = row[0];
    let options = {
      A: row[1],
      B: row[2],
      C: row[3],
      D: row[4],
      E: row[5],
    };
    let correctAnswer = row[6];

    questionsData.push({
      questionNumber: i,
      correctAnswer,
      subject,
      cls,
    });

    // Check if the question contains an image URL
    let processedQuestion = questionText;
    let imageHTML = "";

    // Process the question text to extract and handle image URLs
    const { processedText, imageHtmlContent } = processQuestionImages(
      questionText,
      i
    );
    processedQuestion = processedText;
    imageHTML = imageHtmlContent;

    let questionHTML = `
      <div class="question-container">
        <p class="question-text"><strong>Question ${i}:</strong> ${processedQuestion}</p>
        ${imageHTML}
        <div class="options-container">
          ${Object.entries(options)
            .map(
              ([key, value]) => `
            <label class="option-label">
              <input type="radio" name="q${i}" value="${key}" required> 
              ${key}) ${value}
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    questionsDiv.innerHTML += questionHTML;
  }

  // Add submit button
  questionsDiv.innerHTML += `
    <button onclick="checkAnswers()" class="submit-btn">Submit Exam</button>
  `;

  // Add this line to set up the listeners for removing the "unanswered" class
  addRadioChangeListeners();

  // Setup image error handling
  setupImageErrorHandling();
}

// Helper function to process question images - handles both regular and Google Drive images
function processQuestionImages(questionText, questionNumber) {
  let processedText = questionText;
  let imageHtmlContent = "";

  // Regular expression for standard image URLs
  const standardImageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;

  // Regular expression for Google Drive links
  // This matches patterns like:
  // https://drive.google.com/file/d/FILEID/view
  // https://drive.google.com/open?id=FILEID
  const googleDriveRegex =
    /(https?:\/\/drive\.google\.com\/file\/d\/([^\/\s]+)\/view[^\s]*|https?:\/\/drive\.google\.com\/open\?id=([^\s&]+))/gi;

  // First check for Google Drive links
  const driveMatches = [...questionText.matchAll(googleDriveRegex)];

  if (driveMatches && driveMatches.length > 0) {
    for (const match of driveMatches) {
      const fullUrl = match[0];
      // Extract fileId from the URL - either from /d/FILEID/view or ?id=FILEID
      const fileId = match[2] || match[3];

      if (fileId) {
        // Create a direct link for the image
        // This format allows direct image embedding from Google Drive
        const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // Replace the Google Drive URL in the question text
        processedText = processedText.replace(fullUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${directImageUrl}" alt="Question ${questionNumber} image" class="question-image" data-source="google-drive">
        </div>`;
      }
    }
  }
  // If no Google Drive links, check for standard image URLs
  else {
    const standardMatches = [...questionText.matchAll(standardImageRegex)];

    if (standardMatches && standardMatches.length > 0) {
      for (const match of standardMatches) {
        const imageUrl = match[0];

        // Replace the URL in the question text
        processedText = processedText.replace(imageUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${imageUrl}" alt="Question ${questionNumber} image" class="question-image">
        </div>`;
      }
    }
  }

  return { processedText, imageHtmlContent };
}

// Function to handle image loading errors
function setupImageErrorHandling() {
  document.querySelectorAll(".question-image").forEach((img) => {
    img.onerror = function () {
      this.onerror = null;

      // Custom message for Google Drive images
      const errorMessage =
        this.dataset.source === "google-drive"
          ? "Google Drive image could not be loaded. Make sure the file is publicly accessible."
          : "Image could not be loaded";

      this.parentNode.innerHTML = `
        <div class="image-error">
          <p>${errorMessage}</p>
          <small>${this.src}</small>
        </div>
      `;
    };
  });
}

// Check answers and calculate score
// Function to check answers with validation for unanswered questions
// Replace both checkAnswers functions with this updated version
function checkAnswers() {
  // Get the submit button
  const submitBtn = document.querySelector(".submit-btn");

  // Display loading state
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
  submitBtn.disabled = true;

  // Clear the timer interval if it exists
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  let username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter your name before submitting.");
    // Reset the submit button
    submitBtn.innerHTML = "Submit Exam";
    submitBtn.disabled = false;
    // Restart the timer since the exam wasn't submitted
    startTimer();
    return;
  }

  // Check for unanswered questions with higher accuracy
  let unansweredQuestions = [];

  // Loop through each question by index
  for (let i = 0; i < questionsData.length; i++) {
    const questionNum = i + 1; // Convert 0-based index to 1-based question number
    const radioButtons = document.querySelectorAll(
      `input[name="q${questionNum}"]`
    );
    let answered = false;

    // Check if any radio button is checked for this question
    radioButtons.forEach((radio) => {
      if (radio.checked) {
        answered = true;
      }
    });

    if (!answered) {
      unansweredQuestions.push(questionNum);
    }
  }

  // If there are unanswered questions, show alert and highlight all of them
  if (unansweredQuestions.length > 0) {
    // Reset the submit button
    submitBtn.innerHTML = "Submit Exam";
    submitBtn.disabled = false;

    // First, clear any previous "unanswered" markings
    document.querySelectorAll(".question-container").forEach((container) => {
      container.classList.remove("unanswered");
    });

    // Now mark all unanswered questions - use a more direct and reliable approach
    for (let i = 0; i < unansweredQuestions.length; i++) {
      const qNum = unansweredQuestions[i];

      // Get all question containers directly
      const questionContainers = document.querySelectorAll(
        ".question-container"
      );

      // Find the container for this question number
      // We need special handling here because the text might be formatted differently
      for (let j = 0; j < questionContainers.length; j++) {
        const container = questionContainers[j];
        const questionText = container.querySelector(".question-text");

        if (questionText) {
          // This will match both "Question 1:" and "Question 10:" formats
          const match = questionText.textContent.match(/Question\s+(\d+):/i);
          if (match && parseInt(match[1]) === qNum) {
            container.classList.add("unanswered");
            break;
          }
        }
      }
    }

    // Create message listing unanswered questions
    let message = `Please answer the following questions before submitting:\n• Question ${unansweredQuestions.join(
      "\n• Question "
    )}`;
    alert(message);

    // Scroll to the first unanswered question
    const firstUnanswered = document.querySelector(`.unanswered`);
    if (firstUnanswered) {
      firstUnanswered.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    // Restart the timer since the exam wasn't submitted
    startTimer();

    return;
  }

  // Proceed with calculating score and submitting
  let score = 0;
  let responses = [];
  let totalQuestions = questionsData.length;

  questionsData.forEach((q, index) => {
    let selected = document.querySelector(
      `input[name="q${index + 1}"]:checked`
    );
    let isCorrect = selected && selected.value === q.correctAnswer;
    if (isCorrect) score++;

    responses.push({
      questionNumber: index + 1,
      selectedAnswer: selected.value,
      correct: isCorrect,
    });
  });

  // Prepare result data
  const resultData = {
    timestamp: new Date().toISOString(),
    name: username,
    subject:
      localStorage.getItem("examSubject") ||
      document.getElementById("subject").value,
    class:
      localStorage.getItem("examClass") ||
      document.getElementById("class").value,
    score: score,
    totalQuestions: totalQuestions,
    percentage: ((score / totalQuestions) * 100).toFixed(1),
    responses: JSON.stringify(responses),
  };

  // Save to appropriate sheet
  saveResult(resultData);
}
// Save result to Google Sheets
async function saveResult(resultData) {
  try {
    await fetch(sheetURL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...resultData,
        sheetName: getSheetName(resultData.subject, resultData.class),
      }),
    });

    // Add a small delay to ensure data is saved
    await new Promise((resolve) => setTimeout(resolve, 1000));

    displayResults(resultData);
  } catch (error) {
    console.error("Error saving result:", error);
    alert(
      "There was an issue displaying the results, but your answers have been recorded successfully."
    );
  }
}

// Display final results
function displayResults(resultData) {
  const questionsDiv = document.getElementById("questions");
  questionsDiv.innerHTML = `
    <div class="results-container">
      <h2><strong>${resultData.name}</strong>, Well done on your exam!</h2>
      <div class="results-summary">
      <p>Keep going, you’re doing great! Just take it one step at a time.</p>
       
      </div>
      <button onclick="window.location.href='index.html'" class="submit-btn">Take Another Exam</button>
    </div>
  `;

  // Clear the stored exam details
  localStorage.removeItem("examDay");
  localStorage.removeItem("examClass");
  localStorage.removeItem("examSubject");
}

// Initialize if on questions page
if (window.location.pathname.includes("questions.html")) {
  window.addEventListener("load", () => {
    const day = localStorage.getItem("examDay");
    const cls = localStorage.getItem("examClass");
    const subject = localStorage.getItem("examSubject");

    if (!day || !cls || !subject) {
      alert("Please select exam details first");
      window.location.href = "index.html";
      return;
    }

    // Display exam info
    document.getElementById("exam-info").innerHTML = `
      <h2>Exam Details</h2>
      <p>Day: ${day}</p>
      <p>Class: Primary ${cls.substring(1)}</p>
      <p>Subject: ${subject.replace(/_/g, " ")}</p>
    `;

    // Auto fetch questions
    fetchQuestions(day, cls, subject);
  });
}

// Timer functionality
let examDuration = 30 * 60; // 30 minutes in seconds
let timerInterval;

function startTimer() {
  const timerElement = document.getElementById("time-remaining");
  let timeLeft = examDuration;

  // Update timer immediately
  updateTimerDisplay(timeLeft);

  timerInterval = setInterval(() => {
    timeLeft--;

    // Update the timer display
    updateTimerDisplay(timeLeft);

    // Update progress bar
    const progressPercent = 100 - (timeLeft / examDuration) * 100;
    document.querySelector(
      ".progress-bar-fill"
    ).style.width = `${progressPercent}%`;

    // When time runs out
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Time's up! Your exam will be submitted now.");
      checkAnswers();
      window.location.href = "index.html"; // Redirect to a specific link
    }

    // Warning when 5 minutes remaining
    if (timeLeft === 600) {
      showTimerWarning("10 Minutes Remaining!");
    }
    if (timeLeft === 300) {
      showTimerWarning("5 minutes remaining!");
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  document.getElementById("time-remaining").textContent = `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

  // Change color when less than 10 minutes remaining
  if (seconds < 600) {
    document.getElementById("time-remaining").style.color = "orange";
  }
  // Change color when less than 5 minutes remaining
  if (seconds < 300) {
    document.getElementById("time-remaining").style.color = "#ef4444";
  }
}

function showTimerWarning() {
  // Create a warning toast
  const toast = document.createElement("div");
  toast.className = "toast toast-warning";
  toast.innerHTML = "Time is Ticking!!!";
  document.body.appendChild(toast);

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Modify your existing fetchQuestions function to start the timer after questions load
async function fetchQuestions(day, cls, subject) {
  if (!subject) {
    alert("Please select a subject.");
    return;
  }

  let sheetName = getSheetName(subject, cls);
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

  try {
    let response = await fetch(url);
    let data = await response.json();

    if (!data.values) {
      throw new Error(`No sheet found for ${sheetName}`);
    }

    displayQuestions(data.values, subject, cls);

    // Start the timer after questions are displayed
    startTimer();
  } catch (error) {
    console.error("Error fetching questions:", error);
    document.getElementById("questions").innerHTML = `
      <p class="error"> ${subject.replace(
        /_/g,
        " "
      )} - ${cls} is not yet available.</p>
      <p class="error">Please make sure you've selected the right Class, Subject and Day.</p>
      <button onclick="window.location.href='index.html'" class="sub-btn">Go Back</button>
    `;
  }
}

// Add this to clear timer when exam is submitted
function addRadioChangeListeners() {
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      // Find the question container
      const questionContainer = e.target.closest(".question-container");
      if (questionContainer) {
        questionContainer.classList.remove("unanswered");
      }
    });
  });
}
