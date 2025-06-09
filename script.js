class FormWizard {
  constructor(formSelector) {
    this.form = document.querySelector(formSelector);
    this.steps = [...this.form.querySelectorAll(".step")];
    this.stepIndicators = [...this.form.querySelectorAll(".progress-container li")];
    this.progress = this.form.querySelector(".progress");
    this.stepsContainer = this.form.querySelector(".steps-container");
    this.prevButton = this.form.querySelector(".prev-btn");
    this.nextButton = this.form.querySelector(".next-btn");
    this.submitButton = this.form.querySelector(".submit-btn");

    this.currentStep = 0;
    document.documentElement.style.setProperty("--steps", this.stepIndicators.length);

    this.init();
  }

  init() {
    this.form.querySelectorAll("input, textarea").forEach(input =>
      input.addEventListener("focus", (e) => this.handleFocus(e))
    );

    this.prevButton.onclick = (e) => this.navigate(e, -1);
    this.nextButton.onclick = (e) => this.navigate(e, 1);
    this.form.onsubmit = (e) => this.handleSubmit(e);

    this.handleDynamicFields("add-control", "multi-form", this.getUserFields);
    this.handleDynamicFields("add-kostnad", "multi-kostnad-form", this.getKostnadFields);

    this.updateUI();
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

    const formData = new FormData(this.form);
    const raw = Object.fromEntries(formData);

    const result = {
      costSplit: raw.costSplit,
      userInfo: [],
      kostnadInfo: []
    };

    // ✅ Collect all username fields (both username[] and username[n])
    const usernames = Object.entries(raw).filter(([key]) => key.startsWith("username[") || key === "username[]");
    const usersellery = Object.entries(raw).filter(([key]) => key.startsWith("usersellery[") || key === "usersellery[]");

    for (let i = 0; i < usernames.length; i++) {
      result.userInfo.push({
        name: usernames[i][1],
        value: Number(usersellery[i]?.[1] || 0)
      });
    }

    // ✅ Collect kostnadInfo (no change needed)
    const kostnader = Object.entries(raw).filter(([key]) => key.startsWith("kostnad["));
    const belopp = Object.entries(raw).filter(([key]) => key.startsWith("belopp["));
    const betalare = Object.entries(raw).filter(([key]) => key.startsWith("betalare["));

    for (let i = 0; i < kostnader.length; i++) {
      result.kostnadInfo.push({
        kostnad: kostnader[i][1],
        belopp: Number(belopp[i]?.[1] || 0),
        betalare: betalare[i]?.[1] || ''
      });
    }

    console.log(result);

    this.submitButton.disabled = true;
    this.submitButton.textContent = "Resulterande...";

    setTimeout(() => {
      this.form.querySelector(".resultat").hidden = false;
    }, 3000);
  }

  updateBetalareDropdowns() {
    const usernameInputs = this.form.querySelectorAll('input[name^="username["], input[name="username[]"]');
    const names = Array.from(usernameInputs)
      .map(input => input.value.trim())
      .filter(Boolean);

    const dropdowns = this.form.querySelectorAll('select[name^="betalare["]');
    dropdowns.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '';
      names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
      if (names.includes(currentValue)) {
        select.value = currentValue;
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
        const newUsernameInput = div.querySelector(`input[name^="username["]`);
        if (newUsernameInput) {
          newUsernameInput.addEventListener("input", () => {
            this.updateBetalareDropdowns();
          });
        }
      }
      this.updateBetalareDropdowns(); // ✅ Add this
    });

    wrapper.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-btn")) {
        e.target.closest(".multi-form-control")?.remove();
        this.updateUI();
        this.updateBetalareDropdowns(); // ✅ Add this
      }
    });
  }

  getUserFields(i) {
    return `
      <input type="text" id="username-${i}" name="username[${i}]" placeholder="Name" required />
      <input type="number" id="usersellery-${i}" name="usersellery[${i}]" placeholder="kr" required />
      <button type="button" class="remove-btn">-</button>
    `;
  }

  getKostnadFields(i) {
    return `
      <div class="multi-kostnad-input">
        <input type="text" name="kostnad[${i}]" placeholder="Kostnad" required />
        <input type="number" name="belopp[${i}]" placeholder="Belopp" required />
        <select name="betalare[${i}]">
          <option value="volvo">Volvo</option>
          <option value="saab">Saab</option>
        </select>
      </div>
      <button type="button" class="remove-btn">-</button>
    `;
  }
}

// Initialize the form wizard
document.addEventListener("DOMContentLoaded", () => {
  const instance = new FormWizard(".form-wizard");
  document.querySelector(".form-wizard").formWizardInstance = instance;
});