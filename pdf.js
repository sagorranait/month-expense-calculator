document.getElementById("export-pdf")?.addEventListener("click", () => {
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF();

  const form = document.querySelector(".form-wizard").formWizardInstance;
  if (!form) return;

  const originalUsers = form.userInfo || [];
  const kostnadInfo = form.kostnadInfo || [];
  const totalCost = kostnadInfo.reduce((sum, cost) => sum + cost.belopp, 0);

  const userInfo = originalUsers.map(user => {
    const percent = parseFloat(user.procentsats) || 0;
    const skaBetala = Math.round((totalCost * percent) / 100);
    return { ...user, skaBetala };
  });

  const betalningar = {};
  userInfo.forEach(user => betalningar[user.name] = 0);

  kostnadInfo.forEach(entry => {
    const amount = Number(entry.belopp) || 0;
    const payers = (entry.betalare || "").split(",").map(p => p.trim()).filter(Boolean);
    const share = amount / payers.length;
    payers.forEach(name => {
      if (!betalningar[name]) betalningar[name] = 0;
      betalningar[name] += share;
    });
  });

  const dateStr = new Date().toLocaleDateString("sv-SE");

  // Title
  doc.setFontSize(16);
  doc.text("Månadsbudgetrapport", 20, 20);
  doc.text(dateStr, 190, 20, { align: 'right' });

  // Användare Section
  doc.setFontSize(12);
  doc.text("Användare:", 20, 35);
  let y = 45;

  doc.setFont(undefined, 'bold');
  doc.text("Namn", 20, y);
  doc.text("Kostnadsprocent", 70, y);
  doc.text("Kvar efter utgifter", 190, y, { align: 'right' });
  y += 8;

  doc.setFont(undefined, 'normal');
  userInfo.forEach(user => {
    const balance = Math.round(user.value || 0);
    const diff = balance - user.skaBetala;
    user.diff = diff;
    const kvarText = `${diff > 0 ? '+' : ''}${diff.toLocaleString("sv-SE")} kr`;

    doc.text(user.name, 20, y);
    doc.text(`${user.procentsats}%`, 70, y);
    doc.text(kvarText, 190, y, { align: 'right' });
    y += 8;
  });

  // Kostnader
  y += 10;
  doc.setFont(undefined, 'bold');
  doc.text("Kostnader:", 20, y);
  y += 10;
  doc.text("Utgiftspost", 20, y);
  doc.text("Belopp", 120, y, { align: 'right' });
  doc.text("Betalare", 190, y, { align: 'right' });
  y += 8;

  doc.setFont(undefined, 'normal');
  kostnadInfo.forEach(cost => {
    doc.text(cost.kostnad, 20, y);
    doc.text(`${cost.belopp.toLocaleString("sv-SE")} kr`, 120, y, { align: 'right' });
    doc.text(cost.betalare, 190, y, { align: 'right' });
    y += 8;
  });

  y += 10;
  doc.setFont(undefined, 'bold');
  doc.text("Totala utgifter:", 20, y);
  doc.text(`${totalCost.toLocaleString("sv-SE")} kr`, 120, y, { align: 'right' });

  // Betalat Section
  y += 20;
  doc.setFont(undefined, 'bold');
  doc.text("Namn", 20, y);
  doc.text("Utgifter", 120, y, { align: 'right' });
  doc.text("Betalat", 190, y, { align: 'right' });
  y += 8;

  doc.setFont(undefined, 'normal');
  userInfo.forEach(user => {
    const paid = Math.round(betalningar[user.name] || 0);
    user.betalat = paid;
    doc.text(user.name, 20, y);
    doc.text(`${user.skaBetala.toLocaleString("sv-SE")} kr`, 120, y, { align: 'right' });
    doc.text(`${paid.toLocaleString("sv-SE")} kr`, 190, y, { align: 'right' });
    y += 8;
  });

  // Swish Suggestion Section
  const owes = userInfo
    .map(u => ({
      name: u.name,
      diff: Math.round((betalningar[u.name] || 0) - u.skaBetala)
    }))
    .filter(u => u.diff < 0);

  const gets = userInfo
    .map(u => ({
      name: u.name,
      diff: Math.round((betalningar[u.name] || 0) - u.skaBetala)
    }))
    .filter(u => u.diff > 0);

  const swishList = [];
  let owesIndex = 0, getsIndex = 0;

  while (owesIndex < owes.length && getsIndex < gets.length) {
    let owe = owes[owesIndex];
    let get = gets[getsIndex];

    const amount = Math.min(Math.abs(owe.diff), get.diff);
    if (amount > 0) {
      swishList.push({
        from: owe.name,
        to: get.name,
        amount: Math.round(amount) // round to nearest kr
      });

      owe.diff += amount;
      get.diff -= amount;
    }

    if (Math.abs(owe.diff) < 1) owesIndex++;
    if (Math.abs(get.diff) < 1) getsIndex++;
  }

  if (swishList.length > 0) {
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text("Att betala", 20, y);
    y += 6;

    swishList.forEach(({ from, to, amount }) => {
      doc.setFont(undefined, 'normal');
      doc.text(`${from} skall betala ${amount.toLocaleString("sv-SE")} kr till ${to}`, 20, y);
      y += 6;
    });
  }

  doc.save("Månadsbudget.pdf");
});