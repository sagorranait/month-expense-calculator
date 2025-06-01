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
    console.log(Object.fromEntries(formData));

    this.submitButton.disabled = true;
    this.submitButton.textContent = "Resulterande...";

    setTimeout(() => {
      this.form.querySelector(".resultat").hidden = false;
    }, 3000);
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
    });

    wrapper.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-btn")) {
        e.target.closest(".multi-form-control")?.remove();
        this.updateUI();
      }
    });
  }

  getUserFields(i) {
    return `
      <input type="text" name="username[${i}]" placeholder="Name" required />
      <input type="number" name="usersellery[${i}]" placeholder="kr" required />
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
document.addEventListener("DOMContentLoaded", () => new FormWizard(".form-wizard"));