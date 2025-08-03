// Optimized FormWizard class
class FormWizard {
  constructor(formSelector) {
    this.userIndex = 2;
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

    this.stepIndicators.forEach((li, i) => {
      li.addEventListener("click", () => {
        if (i !== this.currentStep && this.isValidStep()) {
          this.currentStep = i;
          this.updateUI();

          if (i === this.steps.length - 1) {
            this.handleSubmit(new Event("submit", { cancelable: true }));
          }
        }
      });
    });
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

    this.prevButton.style.display = this.currentStep === 0 ? "none" : "inline-block";
    this.nextButton.style.display = this.currentStep >= this.steps.length - 1 ? "none" : "inline-block";
    this.submitButton.style.display = this.currentStep >= this.steps.length - 1 ? "none" : "none";

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

      if (this.currentStep === this.steps.length - 1) {
        this.handleSubmit(new Event("submit", { cancelable: true }));
      }
    }
  }


  // Form Submition
  handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!this.form.checkValidity()) return;

    const raw = Object.fromEntries(new FormData(this.form));
    const costSplit = raw.costSplit;
    const result = { costSplit, userInfo: [], kostnadInfo: [] };

    this.form.querySelectorAll("#multi-form .multi-form-control").forEach(row => {
      const name = row.querySelector('input[name^="username"]')?.value.trim();
      const type = row.querySelector('select[name^="incometype"]')?.value || "";
      const value = Number(row.querySelector('input[name^="usersellery"]')?.value.replace(/\s/g, "") || 0);
      // const procentsats = costSplit === "50-50" ? "50" : row.querySelector('#procentsats')?.value;
      const totalUsers = this.form.querySelectorAll("#multi-form .multi-form-control").length;
      const procentsats = costSplit === "50-50" ? (100 / totalUsers).toFixed(2) : row.querySelector('input[name^="procentsats"]')?.value;

      if (name) result.userInfo.push({ name, type, value, procentsats });
    });

    Object.entries(raw).forEach(([key, val]) => {
      const match = key.match(/^kostnad\[(\d+)\]$/);
      if (match) {
        const i = match[1];
        result.kostnadInfo.push({
          kostnad: val,
          belopp: Number((raw[`belopp[${i}]`] || "0").replace(/\s/g, "")),
          betalare: raw[`betalare[${i}]`] || ""
        });
      }
    });
    console.log(result);
    
    this.userInfo = result.userInfo;
    this.kostnadInfo = result.kostnadInfo;
    this.showResultat(result);    
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
      <input type="text" name="username[${i}]" pattern="^[A-Za-zÅÄÖåäö]+$" placeholder="Name" required />
      <select name="incometype[${i}]" id="incometype">
        <option value="Nettoinkomst">Nettoinkomst</option>
        <option value="Skatteåterbäring">Skatteåterbäring</option>
        <option value="Andra">Andra</option>
      </select>
      <input type="text" name="usersellery[${i}]" pattern="^\\d+(\\s\\d+)*$" placeholder="kr" required />
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
        <input type="text" name="kostnad[${i}]" pattern="^[A-Za-zÅÄÖåäö]+$" placeholder="Kostnad" required />
        <input type="text" name="belopp[${i}]" pattern="^\\d+(\\s\\d+)*$" placeholder="Belopp" required />
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