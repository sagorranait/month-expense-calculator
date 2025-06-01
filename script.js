class FormWizard {
  constructor(formSelector) {
    this.form = document.querySelector(formSelector);
    this.progress = this.form.querySelector(".progress");
    this.stepsContainer = this.form.querySelector(".steps-container");
    this.steps = [...this.form.querySelectorAll(".step")];
    this.stepIndicators = [...this.form.querySelectorAll(".progress-container li")];
    this.prevButton = this.form.querySelector(".prev-btn");
    this.nextButton = this.form.querySelector(".next-btn");
    this.submitButton = this.form.querySelector(".submit-btn");
    this.inputs = this.form.querySelectorAll("input, textarea");

    this.currentStep = 0;
    document.documentElement.style.setProperty("--steps", this.stepIndicators.length);

    this.init();
  }

  init() {
    this.inputs.forEach((input) =>
      input.addEventListener("focus", (e) => this.handleFocus(e))
    );

    this.prevButton.addEventListener("click", (e) => this.prev(e));
    this.nextButton.addEventListener("click", (e) => this.next(e));
    this.form.addEventListener("submit", (e) => this.submit(e));

    this.addDynamicInputLogic();
    this.addDynamicKostnadInputLogic();
    this.updateUI();
  }

  handleFocus(e) {
    const targetIndex = this.steps.findIndex((step) => step.contains(e.target));
    if (targetIndex !== -1 && targetIndex !== this.currentStep) {
      if (!this.isValidStep()) return;
      this.currentStep = targetIndex;
      this.updateUI();
    }

    this.stepsContainer.scrollTop = 0;
    this.stepsContainer.scrollLeft = 0;
  }

  updateUI() {
    const dir = document.documentElement.dir === "rtl" ? 100 : -100;
    const width = this.currentStep / (this.steps.length - 1);

    this.progress.style.transform = `scaleX(${width})`;
    // this.stepsContainer.style.height = this.steps[this.currentStep].offsetHeight + "px";

    this.steps.forEach((step, i) => {
      // step.style.transform = `translateX(${this.currentStep * dir}%)`;
      step.classList.toggle("current", i === this.currentStep);
    });

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
    return [...fields].every((field) => field.reportValidity());
  }

  prev(e) {
    e.preventDefault();
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateUI();
    }
  }

  next(e) {
    e.preventDefault();
    if (this.isValidStep() && this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateUI();
    }
  }

  submit(e) {
    e.preventDefault();
    if (!this.form.checkValidity()) return;

    const formData = new FormData(this.form);
    console.log(Object.fromEntries(formData));

    this.submitButton.disabled = true;
    this.submitButton.textContent = "Resulterande...";

    // mimic a server request
    setTimeout(() => {
      this.form.querySelector(".resultat").hidden = false;
    }, 3000);
  }

  addDynamicInputLogic() {
    let dynamicIndex = 2;

    document.getElementById("add-control").addEventListener("click", () => {
      const wrapper = document.getElementById("multi-form");
      const inputGroup = document.createElement("div");
      inputGroup.className = "multi-form-control";
      inputGroup.innerHTML = `
        <input type="text" id="username-${dynamicIndex}" name="username[${dynamicIndex}]" placeholder="Name" required />
        <input type="number" id="usersellery-${dynamicIndex}" name="usersellery[${dynamicIndex}]" placeholder="kr" required />
        <button type="button" class="remove-btn">-</button>
      `;
      wrapper.appendChild(inputGroup);

      inputGroup.querySelector(".remove-btn").addEventListener("click", () => {
        inputGroup.remove();
        this.updateUI(); // recalculate after removing
      });

      this.updateUI(); // recalculate after adding
    });
  }

  addDynamicKostnadInputLogic() {
    let dynamicIndex = 1;

    document.getElementById("add-kostnad").addEventListener("click", () => {
      const wrapper = document.getElementById("multi-kostnad-form");
      const inputGroup = document.createElement("div");
      inputGroup.className = "multi-form-control";
      inputGroup.innerHTML = `
        <div class="multi-kostnad-input">
          <input type="text" id="kostnad-1" name="kostnad[${dynamicIndex}]" placeholder="Kostnad" required />
          <input type="number" id="belopp-1" name="belopp[${dynamicIndex}]" placeholder="Belopp" required />
          <select name="betalare[${dynamicIndex}]" id="betalare">
            <option value="volvo">Volvo</option>
            <option value="saab">Saab</option>
          </select>
        </div>
        <button type="button" class="remove-btn">-</button>
      `;
      wrapper.appendChild(inputGroup);

      inputGroup.querySelector(".remove-btn").addEventListener("click", () => {
        inputGroup.remove();
        this.updateUI(); // recalculate after removing
      });

      this.updateUI(); // recalculate after adding
    });
    
  }
}

// Initialize the form wizard
document.addEventListener("DOMContentLoaded", () => {
  new FormWizard(".form-wizard");
});