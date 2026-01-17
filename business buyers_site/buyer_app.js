// Buyer demo JS. Works with dealer demo localStorage schema if present.
// Keys used: 'dealers', 'projects', 'buyers', 'buyerCurrent', 'chats'
(function(){
  function getDealers(){ return JSON.parse(localStorage.getItem('dealers')||'[]'); }
  function getProjects(){ return JSON.parse(localStorage.getItem('projects')||'[]'); }
  function getBuyers(){ return JSON.parse(localStorage.getItem('buyers')||'[]'); }
  function saveBuyers(b){ localStorage.setItem('buyers', JSON.stringify(b)); }
  function setCurrentBuyer(email){ localStorage.setItem('buyerCurrent', email); }
  function currentBuyer(){ return localStorage.getItem('buyerCurrent')||null; }
  function getChats(){ return JSON.parse(localStorage.getItem('chats')||'{}'); }
  function saveChats(c){ localStorage.setItem('chats', JSON.stringify(c)); }

  // Seed sample dealers/projects if none (for demo portability)
  if(getDealers().length === 0){
    const d = [
      { name: 'AutoPro Mods', email: 'autopro@example.com' },
      { name: 'SpeedWorks', email: 'speed@example.com' }
    ];
    localStorage.setItem('dealers', JSON.stringify(d));
  }

  if(getProjects().length === 0){
    const p = [
      { id: 1, dealer: 'autopro@example.com', name: 'Ignis Sport', model: 'Ignis', rank: 2, images: ['https://via.placeholder.com/600x400'] },
      { id: 2, dealer: 'speed@example.com', name: 'Swift Matte', model: 'Swift', rank: 3, images: ['https://via.placeholder.com/600x400'] },
      { id: 3, dealer: 'autopro@example.com', name: 'Baleno LEDs', model: 'Baleno', rank: 1, images: ['https://via.placeholder.com/600x400'] }
    ];
    localStorage.setItem('projects', JSON.stringify(p));
  }

  // Page routing logic
  document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.split('/').pop();
    if (path === '' || path === 'index.html') {
      renderFeed();
      document.getElementById('searchInput').addEventListener('input', renderFeed);
      document.getElementById('filterRank').addEventListener('change', renderFeed);
    }
    if (path === 'buyer_signup.html') setupBuyerSignup();
    if (path === 'buyer_login.html') setupBuyerLogin();
    if (path === 'profile.html') renderProfile();
    if (path === 'chat.html') setupChat();
  });

  function renderFeed(){
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const rankFilter = document.getElementById('filterRank').value;
    const projects = getProjects();
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    const filtered = projects.filter(p => {
      if (rankFilter && String(p.rank) !== rankFilter) return false;
      if (!q) return true;
      return (p.name && p.name.toLowerCase().includes(q)) || (p.model && p.model.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      feed.innerHTML = '<p style="color:#64748b">No results</p>';
      return;
    }

    filtered.reverse().forEach(p => {
      const card = document.createElement('div');
      card.className = 'card upload-card';
      const dealer = getDealers().find(d => d.email === p.dealer) || { name: p.dealer, email: p.dealer };
      card.innerHTML = `
        <img src="${p.images[0] || 'https://via.placeholder.com/600x400'}" alt="">
        <h3>${escapeHtml(p.name)} <small style="font-size:12px;color:#666"> - ${escapeHtml(p.model)}</small></h3>
        <p>By <a href="profile.html?dealer=${encodeURIComponent(p.dealer)}" class="btn">${escapeHtml(dealer.name)}</a></p>
        <p>Rank: ${p.rank || 0}</p>
      `;
      feed.appendChild(card);
    });
  }

  function setupBuyerSignup(){
    const form = document.getElementById('buyerSignup');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('bname').value.trim();
      const email = document.getElementById('bemail').value.trim();
      const pass = document.getElementById('bpassword').value;
      const buyers = getBuyers();
      if (buyers.find(b => b.email === email)) {
        alert('Email already registered'); return;
      }
      buyers.push({ name, email, password: pass, created: Date.now() });
      saveBuyers(buyers);
      setCurrentBuyer(email);
      alert('Signup success');
      location.href = 'index.html';
    });
  }

  function setupBuyerLogin(){
    const form = document.getElementById('buyerLogin');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('bloginEmail').value.trim();
      const pass = document.getElementById('bloginPassword').value;
      const buyers = getBuyers();
      const found = buyers.find(b => b.email === email && b.password === pass);
      if (!found) {
        alert('Invalid credentials'); return;
      }
      setCurrentBuyer(email);
      alert('Login success');
      location.href = 'index.html';
    });
  }

  function renderProfile(){
    const params = new URLSearchParams(location.search);
    const dealerEmail = params.get('dealer');
    const dealers = getDealers();
    const projects = getProjects();
    const dealer = dealers.find(d => d.email === dealerEmail) || { name: dealerEmail, email: dealerEmail };
    const card = document.getElementById('profileCard');
    const list = document.getElementById('dealerProjects');

    card.innerHTML = `
      <h2>${escapeHtml(dealer.name)}</h2>
      <p>Email: ${escapeHtml(dealer.email)}</p>
    `;

    list.innerHTML = '';
    projects.filter(p => p.dealer === dealerEmail).forEach(p => {
      const div = document.createElement('div');
      div.className = 'card upload-card';
      div.innerHTML = `
        <img src="${p.images[0] || 'https://via.placeholder.com/600x400'}">
        <h3>${escapeHtml(p.name)} - ${escapeHtml(p.model)}</h3>
        <p>Rank: ${p.rank}</p>
      `;
      list.appendChild(div);
    });

    const chatBtn = document.getElementById('chatBtn');
    chatBtn.href = 'chat.html?dealer=' + encodeURIComponent(dealerEmail);
  }

  function setupChat(){
    const params = new URLSearchParams(location.search);
    const dealer = params.get('dealer');
    const cur = currentBuyer();
    if (!cur) {
      localStorage.setItem('returnTo', location.href);
      alert('Please login as buyer to use chat.');
      location.href = 'buyer_login.html';
      return;
    }

    const chatWindow = document.getElementById('chatWindow');
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatMsg');
    const key = chatKey(cur, dealer);

    renderChatMessages(key, chatWindow);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;
      const chats = getChats();
      if (!chats[key]) chats[key] = [];
      chats[key].push({ from: cur, text: msg, ts: Date.now() });
      saveChats(chats);
      input.value = '';
      renderChatMessages(key, chatWindow);

      // Simulate dealer reply
      setTimeout(() => {
        const dealers = getDealers();
        const d = dealers.find(x => x.email === dealer);
        const name = d ? d.name.split(' ')[0] : 'Dealer';
        const chats2 = getChats();
        chats2[key].push({ from: dealer, text: 'Hi, thanks for reaching out! We will contact you shortly.', ts: Date.now() });
        saveChats(chats2);
        renderChatMessages(key, chatWindow);
      }, 900);
    });
  }

  function renderChatMessages(key, el){
    const chats = getChats();
    el.innerHTML = '';
    (chats[key] || []).forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg ' + (m.from === currentBuyer() ? 'me' : 'them');
      div.innerHTML = `
        <div style="font-size:12px;color:#666;margin-bottom:6px">
          ${m.from === currentBuyer() ? 'You' : m.from}
        </div>
        <div>${escapeHtml(m.text)}</div>
      `;
      el.appendChild(div);
    });
    el.scrollTop = el.scrollHeight;
  }

  function chatKey(buyer, dealer){ return 'chat::' + buyer + '::' + (dealer || 'system'); }

  function escapeHtml(s){
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
