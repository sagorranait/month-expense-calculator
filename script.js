// Optimized FormWizard class
class FormWizard {
  constructor(formSelector) {
    this.userIndex = 2;
    this.kostnadIndex = 1;
    this.costSplit = "proportionell"; // Default
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

    this.form.querySelectorAll('input[name="costSplit"]').forEach(radio => {
      radio.addEventListener("change", () => {
        this.costSplit = radio.value;
        this.toggleProcentsatsInputs();
      });
    });

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
    this.submitButton.style.display = "none"; // Always hidden now
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

  handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!this.form.checkValidity()) return;

    const raw = Object.fromEntries(new FormData(this.form));
    const formData = new FormData(this.form);
    const costSplit = raw.costSplit;
    const result = { costSplit, userInfo: [], kostnadInfo: [] };

    this.form.querySelectorAll("#multi-form .multi-form-control").forEach(row => {
      const name = row.querySelector('input[name^="username"]')?.value.trim();
      const type = row.querySelector('select[name^="incometype"]')?.value || "";
      const value = Number(row.querySelector('input[name^="usersellery"]')?.value.replace(/\s/g, "") || 0);
      const totalUsers = this.form.querySelectorAll("#multi-form .multi-form-control").length;
      const procentsats = costSplit === "50-50"
        ? (100 / totalUsers).toFixed(2)
        : row.querySelector('input[name^="procentsats"]')?.value;

      if (name) result.userInfo.push({ name, type, value, procentsats });
    });

    const kostnadInputs = this.form.querySelectorAll('.multi-kostnad-input');
    kostnadInputs.forEach((row, index) => {
      const kostnad = row.querySelector(`input[name="kostnad[${index}]"]`)?.value;
      const belopp = row.querySelector(`input[name="belopp[${index}]"]`)?.value;
      const checkboxes = row.querySelectorAll(`input[name="betalare[${index}][]"]:checked`);
      const betalareArr = [...checkboxes].map(cb => cb.value);
      const betalare = betalareArr.join(", ");

      result.kostnadInfo.push({
        kostnad,
        belopp: Number(belopp?.replace(/\s/g, "") || 0),
        betalare
      });
    });

    console.log(result);

