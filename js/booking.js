(function(){
  const days = getNext7Days();
  const durations = [
    { value: 1, label: "1 Hour", price: 2000 },
    { value: 2, label: "2 Hours", price: 4000 }
  ];
  let state = {
    sport: CONFIG.sports[0],
    dateIndex: 0,
    duration: 1,
    selectedSlot: null
  };

  const sportRow = document.getElementById('sportRow');
  const dateRow = document.getElementById('dateRow');
  const durationRow = document.getElementById('durationRow');
  const slotBoard = document.getElementById('slotBoard');
  const overlay = document.getElementById('modalOverlay');
  const summaryBox = document.getElementById('summaryBox');

  function renderSportChips(){
    sportRow.innerHTML = CONFIG.sports.map(s =>
      `<button class="chip ${s===state.sport?'active':''}" data-sport="${s}">${s}</button>`
    ).join('');
    sportRow.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.sport = btn.dataset.sport;
        renderSportChips();
        renderSlots();
      });
    });
  }

  function renderDateChips(){
    dateRow.innerHTML = days.map((d,i) =>
      `<button class="chip date-chip ${i===state.dateIndex?'active':''}" data-i="${i}">
        ${d.label}<small>${d.dayNum} ${d.month}</small>
      </button>`
    ).join('');
    dateRow.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.dateIndex = parseInt(btn.dataset.i,10);
        renderDateChips();
        renderSlots();
      });
    });
  }

  function renderDurationChips(){
    durationRow.innerHTML = durations.map(d =>
      `<button class="chip" data-duration="${d.value}">${d.label} · ${CONFIG.currency}${d.price}</button>`
    ).join('');
    updateDurationActive();
    durationRow.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.duration = parseInt(btn.dataset.duration,10);
        updateDurationActive();
        renderSlots();
      });
    });
  }

  function updateDurationActive(){
    durationRow.querySelectorAll('.chip').forEach(btn=>{
      btn.classList.toggle('active', parseInt(btn.dataset.duration,10) === state.duration);
    });
  }

  function renderSlots(){
    const day = days[state.dateIndex];
    const slots = buildSlots(state.sport, day.iso, day.isWeekend, state.duration);
    slotBoard.innerHTML = slots.map(s => `
      <div class="slot ${s.status}" data-hour="${s.hour}" ${s.status==='available'?'':'aria-disabled="true"'}>
        ${s.time}
        <small>${s.status==='available' ? CONFIG.currency+s.price : s.status}</small>
      </div>
    `).join('');

    slotBoard.querySelectorAll('.slot.available').forEach(el=>{
      el.addEventListener('click', ()=> openModal(parseInt(el.dataset.hour,10)));
    });
  }

  function openModal(hour){
    const day = days[state.dateIndex];
    const slots = buildSlots(state.sport, day.iso, day.isWeekend, state.duration);
    const slot = slots.find(s=>s.hour===hour);
    state.selectedSlot = { ...slot, date: day.iso, dateLabel: `${day.label}, ${day.dayNum} ${day.month}` };

    const durationLabel = state.duration === 2 ? "2 Hours" : "1 Hour";
    summaryBox.innerHTML = `
      <div class="line"><span>Sport</span><span>${state.sport}</span></div>
      <div class="line"><span>Date</span><span>${state.selectedSlot.dateLabel}</span></div>
      <div class="line"><span>Time</span><span>${slot.time}</span></div>
      <div class="line"><span>Duration</span><span>${durationLabel}</span></div>
      <div class="line total"><span>Total</span><span>${CONFIG.currency}${slot.price}</span></div>
    `;
    document.getElementById('fName').value = '';
    document.getElementById('fPhone').value = '';
    document.getElementById('fEmail').value = '';
    overlay.classList.add('show');
  }

  document.getElementById('modalClose').addEventListener('click', ()=> overlay.classList.remove('show'));
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.classList.remove('show'); });

  document.getElementById('bookingForm').addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('fName').value.trim();
    const phone = document.getElementById('fPhone').value.trim();
    const email = document.getElementById('fEmail').value.trim();
    if(!name || !phone) return;

    const s = state.selectedSlot;
    const booking = STORE.add({
      name, phone, email,
      sport: state.sport,
      date: s.date,
      dateLabel: s.dateLabel,
      hour: s.hour,
      duration: s.duration,
      time: s.time,
      price: s.price,
      status: "Pending" // becomes Confirmed once admin approves payment
    });

    window.open(buildWhatsAppLink(booking), '_blank');
    overlay.classList.remove('show');
    renderSlots(); // slot now shows as pending
  });

  renderSportChips();
  renderDateChips();
  renderDurationChips();
  renderSlots();
})();
