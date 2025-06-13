// Optimized FormWizard class
class FormWizard {
  constructor(formSelector) {
    this.userIndex = 1;
    this.kostnadIndex = 1;
    this.form = document.querySelector(formSelector);
    this.steps = [...this.form.querySelectorAll(".step")];
    this.stepIndicators = [...this.form.querySelectorAll(".progress-container li")];
    this.progress = this.form.querySelector(".progress");
    this.stepsContainer = this.form.querySelector(".steps-container"); // ✅ restore this
    this.prevButton = this.form.querySelector(".prev-btn");
    this.nextButton = this.form.querySelector(".next-btn");
    this.submitButton = this.form.querySelector(".submit-btn");
    this.currentStep = 0;

    document.documentElement.style.setProperty("--steps", this.stepIndicators.length);
    this.init();
  }


  init() {
    this.form.querySelectorAll("input, textarea").forEach(input =>
      input.addEventListener("focus", e => this.handleFocus(e))
    );
    this.prevButton.onclick = e => this.navigate(e, -1);
    this.nextButton.onclick = e => this.navigate(e, 1);
    this.form.onsubmit = e => this.handleSubmit(e);

    this.handleDynamicFields("add-control", "multi-form", this.getUserFields);
    this.handleDynamicFields("add-kostnad", "multi-kostnad-form", this.getKostnadFields);

    this.form.querySelectorAll('input[name="costSplit"]').forEach(radio =>
      radio.addEventListener("change", () => this.toggleProcentsatsFields())
    );

    setTimeout(() => {
      this.form.querySelectorAll('input[name^="username"]').forEach(input =>
        input.addEventListener("input", () => this.updateBetalareDropdowns())
      );
      this.updateUI();
      this.updateBetalareDropdowns();
      this.toggleProcentsatsFields();
    }, 50);
  }

  handleFocus(e) {
    const index = this.steps.findIndex(step => step.contains(e.target));
    if (index !== -1 && index !== this.currentStep && this.isValidStep()) {
      this.currentStep = index;
      this.updateUI();
    }
    this.stepsContainer.scrollTop = 0;
    this.stepsContainer.scrollLeft = 0;
  }

  updateUI() {
    const width = this.currentStep / (this.steps.length - 1);
    this.progress.style.transform = `scaleX(${width})`;

    this.steps.forEach((step, i) => step.classList.toggle("current", i === this.currentStep));
    this.stepIndicators.forEach((el, i) => {
      el.classList.toggle("current", i === this.currentStep);
      el.classList.toggle("done", i < this.currentStep);
    });

    this.prevButton.hidden = this.currentStep === 0;
    this.nextButton.hidden = this.currentStep >= this.steps.length - 1;
    this.submitButton.hidden = !this.nextButton.hidden;
  }

  isValidStep() {
    const fields = this.steps[this.currentStep].querySelectorAll("input, textarea");
    return [...fields].every(field => field.reportValidity());
  }

  navigate(e, direction) {
    e.preventDefault();
    if (direction === -1 || (direction === 1 && this.isValidStep())) {
      this.currentStep += direction;
      this.updateUI();
    }
  }

  // Form Submition
  handleSubmit(e) {
    e.preventDefault();
    if (!this.form.checkValidity()) return;

    const raw = Object.fromEntries(new FormData(this.form));
    const costSplit = raw.costSplit;
    const result = { costSplit, userInfo: [], kostnadInfo: [] };

    this.form.querySelectorAll("#multi-form .multi-form-control").forEach(row => {
      const name = row.querySelector('input[name^="username"]')?.value.trim();
      const value = Number(row.querySelector('input[name^="usersellery"]')?.value || 0);
      const procentsats = costSplit === "50-50" ? "50" : row.querySelector('#procentsats')?.value;
      if (name) result.userInfo.push({ name, value, procentsats });
    });

    Object.entries(raw).forEach(([key, val]) => {
      const match = key.match(/^kostnad\[(\d+)\]$/);
      if (match) {
        const i = match[1];
        result.kostnadInfo.push({
          kostnad: val,
          belopp: Number(raw[`belopp[${i}]`] || 0),
          betalare: raw[`betalare[${i}]`] || ""
        });
      }
    });

    console.log(result);

    this.userInfo = result.userInfo;
    this.kostnadInfo = result.kostnadInfo;


    this.showResultat(result);
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Resulterande...";
    setTimeout(() => this.form.querySelector(".resultat").hidden = false, 2000);
  }

  // Showing the Resultat
  showResultat({ userInfo, kostnadInfo }) {
    const dots = document.getElementById('legend-dots');
    const chart = document.getElementById('user-chart');
    const costs = document.getElementById('costs-list');
    const users = document.getElementById('resultat-user');

    const colors = ['#c41e67', '#a71555', '#ced7e0', '#470a0a', '#b21c0e'];

    dots.innerHTML = '';
    users.innerHTML = '';
    costs.innerHTML = '';

    let gradient = [];
    let start = 0;
    // User Information
    userInfo.forEach((user, i) => {
      const percent = parseFloat(user.procentsats);
      const color = colors[i % colors.length];
      const end = start + percent;

      const costPercent = parseFloat(user.procentsats) / 100 || 0;
      let remaining = user.value;

      kostnadInfo.forEach(cost => {
        const costShare = cost.belopp * (percent / 100);
        remaining -= costShare;
      });

      console.log(Math.round(remaining));
      

      users.innerHTML += `<div class="card"><h3>${user.name}</h3><p class="amount">${Math.round(remaining).toLocaleString("sv-SE")} kr</p><p class="label">kvar efter utgifter</p></div>`;
      dots.innerHTML += `<span><span class="dot" style="background-color:${color}"></span>${user.name} (${user.procentsats}%)</span>`;

      gradient.push(`${color} ${start}% ${end}%`);
      start = end;
    });
    // Chart Color
    chart.style.background = `conic-gradient(${gradient.join(', ')})`;
    // Cost List
    kostnadInfo.forEach((data) => {
      costs.innerHTML += `<tr><td>${data.kostnad}</td><td>${data.belopp.toLocaleString("sv-SE")} kr</td></tr>`;
    });
    // Total Cost
    const total = kostnadInfo.reduce((sum, data) => sum + data.belopp, 0);
    document.getElementById("total-cost").textContent = `${total.toLocaleString("sv-SE")} kr`;
  }