    this.userInfo = result.userInfo;
    this.kostnadInfo = result.kostnadInfo;
    this.showResultat(result);
  }

  showResultat({ userInfo, kostnadInfo }) {
    const dots = document.getElementById('legend-dots');
    const chart = document.getElementById('user-chart');
    const costs = document.getElementById('costs-list');
    const users = document.getElementById('resultat-user');

    const colors = ['#c41e67', '#a71555', '#ced7e0', '#470a0a', '#b21c0e'];

    dots.innerHTML = '';
    users.innerHTML = '';
    costs.innerHTML = '';

    const total = kostnadInfo.reduce((sum, data) => sum + parseFloat(data.belopp || 0), 0);

    let gradient = [];
    let start = 0;

    userInfo.forEach((user, i) => {
      const percent = parseFloat(user.procentsats) || 0;
      const color = colors[i % colors.length];
      const end = start + percent;

      const skaBetala = Math.round((total * percent) / 100);
      const balance = Math.round(parseFloat(user.value || 0));
      const diff = balance - skaBetala;

      user.skaBetala = skaBetala;
      user.balance = balance;
      user.diff = diff;

      users.innerHTML += `
        <div class="card">
          <h3>${user.name}</h3>
          <div class="result-item-boxs">
            <div class="item-box">
              <p class="label">Ska betala</p>
              <p class="amount">${skaBetala.toLocaleString("sv-SE")} kr</p>
            </div>
            <div class="item-box">
              <p class="label">Kvar efter utgifter</p>
              <p class="amount ${diff >= 0 ? 'plus' : 'minus'}">
                ${(diff >= 0 ? '+' : '') + diff.toLocaleString("sv-SE")} kr
              </p>
            </div>
          </div>
        </div>
      `;

      dots.innerHTML += `
        <span><span class="dot" style="background-color:${color}"></span>${user.name} (${percent}%)</span>
      `;

      gradient.push(`${color} ${start}% ${end}%`);
      start = end;
    });

    chart.style.background = `conic-gradient(${gradient.join(', ')})`;

    kostnadInfo.forEach(data => {
      costs.innerHTML += `<tr><td>${data.kostnad}</td><td>${parseFloat(data.belopp || 0).toLocaleString("sv-SE")} kr</td></tr>`;
    });

    document.getElementById("total-cost").textContent = `${total.toLocaleString("sv-SE")} kr`;

    const owes = userInfo.filter(u => u.diff < 0);
    const gets = userInfo.filter(u => u.diff > 0);
    const swishList = [];
    let owesIndex = 0;
    let getsIndex = 0;

    while (owesIndex < owes.length && getsIndex < gets.length) {
      let owe = owes[owesIndex];
      let get = gets[getsIndex];
      const amount = Math.min(Math.abs(owe.diff), get.diff);

      if (amount > 0) {
        swishList.push(`${owe.name} ska swisha ${amount.toLocaleString("sv-SE")} kr till ${get.name}`);
        owe.diff += amount;
        get.diff -= amount;
      }

      if (Math.abs(owe.diff) < 1) owesIndex++;
      if (Math.abs(get.diff) < 1) getsIndex++;
    }

    if (swishList.length > 0) {
      users.innerHTML += `
        <div class="card full">
          <h3>Swish-förslag</h3>
          <ul>${swishList.map(msg => `<li style="list-style: none;">${msg}</li>`).join('')}</ul>
        </div>
      `;
    }
  }

  updateBetalareDropdowns() {
    const names = [...this.form.querySelectorAll('input[name^="username"]')]
      .map(input => input.value.trim())
      .filter(Boolean);

    this.form.querySelectorAll('.betalare-checkboxes').forEach(group => {
      const index = group.dataset.index;
      const currentValues = [...group.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
      group.innerHTML = names.map(name => {
        const checked = currentValues.includes(name) ? 'checked' : '';
        return `<label><input type="checkbox" name="betalare[${index}][]" value="${name}" ${checked}> ${name}</label>`;
      }).join("");
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
    const button = document.getElementById(buttonId);
    const wrapper = document.getElementById(containerId);
    let indexRef = buttonId === "add-control" ? "userIndex" : "kostnadIndex";

    button.onclick = () => {
      const i = this[indexRef]++;
      const div = document.createElement("div");
      div.className = "multi-form-control";
      div.innerHTML = getFieldsFn.call(this, i);

      const removeBtn = div.querySelector(".remove-btn");
      removeBtn.addEventListener("click", () => {
        div.remove();
        this.updateBetalareDropdowns();
      });

      const usernameInput = div.querySelector('input[name^="username"]');
      if (usernameInput) {
        usernameInput.addEventListener("input", () => {
          this.updateBetalareDropdowns();
          this.toggleProcentsatsInputs();
        });
      }

      wrapper.appendChild(div);
      this.updateBetalareDropdowns();
      this.toggleProcentsatsInputs();
    };
  }

  toggleProcentsatsInputs() {
    const show = this.costSplit !== "50-50";
    this.form.querySelectorAll(".procentsats-wrapper").forEach(wrapper => {
      wrapper.style.display = show ? "block" : "none";
    });
  }

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

  getKostnadFields(i) {
    return `
      <div class="multi-kostnad-input">
        <input type="text" name="kostnad[${i}]" pattern="^[A-Za-zÅÄÖåäö]+$" placeholder="Kostnad" required />
        <input type="text" name="belopp[${i}]" pattern="^\\d+(\\s\\d+)*$" placeholder="Belopp" required />
        <div class="betalare-checkboxes" data-index="${i}"></div>
      </div>
      <button type="button" class="remove-btn">-</button>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const instance = new FormWizard(".form-wizard");
  document.querySelector(".form-wizard").formWizardInstance = instance;
  instance.updateBetalareDropdowns();
  instance.toggleProcentsatsInputs();
});