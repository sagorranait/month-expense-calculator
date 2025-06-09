// Optimized FormWizard class
class FormWizard {
  constructor(formSelector) {
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

  handleSubmit(e) {
    e.preventDefault();
    if (!this.form.checkValidity()) return;

    const raw = Object.fromEntries(new FormData(this.form));
    const costSplit = raw.costSplit;
    const result = { costSplit, userInfo: [], kostnadInfo: [] };

    this.form.querySelectorAll("#multi-form .multi-form-control").forEach(row => {
      const name = row.querySelector('input[name^="username"]')?.value.trim();
      const value = Number(row.querySelector('input[name^="usersellery"]')?.value || 0);
      const procentsats = costSplit === "50-50" ? "50" : "";
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
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Resulterande...";
    setTimeout(() => this.form.querySelector(".resultat").hidden = false, 3000);
  }

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

  handleDynamicFields(buttonId, containerId, getFieldsFn) {
    let index = 1;
    const button = document.getElementById(buttonId);
    const wrapper = document.getElementById(containerId);

    button.addEventListener("click", () => {
      const div = document.createElement("div");
      div.className = "multi-form-control";
      div.innerHTML = getFieldsFn(index++);
      wrapper.appendChild(div);
      this.updateUI();

      if (buttonId === "add-control") {
        div.querySelectorAll('input[name^="username"]').forEach(input =>
          input.addEventListener("input", () => this.updateBetalareDropdowns())
        );
      }

      this.updateBetalareDropdowns();
      this.toggleProcentsatsFields();
    });

    wrapper.addEventListener("click", e => {
      if (e.target.classList.contains("remove-btn")) {
        e.target.closest(".multi-form-control")?.remove();
        this.updateUI();
        this.updateBetalareDropdowns();
      }
    });
  }

  getUserFields(i) {
    return `
      <input type="text" name="username[${i}]" placeholder="Name" required />
      <input type="number" name="usersellery[${i}]" placeholder="kr" required />
      <div class="procentsats-wrapper">
        <input type="text" name="procentsats[${i}]" placeholder="%" maxlength="3" />
      </div>
      <button type="button" class="remove-btn">-</button>
    `;
  }

  getKostnadFields(i) {
    return `
      <div class="multi-kostnad-input">
        <input type="text" name="kostnad[${i}]" placeholder="Kostnad" required />
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
