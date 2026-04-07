// ── YOUR API URL ─────────────────────────────────────
const API_URL = "https://script.google.com/macros/s/AKfycbyhsaYaa7PYiizRF4RSq7EqxfDRTrwHfwYhdIz2NsxbYciJyRbBNjsutBe3ffebnTKuXA/exec";
// ─────────────────────────────────────────────────────


// ── PARTICLE CANVAS ───────────────────────────────────
(function () {
  const canvas = document.getElementById("particle-canvas");
  const ctx    = canvas.getContext("2d");
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function rand(a, b) { return a + Math.random() * (b - a); }

  function createParticle() {
    return {
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.3, 0.3), vy: rand(-0.4, -0.1),
      size: rand(1, 2.5),
      alpha: rand(0.1, 0.5),
      color: Math.random() > 0.5 ? "0,212,255" : "0,100,255"
    };
  }

  for (let i = 0; i < 80; i++) particles.push(createParticle());

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,212,255,${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawLines();
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
      if (p.x < -10 || p.x > W + 10) p.vx *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
})();


// ── NAVBAR SCROLL ────────────────────────────────────
window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 40);
});


// ── SCROLL REVEAL ────────────────────────────────────
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
// Text scramble for section tags
const chars = "!@#$%^&*<>/\\[]{}|=+~ABCDEFabcdef0123456789";

function scramble(el) {
  const original = el.dataset.text || el.textContent;
  el.dataset.text = original;
  let iteration  = 0;
  const total    = original.length * 3;

  const interval = setInterval(() => {
    el.textContent = original.split("").map((char, i) => {
      if (char === " ") return " ";
      if (i < iteration / 3) return original[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join("");

    if (iteration >= total) {
      el.textContent = original;
      clearInterval(interval);
    }
    iteration++;
  }, 30);
}

// Observe section tags
const tagObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      scramble(e.target);
      tagObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll(".section-tag").forEach(el => tagObserver.observe(el));


// ── INPUT ENTER KEY ──────────────────────────────────
document.getElementById("cert-input").addEventListener("keydown", e => {
  if (e.key === "Enter") verify();
});

// Auto-format input: add dash after TT2026
document.getElementById("cert-input").addEventListener("input", function () {
  let val = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  // auto-insert dash after 4 chars if not already there
  if (val.length === 4 && !val.includes("-")) val = val + "-";
  this.value = val;
});


// ── VERIFY ───────────────────────────────────────────
const ID_PATTERN = /^[A-Z]{2}\d{2}-[A-Z0-9]{4}$/; // matches AI26-XXXX
let lastRequestTime = 0;
let invalidAttempts = 0;

async function verify() {
  const input = document.getElementById("cert-input");
  const id = input.value.trim().toUpperCase();

  if (!id) {
    input.style.borderColor = "#ef4444";
    input.focus();
    setTimeout(() => (input.style.borderColor = ""), 1200);
    return;
  }

  // Rate limiting — BEFORE the fetch
  const now = Date.now();
  if (now - lastRequestTime < 2000) {
    showResult({ status: "error", message: "Please wait 2 seconds before trying again." });
    return;
  }

  if (!ID_PATTERN.test(id)) {
    invalidAttempts++;
    if (invalidAttempts >= 5) {
      showResult({ status: "error", message: "Too many invalid attempts. Please refresh the page." });
      return;
    }
    showResult({ status: "error", message: "Invalid Certificate ID format. Expected: AI26-XXXX" });
    return;
  }

  lastRequestTime = now;
  setLoading(true);

  try {
    const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    invalidAttempts = 0; // reset on successful request
    showResult(data);
  } catch {
    showResult({ status: "error", message: "Could not reach the server. Check your internet connection." });
  } finally {
    setLoading(false);
  }
}


// ── SHOW RESULT ──────────────────────────────────────
function showResult(data) {
  const cfg = {
    verified:     { emoji: "✅", title: "Certificate Verified",       sub: "This person attended AI & ANN Tech Talk 2K26. Certificate is authentic.",           color: "#4ade80" },
    not_attended: { emoji: "⚠️", title: "Not Marked as Attended",     sub: "This Certificate ID exists but attendance was not recorded for this person.",        color: "#facc15" },
    not_found:    { emoji: "❌", title: "Certificate Not Found",       sub: "This ID doesn't exist in our records. The certificate may be invalid.",              color: "#f87171" },
    error:        { emoji: "🔧", title: "Something Went Wrong",        sub: data.message || "Please try again later.",                                            color: "#94a3b8" }
  };

  const c = cfg[data.status] || cfg.error;

  document.getElementById("result-emoji").textContent = c.emoji;
  document.getElementById("result-title").textContent = c.title;
  document.getElementById("result-title").style.color = c.color;
  document.getElementById("result-sub").textContent   = c.sub;

  // Build rows
  let rows = "";
  if (data.status === "verified" || data.status === "not_attended") {
    rows += row("Certificate ID", `<span class="cert-id">${data.certId}</span>`);
    rows += row("Name",      data.name);
    rows += row("Roll No",   data.roll);
    rows += row("Dept",      data.dept);
    rows += row("Institute", data.institute);
    rows += row("Event",     "AI & ANN Tech Talk 2K26");
    //rows += row("Date",      data.date);
    rows += row("Attendance", data.status === "verified"
      ? `<span class="badge-yes">✓ Attended</span>`
      : `<span class="badge-no">✗ Not Attended</span>`);
  } else if (data.status === "not_found") {
    rows += row("ID Searched", `<span style="font-family:'JetBrains Mono',monospace">${data.certId}</span>`);
  }

  document.getElementById("result-rows").innerHTML = rows;

  // Swap cards with animation
  const inputBox  = document.getElementById("input-box");
  const resultBox = document.getElementById("result-box");
  inputBox.style.opacity  = "0";
  inputBox.style.transform = "scale(0.96)";
  setTimeout(() => {
    inputBox.classList.add("hidden");
    resultBox.classList.remove("hidden");
    resultBox.style.opacity  = "0";
    resultBox.style.transform = "scale(0.96)";
    setTimeout(() => {
      resultBox.style.transition = "all .4s cubic-bezier(0.34,1.2,0.64,1)";
      resultBox.style.opacity    = "1";
      resultBox.style.transform  = "scale(1)";
    }, 20);
  }, 250);

  resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
  if (data.status === "verified") {
  const toast = document.getElementById("toast");
  toast.style.transform = "translateY(0)";
  toast.style.opacity   = "1";
  setTimeout(() => {
    toast.style.transform = "translateY(80px)";
    toast.style.opacity   = "0";
  }, 3000);
}
}


function row(label, value) {
  return `<div class="result-row">
    <span class="r-lbl">${label}</span>
    <span class="r-val">${value}</span>
  </div>`;
}


// ── RESET ────────────────────────────────────────────
function reset() {
  const inputBox  = document.getElementById("input-box");
  const resultBox = document.getElementById("result-box");

  resultBox.style.opacity = "0";
  resultBox.style.transform = "scale(0.96)";
  setTimeout(() => {
    resultBox.classList.add("hidden");
    inputBox.classList.remove("hidden");
    inputBox.style.transition = "all .4s cubic-bezier(0.34,1.2,0.64,1)";
    inputBox.style.opacity    = "1";
    inputBox.style.transform  = "scale(1)";
    document.getElementById("cert-input").value = "";
    document.getElementById("cert-input").focus();
  }, 250);
}


// ── LOADING STATE ────────────────────────────────────
function setLoading(on) {
  document.getElementById("btn-text").classList.toggle("hidden", on);
  document.getElementById("btn-loader").classList.toggle("hidden", !on);
  document.getElementById("verify-btn").disabled = on;
  document.getElementById("cert-input").disabled = on;
}

// Typing animation
// Typing animation — 2 lines
const line1 = "AI & ANN";
const line2 = "Tech Talk 2K26";
const el1   = document.getElementById("typed-line1");
const el2   = document.getElementById("typed-line2");

function typeLine(el, text, callback) {
  let i = 0;
  function t() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(t, 80);
    } else if (callback) {
      setTimeout(callback, 300);
    }
  }
  t();
}

// Line 1 types first, then line 2 starts
// hide cursor until line 2 starts
document.getElementById("cursor").style.display = "none";

typeLine(el1, line1, () => {
  document.getElementById("cursor").style.display = "inline";
  typeLine(el2, line2);
});
// function erase() {
//   if (ci > 0) {
//     el.textContent = words[wi].slice(0, --ci);
//     setTimeout(erase, 45);
//   } else {
//     wi = (wi + 1) % words.length;
//     setTimeout(type, 400);
//   }
// }
// type();

function toggleTheme() {
  document.body.classList.toggle("light");
  document.getElementById("theme-btn").textContent =
    document.body.classList.contains("light") ? "🌙" : "☀️";
}

// Hamburger menu
function toggleMenu() {
  const menu = document.getElementById("nav-links");
  const btn  = document.getElementById("hamburger");
  const open = menu.classList.toggle("open");
  btn.textContent = open ? "✕" : "☰";
}

function closeMenu() {
  document.getElementById("nav-links").classList.remove("open");
  document.getElementById("hamburger").textContent = "☰";
}

// Close menu when clicking outside
document.addEventListener("click", function(e) {
  const menu = document.getElementById("nav-links");
  const btn  = document.getElementById("hamburger");
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    closeMenu();
  }
});

