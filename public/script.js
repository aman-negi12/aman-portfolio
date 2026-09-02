const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
navToggle?.addEventListener("click", () => navLinks.classList.toggle("open"));
document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

const aiFab = document.getElementById("aiFab");
const aiPanel = document.getElementById("aiPanel");
const aiClose = document.getElementById("aiClose");
const aiMessages = document.getElementById("aiMessages");
const aiForm = document.getElementById("aiForm");
const aiInput = document.getElementById("aiInput");
const aiSubmit = aiForm?.querySelector("button[type='submit']");

// Keeps the recent conversation so follow-up questions have context.
const chatHistory = [];

function openAI() {
  aiPanel.classList.add("open");
  aiPanel.setAttribute("aria-hidden", "false");
  aiInput.focus();
}

function closeAI() {
  aiPanel.classList.remove("open");
  aiPanel.setAttribute("aria-hidden", "true");
}

aiFab?.addEventListener("click", openAI);
aiClose?.addEventListener("click", closeAI);

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = `ai-message ${who}`;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}

function setBusy(busy) {
  aiInput.disabled = busy;
  if (aiSubmit) {
    aiSubmit.disabled = busy;
    aiSubmit.textContent = busy ? "…" : "➤";
  }
}

async function askAI(question) {
  setBusy(true);
  const typing = addMessage("Thinking…", "bot");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: chatHistory.slice(-10),
      }),
    });

    const data = await response.json().catch(() => ({}));
    typing.remove();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    const reply = data.reply || "I couldn't generate a response right now.";
    addMessage(reply, "bot");

    chatHistory.push({ role: "user", content: question });
    chatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    typing.remove();
    addMessage(error.message || "Sorry, something went wrong.", "bot");
  } finally {
    setBusy(false);
    aiInput.focus();
  }
}

document.querySelectorAll(".suggestions button").forEach(button => {
  button.addEventListener("click", () => {
    const q = button.textContent.trim();
    addMessage(q, "user");
    askAI(q);
  });
});

aiForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (aiInput.disabled) return;

  const question = aiInput.value.trim();
  if (!question) return;

  addMessage(question, "user");
  aiInput.value = "";
  await askAI(question);
});

document.getElementById("contactForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("formNote").textContent =
    "Demo submitted. Connect this form to Formspree, EmailJS, Resend, or your own backend to send real messages.";
});

// Resume preview modal
const viewResumeBtn = document.getElementById("viewResumeBtn");
const resumeModal = document.getElementById("resumeModal");
const resumeClose = document.getElementById("resumeClose");
const resumeBackdrop = document.getElementById("resumeBackdrop");

function openResume() {
  resumeModal.classList.add("open");
  resumeModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeResume() {
  resumeModal.classList.remove("open");
  resumeModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
viewResumeBtn?.addEventListener("click", openResume);
resumeClose?.addEventListener("click", closeResume);
resumeBackdrop?.addEventListener("click", closeResume);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (resumeModal.classList.contains("open")) closeResume();
    if (aiPanel.classList.contains("open")) closeAI();
  }
});

// Immersive 3D mode
const threeDBtn = document.getElementById("threeDBtn");
const tiltTargets = document.querySelectorAll(".hero-card, .glass-card, .project-card");
let threeDOn = false;

threeDBtn?.addEventListener("click", () => {
  threeDOn = !threeDOn;
  document.body.classList.toggle("three-d-mode", threeDOn);
  threeDBtn.classList.toggle("active", threeDOn);
  threeDBtn.setAttribute("aria-pressed", String(threeDOn));
  threeDBtn.innerHTML = threeDOn
    ? '<span class="nav-3d-icon">◇</span><span class="nav-3d-text">3D On</span>'
    : '<span class="nav-3d-icon">◇</span><span class="nav-3d-text">3D View</span>';
  tiltTargets.forEach(card => { card.style.transform = ""; });
});

let pointerFrame = null;
let pointerX = window.innerWidth * 0.5;
let pointerY = window.innerHeight * 0.5;

function updateAtmosphere() {
  pointerFrame = null;
  if (!threeDOn) return;
  document.documentElement.style.setProperty("--mouse-x", `${pointerX}px`);
  document.documentElement.style.setProperty("--mouse-y", `${pointerY}px`);
}

document.addEventListener("pointermove", (e) => {
  if (!threeDOn) return;
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (!pointerFrame) pointerFrame = requestAnimationFrame(updateAtmosphere);
});

tiltTargets.forEach(card => {
  card.addEventListener("pointermove", (e) => {
    if (!threeDOn) return;
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) - 0.5;
    const y = ((e.clientY - r.top) / r.height) - 0.5;
    const rx = (-y * 11).toFixed(2);
    const ry = (x * 13).toFixed(2);
    const lift = card.classList.contains("hero-card") ? 10 : 5;
    card.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${lift}px) scale3d(1.012,1.012,1.012)`;
  });

  card.addEventListener("pointerleave", () => {
    if (!threeDOn) return;
    card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0) scale3d(1,1,1)";
  });
});
