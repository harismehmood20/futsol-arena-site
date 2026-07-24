(function(){
  const statGrid = document.getElementById('statGrid');
  const revenueGrid = document.getElementById('revenueGrid');
  const bookingsBody = document.getElementById('bookingsBody');
  const emptyState = document.getElementById('emptyState');
  const searchBox = document.getElementById('searchBox');

  document.getElementById('pStd').textContent = CONFIG.currency + CONFIG.basePrice;
  document.getElementById('pWknd').textContent = CONFIG.currency + CONFIG.weekendPrice;
  document.getElementById('pNight').textContent = CONFIG.currency + CONFIG.nightPrice;

  function todayISO(){ return new Date().toISOString().slice(0,10); }

  function isInLast7Days(dateISO){
    const d = new Date(dateISO), now = new Date();
    const diff = (now - d) / 86400000;
    return diff >= -7 && diff <= 7;
  }
  function isThisMonth(dateISO){
    const d = new Date(dateISO), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  function statusBadge(status){
    const cls = status === 'Confirmed' ? 'confirmed' : status === 'Rejected' ? 'cancelled' : 'pending';
    return `<span class="badge ${cls}">${status}</span>`;
  }

  function render(){
    const all = STORE.all();
    const today = todayISO();

    const todays = all.filter(b => b.date === today);
    const weekly = all.filter(b => isInLast7Days(b.date));
    const confirmed = all.filter(b => b.status === 'Confirmed');
    const monthlyRevenue = confirmed.filter(b => isThisMonth(b.date)).reduce((s,b)=>s+b.price,0);
    const todayRevenue = confirmed.filter(b => b.date === today).reduce((s,b)=>s+b.price,0);
    const weeklyRevenue = confirmed.filter(b => isInLast7Days(b.date)).reduce((s,b)=>s+b.price,0);
    const totalRevenue = confirmed.reduce((s,b)=>s+b.price,0);
    const availableToday = 24 - todays.filter(b=>b.status!=='Rejected').length;

    statGrid.innerHTML = `
      <div class="stat-card"><div class="k">Today's Bookings</div><div class="v">${todays.length}</div></div>
      <div class="stat-card"><div class="k">Weekly Bookings</div><div class="v">${weekly.length}</div></div>
      <div class="stat-card"><div class="k">Monthly Revenue</div><div class="v green">${CONFIG.currency}${monthlyRevenue}</div></div>
      <div class="stat-card"><div class="k">Available Slots Today</div><div class="v orange">${Math.max(availableToday,0)}</div></div>
    `;

    revenueGrid.innerHTML = `
      <div class="stat-card"><div class="k">Today's Income</div><div class="v green">${CONFIG.currency}${todayRevenue}</div></div>
      <div class="stat-card"><div class="k">Weekly Income</div><div class="v green">${CONFIG.currency}${weeklyRevenue}</div></div>
      <div class="stat-card"><div class="k">Monthly Income</div><div class="v green">${CONFIG.currency}${monthlyRevenue}</div></div>
      <div class="stat-card"><div class="k">Total Income</div><div class="v green">${CONFIG.currency}${totalRevenue}</div></div>
    `;

    renderTable(all);
  }

  function renderTable(all){
    const q = (searchBox.value || '').toLowerCase();
    const filtered = all
      .filter(b => b.name.toLowerCase().includes(q) || b.phone.includes(q))
      .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    if(filtered.length === 0){
      bookingsBody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    bookingsBody.innerHTML = filtered.map(b => `
      <tr data-id="${b.id}">
        <td>${b.id}</td>
        <td>${b.name}<br><span style="color:var(--ink-soft);font-size:12px;">${b.phone}</span></td>
        <td>${b.sport}</td>
        <td>${b.dateLabel || b.date}</td>
        <td>${b.time}</td>
        <td>${CONFIG.currency}${b.price}</td>
        <td>${statusBadge(b.status)}</td>
        <td class="row-actions">
          ${b.status !== 'Confirmed' ? `<button class="approve" data-action="approve">Approve</button>` : ''}
          ${b.status !== 'Rejected' ? `<button class="reject" data-action="reject">Reject</button>` : ''}
          <button data-action="delete">Delete</button>
        </td>
      </tr>
    `).join('');

    bookingsBody.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.closest('tr').dataset.id;
        const action = btn.dataset.action;
        if(action === 'approve') STORE.update(id, {status:'Confirmed'});
        if(action === 'reject') STORE.update(id, {status:'Rejected'});
        if(action === 'delete') STORE.remove(id);
        render();
      });
    });
  }

  searchBox.addEventListener('input', render);

  document.getElementById('resetDemo').addEventListener('click', ()=>{
    if(confirm('Clear all demo bookings?')){
      localStorage.removeItem(STORE.KEY);
      render();
    }
  });

  render();
})();