  // Select input functionality
  updateBetalareDropdowns() {
    const names = [...this.form.querySelectorAll('input[name^="username"]')]
      .map(input => input.value.trim())
      .filter(Boolean);

    this.form.querySelectorAll('select[name^="betalare["]').forEach(select => {
      const current = select.value;
      select.innerHTML = names.map(name => `<option value="${name}">${name}</option>`).join("");
      if (names.includes(current)) select.value = current;
    });
  }

  // Show/Hide Prosentsats input fields
  toggleProcentsatsFields() {
    const isProportionell = this.form.querySelector('input[name="costSplit"]:checked')?.value === "proportionell";

    this.form.querySelectorAll("#multi-form .multi-form-control").forEach(row => {
      const input = row.querySelector('input[name^="procentsats"]');
      if (input) {
        const wrapper = input.parentElement;
        wrapper.style.display = isProportionell ? "" : "none";
        input.value = isProportionell ? input.value || "" : "";
      }
    });
  }

  // Add/Remove input field
  handleDynamicFields(buttonId, containerId, getFieldsFn) {
    const button = document.getElementById(buttonId);
    const wrapper = document.getElementById(containerId);

    let indexRef = buttonId === "add-control" ? "userIndex" : "kostnadIndex";

    // Avoid double event attachment
    button.onclick = () => {
      const i = this[indexRef]++;
      const div = document.createElement("div");
      div.className = "multi-form-control";
      div.innerHTML = getFieldsFn(i);
      wrapper.appendChild(div);
      this.updateUI();

      if (buttonId === "add-control") {
        div.querySelectorAll('input[name^="username"]').forEach(input =>
          input.addEventListener("input", () => this.updateBetalareDropdowns())
        );
      }

      this.updateBetalareDropdowns();
      this.toggleProcentsatsFields();
    };

    // Remove logic (already correct)
    wrapper.addEventListener("click", e => {
      if (e.target.classList.contains("remove-btn")) {
        e.target.closest(".multi-form-control")?.remove();
        this.updateUI();
        this.updateBetalareDropdowns();
      }
    });
  }

  // Add new User input 
  getUserFields(i) {
    return `
      <input type="text" name="username[${i}]" pattern="^[A-Za-z]+$" placeholder="Name" required />
      <input type="number" name="usersellery[${i}]" placeholder="kr" required />
      <div class="procentsats-wrapper">
        <input type="text" name="procentsats[${i}]" placeholder="%" maxlength="3" />
      </div>
      <button type="button" class="remove-btn">-</button>
    `;
  }

  // Add new Cost input 
  getKostnadFields(i) {
    return `
      <div class="multi-kostnad-input">
        <input type="text" name="kostnad[${i}]" pattern="^[A-Za-z]+$" placeholder="Kostnad" required />
        <input type="number" name="belopp[${i}]" placeholder="Belopp" required />
        <select name="betalare[${i}]"></select>
      </div>
      <button type="button" class="remove-btn">-</button>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const instance = new FormWizard(".form-wizard");
  document.querySelector(".form-wizard").formWizardInstance = instance;
});

document.getElementById("export-pdf")?.addEventListener("click", () => {
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF();

  const form = document.querySelector(".form-wizard").formWizardInstance;
  if (!form) return;

  const userInfo = form.userInfo || [];
  const kostnadInfo = form.kostnadInfo || [];

  // Title
  doc.setFontSize(18);
  doc.text("Månadsbudgetrapport", 20, 20);

  // Users
  doc.setFontSize(12);
  doc.text("Användare:", 20, 35);
  let y = 45;

  userInfo.forEach(user => {
    const remaining = user.value - kostnadInfo.reduce((sum, cost) => {
      return sum + (cost.betalare === user.name ? cost.belopp : 0);
    }, 0);
    doc.text(`${user.name} (${user.procentsats}%): ${remaining.toLocaleString("sv-SE")} kr kvar`, 25, y);
    y += 8;
  });

  // Costs
  y += 10;
  doc.text("Kostnader:", 20, y);
  y += 10;

  kostnadInfo.forEach(cost => {
    doc.text(`${cost.kostnad}: ${cost.belopp.toLocaleString("sv-SE")} kr (Betalare: ${cost.betalare})`, 25, y);
    y += 8;
  });

  // Total
  const total = kostnadInfo.reduce((sum, item) => sum + item.belopp, 0);
  y += 10;
  doc.setFont(undefined, 'bold');
  doc.text(`Totala utgifter: ${total.toLocaleString("sv-SE")} kr`, 20, y);

  doc.save("Månadsbudget.pdf");
});