// Days since event
const eventDate = new Date("April 7, 2026 21:15:00");
const now       = new Date();
const diffMs    = now - eventDate;

function timeAgo(ms) {
  if (ms < 0)                        return "Upcoming";

  const mins    = Math.floor(ms / (1000 * 60));
  const hours   = Math.floor(ms / (1000 * 60 * 60));
  const days    = Math.floor(ms / (1000 * 60 * 60 * 24));
  const months  = Math.floor(days / 30);
  const years   = Math.floor(days / 365);
  const decades = Math.floor(years / 10);

  if (decades >= 1)  return decades === 1  ? "A decade ago"       : `${decades} decades ago`;
  if (years   >= 1)  return years   === 1  ? "1 year ago"         : `${years} years ago`;
  if (months  >= 1)  return months  === 1  ? "1 month ago"        : `${months} months ago`;
  if (days    >= 1)  return days    === 1  ? "1 day ago"          : `${days} days ago`;
  if (hours   >= 1)  return hours   === 1  ? "1 hour ago"         : `${hours} hours ago`;
  if (mins    >= 1)  return mins    === 1  ? "1 minute ago"       : `${mins} minutes ago`;
  return "Just now";
}

document.getElementById("days-ago").textContent = timeAgo(diffMs);

// ── FOOTER TYPING ─────────────────────────────
// ── FOOTER TYPING ON SCROLL ─────────────────────
const footerEl = document.getElementById("footer-typed");
const footerText = "TechTalk";
let footerTyped = false; // prevent repeat

function typeFooter() {
  let i = 0;

  function type() {
    if (i < footerText.length) {
      footerEl.textContent += footerText[i++];
      setTimeout(type, 80);
    }
  }

  type();
}

// Observe footer
const footerObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !footerTyped) {
      footerTyped = true;
      typeFooter();
      footerObserver.unobserve(entry.target); // run once only
    }
  });
}, { threshold: 0.5 });

// Target footer section
const footerSection = document.querySelector("footer");
if (footerSection) {
  footerObserver.observe(footerSection);
}

